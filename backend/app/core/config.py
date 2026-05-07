import os
from urllib.parse import quote_plus

from dotenv import load_dotenv

load_dotenv()


class Settings:
    """Centralized application settings loaded from .env."""

    # Database
    MYSQL_USER: str = os.getenv("MYSQL_USER", "root")
    MYSQL_PASSWORD: str = quote_plus(os.getenv("MYSQL_PASSWORD", ""))
    MYSQL_HOST: str = os.getenv("MYSQL_HOST", "localhost")
    MYSQL_PORT: str = os.getenv("MYSQL_PORT", "3306")
    MYSQL_DB: str = os.getenv("MYSQL_DB", "clothing_store")

    SQLALCHEMY_DATABASE_URI: str = (
        f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}"
        f"@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DB}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS: bool = False

    # Security
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "change-me-in-production")
    JWT_ACCESS_TOKEN_EXPIRES_HOURS: int = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES_HOURS", "12"))
    JWT_ACCESS_TOKEN_EXPIRES_REMEMBER_DAYS: int = int(
        os.getenv("JWT_ACCESS_TOKEN_EXPIRES_REMEMBER_DAYS", "30")
    )

    # App
    FLASK_ENV: str = os.getenv("FLASK_ENV", "development")
    DEBUG: bool = FLASK_ENV == "development"
    FRONTEND_BASE_URL: str = os.getenv("FRONTEND_BASE_URL", "http://localhost:3000")
    API_BASE_URL: str = os.getenv("API_BASE_URL", "http://localhost:5000/api/v1")

    # CORS
    CORS_ORIGINS: list = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

    # Email
    MAIL_TRANSPORT: str = os.getenv("MAIL_TRANSPORT", "console").strip().lower()
    MAIL_HOST: str = os.getenv("MAIL_HOST", "")
    MAIL_PORT: int = int(os.getenv("MAIL_PORT", "587"))
    MAIL_USERNAME: str = os.getenv("MAIL_USERNAME", "")
    MAIL_PASSWORD: str = os.getenv("MAIL_PASSWORD", "")
    MAIL_FROM: str = os.getenv("MAIL_FROM", "no-reply@luxe.local")
    MAIL_USE_TLS: bool = os.getenv("MAIL_USE_TLS", "true").strip().lower() == "true"


settings = Settings()
