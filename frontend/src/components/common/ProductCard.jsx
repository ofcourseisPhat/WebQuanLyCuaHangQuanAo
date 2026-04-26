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
      <div style={styles.imageWrap}>
        <img
          src={product.image}
          alt={product.name}
          style={{ ...styles.image, ...(hovered ? styles.imageHover : {}) }}
          onError={e => { e.target.src = `https://picsum.photos/seed/${product.id}/400/400`; }}
        />
        {product.discount > 0 && (
          <span style={styles.discountBadge}>-{product.discount}%</span>
        )}
        {product.stock < 10 && (
          <span style={styles.stockBadge}>Sắp hết</span>
        )}
      </div>

      <div style={styles.body}>
        <span style={styles.category}>{product.category}</span>
        <h3 style={styles.name}>{product.name}</h3>

        <div style={styles.priceRow}>
          <span style={styles.finalPrice}>{fmt(product.final_price)}</span>
          {product.discount > 0 && (
            <span style={styles.originalPrice}>{fmt(product.price)}</span>
          )}
        </div>

        {adminMode ? (
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn-outline" style={{ flex: 1, padding: '7px 0', fontSize: 13 }} onClick={e => { e.stopPropagation(); onEdit(product); }}>Sửa</button>
            <button style={{ flex: 1, padding: '7px 0', fontSize: 13, background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: 10, fontWeight: 600 }} onClick={e => { e.stopPropagation(); onDelete(product.id); }}>Xóa</button>
          </div>
        ) : (
          <button
            className="btn-primary"
            style={{ width: '100%', marginTop: 14, padding: '10px 0' }}
            onClick={handleAddToCart}
            disabled={product.stock === 0}
          >
            {product.stock === 0 ? 'Hết hàng' : added ? '✓ Đã thêm' : 'Thêm vào giỏ'}
          </button>
        )}
      </div>
    </div>
  );
}

const styles = {
  card: {
    background: 'white',
    borderRadius: 24,
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1)',
    boxShadow: '0 4px 12px rgba(154,177,122,0.10)',
    border: 'none',
  },
  cardHover: {
    transform: 'translateY(-10px)',
    boxShadow: '0 16px 32px rgba(154,177,122,0.2)',
  },
  imageWrap: {
    position: 'relative',
    height: 260,
    overflow: 'hidden',
    background: '#E4DFB5',
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transition: 'transform 0.8s ease',
  },
  imageHover: { transform: 'scale(1.08)' },
  discountBadge: {
    position: 'absolute',
    top: 14, right: 14,
    background: '#9AB17A',
    color: 'white',
    borderRadius: 10,
    padding: '4px 10px',
    fontSize: 12,
    fontWeight: 700,
  },
  stockBadge: {
    position: 'absolute',
    top: 14, left: 14,
    background: '#fef9c3',
    color: '#92400e',
    borderRadius: 8,
    padding: '3px 9px',
    fontSize: 11,
    fontWeight: 600,
  },
  body: { padding: '18px 20px 20px' },
  category: {
    fontSize: 11,
    fontWeight: 600,
    color: '#9AB17A',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  name: {
    fontSize: 15,
    fontWeight: 700,
    fontFamily: "'Outfit', sans-serif",
    margin: '5px 0 10px',
    lineHeight: 1.3,
    color: '#2D3436',
  },
  priceRow: { display: 'flex', alignItems: 'center', gap: 8 },
  finalPrice: { fontSize: 17, fontWeight: 700, color: '#9AB17A' },
  originalPrice: { fontSize: 13, color: '#9ca3af', textDecoration: 'line-through' },
};
