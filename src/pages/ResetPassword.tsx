import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Lock, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Check if the user is actually in a recovery session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Look in hash for type=recovery just in case we are still processing
        if (window.location.hash.includes('type=recovery')) {
           return;
        }
        alert('Sessão de recuperação inválida ou expirada.');
        navigate('/');
      }
    };
    checkSession();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (password !== confirmPassword) {
      setErrorMsg('As senhas não coincidem.');
      return;
    }
    
    if (password.length < 6) {
      setErrorMsg('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;
      
      setSuccessMsg('Senha atualizada com sucesso!');
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (error: any) {
      console.error('Error updating password:', error);
      setErrorMsg('Erro ao atualizar senha. ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
        <div className="text-center mb-8">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Lock className="text-primary" size={24} />
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Redefinir Senha</h1>
          <p className="text-sm text-gray-500 mt-2">Digite sua nova senha para acessar o sistema.</p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm font-semibold text-center border border-red-100">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-50 text-emerald-600 rounded-xl text-sm font-semibold text-center border border-emerald-100">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nova Senha</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full h-12 px-4 pr-12 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-900 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                placeholder="Mínimo 6 caracteres"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Confirmar Nova Senha</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full h-12 px-4 pr-12 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-900 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                placeholder="Repita a senha"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 mt-4"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Atualizar Senha'}
          </button>
        </form>
      </div>
    </div>
  );
}
