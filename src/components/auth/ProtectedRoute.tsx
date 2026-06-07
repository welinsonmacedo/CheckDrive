import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { Role } from "../../types";

interface ProtectedRouteProps {
  children: React.ReactNode;
  role?: Role;
}

export const ProtectedRoute = ({ children, role }: ProtectedRouteProps) => {
  const { user, isAuthenticated, loading } = useAuth();

  const isProfileLoading = isAuthenticated && !user?.role;

  if (loading || isProfileLoading)
    return (
      <div className="fixed inset-0 min-h-screen flex flex-col items-center justify-center bg-zinc-50 z-[9999]">
        <div className="w-48 h-1 bg-zinc-200 rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-zinc-900 w-1/3 animate-[pulse_1s_ease-in-out_infinite]"
            style={{
              animation: "slide 1.5s ease-in-out infinite alternate",
            }}
          />
        </div>
        <style>{`
        @keyframes slide {
          0% { transform: translateX(0%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] animate-pulse">
          Carregando Sistema...
        </span>
      </div>
    );

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (role && user?.role !== role) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
