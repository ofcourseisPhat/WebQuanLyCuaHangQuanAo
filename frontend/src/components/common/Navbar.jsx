import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { cart } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); setMenuOpen(false); };
  const isActive = (path) => location.pathname === path;

  return (
    <header style={{ ...styles.header, ...(scrolled ? styles.headerScrolled : {}) }}>
      <div className="page-container" style={styles.inner}>
        <Link to="/" style={styles.logo}>LUXE</Link>

        <nav style={styles.nav}>
          {['BỘ SƯU TẬP MỚI', 'NỮ', 'NAM', 'PHỤ KIỆN', 'SALE'].map((label) => (
            <a key={label} href="#" style={styles.link}>{label}</a>
          ))}
          {user?.role === 'admin' && (
            <Link to="/admin" style={{ ...styles.link, ...(isActive('/admin') ? styles.activeLink : {}) }}>QUẢN LÝ</Link>
          )}
        </nav>

        <div style={styles.actions}>
          {user ? (
            <>
              <Link to="/cart" style={styles.iconBtn} title="Giỏ hàng">
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
                  <line x1="3" y1="6" x2="21" y2="6"/>
                  <path d="M16 10a4 4 0 01-8 0"/>
                </svg>
                {cart.count > 0 && <span style={styles.badge}>{cart.count}</span>}
              </Link>

              <div style={{ position: 'relative' }}>
                <button style={styles.userBtn} onClick={() => setMenuOpen(!menuOpen)}>
                  <span style={styles.avatar}>{user.name[0].toUpperCase()}</span>
                  <span style={{ fontSize: 12, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    {user.name.split(' ').pop()}
                  </span>
                </button>
                {menuOpen && (
                  <div style={styles.dropdown}>
                    <div style={styles.dropdownHeader}>
                      <strong style={{ fontSize: 14, fontFamily: "'Cormorant Garamond', serif" }}>{user.name}</strong>
                      <span style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{user.email}</span>
                    </div>
                    <Link to="/orders" style={styles.dropdownItem} onClick={() => setMenuOpen(false)}>Đơn hàng của tôi</Link>
                    <button style={{ ...styles.dropdownItem, width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', font: 'inherit', color: '#c9a96e' }} onClick={handleLogout}>
                      Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/login" style={styles.link}>ĐĂNG NHẬP</Link>
              <Link to="/register" className="btn-primary" style={{ padding: '10px 22px', fontSize: 11 }}>ĐĂNG KÝ</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

const styles = {
  header: {
    position: 'fixed',
    top: 0, left: 0, right: 0,
    background: 'rgba(255,255,255,0.97)',
    borderBottom: '1px solid rgba(0,0,0,0.08)',
    zIndex: 100,
    transition: 'all 0.3s ease',
  },
  headerScrolled: {
    boxShadow: '0 4px 20px rgba(0,0,0,0.07)',
  },
  inner: {
    display: 'flex',
    alignItems: 'center',
    height: 72,
    justifyContent: 'space-between',
  },
  logo: {
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontSize: 28,
    fontWeight: 300,
    letterSpacing: '0.25em',
    color: '#0a0a0a',
    flexShrink: 0,
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
  },
  link: {
    padding: '8px 12px',
    fontSize: 11,
    fontWeight: 500,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: '#444',
    transition: 'color 0.2s',
    whiteSpace: 'nowrap',
  },
  activeLink: { color: '#0a0a0a' },
  actions: { display: 'flex', alignItems: 'center', gap: 12 },
  iconBtn: {
    position: 'relative',
    color: '#0a0a0a',
    padding: 8,
    display: 'flex',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: 0, right: 0,
    background: '#0a0a0a',
    color: 'white',
    borderRadius: '50%',
    width: 16, height: 16,
    fontSize: 10,
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '6px 10px',
  },
  avatar: {
    width: 30, height: 30,
    borderRadius: '50%',
    background: '#0a0a0a',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 500,
    fontSize: 13,
    letterSpacing: 0,
  },
  dropdown: {
    position: 'absolute',
    right: 0,
    top: '110%',
    background: 'white',
    border: '1px solid rgba(0,0,0,0.1)',
    minWidth: 210,
    boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
    overflow: 'hidden',
  },
  dropdownHeader: {
    padding: '16px 18px',
    borderBottom: '1px solid rgba(0,0,0,0.06)',
    display: 'flex',
    flexDirection: 'column',
    background: '#fafafa',
  },
  dropdownItem: {
    display: 'block',
    padding: '12px 18px',
    fontSize: 12,
    letterSpacing: '0.06em',
    color: '#444',
    transition: 'background 0.15s',
    textTransform: 'uppercase',
    fontWeight: 500,
  },
};
