import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import SuperAdminDashboard from '../pages/SuperAdminDashboard';
import SuperAdminLayout from '../layouts/SuperAdminLayout';

export default function SuperAdminRoutes() {
  return (
    <Routes>
      <Route element={<SuperAdminLayout />}>
        <Route path="dashboard" element={<SuperAdminDashboard />} />
        <Route path="companies" element={<Navigate to="dashboard" replace />} />
        <Route path="plans" element={<Navigate to="dashboard" replace />} />
        <Route path="users" element={<Navigate to="dashboard" replace />} />
        <Route path="settings" element={<Navigate to="dashboard" replace />} />
      </Route>
    </Routes>
  );
}
