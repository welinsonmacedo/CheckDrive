import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
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
} from "lucide-react";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-blue-600 selection:text-white">
      {/* Header / Navbar */}
      <header className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/landing")}>
            <div className="w-11 h-11 rounded-2xl overflow-hidden shadow-lg shadow-blue-500/10 border border-zinc-700/80 p-0.5 bg-zinc-900">
              <img
                src="https://phyodfszatjfdfjtzpmm.supabase.co/storage/v1/object/public/Enterprise/logo.jpeg"
                alt="CheckDrive Logo"
                className="w-full h-full object-cover rounded-xl"
              />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-white italic">
                CheckDrive
              </span>
              <span className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest -mt-1">
                Gestão de Frota
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-xs font-bold text-zinc-400 uppercase tracking-wider">
            <a href="#funcionalidades" className="hover:text-white transition-colors">
              Recursos
            </a>
            <a href="#checklist" className="hover:text-white transition-colors">
              Checklist PWA
            </a>
            <a href="#manutencao" className="hover:text-white transition-colors">
              Manutenção
            </a>
            <a href="#whatsapp" className="hover:text-white transition-colors">
              WhatsApp
            </a>
            <a href="#relatorios" className="hover:text-white transition-colors">
              Relatórios
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="hidden sm:inline-flex px-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-bold transition-all"
            >
              Acesso Rápido
            </Link>
            <Link
              to="/login"
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-blue-600/25 transition-all"
            >
              Entrar no Sistema <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-32 overflow-hidden border-b border-zinc-900">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(59,130,246,0.15),rgba(255,255,255,0))]" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider mb-8"
          >
            <Zap size={14} /> Plafatorma Completa de Gestão Operacional de Frotas
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white max-w-4xl mx-auto leading-tight"
          >
            Sua Frota Conectada, <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
              Segura e Totalmente Eficiente
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-6 text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed"
          >
            Checklists digitais diários para veículos e carretas, alertas automáticos por KM e Data, controle completo de manutenções com fotos e Nota Fiscal, além de notificações integradas no WhatsApp.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              to="/login"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-blue-600/30 transition-all"
            >
              Acessar Painel do Gestor <ArrowRight size={16} />
            </Link>
            <a
              href="#funcionalidades"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-black text-xs uppercase tracking-widest flex items-center justify-center transition-all"
            >
              Conhecer Funcionalidades
            </a>
          </motion.div>

          {/* Key Metrics Badges */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 text-left"
          >
            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 backdrop-blur-sm">
              <div className="flex items-center gap-3 text-blue-400 mb-2">
                <CheckSquare size={20} />
                <span className="text-xs font-black uppercase tracking-wider text-zinc-300">Checklists PWA</span>
              </div>
              <p className="text-xs text-zinc-400">Inspeção pré/pós viagem com fotos, odômetro e suporte offline no celular.</p>
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 backdrop-blur-sm">
              <div className="flex items-center gap-3 text-emerald-400 mb-2">
                <Gauge size={20} />
                <span className="text-xs font-black uppercase tracking-wider text-zinc-300">Alertas KM & Data</span>
              </div>
              <p className="text-xs text-zinc-400">Prevenção automatizada com prazos de tolerância configuráveis.</p>
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 backdrop-blur-sm">
              <div className="flex items-center gap-3 text-amber-400 mb-2">
                <Wrench size={20} />
                <span className="text-xs font-black uppercase tracking-wider text-zinc-300">Gestão de Baixas</span>
              </div>
              <p className="text-xs text-zinc-400">Controle rigoroso de NF, fornecedores, custos acumulados e comprovantes.</p>
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 backdrop-blur-sm">
              <div className="flex items-center gap-3 text-indigo-400 mb-2">
                <MessageSquare size={20} />
                <span className="text-xs font-black uppercase tracking-wider text-zinc-300">WhatsApp Nativo</span>
              </div>
              <p className="text-xs text-zinc-400">Envio de disparos e alertas diretamente para o número do motorista.</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main Features Grid */}
      <section id="funcionalidades" className="py-20 bg-zinc-900/40 border-b border-zinc-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-black text-blue-400 uppercase tracking-widest mb-3">
              Solução End-to-End
            </h2>
            <h3 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Tudo o que sua transportadora precisa para operar sem surpresas
            </h3>
            <p className="text-zinc-400 text-sm mt-4">
              Cada módulo foi desenvolvido para atender à realidade da pista e do escritório administrativo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div id="checklist" className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 hover:border-zinc-700 transition-all flex flex-col justify-between space-y-4">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-5">
                  <Smartphone size={24} />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">Checklist Digital PWA do Motorista</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Aplicação otimizada para smartphones com suporte a operação offline. O motorista inspeciona o caminhão ou carreta, registra a leitura do odômetro (KM), insere observações e anexa fotos das avarias antes e depois da viagem.
                </p>
              </div>
              <ul className="space-y-2 pt-4 border-t border-zinc-800 text-xs text-zinc-300">
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-blue-400 shrink-0" /> Funciona mesmo sem internet (Sync)</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-blue-400 shrink-0" /> Fotos obrigatórias de avarias e odômetro</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-blue-400 shrink-0" /> Suporte a Veículos e Carretas/Reboques</li>
              </ul>
            </div>

            {/* Feature 2 */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 hover:border-zinc-700 transition-all flex flex-col justify-between space-y-4">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-5">
                  <Truck size={24} />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">Catálogo de Veículos & Carretas</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Fichas técnicas completas com documentação (CRLV, ANTT, Seguro, Renavam, Chassi, Ano e Combustível). Exportação instantânea do inventário completo da frota para relatórios em Excel e PDF.
                </p>
              </div>
              <ul className="space-y-2 pt-4 border-t border-zinc-800 text-xs text-zinc-300">
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400 shrink-0" /> Gestão de Vencimentos de ANTT/Seguros</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400 shrink-0" /> Vínculo de frota e reboques</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400 shrink-0" /> Exportação de Catálogo em Excel & PDF</li>
              </ul>
            </div>

            {/* Feature 3 */}
            <div id="manutencao" className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 hover:border-zinc-700 transition-all flex flex-col justify-between space-y-4">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-5">
                  <Gauge size={24} />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">Alertas por Quilometragem & Data</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Crie regras customizadas de manutenção preventiva (ex: troca de óleo a cada 10.000 KM com aviso prévio aos 9.000 KM) ou por data (ex: renovação de laudo). O sistema recalcula os limites a cada checklist submetido.
                </p>
              </div>
              <ul className="space-y-2 pt-4 border-t border-zinc-800 text-xs text-zinc-300">
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-amber-400 shrink-0" /> Alertas por KM e Intervalo de Duração</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-amber-400 shrink-0" /> Nível de tolerância para aviso prévio</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-amber-400 shrink-0" /> Geração automática de pendências no painel</li>
              </ul>
            </div>

            {/* Feature 4 */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 hover:border-zinc-700 transition-all flex flex-col justify-between space-y-4">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-5">
                  <Wrench size={24} />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">Tratativa de Baixas & Custos de Manutenção</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Dê baixa nos alertas e problemas reportados anexando Nota Fiscal (NF), fornecedor responsável, peças trocadas, comprovantes fotográficos e custos. Acompanhe a curva de gastos acumulados e custo médio por serviço.
                </p>
              </div>
              <ul className="space-y-2 pt-4 border-t border-zinc-800 text-xs text-zinc-300">
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-purple-400 shrink-0" /> Registro de NF e Fornecedores cadastrados</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-purple-400 shrink-0" /> Anexo de fotos de comprovantes</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-purple-400 shrink-0" /> Histórico acumulado por regra de alerta</li>
              </ul>
            </div>

            {/* Feature 5 */}
            <div id="whatsapp" className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 hover:border-zinc-700 transition-all flex flex-col justify-between space-y-4">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-5">
                  <MessageSquare size={24} />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">Disparos de Notificação via WhatsApp</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Integração nativa via Evolution API para envio de mensagens automáticas de alerta diretamente para os motoristas e gestores, garantindo ação rápida antes que a avaria vire prejuízo.
                </p>
              </div>
              <ul className="space-y-2 pt-4 border-t border-zinc-800 text-xs text-zinc-300">
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-indigo-400 shrink-0" /> Configuração de instâncias e regras</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-indigo-400 shrink-0" /> Envio automático ao atingir o aviso prévio</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-indigo-400 shrink-0" /> Histórico de disparos executados</li>
              </ul>
            </div>

            {/* Feature 6 */}
            <div id="relatorios" className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 hover:border-zinc-700 transition-all flex flex-col justify-between space-y-4">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-5">
                  <BarChart3 size={24} />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">Relatórios, Score e Fechamentos</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Acompanhe a pontuação (Score) de condução do motorista, histórico de infrações/penalidades, relatórios de pendências filtrados por placa, com cabeçalho personalizado e logomarca da sua empresa.
                </p>
              </div>
              <ul className="space-y-2 pt-4 border-t border-zinc-800 text-xs text-zinc-300">
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-rose-400 shrink-0" /> Relatórios com Logomarca da Empresa</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-rose-400 shrink-0" /> Ranking de Pontuação de Motoristas</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-rose-400 shrink-0" /> Auditoria de Fechamento por Período</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Profiles / Access Section */}
      <section className="py-20 border-b border-zinc-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-8 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-bold uppercase tracking-wider">
                <UserCheck size={14} /> Módulo Motorista (PWA)
              </div>
              <h3 className="text-2xl font-black text-white">Simplicidade Extrema na Ponta dos Dedos</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Desenvolvido para que o motorista faça a verificação em menos de 2 minutos antes de dar a partida. Interface limpa, botões grandes e leitura direta.
              </p>
              <div className="space-y-3 text-xs text-zinc-300">
                <div className="flex items-start gap-3 p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/60">
                  <CheckCircle2 size={16} className="text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block">Seleção Rápida de Veículo & Carretera</strong>
                    Identificação imediata por placa e frota cadastrada.
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/60">
                  <CheckCircle2 size={16} className="text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block">Aferição Obrigatoria do Odômetro</strong>
                    Evita furos na quilometragem do veículo e atualiza as regras de alerta.
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-8 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 text-xs font-bold uppercase tracking-wider">
                <Building2 size={14} /> Painel Administrativo (Empresa)
              </div>
              <h3 className="text-2xl font-black text-white">Domínio Total do Gestor de Frota</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Visão centralizada de pendências, custos acumulados por veículo, alertas críticos de manutenção e parametrização do sistema.
              </p>
              <div className="space-y-3 text-xs text-zinc-300">
                <div className="flex items-start gap-3 p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/60">
                  <CheckCircle2 size={16} className="text-purple-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block">Ficha Completa da Manutenção</strong>
                    Acesse cada baixa com Nota Fiscal, foto do comprovante e observações da oficina.
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/60">
                  <CheckCircle2 size={16} className="text-purple-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block">Personalização de Logomarca e Dados</strong>
                    Imprima termos e fichas técnicas com o cabeçalho oficial da sua transportadora.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Banner */}
      <section className="py-20 relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="bg-gradient-to-b from-blue-900/40 to-zinc-900 border border-blue-500/20 rounded-3xl p-8 sm:p-12 shadow-2xl backdrop-blur-md">
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Pronto para colocar sua frota sob total controle?
            </h2>
            <p className="text-zinc-400 text-sm mt-4 max-w-xl mx-auto">
              Acesse o sistema agora mesmo e experimente a gestão moderna de checklists e manutenções.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/login"
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-blue-600/30 transition-all"
              >
                Acessar Plataforma <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-10 bg-zinc-950 text-zinc-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl overflow-hidden border border-zinc-800">
              <img
                src="https://phyodfszatjfdfjtzpmm.supabase.co/storage/v1/object/public/Enterprise/logo.jpeg"
                alt="Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="font-bold text-zinc-300">CheckDrive</span>
            <span>&copy; {new Date().getFullYear()} Todos os direitos reservados.</span>
          </div>

          <div className="flex items-center gap-6 font-medium">
            <Link to="/privacy" className="hover:text-zinc-300 transition-colors">
              Política de Privacidade
            </Link>
            <Link to="/login" className="hover:text-zinc-300 transition-colors">
              Login
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
