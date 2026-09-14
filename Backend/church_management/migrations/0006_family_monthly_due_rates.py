from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("church_management", "0005_family_monthly_dues_opening"),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
                CREATE TABLE family_monthly_due_rates (
                    rate_id INT AUTO_INCREMENT PRIMARY KEY,
                    family_id INT NOT NULL,
                    month DATE NOT NULL,
                    amount DECIMAL(10, 2) NOT NULL,
                    CONSTRAINT family_monthly_due_rates_family_fk
                        FOREIGN KEY (family_id) REFERENCES families(family_id)
                        ON DELETE CASCADE,
                    CONSTRAINT family_monthly_due_rate_unique_month UNIQUE (family_id, month),
                    INDEX family_monthly_due_rates_month_idx (month)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """,
            reverse_sql="DROP TABLE family_monthly_due_rates;",
        ),
    ]
