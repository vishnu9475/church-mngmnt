import logging
from decimal import Decimal, InvalidOperation
from datetime import date

from django.conf import settings
from django.db import transaction
from django.db.models import Q, Count, Sum
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import viewsets, filters
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from .pagination import StandardResultsSetPagination

from .models import (
    Family, FamilyMonthlyDueRate, FamilyMonthlyPaymentStatus, FamilyMonthlyPaymentStatusAudit, MonthlyCollectionAllocation, FamilyMember, Category, PaymentMethod,
    Receipt, ReceiptCategory, Bill, BulkDueCollection,
    Due, DuePayment, BankTransaction, Settings,
)
from .serializers import (
    FamilySerializer, FamilyMonthlyDueRateSerializer, FamilyMonthlyPaymentStatusSerializer, MonthlyCollectionAllocationSerializer, FamilyMemberSerializer, CategorySerializer, PaymentMethodSerializer,
    ReceiptSerializer, ReceiptCategorySerializer, BillSerializer, BulkDueCollectionSerializer,
    DueSerializer, DuePaymentSerializer, BankTransactionSerializer, SettingsSerializer,
)
from .monthly_collection import family_monthly_rows, clear_source_allocations


logger = logging.getLogger(__name__)


class FamilyViewSet(viewsets.ModelViewSet):
    queryset = Family.objects.annotate(member_count=Count("members"))
    serializer_class = FamilySerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["family_name", "head_of_family", "phone", "email", "address"]
    ordering_fields = ["family_name", "head_of_family", "created_at"]

    @action(detail=True, methods=["post"], url_path="sync-monthly-pending-due")
    def sync_monthly_pending_due(self, request, pk=None):
        """Keep the tracker balance available as a payable Family Due row."""
        try:
            scheduled_pending = Decimal(str(request.data.get("scheduled_pending", "0")))
        except (InvalidOperation, TypeError, ValueError):
            return Response({"detail": "scheduled_pending must be a valid non-negative amount."}, status=400)
        if scheduled_pending < 0:
            return Response({"detail": "scheduled_pending cannot be negative."}, status=400)

        tracker_tag = "[monthly-tracker-due]"
        opening_tag = "[monthly-opening-due]"
        with transaction.atomic():
            # Lock this family so two browser requests cannot create duplicate
            # linked dues at the same time.
            family = Family.objects.select_for_update().get(pk=pk)
            linked_dues = list(
                Due.objects.select_for_update()
                .filter(family=family)
                .filter(Q(description__icontains=tracker_tag) | Q(description__icontains=opening_tag))
                .prefetch_related("payments")
                .order_by("due_id")
            )
            due = linked_dues[0] if linked_dues else None
            # Merge legacy opening-balance rows and any accidental duplicate
            # tracker rows. Payments are retained on the canonical due.
            if due:
                for duplicate in linked_dues[1:]:
                    DuePayment.objects.filter(due=duplicate).update(due=due)
                    duplicate.delete()
                paid_amount = sum(
                    (amount or Decimal("0") for amount in DuePayment.objects.filter(due=due).values_list("amount", flat=True)),
                    Decimal("0"),
                )
            else:
                paid_amount = Decimal("0")
            # The linked Due must retain recorded payments *and* the current
            # pending balance.  Using max() here made a ₹1,100 payment against
            # a ₹1,200 backlog look fully paid instead of leaving ₹100 due.
            due_total = paid_amount + scheduled_pending
            if due_total <= 0 and not due:
                return Response({"detail": "No monthly pending due to create."})

            category, _ = Category.objects.get_or_create(
                category_name="Monthly Collection",
                category_type="Due",
                defaults={"description": "Monthly collection dues"},
            )
            due_date = family.monthly_dues_start_month or timezone.localdate().replace(day=1)
            if due:
                due.title = "Previous Monthly Dues Pending"
                due.amount = due_total
                due.due_date = due_date
                due.year = due_date.year
                due.category = category
                due.description = f"{tracker_tag} Linked balance from Monthly Payment Dues Details."
                due.save()
            else:
                due = Due.objects.create(
                    family=family,
                    title="Previous Monthly Dues Pending",
                    amount=due_total,
                    due_date=due_date,
                    year=due_date.year,
                    category=category,
                    description=f"{tracker_tag} Linked balance from Monthly Payment Dues Details.",
                )
        return Response(DueSerializer(due).data)


class FamilyMemberViewSet(viewsets.ModelViewSet):
    queryset = FamilyMember.objects.all()
    serializer_class = FamilyMemberSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["family"]
    search_fields = ["name", "relationship", "phone", "email"]
    ordering_fields = ["name", "date_of_birth"]


class FamilyMonthlyDueRateViewSet(viewsets.ModelViewSet):
    queryset = FamilyMonthlyDueRate.objects.select_related("family").all()
    serializer_class = FamilyMonthlyDueRateSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["family", "month"]
    ordering_fields = ["month", "amount"]

    @action(detail=False, methods=["post"], url_path="set-financial-year")
    def set_financial_year(self, request):
        """Set one family's monthly due rate for every month in an Apr–Mar year."""
        try:
            family_id = int(request.data.get("family"))
            financial_year_start = int(request.data.get("financial_year_start"))
            amount = Decimal(str(request.data.get("amount")))
        except (TypeError, ValueError, InvalidOperation):
            return Response({"detail": "family, financial_year_start, and amount are required."}, status=400)
        if amount < 0:
            return Response({"detail": "amount cannot be negative."}, status=400)

        family = Family.objects.filter(pk=family_id).first()
        if not family:
            return Response({"detail": "Family not found."}, status=404)

        updated_rates = []
        with transaction.atomic():
            for index in range(12):
                month_number = 4 + index
                year = financial_year_start + (1 if month_number > 12 else 0)
                month = month_number if month_number <= 12 else month_number - 12
                rate, _ = FamilyMonthlyDueRate.objects.update_or_create(
                    family=family,
                    month=date(year, month, 1),
                    defaults={"amount": amount},
                )
                updated_rates.append(rate)
        return Response(FamilyMonthlyDueRateSerializer(updated_rates, many=True).data)


class FamilyMonthlyPaymentStatusViewSet(viewsets.ModelViewSet):
    queryset = FamilyMonthlyPaymentStatus.objects.select_related("family").prefetch_related("audit_entries").all()
    serializer_class = FamilyMonthlyPaymentStatusSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["family", "month", "status"]
    ordering_fields = ["month", "status", "paid_amount"]

    def _username(self):
        user = self.request.user
        return user.get_username() if user and user.is_authenticated else "Unknown user"

    def perform_create(self, serializer):
        payment_status = serializer.save()
        FamilyMonthlyPaymentStatusAudit.objects.create(
            payment_status=payment_status,
            new_status=payment_status.status,
            new_paid_amount=payment_status.paid_amount,
            changed_by=self._username(),
        )

    def perform_update(self, serializer):
        previous_status = serializer.instance.status
        previous_paid_amount = serializer.instance.paid_amount
        payment_status = serializer.save()
        FamilyMonthlyPaymentStatusAudit.objects.create(
            payment_status=payment_status,
            previous_status=previous_status,
            previous_paid_amount=previous_paid_amount,
            new_status=payment_status.status,
            new_paid_amount=payment_status.paid_amount,
            changed_by=self._username(),
        )


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["category_type"]
    search_fields = ["category_name", "description"]
    ordering_fields = ["category_name", "category_type"]


class PaymentMethodViewSet(viewsets.ModelViewSet):
    queryset = PaymentMethod.objects.all()
    serializer_class = PaymentMethodSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["method_name"]
    ordering_fields = ["method_name"]


class ReceiptViewSet(viewsets.ModelViewSet):
    queryset = Receipt.objects.select_related("family", "primary_category", "payment_method").prefetch_related("edit_audits").all()
    serializer_class = ReceiptSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        "family": ["exact"],
        "primary_category": ["exact"],
        "payment_method": ["exact"],
        "receipt_date": ["exact", "year"],
    }
    search_fields = ["receipt_number", "title", "other_payer_name", "family__family_name", "family__head_of_family", "description"]
    ordering_fields = ["receipt_date", "amount", "receipt_number"]

    def perform_destroy(self, instance):
        with transaction.atomic():
            clear_source_allocations("receipt", instance.receipt_id)
            instance.delete()


class ReceiptCategoryViewSet(viewsets.ModelViewSet):
    queryset = ReceiptCategory.objects.all()
    serializer_class = ReceiptCategorySerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["receipt", "category"]

    def perform_destroy(self, instance):
        from .serializers import sync_receipt_monthly_allocations
        with transaction.atomic():
            receipt = instance.receipt
            instance.delete()
            sync_receipt_monthly_allocations(receipt)


class BillViewSet(viewsets.ModelViewSet):
    queryset = Bill.objects.select_related("category", "payment_method").prefetch_related("edit_audits").all()
    serializer_class = BillSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["category", "payment_method", "status", "bill_type"]
    search_fields = ["title", "vendor", "voucher_number", "institution_bill_number", "description"]
    ordering_fields = ["bill_date", "due_date", "amount", "status"]


class BulkDueCollectionViewSet(viewsets.ModelViewSet):
    queryset = BulkDueCollection.objects.select_related("category").prefetch_related("dues").all()
    serializer_class = BulkDueCollectionSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        "year": ["exact"],
        "category": ["exact"],
        "due_date": ["exact", "month"],
    }
    search_fields = ["title", "description"]
    ordering_fields = ["year", "due_date", "amount_per_family"]


class DueViewSet(viewsets.ModelViewSet):
    queryset = Due.objects.select_related("family", "collection", "category").prefetch_related("payments").all()
    serializer_class = DueSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["family", "collection", "category", "year"]
    search_fields = ["title", "description", "family__family_name", "family__head_of_family"]
    ordering_fields = ["due_date", "amount", "year"]


class DuePaymentViewSet(viewsets.ModelViewSet):
    queryset = DuePayment.objects.prefetch_related("edit_audits").all()
    serializer_class = DuePaymentSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["due"]
    search_fields = ["description"]
    ordering_fields = ["payment_date", "amount"]

    def perform_destroy(self, instance):
        with transaction.atomic():
            clear_source_allocations("due_payment", instance.payment_id)
            instance.delete()


class BankTransactionViewSet(viewsets.ModelViewSet):
    queryset = BankTransaction.objects.all()
    serializer_class = BankTransactionSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["transaction_type"]
    search_fields = ["deposited_by", "description"]
    ordering_fields = ["transaction_date", "amount", "transaction_type"]


class SettingsViewSet(viewsets.ModelViewSet):
    queryset = Settings.objects.all()
    serializer_class = SettingsSerializer


@api_view(["GET"])
def family_dues_status(request):
    """Return one outstanding-dues row per family, with database pagination.

    The Unpaid Dues screen combines monthly collection receipts and normal Due
    payments, so a normal DueViewSet page cannot represent one family in one
    row.  This purpose-built endpoint performs that aggregation before the
    response is paginated.
    """
    families = Family.objects.prefetch_related(
        "dues__payments",
    ).order_by("family_name", "family_id")

    query = str(request.query_params.get("search", "")).strip().lower()
    rows = []
    for family in families:
        if query and query not in (family.family_name or "").lower() and query not in (family.head_of_family or "").lower():
            continue

        today = timezone.localdate()
        five_year_start = date(today.year - 4, today.month, 1)
        configured_start = family.monthly_dues_start_month or five_year_start
        tracker_start = max(configured_start.replace(day=1), five_year_start)
        monthly_rows = family_monthly_rows(family, tracker_start, today.replace(day=1))
        monthly_remaining = sum((row["pending"] for row in monthly_rows), Decimal("0"))
        monthly_due = sum((row["due"] for row in monthly_rows), Decimal("0"))
        monthly_paid = sum((row["paid"] for row in monthly_rows), Decimal("0"))
        monthly_status = "Paid" if monthly_remaining == 0 else "Partial" if monthly_paid > 0 else "Unpaid"

        outstanding_titles = []
        dues_paid = Decimal("0")
        dues_remaining = Decimal("0")
        for due in family.dues.all():
            if "[monthly-tracker-due]" in (due.description or "") or "[monthly-opening-due]" in (due.description or ""):
                # This linked row represents the same monthly rows above. Do
                # not count it again in Other Dues or Total Due.
                continue
            paid = sum((payment.amount or Decimal("0") for payment in due.payments.all()), Decimal("0"))
            amount = due.amount or Decimal("0")
            remaining = max(amount - paid, Decimal("0"))
            dues_paid += paid
            dues_remaining += remaining
            if remaining > 0 and due.title and due.title not in outstanding_titles:
                outstanding_titles.append(due.title)

        total_due = monthly_remaining + dues_remaining
        if total_due <= 0:
            continue

        rows.append({
            "familyId": family.family_id,
            "familyName": family.family_name or "Unknown Family",
            "headOfFamily": family.head_of_family or "-",
            "monthlyDue": monthly_due,
            "monthlyPaid": monthly_paid,
            "monthlyStatus": monthly_status,
            "otherDues": ", ".join(outstanding_titles) if outstanding_titles else "None",
            "totalPaid": monthly_paid + dues_paid,
            "totalDue": total_due,
        })

    paginator = StandardResultsSetPagination()
    page = paginator.paginate_queryset(rows, request)
    unpaid_total = sum((row["totalDue"] for row in rows), Decimal("0"))
    response = paginator.get_paginated_response(page)
    response.data["unpaid_total"] = unpaid_total
    return response


@api_view(["GET"])
def family_payment_tracker(request, family_id):
    """Paginated payment-tracker rows and full-year totals for one family."""
    family = Family.objects.filter(pk=family_id).first()
    if not family:
        return Response({"detail": "Family not found."}, status=404)

    payments = DuePayment.objects.filter(due__family_id=family_id).select_related(
        "due", "payment_method"
    ).prefetch_related("edit_audits").order_by("-payment_date", "-payment_id")
    available_years = sorted(
        {payment.payment_date.year for payment in payments if payment.payment_date}, reverse=True
    )
    requested_year = request.query_params.get("year")
    try:
        selected_year = int(requested_year) if requested_year else (available_years[0] if available_years else timezone.localdate().year)
    except (TypeError, ValueError):
        return Response({"detail": "year must be a valid four-digit year."}, status=400)

    year_payments = payments.filter(payment_date__year=selected_year)
    totals = year_payments.aggregate(total_paid=Sum("amount"), payment_count=Count("payment_id"))
    paginator = StandardResultsSetPagination()
    page = paginator.paginate_queryset(year_payments, request)
    serialized = DuePaymentSerializer(page, many=True, context={"request": request}).data
    results = []
    for payment, data in zip(page, serialized):
        results.append({
            "id": data["payment_id"],
            "dueId": data["due"],
            "title": payment.due.title or "Due payment",
            "amount": data["amount"],
            "paymentDate": data["payment_date"],
            "paymentMethodId": data["payment_method"],
            "paymentMethod": payment.payment_method.method_name if payment.payment_method else "—",
            "description": data["description"] or "",
            "editCount": data["edit_count"],
            "lastEditedAt": data["last_edited_at"],
            "previousAmount": data["previous_amount"],
            "lastEditedBy": data["last_edited_by"],
            "previousPaymentMethod": data["previous_payment_method"],
        })

    response = paginator.get_paginated_response(results)
    response.data["summary"] = {
        "year": selected_year,
        "total_paid": totals["total_paid"] or Decimal("0"),
        "payment_count": totals["payment_count"] or 0,
        "available_years": sorted(set(available_years + [timezone.localdate().year]), reverse=True),
    }
    return response


@api_view(["POST"])
@permission_classes([AllowAny])
def password_reset_request(request):
    """Send a one-time reset link without disclosing whether an email exists."""
    email = str(request.data.get("email", "")).strip()
    generic_response = {"detail": "If an active account uses that email address, a password reset link has been sent."}
    if not email:
        return Response(generic_response)

    user_model = get_user_model()
    users = user_model.objects.filter(email__iexact=email, is_active=True)
    for user in users:
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        reset_url = f"{settings.FRONTEND_URL.rstrip('/')}/?reset_uid={uid}&reset_token={token}"
        message = (
            f"Hello {user.get_username()},\n\n"
            "We received a request to reset your Church Management System password.\n"
            f"Use this secure link to choose a new password:\n{reset_url}\n\n"
            "If you did not request this, you can safely ignore this email."
        )
        try:
            send_mail(
                subject="Reset your Church Management password",
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )
        except Exception:
            logger.exception("Password reset email could not be sent")
            return Response({"detail": "The reset email could not be sent. Please contact the system administrator."}, status=503)

    return Response(generic_response)


@api_view(["POST"])
@permission_classes([AllowAny])
def password_reset_confirm(request):
    """Validate the one-time token and set the user's new password."""
    uid = str(request.data.get("uid", ""))
    token = str(request.data.get("token", ""))
    new_password = str(request.data.get("new_password", ""))
    try:
        user_id = force_str(urlsafe_base64_decode(uid))
        user = get_user_model().objects.get(pk=user_id, is_active=True)
    except Exception:
        return Response({"detail": "This password reset link is invalid or has expired."}, status=400)

    if not default_token_generator.check_token(user, token):
        return Response({"detail": "This password reset link is invalid or has expired."}, status=400)

    try:
        validate_password(new_password, user=user)
    except Exception as error:
        messages = getattr(error, "messages", None) or ["Choose a stronger password."]
        return Response({"detail": " ".join(messages)}, status=400)

    user.set_password(new_password)
    user.save(update_fields=["password"])
    return Response({"detail": "Your password has been reset. You can now sign in."})


@api_view(["GET"])
def bootstrap_data(request):
    """Return the complete relational dataset in one request for the SPA.

    The individual viewsets remain the write API.  This read endpoint avoids
    a screen rendering from a partial collection of independently paginated
    requests and is deliberately backed directly by MySQL on every request.
    """
    return Response({
        "families": FamilySerializer(Family.objects.annotate(member_count=Count("members")), many=True).data,
        "family_monthly_due_rates": FamilyMonthlyDueRateSerializer(FamilyMonthlyDueRate.objects.all(), many=True).data,
        "family_monthly_payment_statuses": FamilyMonthlyPaymentStatusSerializer(FamilyMonthlyPaymentStatus.objects.all(), many=True).data,
        "monthly_collection_allocations": MonthlyCollectionAllocationSerializer(MonthlyCollectionAllocation.objects.all(), many=True).data,
        "family_members": FamilyMemberSerializer(FamilyMember.objects.all(), many=True).data,
        "categories": CategorySerializer(Category.objects.all(), many=True).data,
        "payment_methods": PaymentMethodSerializer(PaymentMethod.objects.all(), many=True).data,
        "receipts": ReceiptSerializer(Receipt.objects.select_related("family", "primary_category", "payment_method").prefetch_related("receipt_categories__category", "edit_audits"), many=True).data,
        "receipt_categories": ReceiptCategorySerializer(ReceiptCategory.objects.select_related("category"), many=True).data,
        "bills": BillSerializer(Bill.objects.select_related("category", "payment_method").prefetch_related("edit_audits"), many=True).data,
        "bulk_due_collections": BulkDueCollectionSerializer(BulkDueCollection.objects.all(), many=True).data,
        "dues": DueSerializer(Due.objects.select_related("family", "collection", "category").prefetch_related("payments"), many=True).data,
        "due_payments": DuePaymentSerializer(DuePayment.objects.prefetch_related("edit_audits"), many=True).data,
        "bank_transactions": BankTransactionSerializer(BankTransaction.objects.all(), many=True).data,
        "settings": SettingsSerializer(Settings.objects.all(), many=True).data,
    })
