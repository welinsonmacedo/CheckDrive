import React, { useState } from "react";
import { usePersistentState } from "@/src/hooks/usePersistentState";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { FileText, BarChart3, TrendingUp, Layers, CheckSquare } from "lucide-react";
import ReportsOperationalView from "./reports/ReportsOperationalView";
import ReportsBiView from "./reports/ReportsBiView";

export default function ReportsTab() {
  const [mainTab, setMainTab] = usePersistentState<"reports" | "bi">(
    "checkdrive_reports_main_tab",
    "reports",
  );

  const [startDate, setStartDate] = usePersistentState(
    "reports_startDate",
    format(startOfMonth(new Date()), "yyyy-MM-dd"),
  );

  const [endDate, setEndDate] = usePersistentState(
    "reports_endDate",
    format(endOfMonth(new Date()), "yyyy-MM-dd"),
  );

  const handleDateChange = (newStart: string, newEnd: string) => {
    setStartDate(newStart);
    setEndDate(newEnd);
  };

  return (
    <div className="space-y-6">
      {/* Top Level Section Header & Area Selector */}
      <div className="bg-white p-4.5 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-blue-600 text-white rounded-2xl shadow-sm">
            <BarChart3 size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-wider border border-indigo-100">
                Central Analítica
              </span>
            </div>
            <h1 className="text-lg font-black text-gray-900 tracking-tight mt-0.5">
              Relatórios e Business Intelligence
            </h1>
          </div>
        </div>

        {/* Master Navigation Switcher */}
        <div className="flex p-1 bg-gray-100/80 border border-gray-200/80 rounded-xl space-x-1 shrink-0 self-start md:self-auto">
          <button
            onClick={() => setMainTab("reports")}
            className={`px-5 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              mainTab === "reports"
                ? "bg-white text-indigo-600 shadow-sm border border-gray-200/40"
                : "text-gray-550 hover:text-gray-800 hover:bg-gray-200/50"
            }`}
          >
            <FileText size={15} className="stroke-[2.2]" />
            <span>Relatórios</span>
          </button>

          <button
            onClick={() => setMainTab("bi")}
            className={`px-5 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              mainTab === "bi"
                ? "bg-white text-indigo-600 shadow-sm border border-gray-200/40"
                : "text-gray-550 hover:text-gray-800 hover:bg-gray-200/50"
            }`}
          >
            <TrendingUp size={15} className="stroke-[2.2]" />
            <span>Business Intelligence (BI)</span>
          </button>
        </div>
      </div>

      {/* Main Tab Content Display */}
      {mainTab === "reports" ? (
        <ReportsOperationalView />
      ) : (
        <ReportsBiView
          startDate={startDate}
          endDate={endDate}
          onDateChange={handleDateChange}
        />
      )}
    </div>
  );
}
