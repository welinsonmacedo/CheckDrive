import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/src/modules/shared/contexts/AuthContext';

export function DriverGuard({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, loading, isProfileLoading } = useAuth();

  if (loading || isProfileLoading) return null;
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;

  if (user.role === 'superadmin') {
    return <Navigate to="/sa/dashboard" replace />;
  }
  if (user.role === 'admin' || user.role === 'standard') {
    // allowed
  }

  return <>{children}</>;
}

export function CompanyGuard({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, loading, isProfileLoading } = useAuth();

  if (loading || isProfileLoading) return null;
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;

  if (user.role === 'driver') return <Navigate to="/driver/home" replace />;
  
  if (user.role === 'superadmin' && !user.company_id) {
    return <Navigate to="/sa/dashboard" replace />;
  }

  return <>{children}</>;
}

export function SuperAdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, loading, isProfileLoading } = useAuth();

  if (loading || isProfileLoading) return null;
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;

  if (user.role !== 'superadmin') {
    if (user.role === 'driver') return <Navigate to="/driver/home" replace />;
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <>{children}</>;
}
