import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "@/src/modules/shared/contexts/AuthContext";
import {
  processCheckDriveAiQuery,
  INTENT_REGISTRY,
} from "../services/checkdriveAiEngine";
import {
  Bot,
  Send,
  User,
  Sparkles,
  Trash2,
  HelpCircle,
  Database,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Message {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
  intentName?: string | null;
}

const EXAMPLE_PROMPTS = [
  "Gere um resumo da operação de hoje.",
  "Quais veículos estão com manutenção atrasada?",
  "Quanto gastei com combustível este mês?",
  "Quais peças estão no estoque?",
  "Quais motoristas estão em viagem?",
  "Quais multas foram registradas?",
  "Quais documentos estão vencidos?",
  "Quais seguradoras temos cadastradas?",
  "Qual o nosso plano contratado?",
  "Quais veículos estão parados?",
  "Quais motoristas tiveram o pior consumo?",
];

export default function CheckDriveAiTab() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome-1",
      sender: "assistant",
      text:
        "👋 **Olá! Sou o CheckDrive AI.**\n\n" +
        "Estou pronto para consultar as informações da sua frota diretamente no banco de dados da empresa e te fornecer respostas claras e estruturadas em tempo real.\n\n" +
        "Selecione uma das opções sugeridas abaixo ou digite sua pergunta:",
      timestamp: new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
  ]);
  const [inputQuery, setInputQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (queryText?: string) => {
    const textToSend = (queryText || inputQuery).trim();
    if (!textToSend || loading) return;

    const companyId = user?.company_id;
    if (!companyId) {
      alert("Empresa não identificada. Por favor, recarregue a página.");
      return;
    }

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInputQuery("");
    setLoading(true);

    try {
      const result = await processCheckDriveAiQuery(textToSend, companyId);

      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        sender: "assistant",
        text: result.responseText,
        intentName: result.intentName,
        timestamp: new Date().toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error("Erro ao processar mensagem no CheckDrive AI:", err);
      const errorMsg: Message = {
        id: `assistant-err-${Date.now()}`,
        sender: "assistant",
        text: "⚠️ Ocorreu uma falha ao tentar interpretar sua pergunta. Por favor, tente novamente.",
        timestamp: new Date().toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: "assistant",
        text:
          "👋 **Histórico limpo com sucesso.**\n\n" +
          "Como posso ajudar a sua operação de frota agora?",
        timestamp: new Date().toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ]);
  };

  // Utility to render message content formatting (bolding, bullet points, headers)
  const renderFormattedText = (content: string) => {
    const lines = content.split("\n");

    return lines.map((line, index) => {
      // Render Headers (### or ## or #)
      if (line.startsWith("### ")) {
        return (
          <h4 key={index} className="text-sm font-black text-text-main mt-3 mb-1">
            {line.replace("### ", "")}
          </h4>
        );
      }

      // Check if bullet point
      const isBullet = line.trim().startsWith("- ") || line.trim().startsWith("• ");
      const cleanLine = isBullet
        ? line.trim().replace(/^[-•]\s*/, "")
        : line;

      // Replace bold text **text**
      const parts = cleanLine.split(/(\*\*.*?\*\*|\*.*?\*)/g);

      const renderedParts = parts.map((part, pIdx) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={pIdx} className="font-bold text-text-main">
              {part.slice(2, -2)}
            </strong>
          );
        } else if (part.startsWith("*") && part.endsWith("*")) {
          return (
            <em key={pIdx} className="italic text-text-muted">
              {part.slice(1, -1)}
            </em>
          );
        }
        return part;
      });

      if (isBullet) {
        return (
          <div key={index} className="flex items-start gap-2 my-1 pl-1 text-xs text-text-main">
            <span className="text-primary font-bold mt-0.5">•</span>
            <div className="flex-1">{renderedParts}</div>
          </div>
        );
      }

      if (line.trim() === "") {
        return <div key={index} className="h-2" />;
      }

      return (
        <p key={index} className="text-xs text-text-main leading-relaxed my-0.5">
          {renderedParts}
        </p>
      );
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-h-[850px] bg-white rounded-2xl border border-app-border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 md:p-5 border-b border-app-border bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 text-white flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shadow-inner">
            <Bot size={22} className="text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-white tracking-wide">
                🤖 CheckDrive AI
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Base de Dados Conectada
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 font-medium">
              Interpretação de intenções & consultas automáticas em linguagem natural
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleClearChat}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700/50 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-bold"
            title="Limpar Conversa"
          >
            <RotateCcw size={15} />
            <span className="hidden sm:inline">Limpar</span>
          </button>
        </div>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-app-bg/30">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${
              msg.sender === "user" ? "flex-row-reverse" : "flex-row"
            }`}
          >
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold shadow-sm ${
                msg.sender === "user"
                  ? "bg-primary text-white"
                  : "bg-zinc-900 text-blue-400 border border-zinc-700"
              }`}
            >
              {msg.sender === "user" ? (
                <User size={16} />
              ) : (
                <Bot size={16} />
              )}
            </div>

            <div
              className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 shadow-sm border ${
                msg.sender === "user"
                  ? "bg-primary text-white border-primary/20 rounded-tr-none"
                  : "bg-white text-text-main border-app-border rounded-tl-none"
              }`}
            >
              {msg.intentName && msg.sender === "assistant" && (
                <div className="mb-2 pb-2 border-b border-zinc-100 flex items-center gap-1.5 text-[10px] font-bold text-primary uppercase tracking-wider">
                  <Database size={12} />
                  <span>Intenção Reconhecida: {msg.intentName}</span>
                </div>
              )}

              <div className="space-y-1">
                {msg.sender === "user" ? (
                  <p className="text-xs font-medium text-white leading-relaxed whitespace-pre-wrap">
                    {msg.text}
                  </p>
                ) : (
                  renderFormattedText(msg.text)
                )}
              </div>

              <div
                className={`mt-2 text-[9px] text-right font-medium ${
                  msg.sender === "user" ? "text-blue-100" : "text-text-muted"
                }`}
              >
                {msg.timestamp}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-zinc-900 text-blue-400 border border-zinc-700 flex items-center justify-center shrink-0">
              <Bot size={16} className="animate-spin" />
            </div>
            <div className="bg-white border border-app-border rounded-2xl rounded-tl-none p-4 shadow-sm flex items-center gap-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
              <span className="text-xs font-medium text-text-muted">
                Consultando o banco de dados do CheckDrive...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Example Prompts Bar */}
      <div className="px-4 py-3 bg-white border-t border-app-border overflow-x-auto whitespace-nowrap">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1 shrink-0">
            <Zap size={12} className="text-amber-500" />
            Perguntas Frequentes:
          </span>
          <div className="flex gap-2">
            {EXAMPLE_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(prompt)}
                disabled={loading}
                className="px-3 py-1.5 bg-zinc-50 hover:bg-blue-50 hover:text-primary border border-zinc-200 hover:border-blue-200 text-zinc-700 text-xs font-bold rounded-xl transition-all shrink-0 cursor-pointer flex items-center gap-1.5"
              >
                <span>{prompt}</span>
                <ArrowRight size={12} className="opacity-60" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Input Form */}
      <div className="p-3 md:p-4 bg-white border-t border-app-border">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Digite sua pergunta (ex: 'Quais veículos estão parados?')..."
            className="flex-1 bg-app-bg border border-app-border rounded-xl px-4 py-3 text-xs font-medium text-text-main focus:border-primary focus:bg-white outline-none transition-all"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={!inputQuery.trim() || loading}
            className="px-5 py-3 bg-primary text-white rounded-xl hover:bg-primary-hover font-bold text-xs shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <Send size={15} />
            <span className="hidden sm:inline">Enviar</span>
          </button>
        </form>
      </div>
    </div>
  );
}
