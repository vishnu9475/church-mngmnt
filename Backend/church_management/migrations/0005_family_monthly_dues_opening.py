from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("church_management", "0004_due_payment_edit_audit"),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
                ALTER TABLE families
                    ADD COLUMN monthly_dues_start_month DATE NULL,
                    ADD COLUMN monthly_dues_opening_balance DECIMAL(10, 2) NOT NULL DEFAULT 0;
            """,
            reverse_sql="""
                ALTER TABLE families
                    DROP COLUMN monthly_dues_opening_balance,
                    DROP COLUMN monthly_dues_start_month;
            """,
        ),
    ]
