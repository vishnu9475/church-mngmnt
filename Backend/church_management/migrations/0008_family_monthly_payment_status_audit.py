from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("church_management", "0007_family_monthly_payment_statuses"),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
                CREATE TABLE family_monthly_payment_status_audits (
                    audit_id INT AUTO_INCREMENT PRIMARY KEY,
                    status_id INT NOT NULL,
                    previous_status VARCHAR(10) NULL,
                    previous_paid_amount DECIMAL(10, 2) NULL,
                    new_status VARCHAR(10) NOT NULL,
                    new_paid_amount DECIMAL(10, 2) NOT NULL,
                    changed_by VARCHAR(150) NULL,
                    changed_at DATETIME(6) NOT NULL,
                    CONSTRAINT family_monthly_payment_status_audits_status_fk
                        FOREIGN KEY (status_id) REFERENCES family_monthly_payment_statuses(status_id)
                        ON DELETE CASCADE,
                    INDEX family_monthly_payment_status_audit_idx (status_id, changed_at)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """,
            reverse_sql="DROP TABLE family_monthly_payment_status_audits;",
        ),
    ]
