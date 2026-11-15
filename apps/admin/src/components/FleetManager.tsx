import React, { useState } from 'react';
import { timeAgo, useLive, useLiveData } from '../api';

export const FleetManager: React.FC = () => {
  const { data: drivers, error } = useLiveData<any[]>('/admin/drivers', ['job:updated', 'driver:updated']);
  const { data: telemetry } = useLiveData<any>('/admin/realtime/drivers');
  const { data: machines } = useLiveData<any[]>('/admin/machines', ['machine:updated', 'rental:updated']);
  const [live, setLive] = useState<Record<string, any>>({});

  // GPS pings stream in from driver apps every ~10 s
  useLive(['location:update'], (p) => setLive((prev) => ({ ...prev, [p.driverId]: p })));

  const lastPing = (driverId: string) => {
    const fromSocket = live[driverId];
    if (fromSocket) return fromSocket;
    const list = Array.isArray(telemetry) ? telemetry : telemetry?.drivers || [];
    return list.find((t: any) => t.driverId === driverId);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {error && <div className="error-banner">{error}</div>}
      <div className="table-card">
        <div className="card-header">
          <h2 className="card-title">🚚 Drivers — live telemetry</h2>
          <span className="badge badge-success">{Object.keys(live).length} streaming</span>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Driver</th>
              <th>Vehicle</th>
              <th>Availability</th>
              <th>Open jobs</th>
              <th>Last position</th>
              <th>To farm</th>
            </tr>
          </thead>
          <tbody>
            {(drivers || []).map((d) => {
              const ping = lastPing(d.id);
              return (
                <tr key={d.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{d.name}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      {d.phone} · KYC {d.kycStatus}
                    </div>
                  </td>
                  <td>{d.vehicle?.vehicleNumber || '—'}</td>
                  <td>
                    <span className={`badge ${d.isAvailable ? 'badge-success' : 'badge-warning'}`}>{d.isAvailable ? 'ONLINE' : 'OFFLINE'}</span>
                  </td>
                  <td style={{ fontSize: 12 }}>
                    {d.deliveryJobs.length ? d.deliveryJobs.map((j: any) => `${j.type === 'RENTAL' ? '🚜' : '📦'} ${j.status}`).join(', ') : '—'}
                  </td>
                  <td style={{ fontSize: 12 }}>
                    {ping ? (
                      <a href={`https://www.google.com/maps?q=${ping.latitude},${ping.longitude}`} target="_blank" rel="noreferrer">
                        {ping.latitude.toFixed(4)}, {ping.longitude.toFixed(4)}
                      </a>
                    ) : (
                      '—'
                    )}
                    {ping && <div style={{ color: '#64748b' }}>{timeAgo(ping.timestamp || ping.lastSeen)}</div>}
                  </td>
                  <td>{ping?.distanceKmRemaining != null ? `${ping.distanceKmRemaining.toFixed(1)} km · ${ping.etaMinutes} min` : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="table-card">
        <div className="card-header">
          <h2 className="card-title">🚜 Machinery Fleet</h2>
          <span className="badge badge-info">{machines?.length ?? 0} machines</span>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Machine</th>
              <th>Owner</th>
              <th>Rates</th>
              <th>Bookings</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {(machines || []).map((m) => (
              <tr key={m.id}>
                <td>
                  <div style={{ fontWeight: 600 }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>
                    {m.type} · {m.village}
                  </div>
                </td>
                <td>{m.owner?.name || '—'}</td>
                <td style={{ fontSize: 12 }}>
                  ₹{m.hourlyRatePaise / 100}/h · ₹{m.dailyRatePaise / 100}/day
                </td>
                <td>{m._count.rentals}</td>
                <td>
                  <span className={`badge ${m.isAvailable ? 'badge-success' : 'badge-warning'}`}>{m.isAvailable ? 'AVAILABLE' : 'HIDDEN'}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
