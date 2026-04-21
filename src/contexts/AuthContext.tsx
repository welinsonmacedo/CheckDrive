import React, { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '../lib/supabase';
import { User, Role } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 🔥 busca profile (não bloqueia UI)
  const fetchProfile = async (userId: string, email: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Erro ao buscar profile:', error);
        return null;
      }

      if (!profile) return null;

      const rawName = profile.full_name || email.split('@')[0];
      const isInternal = rawName.endsWith('//INTERNO');
      const cleanName = isInternal
        ? rawName.replace('//INTERNO', '').trim()
        : rawName;

      return {
        name: cleanName,
        role: profile.role as Role,
        isInternal
      };
    } catch (err) {
      console.error('Erro inesperado profile:', err);
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;

    // 🔥 setter seguro (não sobrescreve role errado)
    const setUserSafe = (session: any, profile?: any) => {
      if (!mounted) return;

      setUser(prev => {
        if (prev?.id === session.user.id && !profile) return prev;

        return {
          id: session.user.id,
          email: session.user.email || '',
          name: profile?.name ?? prev?.name ?? 'Usuário',

          // 🔥 NÃO define role até ter profile
          role: profile?.role ?? prev?.role ?? null,

          isInternal: profile?.isInternal ?? prev?.isInternal ?? false
        };
      });
    };

    const init = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (!mounted) return;

        if (error) {
          console.error('Erro sessão:', error);
          await supabase.auth.signOut();
          setUser(null);
          setLoading(false);
          return;
        }

        const session = data.session;

        if (session) {
          // 🔥 seta usuário imediato (sem travar)
          setUserSafe(session);

          // 🔥 carrega profile em background
          fetchProfile(session.user.id, session.user.email || '')
            .then(profile => {
              if (profile) setUserSafe(session, profile);
            });
        } else {
          setUser(null);
        }

        setLoading(false);
      } catch (err) {
        console.error('Erro crítico auth:', err);
        await supabase.auth.signOut();

        if (mounted) {
          setUser(null);
          setLoading(false);
        }
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_, session) => {
        if (!mounted) return;

        if (session) {
          setUserSafe(session);

          fetchProfile(session.user.id, session.user.email || '')
            .then(profile => {
              if (profile) setUserSafe(session, profile);
            });
        } else {
          setUser(null);
        }

        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};