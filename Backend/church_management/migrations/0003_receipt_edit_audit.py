from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("church_management", "0002_bill_edit_audit"),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
                CREATE TABLE receipt_edit_audits (
                    audit_id INT AUTO_INCREMENT PRIMARY KEY,
                    receipt_id INT NOT NULL,
                    previous_amount DECIMAL(10, 2) NOT NULL,
                    new_amount DECIMAL(10, 2) NOT NULL,
                    changed_by VARCHAR(150) NULL,
                    changed_at DATETIME(6) NOT NULL,
                    CONSTRAINT receipt_edit_audits_receipt_id_fk
                        FOREIGN KEY (receipt_id) REFERENCES receipts(receipt_id)
                        ON DELETE CASCADE,
                    INDEX receipt_edit_audits_receipt_changed_idx (receipt_id, changed_at)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """,
            reverse_sql="DROP TABLE receipt_edit_audits;",
        ),
    ]
