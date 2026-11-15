import React, { useState } from 'react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { apiCall, rupees, timeAgo, useLiveData } from '../api';

const ORDER_NEXT: Record<string, { status: string; label: string }[]> = {
  PLACED: [
    { status: 'CONFIRMED', label: 'Confirm' },
    { status: 'CANCELLED', label: 'Cancel' },
  ],
  CONFIRMED: [
    { status: 'PACKED', label: 'Pack & assign driver' },
    { status: 'CANCELLED', label: 'Cancel' },
  ],
  PACKED: [{ status: 'OUT_FOR_DELIVERY', label: 'Out for delivery' }],
  OUT_FOR_DELIVERY: [{ status: 'DELIVERED', label: 'Force delivered' }],
};

const badge = (s: string) =>
  ['DELIVERED', 'COMPLETED'].includes(s) ? 'badge-success' : s === 'CANCELLED' ? 'badge-danger' : ['PLACED', 'CONFIRMED'].includes(s) ? 'badge-warning' : 'badge-info';

const btn = (color: string): React.CSSProperties => ({
  padding: '6px 10px',
  borderRadius: 4,
  backgroundColor: color,
  color: '#fff',
  border: 'none',
  fontSize: 11,
  cursor: 'pointer',
  fontWeight: 600,
  marginRight: 6,
  marginBottom: 4,
});

export const OrdersManager: React.FC = () => {
  const { hasPermission } = useAdminAuth();
  const canManage = hasPermission(['OPERATIONS', 'SUPER_ADMIN']);
  const { data: orders, error, reload } = useLiveData<any[]>('/admin/orders', ['order:updated']);
  const { data: rentals } = useLiveData<any[]>('/admin/rentals', ['rental:updated']);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState('ACTIVE');

  const advance = async (id: string, status: string) => {
    if (status === 'CANCELLED' && !window.confirm('Cancel this order and restock items?')) return;
    setBusy(id);
    try {
      await apiCall(`/admin/orders/${id}/status`, 'POST', { status });
      reload();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(null);
    }
  };

  const shown = (orders || []).filter((o) =>
    filter === 'ALL' ? true : filter === 'ACTIVE' ? !['DELIVERED', 'CANCELLED'].includes(o.status) : o.status === filter
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {error && <div className="error-banner">{error}</div>}
      <div className="table-card">
        <div className="card-header">
          <div>
            <h2 className="card-title">📦 Farm Input Orders</h2>
            <p style={{ fontSize: 12, color: '#64748b' }}>Updates live. Packing assigns the next available driver automatically.</p>
          </div>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="form-input" style={{ width: 180 }}>
            <option value="ACTIVE">Active</option>
            <option value="ALL">All</option>
            {['PLACED', 'CONFIRMED', 'PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Farmer & Village</th>
              <th>Items</th>
              <th>Total</th>
              <th>Payment</th>
              <th>Driver</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 && (
              <tr>
                <td colSpan={8} style={{ color: '#64748b' }}>
                  No orders in this view.
                </td>
              </tr>
            )}
            {shown.map((o) => (
              <tr key={o.id}>
                <td>
                  <div style={{ fontWeight: 600, fontFamily: 'monospace' }}>{o.humanId}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{timeAgo(o.createdAt)}</div>
                </td>
                <td>
                  <div style={{ fontWeight: 500 }}>{o.user?.name}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>
                    {o.address?.village} ({o.address?.pincode}) · {o.user?.phone}
                  </div>
                </td>
                <td style={{ fontSize: 12 }}>{o.items.map((i: any) => `${i.productName} ×${i.quantity}`).join(', ')}</td>
                <td style={{ fontWeight: 700, color: '#1b5e20' }}>
                  {rupees(o.totalPaise)}
                  {o.discountPaise > 0 && <div style={{ fontSize: 11, color: '#64748b' }}>−{rupees(o.discountPaise)} coupon</div>}
                </td>
                <td>
                  <span className={`badge ${o.paymentStatus === 'PAID' ? 'badge-success' : 'badge-warning'}`}>
                    {o.paymentMethod} · {o.paymentStatus}
                  </span>
                </td>
                <td style={{ fontSize: 12 }}>
                  {o.deliveryJob?.driver ? `${o.deliveryJob.driver.name} (${o.deliveryJob.status})` : '—'}
                </td>
                <td>
                  <span className={`badge ${badge(o.status)}`}>{o.status}</span>
                </td>
                <td>
                  {canManage &&
                    (ORDER_NEXT[o.status] || []).map((a) => (
                      <button
                        key={a.status}
                        disabled={busy === o.id}
                        onClick={() => advance(o.id, a.status)}
                        style={btn(a.status === 'CANCELLED' ? '#c62828' : '#1b5e20')}
                      >
                        {a.label}
                      </button>
                    ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="table-card">
        <div className="card-header">
          <div>
            <h2 className="card-title">🚜 Farm Machinery Rentals</h2>
            <p style={{ fontSize: 12, color: '#64748b' }}>Owners accept bookings in their app; drivers handle delivery with OTP handover.</p>
          </div>
          <span className="badge badge-info">
            {(rentals || []).filter((r) => !['COMPLETED', 'CANCELLED'].includes(r.status)).length} active
          </span>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Rental</th>
              <th>Farmer</th>
              <th>Machine / Owner</th>
              <th>Schedule</th>
              <th>Driver</th>
              <th>Total</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {(rentals || []).map((r) => (
              <tr key={r.id}>
                <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{r.humanId}</td>
                <td>
                  {r.user?.name}
                  <div style={{ fontSize: 11, color: '#64748b' }}>{r.address?.village}</div>
                </td>
                <td style={{ fontWeight: 500 }}>
                  {r.machine?.name}
                  <div style={{ fontSize: 11, color: '#64748b' }}>{r.machine?.owner?.name}</div>
                </td>
                <td style={{ fontSize: 12 }}>
                  {new Date(r.startDate).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} ·{' '}
                  {r.durationHours} h
                </td>
                <td style={{ fontSize: 12 }}>{r.deliveryJob?.driver?.name || '—'}</td>
                <td>{rupees(r.totalPaise)}</td>
                <td>
                  <span className={`badge ${badge(r.status)}`}>{r.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
