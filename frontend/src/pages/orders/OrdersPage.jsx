import React, { useState, useEffect } from 'react';
import api from '../../api';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(n) + '₫';

const STATUS_MAP = {
  pending:   { label: 'Chờ xử lý',      cls: 'badge-warning' },
  paid:      { label: 'Đã thanh toán',  cls: 'badge-info'    },
  shipped:   { label: 'Đang giao',      cls: 'badge-info'    },
  delivered: { label: 'Đã giao',        cls: 'badge-success' },
  cancelled: { label: 'Đã hủy',         cls: 'badge-danger'  },
};

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    api.get('/orders/').then(r => setOrders(r.data.orders)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ minHeight: '60vh' }}><div className="spinner" /></div>;

  if (orders.length === 0) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FBE8CE' }}>
        <div className="empty-state">
          <div style={{ fontSize: 56, marginBottom: 16 }}>📦</div>
          <h3>Chưa có đơn hàng nào</h3>
          <p>Hãy mua sắm và tạo đơn hàng đầu tiên!</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FBE8CE', padding: '40px 0' }}>
      <div className="page-container">
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <p style={styles.sectionLabel}>Lịch sử mua hàng</p>
          <h1 style={styles.pageTitle}>Đơn hàng của tôi</h1>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {orders.map(order => {
            const status = STATUS_MAP[order.status] || { label: order.status, cls: 'badge-gray' };
            const isOpen = expanded === order.id;
            return (
              <div key={order.id} style={styles.orderCard}>
                {/* Order header row */}
                <div style={styles.orderHeader} onClick={() => setExpanded(isOpen ? null : order.id)}>
                  <div style={styles.orderNum}>
                    <span style={styles.orderNumText}>Đơn #{order.id}</span>
                    <span className={`badge ${status.cls}`}>{status.label}</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>
                    {new Date(order.created_at).toLocaleDateString('vi-VN', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </div>
                  <div style={styles.orderMeta}>
                    <div style={styles.orderTotal}>{fmt(order.total)}</div>
                    <div style={{ fontSize: 12, color: '#9ca3af', textAlign: 'right' }}>{order.items.length} sản phẩm</div>
                  </div>
                  <span style={styles.chevron}>{isOpen ? '▲' : '▼'}</span>
                </div>

                {/* Expanded details */}
                {isOpen && (
                  <div style={styles.orderDetails}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                      {order.items.map(item => (
                        <div key={item.id} style={styles.orderItem}>
                          <span style={{ fontSize: 14, color: '#2D3436' }}>
                            {item.product_name}
                            <span style={{ color: '#9ca3af', marginLeft: 6 }}>× {item.quantity}</span>
                          </span>
                          <span style={{ fontSize: 14, fontWeight: 600, color: '#9AB17A' }}>{fmt(item.subtotal)}</span>
                        </div>
                      ))}
                    </div>
                    <div style={styles.orderFooter}>
                      <span>📍 <strong style={{ color: '#2D3436' }}>{order.address || 'Không có địa chỉ'}</strong></span>
                      <span>💳 <strong style={{ color: '#2D3436' }}>{order.payment_method?.toUpperCase()}</strong></span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const styles = {
  sectionLabel: { fontSize: 12, fontWeight: 700, color: '#9AB17A', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 },
  pageTitle: { fontSize: 28, fontFamily: "'Outfit',sans-serif", color: '#2D3436' },
  orderCard: {
    background: 'white',
    borderRadius: 20,
    overflow: 'hidden',
    boxShadow: '0 4px 12px rgba(154,177,122,0.08)',
  },
  orderHeader: {
    padding: '20px 24px',
    display: 'grid',
    gridTemplateColumns: '1fr auto auto auto',
    alignItems: 'center',
    gap: 16,
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  orderNum: { display: 'flex', alignItems: 'center', gap: 10 },
  orderNumText: { fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 15, color: '#2D3436' },
  orderMeta: { textAlign: 'right' },
  orderTotal: { fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 17, color: '#9AB17A' },
  chevron: { color: '#9ca3af', fontSize: 14 },
  orderDetails: {
    borderTop: '1.5px solid rgba(154,177,122,0.12)',
    padding: '18px 24px 20px',
    background: 'rgba(251,232,206,0.3)',
  },
  orderItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid rgba(154,177,122,0.1)',
  },
  orderFooter: {
    display: 'flex',
    gap: 28,
    fontSize: 13,
    color: '#9ca3af',
    paddingTop: 12,
    flexWrap: 'wrap',
  },
};
