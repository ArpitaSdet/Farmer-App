import React, { useState } from 'react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { apiCall, rupees, useLiveData } from '../api';

const small: React.CSSProperties = {
  padding: '5px 9px',
  borderRadius: 4,
  border: '1px solid #cbd5e1',
  background: '#f8fafc',
  fontSize: 11,
  cursor: 'pointer',
  fontWeight: 600,
  marginRight: 4,
};

export const CatalogManager: React.FC = () => {
  const { hasPermission } = useAdminAuth();
  const canEdit = hasPermission(['CATALOG']);
  const { data: products, error, reload } = useLiveData<any[]>('/admin/products', ['stock:updated', 'catalog:changed']);
  const { data: coupons, reload: reloadCoupons } = useLiveData<any[]>('/admin/coupons', ['coupons:changed']);
  const [coupon, setCoupon] = useState({ code: '', discountPercent: '', maxDiscount: '', minOrder: '' });

  const adjust = async (variantId: string, delta: number) => {
    const reason = delta > 0 ? 'Restock (admin console)' : 'Damage / audit write-off (admin console)';
    try {
      await apiCall('/admin/products/stock/adjust', 'POST', {
        variantId,
        quantity: delta,
        type: delta > 0 ? 'INWARD' : 'ADJUSTMENT_DAMAGE',
        reason,
      });
      reload();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const togglePublish = async (id: string) => {
    try {
      await apiCall(`/admin/products/${id}/toggle`, 'POST');
      reload();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const createCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiCall('/admin/coupons', 'POST', coupon);
      setCoupon({ code: '', discountPercent: '', maxDiscount: '', minOrder: '' });
      reloadCoupons();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {error && <div className="error-banner">{error}</div>}
      <div className="table-card">
        <div className="card-header">
          <div>
            <h2 className="card-title">📦 Products & Inventory</h2>
            <p style={{ fontSize: 12, color: '#64748b' }}>Stock changes are pushed live to every farmer's app.</p>
          </div>
          <span className="badge badge-info">{products?.length ?? 0} products</span>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>Pack / Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(products || []).flatMap((p) =>
              p.variants.map((v: any, i: number) => (
                <tr key={v.id}>
                  <td>
                    {i === 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {p.images?.[0] && <img src={p.images[0].url} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover' }} />}
                        <div>
                          <div style={{ fontWeight: 600 }}>{p.name}</div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>{p.brand?.name}</div>
                        </div>
                      </div>
                    )}
                  </td>
                  <td>{i === 0 ? p.category?.name : ''}</td>
                  <td>
                    {v.packSize} · <strong>{rupees(v.pricePaise)}</strong>{' '}
                    <span style={{ fontSize: 11, color: '#94a3b8', textDecoration: 'line-through' }}>{rupees(v.mrpPaise)}</span>
                  </td>
                  <td>
                    <span className={`badge ${v.stock < 20 ? 'badge-danger' : 'badge-success'}`}>{v.stock}</span>
                  </td>
                  <td>
                    {i === 0 && <span className={`badge ${p.isPublished ? 'badge-success' : 'badge-warning'}`}>{p.isPublished ? 'LIVE' : 'HIDDEN'}</span>}
                  </td>
                  <td>
                    {canEdit && (
                      <>
                        <button style={small} onClick={() => adjust(v.id, 10)}>
                          +10
                        </button>
                        <button style={small} onClick={() => adjust(v.id, 50)}>
                          +50
                        </button>
                        <button style={small} onClick={() => v.stock > 0 && adjust(v.id, -1)}>
                          −1
                        </button>
                        {i === 0 && (
                          <button style={small} onClick={() => togglePublish(p.id)}>
                            {p.isPublished ? 'Hide' : 'Publish'}
                          </button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="table-card">
        <div className="card-header">
          <h2 className="card-title">🏷️ Coupons</h2>
        </div>
        {canEdit && (
          <form onSubmit={createCoupon} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '0 0 16px' }}>
            <input className="form-input" style={{ width: 140 }} placeholder="CODE" value={coupon.code} onChange={(e) => setCoupon({ ...coupon, code: e.target.value.toUpperCase() })} required />
            <input className="form-input" style={{ width: 110 }} placeholder="% off" type="number" value={coupon.discountPercent} onChange={(e) => setCoupon({ ...coupon, discountPercent: e.target.value })} required />
            <input className="form-input" style={{ width: 140 }} placeholder="Max ₹ off" type="number" value={coupon.maxDiscount} onChange={(e) => setCoupon({ ...coupon, maxDiscount: e.target.value })} required />
            <input className="form-input" style={{ width: 140 }} placeholder="Min order ₹" type="number" value={coupon.minOrder} onChange={(e) => setCoupon({ ...coupon, minOrder: e.target.value })} />
            <button type="submit" className="login-btn" style={{ width: 'auto', padding: '8px 16px', marginTop: 0 }}>
              Create coupon
            </button>
          </form>
        )}
        <table className="data-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Discount</th>
              <th>Max off</th>
              <th>Min order</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {(coupons || []).map((c) => (
              <tr key={c.id}>
                <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{c.code}</td>
                <td>{c.discountPercent}%</td>
                <td>{rupees(c.maxDiscountPaise)}</td>
                <td>{rupees(c.minOrderPaise)}</td>
                <td>
                  <span className={`badge ${c.isActive ? 'badge-success' : 'badge-warning'}`}>{c.isActive ? 'ACTIVE' : 'OFF'}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
