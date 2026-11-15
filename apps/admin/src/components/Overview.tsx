import React, { useState } from 'react';
import { rupees, timeAgo, useLive, useLiveData } from '../api';

type Activity = { id: string; event: string; entity: string; status: string; at: string };

const LIVE_EVENTS = ['order:updated', 'rental:updated', 'machine:updated', 'user:updated', 'job:updated'];

export const Overview: React.FC = () => {
  const { data: stats, error } = useLiveData<any>('/admin/stats', LIVE_EVENTS);
  const { data: orders } = useLiveData<any[]>('/admin/orders', ['order:updated']);
  const [feed, setFeed] = useState<Activity[]>([]);

  // Live activity stream straight from the socket
  useLive(['order:updated', 'rental:updated', 'location:update'], (p, e) => {
    const item: Activity =
      e === 'order:updated'
        ? { id: `${p.id}-${p.status}`, event: `Order ${p.status.replace(/_/g, ' ').toLowerCase()}`, entity: p.humanId, status: p.status, at: new Date().toISOString() }
        : e === 'rental:updated'
        ? { id: `${p.id}-${p.status}`, event: `Rental ${p.status.replace(/_/g, ' ').toLowerCase()} · ${p.machine?.name}`, entity: p.humanId, status: p.status, at: new Date().toISOString() }
        : { id: `${p.jobId}-${p.timestamp}`, event: `Driver ${p.driverName} location ping (${p.distanceKmRemaining?.toFixed(1) ?? '?'} km to farm)`, entity: p.vehicleNumber || p.jobId.slice(0, 8), status: 'LIVE', at: p.timestamp };
    setFeed((prev) => [item, ...prev.filter((x) => x.id !== item.id)].slice(0, 25));
  });

  const badge = (s: string) =>
    ['DELIVERED', 'COMPLETED'].includes(s) ? 'badge-success' : s === 'CANCELLED' ? 'badge-danger' : s === 'LIVE' ? 'badge-warning' : 'badge-info';

  return (
    <div>
      {error && <div className="error-banner">{error}</div>}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">🌾 Registered Farmers</div>
          <div className="stat-value">{stats?.farmers ?? '—'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">📦 Orders (today / total)</div>
          <div className="stat-value">
            {stats ? `${stats.ordersToday} / ${stats.orders}` : '—'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">🚜 Active Rentals</div>
          <div className="stat-value">{stats?.activeRentals ?? '—'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">💰 Order + Rental GMV</div>
          <div className="stat-value">{stats ? rupees(stats.orderRevenuePaise + stats.rentalRevenuePaise) : '—'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">📑 Pending KYC</div>
          <div className="stat-value">{stats?.pendingKyc ?? '—'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">⚠️ Low-stock variants</div>
          <div className="stat-value">{stats?.lowStock ?? '—'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">🧑‍🔧 Owners / Drivers</div>
          <div className="stat-value">{stats ? `${stats.owners} / ${stats.drivers}` : '—'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">🗂️ Products / Machines</div>
          <div className="stat-value">{stats ? `${stats.products} / ${stats.machines}` : '—'}</div>
        </div>
      </div>

      <div className="table-card">
        <div className="card-header">
          <h2 className="card-title">⚡ Live Activity</h2>
          <span className="badge badge-success">Streaming</span>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Event</th>
              <th>Reference</th>
              <th>When</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {feed.length === 0 && (
              <tr>
                <td colSpan={4} style={{ color: '#64748b' }}>
                  Waiting for activity… place an order or booking in the app to see it appear here instantly.
                </td>
              </tr>
            )}
            {feed.map((a) => (
              <tr key={a.id}>
                <td>{a.event}</td>
                <td style={{ fontFamily: 'monospace' }}>{a.entity}</td>
                <td>{timeAgo(a.at)}</td>
                <td>
                  <span className={`badge ${badge(a.status)}`}>{a.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="table-card" style={{ marginTop: 24 }}>
        <div className="card-header">
          <h2 className="card-title">Recent Orders</h2>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Farmer</th>
              <th>Total</th>
              <th>Placed</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {(orders || []).slice(0, 6).map((o) => (
              <tr key={o.id}>
                <td style={{ fontFamily: 'monospace' }}>{o.humanId}</td>
                <td>{o.user?.name}</td>
                <td>{rupees(o.totalPaise)}</td>
                <td>{timeAgo(o.createdAt)}</td>
                <td>
                  <span className={`badge ${badge(o.status)}`}>{o.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
