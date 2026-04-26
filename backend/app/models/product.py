from app.core.database import db
from datetime import datetime

class Product(db.Model):
    __tablename__ = 'products'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    category = db.Column(db.String(100), nullable=False)
    price = db.Column(db.Float, nullable=False)
    stock = db.Column(db.Integer, default=0)
    discount = db.Column(db.Float, default=0)  # phần trăm %
    image = db.Column(db.String(500))
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    order_items = db.relationship('OrderItem', backref='product', lazy=True)

    def final_price(self):
        return round(self.price * (1 - self.discount / 100), 0)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'category': self.category,
            'price': self.price,
            'final_price': self.final_price(),
            'stock': self.stock,
            'discount': self.discount,
            'image': self.image,
            'description': self.description,
            'created_at': self.created_at.isoformat()
        }
