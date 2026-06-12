import React from 'react';
import { Outlet } from 'react-router-dom';

export default function CompanyLayout() {
  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      <main className="flex-1 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}
