import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/src/modules/shared/contexts/AuthContext';

export function DriverGuard({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) return null;
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;

  // Driver can be driver, or even standard/admin if they are simulating or acting as driver, 
  // but mostly driver. If a user is not authorized here, they go to their respective home.
  // Actually, anyone could theoretically access driver mode except superadmin? 
  // Let's keep it simple: if you are logged in, you should be a driver to access /driver.
  // Wait, some roles might be 'standard' and also be drivers. 
  if (user.role === 'superadmin') {
    return <Navigate to="/sa/dashboard" replace />;
  }
  if (user.role === 'admin' || user.role === 'standard') {
    // If they want to access driver routes, allowed? Currently yes. We let them.
  }

  return <>{children}</>;
}

export function CompanyGuard({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) return null;
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;

  if (user.role === 'driver') return <Navigate to="/driver/home" replace />;
  
  if (user.role === 'superadmin' && !user.company_id) {
    return <Navigate to="/sa/dashboard" replace />;
  }

  return <>{children}</>;
}

export function SuperAdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) return null;
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;

  if (user.role !== 'superadmin') {
    if (user.role === 'driver') return <Navigate to="/driver/home" replace />;
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <>{children}</>;
}
