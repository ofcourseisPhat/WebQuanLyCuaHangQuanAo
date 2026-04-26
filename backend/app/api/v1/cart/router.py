from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.core.database import db
from app.models.cart import CartItem
from app.models.product import Product

cart_bp = Blueprint('cart', __name__)


@cart_bp.route('/', methods=['GET'])
@jwt_required()
def get_cart():
    user_id = get_jwt_identity()
    items = CartItem.query.filter_by(user_id=user_id).all()
    total = sum(item.product.final_price() * item.quantity for item in items if item.product)
    return jsonify({
        'items': [item.to_dict() for item in items],
        'total': total,
        'count': len(items)
    }), 200


@cart_bp.route('/add', methods=['POST'])
@jwt_required()
def add_to_cart():
    user_id = get_jwt_identity()
    data = request.get_json()
    product_id = data.get('product_id')
    quantity = int(data.get('quantity', 1))

    product = Product.query.get(product_id)
    if not product:
        return jsonify({'error': 'Sản phẩm không tồn tại'}), 404
    if product.stock < quantity:
        return jsonify({'error': 'Không đủ hàng trong kho'}), 400

    existing = CartItem.query.filter_by(user_id=user_id, product_id=product_id).first()
    if existing:
        existing.quantity += quantity
    else:
        item = CartItem(user_id=user_id, product_id=product_id, quantity=quantity)
        db.session.add(item)

    db.session.commit()
    return jsonify({'message': 'Đã thêm vào giỏ hàng'}), 200


@cart_bp.route('/update/<int:item_id>', methods=['PUT'])
@jwt_required()
def update_cart(item_id):
    user_id = get_jwt_identity()
    item = CartItem.query.filter_by(id=item_id, user_id=user_id).first()
    if not item:
        return jsonify({'error': 'Không tìm thấy'}), 404

    data = request.get_json()
    quantity = int(data.get('quantity', 1))
    if quantity <= 0:
        db.session.delete(item)
    else:
        item.quantity = quantity
    db.session.commit()
    return jsonify({'message': 'Đã cập nhật giỏ hàng'}), 200


@cart_bp.route('/remove/<int:item_id>', methods=['DELETE'])
@jwt_required()
def remove_from_cart(item_id):
    user_id = get_jwt_identity()
    item = CartItem.query.filter_by(id=item_id, user_id=user_id).first()
    if not item:
        return jsonify({'error': 'Không tìm thấy'}), 404
    db.session.delete(item)
    db.session.commit()
    return jsonify({'message': 'Đã xóa khỏi giỏ hàng'}), 200


@cart_bp.route('/clear', methods=['DELETE'])
@jwt_required()
def clear_cart():
    user_id = get_jwt_identity()
    CartItem.query.filter_by(user_id=user_id).delete()
    db.session.commit()
    return jsonify({'message': 'Đã xóa toàn bộ giỏ hàng'}), 200
