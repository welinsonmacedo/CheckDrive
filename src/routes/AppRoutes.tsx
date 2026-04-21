import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';

// Pages
import Login from '../pages/Login';
import DriverHome from '../pages/DriverHome';
import Ranking from '../pages/Ranking';
import ChecklistFlow from '../pages/ChecklistFlow';
import AdminDashboard from '../pages/AdminDashboard';
import Documentation from '../pages/Documentation';
import AppLayout from '../components/layout/AppLayout';

export default function AppRoutes() {
  const { user, logout } = useAuth();
  
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      <Route path="/" element={
        <ProtectedRoute>
          <AppLayout user={user} onLogout={logout}>
            {user?.role === 'admin' ? <AdminDashboard /> : <DriverHome />}
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
      
      <Route path="/docs" element={
        <ProtectedRoute>
           <AppLayout user={user} onLogout={logout}>
             <Documentation />
           </AppLayout>
        </ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
