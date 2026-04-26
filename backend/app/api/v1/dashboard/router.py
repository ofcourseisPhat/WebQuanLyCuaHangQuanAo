from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func
from app.core.database import db
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.models.user import User

dashboard_bp = Blueprint('dashboard', __name__)


def require_admin():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    return user and user.role == 'admin'


@dashboard_bp.route('/summary', methods=['GET'])
@jwt_required()
def summary():
    if not require_admin():
        return jsonify({'error': 'Chỉ admin mới có quyền'}), 403

    total_revenue = db.session.query(func.sum(Order.total)).filter(
        Order.status.in_(['paid', 'shipped', 'delivered'])
    ).scalar() or 0

    total_orders = Order.query.count()
    total_products = Product.query.count()
    total_customers = User.query.filter_by(role='customer').count()
    pending_orders = Order.query.filter_by(status='pending').count()
    low_stock = Product.query.filter(Product.stock < 10).count()

    return jsonify({
        'total_revenue': round(total_revenue),
        'total_orders': total_orders,
        'total_products': total_products,
        'total_customers': total_customers,
        'pending_orders': pending_orders,
        'low_stock_products': low_stock
    }), 200


@dashboard_bp.route('/revenue-by-month', methods=['GET'])
@jwt_required()
def revenue_by_month():
    if not require_admin():
        return jsonify({'error': 'Chỉ admin mới có quyền'}), 403

    results = db.session.query(
        func.month(Order.created_at).label('month'),
        func.year(Order.created_at).label('year'),
        func.sum(Order.total).label('revenue'),
        func.count(Order.id).label('orders')
    ).filter(
        Order.status.in_(['paid', 'shipped', 'delivered'])
    ).group_by(
        func.year(Order.created_at),
        func.month(Order.created_at)
    ).order_by('year', 'month').all()

    months_vi = ['', 'T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12']
    data = [{
        'month': months_vi[r.month],
        'revenue': round(r.revenue or 0),
        'orders': r.orders
    } for r in results]

    return jsonify({'data': data}), 200


@dashboard_bp.route('/top-products', methods=['GET'])
@jwt_required()
def top_products():
    if not require_admin():
        return jsonify({'error': 'Chỉ admin mới có quyền'}), 403

    results = db.session.query(
        Product.name,
        Product.category,
        func.sum(OrderItem.quantity).label('total_sold'),
        func.sum(OrderItem.quantity * OrderItem.price).label('revenue')
    ).join(OrderItem, OrderItem.product_id == Product.id
    ).join(Order, Order.id == OrderItem.order_id
    ).filter(Order.status.in_(['paid', 'shipped', 'delivered'])
    ).group_by(Product.id).order_by(func.sum(OrderItem.quantity).desc()).limit(10).all()

    data = [{
        'name': r.name,
        'category': r.category,
        'total_sold': r.total_sold or 0,
        'revenue': round(r.revenue or 0)
    } for r in results]

    return jsonify({'data': data}), 200


@dashboard_bp.route('/sales-by-category', methods=['GET'])
@jwt_required()
def sales_by_category():
    if not require_admin():
        return jsonify({'error': 'Chỉ admin mới có quyền'}), 403

    results = db.session.query(
        Product.category,
        func.sum(OrderItem.quantity).label('total_sold'),
        func.sum(OrderItem.quantity * OrderItem.price).label('revenue')
    ).join(OrderItem, OrderItem.product_id == Product.id
    ).join(Order, Order.id == OrderItem.order_id
    ).group_by(Product.category).all()

    data = [{
        'category': r.category,
        'total_sold': r.total_sold or 0,
        'revenue': round(r.revenue or 0)
    } for r in results]

    return jsonify({'data': data}), 200


@dashboard_bp.route('/order-status-breakdown', methods=['GET'])
@jwt_required()
def order_status_breakdown():
    if not require_admin():
        return jsonify({'error': 'Chỉ admin mới có quyền'}), 403

    results = db.session.query(
        Order.status,
        func.count(Order.id).label('count')
    ).group_by(Order.status).all()

    label_map = {
        'pending': 'Chờ xử lý',
        'paid': 'Đã thanh toán',
        'shipped': 'Đang giao',
        'delivered': 'Đã giao',
        'cancelled': 'Đã hủy'
    }

    data = [{'status': label_map.get(r.status, r.status), 'count': r.count} for r in results]
    return jsonify({'data': data}), 200
