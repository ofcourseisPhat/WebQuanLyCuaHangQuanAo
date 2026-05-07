import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';

export default function ProductCard({ product, onEdit, onDelete, adminMode }) {
  const { addToCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [added, setAdded] = React.useState(false);
  const [hovered, setHovered] = React.useState(false);

  const handleAddToCart = async (e) => {
    e.stopPropagation();
    if (!user) { navigate('/login'); return; }
    await addToCart(product.id, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const fmt = (n) => new Intl.NumberFormat('vi-VN').format(n) + '₫';

  return (
    <div
      style={{ ...styles.card, ...(hovered ? styles.cardHover : {}) }}
      onClick={() => !adminMode && navigate(`/product/${product.id}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image */}
      <div style={styles.imageWrap}>
        <img
          src={product.image}
          alt={product.name}
          style={{ ...styles.image, ...(hovered ? styles.imageHover : {}) }}
          onError={e => { e.target.src = `https://picsum.photos/seed/${product.id}/400/500`; }}
        />
        {product.discount > 0 && (
          <span style={styles.discountBadge}>{product.discount}% OFF</span>
        )}
        {product.stock < 10 && product.stock > 0 && (
          <span style={styles.stockBadge}>SẮP HẾT</span>
        )}
        {/* Hover overlay */}
        <div style={{ ...styles.overlay, opacity: hovered ? 1 : 0 }}>
          {!adminMode && (
            <button
              style={styles.overlayBtn}
              onClick={handleAddToCart}
              disabled={product.stock === 0}
            >
              {product.stock === 0 ? 'HẾT HÀNG' : added ? '✓ ĐÃ THÊM' : 'THÊM VÀO GIỎ'}
            </button>
          )}
        </div>
      </div>

      {/* Info */}
      <div style={styles.body}>
        <span style={styles.category}>{product.category}</span>
        <h3 style={styles.name}>{product.name}</h3>
        <div style={styles.metaRow}>
          <span style={styles.metaText}>{product.brand || 'LUXE'}</span>
          <span style={styles.metaDot}>•</span>
          <span style={styles.metaText}>{product.material || 'Fashion'}</span>
        </div>
        <div style={styles.ratingRow}>
          <span style={styles.star}>★</span>
          <span style={styles.ratingText}>{Number(product.rating_avg || 0).toFixed(1)}</span>
          <span style={styles.ratingCount}>({product.rating_count || 0})</span>
        </div>
        <div style={styles.priceRow}>
          <span style={styles.finalPrice}>{fmt(product.final_price)}</span>
          {product.discount > 0 && (
            <span style={styles.originalPrice}>{fmt(product.price)}</span>
          )}
        </div>

        {adminMode && (
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button
              className="btn-outline"
              style={{ flex: 1, padding: '8px 0', fontSize: 11 }}
              onClick={e => { e.stopPropagation(); onEdit(product); }}
            >Sửa</button>
            <button
              style={{ flex: 1, padding: '8px 0', fontSize: 11, background: '#0a0a0a', color: 'white', border: 'none', fontFamily: 'inherit', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}
              onClick={e => { e.stopPropagation(); onDelete(product.id); }}
            >Xóa</button>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  card: {
    background: 'white',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'all 0.35s ease',
    border: '1px solid rgba(0,0,0,0.06)',
  },
  cardHover: {
    boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
    transform: 'translateY(-4px)',
  },
  imageWrap: {
    position: 'relative',
    aspectRatio: '3/4',
    overflow: 'hidden',
    background: '#f5f5f5',
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transition: 'transform 0.7s ease',
  },
  imageHover: { transform: 'scale(1.06)' },
  discountBadge: {
    position: 'absolute',
    top: 14, right: 14,
    background: '#0a0a0a',
    color: 'white',
    padding: '4px 10px',
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.12em',
  },
  stockBadge: {
    position: 'absolute',
    top: 14, left: 14,
    background: 'white',
    color: '#0a0a0a',
    padding: '4px 10px',
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.1em',
    border: '1px solid rgba(0,0,0,0.15)',
  },
  overlay: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    background: 'rgba(10,10,10,0.85)',
    padding: '16px',
    transition: 'opacity 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayBtn: {
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.7)',
    color: 'white',
    padding: '10px 24px',
    fontSize: 11,
    fontWeight: 500,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    fontFamily: "'Jost', sans-serif",
    transition: 'all 0.2s',
    width: '100%',
  },
  body: { padding: '16px 18px 20px' },
  category: {
    fontSize: 10,
    fontWeight: 500,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: '0.15em',
    display: 'block',
    marginBottom: 6,
  },
  name: {
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontSize: 17,
    fontWeight: 400,
    lineHeight: 1.3,
    color: '#0a0a0a',
    marginBottom: 10,
  },
  metaRow: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 },
  metaText: { fontSize: 11, color: '#7a7a7a', letterSpacing: '0.04em', textTransform: 'uppercase' },
  metaDot: { color: '#bdbdbd', fontSize: 11 },
  ratingRow: { display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10 },
  star: { color: '#d4a017', fontSize: 12, lineHeight: 1 },
  ratingText: { fontSize: 12, fontWeight: 600, color: '#1f2937' },
  ratingCount: { fontSize: 11, color: '#9ca3af' },
  priceRow: { display: 'flex', alignItems: 'center', gap: 10 },
  finalPrice: { fontSize: 15, fontWeight: 500, color: '#0a0a0a', letterSpacing: '0.02em' },
  originalPrice: { fontSize: 13, color: '#aaa', textDecoration: 'line-through' },
};
