import React, { useState, useEffect, createContext, useContext } from "react";
import { supabase } from "@/src/lib/supabase";
import { User, Role } from "@/src/modules/shared/types";

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  isProfileLoading: boolean;
  isAuthenticated: boolean;
  onlineUsers: any[];
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);

  const fetchProfile = async (userId: string, email: string) => {
    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.error("Erro ao buscar profile:", error);
      }

      const rawName = profile?.full_name || email.split("@")[0] || "Usuário";
      const isInternal = rawName.endsWith("//INTERNO");
      const cleanName = isInternal
        ? rawName.replace("//INTERNO", "").trim()
        : rawName;

      let hideAverages = false;
      if (profile?.company_id) {
        try {
          const { data: companyData } = await supabase
            .from("companies")
            .select("plan_name")
            .eq("id", profile.company_id)
            .single();
          if (companyData?.plan_name) {
            hideAverages = companyData.plan_name.split("||").includes("hide_averages");
          }
        } catch (cErr) {
          console.error("Erro ao carregar configurações de média da empresa:", cErr);
        }
      }

      return {
        name: cleanName,
        role: profile?.role as Role || null,
        company_id: profile?.company_id || null,
        isInternal,
        hideAverages,
      };
    } catch (err) {
      console.error("Erro inesperado profile:", err);
      return {
        name: email.split("@")[0] || "Usuário",
        role: null,
        company_id: null,
        isInternal: false,
        hideAverages: false
      };
    }
  };

  useEffect(() => {
    let mounted = true;

    const setUserSafe = (session: any, profile?: any) => {
      if (!mounted) return;

      setUser((prev) => {
        if (prev?.id === session.user.id && !profile) return prev;

        return {
          id: session.user.id,
          email: session.user.email || "",
          name: profile?.name ?? prev?.name ?? "Usuário",
          role: profile?.role ?? prev?.role ?? null,
          company_id: profile?.company_id ?? prev?.company_id ?? null,
          isInternal: profile?.isInternal ?? prev?.isInternal ?? false,
          hideAverages: profile?.hideAverages ?? prev?.hideAverages ?? false,
        };
      });
    };

    const init = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (!mounted) return;

        if (error) {
          console.error("Erro sessão:", error);
          await supabase.auth.signOut().catch(() => {});
          setUser(null);
          setLoading(false);
          setIsProfileLoading(false);
          return;
        }

        const session = data.session;

        if (session) {
          setIsProfileLoading(true);
          setUserSafe(session);

          fetchProfile(session.user.id, session.user.email || "").then((profileInfo) => {
            if (profileInfo && mounted) setUserSafe(session, profileInfo);
            if (mounted) setIsProfileLoading(false);
          });

          // 🔥 Roda rotina automática de fechamento em background
          supabase.rpc("run_auto_score_closing").then(({ error }) => {
            if (error)
              console.error("Erro na rotina de fechamento automático:", error);
          });
        } else {
          if (mounted) setUser(null);
        }

        if (mounted) setLoading(false);
      } catch (err) {
        console.error("Erro crítico auth:", err);
        await supabase.auth.signOut().catch(() => {});

        if (mounted) {
          setUser(null);
          setLoading(false);
          setIsProfileLoading(false);
        }
      }
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT' || !session) {
        setUser(null);
        setLoading(false);
        setIsProfileLoading(false);
        return;
      }

      if (session) {
        setIsProfileLoading(true);
        setUserSafe(session);
        fetchProfile(session.user.id, session.user.email || "").then((profileInfo) => {
          if (profileInfo && mounted) setUserSafe(session, profileInfo);
          if (mounted) setIsProfileLoading(false);
        });
        if (mounted) setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Presence tracking
  useEffect(() => {
    if (!user?.id || !user?.name || !user?.role) return;

    const channel = supabase.channel("online-users", {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      const users: any[] = [];
      Object.values(state).forEach((presences: any) => {
        users.push(...presences);
      });
      const uniqueUsers = Array.from(
        new Map(users.map((u) => [u.user_id, u])).values(),
      );
      setOnlineUsers(uniqueUsers);
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        const presenceStatus = await channel.track({
          user_id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          online_at: new Date().toISOString(),
        });
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, user?.name, user?.role]);

  const logout = async () => {
    await supabase.auth.signOut().catch(() => {});
    setUser(null);
    
    // Security: Clear all offline cache on logout
    try {
      const { deleteDB } = await import('idb');
      await deleteDB('checklog-offline-db');
    } catch (e) {
      console.warn("Failed to delete offline DB on logout:", e);
    }
  };

  const refreshProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsProfileLoading(true);
        const profileInfo = await fetchProfile(session.user.id, session.user.email || "");
        if (profileInfo) {
          setUser({
            id: session.user.id,
            email: session.user.email || "",
            name: profileInfo.name,
            role: profileInfo.role,
            company_id: profileInfo.company_id,
            isInternal: profileInfo.isInternal,
            hideAverages: profileInfo.hideAverages,
          });
        }
        setIsProfileLoading(false);
      }
    } catch (err) {
      console.error("Erro ao atualizar profile:", err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isProfileLoading,
        isAuthenticated: !!user,
        onlineUsers,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
