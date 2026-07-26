import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Truck,
  CheckSquare,
  Wrench,
  MessageSquare,
  ShieldCheck,
  FileText,
  BarChart3,
  CheckCircle2,
  ArrowRight,
  UserCheck,
  Building2,
  Calendar,
  Gauge,
  Receipt,
  Download,
  Smartphone,
  Zap,
  Lock,
  ChevronRight,
  ChevronDown,
  Bot,
  MapPin,
  HardHat,
  Activity,
  Sparkles,
  Clock,
  Layers,
  Radio,
  HelpCircle,
  Send,
  X,
  ExternalLink,
  Cpu,
  Database,
  Award,
  Search,
  Users,
  Settings,
  AlertTriangle,
  Factory,
  Tractor,
  Pickaxe,
  ZapOff,
  TreePine,
  PhoneCall,
  Check,
} from "lucide-react";

export default function LandingPage() {
  const navigate = useNavigate();

  // State for Interactive Elements
  const [activeAppTab, setActiveAppTab] = useState<"admin" | "driver" | "yard">("admin");
  const [activeAiQueryIndex, setActiveAiQueryIndex] = useState<number>(0);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState<boolean>(false);
  const [demoFormData, setDemoFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    fleetSize: "10-50",
    segment: "Transportes & Logística",
  });
  const [demoSubmitted, setDemoSubmitted] = useState<boolean>(false);

  // AI Chat Simulation Queries
  const aiQueries = [
    {
      question: "Quais veículos da frota precisam de manutenção preventiva esta semana?",
      answer: "Analisando 48 ativos... 3 veículos atingiram o limite de tolerância: O caminhão Volvo FH 540 (Placa ABC-1234) está a 150 KM da troca de óleo programada. A Scania R450 (Placa DEF-5678) possui laudo de segurança a vencer em 4 dias. Recomendo abrir Ordem de Serviço preventiva imediata.",
      metric: "3 Alertas Críticos Identificados",
      action: "Gerar Ordens de Serviço",
    },
    {
      question: "Quais motoristas possuem pendências de checklist pré-viagem?",
      answer: "No momento, 2 motoristas estão com checklist pendente para as rotas do turno da manhã: Carlos Silva (Scania R450) e Roberto Lima (Carreta Prancha). Notificação via WhatsApp enviada automaticamente para ambos.",
      metric: "2 Notificações Enviadas no WhatsApp",
      action: "Reenviar Lembrete",
    },
    {
      question: "Qual foi o custo total de manutenções corretivas no último mês?",
      answer: "O custo total acumulado em manutenções corretivas foi de R$ 14.850,00 referente a 4 ocorrências. Houve uma redução de 28% em comparação ao mês anterior após a implementação das regras de alertas por KM.",
      metric: "-28% em Custos Corretivos",
      action: "Baixar Relatório em PDF",
    },
  ];

  // FAQ Accordion Items
  const faqItems = [
    {
      question: "O aplicativo funciona totalmente offline em locais sem sinal?",
      answer: "Sim! O aplicativo do motorista e o app de pátio foram desenvolvidos com tecnologia PWA Offline-First. Todas as inspeções, fotos de avarias, leituras de odômetro e horímetro são armazenadas com segurança no dispositivo e sincronizadas automaticamente assim que a conexão com a internet for reestabelecida.",
    },
    {
      question: "O CheckDrive suporta máquinas pesadas e equipamentos industriais?",
      answer: "Com certeza. Além de veículos leves e pesados (caminhões, carretas, ônibus, vans), a plataforma gerencia tratores, escavadeiras, empilhadeiras, geradores e equipamentos industriais, utilizando controle por Horímetro (Horas de Uso) e Datas de inspeção.",
    },
    {
      question: "Como funciona a integração e avisos automáticos via WhatsApp?",
      answer: "A plataforma possui integração nativa via API (Evolution/WhatsApp Business). Quando uma manutenção preventiva se aproxima do limite configurado ou um checklist detecta uma anomalia grave, o sistema dispara um alerta no WhatsApp do motorista ou do gestor responsável com detalhes e links diretos.",
    },
    {
      question: "O sistema permite anexo de Notas Fiscais e comprovantes de manutenção?",
      answer: "Sim! No módulo de Gestão de Baixas e Ordens de Serviço, o gestor pode anexar arquivos PDF ou fotos das Notas Fiscais, indicar o fornecedor/oficina executante, registrar custos detalhados e manter o histórico financeiro acumulado por ativo.",
    },
    {
      question: "É possível gerenciar múltiplas empresas ou filiais em uma única conta?",
      answer: "Sim. O CheckDrive é nativamente Multiempresa e Multitenant. Você pode criar filiais ou empresas separadas, atribuir usuários e frota específicos com controle rígido de permissões (RLS) e isolamento total de dados.",
    },
    {
      question: "Como funciona o assistente de Inteligência Artificial?",
      answer: "O CheckDrive AI analisa o histórico contínuo de checklists, horímetros, odômetros e baixas de manutenção para responder a perguntas em linguagem natural, prever necessidades de oficina e sugerir otimizações de frota instantaneamente.",
    },
    {
      question: "Como posso solicitar um teste ou demonstração personalizada?",
      answer: "Basta clicar em 'Solicitar Demonstração' em qualquer parte desta página. Nossa equipe de especialistas entrará em contato para apresentar a plataforma ao vivo com os dados e necessidades específicas da sua operação.",
    },
  ];

  const handleDemoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDemoSubmitted(true);
    setTimeout(() => {
      // Redirect to WhatsApp or close modal with confirmation
      const text = `Olá! Gostaria de solicitar uma demonstração do CheckDrive.%0A%0A*Nome:* ${demoFormData.name}%0A*Empresa:* ${demoFormData.company}%0A*Tamanho da Frota:* ${demoFormData.fleetSize} ativos%0A*Segmento:* ${demoFormData.segment}%0A*Telefone:* ${demoFormData.phone}`;
      window.open(`https://wa.me/?text=${text}`, "_blank");
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-blue-600 selection:text-white">
      {/* Header / Navbar */}
      <header className="sticky top-0 z-50 bg-zinc-950/85 backdrop-blur-xl border-b border-zinc-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo */}
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => navigate("/landing")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && navigate("/landing")}
          >
            <div className="w-11 h-11 rounded-2xl overflow-hidden shadow-lg shadow-blue-500/10 border border-zinc-700/80 p-0.5 bg-zinc-900 group-hover:border-blue-500/50 transition-all">
              <img
                src="https://phyodfszatjfdfjtzpmm.supabase.co/storage/v1/object/public/Enterprise/logo.jpeg"
                alt="CheckDrive Logo"
                className="w-full h-full object-cover rounded-xl"
              />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-white italic group-hover:text-blue-400 transition-colors">
                CheckDrive
              </span>
              <span className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest -mt-1">
                Gestão de Ativos & Frotas
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-7 text-xs font-bold text-zinc-400 uppercase tracking-wider">
            <a href="#recursos" className="hover:text-blue-400 transition-colors">
              Recursos
            </a>
            <a href="#aplicativos" className="hover:text-blue-400 transition-colors">
              Aplicativos
            </a>
            <a href="#ia" className="hover:text-blue-400 transition-colors">
              Inteligência Artificial
            </a>
            <a href="#beneficios" className="hover:text-blue-400 transition-colors">
              Diferenciais
            </a>
            <a href="#segmentos" className="hover:text-blue-400 transition-colors">
              Segmentos
            </a>
            <a href="#planos" className="hover:text-blue-400 transition-colors">
              Planos
            </a>
            <a href="#faq" className="hover:text-blue-400 transition-colors">
              FAQ
            </a>
          </nav>

          {/* CTA Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsDemoModalOpen(true)}
              className="hidden sm:inline-flex px-4 py-2.5 rounded-xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 text-xs font-bold transition-all items-center gap-2"
            >
              <PhoneCall size={14} className="text-blue-400" />
              Solicitar Demo
            </button>
            <Link
              to="/login"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-blue-600/25 transition-all"
            >
              Entrar no Sistema <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-12 pb-20 lg:pt-20 lg:pb-32 overflow-hidden border-b border-zinc-900">
        {/* Background Gradients */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(59,130,246,0.18),rgba(255,255,255,0))]" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/90 border border-blue-500/30 text-blue-400 text-xs font-extrabold uppercase tracking-widest mb-6 shadow-xl"
            >
              <Sparkles size={14} className="text-blue-400 animate-pulse" />
              Plataforma Inteligente de Gestão de Ativos, Frotas e Operações
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight"
            >
              A Plataforma Inteligente para Gestão de{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-sky-400">
                Ativos, Frotas e Operações.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-6 text-base sm:text-lg text-zinc-300 max-w-3xl mx-auto leading-relaxed font-normal"
            >
              Controle absoluto de **Veículos, Máquinas e Equipamentos**. Checklists digitais offline, alertas inteligentes por KM e Horímetro, ordens de serviço com anexo de Nota Fiscal, telemetria e assistente com Inteligência Artificial.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <button
                onClick={() => setIsDemoModalOpen(true)}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-blue-600/30 transition-all hover:scale-[1.02]"
              >
                Solicitar Demonstração <ArrowRight size={16} />
              </button>
              <a
                href="https://wa.me/?text=Olá!%20Quero%20falar%20com%20um%20especialista%20do%20CheckDrive."
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
              >
                <MessageSquare size={16} className="text-emerald-400" />
                Falar com Especialista
              </a>
              <a
                href="#recursos"
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-black text-xs uppercase tracking-widest flex items-center justify-center transition-all"
              >
                Conhecer Recursos
              </a>
            </motion.div>
          </div>

          {/* Interactive Mockup / Product Visual Preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="mt-14 max-w-5xl mx-auto rounded-3xl border border-zinc-800 bg-zinc-900/90 shadow-2xl overflow-hidden p-2 backdrop-blur-md"
          >
            {/* Window Header */}
            <div className="bg-zinc-950/80 px-4 py-3 rounded-2xl flex items-center justify-between border border-zinc-800/80">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="ml-3 text-xs font-mono text-zinc-400">
                  checkdrive.app/dashboard/gestao-ativos
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Sistema Operacional
                </span>
              </div>
            </div>

            {/* Mockup Dashboard Content */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 bg-zinc-950/60 text-left">
              {/* Stat Card 1 */}
              <div className="bg-zinc-900 border border-zinc-800/80 rounded-2xl p-5 relative overflow-hidden">
                <div className="flex items-center justify-between text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2">
                  <span>Ativos Operacionais</span>
                  <Truck size={18} className="text-blue-400" />
                </div>
                <div className="text-2xl font-black text-white">128 / 130</div>
                <p className="text-xs text-emerald-400 mt-1 font-semibold flex items-center gap-1">
                  <CheckCircle2 size={13} /> 98.4% Disponibilidade da Frota
                </p>
                <div className="mt-3 text-[11px] text-zinc-400 flex justify-between">
                  <span>Veículos: 84</span>
                  <span>Máquinas: 32</span>
                  <span>Equip.: 14</span>
                </div>
              </div>

              {/* Stat Card 2 */}
              <div className="bg-zinc-900 border border-zinc-800/80 rounded-2xl p-5 relative overflow-hidden">
                <div className="flex items-center justify-between text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2">
                  <span>Alertas por KM / Horas</span>
                  <Gauge size={18} className="text-amber-400" />
                </div>
                <div className="text-2xl font-black text-white">3 Pendentes</div>
                <p className="text-xs text-amber-400 mt-1 font-semibold flex items-center gap-1">
                  <Clock size={13} /> 2 em Aviso Prévio (Preventiva)
                </p>
                <div className="mt-3 text-[11px] text-zinc-400 flex justify-between">
                  <span>Troca de Óleo</span>
                  <span>Revisão 500h</span>
                  <span>Laudo ANTT</span>
                </div>
              </div>

              {/* Stat Card 3 */}
              <div className="bg-zinc-900 border border-zinc-800/80 rounded-2xl p-5 relative overflow-hidden">
                <div className="flex items-center justify-between text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2">
                  <span>Checklists Hoje</span>
                  <CheckSquare size={18} className="text-emerald-400" />
                </div>
                <div className="text-2xl font-black text-white">42 Concluídos</div>
                <p className="text-xs text-blue-400 mt-1 font-semibold flex items-center gap-1">
                  <Smartphone size={13} /> 100% Sincronizado (App Motorista)
                </p>
                <div className="mt-3 text-[11px] text-zinc-400 flex justify-between">
                  <span>Com Fotos: 100%</span>
                  <span>Avarias: 1</span>
                  <span>Score: 9.8</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Core Metrics / Proof Bar */}
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 text-left max-w-5xl mx-auto">
            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 backdrop-blur-sm">
              <div className="flex items-center gap-3 text-blue-400 mb-1.5">
                <CheckSquare size={20} />
                <span className="text-xs font-black uppercase tracking-wider text-zinc-200">
                  Checklist Digital
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Inspeção pré/pós viagem com fotos, odômetro, horímetro e suporte offline no PWA.
              </p>
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 backdrop-blur-sm">
              <div className="flex items-center gap-3 text-emerald-400 mb-1.5">
                <Gauge size={20} />
                <span className="text-xs font-black uppercase tracking-wider text-zinc-200">
                  Alertas de KM & Horas
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Prevenção automatizada por quilometragem e horímetro com tolerância customizável.
              </p>
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 backdrop-blur-sm">
              <div className="flex items-center gap-3 text-amber-400 mb-1.5">
                <Wrench size={20} />
                <span className="text-xs font-black uppercase tracking-wider text-zinc-200">
                  Ordens de Serviço & NF
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Baixas rigorosas com anexo de Nota Fiscal, fornecedores, histórico de custos e peças.
              </p>
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 backdrop-blur-sm">
              <div className="flex items-center gap-3 text-indigo-400 mb-1.5">
                <MessageSquare size={20} />
                <span className="text-xs font-black uppercase tracking-wider text-zinc-200">
                  WhatsApp & IA
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Disparos diretos para o motorista via WhatsApp e consultas inteligentes via Chat IA.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Differentials / Benefits Grid */}
      <section id="beneficios" className="py-20 bg-zinc-900/40 border-b border-zinc-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-black text-blue-400 uppercase tracking-widest mb-3">
              Diferenciais Exclusivos CheckDrive
            </h2>
            <h3 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              A arquitetura completa para gestão inteligente de ativos operacionais
            </h3>
            <p className="text-zinc-400 text-sm mt-4">
              Desenvolvido para atender tanto à rotina severa do pátio e do motorista quanto à exigência estratégica da diretoria.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 hover:border-blue-500/40 transition-all group flex flex-col justify-between space-y-4">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <Truck size={24} />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">Gestão Completa de Ativos</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Cadastre Veículos, Máquinas e Equipamentos com fichas detalhadas (CRLV, ANTT, Renavam, Horímetro, Odômetro, Seguro e Garantias).
                </p>
              </div>
              <ul className="space-y-2 pt-4 border-t border-zinc-800/80 text-xs text-zinc-300">
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-blue-400 shrink-0" /> Suporte a Máquinas, Equipamentos e Frota</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-blue-400 shrink-0" /> Vencimentos automáticos de documentação</li>
              </ul>
            </div>

            {/* Card 2 */}
            <div id="recursos" className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 hover:border-emerald-500/40 transition-all group flex flex-col justify-between space-y-4">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <Smartphone size={24} />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">Checklists Inteligentes PWA</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Inspeções digitais guiadas com fotos obrigatórias de avarias e do painel. Funciona em qualquer smartphone Android/iOS mesmo sem sinal de internet.
                </p>
              </div>
              <ul className="space-y-2 pt-4 border-t border-zinc-800/80 text-xs text-zinc-300">
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400 shrink-0" /> Funcionalidade 100% Offline (Sync)</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400 shrink-0" /> Aferição obrigatória de KM e Horímetro</li>
              </ul>
            </div>

            {/* Card 3 */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 hover:border-amber-500/40 transition-all group flex flex-col justify-between space-y-4">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <Gauge size={24} />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">Manutenção Preventiva por KM e Horas</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Regras automatizadas de manutenção preventiva. Receba avisos prévios configuráveis antes do limite crítico de quilometragem ou horímetro ser atingido.
                </p>
              </div>
              <ul className="space-y-2 pt-4 border-t border-zinc-800/80 text-xs text-zinc-300">
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-amber-400 shrink-0" /> Recálculo automático a cada checklist</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-amber-400 shrink-0" /> Níveis de tolerância para alertas prévios</li>
              </ul>
            </div>

            {/* Card 4 */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 hover:border-sky-500/40 transition-all group flex flex-col justify-between space-y-4">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <MapPin size={24} />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">GPS & Rastreamento em Tempo Real</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Acompanhamento telemetria e localização georreferenciada de veículos e operadores durante o cumprimento de rotas e checklists.
                </p>
              </div>
              <ul className="space-y-2 pt-4 border-t border-zinc-800/80 text-xs text-zinc-300">
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-sky-400 shrink-0" /> Mapeamento de rotas e paradas</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-sky-400 shrink-0" /> Histórico de deslocamentos e horários</li>
              </ul>
            </div>

            {/* Card 5 */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 hover:border-purple-500/40 transition-all group flex flex-col justify-between space-y-4">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <Wrench size={24} />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">Ordens de Serviço & Baixas com NF</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Dê baixas nas manutenções anexando a Nota Fiscal em PDF/foto, oficina responsável, peças trocadas e custo total por serviço.
                </p>
              </div>
              <ul className="space-y-2 pt-4 border-t border-zinc-800/80 text-xs text-zinc-300">
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-purple-400 shrink-0" /> Histórico de fornecedores e NFs</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-purple-400 shrink-0" /> Curva de custos acumulados por ativo</li>
              </ul>
            </div>

            {/* Card 6 */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 hover:border-rose-500/40 transition-all group flex flex-col justify-between space-y-4">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <ShieldCheck size={24} />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">Auditoria Completa & Segurança RLS</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Log de auditoria em tempo real (`system_audit_logs`) registrando logins, alterações de frota, baixas de manutenção e permissões por perfil.
                </p>
              </div>
              <ul className="space-y-2 pt-4 border-t border-zinc-800/80 text-xs text-zinc-300">
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-rose-400 shrink-0" /> Rastreabilidade total de ações de usuários</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-rose-400 shrink-0" /> Isolamento de dados Multiempresa (RLS)</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Visual Workflow - Como Funciona */}
      <section className="py-20 border-b border-zinc-900 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-black text-blue-400 uppercase tracking-widest mb-3">
              Fluxo Simplificado
            </h2>
            <h3 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Como o CheckDrive funciona na prática
            </h3>
            <p className="text-zinc-400 text-sm mt-4">
              Sete etapas inteligentes para transformar a gestão de frota da sua empresa do caótico para o digital em minutos.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4 text-center">
            {[
              { step: "01", title: "Cadastro", desc: "Veículos, Máquinas e Equipamentos" },
              { step: "02", title: "Operação", desc: "Atribuição de motoristas e frotas" },
              { step: "03", title: "Checklist", desc: "Inspeção digital offline com fotos" },
              { step: "04", title: "Monitoramento", desc: "Rastreio GPS e odômetro/horímetro" },
              { step: "05", title: "Manutenção", desc: "Alertas automáticos de preventiva" },
              { step: "06", title: "Relatórios", desc: "Exportação em PDF/Excel com logo" },
              { step: "07", title: "Indicadores", desc: "Score de motoristas e Assistente IA" },
            ].map((item, idx) => (
              <div key={idx} className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 relative flex flex-col justify-between hover:border-zinc-700 transition-all">
                <div className="text-xs font-black text-blue-400 uppercase mb-2">Passo {item.step}</div>
                <h4 className="text-sm font-bold text-white mb-1">{item.title}</h4>
                <p className="text-[11px] text-zinc-400 leading-tight">{item.desc}</p>
                {idx < 6 && (
                  <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-10 text-zinc-700">
                    <ChevronRight size={18} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tri-Ecosystem Applications Section */}
      <section id="aplicativos" className="py-20 bg-zinc-900/30 border-b border-zinc-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-xs font-black text-blue-400 uppercase tracking-widest mb-3">
              Ecossistema Integrado
            </h2>
            <h3 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Três aplicações especializadas em uma única plataforma
            </h3>
            <p className="text-zinc-400 text-sm mt-4">
              Interfaces pensadas para cada perfil da sua empresa: administrativa, motoristas e conferentes de pátio.
            </p>

            {/* App Tab Switcher */}
            <div className="mt-8 inline-flex p-1.5 rounded-2xl bg-zinc-900 border border-zinc-800 max-w-full overflow-x-auto">
              <button
                onClick={() => setActiveAppTab("admin")}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                  activeAppTab === "admin"
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Building2 size={15} /> Painel Administrativo
              </button>
              <button
                onClick={() => setActiveAppTab("driver")}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                  activeAppTab === "driver"
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Smartphone size={15} /> App do Motorista (PWA)
              </button>
              <button
                onClick={() => setActiveAppTab("yard")}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                  activeAppTab === "yard"
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <HardHat size={15} /> App de Pátio / Vistoria
              </button>
            </div>
          </div>

          {/* Tab Content Display */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 max-w-5xl mx-auto shadow-2xl">
            {activeAppTab === "admin" && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center text-left"
              >
                <div className="space-y-4">
                  <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-bold uppercase tracking-wider inline-block">
                    Para Gestores e Diretores
                  </span>
                  <h4 className="text-2xl font-black text-white">Painel Administrativo do Gestor</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Central de comando para cadastrar frota, definir regras de alertas por KM/Horas, aprovar ordens de serviço, gerenciar custos acumulados, anexar NFs e gerar relatórios customizados com a marca da sua empresa.
                  </p>
                  <ul className="space-y-2 text-xs text-zinc-300">
                    <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-blue-400" /> Relatórios executivos em PDF e Excel</li>
                    <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-blue-400" /> Gestão de infrações, pontuações e fechamento</li>
                    <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-blue-400" /> Controle de acesso multiempresa e permissões</li>
                  </ul>
                </div>
                <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 space-y-3 font-mono text-xs">
                  <div className="text-zinc-400 font-bold border-b border-zinc-800 pb-2 flex justify-between">
                    <span>STATUS DA FROTA</span>
                    <span className="text-emerald-400">ONLINE</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-800/60 text-zinc-300">
                    <span>Ativos Cadastrados</span>
                    <span className="font-bold text-white">128</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-800/60 text-zinc-300">
                    <span>Preventivas Pendentes</span>
                    <span className="font-bold text-amber-400">3 (98% em dia)</span>
                  </div>
                  <div className="flex justify-between py-1 text-zinc-300">
                    <span>Custos do Mês</span>
                    <span className="font-bold text-emerald-400">R$ 18.420,00</span>
                  </div>
                </div>
              </motion.div>
            )}

            {activeAppTab === "driver" && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center text-left"
              >
                <div className="space-y-4">
                  <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase tracking-wider inline-block">
                    Para Motoristas e Operadores
                  </span>
                  <h4 className="text-2xl font-black text-white">Aplicativo PWA Leve e Agil</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Projetado para telas sensíveis ao toque com operação ultrarrápida (menos de 2 minutos por inspeção). Permite registrar odômetro, tirar foto de pneus/lataria e enviar sem gastar dados.
                  </p>
                  <ul className="space-y-2 text-xs text-zinc-300">
                    <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-400" /> Sincronização offline automática</li>
                    <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-400" /> Interface com botões amplos e sem poluição</li>
                    <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-400" /> Histórico de inspeções realizadas</li>
                  </ul>
                </div>
                <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 space-y-3">
                  <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider border-b border-zinc-800 pb-2">
                    Checklist Pré-Viagem - PWA
                  </div>
                  <div className="space-y-2 text-xs text-zinc-300">
                    <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 flex justify-between items-center">
                      <span>Placa do Veículo</span>
                      <strong className="text-white">ABC-1234 (Volvo FH)</strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 flex justify-between items-center">
                      <span>Odômetro Atual</span>
                      <strong className="text-white">142.580 KM</strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-between">
                      <span>Status de Fotos</span>
                      <strong>3 Anexadas ✓</strong>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeAppTab === "yard" && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center text-left"
              >
                <div className="space-y-4">
                  <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold uppercase tracking-wider inline-block">
                    Para Vistoriadores e Pátio
                  </span>
                  <h4 className="text-2xl font-black text-white">Aplicativo de Vistoria de Pátio</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Ferramenta especializada para recepção, entrega e conferência minuciosa de veículos, carretas, ferramentas e máquinas na garagem ou canteiro de obras.
                  </p>
                  <ul className="space-y-2 text-xs text-zinc-300">
                    <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-amber-400" /> Mapeamento de avarias existentes vs novas</li>
                    <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-amber-400" /> Controle de kit de emergência e estepes</li>
                    <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-amber-400" /> Assinatura digital do conferente</li>
                  </ul>
                </div>
                <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 space-y-3 font-mono text-xs">
                  <div className="text-amber-400 font-bold border-b border-zinc-800 pb-2 flex justify-between">
                    <span>MÓDULO DE PÁTIO</span>
                    <span>GARAGEM CENTRAL</span>
                  </div>
                  <div className="text-zinc-300 py-1">
                    Entrada de Veículo: Scania R450 (DEF-5678)
                  </div>
                  <div className="text-emerald-400 py-1 font-bold">
                    ✓ Pneus: OK | Lataria: Sem novas avarias | Nível de Óleo: Conforme
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* AI Assistant Section */}
      <section id="ia" className="py-20 border-b border-zinc-900 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-5 space-y-6 text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold uppercase tracking-wider">
                <Bot size={16} /> Assistente Inteligente CheckDrive AI
              </div>
              <h3 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                Decisões de frota orientadas por Inteligência Artificial
              </h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Faça perguntas diretas sobre seus veículos, máquinas, motoristas e custos. O assistente analisa milhares de dados de checklists e telemetria para responder em segundos.
              </p>

              <div className="space-y-3">
                {aiQueries.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveAiQueryIndex(idx)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all text-xs flex items-center justify-between ${
                      activeAiQueryIndex === idx
                        ? "bg-purple-600/15 border-purple-500/40 text-white font-bold"
                        : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <span>"{q.question}"</span>
                    <ChevronRight size={16} className={activeAiQueryIndex === idx ? "text-purple-400" : "text-zinc-600"} />
                  </button>
                ))}
              </div>
            </div>

            {/* AI Interactive Chat Mockup */}
            <div className="lg:col-span-7 bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl relative">
              <div className="flex items-center justify-between pb-4 border-b border-zinc-800 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                    <Bot size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">CheckDrive Copilot AI</h4>
                    <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Ativo & Conectado
                    </span>
                  </div>
                </div>
                <span className="text-[11px] text-zinc-400 font-mono">Modelo Especializado</span>
              </div>

              {/* Active Query Display */}
              <div className="space-y-4 text-left">
                {/* User Prompt */}
                <div className="flex gap-3 justify-end">
                  <div className="bg-blue-600/20 border border-blue-500/30 text-blue-200 p-4 rounded-2xl rounded-tr-none text-xs max-w-lg leading-relaxed">
                    {aiQueries[activeAiQueryIndex].question}
                  </div>
                </div>

                {/* AI Answer */}
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-400 flex items-center justify-center shrink-0">
                    <Sparkles size={16} />
                  </div>
                  <div className="bg-zinc-950 border border-zinc-800/80 p-5 rounded-2xl rounded-tl-none text-xs text-zinc-300 space-y-3 max-w-xl leading-relaxed">
                    <p>{aiQueries[activeAiQueryIndex].answer}</p>
                    <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between">
                      <span className="text-purple-400 font-bold">{aiQueries[activeAiQueryIndex].metric}</span>
                      <button className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-[11px] transition-all">
                        {aiQueries[activeAiQueryIndex].action}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Safety & Infrastructure Section */}
      <section className="py-20 bg-zinc-900/30 border-b border-zinc-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-xs font-black text-blue-400 uppercase tracking-widest mb-3">
              Segurança Corporativa & Escala
            </h2>
            <h3 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Construído para operações críticas e conformidade total
            </h3>
            <p className="text-zinc-400 text-sm mt-4">
              Arquitetura de dados resiliente, criptografia de dados em repouso e em trânsito com isolamento rigoroso por empresa.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <ShieldCheck size={28} className="text-blue-400 mb-4" />
              <h4 className="text-sm font-bold text-white mb-2">Criptografia & Supabase</h4>
              <p className="text-xs text-zinc-400">Banco de dados relacional criptografado com políticas RLS para garantir privacidade absoluta.</p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <FileText size={28} className="text-emerald-400 mb-4" />
              <h4 className="text-sm font-bold text-white mb-2">Logs de Auditoria de Sistema</h4>
              <p className="text-xs text-zinc-400">Registro inalterável de todas as ações de usuários, logins e alterações de dados em tabela dedicada.</p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <ZapOff size={28} className="text-amber-400 mb-4" />
              <h4 className="text-sm font-bold text-white mb-2">Sincronização Offline-First</h4>
              <p className="text-xs text-zinc-400">Armazenamento local seguro e sincronização resiliente para frotas sem sinal de celular.</p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <Building2 size={28} className="text-purple-400 mb-4" />
              <h4 className="text-sm font-bold text-white mb-2">Multiempresa & Níveis de Acesso</h4>
              <p className="text-xs text-zinc-400">Gerencie filiais e unidades independentes com papéis de SuperAdmin, Admin, Gestor e Motorista.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Target Industry Segments Section */}
      <section id="segmentos" className="py-20 border-b border-zinc-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-xs font-black text-blue-400 uppercase tracking-widest mb-3">
              Segmentos Atendidos
            </h2>
            <h3 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Adaptável a qualquer operação com frota ou maquinário
            </h3>
            <p className="text-zinc-400 text-sm mt-4">
              Plataforma flexível para diferentes indústrias e exigências regulatórias.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
            {[
              { icon: Truck, title: "Transportadoras", desc: "Caminhões, Carretas e Distribuição" },
              { icon: HardHat, title: "Construtoras", desc: "Escavadeiras, Geradores e Obras" },
              { icon: Tractor, title: "Agronegócio", desc: "Tratores, Colheitadeiras e Maquinário" },
              { icon: Pickaxe, title: "Mineração", desc: "Veículos Pesados e Operação Severa" },
              { icon: Factory, title: "Indústrias", desc: "Empilhadeiras e Logística Interna" },
              { icon: Building2, title: "Locadoras", desc: "Controle de Entrega e Devolução" },
              { icon: Zap, title: "Energia & Utilities", desc: "Frotas de Manutenção de Campo" },
              { icon: TreePine, title: "Operações Florestais", desc: "Máquinas e Transbordo de Madeira" },
            ].map((seg, idx) => (
              <div key={idx} className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 hover:border-blue-500/30 transition-all">
                <seg.icon size={24} className="text-blue-400 mb-3" />
                <h4 className="text-sm font-bold text-white mb-1">{seg.title}</h4>
                <p className="text-[11px] text-zinc-400">{seg.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing / SaaS Plans Section */}
      <section id="planos" className="py-20 bg-zinc-900/30 border-b border-zinc-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-black text-blue-400 uppercase tracking-widest mb-3">
              Planos & Investimento
            </h2>
            <h3 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Planos dimensionados para o tamanho da sua operação
            </h3>
            <p className="text-zinc-400 text-sm mt-4">
              Sem custos ocultos. Escolha o plano ideal ou solicite uma proposta personalizada para frotas corporativas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto text-left">
            {/* Plan 1 */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 flex flex-col justify-between space-y-6">
              <div>
                <span className="text-xs font-black uppercase tracking-widest text-zinc-400">Plano Starter</span>
                <h4 className="text-xl font-bold text-white mt-1 mb-3">Pequenas Frotas</h4>
                <p className="text-xs text-zinc-400 leading-relaxed mb-6">
                  Ideal para empresas com até 15 veículos ou máquinas que buscam digitalizar inspeções.
                </p>
                <ul className="space-y-3 text-xs text-zinc-300">
                  <li className="flex items-center gap-2"><Check size={16} className="text-blue-400 shrink-0" /> Até 15 Veículos / Máquinas</li>
                  <li className="flex items-center gap-2"><Check size={16} className="text-blue-400 shrink-0" /> App do Motorista (PWA Offline)</li>
                  <li className="flex items-center gap-2"><Check size={16} className="text-blue-400 shrink-0" /> Alertas por KM e Data</li>
                  <li className="flex items-center gap-2"><Check size={16} className="text-blue-400 shrink-0" /> Relatórios Básicos</li>
                </ul>
              </div>
              <button
                onClick={() => setIsDemoModalOpen(true)}
                className="w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs uppercase tracking-wider transition-all"
              >
                Solicitar Cotação
              </button>
            </div>

            {/* Plan 2 - Featured */}
            <div className="bg-gradient-to-b from-blue-900/30 to-zinc-900 border-2 border-blue-500 rounded-3xl p-8 flex flex-col justify-between space-y-6 relative shadow-2xl">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest shadow-md">
                Mais Popular
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-widest text-blue-400">Plano Pro</span>
                <h4 className="text-xl font-bold text-white mt-1 mb-3">Frotas & Operações Médias</h4>
                <p className="text-xs text-zinc-300 leading-relaxed mb-6">
                  Solução completa com ordens de serviço, assistente IA e notificações via WhatsApp.
                </p>
                <ul className="space-y-3 text-xs text-zinc-200">
                  <li className="flex items-center gap-2"><Check size={16} className="text-blue-400 shrink-0" /> Até 60 Ativos (Veículos e Máquinas)</li>
                  <li className="flex items-center gap-2"><Check size={16} className="text-blue-400 shrink-0" /> Módulo de Baixas com Nota Fiscal</li>
                  <li className="flex items-center gap-2"><Check size={16} className="text-blue-400 shrink-0" /> Assistente de IA CheckDrive</li>
                  <li className="flex items-center gap-2"><Check size={16} className="text-blue-400 shrink-0" /> Integração Disparos WhatsApp</li>
                  <li className="flex items-center gap-2"><Check size={16} className="text-blue-400 shrink-0" /> Relatórios Customizados em PDF com Logo</li>
                </ul>
              </div>
              <button
                onClick={() => setIsDemoModalOpen(true)}
                className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-600/30 transition-all"
              >
                Solicitar Demonstração Pro
              </button>
            </div>

            {/* Plan 3 */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 flex flex-col justify-between space-y-6">
              <div>
                <span className="text-xs font-black uppercase tracking-widest text-purple-400">Plano Enterprise</span>
                <h4 className="text-xl font-bold text-white mt-1 mb-3">Grandes Frotas & Grupos</h4>
                <p className="text-xs text-zinc-400 leading-relaxed mb-6">
                  Para grandes empresas com necessidade de multiempresa, APIs customizadas e suporte dedicado.
                </p>
                <ul className="space-y-3 text-xs text-zinc-300">
                  <li className="flex items-center gap-2"><Check size={16} className="text-purple-400 shrink-0" /> Ativos Ilimitados</li>
                  <li className="flex items-center gap-2"><Check size={16} className="text-purple-400 shrink-0" /> Multiempresa e Multi-Filiais</li>
                  <li className="flex items-center gap-2"><Check size={16} className="text-purple-400 shrink-0" /> Suporte a APIs & Integrações ERP</li>
                  <li className="flex items-center gap-2"><Check size={16} className="text-purple-400 shrink-0" /> Gerente de Conta Dedicado</li>
                </ul>
              </div>
              <button
                onClick={() => setIsDemoModalOpen(true)}
                className="w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs uppercase tracking-wider transition-all"
              >
                Falar com Consultor Enterprise
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Accordion Section */}
      <section id="faq" className="py-20 border-b border-zinc-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-xs font-black text-blue-400 uppercase tracking-widest mb-3">
              Perguntas Frequentes
            </h2>
            <h3 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Tire suas dúvidas sobre o CheckDrive
            </h3>
          </div>

          <div className="space-y-4 text-left">
            {faqItems.map((item, idx) => (
              <div
                key={idx}
                className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden transition-all"
              >
                <button
                  onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                  className="w-full p-5 text-left font-bold text-sm text-white flex items-center justify-between gap-4"
                >
                  <span>{item.question}</span>
                  <ChevronDown
                    size={18}
                    className={`text-zinc-400 shrink-0 transition-transform ${
                      openFaqIndex === idx ? "rotate-180 text-blue-400" : ""
                    }`}
                  />
                </button>
                {openFaqIndex === idx && (
                  <div className="px-5 pb-5 text-xs text-zinc-300 leading-relaxed border-t border-zinc-800/60 pt-3">
                    {item.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final High-Impact CTA Banner */}
      <section className="py-20 relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="bg-gradient-to-b from-blue-900/40 via-zinc-900 to-zinc-950 border border-blue-500/30 rounded-3xl p-8 sm:p-14 shadow-2xl backdrop-blur-md">
            <span className="inline-block px-3.5 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-black uppercase tracking-wider mb-4">
              Transforme sua Operação
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              Pronto para ter total controle e visibilidade da sua frota?
            </h2>
            <p className="text-zinc-300 text-sm mt-4 max-w-2xl mx-auto leading-relaxed">
              Agende uma demonstração gratuita com nossa equipe e veja como o CheckDrive reduz custos com manutenção preventiva e digitaliza a rotina operacional.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => setIsDemoModalOpen(true)}
                className="w-full sm:w-auto px-9 py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-blue-600/30 transition-all hover:scale-[1.02]"
              >
                Solicitar Demonstração Gratuita <ArrowRight size={16} />
              </button>
              <Link
                to="/login"
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-black text-xs uppercase tracking-widest flex items-center justify-center transition-all"
              >
                Acessar Plataforma
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-12 bg-zinc-950 text-zinc-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 text-left">
          {/* Brand Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl overflow-hidden border border-zinc-800 p-0.5 bg-zinc-900">
                <img
                  src="https://phyodfszatjfdfjtzpmm.supabase.co/storage/v1/object/public/Enterprise/logo.jpeg"
                  alt="Logo"
                  className="w-full h-full object-cover rounded-lg"
                />
              </div>
              <span className="font-black text-base text-white italic">CheckDrive</span>
            </div>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              Plataforma Inteligente para Gestão de Ativos, Frotas, Maquinários e Operações com Inteligência Artificial e suporte Offline.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h5 className="font-bold text-white uppercase tracking-wider mb-3">Recursos</h5>
            <ul className="space-y-2 text-zinc-400">
              <li><a href="#recursos" className="hover:text-blue-400 transition-colors">Checklists Digitais</a></li>
              <li><a href="#recursos" className="hover:text-blue-400 transition-colors">Alertas por KM e Horas</a></li>
              <li><a href="#recursos" className="hover:text-blue-400 transition-colors">Ordens de Serviço e NF</a></li>
              <li><a href="#ia" className="hover:text-blue-400 transition-colors">Assistente de IA</a></li>
            </ul>
          </div>

          {/* Apps & Integration */}
          <div>
            <h5 className="font-bold text-white uppercase tracking-wider mb-3">Soluções</h5>
            <ul className="space-y-2 text-zinc-400">
              <li><a href="#aplicativos" className="hover:text-blue-400 transition-colors">Painel do Gestor</a></li>
              <li><a href="#aplicativos" className="hover:text-blue-400 transition-colors">App do Motorista (PWA)</a></li>
              <li><a href="#aplicativos" className="hover:text-blue-400 transition-colors">App de Vistoria de Pátio</a></li>
              <li><a href="#segmentos" className="hover:text-blue-400 transition-colors">Segmentos Atendidos</a></li>
            </ul>
          </div>

          {/* Support & Legal */}
          <div>
            <h5 className="font-bold text-white uppercase tracking-wider mb-3">Acesso & Suporte</h5>
            <ul className="space-y-2 text-zinc-400">
              <li><Link to="/login" className="hover:text-blue-400 transition-colors">Entrar no Sistema</Link></li>
              <li><Link to="/privacy" className="hover:text-blue-400 transition-colors">Política de Privacidade</Link></li>
              <li><button onClick={() => setIsDemoModalOpen(true)} className="hover:text-blue-400 transition-colors text-left">Solicitar Demonstração</button></li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-zinc-900/80 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-zinc-400">
          <div>
            &copy; {new Date().getFullYear()} CheckDrive Gestão de Ativos Ltda. Todos os direitos reservados.
          </div>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Versão v2.4 (Enterprise Production)
            </span>
          </div>
        </div>
      </footer>

      {/* Demo Request Modal */}
      <AnimatePresence>
        {isDemoModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full relative shadow-2xl text-left"
            >
              <button
                onClick={() => {
                  setIsDemoModalOpen(false);
                  setDemoSubmitted(false);
                }}
                className="absolute top-5 right-5 text-zinc-400 hover:text-white p-1"
              >
                <X size={20} />
              </button>

              {!demoSubmitted ? (
                <div>
                  <div className="flex items-center gap-2 text-blue-400 text-xs font-bold uppercase tracking-wider mb-2">
                    <PhoneCall size={16} /> Solicitação de Demonstração
                  </div>
                  <h3 className="text-xl font-black text-white mb-2">Conheça o CheckDrive ao Vivo</h3>
                  <p className="text-xs text-zinc-400 mb-6">
                    Preencha os dados abaixo para que nosso especialista prepare uma apresentação focada na sua frota.
                  </p>

                  <form onSubmit={handleDemoSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-300 mb-1">Seu Nome Completo</label>
                      <input
                        type="text"
                        required
                        value={demoFormData.name}
                        onChange={(e) => setDemoFormData({ ...demoFormData, name: e.target.value })}
                        placeholder="Ex: João da Silva"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-zinc-300 mb-1">E-mail Corporativo</label>
                        <input
                          type="email"
                          required
                          value={demoFormData.email}
                          onChange={(e) => setDemoFormData({ ...demoFormData, email: e.target.value })}
                          placeholder="joao@empresa.com.br"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-300 mb-1">Telefone / WhatsApp</label>
                        <input
                          type="tel"
                          required
                          value={demoFormData.phone}
                          onChange={(e) => setDemoFormData({ ...demoFormData, phone: e.target.value })}
                          placeholder="(11) 99999-9999"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-zinc-300 mb-1">Nome da Empresa</label>
                        <input
                          type="text"
                          required
                          value={demoFormData.company}
                          onChange={(e) => setDemoFormData({ ...demoFormData, company: e.target.value })}
                          placeholder="Ex: Transportadora Santos"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-300 mb-1">Tamanho da Frota</label>
                        <select
                          value={demoFormData.fleetSize}
                          onChange={(e) => setDemoFormData({ ...demoFormData, fleetSize: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-blue-500 focus:outline-none"
                        >
                          <option value="1-10">Até 10 ativos</option>
                          <option value="10-50">10 a 50 ativos</option>
                          <option value="50-200">50 a 200 ativos</option>
                          <option value="200+">Mais de 200 ativos</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-600/30 transition-all mt-2"
                    >
                      Enviar Solicitação de Demonstração
                    </button>
                  </form>
                </div>
              ) : (
                <div className="text-center py-8 space-y-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 size={28} />
                  </div>
                  <h3 className="text-xl font-black text-white">Solicitação Recebida!</h3>
                  <p className="text-xs text-zinc-400">
                    Redirecionando para o WhatsApp do nosso especialista...
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
