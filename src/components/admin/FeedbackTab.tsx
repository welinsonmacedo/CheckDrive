import React, { useState, useEffect } from "react";
import {
  MessageSquare,
  Calendar,
  User,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
} from "lucide-react";
import { supabase } from "../../lib/supabase";

export default function FeedbackTab() {
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "resolved">(
    "pending",
  );

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const fetchFeedbacks = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("app_feedback")
        .select(
          `
          *,
          profiles:driver_id(full_name, email)
        `,
        )
        .order("created_at", { ascending: false });

      if (data) setFeedbacks(data);
    } catch (error) {
      console.error("Error fetching feedbacks:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveFeedback = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "resolved" ? "pending" : "resolved";

    try {
      const { error } = await supabase
        .from("app_feedback")
        .update({ status: newStatus })
        .eq("id", id);

      if (!error) {
        setFeedbacks(
          feedbacks.map((f) => (f.id === id ? { ...f, status: newStatus } : f)),
        );
      }
    } catch (error) {
      console.error("Error updating feedback:", error);
    }
  };

  const filteredFeedbacks = feedbacks.filter((f) => {
    if (filter === "all") return true;
    return f.status === filter;
  });

  if (loading) {
    return (
      <div className="animate-pulse flex space-x-4">
        <div className="flex-1 space-y-4 py-1">
          <div className="h-4 bg-zinc-200 rounded w-3/4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-zinc-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-zinc-900 flex items-center gap-2">
          <MessageSquare className="text-primary" />
          Feedback de Motoristas
        </h2>

        <div className="flex bg-zinc-100 p-1 rounded-xl">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${filter === "all" ? "bg-white shadow text-primary" : "text-zinc-500"}`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilter("pending")}
            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${filter === "pending" ? "bg-white shadow text-primary" : "text-zinc-500"}`}
          >
            Pendentes
          </button>
          <button
            onClick={() => setFilter("resolved")}
            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${filter === "resolved" ? "bg-white shadow text-primary" : "text-zinc-500"}`}
          >
            Resolvidos
          </button>
        </div>
      </div>

      <div className="grid gap-4">
        {filteredFeedbacks.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-dashed border-zinc-300 text-center flex flex-col items-center">
            <MessageSquare size={32} className="text-zinc-300 mb-3" />
            <h4 className="text-sm font-bold text-zinc-700">
              Nenhum feedback encontrado
            </h4>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
              A caixa de entrada está limpa
            </p>
          </div>
        ) : (
          filteredFeedbacks.map((f) => (
            <div
              key={f.id}
              className={`bg-white p-6 rounded-2xl border transition-all ${f.status === "resolved" ? "border-zinc-200 opacity-60" : "border-zinc-200 shadow-sm"}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${f.type === "complaint" ? "bg-red-50 text-red-500" : "bg-primary/10 text-primary"}`}
                  >
                    {f.type === "complaint" ? (
                      <AlertTriangle size={20} />
                    ) : (
                      <AlertCircle size={20} />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black text-zinc-900 uppercase tracking-tight">
                        {f.type === "complaint" ? "Reclamação" : "Sugestão"}
                      </h3>
                      {f.status === "resolved" && (
                        <span className="flex items-center gap-1 text-[9px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full uppercase tracking-widest">
                          <CheckCircle2 size={10} /> Resolvido
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] font-bold text-zinc-500 flex items-center gap-2 uppercase tracking-wide">
                      <Calendar size={12} className="text-zinc-400" />
                      {new Date(f.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleResolveFeedback(f.id, f.status)}
                  className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all ${
                    f.status === "resolved"
                      ? "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
                      : "bg-green-50 text-green-600 hover:bg-green-100 border border-green-200"
                  }`}
                >
                  {f.status === "resolved"
                    ? "Marcar Pendente"
                    : "Marcar Resolvido"}
                </button>
              </div>

              <div className="pl-13">
                <p className="text-sm font-medium text-zinc-700 whitespace-pre-wrap leading-relaxed">
                  {f.message}
                </p>

                <div className="mt-4 flex items-center gap-2 pt-4 border-t border-zinc-100">
                  <User size={14} className="text-zinc-400" />
                  <span className="text-xs font-bold text-zinc-600">
                    {f.is_anonymous
                      ? "Usuário Anônimo"
                      : f.profiles?.full_name ||
                        f.profiles?.email ||
                        "Motorista"}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
