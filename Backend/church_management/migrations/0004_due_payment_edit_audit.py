from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("church_management", "0003_receipt_edit_audit"),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
                CREATE TABLE due_payment_edit_audits (
                    audit_id INT AUTO_INCREMENT PRIMARY KEY,
                    payment_id INT NOT NULL,
                    previous_amount DECIMAL(10, 2) NOT NULL,
                    new_amount DECIMAL(10, 2) NOT NULL,
                    changed_by VARCHAR(150) NULL,
                    changed_at DATETIME(6) NOT NULL,
                    CONSTRAINT due_payment_edit_audits_payment_id_fk
                        FOREIGN KEY (payment_id) REFERENCES due_payments(payment_id)
                        ON DELETE CASCADE,
                    INDEX due_payment_edit_audits_payment_changed_idx (payment_id, changed_at)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """,
            reverse_sql="DROP TABLE due_payment_edit_audits;",
        ),
    ]
