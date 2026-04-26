import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { cart } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };
  const isActive = (path) => location.pathname === path;

  return (
    <nav style={styles.nav}>
      <div style={styles.inner} className="page-container">
        {/* Brand */}
        <Link to="/" style={styles.logo}>
          CHOI<span style={{ color: '#9AB17A' }}>.shop</span>
        </Link>

        {/* Nav links */}
        <div style={styles.links}>
          <Link to="/" style={{ ...styles.link, ...(isActive('/') ? styles.activeLink : {}) }}>Bộ sưu tập</Link>
          {user?.role === 'admin' && (
            <Link to="/admin" style={{ ...styles.link, ...(isActive('/admin') ? styles.activeLink : {}) }}>Quản lý</Link>
          )}
          <Link to="/" style={styles.link}>Về chúng tôi</Link>
        </div>

        {/* Actions */}
        <div style={styles.actions}>
          {user ? (
            <>
              <Link to="/cart" style={styles.cartBtn}>
                <svg width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/>
                  <path d="M16 10a4 4 0 01-8 0"/>
                </svg>
                {cart.count > 0 && <span style={styles.badge}>{cart.count}</span>}
              </Link>
              <div style={styles.userMenu}>
                <button style={styles.userBtn} onClick={() => setMenuOpen(!menuOpen)}>
                  <div style={styles.avatar}>{user.name[0].toUpperCase()}</div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#2D3436' }}>{user.name.split(' ')[0]}</span>
                </button>
                {menuOpen && (
                  <div style={styles.dropdown}>
                    <div style={styles.dropdownHeader}>
                      <strong style={{ fontSize: 14 }}>{user.name}</strong>
                      <span style={{ fontSize: 12, color: '#6b7280' }}>{user.email}</span>
                    </div>
                    <Link to="/orders" style={styles.dropdownItem} onClick={() => setMenuOpen(false)}>Đơn hàng của tôi</Link>
                    <button style={{ ...styles.dropdownItem, color: '#9AB17A', width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', font: 'inherit' }} onClick={handleLogout}>Đăng xuất</button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-outline" style={{ padding: '7px 18px', fontSize: 13 }}>Đăng nhập</Link>
              <Link to="/register" className="btn-primary" style={{ padding: '7px 18px', fontSize: 13 }}>Đăng ký</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    background: 'rgba(255,255,255,0.75)',
    backdropFilter: 'blur(15px)',
    borderBottom: '1px solid rgba(154,177,122,0.15)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    boxShadow: '0 2px 12px rgba(154,177,122,0.08)',
  },
  inner: { display: 'flex', alignItems: 'center', gap: 32, height: 68 },
  logo: {
    fontSize: 22,
    fontWeight: 700,
    fontFamily: "'Outfit', sans-serif",
    letterSpacing: '-0.5px',
    color: '#2D3436',
    flexShrink: 0,
  },
  links: { display: 'flex', gap: 2, flex: 1 },
  link: {
    padding: '6px 14px',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 500,
    color: '#2D3436',
    opacity: 0.75,
    transition: 'all 0.2s',
  },
  activeLink: { background: 'rgba(154,177,122,0.15)', color: '#9AB17A', opacity: 1 },
  actions: { display: 'flex', alignItems: 'center', gap: 12 },
  cartBtn: {
    position: 'relative',
    color: '#2D3436',
    padding: 9,
    borderRadius: 12,
    background: 'rgba(154,177,122,0.1)',
    display: 'flex',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4, right: -4,
    background: '#9AB17A',
    color: 'white',
    borderRadius: '50%',
    width: 18, height: 18,
    fontSize: 11,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userMenu: { position: 'relative' },
  userBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '6px 10px',
    borderRadius: 12,
  },
  avatar: {
    width: 32, height: 32,
    borderRadius: '50%',
    background: 'var(--primary-gradient, #9AB17A)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: 14,
  },
  dropdown: {
    position: 'absolute',
    right: 0,
    top: '110%',
    background: 'white',
    border: '1px solid rgba(154,177,122,0.2)',
    borderRadius: 16,
    minWidth: 200,
    boxShadow: '0 12px 28px rgba(154,177,122,0.18)',
    overflow: 'hidden',
  },
  dropdownHeader: {
    padding: '14px 16px',
    borderBottom: '1px solid rgba(154,177,122,0.15)',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    background: 'rgba(154,177,122,0.05)',
  },
  dropdownItem: {
    display: 'block',
    padding: '10px 16px',
    fontSize: 14,
    color: '#2D3436',
    transition: 'background 0.1s',
  },
};
