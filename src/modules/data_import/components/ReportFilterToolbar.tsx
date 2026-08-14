import React from "react";
import { Filter, Fuel, FileSpreadsheet } from "lucide-react";
import { MONTH_NAMES_PT } from "../utils/dateUtils";

interface Props {
  tipoImportacaoFilter: string;
  setTipoImportacaoFilter: (val: string) => void;
  categoryFilter: string;
  setCategoryFilter: (val: string) => void;
  categories: string[];
  selectedPeriod: string;
  setSelectedPeriod: (val: string) => void;
  monthsByYear: Record<string, string[]>;
  customMonth: string;
  setCustomMonth: (val: string) => void;
  agruparPor: "categoria" | "tipo_importacao" | "placa" | "fornecedor" | "mes" | "status";
  setAgruparPor: (val: any) => void;
  metrica: "soma_valor" | "quantidade" | "media_valor" | "soma_quantidade";
  setMetrica: (val: any) => void;
  placaFilter: string;
  setPlacaFilter: (val: string) => void;
}

export default function ReportFilterToolbar({
  tipoImportacaoFilter,
  setTipoImportacaoFilter,
  categoryFilter,
  setCategoryFilter,
  categories,
  selectedPeriod,
  setSelectedPeriod,
  monthsByYear,
  customMonth,
  setCustomMonth,
  agruparPor,
  setAgruparPor,
  metrica,
  setMetrica,
  placaFilter,
  setPlacaFilter,
}: Props) {
  return (
    <div className="bg-white rounded-3xl p-5 border border-zinc-200/80 shadow-sm space-y-4 no-print">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-100 pb-3">
        <div className="flex items-center gap-2 text-zinc-900 font-bold text-sm">
          <Filter className="w-4 h-4 text-blue-600" />
          <span>Filtros e Configuração do Relatório Atual</span>
        </div>

        {/* Quick Sub-tabs for Import Type */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-zinc-100/90 rounded-2xl border border-zinc-200/60">
          <button
            type="button"
            onClick={() => setTipoImportacaoFilter("Todas")}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              tipoImportacaoFilter === "Todas"
                ? "bg-white text-blue-700 shadow-xs"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Todas as Importações
          </button>
          <button
            type="button"
            onClick={() => setTipoImportacaoFilter("combustivel_gfv")}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              tipoImportacaoFilter === "combustivel_gfv"
                ? "bg-amber-600 text-white shadow-xs"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            <Fuel className="w-3.5 h-3.5" /> Consumo de Combustível (GFV)
          </button>
          <button
            type="button"
            onClick={() => setTipoImportacaoFilter("receitas_despesas")}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              tipoImportacaoFilter === "receitas_despesas"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Receitas e Despesas (SOFtran)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {/* Tipo de Importação Dropdown */}
        <div>
          <label className="block text-[11px] font-extrabold text-zinc-600 mb-1">
            Tipo da Importação
          </label>
          <select
            value={tipoImportacaoFilter}
            onChange={(e) => setTipoImportacaoFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-amber-50/80 border border-amber-200 text-xs font-bold text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
          >
            <option value="Todas">Todas as Importações</option>
            <option value="combustivel_gfv">Consumo de Combustível (GFV)</option>
            <option value="receitas_despesas">Receitas e Despesas (SOFtran)</option>
          </select>
        </div>

        {/* Categoria */}
        <div>
          <label className="block text-[11px] font-extrabold text-zinc-600 mb-1">
            Categoria
          </label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Período / Mês */}
        <div>
          <label className="block text-[11px] font-extrabold text-zinc-600 mb-1 flex items-center justify-between">
            <span>Período / Mês</span>
            {selectedPeriod.startsWith("m:") && (
              <span className="text-[10px] text-blue-600 font-bold">Por Mês</span>
            )}
          </label>
          <div className="space-y-1">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <optgroup label="Períodos Relativos">
                <option value="0">Todo o Histórico</option>
                <option value="30">Últimos 30 dias</option>
                <option value="60">Últimos 60 dias</option>
                <option value="90">Últimos 90 dias</option>
                <option value="365">Este Ano (365d)</option>
              </optgroup>

              {Object.entries(monthsByYear).map(([year, monthList]) => (
                <optgroup key={year} label={`Ano ${year}`}>
                  {monthList.map((my) => {
                    const [m] = my.split("/");
                    const monthName = MONTH_NAMES_PT[m] || m;
                    return (
                      <option key={my} value={`m:${my}`}>
                        Mês {my} ({monthName})
                      </option>
                    );
                  })}
                </optgroup>
              ))}

              <optgroup label="Personalizado">
                <option value="custom">Selecionar Mês Específico (Seletor)</option>
              </optgroup>
            </select>

            {selectedPeriod === "custom" && (
              <input
                type="month"
                value={customMonth}
                onChange={(e) => setCustomMonth(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl bg-blue-50 border border-blue-300 text-xs font-bold text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              />
            )}
          </div>
        </div>

        {/* Agrupar Por */}
        <div>
          <label className="block text-[11px] font-extrabold text-zinc-600 mb-1">
            Agrupar Dados Por
          </label>
          <select
            value={agruparPor}
            onChange={(e) => setAgruparPor(e.target.value as any)}
            className="w-full px-3 py-2 rounded-xl bg-blue-50/80 border border-blue-200 text-xs font-bold text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="categoria">Categoria</option>
            <option value="tipo_importacao">Tipo de Importação (GFV vs SOFtran)</option>
            <option value="placa">Placa / Frota</option>
            <option value="fornecedor">Fornecedor / Posto</option>
            <option value="mes">Mês / Período</option>
            <option value="status">Status do Lançamento</option>
          </select>
        </div>

        {/* Métrica */}
        <div>
          <label className="block text-[11px] font-extrabold text-zinc-600 mb-1">
            Métrica Principal
          </label>
          <select
            value={metrica}
            onChange={(e) => setMetrica(e.target.value as any)}
            className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="soma_valor">Soma Valor Total (R$)</option>
            <option value="quantidade">Quantidade de Lançamentos</option>
            <option value="media_valor">Valor Médio por Lançamento (R$)</option>
            <option value="soma_quantidade">Soma Unidades / Litros</option>
          </select>
        </div>

        {/* Placa Search Filter */}
        <div>
          <label className="block text-[11px] font-extrabold text-zinc-600 mb-1">
            Filtro Placa / Frota
          </label>
          <input
            type="text"
            placeholder="Ex: ABC1D23"
            value={placaFilter}
            onChange={(e) => setPlacaFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  );
}
