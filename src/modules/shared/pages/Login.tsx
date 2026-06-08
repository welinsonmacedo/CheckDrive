import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/modules/shared/contexts/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      if (user?.role === 'superadmin') {
        navigate('/saas', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, authLoading, navigate, user]);

  useEffect(() => {
    let sub: any;
    const checkState = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && !authLoading && !isAuthenticated) {
        setError('Perfil não encontrado. Contate o administrador do sistema.');
        setLoading(false);
      }
    };
    checkState();
    return () => {};
  }, [authLoading, isAuthenticated]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (lockedUntil && Date.now() < lockedUntil) {
      const waitSeconds = Math.ceil((lockedUntil - Date.now()) / 1000);
      setError(`Muitas tentativas. Aguarde ${waitSeconds} segundos.`);
      return;
    }

    setLoading(true);
    setError(null);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const newAttempts = loginAttempts + 1;
      setLoginAttempts(newAttempts);
      if (newAttempts >= 5) {
        setLockedUntil(Date.now() + 60000); // lock for 1 minute
        setError('Muitas tentativas falsas. Acesso bloqueado por 1 minuto.');
      } else {
        setError('E-mail ou senha inválidos.');
      }
      setLoading(false);
    } else if (!data.user) {
      setError('Falha ao autenticar.');
      setLoading(false);
    } else {
      setLoginAttempts(0);
      setLockedUntil(null);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-zinc-200">
        <div className="p-8">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 mb-2 italic">CheckDrive</h1>
            <p className="text-zinc-500 text-sm italic font-bold uppercase tracking-widest">Gestão de Frotas</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && <div className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-lg border border-red-100">{error}</div>}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">E-mail</label>
              <input
                type="email"
                required
                className="w-full h-12 px-4 rounded-xl border border-zinc-100 bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-zinc-900 outline-none transition-all font-bold text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Senha</label>
              <input
                type="password"
                required
                className="w-full h-12 px-4 rounded-xl border border-zinc-100 bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-zinc-900 outline-none transition-all font-bold text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={loading || (lockedUntil !== null && Date.now() < lockedUntil)}
              className="w-full h-14 bg-zinc-900 text-zinc-50 font-black text-xs uppercase tracking-[0.2em] rounded-2xl hover:opacity-90 transition-all mt-4 disabled:opacity-50"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}