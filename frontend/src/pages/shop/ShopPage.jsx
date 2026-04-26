import React, { useState, useEffect } from 'react';
import api from '../../api';
import ProductCard from '../../components/common/ProductCard';

export default function ShopPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => {
    api.get('/products/categories').then(r => setCategories(r.data.categories));
    api.get('/ml/recommend').then(r => setRecommendations(r.data.products)).catch(() => {});
  }, []);

  useEffect(() => { fetchProducts(); }, [page, category]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const r = await api.get('/products/', { params: { page, per_page: 12, category, search } });
      setProducts(r.data.products);
      setTotal(r.data.total);
      setPages(r.data.pages);
    } finally { setLoading(false); }
  };

  const handleSearch = (e) => { e.preventDefault(); setPage(1); fetchProducts(); };

  return (
    <div style={{ minHeight: '100vh', background: '#FBE8CE' }}>
      {/* Hero - styled like project 1 */}
      <section style={styles.hero}>
        <div className="page-container">
          <div style={styles.heroInner}>
            <span style={styles.heroBadge}>NEW ARRIVALS 2026</span>
            <h1 style={styles.heroTitle}>Nâng tầm phong cách của bạn</h1>
            <p style={styles.heroSub}>
              Khám phá bộ sưu tập thời trang tối giản, chất lượng cao. Hệ thống AI gợi ý sản phẩm phù hợp nhất cho bạn.
            </p>
            <form onSubmit={handleSearch} style={styles.searchForm}>
              <input style={styles.searchInput} type="text" placeholder="Tìm kiếm sản phẩm..." value={search} onChange={e => setSearch(e.target.value)} />
              <button className="btn-primary" type="submit" style={{ padding: '13px 28px', fontSize: 15 }}>Tìm kiếm</button>
            </form>
          </div>
        </div>
      </section>

      <div className="page-container" style={{ padding: '48px 24px' }}>
        {/* AI Recommendations */}
        {recommendations.length > 0 && (
          <section style={{ marginBottom: 52 }}>
            <div style={styles.sectionHeader}>
              <div>
                <p style={styles.sectionLabel}>Editor's Choice</p>
                <h2 style={styles.sectionTitle}>Gợi ý dành cho bạn</h2>
              </div>
              <span style={styles.aiTag}>✦ Powered by AI</span>
            </div>
            <div style={styles.recGrid}>
              {recommendations.slice(0, 6).map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </section>
        )}

        {/* Trust strip */}
        <section style={styles.trustStrip}>
          {[
            { icon: '🚚', title: 'Giao hàng toàn quốc', desc: 'Nhanh chóng, an toàn' },
            { icon: '🔒', title: 'Thanh toán bảo mật', desc: 'Đa dạng phương thức' },
            { icon: '↩️', title: 'Đổi trả dễ dàng', desc: '30 ngày hoàn tiền' },
          ].map(item => (
            <div key={item.title} style={styles.trustItem}>
              <span style={{ fontSize: 28 }}>{item.icon}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, fontFamily: "'Outfit',sans-serif" }}>{item.title}</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </section>

        {/* Section header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28, marginTop: 48 }}>
          <div>
            <p style={styles.sectionLabel}>Danh mục</p>
            <h2 style={styles.sectionTitle}>Tất cả sản phẩm</h2>
          </div>
          <span style={{ fontSize: 13, color: '#6b7280' }}>
            Hiển thị {products.length}/{total} sản phẩm{category && <> trong <strong style={{ color: '#9AB17A' }}>{category}</strong></>}
          </span>
        </div>

        {/* Category filter */}
        <div style={styles.filterRow}>
          <button style={{ ...styles.catBtn, ...(category === '' ? styles.catBtnActive : {}) }} onClick={() => { setCategory(''); setPage(1); }}>Tất cả</button>
          {categories.map(cat => (
            <button key={cat} style={{ ...styles.catBtn, ...(category === cat ? styles.catBtnActive : {}) }} onClick={() => { setCategory(cat); setPage(1); }}>{cat}</button>
          ))}
        </div>

        {/* Product grid */}
        {loading ? (
          <div className="spinner" />
        ) : products.length === 0 ? (
          <div className="empty-state">
            <h3>Không tìm thấy sản phẩm</h3>
            <p>Thử tìm kiếm với từ khóa khác</p>
          </div>
        ) : (
          <div style={styles.grid}>
            {products.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div style={styles.pagination}>
            {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
              <button key={p} style={{ ...styles.pageBtn, ...(page === p ? styles.pageBtnActive : {}) }} onClick={() => setPage(p)}>{p}</button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer style={styles.footer}>
        <div className="page-container">
          <div style={styles.footerGrid}>
            <div>
              <h3 style={{ fontFamily: "'Outfit',sans-serif", color: 'white', fontSize: 24, marginBottom: 12 }}>CHOI</h3>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 1.7 }}>Lịch sự – Sang Trọng – Tinh tế</p>
              <div style={{ display: 'flex', gap: 14, marginTop: 20 }}>
                {['📸', '📘', '🐦'].map((i, idx) => (
                  <a key={idx} href="#" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 20, transition: 'color 0.2s' }}>{i}</a>
                ))}
              </div>
            </div>
            <div>
              <h6 style={{ color: 'white', textTransform: 'uppercase', fontSize: 11, letterSpacing: 1.5, marginBottom: 16 }}>Điều hướng</h6>
              {['Trang chủ', 'Cửa hàng', 'Về chúng tôi'].map(l => (
                <a key={l} href="#" style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 8 }}>{l}</a>
              ))}
            </div>
            <div>
              <h6 style={{ color: 'white', textTransform: 'uppercase', fontSize: 11, letterSpacing: 1.5, marginBottom: 16 }}>Hỗ trợ</h6>
              {['Vận chuyển', 'Đổi trả', 'FAQ'].map(l => (
                <a key={l} href="#" style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 8 }}>{l}</a>
              ))}
            </div>
            <div>
              <h6 style={{ color: 'white', textTransform: 'uppercase', fontSize: 11, letterSpacing: 1.5, marginBottom: 16 }}>Nhận thông báo</h6>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 14 }}>Nhận ưu đãi độc quyền từ chúng tôi</p>
              <div style={{ display: 'flex', gap: 0 }}>
                <input type="email" placeholder="Email của bạn" style={{ borderRadius: '12px 0 0 12px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', flex: 1 }} />
                <button className="btn-primary" style={{ borderRadius: '0 12px 12px 0', padding: '11px 18px' }}>Đăng ký</button>
              </div>
            </div>
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: 40, paddingTop: 24, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
            © 2026 CHOI.shop — All rights reserved
          </div>
        </div>
      </footer>
    </div>
  );
}

const styles = {
  hero: {
    padding: '80px 0 72px',
    background: 'linear-gradient(rgba(251,232,206,0.88),rgba(251,232,206,0.88)), url(https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    borderRadius: '0 0 50px 50px',
  },
  heroInner: { maxWidth: 640 },
  heroBadge: {
    display: 'inline-block',
    background: '#9AB17A',
    color: 'white',
    borderRadius: 20,
    padding: '5px 16px',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 1,
    marginBottom: 16,
  },
  heroTitle: { fontSize: 40, fontFamily: "'Outfit',sans-serif", fontWeight: 700, color: '#2D3436', marginBottom: 14, lineHeight: 1.2 },
  heroSub: { fontSize: 16, color: '#2D3436', opacity: 0.7, marginBottom: 28, lineHeight: 1.7 },
  searchForm: { display: 'flex', gap: 10, maxWidth: 500 },
  searchInput: { flex: 1, padding: '13px 18px', borderRadius: '14px 0 0 14px', border: '1.5px solid rgba(154,177,122,0.3)', fontSize: 15, outline: 'none', borderRight: 'none' },
  sectionLabel: { fontSize: 12, fontWeight: 700, color: '#9AB17A', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 },
  sectionTitle: { fontSize: 26, fontFamily: "'Outfit',sans-serif", color: '#2D3436' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 },
  aiTag: { background: 'rgba(154,177,122,0.15)', color: '#9AB17A', padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  recGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 20 },
  trustStrip: {
    background: 'white',
    borderRadius: 20,
    padding: '24px 32px',
    display: 'flex',
    gap: 32,
    flexWrap: 'wrap',
    boxShadow: '0 4px 12px rgba(154,177,122,0.1)',
    marginTop: 0,
  },
  trustItem: { display: 'flex', alignItems: 'center', gap: 14, flex: '1 1 180px' },
  filterRow: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28 },
  catBtn: {
    padding: '8px 18px',
    borderRadius: 20,
    border: '1.5px solid rgba(154,177,122,0.3)',
    background: 'white',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    color: '#6b7280',
    transition: 'all 0.2s',
  },
  catBtnActive: { background: '#9AB17A', borderColor: '#9AB17A', color: 'white' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))', gap: 24 },
  pagination: { display: 'flex', gap: 8, justifyContent: 'center', marginTop: 48 },
  pageBtn: {
    width: 40, height: 40,
    borderRadius: 10,
    border: '1.5px solid rgba(154,177,122,0.3)',
    background: 'white',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
  },
  pageBtnActive: { background: '#9AB17A', borderColor: '#9AB17A', color: 'white' },
  footer: {
    background: '#2D3436',
    padding: '72px 0 40px',
    marginTop: 80,
  },
  footerGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))',
    gap: 40,
    paddingBottom: 40,
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  },
};
