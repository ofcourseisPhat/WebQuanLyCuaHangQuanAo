# Clothing Store — Web Quản Lý Cửa Hàng Quần Áo

Full-stack e-commerce & management platform: **Flask** (Python) + **React** (JS) + **MySQL**.

---

## Project Structure

```
ClothingStore/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/               # Versioned REST API
│   │   │       ├── auth/
│   │   │       ├── products/
│   │   │       ├── cart/
│   │   │       ├── orders/
│   │   │       ├── ml/
│   │   │       └── dashboard/
│   │   ├── core/
│   │   │   ├── config.py         # Centralized settings
│   │   │   └── database.py       # SQLAlchemy instance
│   │   ├── models/               # SQLAlchemy ORM models
│   │   ├── schemas/              # Marshmallow / Pydantic schemas
│   │   ├── services/             # Business logic (ML engine, etc.)
│   │   ├── utils/                # Shared helpers (response, pagination)
│   │   └── middlewares/          # Auth decorators, rate limiters
│   ├── scripts/
│   │   └── seed.py               # Database seeding
│   ├── tests/
│   │   ├── unit/
│   │   └── integration/
│   ├── run.py                    # Entry point
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── public/
    └── src/
        ├── api/                  # Axios instance & interceptors
        ├── components/           # Reusable UI components
        │   ├── common/
        │   ├── admin/
        │   ├── shop/
        │   └── cart/
        ├── pages/                # Route-level page components
        │   ├── admin/
        │   ├── auth/
        │   ├── cart/
        │   ├── orders/
        │   └── shop/
        ├── hooks/                # Custom React hooks
        ├── contexts/             # React Context providers
        ├── constants/            # Routes, API endpoints
        ├── utils/                # formatCurrency, formatDate, etc.
        └── styles/
```

## Quick Start

### Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env              # Fill in your DB credentials
python run.py
```

### Frontend
```bash
cd frontend
npm install
npm start
```

## Environment Variables

See `backend/.env.example` for all required variables.

## API

All endpoints are prefixed with `/api/v1`:

| Resource   | Prefix              |
|------------|---------------------|
| Auth       | `/api/v1/auth`      |
| Products   | `/api/v1/products`  |
| Cart       | `/api/v1/cart`      |
| Orders     | `/api/v1/orders`    |
| ML         | `/api/v1/ml`        |
| Dashboard  | `/api/v1/dashboard` |
