import React, { useState } from "react";
import { X, Search } from "lucide-react";
import { INFRACTION_CODES } from "@/src/utils/infractions";

interface InfractionCodeSelectorProps {
  onSelect: (code: string, description: string) => void;
  onClose: () => void;
}

export default function InfractionCodeSelector({
  onSelect,
  onClose,
}: InfractionCodeSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredCodes = Object.entries(INFRACTION_CODES).filter(
    ([code, desc]) =>
      code.includes(searchTerm) ||
      desc.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="px-6 py-5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
          <div>
            <h2 className="text-lg font-black text-zinc-900 tracking-tight">
              Buscar Código de Infração
            </h2>
            <p className="text-sm font-medium text-zinc-500 mt-1">
              Selecione o código correspondente à infração.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-200 rounded-full transition-colors text-zinc-500"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 border-b border-zinc-100">
          <div className="relative">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
              size={20}
            />
            <input
              type="text"
              placeholder="Buscar por código ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-zinc-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium text-zinc-800"
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {filteredCodes.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-sm">
              Nenhum código encontrado.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-1">
              {filteredCodes.map(([code, desc]) => (
                <button
                  key={code}
                  onClick={() => onSelect(code, desc)}
                  className="flex items-start gap-4 p-3 hover:bg-zinc-50 rounded-xl text-left transition-colors group border border-transparent hover:border-zinc-200"
                >
                  <span className="font-mono font-bold text-red-600 bg-red-50 px-2 py-1 rounded-lg border border-red-100 text-sm whitespace-nowrap">
                    {code}
                  </span>
                  <span className="text-sm font-medium text-zinc-700 group-hover:text-zinc-900 mt-0.5">
                    {desc}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
