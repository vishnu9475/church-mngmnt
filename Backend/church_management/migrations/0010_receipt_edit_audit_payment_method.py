from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("church_management", "0009_bill_edit_audit_payment_method"),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
                ALTER TABLE receipt_edit_audits
                    ADD COLUMN previous_payment_method VARCHAR(50) NULL,
                    ADD COLUMN new_payment_method VARCHAR(50) NULL;
            """,
            reverse_sql="""
                ALTER TABLE receipt_edit_audits
                    DROP COLUMN previous_payment_method,
                    DROP COLUMN new_payment_method;
            """,
        ),
    ]
