import React from 'react';
import { motion } from 'motion/react';
import { BookOpen, AlertTriangle, FileText, TrendingUp, Trophy, CheckSquare, ShieldCheck, Flag } from 'lucide-react';

export default function ManualTab() {
  return (
    <div className="space-y-6 pb-12 overflow-y-auto max-h-[85vh] pr-2 custom-scrollbar">
      <div className="bg-white p-6 rounded-2xl border border-app-border shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <BookOpen size={20} />
          </div>
          <div>
            <h2 className="text-xl font-black text-text-main tracking-tight">Manual do Sistema</h2>
            <p className="text-sm font-bold text-text-muted mt-1 uppercase tracking-widest">Guia de Operação e Funcionalidades</p>
          </div>
        </div>
        <p className="text-sm font-medium text-text-muted leading-relaxed">
          Este manual descreve o funcionamento geral do sistema inteligente para gestão de ativos operacionais, incluindo o App do Motorista, a gestão de pendências e as regras de pontuação (ranking).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* App do Motorista e Escalas */}
        <div className="bg-white p-6 rounded-2xl border border-app-border shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <CheckSquare size={18} className="text-indigo-500" />
            <h3 className="text-lg font-black text-text-main">1. App do Motorista & Checklists</h3>
          </div>
          <div className="space-y-4 text-sm font-medium text-text-muted">
            <p>
              O motorista utiliza o <strong>App do Motorista</strong> (visão mobile) para realizar os checklists da sua jornada.
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Existem 3 tipos principais de checklist: <strong>Início de Viagem</strong>, <strong>Abastecimento</strong> e <strong>Fim de Viagem</strong>.</li>
              <li>O preenchimento do hodômetro e os anexos fotográficos (km e comprovantes) são obrigatórios, garantindo o rastreio da quilometragem e combustível.</li>
              <li>Sempre que uma escala é aberta, o sistema cria automaticamente as pendências caso o motorista conclua a jornada (fechamento de escala via painel Admin) sem realizar todos os checklists obrigatórios daquele trajeto.</li>
            </ul>
          </div>
        </div>

        {/* Gestão de Defeitos e Pendências */}
        <div className="bg-white p-6 rounded-2xl border border-app-border shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={18} className="text-red-500" />
            <h3 className="text-lg font-black text-text-main">2. Gestão de Pendências (Defeitos)</h3>
          </div>
          <div className="space-y-4 text-sm font-medium text-text-muted">
             <p>Qualquer problema reportado pelo motorista durante o checklist (ex: pneu gasto, farol quebrado) ou via inserção manual pelo Admin será registrado como pendência.</p>
             <ul className="list-disc pl-5 space-y-2">
              <li>As pendências entram com status <strong>Pendente</strong> e ficam associadas ao veículo e ao motorista.</li>
              <li>Se um defeito for reportado várias vezes para o mesmo veículo <em>antes de ser solucionado</em>, o sistema incrementa o contador de relatórios ao invés de duplicar o defeito, armazenando as novas fotos e descrições dentro do mesmo registro.</li>
              <li>O setor de manutenção deve resolver esses defeitos na aba <strong>Pendências</strong>. Uma vez resolvido, o defeito sai da lista ativa.</li>
             </ul>
          </div>
        </div>

        {/* Rotas, Modalidades e Perfis */}
        <div className="bg-white p-6 rounded-2xl border border-app-border shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Flag size={18} className="text-emerald-500" />
            <h3 className="text-lg font-black text-text-main">3. Rotas, Veículos e Motoristas</h3>
          </div>
          <div className="space-y-4 text-sm font-medium text-text-muted">
             <ul className="list-disc pl-5 space-y-2">
              <li><strong>Motoristas</strong> podem ter um <em>Perfil de Pontuação</em>, ditando como perdem ou ganham pontos no ranking.</li>
              <li>O sistema suporta <strong>Motoristas Auxiliares</strong> nas escalas, útil para viagens conjuntas onde ambos precisam ter a escala computada ou ter bônus/penalidades divididas.</li>
              <li><strong>Veículos</strong> e carreta (implemento) são vinculados à escala para que a conferência de quilometragem bata entre início e fim.</li>
             </ul>
          </div>
        </div>

        {/* Auditoria e Relatórios */}
        <div className="bg-white p-6 rounded-2xl border border-app-border shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <FileText size={18} className="text-blue-500" />
            <h3 className="text-lg font-black text-text-main">4. Relatórios e Auditoria</h3>
          </div>
          <div className="space-y-4 text-sm font-medium text-text-muted">
             <ul className="list-disc pl-5 space-y-2">
              <li>O <strong>Painel Gerencial</strong> fornece estatísticas sobre fechamentos de ranking de períodos anteriores, mostrando a avaliação completa de forma imutável.</li>
              <li>Pode-se também consultar os <strong>Defeitos mais reincidentes</strong> e acompanhar a taxa de resolução da manutenção em períodos filtrados.</li>
              <li>A <strong>Auditoria</strong> permite que gestores entendam exatamente o que gerou ganho ou perda de pontos de cada motorista (se foi infração, penalidade automática por falta de checklist, ou inserção manual).</li>
             </ul>
          </div>
        </div>
      </div>

      {/* Regras do Ranking e Pontuação */}
      <div className="bg-white p-6 rounded-2xl border border-app-border shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Trophy size={18} className="text-yellow-500" />
          <h3 className="text-lg font-black text-text-main">5. Como Funciona a Pontuação (Ranking)</h3>
        </div>
        <div className="space-y-4 text-sm font-medium text-text-muted">
            <p>O fluxo de pontos ou saldo (cash) baseia-se nos <strong>Perfis de Pontuação</strong> e <strong>Configurações Globais</strong>.</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>O sistema pode operar de duas formas:
                <br/><strong>Modo Pontos:</strong> Motoristas começam com X pontos e perdem caso tenham falhas.
                <br/><strong>Modo Dinheiro (Premiação):</strong> Motoristas começam com um saldo financeiro (ex: R$ 500) e perdem bônus se não cumprirem os padrões.
              </li>
              <li>
                <strong>Atribuição de Penalidades:</strong>
                <br/> - Quando um Adm fecha uma escala, o sistema analisa se os checklists obrigatórios (Início, Fim, e Abastecimento dependendo da regra da Rota) foram preenchidos.
                <br/> - Se não foram preenchidos, a penalidade configurada é deduzida automaticamente da base do Motorista e registrada no log de Auditoria.
              </li>
              <li>
                <strong>Fechamento do Período:</strong>
                <br/> No fim do mês, o gestor acessa a aba Configurações e "Fecha o Mês". O ranking congela, os líderes são salvos no Histórico (visível nos Relatórios) e os pontos do mês seguinte são <span className="text-red-500 font-bold">RESETADOS</span> para o valor base inicial, para dar a todos uma nova chance na competição.
              </li>
            </ul>
        </div>
      </div>
      
    </div>
  );
}
