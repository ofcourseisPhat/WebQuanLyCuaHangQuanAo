from app.core.database import db
from app.models.user import User
from app.models.product import Product
from werkzeug.security import generate_password_hash


def seed_data():
    """Tạo dữ liệu mẫu nếu chưa có"""

    if User.query.count() == 0:
        admin = User(
            name='Admin',
            email='admin@shop.com',
            password=generate_password_hash('admin123'),
            role='admin'
        )
        db.session.add(admin)

    if Product.query.count() == 0:
        sample_products = [
            Product(name='Áo Hoodie Nam', category='Áo', price=350000, stock=100, discount=10,
                    image='https://picsum.photos/seed/hoodie/400/400', description='Áo hoodie cao cấp, chất liệu nỉ bông'),
            Product(name='Quần Jean Skinny', category='Quần', price=450000, stock=80, discount=0,
                    image='https://picsum.photos/seed/jean/400/400', description='Quần jean skinny co giãn 4 chiều'),
            Product(name='Giày Sneaker Trắng', category='Giày', price=650000, stock=60, discount=15,
                    image='https://picsum.photos/seed/sneaker/400/400', description='Giày sneaker thời trang unisex'),
            Product(name='Túi Tote Canvas', category='Túi', price=220000, stock=150, discount=0,
                    image='https://picsum.photos/seed/tote/400/400', description='Túi tote canvas đơn giản, bền đẹp'),
            Product(name='Áo Thun Basic', category='Áo', price=180000, stock=200, discount=5,
                    image='https://picsum.photos/seed/tshirt/400/400', description='Áo thun basic nhiều màu'),
            Product(name='Quần Shorts Kaki', category='Quần', price=280000, stock=90, discount=0,
                    image='https://picsum.photos/seed/shorts/400/400', description='Quần shorts kaki lịch sự'),
            Product(name='Mũ Bucket Hat', category='Phụ kiện', price=150000, stock=120, discount=20,
                    image='https://picsum.photos/seed/hat/400/400', description='Mũ bucket hat thời trang'),
            Product(name='Dép Sandal Đế Bằng', category='Giày', price=320000, stock=75, discount=0,
                    image='https://picsum.photos/seed/sandal/400/400', description='Dép sandal đế bằng thoải mái'),
            Product(name='Áo Khoác Bomber', category='Áo', price=580000, stock=45, discount=10,
                    image='https://picsum.photos/seed/bomber/400/400', description='Áo khoác bomber thời trang'),
            Product(name='Đồng Hồ Dây Da', category='Phụ kiện', price=890000, stock=30, discount=5,
                    image='https://picsum.photos/seed/watch/400/400', description='Đồng hồ dây da thanh lịch'),
        ]
        db.session.add_all(sample_products)

    db.session.commit()
