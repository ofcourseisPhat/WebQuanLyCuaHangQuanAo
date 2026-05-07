import re
import secrets
from datetime import datetime, timedelta

from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required
from werkzeug.security import check_password_hash, generate_password_hash

from app.core.config import settings
from app.core.database import db
from app.models.user import User
from app.services.email_service import send_email

auth_bp = Blueprint("auth", __name__)

EMAIL_REGEX = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
PHONE_REGEX = re.compile(r"^(0|\+84)\d{9,10}$")
PASSWORD_MIN_LENGTH = 6
OTP_EXPIRE_MINUTES = 10
VERIFY_EXPIRE_HOURS = 24


def _is_valid_email(email):
    return bool(EMAIL_REGEX.match(email or ""))


def _normalize_phone(phone):
    normalized = re.sub(r"[^\d+]", "", (phone or "").strip())
    if normalized.startswith("+84"):
        normalized = "0" + normalized[3:]
    return normalized


def _is_valid_phone(phone):
    return bool(PHONE_REGEX.match(phone or ""))


def _is_valid_password(password):
    return isinstance(password, str) and len(password) >= PASSWORD_MIN_LENGTH


def _verification_link(token):
    return f"{settings.FRONTEND_BASE_URL}/login?verify_token={token}"


def _generate_verification_token(user):
    user.email_verification_token = secrets.token_urlsafe(32)
    user.email_verification_expires_at = datetime.utcnow() + timedelta(hours=VERIFY_EXPIRE_HOURS)
    return user.email_verification_token


def _send_verification_email(user):
    token = _generate_verification_token(user)
    db.session.commit()
    verify_url = _verification_link(token)
    subject = "Xac thuc email tai khoan LUXE"
    text_body = (
        f"Xin chao {user.name},\n\n"
        "Vui long xac thuc email bang lien ket ben duoi:\n"
        f"{verify_url}\n\n"
        f"Lien ket co hieu luc trong {VERIFY_EXPIRE_HOURS} gio."
    )
    html_body = (
        f"<p>Xin chao <strong>{user.name}</strong>,</p>"
        "<p>Cam on ban da dang ky tai khoan LUXE.</p>"
        f"<p><a href='{verify_url}'>Bam vao day de xac thuc email</a></p>"
        f"<p>Lien ket co hieu luc trong {VERIFY_EXPIRE_HOURS} gio.</p>"
    )
    return send_email(user.email, subject, html_body, text_body=text_body)


def _create_token_for_user(user, remember_me):
    if remember_me:
        expires_delta = timedelta(days=settings.JWT_ACCESS_TOKEN_EXPIRES_REMEMBER_DAYS)
    else:
        expires_delta = timedelta(hours=settings.JWT_ACCESS_TOKEN_EXPIRES_HOURS)
    return create_access_token(identity=str(user.id), expires_delta=expires_delta)


def _find_user_by_identifier(identifier):
    identifier = (identifier or "").strip().lower()
    if _is_valid_email(identifier):
        return User.query.filter_by(email=identifier).first()

    phone = _normalize_phone(identifier)
    if _is_valid_phone(phone):
        return User.query.filter_by(phone=phone).first()
    return None


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json() or {}

    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    phone = _normalize_phone(data.get("phone") or "")
    password = data.get("password") or ""
    confirm_password = data.get("confirm_password") or ""

    if not name or not email or not phone or not password or not confirm_password:
        return jsonify({"error": "Vui long dien day du thong tin"}), 400
    if not _is_valid_email(email):
        return jsonify({"error": "Email khong hop le"}), 400
    if not _is_valid_phone(phone):
        return jsonify({"error": "So dien thoai khong hop le"}), 400
    if not _is_valid_password(password):
        return jsonify({"error": "Mat khau phai co it nhat 6 ky tu"}), 400
    if password != confirm_password:
        return jsonify({"error": "Xac nhan mat khau khong khop"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email da duoc su dung"}), 409
    if User.query.filter_by(phone=phone).first():
        return jsonify({"error": "So dien thoai da duoc su dung"}), 409

    user = User(
        name=name,
        email=email,
        phone=phone,
        password=generate_password_hash(password),
        role="customer",
        is_email_verified=False,
    )
    db.session.add(user)
    db.session.commit()

    sent, reason = _send_verification_email(user)
    response = {
        "message": "Dang ky thanh cong. Vui long kiem tra email de xac thuc tai khoan.",
        "user": user.to_dict(),
        "verification_email_sent": sent,
    }
    if not sent:
        response["warning"] = f"Khong the gui email xac thuc luc nay: {reason}"
    return jsonify(response), 201


@auth_bp.route("/send-verification", methods=["POST"])
def send_verification():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()

    if not _is_valid_email(email):
        return jsonify({"error": "Email khong hop le"}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"message": "Neu email ton tai, he thong da gui huong dan xac thuc."}), 200
    if user.is_email_verified:
        return jsonify({"message": "Tai khoan da duoc xac thuc email."}), 200

    sent, reason = _send_verification_email(user)
    if not sent:
        return jsonify({"error": f"Khong the gui email xac thuc: {reason}"}), 500
    return jsonify({"message": "Da gui lai email xac thuc. Vui long kiem tra hop thu."}), 200


@auth_bp.route("/verify-email", methods=["GET"])
def verify_email():
    token = (request.args.get("token") or "").strip()
    if not token:
        return jsonify({"error": "Token xac thuc khong hop le"}), 400

    user = User.query.filter_by(email_verification_token=token).first()
    if not user:
        return jsonify({"error": "Token xac thuc khong ton tai"}), 400
    if user.email_verification_expires_at and user.email_verification_expires_at < datetime.utcnow():
        return jsonify({"error": "Token da het han"}), 400

    user.is_email_verified = True
    user.email_verification_token = None
    user.email_verification_expires_at = None
    db.session.commit()

    return jsonify({"message": "Xac thuc email thanh cong. Ban co the dang nhap ngay."}), 200


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    identifier = (data.get("identifier") or "").strip()
    password = data.get("password") or ""
    remember_me = bool(data.get("remember_me", False))

    if not identifier or not password:
        return jsonify({"error": "Vui long nhap day du thong tin dang nhap"}), 400

    user = _find_user_by_identifier(identifier)
    if not user or not check_password_hash(user.password, password):
        return jsonify({"error": "Thong tin dang nhap khong dung"}), 401
    if not user.is_active:
        return jsonify({"error": "Tai khoan da bi khoa. Vui long lien he ho tro."}), 403

    if user.role != "admin" and not user.is_email_verified:
        return (
            jsonify(
                {
                    "error": "Tai khoan chua xac thuc email",
                    "code": "EMAIL_NOT_VERIFIED",
                    "email": user.email,
                }
            ),
            403,
        )

    token = _create_token_for_user(user, remember_me)
    return jsonify({"token": token, "user": user.to_dict()}), 200


@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    data = request.get_json() or {}
    identifier = (data.get("identifier") or "").strip()
    user = _find_user_by_identifier(identifier)

    generic_response = {
        "message": "Neu thong tin ton tai, OTP reset mat khau da duoc gui qua email."
    }
    if not user:
        return jsonify(generic_response), 200

    otp_value = f"{secrets.randbelow(10**6):06d}"
    user.password_reset_otp_hash = generate_password_hash(otp_value)
    user.password_reset_otp_expires_at = datetime.utcnow() + timedelta(minutes=OTP_EXPIRE_MINUTES)
    user.password_reset_attempts = 0
    db.session.commit()

    subject = "Ma OTP dat lai mat khau LUXE"
    text_body = (
        f"Xin chao {user.name},\n\n"
        f"Ma OTP dat lai mat khau cua ban la: {otp_value}\n"
        f"Ma co hieu luc trong {OTP_EXPIRE_MINUTES} phut."
    )
    html_body = (
        f"<p>Xin chao <strong>{user.name}</strong>,</p>"
        f"<p>Ma OTP dat lai mat khau cua ban la: <strong>{otp_value}</strong></p>"
        f"<p>Ma co hieu luc trong {OTP_EXPIRE_MINUTES} phut.</p>"
    )
    sent, reason = send_email(user.email, subject, html_body, text_body=text_body)
    if not sent:
        return jsonify({"error": f"Khong the gui OTP: {reason}"}), 500
    return jsonify(generic_response), 200


@auth_bp.route("/verify-otp", methods=["POST"])
def verify_otp():
    data = request.get_json() or {}
    identifier = (data.get("identifier") or "").strip()
    otp = (data.get("otp") or "").strip()

    user = _find_user_by_identifier(identifier)
    if not user or not user.password_reset_otp_hash:
        return jsonify({"error": "Thong tin OTP khong hop le"}), 400
    if not user.password_reset_otp_expires_at or user.password_reset_otp_expires_at < datetime.utcnow():
        return jsonify({"error": "OTP da het han"}), 400

    user.password_reset_attempts = (user.password_reset_attempts or 0) + 1
    if user.password_reset_attempts > 5:
        db.session.commit()
        return jsonify({"error": "Ban da nhap sai OTP qua nhieu lan"}), 429

    if not check_password_hash(user.password_reset_otp_hash, otp):
        db.session.commit()
        return jsonify({"error": "OTP khong chinh xac"}), 400

    db.session.commit()
    return jsonify({"message": "OTP hop le"}), 200


@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    data = request.get_json() or {}
    identifier = (data.get("identifier") or "").strip()
    otp = (data.get("otp") or "").strip()
    password = data.get("password") or ""
    confirm_password = data.get("confirm_password") or ""

    if not identifier or not otp or not password or not confirm_password:
        return jsonify({"error": "Vui long dien day du thong tin"}), 400
    if password != confirm_password:
        return jsonify({"error": "Xac nhan mat khau khong khop"}), 400
    if not _is_valid_password(password):
        return jsonify({"error": "Mat khau phai co it nhat 6 ky tu"}), 400

    user = _find_user_by_identifier(identifier)
    if not user or not user.password_reset_otp_hash:
        return jsonify({"error": "Thong tin reset mat khau khong hop le"}), 400
    if not user.password_reset_otp_expires_at or user.password_reset_otp_expires_at < datetime.utcnow():
        return jsonify({"error": "OTP da het han"}), 400
    if not check_password_hash(user.password_reset_otp_hash, otp):
        return jsonify({"error": "OTP khong chinh xac"}), 400

    user.password = generate_password_hash(password)
    user.password_reset_otp_hash = None
    user.password_reset_otp_expires_at = None
    user.password_reset_attempts = 0
    db.session.commit()
    return jsonify({"message": "Dat lai mat khau thanh cong"}), 200


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "Khong tim thay nguoi dung"}), 404
    return jsonify({"user": user.to_dict()}), 200


@auth_bp.route("/update", methods=["PUT"])
@jwt_required()
def update_profile():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "Khong tim thay nguoi dung"}), 404

    data = request.get_json() or {}

    if "name" in data:
        name = (data.get("name") or "").strip()
        if not name:
            return jsonify({"error": "Ten khong duoc de trong"}), 400
        user.name = name

    if "phone" in data:
        phone = _normalize_phone(data.get("phone") or "")
        if not _is_valid_phone(phone):
            return jsonify({"error": "So dien thoai khong hop le"}), 400
        duplicated_phone = User.query.filter(User.phone == phone, User.id != user.id).first()
        if duplicated_phone:
            return jsonify({"error": "So dien thoai da duoc su dung"}), 409
        user.phone = phone

    if "password" in data:
        password = data.get("password") or ""
        if not _is_valid_password(password):
            return jsonify({"error": "Mat khau phai co it nhat 6 ky tu"}), 400
        user.password = generate_password_hash(password)

    db.session.commit()
    return jsonify({"user": user.to_dict()}), 200
