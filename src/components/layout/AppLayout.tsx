import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BookOpen, LogOut, Home, Trophy } from 'lucide-react';
import { User } from '../../types';

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

    

      <main className={`flex-1 overflow-x-hidden ${isDriver && !location.pathname.includes('/checklist') ? 'pb-20 sm:pb-0' : ''}`}>
        {children}
      </main>

      {/* Bottom Navigation for Drivers */}
      {isDriver && !location.pathname.includes('/checklist') && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200 h-16 flex items-center justify-around z-50 sm:hidden">

          <Link
            to="/"
            className={`flex flex-col items-center gap-1 transition-colors ${
              location.pathname === '/' ? 'text-primary' : 'text-zinc-400'
            }`}
          >
            <Home size={20} />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Início
            </span>
          </Link>

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

          <button
            onClick={onLogout}
            className="flex flex-col items-center gap-1 text-zinc-400"
          >
            <LogOut size={20} />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Sair
            </span>
          </button>

        </nav>
      )}

    </div>
  );
}