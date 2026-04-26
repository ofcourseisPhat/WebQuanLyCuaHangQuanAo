from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.core.database import db
from app.models.cart import CartItem
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.models.user import User

orders_bp = Blueprint('orders', __name__)


@orders_bp.route('/checkout', methods=['POST'])
@jwt_required()
def checkout():
    user_id = get_jwt_identity()
    data = request.get_json()

    cart_items = CartItem.query.filter_by(user_id=user_id).all()
    if not cart_items:
        return jsonify({'error': 'Giỏ hàng trống'}), 400

    # Kiểm tra tồn kho
    for item in cart_items:
        product = Product.query.get(item.product_id)
        if not product or product.stock < item.quantity:
            return jsonify({'error': f'Sản phẩm "{product.name}" không đủ hàng'}), 400

    total = sum(item.product.final_price() * item.quantity for item in cart_items)

    order = Order(
        user_id=user_id,
        total=total,
        status='pending',
        payment_method=data.get('payment_method', 'cod'),
        address=data.get('address', ''),
        note=data.get('note', '')
    )
    db.session.add(order)
    db.session.flush()

    for item in cart_items:
        product = Product.query.get(item.product_id)
        order_item = OrderItem(
            order_id=order.id,
            product_id=item.product_id,
            quantity=item.quantity,
            price=product.final_price()
        )
        product.stock -= item.quantity
        db.session.add(order_item)

    CartItem.query.filter_by(user_id=user_id).delete()
    db.session.commit()

    return jsonify({'order': order.to_dict(), 'message': 'Đặt hàng thành công!'}), 201


@orders_bp.route('/', methods=['GET'])
@jwt_required()
def get_my_orders():
    user_id = get_jwt_identity()
    orders = Order.query.filter_by(user_id=user_id).order_by(Order.created_at.desc()).all()
    return jsonify({'orders': [o.to_dict() for o in orders]}), 200


@orders_bp.route('/<int:order_id>', methods=['GET'])
@jwt_required()
def get_order(order_id):
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    order = Order.query.get_or_404(order_id)

    if str(order.user_id) != str(user_id) and user.role != 'admin':
        return jsonify({'error': 'Không có quyền truy cập'}), 403

    return jsonify({'order': order.to_dict()}), 200


@orders_bp.route('/all', methods=['GET'])
@jwt_required()
def get_all_orders():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if user.role != 'admin':
        return jsonify({'error': 'Chỉ admin mới có quyền'}), 403

    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 20))
    status = request.args.get('status')

    query = Order.query
    if status:
        query = query.filter_by(status=status)
    query = query.order_by(Order.created_at.desc())

    total = query.count()
    orders = query.offset((page - 1) * per_page).limit(per_page).all()

    return jsonify({
        'orders': [o.to_dict() for o in orders],
        'total': total
    }), 200


@orders_bp.route('/<int:order_id>/status', methods=['PUT'])
@jwt_required()
def update_order_status(order_id):
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if user.role != 'admin':
        return jsonify({'error': 'Chỉ admin mới có quyền'}), 403

    order = Order.query.get_or_404(order_id)
    data = request.get_json()
    order.status = data.get('status', order.status)
    db.session.commit()
    return jsonify({'order': order.to_dict()}), 200
