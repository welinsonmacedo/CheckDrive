import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      if (user?.role === 'superadmin') {
        navigate('/saas', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, authLoading, navigate, user]);

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

    let authEmail = loginId.trim();

    // Se o usuário não digitou um "@", vamos assumir que pode ser um CPF
    if (!authEmail.includes('@')) {
      const digitsOnly = authEmail.replace(/\D/g, '');
      
      // Busca pelo CPF exato digitado ou apenas os dígitos
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('email')
        .or(`cpf.eq.${authEmail},cpf.eq.${digitsOnly}`)
        .limit(1);

      if (profileData && profileData.length > 0) {
        authEmail = profileData[0].email;
      } else {
        setError('CPF não encontrado ou e-mail inválido.');
        setLoading(false);
        return;
      }
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email: authEmail, password });
    if (error) {
      setError('Credenciais inválidas.');
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
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">E-mail ou CPF</label>
              <input
                type="text"
                required
                className="w-full h-12 px-4 rounded-xl border border-zinc-100 bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-zinc-900 outline-none transition-all font-bold text-sm"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
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