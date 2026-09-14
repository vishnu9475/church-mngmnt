from django.contrib import admin

from .models import (
    Family, FamilyMember, Category, PaymentMethod,
    Receipt, ReceiptCategory, Bill, BulkDueCollection,
    Due, DuePayment, BankTransaction, Settings,
)


@admin.register(Family)
class FamilyAdmin(admin.ModelAdmin):
    list_display = ("family_id", "family_name", "head_of_family", "monthly_collection_amount", "phone")
    search_fields = ("family_name", "head_of_family")


@admin.register(FamilyMember)
class FamilyMemberAdmin(admin.ModelAdmin):
    list_display = ("member_id", "name", "family", "relationship", "date_of_birth")
    list_filter = ("relationship",)
    search_fields = ("name",)


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("category_id", "category_name", "category_type")
    list_filter = ("category_type",)


@admin.register(PaymentMethod)
class PaymentMethodAdmin(admin.ModelAdmin):
    list_display = ("payment_method_id", "method_name")


@admin.register(Receipt)
class ReceiptAdmin(admin.ModelAdmin):
    list_display = ("receipt_id", "receipt_number", "family", "other_payer_name", "amount", "receipt_date", "payment_method")
    list_filter = ("payment_method", "primary_category")
    search_fields = ("receipt_number", "title", "other_payer_name")


@admin.register(ReceiptCategory)
class ReceiptCategoryAdmin(admin.ModelAdmin):
    list_display = ("id", "receipt", "category")


@admin.register(Bill)
class BillAdmin(admin.ModelAdmin):
    list_display = ("bill_id", "title", "vendor", "amount", "bill_date", "due_date", "status")
    list_filter = ("status", "bill_type", "category")
    search_fields = ("title", "vendor")


@admin.register(BulkDueCollection)
class BulkDueCollectionAdmin(admin.ModelAdmin):
    list_display = ("collection_id", "title", "amount_per_family", "due_date", "year")


@admin.register(Due)
class DueAdmin(admin.ModelAdmin):
    list_display = ("due_id", "title", "family", "amount", "due_date", "year")
    list_filter = ("year", "collection")


@admin.register(DuePayment)
class DuePaymentAdmin(admin.ModelAdmin):
    list_display = ("payment_id", "due", "amount", "payment_date", "payment_method")


@admin.register(BankTransaction)
class BankTransactionAdmin(admin.ModelAdmin):
    list_display = ("transaction_id", "transaction_type", "amount", "transaction_date", "deposited_by")
    list_filter = ("transaction_type",)


@admin.register(Settings)
class SettingsAdmin(admin.ModelAdmin):
    list_display = ("setting_id", "financial_year", "opening_cash", "opening_bank")
