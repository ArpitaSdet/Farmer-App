import React, { useState } from 'react';
import { useAdminAuth } from '../context/AdminAuthContext';

export const AdminLogin: React.FC = () => {
  const { login } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpToken, setTotpToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password, totpToken || undefined);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = () => {
    setEmail('admin@kisankendra.in');
    setPassword('Admin@123');
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-icon">🌾</div>
          <h1 className="login-title">Kisan Kendra Admin</h1>
          <p className="login-subtitle">Secured Portal for Operations, Catalog & Audits</p>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Admin Official Email</label>
            <input
              id="email"
              type="email"
              required
              className="form-input"
              placeholder="e.g. ops.admin@krishi.gov.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              className="form-input"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="totp">2FA TOTP Code (Google Authenticator)</label>
            <input
              id="totp"
              type="text"
              maxLength={6}
              className="form-input"
              placeholder="6-digit code (if enabled)"
              value={totpToken}
              onChange={(e) => setTotpToken(e.target.value)}
            />
          </div>

          <button type="submit" disabled={loading} className="login-btn">
            {loading ? 'Authenticating...' : 'Sign In to Control Tower'}
          </button>
        </form>

        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
          <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px', fontWeight: 600 }}>
            Demo admin: admin@kisankendra.in / Admin@123
          </p>
          <button
            type="button"
            onClick={handleDemoFill}
            style={{ fontSize: '12px', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer' }}
          >
            Fill demo credentials
          </button>
        </div>
      </div>
    </div>
  );
};
