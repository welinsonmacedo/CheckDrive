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
} from "lucide-react";

export default function LandingPage() {
  const navigate = useNavigate();

  // State for Interactive Elements
  const [activeAppTab, setActiveAppTab] = useState<"admin" | "driver_yard" | "reservation" | "pwa">("admin");
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
      question: "Quais solicitações de reserva de veículos estão aguardando aprovação?",
      answer: "Existem 2 solicitações no Aplicativo Reserva: A vendedora Mariana solicitou o Gol (Placa GHI-9012) para amanhã às 08h. O engenheiro Marcos solicitou a Hilux (Placa JKL-3456) para vistoria em obra. Ambos os veículos estão com checklist em dia.",
      metric: "2 Reservas Pendentes",
      action: "Aprovar Agendamentos",
    },
    {
      question: "Quais motoristas possuem pendências de checklist pré-viagem?",
      answer: "No momento, 2 motoristas estão com checklist pendente no Aplicativo Motorista & Pátio: Carlos Silva (Scania R450) e Roberto Lima (Carreta Prancha). Notificação via WhatsApp enviada automaticamente para ambos.",
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
      question: "Como funcionam o Painel Admin, App Motorista & Pátio e App Reserva?",
      answer: "O CheckDrive é um ecossistema modular: O Painel Admin é voltado para gestores (frotas, relatórios, custos e IA). O Aplicativo Motorista e Pátio é utilizado no dia a dia pelos condutores e vistoriadores para realizar checklists, registrar avarias e controlar odômetro/horímetro. O Aplicativo Reserva é exclusivo para colaboradores agendarem e solicitarem uso de veículos da frota corporativa.",
    },
    {
      question: "Como funciona a tecnologia PWA (Offline-First)?",
      answer: "PWA (Progressive Web App) permite que os aplicativos sejam instalados diretamente em smartphones Android e iOS sem depender de lojas de aplicativos. Toda a operação funciona 100% offline: inspeções, fotos e leituras de KM/Horímetro são salvas no aparelho e sincronizadas automaticamente com a nuvem assim que houver sinal de internet.",
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
      window.open(`https://wa.me/?text=${text}`, "_blank");
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
                Gestão de Ativos & Frotas
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-bold text-zinc-400 uppercase tracking-wider">
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
              Ecossistema Inteligente de Gestão de Ativos, Frotas e Operações
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight"
            >
              A plataforma inteligente para gestão de{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-sky-400">
                ativos, frotas e operações.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-6 text-base sm:text-lg text-zinc-300 max-w-3xl mx-auto leading-relaxed font-normal"
            >
              Integração completa em um único lugar: **Painel Admin**, **Aplicativo Motorista e Pátio**, **Aplicativo Reserva** e tecnologia **PWA Offline-First** com Inteligência Artificial para controle de Veículos, Máquinas e Equipamentos.
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
            <div className="bg-zinc-950/80 px-4 py-3 rounded-2xl flex items-center justify-between border border-zinc-800/80">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="ml-3 text-xs font-mono text-zinc-400">
                  checkdrive.app/painel-gestor
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Sistema Online & PWA Sincronizado
                </span>
              </div>
            </div>

            {/* Mockup Dashboard Content */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-4 bg-zinc-950/60 text-left">
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
                  <span>App Reserva</span>
                  <Calendar size={16} className="text-purple-400" />
                </div>
                <div className="text-xl font-black text-white">14 Reservas</div>
                <p className="text-[11px] text-purple-400 mt-1 font-semibold flex items-center gap-1">
                  <KeyRound size={12} /> Agendamentos do Mês
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
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 text-left max-w-5xl mx-auto">
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
                <Calendar size={20} />
                <span className="text-xs font-black uppercase tracking-wider text-zinc-200">
                  Aplicativo Reserva
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Agendamento e solicitação de veículos da frota corporativa por colaboradores com aprovação rápida.
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
            <div className="mt-8 inline-flex p-1.5 rounded-2xl bg-zinc-900 border border-zinc-800 max-w-full overflow-x-auto">
              <button
                onClick={() => setActiveAppTab("admin")}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                  activeAppTab === "admin"
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Building2 size={15} /> Painel Admin
              </button>
              <button
                onClick={() => setActiveAppTab("driver_yard")}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                  activeAppTab === "driver_yard"
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Smartphone size={15} /> App Motorista & Pátio
              </button>
              <button
                onClick={() => setActiveAppTab("reservation")}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                  activeAppTab === "reservation"
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Calendar size={15} /> Aplicativo Reserva
              </button>
              <button
                onClick={() => setActiveAppTab("pwa")}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
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
                      <strong className="text-white">ABC-1234 (Volvo FH 540)</strong>
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

            {activeAppTab === "reservation" && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center text-left"
              >
                <div className="space-y-4">
                  <span className="px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 text-xs font-bold uppercase tracking-wider inline-block">
                    Para Colaboradores e Uso de Frota
                  </span>
                  <h4 className="text-2xl font-black text-white">Aplicativo Reserva de Veículos</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Aplicativo dedicado para que colaboradores solicitem e agendem veículos da frota corporativa. Elimina conflitos de horário, controla viagens corporativas e exige autorização prévia do gestor.
                  </p>
                  <ul className="space-y-2 text-xs text-zinc-300">
                    <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-purple-400" /> Calendário interativo de disponibilidade</li>
                    <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-purple-400" /> Solicitação com destino, data, hora e motivo</li>
                    <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-purple-400" /> Integração imediata com o checklist de saída</li>
                  </ul>
                </div>
                <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 space-y-3 font-mono text-xs">
                  <div className="text-purple-400 font-bold border-b border-zinc-800 pb-2 flex justify-between">
                    <span>APLICATIVO RESERVA</span>
                    <span>AGENDAMENTOS</span>
                  </div>
                  <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300">
                    <strong>Reserva #204:</strong> Gol (Placa GHI-9012)
                    <div className="text-[11px] text-zinc-400 mt-1">Solicitante: Mariana | Destino: Cliente SP</div>
                    <div className="text-emerald-400 text-[11px] font-bold mt-1">Status: Aprovado pelo Gestor</div>
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
                    Tecnologia PWA (Offline-First)
                  </span>
                  <h4 className="text-2xl font-black text-white">Instalação Fácil & Funcionamento Offline</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Com tecnologia PWA (Progressive Web App), o motorista ou operador pode instalar o aplicativo direto no celular sem precisar acessar a Google Play Store ou Apple App Store. Funciona sem internet em fazendas, minas e rodovias sem sinal.
                  </p>
                  <ul className="space-y-2 text-xs text-zinc-300">
                    <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-amber-400" /> Zero dependência de sinal de internet no campo</li>
                    <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-amber-400" /> Instalação instantânea com 1 clique no navegador</li>
                    <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-amber-400" /> Sincronização automática em background</li>
                  </ul>
                </div>
                <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 space-y-3 font-mono text-xs">
                  <div className="text-amber-400 font-bold border-b border-zinc-800 pb-2 flex justify-between">
                    <span>MODO OFFLINE PWA</span>
                    <span className="text-amber-400">SEM SINAL</span>
                  </div>
                  <div className="text-zinc-300 py-1">
                    [PWA Storage] 4 Checklists salvos localmente
                  </div>
                  <div className="text-emerald-400 py-1 font-bold">
                    ✓ Sinal Detectado: Sincronizando dados com o servidor...
                  </div>
                </div>
              </motion.div>
            )}
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
                  <Calendar size={24} />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">Aplicativo de Reserva de Veículos</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Agendamento de veículos da frota corporativa por colaboradores com fluxo de aprovação e controle de disponibilidade.
                </p>
              </div>
              <ul className="space-y-2 pt-4 border-t border-zinc-800/80 text-xs text-zinc-300">
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-purple-400 shrink-0" /> Gestão de solicitações e destinos</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-purple-400 shrink-0" /> Histórico de viagens e responsáveis</li>
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
              { step: "02", title: "Reserva", desc: "Solicitação e aprovação de veículos" },
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
                Faça perguntas diretas sobre seus veículos, máquinas, reservas, motoristas e custos. O assistente analisa milhares de dados de checklists e telemetria para responder em segundos.
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
                  <li className="flex items-center gap-2"><CheckCircle2 size={15} className="text-blue-400" /> Painel Admin + App Motorista & Pátio + App Reserva</li>
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
                Plataforma inteligente de gestão de ativos, frotas, máquinas e equipamentos com PWA offline e assistente IA.
              </p>
            </div>

            <div>
              <h5 className="font-bold text-zinc-300 uppercase tracking-wider mb-3">Módulos</h5>
              <ul className="space-y-2">
                <li><a href="#aplicativos" className="hover:text-zinc-300 transition-colors">Painel Admin</a></li>
                <li><a href="#aplicativos" className="hover:text-zinc-300 transition-colors">App Motorista & Pátio</a></li>
                <li><a href="#aplicativos" className="hover:text-zinc-300 transition-colors">Aplicativo Reserva</a></li>
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
                href="https://wa.me/?text=Olá!%20Preciso%20de%20suporte%20do%20CheckDrive."
                target="_blank"
                rel="noreferrer"
                className="text-blue-400 hover:underline font-bold inline-flex items-center gap-1"
              >
                Falar com Atendimento <ExternalLink size={12} />
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
                    Redirecionando para o nosso atendimento no WhatsApp para agendar sua demonstração...
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
