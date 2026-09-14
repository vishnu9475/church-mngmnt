from django.db import models


class Family(models.Model):
    family_id = models.AutoField(primary_key=True)
    family_name = models.CharField(max_length=150, blank=True, null=True)
    head_of_family = models.CharField(max_length=150, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    email = models.CharField(max_length=150, blank=True, null=True)
    monthly_collection_amount = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    # Opening data allows churches moving from a paper/manual ledger to retain
    # the unpaid monthly-collection amount that existed before this system.
    monthly_dues_start_month = models.DateField(blank=True, null=True)
    monthly_dues_opening_balance = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "families"
        ordering = ["family_name"]

    def __str__(self):
        return self.family_name or f"Family {self.family_id}"


class FamilyMonthlyDueRate(models.Model):
    """The agreed monthly collection amount for one family and one month."""
    rate_id = models.AutoField(primary_key=True)
    family = models.ForeignKey(
        Family, on_delete=models.CASCADE, db_column="family_id", related_name="monthly_due_rates"
    )
    month = models.DateField()
    amount = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        db_table = "family_monthly_due_rates"
        ordering = ["-month"]
        constraints = [
            models.UniqueConstraint(fields=["family", "month"], name="family_monthly_due_rate_unique_month"),
        ]

    def __str__(self):
        return f"{self.family} - {self.month}: {self.amount}"


class FamilyMonthlyPaymentStatus(models.Model):
    """Manual reconciliation for historical monthly payments not entered as receipts."""
    STATUS_CHOICES = [("Paid", "Paid"), ("Partial", "Partial"), ("Unpaid", "Unpaid")]
    status_id = models.AutoField(primary_key=True)
    family = models.ForeignKey(
        Family, on_delete=models.CASCADE, db_column="family_id", related_name="monthly_payment_statuses"
    )
    month = models.DateField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES)
    paid_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    notes = models.TextField(blank=True, null=True)

    class Meta:
        db_table = "family_monthly_payment_statuses"
        ordering = ["-month"]
        constraints = [
            models.UniqueConstraint(fields=["family", "month"], name="family_monthly_payment_status_unique_month"),
        ]

    def __str__(self):
        return f"{self.family} - {self.month}: {self.status}"


class FamilyMonthlyPaymentStatusAudit(models.Model):
    """Immutable audit trail for manual monthly payment reconciliation."""
    audit_id = models.AutoField(primary_key=True)
    payment_status = models.ForeignKey(
        FamilyMonthlyPaymentStatus, on_delete=models.CASCADE, db_column="status_id", related_name="audit_entries"
    )
    previous_status = models.CharField(max_length=10, blank=True, null=True)
    previous_paid_amount = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    new_status = models.CharField(max_length=10)
    new_paid_amount = models.DecimalField(max_digits=10, decimal_places=2)
    changed_by = models.CharField(max_length=150, blank=True, null=True)
    changed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "family_monthly_payment_status_audits"
        ordering = ["-changed_at"]


class MonthlyCollectionAllocation(models.Model):
    """One immutable portion of a monthly-collection payment.

    Receipt payments and payments against the linked previous-monthly-due use
    this table.  Keeping the source reference per month means a month cannot
    be paid twice and the tracker no longer needs to guess from receipt text.
    """
    allocation_id = models.AutoField(primary_key=True)
    family = models.ForeignKey(
        Family, on_delete=models.CASCADE, db_column="family_id", related_name="monthly_collection_allocations"
    )
    month = models.DateField()
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    source_type = models.CharField(max_length=30)
    source_id = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "monthly_collection_allocations"
        ordering = ["month", "allocation_id"]
        constraints = [
            models.UniqueConstraint(
                fields=["family", "month", "source_type", "source_id"],
                name="monthly_collection_allocation_unique_source_month",
            ),
        ]


class PaymentMethod(models.Model):
    payment_method_id = models.AutoField(primary_key=True)
    method_name = models.CharField(max_length=50, blank=True, null=True)

    class Meta:
        db_table = "payment_methods"

    def __str__(self):
        return self.method_name or f"PaymentMethod {self.payment_method_id}"


class Category(models.Model):
    CATEGORY_TYPE_CHOICES = [
        ("Receipt", "Receipt"),
        ("Bill", "Bill"),
        ("Due", "Due"),
    ]
    category_id = models.AutoField(primary_key=True)
    category_name = models.CharField(max_length=100, blank=True, null=True)
    category_type = models.CharField(max_length=20, choices=CATEGORY_TYPE_CHOICES, blank=True, null=True)
    description = models.TextField(blank=True, null=True)

    class Meta:
        db_table = "categories"

    def __str__(self):
        return self.category_name or f"Category {self.category_id}"


class Settings(models.Model):
    setting_id = models.AutoField(primary_key=True)
    receipt_prefix = models.CharField(max_length=10, blank=True, null=True)
    next_receipt_number = models.IntegerField(blank=True, null=True)
    voucher_prefix = models.CharField(max_length=10, blank=True, null=True)
    next_voucher_number = models.IntegerField(blank=True, null=True)
    financial_year = models.CharField(max_length=20, blank=True, null=True)
    opening_cash = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    opening_bank = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)

    class Meta:
        db_table = "settings"
        verbose_name_plural = "Settings"

    def __str__(self):
        return f"Settings ({self.financial_year})"


class BankTransaction(models.Model):
    transaction_id = models.AutoField(primary_key=True)
    transaction_type = models.CharField(max_length=20, blank=True, null=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    transaction_date = models.DateField(blank=True, null=True)
    deposited_by = models.CharField(max_length=150, blank=True, null=True)
    description = models.TextField(blank=True, null=True)

    class Meta:
        db_table = "bank_transactions"
        ordering = ["-transaction_date"]

    def __str__(self):
        return f"{self.transaction_type} - {self.amount}"


class FamilyMember(models.Model):
    member_id = models.AutoField(primary_key=True)
    family = models.ForeignKey(
        Family, on_delete=models.CASCADE, db_column="family_id", related_name="members"
    )
    name = models.CharField(max_length=150, blank=True, null=True)
    relationship = models.CharField(max_length=50, blank=True, null=True)
    date_of_birth = models.DateField(blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    email = models.CharField(max_length=150, blank=True, null=True)

    class Meta:
        db_table = "family_members"

    def __str__(self):
        return self.name or f"Member {self.member_id}"


class Receipt(models.Model):
    receipt_id = models.AutoField(primary_key=True)
    receipt_number = models.CharField(max_length=30, blank=True, null=True, unique=True)
    family = models.ForeignKey(
        Family, on_delete=models.SET_NULL, db_column="family_id",
        related_name="receipts", blank=True, null=True,
    )
    other_payer_name = models.CharField(max_length=150, blank=True, null=True)
    title = models.CharField(max_length=255, blank=True, null=True)
    primary_category = models.ForeignKey(
        Category, on_delete=models.PROTECT, db_column="primary_category_id", related_name="receipts"
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    receipt_date = models.DateField(blank=True, null=True)
    payment_method = models.ForeignKey(
        PaymentMethod, on_delete=models.PROTECT, db_column="payment_method_id", related_name="receipts"
    )
    description = models.TextField(blank=True, null=True)

    class Meta:
        db_table = "receipts"
        ordering = ["-receipt_date"]

    def __str__(self):
        return self.receipt_number or f"Receipt {self.receipt_id}"


class ReceiptEditAudit(models.Model):
    """Immutable record of every update made to a receipt."""
    audit_id = models.AutoField(primary_key=True)
    receipt = models.ForeignKey(
        Receipt, on_delete=models.CASCADE, db_column="receipt_id", related_name="edit_audits"
    )
    previous_amount = models.DecimalField(max_digits=10, decimal_places=2)
    new_amount = models.DecimalField(max_digits=10, decimal_places=2)
    # Keep a name snapshot so historical audits are not changed by later
    # payment-method renames or deletions.
    previous_payment_method = models.CharField(max_length=50, blank=True, null=True)
    new_payment_method = models.CharField(max_length=50, blank=True, null=True)
    changed_by = models.CharField(max_length=150, blank=True, null=True)
    changed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "receipt_edit_audits"
        ordering = ["-changed_at"]

    def __str__(self):
        return f"Receipt {self.receipt_id} edited at {self.changed_at}"


class ReceiptCategory(models.Model):
    id = models.AutoField(primary_key=True)
    receipt = models.ForeignKey(
        Receipt, on_delete=models.CASCADE, db_column="receipt_id", related_name="receipt_categories"
    )
    category = models.ForeignKey(
        Category, on_delete=models.PROTECT, db_column="category_id", related_name="receipt_categories"
    )

    class Meta:
        db_table = "receipt_categories"

    def __str__(self):
        return f"{self.receipt_id} -> {self.category_id}"


class Bill(models.Model):
    BILL_TYPE_CHOICES = [("Bill", "Bill"), ("Voucher", "Voucher")]
    STATUS_CHOICES = [("Paid", "Paid"), ("Pending", "Pending"), ("Overdue", "Overdue")]

    bill_id = models.AutoField(primary_key=True)
    bill_type = models.CharField(max_length=20, choices=BILL_TYPE_CHOICES, blank=True, null=True)
    voucher_number = models.CharField(max_length=30, blank=True, null=True)
    institution_bill_number = models.CharField(max_length=100, blank=True, null=True)
    title = models.CharField(max_length=255, blank=True, null=True)
    vendor = models.CharField(max_length=150, blank=True, null=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    bill_date = models.DateField(blank=True, null=True)
    due_date = models.DateField(blank=True, null=True)
    category = models.ForeignKey(
        Category, on_delete=models.PROTECT, db_column="category_id", related_name="bills"
    )
    payment_method = models.ForeignKey(
        PaymentMethod, on_delete=models.PROTECT, db_column="payment_method_id", related_name="bills"
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, blank=True, null=True)
    description = models.TextField(blank=True, null=True)

    class Meta:
        db_table = "bills"
        ordering = ["-bill_date"]

    def __str__(self):
        return self.title or f"Bill {self.bill_id}"


class BillEditAudit(models.Model):
    """Immutable record of every update made to a bill."""
    audit_id = models.AutoField(primary_key=True)
    bill = models.ForeignKey(
        Bill, on_delete=models.CASCADE, db_column="bill_id", related_name="edit_audits"
    )
    previous_amount = models.DecimalField(max_digits=10, decimal_places=2)
    new_amount = models.DecimalField(max_digits=10, decimal_places=2)
    # Store method names rather than foreign keys so an audit remains accurate
    # even if an administrator later renames or removes a payment method.
    previous_payment_method = models.CharField(max_length=50, blank=True, null=True)
    new_payment_method = models.CharField(max_length=50, blank=True, null=True)
    changed_by = models.CharField(max_length=150, blank=True, null=True)
    changed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "bill_edit_audits"
        ordering = ["-changed_at"]

    def __str__(self):
        return f"Bill {self.bill_id} edited at {self.changed_at}"


class BulkDueCollection(models.Model):
    collection_id = models.AutoField(primary_key=True)
    title = models.CharField(max_length=255, blank=True, null=True)
    amount_per_family = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    due_date = models.DateField(blank=True, null=True)
    year = models.IntegerField(blank=True, null=True)
    category = models.ForeignKey(
        Category, on_delete=models.PROTECT, db_column="category_id", related_name="bulk_due_collections"
    )
    description = models.TextField(blank=True, null=True)

    class Meta:
        db_table = "bulk_due_collections"
        ordering = ["-year"]

    def __str__(self):
        return self.title or f"Collection {self.collection_id}"


class Due(models.Model):
    due_id = models.AutoField(primary_key=True)
    family = models.ForeignKey(
        Family, on_delete=models.CASCADE, db_column="family_id", related_name="dues"
    )
    collection = models.ForeignKey(
        BulkDueCollection, on_delete=models.SET_NULL, db_column="collection_id",
        related_name="dues", blank=True, null=True,
    )
    title = models.CharField(max_length=255, blank=True, null=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    due_date = models.DateField(blank=True, null=True)
    year = models.IntegerField(blank=True, null=True)
    category = models.ForeignKey(
        Category, on_delete=models.PROTECT, db_column="category_id", related_name="dues"
    )
    description = models.TextField(blank=True, null=True)

    class Meta:
        db_table = "dues"
        ordering = ["-due_date"]

    def __str__(self):
        return f"{self.title} - {self.family}"


class DuePayment(models.Model):
    payment_id = models.AutoField(primary_key=True)
    due = models.ForeignKey(
        Due, on_delete=models.CASCADE, db_column="due_id", related_name="payments"
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    payment_date = models.DateField(blank=True, null=True)
    payment_method = models.ForeignKey(
        PaymentMethod, on_delete=models.PROTECT, db_column="payment_method_id", related_name="due_payments"
    )
    description = models.TextField(blank=True, null=True)

    class Meta:
        db_table = "due_payments"
        ordering = ["-payment_date"]

    def __str__(self):
        return f"Payment {self.payment_id} for Due {self.due_id}"


class DuePaymentEditAudit(models.Model):
    """Immutable audit history for edits to Payment Tracker entries."""
    audit_id = models.AutoField(primary_key=True)
    payment = models.ForeignKey(
        DuePayment, on_delete=models.CASCADE, db_column="payment_id", related_name="edit_audits"
    )
    previous_amount = models.DecimalField(max_digits=10, decimal_places=2)
    new_amount = models.DecimalField(max_digits=10, decimal_places=2)
    # Snapshot names preserve the historical audit if a method is later changed.
    previous_payment_method = models.CharField(max_length=50, blank=True, null=True)
    new_payment_method = models.CharField(max_length=50, blank=True, null=True)
    changed_by = models.CharField(max_length=150, blank=True, null=True)
    changed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "due_payment_edit_audits"
        ordering = ["-changed_at"]

    def __str__(self):
        return f"Payment {self.payment_id} edited at {self.changed_at}"
