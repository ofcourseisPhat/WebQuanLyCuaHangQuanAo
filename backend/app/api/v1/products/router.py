from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy import func, or_

from app.core.database import db
from app.models.category import Category
from app.models.cart import CartItem
from app.models.order import Order, OrderItem
from app.models.product import Product, ProductImage, ProductVariant
from app.models.user import User

products_bp = Blueprint("products", __name__)

SEGMENT_PRESET = ["Nam", "Nu", "Tre em", "Phu kien"]
SUCCESSFUL_ORDER_STATUSES = ("paid", "shipped", "delivered")


def _current_user_id():
    identity = get_jwt_identity()
    try:
        return int(identity)
    except (TypeError, ValueError):
        return identity


def is_admin():
    user_id = _current_user_id()
    user = User.query.get(user_id)
    return user and user.role == "admin"


def _parse_bool(value):
    if value is None:
        return None
    return str(value).strip().lower() in ("1", "true", "yes", "on")


def _parse_float(value, field_name):
    if value in (None, ""):
        return None, None
    try:
        return float(value), None
    except (TypeError, ValueError):
        return None, f"Invalid value for {field_name}"


def _normalize_csv(value):
    if value is None:
        return ""
    if isinstance(value, list):
        cleaned = [str(item).strip() for item in value if str(item).strip()]
        return ",".join(cleaned)
    cleaned = [item.strip() for item in str(value).split(",") if item.strip()]
    return ",".join(cleaned)


def _split_csv(value):
    if not value:
        return []
    return [item.strip() for item in str(value).split(",") if item.strip()]


def _normalize_images(payload):
    if not isinstance(payload, list):
        return []
    cleaned = []
    for item in payload:
        if isinstance(item, dict):
            url = str(item.get("url", "")).strip()
        else:
            url = str(item).strip()
        if url:
            cleaned.append(url)
    return cleaned


def _normalize_variants(payload):
    if not isinstance(payload, list):
        return []
    variants = []
    for item in payload:
        if not isinstance(item, dict):
            continue
        size = str(item.get("size", "")).strip()
        color = str(item.get("color", "")).strip()
        if not size or not color:
            continue
        variants.append(
            {
                "sku": (str(item.get("sku", "")).strip() or None),
                "size": size,
                "color": color,
                "stock": max(int(item.get("stock", 0) or 0), 0),
                "price_override": (
                    float(item["price_override"])
                    if item.get("price_override") not in (None, "")
                    else None
                ),
            }
        )
    return variants


def _sales_subquery():
    return (
        db.session.query(
            OrderItem.product_id.label("product_id"),
            func.coalesce(func.sum(OrderItem.quantity), 0).label("sold_qty"),
        )
        .join(Order, Order.id == OrderItem.order_id)
        .filter(Order.status.in_(SUCCESSFUL_ORDER_STATUSES))
        .group_by(OrderItem.product_id)
        .subquery()
    )


def _orderable_query():
    return Product.query.filter(Product.stock > 0)


def _apply_media_and_variants(product, data):
    images_payload = data.get("images")
    variants_payload = data.get("variants")

    if images_payload is not None:
        ProductImage.query.filter_by(product_id=product.id).delete()
        for index, url in enumerate(_normalize_images(images_payload)):
            db.session.add(ProductImage(product_id=product.id, url=url, sort_order=index))
    elif data.get("image"):
        ProductImage.query.filter_by(product_id=product.id).delete()
        db.session.add(ProductImage(product_id=product.id, url=str(data.get("image")).strip(), sort_order=0))

    if variants_payload is not None:
        ProductVariant.query.filter_by(product_id=product.id).delete()
        for variant_data in _normalize_variants(variants_payload):
            db.session.add(
                ProductVariant(
                    product_id=product.id,
                    sku=variant_data["sku"],
                    size=variant_data["size"],
                    color=variant_data["color"],
                    stock=variant_data["stock"],
                    price_override=variant_data["price_override"],
                )
            )
        db.session.flush()

    # Backward-compatible stock from top-level field when no variants are provided.
    if variants_payload is None and data.get("stock") not in (None, ""):
        product.stock = int(data.get("stock", 0) or 0)

    product.sizes = _normalize_csv(data.get("sizes", product.sizes))
    product.colors = _normalize_csv(data.get("colors", product.colors))
    product.sync_cache_fields()
    product.sync_stock_from_variants()


@products_bp.route("/", methods=["GET"])
def get_products():
    segment = (request.args.get("segment") or "").strip()
    category = (request.args.get("category") or "").strip()
    category_id = request.args.get("category_id")
    search = (request.args.get("search") or "").strip()

    brand = (request.args.get("brand") or "").strip()
    material = (request.args.get("material") or "").strip()
    size = (request.args.get("size") or "").strip()
    color = (request.args.get("color") or "").strip()
    min_price, min_price_error = _parse_float(request.args.get("min_price"), "min_price")
    max_price, max_price_error = _parse_float(request.args.get("max_price"), "max_price")
    min_rating, min_rating_error = _parse_float(request.args.get("min_rating"), "min_rating")
    min_discount, min_discount_error = _parse_float(request.args.get("min_discount"), "min_discount")
    in_stock = _parse_bool(request.args.get("in_stock"))
    discount_only = _parse_bool(request.args.get("discount_only"))

    if min_price_error or max_price_error or min_rating_error or min_discount_error:
        return jsonify({"error": min_price_error or max_price_error or min_rating_error or min_discount_error}), 400
    if min_price is not None and max_price is not None and min_price > max_price:
        return jsonify({"error": "min_price cannot be greater than max_price"}), 400

    try:
        page = max(int(request.args.get("page", 1)), 1)
        per_page = max(min(int(request.args.get("per_page", 12)), 100), 1)
    except (TypeError, ValueError):
        return jsonify({"error": "page and per_page must be integers"}), 400

    sort = (request.args.get("sort") or "newest").strip().lower()
    final_price_expr = Product.price * (1 - (Product.discount / 100.0))
    sales_sq = _sales_subquery()

    query = Product.query.outerjoin(sales_sq, Product.id == sales_sq.c.product_id)

    if segment:
        query = query.filter(Product.segment == segment)
    if category:
        query = query.filter(Product.category == category)
    if category_id not in (None, ""):
        try:
            query = query.filter(Product.category_id == int(category_id))
        except ValueError:
            return jsonify({"error": "Invalid category_id"}), 400
    if search:
        like_pattern = f"%{search}%"
        query = query.filter(
            or_(
                Product.name.ilike(like_pattern),
                Product.sku.ilike(like_pattern),
                Product.category.ilike(like_pattern),
                Product.brand.ilike(like_pattern),
                Product.material.ilike(like_pattern),
                Product.description.ilike(like_pattern),
                Product.seo_tags.ilike(like_pattern),
            )
        )
    if brand:
        query = query.filter(Product.brand == brand)
    if material:
        query = query.filter(Product.material == material)
    if size:
        query = query.filter(Product.sizes.ilike(f"%{size}%"))
    if color:
        query = query.filter(Product.colors.ilike(f"%{color}%"))
    if min_price is not None:
        query = query.filter(final_price_expr >= min_price)
    if max_price is not None:
        query = query.filter(final_price_expr <= max_price)
    if min_rating is not None:
        query = query.filter(Product.rating_avg >= min_rating)
    if min_discount is not None:
        query = query.filter(Product.discount >= min_discount)
    if in_stock is True:
        query = query.filter(Product.stock > 0)
    if discount_only is True:
        query = query.filter(Product.discount > 0)

    sold_expr = func.coalesce(sales_sq.c.sold_qty, 0)
    if sort == "price_asc":
        query = query.order_by(final_price_expr.asc(), Product.created_at.desc())
    elif sort == "price_desc":
        query = query.order_by(final_price_expr.desc(), Product.created_at.desc())
    elif sort == "best_selling":
        query = query.order_by(sold_expr.desc(), Product.created_at.desc())
    elif sort == "popular":
        query = query.order_by(
            sold_expr.desc(),
            Product.rating_avg.desc(),
            Product.rating_count.desc(),
            Product.created_at.desc(),
        )
    else:
        sort = "newest"
        query = query.order_by(Product.created_at.desc())

    total = query.count()
    products = query.offset((page - 1) * per_page).limit(per_page).all()

    return (
        jsonify(
            {
                "products": [p.to_dict() for p in products],
                "total": total,
                "page": page,
                "pages": (total + per_page - 1) // per_page,
                "applied_filters": {
                    "search": search,
                    "segment": segment,
                    "category": category,
                    "category_id": category_id,
                    "brand": brand,
                    "material": material,
                    "size": size,
                    "color": color,
                    "min_price": min_price,
                    "max_price": max_price,
                    "min_rating": min_rating,
                    "min_discount": min_discount,
                    "in_stock": in_stock,
                    "discount_only": discount_only,
                    "sort": sort,
                },
            }
        ),
        200,
    )


@products_bp.route("/<int:product_id>", methods=["GET"])
def get_product(product_id):
    product = Product.query.get_or_404(product_id)
    return jsonify({"product": product.to_dict()}), 200


@products_bp.route("/categories", methods=["GET"])
def get_categories():
    segments = [row[0] for row in db.session.query(Product.segment).distinct().all() if row[0]]
    categories = [row[0] for row in db.session.query(Product.category).distinct().all() if row[0]]
    category_rows = Category.query.order_by(Category.name.asc()).all()
    brands = [row[0] for row in db.session.query(Product.brand).distinct().all() if row[0]]
    materials = [row[0] for row in db.session.query(Product.material).distinct().all() if row[0]]

    sizes = sorted(
        {
            size
            for row in Product.query.with_entities(Product.sizes).all()
            for size in _split_csv(row[0])
        }
    )
    colors = sorted(
        {
            color
            for row in Product.query.with_entities(Product.colors).all()
            for color in _split_csv(row[0])
        }
    )

    for preset in SEGMENT_PRESET:
        if preset not in segments:
            segments.append(preset)

    return (
        jsonify(
            {
                "categories": segments,
                "segments": segments,
                "product_types": sorted(categories),
                "category_records": [cat.to_dict(include_children=False) for cat in category_rows],
                "brands": sorted(brands),
                "materials": sorted(materials),
                "sizes": sizes,
                "colors": colors,
                "rating_levels": [5, 4, 3, 2, 1],
            }
        ),
        200,
    )


@products_bp.route("/home-sections", methods=["GET"])
def get_home_sections():
    limit = max(min(int(request.args.get("limit", 8)), 20), 1)

    new_arrivals = _orderable_query().order_by(Product.created_at.desc()).limit(limit).all()
    flash_sale = _orderable_query().filter(Product.discount > 0).order_by(Product.discount.desc(), Product.created_at.desc()).limit(limit).all()
    featured = _orderable_query().order_by(Product.discount.desc(), Product.created_at.desc()).limit(limit).all()

    best_selling_rows = (
        db.session.query(Product.id.label("product_id"))
        .join(OrderItem, OrderItem.product_id == Product.id)
        .join(Order, Order.id == OrderItem.order_id)
        .filter(Order.status.in_(SUCCESSFUL_ORDER_STATUSES))
        .group_by(Product.id)
        .order_by(func.sum(OrderItem.quantity).desc())
        .limit(limit)
        .all()
    )
    best_selling_ids = [row.product_id for row in best_selling_rows]
    best_selling_products = []
    if best_selling_ids:
        best_selling_products = Product.query.filter(Product.id.in_(best_selling_ids)).all()
        best_selling_products.sort(key=lambda p: best_selling_ids.index(p.id))
    if not best_selling_products:
        best_selling_products = featured[:]

    return (
        jsonify(
            {
                "featured": [p.to_dict() for p in featured],
                "new_arrivals": [p.to_dict() for p in new_arrivals],
                "best_selling": [p.to_dict() for p in best_selling_products],
                "flash_sale": [p.to_dict() for p in flash_sale],
            }
        ),
        200,
    )


@products_bp.route("/", methods=["POST"])
@jwt_required()
def create_product():
    if not is_admin():
        return jsonify({"error": "Admin only"}), 403

    data = request.get_json() or {}
    required = ["name", "category", "price"]
    for field in required:
        if data.get(field) in (None, ""):
            return jsonify({"error": f"Missing field: {field}"}), 400

    category_id = int(data.get("category_id")) if data.get("category_id") not in (None, "") else None
    if category_id:
        category_ref = Category.query.get(category_id)
        if not category_ref:
            return jsonify({"error": "category_id not found"}), 404
        if not data.get("category"):
            data["category"] = category_ref.name

    product = Product(
        name=str(data.get("name", "")).strip(),
        sku=(str(data.get("sku", "")).strip() or None),
        category=str(data.get("category", "")).strip(),
        category_id=category_id,
        segment=str(data.get("segment", "Nam")).strip() or "Nam",
        brand=str(data.get("brand", "")).strip(),
        material=str(data.get("material", "")).strip(),
        sizes=_normalize_csv(data.get("sizes")),
        colors=_normalize_csv(data.get("colors")),
        rating_avg=float(data.get("rating_avg", 0) or 0),
        rating_count=int(data.get("rating_count", 0) or 0),
        seo_tags=_normalize_csv(data.get("seo_tags")),
        price=float(data.get("price", 0) or 0),
        stock=int(data.get("stock", 0) or 0),
        discount=float(data.get("discount", 0) or 0),
        image=(data.get("image") or "").strip(),
        description=(data.get("description") or "").strip(),
    )
    db.session.add(product)
    db.session.flush()
    _apply_media_and_variants(product, data)
    db.session.commit()
    return jsonify({"product": product.to_dict()}), 201


@products_bp.route("/<int:product_id>", methods=["PUT"])
@jwt_required()
def update_product(product_id):
    if not is_admin():
        return jsonify({"error": "Admin only"}), 403

    product = Product.query.get_or_404(product_id)
    data = request.get_json() or {}

    for field in ["name", "category", "segment", "brand", "material", "description"]:
        if field in data:
            setattr(product, field, str(data[field]).strip())
    if "category_id" in data:
        category_id = int(data.get("category_id")) if data.get("category_id") not in (None, "") else None
        if category_id:
            category_ref = Category.query.get(category_id)
            if not category_ref:
                return jsonify({"error": "category_id not found"}), 404
            if "category" not in data:
                product.category = category_ref.name
        product.category_id = category_id

    if "sku" in data:
        product.sku = str(data.get("sku", "")).strip() or None
    if "seo_tags" in data:
        product.seo_tags = _normalize_csv(data.get("seo_tags"))

    for field in ["price", "discount", "rating_avg"]:
        if field in data and data[field] not in (None, ""):
            setattr(product, field, float(data[field]))
    for field in ["stock", "rating_count"]:
        if field in data and data[field] not in (None, ""):
            setattr(product, field, int(data[field]))

    _apply_media_and_variants(product, data)
    db.session.commit()
    return jsonify({"product": product.to_dict()}), 200


@products_bp.route("/<int:product_id>", methods=["DELETE"])
@jwt_required()
def delete_product(product_id):
    if not is_admin():
        return jsonify({"error": "Admin only"}), 403

    product = Product.query.get_or_404(product_id)
    CartItem.query.filter_by(product_id=product_id).delete()
    db.session.delete(product)
    db.session.commit()
    return jsonify({"message": "Product deleted"}), 200
