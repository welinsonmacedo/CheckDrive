import React from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Truck, ShieldCheck, Trophy, Map, ArrowRight, BarChart3, Clock, LayoutDashboard, ClipboardCheck } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white selection:bg-primary/20 selection:text-primary">
      {/* Navbar */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-xl border-b border-app-border z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center">
              <Truck size={20} />
            </div>
            <span className="font-black text-xl italic tracking-tight text-text-main">CheckDrive</span>
          </div>
          <button 
            onClick={() => navigate('/login')}
            className="flex items-center gap-2 px-5 py-2.5 bg-zinc-900 text-white rounded-xl text-sm font-bold uppercase tracking-widest hover:bg-zinc-800 transition-all active:scale-95"
          >
            Acessar Sistema
            <ArrowRight size={16} />
          </button>
        </div>
      </nav>

      <main className="pt-32 pb-24">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-6 mb-32 grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider"
            >
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Gestão de Frota Inteligente
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl lg:text-7xl font-black text-zinc-900 tracking-tight leading-tight"
            >
              O controle da sua <span className="text-primary">frota</span> em tempo real.
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg text-zinc-500 font-medium leading-relaxed max-w-xl"
            >
              Checklists automáticos, gestão de escalas, ranqueamento de motoristas e controle rigoroso de defeitos. Tudo integrado para melhorar a eficiência e segurança da sua operação.
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <button 
                onClick={() => navigate('/login')}
                className="flex items-center gap-3 px-8 py-4 bg-primary text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:shadow-lg hover:shadow-primary/30 transition-all active:scale-95 group"
              >
                Entrar no Sistema
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          </div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent rounded-3xl blur-3xl -z-10" />
            <div className="bg-white border border-app-border rounded-3xl p-6 shadow-2xl relative overflow-hidden">
               <div className="flex items-center justify-between border-b border-app-border pb-4 mb-6">
                 <div>
                    <h3 className="text-lg font-black text-text-main">Ranking de Motoristas</h3>
                    <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Fechamento Mensal</p>
                 </div>
                 <Trophy className="text-yellow-500" size={24} />
               </div>
               
               <div className="space-y-4">
                 {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-zinc-50 border border-zinc-100">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${i === 1 ? 'bg-yellow-100 text-yellow-600' : 'bg-zinc-200 text-zinc-600'}`}>
                        {i}º
                      </div>
                      <div className="flex-1">
                        <div className="h-2.5 w-24 bg-zinc-200 rounded-full mb-2" />
                        <div className="h-2 w-16 bg-zinc-100 rounded-full" />
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-black text-text-main">1000 pts</div>
                        <div className="text-[9px] text-emerald-500 font-bold uppercase">Sem falhas</div>
                      </div>
                    </div>
                 ))}
               </div>
            </div>
          </motion.div>
        </section>

        {/* Features Section */}
        <section className="bg-zinc-50 py-32 border-y border-app-border">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-3xl font-black text-text-main tracking-tight">Recursos Completos</h2>
              <p className="text-text-muted font-medium max-w-2xl mx-auto">
                 Tudo que você precisa para gerenciar sua frota e acompanhar a performance da equipe em um único lugar.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                { icon: ClipboardCheck, title: 'Checklists Digitais', desc: 'Elimine papel. Diários de bordo e apontamento de falhas direto no celular com fotos e evidências.' },
                { icon: ShieldCheck, title: 'Monitoramento de Avarias', desc: 'Controle preciso de manutenções pendentes. Evite que um veículo rode sem as devidas condições.' },
                { icon: Trophy, title: 'Ranking Financeiro', desc: 'Estimule a equipe. Premie os melhores motoristas com base no saldo de pontos e conformidade.' },
                { icon: Map, title: 'Escalas e Rotas', desc: 'Atribua viagens, paradas e reboques. O motorista sabe exatamente seu itinerário.' },
                { icon: BarChart3, title: 'Relatórios Gerenciais', desc: 'Métricas claras de fechamento de mês, relatórios de defeitos comuns e histórico auditável.' },
                { icon: LayoutDashboard, title: 'Painel Centralizado', desc: 'Uma visão de águia da operação, com o status de cada carro, reboque e motorista online.' },
              ].map((f, i) => (
                 <div key={i} className="bg-white p-8 rounded-3xl border border-app-border shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 rounded-2xl bg-zinc-100 text-zinc-900 flex items-center justify-center mb-6">
                      <f.icon size={24} />
                    </div>
                    <h3 className="text-lg font-black text-text-main mb-2">{f.title}</h3>
                    <p className="text-sm text-text-muted font-medium leading-relaxed">{f.desc}</p>
                 </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-app-border bg-white py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-zinc-900 text-white flex items-center justify-center">
              <Truck size={14} />
            </div>
            <span className="font-bold text-sm text-zinc-900 italic tracking-tight">CheckDrive</span>
          </div>
          <p className="text-xs font-medium text-zinc-500 text-center md:text-left">
            &copy; {new Date().getFullYear()} CheckDrive Desenvolvido por Welinson Macedo. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
