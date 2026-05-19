import React from 'react';
import { motion } from 'motion/react';
import { BookOpen, CheckSquare, Camera, Flag, LogOut, Navigation, FileImage, ClipboardCheck, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function DriverManual() {
  const navigate = useNavigate();

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-4 mb-4">
        <button onClick={() => navigate(-1)} className="p-2 border border-app-border rounded-xl bg-white hover:bg-zinc-50 active:scale-95 transition-all text-text-muted">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-2xl font-black text-text-main tracking-tight">Manual do App</h2>
          <p className="text-sm font-bold text-text-muted uppercase tracking-widest mt-1">Guia de Uso para Motoristas</p>
        </div>
      </div>

      <div className="bg-white p-5 rounded-3xl border border-app-border shadow-sm flex gap-4">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <BookOpen size={24} />
        </div>
        <p className="text-sm font-medium text-text-muted leading-relaxed">
          Bem-vindo ao aplicativo da frota! Este manual rápido vai ensinar você a usar as principais funções, como preencher checklists e como funciona a pontuação da empresa.
        </p>
      </div>

      <div className="space-y-4">
        {/* Step 1: Tela Inicial e Escalas */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white p-5 rounded-3xl border border-app-border shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-black">1</div>
            <h3 className="text-lg font-black text-text-main">Escalas e Operação</h3>
          </div>
          <div className="space-y-3 text-sm text-text-muted font-medium">
            <p>Na tela inicial, você verá seu <strong>Saldo/Pontuação</strong>, a quantidade de checklists que já realizou no mês e a sua <strong>Escala Atual</strong> (ou a próxima).</p>
            <p>A escala indica que a empresa programou uma viagem ou serviço para você, vinculando um veículo e rota específicos. Clique nela para ver quais checklists estão disponíveis.</p>
          </div>
        </motion.div>

        {/* Step 2: Checklists */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white p-5 rounded-3xl border border-app-border shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-black">2</div>
            <h3 className="text-lg font-black text-text-main">Iniciando um Checklist</h3>
          </div>
          <div className="space-y-3 text-sm text-text-muted font-medium">
            <p>Os checklists são a forma de prestarmos contas da conservação dos veículos. Existem 3 tipos principais, dependendo da necessidade da frota:</p>
            <div className="pl-4 border-l-2 border-emerald-200 space-y-3 mt-2">
              <p><strong>Início de Viagem:</strong> Feito assim que você assume a direção. É essencial fotografar o estado inicial da carreta/cavalo.</p>
              <p><strong>Abastecimento:</strong> Registre toda vez que encher o tanque. Você preencherá a litragem, o valor e comprovará tirando foto da nota/cupom.</p>
              <p><strong>Fim de Viagem:</strong> Confirma que você devolveu o veículo sem novos danos e marca a quilometragem de retorno.</p>
            </div>
            <p className="bg-zinc-50 p-3 rounded-xl border border-app-border text-xs"><strong>Nota:</strong> Se você não for alocado em uma Escala, ainda pode criar um novo Checklist avulso clicando nas opções na tela principal.</p>
          </div>
        </motion.div>

        {/* Step 3: Evidências e km */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white p-5 rounded-3xl border border-app-border shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-black">3</div>
            <h3 className="text-lg font-black text-text-main">Hodômetro e Fotos Iniciais</h3>
          </div>
          <div className="space-y-3 text-sm text-text-muted font-medium">
            <p>Todo Checklist vai primeiro solicitar a <strong>Placa do Veículo</strong> (se avulso) e o preenchimento do <strong>Hodômetro atual (Km)</strong>.</p>
            <p>Você deverá também tirar fotos dos 4 cantos do veículo para evidenciar o estado da lataria, lonas, vidros e pneus antes de prosseguir.</p>
          </div>
        </motion.div>

        {/* Step 4: Reportando Defeitos */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-white p-5 rounded-3xl border border-app-border shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-xl bg-red-100 text-red-600 flex items-center justify-center font-black">4</div>
            <h3 className="text-lg font-black text-text-main">Como reportar um defeito?</h3>
          </div>
          <div className="space-y-3 text-sm text-text-muted font-medium">
            <p>A segunda página do checklist traz os itens de inspeção (ex: Luz de Freio, Estepe, etc).</p>
            <p>Se algo não estiver de acordo, marque com <strong><span className="text-red-500 font-bold">X</span> (Não Conforme)</strong>. O sistema abrirá um campo para você digitar qual o problema e um botão de câmera.</p>
            <p className="text-xs bg-red-50 p-2 rounded-lg text-red-800 font-bold">Importante: Sempre tire uma foto focada da quebra/defeito para que a área de Manutenção avalie remotamente.</p>
          </div>
        </motion.div>

        {/* Step 5: Ranking */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-white p-5 rounded-3xl border border-app-border shadow-sm">
          <div className="flex items-center gap-3 mb-3">
             <div className="w-8 h-8 rounded-xl bg-yellow-100 text-yellow-600 flex items-center justify-center font-black">5</div>
            <h3 className="text-lg font-black text-text-main">Ranking / Pontuação</h3>
          </div>
          <div className="space-y-3 text-sm text-text-muted font-medium">
             <p>A depender do seu Perfil, você inicia o mês com um saldo financeiro (Bônus) ou com uma certa quantidade de Pontos.</p>
             <p>A Empresa premia a correta prestação de contas. Logo, se uma escala for finalizada e você não tiver preenchido algum checklist obrigatório da Rota (Início, Abastecimento ou Fim), o sistema descontará valores de você automaticamente.</p>
             <p>Para ver como estão os outros colegas, clique na área de ranking e saldo na tela principal.</p>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
