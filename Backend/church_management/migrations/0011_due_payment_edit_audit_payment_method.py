from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("church_management", "0010_receipt_edit_audit_payment_method"),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
                ALTER TABLE due_payment_edit_audits
                    ADD COLUMN previous_payment_method VARCHAR(50) NULL,
                    ADD COLUMN new_payment_method VARCHAR(50) NULL;
            """,
            reverse_sql="""
                ALTER TABLE due_payment_edit_audits
                    DROP COLUMN previous_payment_method,
                    DROP COLUMN new_payment_method;
            """,
        ),
    ]
