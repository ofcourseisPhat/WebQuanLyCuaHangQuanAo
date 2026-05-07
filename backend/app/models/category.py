from datetime import datetime

from app.core.database import db


class Category(db.Model):
    __tablename__ = "categories"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False, unique=True)
    slug = db.Column(db.String(140), nullable=False, unique=True)
    parent_id = db.Column(db.Integer, db.ForeignKey("categories.id"), nullable=True)
    icon = db.Column(db.String(255), nullable=True)
    banner = db.Column(db.String(500), nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    parent = db.relationship("Category", remote_side=[id], backref=db.backref("children", lazy=True))

    def to_dict(self, include_children=True):
        payload = {
            "id": self.id,
            "name": self.name,
            "slug": self.slug,
            "parent_id": self.parent_id,
            "icon": self.icon,
            "banner": self.banner,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat(),
        }
        if include_children:
            payload["children"] = [child.to_dict(include_children=False) for child in self.children]
        return payload
