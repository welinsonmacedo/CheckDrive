import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Car,
  User,
  Wrench,
  Package,
  FileText,
  Loader2,
  Calendar,
} from "lucide-react";
import { supabase } from "@/src/lib/supabase";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "@/src/modules/shared/contexts/AuthContext";

export function GlobalSearch({
  onNavigate,
}: {
  onNavigate: (tab: string) => void;
}) {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<
    {
      type: string;
      id: string;
      title: string;
      subtitle: string;
      icon: any;
      tab: string;
    }[]
  >([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length >= 2) {
        performSearch();
      } else {
        setResults([]);
        setIsOpen(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  const performSearch = async () => {
    if (!user) return;
    setLoading(true);
    setIsOpen(true);

    try {
      // Fetch company_id
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();
      const companyId = profile?.company_id;

      if (!companyId) {
        setResults([]);
        setLoading(false);
        return;
      }

      const searchResults: any[] = [];
      const term = `%${query}%`;

      const isAdmin = user.role === "admin" || user.role === "superadmin";

      // Search Vehicles (only if admin)
      if (isAdmin) {
        const { data: vehicles } = await supabase
          .from("vehicles")
          .select("id, plate, model")
          .eq("company_id", companyId)
          .or(`plate.ilike.${term},model.ilike.${term}`)
          .limit(3);

        if (vehicles) {
          vehicles.forEach((v) => {
            searchResults.push({
              type: "Veículo",
              id: v.id,
              title: v.plate,
              subtitle: v.model || "Sem modelo",
              icon: <Car size={16} />,
              tab: "vehicles",
            });
          });
        }

        // Search Drivers
        const { data: drivers } = await supabase
          .from("drivers")
          .select("id, name, cpf")
          .eq("company_id", companyId)
          .or(`name.ilike.${term},cpf.ilike.${term}`)
          .limit(3);

        if (drivers) {
          drivers.forEach((d) => {
            searchResults.push({
              type: "Motorista",
              id: d.id,
              title: d.name,
              subtitle: d.cpf || "",
              icon: <User size={16} />,
              tab: "drivers",
            });
          });
        }
      }

      // Search Inventory
      const { data: inventory } = await supabase
        .from("inventory_items")
        .select("id, name, sku")
        .eq("company_id", companyId)
        .or(`name.ilike.${term},sku.ilike.${term}`)
        .limit(3);

      if (inventory) {
        inventory.forEach((i) => {
          searchResults.push({
            type: "Estoque",
            id: i.id,
            title: i.name,
            subtitle: i.sku ? `SKU: ${i.sku}` : "Item de estoque",
            icon: <Package size={16} />,
            tab: "inventory",
          });
        });
      }

      // Search Maintenance
      const { data: maintenance } = await supabase
        .from("checklist_issues")
        .select("id, item_title, status, resolved_by")
        .eq("company_id", companyId)
        .ilike("item_title", term)
        .limit(3);

      if (maintenance) {
        maintenance.forEach((m) => {
          let status = m.status;
          if (status === "resolved" && !m.resolved_by) {
            status = "pending";
          }
          searchResults.push({
            type: "Pendência",
            id: m.id,
            title: m.item_title,
            subtitle: status === "resolved" ? "Resolvido" : "Pendente",
            icon: <Wrench size={16} />,
            tab: "maintenance",
          });
        });
      }

      setResults(searchResults);
    } catch (error) {
      console.error("Busca global falhou:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleResultClick = (tab: string) => {
    setIsOpen(false);
    setQuery("");
    onNavigate(tab);
  };

  return (
    <div
      className="relative flex-1 max-w-md hidden md:flex items-center px-4 py-2 bg-gray-100 rounded-xl border border-gray-200/50 focus-within:ring-2 focus-within:ring-primary/20 focus-within:bg-white transition-all shadow-sm"
      ref={dropdownRef}
    >
      <Search size={18} className="text-gray-400 mr-2" />
      <input
        type="text"
        placeholder="Buscar veículos, motoristas, peças..."
        className="bg-transparent border-none outline-none w-full text-sm text-gray-700 placeholder:text-gray-400"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => {
          if (results.length > 0) setIsOpen(true);
        }}
      />
      {loading && (
        <Loader2 size={16} className="animate-spin text-gray-400 ml-2" />
      )}

      <AnimatePresence>
        {isOpen && query.length >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute top-14 left-0 w-full bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50"
          >
            {results.length > 0 ? (
              <div className="max-h-80 overflow-y-auto">
                <div className="p-2">
                  {results.map((result, idx) => (
                    <div
                      key={`${result.type}-${result.id}-${idx}`}
                      onClick={() => handleResultClick(result.tab)}
                      className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                    >
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
                        {result.icon}
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-gray-800">
                          {result.title}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span className="font-semibold text-primary">
                            {result.type}
                          </span>
                          <span>•</span>
                          <span>{result.subtitle}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              !loading && (
                <div className="p-6 text-center text-gray-500 text-sm">
                  Nenhum resultado encontrado para "{query}".
                </div>
              )
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
