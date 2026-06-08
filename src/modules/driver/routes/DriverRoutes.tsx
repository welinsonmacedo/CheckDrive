import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DriverHome from '../pages/DriverHome';
import DriverManual from '../pages/DriverManual';
import Ranking from '../pages/Ranking';
import ChecklistFlow from '../pages/ChecklistFlow';
import DriverPenalties from '../pages/DriverPenalties';
import DriverProfile from '../pages/DriverProfile';
import DriverAverages from '../pages/DriverAverages';
import DriverLayout from '../layouts/DriverLayout';

export default function DriverRoutes() {
  return (
    <Routes>
      <Route element={<DriverLayout />}>
        <Route path="home" element={<DriverHome />} />
        <Route path="checklist/:type" element={<ChecklistFlow />} />
        <Route path="history" element={<DriverAverages />} />
        <Route path="ranking" element={<Ranking />} />
        <Route path="penalties" element={<DriverPenalties />} />
        <Route path="manual" element={<DriverManual />} />
        <Route path="profile" element={<DriverProfile />} />
        <Route path="schedule" element={<Navigate to="home" replace />} /> {/* Placeholder */}
        <Route path="fuel" element={<Navigate to="home" replace />} /> {/* Placeholder */}
      </Route>
    </Routes>
  );
}
