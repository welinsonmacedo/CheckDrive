import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/src/modules/shared/contexts/AuthContext';
import { DriverGuard, CompanyGuard, SuperAdminGuard } from '@/src/modules/shared/components/auth/Guards';
import { ProtectedRoute } from '@/src/modules/shared/components/auth/ProtectedRoute';

// Pages
import LandingPage from '@/src/modules/shared/pages/LandingPage';
import Privacy from '@/src/modules/shared/pages/Privacy';
import Login from '@/src/modules/shared/pages/Login';
import ResetPassword from '@/src/modules/shared/pages/ResetPassword';
import Documentation from '@/src/modules/shared/pages/Documentation';

// Module Routes
import DriverRoutes from '@/src/modules/driver/routes/DriverRoutes';
import CompanyRoutes from '@/src/modules/company/routes/CompanyRoutes';
import SuperAdminRoutes from '@/src/modules/superadmin/routes/SuperAdminRoutes';
import AppLayout from '@/src/modules/shared/layouts/AppLayout';

export default function AppRoutes() {
  const { user, logout } = useAuth();
  
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      
      {/* Module independent root routes */}
      <Route path="/driver/*" element={
        <DriverGuard>
          <DriverRoutes />
        </DriverGuard>
      } />
      
      <Route path="/admin/*" element={
        <CompanyGuard>
          <CompanyRoutes />
        </CompanyGuard>
      } />
      
      <Route path="/sa/*" element={
        <SuperAdminGuard>
          <SuperAdminRoutes />
        </SuperAdminGuard>
      } />

      <Route path="/docs" element={
        <ProtectedRoute>
          <AppLayout user={user} onLogout={logout}>
            <Documentation />
          </AppLayout>
        </ProtectedRoute>
      } />

      {/* Backward Compatibility Redirects */}
      <Route path="/dashboard" element={<RouteRedirector />} />
      <Route path="/saas" element={<Navigate to="/sa/dashboard" replace />} />
      
      <Route path="/checklist/:type" element={<ChecklistRedirector />} />
      <Route path="/ranking" element={<Navigate to="/driver/ranking" replace />} />
      <Route path="/medias" element={<Navigate to="/driver/history" replace />} />
      <Route path="/penalties" element={<Navigate to="/driver/penalties" replace />} />
      <Route path="/driver-manual" element={<Navigate to="/driver/manual" replace />} />
      <Route path="/profile" element={<Navigate to="/driver/profile" replace />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// Internal helper for resolving legacy /checklist/:type 
import { useParams } from 'react-router-dom';
function ChecklistRedirector() {
  const { type } = useParams();
  // Keep the url search params too
  const search = window.location.search;
  return <Navigate to={`/driver/checklist/${type}${search}`} replace />;
}

// Internal helper for resolving legacy /dashboard route dynamically based on role
function RouteRedirector() {
  const { user, loading, isAuthenticated } = useAuth();
  if (loading) return null;
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;

  if (user.role === 'superadmin') {
    return user.company_id ? <Navigate to="/admin/dashboard" replace /> : <Navigate to="/sa/dashboard" replace />;
  }
  
  if (user.role === 'admin' || user.role === 'standard') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <Navigate to="/driver/home" replace />;
}

