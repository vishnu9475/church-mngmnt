from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("church_management", "0001_initial"),
    ]

    operations = [
        # Existing church tables came from the original schema. Create only
        # the new audit table after the initial migration has been applied.
        migrations.RunSQL(
            sql="""
                CREATE TABLE bill_edit_audits (
                    audit_id INT AUTO_INCREMENT PRIMARY KEY,
                    bill_id INT NOT NULL,
                    previous_amount DECIMAL(10, 2) NOT NULL,
                    new_amount DECIMAL(10, 2) NOT NULL,
                    changed_by VARCHAR(150) NULL,
                    changed_at DATETIME(6) NOT NULL,
                    CONSTRAINT bill_edit_audits_bill_id_fk
                        FOREIGN KEY (bill_id) REFERENCES bills(bill_id)
                        ON DELETE CASCADE,
                    INDEX bill_edit_audits_bill_changed_idx (bill_id, changed_at)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """,
            reverse_sql="DROP TABLE bill_edit_audits;",
        ),
    ]
