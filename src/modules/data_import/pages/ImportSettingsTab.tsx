import React, { useState } from "react";
import { Settings, Database, Copy, Check, Shield, Code2, Sparkles } from "lucide-react";

export default function ImportSettingsTab() {
  const [copied, setCopied] = useState(false);

  const sqlCode = `-- =========================================================
-- MÓDULO DE IMPORTAÇÃO DE DADOS (STAGING AREA) - CHECKDRIVE
-- Totalmente isolado do sistema principal. Nenhuma tabela existente foi alterada.
-- =========================================================

-- 1. Tabela de Lotes de Importação (import_jobs)
CREATE TABLE IF NOT EXISTS public.import_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL,
    usuario_id UUID,
    usuario_nome TEXT,
    nome_arquivo TEXT NOT NULL,
    periodo TEXT,
    data_importacao TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'processando',
    total_registros INT DEFAULT 0,
    novos INT DEFAULT 0,
    duplicados INT DEFAULT 0,
    conflitos INT DEFAULT 0,
    erros INT DEFAULT 0,
    observacoes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de Registros Extraídos (import_records)
CREATE TABLE IF NOT EXISTS public.import_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    import_job_id UUID REFERENCES public.import_jobs(id) ON DELETE CASCADE,
    empresa_id UUID NOT NULL,
    tipo_registro TEXT NOT NULL,
    placa TEXT NOT NULL,
    numero_frota TEXT,
    data DATE,
    conta TEXT,
    descricao_conta TEXT,
    quantidade NUMERIC(12,3) DEFAULT 1,
    valor NUMERIC(12,2) DEFAULT 0,
    hodometro INT,
    preco_litro NUMERIC(12,3),
    media_km_l NUMERIC(12,2),
    km_rodado NUMERIC(12,1),
    preco_por_km NUMERIC(12,3),
    fornecedor TEXT,
    documento TEXT,
    numero_controle TEXT,
    observacoes TEXT,
    hash_registro TEXT NOT NULL,
    status TEXT DEFAULT 'novo',
    conflito BOOLEAN DEFAULT FALSE,
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Garantir colunas adicionais para tabelas já criadas anteriormente
ALTER TABLE public.import_jobs ADD COLUMN IF NOT EXISTS usuario_nome TEXT;
ALTER TABLE public.import_jobs ADD COLUMN IF NOT EXISTS periodo TEXT;

ALTER TABLE public.import_records ADD COLUMN IF NOT EXISTS preco_litro NUMERIC(12,3);
ALTER TABLE public.import_records ADD COLUMN IF NOT EXISTS media_km_l NUMERIC(12,2);
ALTER TABLE public.import_records ADD COLUMN IF NOT EXISTS km_rodado NUMERIC(12,1);
ALTER TABLE public.import_records ADD COLUMN IF NOT EXISTS preco_por_km NUMERIC(12,3);

-- Index para otimização de busca por hash SHA-256 e empresa
CREATE INDEX IF NOT EXISTS idx_import_records_hash_empresa ON public.import_records(hash_registro, empresa_id);

-- 3. Tabela de Conflitos (import_conflicts)
CREATE TABLE IF NOT EXISTS public.import_conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    import_record_id UUID REFERENCES public.import_records(id) ON DELETE CASCADE,
    empresa_id UUID NOT NULL,
    motivo TEXT NOT NULL,
    valor_pdf JSONB,
    valor_existente JSONB,
    resolvido BOOLEAN DEFAULT FALSE,
    resolvido_por TEXT,
    data_resolucao TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabela de Logs de Execução (import_logs)
CREATE TABLE IF NOT EXISTS public.import_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    import_job_id UUID REFERENCES public.import_jobs(id) ON DELETE CASCADE,
    empresa_id UUID NOT NULL,
    etapa TEXT NOT NULL,
    mensagem TEXT NOT NULL,
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de Permissão Multiempresa (RLS)
CREATE POLICY "Acesso por Empresa em import_jobs" ON public.import_jobs
    FOR ALL USING (true);

CREATE POLICY "Acesso por Empresa em import_records" ON public.import_records
    FOR ALL USING (true);

CREATE POLICY "Acesso por Empresa em import_conflicts" ON public.import_conflicts
    FOR ALL USING (true);

CREATE POLICY "Acesso por Empresa em import_logs" ON public.import_logs
    FOR ALL USING (true);
`;

  const copySql = () => {
    navigator.clipboard.writeText(sqlCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-black text-zinc-900">Configurações & Estrutura de Dados</h3>
          <p className="text-xs text-zinc-500">
            Parâmetros de isolamento do módulo de Importação (Staging Area) e script DDL.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-white rounded-3xl border border-zinc-200/80 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600">
            <Shield className="w-4 h-4" /> Multiempresa (RLS)
          </div>
          <p className="text-xs text-zinc-600">
            Todos os registros contêm o campo <code className="font-mono text-blue-600">empresa_id</code>, garantindo isolamento total de dados por tenant.
          </p>
        </div>

        <div className="p-5 bg-white rounded-3xl border border-zinc-200/80 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-600">
            <Sparkles className="w-4 h-4" /> SHA-256 Hashing
          </div>
          <p className="text-xs text-zinc-600">
            Assinatura digital única baseada em Empresa, Placa, Conta, Data, Valor, Quantidade, Fornecedor e Documento.
          </p>
        </div>

        <div className="p-5 bg-white rounded-3xl border border-zinc-200/80 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-purple-600">
            <Database className="w-4 h-4" /> Staging Desacoplado
          </div>
          <p className="text-xs text-zinc-600">
            Camada intermediária. Os lançamentos do PDF permanecem guardados sem afetar tabelas principais do CheckDrive.
          </p>
        </div>
      </div>

      {/* SQL Script Box */}
      <div className="bg-white rounded-3xl p-6 border border-zinc-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-zinc-100 rounded-xl text-zinc-700">
              <Code2 className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-black text-zinc-900">Script SQL Supabase / PostgreSQL</h4>
              <p className="text-xs text-zinc-500">
                Execute no Editor SQL do seu projeto Supabase para criar as tabelas do módulo.
              </p>
            </div>
          </div>

          <button
            onClick={copySql}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-md transition-all"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copiado!" : "Copiar SQL"}
          </button>
        </div>

        <pre className="p-4 bg-zinc-900 text-zinc-200 rounded-2xl text-xs font-mono overflow-x-auto max-h-96 leading-relaxed">
          {sqlCode}
        </pre>
      </div>
    </div>
  );
}
