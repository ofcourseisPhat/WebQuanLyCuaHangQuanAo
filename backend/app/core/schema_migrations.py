from sqlalchemy import inspect, text

from app.core.database import db


def _column_exists(inspector, table_name, column_name):
    return column_name in {column["name"] for column in inspector.get_columns(table_name)}


def _index_exists(inspector, table_name, index_name):
    return index_name in {index["name"] for index in inspector.get_indexes(table_name)}


def ensure_auth_columns():
    inspector = inspect(db.engine)
    table_name = "users"
    if table_name not in inspector.get_table_names():
        return

    statements = []
    if not _column_exists(inspector, table_name, "phone"):
        statements.append("ALTER TABLE users ADD COLUMN phone VARCHAR(20)")
    if not _column_exists(inspector, table_name, "is_email_verified"):
        statements.append("ALTER TABLE users ADD COLUMN is_email_verified BOOLEAN NOT NULL DEFAULT FALSE")
    if not _column_exists(inspector, table_name, "email_verification_token"):
        statements.append("ALTER TABLE users ADD COLUMN email_verification_token VARCHAR(128)")
    if not _column_exists(inspector, table_name, "email_verification_expires_at"):
        statements.append("ALTER TABLE users ADD COLUMN email_verification_expires_at DATETIME")
    if not _column_exists(inspector, table_name, "password_reset_otp_hash"):
        statements.append("ALTER TABLE users ADD COLUMN password_reset_otp_hash VARCHAR(255)")
    if not _column_exists(inspector, table_name, "password_reset_otp_expires_at"):
        statements.append("ALTER TABLE users ADD COLUMN password_reset_otp_expires_at DATETIME")
    if not _column_exists(inspector, table_name, "password_reset_attempts"):
        statements.append("ALTER TABLE users ADD COLUMN password_reset_attempts INTEGER NOT NULL DEFAULT 0")
    if not _column_exists(inspector, table_name, "is_active"):
        statements.append("ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE")
    if not _column_exists(inspector, table_name, "customer_tier"):
        statements.append("ALTER TABLE users ADD COLUMN customer_tier VARCHAR(30) NOT NULL DEFAULT 'regular'")

    for statement in statements:
        db.session.execute(text(statement))
    if statements:
        db.session.commit()

    inspector = inspect(db.engine)
    if not _index_exists(inspector, table_name, "ux_users_phone"):
        try:
            db.session.execute(text("CREATE UNIQUE INDEX ux_users_phone ON users (phone)"))
            db.session.commit()
        except Exception:
            db.session.rollback()


def ensure_product_catalog_columns():
    inspector = inspect(db.engine)
    table_name = "products"
    if table_name not in inspector.get_table_names():
        return

    statements = []
    if not _column_exists(inspector, table_name, "segment"):
        statements.append("ALTER TABLE products ADD COLUMN segment VARCHAR(50) NOT NULL DEFAULT 'Nam'")
    if not _column_exists(inspector, table_name, "sku"):
        statements.append("ALTER TABLE products ADD COLUMN sku VARCHAR(80)")
    if not _column_exists(inspector, table_name, "category_id"):
        statements.append("ALTER TABLE products ADD COLUMN category_id INTEGER")
    if not _column_exists(inspector, table_name, "brand"):
        statements.append("ALTER TABLE products ADD COLUMN brand VARCHAR(120) NOT NULL DEFAULT ''")
    if not _column_exists(inspector, table_name, "material"):
        statements.append("ALTER TABLE products ADD COLUMN material VARCHAR(120) NOT NULL DEFAULT ''")
    if not _column_exists(inspector, table_name, "sizes"):
        statements.append("ALTER TABLE products ADD COLUMN sizes VARCHAR(255) NOT NULL DEFAULT ''")
    if not _column_exists(inspector, table_name, "colors"):
        statements.append("ALTER TABLE products ADD COLUMN colors VARCHAR(255) NOT NULL DEFAULT ''")
    if not _column_exists(inspector, table_name, "rating_avg"):
        statements.append("ALTER TABLE products ADD COLUMN rating_avg FLOAT NOT NULL DEFAULT 0")
    if not _column_exists(inspector, table_name, "rating_count"):
        statements.append("ALTER TABLE products ADD COLUMN rating_count INTEGER NOT NULL DEFAULT 0")
    if not _column_exists(inspector, table_name, "seo_tags"):
        statements.append("ALTER TABLE products ADD COLUMN seo_tags VARCHAR(255) NOT NULL DEFAULT ''")

    for statement in statements:
        db.session.execute(text(statement))
    if statements:
        db.session.commit()

    # Backfill segment for existing records when older data used generic categories.
    try:
        db.session.execute(
            text(
                "UPDATE products SET segment='Phu kien' "
                "WHERE (segment IS NULL OR segment='' OR segment='Nam') "
                "AND LOWER(category) IN ('phu kien','tui','mu','dong ho','that lung','vi')"
            )
        )
        db.session.execute(
            text(
                "UPDATE products SET segment='Nu' "
                "WHERE (segment IS NULL OR segment='' OR segment='Nam') "
                "AND LOWER(category) IN ('vay','dam','chan vay')"
            )
        )
        db.session.execute(
            text(
                "UPDATE products SET segment='Tre em' "
                "WHERE (segment IS NULL OR segment='' OR segment='Nam') "
                "AND (LOWER(name) LIKE '%kid%' OR LOWER(name) LIKE '%tre em%')"
            )
        )
        db.session.commit()
    except Exception:
        db.session.rollback()

    inspector = inspect(db.engine)
    if not _index_exists(inspector, table_name, "ux_products_sku"):
        try:
            db.session.execute(text("CREATE UNIQUE INDEX ux_products_sku ON products (sku)"))
            db.session.commit()
        except Exception:
            db.session.rollback()
