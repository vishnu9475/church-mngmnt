from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("church_management", "0006_family_monthly_due_rates"),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
                CREATE TABLE family_monthly_payment_statuses (
                    status_id INT AUTO_INCREMENT PRIMARY KEY,
                    family_id INT NOT NULL,
                    month DATE NOT NULL,
                    status VARCHAR(10) NOT NULL,
                    paid_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
                    notes TEXT NULL,
                    CONSTRAINT family_monthly_payment_statuses_family_fk
                        FOREIGN KEY (family_id) REFERENCES families(family_id)
                        ON DELETE CASCADE,
                    CONSTRAINT family_monthly_payment_status_unique_month UNIQUE (family_id, month),
                    INDEX family_monthly_payment_statuses_month_idx (month)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """,
            reverse_sql="DROP TABLE family_monthly_payment_statuses;",
        ),
    ]
