import React, { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import api from '../../api';
import ProductCard from '../../components/common/ProductCard';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(n || 0);
const NAVBAR_HEIGHT = 72;
const COLORS = ['#9AB17A', '#7A8F5C', '#C3CC9B', '#E4DFB5', '#2D3436', '#6b7280'];
const SEGMENT_OPTIONS = ['Nam', 'Nu', 'Tre em', 'Phu kien'];
const ORDER_STATUSES = ['pending', 'paid', 'shipped', 'delivered', 'cancelled'];
const CUSTOMER_TIERS = ['regular', 'silver', 'gold', 'vip'];
const RETURN_STATUSES = ['requested', 'approved', 'rejected', 'completed'];

const createEmptyProductForm = () => ({
  name: '',
  sku: '',
  category: '',
  category_id: '',
  segment: 'Nam',
  brand: '',
  material: '',
  seo_tags: '',
  rating_avg: '',
  rating_count: '',
  price: '',
  stock: '',
  discount: '',
  description: '',
  imageUrls: [''],
  variants: [{ sku: '', size: '', color: '', stock: 0, price_override: '' }],
});

const createEmptyCategoryForm = () => ({
  name: '',
  slug: '',
  parent_id: '',
  icon: '',
  banner: '',
  is_active: true,
});

const createEmptyPromotionForm = () => ({
  name: '',
  code: '',
  promo_type: 'percent',
  amount: '',
  min_order_value: '',
  max_discount_value: '',
  usage_limit: '',
  target_type: 'order',
  target_ids: '',
  starts_at: '',
  ends_at: '',
  is_active: true,
});

export default function AdminDashboard() {
  const [tab, setTab] = useState('dashboard');

  const [summary, setSummary] = useState(null);
  const [revenue, setRevenue] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [statusData, setStatusData] = useState([]);

  const [products, setProducts] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [productForm, setProductForm] = useState(createEmptyProductForm());
  const [editingProduct, setEditingProduct] = useState(null);
  const [showProductForm, setShowProductForm] = useState(false);

  const [categories, setCategories] = useState([]);
  const [categoryForm, setCategoryForm] = useState(createEmptyCategoryForm());
  const [editingCategory, setEditingCategory] = useState(null);

  const [orders, setOrders] = useState([]);
  const [returns, setReturns] = useState([]);
  const [orderStatusFilter, setOrderStatusFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);

  const [customers, setCustomers] = useState([]);
  const [selectedCustomerOrders, setSelectedCustomerOrders] = useState([]);

  const [promotions, setPromotions] = useState([]);
  const [promotionForm, setPromotionForm] = useState(createEmptyPromotionForm());
  const [editingPromotion, setEditingPromotion] = useState(null);

  useEffect(() => {
    loadDashboard();
    loadProducts();
    loadCategories();
    loadOrders();
    loadReturns();
    loadCustomers();
    loadPromotions();
  }, []);

  const loadDashboard = () => {
    api.get('/dashboard/summary').then((r) => setSummary(r.data)).catch(() => {});
    api.get('/dashboard/revenue-by-month').then((r) => setRevenue(r.data.data || [])).catch(() => {});
    api.get('/dashboard/top-products').then((r) => setTopProducts(r.data.data || [])).catch(() => {});
    api.get('/dashboard/sales-by-category').then((r) => setCategoryData(r.data.data || [])).catch(() => {});
    api.get('/dashboard/order-status-breakdown').then((r) => setStatusData(r.data.data || [])).catch(() => {});
  };

  const loadProducts = () => {
    api.get('/products/', { params: { per_page: 300 } }).then((r) => setProducts(r.data.products || [])).catch(() => {});
    api.get('/products/categories').then((r) => {
      setCategoryOptions(r.data.category_records || []);
    }).catch(() => {});
  };

  const loadCategories = () => {
    api.get('/categories/admin').then((r) => setCategories(r.data.categories || [])).catch(() => {});
  };

  const loadOrders = () => {
    api.get('/orders/all', { params: { per_page: 200, status: orderStatusFilter || undefined } })
      .then((r) => setOrders(r.data.orders || []))
      .catch(() => {});
  };

  const loadReturns = () => {
    api.get('/orders/returns').then((r) => setReturns(r.data.returns || [])).catch(() => {});
  };

  const loadCustomers = () => {
    api.get('/customers/').then((r) => setCustomers(r.data.customers || [])).catch(() => {});
  };

  const loadPromotions = () => {
    api.get('/promotions/').then((r) => setPromotions(r.data.promotions || [])).catch(() => {});
  };

  useEffect(() => {
    loadOrders();
  }, [orderStatusFilter]);

  const categorizedProducts = useMemo(() => {
    const map = products.reduce((acc, product) => {
      const key = (product.category || 'Uncategorized').trim() || 'Uncategorized';
      if (!acc[key]) acc[key] = [];
      acc[key].push(product);
      return acc;
    }, {});
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0], 'vi'));
  }, [products]);

  const productVariantStockTotal = (productForm.variants || []).reduce((sum, variant) => sum + Number(variant.stock || 0), 0);

  const resetProductForm = () => {
    setProductForm(createEmptyProductForm());
    setEditingProduct(null);
  };

  const openEditProduct = (product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name || '',
      sku: product.sku || '',
      category: product.category || '',
      category_id: product.category_id || '',
      segment: product.segment || 'Nam',
      brand: product.brand || '',
      material: product.material || '',
      seo_tags: Array.isArray(product.seo_tags) ? product.seo_tags.join(',') : (product.seo_tags || ''),
      rating_avg: product.rating_avg ?? '',
      rating_count: product.rating_count ?? '',
      price: product.price ?? '',
      stock: product.stock ?? '',
      discount: product.discount ?? '',
      description: product.description || '',
      imageUrls: (product.images?.length ? product.images.map((img) => img.url) : [product.image || '']).filter(Boolean),
      variants: product.variants?.length
        ? product.variants.map((variant) => ({
            sku: variant.sku || '',
            size: variant.size || '',
            color: variant.color || '',
            stock: variant.stock ?? 0,
            price_override: variant.price_override ?? '',
          }))
        : [{ sku: '', size: '', color: '', stock: product.stock || 0, price_override: '' }],
    });
    setShowProductForm(true);
    setTab('products');
  };

  const buildProductPayload = () => {
    const images = (productForm.imageUrls || []).map((item) => String(item || '').trim()).filter(Boolean);
    const variants = (productForm.variants || [])
      .map((variant) => ({
        sku: String(variant.sku || '').trim(),
        size: String(variant.size || '').trim(),
        color: String(variant.color || '').trim(),
        stock: Number(variant.stock || 0),
        price_override: variant.price_override === '' ? null : Number(variant.price_override),
      }))
      .filter((variant) => variant.size && variant.color);

    return {
      name: productForm.name,
      sku: productForm.sku || undefined,
      category: productForm.category,
      category_id: productForm.category_id || undefined,
      segment: productForm.segment,
      brand: productForm.brand,
      material: productForm.material,
      seo_tags: productForm.seo_tags,
      rating_avg: productForm.rating_avg === '' ? 0 : Number(productForm.rating_avg),
      rating_count: productForm.rating_count === '' ? 0 : Number(productForm.rating_count),
      price: Number(productForm.price || 0),
      stock: Number(productForm.stock || 0),
      discount: Number(productForm.discount || 0),
      description: productForm.description || '',
      image: images[0] || '',
      images,
      variants,
    };
  };

  const saveProduct = async (e) => {
    e.preventDefault();
    try {
      const payload = buildProductPayload();
      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, payload);
      } else {
        await api.post('/products/', payload);
      }
      resetProductForm();
      setShowProductForm(false);
      loadProducts();
    } catch (err) {
      alert(err.response?.data?.error || 'Khong the luu san pham');
    }
  };

  const removeProduct = async (id) => {
    if (!window.confirm('Xac nhan xoa san pham nay?')) return;
    await api.delete(`/products/${id}`);
    loadProducts();
  };

  const setProductImage = (index, value) => {
    const next = [...productForm.imageUrls];
    next[index] = value;
    setProductForm({ ...productForm, imageUrls: next });
  };
  const addProductImage = () => setProductForm({ ...productForm, imageUrls: [...productForm.imageUrls, ''] });
  const removeProductImage = (index) => {
    const next = productForm.imageUrls.filter((_, i) => i !== index);
    setProductForm({ ...productForm, imageUrls: next.length ? next : [''] });
  };

  const updateVariant = (index, key, value) => {
    const next = [...productForm.variants];
    next[index] = { ...next[index], [key]: value };
    setProductForm({ ...productForm, variants: next });
  };
  const addVariant = () =>
    setProductForm({
      ...productForm,
      variants: [...productForm.variants, { sku: '', size: '', color: '', stock: 0, price_override: '' }],
    });
  const removeVariant = (index) => {
    const next = productForm.variants.filter((_, i) => i !== index);
    setProductForm({
      ...productForm,
      variants: next.length ? next : [{ sku: '', size: '', color: '', stock: 0, price_override: '' }],
    });
  };

  const saveCategory = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...categoryForm,
        parent_id: categoryForm.parent_id || null,
      };
      if (editingCategory) {
        await api.put(`/categories/${editingCategory.id}`, payload);
      } else {
        await api.post('/categories/', payload);
      }
      setCategoryForm(createEmptyCategoryForm());
      setEditingCategory(null);
      loadCategories();
      loadProducts();
    } catch (err) {
      alert(err.response?.data?.error || 'Khong the luu danh muc');
    }
  };

  const editCategory = (category) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name || '',
      slug: category.slug || '',
      parent_id: category.parent_id || '',
      icon: category.icon || '',
      banner: category.banner || '',
      is_active: category.is_active ?? true,
    });
    setTab('categories');
  };

  const removeCategory = async (id) => {
    if (!window.confirm('Xac nhan xoa danh muc?')) return;
    await api.delete(`/categories/${id}`);
    loadCategories();
  };

  const updateOrderStatus = async (orderId, status) => {
    await api.put(`/orders/${orderId}/status`, { status });
    loadOrders();
    loadDashboard();
  };

  const openInvoicePrint = (orderId) => {
    const url = `${api.defaults.baseURL}/orders/${orderId}/invoice/print`;
    window.open(url, '_blank');
  };

  const exportOrdersExcel = () => {
    window.open(`${api.defaults.baseURL}/orders/export/excel`, '_blank');
  };

  const exportOrdersPdf = () => {
    window.open(`${api.defaults.baseURL}/orders/export/pdf`, '_blank');
  };

  const viewOrder = async (orderId) => {
    const result = await api.get(`/orders/${orderId}`);
    setSelectedOrder(result.data.order);
  };

  const updateReturnStatus = async (returnId, status) => {
    await api.put(`/orders/returns/${returnId}`, { status });
    loadReturns();
  };

  const setCustomerActive = async (customer, isActive) => {
    await api.put(`/customers/${customer.id}/status`, { is_active: isActive });
    loadCustomers();
  };

  const setCustomerTier = async (customer, tier) => {
    await api.put(`/customers/${customer.id}/tier`, { customer_tier: tier });
    loadCustomers();
  };

  const viewCustomerOrders = async (customerId) => {
    const result = await api.get(`/customers/${customerId}/orders`);
    setSelectedCustomerOrders(result.data.orders || []);
  };

  const savePromotion = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...promotionForm,
        amount: Number(promotionForm.amount || 0),
        min_order_value: Number(promotionForm.min_order_value || 0),
        max_discount_value: promotionForm.max_discount_value === '' ? null : Number(promotionForm.max_discount_value),
        usage_limit: promotionForm.usage_limit === '' ? null : Number(promotionForm.usage_limit),
        starts_at: promotionForm.starts_at || null,
        ends_at: promotionForm.ends_at || null,
      };
      if (editingPromotion) {
        await api.put(`/promotions/${editingPromotion.id}`, payload);
      } else {
        await api.post('/promotions/', payload);
      }
      setPromotionForm(createEmptyPromotionForm());
      setEditingPromotion(null);
      loadPromotions();
    } catch (err) {
      alert(err.response?.data?.error || 'Khong the luu khuyen mai');
    }
  };

  const editPromotion = (promotion) => {
    setEditingPromotion(promotion);
    setPromotionForm({
      name: promotion.name || '',
      code: promotion.code || '',
      promo_type: promotion.promo_type || 'percent',
      amount: promotion.amount ?? '',
      min_order_value: promotion.min_order_value ?? '',
      max_discount_value: promotion.max_discount_value ?? '',
      usage_limit: promotion.usage_limit ?? '',
      target_type: promotion.target_type || 'order',
      target_ids: Array.isArray(promotion.target_ids) ? promotion.target_ids.join(',') : '',
      starts_at: promotion.starts_at ? String(promotion.starts_at).slice(0, 16) : '',
      ends_at: promotion.ends_at ? String(promotion.ends_at).slice(0, 16) : '',
      is_active: promotion.is_active ?? true,
    });
    setTab('promotions');
  };

  const removePromotion = async (id) => {
    if (!window.confirm('Xac nhan xoa khuyen mai?')) return;
    await api.delete(`/promotions/${id}`);
    loadPromotions();
  };

  const StatCard = ({ label, value, color }) => (
    <div style={styles.statCard}>
      <div style={styles.statLabel}>{label}</div>
      <div style={{ ...styles.statValue, color: color || '#2D3436' }}>{value}</div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#FBE8CE', paddingTop: NAVBAR_HEIGHT }}>
      <div style={styles.tabBar}>
        <div className="page-container" style={styles.tabBarInner}>
          {[
            ['dashboard', 'Dashboard'],
            ['products', 'San pham'],
            ['categories', 'Danh muc'],
            ['orders', 'Don hang'],
            ['customers', 'Khach hang'],
            ['promotions', 'Khuyen mai'],
          ].map(([id, label]) => (
            <button key={id} style={{ ...styles.tabBtn, ...(tab === id ? styles.tabBtnActive : {}) }} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="page-container" style={{ padding: '30px 24px' }}>
        {tab === 'dashboard' && summary && (
          <>
            <div style={{ marginBottom: 24 }}>
              <p style={styles.sectionLabel}>Tong quan</p>
              <h1 style={styles.pageTitle}>Dashboard</h1>
            </div>
            <div style={styles.gridStats}>
              <StatCard label="Doanh thu" value={`${fmt(summary.total_revenue)}đ`} color="#9AB17A" />
              <StatCard label="Tong don" value={summary.total_orders} />
              <StatCard label="San pham" value={summary.total_products} />
              <StatCard label="Khach hang" value={summary.total_customers} />
              <StatCard label="Cho xu ly" value={summary.pending_orders} color="#f59e0b" />
              <StatCard label="Sap het hang" value={summary.low_stock_products} color="#ef4444" />
            </div>

            <div style={styles.gridCharts}>
              <div style={styles.card}>
                <h3 style={styles.cardTitle}>Doanh thu theo thang</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={revenue}>
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v) => `${fmt(v)}đ`} />
                    <Line type="monotone" dataKey="revenue" stroke="#9AB17A" strokeWidth={2.5} dot={{ fill: '#9AB17A', r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div style={styles.card}>
                <h3 style={styles.cardTitle}>Doanh so theo danh muc</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={categoryData} dataKey="total_sold" nameKey="category" cx="50%" cy="50%" outerRadius={80}>
                      {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Top san pham ban chay</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={topProducts} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v) => `${v} sp`} />
                  <Bar dataKey="total_sold" fill="#9AB17A" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Trang thai don hang</h3>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {statusData.map((item, index) => (
                  <div key={index} style={styles.pill}>
                    <strong style={{ color: COLORS[index % COLORS.length] }}>{item.count}</strong> {item.status}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {tab === 'products' && (
          <>
            <div style={styles.sectionHead}>
              <div>
                <p style={styles.sectionLabel}>Quan ly san pham</p>
                <h1 style={styles.pageTitle}>San pham</h1>
              </div>
              <button
                className="btn-primary"
                onClick={() => {
                  setShowProductForm(!showProductForm);
                  resetProductForm();
                }}
              >
                {showProductForm ? 'Dong form' : '+ Them san pham'}
              </button>
            </div>

            {showProductForm && (
              <form onSubmit={saveProduct} style={{ ...styles.card, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
                <h3 style={{ ...styles.cardTitle, gridColumn: '1 / -1' }}>{editingProduct ? 'Sua san pham' : 'Them san pham moi'}</h3>
                <input placeholder="Ten san pham" value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} required />
                <input placeholder="Ma san pham (SKU)" value={productForm.sku} onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })} />
                <input placeholder="Gia" type="number" min="0" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} required />
                <input placeholder="Gia giam (%)" type="number" min="0" max="100" value={productForm.discount} onChange={(e) => setProductForm({ ...productForm, discount: e.target.value })} />
                <input placeholder="Ten danh muc" value={productForm.category} onChange={(e) => setProductForm({ ...productForm, category: e.target.value })} required />
                <select value={productForm.category_id} onChange={(e) => setProductForm({ ...productForm, category_id: e.target.value })}>
                  <option value="">Lien ket danh muc cha/con (optional)</option>
                  {categoryOptions.map((category) => (
                    <option key={category.id} value={category.id}>
                      #{category.id} - {category.name}
                    </option>
                  ))}
                </select>
                <select value={productForm.segment} onChange={(e) => setProductForm({ ...productForm, segment: e.target.value })}>
                  {SEGMENT_OPTIONS.map((segment) => <option key={segment} value={segment}>{segment}</option>)}
                </select>
                <input placeholder="Thuong hieu" value={productForm.brand} onChange={(e) => setProductForm({ ...productForm, brand: e.target.value })} />
                <input placeholder="Chat lieu" value={productForm.material} onChange={(e) => setProductForm({ ...productForm, material: e.target.value })} />
                <input placeholder="SEO tags (a,b,c)" value={productForm.seo_tags} onChange={(e) => setProductForm({ ...productForm, seo_tags: e.target.value })} />
                <input placeholder="Ton kho tong" type="number" min="0" value={productForm.stock} onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <input placeholder="Rating TB" type="number" min="0" max="5" step="0.1" value={productForm.rating_avg} onChange={(e) => setProductForm({ ...productForm, rating_avg: e.target.value })} />
                  <input placeholder="So review" type="number" min="0" value={productForm.rating_count} onChange={(e) => setProductForm({ ...productForm, rating_count: e.target.value })} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={styles.fieldLabel}>Nhieu anh</label>
                  {productForm.imageUrls.map((url, index) => (
                    <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, marginBottom: 8 }}>
                      <input placeholder="https://..." value={url} onChange={(e) => setProductImage(index, e.target.value)} />
                      <button type="button" className="btn-outline" onClick={() => removeProductImage(index)}>Xoa</button>
                    </div>
                  ))}
                  <button type="button" className="btn-outline" onClick={addProductImage}>+ Them anh</button>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={styles.fieldLabel}>Bien the size/mau/ton kho (Tong: {productVariantStockTotal})</label>
                  {productForm.variants.map((variant, index) => (
                    <div key={index} style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr 0.8fr 0.8fr auto', gap: 8, marginBottom: 8 }}>
                      <input placeholder="SKU bien the" value={variant.sku} onChange={(e) => updateVariant(index, 'sku', e.target.value)} />
                      <input placeholder="Size" value={variant.size} onChange={(e) => updateVariant(index, 'size', e.target.value)} />
                      <input placeholder="Mau" value={variant.color} onChange={(e) => updateVariant(index, 'color', e.target.value)} />
                      <input type="number" min="0" placeholder="Ton" value={variant.stock} onChange={(e) => updateVariant(index, 'stock', e.target.value)} />
                      <input type="number" min="0" placeholder="Gia rieng" value={variant.price_override} onChange={(e) => updateVariant(index, 'price_override', e.target.value)} />
                      <button type="button" className="btn-outline" onClick={() => removeVariant(index)}>Xoa</button>
                    </div>
                  ))}
                  <button type="button" className="btn-outline" onClick={addVariant}>+ Them bien the</button>
                </div>
                <textarea
                  style={{ gridColumn: '1 / -1', minHeight: 80 }}
                  placeholder="Mo ta san pham"
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                />
                <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10 }}>
                  <button type="button" className="btn-outline" onClick={() => { resetProductForm(); setShowProductForm(false); }}>Huy</button>
                  <button type="submit" className="btn-primary">{editingProduct ? 'Luu thay doi' : 'Them san pham'}</button>
                </div>
              </form>
            )}

            {categorizedProducts.map(([categoryName, items]) => (
              <section key={categoryName} style={styles.card}>
                <h3 style={styles.cardTitle}>{categoryName} ({items.length})</h3>
                <div style={styles.productGrid}>
                  {items.map((product) => (
                    <ProductCard key={product.id} product={product} adminMode onEdit={openEditProduct} onDelete={removeProduct} />
                  ))}
                </div>
              </section>
            ))}
          </>
        )}

        {tab === 'categories' && (
          <>
            <div style={styles.sectionHead}>
              <div>
                <p style={styles.sectionLabel}>3.3 Quan ly danh muc</p>
                <h1 style={styles.pageTitle}>Danh muc cha/con</h1>
              </div>
            </div>
            <form onSubmit={saveCategory} style={{ ...styles.card, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              <h3 style={{ ...styles.cardTitle, gridColumn: '1 / -1' }}>{editingCategory ? 'Sua danh muc' : 'Them danh muc'}</h3>
              <input placeholder="Ten danh muc" value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} required />
              <input placeholder="Slug" value={categoryForm.slug} onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })} />
              <select value={categoryForm.parent_id} onChange={(e) => setCategoryForm({ ...categoryForm, parent_id: e.target.value })}>
                <option value="">Khong co cha</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>#{category.id} - {category.name}</option>
                ))}
              </select>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={categoryForm.is_active} onChange={(e) => setCategoryForm({ ...categoryForm, is_active: e.target.checked })} />
                Dang hoat dong
              </label>
              <input placeholder="Icon URL" value={categoryForm.icon} onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })} />
              <input placeholder="Banner URL" value={categoryForm.banner} onChange={(e) => setCategoryForm({ ...categoryForm, banner: e.target.value })} />
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10 }}>
                <button type="button" className="btn-outline" onClick={() => { setCategoryForm(createEmptyCategoryForm()); setEditingCategory(null); }}>Reset</button>
                <button type="submit" className="btn-primary">{editingCategory ? 'Cap nhat' : 'Tao moi'}</button>
              </div>
            </form>

            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Danh sach danh muc</h3>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Ten</th>
                    <th>Slug</th>
                    <th>Parent</th>
                    <th>Icon</th>
                    <th>Banner</th>
                    <th>Trang thai</th>
                    <th>Hanh dong</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category) => (
                    <tr key={category.id}>
                      <td>{category.id}</td>
                      <td>{category.name}</td>
                      <td>{category.slug}</td>
                      <td>{category.parent_id || '-'}</td>
                      <td>{category.icon ? 'Co' : '-'}</td>
                      <td>{category.banner ? 'Co' : '-'}</td>
                      <td>{category.is_active ? 'Active' : 'Hidden'}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button className="btn-outline" onClick={() => editCategory(category)}>Sua</button>{' '}
                        <button className="btn-outline" onClick={() => removeCategory(category.id)}>Xoa</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === 'orders' && (
          <>
            <div style={styles.sectionHead}>
              <div>
                <p style={styles.sectionLabel}>3.4 Quan ly don hang</p>
                <h1 style={styles.pageTitle}>Don hang</h1>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-outline" onClick={exportOrdersExcel}>Xuat Excel</button>
                <button className="btn-outline" onClick={exportOrdersPdf}>Xuat PDF</button>
              </div>
            </div>

            <div style={{ ...styles.card, marginBottom: 12 }}>
              <label style={styles.fieldLabel}>Loc trang thai</label>
              <select value={orderStatusFilter} onChange={(e) => setOrderStatusFilter(e.target.value)} style={{ maxWidth: 240 }}>
                <option value="">Tat ca</option>
                {ORDER_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </div>

            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Danh sach don hang ({orders.length})</h3>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Khach hang</th>
                    <th>Tong tien</th>
                    <th>Trang thai</th>
                    <th>Ngay tao</th>
                    <th>Hanh dong</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td>#{order.id}</td>
                      <td>
                        <div>{order.customer?.name || '-'}</div>
                        <small>{order.customer?.email || ''}</small>
                      </td>
                      <td>{fmt(order.total)}đ</td>
                      <td>
                        <select value={order.status} onChange={(e) => updateOrderStatus(order.id, e.target.value)}>
                          {ORDER_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                        </select>
                      </td>
                      <td>{new Date(order.created_at).toLocaleString()}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button className="btn-outline" onClick={() => viewOrder(order.id)}>Xem</button>{' '}
                        <button className="btn-outline" onClick={() => openInvoicePrint(order.id)}>In hoa don</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedOrder && (
              <div style={styles.card}>
                <h3 style={styles.cardTitle}>Chi tiet don #{selectedOrder.id}</h3>
                <p>Khach: {selectedOrder.customer?.name} - {selectedOrder.customer?.email}</p>
                <p>Dia chi: {selectedOrder.address || '-'}</p>
                <p>Thanh toan: {selectedOrder.payment_method}</p>
                <p>Ghi chu: {selectedOrder.note || '-'}</p>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th>San pham</th>
                      <th>So luong</th>
                      <th>Gia</th>
                      <th>Tam tinh</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedOrder.items || []).map((item) => (
                      <tr key={item.id}>
                        <td>{item.product_name}</td>
                        <td>{item.quantity}</td>
                        <td>{fmt(item.price)}đ</td>
                        <td>{fmt(item.subtotal)}đ</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Quan ly hoan tra ({returns.length})</h3>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Don hang</th>
                    <th>Khach</th>
                    <th>Ly do</th>
                    <th>Trang thai</th>
                    <th>Ngay tao</th>
                  </tr>
                </thead>
                <tbody>
                  {returns.map((item) => (
                    <tr key={item.id}>
                      <td>#{item.id}</td>
                      <td>#{item.order_id}</td>
                      <td>{item.customer_name || '-'}</td>
                      <td>{item.reason}</td>
                      <td>
                        <select value={item.status} onChange={(e) => updateReturnStatus(item.id, e.target.value)}>
                          {RETURN_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                        </select>
                      </td>
                      <td>{new Date(item.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === 'customers' && (
          <>
            <div style={styles.sectionHead}>
              <div>
                <p style={styles.sectionLabel}>3.5 Quan ly khach hang</p>
                <h1 style={styles.pageTitle}>Khach hang</h1>
              </div>
            </div>
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Danh sach khach hang ({customers.length})</h3>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Ho ten</th>
                    <th>Email / SDT</th>
                    <th>Tier</th>
                    <th>Tong don</th>
                    <th>Tong chi</th>
                    <th>Trang thai</th>
                    <th>Hanh dong</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr key={customer.id}>
                      <td>#{customer.id}</td>
                      <td>{customer.name}</td>
                      <td>
                        <div>{customer.email}</div>
                        <small>{customer.phone || '-'}</small>
                      </td>
                      <td>
                        <select value={customer.customer_tier || 'regular'} onChange={(e) => setCustomerTier(customer, e.target.value)}>
                          {CUSTOMER_TIERS.map((tier) => <option key={tier} value={tier}>{tier}</option>)}
                        </select>
                      </td>
                      <td>{customer.total_orders || 0}</td>
                      <td>{fmt(customer.total_spent)}đ</td>
                      <td>{customer.is_active ? 'Active' : 'Locked'}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button className="btn-outline" onClick={() => setCustomerActive(customer, !customer.is_active)}>
                          {customer.is_active ? 'Khoa' : 'Mo khoa'}
                        </button>{' '}
                        <button className="btn-outline" onClick={() => viewCustomerOrders(customer.id)}>Lich su mua</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedCustomerOrders.length > 0 && (
              <div style={styles.card}>
                <h3 style={styles.cardTitle}>Lich su mua hang</h3>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th>Don</th>
                      <th>Tong</th>
                      <th>Trang thai</th>
                      <th>Ngay</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedCustomerOrders.map((order) => (
                      <tr key={order.id}>
                        <td>#{order.id}</td>
                        <td>{fmt(order.total)}đ</td>
                        <td>{order.status}</td>
                        <td>{new Date(order.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {tab === 'promotions' && (
          <>
            <div style={styles.sectionHead}>
              <div>
                <p style={styles.sectionLabel}>3.6 Quan ly khuyen mai</p>
                <h1 style={styles.pageTitle}>Voucher / Flash Sale / Coupon</h1>
              </div>
            </div>
            <form onSubmit={savePromotion} style={{ ...styles.card, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              <h3 style={{ ...styles.cardTitle, gridColumn: '1 / -1' }}>{editingPromotion ? 'Sua khuyen mai' : 'Tao khuyen mai moi'}</h3>
              <input placeholder="Ten chuong trinh" value={promotionForm.name} onChange={(e) => setPromotionForm({ ...promotionForm, name: e.target.value })} required />
              <input placeholder="Code" value={promotionForm.code} onChange={(e) => setPromotionForm({ ...promotionForm, code: e.target.value.toUpperCase() })} required />
              <select value={promotionForm.target_type} onChange={(e) => setPromotionForm({ ...promotionForm, target_type: e.target.value })}>
                <option value="order">Voucher don hang</option>
                <option value="flash_sale">Flash sale</option>
                <option value="coupon">Coupon</option>
              </select>
              <select value={promotionForm.promo_type} onChange={(e) => setPromotionForm({ ...promotionForm, promo_type: e.target.value })}>
                <option value="percent">Giam theo %</option>
                <option value="fixed">Giam theo so tien</option>
              </select>
              <input placeholder="Gia tri giam" type="number" min="0" value={promotionForm.amount} onChange={(e) => setPromotionForm({ ...promotionForm, amount: e.target.value })} />
              <input placeholder="Don toi thieu" type="number" min="0" value={promotionForm.min_order_value} onChange={(e) => setPromotionForm({ ...promotionForm, min_order_value: e.target.value })} />
              <input placeholder="Giam toi da" type="number" min="0" value={promotionForm.max_discount_value} onChange={(e) => setPromotionForm({ ...promotionForm, max_discount_value: e.target.value })} />
              <input placeholder="So luot toi da" type="number" min="0" value={promotionForm.usage_limit} onChange={(e) => setPromotionForm({ ...promotionForm, usage_limit: e.target.value })} />
              <input placeholder="Target IDs (1,2,3)" value={promotionForm.target_ids} onChange={(e) => setPromotionForm({ ...promotionForm, target_ids: e.target.value })} />
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={promotionForm.is_active} onChange={(e) => setPromotionForm({ ...promotionForm, is_active: e.target.checked })} />
                Dang hoat dong
              </label>
              <input type="datetime-local" value={promotionForm.starts_at} onChange={(e) => setPromotionForm({ ...promotionForm, starts_at: e.target.value })} />
              <input type="datetime-local" value={promotionForm.ends_at} onChange={(e) => setPromotionForm({ ...promotionForm, ends_at: e.target.value })} />
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10 }}>
                <button type="button" className="btn-outline" onClick={() => { setPromotionForm(createEmptyPromotionForm()); setEditingPromotion(null); }}>Reset</button>
                <button type="submit" className="btn-primary">{editingPromotion ? 'Cap nhat' : 'Tao khuyen mai'}</button>
              </div>
            </form>

            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Danh sach khuyen mai ({promotions.length})</h3>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Ten</th>
                    <th>Code</th>
                    <th>Loai</th>
                    <th>Kieu giam</th>
                    <th>Gia tri</th>
                    <th>Trang thai</th>
                    <th>Hanh dong</th>
                  </tr>
                </thead>
                <tbody>
                  {promotions.map((promotion) => (
                    <tr key={promotion.id}>
                      <td>#{promotion.id}</td>
                      <td>{promotion.name}</td>
                      <td>{promotion.code}</td>
                      <td>{promotion.target_type}</td>
                      <td>{promotion.promo_type}</td>
                      <td>{promotion.amount}</td>
                      <td>{promotion.is_active ? 'Active' : 'Inactive'}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button className="btn-outline" onClick={() => editPromotion(promotion)}>Sua</button>{' '}
                        <button className="btn-outline" onClick={() => removePromotion(promotion.id)}>Xoa</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  tabBar: {
    position: 'sticky',
    top: NAVBAR_HEIGHT,
    zIndex: 90,
    background: '#2D3436',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
  },
  tabBarInner: { display: 'flex', overflowX: 'auto' },
  tabBtn: {
    padding: '14px 24px',
    background: 'transparent',
    color: 'rgba(255,255,255,0.55)',
    border: 'none',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
    whiteSpace: 'nowrap',
  },
  tabBtnActive: { background: '#9AB17A', color: 'white', fontWeight: 700 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: '#9AB17A',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  pageTitle: { fontSize: 28, fontFamily: "'Outfit',sans-serif", color: '#2D3436' },
  sectionHead: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 10,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  card: {
    background: 'white',
    borderRadius: 14,
    padding: 16,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: "'Outfit',sans-serif",
    color: '#2D3436',
    marginBottom: 12,
  },
  gridStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
    gap: 12,
    marginBottom: 14,
  },
  gridCharts: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    background: 'white',
    borderRadius: 14,
    padding: '16px 18px',
  },
  statLabel: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: 600,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  statValue: { fontSize: 24, fontWeight: 700, fontFamily: "'Outfit',sans-serif" },
  fieldLabel: { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 },
  productGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: 16,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  pill: {
    background: '#f8fafc',
    border: '1px solid rgba(0,0,0,0.06)',
    borderRadius: 999,
    padding: '6px 12px',
    fontSize: 13,
  },
};
