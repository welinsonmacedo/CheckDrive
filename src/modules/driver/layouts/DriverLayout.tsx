import React, { useState, useEffect } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { Home, Trophy, AlertTriangle, User as UserIcon, Droplets, Bell } from 'lucide-react';
import { useAuth } from '@/src/modules/shared/contexts/AuthContext';
import { supabase } from '@/src/lib/supabase';
import localforage from 'localforage';

export default function DriverLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const [unviewedCount, setUnviewedCount] = useState(0);

  const fetchUnviewedPointsCount = async () => {
    try {
      if (!user?.id) return;
      const { data: logs } = await supabase
        .from('audit_logs')
        .select('id')
        .eq('driver_id', user.id);
      
      if (!logs) return;

      // Limpar cache e memória persistente no reload/abertura do app para motoristas
      // localforage.clear().catch(console.error); // Retirado localforage.clear para não apagar o badge de notificacoes

      const stored = localStorage.getItem(`viewed_point_log_ids_${user.id}`);
      const viewedIds: string[] = stored ? JSON.parse(stored) : [];
      
      const unviewedLogs = logs.filter(log => !viewedIds.includes(log.id));
      setUnviewedCount(unviewedLogs.length);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchUnviewedPointsCount();

    window.addEventListener('notifications_read', fetchUnviewedPointsCount);
    return () => {
      window.removeEventListener('notifications_read', fetchUnviewedPointsCount);
    };
  }, [user?.id]);

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">

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

          {/* Hiding remaining items as requested
          {!user?.isInternal && (
            <Link
              to="/driver/ranking"
              ...
            />
          )}
          */}

        </nav>
      )}
    </div>
  );
}
