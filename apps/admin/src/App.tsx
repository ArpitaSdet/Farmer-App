import React, { useState } from 'react';
import { useAdminAuth } from './context/AdminAuthContext';
import { AdminLogin } from './components/AdminLogin';
import { Overview } from './components/Overview';
import { CatalogManager } from './components/CatalogManager';
import { FleetManager } from './components/FleetManager';
import { KycManager } from './components/KycManager';
import { OrdersManager } from './components/OrdersManager';
import { ServiceAreaManager } from './components/ServiceAreaManager';
import { AuditLogViewer } from './components/AuditLogViewer';
import { disconnectSocket, useSocketStatus } from './api';

export const App: React.FC = () => {
  const { adminUser, logout } = useAdminAuth();
  const live = useSocketStatus(adminUser?.id);
  const [activeTab, setActiveTab] = useState<'overview' | 'catalog' | 'orders' | 'fleet' | 'kyc' | 'serviceAreas' | 'audit'>('overview');

  if (!adminUser) {
    return <AdminLogin />;
  }

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="sidebar-header">
          <span className="brand-icon">🌾</span>
          <div>
            <div className="brand-title">Kisan Kendra</div>
            <div className="brand-sub">Platform Control Tower</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            📊 Overview
          </button>
          <button
            className={`nav-item ${activeTab === 'catalog' ? 'active' : ''}`}
            onClick={() => setActiveTab('catalog')}
          >
            📦 Agri-Input Catalog
          </button>
          <button
            className={`nav-item ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            📋 Orders & Rentals
          </button>
          <button
            className={`nav-item ${activeTab === 'fleet' ? 'active' : ''}`}
            onClick={() => setActiveTab('fleet')}
          >
            🚜 Fleet & Drivers
          </button>
          <button
            className={`nav-item ${activeTab === 'kyc' ? 'active' : ''}`}
            onClick={() => setActiveTab('kyc')}
          >
            📑 KYC & Users
          </button>
          <button
            className={`nav-item ${activeTab === 'serviceAreas' ? 'active' : ''}`}
            onClick={() => setActiveTab('serviceAreas')}
          >
            📍 Service Areas
          </button>
          <button
            className={`nav-item ${activeTab === 'audit' ? 'active' : ''}`}
            onClick={() => setActiveTab('audit')}
          >
            📜 Audit Trail
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile">
            <span className="subrole-badge">{adminUser.adminSubRole || 'SUPER_ADMIN'}</span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>
              {adminUser.name || 'Admin Officer'}
            </span>
            <span className="user-email">{adminUser.email}</span>
          </div>
          <button
            className="logout-button"
            onClick={() => {
              disconnectSocket();
              logout();
            }}
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="admin-main">
        <header className="admin-header">
          <h1 className="page-title">
            {activeTab === 'overview' && 'Platform Overview & Health'}
            {activeTab === 'catalog' && 'Agri-Input Catalog & Inventory'}
            {activeTab === 'orders' && 'Orders Fulfillment & Machinery Rentals'}
            {activeTab === 'fleet' && 'Fleet Telemetry & Dispatch'}
            {activeTab === 'kyc' && 'Machine Owner & Driver KYC Verification'}
            {activeTab === 'serviceAreas' && 'Service Areas & Delivery Fee Matrix'}
            {activeTab === 'audit' && 'Security & Operational Audit Trail'}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className={`badge ${live ? 'badge-success' : 'badge-danger'}`}>
              {live ? '● Live updates connected' : '○ Reconnecting…'}
            </span>
          </div>
        </header>

        <div className="admin-content">
          {activeTab === 'overview' && <Overview />}
          {activeTab === 'catalog' && <CatalogManager />}
          {activeTab === 'orders' && <OrdersManager />}
          {activeTab === 'fleet' && <FleetManager />}
          {activeTab === 'kyc' && <KycManager />}
          {activeTab === 'serviceAreas' && <ServiceAreaManager />}
          {activeTab === 'audit' && <AuditLogViewer />}
        </div>
      </main>
    </div>
  );
};
