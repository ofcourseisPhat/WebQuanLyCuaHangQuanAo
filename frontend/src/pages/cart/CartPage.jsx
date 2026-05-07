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

  if (success) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f6f3', paddingTop: 72 }}>
      <div style={styles.successCard}>
        <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#c9a96e', marginBottom: 20 }}>Đặt hàng thành công</p>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 40, fontWeight: 300, marginBottom: 20 }}>Cảm ơn bạn!</h2>
        <p style={{ color: '#666', marginBottom: 8, fontSize: 14 }}>Mã đơn hàng: <strong style={{ color: '#0a0a0a' }}>#{success.id}</strong></p>
        <p style={{ color: '#666', marginBottom: 40, fontSize: 14 }}>Tổng tiền: <strong style={{ color: '#0a0a0a' }}>{fmt(success.total)}</strong></p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button className="btn-outline" onClick={() => navigate('/orders')}>Xem đơn hàng</button>
          <button className="btn-primary" onClick={() => navigate('/')}>Tiếp tục mua sắm</button>
        </div>
      </div>
    </div>
  );

  if (cart.items.length === 0) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white', paddingTop: 72 }}>
      <div className="empty-state">
        <p style={{ fontSize: 48, marginBottom: 24, opacity: 0.3 }}>◻</p>
        <h3>Giỏ hàng trống</h3>
        <p style={{ marginBottom: 32 }}>Hãy thêm sản phẩm vào giỏ hàng</p>
        <Link to="/" className="btn-primary" style={{ padding: '14px 36px' }}>Mua sắm ngay</Link>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'white', paddingTop: 72 }}>
      <div className="page-container" style={{ padding: '60px 40px' }}>

        {/* Header */}
        <div style={{ borderBottom: '1px solid rgba(0,0,0,0.08)', paddingBottom: 28, marginBottom: 48 }}>
          <p style={styles.eyebrow}>Giỏ hàng của bạn</p>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 48, fontWeight: 300 }}>{cart.count} Sản Phẩm</h1>
        </div>

        <div style={styles.layout}>
          {/* Cart items / Checkout */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {!checkoutMode ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {cart.items.map((item, i) => (
                  <div key={item.id} style={{ ...styles.cartItem, borderTop: i === 0 ? '1px solid rgba(0,0,0,0.08)' : 'none' }}>
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      style={styles.itemImg}
                      onError={e => { e.target.src = `https://picsum.photos/seed/${item.product_id}/80/100`; }}
                    />
                    <div style={{ flex: 1 }}>
                      <span style={styles.eyebrow}>{item.product.category}</span>
                      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: 20, color: '#0a0a0a', marginTop: 4 }}>{item.product.name}</div>
                      <div style={{ fontWeight: 500, color: '#0a0a0a', marginTop: 10, fontSize: 15 }}>{fmt(item.product.final_price)}</div>
                    </div>
                    <div style={styles.qtyRow}>
                      <button style={styles.qtyBtn} onClick={() => updateItem(item.id, item.quantity - 1)}>−</button>
                      <span style={{ minWidth: 28, textAlign: 'center', fontWeight: 400, fontSize: 15 }}>{item.quantity}</span>
                      <button style={styles.qtyBtn} onClick={() => updateItem(item.id, item.quantity + 1)}>+</button>
                    </div>
                    <div style={{ minWidth: 110, textAlign: 'right', fontWeight: 500, fontSize: 15 }}>{fmt(item.subtotal)}</div>
                    <button style={styles.removeBtn} onClick={() => removeItem(item.id)}>✕</button>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 300, marginBottom: 36 }}>Thông tin giao hàng</h2>
                <form onSubmit={handleCheckout} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div>
                    <label style={styles.label}>Địa chỉ giao hàng *</label>
                    <textarea style={{ width: '100%', height: 96, resize: 'vertical', padding: '12px 16px', fontSize: 14, fontFamily: 'inherit', border: '1px solid rgba(0,0,0,0.15)', outline: 'none' }}
                      placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố"
                      value={form.address}
                      onChange={e => setForm({ ...form, address: e.target.value })}
                      required />
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
                    <textarea style={{ width: '100%', height: 72, resize: 'vertical', padding: '12px 16px', fontSize: 14, fontFamily: 'inherit', border: '1px solid rgba(0,0,0,0.15)', outline: 'none' }}
                      placeholder="Ghi chú cho đơn hàng..."
                      value={form.note}
                      onChange={e => setForm({ ...form, note: e.target.value })} />
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

          {/* Summary */}
          <div style={styles.summary}>
            <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 400, marginBottom: 28 }}>Tóm Tắt Đơn Hàng</h3>
            {cart.items.map(item => (
              <div key={item.id} style={styles.summaryRow}>
                <span style={{ fontSize: 13, color: '#666', fontWeight: 300 }}>{item.product.name} × {item.quantity}</span>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{fmt(item.subtotal)}</span>
              </div>
            ))}
            <div style={styles.divider} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 500, fontSize: 17, marginBottom: 6 }}>
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20 }}>Tổng cộng</span>
              <span>{fmt(cart.total)}</span>
            </div>
            <div style={{ fontSize: 11, color: '#aaa', marginBottom: 28, letterSpacing: '0.06em' }}>✓ Miễn phí vận chuyển</div>
            {!checkoutMode && (
              <button className="btn-primary" style={{ width: '100%', padding: '16px 0', fontSize: 11 }} onClick={() => setCheckoutMode(true)}>
                Tiến hành thanh toán →
              </button>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20, fontSize: 11, color: '#bbb', letterSpacing: '0.05em' }}>
              <span>🔒 Bảo mật</span>
              <span>↺ Đổi trả 30 ngày</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  eyebrow: { fontSize: 10, fontWeight: 600, color: '#c9a96e', textTransform: 'uppercase', letterSpacing: '0.2em', display: 'block' },
  layout: { display: 'flex', gap: 60, alignItems: 'flex-start', flexWrap: 'wrap' },
  cartItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 20,
    padding: '24px 0',
    borderBottom: '1px solid rgba(0,0,0,0.08)',
  },
  itemImg: { width: 72, height: 90, objectFit: 'cover', background: '#f5f5f5', flexShrink: 0 },
  qtyRow: { display: 'flex', alignItems: 'center', gap: 12 },
  qtyBtn: {
    width: 32, height: 32,
    border: '1px solid rgba(0,0,0,0.15)',
    background: 'white',
    cursor: 'pointer',
    fontSize: 16,
    color: '#0a0a0a',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  removeBtn: { color: '#bbb', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 6 },
  summary: {
    background: '#f8f6f3',
    padding: '36px 32px',
    minWidth: 300,
    width: 340,
    flexShrink: 0,
  },
  summaryRow: { display: 'flex', justifyContent: 'space-between', marginBottom: 12 },
  divider: { borderTop: '1px solid rgba(0,0,0,0.1)', margin: '20px 0' },
  label: { display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#444', marginBottom: 8 },
  successCard: {
    background: 'white',
    padding: '64px 56px',
    textAlign: 'center',
    maxWidth: 440,
    border: '1px solid rgba(0,0,0,0.08)',
  },
};
