from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("church_management", "0008_family_monthly_payment_status_audit"),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
                ALTER TABLE bill_edit_audits
                    ADD COLUMN previous_payment_method VARCHAR(50) NULL,
                    ADD COLUMN new_payment_method VARCHAR(50) NULL;
            """,
            reverse_sql="""
                ALTER TABLE bill_edit_audits
                    DROP COLUMN previous_payment_method,
                    DROP COLUMN new_payment_method;
            """,
        ),
    ]
