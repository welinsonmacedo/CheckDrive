import React from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { Home, Trophy, AlertTriangle, User as UserIcon, Droplets, Bell } from 'lucide-react';
import { useAuth } from '@/src/modules/shared/contexts/AuthContext';
import OfflineSyncBanner from '@/src/modules/shared/layouts/OfflineSyncBanner';

export default function DriverLayout() {
  const { user } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      <OfflineSyncBanner />

      <main className={`flex-1 overflow-x-hidden ${!location.pathname.includes('/checklist') ? 'pb-24 sm:pb-0' : ''}`}>
        <Outlet />
      </main>

      {/* Bottom Navigation for Drivers */}
      {!location.pathname.includes('/checklist') && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200 h-[84px] pb-8 pt-1 flex items-center justify-around z-50 sm:hidden pb-safe">

          <Link
            to="/driver/home"
            className={`flex flex-col items-center gap-1 transition-colors ${
              location.pathname.includes('/driver/home') ? 'text-primary' : 'text-zinc-400'
            }`}
          >
            <Home size={20} />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Início
            </span>
          </Link>

          {!user?.isInternal && !user?.hideAverages && (
            <Link
              to="/driver/history"
              className={`flex flex-col items-center gap-1 transition-colors ${
                location.pathname.includes('/driver/history') ? 'text-primary' : 'text-zinc-400'
              }`}
            >
              <Droplets size={20} />
              <span className="text-[10px] font-bold uppercase tracking-wider">
                Médias
              </span>
            </Link>
          )}

          {!user?.isInternal && (
            <Link
              to="/driver/ranking"
              className={`flex flex-col items-center gap-1 transition-colors ${
                location.pathname.includes('/driver/ranking') ? 'text-primary' : 'text-zinc-400'
              }`}
            >
              <Trophy size={20} />
              <span className="text-[10px] font-bold uppercase tracking-wider">
                Ranking
              </span>
            </Link>
          )}

          {!user?.isInternal && (
            <Link
              to="/driver/penalties"
              className={`flex flex-col items-center gap-1 transition-colors ${
                location.pathname.includes('/driver/penalties') ? 'text-primary' : 'text-zinc-400'
              }`}
            >
              <AlertTriangle size={20} />
              <span className="text-[10px] font-bold uppercase tracking-wider">
                Descontos
              </span>
            </Link>
          )}

          <Link
            to="/driver/notifications"
            className={`flex flex-col items-center gap-1 transition-colors ${
              location.pathname.includes('/driver/notifications') ? 'text-primary' : 'text-zinc-400'
            }`}
          >
            <Bell size={20} />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Alertas
            </span>
          </Link>

          <Link
            to="/driver/profile"
            className={`flex flex-col items-center gap-1 transition-colors ${
              location.pathname.includes('/driver/profile') ? 'text-primary' : 'text-zinc-400'
            }`}
          >
            <UserIcon size={20} />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Perfil
            </span>
          </Link>

        </nav>
      )}
    </div>
  );
}
