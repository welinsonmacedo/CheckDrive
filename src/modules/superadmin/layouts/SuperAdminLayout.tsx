import React from 'react';
import { Outlet } from 'react-router-dom';
import OfflineSyncBanner from '@/src/modules/shared/layouts/OfflineSyncBanner';

export default function SuperAdminLayout() {
  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      <OfflineSyncBanner />
      <main className="flex-1 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}
