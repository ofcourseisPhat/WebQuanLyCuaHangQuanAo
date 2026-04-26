import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../../api';
import ProductCard from '../../components/common/ProductCard';

const getPredictColor = (prob) => {
  if (prob >= 75) return '#9AB17A';
  if (prob >= 50) return '#C3CC9B';
  return '#d1d5db';
};

const getPredictBadge = (prob) => {
  if (prob >= 75) return { label: 'Bestseller', cls: 'badge-success' };
  if (prob >= 50) return { label: 'Tiềm năng', cls: 'badge-warning' };
  return { label: 'Thấp', cls: 'badge-gray' };
};

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(n);
const COLORS = ['#9AB17A', '#7A8F5C', '#C3CC9B', '#E4DFB5', '#2D3436', '#6b7280'];

export default function AdminDashboard() {
  const [summary, setSummary] = useState(null);
  const [revenue, setRevenue] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [statusData, setStatusData] = useState([]);
  const [products, setProducts] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [predictLoading, setPredictLoading] = useState(false);
  const [training, setTraining] = useState(false);
  const [trainResult, setTrainResult] = useState(null);
  const [tab, setTab] = useState('dashboard');
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [form, setForm] = useState({ name: '', category: '', price: '', stock: '', discount: '', image: '', description: '' });

  useEffect(() => {
    api.get('/dashboard/summary').then(r => setSummary(r.data));
    api.get('/dashboard/revenue-by-month').then(r => setRevenue(r.data.data));
    api.get('/dashboard/top-products').then(r => setTopProducts(r.data.data));
    api.get('/dashboard/sales-by-category').then(r => setCategoryData(r.data.data));
    api.get('/dashboard/order-status-breakdown').then(r => setStatusData(r.data.data));
    api.get('/products/', { params: { per_page: 100 } }).then(r => setProducts(r.data.products));
  }, []);

  const fetchPredictions = async () => {
    setPredictLoading(true);
    try {
      const r = await api.get('/ml/predict-bestsellers');
      setPredictions(r.data.predictions || []);
    } catch (e) {}
    finally { setPredictLoading(false); }
  };

  const handleTrain = async () => {
    setTraining(true);
    try {
      const r = await api.post('/ml/train');
      setTrainResult(r.data);
      await fetchPredictions();
    } catch (e) {}
    finally { setTraining(false); }
  };

  useEffect(() => {
    if (tab === 'predict' && predictions.length === 0) fetchPredictions();
  }, [tab]);

  const handleEditProduct = (product) => {
    setEditProduct(product);
    setForm({ name: product.name, category: product.category, price: product.price, stock: product.stock, discount: product.discount, image: product.image || '', description: product.description || '' });
    setShowForm(true); setTab('products');
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Xác nhận xóa sản phẩm này?')) return;
    await api.delete(`/products/${id}`);
    setProducts(products.filter(p => p.id !== id));
  };

  const handleSubmitProduct = async (e) => {
    e.preventDefault();
    try {
      if (editProduct) {
        const r = await api.put(`/products/${editProduct.id}`, form);
        setProducts(products.map(p => p.id === editProduct.id ? r.data.product : p));
      } else {
        const r = await api.post('/products/', form);
        setProducts([r.data.product, ...products]);
      }
      setShowForm(false); setEditProduct(null);
      setForm({ name: '', category: '', price: '', stock: '', discount: '', image: '', description: '' });
    } catch (err) { alert(err.response?.data?.error || 'Lỗi'); }
  };

  const StatCard = ({ label, value, sub, color }) => (
    <div style={styles.statCard}>
      <div style={{ fontSize: 12, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, fontFamily: "'Outfit',sans-serif", color: color || '#2D3436' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>{sub}</div>}
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#FBE8CE' }}>
      {/* Admin tab bar */}
      <div style={styles.tabBar}>
        <div className="page-container" style={{ display: 'flex', gap: 0 }}>
          {[['dashboard', 'Dashboard'], ['products', 'Sản phẩm'], ['predict', '🤖 Dự đoán bán chạy']].map(([t, label]) => (
            <button key={t} style={{ ...styles.tabBtn, ...(tab === t ? styles.tabBtnActive : {}) }} onClick={() => setTab(t)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="page-container" style={{ padding: '36px 24px' }}>
        {tab === 'dashboard' && summary && (
          <>
            {/* Page header */}
            <div style={{ marginBottom: 28 }}>
              <p style={styles.sectionLabel}>Tổng quan</p>
              <h1 style={styles.pageTitle}>Dashboard</h1>
            </div>

            {/* Stats grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 32 }}>
              <StatCard label="Doanh thu" value={fmt(summary.total_revenue) + '₫'} color="#9AB17A" />
              <StatCard label="Tổng đơn hàng" value={summary.total_orders} />
              <StatCard label="Sản phẩm" value={summary.total_products} />
              <StatCard label="Khách hàng" value={summary.total_customers} />
              <StatCard label="Chờ xử lý" value={summary.pending_orders} color="#f59e0b" />
              <StatCard label="Sắp hết hàng" value={summary.low_stock_products} color="#ef4444" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
              {/* Revenue chart */}
              <div style={styles.chartCard}>
                <h3 style={styles.chartTitle}>Doanh thu theo tháng</h3>
                {revenue.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={revenue}>
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => (v / 1000000).toFixed(0) + 'M'} axisLine={false} tickLine={false} />
                      <Tooltip formatter={v => fmt(v) + '₫'} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(154,177,122,0.2)' }} />
                      <Line type="monotone" dataKey="revenue" stroke="#9AB17A" strokeWidth={2.5} dot={{ fill: '#9AB17A', r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : <div style={styles.emptyChart}>Chưa có dữ liệu doanh thu</div>}
              </div>

              {/* Category pie */}
              <div style={styles.chartCard}>
                <h3 style={styles.chartTitle}>Doanh số theo danh mục</h3>
                {categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={categoryData} dataKey="total_sold" nameKey="category" cx="50%" cy="50%" outerRadius={80}
                        label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(154,177,122,0.2)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <div style={styles.emptyChart}>Chưa có dữ liệu</div>}
              </div>
            </div>

            {/* Top products bar */}
            <div style={{ ...styles.chartCard, marginBottom: 20 }}>
              <h3 style={styles.chartTitle}>Top 10 sản phẩm bán chạy</h3>
              {topProducts.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={topProducts} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v, n) => [n === 'total_sold' ? v + ' sp' : fmt(v) + '₫', n === 'total_sold' ? 'Đã bán' : 'Doanh thu']}
                      contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(154,177,122,0.2)' }} />
                    <Bar dataKey="total_sold" fill="#9AB17A" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div style={{ textAlign: 'center', color: '#9ca3af', padding: 40, fontSize: 13 }}>Chưa có đơn hàng nào được xử lý</div>}
            </div>

            {/* Order status */}
            {statusData.length > 0 && (
              <div style={styles.chartCard}>
                <h3 style={styles.chartTitle}>Trạng thái đơn hàng</h3>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {statusData.map((s, i) => (
                    <div key={i} style={{ flex: 1, minWidth: 100, textAlign: 'center', background: 'rgba(154,177,122,0.08)', borderRadius: 14, padding: '16px 10px' }}>
                      <div style={{ fontSize: 24, fontFamily: "'Outfit',sans-serif", fontWeight: 700, color: COLORS[i % COLORS.length] }}>{s.count}</div>
                      <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>{s.status}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {tab === 'predict' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
              <div>
                <p style={styles.sectionLabel}>AI & Machine Learning</p>
                <h1 style={styles.pageTitle}>Dự đoán sản phẩm bán chạy</h1>
              </div>
              <button className="btn-primary" onClick={handleTrain} disabled={training} style={{ padding: '12px 26px' }}>
                {training ? '⟳ Đang huấn luyện...' : '⚡ Huấn luyện lại mô hình'}
              </button>
            </div>

            {trainResult && (
              <div style={styles.trainResultBanner}>
                <strong>✓ Kết quả huấn luyện:</strong>
                {Object.entries(trainResult).map(([k, v]) => (
                  <span key={k} style={{ marginLeft: 18, opacity: 0.85 }}>• {k}: <strong>{v}</strong></span>
                ))}
              </div>
            )}

            {predictLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
            ) : predictions.length === 0 ? (
              <div style={{ ...styles.chartCard, textAlign: 'center', padding: 60 }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>🤖</div>
                <p style={{ color: '#9ca3af', fontSize: 15, marginBottom: 20 }}>Chưa có dữ liệu dự đoán. Nhấn "Huấn luyện lại mô hình" để bắt đầu.</p>
              </div>
            ) : (
              <>
                {/* Bar chart top 10 */}
                <div style={{ ...styles.chartCard, marginBottom: 20 }}>
                  <h3 style={styles.chartTitle}>Xác suất trở thành Bestseller (Top 10)</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={predictions.slice(0, 10)} layout="vertical">
                      <XAxis type="number" domain={[0, 100]} tickFormatter={v => v + '%'} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis dataKey="product_name" type="category" width={150} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip formatter={v => v + '%'} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(154,177,122,0.2)' }} />
                      <Bar dataKey="probability" radius={[0, 8, 8, 0]}>
                        {predictions.slice(0, 10).map((entry, i) => (
                          <Cell key={i} fill={getPredictColor(entry.probability)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', gap: 20, marginTop: 14, fontSize: 12, color: '#9ca3af' }}>
                    <span><span style={{ color: '#9AB17A', fontWeight: 700 }}>●</span> ≥75%: Bestseller</span>
                    <span><span style={{ color: '#C3CC9B', fontWeight: 700 }}>●</span> 50–74%: Tiềm năng</span>
                    <span><span style={{ color: '#d1d5db', fontWeight: 700 }}>●</span> &lt;50%: Thấp</span>
                  </div>
                </div>

                {/* Detail table */}
                <div style={{ ...styles.chartCard, overflow: 'hidden', padding: 0 }}>
                  <div style={{ padding: '20px 24px', borderBottom: '1.5px solid rgba(154,177,122,0.12)' }}>
                    <h3 style={{ ...styles.chartTitle, marginBottom: 0 }}>Chi tiết dự đoán ({predictions.length} sản phẩm)</h3>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: 'rgba(154,177,122,0.06)' }}>
                          {['#', 'Sản phẩm', 'Danh mục', 'Giá', 'Tổng bán', 'TB/tháng', 'Xác suất', 'Nhận định'].map(h => (
                            <th key={h} style={styles.predTh}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {predictions.map((p, i) => {
                          const badge = getPredictBadge(p.probability);
                          return (
                            <tr key={i} style={{ borderTop: '1px solid rgba(154,177,122,0.1)' }}>
                              <td style={styles.predTd}>{i + 1}</td>
                              <td style={{ ...styles.predTd, fontWeight: 700, color: '#2D3436' }}>{p.product_name || `SP #${p.product_id}`}</td>
                              <td style={styles.predTd}>{p.category || '—'}</td>
                              <td style={styles.predTd}>{p.price ? fmt(p.price) + '₫' : '—'}</td>
                              <td style={{ ...styles.predTd, fontWeight: 600 }}>{fmt(p.total_sales)}</td>
                              <td style={styles.predTd}>{fmt(Math.round(p.avg_sales))}</td>
                              <td style={styles.predTd}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <div style={{ flex: 1, height: 6, background: 'rgba(154,177,122,0.15)', borderRadius: 3, minWidth: 60 }}>
                                    <div style={{ width: p.probability + '%', height: '100%', background: getPredictColor(p.probability), borderRadius: 3 }} />
                                  </div>
                                  <span style={{ fontWeight: 700, fontSize: 14, color: getPredictColor(p.probability) === '#d1d5db' ? '#9ca3af' : getPredictColor(p.probability) }}>{p.probability}%</span>
                                </div>
                              </td>
                              <td style={styles.predTd}><span className={`badge ${badge.cls}`}>{badge.label}</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {tab === 'products' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
              <div>
                <p style={styles.sectionLabel}>Quản lý kho</p>
                <h1 style={styles.pageTitle}>Sản phẩm ({products.length})</h1>
              </div>
              <button className="btn-primary" onClick={() => { setShowForm(!showForm); setEditProduct(null); setForm({ name: '', category: '', price: '', stock: '', discount: '', image: '', description: '' }); }}>
                {showForm ? '✕ Đóng' : '+ Thêm sản phẩm'}
              </button>
            </div>

            {showForm && (
              <div style={{ ...styles.chartCard, marginBottom: 28 }}>
                <h3 style={{ ...styles.chartTitle, marginBottom: 22 }}>{editProduct ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới'}</h3>
                <form onSubmit={handleSubmitProduct} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {[['name', 'Tên sản phẩm', 'text'], ['category', 'Danh mục', 'text'], ['price', 'Giá (₫)', 'number'], ['stock', 'Tồn kho', 'number'], ['discount', 'Giảm giá (%)', 'number'], ['image', 'URL ảnh', 'text']].map(([field, label, type]) => (
                    <div key={field}>
                      <label style={styles.fieldLabel}>{label}</label>
                      <input type={type} style={{ width: '100%' }} value={form[field]} onChange={e => setForm({ ...form, [field]: e.target.value })} required={['name', 'category', 'price'].includes(field)} />
                    </div>
                  ))}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={styles.fieldLabel}>Mô tả</label>
                    <textarea style={{ width: '100%', height: 72, resize: 'vertical' }} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                  </div>
                  <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 12 }}>
                    <button type="button" className="btn-outline" onClick={() => { setShowForm(false); setEditProduct(null); }}>Hủy</button>
                    <button type="submit" className="btn-primary">{editProduct ? 'Lưu thay đổi' : 'Thêm sản phẩm'}</button>
                  </div>
                </form>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20 }}>
              {products.map(p => <ProductCard key={p.id} product={p} adminMode onEdit={handleEditProduct} onDelete={handleDeleteProduct} />)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  tabBar: {
    background: '#2D3436',
    borderBottom: 'none',
  },
  tabBtn: {
    padding: '16px 28px',
    background: 'transparent',
    color: 'rgba(255,255,255,0.55)',
    border: 'none',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
    fontFamily: "'Plus Jakarta Sans',sans-serif",
    transition: 'all 0.2s',
  },
  tabBtnActive: {
    background: '#9AB17A',
    color: 'white',
    fontWeight: 700,
  },
  sectionLabel: { fontSize: 12, fontWeight: 700, color: '#9AB17A', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 },
  pageTitle: { fontSize: 28, fontFamily: "'Outfit',sans-serif", color: '#2D3436' },
  statCard: {
    background: 'white',
    borderRadius: 20,
    padding: '20px 22px',
    boxShadow: '0 4px 12px rgba(154,177,122,0.08)',
  },
  chartCard: {
    background: 'white',
    borderRadius: 20,
    padding: 24,
    boxShadow: '0 4px 12px rgba(154,177,122,0.08)',
  },
  chartTitle: { fontSize: 15, fontFamily: "'Outfit',sans-serif", fontWeight: 700, marginBottom: 20, color: '#2D3436' },
  emptyChart: { height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 13 },
  fieldLabel: { display: 'block', fontSize: 13, fontWeight: 600, color: '#2D3436', marginBottom: 7 },
  trainResultBanner: {
    marginBottom: 20,
    background: 'rgba(154,177,122,0.12)',
    borderRadius: 12,
    padding: '12px 18px',
    fontSize: 13,
    border: '1px solid rgba(154,177,122,0.3)',
    color: '#2D3436',
  },
  predTh: { padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#9ca3af', textAlign: 'left', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: 0.5 },
  predTd: { padding: '12px 16px', fontSize: 13, color: '#6b7280' },
};
