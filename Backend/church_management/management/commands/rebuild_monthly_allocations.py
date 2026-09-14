from django.core.management.base import BaseCommand
from django.db import transaction

from church_management.models import DuePayment, MonthlyCollectionAllocation, Receipt
from church_management.monthly_collection import allocate_payment
from church_management.serializers import _receipt_has_monthly_collection, _receipt_monthly_period


class Command(BaseCommand):
    help = "Rebuild the month-by-month monthly collection allocation ledger from existing receipts and backlog payments."

    def handle(self, *args, **options):
        created_sources = 0
        with transaction.atomic():
            MonthlyCollectionAllocation.objects.all().delete()
            receipts = Receipt.objects.select_related("family", "primary_category").prefetch_related("receipt_categories__category").order_by("receipt_date", "receipt_id")
            for receipt in receipts:
                period = _receipt_monthly_period(receipt)
                if not receipt.family_id or not period or not _receipt_has_monthly_collection(receipt):
                    continue
                start_month, end_month, amount = period
                allocate_payment(receipt.family, start_month, end_month, amount, "receipt", receipt.receipt_id, strict=False)
                created_sources += 1

            payments = DuePayment.objects.select_related("due__family").order_by("payment_date", "payment_id")
            for payment in payments:
                due = payment.due
                if not due.family_id or not (
                    "[monthly-tracker-due]" in (due.description or "")
                    or "[monthly-opening-due]" in (due.description or "")
                ):
                    continue
                family = due.family
                start_month = family.monthly_dues_start_month or due.due_date or payment.payment_date
                allocate_payment(family, start_month, payment.payment_date, payment.amount, "due_payment", payment.payment_id, strict=False)
                created_sources += 1

        count = MonthlyCollectionAllocation.objects.count()
        self.stdout.write(self.style.SUCCESS(f"Rebuilt {count} monthly allocations from {created_sources} payment sources."))
