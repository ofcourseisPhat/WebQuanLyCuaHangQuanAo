from werkzeug.security import generate_password_hash

from app.core.database import db
from app.models.category import Category
from app.models.product import Product, ProductImage, ProductVariant
from app.models.promotion import Promotion
from app.models.user import User


def _slugify(name):
    return (
        (name or "")
        .strip()
        .lower()
        .replace(" ", "-")
        .replace("_", "-")
        .replace("/", "-")
        .replace("\\", "-")
    )


def seed_data():
    """Create sample data if database is empty."""

    if User.query.count() == 0:
        admin = User(
            name="Admin",
            email="admin@shop.com",
            phone="0900000000",
            password=generate_password_hash("admin123"),
            role="admin",
            is_email_verified=True,
            is_active=True,
            customer_tier="vip",
        )
        db.session.add(admin)

    category_map = {}
    if Category.query.count() == 0:
        category_tree = [
            ("Nam", None),
            ("Nu", None),
            ("Tre em", None),
            ("Phu kien", None),
            ("Ao", "Nam"),
            ("Quan", "Nam"),
            ("Vay", "Nu"),
            ("Giay", "Nam"),
            ("Tui", "Phu kien"),
            ("Mu", "Phu kien"),
        ]
        for name, parent_name in category_tree:
            parent = category_map.get(parent_name) if parent_name else None
            category = Category(name=name, slug=_slugify(name), parent_id=parent.id if parent else None)
            db.session.add(category)
            db.session.flush()
            category_map[name] = category
    else:
        for category in Category.query.all():
            category_map[category.name] = category

    if Product.query.count() == 0:
        sample_products = [
            {
                "name": "Ao Hoodie Nam",
                "sku": "LUX-HOODIE-001",
                "segment": "Nam",
                "category": "Ao",
                "brand": "LUXE Essentials",
                "material": "Cotton",
                "seo_tags": "ao hoodie,thoi trang nam,winter",
                "price": 350000,
                "stock": 100,
                "discount": 10,
                "image": "https://picsum.photos/seed/hoodie/400/400",
                "description": "Ao hoodie cao cap, chat lieu ni bong mem mai.",
                "images": [
                    "https://picsum.photos/seed/hoodie1/800/1000",
                    "https://picsum.photos/seed/hoodie2/800/1000",
                ],
                "variants": [("LUX-HOODIE-001-BLK-M", "M", "Den", 30), ("LUX-HOODIE-001-BLK-L", "L", "Den", 35), ("LUX-HOODIE-001-GRY-XL", "XL", "Xam", 35)],
            },
            {
                "name": "Quan Jean Skinny Nu",
                "sku": "LUX-JEAN-002",
                "segment": "Nu",
                "category": "Quan",
                "brand": "LUXE Denim",
                "material": "Denim",
                "seo_tags": "quan jean nu,skinny",
                "price": 450000,
                "stock": 80,
                "discount": 0,
                "image": "https://picsum.photos/seed/jean/400/400",
                "description": "Quan jean skinny co gian 4 chieu.",
                "images": ["https://picsum.photos/seed/jean1/800/1000"],
                "variants": [("LUX-JEAN-002-BLU-S", "S", "Xanh Dam", 25), ("LUX-JEAN-002-BLU-M", "M", "Xanh Dam", 30), ("LUX-JEAN-002-BLK-L", "L", "Den", 25)],
            },
            {
                "name": "Tui Tote Canvas",
                "sku": "LUX-TOTE-003",
                "segment": "Phu kien",
                "category": "Tui",
                "brand": "LUXE Daily",
                "material": "Canvas",
                "seo_tags": "tui tote,phu kien",
                "price": 220000,
                "stock": 150,
                "discount": 0,
                "image": "https://picsum.photos/seed/tote/400/400",
                "description": "Tui tote canvas don gian, ben dep.",
                "images": ["https://picsum.photos/seed/tote1/800/1000", "https://picsum.photos/seed/tote2/800/1000"],
                "variants": [("LUX-TOTE-003-CRM-OS", "One Size", "Kem", 80), ("LUX-TOTE-003-BLK-OS", "One Size", "Den", 70)],
            },
        ]

        for item in sample_products:
            category = category_map.get(item["category"])
            product = Product(
                name=item["name"],
                sku=item["sku"],
                category=item["category"],
                category_id=category.id if category else None,
                segment=item["segment"],
                brand=item["brand"],
                material=item["material"],
                seo_tags=item["seo_tags"],
                price=item["price"],
                stock=item["stock"],
                discount=item["discount"],
                image=item["image"],
                description=item["description"],
                rating_avg=4.5,
                rating_count=48,
            )
            db.session.add(product)
            db.session.flush()

            for index, image_url in enumerate(item["images"]):
                db.session.add(ProductImage(product_id=product.id, url=image_url, sort_order=index))

            for sku, size, color, stock in item["variants"]:
                db.session.add(
                    ProductVariant(
                        product_id=product.id,
                        sku=sku,
                        size=size,
                        color=color,
                        stock=stock,
                    )
                )
            db.session.flush()
            product.sync_cache_fields()
            product.sync_stock_from_variants()

    if Promotion.query.count() == 0:
        db.session.add_all(
            [
                Promotion(
                    name="Voucher Chao Mung",
                    code="WELCOME10",
                    promo_type="percent",
                    amount=10,
                    min_order_value=300000,
                    target_type="voucher",
                    is_active=True,
                ),
                Promotion(
                    name="Flash Sale Cuoi Tuan",
                    code="FLASH150",
                    promo_type="fixed",
                    amount=150000,
                    min_order_value=800000,
                    target_type="flash_sale",
                    usage_limit=500,
                    is_active=True,
                ),
            ]
        )

    db.session.commit()
