import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function LoginPage() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      let user;
      if (mode === 'login') {
        user = await login(form.email, form.password);
      } else {
        if (!form.name.trim()) { setError('Vui lòng nhập tên'); setLoading(false); return; }
        user = await register(form.name, form.email, form.password);
      }
      navigate(user.role === 'admin' ? '/admin' : '/');
    } catch (err) {
      setError(err.response?.data?.error || 'Đã có lỗi xảy ra');
    } finally { setLoading(false); }
  };

  return (
    <div style={styles.page}>
      {/* Decorative side */}
      <div style={styles.side}>
        <div style={styles.sideInner}>
          <h2 style={styles.sideTitle}>CHOI<span style={{ color: '#C3CC9B' }}>.shop</span></h2>
          <p style={styles.sideSub}>Lịch sự – Sang Trọng – Tinh tế</p>
          <div style={styles.sideQuote}>
            "Thời trang không chỉ là quần áo, đó là cách bạn thể hiện bản thân với thế giới."
          </div>
        </div>
      </div>

      {/* Form side */}
      <div style={styles.formSide}>
        <div style={styles.card}>
          <div style={styles.header}>
            <Link to="/" style={styles.logo}>CHOI<span style={{ color: '#9AB17A' }}>.shop</span></Link>
            <h1 style={styles.title}>{mode === 'login' ? 'Chào mừng trở lại' : 'Tạo tài khoản'}</h1>
            <p style={styles.sub}>{mode === 'login' ? 'Đăng nhập để tiếp tục mua sắm' : 'Tham gia cùng cộng đồng CHOI'}</p>
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <form onSubmit={handleSubmit} style={styles.form}>
            {mode === 'register' && (
              <div style={styles.field}>
                <label style={styles.label}>Họ và tên</label>
                <input style={styles.input} type="text" placeholder="Nguyễn Văn A" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
            )}
            <div style={styles.field}>
              <label style={styles.label}>Email</label>
              <input style={styles.input} type="email" placeholder="email@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Mật khẩu</label>
              <input style={styles.input} type="password" placeholder="••••••••" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required minLength={6} />
            </div>

            {mode === 'login' && (
              <div style={{ fontSize: 12, color: '#9ca3af', padding: '6px 14px', background: 'rgba(154,177,122,0.07)', borderRadius: 8 }}>
                Demo admin: <strong>admin@shop.com</strong> / <strong>admin123</strong>
              </div>
            )}

            <button className="btn-primary" type="submit" style={{ width: '100%', padding: '13px', fontSize: 15, marginTop: 4 }} disabled={loading}>
              {loading ? 'Đang xử lý...' : mode === 'login' ? 'Đăng nhập →' : 'Tạo tài khoản →'}
            </button>
          </form>

          <div style={styles.switchMode}>
            {mode === 'login' ? (
              <span>Chưa có tài khoản? <button style={styles.linkBtn} onClick={() => setMode('register')}>Đăng ký ngay</button></span>
            ) : (
              <span>Đã có tài khoản? <button style={styles.linkBtn} onClick={() => setMode('login')}>Đăng nhập</button></span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', display: 'flex' },
  side: {
    flex: '0 0 420px',
    background: 'linear-gradient(135deg, #9AB17A 0%, #7A8F5C 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
  },
  sideInner: { color: 'white' },
  sideTitle: { fontFamily: "'Outfit',sans-serif", fontSize: 36, fontWeight: 700, marginBottom: 10 },
  sideSub: { fontSize: 15, opacity: 0.8, marginBottom: 40 },
  sideQuote: {
    borderLeft: '3px solid rgba(255,255,255,0.4)',
    paddingLeft: 20,
    fontSize: 15,
    lineHeight: 1.8,
    opacity: 0.75,
    fontStyle: 'italic',
  },
  formSide: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#FBE8CE',
    padding: 24,
  },
  card: {
    background: 'white',
    borderRadius: 24,
    padding: '40px 36px',
    width: '100%',
    maxWidth: 420,
    boxShadow: '0 8px 32px rgba(154,177,122,0.15)',
  },
  header: { textAlign: 'center', marginBottom: 28 },
  logo: { fontFamily: "'Outfit',sans-serif", fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px' },
  title: { fontSize: 22, fontFamily: "'Outfit',sans-serif", fontWeight: 700, marginTop: 18, marginBottom: 6, color: '#2D3436' },
  sub: { fontSize: 14, color: '#9ca3af' },
  error: { background: '#fee2e2', color: '#991b1b', padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 16 },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: '#2D3436' },
  input: { width: '100%' },
  switchMode: { textAlign: 'center', marginTop: 22, fontSize: 14, color: '#9ca3af' },
  linkBtn: { background: 'none', border: 'none', color: '#9AB17A', fontWeight: 700, cursor: 'pointer', fontSize: 14 },
};
