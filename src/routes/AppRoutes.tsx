import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';

// Pages
import LandingPage from '../pages/LandingPage';
import Privacy from '../pages/Privacy';
import Login from '../pages/Login';
import DriverHome from '../pages/DriverHome';
import DriverManual from '../pages/DriverManual';
import Ranking from '../pages/Ranking';
import ChecklistFlow from '../pages/ChecklistFlow';
import AdminDashboard from '../pages/AdminDashboard';
import Documentation from '../pages/Documentation';
import AppLayout from '../components/layout/AppLayout';
import ResetPassword from '../pages/ResetPassword';

import DriverRankingDetailsModal from '../components/admin/DriverRankingDetailsModal'; // if unused, doesn't matter
import DriverPenalties from '../pages/DriverPenalties';
import DriverProfile from '../pages/DriverProfile';
import DriverAverages from '../pages/DriverAverages';

export default function AppRoutes() {
  const { user, logout } = useAuth();
  
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <AppLayout user={user} onLogout={logout}>
            {(user?.role === 'admin' || user?.role === 'standard') ? <AdminDashboard /> : <DriverHome />}
          </AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/checklist/:type" element={
        <ProtectedRoute role="driver">
          <AppLayout user={user} onLogout={logout}>
            <ChecklistFlow />
          </AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/ranking" element={
        <ProtectedRoute role="driver">
          <AppLayout user={user} onLogout={logout}>
            <Ranking />
          </AppLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/medias" element={
        <ProtectedRoute role="driver">
          <AppLayout user={user} onLogout={logout}>
            <DriverAverages />
          </AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/penalties" element={
        <ProtectedRoute role="driver">
          <AppLayout user={user} onLogout={logout}>
            <DriverPenalties />
          </AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/driver-manual" element={
        <ProtectedRoute role="driver">
          <AppLayout user={user} onLogout={logout}>
            <DriverManual />
          </AppLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/docs" element={
        <ProtectedRoute>
           <AppLayout user={user} onLogout={logout}>
             <Documentation />
           </AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/profile" element={
        <ProtectedRoute role="driver">
          <AppLayout user={user} onLogout={logout}>
            <DriverProfile />
          </AppLayout>
        </ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
