import React, { useState } from 'react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { apiCall, rupees, useLiveData } from '../api';

export const ServiceAreaManager: React.FC = () => {
  const { hasPermission } = useAdminAuth();
  const canEdit = hasPermission(['OPERATIONS']);
  const { data: areas, error, reload } = useLiveData<any[]>('/admin/service-areas');
  const [form, setForm] = useState({ name: '', pincode: '', deliveryFee: '49', freeAbove: '999' });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiCall('/admin/service-areas', 'POST', form);
      setForm({ name: '', pincode: '', deliveryFee: '49', freeAbove: '999' });
      reload();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const toggle = async (a: any) => {
    try {
      await apiCall('/admin/service-areas', 'POST', {
        name: a.name,
        pincode: a.pincode,
        deliveryFee: a.deliveryFeePaise / 100,
        freeAbove: a.minOrderFreeDeliveryPaise / 100,
        isActive: !a.isActive,
      });
      reload();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="table-card">
      {error && <div className="error-banner">{error}</div>}
      <div className="card-header">
        <h2 className="card-title">📍 Serviceable Pincodes</h2>
        <span className="badge badge-info">{areas?.length ?? 0} areas</span>
      </div>
      {canEdit && (
        <form onSubmit={save} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingBottom: 16 }}>
          <input className="form-input" style={{ width: 200 }} placeholder="Area name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input className="form-input" style={{ width: 120 }} placeholder="Pincode" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} required />
          <input className="form-input" style={{ width: 130 }} placeholder="Delivery ₹" type="number" value={form.deliveryFee} onChange={(e) => setForm({ ...form, deliveryFee: e.target.value })} />
          <input className="form-input" style={{ width: 150 }} placeholder="Free above ₹" type="number" value={form.freeAbove} onChange={(e) => setForm({ ...form, freeAbove: e.target.value })} />
          <button type="submit" className="login-btn" style={{ width: 'auto', padding: '8px 16px', marginTop: 0 }}>
            Save area
          </button>
        </form>
      )}
      <table className="data-table">
        <thead>
          <tr>
            <th>Area</th>
            <th>Pincode</th>
            <th>Delivery fee</th>
            <th>Free delivery above</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {(areas || []).map((a) => (
            <tr key={a.id}>
              <td style={{ fontWeight: 600 }}>{a.name}</td>
              <td style={{ fontFamily: 'monospace' }}>{a.pincode}</td>
              <td>{rupees(a.deliveryFeePaise)}</td>
              <td>{rupees(a.minOrderFreeDeliveryPaise)}</td>
              <td>
                <span
                  className={`badge ${a.isActive ? 'badge-success' : 'badge-warning'}`}
                  style={{ cursor: canEdit ? 'pointer' : 'default' }}
                  onClick={() => canEdit && toggle(a)}
                  title={canEdit ? 'Click to toggle' : ''}
                >
                  {a.isActive ? 'ACTIVE' : 'PAUSED'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
