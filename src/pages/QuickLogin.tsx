import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/modules/shared/contexts/AuthContext';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function QuickLogin() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [status, setStatus] = useState('Verificando link de acesso...');
  const [error, setError] = useState(false);

  useEffect(() => {
    const handleLogin = async () => {
      try {
        const e = searchParams.get('e');
        const p = searchParams.get('p');
        const s = searchParams.get('s');

        if (!e || !p) {
          throw new Error('Link inválido ou malformado.');
        }

        setStatus('Autenticando motorista...');
        
        // Log out first if already logged in with another account
        if (user && user.email !== e) {
          await supabase.auth.signOut();
        }

        const { error: authError } = await supabase.auth.signInWithPassword({
          email: e,
          password: p,
        });

        if (authError) {
          throw new Error('Não foi possível autenticar. Credenciais inválidas ou link expirado.');
        }

        // Validate 24h expiration after login so RLS allows reading the schedule
        if (s) {
          const { data: schedule } = await supabase
            .from('schedules')
            .select('start_at')
            .eq('id', s)
            .single();
            
          if (schedule) {
            const startAt = new Date(schedule.start_at).getTime();
            const now = Date.now();
            if (now - startAt > 24 * 60 * 60 * 1000) {
              await supabase.auth.signOut();
              throw new Error('Este link de acesso expirou (válido por 24 horas após o início da escala).');
            }
          }
        }

        setStatus('Acesso concedido. Redirecionando...');
        
        // Timeout to allow the session to settle
        setTimeout(() => {
          if (s) {
            navigate(`/driver/checklist/start?schedule=${s}`);
          } else {
            navigate('/driver/home');
          }
        }, 1000);

      } catch (err: any) {
        console.error(err);
        setError(true);
        setStatus(err.message || 'Ocorreu um erro ao acessar o link.');
      }
    };

    handleLogin();
  }, [searchParams, navigate, user]);

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center">
        {error ? (
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle size={32} className="text-red-500" />
            </div>
            <h1 className="text-xl font-bold text-zinc-900 mb-2">Acesso Negado</h1>
            <p className="text-sm text-zinc-500 mb-6">{status}</p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-2 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors"
            >
              Ir para Tela de Login
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 animate-pulse">
              <CheckCircle2 size={32} className="text-primary" />
            </div>
            <h1 className="text-xl font-bold text-zinc-900 mb-2">Acessando...</h1>
            <p className="text-sm text-zinc-500">{status}</p>
          </div>
        )}
      </div>
    </div>
  );
}
