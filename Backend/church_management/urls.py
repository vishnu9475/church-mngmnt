from rest_framework.routers import DefaultRouter

from django.urls import path

from .views import (
    FamilyViewSet, FamilyMonthlyDueRateViewSet, FamilyMonthlyPaymentStatusViewSet, FamilyMemberViewSet, CategoryViewSet, PaymentMethodViewSet,
    ReceiptViewSet, ReceiptCategoryViewSet, BillViewSet, BulkDueCollectionViewSet,
    DueViewSet, DuePaymentViewSet, BankTransactionViewSet, SettingsViewSet, bootstrap_data, family_dues_status, family_payment_tracker,
)

router = DefaultRouter()
router.register(r"families", FamilyViewSet)
router.register(r"family-monthly-due-rates", FamilyMonthlyDueRateViewSet)
router.register(r"family-monthly-payment-statuses", FamilyMonthlyPaymentStatusViewSet)
router.register(r"family-members", FamilyMemberViewSet)
router.register(r"categories", CategoryViewSet)
router.register(r"payment-methods", PaymentMethodViewSet)
router.register(r"receipts", ReceiptViewSet)
router.register(r"receipt-categories", ReceiptCategoryViewSet)
router.register(r"bills", BillViewSet)
router.register(r"bulk-due-collections", BulkDueCollectionViewSet)
router.register(r"dues", DueViewSet)
router.register(r"due-payments", DuePaymentViewSet)
router.register(r"bank-transactions", BankTransactionViewSet)
router.register(r"settings", SettingsViewSet)

urlpatterns = [
    path("bootstrap/", bootstrap_data, name="bootstrap-data"),
    path("family-dues-status/", family_dues_status, name="family-dues-status"),
    path("families/<int:family_id>/payment-tracker/", family_payment_tracker, name="family-payment-tracker"),
    *router.urls,
]
