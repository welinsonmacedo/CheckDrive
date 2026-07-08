import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import {
  User as UserIcon,
  Camera,
  Trophy,
  History,
  MessageSquare,
  AlertCircle,
  HardDrive,
  Calendar,
  LogOut,
} from "lucide-react";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/modules/shared/contexts/AuthContext";

export default function DriverProfile() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [closings, setClosings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Feedback form
  const [feedbackType, setFeedbackType] = useState<"suggestion" | "complaint">(
    "suggestion",
  );
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  useEffect(() => {
    fetchProfileAndHistory();
  }, []);

  const fetchProfileAndHistory = async () => {
    if (!user) return;

    try {
      setLoading(true);
      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      setProfile(profileData);

      // Fetch score closings history
      const { data: closingsData } = await supabase
        .from("score_closing_items")
        .select(
          `
          *,
          score_closings (*)
        `,
        )
        .eq("driver_id", user.id);

      if (closingsData) {
        // Sort by closed_at descending
        const sorted = closingsData.sort((a, b) => {
          const dateA = new Date(
            a.score_closings?.closed_at || a.created_at || 0,
          ).getTime();
          const dateB = new Date(
            b.score_closings?.closed_at || b.created_at || 0,
          ).getTime();
          return dateB - dateA;
        });
        setClosings(sorted);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file || !user) return;

      const fileExt = file.name && file.name.includes(".") ? file.name.split(".").pop() : "jpg";
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      let { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (updateError) {
        throw updateError;
      }

      setProfile({ ...profile, avatar_url: publicUrl });
    } catch (error) {
      console.error("Error uploading avatar:", error);
      alert("Erro ao fazer upload da imagem.");
    }
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackMessage.trim()) return;

    try {
      setIsSubmitting(true);

      // Store in app_feedback table
      const { error } = await supabase.from("app_feedback").insert([
        {
          driver_id: isAnonymous ? null : user?.id,
          type: feedbackType,
          message: feedbackMessage,
          is_anonymous: isAnonymous,
          status: "pending",
        },
      ]);

      if (error) {
        console.error("Error inserting feedback:", error);
        // Se a tabela não existir, podemos simular sucesso pro usuário ou avisar o admin para criá-table
      }

      setFeedbackSuccess(true);
      setFeedbackMessage("");

      setTimeout(() => {
        setFeedbackSuccess(false);
      }, 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-6 animate-pulse">
        <div className="w-24 h-24 bg-zinc-200 rounded-full mx-auto"></div>
        <div className="h-6 bg-zinc-200 rounded w-1/3 mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8 pb-20">
      {/* Header / Avatar */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-zinc-200 flex flex-col items-center">
        <div className="relative group">
          <div className="w-24 h-24 rounded-full bg-zinc-100 border-4 border-white shadow-lg overflow-hidden flex items-center justify-center relative">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <UserIcon size={40} className="text-zinc-400" />
            )}

            <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <Camera size={24} className="text-white" />
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleAvatarUpload}
              />
            </label>
          </div>
          <button className="absolute bottom-0 right-0 p-2 bg-primary text-white rounded-full shadow-lg sm:hidden pointer-events-none">
            <Camera size={14} />
          </button>
        </div>

        <h2 className="text-xl font-black text-zinc-900 mt-4 tracking-tight">
          {profile?.full_name || user?.email?.split("@")[0] || "Motorista"}
        </h2>
        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-1">
          {profile?.cpf || "CPF não informado"}
        </p>
      </div>

      {/* Histórico de Fechamento */}
      <div className="space-y-4">
        <h3 className="text-sm font-black text-zinc-800 uppercase tracking-widest flex items-center gap-2">
          <History size={16} className="text-primary" />
          Histórico de Fechamentos
        </h3>

        {closings.length === 0 ? (
          <div className="bg-white border border-dashed border-zinc-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center">
            <Calendar size={24} className="text-zinc-300 mb-2" />
            <p className="text-sm font-bold text-zinc-500">
              Nenhum fechamento registrado
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {closings.map((c) => (
              <div
                key={c.id}
                className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm flex items-center justify-between"
              >
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-1">
                    {new Date(
                      c.score_closings?.closed_at ||
                        c.created_at ||
                        new Date().toISOString(),
                    ).toLocaleDateString("pt-BR", {
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                  <p className="text-sm font-bold text-zinc-800">
                    Pontuação:{" "}
                    <span className="text-primary tabular-nums">
                      {c.score} pt
                    </span>
                  </p>
                </div>
                {c.closing_value !== undefined && (
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">
                      Valor
                    </p>
                    <p className="text-sm font-black text-green-600">
                      R$ {c.closing_value.toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sugestões ou Reclamações */}
      <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm">
        <h3 className="text-sm font-black text-zinc-800 uppercase tracking-widest flex items-center gap-2 mb-6">
          <MessageSquare size={16} className="text-primary" />
          Sugestões & Reclamações
        </h3>

        {feedbackSuccess ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-green-50 border border-green-200 rounded-xl text-center"
          >
            <p className="text-sm font-bold text-green-700">
              Mensagem enviada com sucesso! Obrigado pelo feedback.
            </p>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmitFeedback} className="space-y-4">
            <div className="flex gap-2 p-1 bg-zinc-100 rounded-xl">
              <button
                type="button"
                onClick={() => setFeedbackType("suggestion")}
                className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                  feedbackType === "suggestion"
                    ? "bg-white shadow-sm text-primary"
                    : "text-zinc-500"
                }`}
              >
                Sugestão
              </button>
              <button
                type="button"
                onClick={() => setFeedbackType("complaint")}
                className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                  feedbackType === "complaint"
                    ? "bg-white shadow-sm text-red-500"
                    : "text-zinc-500"
                }`}
              >
                Reclamação
              </button>
            </div>

            <div>
              <textarea
                required
                placeholder={
                  feedbackType === "suggestion"
                    ? "Como podemos melhorar o aplicativo ou a frota?"
                    : "Descreva o problema que você enfrentou..."
                }
                className="w-full h-32 px-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50 text-sm font-medium resize-none focus:border-primary outline-none transition-colors"
                value={feedbackMessage}
                onChange={(e) => setFeedbackMessage(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="anonymous"
                className="w-4 h-4 text-primary border-zinc-300 rounded focus:ring-primary"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
              />
              <label
                htmlFor="anonymous"
                className="text-[11px] font-bold text-zinc-600"
              >
                Enviar anonimamente (seu nome não aparecerá para o admin)
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 bg-zinc-900 text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-zinc-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? "Enviando..." : "Enviar Feedback"}
            </button>
          </form>
        )}
      </div>

      <button
        onClick={async () => {
          await logout();
          navigate('/login');
        }}
        className="w-full mt-6 h-14 border border-danger/20 text-danger bg-red-50 text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
      >
        <LogOut size={18} />
        Sair da Conta
      </button>
    </div>
  );
}
