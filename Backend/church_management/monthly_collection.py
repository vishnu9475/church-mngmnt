"""Shared month-by-month monthly-collection accounting rules."""

from datetime import date
from decimal import Decimal

from django.db import transaction
from django.db.models import Sum
from rest_framework import serializers

from .models import FamilyMonthlyDueRate, FamilyMonthlyPaymentStatus, MonthlyCollectionAllocation


def month_start(value):
    """Accept a date or YYYY-MM/ISO-date string and return the first day."""
    if isinstance(value, date):
        return value.replace(day=1)
    value = str(value or "").strip()
    try:
        return date.fromisoformat(f"{value[:7]}-01")
    except ValueError as error:
        raise serializers.ValidationError({"monthly_period": "Use valid months in YYYY-MM format."}) from error


def months_between(start, end):
    start, end = month_start(start), month_start(end)
    if start > end:
        raise serializers.ValidationError({"monthly_period": "The end month must not be before the start month."})
    result = []
    cursor = start
    while cursor <= end:
        result.append(cursor)
        cursor = date(cursor.year + (cursor.month == 12), 1 if cursor.month == 12 else cursor.month + 1, 1)
    return result


def due_amount(family, month):
    rate = FamilyMonthlyDueRate.objects.filter(family=family, month=month_start(month)).values_list("amount", flat=True).first()
    return Decimal(str(rate if rate is not None else (family.monthly_collection_amount or 0)))


def manual_paid(family, month):
    return Decimal(str(FamilyMonthlyPaymentStatus.objects.filter(family=family, month=month_start(month)).values_list("paid_amount", flat=True).first() or 0))


def allocation_paid(family, month, exclude_source=None):
    rows = MonthlyCollectionAllocation.objects.filter(family=family, month=month_start(month))
    if exclude_source:
        rows = rows.exclude(source_type=exclude_source[0], source_id=exclude_source[1])
    return rows.aggregate(total=Sum("amount"))["total"] or Decimal("0")


def outstanding_for_month(family, month, exclude_source=None):
    due = due_amount(family, month)
    paid = manual_paid(family, month) + allocation_paid(family, month, exclude_source)
    return max(due - paid, Decimal("0"))


def allocate_payment(family, start_month, end_month, amount, source_type, source_id, strict=True):
    """Allocate an amount oldest-month-first, leaving a final partial month.

    The source is first removed so receipt/payment edits are recalculated from
    their current amount and period.  Fully settled selected months are never
    charged again.
    """
    total = Decimal(str(amount or 0))
    if total <= 0:
        raise serializers.ValidationError({"amount": "Monthly collection payment must be greater than zero."})
    months = months_between(start_month, end_month)
    source = (source_type, int(source_id))
    with transaction.atomic():
        family = type(family).objects.select_for_update().get(pk=family.pk)
        MonthlyCollectionAllocation.objects.filter(
            family=family, source_type=source_type, source_id=source_id
        ).delete()
        available = [(month, outstanding_for_month(family, month, source)) for month in months]
        available_total = sum((balance for _, balance in available), Decimal("0"))
        if available_total <= 0 and strict:
            raise serializers.ValidationError({"monthly_period": "Every selected month is already fully paid."})
        if total > available_total and strict:
            raise serializers.ValidationError({
                "amount": f"Monthly collection payment cannot exceed the selected months' pending balance of ₹{available_total:.2f}."
            })
        remaining = min(total, available_total)
        rows = []
        for month, balance in available:
            if remaining <= 0:
                break
            paid_here = min(balance, remaining)
            if paid_here > 0:
                rows.append(MonthlyCollectionAllocation(
                    family=family, month=month, amount=paid_here,
                    source_type=source_type, source_id=source_id,
                ))
                remaining -= paid_here
        MonthlyCollectionAllocation.objects.bulk_create(rows)
    return rows


def clear_source_allocations(source_type, source_id):
    MonthlyCollectionAllocation.objects.filter(source_type=source_type, source_id=source_id).delete()


def family_monthly_rows(family, start_month, end_month):
    """Return the single source of truth used by all monthly dues screens."""
    rows = []
    for month in months_between(start_month, end_month):
        due = due_amount(family, month)
        manual = manual_paid(family, month)
        allocated = allocation_paid(family, month)
        paid = min(due, manual + allocated)
        rows.append({
            "month": month,
            "due": due,
            "paid": paid,
            "pending": max(due - paid, Decimal("0")),
            "manual_paid": manual,
            "allocated_paid": allocated,
        })
    return rows
