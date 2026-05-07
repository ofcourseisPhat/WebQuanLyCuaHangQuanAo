from datetime import datetime

from app.core.database import db


class Promotion(db.Model):
    __tablename__ = "promotions"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    code = db.Column(db.String(80), unique=True, nullable=False)
    promo_type = db.Column(db.String(20), nullable=False, default="percent")  # percent/fixed
    amount = db.Column(db.Float, nullable=False, default=0)
    min_order_value = db.Column(db.Float, nullable=False, default=0)
    max_discount_value = db.Column(db.Float, nullable=True)
    usage_limit = db.Column(db.Integer, nullable=True)
    used_count = db.Column(db.Integer, nullable=False, default=0)
    target_type = db.Column(db.String(30), nullable=False, default="order")  # order/flash_sale/coupon
    target_ids = db.Column(db.Text, nullable=True)  # CSV product/category ids if needed
    starts_at = db.Column(db.DateTime, nullable=True)
    ends_at = db.Column(db.DateTime, nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "code": self.code,
            "promo_type": self.promo_type,
            "amount": self.amount,
            "min_order_value": self.min_order_value,
            "max_discount_value": self.max_discount_value,
            "usage_limit": self.usage_limit,
            "used_count": self.used_count,
            "target_type": self.target_type,
            "target_ids": [item.strip() for item in (self.target_ids or "").split(",") if item.strip()],
            "starts_at": self.starts_at.isoformat() if self.starts_at else None,
            "ends_at": self.ends_at.isoformat() if self.ends_at else None,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat(),
        }
