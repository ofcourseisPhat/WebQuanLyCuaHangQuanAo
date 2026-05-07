import React, { useEffect, useMemo, useState } from 'react';
import api from '../../api';
import ProductCard from '../../components/common/ProductCard';

const newsArticles = [
  {
    id: 1,
    title: '5 xu huong thoi trang mua he 2026',
    excerpt: 'Gam mau trung tinh va chat lieu nhe dang tro thanh lua chon hang dau.',
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=900&q=80',
    date: '07/05/2026',
  },
  {
    id: 2,
    title: 'Mix do cong so toi gian nhung van sang trong',
    excerpt: 'Bi quyet chon form dang va phu kien de nang tam outfit cong so.',
    image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=900&q=80',
    date: '04/05/2026',
  },
  {
    id: 3,
    title: 'Huong dan bao quan vai cao cap dung cach',
    excerpt: 'Cach giat, say va bao quan vai linen, lua, wool de do ben dep.',
    image: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=900&q=80',
    date: '30/04/2026',
  },
];

const promoBanners = [
  { id: 1, title: 'Free Ship Toan Quoc', desc: 'Don tu 699.000d', color: '#111' },
  { id: 2, title: 'Doi Tra 30 Ngay', desc: 'Hoan tien neu loi nha ban', color: '#3a3a3a' },
  { id: 3, title: 'Uu Dai Thanh Vien', desc: 'Giam them 10% cho VIP', color: '#5a4a42' },
];

export default function ShopPage() {
  const [homeSections, setHomeSections] = useState({
    featured: [],
    new_arrivals: [],
    best_selling: [],
    flash_sale: [],
  });
  const [segments, setSegments] = useState([]);
  const [productTypes, setProductTypes] = useState([]);
  const [brands, setBrands] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [colors, setColors] = useState([]);
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [searchText, setSearchText] = useState('');
  const [search, setSearch] = useState('');
  const [segment, setSegment] = useState('');
  const [productType, setProductType] = useState('');
  const [brand, setBrand] = useState('');
  const [material, setMaterial] = useState('');
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [minRating, setMinRating] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [discountOnly, setDiscountOnly] = useState(false);
  const [sortBy, setSortBy] = useState('popular');

  const [viewportWidth, setViewportWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1280);
  const [activeSlide, setActiveSlide] = useState(0);
  const [countdown, setCountdown] = useState(5 * 60 * 60 + 12 * 60 + 48);

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    Promise.all([
      api.get('/products/categories'),
      api.get('/products/home-sections', { params: { limit: 8 } }),
    ]).then(([cats, home]) => {
      setSegments(cats.data.segments || cats.data.categories || []);
      setProductTypes(cats.data.product_types || []);
      setBrands(cats.data.brands || []);
      setMaterials(cats.data.materials || []);
      setSizes(cats.data.sizes || []);
      setColors(cats.data.colors || []);
      setHomeSections(home.data || {});
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setSearch(searchText.trim());
    }, 320);
    return () => clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    fetchProducts();
  }, [page, segment, productType, brand, material, size, color, minRating, search, minPrice, maxPrice, inStockOnly, discountOnly, sortBy]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => (prev <= 0 ? 8 * 60 * 60 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const featuredProducts = homeSections.featured || [];
  const slidesPerView = viewportWidth < 640 ? 1 : (viewportWidth < 1024 ? 2 : 4);
  const maxSlide = Math.max(featuredProducts.length - slidesPerView, 0);

  useEffect(() => {
    setActiveSlide(prev => Math.min(prev, maxSlide));
  }, [maxSlide]);

  useEffect(() => {
    if (maxSlide <= 0) return;
    const interval = setInterval(() => {
      setActiveSlide(prev => (prev >= maxSlide ? 0 : prev + 1));
    }, 4200);
    return () => clearInterval(interval);
  }, [maxSlide]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const r = await api.get('/products/', {
        params: {
          page,
          per_page: 12,
          segment,
          category: productType || undefined,
          brand: brand || undefined,
          material: material || undefined,
          size: size || undefined,
          color: color || undefined,
          min_rating: minRating || undefined,
          search,
          min_price: minPrice || undefined,
          max_price: maxPrice || undefined,
          in_stock: inStockOnly || undefined,
          discount_only: discountOnly || undefined,
          sort: sortBy,
        },
      });
      setProducts(r.data.products || []);
      setTotal(r.data.total || 0);
      setPages(r.data.pages || 1);
    } finally { setLoading(false); }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchText.trim());
  };

  const resetFilters = () => {
    setSearchText('');
    setSearch('');
    setSegment('');
    setProductType('');
    setBrand('');
    setMaterial('');
    setSize('');
    setColor('');
    setMinRating('');
    setMinPrice('');
    setMaxPrice('');
    setInStockOnly(false);
    setDiscountOnly(false);
    setSortBy('popular');
    setPage(1);
  };

  const groupedProducts = useMemo(() => {
    const segmentOrder = { Nam: 0, Nu: 1, 'Tre em': 2, 'Phu kien': 3 };
    const map = products.reduce((acc, product) => {
      const key = (product.segment || 'Khac').trim() || 'Khac';
      if (!acc[key]) acc[key] = [];
      acc[key].push(product);
      return acc;
    }, {});
    return Object.entries(map).sort((a, b) => {
      const oa = segmentOrder[a[0]] ?? 99;
      const ob = segmentOrder[b[0]] ?? 99;
      if (oa !== ob) return oa - ob;
      return a[0].localeCompare(b[0], 'vi');
    });
  }, [products]);

  const formatCountdown = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return [h, m, s].map(v => String(v).padStart(2, '0')).join(' : ');
  };

  const categoryHighlights = [
    { name: 'Nam', image: 'https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?w=1000&q=80' },
    { name: 'Nu', image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1000&q=80' },
    { name: 'Tre em', image: 'https://images.unsplash.com/photo-1519238359922-989348752efb?w=1000&q=80' },
    { name: 'Phu kien', image: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=1000&q=80' },
  ];

  return (
    <div className="home-root">
      <style>{`
        .home-root { min-height: 100vh; background: #fff; padding-top: 72px; }
        .home-shell { max-width: 1280px; margin: 0 auto; padding: 0 40px; }
        .home-section { margin-bottom: 84px; animation: fadeUp .6s ease both; }
        .hover-lift { transition: transform .3s ease, box-shadow .3s ease; }
        .hover-lift:hover { transform: translateY(-6px); box-shadow: 0 14px 30px rgba(0,0,0,.12); }
        .promo-card { color: #fff; padding: 20px; min-height: 104px; display: flex; flex-direction: column; justify-content: center; }
        .news-card img { transition: transform .45s ease; }
        .news-card:hover img { transform: scale(1.06); }
        .slider-track { display: flex; transition: transform .45s ease; }
        .section-title { font-family: 'Cormorant Garamond', serif; font-size: 42px; font-weight: 400; color: #0a0a0a; line-height: 1.08; }
        .section-sub { margin-top: 8px; color: #666; font-size: 14px; }
        .section-label { font-size: 10px; letter-spacing: .2em; text-transform: uppercase; color: #c9a96e; font-weight: 600; }
        .catalog-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px,1fr)); gap: 28px; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0);} }
        @media (max-width: 1024px) {
          .home-shell { padding: 0 24px; }
          .section-title { font-size: 34px; }
        }
        @media (max-width: 768px) {
          .home-shell { padding: 0 16px; }
          .home-section { margin-bottom: 62px; }
          .section-title { font-size: 30px; }
        }
      `}</style>

      <section style={styles.hero}>
        <div style={styles.heroOverlay} />
        <div className="home-shell" style={styles.heroContent}>
          <p style={styles.heroEyebrow}>Bo suu tap xuan he 2026</p>
          <h1 style={styles.heroTitle}>Tinh Hoa Sang Trong</h1>
          <p style={styles.heroSub}>Kham pha bo suu tap moi voi phong cach toi gian, hien dai va chat lieu cao cap.</p>
          <form onSubmit={handleSearch} style={styles.heroSearch}>
            <input
              type="text"
              placeholder="Tim kiem san pham..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={styles.searchInput}
            />
            <button className="btn-primary" type="submit" style={{ padding: '14px 30px', fontSize: 11 }}>Tim nhanh</button>
          </form>
        </div>
      </section>

      <div className="home-shell">
        <section className="home-section" style={{ marginTop: 34 }}>
          <div style={styles.promoGrid}>
            {promoBanners.map((banner) => (
              <div key={banner.id} className="promo-card hover-lift" style={{ background: banner.color }}>
                <strong style={{ fontSize: 18, fontWeight: 500, marginBottom: 6 }}>{banner.title}</strong>
                <span style={{ opacity: 0.78, fontSize: 13 }}>{banner.desc}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="home-section">
          <div style={styles.sectionHeadRow}>
            <div>
              <span className="section-label">Noi bat</span>
              <h2 className="section-title">Slider San Pham Noi Bat</h2>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button style={styles.navBtn} onClick={() => setActiveSlide(s => Math.max(s - 1, 0))}>←</button>
              <button style={styles.navBtn} onClick={() => setActiveSlide(s => Math.min(s + 1, maxSlide))}>→</button>
            </div>
          </div>
          <div style={styles.sliderViewport}>
            <div
              className="slider-track"
              style={{ transform: `translateX(-${(activeSlide * 100) / slidesPerView}%)` }}
            >
              {featuredProducts.map((product) => (
                <div
                  key={product.id}
                  style={{ minWidth: `${100 / slidesPerView}%`, padding: '0 10px', boxSizing: 'border-box' }}
                >
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="home-section">
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <span className="section-label">Danh muc</span>
            <h2 className="section-title">Danh Muc San Pham</h2>
            <p className="section-sub">Lua chon nhanh theo nhom san pham ban quan tam.</p>
          </div>
          <div style={styles.categoryGrid}>
            {categoryHighlights.map((item) => (
              <button
                key={item.name}
                className="hover-lift"
                style={styles.categoryCard}
                onClick={() => { setSegment(item.name); setPage(1); }}
              >
                <img src={item.image} alt={item.name} style={styles.categoryImage} />
                <div style={styles.categoryOverlay}>
                  <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 30, fontWeight: 400 }}>{item.name}</h3>
                  <span style={{ fontSize: 12, letterSpacing: '.1em', textTransform: 'uppercase' }}>Xem danh muc</span>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="home-section">
          <div style={styles.sectionHeadRow}>
            <div>
              <span className="section-label">New drop</span>
              <h2 className="section-title">San Pham Moi</h2>
            </div>
          </div>
          <div className="catalog-grid">
            {(homeSections.new_arrivals || []).slice(0, 8).map((p) => <ProductCard key={`new-${p.id}`} product={p} />)}
          </div>
        </section>

        <section className="home-section">
          <div style={styles.sectionHeadRow}>
            <div>
              <span className="section-label">Best seller</span>
              <h2 className="section-title">San Pham Ban Chay</h2>
            </div>
          </div>
          <div className="catalog-grid">
            {(homeSections.best_selling || []).slice(0, 8).map((p) => <ProductCard key={`top-${p.id}`} product={p} />)}
          </div>
        </section>

        <section className="home-section">
          <div style={styles.sectionHeadRow}>
            <div>
              <span className="section-label">Flash sale</span>
              <h2 className="section-title">Flash Sale Hom Nay</h2>
              <p className="section-sub">Ket thuc sau: <strong style={{ color: '#b42318' }}>{formatCountdown(countdown)}</strong></p>
            </div>
          </div>
          <div className="catalog-grid">
            {(homeSections.flash_sale || []).slice(0, 8).map((p) => <ProductCard key={`flash-${p.id}`} product={p} />)}
          </div>
        </section>

        <section className="home-section">
          <div style={styles.sectionHeadRow}>
            <div>
              <span className="section-label">Fashion news</span>
              <h2 className="section-title">Tin Tuc Thoi Trang</h2>
            </div>
          </div>
          <div style={styles.newsGrid}>
            {newsArticles.map((article) => (
              <article key={article.id} className="news-card hover-lift" style={styles.newsCard}>
                <div style={styles.newsImageWrap}>
                  <img src={article.image} alt={article.title} style={styles.newsImage} />
                </div>
                <div style={{ padding: 18 }}>
                  <span style={{ color: '#888', fontSize: 12 }}>{article.date}</span>
                  <h3 style={styles.newsTitle}>{article.title}</h3>
                  <p style={styles.newsExcerpt}>{article.excerpt}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="home-section">
          <div style={styles.sectionHeadRow}>
            <div>
              <span className="section-label">Kham pha</span>
              <h2 className="section-title">Tim Kiem Nhanh San Pham</h2>
              <p className="section-sub">{products.length}/{total} san pham dang hien thi</p>
            </div>
          </div>

          <div style={styles.filterRow}>
            {['', ...segments].map((cat) => (
              <button
                key={cat || 'all'}
                style={{ ...styles.catBtn, ...(segment === cat ? styles.catBtnActive : {}) }}
                onClick={() => { setSegment(cat); setPage(1); }}
              >
                {cat || 'Tat ca'}
              </button>
            ))}
          </div>

          <div style={styles.advancedFilters}>
            <div style={styles.filterControl}>
              <label style={styles.filterLabel}>Sap xep</label>
              <select value={sortBy} onChange={(e) => { setSortBy(e.target.value); setPage(1); }} style={styles.filterSelect}>
                <option value="popular">Pho bien</option>
                <option value="best_selling">Ban chay</option>
                <option value="newest">Moi nhat</option>
                <option value="price_asc">Gia thap den cao</option>
                <option value="price_desc">Gia cao den thap</option>
              </select>
            </div>

            <div style={styles.filterControl}>
              <label style={styles.filterLabel}>Loai san pham</label>
              <select value={productType} onChange={(e) => { setProductType(e.target.value); setPage(1); }} style={styles.filterSelect}>
                <option value="">Tat ca</option>
                {productTypes.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>

            <div style={styles.filterControl}>
              <label style={styles.filterLabel}>Thuong hieu</label>
              <select value={brand} onChange={(e) => { setBrand(e.target.value); setPage(1); }} style={styles.filterSelect}>
                <option value="">Tat ca</option>
                {brands.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>

            <div style={styles.filterControl}>
              <label style={styles.filterLabel}>Chat lieu</label>
              <select value={material} onChange={(e) => { setMaterial(e.target.value); setPage(1); }} style={styles.filterSelect}>
                <option value="">Tat ca</option>
                {materials.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>

            <div style={styles.filterControl}>
              <label style={styles.filterLabel}>Size</label>
              <select value={size} onChange={(e) => { setSize(e.target.value); setPage(1); }} style={styles.filterSelect}>
                <option value="">Tat ca</option>
                {sizes.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>

            <div style={styles.filterControl}>
              <label style={styles.filterLabel}>Mau sac</label>
              <select value={color} onChange={(e) => { setColor(e.target.value); setPage(1); }} style={styles.filterSelect}>
                <option value="">Tat ca</option>
                {colors.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>

            <div style={styles.filterControl}>
              <label style={styles.filterLabel}>Danh gia</label>
              <select value={minRating} onChange={(e) => { setMinRating(e.target.value); setPage(1); }} style={styles.filterSelect}>
                <option value="">Tat ca</option>
                <option value="4.5">Tu 4.5 sao</option>
                <option value="4">Tu 4 sao</option>
                <option value="3">Tu 3 sao</option>
              </select>
            </div>

            <div style={styles.filterControl}>
              <label style={styles.filterLabel}>Gia tu</label>
              <input type="number" min="0" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} style={styles.filterInput} placeholder="100000" />
            </div>

            <div style={styles.filterControl}>
              <label style={styles.filterLabel}>Den gia</label>
              <input type="number" min="0" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} style={styles.filterInput} placeholder="500000" />
            </div>

            <label style={styles.checkboxControl}>
              <input type="checkbox" checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)} />
              <span>Con hang</span>
            </label>

            <label style={styles.checkboxControl}>
              <input type="checkbox" checked={discountOnly} onChange={(e) => setDiscountOnly(e.target.checked)} />
              <span>Dang giam gia</span>
            </label>

            <button type="button" className="btn-outline" style={styles.resetBtn} onClick={resetFilters}>Dat lai</button>
          </div>

          {loading ? (
            <div className="spinner" />
          ) : products.length === 0 ? (
            <div className="empty-state">
              <h3>Khong tim thay san pham</h3>
              <p>Thu bo loc khac de mo rong ket qua</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
              {groupedProducts.map(([cat, items]) => (
                <section key={cat} style={styles.categorySection}>
                  <div style={styles.categoryHeader}>
                    <h3 style={styles.categoryName}>{cat}</h3>
                    <span style={styles.categoryCount}>{items.length} items</span>
                  </div>
                  <div className="catalog-grid">
                    {items.map((p) => <ProductCard key={p.id} product={p} />)}
                  </div>
                </section>
              ))}
            </div>
          )}

          {pages > 1 && (
            <div style={styles.pagination}>
              {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                <button key={p} style={{ ...styles.pageBtn, ...(page === p ? styles.pageBtnActive : {}) }} onClick={() => setPage(p)}>{p}</button>
              ))}
            </div>
          )}
        </section>
      </div>

      <section style={styles.newsletter}>
        <div className="home-shell" style={styles.newsletterInner}>
          <h2 style={styles.newsletterTitle}>Dang Ky Nhan Tin</h2>
          <p style={styles.newsletterText}>Nhan thong tin bo suu tap moi, uu dai dac biet va xu huong thoi trang moi nhat.</p>
          <form style={styles.newsletterForm}>
            <input type="email" placeholder="Dia chi email cua ban" style={styles.newsletterInput} />
            <button style={styles.newsletterBtn}>Dang ky</button>
          </form>
        </div>
      </section>

      <footer style={styles.footer}>
        <div className="home-shell">
          <div style={styles.footerGrid}>
            <div>
              <h3 style={styles.footerBrand}>LUXE</h3>
              <p style={styles.footerText}>Diem den cho phong cach toi gian, sang trong va de ung dung hang ngay.</p>
            </div>
            <div>
              <h6 style={styles.footerHeading}>Mua sam</h6>
              {['Bo suu tap moi', 'Thoi trang nu', 'Thoi trang nam', 'Phu kien', 'Sale off'].map((l) => <a key={l} href="#" style={styles.footerLink}>{l}</a>)}
            </div>
            <div>
              <h6 style={styles.footerHeading}>Ho tro</h6>
              {['Lien he', 'Huong dan mua hang', 'Doi tra', 'Van chuyen', 'FAQ'].map((l) => <a key={l} href="#" style={styles.footerLink}>{l}</a>)}
            </div>
            <div>
              <h6 style={styles.footerHeading}>Thong tin</h6>
              <p style={styles.footerText}>
                123 Nguyen Hue, Q1, TP.HCM<br />
                Hotline: 1900 xxxx<br />
                contact@luxe.vn
              </p>
            </div>
          </div>
          <div style={styles.footerBottom}>
            <p style={styles.footerCopy}>© 2026 LUXE. All rights reserved.</p>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              {['Chinh sach bao mat', 'Dieu khoan su dung', 'Sitemap'].map((l) => <a key={l} href="#" style={styles.footerMiniLink}>{l}</a>)}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

const styles = {
  hero: {
    position: 'relative',
    minHeight: '84vh',
    display: 'flex',
    alignItems: 'center',
    background: 'url(https://images.unsplash.com/photo-1764998112626-23f005c580d7?w=1800&q=80) center/cover no-repeat',
  },
  heroOverlay: { position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,.58), rgba(0,0,0,.2), transparent)' },
  heroContent: { position: 'relative', zIndex: 1, color: '#fff', paddingTop: 20, paddingBottom: 20 },
  heroEyebrow: { fontSize: 11, letterSpacing: '.28em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 14 },
  heroTitle: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 'clamp(48px, 9vw, 94px)',
    lineHeight: 0.95,
    fontWeight: 300,
    marginBottom: 16,
  },
  heroSub: { maxWidth: 560, fontSize: 15, lineHeight: 1.8, opacity: 0.92, marginBottom: 28 },
  heroSearch: { display: 'flex', gap: 0, maxWidth: 540, flexWrap: 'wrap' },
  searchInput: {
    flex: 1,
    minWidth: 240,
    background: 'rgba(255,255,255,.14)',
    color: 'white',
    border: '1px solid rgba(255,255,255,.35)',
    padding: '14px 16px',
    fontSize: 13,
    outline: 'none',
  },
  promoGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 },
  sectionHeadRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 14,
    marginBottom: 22,
    flexWrap: 'wrap',
  },
  navBtn: {
    width: 38,
    height: 38,
    border: '1px solid rgba(0,0,0,.2)',
    background: 'white',
    cursor: 'pointer',
    fontSize: 16,
    lineHeight: 1,
  },
  sliderViewport: {
    overflow: 'hidden',
    margin: '0 -10px',
  },
  categoryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 20 },
  categoryCard: {
    position: 'relative',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    overflow: 'hidden',
    aspectRatio: '3/4',
    textAlign: 'left',
    background: '#ddd',
  },
  categoryImage: { width: '100%', height: '100%', objectFit: 'cover' },
  categoryOverlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    background: 'linear-gradient(to top, rgba(0,0,0,.68), rgba(0,0,0,.18), transparent)',
    color: 'white',
    padding: '20px 16px',
    gap: 8,
  },
  newsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 22 },
  newsCard: { background: 'white', border: '1px solid rgba(0,0,0,.08)', overflow: 'hidden' },
  newsImageWrap: { aspectRatio: '16/10', overflow: 'hidden' },
  newsImage: { width: '100%', height: '100%', objectFit: 'cover' },
  newsTitle: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 30,
    lineHeight: 1.08,
    marginTop: 8,
    marginBottom: 8,
    fontWeight: 400,
    color: '#0f172a',
  },
  newsExcerpt: { color: '#555', fontSize: 14, lineHeight: 1.7 },
  filterRow: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 },
  advancedFilters: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: 12,
    alignItems: 'end',
    marginBottom: 26,
    padding: 16,
    border: '1px solid rgba(0,0,0,0.1)',
    background: '#fafafa',
  },
  filterControl: { display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 },
  filterLabel: { fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, color: '#666' },
  filterInput: {
    width: '100%',
    border: '1px solid rgba(0,0,0,0.15)',
    padding: '10px 12px',
    fontSize: 13,
    background: 'white',
    outline: 'none',
  },
  filterSelect: {
    width: '100%',
    border: '1px solid rgba(0,0,0,0.15)',
    padding: '10px 12px',
    fontSize: 13,
    background: 'white',
    outline: 'none',
  },
  checkboxControl: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#333', minHeight: 40 },
  resetBtn: { width: '100%', padding: '10px 12px', fontSize: 11, letterSpacing: '0.1em', minHeight: 40 },
  catBtn: {
    padding: '8px 20px',
    border: '1px solid rgba(0,0,0,0.15)',
    background: 'white',
    fontSize: 11,
    fontWeight: 500,
    cursor: 'pointer',
    color: '#666',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    transition: 'all 0.2s',
  },
  catBtnActive: { background: '#0a0a0a', borderColor: '#0a0a0a', color: 'white' },
  categorySection: { borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: 24 },
  categoryHeader: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, marginBottom: 18, flexWrap: 'wrap' },
  categoryName: { fontFamily: "'Cormorant Garamond', serif", fontSize: 34, fontWeight: 400, color: '#0a0a0a', lineHeight: 1.1 },
  categoryCount: { fontSize: 12, color: '#888', letterSpacing: '0.06em', textTransform: 'uppercase' },
  pagination: { display: 'flex', gap: 6, justifyContent: 'center', marginTop: 40 },
  pageBtn: {
    width: 40, height: 40,
    border: '1px solid rgba(0,0,0,0.15)',
    background: 'white',
    cursor: 'pointer',
    fontSize: 13,
    transition: 'all 0.2s',
  },
  pageBtnActive: { background: '#0a0a0a', borderColor: '#0a0a0a', color: 'white' },
  newsletter: { background: '#0a0a0a', padding: '84px 0' },
  newsletterInner: { textAlign: 'center', maxWidth: 700, margin: '0 auto' },
  newsletterTitle: { fontFamily: "'Cormorant Garamond', serif", fontSize: 44, fontWeight: 300, color: 'white', marginBottom: 12 },
  newsletterText: { color: 'rgba(255,255,255,0.65)', fontSize: 14, marginBottom: 30, lineHeight: 1.8 },
  newsletterForm: { display: 'flex', gap: 0, maxWidth: 520, margin: '0 auto', flexWrap: 'wrap' },
  newsletterInput: {
    flex: 1,
    minWidth: 240,
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.25)',
    color: 'white',
    padding: '14px 18px',
    fontSize: 13,
    outline: 'none',
  },
  newsletterBtn: {
    background: 'white',
    color: '#0a0a0a',
    padding: '14px 28px',
    border: 'none',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    fontFamily: 'inherit',
    whiteSpace: 'nowrap',
  },
  footer: { background: '#111', padding: '80px 0 40px' },
  footerGrid: { display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 48, marginBottom: 48 },
  footerBrand: { fontFamily: "'Cormorant Garamond', serif", color: 'white', fontSize: 32, fontWeight: 300, letterSpacing: '0.2em', marginBottom: 16 },
  footerHeading: { color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.2em', marginBottom: 20, fontWeight: 500 },
  footerText: { color: 'rgba(255,255,255,0.45)', fontSize: 13, lineHeight: 1.8, fontWeight: 300 },
  footerLink: { display: 'block', color: 'rgba(255,255,255,0.45)', fontSize: 13, marginBottom: 10, fontWeight: 300, transition: 'color 0.2s' },
  footerBottom: { borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  footerCopy: { color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: 300 },
  footerMiniLink: { color: 'rgba(255,255,255,0.35)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' },
};
