from flask import Blueprint

from app.api.v1.auth.router import auth_bp
from app.api.v1.products.router import products_bp
from app.api.v1.cart.router import cart_bp
from app.api.v1.orders.router import orders_bp
from app.api.v1.ml.router import ml_bp
from app.api.v1.dashboard.router import dashboard_bp
from app.api.v1.categories.router import categories_bp
from app.api.v1.customers.router import customers_bp
from app.api.v1.promotions.router import promotions_bp

api_v1 = Blueprint("api_v1", __name__)

api_v1.register_blueprint(auth_bp,      url_prefix="/auth")
api_v1.register_blueprint(products_bp,  url_prefix="/products")
api_v1.register_blueprint(cart_bp,      url_prefix="/cart")
api_v1.register_blueprint(orders_bp,    url_prefix="/orders")
api_v1.register_blueprint(ml_bp,        url_prefix="/ml")
api_v1.register_blueprint(dashboard_bp, url_prefix="/dashboard")
api_v1.register_blueprint(categories_bp, url_prefix="/categories")
api_v1.register_blueprint(customers_bp,  url_prefix="/customers")
api_v1.register_blueprint(promotions_bp, url_prefix="/promotions")
