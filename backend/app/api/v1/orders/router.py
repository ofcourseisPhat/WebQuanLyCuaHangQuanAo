import io
from datetime import datetime

from flask import Blueprint, Response, jsonify, make_response, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy import func

from app.core.database import db
from app.models.cart import CartItem
from app.models.order import Order, OrderItem, OrderReturn
from app.models.product import Product, ProductVariant
from app.models.user import User

orders_bp = Blueprint("orders", __name__)

ALLOWED_ORDER_STATUSES = ("pending", "paid", "shipped", "delivered", "cancelled")
STATUS_TRANSITIONS = {
    "pending": {"paid", "shipped", "cancelled"},
    "paid": {"shipped", "cancelled"},
    "shipped": {"delivered", "cancelled"},
    "delivered": set(),
    "cancelled": set(),
}
RETURN_STATUSES = ("requested", "approved", "rejected", "completed")


def _current_user_id():
    identity = get_jwt_identity()
    try:
        return int(identity)
    except (TypeError, ValueError):
        return identity


def _is_admin(user_id):
    user = User.query.get(user_id)
    return user and user.role == "admin"


def _serialize_order(order):
    payload = order.to_dict()
    payload["status"] = (payload.get("status") or "").lower()
    payload["status_label"] = payload["status"].replace("_", " ").title()
    if order.user:
        payload["customer"] = {
            "id": order.user.id,
            "name": order.user.name,
            "email": order.user.email,
            "phone": order.user.phone,
            "customer_tier": order.user.customer_tier,
        }
    return payload


def _status_summary(base_query):
    summary = {status: 0 for status in ALLOWED_ORDER_STATUSES}
    rows = base_query.with_entities(Order.status, func.count(Order.id)).group_by(Order.status).all()
    for status, count in rows:
        key = (status or "").lower()
        if key in summary:
            summary[key] = count
    return summary


def _invoice_payload(order):
    items = []
    for item in order.items:
        items.append(
            {
                "product_id": item.product_id,
                "product_name": item.product.name if item.product else f"Product #{item.product_id}",
                "quantity": item.quantity,
                "unit_price": item.price,
                "subtotal": item.price * item.quantity,
            }
        )
    return {
        "invoice_no": f"INV-{order.id:06d}",
        "order_id": order.id,
        "created_at": order.created_at.isoformat(),
        "status": order.status,
        "customer": {
            "id": order.user.id if order.user else None,
            "name": order.user.name if order.user else "",
            "email": order.user.email if order.user else "",
            "phone": order.user.phone if order.user else "",
        },
        "address": order.address,
        "note": order.note,
        "payment_method": order.payment_method,
        "items": items,
        "total": order.total,
    }


@orders_bp.route("/checkout", methods=["POST"])
@jwt_required()
def checkout():
    user_id = _current_user_id()
    data = request.get_json() or {}

    cart_items = CartItem.query.filter_by(user_id=user_id).all()
    if not cart_items:
        return jsonify({"error": "Cart is empty"}), 400

    for item in cart_items:
        product = Product.query.get(item.product_id)
        if not product:
            return jsonify({"error": f"Product {item.product_id} does not exist"}), 400
        if product.stock < item.quantity:
            return jsonify({"error": f'Not enough stock for "{product.name}"'}), 400

    total = sum(item.product.final_price() * item.quantity for item in cart_items if item.product)

    order = Order(
        user_id=user_id,
        total=total,
        status="pending",
        payment_method=data.get("payment_method", "cod"),
        address=data.get("address", ""),
        note=data.get("note", ""),
    )
    db.session.add(order)
    db.session.flush()

    for item in cart_items:
        product = Product.query.get(item.product_id)
        order_item = OrderItem(
            order_id=order.id,
            product_id=item.product_id,
            quantity=item.quantity,
            price=product.final_price(),
        )
        product.stock -= item.quantity
        if product.variants:
            remaining = item.quantity
            variants = ProductVariant.query.filter_by(product_id=product.id).order_by(ProductVariant.id.asc()).all()
            for variant in variants:
                if remaining <= 0:
                    break
                take = min(variant.stock, remaining)
                if take > 0:
                    variant.stock -= take
                    remaining -= take
        db.session.add(order_item)

    CartItem.query.filter_by(user_id=user_id).delete()
    db.session.commit()

    return jsonify({"order": _serialize_order(order), "message": "Order placed successfully"}), 201


@orders_bp.route("/", methods=["GET"])
@jwt_required()
def get_my_orders():
    user_id = _current_user_id()
    page = max(int(request.args.get("page", 1)), 1)
    per_page = max(int(request.args.get("per_page", 20)), 1)
    status = (request.args.get("status") or "").strip().lower()

    query = Order.query.filter_by(user_id=user_id)
    if status:
        if status not in ALLOWED_ORDER_STATUSES:
            return jsonify({"error": f'Invalid status. Allowed: {", ".join(ALLOWED_ORDER_STATUSES)}'}), 400
        query = query.filter_by(status=status)

    query = query.order_by(Order.created_at.desc())
    total = query.count()
    orders = query.offset((page - 1) * per_page).limit(per_page).all()

    return (
        jsonify(
            {
                "orders": [_serialize_order(order) for order in orders],
                "total": total,
                "page": page,
                "pages": (total + per_page - 1) // per_page,
                "status_summary": _status_summary(Order.query.filter_by(user_id=user_id)),
            }
        ),
        200,
    )


@orders_bp.route("/statuses", methods=["GET"])
@jwt_required()
def get_my_order_statuses():
    user_id = _current_user_id()
    orders = Order.query.filter_by(user_id=user_id).order_by(Order.created_at.desc()).all()

    result = [
        {
            "id": order.id,
            "status": order.status,
            "status_label": (order.status or "").replace("_", " ").title(),
            "total": order.total,
            "created_at": order.created_at.isoformat(),
        }
        for order in orders
    ]
    return jsonify({"orders": result, "status_summary": _status_summary(Order.query.filter_by(user_id=user_id))}), 200


@orders_bp.route("/<int:order_id>", methods=["GET"])
@jwt_required()
def get_order(order_id):
    user_id = _current_user_id()
    user = User.query.get(user_id)
    order = Order.query.get_or_404(order_id)
    if str(order.user_id) != str(user_id) and user.role != "admin":
        return jsonify({"error": "Access denied"}), 403
    return jsonify({"order": _serialize_order(order)}), 200


@orders_bp.route("/all", methods=["GET"])
@jwt_required()
def get_all_orders():
    user_id = _current_user_id()
    if not _is_admin(user_id):
        return jsonify({"error": "Admin only"}), 403

    page = max(int(request.args.get("page", 1)), 1)
    per_page = max(int(request.args.get("per_page", 20)), 1)
    status = (request.args.get("status") or "").strip().lower()

    query = Order.query
    if status:
        if status not in ALLOWED_ORDER_STATUSES:
            return jsonify({"error": f'Invalid status. Allowed: {", ".join(ALLOWED_ORDER_STATUSES)}'}), 400
        query = query.filter_by(status=status)
    query = query.order_by(Order.created_at.desc())

    total = query.count()
    orders = query.offset((page - 1) * per_page).limit(per_page).all()
    return (
        jsonify(
            {
                "orders": [_serialize_order(order) for order in orders],
                "total": total,
                "page": page,
                "pages": (total + per_page - 1) // per_page,
                "status_summary": _status_summary(Order.query),
            }
        ),
        200,
    )


@orders_bp.route("/<int:order_id>/status", methods=["PUT"])
@jwt_required()
def update_order_status(order_id):
    user_id = _current_user_id()
    if not _is_admin(user_id):
        return jsonify({"error": "Admin only"}), 403

    order = Order.query.get_or_404(order_id)
    data = request.get_json() or {}
    new_status = (data.get("status") or "").strip().lower()

    if not new_status:
        return jsonify({"error": "status is required"}), 400
    if new_status not in ALLOWED_ORDER_STATUSES:
        return jsonify({"error": f'Invalid status. Allowed: {", ".join(ALLOWED_ORDER_STATUSES)}'}), 400

    current_status = (order.status or "").lower()
    if current_status != new_status:
        allowed_targets = STATUS_TRANSITIONS.get(current_status, set())
        if new_status not in allowed_targets:
            return jsonify({"error": f'Cannot transition order from "{current_status}" to "{new_status}"', "allowed_next_statuses": sorted(list(allowed_targets))}), 400
    order.status = new_status
    db.session.commit()
    return jsonify({"message": "Order status updated", "order": _serialize_order(order)}), 200


@orders_bp.route("/<int:order_id>/invoice", methods=["GET"])
@jwt_required()
def get_invoice(order_id):
    user_id = _current_user_id()
    order = Order.query.get_or_404(order_id)
    if str(order.user_id) != str(user_id) and not _is_admin(user_id):
        return jsonify({"error": "Access denied"}), 403
    return jsonify({"invoice": _invoice_payload(order)}), 200


@orders_bp.route("/<int:order_id>/invoice/print", methods=["GET"])
@jwt_required()
def print_invoice(order_id):
    user_id = _current_user_id()
    order = Order.query.get_or_404(order_id)
    if str(order.user_id) != str(user_id) and not _is_admin(user_id):
        return jsonify({"error": "Access denied"}), 403

    payload = _invoice_payload(order)
    rows = "".join(
        [
            f"<tr><td>{index + 1}</td><td>{item['product_name']}</td><td>{item['quantity']}</td><td>{item['unit_price']:.0f}</td><td>{item['subtotal']:.0f}</td></tr>"
            for index, item in enumerate(payload["items"])
        ]
    )
    html = f"""
    <html>
    <head><meta charset='utf-8'><title>Invoice {payload['invoice_no']}</title></head>
    <body style='font-family:Arial,sans-serif;padding:24px'>
      <h2>Invoice {payload['invoice_no']}</h2>
      <p>Order ID: {payload['order_id']} | Date: {payload['created_at']}</p>
      <p>Customer: {payload['customer']['name']} - {payload['customer']['email']}</p>
      <p>Address: {payload['address'] or ''}</p>
      <table border='1' cellspacing='0' cellpadding='6' width='100%'>
        <tr><th>#</th><th>Product</th><th>Qty</th><th>Price</th><th>Subtotal</th></tr>
        {rows}
      </table>
      <h3 style='text-align:right'>Total: {payload['total']:.0f}</h3>
      <script>window.print()</script>
    </body></html>
    """
    return Response(html, mimetype="text/html")


@orders_bp.route("/export/excel", methods=["GET"])
@jwt_required()
def export_orders_excel():
    user_id = _current_user_id()
    if not _is_admin(user_id):
        return jsonify({"error": "Admin only"}), 403

    orders = Order.query.order_by(Order.created_at.desc()).all()
    output = io.StringIO()
    output.write("OrderID,Customer,Email,Status,Payment,Total,CreatedAt\n")
    for order in orders:
        customer = order.user.name if order.user else ""
        email = order.user.email if order.user else ""
        output.write(
            f"{order.id},\"{customer}\",\"{email}\",{order.status},{order.payment_method},{order.total},{order.created_at.isoformat()}\n"
        )
    csv_data = output.getvalue()
    response = make_response(csv_data)
    response.headers["Content-Type"] = "application/vnd.ms-excel"
    response.headers["Content-Disposition"] = f"attachment; filename=orders_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
    return response


@orders_bp.route("/export/pdf", methods=["GET"])
@jwt_required()
def export_orders_pdf():
    user_id = _current_user_id()
    if not _is_admin(user_id):
        return jsonify({"error": "Admin only"}), 403

    orders = Order.query.order_by(Order.created_at.desc()).all()
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.pdfgen import canvas

        buffer = io.BytesIO()
        c = canvas.Canvas(buffer, pagesize=A4)
        width, height = A4
        y = height - 40
        c.setFont("Helvetica-Bold", 14)
        c.drawString(40, y, "Order Report")
        y -= 24
        c.setFont("Helvetica", 9)
        for order in orders:
            customer = order.user.name if order.user else ""
            line = f"#{order.id} | {customer} | {order.status} | {order.total:.0f} | {order.created_at.strftime('%Y-%m-%d %H:%M')}"
            c.drawString(40, y, line[:110])
            y -= 14
            if y < 60:
                c.showPage()
                y = height - 40
                c.setFont("Helvetica", 9)
        c.showPage()
        c.save()
        buffer.seek(0)
        pdf_bytes = buffer.read()
    except Exception:
        fallback_text = "Order Report\n" + "\n".join(
            [f"#{order.id} | {order.status} | {order.total:.0f} | {order.created_at.isoformat()}" for order in orders]
        )
        pdf_bytes = fallback_text.encode("utf-8")

    response = make_response(pdf_bytes)
    response.headers["Content-Type"] = "application/pdf"
    response.headers["Content-Disposition"] = f"attachment; filename=orders_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.pdf"
    return response


@orders_bp.route("/<int:order_id>/return-request", methods=["POST"])
@jwt_required()
def create_return_request(order_id):
    user_id = _current_user_id()
    order = Order.query.get_or_404(order_id)
    if str(order.user_id) != str(user_id):
        return jsonify({"error": "Access denied"}), 403

    data = request.get_json() or {}
    reason = (data.get("reason") or "").strip()
    if not reason:
        return jsonify({"error": "reason is required"}), 400

    existing = OrderReturn.query.filter_by(order_id=order.id, user_id=user_id).first()
    if existing:
        return jsonify({"error": "Return request already exists"}), 409

    req = OrderReturn(order_id=order.id, user_id=user_id, reason=reason, status="requested")
    db.session.add(req)
    db.session.commit()
    return jsonify({"return_request": req.to_dict(), "message": "Return request created"}), 201


@orders_bp.route("/returns", methods=["GET"])
@jwt_required()
def list_returns():
    user_id = _current_user_id()
    if not _is_admin(user_id):
        return jsonify({"error": "Admin only"}), 403

    status = (request.args.get("status") or "").strip().lower()
    query = OrderReturn.query.order_by(OrderReturn.created_at.desc())
    if status:
        query = query.filter_by(status=status)
    return jsonify({"returns": [row.to_dict() for row in query.all()]}), 200


@orders_bp.route("/returns/<int:return_id>", methods=["PUT"])
@jwt_required()
def update_return(return_id):
    user_id = _current_user_id()
    if not _is_admin(user_id):
        return jsonify({"error": "Admin only"}), 403

    req = OrderReturn.query.get_or_404(return_id)
    data = request.get_json() or {}
    new_status = (data.get("status") or "").strip().lower()
    admin_note = (data.get("admin_note") or "").strip()

    if new_status and new_status not in RETURN_STATUSES:
        return jsonify({"error": f'Invalid return status. Allowed: {", ".join(RETURN_STATUSES)}'}), 400
    if new_status:
        req.status = new_status
    req.admin_note = admin_note
    db.session.commit()
    return jsonify({"return_request": req.to_dict(), "message": "Return request updated"}), 200
