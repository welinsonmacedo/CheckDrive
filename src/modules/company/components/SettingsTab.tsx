import React, { useState } from "react";
import {
  Star,
  AlertCircle,
  Settings,
  Truck,
  Save,
  RefreshCw,
  Smartphone,
  Camera,
  MapPin,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/src/lib/supabase";
import FleetSettingsSection from "@/src/modules/company/components/FleetSettingsSection";
import ManualPenaltiesSettingsSection from "@/src/modules/company/components/ManualPenaltiesSettingsSection";
import ScoreProfilesSettingsSection from "@/src/modules/company/components/ScoreProfilesSettingsSection";

import ScoreCloseModal from "@/src/modules/company/components/ScoreCloseModal";

interface SettingsTabProps {
  appSettings: any;
  setAppSettings: (settings: any) => void;
  fetchData: () => void;
}

export default function SettingsTab({
  appSettings,
  setAppSettings,
  fetchData,
}: SettingsTabProps) {
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "global" | "profiles" | "vehicles" | "manual_penalties"
  >("global");
  const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase
        .from("app_settings")
        .update(appSettings)
        .eq("id", "global");
      if (error) throw error;
      alert("Configurações salvas com sucesso.");
      fetchData();
    } catch (error: any) {
      alert("Erro: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const menuItems = [
    {
      id: "global",
      label: "Sistema & Global",
      icon: Settings,
      desc: "Preferências do aplicativo",
    },
    {
      id: "profiles",
      label: "Perfis de Pontos",
      icon: Star,
      desc: "Configuração de pontuações",
    },
    {
      id: "vehicles",
      label: "Tipos de Veículos",
      icon: Truck,
      desc: "Modelos e modalidades",
    },
    {
      id: "manual_penalties",
      label: "Checklist Extra",
      icon: AlertCircle,
      desc: "Pendências e restrições",
    },
  ];

  return (
    <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-8 items-start">
      {/* Sidebar Menu */}
      <div className="w-full md:w-72 shrink-0 md:sticky md:top-6">
        <div className="flex flex-col gap-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`flex items-start gap-4 p-4 rounded-2xl transition-all text-left border ${
                activeTab === item.id
                  ? "bg-white border-primary/20 shadow-sm"
                  : "bg-transparent border-transparent hover:bg-zinc-100 hover:border-app-border"
              }`}
            >
              <div
                className={`mt-0.5 p-2 rounded-xl transition-colors ${
                  activeTab === item.id
                    ? "bg-primary/10 text-primary"
                    : "bg-white border border-app-border text-zinc-500 shadow-sm"
                }`}
              >
                <item.icon size={18} />
              </div>
              <div>
                <h4
                  className={`text-sm font-bold transition-colors ${activeTab === item.id ? "text-primary" : "text-zinc-700"}`}
                >
                  {item.label}
                </h4>
                <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest mt-1">
                  {item.desc}
                </p>
              </div>
            </button>
          ))}

          <div className="mt-6 pt-6 border-t border-app-border">
            <button
              type="button"
              onClick={() => setIsClosingModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-zinc-50 border border-zinc-200 text-zinc-700 hover:bg-zinc-100 transition-colors group"
            >
              <RefreshCw
                size={16}
                className="text-zinc-500 group-hover:text-primary transition-colors"
              />
              <div className="text-left">
                <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-700">
                  Novo Mês
                </h4>
                <p className="text-[10px] text-zinc-500 mt-0.5">
                  Zerar e Fechar Pontos
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 min-w-0">
        {activeTab === "global" ? (
          <div className="space-y-6">
            <div className="mb-6">
              <h2 className="text-2xl font-black text-zinc-800 tracking-tight flex items-center gap-2">
                <Settings className="text-primary" size={24} />
                Sistema & Global
              </h2>
              <p className="text-sm font-bold text-zinc-500 tracking-wider uppercase mt-1">
                Configurações globais independentes de perfil
              </p>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-8">
              {/* Geral Card */}
              <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm">
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-800 border-b border-zinc-100 pb-4 mb-6 flex items-center gap-2">
                  <Smartphone size={16} className="text-primary" />
                  Comportamento
                </h3>

                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                      Tipo de Sistema Global
                    </label>
                    <div className="relative">
                      <select
                        className="w-full h-12 px-4 rounded-xl border border-zinc-200 bg-zinc-50 text-sm font-bold text-zinc-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 appearance-none transition-all"
                        value={appSettings?.system_type || "points"}
                        onChange={(e) =>
                          setAppSettings({
                            ...appSettings,
                            system_type: e.target.value,
                          })
                        }
                      >
                        <option value="points">Pontos (Pts)</option>
                        <option value="cash">Saldo Financeiro (R$)</option>
                      </select>
                      <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                        <svg
                          className="w-4 h-4 text-zinc-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M19 9l-7 7-7-7"
                          ></path>
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Checklists Card */}
              <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm">
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-800 border-b border-zinc-100 pb-4 mb-6 flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-primary" />
                  Regras de Checklist
                </h3>

                <div className="space-y-4">
                  {/* Row 1 */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-2xl bg-zinc-50 border border-zinc-100 hover:border-primary/20 transition-colors group">
                    <div className="flex items-center gap-4 mb-4 sm:mb-0">
                      <div className="w-10 h-10 rounded-xl bg-white border border-zinc-200 flex items-center justify-center text-zinc-400 group-hover:text-primary transition-colors shrink-0">
                        <Camera size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-zinc-800">
                          Fotos do Veículo (4 Lados)
                        </h4>
                        <p className="text-[11px] text-zinc-500 mt-1 max-w-sm leading-relaxed">
                          Tornar obrigatório tirar as 4 fotos do veículo no
                          início e fim das viagens.
                        </p>
                      </div>
                    </div>
                    <label className="flex items-center cursor-pointer shrink-0 ml-14 sm:ml-0">
                      <div className="relative">
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={appSettings?.require_external_photos ?? true}
                          onChange={(e) =>
                            setAppSettings({
                              ...appSettings,
                              require_external_photos: e.target.checked,
                            })
                          }
                        />
                        <div
                          className={`block w-12 h-7 rounded-full shadow-inner transition-colors ${appSettings?.require_external_photos !== false ? "bg-primary" : "bg-zinc-300"}`}
                        ></div>
                        <div
                          className={`absolute left-1 top-1 bg-white w-5 h-5 rounded-full shadow-sm transition-transform ${appSettings?.require_external_photos !== false ? "transform translate-x-5" : ""}`}
                        ></div>
                      </div>
                    </label>
                  </div>

                  {/* Row 2 */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-2xl bg-zinc-50 border border-zinc-100 hover:border-primary/20 transition-colors group">
                    <div className="flex items-center gap-4 mb-4 sm:mb-0">
                      <div className="w-10 h-10 rounded-xl bg-white border border-zinc-200 flex items-center justify-center text-zinc-400 group-hover:text-primary transition-colors shrink-0">
                        <Camera size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-zinc-800">
                          Comprovante de Abastecimento
                        </h4>
                        <p className="text-[11px] text-zinc-500 mt-1 max-w-sm leading-relaxed">
                          Tornar obrigatório a foto do cupom fiscal ao registrar
                          abastecimentos.
                        </p>
                      </div>
                    </div>
                    <label className="flex items-center cursor-pointer shrink-0 ml-14 sm:ml-0">
                      <div className="relative">
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={
                            appSettings?.require_fuel_receipt_photo ?? true
                          }
                          onChange={(e) =>
                            setAppSettings({
                              ...appSettings,
                              require_fuel_receipt_photo: e.target.checked,
                            })
                          }
                        />
                        <div
                          className={`block w-12 h-7 rounded-full shadow-inner transition-colors ${appSettings?.require_fuel_receipt_photo !== false ? "bg-primary" : "bg-zinc-300"}`}
                        ></div>
                        <div
                          className={`absolute left-1 top-1 bg-white w-5 h-5 rounded-full shadow-sm transition-transform ${appSettings?.require_fuel_receipt_photo !== false ? "transform translate-x-5" : ""}`}
                        ></div>
                      </div>
                    </label>
                  </div>

                  {/* Row 3 */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-2xl bg-zinc-50 border border-zinc-100 hover:border-primary/20 transition-colors group">
                    <div className="flex items-center gap-4 mb-4 sm:mb-0">
                      <div className="w-10 h-10 rounded-xl bg-white border border-zinc-200 flex items-center justify-center text-zinc-400 group-hover:text-primary transition-colors shrink-0">
                        <MapPin size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-zinc-800">
                          Localização GPS Obrigatória
                        </h4>
                        <p className="text-[11px] text-zinc-500 mt-1 max-w-sm leading-relaxed">
                          Exigir sinal de GPS ativo ao enviar um fechamento de
                          checklist.
                        </p>
                      </div>
                    </div>
                    <label className="flex items-center cursor-pointer shrink-0 ml-14 sm:ml-0">
                      <div className="relative">
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={appSettings?.require_location ?? false}
                          onChange={(e) =>
                            setAppSettings({
                              ...appSettings,
                              require_location: e.target.checked,
                            })
                          }
                        />
                        <div
                          className={`block w-12 h-7 rounded-full shadow-inner transition-colors ${appSettings?.require_location ? "bg-primary" : "bg-zinc-300"}`}
                        ></div>
                        <div
                          className={`absolute left-1 top-1 bg-white w-5 h-5 rounded-full shadow-sm transition-transform ${appSettings?.require_location ? "transform translate-x-5" : ""}`}
                        ></div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full sm:w-auto px-8 h-12 bg-primary text-white font-black text-[11px] uppercase tracking-[0.2em] rounded-xl shadow-lg hover:shadow-primary/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save size={16} />
                  Salvar Preferências
                </button>
              </div>
            </form>
          </div>
        ) : activeTab === "profiles" ? (
          <div className="space-y-6">
            <div className="mb-6">
              <h2 className="text-2xl font-black text-zinc-800 tracking-tight flex items-center gap-2">
                <Star className="text-primary" size={24} />
                Perfis de Pontos
              </h2>
              <p className="text-sm font-bold text-zinc-500 tracking-wider uppercase mt-1">
                Regras e pontuações por perfil
              </p>
            </div>
            <ScoreProfilesSettingsSection />
          </div>
        ) : activeTab === "vehicles" ? (
          <div className="space-y-6">
            <div className="mb-6">
              <h2 className="text-2xl font-black text-zinc-800 tracking-tight flex items-center gap-2">
                <Truck className="text-primary" size={24} />
                Tipos de Veículos
              </h2>
              <p className="text-sm font-bold text-zinc-500 tracking-wider uppercase mt-1">
                Modelos, categorias e modalidades
              </p>
            </div>
            <FleetSettingsSection />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="mb-6">
              <h2 className="text-2xl font-black text-zinc-800 tracking-tight flex items-center gap-2">
                <AlertCircle className="text-primary" size={24} />
                Checklist Extra & Penalidades
              </h2>
              <p className="text-sm font-bold text-zinc-500 tracking-wider uppercase mt-1">
                Configuração de pendências manuais
              </p>
            </div>
            <ManualPenaltiesSettingsSection />
          </div>
        )}
      </div>

      {isClosingModalOpen && (
        <ScoreCloseModal
          initialScore={Number(appSettings.initial_value) || 1000}
          onClose={() => setIsClosingModalOpen(false)}
          onSuccess={() => {
            setIsClosingModalOpen(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
