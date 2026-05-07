from werkzeug.security import generate_password_hash

from app.core.database import db
from app.models.cart import CartItem
from app.models.product import Product
from app.models.user import User


def _auth_header(token):
    return {"Authorization": f"Bearer {token}"}


def _register_customer(client, name="Customer", email="customer@example.com"):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "name": name,
            "email": email,
            "password": "secret123",
        },
    )
    assert response.status_code == 201
    payload = response.get_json()
    return payload["user"], payload["token"]


def _create_admin_token(client, app, email="admin@example.com"):
    with app.app_context():
        admin = User(
            name="Admin",
            email=email,
            password=generate_password_hash("secret123"),
            role="admin",
        )
        db.session.add(admin)
        db.session.commit()

    response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "secret123"},
    )
    assert response.status_code == 200
    return response.get_json()["token"]


def _seed_cart_for_checkout(app, user_id):
    with app.app_context():
        product = Product(
            name="Premium Shirt",
            category="Shirts",
            price=500000,
            stock=20,
            discount=0,
            image="",
            description="",
        )
        db.session.add(product)
        db.session.flush()

        item = CartItem(user_id=user_id, product_id=product.id, quantity=2)
        db.session.add(item)
        db.session.commit()


def _checkout_once(client, token):
    response = client.post(
        "/api/v1/orders/checkout",
        json={
            "address": "123 Test Street",
            "payment_method": "cod",
        },
        headers=_auth_header(token),
    )
    assert response.status_code == 201
    return response.get_json()["order"]


def _reset_db(app):
    with app.app_context():
        db.session.remove()
        db.drop_all()
        db.create_all()


def test_customer_can_view_order_status(app, client):
    _reset_db(app)

    user, token = _register_customer(client, email="status-customer@example.com")
    _seed_cart_for_checkout(app, user["id"])
    order = _checkout_once(client, token)

    assert order["status"] == "pending"

    response = client.get(
        "/api/v1/orders/?status=pending",
        headers=_auth_header(token),
    )
    assert response.status_code == 200
    payload = response.get_json()
    assert len(payload["orders"]) == 1
    assert payload["orders"][0]["id"] == order["id"]
    assert payload["orders"][0]["status"] == "pending"
    assert payload["status_summary"]["pending"] == 1

    status_response = client.get(
        "/api/v1/orders/statuses",
        headers=_auth_header(token),
    )
    assert status_response.status_code == 200
    status_payload = status_response.get_json()
    assert status_payload["orders"][0]["status"] == "pending"
    assert status_payload["status_summary"]["pending"] == 1


def test_admin_can_update_order_status(app, client):
    _reset_db(app)

    user, customer_token = _register_customer(client, email="flow-customer@example.com")
    _seed_cart_for_checkout(app, user["id"])
    order = _checkout_once(client, customer_token)
    admin_token = _create_admin_token(client, app, email="flow-admin@example.com")

    customer_update = client.put(
        f"/api/v1/orders/{order['id']}/status",
        json={"status": "shipped"},
        headers=_auth_header(customer_token),
    )
    assert customer_update.status_code == 403

    invalid_status = client.put(
        f"/api/v1/orders/{order['id']}/status",
        json={"status": "unknown_status"},
        headers=_auth_header(admin_token),
    )
    assert invalid_status.status_code == 400

    shipped = client.put(
        f"/api/v1/orders/{order['id']}/status",
        json={"status": "shipped"},
        headers=_auth_header(admin_token),
    )
    assert shipped.status_code == 200
    assert shipped.get_json()["order"]["status"] == "shipped"

    invalid_transition = client.put(
        f"/api/v1/orders/{order['id']}/status",
        json={"status": "pending"},
        headers=_auth_header(admin_token),
    )
    assert invalid_transition.status_code == 400

    delivered = client.put(
        f"/api/v1/orders/{order['id']}/status",
        json={"status": "delivered"},
        headers=_auth_header(admin_token),
    )
    assert delivered.status_code == 200
    assert delivered.get_json()["order"]["status"] == "delivered"

    delivered_list = client.get(
        "/api/v1/orders/all?status=delivered",
        headers=_auth_header(admin_token),
    )
    assert delivered_list.status_code == 200
    delivered_payload = delivered_list.get_json()
    assert delivered_payload["total"] == 1
    assert delivered_payload["orders"][0]["status"] == "delivered"
