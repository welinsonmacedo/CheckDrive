import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminDashboard from '../pages/AdminDashboard';
import CompanyLayout from '../layouts/CompanyLayout';

export default function CompanyRoutes() {
  return (
    <Routes>
      <Route element={<CompanyLayout />}>
        <Route path="dashboard" element={<AdminDashboard />} />
        {/* The other routes requested by user actually correspond to the tabs inside AdminDashboard right now */}
        {/* We keep AdminDashboard for now, but redirect specific paths to it for future splitting */}
        <Route path="reports" element={<Navigate to="dashboard" replace />} />
        <Route path="drivers" element={<Navigate to="dashboard" replace />} />
        <Route path="vehicles" element={<Navigate to="dashboard" replace />} />
        <Route path="maintenance" element={<Navigate to="dashboard" replace />} />
        <Route path="schedules" element={<Navigate to="dashboard" replace />} />
        <Route path="settings" element={<Navigate to="dashboard" replace />} />
      </Route>
    </Routes>
  );
}
