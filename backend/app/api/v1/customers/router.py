from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy import func, or_

from app.core.database import db
from app.models.order import Order
from app.models.user import User

customers_bp = Blueprint("customers", __name__)


def _is_admin():
    user = User.query.get(get_jwt_identity())
    return user and user.role == "admin"


@customers_bp.route("/", methods=["GET"])
@jwt_required()
def list_customers():
    if not _is_admin():
        return jsonify({"error": "Admin only"}), 403

    search = (request.args.get("search") or "").strip()
    tier = (request.args.get("tier") or "").strip().lower()
    is_active = request.args.get("is_active")

    query = User.query.filter(User.role == "customer")
    if search:
        pattern = f"%{search}%"
        query = query.filter(or_(User.name.ilike(pattern), User.email.ilike(pattern), User.phone.ilike(pattern)))
    if tier:
        query = query.filter(User.customer_tier == tier)
    if is_active is not None and is_active != "":
        enabled = str(is_active).lower() in ("1", "true", "yes")
        query = query.filter(User.is_active == enabled)

    customers = query.order_by(User.created_at.desc()).all()
    rows = []
    for customer in customers:
        total_orders = Order.query.filter_by(user_id=customer.id).count()
        total_spent = (
            Order.query.with_entities(func.coalesce(func.sum(Order.total), 0))
            .filter(Order.user_id == customer.id, Order.status.in_(["paid", "shipped", "delivered"]))
            .scalar()
            or 0
        )
        payload = customer.to_dict()
        payload["total_orders"] = total_orders
        payload["total_spent"] = float(total_spent)
        rows.append(payload)
    return jsonify({"customers": rows}), 200


@customers_bp.route("/<int:user_id>", methods=["GET"])
@jwt_required()
def get_customer(user_id):
    if not _is_admin():
        return jsonify({"error": "Admin only"}), 403
    customer = User.query.get_or_404(user_id)
    if customer.role != "customer":
        return jsonify({"error": "User is not a customer"}), 400
    orders = Order.query.filter_by(user_id=customer.id).order_by(Order.created_at.desc()).limit(20).all()
    return jsonify({"customer": customer.to_dict(), "orders": [order.to_dict() for order in orders]}), 200


@customers_bp.route("/<int:user_id>/status", methods=["PUT"])
@jwt_required()
def update_customer_status(user_id):
    if not _is_admin():
        return jsonify({"error": "Admin only"}), 403
    customer = User.query.get_or_404(user_id)
    if customer.role != "customer":
        return jsonify({"error": "User is not a customer"}), 400

    data = request.get_json() or {}
    customer.is_active = bool(data.get("is_active", True))
    return_message = "Customer unlocked" if customer.is_active else "Customer locked"
    db.session.commit()
    return jsonify({"message": return_message, "customer": customer.to_dict()}), 200


@customers_bp.route("/<int:user_id>/tier", methods=["PUT"])
@jwt_required()
def update_customer_tier(user_id):
    if not _is_admin():
        return jsonify({"error": "Admin only"}), 403
    customer = User.query.get_or_404(user_id)
    if customer.role != "customer":
        return jsonify({"error": "User is not a customer"}), 400

    data = request.get_json() or {}
    tier = (data.get("customer_tier") or "").strip().lower()
    if tier not in ("regular", "silver", "gold", "vip"):
        return jsonify({"error": "Invalid customer tier"}), 400
    customer.customer_tier = tier

    db.session.commit()
    return jsonify({"message": "Customer tier updated", "customer": customer.to_dict()}), 200


@customers_bp.route("/<int:user_id>/orders", methods=["GET"])
@jwt_required()
def get_customer_orders(user_id):
    if not _is_admin():
        return jsonify({"error": "Admin only"}), 403
    customer = User.query.get_or_404(user_id)
    if customer.role != "customer":
        return jsonify({"error": "User is not a customer"}), 400
    orders = Order.query.filter_by(user_id=customer.id).order_by(Order.created_at.desc()).all()
    return jsonify({"orders": [order.to_dict() for order in orders]}), 200
