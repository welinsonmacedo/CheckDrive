const fs = require('fs');
const file = 'src/modules/driver/layouts/DriverLayout.tsx';
let code = fs.readFileSync(file, 'utf8');

// The bottom nav has many items commented out. Let's restore them and add a desktop header.
const replacement = `import React, { useState, useEffect } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { Home, Trophy, AlertTriangle, User as UserIcon, Droplets, Bell, FileText, Menu, X } from 'lucide-react';
import { useAuth } from '@/src/modules/shared/contexts/AuthContext';
import { supabase } from '@/src/lib/supabase';
import localforage from 'localforage';

export default function DriverLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const [unviewedCount, setUnviewedCount] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const fetchUnviewedPointsCount = async () => {
    try {
      if (!user?.id) return;
      const { data: logs } = await supabase
        .from('audit_logs')
        .select('id')
        .eq('driver_id', user.id);
      
      if (!logs) return;
      
      const stored = localStorage.getItem(\`viewed_point_log_ids_\${user.id}\`);
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

  const navItems = [
    { to: "/driver/home", icon: Home, label: "Início" },
    ...(!user?.isInternal && !user?.hideAverages ? [{ to: "/driver/history", icon: Droplets, label: "Médias" }] : []),
    ...(!user?.isInternal ? [{ to: "/driver/ranking", icon: Trophy, label: "Ranking" }] : []),
    { to: "/driver/penalties", icon: AlertTriangle, label: "Avisos" },
    { to: "/driver/notifications", icon: Bell, label: "Notificações", badge: unviewedCount },
    { to: "/driver/profile", icon: UserIcon, label: "Perfil" }
  ];

  const isChecklistRoute = location.pathname.includes('/checklist');

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      {/* Desktop Header */}
      {!isChecklistRoute && (
        <header className="hidden sm:flex bg-white border-b border-zinc-200 h-16 items-center px-8 justify-between sticky top-0 z-50">
          <div className="font-bold text-xl text-primary">CheckDrive</div>
          <nav className="flex items-center gap-6">
            {navItems.map(item => (
              <Link
                key={item.to}
                to={item.to}
                className={\`flex items-center gap-2 transition-colors font-semibold text-sm \${
                  location.pathname.includes(item.to) ? 'text-primary' : 'text-zinc-500 hover:text-zinc-800'
                }\`}
              >
                <item.icon size={18} />
                <span>{item.label}</span>
                {item.badge ? (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            ))}
          </nav>
        </header>
      )}

      <main className={\`flex-1 overflow-x-hidden \${!isChecklistRoute ? 'pb-24 sm:pb-8' : ''}\`}>
        <Outlet />
      </main>

      {/* Bottom Navigation for Mobile */}
      {!isChecklistRoute && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200 h-[84px] pb-8 pt-2 flex items-center justify-around z-50 sm:hidden pb-safe">
          {navItems.slice(0, 5).map(item => (
            <Link
              key={item.to}
              to={item.to}
              className={\`flex flex-col items-center gap-1 transition-colors relative \${
                location.pathname.includes(item.to) ? 'text-primary' : 'text-zinc-400'
              }\`}
            >
              <item.icon size={22} />
              <span className="text-[10px] font-bold uppercase tracking-wider">
                {item.label}
              </span>
              {item.badge ? (
                <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                  {item.badge}
                </span>
              ) : null}
            </Link>
          ))}
          {/* Menu Hambúrguer para o que não couber (ex: Perfil) */}
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="flex flex-col items-center gap-1 transition-colors text-zinc-400"
          >
            <Menu size={22} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Mais</span>
          </button>
        </nav>
      )}

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[60] flex sm:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-64 bg-white shadow-2xl flex flex-col transform transition-transform animate-fade-in">
            <div className="flex justify-between items-center p-4 border-b border-zinc-100">
              <span className="font-bold text-zinc-900">Menu</span>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-zinc-500">
                <X size={20} />
              </button>
            </div>
            <div className="flex flex-col p-4 gap-4">
              {navItems.map(item => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={\`flex items-center gap-3 p-3 rounded-xl \${
                    location.pathname.includes(item.to) ? 'bg-primary/10 text-primary font-bold' : 'text-zinc-600 font-medium'
                  }\`}
                >
                  <item.icon size={20} />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
`;

fs.writeFileSync(file, replacement);
