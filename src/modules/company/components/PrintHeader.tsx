import React, { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/modules/shared/contexts/AuthContext";

export default function PrintHeader() {
  const { user } = useAuth();
  const [company, setCompany] = useState<{
    name: string;
    document: string;
    address: string;
    phone: string;
    logo_url: string;
  } | null>(null);

  useEffect(() => {
    const fetchCompanyData = async () => {
      try {
        let companyId = user?.company_id;

        if (!companyId) {
          const { data: firstComp } = await supabase
            .from("companies")
            .select("*")
            .limit(1)
            .maybeSingle();
          if (firstComp) {
            companyId = firstComp.id;
          }
        }

        if (companyId) {
          const { data, error } = await supabase
            .from("companies")
            .select("*")
            .eq("id", companyId)
            .single();

          if (!error && data) {
            setCompany({
              name: data.name || "",
              document: data.document || "",
              address: data.address || "",
              phone: data.phone || "",
              logo_url: data.logo_url || "",
            });
          }
        }
      } catch (err) {
        console.error("Erro ao carregar dados da empresa no cabeçalho de impressão:", err);
      }
    };

    fetchCompanyData();
  }, [user]);

  if (!company) return null;

  return (
    <div className="hidden print:flex items-center justify-between border-b-2 border-zinc-300 pb-4 mb-6 w-full text-zinc-800">
      <div className="flex items-center gap-4">
        {company.logo_url ? (
          <img
            src={company.logo_url}
            alt={company.name}
            className="w-16 h-16 object-contain rounded"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-16 h-16 bg-zinc-100 rounded flex items-center justify-center border border-zinc-200">
            <span className="text-[10px] font-black text-zinc-400">LOGO</span>
          </div>
        )}
        <div>
          <h2 className="text-sm font-black tracking-tight text-zinc-950 uppercase">
            {company.name || "Empresa"}
          </h2>
          {company.document && (
            <p className="text-[10px] font-bold text-zinc-500 mt-0.5">
              CNPJ: {company.document}
            </p>
          )}
        </div>
      </div>
      <div className="text-right text-[10px] font-bold text-zinc-500 max-w-[350px]">
        {company.address && (
          <p className="leading-tight mb-1">
            {company.address}
          </p>
        )}
        {company.phone && (
          <p>
            Contato: {company.phone}
          </p>
        )}
      </div>
    </div>
  );
}
