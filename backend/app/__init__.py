from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from app.core.config import settings
from app.core.database import db
from app.api.v1 import api_v1


def create_app(config: dict | None = None) -> Flask:
    """Application factory."""
    app = Flask(__name__)
    app.config.from_object(settings)
    if config:
        app.config.update(config)

    CORS(app, origins=settings.CORS_ORIGINS, supports_credentials=True)
    JWTManager(app)
    db.init_app(app)

    app.register_blueprint(api_v1, url_prefix="/api/v1")

    with app.app_context():
        db.create_all()

    return app
