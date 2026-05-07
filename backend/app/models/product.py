from datetime import datetime

from app.core.database import db


def _split_csv_values(value):
    if not value:
        return []
    return [item.strip() for item in str(value).split(",") if item.strip()]


class Product(db.Model):
    __tablename__ = "products"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    sku = db.Column(db.String(80), unique=True, nullable=True)
    category_id = db.Column(db.Integer, db.ForeignKey("categories.id"), nullable=True)
    category = db.Column(db.String(100), nullable=False)
    segment = db.Column(db.String(50), default="Nam", nullable=False)  # Nam/Nu/Tre em/Phu kien
    brand = db.Column(db.String(120), default="", nullable=False)
    material = db.Column(db.String(120), default="", nullable=False)
    sizes = db.Column(db.String(255), default="", nullable=False)  # cached CSV for list filters
    colors = db.Column(db.String(255), default="", nullable=False)  # cached CSV for list filters
    rating_avg = db.Column(db.Float, default=0, nullable=False)
    rating_count = db.Column(db.Integer, default=0, nullable=False)
    seo_tags = db.Column(db.String(255), default="", nullable=False)
    price = db.Column(db.Float, nullable=False)
    stock = db.Column(db.Integer, default=0)
    discount = db.Column(db.Float, default=0)
    image = db.Column(db.String(500))  # backward-compatible primary image
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    order_items = db.relationship(
        "OrderItem", backref="product", lazy=True, cascade="all, delete-orphan"
    )
    category_ref = db.relationship("Category", lazy=True)
    images = db.relationship(
        "ProductImage",
        backref="product",
        lazy=True,
        cascade="all, delete-orphan",
        order_by="ProductImage.sort_order.asc()",
    )
    variants = db.relationship(
        "ProductVariant",
        backref="product",
        lazy=True,
        cascade="all, delete-orphan",
        order_by="ProductVariant.id.asc()",
    )

    def final_price(self):
        return round(self.price * (1 - self.discount / 100), 0)

    def sync_cache_fields(self):
        unique_sizes = sorted({(variant.size or "").strip() for variant in self.variants if (variant.size or "").strip()})
        unique_colors = sorted({(variant.color or "").strip() for variant in self.variants if (variant.color or "").strip()})
        if unique_sizes:
            self.sizes = ",".join(unique_sizes)
        if unique_colors:
            self.colors = ",".join(unique_colors)

        if self.images:
            self.image = self.images[0].url

    def sync_stock_from_variants(self):
        if self.variants:
            self.stock = int(sum(max(variant.stock or 0, 0) for variant in self.variants))

    def to_dict(self):
        self.sync_cache_fields()
        self.sync_stock_from_variants()
        return {
            "id": self.id,
            "name": self.name,
            "sku": self.sku,
            "category": self.category,
            "category_id": self.category_id,
            "segment": self.segment,
            "brand": self.brand,
            "material": self.material,
            "sizes": _split_csv_values(self.sizes),
            "colors": _split_csv_values(self.colors),
            "rating_avg": round(self.rating_avg or 0, 1),
            "rating_count": self.rating_count or 0,
            "seo_tags": _split_csv_values(self.seo_tags),
            "price": self.price,
            "final_price": self.final_price(),
            "stock": self.stock,
            "discount": self.discount,
            "image": self.image,
            "images": [img.to_dict() for img in self.images],
            "variants": [variant.to_dict() for variant in self.variants],
            "description": self.description,
            "created_at": self.created_at.isoformat(),
        }


class ProductImage(db.Model):
    __tablename__ = "product_images"

    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False)
    url = db.Column(db.String(500), nullable=False)
    sort_order = db.Column(db.Integer, default=0, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "url": self.url,
            "sort_order": self.sort_order,
        }


class ProductVariant(db.Model):
    __tablename__ = "product_variants"

    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False)
    sku = db.Column(db.String(80), nullable=True)
    size = db.Column(db.String(40), nullable=False)
    color = db.Column(db.String(40), nullable=False)
    stock = db.Column(db.Integer, default=0, nullable=False)
    price_override = db.Column(db.Float, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "sku": self.sku,
            "size": self.size,
            "color": self.color,
            "stock": self.stock,
            "price_override": self.price_override,
        }
