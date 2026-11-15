import React from 'react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { apiCall, timeAgo, useLiveData } from '../api';

const badge = (s: string) => (s === 'APPROVED' ? 'badge-success' : s === 'REJECTED' ? 'badge-danger' : 'badge-warning');
const btn = (bg: string): React.CSSProperties => ({
  padding: '6px 10px',
  borderRadius: 4,
  background: bg,
  color: '#fff',
  border: 'none',
  fontSize: 11,
  cursor: 'pointer',
  fontWeight: 600,
  marginRight: 6,
});

export const KycManager: React.FC = () => {
  const { hasPermission } = useAdminAuth();
  const canApprove = hasPermission(['OPERATIONS']);
  const { data, error, reload } = useLiveData<{ owners: any[]; drivers: any[] }>('/admin/kyc');
  const { data: users, reload: reloadUsers } = useLiveData<any[]>('/admin/users', ['user:updated']);

  const review = async (kind: 'owners' | 'drivers', id: string, action: 'APPROVE' | 'REJECT') => {
    const rejectionReason = action === 'REJECT' ? window.prompt('Reason for rejection?') || 'Documents unclear' : undefined;
    try {
      await apiCall(`/admin/kyc/${kind}/${id}/review`, 'POST', { action, rejectionReason });
      reload();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const toggleBlock = async (id: string) => {
    try {
      await apiCall(`/admin/users/${id}/block`, 'POST');
      reloadUsers();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const actions = (kind: 'owners' | 'drivers', item: any) =>
    canApprove && item.kycStatus === 'PENDING_APPROVAL' ? (
      <>
        <button style={btn('#1b5e20')} onClick={() => review(kind, item.id, 'APPROVE')}>
          Approve
        </button>
        <button style={btn('#c62828')} onClick={() => review(kind, item.id, 'REJECT')}>
          Reject
        </button>
      </>
    ) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {error && <div className="error-banner">{error}</div>}
      <div className="table-card">
        <div className="card-header">
          <h2 className="card-title">🚜 Machine Owners</h2>
          <span className="badge badge-warning">{data?.owners.filter((o) => o.kycStatus === 'PENDING_APPROVAL').length ?? 0} pending</span>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Business / Owner</th>
              <th>Phone</th>
              <th>PAN / Aadhaar</th>
              <th>Bank</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {(data?.owners || []).map((o) => (
              <tr key={o.id}>
                <td>
                  <div style={{ fontWeight: 600 }}>{o.businessName}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>
                    {o.user?.name} · {o.user?.village}
                  </div>
                </td>
                <td>{o.user?.phone}</td>
                <td style={{ fontFamily: 'monospace', fontSize: 12 }}>
                  {o.panNumber} / {o.aadhaarNumber}
                </td>
                <td style={{ fontSize: 12 }}>
                  {o.bankAccountNumber} · {o.bankIfsc}
                </td>
                <td>
                  <span className={`badge ${badge(o.kycStatus)}`}>{o.kycStatus}</span>
                </td>
                <td>{actions('owners', o)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="table-card">
        <div className="card-header">
          <h2 className="card-title">🚚 Drivers / Operators</h2>
          <span className="badge badge-warning">{data?.drivers.filter((d) => d.kycStatus === 'PENDING_APPROVAL').length ?? 0} pending</span>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Driver</th>
              <th>Licence</th>
              <th>Vehicle</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {(data?.drivers || []).map((d) => (
              <tr key={d.id}>
                <td>
                  <div style={{ fontWeight: 600 }}>{d.name}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{d.phone}</div>
                </td>
                <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{d.licenceNumber}</td>
                <td>{d.vehicle ? `${d.vehicle.vehicleNumber} (${d.vehicle.vehicleType})` : '—'}</td>
                <td>
                  <span className={`badge ${badge(d.kycStatus)}`}>{d.kycStatus}</span>
                </td>
                <td>{actions('drivers', d)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="table-card">
        <div className="card-header">
          <h2 className="card-title">👥 All Users</h2>
          <span className="badge badge-info">{users?.length ?? 0}</span>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Role</th>
              <th>Village</th>
              <th>Orders / Rentals</th>
              <th>Joined</th>
              <th>Access</th>
            </tr>
          </thead>
          <tbody>
            {(users || []).map((u) => (
              <tr key={u.id}>
                <td style={{ fontWeight: 600 }}>{u.name || '—'}</td>
                <td>{u.phone}</td>
                <td>
                  <span className="badge badge-info">{u.role}</span>
                </td>
                <td>{u.village || '—'}</td>
                <td>
                  {u._count.orders} / {u._count.rentals}
                </td>
                <td>{timeAgo(u.createdAt)}</td>
                <td>
                  {u.role !== 'ADMIN' && canApprove && (
                    <button style={btn(u.isBlocked ? '#1b5e20' : '#c62828')} onClick={() => toggleBlock(u.id)}>
                      {u.isBlocked ? 'Unblock' : 'Block'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
