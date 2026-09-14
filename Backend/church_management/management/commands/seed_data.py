"""
Seeds the database with the same starter data used in the frontend's
mockDatabase.js, so the backend and frontend agree while the real
church data is still being entered.

Usage:
    python manage.py seed_data          # skip tables that already have rows
    python manage.py seed_data --reset  # wipe and reseed everything
"""
from django.core.management.base import BaseCommand
from django.db import transaction

from church_management.models import (
    Family, FamilyMember, Category, PaymentMethod,
    Receipt, ReceiptCategory, Bill, BulkDueCollection,
    Due, DuePayment, BankTransaction, Settings,
)


class Command(BaseCommand):
    help = "Seed the database with starter data matching the frontend mock data."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset", action="store_true",
            help="Delete existing rows in these tables before seeding.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        if options["reset"]:
            self.stdout.write("Clearing existing data...")
            for model in [
                DuePayment, Due, BulkDueCollection, ReceiptCategory, Receipt,
                Bill, BankTransaction, FamilyMember, Settings,
                Category, PaymentMethod, Family,
            ]:
                model.objects.all().delete()

        if Family.objects.exists() and not options["reset"]:
            self.stdout.write(self.style.WARNING(
                "Data already exists — skipping. Use --reset to wipe and reseed."
            ))
            return

        # ---- families ----
        families_data = [
            (1, "Smith Family", "John Smith", "12 Church Lane, Kollam, Kerala", "+91 98470 12345", "john.smith@email.com", 250.0),
            (2, "Johnson Family", "Robert Johnson", "45 St. Mary's Road, Kollam, Kerala", "+91 98470 22345", "robert.johnson@email.com", 500.0),
            (3, "Thomas Family", "Abraham Thomas", "8 Bethel Street, Kollam, Kerala", "+91 98470 32345", "abraham.thomas@email.com", 300.0),
            (4, "Paul Family", "David Paul", "21 Grace Avenue, Kollam, Kerala", "+91 98470 42345", "david.paul@email.com", 400.0),
            (5, "Roy Family", "Samuel Roy", "3 Emmanuel Nagar, Kollam, Kerala", "+91 98470 52345", "samuel.roy@email.com", 350.0),
            (6, "George Family", "George Kurian", "17 Faith Colony, Kollam, Kerala", "+91 98470 62345", "george.kurian@email.com", 200.0),
        ]
        families = {}
        for fid, name, head, address, phone, email, monthly in families_data:
            families[fid] = Family.objects.create(
                family_id=fid, family_name=name, head_of_family=head,
                address=address, phone=phone, email=email,
                monthly_collection_amount=monthly,
            )
        self.stdout.write(self.style.SUCCESS(f"Created {len(families)} families"))

        # ---- family_members ----
        members_data = [
            (1, "John Smith", "Head", "1975-05-15", "+91 98470 12345", "john.smith@email.com"),
            (1, "Mary Smith", "Spouse", "1978-08-22", "+91 98470 12346", "mary.smith@email.com"),
            (1, "Sarah Smith", "Daughter", "2005-03-10", "", ""),
            (2, "Robert Johnson", "Head", "1970-11-02", "+91 98470 22345", "robert.johnson@email.com"),
            (2, "Emily Johnson", "Spouse", "1973-06-18", "+91 98470 22346", "emily.johnson@email.com"),
            (3, "Abraham Thomas", "Head", "1968-02-27", "+91 98470 32345", "abraham.thomas@email.com"),
            (3, "Mary Thomas", "Spouse", "1971-09-09", "+91 98470 32346", "mary.thomas@email.com"),
            (4, "David Paul", "Head", "1980-01-14", "+91 98470 42345", "david.paul@email.com"),
            (5, "Samuel Roy", "Head", "1965-12-25", "+91 98470 52345", "samuel.roy@email.com"),
            (6, "George Kurian", "Head", "1977-07-07", "+91 98470 62345", "george.kurian@email.com"),
        ]
        for fid, name, rel, dob, phone, email in members_data:
            FamilyMember.objects.create(
                family=families[fid], name=name, relationship=rel,
                date_of_birth=dob, phone=phone or None, email=email or None,
            )
        self.stdout.write(self.style.SUCCESS(f"Created {len(members_data)} family members"))

        # ---- categories ----
        categories_data = [
            (1, "Tithes & Offerings", "Receipt", "Regular tithes and Sunday offerings"),
            (2, "Special Offerings", "Receipt", "Special collection offerings"),
            (3, "Building Fund", "Receipt", "Contributions toward the building fund"),
            (4, "Mission Fund", "Receipt", "Contributions toward missions"),
            (5, "Monthly Collection", "Receipt", "Regular monthly family collection"),
            (6, "Donations", "Receipt", "General donations"),
            (7, "Utilities", "Bill", "Water, electricity, internet"),
            (8, "Maintenance", "Bill", "Building and equipment upkeep"),
            (9, "Salaries", "Bill", "Staff and clergy salaries"),
            (10, "Supplies", "Bill", "Office and worship supplies"),
            (11, "Building Fund Due", "Due", "Per-family building fund contribution"),
            (12, "Annual Fund", "Due", "Annual family fund due"),
            (13, "Christmas Fund", "Due", "Christmas collection due"),
            (14, "Special Church Events", "Due", "Per-family collection for a special church event"),
            (15, "Mission Sunday Fund", "Due", "Per-family Mission Sunday contribution"),
        ]
        categories = {}
        for cid, name, ctype, desc in categories_data:
            categories[cid] = Category.objects.create(
                category_id=cid, category_name=name, category_type=ctype, description=desc,
            )
        self.stdout.write(self.style.SUCCESS(f"Created {len(categories)} categories"))

        # ---- payment_methods ----
        methods_data = [
            (1, "Cash"), (2, "Cheque"), (3, "Bank Transfer"),
            (4, "UPI"), (5, "Credit Card"), (6, "Online"), (7, "Other"),
        ]
        methods = {}
        for pmid, name in methods_data:
            methods[pmid] = PaymentMethod.objects.create(payment_method_id=pmid, method_name=name)
        self.stdout.write(self.style.SUCCESS(f"Created {len(methods)} payment methods"))

        # ---- settings ----
        Settings.objects.create(
            setting_id=1, receipt_prefix="RCP", next_receipt_number=1007,
            voucher_prefix="VCH", next_voucher_number=5003,
            financial_year="2026-2027", opening_cash=5000.0, opening_bank=20000.0,
        )
        self.stdout.write(self.style.SUCCESS("Created settings row"))

        # ---- bank_transactions ----
        bank_txns = [
            ("Deposit", 1500.0, "2026-04-10", "George Kurian", "Weekly cash deposit"),
            ("Deposit", 1200.0, "2026-04-17", "George Kurian", "Weekly cash deposit"),
            ("Withdrawal", 999.0, "2026-04-15", "Abraham Thomas", "Internet bill payment"),
            ("Deposit", 1000.0, "2026-04-24", "George Kurian", "Weekly cash deposit"),
        ]
        for ttype, amount, date, by, desc in bank_txns:
            BankTransaction.objects.create(
                transaction_type=ttype, amount=amount, transaction_date=date,
                deposited_by=by, description=desc,
            )
        self.stdout.write(self.style.SUCCESS(f"Created {len(bank_txns)} bank transactions"))

        # ---- receipts (+ receipt_categories) ----
        receipts_data = [
            ("RCP1001", 1, None, "Monthly Collection", 5, 750.0, "2026-04-15", 1, "April monthly collection"),
            ("RCP1002", 3, None, "Monthly Collection", 5, 850.0, "2026-04-16", 4, "April monthly collection"),
            ("RCP1003", 4, None, "Monthly Collection", 5, 600.0, "2026-04-17", 3, "April monthly collection"),
            ("RCP2001", 1, None, "Building Fund Donation", 3, 1000.0, "2026-04-14", 2, "Building fund contribution"),
            ("RCP2002", 3, None, "Building Fund Donation", 3, 1500.0, "2026-04-15", 4, "Building fund contribution"),
            ("RCP2003", 4, None, "Mission Support", 4, 800.0, "2026-04-16", 1, "Mission fund support"),
            ("RCP2004", 5, None, "Building Fund Donation", 3, 500.0, "2026-04-17", 5, "Building fund contribution"),
            ("RCP1004", None, "Congregation", "Sunday Offering", 1, 2500.0, "2026-04-13", 6, "Sunday service offering"),
            ("RCP1005", 6, None, "Youth Ministry Donation", 2, 300.0, "2026-04-12", 2, "Youth ministry support"),
            ("RCP1006", None, "Anonymous", "Anonymous Donation", 6, 200.0, "2026-04-10", 7, "Anonymous general donation"),
        ]
        for num, fid, other_payer, title, cat_id, amount, date, pm_id, desc in receipts_data:
            receipt = Receipt.objects.create(
                receipt_number=num,
                family=families[fid] if fid else None,
                other_payer_name=other_payer,
                title=title,
                primary_category=categories[cat_id],
                amount=amount,
                receipt_date=date,
                payment_method=methods[pm_id],
                description=desc,
            )
            ReceiptCategory.objects.create(receipt=receipt, category=categories[cat_id])
        self.stdout.write(self.style.SUCCESS(f"Created {len(receipts_data)} receipts"))

        # ---- bills ----
        bills_data = [
            ("Bill", None, "BTL12345", "Water Service", "City Water Department", 120.5, "2026-04-20", "2026-04-25", 7, 3, "Paid", "Monthly water bill"),
            ("Bill", None, "BTL12346", "Electricity Bill", "Power Grid", 350.0, "2026-04-21", "2026-04-25", 7, 4, "Pending", "Monthly electricity bill"),
            ("Voucher", "VCH001", None, "Office Supplies", "Stationery World", 275.0, "2026-04-22", "2026-04-28", 10, 1, "Pending", "Office & worship supplies"),
            ("Bill", None, "BTL12348", "Internet Bill", "Airtel Broadband", 999.0, "2026-04-15", "2026-04-15", 7, 3, "Overdue", "Monthly internet bill"),
            ("Voucher", "VCH002", None, "Maintenance Work", "ABC Maintenance Services", 450.0, "2026-04-10", "2026-04-25", 8, 1, "Pending", "Building maintenance work"),
        ]
        for btype, vnum, inum, title, vendor, amount, bdate, ddate, cat_id, pm_id, status, desc in bills_data:
            Bill.objects.create(
                bill_type=btype, voucher_number=vnum, institution_bill_number=inum,
                title=title, vendor=vendor, amount=amount, bill_date=bdate, due_date=ddate,
                category=categories[cat_id], payment_method=methods[pm_id],
                status=status, description=desc,
            )
        self.stdout.write(self.style.SUCCESS(f"Created {len(bills_data)} bills"))

        # ---- bulk_due_collections ----
        collections_data = [
            (1, "Annual Fund 2026", 1000.0, "2026-07-21", 2026, 12, "Yearly family fund"),
            (2, "Christmas Fund 2026", 200.0, "2026-10-13", 2026, 13, "Christmas collection"),
            (3, "Building Fund Contribution", 500.0, "2026-06-30", 2026, 11, "Church building fund contribution"),
        ]
        collections = {}
        for cid, title, amt, date, year, cat_id, desc in collections_data:
            collections[cid] = BulkDueCollection.objects.create(
                collection_id=cid, title=title, amount_per_family=amt,
                due_date=date, year=year, category=categories[cat_id], description=desc,
            )
        self.stdout.write(self.style.SUCCESS(f"Created {len(collections)} bulk due collections"))

        # ---- dues ----
        dues_data = [
            (1, 3, "Building Fund Contribution", 500.0, "2026-06-30", 2026, 11),
            (2, 3, "Building Fund Contribution", 500.0, "2026-06-30", 2026, 11),
            (3, 3, "Building Fund Contribution", 500.0, "2026-06-30", 2026, 11),
            (4, 3, "Building Fund Contribution", 500.0, "2026-06-30", 2026, 11),
            (5, 3, "Building Fund Contribution", 500.0, "2026-06-30", 2026, 11),
            (6, 3, "Building Fund Contribution", 500.0, "2026-06-30", 2026, 11),
            (1, 1, "Annual Fund 2026", 1000.0, "2026-07-21", 2026, 12),
            (2, 1, "Annual Fund 2026", 1000.0, "2026-07-21", 2026, 12),
            (3, 1, "Annual Fund 2026", 1000.0, "2026-07-21", 2026, 12),
            (4, 1, "Annual Fund 2026", 1000.0, "2026-07-21", 2026, 12),
            (5, 1, "Annual Fund 2026", 1000.0, "2026-07-21", 2026, 12),
            (6, 1, "Annual Fund 2026", 1000.0, "2026-07-21", 2026, 12),
            (1, 2, "Christmas Fund 2026", 200.0, "2026-10-13", 2026, 13),
            (2, 2, "Christmas Fund 2026", 200.0, "2026-10-13", 2026, 13),
            (3, 2, "Christmas Fund 2026", 200.0, "2026-10-13", 2026, 13),
        ]
        dues = []
        for fid, coll_id, title, amount, date, year, cat_id in dues_data:
            due = Due.objects.create(
                family=families[fid], collection=collections[coll_id], title=title,
                amount=amount, due_date=date, year=year, category=categories[cat_id],
            )
            dues.append(due)
        self.stdout.write(self.style.SUCCESS(f"Created {len(dues)} dues"))

        # ---- due_payments ----
        # dues list index matches insertion order above:
        # index 0 = Smith building fund, index 2 = Thomas building fund,
        # index 3 = Paul building fund, index 6 = Smith annual fund
        payments_data = [
            (0, 500.0, "2026-06-20", 1, "Full payment"),
            (2, 500.0, "2026-06-22", 4, "Full payment"),
            (3, 250.0, "2026-06-25", 1, "Partial payment"),
            (6, 1000.0, "2026-07-01", 3, "Full payment"),
        ]
        for due_index, amount, date, pm_id, desc in payments_data:
            DuePayment.objects.create(
                due=dues[due_index], amount=amount, payment_date=date,
                payment_method=methods[pm_id], description=desc,
            )
        self.stdout.write(self.style.SUCCESS(f"Created {len(payments_data)} due payments"))

        self.stdout.write(self.style.SUCCESS("Database seeded successfully."))
