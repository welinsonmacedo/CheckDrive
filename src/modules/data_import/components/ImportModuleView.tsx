import React, { useState } from "react";
import {
  LayoutDashboard,
  Upload,
  FileText,
  Database,
  CheckSquare,
  History,
  Settings,
  Sparkles,
  ArrowLeft,
  FileSpreadsheet,
} from "lucide-react";
import ImportDashboardTab from "../pages/ImportDashboardTab";
import ImportWizardTab from "../pages/ImportWizardTab";
import ImportFilesTab from "../pages/ImportFilesTab";
import ImportRecordsTab from "../pages/ImportRecordsTab";
import ImportValidationTab from "../pages/ImportValidationTab";
import ImportHistoryTab from "../pages/ImportHistoryTab";
import ImportSettingsTab from "../pages/ImportSettingsTab";
import ImportReportsTab from "../pages/ImportReportsTab";

interface Props {
  companyId: string;
}

type TabType =
  | "dashboard"
  | "importacoes"
  | "arquivos"
  | "dados_importados"
  | "relatorios"
  | "validacao"
  | "historico"
  | "configuracoes";

export default function ImportModuleView({ companyId }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "importacoes", label: "Importações", icon: Upload },
    { id: "arquivos", label: "Arquivos", icon: FileText },
    { id: "dados_importados", label: "Dados Importados", icon: Database },
    { id: "relatorios", label: "Relatórios & Dashboards", icon: FileSpreadsheet },
    { id: "validacao", label: "Validação", icon: CheckSquare },
    { id: "historico", label: "Histórico", icon: History },
    { id: "configuracoes", label: "Configurações", icon: Settings },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Module Navigation Bar */}
      <div className="bg-white rounded-3xl p-3 border border-zinc-200/80 shadow-sm flex items-center gap-1 overflow-x-auto scrollbar-none">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id as TabType);
                if (item.id !== "dados_importados") setSelectedJobId(null);
              }}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all ${
                isActive
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Tab View */}
      {activeTab === "dashboard" && (
        <ImportDashboardTab
          companyId={companyId}
          onNavigateToWizard={() => setActiveTab("importacoes")}
        />
      )}

      {activeTab === "importacoes" && (
        <ImportWizardTab
          companyId={companyId}
          onFinished={() => setActiveTab("dados_importados")}
        />
      )}

      {activeTab === "arquivos" && (
        <ImportFilesTab
          companyId={companyId}
          onSelectJob={(jobId) => {
            setSelectedJobId(jobId);
            setActiveTab("dados_importados");
          }}
        />
      )}

      {activeTab === "dados_importados" && (
        <ImportRecordsTab companyId={companyId} selectedJobId={selectedJobId} />
      )}

      {activeTab === "relatorios" && <ImportReportsTab companyId={companyId} />}

      {activeTab === "validacao" && <ImportValidationTab companyId={companyId} />}

      {activeTab === "historico" && <ImportHistoryTab companyId={companyId} />}

      {activeTab === "configuracoes" && <ImportSettingsTab />}
    </div>
  );
}
