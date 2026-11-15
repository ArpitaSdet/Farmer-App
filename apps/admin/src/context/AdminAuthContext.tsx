import React, { createContext, useContext, useState, useEffect } from 'react';

export type AdminSubRole = 'SUPER_ADMIN' | 'CATALOG' | 'OPERATIONS' | 'SUPPORT' | 'FINANCE';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN';
  adminSubRole: AdminSubRole;
}

interface AdminAuthContextType {
  adminUser: AdminUser | null;
  token: string | null;
  login: (email: string, password: string, totpToken?: string) => Promise<void>;
  logout: () => void;
  hasPermission: (allowedSubRoles: AdminSubRole[]) => boolean;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(() => {
    const saved = localStorage.getItem('krishi_admin_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('krishi_admin_token');
  });

  const login = async (email: string, password: string, totpToken?: string) => {
    const response = await fetch('/api/v1/auth/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, totpToken }),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data?.error?.message || data.message || 'Admin authentication failed');
    }

    const { user } = data.data;
    const accessToken = data.data.tokens?.accessToken || data.data.accessToken;
    setToken(accessToken);
    setAdminUser(user);
    localStorage.setItem('krishi_admin_token', accessToken);
    localStorage.setItem('krishi_admin_user', JSON.stringify(user));
  };

  const logout = () => {
    setToken(null);
    setAdminUser(null);
    localStorage.removeItem('krishi_admin_token');
    localStorage.removeItem('krishi_admin_user');
  };

  const hasPermission = (allowedSubRoles: AdminSubRole[]) => {
    if (!adminUser) return false;
    if (adminUser.adminSubRole === 'SUPER_ADMIN') return true;
    return allowedSubRoles.includes(adminUser.adminSubRole);
  };

  return (
    <AdminAuthContext.Provider value={{ adminUser, token, login, logout, hasPermission }}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};
