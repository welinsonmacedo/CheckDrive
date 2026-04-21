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

      <header className="h-16 px-6 bg-white border-b border-zinc-200 flex items-center justify-between sticky top-0 z-40">

        <div className="flex items-center gap-3">
          <Link to="/" className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center cursor-pointer">
            <span className="text-white font-black text-xs">CD</span>
          </Link>

          <span className="font-bold text-lg hidden sm:block">
            CheckDrive
          </span>
        </div>

        <div className="flex items-center gap-4">

          {/* DOCS APENAS PARA ADMIN */}
          {!isDriver && (
            <Link
              to="/docs"
              className="text-zinc-500 hover:text-primary transition-colors flex items-center gap-1.5"
              title="Documentação"
            >
              <BookOpen size={18} />
              <span className="text-xs font-bold uppercase tracking-wider hidden sm:block">
                Docs
              </span>
            </Link>
          )}

          <div className="hidden sm:block w-px h-8 bg-app-border mx-2"></div>

          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-zinc-900">
              {user?.name}
            </p>

            <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">
              {user?.role === 'admin' ? 'Administrador' : 'Motorista'}
            </p>
          </div>

          <button
            onClick={onLogout}
            className="p-2 hover:bg-zinc-100 rounded-full transition-colors hidden sm:block text-zinc-500 hover:text-danger"
            title="Sair"
          >
            <LogOut size={20} />
          </button>

        </div>
      </header>

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