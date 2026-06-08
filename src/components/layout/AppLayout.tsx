import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BookOpen, LogOut, Home, Trophy, AlertTriangle, User as UserIcon, Droplets, Building } from 'lucide-react';
import { User } from '../../types';
import OfflineSyncBanner from './OfflineSyncBanner';

interface AppLayoutProps {
  children: React.ReactNode;
  user: User | null;
  onLogout: () => void;
}

export default function AppLayout({ children, user, onLogout }: AppLayoutProps) {
  const location = useLocation();
  const isDriver = user?.role === 'driver';

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      <OfflineSyncBanner />

    

      <main className={`flex-1 overflow-x-hidden ${isDriver && !location.pathname.includes('/checklist') ? 'pb-24 sm:pb-0' : ''}`}>
        {children}
      </main>

      {/* Bottom Navigation for Drivers */}
      {isDriver && !location.pathname.includes('/checklist') && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200 h-[84px] pb-8 pt-1 flex items-center justify-around z-50 sm:hidden pb-safe">

          <Link
            to="/dashboard"
            className={`flex flex-col items-center gap-1 transition-colors ${
              location.pathname === '/dashboard' ? 'text-primary' : 'text-zinc-400'
            }`}
          >
            <Home size={20} />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Início
            </span>
          </Link>

          {!user?.isInternal && !user?.hideAverages && (
            <Link
              to="/medias"
              className={`flex flex-col items-center gap-1 transition-colors ${
                location.pathname === '/medias' ? 'text-primary' : 'text-zinc-400'
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
              to="/ranking"
              className={`flex flex-col items-center gap-1 transition-colors ${
                location.pathname === '/ranking' ? 'text-primary' : 'text-zinc-400'
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
              to="/penalties"
              className={`flex flex-col items-center gap-1 transition-colors ${
                location.pathname === '/penalties' ? 'text-primary' : 'text-zinc-400'
              }`}
            >
              <AlertTriangle size={20} />
              <span className="text-[10px] font-bold uppercase tracking-wider">
                Descontos
              </span>
            </Link>
          )}

          <Link
            to="/profile"
            className={`flex flex-col items-center gap-1 transition-colors ${
              location.pathname === '/profile' ? 'text-primary' : 'text-zinc-400'
            }`}
          >
            <UserIcon size={20} />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Perfil
            </span>
          </Link>

          {user?.role === 'superadmin' && (
            <Link
              to="/saas"
              className={`flex flex-col items-center gap-1 transition-colors ${
                location.pathname === '/saas' ? 'text-primary' : 'text-zinc-400'
              }`}
            >
              <Building size={20} />
              <span className="text-[10px] font-bold uppercase tracking-wider">
                SaaS
              </span>
            </Link>
          )}

        </nav>
      )}

    </div>
  );
}