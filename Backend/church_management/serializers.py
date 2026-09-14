import re
from datetime import date
from decimal import Decimal
from django.db import transaction
from django.db.models import Sum
from rest_framework import serializers

from .models import (
    Family, FamilyMonthlyDueRate, FamilyMonthlyPaymentStatus, FamilyMonthlyPaymentStatusAudit, MonthlyCollectionAllocation, FamilyMember, Category, PaymentMethod,
    Receipt, ReceiptEditAudit, ReceiptCategory, Bill, BillEditAudit, BulkDueCollection,
    Due, DuePayment, DuePaymentEditAudit, BankTransaction, Settings,
)
from .monthly_collection import allocate_payment, clear_source_allocations


MONTHLY_PERIOD_PATTERN = re.compile(
    r"\[Monthly collection period:\s*(\d{4}-\d{2})\s*to\s*(\d{4}-\d{2});\s*monthly amount:\s*(\d+(?:\.\d+)?)\]",
    re.IGNORECASE,
)
LEGACY_MONTHLY_PERIOD_PATTERN = re.compile(
    r"Monthly collection:\s*(\d{4}-\d{2})(?:-\d{2})?\s+to\s+(\d{4}-\d{2})(?:-\d{2})?",
    re.IGNORECASE,
)
MONTHLY_DUE_PAYMENT_PERIOD_PATTERN = re.compile(
    r"\[Monthly due payment period:\s*(\d{4}-\d{2})\s*to\s*(\d{4}-\d{2})\]",
    re.IGNORECASE,
)


def _receipt_monthly_period(receipt):
    """Return (from_month, to_month, monthly_amount) from a receipt marker."""
    description = receipt.description or ""
    matched = MONTHLY_PERIOD_PATTERN.search(description)
    if matched:
        return matched.group(1), matched.group(2), Decimal(matched.group(3))
    matched = LEGACY_MONTHLY_PERIOD_PATTERN.search(description)
    if matched:
        return matched.group(1), matched.group(2), Decimal(str(receipt.amount or 0))
    return None


def _receipt_has_monthly_collection(receipt):
    if receipt.primary_category and (receipt.primary_category.category_name or "").lower() == "monthly collection":
        return True
    return receipt.receipt_categories.filter(category__category_name__iexact="Monthly Collection").exists()


def sync_receipt_monthly_allocations(receipt):
    """Keep the month ledger in sync with a receipt and its category links."""
    clear_source_allocations("receipt", receipt.receipt_id)
    period = _receipt_monthly_period(receipt)
    if not receipt.family_id or not period or not _receipt_has_monthly_collection(receipt):
        return
    start_month, end_month, monthly_amount = period
    allocate_payment(receipt.family, start_month, end_month, monthly_amount, "receipt", receipt.receipt_id)


def sync_due_payment_monthly_allocations(payment):
    """Allocate payments made against the linked previous-monthly-due row."""
    clear_source_allocations("due_payment", payment.payment_id)
    due = payment.due
    description = due.description or ""
    is_monthly_backlog = (
        "[monthly-tracker-due]" in description
        or "[monthly-opening-due]" in description
    )
    if not is_monthly_backlog or not due.family_id:
        return
    family = due.family
    period = MONTHLY_DUE_PAYMENT_PERIOD_PATTERN.search(payment.description or "")
    if period:
        start_month, end_month = period.group(1), period.group(2)
    else:
        start_month = family.monthly_dues_start_month or due.due_date or date.today().replace(day=1)
        end_month = min(payment.payment_date or date.today(), date.today()).replace(day=1)
    allocate_payment(family, start_month, end_month, payment.amount, "due_payment", payment.payment_id)


class FamilySerializer(serializers.ModelSerializer):
    MONTHLY_OPENING_TAG = "[monthly-opening-due]"
    member_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Family
        fields = [
            "family_id", "family_name", "head_of_family", "address",
            "phone", "email", "monthly_collection_amount",
            "monthly_dues_start_month", "monthly_dues_opening_balance",
            "created_at", "updated_at", "member_count",
        ]

    @classmethod
    def _sync_previous_monthly_due(cls, family):
        """Keep the legacy monthly balance payable through the normal Due API."""
        opening_amount = Decimal(str(family.monthly_dues_opening_balance or 0))
        existing_due = Due.objects.filter(
            family=family,
            description__icontains=cls.MONTHLY_OPENING_TAG,
        ).order_by("due_id").first()

        if opening_amount <= 0:
            if existing_due and not existing_due.payments.exists():
                existing_due.delete()
            return

        monthly_due_category, _ = Category.objects.get_or_create(
            category_name="Monthly Collection",
            category_type="Due",
            defaults={"description": "Monthly collection dues"},
        )
        due_date = family.monthly_dues_start_month
        if not due_date:
            from django.utils import timezone
            due_date = timezone.localdate().replace(day=1)

        if existing_due:
            paid_amount = existing_due.payments.aggregate(total=Sum("amount"))["total"] or Decimal("0")
            if opening_amount < paid_amount:
                raise serializers.ValidationError({
                    "monthly_dues_opening_balance": "The original previous-dues total cannot be less than payments already recorded."
                })
            existing_due.amount = opening_amount
            existing_due.due_date = due_date
            existing_due.year = due_date.year
            existing_due.category = monthly_due_category
            existing_due.save()
            return

        Due.objects.create(
            family=family,
            title="Previous Monthly Payment Dues",
            amount=opening_amount,
            due_date=due_date,
            year=due_date.year,
            category=monthly_due_category,
            description=f"{cls.MONTHLY_OPENING_TAG} Monthly collection arrears carried from previous records.",
        )

    def create(self, validated_data):
        with transaction.atomic():
            family = Family.objects.create(**validated_data)
            self._sync_previous_monthly_due(family)
        return family

    def update(self, instance, validated_data):
        with transaction.atomic():
            for field, value in validated_data.items():
                setattr(instance, field, value)
            instance.save()
            self._sync_previous_monthly_due(instance)
        return instance


class FamilyMemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = FamilyMember
        fields = [
            "member_id", "family", "name", "relationship",
            "date_of_birth", "phone", "email",
        ]


class FamilyMonthlyDueRateSerializer(serializers.ModelSerializer):
    class Meta:
        model = FamilyMonthlyDueRate
        fields = ["rate_id", "family", "month", "amount"]

    def validate_amount(self, value):
        if value < 0:
            raise serializers.ValidationError("Monthly due amount cannot be negative.")
        return value

    def validate_month(self, value):
        if value.day != 1:
            raise serializers.ValidationError("Use the first day of the month (YYYY-MM-01).")
        return value


class FamilyMonthlyPaymentStatusSerializer(serializers.ModelSerializer):
    audit_count = serializers.SerializerMethodField(read_only=True)
    last_changed_at = serializers.SerializerMethodField(read_only=True)
    last_changed_by = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = FamilyMonthlyPaymentStatus
        fields = ["status_id", "family", "month", "status", "paid_amount", "notes", "audit_count", "last_changed_at", "last_changed_by"]

    def _latest_audit(self, instance):
        return instance.audit_entries.order_by("-changed_at").first()

    def get_audit_count(self, instance):
        return instance.audit_entries.count()

    def get_last_changed_at(self, instance):
        audit = self._latest_audit(instance)
        return audit.changed_at if audit else None

    def get_last_changed_by(self, instance):
        audit = self._latest_audit(instance)
        return audit.changed_by if audit else None

    def validate(self, attrs):
        status = attrs.get("status", getattr(self.instance, "status", "Unpaid"))
        paid_amount = Decimal(str(attrs.get("paid_amount", getattr(self.instance, "paid_amount", 0)) or 0))
        if paid_amount < 0:
            raise serializers.ValidationError({"paid_amount": "Paid amount cannot be negative."})
        if status == "Paid" and paid_amount <= 0:
            raise serializers.ValidationError({"paid_amount": "Enter the paid amount when marking a month as paid."})
        if status == "Unpaid" and paid_amount != 0:
            raise serializers.ValidationError({"paid_amount": "An unpaid month must have a paid amount of zero."})
        return attrs

    def validate_month(self, value):
        if value.day != 1:
            raise serializers.ValidationError("Use the first day of the month (YYYY-MM-01).")
        return value


class MonthlyCollectionAllocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = MonthlyCollectionAllocation
        fields = ["allocation_id", "family", "month", "amount", "source_type", "source_id", "created_at"]


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["category_id", "category_name", "category_type", "description"]


class PaymentMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentMethod
        fields = ["payment_method_id", "method_name"]


class ReceiptCategorySerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.category_name", read_only=True)

    class Meta:
        model = ReceiptCategory
        fields = ["id", "receipt", "category", "category_name"]

    def create(self, validated_data):
        with transaction.atomic():
            relation = ReceiptCategory.objects.create(**validated_data)
            sync_receipt_monthly_allocations(relation.receipt)
        return relation

    def update(self, instance, validated_data):
        with transaction.atomic():
            previous_receipt = instance.receipt
            for field, value in validated_data.items():
                setattr(instance, field, value)
            instance.save()
            sync_receipt_monthly_allocations(previous_receipt)
            sync_receipt_monthly_allocations(instance.receipt)
        return instance


class ReceiptSerializer(serializers.ModelSerializer):
    family_name = serializers.CharField(source="family.family_name", read_only=True, default=None)
    payment_method_name = serializers.CharField(source="payment_method.method_name", read_only=True)
    category_name = serializers.CharField(source="primary_category.category_name", read_only=True)
    categories = ReceiptCategorySerializer(source="receipt_categories", many=True, read_only=True)
    edit_count = serializers.SerializerMethodField(read_only=True)
    last_edited_at = serializers.SerializerMethodField(read_only=True)
    previous_amount = serializers.SerializerMethodField(read_only=True)
    last_edited_by = serializers.SerializerMethodField(read_only=True)
    previous_payment_method = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Receipt
        fields = [
            "receipt_id", "receipt_number", "family", "family_name",
            "other_payer_name", "title", "primary_category", "category_name",
            "amount", "receipt_date", "payment_method", "payment_method_name",
            "description", "categories", "edit_count", "last_edited_at",
            "previous_amount", "last_edited_by", "previous_payment_method",
        ]
        # Receipt numbers are allocated on the server from Settings.  A client
        # must never be able to choose or overwrite an accounting identifier.
        read_only_fields = ["receipt_id", "receipt_number", "family_name", "category_name", "payment_method_name", "categories"]

    def create(self, validated_data):
        # Lock the single settings row while allocating the next number. This
        # prevents two simultaneous users from receiving the same receipt no.
        with transaction.atomic():
            app_settings = Settings.objects.select_for_update().order_by("setting_id").first()
            if not app_settings:
                raise serializers.ValidationError("Create a Settings record before creating receipts.")
            if not app_settings.receipt_prefix or not app_settings.next_receipt_number or app_settings.next_receipt_number < 1:
                raise serializers.ValidationError("Configure a valid receipt prefix and next receipt number in Settings.")

            validated_data["receipt_number"] = f"{app_settings.receipt_prefix}{app_settings.next_receipt_number}"
            receipt = Receipt.objects.create(**validated_data)
            # Primary Monthly Collection receipts are allocated immediately.
            # When it is an additional category, ReceiptCategorySerializer
            # runs the same sync once that category link is saved.
            sync_receipt_monthly_allocations(receipt)
            app_settings.next_receipt_number += 1
            app_settings.save(update_fields=["next_receipt_number"])
        return receipt

    def update(self, instance, validated_data):
        # Write the receipt change and its audit row together, so the audit
        # history cannot fall out of sync with the accounting record.
        with transaction.atomic():
            locked_receipt = Receipt.objects.select_for_update().get(pk=instance.pk)
            previous_amount = locked_receipt.amount or Decimal("0")
            new_amount = Decimal(str(validated_data.get("amount", previous_amount)))
            previous_payment_method = (
                locked_receipt.payment_method.method_name
                if locked_receipt.payment_method else None
            )
            updated_payment_method = validated_data.get(
                "payment_method", locked_receipt.payment_method
            )
            new_payment_method = (
                updated_payment_method.method_name if updated_payment_method else None
            )
            request = self.context.get("request")
            changed_by = (
                request.user.get_username()
                if request and getattr(request, "user", None) and request.user.is_authenticated
                else "System"
            )

            for field, value in validated_data.items():
                setattr(locked_receipt, field, value)
            locked_receipt.save()
            sync_receipt_monthly_allocations(locked_receipt)
            ReceiptEditAudit.objects.create(
                receipt=locked_receipt,
                previous_amount=previous_amount,
                new_amount=new_amount,
                previous_payment_method=previous_payment_method,
                new_payment_method=new_payment_method,
                changed_by=changed_by,
            )
        return locked_receipt

    @staticmethod
    def _latest_audit(obj):
        return obj.edit_audits.first()

    def get_edit_count(self, obj):
        return obj.edit_audits.count()

    def get_last_edited_at(self, obj):
        audit = self._latest_audit(obj)
        return audit.changed_at if audit else None

    def get_previous_amount(self, obj):
        audit = self._latest_audit(obj)
        return audit.previous_amount if audit else None

    def get_last_edited_by(self, obj):
        audit = self._latest_audit(obj)
        return audit.changed_by if audit else None

    def get_previous_payment_method(self, obj):
        audit = self._latest_audit(obj)
        return audit.previous_payment_method if audit else None


class BillSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.category_name", read_only=True)
    payment_method_name = serializers.CharField(source="payment_method.method_name", read_only=True)
    edit_count = serializers.SerializerMethodField(read_only=True)
    last_edited_at = serializers.SerializerMethodField(read_only=True)
    previous_amount = serializers.SerializerMethodField(read_only=True)
    last_edited_by = serializers.SerializerMethodField(read_only=True)
    previous_payment_method = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Bill
        fields = [
            "bill_id", "bill_type", "voucher_number", "institution_bill_number",
            "title", "vendor", "amount", "bill_date", "due_date",
            "category", "category_name", "payment_method", "payment_method_name",
            "status", "description", "edit_count", "last_edited_at",
            "previous_amount", "last_edited_by", "previous_payment_method",
        ]
        # Voucher numbers are server-managed; institution bill numbers remain
        # editable because they are external supplier references.
        read_only_fields = ["bill_id", "voucher_number", "category_name", "payment_method_name"]

    def create(self, validated_data):
        # Only vouchers receive a church-generated number. Ordinary bills may
        # retain the supplier/institution number entered by the user.
        if validated_data.get("bill_type") != "Voucher":
            return Bill.objects.create(**validated_data)

        with transaction.atomic():
            app_settings = Settings.objects.select_for_update().order_by("setting_id").first()
            if not app_settings:
                raise serializers.ValidationError("Create a Settings record before creating vouchers.")
            if not app_settings.voucher_prefix or not app_settings.next_voucher_number or app_settings.next_voucher_number < 1:
                raise serializers.ValidationError("Configure a valid voucher prefix and next voucher number in Settings.")

            validated_data["voucher_number"] = f"{app_settings.voucher_prefix}{app_settings.next_voucher_number}"
            bill = Bill.objects.create(**validated_data)
            app_settings.next_voucher_number += 1
            app_settings.save(update_fields=["next_voucher_number"])
        return bill

    def update(self, instance, validated_data):
        # Record each update before changing the bill. The audit is written in
        # the same database transaction as the actual bill update.
        with transaction.atomic():
            locked_bill = Bill.objects.select_for_update().get(pk=instance.pk)
            previous_amount = locked_bill.amount or Decimal("0")
            new_amount = Decimal(str(validated_data.get("amount", previous_amount)))
            previous_payment_method = (
                locked_bill.payment_method.method_name
                if locked_bill.payment_method else None
            )
            updated_payment_method = validated_data.get(
                "payment_method", locked_bill.payment_method
            )
            new_payment_method = (
                updated_payment_method.method_name if updated_payment_method else None
            )
            request = self.context.get("request")
            changed_by = (
                request.user.get_username()
                if request and getattr(request, "user", None) and request.user.is_authenticated
                else "System"
            )

            for field, value in validated_data.items():
                setattr(locked_bill, field, value)
            locked_bill.save()
            BillEditAudit.objects.create(
                bill=locked_bill,
                previous_amount=previous_amount,
                new_amount=new_amount,
                previous_payment_method=previous_payment_method,
                new_payment_method=new_payment_method,
                changed_by=changed_by,
            )
        return locked_bill

    @staticmethod
    def _latest_audit(obj):
        return obj.edit_audits.first()

    def get_edit_count(self, obj):
        return obj.edit_audits.count()

    def get_last_edited_at(self, obj):
        audit = self._latest_audit(obj)
        return audit.changed_at if audit else None

    def get_previous_amount(self, obj):
        audit = self._latest_audit(obj)
        return audit.previous_amount if audit else None

    def get_last_edited_by(self, obj):
        audit = self._latest_audit(obj)
        return audit.changed_by if audit else None

    def get_previous_payment_method(self, obj):
        audit = self._latest_audit(obj)
        # There is no reliable way to recover the historical method for audits
        # created before this field existed, so intentionally return null.
        return audit.previous_payment_method if audit else None


class BulkDueCollectionSerializer(serializers.ModelSerializer):
    # These IDs are supplied only when a collection is created. The server
    # creates the matching Due rows, rather than trusting the browser to do it.
    selected_family_ids = serializers.ListField(
        child=serializers.IntegerField(), write_only=True, required=True, min_length=1
    )
    family_count = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = BulkDueCollection
        fields = [
            "collection_id", "title", "amount_per_family",
            "due_date", "year", "category", "description",
            "selected_family_ids", "family_count",
        ]

    def validate_selected_family_ids(self, family_ids):
        unique_ids = list(set(family_ids))
        found_ids = set(Family.objects.filter(family_id__in=unique_ids).values_list("family_id", flat=True))
        missing_ids = set(unique_ids) - found_ids
        if missing_ids:
            raise serializers.ValidationError("One or more selected families do not exist.")
        return unique_ids

    def validate_amount_per_family(self, amount):
        if amount is None or Decimal(str(amount)) <= 0:
            raise serializers.ValidationError("Amount per family must be greater than zero.")
        return amount

    def create(self, validated_data):
        family_ids = validated_data.pop("selected_family_ids")
        # Collection and all selected-family dues either save together or not
        # at all, preserving MySQL consistency if an error occurs.
        with transaction.atomic():
            collection = BulkDueCollection.objects.create(**validated_data)
            Due.objects.bulk_create([
                Due(
                    family_id=family_id,
                    collection=collection,
                    title=collection.title,
                    amount=collection.amount_per_family,
                    due_date=collection.due_date,
                    year=collection.year,
                    category_id=collection.category_id,
                    description=collection.description,
                )
                for family_id in family_ids
            ])
        return collection

    def get_family_count(self, obj):
        return obj.dues.count()


class DuePaymentSerializer(serializers.ModelSerializer):
    edit_count = serializers.SerializerMethodField(read_only=True)
    last_edited_at = serializers.SerializerMethodField(read_only=True)
    previous_amount = serializers.SerializerMethodField(read_only=True)
    last_edited_by = serializers.SerializerMethodField(read_only=True)
    previous_payment_method = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = DuePayment
        fields = [
            "payment_id", "due", "amount", "payment_date", "payment_method", "description",
            "edit_count", "last_edited_at", "previous_amount", "last_edited_by",
            "previous_payment_method",
        ]

    @staticmethod
    def _validate_amount(amount, due, payment_id=None):
        """Reject invalid or excessive payments against the current due balance."""
        payment_amount = Decimal(str(amount or 0))
        if payment_amount <= 0:
            raise serializers.ValidationError({"amount": "Payment amount must be greater than zero."})

        payments = DuePayment.objects.filter(due=due)
        if payment_id:
            payments = payments.exclude(payment_id=payment_id)
        paid_amount = payments.aggregate(total=Sum("amount"))["total"] or Decimal("0")
        remaining_amount = Decimal(str(due.amount or 0)) - paid_amount
        if payment_amount > remaining_amount:
            raise serializers.ValidationError({
                "amount": f"Payment cannot exceed the pending due amount of ₹{max(remaining_amount, Decimal('0')):.2f}."
            })

    def validate(self, attrs):
        # This gives the UI a clear error before saving. create/update repeat the
        # check while holding a database lock to protect against simultaneous requests.
        due = attrs.get("due", getattr(self.instance, "due", None))
        amount = attrs.get("amount", getattr(self.instance, "amount", None))
        if due:
            self._validate_amount(amount, due, getattr(self.instance, "payment_id", None))
        return attrs

    def create(self, validated_data):
        with transaction.atomic():
            due = Due.objects.select_for_update().get(pk=validated_data["due"].pk)
            self._validate_amount(validated_data["amount"], due)
            validated_data["due"] = due
            payment = DuePayment.objects.create(**validated_data)
            sync_due_payment_monthly_allocations(payment)
            return payment

    def update(self, instance, validated_data):
        with transaction.atomic():
            locked_payment = DuePayment.objects.select_for_update().get(pk=instance.pk)
            due = Due.objects.select_for_update().get(pk=validated_data.get("due", locked_payment.due).pk)
            amount = validated_data.get("amount", locked_payment.amount)
            self._validate_amount(amount, due, locked_payment.payment_id)
            validated_data["due"] = due
            previous_amount = locked_payment.amount or Decimal("0")
            new_amount = Decimal(str(amount))
            previous_payment_method = (
                locked_payment.payment_method.method_name
                if locked_payment.payment_method else None
            )
            updated_payment_method = validated_data.get(
                "payment_method", locked_payment.payment_method
            )
            new_payment_method = (
                updated_payment_method.method_name if updated_payment_method else None
            )
            request = self.context.get("request")
            changed_by = (
                request.user.get_username()
                if request and getattr(request, "user", None) and request.user.is_authenticated
                else "System"
            )
            for field, value in validated_data.items():
                setattr(locked_payment, field, value)
            locked_payment.save()
            sync_due_payment_monthly_allocations(locked_payment)
            DuePaymentEditAudit.objects.create(
                payment=locked_payment,
                previous_amount=previous_amount,
                new_amount=new_amount,
                previous_payment_method=previous_payment_method,
                new_payment_method=new_payment_method,
                changed_by=changed_by,
            )
            return locked_payment

    @staticmethod
    def _latest_audit(obj):
        return obj.edit_audits.first()

    def get_edit_count(self, obj):
        return obj.edit_audits.count()

    def get_last_edited_at(self, obj):
        audit = self._latest_audit(obj)
        return audit.changed_at if audit else None

    def get_previous_amount(self, obj):
        audit = self._latest_audit(obj)
        return audit.previous_amount if audit else None

    def get_last_edited_by(self, obj):
        audit = self._latest_audit(obj)
        return audit.changed_by if audit else None

    def get_previous_payment_method(self, obj):
        audit = self._latest_audit(obj)
        return audit.previous_payment_method if audit else None


class DueSerializer(serializers.ModelSerializer):
    family_name = serializers.CharField(source="family.family_name", read_only=True)
    payments = DuePaymentSerializer(many=True, read_only=True)
    paid_amount = serializers.SerializerMethodField()
    remaining_amount = serializers.SerializerMethodField()

    class Meta:
        model = Due
        fields = [
            "due_id", "family", "family_name", "collection", "title",
            "amount", "due_date", "year", "category", "description",
            "payments", "paid_amount", "remaining_amount",
        ]

    def get_paid_amount(self, obj):
        return sum((p.amount for p in obj.payments.all()), start=0)

    def get_remaining_amount(self, obj):
        paid = sum((p.amount for p in obj.payments.all()), start=0)
        return max((obj.amount or 0) - paid, 0)

    def update(self, instance, validated_data):
        linked_monthly_due = (
            "[monthly-tracker-due]" in (instance.description or "")
            or "[monthly-opening-due]" in (instance.description or "")
        )
        if linked_monthly_due:
            new_amount = Decimal(str(validated_data.get("amount", instance.amount)))
            new_category = validated_data.get("category", instance.category)
            if new_amount != (instance.amount or Decimal("0")):
                raise serializers.ValidationError({"amount": "Amount is calculated by Monthly Payment Dues Details and cannot be edited here."})
            if (new_category.pk if new_category else None) != instance.category_id:
                raise serializers.ValidationError({"category": "Category is fixed for Previous Monthly Dues Pending."})
            updated_description = str(validated_data.get("description", instance.description) or "")
            if "[monthly-tracker-due]" not in updated_description and "[monthly-opening-due]" not in updated_description:
                raise serializers.ValidationError({"description": "The linked monthly-due reference cannot be removed."})
        return super().update(instance, validated_data)


class BankTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = BankTransaction
        fields = [
            "transaction_id", "transaction_type", "amount",
            "transaction_date", "deposited_by", "description",
        ]

    def validate(self, attrs):
        # A deposit transfers cash to the bank. Enforce the same cash-in-hand
        # calculation used by the UI so a request cannot overdraw cash.
        if attrs.get("transaction_type") == "Deposit":
            amount = Decimal(str(attrs.get("amount") or 0))
            app_settings = Settings.objects.order_by("setting_id").first()
            opening_cash = Decimal(str(app_settings.opening_cash or 0)) if app_settings else Decimal("0")
            cash_receipts = Receipt.objects.filter(payment_method__method_name__iexact="Cash").aggregate(total=Sum("amount"))["total"] or Decimal("0")
            cash_bills = Bill.objects.filter(status="Paid", payment_method__method_name__iexact="Cash").aggregate(total=Sum("amount"))["total"] or Decimal("0")
            deposits = BankTransaction.objects.filter(transaction_type="Deposit").aggregate(total=Sum("amount"))["total"] or Decimal("0")
            withdrawals = BankTransaction.objects.filter(transaction_type="Withdrawal").aggregate(total=Sum("amount"))["total"] or Decimal("0")
            available_cash = opening_cash + cash_receipts - cash_bills - deposits + withdrawals
            if amount <= 0:
                raise serializers.ValidationError({"amount": "Deposit amount must be greater than zero."})
            if amount > available_cash:
                raise serializers.ValidationError({"amount": f"Deposit cannot exceed available cash of ₹{available_cash:.2f}."})
        if attrs.get("transaction_type") == "Withdrawal":
            amount = Decimal(str(attrs.get("amount") or 0))
            app_settings = Settings.objects.order_by("setting_id").first()
            opening_bank = Decimal(str(app_settings.opening_bank or 0)) if app_settings else Decimal("0")
            bank_receipts = Receipt.objects.exclude(payment_method__method_name__iexact="Cash").aggregate(total=Sum("amount"))["total"] or Decimal("0")
            bank_bills = Bill.objects.filter(status="Paid").exclude(payment_method__method_name__iexact="Cash").aggregate(total=Sum("amount"))["total"] or Decimal("0")
            deposits = BankTransaction.objects.filter(transaction_type="Deposit").aggregate(total=Sum("amount"))["total"] or Decimal("0")
            withdrawals = BankTransaction.objects.filter(transaction_type="Withdrawal").aggregate(total=Sum("amount"))["total"] or Decimal("0")
            available_bank = opening_bank + bank_receipts - bank_bills + deposits - withdrawals
            if amount <= 0:
                raise serializers.ValidationError({"amount": "Withdrawal amount must be greater than zero."})
            if amount > available_bank:
                raise serializers.ValidationError({"amount": f"Withdrawal cannot exceed available bank balance of ₹{available_bank:.2f}."})
        return attrs


class SettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Settings
        fields = [
            "setting_id", "receipt_prefix", "next_receipt_number",
            "voucher_prefix", "next_voucher_number", "financial_year",
            "opening_cash", "opening_bank",
        ]

    def validate(self, attrs):
        for field in ("next_receipt_number", "next_voucher_number"):
            value = attrs.get(field)
            if value is not None and value < 1:
                raise serializers.ValidationError({field: "Must be at least 1."})
        return attrs
