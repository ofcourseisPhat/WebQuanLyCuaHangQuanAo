from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.core.database import db
from app.models.category import Category
from app.models.user import User

categories_bp = Blueprint("categories", __name__)


def _slugify(value):
    slug = (value or "").strip().lower()
    for source, target in [
        (" ", "-"),
        ("_", "-"),
        ("/", "-"),
        ("\\", "-"),
    ]:
        slug = slug.replace(source, target)
    while "--" in slug:
        slug = slug.replace("--", "-")
    return slug.strip("-")


def _is_admin():
    user = User.query.get(get_jwt_identity())
    return user and user.role == "admin"


@categories_bp.route("/", methods=["GET"])
def list_categories():
    categories = Category.query.order_by(Category.parent_id.isnot(None), Category.parent_id, Category.name.asc()).all()
    roots = [cat for cat in categories if cat.parent_id is None]
    return jsonify({"categories": [root.to_dict(include_children=True) for root in roots]}), 200


@categories_bp.route("/admin", methods=["GET"])
@jwt_required()
def list_categories_admin():
    if not _is_admin():
        return jsonify({"error": "Admin only"}), 403
    categories = Category.query.order_by(Category.parent_id.isnot(None), Category.parent_id, Category.name.asc()).all()
    return jsonify({"categories": [category.to_dict(include_children=False) for category in categories]}), 200


@categories_bp.route("/", methods=["POST"])
@jwt_required()
def create_category():
    if not _is_admin():
        return jsonify({"error": "Admin only"}), 403

    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    slug = _slugify(data.get("slug") or name)
    parent_id = data.get("parent_id")
    if not name:
        return jsonify({"error": "name is required"}), 400
    if Category.query.filter_by(name=name).first():
        return jsonify({"error": "Category name already exists"}), 409
    if Category.query.filter_by(slug=slug).first():
        return jsonify({"error": "Category slug already exists"}), 409
    if parent_id:
        parent = Category.query.get(parent_id)
        if not parent:
            return jsonify({"error": "Parent category not found"}), 404

    category = Category(
        name=name,
        slug=slug,
        parent_id=parent_id,
        icon=(data.get("icon") or "").strip() or None,
        banner=(data.get("banner") or "").strip() or None,
        is_active=bool(data.get("is_active", True)),
    )
    db.session.add(category)
    db.session.commit()
    return jsonify({"category": category.to_dict(include_children=False)}), 201


@categories_bp.route("/<int:category_id>", methods=["PUT"])
@jwt_required()
def update_category(category_id):
    if not _is_admin():
        return jsonify({"error": "Admin only"}), 403
    category = Category.query.get_or_404(category_id)
    data = request.get_json() or {}

    if "name" in data:
        name = (data.get("name") or "").strip()
        if not name:
            return jsonify({"error": "name cannot be empty"}), 400
        existing = Category.query.filter(Category.name == name, Category.id != category.id).first()
        if existing:
            return jsonify({"error": "Category name already exists"}), 409
        category.name = name
    if "slug" in data:
        slug = _slugify(data.get("slug"))
        existing = Category.query.filter(Category.slug == slug, Category.id != category.id).first()
        if existing:
            return jsonify({"error": "Category slug already exists"}), 409
        category.slug = slug
    if "parent_id" in data:
        parent_id = data.get("parent_id")
        if parent_id == category.id:
            return jsonify({"error": "Category cannot be parent of itself"}), 400
        category.parent_id = parent_id
    if "icon" in data:
        category.icon = (data.get("icon") or "").strip() or None
    if "banner" in data:
        category.banner = (data.get("banner") or "").strip() or None
    if "is_active" in data:
        category.is_active = bool(data.get("is_active"))

    db.session.commit()
    return jsonify({"category": category.to_dict(include_children=False)}), 200


@categories_bp.route("/<int:category_id>", methods=["DELETE"])
@jwt_required()
def delete_category(category_id):
    if not _is_admin():
        return jsonify({"error": "Admin only"}), 403
    category = Category.query.get_or_404(category_id)
    if category.children:
        return jsonify({"error": "Cannot delete category with children"}), 400
    db.session.delete(category)
    db.session.commit()
    return jsonify({"message": "Category deleted"}), 200
