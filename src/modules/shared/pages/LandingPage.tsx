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
  Compass,
  KeyRound,
  WifiOff,
  Menu,
} from "lucide-react";

export default function LandingPage() {
  const navigate = useNavigate();

  // State for Interactive Elements
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [activeAppTab, setActiveAppTab] = useState<"admin" | "driver_yard" | "pwa">("admin");
  const [activeGalleryTab, setActiveGalleryTab] = useState<
    "dashboard" | "frota" | "checklist_modal" | "mapa" | "ia" | "viagens" | "manutencao" | "ranking" | "multas" | "motoristas" | "relatorios"
  >("dashboard");
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
      answer: "Analisando 48 ativos... 3 veículos atingiram o limite de tolerância: O caminhão Volvo FH 540 (Placa [PLACA BORRADA]) está a 150 KM da troca de óleo programada. A Scania R450 (Placa [PLACA BORRADA]) possui laudo de segurança a vencer em 4 dias. Recomendo abrir Ordem de Serviço preventiva imediata.",
      metric: "3 Alertas Críticos Identificados",
      action: "Gerar Ordens de Serviço",
    },
    {
      question: "Quais veículos possuem documentos ou laudos próximos do vencimento?",
      answer: "Analisando prazos de licenciamento e laudos... 2 veículos possuem renovação pendente nos próximos 15 dias: O caminhão VW 11.180 (Placa [PLACA BORRADA]) vence laudo de tacógrafo em 5 dias. A Scania R450 possui licenciamento pendente. Notificações já foram geradas.",
      metric: "2 Documentos Próximos do Vencimento",
      action: "Ver Documentações",
    },
    {
      question: "Quais motoristas possuem pendências de checklist pré-viagem?",
      answer: "No momento, 2 motoristas estão com checklist pendente no Aplicativo Motorista & Pátio: Condutor #101 (Scania R450) e Condutor #102 (Carreta Prancha). Notificação via WhatsApp enviada automaticamente para ambos.",
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
      question: "Como funcionam o Painel Admin e o App Motorista & Pátio?",
      answer: "O CheckDrive é um ecossistema modular: O Painel Admin é voltado para gestores (frotas, relatórios, custos, ordens de serviço e IA). O Aplicativo Motorista e Pátio é utilizado no dia a dia pelos condutores e vistoriadores para realizar checklists, registrar avarias e controlar odômetro/horímetro.",
    },
    {
      question: "Como funciona a tecnologia PWA e a contingência quando o app APK não funciona?",
      answer: "O PWA (Progressive Web App) do CheckDrive funciona como uma aplicação web instalável e de contingência imediata: se o aplicativo nativo (APK) apresentar falhas, incompatibilidade ou não estiver instalado no smartphone do motorista, basta acessar o link web no navegador para abrir o App de Vistoria/Checklist instantaneamente. Toda a operação funciona 100% offline, salvando dados localmente até que haja conexão.",
    },
    {
      question: "O CheckDrive suporta máquinas pesadas e equipamentos industriais?",
      answer: "Sim! Além de caminhões, carretas, ônibus e carros, a plataforma gerencia tratores, escavadeiras, empilhadeiras, geradores e equipamentos industriais através do controle preciso por Horímetro (Horas de Uso) e Datas de inspeção.",
    },
    {
      question: "Como funciona a integração e avisos automáticos via WhatsApp?",
      answer: "A plataforma possui integração nativa via API de WhatsApp Business. Quando uma manutenção preventiva se aproxima do limite configurado ou um checklist detecta uma anomalia grave, o sistema dispara um alerta no WhatsApp do motorista ou gestor responsável.",
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
      question: "Como posso solicitar um teste ou demonstração personalizada?",
      answer: "Basta clicar em 'Solicitar Demonstração' em qualquer parte desta página. Nossa equipe de especialistas entrará em contato para apresentar a plataforma ao vivo com os dados e necessidades específicas da sua operação.",
    },
  ];

  const handleDemoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDemoSubmitted(true);
    setTimeout(() => {
      const text = `Olá! Gostaria de solicitar uma demonstração do CheckDrive.%0A%0A*Nome:* ${demoFormData.name}%0A*Empresa:* ${demoFormData.company}%0A*Tamanho da Frota:* ${demoFormData.fleetSize} ativos%0A*Segmento:* ${demoFormData.segment}%0A*Telefone:* ${demoFormData.phone}`;
      window.open(`https://wa.me/553492012702?text=${text}`, "_blank");
    }, 1000);
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
                Gestão de Ativos Operacionais
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-bold text-zinc-400 uppercase tracking-wider">
            <a href="#recursos" className="hover:text-blue-400 transition-colors">
              Recursos
            </a>
            <a href="#galeria" className="hover:text-blue-400 transition-colors text-amber-400 font-extrabold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" /> Telas do Sistema
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

          {/* CTA Actions & Mobile Menu Toggle */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setIsDemoModalOpen(true)}
              className="hidden sm:inline-flex px-4 py-2.5 rounded-xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 text-xs font-bold transition-all items-center gap-2"
            >
              <PhoneCall size={14} className="text-blue-400" />
              Solicitar Demo
            </button>
            <Link
              to="/login"
              className="px-3.5 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-[11px] sm:text-xs font-black uppercase tracking-wider flex items-center gap-1.5 sm:gap-2 shadow-lg shadow-blue-600/25 transition-all"
            >
              Entrar <ArrowRight size={14} className="hidden xs:inline" />
            </Link>

            {/* Mobile Hamburger Toggle Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white transition-colors"
              aria-label="Abrir menu de navegação"
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden bg-zinc-950 border-b border-zinc-800 px-4 py-5 space-y-3 overflow-hidden shadow-2xl"
            >
              <nav className="flex flex-col space-y-2 text-xs font-bold uppercase tracking-wider text-zinc-300">
                <a
                  href="#recursos"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2.5 rounded-xl bg-zinc-900/50 hover:bg-zinc-900 hover:text-blue-400 transition-colors flex items-center justify-between"
                >
                  <span>Recursos</span>
                  <ChevronRight size={14} className="text-zinc-600" />
                </a>
                <a
                  href="#galeria"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 font-extrabold flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    Telas do Sistema
                  </span>
                  <ChevronRight size={14} className="text-amber-500" />
                </a>
                <a
                  href="#aplicativos"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2.5 rounded-xl bg-zinc-900/50 hover:bg-zinc-900 hover:text-blue-400 transition-colors flex items-center justify-between"
                >
                  <span>Aplicativos & Módulos</span>
                  <ChevronRight size={14} className="text-zinc-600" />
                </a>
                <a
                  href="#ia"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <Bot size={14} /> Inteligência Artificial
                  </span>
                  <ChevronRight size={14} className="text-purple-400" />
                </a>
                <a
                  href="#beneficios"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2.5 rounded-xl bg-zinc-900/50 hover:bg-zinc-900 hover:text-blue-400 transition-colors flex items-center justify-between"
                >
                  <span>Diferenciais</span>
                  <ChevronRight size={14} className="text-zinc-600" />
                </a>
                <a
                  href="#segmentos"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2.5 rounded-xl bg-zinc-900/50 hover:bg-zinc-900 hover:text-blue-400 transition-colors flex items-center justify-between"
                >
                  <span>Segmentos Atendidos</span>
                  <ChevronRight size={14} className="text-zinc-600" />
                </a>
                <a
                  href="#planos"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2.5 rounded-xl bg-zinc-900/50 hover:bg-zinc-900 hover:text-blue-400 transition-colors flex items-center justify-between"
                >
                  <span>Planos & Investimento</span>
                  <ChevronRight size={14} className="text-zinc-600" />
                </a>
                <a
                  href="#faq"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2.5 rounded-xl bg-zinc-900/50 hover:bg-zinc-900 hover:text-blue-400 transition-colors flex items-center justify-between"
                >
                  <span>Perguntas Frequentes (FAQ)</span>
                  <ChevronRight size={14} className="text-zinc-600" />
                </a>
              </nav>

              <div className="pt-2 border-t border-zinc-800 flex flex-col gap-2">
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setIsDemoModalOpen(true);
                  }}
                  className="w-full py-3 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-300 text-xs font-bold flex items-center justify-center gap-2"
                >
                  <PhoneCall size={14} className="text-blue-400" />
                  Solicitar Demonstração
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Hero Section */}
      <section className="relative pt-12 pb-20 lg:pt-20 lg:pb-28 overflow-hidden border-b border-zinc-900">
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
              Sistema Inteligente para Gestão de Ativos Operacionais
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight"
            >
              A plataforma inteligente para gestão de{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-sky-400">
                ativos operacionais.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-6 text-base sm:text-lg text-zinc-300 max-w-3xl mx-auto leading-relaxed font-normal"
            >
              Integração completa em um único lugar: **Painel Admin**, **Aplicativo Motorista e Pátio** e **App PWA de Vistoria/Contingência** (para uso imediato via navegador sempre que o app APK nativo não funcionar ou estiver indisponível).
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
                href="#aplicativos"
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
            <div className="bg-zinc-950/80 px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl flex items-center justify-between border border-zinc-800/80">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-rose-500/80 shrink-0" />
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-amber-500/80 shrink-0" />
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-500/80 shrink-0" />
                <span className="ml-1 sm:ml-3 text-[11px] sm:text-xs font-mono text-zinc-400 truncate">
                  checkdrive.app/painel-gestor
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 shrink-0">
                <span className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] sm:text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span className="hidden xs:inline">Sistema </span>Online & PWA Sincronizado
                </span>
              </div>
            </div>

            {/* Mockup Dashboard Content */}
            <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 bg-zinc-950/60 text-left">
              {/* Stat Card 1 */}
              <div className="bg-zinc-900 border border-zinc-800/80 rounded-2xl p-4">
                <div className="flex items-center justify-between text-zinc-400 text-[11px] font-bold uppercase tracking-wider mb-2">
                  <span>Painel Admin</span>
                  <Building2 size={16} className="text-blue-400" />
                </div>
                <div className="text-xl font-black text-white">128 Ativos</div>
                <p className="text-[11px] text-emerald-400 mt-1 font-semibold flex items-center gap-1">
                  <CheckCircle2 size={12} /> Frotas e Custos em Dia
                </p>
              </div>

              {/* Stat Card 2 */}
              <div className="bg-zinc-900 border border-zinc-800/80 rounded-2xl p-4">
                <div className="flex items-center justify-between text-zinc-400 text-[11px] font-bold uppercase tracking-wider mb-2">
                  <span>App Motorista & Pátio</span>
                  <Smartphone size={16} className="text-emerald-400" />
                </div>
                <div className="text-xl font-black text-white">42 Checklists</div>
                <p className="text-[11px] text-blue-400 mt-1 font-semibold flex items-center gap-1">
                  <CheckSquare size={12} /> Vistorias com Fotos
                </p>
              </div>

              {/* Stat Card 3 */}
              <div className="bg-zinc-900 border border-zinc-800/80 rounded-2xl p-4">
                <div className="flex items-center justify-between text-zinc-400 text-[11px] font-bold uppercase tracking-wider mb-2">
                  <span>Ordens de Serviço</span>
                  <Wrench size={16} className="text-purple-400" />
                </div>
                <div className="text-xl font-black text-white">14 Manutenções</div>
                <p className="text-[11px] text-purple-400 mt-1 font-semibold flex items-center gap-1">
                  <ShieldCheck size={12} /> OSs em Acompanhamento
                </p>
              </div>

              {/* Stat Card 4 */}
              <div className="bg-zinc-900 border border-zinc-800/80 rounded-2xl p-4">
                <div className="flex items-center justify-between text-zinc-400 text-[11px] font-bold uppercase tracking-wider mb-2">
                  <span>PWA Offline-First</span>
                  <WifiOff size={16} className="text-amber-400" />
                </div>
                <div className="text-xl font-black text-white">100% Offline</div>
                <p className="text-[11px] text-amber-400 mt-1 font-semibold flex items-center gap-1">
                  <Zap size={12} /> Sync Automático
                </p>
              </div>
            </div>
          </motion.div>

          {/* Core Highlights Bar */}
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 text-left max-w-5xl mx-auto">
            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 backdrop-blur-sm">
              <div className="flex items-center gap-3 text-blue-400 mb-1.5">
                <Building2 size={20} />
                <span className="text-xs font-black uppercase tracking-wider text-zinc-200">
                  Painel Admin
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Central de inteligência para gestão da frota, custos, manutenções, relatórios e permissões.
              </p>
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 backdrop-blur-sm">
              <div className="flex items-center gap-3 text-emerald-400 mb-1.5">
                <Smartphone size={20} />
                <span className="text-xs font-black uppercase tracking-wider text-zinc-200">
                  Motorista & Pátio
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Checklists digitais de saída e retorno, vistorias de avarias com fotos e controle de KM/Horímetro.
              </p>
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 backdrop-blur-sm">
              <div className="flex items-center gap-3 text-purple-400 mb-1.5">
                <Wrench size={20} />
                <span className="text-xs font-black uppercase tracking-wider text-zinc-200">
                  Ordens de Serviço
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Controle de manutenções preventivas e corretivas com lançamento de notas fiscais e custos.
              </p>
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 backdrop-blur-sm">
              <div className="flex items-center gap-3 text-amber-400 mb-1.5">
                <WifiOff size={20} />
                <span className="text-xs font-black uppercase tracking-wider text-zinc-200">
                  PWA (Offline-First)
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Instalação direta em smartphones sem loja de apps com operação 100% offline em áreas rurais ou sem sinal.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Ecosystem Applications Section */}
      <section id="aplicativos" className="py-20 bg-zinc-900/30 border-b border-zinc-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-xs font-black text-blue-400 uppercase tracking-widest mb-3">
              Módulos da Plataforma
            </h2>
            <h3 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Os pilares do ecossistema CheckDrive
            </h3>
            <p className="text-zinc-400 text-sm mt-4">
              Cada perfil da sua operação possui a interface exata que precisa para trabalhar com velocidade e precisão.
            </p>

            {/* App Tab Switcher */}
            <div className="mt-8 flex flex-wrap sm:inline-flex justify-center p-1.5 rounded-2xl bg-zinc-900 border border-zinc-800 max-w-full overflow-x-auto gap-1">
              <button
                onClick={() => setActiveAppTab("admin")}
                className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                  activeAppTab === "admin"
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Building2 size={15} /> Painel Admin
              </button>
              <button
                onClick={() => setActiveAppTab("driver_yard")}
                className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                  activeAppTab === "driver_yard"
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Smartphone size={15} /> App Motorista & Pátio
              </button>
              <button
                onClick={() => setActiveAppTab("pwa")}
                className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                  activeAppTab === "pwa"
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <WifiOff size={15} /> PWA (Offline-First)
              </button>
            </div>
          </div>

          {/* Tab Content Display */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl sm:rounded-3xl p-5 sm:p-8 max-w-5xl mx-auto shadow-2xl">
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
                  <h4 className="text-2xl font-black text-white">Painel Administrativo da Empresa</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Central de comando para cadastrar frota, definir regras de alertas por KM/Horas, aprovar ordens de serviço, gerenciar custos acumulados, anexar NFs, controlar infrações e visualizar relatórios em PDF com sua logomarca.
                  </p>
                  <ul className="space-y-2 text-xs text-zinc-300">
                    <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-blue-400" /> Relatórios executivos e auditoria em tempo real</li>
                    <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-blue-400" /> Aprovação de ordens de serviço e baixas com NF</li>
                    <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-blue-400" /> Gestão Multiempresa com controle de acesso (RLS)</li>
                  </ul>
                </div>
                <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 space-y-3 font-mono text-xs">
                  <div className="text-zinc-400 font-bold border-b border-zinc-800 pb-2 flex justify-between">
                    <span>PAINEL ADMIN</span>
                    <span className="text-emerald-400">OPERACIONAL</span>
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

            {activeAppTab === "driver_yard" && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center text-left"
              >
                <div className="space-y-4">
                  <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase tracking-wider inline-block">
                    Para Motoristas, Operadores e Vistoriadores
                  </span>
                  <h4 className="text-2xl font-black text-white">Aplicativo Motorista & Pátio</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Interface otimizada para smartphones e tablets. Permite que motoristas realizem checklists de saída e retorno, tirem fotos obrigatórias de avarias e que o conferente de pátio registre entradas e saídas na garagem.
                  </p>
                  <ul className="space-y-2 text-xs text-zinc-300">
                    <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-400" /> Aferição obrigatória de Odômetro e Horímetro</li>
                    <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-400" /> Mapeamento de avarias com fotos obrigatórias</li>
                    <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-400" /> Conferência rápida em pátios e garagens</li>
                  </ul>
                </div>
                <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 space-y-3">
                  <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider border-b border-zinc-800 pb-2">
                    Checklist & Vistoria de Pátio
                  </div>
                  <div className="space-y-2 text-xs text-zinc-300">
                    <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 flex justify-between items-center">
                      <span>Placa / Ativo</span>
                      <strong className="text-white">[PLACA BORRADA] (Volvo FH)</strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 flex justify-between items-center">
                      <span>Odômetro / Horímetro</span>
                      <strong className="text-white">142.580 KM</strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-between">
                      <span>Fotos de Avarias</span>
                      <strong>3 Anexadas ✓</strong>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeAppTab === "pwa" && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center text-left"
              >
                <div className="space-y-4">
                  <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold uppercase tracking-wider inline-block">
                    Contingência & Acesso Web Imediato
                  </span>
                  <h4 className="text-2xl font-black text-white">App PWA Vistoria & Backup do APK</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Desenvolvido com tecnologia PWA (Progressive Web App) para servir de suporte instantâneo: caso o aplicativo nativo (APK) não funcione, trave ou não esteja instalado no celular do motorista/operador, ele pode abrir o PWA via navegador para realizar vistorias e checklists sem paralisação da operação.
                  </p>
                  <ul className="space-y-2 text-xs text-zinc-300">
                    <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-amber-400" /> Contingência imediata quando o aplicativo APK falhar</li>
                    <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-amber-400" /> Acesso instantâneo no navegador sem precisar baixar APK</li>
                    <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-amber-400" /> Sincronização offline e salvamento automático local</li>
                  </ul>
                </div>
                <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 space-y-3 font-mono text-xs">
                  <div className="text-amber-400 font-bold border-b border-zinc-800 pb-2 flex justify-between">
                    <span>APP PWA CONTINGÊNCIA</span>
                    <span className="text-emerald-400">PRONTO PARA USO</span>
                  </div>
                  <div className="text-zinc-300 py-1">
                    [Status APK] Instabilidade detectada ou dispositivo incompatível
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 font-sans text-xs">
                    ⚡ <strong>Modo PWA Ativado:</strong> Vistoria e Checklist concluídos com sucesso via Web PWA!
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* Real System Gallery Section */}
      <section id="galeria" className="py-20 bg-zinc-900/60 border-b border-zinc-900 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider inline-flex items-center gap-2 mb-3">
              <Sparkles size={14} className="animate-pulse" /> Telas do Sistema em Produção
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Interface Operacional do CheckDrive
            </h2>
            <p className="text-zinc-400 text-sm mt-3 leading-relaxed">
              Explore o ecossistema completo em alta fidelidade: Painel Admin, controle de frotas, checklists com fotos reais, rastreamento GPS vivo, inteligência artificial e relatórios.
            </p>
          </div>

          {/* LGPD Security & Data Blur Banner */}
          <div className="max-w-4xl mx-auto bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 sm:p-4 mb-6 sm:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-200 text-xs shadow-lg backdrop-blur-md">
            <div className="flex items-start sm:items-center gap-2.5 sm:gap-3">
              <ShieldCheck size={20} className="text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
              <span>
                <strong>Proteção de Dados & Privacidade (LGPD):</strong> Por questões de segurança, todas as fotos do sistema possuem descaracterização/desfoque automático de placas, e dados como RENAVAM, Chassi, CPFs e e-mails foram devidamente mascarados nesta demonstração.
              </span>
            </div>
            <span className="self-end sm:self-center bg-amber-400/20 text-amber-300 font-bold px-3 py-1 rounded-xl text-[10px] uppercase tracking-wider shrink-0 border border-amber-400/30">
              Dados Borrados ✓
            </span>
          </div>

          {/* Gallery Category Filter Pills */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mb-6 sm:mb-8 max-w-full overflow-x-auto pb-2 sm:pb-0">
            {[
              { id: "dashboard", label: "Dashboard Admin", icon: BarChart3 },
              { id: "frota", label: "Frota & Caminhões", icon: Truck },
              { id: "checklist_modal", label: "Checklist com Fotos", icon: CheckSquare },
              { id: "mapa", label: "GPS Vivo ao Vivo", icon: MapPin },
              { id: "ia", label: "IA Gemini Chatbot", icon: Bot },
              { id: "viagens", label: "Histórico de Envios", icon: Clock },
              { id: "manutencao", label: "Pendências OS", icon: Wrench },
              { id: "ranking", label: "Ranking Motoristas", icon: Award },
              { id: "multas", label: "Infrações & Multas", icon: ShieldCheck },
              { id: "motoristas", label: "Cadastro Motoristas", icon: Users },
              { id: "relatorios", label: "Relatórios & Ocorrências", icon: FileText },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveGalleryTab(tab.id as any)}
                className={`px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
                  activeGalleryTab === tab.id
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30 border border-blue-500"
                    : "bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
                }`}
              >
                <tab.icon size={14} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Interactive Screen Showcase Frame */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl text-left">
            {/* Window Browser Header */}
            <div className="bg-zinc-900 border-b border-zinc-800 px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-rose-500/80 shrink-0" />
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-amber-500/80 shrink-0" />
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-500/80 shrink-0" />
                <span className="text-[10px] sm:text-[11px] font-mono text-zinc-500 ml-1 truncate max-w-[120px] sm:max-w-none">
                  checkdrive.com.br/admin/{activeGalleryTab}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] sm:text-[11px] text-zinc-400 shrink-0">
                <span className="flex items-center gap-1 font-bold text-white bg-zinc-800/80 px-2 sm:px-2.5 py-1 rounded-lg truncate">
                  <Building2 size={12} className="text-blue-400 shrink-0" /> Caiapó Cargas
                </span>
                <span className="hidden sm:inline-block text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                  ● Online
                </span>
              </div>
            </div>

            {/* Screen Content Showcase Container */}
            <div className="p-3 sm:p-6 min-h-[440px] bg-slate-50 text-zinc-900 font-sans">
              <AnimatePresence mode="wait">
                {/* 1. DASHBOARD ADMIN */}
                {activeGalleryTab === "dashboard" && (
                  <motion.div
                    key="dashboard"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center justify-between border-b pb-3">
                      <div>
                        <h3 className="text-xl font-black text-slate-800">Visão Geral da Frota</h3>
                        <p className="text-xs text-slate-500">Monitoramento geral de ativos, checklists e manutenção em tempo real</p>
                      </div>
                      <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                        Painel Executivo
                      </span>
                    </div>

                    {/* Top KPIs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                      <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Checklists Hoje</span>
                        <div className="flex items-baseline justify-between mt-2">
                          <span className="text-2xl sm:text-3xl font-black text-emerald-900">1</span>
                          <span className="text-[11px] text-emerald-700">Enviados hoje</span>
                        </div>
                      </div>
                      <div className="p-3.5 sm:p-4 rounded-2xl bg-sky-50 border border-sky-200 flex flex-col justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-sky-700">Veículos Ativos</span>
                        <div className="flex items-baseline justify-between mt-2">
                          <span className="text-2xl sm:text-3xl font-black text-sky-900">59</span>
                          <span className="text-[11px] text-sky-700">Frota cadastrada</span>
                        </div>
                      </div>
                      <div className="p-3.5 sm:p-4 rounded-2xl bg-rose-50 border border-rose-200 flex flex-col justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-rose-700">Defeitos Ativos</span>
                        <div className="flex items-baseline justify-between mt-2">
                          <span className="text-2xl sm:text-3xl font-black text-rose-900">66</span>
                          <span className="text-[11px] text-rose-700">Pendentes correção</span>
                        </div>
                      </div>
                      <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Média de Score</span>
                        <div className="flex items-baseline justify-between mt-2">
                          <span className="text-2xl sm:text-3xl font-black text-amber-900">873 <span className="text-xs font-normal">pts</span></span>
                          <span className="text-[11px] text-amber-700">Performance geral</span>
                        </div>
                      </div>
                    </div>

                    {/* Middle Section: Pendências & Top Motoristas */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="lg:col-span-2 p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                            <AlertTriangle size={16} className="text-rose-500" />
                            Pendências Críticas da Frota
                          </h4>
                          <span className="text-[11px] text-purple-600 bg-purple-50 px-2 py-0.5 rounded font-bold">Manutenção</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {[
                            { model: "SCANIA G-360", plate: "PLACA •••••••", defects: 5 },
                            { model: "VOLVO VM-270", plate: "PLACA •••••••", defects: 5 },
                            { model: "VW 11.180-DRC", plate: "PLACA •••••••", defects: 5 },
                          ].map((truck, i) => (
                            <div key={i} className="p-3 rounded-xl border border-amber-200 bg-amber-50/50 space-y-2">
                              <div className="flex justify-between items-start">
                                <span className="text-[11px] font-bold text-slate-500">{truck.model}</span>
                                <span className="text-xs font-black text-slate-900">{truck.plate}</span>
                              </div>
                              <div className="text-xs font-bold text-rose-600 flex items-center gap-1">
                                <AlertTriangle size={12} /> {truck.defects} Defeitos Ativos
                              </div>
                              <button className="w-full py-1.5 rounded bg-slate-900 text-white font-bold text-[10px] hover:bg-slate-800">
                                ENCAMINHAR MANUTENÇÃO
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Top Motoristas */}
                      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
                        <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                          <Award size={16} className="text-amber-500" /> Top Motoristas
                        </h4>
                        <div className="space-y-2 text-xs">
                          {[
                            { name: "Condutor #101 (LGPD)", score: 1000, rank: "🥇" },
                            { name: "Condutor #102 (LGPD)", score: 1000, rank: "🥈" },
                            { name: "Condutor #103 (LGPD)", score: 1000, rank: "🥉" },
                          ].map((m, idx) => (
                            <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span>{m.rank}</span>
                                <span className="font-bold text-slate-800">{m.name}</span>
                              </div>
                              <span className="font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                {m.score} pts
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 2. FROTA & CAMINHÕES */}
                {activeGalleryTab === "frota" && (
                  <motion.div
                    key="frota"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center justify-between border-b pb-3">
                      <div>
                        <h3 className="text-xl font-black text-slate-800">Gestão de Ativos Operacionais</h3>
                        <p className="text-xs text-slate-500">Cadastro de veículos pesados, leves e máquinas com fotos reais da garagem (placas desfocadas por segurança)</p>
                      </div>
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                        59 Ativos Ativos
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
                      {[
                        {
                          plate: "PLACA •••••••",
                          model: "Vw 10.160-DRC",
                          color: "BRANCA",
                          year: "2018/2017",
                          renavam: "•••••••••••",
                          chassi: "•••••••••••••••••",
                          img: "https://phyodfszatjfdfjtzpmm.supabase.co/storage/v1/object/public/Enterprise/pzg9202.jpeg",
                        },
                        {
                          plate: "PLACA •••••••",
                          model: "Volvo VM-290",
                          color: "BRANCA",
                          year: "2024/2023",
                          renavam: "•••••••••••",
                          chassi: "•••••••••••••••••",
                          img: "https://phyodfszatjfdfjtzpmm.supabase.co/storage/v1/object/public/Enterprise/qmy5j12.jpeg",
                        },
                        {
                          plate: "PLACA •••••••",
                          model: "Vw 10.160-DRC",
                          color: "BRANCA",
                          year: "2018/2017",
                          renavam: "•••••••••••",
                          chassi: "•••••••••••••••••",
                          img: "https://phyodfszatjfdfjtzpmm.supabase.co/storage/v1/object/public/Enterprise/qnj0322.jpeg",
                        },
                      ].map((v, idx) => (
                        <div key={idx} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                          <div className="h-44 bg-slate-900 relative overflow-hidden group">
                            <img
                              src={v.img}
                              alt="Foto de Veículo Desfocada"
                              className="w-full h-full object-cover object-center filter blur-[12px] scale-110 pointer-events-none select-none"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                              }}
                            />
                            {/* Blur overlay over license plate region */}
                            <div className="absolute inset-x-0 bottom-0 py-2 px-3 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent flex items-center justify-between text-white text-[10px] font-mono">
                              <span className="flex items-center gap-1.5 text-emerald-400 font-bold bg-slate-900/90 px-2 py-0.5 rounded border border-emerald-500/40">
                                <Lock size={10} className="text-amber-400" /> Placa Borrada (LGPD)
                              </span>
                              <span className="text-[9px] text-slate-300">PROTEÇÃO DE DADOS</span>
                            </div>
                            <div className="absolute top-3 right-3 bg-blue-600/90 backdrop-blur-md text-white font-black text-[10px] px-2.5 py-1 rounded-full uppercase">
                              VEÍCULO
                            </div>
                          </div>
                          <div className="p-4 space-y-3 text-xs">
                            <div className="flex justify-between items-center">
                              <h4 className="text-lg font-black text-slate-900">{v.plate}</h4>
                              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{v.model}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-mono">
                              <div><strong>MODELO:</strong> {v.model}</div>
                              <div><strong>COR:</strong> {v.color}</div>
                              <div><strong>ANO:</strong> {v.year}</div>
                              <div><strong>RENAVAM:</strong> {v.renavam}</div>
                              <div className="col-span-2"><strong>CHASSI:</strong> {v.chassi}</div>
                            </div>
                            <button className="w-full py-2 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5">
                              <span>VER TUDO</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* 3. CHECKLIST COM FOTOS */}
                {activeGalleryTab === "checklist_modal" && (
                  <motion.div
                    key="checklist_modal"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-5"
                  >
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-3 gap-3">
                        <div>
                          <span className="text-xs font-black text-purple-600 uppercase tracking-wider block">Detalhes do Checklist nº 59BAD518</span>
                          <span className="text-[11px] text-slate-500">Realizado em 26/07/2026 às 01:37:51</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200">
                            🖨️ IMPRIMIR
                          </button>
                          <button className="px-3 py-1.5 rounded-xl bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200">
                            ⚠️ APLICAR PENALIDADE
                          </button>
                        </div>
                      </div>

                      {/* Details Header Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 bg-slate-50 p-3.5 rounded-xl text-xs border border-slate-200">
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">MOTORISTA</span>
                          <strong className="text-slate-800">Condutor Cadastrado (LGPD)</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">VEÍCULO / PLACA</span>
                          <strong className="text-slate-800">PLACA ••••••• (Volvo VM-270)</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">STATUS / KM</span>
                          <span className="text-rose-600 font-black bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            PENDING 597287 KM
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">LOCALIZAÇÃO</span>
                          <strong className="text-blue-600 underline">Ver no Mapa</strong>
                        </div>
                      </div>

                      {/* Reported Defects */}
                      <div className="space-y-3">
                        <span className="text-xs font-bold text-rose-600 flex items-center gap-1">
                          <AlertTriangle size={14} /> DEFEITOS ENCONTRADOS (2 defeitos)
                        </span>

                        <div className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-200 text-xs space-y-1">
                          <div className="flex justify-between font-bold text-rose-800">
                            <span>Óleo</span>
                            <span className="bg-rose-600 text-white text-[10px] px-2 py-0.5 rounded">DEFEITO</span>
                          </div>
                          <p className="text-slate-600 text-[11px]">
                            <strong>DESCRIÇÃO REPORTADA:</strong> Gerado automaticamente via Edge Function. KM Alvo atingido na vistoria (595361 km).
                          </p>
                        </div>

                        <div className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-200 text-xs space-y-1">
                          <div className="flex justify-between font-bold text-rose-800">
                            <span>Outros</span>
                            <span className="bg-rose-600 text-white text-[10px] px-2 py-0.5 rounded">DEFEITO</span>
                          </div>
                          <p className="text-slate-600 text-[11px]">
                            <strong>DESCRIÇÃO REPORTADA:</strong> parabrisa risca; parabrisa ruim é farois; faróis com defeito | Retrovisor lateral danificado
                          </p>
                        </div>
                      </div>

                      {/* Vehicle Inspection Photos (4 Required Angles) */}
                      <div className="space-y-2 pt-2 border-t">
                        <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                          <span>FOTOS DO VEÍCULO (4 Anexadas com Placas Borradas)</span>
                          <span className="text-emerald-600 font-bold flex items-center gap-1">
                            <Lock size={12} /> Placas Desfocadas (LGPD)
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {[
                            { title: "TRASEIRA", label: "Vista Baú Traseiro", img: "https://phyodfszatjfdfjtzpmm.supabase.co/storage/v1/object/public/Enterprise/chk_1.jpeg" },
                            { title: "LATERAL ESQUERDA", label: "Lateral do Caminhão", img: "https://phyodfszatjfdfjtzpmm.supabase.co/storage/v1/object/public/Enterprise/chk_2.jpeg" },
                            { title: "DIANTEIRA", label: "Cabine Frontal", img: "https://phyodfszatjfdfjtzpmm.supabase.co/storage/v1/object/public/Enterprise/chk_3.jpeg" },
                            { title: "LATERAL DIREITA", label: "Lateral Direita", img: "https://phyodfszatjfdfjtzpmm.supabase.co/storage/v1/object/public/Enterprise/chk_4.jpeg" },
                          ].map((photo, pIdx) => (
                            <div key={pIdx} className="bg-slate-900 rounded-xl overflow-hidden border border-slate-200 text-center relative group">
                              <div className="h-28 bg-slate-800 overflow-hidden relative">
                                <img
                                  src={photo.img}
                                  alt="Foto de Vistoria Desfocada"
                                  className="w-full h-full object-cover filter blur-[12px] scale-110 pointer-events-none select-none"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = "none";
                                  }}
                                />
                                <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-[0.5px] flex items-center justify-center">
                                  <span className="bg-slate-900/90 backdrop-blur-md text-amber-300 text-[9px] font-mono font-bold px-2 py-1 rounded-md border border-amber-500/30 flex items-center gap-1 shadow-md">
                                    <Lock size={10} className="text-amber-400" /> Placa Borrada
                                  </span>
                                </div>
                              </div>
                              <div className="p-1.5 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider flex items-center justify-between px-2">
                                <span>{photo.title}</span>
                                <span className="text-[9px] text-emerald-400 font-mono">LGPD ✓</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 4. MAPA GPS VIVO */}
                {activeGalleryTab === "mapa" && (
                  <motion.div
                    key="mapa"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                    <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                        <div>
                          <h4 className="text-base font-bold text-white flex items-center gap-2">
                            <Radio size={18} className="text-emerald-400 animate-pulse" /> Monitoramento Vivo
                          </h4>
                          <span className="text-xs text-slate-400">Frota e Motoristas rastreados em tempo real via GPS</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 text-[11px] sm:text-xs font-mono">
                          <span className="px-2 sm:px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Mover: 0</span>
                          <span className="px-2 sm:px-2.5 py-1 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">Parados: 0</span>
                          <span className="px-2 sm:px-2.5 py-1 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">Viagens: 1</span>
                          <span className="px-2 sm:px-2.5 py-1 rounded bg-slate-800 text-slate-300">Vel: 0 km/h</span>
                        </div>
                      </div>

                      {/* Map Display Mockup */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl space-y-2 text-xs">
                          <span className="text-[11px] font-bold text-slate-400 uppercase">Motoristas Rasteados (56)</span>
                          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                            {[
                              { name: "Condutor #104 (LGPD)", status: "Parado • Offline" },
                              { name: "Condutor #105 (LGPD)", status: "Parado • Nunca registrou" },
                              { name: "Condutor #106 (LGPD)", status: "Parado • Offline" },
                              { name: "Condutor #107 (LGPD)", status: "Parado • Offline" },
                              { name: "Condutor #108 (LGPD)", status: "Parado • Offline" },
                            ].map((d, dIdx) => (
                              <div key={dIdx} className="p-2 rounded bg-slate-900 border border-slate-800 flex justify-between items-center">
                                <span className="font-bold text-slate-200">{d.name}</span>
                                <span className="text-[10px] text-slate-400">{d.status}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="md:col-span-2 bg-emerald-950/20 border border-emerald-800/40 rounded-xl p-4 flex flex-col justify-between h-64 relative overflow-hidden bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px]">
                          <div className="flex justify-between items-start z-10">
                            <span className="bg-slate-900/90 text-emerald-400 text-[10px] font-mono px-2.5 py-1 rounded border border-emerald-500/30">
                              MAPA GOIÁS & MINAS GERAIS
                            </span>
                            <span className="bg-blue-600 text-white font-bold text-[10px] px-2.5 py-1 rounded-full shadow">
                              📍 2 Marcadores Ativos
                            </span>
                          </div>

                          <div className="space-y-2 z-10 my-auto text-center">
                            <div className="inline-block bg-slate-900 border border-slate-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-xl">
                              🚗 Condutor #109 (LGPD)
                            </div>
                            <div className="block" />
                            <div className="inline-block bg-slate-900 border border-slate-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-xl ml-12">
                              🚛 Condutor #104 (Uberlândia - MG)
                            </div>
                          </div>

                          <div className="flex justify-between items-center z-10 text-[11px] text-slate-400 font-mono">
                            <span>Goiânia • Anápolis • Jataí • Uberlândia</span>
                            <span>Último Sinal: há 11 min</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 5. IA GEMINI CHATBOT */}
                {activeGalleryTab === "ia" && (
                  <motion.div
                    key="ia"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                    <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-purple-600/30 border border-purple-500/40 text-purple-300 flex items-center justify-center">
                            <Bot size={18} />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white">CheckDrive AI</h4>
                            <span className="text-[10px] text-emerald-400">● Base de Dados Conectada • Gemini AI Engine</span>
                          </div>
                        </div>
                        <button className="text-[11px] text-slate-400 hover:text-white border border-slate-700 px-2.5 py-1 rounded">
                          🔄 Limpar Chat
                        </button>
                      </div>

                      {/* Chat History */}
                      <div className="space-y-3 text-xs">
                        <div className="flex justify-end">
                          <div className="bg-purple-600 text-white p-3 rounded-2xl rounded-tr-none max-w-md font-bold">
                            Quais peças estão no estoque?
                          </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-slate-200">
                          <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold uppercase inline-block">
                            INTENÇÃO RECONHECIDA: ESTOQUE, ALMOXARIFADO E PEÇAS
                          </span>
                          <h5 className="font-bold text-white text-sm">📦 Relatório do Estoque e Almoxarifado</h5>
                          <ul className="space-y-1 text-slate-300 text-[11px]">
                            <li>• <strong>Total de Peças/Itens Cadastrados:</strong> 92 itens</li>
                            <li>• <strong>Valor Total do Estoque Estimado:</strong> R$ 720,00</li>
                            <li>• <strong>Fornecedores Cadastrados:</strong> 30</li>
                          </ul>
                        </div>
                      </div>

                      {/* Suggested Prompts */}
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800 text-[11px]">
                        {[
                          "Quanto gastei com combustível este mês?",
                          "Qual veículo tem a maior quilometragem?",
                          "Quais motoristas estão em viagem?",
                          "Gere um resumo da operação de hoje",
                        ].map((p, pI) => (
                          <span key={pI} className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 cursor-pointer">
                            {p} →
                          </span>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 6. HISTÓRICO DE ENVIOS */}
                {activeGalleryTab === "viagens" && (
                  <motion.div
                    key="viagens"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                      <div className="flex justify-between items-center border-b pb-3">
                        <h4 className="text-base font-black text-slate-800">Histórico de Envios & Vistorias</h4>
                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded border border-blue-200">
                          Registro de Atividades
                        </span>
                      </div>

                      <div className="overflow-x-auto -mx-1">
                        <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                          <thead>
                            <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                              <th className="py-2.5 px-3">DATA</th>
                              <th className="py-2.5 px-3">MOTORISTA</th>
                              <th className="py-2.5 px-3">VEÍCULO</th>
                              <th className="py-2.5 px-3">TIPO</th>
                              <th className="py-2.5 px-3 text-right">AÇÕES</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {[
                              { date: "26/07/2026 01:37", driver: "Condutor #101 (LGPD)", vehicle: "PLACA •••••••", type: "FIM DE VIAGEM" },
                              { date: "25/07/2026 15:01", driver: "Condutor #101 (LGPD)", vehicle: "PLACA •••••••", type: "ABASTECIMENTO" },
                              { date: "25/07/2026 14:41", driver: "Condutor #101 (LGPD)", vehicle: "PLACA •••••••", type: "INÍCIO DE VIAGEM" },
                              { date: "25/07/2026 07:00", driver: "Condutor #101 (LGPD)", vehicle: "PLACA •••••••", type: "FIM DE VIAGEM" },
                              { date: "25/07/2026 06:37", driver: "Condutor #103 (LGPD)", vehicle: "PLACA •••••••", type: "FIM DE VIAGEM" },
                              { date: "25/07/2026 06:25", driver: "Condutor #110 (LGPD)", vehicle: "PLACA •••••••", type: "FIM DE VIAGEM" },
                            ].map((row, rIdx) => (
                              <tr key={rIdx} className="hover:bg-slate-50">
                                <td className="py-2.5 px-3 font-bold text-slate-800">{row.date}</td>
                                <td className="py-2.5 px-3 font-bold text-slate-900">{row.driver}</td>
                                <td className="py-2.5 px-3 font-mono text-slate-700">{row.vehicle}</td>
                                <td className="py-2.5 px-3">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 border border-slate-200 text-slate-700">
                                    {row.type}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  <button className="px-2.5 py-1 bg-slate-900 text-white text-[10px] font-bold rounded">
                                    DETALHES
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 7. PENDÊNCIAS MANUTENÇÃO */}
                {activeGalleryTab === "manutencao" && (
                  <motion.div
                    key="manutencao"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                      {/* Sub-tabs */}
                      <div className="flex flex-wrap gap-2 border-b pb-3 text-xs font-bold">
                        <span className="px-3 py-1.5 rounded-xl bg-purple-600 text-white">Pendentes (74)</span>
                        <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600">Aguardando (3)</span>
                        <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600">Aguardando NF (1)</span>
                        <span className="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800">Resolvidos (209)</span>
                        <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600">Acompanhamento (98)</span>
                      </div>

                      <div className="space-y-2">
                        {[
                          { date: "26/07/2026 01:37", vehicle: "PLACA ••••••• (Volvo VM-270)", driver: "Condutor #101 (LGPD)", item: "Óleo", desc: "KM Alvo atingido na vistoria (595361 km)", badge: "REPETIDO 3X" },
                          { date: "26/07/2026 01:37", vehicle: "PLACA ••••••• (Volvo VM-270)", driver: "Condutor #101 (LGPD)", item: "Outros", desc: "parabrisa risca; parabrisa ruim é farois", badge: "REPETIDO 11X" },
                          { date: "25/07/2026 06:25", vehicle: "PLACA ••••••• (Reboque)", driver: "Condutor #110 (LGPD)", item: "Lanternas e Vigias", desc: "Seta traseira inoperante", badge: "REPETIDO 16X" },
                          { date: "25/07/2026 06:25", vehicle: "PLACA ••••••• (Mercedes Actros)", driver: "Condutor #110 (LGPD)", item: "Outros", desc: "veículo batendo direção fazer balanceamento", badge: "REPETIDO 4X" },
                        ].map((mItem, mIdx) => (
                          <div key={mIdx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                <strong className="text-slate-900">{mItem.vehicle}</strong>
                                <span className="text-[10px] text-slate-500">• {mItem.driver}</span>
                                <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                  {mItem.badge}
                                </span>
                              </div>
                              <p className="text-slate-600 text-[11px]">
                                <strong>{mItem.item}:</strong> {mItem.desc}
                              </p>
                              <span className="text-[10px] text-slate-400 block">{mItem.date}</span>
                            </div>
                            <button className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shrink-0 self-start sm:self-center">
                              Resolver
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 8. RANKING MOTORISTAS */}
                {activeGalleryTab === "ranking" && (
                  <motion.div
                    key="ranking"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                      <div className="flex justify-between items-center border-b pb-3">
                        <div>
                          <h4 className="text-base font-black text-slate-800">Ranking Oficial de Desempenho</h4>
                          <span className="text-xs text-slate-500">Desempenho dos motoristas por período base (Pontuação Gamificada)</span>
                        </div>
                        <span className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                          Período Atual (Em Aberto)
                        </span>
                      </div>

                      <div className="space-y-2">
                        {[
                          { rank: 1, name: "Condutor #103 (LGPD)", desc: "LÍDER DA OPERAÇÃO • 35 ESCALAS", score: 1000, color: "bg-amber-50 border-amber-200" },
                          { rank: 2, name: "Condutor #101 (LGPD)", desc: "CONSISTÊNCIA OPERACIONAL • 24 ESCALAS", score: 1000, color: "bg-slate-50 border-slate-200" },
                          { rank: 3, name: "Condutor #110 (LGPD)", desc: "CONSISTÊNCIA OPERACIONAL • 17 ESCALAS", score: 1000, color: "bg-slate-50 border-slate-200" },
                          { rank: 4, name: "Condutor #104 (LGPD)", desc: "CONSISTÊNCIA OPERACIONAL • 2 ESCALAS", score: 1000, color: "bg-slate-50 border-slate-200" },
                          { rank: 5, name: "Condutor #111 (LGPD)", desc: "CONSISTÊNCIA OPERACIONAL • 6 ESCALAS", score: 960, color: "bg-slate-50 border-slate-200" },
                        ].map((rk, rkIdx) => (
                          <div key={rkIdx} className={`p-3.5 rounded-xl border ${rk.color} flex items-center justify-between text-xs`}>
                            <div className="flex items-center gap-3">
                              <span className="w-7 h-7 rounded-full bg-slate-900 text-white font-black flex items-center justify-center text-xs">
                                {rk.rank}
                              </span>
                              <div>
                                <h5 className="font-bold text-slate-900 text-sm">{rk.name}</h5>
                                <span className="text-[10px] text-slate-500 font-bold uppercase">{rk.desc}</span>
                              </div>
                            </div>
                            <span className="text-base font-black text-slate-900">
                              {rk.score} <span className="text-xs font-normal text-slate-500">PONTOS</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 9. INFRAÇÕES & MULTAS */}
                {activeGalleryTab === "multas" && (
                  <motion.div
                    key="multas"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                      <div className="flex justify-between items-center border-b pb-3">
                        <div>
                          <h4 className="text-base font-black text-slate-800">Infrações de Trânsito & Multas</h4>
                          <span className="text-xs text-slate-500">Gestão de multas e descontos de motoristas</span>
                        </div>
                        <button className="px-3.5 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-500">
                          + Lançar Infração
                        </button>
                      </div>

                      <div className="space-y-2">
                        {[
                          { driver: "Condutor #110 (LGPD)", date: "29/06/2026 às 00:23", loc: "SP 306 KM 015 • PLACA •••••••", code: "Cód: 7455", desc: "Transitar em velocidade superior à máxima permitida em até 20%", value: "R$ 130,16" },
                          { driver: "Condutor #112 (LGPD)", date: "24/06/2026 às 22:35", loc: "SP 330 KM 390 • PLACA •••••••", code: "Cód: 5711", desc: "Deixar de conservar nas faixas da direita o veículo lento", value: "R$ 130,16" },
                          { driver: "Condutor #112 (LGPD)", date: "24/06/2026 às 22:35", loc: "SP 330 KM 390 • PLACA •••••••", code: "Cód: 5843", desc: "Deixar de indicar com antecedência mediante gesto regulamentar", value: "R$ 195,23" },
                        ].map((fine, fIdx) => (
                          <div key={fIdx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                            <div className="space-y-1 max-w-lg">
                              <div className="flex items-center gap-2">
                                <strong className="text-slate-900 text-sm">{fine.driver}</strong>
                                <span className="text-[10px] text-slate-500">• {fine.date}</span>
                              </div>
                              <span className="text-[11px] font-mono text-slate-600 block">{fine.loc}</span>
                              <p className="text-[11px] text-slate-700">
                                <strong>{fine.code}:</strong> {fine.desc}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="text-base font-black text-rose-600 block">{fine.value}</span>
                              <span className="text-[10px] text-slate-400">Parcelas/Descontos: R$ 0,00</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 10. CADASTRO MOTORISTAS */}
                {activeGalleryTab === "motoristas" && (
                  <motion.div
                    key="motoristas"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                      <div className="flex justify-between items-center border-b pb-3">
                        <h4 className="text-base font-black text-slate-800">Meus Motoristas</h4>
                        <span className="text-xs font-bold text-sky-700 bg-sky-50 px-3 py-1 rounded-full border border-sky-200">
                          Cadastro de Condutores
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                          { name: "Condutor #113 (LGPD)", status: "INATIVO", tags: ["MOTORISTA", "TRANSFERÊNCIA"], email: "condutor113@•••••.local" },
                          { name: "Condutor #110 (LGPD)", status: "ATIVO", tags: ["MOTORISTA", "TRANSFERÊNCIA"], cpf: "•••.***.***-••", email: "condutor110@•••••.local" },
                          { name: "Condutor #112 (LGPD)", status: "ATIVO", tags: ["MOTORISTA", "TRANSFERÊNCIA"], cpf: "•••.***.***-••", email: "condutor112@•••••.local" },
                          { name: "Condutor #111 (LGPD)", status: "ATIVO", tags: ["MOTORISTA", "TRANSFERÊNCIA"], email: "condutor111@•••••.local" },
                          { name: "Condutor #114 (LGPD)", status: "ATIVO", tags: ["MOTORISTA", "DISTRIBUIÇÃO"], email: "condutor114@•••••.local" },
                          { name: "Condutor #115 (LGPD)", status: "ATIVO", tags: ["MOTORISTA", "DISTRIBUIÇÃO"], cpf: "•••.***.***-••", email: "condutor115@•••••.local" },
                        ].map((d, dIdx) => (
                          <div key={dIdx} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-xs">
                            <div className="flex justify-between items-start">
                              <h5 className="font-black text-slate-900 text-xs">{d.name}</h5>
                              {d.status === "INATIVO" && (
                                <span className="bg-rose-100 text-rose-700 font-bold text-[9px] px-1.5 py-0.5 rounded">INATIVO</span>
                              )}
                            </div>
                            <div className="flex gap-1.5">
                              {d.tags.map((t, tI) => (
                                <span key={tI} className="bg-slate-200 text-slate-700 font-bold text-[9px] px-1.5 py-0.5 rounded">
                                  {t}
                                </span>
                              ))}
                            </div>
                            <div className="text-[10px] text-slate-500 pt-1 space-y-0.5 border-t font-mono">
                              <div>E-MAIL: {d.email}</div>
                              {d.cpf && <div>CPF: {d.cpf}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 11. RELATÓRIOS & OCORRÊNCIAS */}
                {activeGalleryTab === "relatorios" && (
                  <motion.div
                    key="relatorios"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                      <div className="flex flex-wrap gap-2 border-b pb-3 text-xs font-bold">
                        <span className="px-3 py-1.5 rounded-xl bg-blue-600 text-white">Inspeção de Defeitos</span>
                        <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600">Pendências Resolvidas</span>
                        <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600">Relatório Quilometragem</span>
                        <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600">Histórico Veículo</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                        <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-900">
                          <span className="text-[10px] font-bold uppercase block text-purple-700">Ocorrências do Período</span>
                          <strong className="text-2xl font-black">362</strong>
                        </div>
                        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900">
                          <span className="text-[10px] font-bold uppercase block text-rose-700">Pendentes de Resolução</span>
                          <strong className="text-2xl font-black">207</strong>
                        </div>
                        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                          <span className="text-[10px] font-bold uppercase block text-emerald-700">Casos Resolvidos</span>
                          <strong className="text-2xl font-black">153</strong>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                        <h5 className="font-bold text-slate-800">Mais Frequentes por Categoria</h5>
                        <div className="space-y-1.5 text-[11px]">
                          <div className="flex justify-between"><span>Ar Condicionado</span><strong className="text-purple-600">50 Ocorrências</strong></div>
                          <div className="flex justify-between"><span>Parte Elétrica</span><strong className="text-purple-600">50 Ocorrências</strong></div>
                          <div className="flex justify-between"><span>Outros</span><strong className="text-purple-600">46 Ocorrências</strong></div>
                          <div className="flex justify-between"><span>Rastreador</span><strong className="text-purple-600">42 Ocorrências</strong></div>
                          <div className="flex justify-between"><span>Lataria</span><strong className="text-purple-600">23 Ocorrências</strong></div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
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
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 hover:border-blue-500/40 transition-all group flex flex-col justify-between space-y-4 text-left">
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
            <div id="recursos" className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 hover:border-emerald-500/40 transition-all group flex flex-col justify-between space-y-4 text-left">
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
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 hover:border-amber-500/40 transition-all group flex flex-col justify-between space-y-4 text-left">
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
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 hover:border-sky-500/40 transition-all group flex flex-col justify-between space-y-4 text-left">
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
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 hover:border-purple-500/40 transition-all group flex flex-col justify-between space-y-4 text-left">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <Receipt size={24} />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">Controle Financeiro & NFs</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Anexo de notas fiscais, registro de fornecedores e oficinas, além do controle detalhado de custos por ativo.
                </p>
              </div>
              <ul className="space-y-2 pt-4 border-t border-zinc-800/80 text-xs text-zinc-300">
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-purple-400 shrink-0" /> Anexo de Notas Fiscais e Comprovantes</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-purple-400 shrink-0" /> Histórico financeiro acumulado por ativo</li>
              </ul>
            </div>

            {/* Card 6 */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 hover:border-rose-500/40 transition-all group flex flex-col justify-between space-y-4 text-left">
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
              { step: "02", title: "Atribuição", desc: "Vínculo de motoristas aos veículos" },
              { step: "03", title: "Checklist", desc: "Inspeção digital no App com fotos" },
              { step: "04", title: "Pátio & GPS", desc: "Conferência e rastreio em tempo real" },
              { step: "05", title: "Manutenção", desc: "Alertas automáticos de preventiva" },
              { step: "06", title: "Relatórios", desc: "Exportação em PDF/Excel com logo" },
              { step: "07", title: "IA & Scores", desc: "Análise contínua e assistente IA" },
            ].map((item, idx) => (
              <div key={idx} className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 relative flex flex-col justify-between hover:border-zinc-700 transition-all text-center">
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
              <p className="text-xs text-zinc-400">PWA inteligente que preserva checklists e vistorias salvos no celular até a reconexão.</p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <Building2 size={28} className="text-purple-400 mb-4" />
              <h4 className="text-sm font-bold text-white mb-2">Multiempresa & Filiais</h4>
              <p className="text-xs text-zinc-400">Estrutura preparada para gerenciar múltiplos CNPJs com hierarquia de permissões para administradores.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Target Segments Section */}
      <section id="segmentos" className="py-20 border-b border-zinc-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-xs font-black text-blue-400 uppercase tracking-widest mb-3">
              Segmentos Atendidos
            </h2>
            <h3 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Solução versátil para diversos setores da economia
            </h3>
            <p className="text-zinc-400 text-sm mt-4">
              Adaptável tanto para frotas rodoviárias leves e pesadas quanto para frotas de canteiro, lavoura e indústria.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
            {[
              { icon: Truck, name: "Transportadoras & Logística", desc: "Caminhões e Carretas" },
              { icon: HardHat, name: "Construtoras & Infraestrutura", desc: "Máquinas e Caçambas" },
              { icon: Tractor, name: "Agronegócio & Usinas", desc: "Tratores e Colheitadeiras" },
              { icon: Pickaxe, name: "Mineração", desc: "Equipamentos de Mina" },
              { icon: Factory, name: "Indústrias & Distribuição", desc: "Empilhadeiras e Vans" },
              { icon: KeyRound, name: "Locadoras de Veículos", desc: "Vistoria e Devolução" },
              { icon: Zap, name: "Energia & Saneamento", desc: "Frota de Manutenção" },
              { icon: TreePine, name: "Operações Florestais", desc: "Ativos de Manejo" },
            ].map((seg, idx) => (
              <div key={idx} className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition-all">
                <seg.icon size={24} className="text-blue-400 mb-3" />
                <h4 className="text-xs font-bold text-white mb-1">{seg.name}</h4>
                <p className="text-[11px] text-zinc-400">{seg.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing / Plans Section */}
      <section id="planos" className="py-20 bg-zinc-900/30 border-b border-zinc-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-xs font-black text-blue-400 uppercase tracking-widest mb-3">
              Planos & Investimento
            </h2>
            <h3 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Planos dimensionados para o tamanho da sua frota
            </h3>
            <p className="text-zinc-400 text-sm mt-4">
              Escolha a estrutura ideal para a quantidade de ativos e usuários da sua empresa.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto text-left">
            {/* Plan 1 */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 flex flex-col justify-between hover:border-zinc-700 transition-all">
              <div>
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-2">Plano Inicial</span>
                <h4 className="text-2xl font-black text-white mb-2">Start Frota</h4>
                <p className="text-xs text-zinc-400 mb-6">Ideal para pequenas empresas até 15 veículos ou equipamentos.</p>
                <div className="text-2xl font-black text-white mb-6 pb-6 border-b border-zinc-800">
                  Sob Consulta <span className="text-xs text-zinc-400 font-normal">/ mês</span>
                </div>
                <ul className="space-y-3 text-xs text-zinc-300">
                  <li className="flex items-center gap-2"><CheckCircle2 size={15} className="text-blue-400" /> Até 15 Ativos Cadastrados</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={15} className="text-blue-400" /> Painel Admin + App Motorista & Pátio</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={15} className="text-blue-400" /> Checklists Ilimitados Offline (PWA)</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={15} className="text-blue-400" /> Alertas Básicos de Manutenção</li>
                </ul>
              </div>
              <button
                onClick={() => setIsDemoModalOpen(true)}
                className="mt-8 w-full py-3.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs uppercase tracking-wider transition-all"
              >
                Solicitar Cotação
              </button>
            </div>

            {/* Plan 2 - Featured */}
            <div className="bg-zinc-900 border-2 border-blue-500 rounded-3xl p-8 flex flex-col justify-between shadow-2xl shadow-blue-500/10 relative">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest">
                Mais Escolhido
              </div>
              <div>
                <span className="text-xs font-bold text-blue-400 uppercase tracking-wider block mb-2">Plano Avançado</span>
                <h4 className="text-2xl font-black text-white mb-2">Pro Operações</h4>
                <p className="text-xs text-zinc-400 mb-6">Para frotas médias até 50 ativos com controle rigoroso de OS e custos.</p>
                <div className="text-2xl font-black text-white mb-6 pb-6 border-b border-zinc-800">
                  Sob Consulta <span className="text-xs text-zinc-400 font-normal">/ mês</span>
                </div>
                <ul className="space-y-3 text-xs text-zinc-300">
                  <li className="flex items-center gap-2"><CheckCircle2 size={15} className="text-blue-400" /> Até 50 Ativos Cadastrados</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={15} className="text-blue-400" /> Painel Admin + App Motorista & Pátio + PWA Offline</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={15} className="text-blue-400" /> Assistente de Inteligência Artificial</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={15} className="text-blue-400" /> Ordens de Serviço & Anexo de Nota Fiscal</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={15} className="text-blue-400" /> Notificações via WhatsApp</li>
                </ul>
              </div>
              <button
                onClick={() => setIsDemoModalOpen(true)}
                className="mt-8 w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-blue-600/30 transition-all"
              >
                Falar com Especialista
              </button>
            </div>

            {/* Plan 3 */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 flex flex-col justify-between hover:border-zinc-700 transition-all">
              <div>
                <span className="text-xs font-bold text-purple-400 uppercase tracking-wider block mb-2">Plano Corporativo</span>
                <h4 className="text-2xl font-black text-white mb-2">Enterprise</h4>
                <p className="text-xs text-zinc-400 mb-6">Grandes frotas acima de 50 ativos, multiempresa e suporte dedicado.</p>
                <div className="text-2xl font-black text-white mb-6 pb-6 border-b border-zinc-800">
                  Personalizado <span className="text-xs text-zinc-400 font-normal">/ sob medida</span>
                </div>
                <ul className="space-y-3 text-xs text-zinc-300">
                  <li className="flex items-center gap-2"><CheckCircle2 size={15} className="text-purple-400" /> Ativos Ilimitados</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={15} className="text-purple-400" /> Multiempresa & Múltiplos CNPJs</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={15} className="text-purple-400" /> SLA de Suporte Dedicado</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={15} className="text-purple-400" /> Treinamento de Equipe Onboarding</li>
                </ul>
              </div>
              <button
                onClick={() => setIsDemoModalOpen(true)}
                className="mt-8 w-full py-3.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs uppercase tracking-wider transition-all"
              >
                Solicitar Proposta
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Accordion Section */}
      <section id="faq" className="py-20 border-b border-zinc-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-left">
          <div className="text-center mb-14">
            <h2 className="text-xs font-black text-blue-400 uppercase tracking-widest mb-3">
              Perguntas Frequentes
            </h2>
            <h3 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Tire suas dúvidas sobre a plataforma
            </h3>
          </div>

          <div className="space-y-4">
            {faqItems.map((item, idx) => (
              <div
                key={idx}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden transition-all"
              >
                <button
                  onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                  className="w-full p-5 text-left font-bold text-sm text-white flex items-center justify-between gap-4 hover:text-blue-400 transition-colors"
                >
                  <span>{item.question}</span>
                  <ChevronDown
                    size={18}
                    className={`shrink-0 transition-transform ${
                      openFaqIndex === idx ? "rotate-180 text-blue-400" : "text-zinc-500"
                    }`}
                  />
                </button>
                <AnimatePresence>
                  {openFaqIndex === idx && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="px-5 pb-5 text-xs text-zinc-400 leading-relaxed border-t border-zinc-800/60 pt-3"
                    >
                      {item.answer}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Banner */}
      <section className="py-20 relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="bg-gradient-to-r from-blue-900/40 via-indigo-900/40 to-zinc-900 border border-blue-500/30 rounded-3xl p-10 sm:p-14 shadow-2xl">
            <h3 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Pronto para transformar a gestão de ativos da sua empresa?
            </h3>
            <p className="mt-4 text-zinc-300 text-sm max-w-2xl mx-auto leading-relaxed">
              Solicite uma demonstração personalizada e veja como o CheckDrive elimina falhas operacionais, reduz custos de manutenção e simplifica a rotina da sua equipe.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => setIsDemoModalOpen(true)}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-blue-600/30 transition-all hover:scale-[1.02]"
              >
                Solicitar Demonstração Gratuita <ArrowRight size={16} />
              </button>
              <Link
                to="/login"
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 font-black text-xs uppercase tracking-widest flex items-center justify-center transition-all"
              >
                Acessar o Sistema
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-zinc-950 border-t border-zinc-900 py-12 text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12 text-left">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base font-black text-white italic">CheckDrive</span>
              </div>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Sistema inteligente para gestão de ativos operacionais, máquinas e equipamentos com PWA offline e assistente IA.
              </p>
            </div>

            <div>
              <h5 className="font-bold text-zinc-300 uppercase tracking-wider mb-3">Módulos</h5>
              <ul className="space-y-2">
                <li><a href="#aplicativos" className="hover:text-zinc-300 transition-colors">Painel Admin</a></li>
                <li><a href="#aplicativos" className="hover:text-zinc-300 transition-colors">App Motorista & Pátio</a></li>
                <li><a href="#aplicativos" className="hover:text-zinc-300 transition-colors">Tecnologia PWA Offline</a></li>
              </ul>
            </div>

            <div>
              <h5 className="font-bold text-zinc-300 uppercase tracking-wider mb-3">Plataforma</h5>
              <ul className="space-y-2">
                <li><a href="#recursos" className="hover:text-zinc-300 transition-colors">Checklist Digital</a></li>
                <li><a href="#ia" className="hover:text-zinc-300 transition-colors">Copilot Inteligente</a></li>
                <li><a href="#beneficios" className="hover:text-zinc-300 transition-colors">Alertas por KM/Horas</a></li>
                <li><Link to="/privacy" className="hover:text-zinc-300 transition-colors">Privacidade & Termos</Link></li>
              </ul>
            </div>

            <div>
              <h5 className="font-bold text-zinc-300 uppercase tracking-wider mb-3">Contato & Suporte</h5>
              <p className="text-zinc-400 leading-relaxed mb-2">Suporte Técnico & Comercial via WhatsApp.</p>
              <a
                href="https://wa.me/553492012702?text=Olá!%20Preciso%20de%20suporte%20do%20CheckDrive."
                target="_blank"
                rel="noreferrer"
                className="text-emerald-400 hover:underline font-bold inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl text-xs"
              >
                <span>+55 34 9201-2702</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>

          <div className="pt-8 border-t border-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p>© {new Date().getFullYear()} CheckDrive Gestão de Ativos. Todos os direitos reservados.</p>
            <span className="font-mono text-[11px] text-zinc-600">v2.5.0 - Enterprise Build</span>
          </div>
        </div>
      </footer>

      {/* Demo Modal */}
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
                onClick={() => setIsDemoModalOpen(false)}
                className="absolute top-5 right-5 text-zinc-400 hover:text-white p-1 rounded-lg bg-zinc-800"
              >
                <X size={18} />
              </button>

              {!demoSubmitted ? (
                <div>
                  <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-wider mb-2">
                    <PhoneCall size={16} /> Agende uma Apresentação
                  </div>
                  <h3 className="text-xl font-black text-white mb-2">Solicitar Demonstração CheckDrive</h3>
                  <p className="text-xs text-zinc-400 mb-6">
                    Preencha os dados abaixo e nosso especialista apresentará o sistema configurado para o perfil da sua empresa.
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
                        className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-zinc-300 mb-1">E-mail Corporativo</label>
                        <input
                          type="email"
                          required
                          value={demoFormData.email}
                          onChange={(e) => setDemoFormData({ ...demoFormData, email: e.target.value })}
                          placeholder="joao@empresa.com"
                          className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-blue-500"
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
                          className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-zinc-300 mb-1">Nome da Empresa</label>
                        <input
                          type="text"
                          required
                          value={demoFormData.company}
                          onChange={(e) => setDemoFormData({ ...demoFormData, company: e.target.value })}
                          placeholder="Ex: Logística Brasil"
                          className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-300 mb-1">Tamanho da Frota</label>
                        <select
                          value={demoFormData.fleetSize}
                          onChange={(e) => setDemoFormData({ ...demoFormData, fleetSize: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-blue-500"
                        >
                          <option value="1-10">1 a 10 Ativos</option>
                          <option value="10-50">10 a 50 Ativos</option>
                          <option value="50-100">50 a 100 Ativos</option>
                          <option value="100+">Mais de 100 Ativos</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full mt-2 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2"
                    >
                      Enviar Solicitação <ArrowRight size={16} />
                    </button>
                  </form>
                </div>
              ) : (
                <div className="text-center py-8 space-y-4">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 size={32} />
                  </div>
                  <h3 className="text-xl font-black text-white">Solicitação Recebida!</h3>
                  <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                    Redirecionando para o nosso atendimento no WhatsApp (+55 34 9201-2702) para agendar sua demonstração...
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
