import React from 'react';
import { BookOpen, Shield, Wrench, FileText, CalendarDays, Users } from 'lucide-react';

export default function Documentation() {
  return (
    <div className="min-h-screen bg-[#F4F4F5] p-6 lg:p-12 font-sans selection:bg-primary/20">
      <div className="max-w-4xl mx-auto space-y-12">
        <header className="space-y-4">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-white shadow-xl shadow-primary/20 mb-8">
            <BookOpen size={32} />
          </div>
          <h1 className="text-4xl font-extrabold text-zinc-900 tracking-tight">Documentação do Sistema</h1>
          <p className="text-zinc-500 max-w-2xl text-lg">
            Guia de uso e funcionalidades do CheckDrive PWA. Aprenda como gerenciar a frota, escalas e motoristas.
          </p>
        </header>

        <section className="space-y-6">
          <h2 className="text-2xl font-bold flex items-center gap-3 border-b pb-4">
            <Users className="text-primary" /> Painel do Motorista
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
              <h3 className="font-bold text-zinc-800 mb-2">Checklists (Início e Fim)</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">
                Os motoristas devem realizar o preenchimento de checklist ao iniciar e finalizar uma escala. Devem ser tiradas 4 fotos exigidas do veículo, bem como avaliar cada item (Normal / Defeito). Defeitos exigem foto e descrição.
              </p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
              <h3 className="font-bold text-zinc-800 mb-2">Abastecimento</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">
                Fluxo especializado ("Fuel") onde o motorista tira foto do tacógrafo, informa quilometragem e detalha a litragem preenchida, que é salva sem bloqueios de defeitos.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-bold flex items-center gap-3 border-b pb-4">
            <Shield className="text-primary" /> Dashboard do Gestor
          </h2>
          <div className="space-y-4">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 flex gap-4">
              <Wrench className="text-zinc-400 mt-1" />
              <div>
                <h3 className="font-bold text-zinc-800 mb-2">Manutenção e Pendências</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">
                  Todos os itens marcados como "Defeito" pelos motoristas aparecem aqui. O gestor visualiza as fotos enviadas, analisa o defeito e pode marcar como "Resolvido", incluindo uma observação.
                </p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 flex gap-4">
              <CalendarDays className="text-zinc-400 mt-1" />
              <div>
                <h3 className="font-bold text-zinc-800 mb-2">Controle de Escalas</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">
                  O gestor define horários, seleciona um motorista, veículo, carreta (caso exista) e uma rota. Assim que agendada, a jornada aparecerá no celular do motorista.
                </p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 flex gap-4">
              <FileText className="text-zinc-400 mt-1" />
              <div>
                <h3 className="font-bold text-zinc-800 mb-2">Auditoria e Pontuação</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">
                  Sistema de performance de motoristas. Se um motorista concluir uma escala sem enviar checklist, o sistema retira pontos (ou saldo) automaticamente. O gestor pode aplicar bônus ou punições manualmente e redefinir saldos.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}