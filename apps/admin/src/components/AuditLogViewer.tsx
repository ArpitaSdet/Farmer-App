import React from 'react';
import { timeAgo, useLiveData } from '../api';

export const AuditLogViewer: React.FC = () => {
  // Every admin action re-triggers order/rental/stock events, so the trail refreshes live too
  const { data: logs, error } = useLiveData<any[]>('/admin/audit-logs', ['order:updated', 'stock:updated', 'user:updated', 'coupons:changed']);

  return (
    <div className="table-card">
      {error && <div className="error-banner">{error}</div>}
      <div className="card-header">
        <h2 className="card-title">📜 Admin Audit Trail</h2>
        <span className="badge badge-info">{logs?.length ?? 0} entries</span>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>When</th>
            <th>Actor</th>
            <th>Action</th>
            <th>Entity</th>
            <th>IP</th>
          </tr>
        </thead>
        <tbody>
          {(logs || []).length === 0 && (
            <tr>
              <td colSpan={5} style={{ color: '#64748b' }}>
                No admin actions recorded yet.
              </td>
            </tr>
          )}
          {(logs || []).map((l) => (
            <tr key={l.id}>
              <td>{timeAgo(l.createdAt)}</td>
              <td>{l.actor?.name || l.actor?.email || 'system'}</td>
              <td>
                <span className="badge badge-info">{l.action}</span>
              </td>
              <td style={{ fontSize: 12 }}>
                {l.entity} · <span style={{ fontFamily: 'monospace' }}>{String(l.entityId).slice(0, 8)}</span>
              </td>
              <td style={{ fontSize: 12 }}>{l.ipAddress || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
