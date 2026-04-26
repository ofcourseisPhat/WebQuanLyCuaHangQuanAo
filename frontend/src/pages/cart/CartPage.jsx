import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import api from '../../api';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(n) + '₫';

export default function CartPage() {
  const { cart, updateItem, removeItem, clearCart } = useCart();
  const [checkoutMode, setCheckoutMode] = useState(false);
  const [form, setForm] = useState({ address: '', payment_method: 'cod', note: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const navigate = useNavigate();

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (!form.address.trim()) { alert('Vui lòng nhập địa chỉ giao hàng'); return; }
    setLoading(true);
    try {
      const r = await api.post('/orders/checkout', form);
      setSuccess(r.data.order);
      await clearCart();
    } catch (err) {
      alert(err.response?.data?.error || 'Đặt hàng thất bại');
    } finally { setLoading(false); }
  };

  if (success) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FBE8CE' }}>
        <div style={styles.successCard}>
          <div style={styles.successIcon}>🎉</div>
          <h2 style={styles.successTitle}>Đặt hàng thành công!</h2>
          <p style={{ color: '#6b7280', marginBottom: 6 }}>Mã đơn hàng: <strong style={{ color: '#2D3436' }}>#{success.id}</strong></p>
          <p style={{ color: '#6b7280', marginBottom: 32 }}>Tổng tiền: <strong style={{ color: '#9AB17A', fontSize: 18 }}>{fmt(success.total)}</strong></p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button className="btn-outline" onClick={() => navigate('/orders')}>Xem đơn hàng</button>
            <button className="btn-primary" onClick={() => navigate('/')}>Tiếp tục mua sắm</button>
          </div>
        </div>
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FBE8CE' }}>
        <div className="empty-state">
          <div style={{ fontSize: 64, marginBottom: 16 }}>🛒</div>
          <h3>Giỏ hàng trống</h3>
          <p style={{ marginBottom: 24 }}>Hãy thêm sản phẩm vào giỏ hàng</p>
          <Link to="/" className="btn-primary" style={{ padding: '11px 32px' }}>Mua sắm ngay</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FBE8CE', padding: '40px 0' }}>
      <div className="page-container">
        {/* Header */}
        <div style={styles.pageHeader}>
          <p style={styles.sectionLabel}>Giỏ hàng của bạn</p>
          <h1 style={styles.pageTitle}>{cart.count} sản phẩm</h1>
        </div>

        <div style={styles.layout}>
          {/* Left: Cart items / Checkout form */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {!checkoutMode ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {cart.items.map(item => (
                  <div key={item.id} style={styles.cartItem}>
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      style={styles.itemImg}
                      onError={e => { e.target.src = `https://picsum.photos/seed/${item.product_id}/80/80`; }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 15, color: '#2D3436' }}>{item.product.name}</div>
                      <div style={{ fontSize: 12, color: '#9AB17A', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600, marginTop: 3 }}>{item.product.category}</div>
                      <div style={{ fontWeight: 700, color: '#9AB17A', marginTop: 8, fontSize: 16 }}>{fmt(item.product.final_price)}</div>
                    </div>
                    <div style={styles.qtyRow}>
                      <button style={styles.qtyBtn} onClick={() => updateItem(item.id, item.quantity - 1)}>−</button>
                      <span style={{ minWidth: 28, textAlign: 'center', fontWeight: 700, fontSize: 15 }}>{item.quantity}</span>
                      <button style={styles.qtyBtn} onClick={() => updateItem(item.id, item.quantity + 1)}>+</button>
                    </div>
                    <div style={{ minWidth: 100, textAlign: 'right', fontWeight: 700, fontSize: 15, color: '#2D3436' }}>{fmt(item.subtotal)}</div>
                    <button style={styles.removeBtn} onClick={() => removeItem(item.id)}>✕</button>
                  </div>
                ))}
              </div>
            ) : (
              <div style={styles.checkoutCard}>
                <h2 style={styles.checkoutTitle}>Thông tin giao hàng</h2>
                <form onSubmit={handleCheckout} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <div>
                    <label style={styles.label}>Địa chỉ giao hàng *</label>
                    <textarea
                      style={{ width: '100%', height: 88, resize: 'vertical', borderRadius: 12, border: '1.5px solid rgba(154,177,122,0.3)', padding: '11px 16px', fontSize: 14, fontFamily: 'inherit', outline: 'none' }}
                      placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố"
                      value={form.address}
                      onChange={e => setForm({ ...form, address: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label style={styles.label}>Phương thức thanh toán</label>
                    <select style={{ width: '100%' }} value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })}>
                      <option value="cod">Thanh toán khi nhận hàng (COD)</option>
                      <option value="bank_transfer">Chuyển khoản ngân hàng</option>
                      <option value="momo">Ví MoMo</option>
                    </select>
                  </div>
                  <div>
                    <label style={styles.label}>Ghi chú (không bắt buộc)</label>
                    <textarea
                      style={{ width: '100%', height: 68, resize: 'vertical', borderRadius: 12, border: '1.5px solid rgba(154,177,122,0.3)', padding: '11px 16px', fontSize: 14, fontFamily: 'inherit', outline: 'none' }}
                      placeholder="Ghi chú cho đơn hàng..."
                      value={form.note}
                      onChange={e => setForm({ ...form, note: e.target.value })}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button type="button" className="btn-outline" style={{ flex: 1 }} onClick={() => setCheckoutMode(false)}>← Quay lại</button>
                    <button type="submit" className="btn-primary" style={{ flex: 2 }} disabled={loading}>
                      {loading ? 'Đang đặt hàng...' : 'Xác nhận đặt hàng →'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Right: Summary */}
          <div style={styles.summary}>
            <h3 style={styles.summaryTitle}>Tóm tắt đơn hàng</h3>
            {cart.items.map(item => (
              <div key={item.id} style={styles.summaryRow}>
                <span style={{ fontSize: 13, color: '#6b7280' }}>{item.product.name} × {item.quantity}</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{fmt(item.subtotal)}</span>
              </div>
            ))}
            <div style={styles.divider} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 20, marginBottom: 6 }}>
              <span>Tổng cộng</span>
              <span style={{ color: '#9AB17A' }}>{fmt(cart.total)}</span>
            </div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 22 }}>✓ Miễn phí vận chuyển</div>
            {!checkoutMode && (
              <button className="btn-primary" style={{ width: '100%', padding: 14, fontSize: 16 }} onClick={() => setCheckoutMode(true)}>
                Tiến hành thanh toán →
              </button>
            )}
            <div style={styles.trustRow}>
              <span>🔒 Thanh toán bảo mật</span>
              <span>↩️ Đổi trả 30 ngày</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  pageHeader: { marginBottom: 32 },
  sectionLabel: { fontSize: 12, fontWeight: 700, color: '#9AB17A', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 },
  pageTitle: { fontSize: 28, fontFamily: "'Outfit',sans-serif", color: '#2D3436' },
  layout: { display: 'flex', gap: 28, alignItems: 'flex-start', flexWrap: 'wrap' },
  cartItem: {
    background: 'white',
    borderRadius: 20,
    padding: '18px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    boxShadow: '0 4px 12px rgba(154,177,122,0.08)',
  },
  itemImg: { width: 76, height: 76, borderRadius: 14, objectFit: 'cover', background: '#E4DFB5' },
  qtyRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'rgba(154,177,122,0.08)',
    borderRadius: 12,
    padding: '6px 10px',
  },
  qtyBtn: {
    width: 30, height: 30,
    borderRadius: 8,
    border: '1.5px solid rgba(154,177,122,0.3)',
    background: 'white',
    cursor: 'pointer',
    fontSize: 17,
    fontWeight: 600,
    color: '#2D3436',
  },
  removeBtn: { color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, padding: 6 },
  summary: {
    background: 'white',
    borderRadius: 24,
    padding: 28,
    boxShadow: '0 4px 12px rgba(154,177,122,0.10)',
    minWidth: 300,
    width: 330,
    flexShrink: 0,
  },
  summaryTitle: { fontSize: 17, fontFamily: "'Outfit',sans-serif", fontWeight: 700, marginBottom: 20 },
  summaryRow: { display: 'flex', justifyContent: 'space-between', marginBottom: 10 },
  divider: { borderTop: '1.5px solid rgba(154,177,122,0.15)', margin: '18px 0' },
  trustRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: 16,
    fontSize: 11,
    color: '#9ca3af',
  },
  checkoutCard: {
    background: 'white',
    borderRadius: 24,
    padding: 32,
    boxShadow: '0 4px 12px rgba(154,177,122,0.08)',
  },
  checkoutTitle: { fontSize: 20, fontFamily: "'Outfit',sans-serif", fontWeight: 700, marginBottom: 24 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#2D3436', marginBottom: 7 },
  successCard: {
    background: 'white',
    borderRadius: 28,
    padding: '52px 48px',
    textAlign: 'center',
    maxWidth: 440,
    boxShadow: '0 12px 40px rgba(154,177,122,0.2)',
  },
  successIcon: { fontSize: 60, marginBottom: 16 },
  successTitle: { fontSize: 26, fontFamily: "'Outfit',sans-serif", fontWeight: 700, marginBottom: 12, color: '#2D3436' },
};
