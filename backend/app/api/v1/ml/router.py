from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request
from app.core.database import db
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.services.ml_engine import recommendation_engine, bestseller_predictor

ml_bp = Blueprint('ml', __name__)


def get_orders_data():
    """Lấy dữ liệu đơn hàng để train model"""
    items = db.session.query(
        OrderItem.product_id,
        Order.user_id,
        OrderItem.quantity
    ).join(Order).all()

    return [{'user_id': r.user_id, 'product_id': r.product_id, 'quantity': r.quantity} for r in items]


def get_sales_data():
    """Lấy dữ liệu bán hàng theo tháng"""
    from sqlalchemy import func, extract
    items = db.session.query(
        OrderItem.product_id,
        func.month(Order.created_at).label('month'),
        func.sum(OrderItem.quantity).label('sales'),
        Product.price,
        Product.discount
    ).join(Order).join(Product).group_by(
        OrderItem.product_id,
        func.month(Order.created_at)
    ).all()

    return [{
        'product_id': r.product_id,
        'month': r.month,
        'sales': r.sales,
        'price': r.price,
        'discount': r.discount
    } for r in items]


def get_products_data():
    products = Product.query.all()
    return [{'id': p.id, 'category': p.category, 'price': p.price, 'discount': p.discount} for p in products]


@ml_bp.route('/train', methods=['POST'])
@jwt_required()
def train_models():
    orders_data = get_orders_data()
    products_data = get_products_data()
    sales_data = get_sales_data()

    cf_ok = recommendation_engine.build_user_item_matrix(orders_data)
    cbf_ok = recommendation_engine.build_content_matrix(products_data)
    bs_ok = bestseller_predictor.train(sales_data) if sales_data else False

    return jsonify({
        'collaborative_filtering': 'trained' if cf_ok else 'skipped (chưa đủ dữ liệu)',
        'content_based_filtering': 'trained' if cbf_ok else 'skipped',
        'bestseller_prediction': 'trained' if bs_ok else 'skipped (chưa đủ dữ liệu)'
    }), 200


@ml_bp.route('/recommend', methods=['GET'])
def recommend():
    """Gợi ý sản phẩm hybrid CF + CBF"""
    user_id = None
    try:
        verify_jwt_in_request(optional=True)
        user_id = get_jwt_identity()
        if user_id:
            user_id = int(user_id)
    except Exception:
        pass

    product_id = request.args.get('product_id', type=int)
    top_n = request.args.get('top_n', 6, type=int)

    # Rebuild content matrix nếu chưa có
    if recommendation_engine.cbf_similarity is None:
        recommendation_engine.build_content_matrix(get_products_data())
    if recommendation_engine.user_item_matrix is None:
        recommendation_engine.build_user_item_matrix(get_orders_data())

    if user_id:
        rec_ids = recommendation_engine.hybrid_recommend(user_id, product_id, top_n)
    elif product_id:
        rec_ids = recommendation_engine.content_based_filter(product_id, top_n)
    else:
        # Fallback: bestsellers
        products = Product.query.order_by(Product.price.desc()).limit(top_n).all()
        return jsonify({'products': [p.to_dict() for p in products], 'method': 'popular'}), 200

    if not rec_ids:
        products = Product.query.limit(top_n).all()
        return jsonify({'products': [p.to_dict() for p in products], 'method': 'popular'}), 200

    products = Product.query.filter(Product.id.in_(rec_ids)).all()
    products.sort(key=lambda p: rec_ids.index(p.id) if p.id in rec_ids else 999)

    method = 'hybrid' if user_id and product_id else ('collaborative' if user_id else 'content_based')
    return jsonify({'products': [p.to_dict() for p in products], 'method': method}), 200


@ml_bp.route('/predict-bestsellers', methods=['GET'])
@jwt_required()
def predict_bestsellers():
    sales_data = get_sales_data()

    if not sales_data:
        # Dùng dữ liệu giả nếu chưa có đủ đơn hàng
        products = Product.query.all()
        import random
        mock_result = [{
            'product_id': p.id,
            'product_name': p.name,
            'category': p.category,
            'total_sales': random.randint(50, 500),
            'avg_sales': random.randint(10, 80),
            'probability': round(random.uniform(40, 95), 1),
            'price': p.price
        } for p in products]
        mock_result.sort(key=lambda x: x['probability'], reverse=True)
        return jsonify({'predictions': mock_result, 'note': 'demo data'}), 200

    bestseller_predictor.train(sales_data)
    predictions = bestseller_predictor.predict(sales_data)

    # Gắn thêm thông tin sản phẩm
    product_map = {p.id: p for p in Product.query.all()}
    for pred in predictions:
        product = product_map.get(pred['product_id'])
        if product:
            pred['product_name'] = product.name
            pred['category'] = product.category
            pred['price'] = product.price

    return jsonify({'predictions': predictions}), 200
