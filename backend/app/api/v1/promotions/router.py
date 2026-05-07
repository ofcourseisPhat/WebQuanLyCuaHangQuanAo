from datetime import datetime

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.core.database import db
from app.models.promotion import Promotion
from app.models.user import User

promotions_bp = Blueprint("promotions", __name__)


def _is_admin():
    user = User.query.get(get_jwt_identity())
    return user and user.role == "admin"


def _parse_datetime(value):
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value))
    except ValueError:
        return None


def _normalize_targets(value):
    if isinstance(value, list):
        return ",".join([str(item).strip() for item in value if str(item).strip()])
    return ",".join([item.strip() for item in str(value or "").split(",") if item.strip()])


@promotions_bp.route("/", methods=["GET"])
@jwt_required()
def list_promotions():
    if not _is_admin():
        return jsonify({"error": "Admin only"}), 403
    promotions = Promotion.query.order_by(Promotion.created_at.desc()).all()
    return jsonify({"promotions": [promo.to_dict() for promo in promotions]}), 200


@promotions_bp.route("/active", methods=["GET"])
def list_active_promotions():
    now = datetime.utcnow()
    promotions = (
        Promotion.query.filter(
            Promotion.is_active.is_(True),
            (Promotion.starts_at.is_(None) | (Promotion.starts_at <= now)),
            (Promotion.ends_at.is_(None) | (Promotion.ends_at >= now)),
        )
        .order_by(Promotion.created_at.desc())
        .all()
    )
    return jsonify({"promotions": [promo.to_dict() for promo in promotions]}), 200


@promotions_bp.route("/", methods=["POST"])
@jwt_required()
def create_promotion():
    if not _is_admin():
        return jsonify({"error": "Admin only"}), 403

    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    code = (data.get("code") or "").strip().upper()
    promo_type = (data.get("promo_type") or "percent").strip().lower()
    target_type = (data.get("target_type") or "order").strip().lower()

    if not name or not code:
        return jsonify({"error": "name and code are required"}), 400
    if promo_type not in ("percent", "fixed"):
        return jsonify({"error": "promo_type must be percent or fixed"}), 400
    if target_type not in ("order", "flash_sale", "coupon"):
        return jsonify({"error": "target_type must be order, flash_sale, or coupon"}), 400
    if Promotion.query.filter_by(code=code).first():
        return jsonify({"error": "Promotion code already exists"}), 409

    starts_at = _parse_datetime(data.get("starts_at"))
    ends_at = _parse_datetime(data.get("ends_at"))
    if data.get("starts_at") and not starts_at:
        return jsonify({"error": "starts_at must be ISO datetime"}), 400
    if data.get("ends_at") and not ends_at:
        return jsonify({"error": "ends_at must be ISO datetime"}), 400
    if starts_at and ends_at and starts_at > ends_at:
        return jsonify({"error": "starts_at cannot be after ends_at"}), 400

    promo = Promotion(
        name=name,
        code=code,
        promo_type=promo_type,
        amount=float(data.get("amount", 0) or 0),
        min_order_value=float(data.get("min_order_value", 0) or 0),
        max_discount_value=(
            float(data["max_discount_value"]) if data.get("max_discount_value") not in (None, "") else None
        ),
        usage_limit=int(data["usage_limit"]) if data.get("usage_limit") not in (None, "") else None,
        target_type=target_type,
        target_ids=_normalize_targets(data.get("target_ids")),
        starts_at=starts_at,
        ends_at=ends_at,
        is_active=bool(data.get("is_active", True)),
    )
    db.session.add(promo)
    db.session.commit()
    return jsonify({"promotion": promo.to_dict()}), 201


@promotions_bp.route("/<int:promotion_id>", methods=["PUT"])
@jwt_required()
def update_promotion(promotion_id):
    if not _is_admin():
        return jsonify({"error": "Admin only"}), 403
    promo = Promotion.query.get_or_404(promotion_id)
    data = request.get_json() or {}

    if "name" in data:
        promo.name = (data.get("name") or "").strip()
    if "code" in data:
        code = (data.get("code") or "").strip().upper()
        if not code:
            return jsonify({"error": "code cannot be empty"}), 400
        exists = Promotion.query.filter(Promotion.code == code, Promotion.id != promo.id).first()
        if exists:
            return jsonify({"error": "Promotion code already exists"}), 409
        promo.code = code
    if "promo_type" in data:
        promo_type = (data.get("promo_type") or "").strip().lower()
        if promo_type not in ("percent", "fixed"):
            return jsonify({"error": "promo_type must be percent or fixed"}), 400
        promo.promo_type = promo_type
    if "target_type" in data:
        target_type = (data.get("target_type") or "").strip().lower()
        if target_type not in ("order", "flash_sale", "coupon"):
            return jsonify({"error": "target_type must be order, flash_sale, or coupon"}), 400
        promo.target_type = target_type
    for field in ("amount", "min_order_value"):
        if field in data:
            setattr(promo, field, float(data.get(field) or 0))
    if "max_discount_value" in data:
        promo.max_discount_value = (
            float(data["max_discount_value"]) if data.get("max_discount_value") not in (None, "") else None
        )
    if "usage_limit" in data:
        promo.usage_limit = int(data["usage_limit"]) if data.get("usage_limit") not in (None, "") else None
    if "target_ids" in data:
        promo.target_ids = _normalize_targets(data.get("target_ids"))
    if "starts_at" in data:
        starts_at = _parse_datetime(data.get("starts_at"))
        if data.get("starts_at") and not starts_at:
            return jsonify({"error": "starts_at must be ISO datetime"}), 400
        promo.starts_at = starts_at
    if "ends_at" in data:
        ends_at = _parse_datetime(data.get("ends_at"))
        if data.get("ends_at") and not ends_at:
            return jsonify({"error": "ends_at must be ISO datetime"}), 400
        promo.ends_at = ends_at
    if "is_active" in data:
        promo.is_active = bool(data.get("is_active"))

    if promo.starts_at and promo.ends_at and promo.starts_at > promo.ends_at:
        return jsonify({"error": "starts_at cannot be after ends_at"}), 400

    db.session.commit()
    return jsonify({"promotion": promo.to_dict()}), 200


@promotions_bp.route("/<int:promotion_id>", methods=["DELETE"])
@jwt_required()
def delete_promotion(promotion_id):
    if not _is_admin():
        return jsonify({"error": "Admin only"}), 403
    promo = Promotion.query.get_or_404(promotion_id)
    db.session.delete(promo)
    db.session.commit()
    return jsonify({"message": "Promotion deleted"}), 200


@promotions_bp.route("/validate", methods=["POST"])
def validate_promotion():
    data = request.get_json() or {}
    code = (data.get("code") or "").strip().upper()
    order_total = float(data.get("order_total", 0) or 0)
    if not code:
        return jsonify({"error": "code is required"}), 400

    promo = Promotion.query.filter_by(code=code, is_active=True).first()
    if not promo:
        return jsonify({"error": "Promotion not found"}), 404

    now = datetime.utcnow()
    if promo.starts_at and now < promo.starts_at:
        return jsonify({"error": "Promotion is not active yet"}), 400
    if promo.ends_at and now > promo.ends_at:
        return jsonify({"error": "Promotion has expired"}), 400
    if promo.usage_limit is not None and promo.used_count >= promo.usage_limit:
        return jsonify({"error": "Promotion usage limit reached"}), 400
    if order_total < promo.min_order_value:
        return jsonify({"error": f"Minimum order value is {promo.min_order_value}"}), 400

    if promo.promo_type == "percent":
        discount_value = order_total * promo.amount / 100.0
    else:
        discount_value = promo.amount
    if promo.max_discount_value is not None:
        discount_value = min(discount_value, promo.max_discount_value)
    final_total = max(order_total - discount_value, 0)

    return (
        jsonify(
            {
                "promotion": promo.to_dict(),
                "order_total": order_total,
                "discount_value": round(discount_value, 2),
                "final_total": round(final_total, 2),
            }
        ),
        200,
    )
