import React, { useEffect, useState } from "react";
import {
  X,
  Printer,
  Download,
  Search,
  Calendar,
  Building2,
  FileText,
  DollarSign,
  Package,
  Wrench,
  Tag,
  Phone,
  Mail,
  MapPin,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
} from "lucide-react";
import { supabase } from "@/src/lib/supabase";
import PrintHeader from "./PrintHeader";
import { SupplierData } from "./SuppliersMap";

interface TransactionRecord {
  id: string;
  type: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  nf_number?: string;
  nf_key?: string;
  date?: string;
  notes?: string;
  created_at?: string;
  source?: "ESTOQUE" | "PENDENCIA";
  inventory_items?: {
    name?: string;
    sku?: string;
    category?: string;
  };
}

function tryParseJSON(jsonString: any) {
  if (!jsonString || typeof jsonString !== "string") return [];
  try {
    return JSON.parse(jsonString);
  } catch {
    return [];
  }
}

interface SupplierServiceHistoryModalProps {
  supplier: SupplierData | null;
  onClose: () => void;
}

export default function SupplierServiceHistoryModal({
  supplier,
  onClose,
}: SupplierServiceHistoryModalProps) {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("TODOS");
  const [sourceFilter, setSourceFilter] = useState("TODAS");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    if (!supplier) return;
    fetchSupplierHistory();
  }, [supplier?.id]);

  const fetchSupplierHistory = async () => {
    if (!supplier?.id) return;
    setLoading(true);
    try {
      // 1. Fetch inventory transactions linked by supplier_id
      const { data: txData, error: txError } = await supabase
        .from("inventory_transactions")
        .select(`
          *,
          inventory_items(name, sku, category)
        `)
        .eq("supplier_id", supplier.id)
        .order("created_at", { ascending: false });

      if (txError) {
        console.error("Erro ao buscar transações de estoque do fornecedor:", txError);
      }

      // 2. Fetch checklist_issues (Resolução de Pendências)
      const { data: issuesData, error: issuesError } = await supabase
        .from("checklist_issues")
        .select("*")
        .order("created_at", { ascending: false });

      if (issuesError) {
        console.error("Erro ao buscar resoluções de pendência:", issuesError);
      }

      const combined: TransactionRecord[] = [];

      // Process inventory_transactions (Estoque)
      if (txData) {
        txData.forEach((tx) => {
          combined.push({
            id: tx.id,
            type: tx.type || "ENTRADA",
            quantity: Number(tx.quantity) || 1,
            unit_price: Number(tx.unit_price) || 0,
            total_price: Number(tx.total_price) || 0,
            nf_number: tx.nf_number,
            nf_key: tx.nf_key,
            date: tx.date || tx.created_at,
            notes: tx.notes,
            created_at: tx.created_at,
            source: "ESTOQUE",
            inventory_items: tx.inventory_items,
          });
        });
      }

      // Process checklist_issues (Resolução de Pendências / Manutenções)
      if (issuesData) {
        issuesData.forEach((issue) => {
          let nfs: any[] = [];
          if (issue.resolution_nfs) {
            nfs = typeof issue.resolution_nfs === "string"
              ? tryParseJSON(issue.resolution_nfs)
              : issue.resolution_nfs;
          } else if (issue.resolution_nf && typeof issue.resolution_nf === "string" && issue.resolution_nf.trim().startsWith("[")) {
            nfs = tryParseJSON(issue.resolution_nf);
          }

          if (!Array.isArray(nfs)) nfs = [];

          const singleNfNumber = typeof issue.resolution_nf === "string" && !issue.resolution_nf.trim().startsWith("[")
            ? issue.resolution_nf
            : null;

          const cleanSupplierId = String(supplier.id).trim();
          const cleanCnpj = supplier.cnpj_cpf ? String(supplier.cnpj_cpf).replace(/\D/g, "") : "";
          const cleanSupplierName = supplier.name ? supplier.name.toLowerCase().trim() : "";

          // Check if issue NFs match this supplier
          let matchedNfs = nfs.filter((nf: any) => {
            if (!nf) return false;
            if (nf.supplier_id && String(nf.supplier_id).trim() === cleanSupplierId) return true;
            if (cleanCnpj && nf.cnpj_cpf && String(nf.cnpj_cpf).replace(/\D/g, "") === cleanCnpj) return true;
            if (cleanSupplierName && nf.supplier_name && String(nf.supplier_name).toLowerCase().includes(cleanSupplierName)) return true;
            return false;
          });

          const isDirectSupplierMatch = issue.supplier_id && String(issue.supplier_id).trim() === cleanSupplierId;

          if (isDirectSupplierMatch && matchedNfs.length === 0 && nfs.length > 0) {
            matchedNfs = nfs;
          }

          if (matchedNfs.length > 0) {
            matchedNfs.forEach((nf: any, nfIdx: number) => {
              const nfItems = Array.isArray(nf.items) ? nf.items : [];
              if (nfItems.length > 0) {
                nfItems.forEach((item: any, itemIdx: number) => {
                  const itemQty = Number(item.quantity) || 1;
                  const itemUnitPrice = Number(item.unit_price) || 0;
                  const itemTotal = itemQty * itemUnitPrice;

                  combined.push({
                    id: `issue-${issue.id}-nf-${nfIdx}-${itemIdx}`,
                    type: "SERVICO",
                    quantity: itemQty,
                    unit_price: itemUnitPrice,
                    total_price: itemTotal > 0 ? itemTotal : Number(issue.resolution_value) || 0,
                    nf_number: nf.nf_number || singleNfNumber || "-",
                    nf_key: nf.nf_key || "-",
                    date: issue.resolved_at || issue.created_at || issue.date,
                    notes: `[Resolução de Pendência] ${issue.item_title ? `Pendência: ${issue.item_title}. ` : ""}${issue.resolution_notes || ""}`.trim(),
                    created_at: issue.resolved_at || issue.created_at,
                    source: "PENDENCIA",
                    inventory_items: {
                      name: item.name || issue.item_title || "Serviço de Manutenção",
                      category: issue.item_category || "Pendência / Manutenção",
                    },
                  });
                });
              } else {
                const totalVal = Number(nf.total_price || issue.resolution_value) || 0;
                combined.push({
                  id: `issue-${issue.id}-nf-${nfIdx}`,
                  type: "SERVICO",
                  quantity: 1,
                  unit_price: totalVal,
                  total_price: totalVal,
                  nf_number: nf.nf_number || singleNfNumber || "-",
                  nf_key: nf.nf_key || "-",
                  date: issue.resolved_at || issue.created_at || issue.date,
                  notes: `[Resolução de Pendência] ${issue.item_title ? `Pendência: ${issue.item_title}. ` : ""}${issue.resolution_notes || ""}`.trim(),
                  created_at: issue.resolved_at || issue.created_at,
                  source: "PENDENCIA",
                  inventory_items: {
                    name: issue.item_title || "Serviço / Manutenção em Pendência",
                    category: issue.item_category || "Pendência / Manutenção",
                  },
                });
              }
            });
          } else if (isDirectSupplierMatch) {
            const totalVal = Number(issue.resolution_value) || 0;
            combined.push({
              id: `issue-${issue.id}`,
              type: "SERVICO",
              quantity: 1,
              unit_price: totalVal,
              total_price: totalVal,
              nf_number: singleNfNumber || "-",
              nf_key: "-",
              date: issue.resolved_at || issue.created_at,
              notes: `[Resolução de Pendência] ${issue.item_title ? `Pendência: ${issue.item_title}. ` : ""}${issue.resolution_notes || ""}`.trim(),
              created_at: issue.resolved_at || issue.created_at,
              source: "PENDENCIA",
              inventory_items: {
                name: issue.item_title || "Serviço de Manutenção",
                category: issue.item_category || "Pendência / Manutenção",
              },
            });
          }
        });
      }

      // Sort by date descending
      combined.sort((a, b) => {
        const timeA = new Date(a.date || a.created_at || 0).getTime();
        const timeB = new Date(b.date || b.created_at || 0).getTime();
        return timeB - timeA;
      });

      setTransactions(combined);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!supplier) return null;

  // Filter transactions
  const filteredTransactions = transactions.filter((tx) => {
    // Search term matching
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !term ||
      (tx.inventory_items?.name && tx.inventory_items.name.toLowerCase().includes(term)) ||
      (tx.inventory_items?.sku && tx.inventory_items.sku.toLowerCase().includes(term)) ||
      (tx.nf_number && tx.nf_number.toLowerCase().includes(term)) ||
      (tx.notes && tx.notes.toLowerCase().includes(term)) ||
      (tx.type && tx.type.toLowerCase().includes(term));

    // Type filter
    const matchesType =
      typeFilter === "TODOS" ||
      (typeFilter === "ENTRADA" && (tx.type === "ENTRADA" || !tx.type)) ||
      (typeFilter === "SERVICO" && (tx.type === "SERVICO" || tx.type === "MANUTENCAO")) ||
      (typeFilter === "OUTROS" && tx.type !== "ENTRADA" && tx.type !== "SERVICO" && tx.type !== "MANUTENCAO");

    // Source filter
    const matchesSource =
      sourceFilter === "TODAS" ||
      (sourceFilter === "ESTOQUE" && tx.source === "ESTOQUE") ||
      (sourceFilter === "PENDENCIA" && tx.source === "PENDENCIA");

    // Date range filter
    const txDate = tx.date || tx.created_at || "";
    const matchesStartDate = !startDate || txDate >= startDate;
    const matchesEndDate = !endDate || txDate <= endDate + "T23:59:59";

    return matchesSearch && matchesType && matchesSource && matchesStartDate && matchesEndDate;
  });

  // Calculate metrics
  const totalAmount = filteredTransactions.reduce(
    (acc, tx) => acc + (Number(tx.total_price) || 0),
    0
  );
  const totalCount = filteredTransactions.length;
  const averageAmount = totalCount > 0 ? totalAmount / totalCount : 0;
  const latestDate =
    filteredTransactions.length > 0
      ? filteredTransactions[0].date || filteredTransactions[0].created_at
      : null;

  // Helper formatting currency
  const formatMoney = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val || 0);
  };

  // Helper formatting date
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) return;

    const headers = [
      "Data/Hora",
      "Origem",
      "Tipo Operacao",
      "Item / Servico",
      "SKU",
      "Categoria",
      "No Nota Fiscal",
      "Chave NF-e",
      "Quantidade",
      "Valor Unitario (R$)",
      "Valor Total (R$)",
      "Observacoes",
    ];

    const rows = filteredTransactions.map((tx) => [
      `"${formatDate(tx.date || tx.created_at)}"`,
      `"${tx.source === "PENDENCIA" ? "Resolução de Pendência" : "Estoque"}"`,
      `"${tx.type || "ENTRADA"}"`,
      `"${(tx.inventory_items?.name || "Serviço/Peça").replace(/"/g, '""')}"`,
      `"${(tx.inventory_items?.sku || "-").replace(/"/g, '""')}"`,
      `"${(tx.inventory_items?.category || "-").replace(/"/g, '""')}"`,
      `"${tx.nf_number || "-"}"`,
      `"${tx.nf_key || "-"}"`,
      `"${tx.quantity || 1}"`,
      `"${(Number(tx.unit_price) || 0).toFixed(2).replace(".", ",")}"`,
      `"${(Number(tx.total_price) || 0).toFixed(2).replace(".", ",")}"`,
      `"${(tx.notes || "-").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const cleanSupplierName = supplier.name.replace(/[^a-zA-Z0-9_-]/g, "_");
    link.setAttribute(
      "download",
      `historico_servicos_${cleanSupplierName}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print view
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto print:p-0 print:bg-white print:relative print:z-0">
      <div className="bg-white rounded-3xl border border-zinc-200 shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh] overflow-hidden print:max-h-none print:shadow-none print:border-none print:rounded-none">
        
        {/* Printable Header - hidden on screen, visible on print */}
        <PrintHeader />

        {/* Modal Header */}
        <div className="bg-zinc-900 text-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 shrink-0 print:bg-white print:text-zinc-900 print:border-b-2 print:border-zinc-300 print:p-0 print:mb-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0 print:hidden">
              <FileText size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-black tracking-wider text-indigo-400 bg-indigo-950 border border-indigo-800 px-2 py-0.5 rounded-md print:hidden">
                  Histórico de Serviços & NF-e
                </span>
                <span className="text-xs text-zinc-400 font-mono print:text-zinc-600">
                  ID: {supplier.id.slice(0, 8)}
                </span>
              </div>
              <h2 className="text-xl font-extrabold text-white leading-tight mt-0.5 print:text-zinc-900">
                {supplier.name}
              </h2>
              <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400 mt-1 print:text-zinc-700">
                {supplier.cnpj_cpf && (
                  <span>
                    <strong>CNPJ/CPF:</strong> {supplier.cnpj_cpf}
                  </span>
                )}
                {supplier.phone && (
                  <span className="flex items-center gap-1">
                    <Phone size={12} className="text-indigo-400 print:hidden" /> {supplier.phone}
                  </span>
                )}
                {(supplier.city || supplier.state) && (
                  <span className="flex items-center gap-1">
                    <MapPin size={12} className="text-rose-400 print:hidden" />{" "}
                    {supplier.city} - {supplier.state}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2 shrink-0 print:hidden">
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={filteredTransactions.length === 0}
              className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-2 transition cursor-pointer border border-zinc-700"
              title="Exportar registros para planilha CSV"
            >
              <Download size={15} className="text-emerald-400" />
              <span className="hidden sm:inline">Exportar CSV</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={filteredTransactions.length === 0}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-2 transition cursor-pointer shadow-md"
              title="Imprimir relatório de serviços e compras"
            >
              <Printer size={15} />
              <span>Imprimir</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white p-2 rounded-xl transition cursor-pointer ml-1"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body / Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 print:overflow-visible print:p-0">
          
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:grid-cols-4 print:gap-2">
            <div className="bg-zinc-50 border border-zinc-200 p-3.5 rounded-2xl print:p-2 print:border-zinc-300">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                <FileText size={12} className="text-indigo-600 print:hidden" />
                Total de Serviços/NFs
              </span>
              <p className="text-xl font-extrabold text-zinc-900 mt-1 print:text-base">
                {totalCount}
              </p>
            </div>

            <div className="bg-zinc-50 border border-zinc-200 p-3.5 rounded-2xl print:p-2 print:border-zinc-300">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                <DollarSign size={12} className="text-emerald-600 print:hidden" />
                Valor Acumulado
              </span>
              <p className="text-xl font-extrabold text-emerald-700 mt-1 print:text-base">
                {formatMoney(totalAmount)}
              </p>
            </div>

            <div className="bg-zinc-50 border border-zinc-200 p-3.5 rounded-2xl print:p-2 print:border-zinc-300">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                <Tag size={12} className="text-blue-600 print:hidden" />
                Média por Operação
              </span>
              <p className="text-xl font-extrabold text-zinc-800 mt-1 print:text-base">
                {formatMoney(averageAmount)}
              </p>
            </div>

            <div className="bg-zinc-50 border border-zinc-200 p-3.5 rounded-2xl print:p-2 print:border-zinc-300">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                <Calendar size={12} className="text-purple-600 print:hidden" />
                Última Operação
              </span>
              <p className="text-sm font-bold text-zinc-800 mt-2 truncate print:text-xs">
                {latestDate ? formatDate(latestDate) : "Sem registros"}
              </p>
            </div>
          </div>

          {/* Filters Bar (Screen Only) */}
          <div className="bg-zinc-50 border border-zinc-200 p-3 rounded-2xl space-y-2.5 print:hidden">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Search input */}
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-2.5 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Buscar por serviço, peça, SKU, Nº da Nota Fiscal ou observação..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-zinc-800 placeholder-zinc-400"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-600 text-xs"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Source & Type filter tabs */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Source Tabs */}
                <div className="flex items-center gap-1 bg-white p-1 border border-zinc-200 rounded-xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setSourceFilter("TODAS")}
                    className={`px-2.5 py-1 rounded-lg transition ${
                      sourceFilter === "TODAS"
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-zinc-600 hover:bg-zinc-100"
                    }`}
                  >
                    Todas Fontes ({transactions.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSourceFilter("ESTOQUE")}
                    className={`px-2.5 py-1 rounded-lg transition ${
                      sourceFilter === "ESTOQUE"
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-zinc-600 hover:bg-zinc-100"
                    }`}
                  >
                    Estoque
                  </button>
                  <button
                    type="button"
                    onClick={() => setSourceFilter("PENDENCIA")}
                    className={`px-2.5 py-1 rounded-lg transition ${
                      sourceFilter === "PENDENCIA"
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-zinc-600 hover:bg-zinc-100"
                    }`}
                  >
                    Resolução de Pendências
                  </button>
                </div>

                {/* Type Tabs */}
                <div className="flex items-center gap-1 bg-white p-1 border border-zinc-200 rounded-xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setTypeFilter("TODOS")}
                    className={`px-2.5 py-1 rounded-lg transition ${
                      typeFilter === "TODOS"
                        ? "bg-zinc-800 text-white shadow-sm"
                        : "text-zinc-600 hover:bg-zinc-100"
                    }`}
                  >
                    Todos Tipos
                  </button>
                  <button
                    type="button"
                    onClick={() => setTypeFilter("ENTRADA")}
                    className={`px-2.5 py-1 rounded-lg transition ${
                      typeFilter === "ENTRADA"
                        ? "bg-zinc-800 text-white shadow-sm"
                        : "text-zinc-600 hover:bg-zinc-100"
                    }`}
                  >
                    Entradas / NF
                  </button>
                  <button
                    type="button"
                    onClick={() => setTypeFilter("SERVICO")}
                    className={`px-2.5 py-1 rounded-lg transition ${
                      typeFilter === "SERVICO"
                        ? "bg-zinc-800 text-white shadow-sm"
                        : "text-zinc-600 hover:bg-zinc-100"
                    }`}
                  >
                    Serviços
                  </button>
                </div>
              </div>
            </div>

            {/* Date Filters */}
            <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-zinc-200 text-xs font-bold text-zinc-600">
              <span className="text-[10px] uppercase font-black tracking-wider text-zinc-400">
                Filtrar por Período:
              </span>
              <div className="flex items-center gap-1.5">
                <label className="text-zinc-500">De:</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-white border border-zinc-200 rounded-lg px-2 py-1 text-xs text-zinc-800"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <label className="text-zinc-500">Até:</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-white border border-zinc-200 rounded-lg px-2 py-1 text-xs text-zinc-800"
                />
              </div>
              {(startDate || endDate || searchTerm || typeFilter !== "TODOS" || sourceFilter !== "TODAS") && (
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setTypeFilter("TODOS");
                    setSourceFilter("TODAS");
                    setStartDate("");
                    setEndDate("");
                  }}
                  className="text-rose-600 hover:underline text-[11px] ml-auto font-bold"
                >
                  Limpar Filtros
                </button>
              )}
            </div>
          </div>

          {/* Transactions List / Table */}
          {loading ? (
            <div className="py-12 text-center text-zinc-500 flex flex-col items-center gap-2">
              <RefreshCw size={24} className="animate-spin text-indigo-600" />
              <span className="text-xs font-bold">Carregando histórico do fornecedor...</span>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="py-12 border-2 border-dashed border-zinc-200 rounded-2xl text-center space-y-2">
              <AlertCircle size={32} className="mx-auto text-zinc-300" />
              <h4 className="text-sm font-extrabold text-zinc-700">Nenhum serviço ou entrada encontrada</h4>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                Não foram localizados registros de entradas ou serviços vinculados a este fornecedor com os filtros atuais.
              </p>
            </div>
          ) : (
            <div className="border border-zinc-200 rounded-2xl overflow-hidden print:border-zinc-300">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-100 border-b border-zinc-200 text-zinc-700 font-extrabold uppercase text-[10px] tracking-wider print:bg-zinc-200 print:text-zinc-900">
                      <th className="py-3 px-4">Data / Hora</th>
                      <th className="py-3 px-4">Origem</th>
                      <th className="py-3 px-4">Tipo</th>
                      <th className="py-3 px-4">Item / Serviço Realizado</th>
                      <th className="py-3 px-4">Nº NF-e</th>
                      <th className="py-3 px-4 text-center">Qtd</th>
                      <th className="py-3 px-4 text-right">Valor Unit.</th>
                      <th className="py-3 px-4 text-right">Total (R$)</th>
                      <th className="py-3 px-4">Observações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 text-zinc-800">
                    {filteredTransactions.map((tx) => {
                      const itemName = tx.inventory_items?.name || "Serviço / Compra em Lote";
                      const itemSku = tx.inventory_items?.sku;
                      const isService = tx.type === "SERVICO" || tx.type === "MANUTENCAO";
                      const isPendency = tx.source === "PENDENCIA";

                      return (
                        <tr
                          key={tx.id}
                          className="hover:bg-zinc-50/80 transition print:hover:bg-transparent"
                        >
                          <td className="py-3 px-4 font-mono text-[11px] font-bold text-zinc-600 whitespace-nowrap">
                            {formatDate(tx.date || tx.created_at)}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {isPendency ? (
                              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md font-bold text-[10px] uppercase">
                                <Wrench size={10} /> Pendência
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md font-bold text-[10px] uppercase">
                                <Package size={10} /> Estoque
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {isService ? (
                              <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md font-bold text-[10px] uppercase">
                                <Wrench size={10} /> Serviço
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md font-bold text-[10px] uppercase">
                                <Package size={10} /> Entrada NF
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-zinc-900">{itemName}</div>
                            {itemSku && (
                              <span className="text-[10px] text-zinc-400 font-mono">
                                SKU: {itemSku}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {tx.nf_number ? (
                              <span className="font-mono text-zinc-900 font-bold bg-zinc-100 border border-zinc-200 px-1.5 py-0.5 rounded">
                                NF: {tx.nf_number}
                              </span>
                            ) : (
                              <span className="text-zinc-400 text-[11px]">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center font-bold font-mono">
                            {tx.quantity || 1}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-medium text-zinc-600">
                            {formatMoney(Number(tx.unit_price) || 0)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-extrabold text-emerald-700">
                            {formatMoney(Number(tx.total_price) || 0)}
                          </td>
                          <td className="py-3 px-4 text-zinc-500 max-w-xs truncate text-[11px]">
                            {tx.notes || "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-zinc-100 border-t-2 border-zinc-300 font-extrabold text-zinc-900 print:bg-zinc-200">
                      <td colSpan={7} className="py-3 px-4 text-right uppercase text-[10px] tracking-wider">
                        Total Geral ({filteredTransactions.length} registros):
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-sm text-emerald-800">
                        {formatMoney(totalAmount)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Report Footer on Print */}
          <div className="hidden print:block pt-6 border-t border-zinc-300 text-[10px] text-zinc-500 flex justify-between items-center">
            <span>Relatório de Serviços & Histórico do Fornecedor — Gerado em {new Date().toLocaleString("pt-BR")}</span>
            <span>Página 1</span>
          </div>

        </div>

        {/* Modal Footer (Screen Only) */}
        <div className="bg-zinc-50 border-t border-zinc-200 p-4 flex items-center justify-between text-xs text-zinc-500 shrink-0 print:hidden">
          <span>Mostrando {filteredTransactions.length} de {transactions.length} registros</span>
          <button
            type="button"
            onClick={onClose}
            className="bg-zinc-200 hover:bg-zinc-300 text-zinc-800 font-bold px-4 py-2 rounded-xl transition cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
}
