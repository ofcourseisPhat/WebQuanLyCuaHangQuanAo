from datetime import datetime

from app.core.database import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    phone = db.Column(db.String(20), unique=True, nullable=True)
    password = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), default="customer")  # admin / customer
    is_email_verified = db.Column(db.Boolean, default=False, nullable=False)
    email_verification_token = db.Column(db.String(128), nullable=True)
    email_verification_expires_at = db.Column(db.DateTime, nullable=True)
    password_reset_otp_hash = db.Column(db.String(255), nullable=True)
    password_reset_otp_expires_at = db.Column(db.DateTime, nullable=True)
    password_reset_attempts = db.Column(db.Integer, default=0, nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    customer_tier = db.Column(db.String(30), default="regular", nullable=False)  # regular/silver/gold/vip
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    cart_items = db.relationship("CartItem", backref="user", lazy=True, cascade="all, delete")
    orders = db.relationship("Order", backref="user", lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "phone": self.phone,
            "role": self.role,
            "is_email_verified": self.is_email_verified,
            "is_active": self.is_active,
            "customer_tier": self.customer_tier,
            "created_at": self.created_at.isoformat(),
        }
