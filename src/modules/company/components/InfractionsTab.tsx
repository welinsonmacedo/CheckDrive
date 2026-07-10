import React, { useState, useEffect } from "react";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/modules/shared/contexts/AuthContext";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  ShieldAlert,
  AlertCircle,
  Calendar,
  MapPin,
  Receipt,
  UploadCloud,
  X,
  Save,
  LayoutDashboard,
  List,
  BarChart3,
  PieChart,
  TrendingUp,
  Printer,
  FileText,
  User,
  Eye,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from "recharts";
import InfractionPrintModal from "./InfractionPrintModal";
import DriverSummaryPrintModal from "./DriverSummaryPrintModal";
import InfractionCodeSelector from "./InfractionCodeSelector";
import { getInfractionDescription } from "@/src/utils/infractions";

const DashboardView = ({ infractions }: { infractions: any[] }) => {
  const totalAmount = infractions.reduce(
    (acc, curr) => acc + (Number(curr.amount) || 0),
    0,
  );
  const totalNicAmount = infractions.reduce(
    (acc, curr) => {
      let sum = acc;
      if (curr.installments) {
        const nicInst = curr.installments.find((i: any) => i.isNIC);
        if (nicInst) sum += (Number(nicInst.amount) || 0);
      }
      return sum;
    },
    0,
  );
  const totalDiscounted = infractions.reduce(
    (acc, curr) => {
      let sum = acc;
      if (curr.installments) {
        curr.installments.forEach((inst: any) => {
          if (!inst.isNIC) {
            sum += Number(inst.amount) || 0;
          }
        });
      }
      return sum;
    },
    0,
  );
  const totalFineDiscount = infractions.reduce(
    (acc, curr) => acc + (Number(curr.discounted_amount) || 0),
    0,
  );

  const driversMap = new Map();
  infractions.forEach((inf) => {
    const driverName = inf.profiles?.full_name || "Desconhecido";
    const current = driversMap.get(driverName) || { count: 0, amount: 0 };
    let infAmount = Number(inf.amount) || 0;
    if (inf.installments) {
      const nicInst = inf.installments.find((i: any) => i.isNIC);
      if (nicInst) infAmount += (Number(nicInst.amount) || 0);
    }
    driversMap.set(driverName, {
      count: current.count + 1,
      amount: current.amount + infAmount,
    });
  });

  const driversData = Array.from(driversMap.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const codeMap = new Map();
  infractions.forEach((inf) => {
    const code = inf.infraction_code;
    const current = codeMap.get(code) || 0;
    codeMap.set(code, current + 1);
  });

  const codeData = Array.from(codeMap.entries())
    .map(([code, count]) => ({ name: code, value: count }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6"];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200">
          <div className="flex items-center gap-3 text-zinc-500 mb-2">
            <Receipt size={20} />
            <h3 className="font-medium text-sm">Total em Multas</h3>
          </div>
          <div className="text-2xl font-bold text-zinc-800">
            {new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
            }).format(totalAmount)}
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200">
          <div className="flex items-center gap-3 text-zinc-500 mb-2">
            <Receipt size={20} />
            <h3 className="font-medium text-sm">Total de NICs</h3>
          </div>
          <div className="text-2xl font-bold text-orange-600">
            {new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
            }).format(totalNicAmount)}
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200">
          <div className="flex items-center gap-3 text-zinc-500 mb-2">
            <TrendingUp size={20} />
            <h3 className="font-medium text-sm">Multas (c/ Desconto)</h3>
          </div>
          <div className="text-2xl font-bold text-emerald-600">
            {new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
            }).format(totalFineDiscount)}
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200">
          <div className="flex items-center gap-3 text-zinc-500 mb-2">
            <TrendingUp size={20} />
            <h3 className="font-medium text-sm">Descontado do Motorista</h3>
          </div>
          <div className="text-2xl font-bold text-emerald-600">
            {new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
            }).format(totalDiscounted)}
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200">
          <div className="flex items-center gap-3 text-zinc-500 mb-2">
            <ShieldAlert size={20} />
            <h3 className="font-medium text-sm">Total de Infrações</h3>
          </div>
          <div className="text-2xl font-bold text-red-600">
            {infractions.length}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200">
          <h3 className="font-bold text-zinc-800 mb-6">
            Top Motoristas com Mais Infrações
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={driversData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e4e4e7"
                />
                <XAxis
                  dataKey="name"
                  stroke="#a1a1aa"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#a1a1aa"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: "#f4f4f5" }}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "none",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Bar
                  dataKey="count"
                  fill="#ef4444"
                  radius={[4, 4, 0, 0]}
                  barSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200">
          <h3 className="font-bold text-zinc-800 mb-6">
            Tipos de Infrações Mais Comuns
          </h3>
          <div className="h-72 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={codeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {codeData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "none",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2">
            {codeData.map((entry, index) => (
              <div
                key={entry.name}
                className="flex items-center gap-2 text-xs text-zinc-600"
              >
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                ></div>
                <span className="font-bold flex-shrink-0">{entry.name}:</span>
                <span
                  className="truncate"
                  title={getInfractionDescription(entry.name)}
                >
                  {getInfractionDescription(entry.name)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal Ver Anexo */}
      <AnimatePresence>
        {selectedAttachment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
            >
              <div className="bg-white border-b border-zinc-100 p-4 flex justify-between items-center z-10">
                <h3 className="text-lg font-bold text-zinc-800 flex items-center gap-2">
                  <Eye className="text-indigo-500" />
                  Visualizar Anexo
                </h3>
                <button
                  onClick={() => setSelectedAttachment(null)}
                  className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-auto bg-zinc-100/50 p-4 flex items-center justify-center min-h-[500px]">
                {selectedAttachment.toLowerCase().includes(".pdf") ? (
                  <iframe
                    src={selectedAttachment}
                    className="w-full h-[70vh] rounded-xl border border-zinc-200"
                    title="Anexo PDF"
                  />
                ) : (
                  <img
                    src={selectedAttachment}
                    alt="Anexo da Infração"
                    className="max-w-full max-h-[70vh] rounded-xl border border-zinc-200 object-contain shadow-sm"
                  />
                )}
              </div>
              <div className="p-4 border-t border-zinc-100 bg-white flex justify-end">
                <a
                  href={selectedAttachment}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
                >
                  Abrir Original em Nova Guia
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

const DriversDashboardView = ({
  infractions,
  drivers,
}: {
  infractions: any[];
  drivers: any[];
}) => {
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [driverSearch, setDriverSearch] = useState("");
  const [printSummaryDriver, setPrintSummaryDriver] = useState<any | null>(null);

  const driverStats = drivers
    .map((driver) => {
      const driverInfractions = infractions.filter(
        (inf) => inf.driver_id === driver.id,
      );
      const totalAmount = driverInfractions.reduce(
        (acc, curr) => acc + (Number(curr.amount) || 0),
        0,
      );
      const totalNicAmount = driverInfractions.reduce(
        (acc, curr) => {
          let sum = acc;
          if (curr.installments) {
            const nicInst = curr.installments.find((i: any) => i.isNIC);
            if (nicInst) sum += (Number(nicInst.amount) || 0);
          }
          return sum;
        },
        0,
      );
      const totalDiscounted = driverInfractions.reduce(
        (acc, curr) => {
          let sum = acc;
          if (curr.installments) {
            curr.installments.forEach((inst: any) => {
              if (!inst.isNIC) {
                sum += Number(inst.amount) || 0;
              }
            });
          }
          return sum;
        },
        0,
      );
      const totalFineDiscount = driverInfractions.reduce(
        (acc, curr) => acc + (Number(curr.discounted_amount) || 0),
        0,
      );
      return {
        id: driver.id,
        name: driver.full_name,
        infractions: driverInfractions,
        count: driverInfractions.length,
        totalAmount,
        totalNicAmount,
        totalDiscounted,
        totalFineDiscount,
      };
    })
    .filter((stat) => stat.count > 0 || driverSearch === "");

  const sortedDrivers = [...driverStats]
    .filter((d) => d.name.toLowerCase().includes(driverSearch.toLowerCase()))
    .sort((a, b) => b.count - a.count);

  const selectedDriverInfo =
    sortedDrivers.find((d) => d.id === selectedDriverId) ||
    (sortedDrivers.length > 0 ? sortedDrivers[0] : null);

  useEffect(() => {
    if (sortedDrivers.length > 0 && !selectedDriverId) {
      setSelectedDriverId(sortedDrivers[0].id);
    }
  }, [sortedDrivers, selectedDriverId]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Drivers List */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 lg:col-span-1 flex flex-col h-[600px]">
        <h3 className="font-bold text-zinc-800 mb-4 flex items-center gap-2">
          <User size={20} className="text-zinc-500" />
          Motoristas Autuados
        </h3>

        {/* Search */}
        <div className="relative mb-4">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
            size={16}
          />
          <input
            type="text"
            placeholder="Buscar motorista..."
            value={driverSearch}
            onChange={(e) => setDriverSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-sm border border-zinc-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {sortedDrivers.length === 0 ? (
            <div className="text-center py-8 text-zinc-400 text-sm">
              Nenhum motorista com infrações.
            </div>
          ) : (
            sortedDrivers.map((driver) => (
              <button
                key={driver.id}
                onClick={() => setSelectedDriverId(driver.id)}
                className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                  selectedDriverInfo?.id === driver.id
                    ? "bg-red-50 border-red-200 shadow-sm"
                    : "bg-white border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold flex-shrink-0 text-sm ${
                      selectedDriverInfo?.id === driver.id
                        ? "bg-red-600 text-white"
                        : "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    {driver.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-sm text-zinc-850 truncate">
                      {driver.name}
                    </div>
                    <div className="text-xs text-zinc-500 mt-0.5">
                      {driver.count}{" "}
                      {driver.count === 1 ? "infração" : "infrações"}
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <div className="text-sm font-bold text-zinc-800">
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(driver.totalAmount)}
                  </div>
                  {driver.totalDiscounted > 0 && (
                    <div className="text-[10px] font-bold text-emerald-600">
                      -
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(driver.totalDiscounted)}
                    </div>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Driver Infractions Detail Panel */}
      <div className="lg:col-span-2 space-y-6">
        {selectedDriverInfo ? (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 min-h-[600px] flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-zinc-100 pb-4 mb-6 gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-xl flex-shrink-0">
                  {selectedDriverInfo.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-zinc-900 leading-tight">
                    {selectedDriverInfo.name}
                  </h3>
                  <p className="text-sm text-zinc-500 mt-1">
                    Histórico detalhado de infrações de trânsito
                  </p>
                  <button
                    onClick={() => setPrintSummaryDriver(selectedDriverInfo)}
                    className="mt-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm hover:shadow active:scale-[0.98]"
                  >
                    <Printer size={13} /> Imprimir Resumo
                  </button>
                </div>
              </div>

              {/* Individual Driver Stats summary */}
              <div className="flex items-center gap-4 bg-zinc-50 p-3 rounded-2xl border border-zinc-100 flex-wrap lg:flex-nowrap">
                <div className="text-center px-3 border-r border-zinc-200">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    Quantidade
                  </div>
                  <div className="text-base font-extrabold text-zinc-800">
                    {selectedDriverInfo.count}
                  </div>
                </div>
                <div className="text-center px-3 border-r border-zinc-200">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    Valor Total
                  </div>
                  <div className="text-base font-extrabold text-red-600">
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(selectedDriverInfo.totalAmount)}
                  </div>
                </div>
                <div className="text-center px-3 border-r border-zinc-200">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    Total NIC
                  </div>
                  <div className="text-base font-extrabold text-orange-600">
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(selectedDriverInfo.totalNicAmount)}
                  </div>
                </div>
                <div className="text-center px-3 border-r border-zinc-200">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    Multas (c/ Desc.)
                  </div>
                  <div className="text-base font-extrabold text-emerald-600">
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(selectedDriverInfo.totalFineDiscount)}
                  </div>
                </div>
                <div className="text-center px-3">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    Descontado do Motorista
                  </div>
                  <div className="text-base font-extrabold text-emerald-600">
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(selectedDriverInfo.totalDiscounted)}
                  </div>
                </div>
              </div>
            </div>

            {/* List of Infractions for Selected Driver */}
            <div className="flex-1 overflow-y-auto space-y-4 max-h-[420px] pr-1">
              {selectedDriverInfo.infractions.length === 0 ? (
                <div className="text-center py-12 text-zinc-400 text-sm">
                  Nenhuma infração registrada para este motorista.
                </div>
              ) : (
                selectedDriverInfo.infractions.map((inf: any) => (
                  <div
                    key={inf.id}
                    className="p-4 rounded-xl border border-zinc-200 hover:border-zinc-300 bg-zinc-50/50 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row justify-between gap-4 items-start">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold font-mono text-zinc-750 bg-zinc-200/60 px-2 py-0.5 rounded">
                            Cód: {inf.infraction_code}
                          </span>
                          {inf.notice_number && (
                            <span className="text-xs font-mono bg-zinc-200/60 text-zinc-750 px-2 py-0.5 rounded border border-zinc-300/30">
                              Auto: {inf.notice_number}
                            </span>
                          )}
                          {inf.license_plate && (
                            <span className="text-xs font-mono font-medium text-red-700 bg-red-50 border border-red-100 px-2 py-0.5 rounded">
                              Placa: {inf.license_plate}
                            </span>
                          )}
                        </div>

                        <div className="text-sm font-semibold text-zinc-800">
                          {inf.description ||
                            getInfractionDescription(inf.infraction_code)}
                        </div>

                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                          <div className="flex items-center gap-1">
                            <Calendar size={14} />
                            {new Date(inf.infraction_date).toLocaleDateString(
                              "pt-BR",
                            )}{" "}
                            às{" "}
                            {new Date(inf.infraction_date).toLocaleTimeString(
                              "pt-BR",
                              { hour: "2-digit", minute: "2-digit" },
                            )}
                          </div>
                          {inf.address && (
                            <div className="flex items-center gap-1">
                              <MapPin size={14} />
                              <span className="truncate max-w-xs">
                                {inf.address}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-end justify-between sm:justify-start w-full sm:w-auto border-t sm:border-t-0 pt-2 sm:pt-0 border-zinc-100">
                        <div className="text-right">
                          <div className="text-sm font-black text-zinc-900">
                            {new Intl.NumberFormat("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            }).format((Number(inf.amount) || 0) + (inf.installments?.find((i: any) => i.isNIC)?.amount ? Number(inf.installments.find((i: any) => i.isNIC).amount) : 0))}
                          </div>
                          {inf.installments?.find((i: any) => i.isNIC) && (
                            <div className="text-[9px] text-orange-600 font-medium mt-0.5">
                              NIC incl.
                            </div>
                          )}
                          {inf.discounted_amount != null && (
                            <div className="text-xs font-bold text-emerald-600 mt-0.5">
                              Desc:{" "}
                              {new Intl.NumberFormat("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              }).format(inf.discounted_amount)}
                            </div>
                          )}
                        </div>

                        {/* Display Installments inside driver history card */}
                        {inf.installments && inf.installments.length > 0 && (
                          <div className="mt-2 text-right">
                            <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide">
                              Parcelas
                            </div>
                            <div className="flex gap-1 flex-wrap justify-end mt-1">
                              {inf.installments.map(
                                (inst: any, idx: number) => (
                                  <span
                                    key={idx}
                                    className={`text-[10px] bg-white border px-1.5 py-0.5 rounded font-medium ${inst.isNIC ? "border-orange-200 text-orange-700 bg-orange-50" : "border-zinc-200 text-zinc-600"}`}
                                  >
                                    {inst.isNIC ? "NIC" : ""}
                                    {inst.isNIC && inst.date ? " (" : ""}
                                    {inst.date
                                      ? new Date(inst.date)
                                          .toLocaleDateString("pt-BR", {
                                            timeZone: "UTC",
                                          })
                                          .substring(0, 5)
                                      : !inst.isNIC ? "?" : ""}
                                    {inst.isNIC && inst.date ? ")" : ""}
                                    :{" "}
                                    {new Intl.NumberFormat("pt-BR", {
                                      style: "currency",
                                      currency: "BRL",
                                      maximumFractionDigits: 0,
                                    }).format(Number(inst.amount) || 0)}
                                  </span>
                                ),
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 h-[600px] flex flex-col items-center justify-center text-center">
            <User size={48} className="text-zinc-300 mb-2" />
            <p className="text-zinc-500 font-medium">
              Nenhum motorista selecionado ou cadastrado.
            </p>
          </div>
        )}
      </div>

      {printSummaryDriver && (
        <DriverSummaryPrintModal
          driver={printSummaryDriver}
          onClose={() => setPrintSummaryDriver(null)}
        />
      )}
    </div>
  );
};

export default function InfractionsTab() {
  const { user } = useAuth();
  const [infractions, setInfractions] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [setupRequired, setSetupRequired] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAttachment, setSelectedAttachment] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"list" | "dashboard" | "drivers">("list");
  const [printInfraction, setPrintInfraction] = useState<any>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [isCodeSelectorOpen, setIsCodeSelectorOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user?.company_id) return;
    setLoading(true);

    try {
      // Check table existence
      const { error: checkErr } = await supabase
        .from("traffic_infractions")
        .select("id")
        .limit(1);
      if (checkErr && checkErr.code === "42P01") {
        setSetupRequired(true);
        setLoading(false);
        return;
      }

      // Fetch infractions
      const { data: infractionsData, error: fetchErr } = await supabase
        .from("traffic_infractions")
        .select(
          `
          *,
          discounted_amount,
          installments,
          license_plate,
          profiles:driver_id(full_name)
        `,
        )
        .order("infraction_date", { ascending: false });

      if (fetchErr && fetchErr.code === "42703") {
        setSetupRequired(true);
        setLoading(false);
        return;
      }

      if (infractionsData) setInfractions(infractionsData);

      // Fetch drivers
      const { data: driversData } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("role", "driver")
        .order("full_name");

      if (driversData) setDrivers(driversData);

      // Fetch vehicles and trailers
      const [vehiclesRes, trailersRes] = await Promise.all([
        supabase
          .from("vehicles")
          .select("id, plate, model")
          .eq("active", true)
          .order("plate"),
        supabase
          .from("trailers")
          .select("id, plate")
          .eq("active", true)
          .order("plate"),
      ]);

      let allVehicles = [];
      if (vehiclesRes.data) {
        allVehicles = [
          ...allVehicles,
          ...vehiclesRes.data.map((v) => ({ ...v, type: "vehicle" })),
        ];
      }
      if (trailersRes.data) {
        allVehicles = [
          ...allVehicles,
          ...trailersRes.data.map((t) => ({
            ...t,
            model: "Reboque",
            type: "trailer",
          })),
        ];
      }

      // Sort alphabetically by plate
      allVehicles.sort((a, b) => a.plate.localeCompare(b.plate));

      setVehicles(allVehicles);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (infraction = null) => {
    if (infraction) {
      setFormData({
        ...infraction,
        infraction_date: infraction.infraction_date
          ? new Date(
              new Date(infraction.infraction_date).getTime() -
                new Date().getTimezoneOffset() * 60000,
            )
              .toISOString()
              .slice(0, 16)
          : "",
        installments: (infraction.installments || []).filter((i: any) => !i.isNIC),
        nic_amount: (infraction.installments || []).find((i: any) => i.isNIC)?.amount || "",
        nic_date: (infraction.installments || []).find((i: any) => i.isNIC)?.date || "",
      });
    } else {
      setFormData({
        driver_id: "",
        infraction_date: "",
        amount: "",
        infraction_code: "",
        description: "",
        notice_number: "",
        license_plate: "",
        address: "",
        installments: [{ date: "", amount: "" }],
        discounted_amount: "",
        attachment_url: "",
        nic_amount: "",
        nic_date: "",
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormData(null);
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const code = e.target.value;
    setFormData((prev: any) => {
      const newData = { ...prev, infraction_code: code };
      const desc = getInfractionDescription(code);
      if (desc !== "Outra infração") {
        newData.description = desc;
      }
      return newData;
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      let attachmentUrl = formData.attachment_url || null;

      if (formData.attachment_file) {
        const fileExt =
          formData.attachment_file.name &&
          formData.attachment_file.name.includes(".")
            ? formData.attachment_file.name.split(".").pop()
            : "pdf";
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${user?.id || "company"}/${Date.now()}_${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("checklist-photos")
          .upload(filePath, formData.attachment_file);

        if (uploadError) throw uploadError;

        attachmentUrl = supabase.storage
          .from("checklist-photos")
          .getPublicUrl(filePath).data.publicUrl;
      }

      const finalInstallments = [...(formData.installments || [])];
      if (formData.nic_amount) {
        finalInstallments.push({
          isNIC: true,
          amount: formData.nic_amount,
          date: formData.nic_date || "",
        });
      }

      const payload = {
        company_id: user?.company_id,
        driver_id: formData.driver_id,
        amount: Number(formData.amount),
        discounted_amount: formData.discounted_amount
          ? Number(formData.discounted_amount)
          : null,
        infraction_date: new Date(formData.infraction_date).toISOString(),
        infraction_code: formData.infraction_code,
        description: formData.description,
        notice_number: formData.notice_number || null,
        license_plate: formData.license_plate || null,
        address: formData.address || null,
        installments: finalInstallments,
        attachment_url: attachmentUrl,
        created_by: user?.id,
      };

      if (formData.id) {
        const { error } = await supabase
          .from("traffic_infractions")
          .update(payload)
          .eq("id", formData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("traffic_infractions")
          .insert(payload);
        if (error) throw error;
      }

      fetchData();
      handleCloseModal();
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar a infração.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Deseja realmente excluir esta infração?")) return;
    try {
      await supabase.from("traffic_infractions").delete().eq("id", id);
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Erro ao excluir.");
    }
  };

  const filteredInfractions = infractions.filter((inf) => {
    const term = searchTerm.toLowerCase();
    return (
      inf.profiles?.full_name?.toLowerCase().includes(term) ||
      inf.notice_number?.toLowerCase().includes(term) ||
      inf.infraction_code?.toLowerCase().includes(term)
    );
  });

  if (loading) {
    return (
      <div className="p-8 text-center text-zinc-500">
        Carregando infrações...
      </div>
    );
  }

  if (setupRequired) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-8 text-center">
          <div className="w-16 h-16 bg-red-100 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldAlert size={32} />
          </div>
          <h3 className="text-xl font-bold text-zinc-800 mb-2">
            Atualização de Banco de Dados Necessária
          </h3>
          <p className="text-sm text-zinc-500 mb-6">
            Para utilizar os novos recursos (Placa do Veículo e Desconto), é
            necessário atualizar as tabelas de infrações no banco de dados. Por
            favor, contate o administrador do sistema ou atualize o banco (no
            Supabase) e tente novamente.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-2 bg-zinc-900 text-white rounded-lg font-medium hover:bg-zinc-800 transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-800 flex items-center gap-2">
            <ShieldAlert className="text-red-500" />
            Infrações de Trânsito
          </h2>
          <p className="text-zinc-500">
            Gestão de multas e descontos de motoristas
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2 shadow-sm"
        >
          <Plus size={20} />
          Lançar Infração
        </button>
      </div>

      <div className="flex border-b border-zinc-200">
        <button
          onClick={() => setActiveTab("list")}
          className={`px-4 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "list"
              ? "border-red-500 text-red-600"
              : "border-transparent text-zinc-500 hover:text-zinc-700"
          }`}
        >
          <List size={18} />
          Lista de Infrações
        </button>
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`px-4 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "dashboard"
              ? "border-red-500 text-red-600"
              : "border-transparent text-zinc-500 hover:text-zinc-700"
          }`}
        >
          <LayoutDashboard size={18} />
          Dashboard Geral
        </button>
        <button
          onClick={() => setActiveTab("drivers")}
          className={`px-4 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "drivers"
              ? "border-red-500 text-red-600"
              : "border-transparent text-zinc-500 hover:text-zinc-700"
          }`}
        >
          <User size={18} />
          Por Motorista
        </button>
      </div>

      {activeTab === "dashboard" ? (
        <DashboardView infractions={infractions} />
      ) : activeTab === "drivers" ? (
        <DriversDashboardView infractions={infractions} drivers={drivers} />
      ) : (
        <>
          {/* Search & Filters */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-zinc-200">
            <div className="relative max-w-md">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                size={20}
              />
              <input
                type="text"
                placeholder="Buscar por motorista, código ou auto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
              />
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 text-xs uppercase tracking-wider">
                    <th className="px-6 py-4 font-medium">Motorista</th>
                    <th className="px-6 py-4 font-medium">Data / Local</th>
                    <th className="px-6 py-4 font-medium">Infração</th>
                    <th className="px-6 py-4 font-medium">Valores</th>
                    <th className="px-6 py-4 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {filteredInfractions.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-8 text-center text-zinc-500"
                      >
                        Nenhuma infração encontrada.
                      </td>
                    </tr>
                  ) : (
                    filteredInfractions.map((inf) => (
                      <tr
                        key={inf.id}
                        className="hover:bg-zinc-50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold">
                              {inf.profiles?.full_name?.charAt(0)}
                            </div>
                            <div className="font-medium text-zinc-900">
                              {inf.profiles?.full_name}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-zinc-900">
                            {new Date(inf.infraction_date).toLocaleDateString(
                              "pt-BR",
                            )}{" "}
                            às{" "}
                            {new Date(inf.infraction_date).toLocaleTimeString(
                              "pt-BR",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </div>
                          <div className="text-xs text-zinc-500 flex items-center gap-1 mt-1">
                            <MapPin size={12} />
                            {inf.address || "Não informado"}
                          </div>
                          {inf.license_plate && (
                            <div className="text-xs font-mono font-medium text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded inline-block mt-1">
                              Placa: {inf.license_plate}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-bold text-zinc-900">
                            Cód: {inf.infraction_code}
                          </div>
                          <div
                            className="text-xs text-zinc-500 line-clamp-2 max-w-xs mt-1"
                            title={inf.description}
                          >
                            {inf.description}
                          </div>
                          {inf.notice_number && (
                            <div className="text-xs font-mono bg-zinc-100 text-zinc-600 px-2 py-1 rounded inline-block mt-2 border border-zinc-200">
                              Auto: {inf.notice_number}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-bold text-zinc-900">
                            {new Intl.NumberFormat("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            }).format((Number(inf.amount) || 0) + (inf.installments?.find((i: any) => i.isNIC)?.amount ? Number(inf.installments.find((i: any) => i.isNIC).amount) : 0))}
                          </div>
                          {inf.installments?.find((i: any) => i.isNIC) && (
                            <div className="text-[10px] text-orange-600 font-medium mt-0.5">
                              (+ NIC)
                            </div>
                          )}
                          {inf.discounted_amount != null && (
                            <div className="text-xs font-semibold text-emerald-600 mt-1">
                              Desconto:{" "}
                              {new Intl.NumberFormat("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              }).format(inf.discounted_amount)}
                            </div>
                          )}
                          {inf.installments && inf.installments.length > 0 && (
                            <div className="mt-2 space-y-1">
                              <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">
                                Parcelas / Descontos:
                              </div>
                              {inf.installments.map(
                                (inst: any, idx: number) => (
                                  <div
                                    key={idx}
                                    className={`text-xs flex justify-between px-2 py-1 rounded ${inst.isNIC ? "bg-orange-50 text-orange-700" : "bg-zinc-50 text-zinc-500"}`}
                                  >
                                    <span>
                                      {inst.isNIC ? "NIC" : ""}
                                      {inst.isNIC && inst.date ? " (" : ""}
                                      {inst.date
                                        ? new Date(
                                            inst.date,
                                          ).toLocaleDateString("pt-BR", {
                                            timeZone: "UTC",
                                          })
                                        : !inst.isNIC ? "Sem data" : ""}
                                      {inst.isNIC && inst.date ? ")" : ""}
                                    </span>
                                    <span className={`font-medium ${inst.isNIC ? "text-orange-800" : "text-zinc-700"}`}>
                                      {new Intl.NumberFormat("pt-BR", {
                                        style: "currency",
                                        currency: "BRL",
                                      }).format(Number(inst.amount) || 0)}
                                    </span>
                                  </div>
                                ),
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                                                        {inf.attachment_url && (
                              <button
                                onClick={() => setSelectedAttachment(inf.attachment_url)}
                                className="p-2 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="Ver Anexos"
                              >
                                <Eye size={18} />
                              </button>
                            )}
                            <button
                              onClick={() => setPrintInfraction(inf)}
                              className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
                              title="Imprimir Termo"
                            >
                              <Printer size={18} />
                            </button>
                            <button
                              onClick={() => handleOpenModal(inf)}
                              className="p-2 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(inf.id)}
                              className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Excluir"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Modal Lançar Infração */}
      <AnimatePresence>
        {isModalOpen && formData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-zinc-100 p-6 flex justify-between items-center z-10">
                <h3 className="text-xl font-bold text-zinc-800 flex items-center gap-2">
                  <ShieldAlert className="text-red-500" />
                  {formData.id ? "Editar Infração" : "Lançar Infração"}
                </h3>
                <button
                  onClick={handleCloseModal}
                  className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Motorista */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-zinc-700 mb-1">
                      Motorista Infrator <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.driver_id}
                      onChange={(e) =>
                        setFormData({ ...formData, driver_id: e.target.value })
                      }
                      className="w-full px-4 py-2 bg-zinc-50 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    >
                      <option value="">Selecione o motorista...</option>
                      {drivers.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.full_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Código e Auto */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">
                      Código da Infração <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder="Ex: 7455"
                        value={formData.infraction_code}
                        onChange={handleCodeChange}
                        className="w-full pr-12 pl-4 py-2 bg-zinc-50 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      />
                      <button
                        type="button"
                        onClick={() => setIsCodeSelectorOpen(true)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-200 rounded-lg transition-colors"
                        title="Buscar código"
                      >
                        <Search size={18} />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">
                      Nº do Auto de Infração
                    </label>
                    <div className="relative">
                      <Receipt
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                        size={18}
                      />
                      <input
                        type="text"
                        value={formData.notice_number || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            notice_number: e.target.value,
                          })
                        }
                        className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                  </div>

                  {/* Descrição */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-zinc-700 mb-1">
                      Descrição da Infração{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={2}
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      placeholder="Descrição preenchida automaticamente pelo código..."
                      className="w-full px-4 py-2 bg-zinc-50 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>

                  {/* Data da infração e Valores */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">
                      Data e Hora da Infração{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.infraction_date || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          infraction_date: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 bg-zinc-50 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">
                      Veículo (Placa)
                    </label>
                    <select
                      value={formData.license_plate || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          license_plate: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 bg-zinc-50 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    >
                      <option value="">Selecione o veículo...</option>
                      {vehicles.map((v) => (
                        <option key={v.id} value={v.plate}>
                          {v.plate} - {v.model}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">
                      Valor Original da Multa (R$){" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.amount}
                      onChange={(e) =>
                        setFormData({ ...formData, amount: e.target.value })
                      }
                      className="w-full px-4 py-2 bg-zinc-50 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">
                      Valor com Desconto (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.discounted_amount || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          discounted_amount: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 bg-zinc-50 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>

                  {/* NIC (Não Indicação do Condutor) */}
                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-orange-50/50 border border-orange-100 rounded-xl">
                    <div>
                      <label className="block text-sm font-medium text-orange-800 mb-1">
                        Valor NIC (R$)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.nic_amount || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            nic_amount: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 bg-white border border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 placeholder:text-orange-300"
                        placeholder="Ex: 130.16"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-orange-800 mb-1">
                        Data Vencimento NIC
                      </label>
                      <input
                        type="date"
                        value={formData.nic_date || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            nic_date: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 bg-white border border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-orange-800"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-zinc-700">
                        Datas e Valores de Desconto (Parcelamento)
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            installments: [
                              ...(formData.installments || []),
                              { date: "", amount: "" },
                            ],
                          })
                        }
                        className="text-xs text-red-600 font-medium hover:text-red-700 flex items-center gap-1 bg-red-50 px-2 py-1 rounded-lg"
                      >
                        <Plus size={14} /> Adicionar Parcela
                      </button>
                    </div>

                    <div className="space-y-3">
                      {(formData.installments || []).map(
                        (inst: any, index: number) => (
                          <div
                            key={index}
                            className="flex items-center gap-3 bg-zinc-50 p-3 rounded-xl border border-zinc-200"
                          >
                            <div className="flex-1">
                              <label className="block text-xs text-zinc-500 mb-1">
                                Data
                              </label>
                              <input
                                type="date"
                                value={inst.date}
                                onChange={(e) => {
                                  const newInst = [...formData.installments];
                                  newInst[index].date = e.target.value;
                                  setFormData({
                                    ...formData,
                                    installments: newInst,
                                  });
                                }}
                                className="w-full px-3 py-1.5 bg-white border border-zinc-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
                              />
                            </div>
                            <div className="flex-1">
                              <label className="block text-xs text-zinc-500 mb-1">
                                Valor (R$)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={inst.amount}
                                onChange={(e) => {
                                  const newInst = [...formData.installments];
                                  newInst[index].amount = e.target.value;
                                  setFormData({
                                    ...formData,
                                    installments: newInst,
                                  });
                                }}
                                className="w-full px-3 py-1.5 bg-white border border-zinc-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const newInst = [...formData.installments];
                                newInst.splice(index, 1);
                                setFormData({
                                  ...formData,
                                  installments: newInst,
                                });
                              }}
                              className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg mt-5"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ),
                      )}
                      {(!formData.installments ||
                        formData.installments.length === 0) && (
                        <div className="text-sm text-zinc-500 italic p-3 text-center border border-dashed border-zinc-300 rounded-xl">
                          Nenhuma data de desconto adicionada.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Endereço */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-zinc-700 mb-1">
                      Endereço / Local da Infração
                    </label>
                    <div className="relative">
                      <MapPin
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                        size={18}
                      />
                      <input
                        type="text"
                        value={formData.address || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, address: e.target.value })
                        }
                        className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                  </div>

                  {/* Anexo - simplificado para URL para não complexificar com bucket caso não haja setup */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-zinc-700 mb-1">
                      Termo Assinado (Anexo PDF ou Imagem)
                    </label>
                    <div className="relative">
                      <UploadCloud
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                        size={18}
                      />
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            attachment_file: e.target.files
                              ? e.target.files[0]
                              : null,
                          })
                        }
                        className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                    {formData.attachment_url && (
                      <div className="mt-2 text-sm text-zinc-500 flex items-center gap-2">
                        <FileText size={16} />
                        <a
                          href={formData.attachment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          Visualizar anexo atual
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-6 py-2 border border-zinc-300 text-zinc-700 rounded-xl font-medium hover:bg-zinc-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    <Save size={20} />
                    {saving ? "Salvando..." : "Salvar Infração"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {isCodeSelectorOpen && (
        <InfractionCodeSelector
          onClose={() => setIsCodeSelectorOpen(false)}
          onSelect={(code, desc) => {
            setFormData((prev: any) => ({
              ...prev,
              infraction_code: code,
              description: desc,
            }));
            setIsCodeSelectorOpen(false);
          }}
        />
      )}

      <InfractionPrintModal
        infraction={printInfraction}
        onClose={() => setPrintInfraction(null)}
      />
    </div>
  );
}
