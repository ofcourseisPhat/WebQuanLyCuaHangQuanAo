from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.core.database import db
from app.models.product import Product
from app.models.user import User

products_bp = Blueprint('products', __name__)


def is_admin():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    return user and user.role == 'admin'


@products_bp.route('/', methods=['GET'])
def get_products():
    category = request.args.get('category')
    search = request.args.get('search', '')
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 12))

    query = Product.query
    if category:
        query = query.filter_by(category=category)
    if search:
        query = query.filter(Product.name.ilike(f'%{search}%'))

    total = query.count()
    products = query.offset((page - 1) * per_page).limit(per_page).all()

    return jsonify({
        'products': [p.to_dict() for p in products],
        'total': total,
        'page': page,
        'pages': (total + per_page - 1) // per_page
    }), 200


@products_bp.route('/<int:product_id>', methods=['GET'])
def get_product(product_id):
    print("MATCHED get_product with id:", product_id, flush=True)
    product = Product.query.get_or_404(product_id)
    return jsonify({'product': product.to_dict()}), 200


@products_bp.route('/categories', methods=['GET'])
def get_categories():
    print("MATCHED get_categories!!!", flush=True)
    cats = db.session.query(Product.category).distinct().all()
    return jsonify({'categories': [c[0] for c in cats]}), 200


@products_bp.route('/', methods=['POST'])
@jwt_required()
def create_product():
    if not is_admin():
        return jsonify({'error': 'Chỉ admin mới có quyền thực hiện'}), 403

    data = request.get_json()
    required = ['name', 'category', 'price']
    for field in required:
        if not data.get(field):
            return jsonify({'error': f'Thiếu trường {field}'}), 400

    product = Product(
        name=data['name'],
        category=data['category'],
        price=float(data['price']),
        stock=int(data.get('stock', 0)),
        discount=float(data.get('discount', 0)),
        image=data.get('image', ''),
        description=data.get('description', '')
    )
    db.session.add(product)
    db.session.commit()
    return jsonify({'product': product.to_dict()}), 201


@products_bp.route('/<int:product_id>', methods=['PUT'])
@jwt_required()
def update_product(product_id):
    if not is_admin():
        return jsonify({'error': 'Chỉ admin mới có quyền thực hiện'}), 403

    product = Product.query.get_or_404(product_id)
    data = request.get_json()

    for field in ['name', 'category', 'description', 'image']:
        if field in data:
            setattr(product, field, data[field])
    for field in ['price', 'discount']:
        if field in data:
            setattr(product, field, float(data[field]))
    if 'stock' in data:
        product.stock = int(data['stock'])

    db.session.commit()
    return jsonify({'product': product.to_dict()}), 200


@products_bp.route('/<int:product_id>', methods=['DELETE'])
@jwt_required()
def delete_product(product_id):
    if not is_admin():
        return jsonify({'error': 'Chỉ admin mới có quyền thực hiện'}), 403

    product = Product.query.get_or_404(product_id)
    db.session.delete(product)
    db.session.commit()
    return jsonify({'message': 'Đã xóa sản phẩm'}), 200
