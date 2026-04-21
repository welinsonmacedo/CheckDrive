import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate]);

  // Listen to auth state changes directly to trap "profile missing" errors 
  // since AuthContext eats the null result.
  useEffect(() => {
    let sub: any;
    const checkState = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && !authLoading && !isAuthenticated) {
        // They have a valid Supabase auth session, but no profile was found!
        setError('Perfil não encontrado. Contate o administrador do sistema.');
        setLoading(false);
      }
    };
    checkState();
    return () => {};
  }, [authLoading, isAuthenticated]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError('E-mail ou senha inválidos.');
      setLoading(false);
    } else if (!data.user) {
      setError('Falha ao autenticar.');
      setLoading(false);
    }
    // We do NOT navigate immediately here. We wait for AuthContext's onAuthStateChange
    // to fetch the profile and set isAuthenticated to true.
    // The useEffect will then navigate to '/'.
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
              disabled={loading}
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
