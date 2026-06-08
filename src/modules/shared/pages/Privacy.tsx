import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Privacy() {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-[#030712] text-zinc-300 font-sans">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-900/10 blur-[120px]" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay"></div>
      </div>

      <nav className="fixed top-0 w-full bg-[#030712]/80 backdrop-blur-xl border-b border-white/5 z-50">
        <div className="max-w-4xl mx-auto px-6 h-20 flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center border border-white/5 transition-colors"
          >
            <ArrowLeft size={20} className="text-white" />
          </button>
          <div className="font-bold text-lg text-white">Políticas de Privacidade e LGPD</div>
        </div>
      </nav>

      <main className="relative z-10 pt-32 pb-24 max-w-4xl mx-auto px-6">
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           className="bg-white/5 border border-white/10 rounded-3xl p-8 md:p-12 backdrop-blur-sm"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/20 text-primary flex items-center justify-center mb-8 border border-primary/30">
            <Shield size={32} />
          </div>
          
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tighter mb-4">
            Aviso de Privacidade e Termos de Uso
          </h1>
          <p className="text-zinc-400 font-medium mb-12">
            Última atualização: {new Date().toLocaleDateString('pt-BR')}
          </p>

          <div className="space-y-10 text-zinc-300 leading-relaxed">
            
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">1. Introdução</h2>
              <p>
                Bem-vindo ao <strong>CheckDrive</strong>. Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos suas informações pessoais ao utilizar nossa plataforma, em conformidade com a <strong>Lei Geral de Proteção de Dados Pessoais (LGPD - Lei nº 13.709/2018)</strong>.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">2. Coleta de Dados Pessoais</h2>
              <p className="mb-3">Coletamos informações necessárias para a gestão eficaz de sua frota e motoristas, tais como:</p>
              <ul className="list-disc list-inside space-y-2 opacity-80 pl-2">
                <li><strong>Dados Pessoais:</strong> Nome do motorista, nome de usuário, e-mail e telefone.</li>
                <li><strong>Dados Operacionais:</strong> Placa e modelo dos veículos.</li>
                <li><strong>Localização e Telemetria:</strong> A localização GPS é coletada apenas pontualmente no momento em que um checklist é preenchido e transmitido para a plataforma. Também registramos logins, acessos, histórico de checklists e informações de avarias reportadas pelo usuário.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">3. Finalidade do Tratamento de Dados</h2>
              <p>Os dados coletados têm a finalidade estrita de fornecer os serviços contratados, incluindo:</p>
              <ul className="list-disc list-inside space-y-2 opacity-80 mt-3 pl-2">
                <li>Gestão de frota, escalas de viagem e ranqueamento de motoristas.</li>
                <li>Geração de relatórios de manutenção preventiva.</li>
                <li>Comunicação sobre o sistema e suporte técnico.</li>
                <li>Melhoria contínua da experiência e segurança na plataforma.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">4. Armazenamento e Segurança</h2>
              <p>
                As informações são armazenadas em infraestrutura de nuvem segura utilizando os serviços da plataforma <strong>Supabase</strong>, que conta com criptografia avançada em repouso e trânsito, políticas de linha de nível e rigoroso controle de acessos não autorizados. Seus dados são retidos enquanto houver vínculo de uso do sistema pela empresa que controla sua frota ou exigência de guarda legal.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">5. Compartilhamento de Dados</h2>
              <p>
                Não comercializamos seus dados pessoais. O compartilhamento ocorre apenas com prestadores de infraestrutura e serviços (como hospedagem em nuvem ou envios de notificações e SMS/WhatsApp) indispensáveis para a operação do CheckDrive, os quais também estão sujeitos a rigorosas regras de confidencialidade e à LGPD.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">6. Seus Direitos (LGPD)</h2>
              <p>De acordo com o Art. 18 da LGPD, você, titular dos dados, possui o direito de:</p>
              <ul className="list-disc list-inside space-y-2 opacity-80 mt-3 pl-2">
                <li>Confirmar a existência do tratamento.</li>
                <li>Acessar seus dados pessoais.</li>
                <li>Corrigir dados incompletos, inexatos ou desatualizados.</li>
                <li>Solicitar a anonimização, bloqueio ou eliminação de dados desnecessários ou excessivos.</li>
                <li>Revogar consentimentos concedidos anteriormente.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">7. Contato e DPO (Encarregado de Dados)</h2>
              <p>
                Para exercer seus direitos, relatar incidentes ou sanar dúvidas sobre como tratamos seus dados, entre em contato através de nossos canais de atendimento oficiais ou solicite diretamente a um administrador do sistema na sua empresa.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">8. Criação de Usuários e Responsabilidades do Cliente</h2>
              <p>
                A ferramenta atua como prestadora de serviço tecnológico (operadora de dados). Toda <strong>criação, edição e exclusão de novos usuários e motoristas são de total responsabilidade do cliente corporativo contratante (o controlador de dados)</strong>. A empresa empregadora que gere a frota tem a decisão primária sobre as razões e modo da coleta de informações dos seus colaboradores.
              </p>
            </section>

          </div>
        </motion.div>
      </main>

      <footer className="border-t border-white/5 relative z-10 bg-[#02040A]">
        <div className="max-w-4xl mx-auto px-6 py-8 text-center">
          <p className="text-xs font-medium text-zinc-600">
            &copy; {new Date().getFullYear()} CheckDrive. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
