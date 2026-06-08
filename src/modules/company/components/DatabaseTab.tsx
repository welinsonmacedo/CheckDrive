import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  HardDrive,
  Database as DatabaseIcon,
  Image as ImageIcon,
  Folder,
  File,
  AlertCircle,
  Users,
  Circle,
} from "lucide-react";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/modules/shared/contexts/AuthContext";

export default function DatabaseTab() {
  const { onlineUsers } = useAuth();
  const [loading, setLoading] = useState(true);
  const [functionStatus, setFunctionStatus] = useState<
    "online" | "offline" | "loading"
  >("loading");
  const [stats, setStats] = useState({
    db_size: 0,
    storage_size: 0,
    file_count: 0,
    fotos_size: 0,
    docs_size: 0,
  });

  // Limites do Supabase (Plano Gratuito / Básico como referência)
  const limits = {
    db_size: 500 * 1024 * 1024, // 500 MB
    storage_size: 1 * 1024 * 1024 * 1024, // 1 GB
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_database_stats");

      if (!error && data) {
        setStats(data);
        setFunctionStatus("online");
      } else {
        console.error("Error fetching database stats:", error);
        setFunctionStatus("offline");
      }
    } catch (error) {
      console.error("Error fetching database stats:", error);
      setFunctionStatus("offline");
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  const calculatePercentage = (used: number, total: number) => {
    if (total === 0) return 0;
    return Math.min(Math.round((used / total) * 100), 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const dbPercentage = calculatePercentage(stats.db_size, limits.db_size);
  const storagePercentage = calculatePercentage(
    stats.storage_size,
    limits.storage_size,
  );

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-app-border">
        <h3 className="text-lg font-black text-text-main flex items-center gap-2 mb-6">
          <HardDrive className="text-primary" />
          Métricas do Banco de Dados
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Banco de Dados */}
          <div className="p-5 rounded-xl border border-app-border bg-app-bg">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                <DatabaseIcon size={20} />
              </div>
              <h4 className="text-sm font-bold text-text-main">
                Banco de Dados
              </h4>
            </div>
            <div className="mt-4">
              <div className="flex justify-between items-end mb-1">
                <span className="text-2xl font-black text-text-main">
                  {formatBytes(stats.db_size)}
                </span>
                <span className="text-xs font-bold text-text-muted mb-1">
                  / {formatBytes(limits.db_size)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`bg-blue-600 h-2 rounded-full ${dbPercentage > 90 ? "bg-danger" : dbPercentage > 75 ? "bg-warning" : ""}`}
                  style={{ width: `${dbPercentage}%` }}
                ></div>
              </div>
              <p className="text-[10px] text-text-muted mt-2 font-bold">
                {dbPercentage}% utilizado
              </p>
            </div>
          </div>

          {/* Storage Total */}
          <div className="p-5 rounded-xl border border-app-border bg-app-bg">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                <HardDrive size={20} />
              </div>
              <h4 className="text-sm font-bold text-text-main">
                Storage (Total)
              </h4>
            </div>
            <div className="mt-4">
              <div className="flex justify-between items-end mb-1">
                <span className="text-2xl font-black text-text-main">
                  {formatBytes(stats.storage_size)}
                </span>
                <span className="text-xs font-bold text-text-muted mb-1">
                  / {formatBytes(limits.storage_size)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`bg-purple-600 h-2 rounded-full ${storagePercentage > 90 ? "bg-danger" : storagePercentage > 75 ? "bg-warning" : ""}`}
                  style={{ width: `${storagePercentage}%` }}
                ></div>
              </div>
              <p className="text-[10px] text-text-muted mt-2 font-bold">
                {storagePercentage}% utilizado
              </p>
            </div>
          </div>

          {/* Quantidade de Arquivos */}
          <div className="p-5 rounded-xl border border-app-border bg-app-bg">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                <File size={20} />
              </div>
              <h4 className="text-sm font-bold text-text-main">
                Total de Arquivos
              </h4>
            </div>
            <div className="mt-4">
              <span className="text-2xl font-black text-text-main">
                {stats.file_count.toLocaleString()}
              </span>
              <p className="text-[10px] text-text-muted mt-2 font-bold">
                Documentos e Fotos armazenados
              </p>
            </div>
          </div>

          {/* Bucket Fotos */}
          <div className="p-5 rounded-xl border border-app-border bg-app-bg">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                <ImageIcon size={20} />
              </div>
              <h4 className="text-sm font-bold text-text-main">Bucket Fotos</h4>
            </div>
            <div className="mt-4">
              <span className="text-xl font-black text-text-main">
                {formatBytes(stats.fotos_size)}
              </span>
              <p className="text-[10px] text-text-muted mt-2 font-bold">
                Imagens de checklist e veículos
              </p>
            </div>
          </div>

          {/* Bucket Documentos */}
          <div className="p-5 rounded-xl border border-app-border bg-app-bg">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                <Folder size={20} />
              </div>
              <h4 className="text-sm font-bold text-text-main">
                Bucket Documentos
              </h4>
            </div>
            <div className="mt-4">
              <span className="text-xl font-black text-text-main">
                {formatBytes(stats.docs_size)}
              </span>
              <p className="text-[10px] text-text-muted mt-2 font-bold">
                Outros arquivos do sistema
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between p-4 bg-zinc-50 border border-app-border rounded-xl">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-text-main uppercase tracking-widest">
              Status da Conexão (RPC):
            </span>
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${functionStatus === "online" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
            >
              <div
                className={`w-1.5 h-1.5 rounded-full ${functionStatus === "online" ? "bg-green-500" : "bg-red-500"} animate-pulse`}
              ></div>
              {functionStatus === "online" ? "Online" : "Offline"}
            </div>
          </div>
          {functionStatus === "offline" && (
            <p className="text-[10px] text-text-muted font-medium max-w-sm text-right">
              A função SQL{" "}
              <code className="bg-white px-1 py-0.5 rounded border border-gray-200">
                get_database_stats
              </code>{" "}
              não foi encontrada ou falhou. Execute no seu banco.
            </p>
          )}
        </div>
      </div>

      {/* Usuários Online */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-app-border">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-black text-text-main flex items-center gap-2">
            <Users className="text-primary" />
            Usuários Online
          </h3>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-xs font-bold text-green-700">
              {onlineUsers.length} Online
            </span>
          </div>
        </div>

        {onlineUsers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {onlineUsers.map((u) => (
              <div
                key={u.user_id}
                className="flex flex-col p-4 rounded-xl border border-app-border bg-zinc-50"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-text-main truncate max-w-[180px]">
                      {u.name}
                    </h4>
                    <p className="text-[10px] text-text-muted mt-0.5 truncate">
                      {u.email}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-zinc-200 text-zinc-600">
                      {u.role === "admin"
                        ? "Admin"
                        : u.role === "driver"
                          ? "Mot."
                          : "Mast."}
                    </span>
                    <span className="text-[9px] font-medium text-text-muted flex items-center gap-1">
                      <Circle
                        size={6}
                        className="fill-green-500 text-green-500"
                      />{" "}
                      Ativo
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 bg-zinc-50 rounded-xl border border-dashed border-app-border">
            <Users size={32} className="text-zinc-300 mb-2" />
            <p className="text-sm font-bold text-text-muted">
              Nenhum usuário logado no momento.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
