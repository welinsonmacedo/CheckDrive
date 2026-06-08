import React from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Truck, ShieldCheck, Trophy, Map, ArrowRight, BarChart3, Clock, LayoutDashboard, ClipboardCheck, MessageCircle, ChevronRight, Activity, Smartphone, Zap } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  const handleWhatsAppClick = () => {
    const phoneNumber = '5534991448794';
    const message = encodeURIComponent('Olá! Gostaria de saber mais sobre o sistema CheckDrive.');
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#030712] text-zinc-300 selection:bg-primary/30 selection:text-white font-sans overflow-hidden">
      {/* Dynamic Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-900/20 blur-[120px]" />
        <div className="absolute top-[40%] left-[60%] w-[30%] h-[30%] rounded-full bg-indigo-900/10 blur-[100px]" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay"></div>
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 w-full bg-[#030712]/60 backdrop-blur-xl border-b border-white/5 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-blue-700 text-white flex items-center justify-center shadow-lg shadow-primary/20">
              <Truck size={22} className="stroke-[2.5]" />
            </div>
            <span className="font-black text-2xl tracking-tighter text-white">Check<span className="text-primary italic">Drive</span></span>
          </div>
          <button 
            onClick={() => navigate('/login')}
            className="group flex items-center gap-2 px-6 py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-full text-sm font-bold tracking-widest transition-all active:scale-95 border border-white/10"
          >
            Acessar Plataforma
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </nav>

      <main className="relative z-10 pt-32 pb-24">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-6 mb-40 mt-12 grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8 relative">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold tracking-widest"
            >
              <div className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </div>
              ECOSSISTEMA DE GESTÃO VEICULAR
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl lg:text-7xl font-black text-white tracking-tighter leading-[1.1]"
            >
              Controle absoluto <br/>da sua operação <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-400 to-indigo-400">em tempo real.</span>
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg lg:text-xl text-zinc-400 font-medium leading-relaxed max-w-xl"
            >
              Checklists automatizados, telemetria de falhas, ranqueamento inteligente e gestão de escalas. Uma central de comando completa para sua frota.
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap items-center gap-4 pt-4"
            >
              <button 
                onClick={() => navigate('/login')}
                className="flex items-center gap-3 px-8 py-4 bg-primary text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:shadow-[0_0_30px_-5px_rgba(37,99,235,0.4)] transition-all active:scale-95 group"
              >
                Iniciar Sessão
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button 
                onClick={handleWhatsAppClick}
                className="flex items-center gap-3 px-8 py-4 bg-white/5 text-white border border-white/10 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95"
              >
                Falar com Consultor
              </button>
            </motion.div>

          </div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            transition={{ delay: 0.2, type: 'spring', damping: 20 }}
            className="relative lg:ml-auto w-full max-w-lg"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/30 to-indigo-500/20 rounded-[2.5rem] blur-2xl -z-10 absolute-center transform rotate-6" />
            <div className="relative bg-[#0A0F1C]/80 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-8 shadow-2xl overflow-hidden">
               {/* Terminal dots */}
               <div className="flex gap-2 mb-8">
                 <div className="w-3 h-3 rounded-full bg-red-500/80" />
                 <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                 <div className="w-3 h-3 rounded-full bg-green-500/80" />
               </div>

               <div className="flex items-center justify-between border-b border-white/5 pb-5 mb-8">
                 <div>
                    <h3 className="text-xl font-black text-white tracking-tight">Performance Global</h3>
                    <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Ranking de Desempenho</p>
                 </div>
                 <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
                   <Zap className="text-primary fill-primary/20" size={24} />
                 </div>
               </div>
               
               <div className="space-y-4">
                 {[1, 2, 3].map((i) => (
                    <motion.div 
                      key={i} 
                      whileHover={{ scale: 1.02 }}
                      className="group flex items-center gap-5 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] transition-all cursor-crosshair"
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shadow-inner ${i === 1 ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' : 'bg-white/5 text-zinc-400 border border-white/5'}`}>
                        0{i}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-end mb-2">
                           <div className="text-sm font-bold text-zinc-200">Motorista {String.fromCharCode(64 + i)}</div>
                           <div className="text-xs font-black text-primary">{100 - i * 5}%</div>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${100 - i * 5}%` }}
                            transition={{ delay: 0.5 + (i * 0.2), duration: 1 }}
                            className={`h-full rounded-full ${i === 1 ? 'bg-gradient-to-r from-yellow-600 to-yellow-400' : 'bg-gradient-to-r from-primary to-blue-400'}`} 
                          />
                        </div>
                      </div>
                    </motion.div>
                 ))}
               </div>
            </div>
          </motion.div>
        </section>

        {/* Features Bento Grid */}
        <section className="py-24 border-t border-white/5 relative z-10">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-20">
              <div className="space-y-4 max-w-2xl">
                <h2 className="text-3xl lg:text-5xl font-black text-white tracking-tighter">
                  Evolua sua operação <br/>
                  <span className="text-zinc-500">para o próximo nível.</span>
                </h2>
              </div>
              <button onClick={() => navigate('/login')} className="flex items-center gap-2 text-primary font-bold hover:text-white transition-colors group text-sm uppercase tracking-widest">
                Explorar todos os recursos
                <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            <div className="grid md:grid-cols-3 gap-6 auto-rows-[280px]">
              {/* Card 1: Span 2 cols */}
              <div className="md:col-span-2 rounded-[2rem] bg-gradient-to-br from-white/5 to-transparent border border-white/10 p-10 relative overflow-hidden group hover:border-white/20 transition-colors">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[80px] -mr-20 -mt-20 transition-opacity opacity-0 group-hover:opacity-100" />
                <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mb-8 border border-white/10 text-white backdrop-blur-xl">
                  <ClipboardCheck size={28} />
                </div>
                <h3 className="text-2xl font-black text-white mb-3">Checklists Ultrarápidos</h3>
                <p className="text-zinc-400 font-medium leading-relaxed max-w-md">Diários de bordo, vistorias de carreta, fotos e relatórios de avarias em poucos toques, eliminando burocracia e papel.</p>
              </div>

              {/* Card 2 */}
              <div className="rounded-[2rem] bg-gradient-to-br from-white/5 to-transparent border border-white/10 p-10 relative overflow-hidden group hover:border-white/20 transition-colors">
                <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mb-8 border border-white/10 text-white backdrop-blur-xl">
                  <Trophy size={28} />
                </div>
                <h3 className="text-xl font-black text-white mb-3">Gamificação Integrada</h3>
                <p className="text-zinc-400 font-medium leading-relaxed text-sm">Premie os melhores condutores através do nosso algoritmo de ranking inteligente.</p>
              </div>

              {/* Card 3 */}
              <div className="rounded-[2rem] bg-gradient-to-br from-white/5 to-transparent border border-white/10 p-10 relative overflow-hidden group hover:border-white/20 transition-colors">
                <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mb-8 border border-white/10 text-white backdrop-blur-xl">
                  <Smartphone size={28} />
                </div>
                <h3 className="text-xl font-black text-white mb-3">App Motorista</h3>
                <p className="text-zinc-400 font-medium leading-relaxed text-sm">Interface amigável e direta. Feito para a estrada, funciona perfeitamente no celular.</p>
              </div>

              {/* Card 4: Span 2 cols */}
              <div className="md:col-span-2 rounded-[2rem] bg-gradient-to-br from-white/5 to-transparent border border-white/10 p-10 relative overflow-hidden group hover:border-white/20 transition-colors flex flex-col justify-end">
                 <div className="absolute top-0 right-0 p-10 pointer-events-none opacity-20 group-hover:opacity-100 transition-opacity duration-700">
                    <BarChart3 size={150} className="text-primary transform -rotate-12 translate-x-10 -translate-y-10" />
                 </div>
                <div className="relative z-10 w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mb-8 border border-white/10 text-white backdrop-blur-xl">
                  <LayoutDashboard size={28} />
                </div>
                <h3 className="relative z-10 text-2xl font-black text-white mb-3">Painel de Comando</h3>
                <p className="relative z-10 text-zinc-400 font-medium leading-relaxed max-w-md">Controle absoluto. Fechamentos mensais, status de cada veículo, manutenção preventiva e dashboards consolidados.</p>
              </div>
            </div>
          </div>
        </section>
        
        {/* CTA Section */}
        <section className="py-24 max-w-5xl mx-auto px-6 relative z-10">
          <div className="bg-gradient-to-br from-primary/20 via-primary/5 to-[#030712] border border-primary/20 rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.05] mix-blend-overlay"></div>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-1/2 bg-primary/30 blur-[100px] pointer-events-none" />
            
            <Truck size={48} className="mx-auto text-primary mb-8" />
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter mb-6 relative z-10">
              Pronto para modernizar<br/>sua operação?
            </h2>
            <p className="text-zinc-400 font-medium text-lg mb-10 max-w-xl mx-auto relative z-10">
              Faça parte da revolução logística. Elimine gargalos operacionais e proteja seu patrimônio com o CheckDrive.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10">
              <button 
                onClick={() => navigate('/login')}
                className="w-full sm:w-auto px-10 py-5 bg-primary text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-blue-600 hover:shadow-[0_0_30px_-5px_rgba(37,99,235,0.4)] transition-all active:scale-95"
              >
                Acessar Plataforma
              </button>
              <button 
                onClick={handleWhatsAppClick}
                className="w-full sm:w-auto px-10 py-5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-2xl text-sm font-black uppercase tracking-widest transition-all active:scale-95"
              >
                Falar no WhatsApp
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 relative z-10 bg-[#02040A]">
        <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/10 text-white border border-white/5 flex items-center justify-center">
              <Truck size={16} />
            </div>
            <span className="font-bold text-lg text-white font-black tracking-tighter">Check<span className="text-primary italic">Drive</span></span>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-4 text-xs font-medium text-zinc-600">
            <button onClick={() => navigate('/privacy')} className="hover:text-primary transition-colors">Políticas de Privacidade (LGPD)</button>
            <span className="hidden md:block">&bull;</span>
            <p className="text-center md:text-left">
              &copy; {new Date().getFullYear()} CheckDrive. Desenvolvido por Welinson Macedo. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>

      {/* WhatsApp Floating Button */}
      <motion.button
        onClick={handleWhatsAppClick}
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.8, type: 'spring' }}
        className="fixed bottom-6 right-6 w-14 h-14 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:bg-emerald-600 hover:scale-110 transition-all z-50 focus:outline-none"
        aria-label="Falar conosco no WhatsApp"
      >
        <MessageCircle size={28} />
      </motion.button>
    </div>
  );
}

