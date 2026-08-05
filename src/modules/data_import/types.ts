export type RecordCategory =
  | "Combustível"
  | "Gasolina"
  | "Gasolina Administrativo"
  | "Diesel"
  | "Diesel Terceiro"
  | "Arla"
  | "Arla Estoque"
  | "Estoque"
  | "Lava-jato"
  | "Pneus Novos"
  | "Recapagem"
  | "Pneus"
  | "Rastreamento"
  | "Freios"
  | "Elétrica"
  | "Pedágio"
  | "Multa"
  | "Seguro"
  | "Manutenção"
  | "Lubrificantes"
  | "Peças"
  | "Outros";

export type ImportJobStatus = "processando" | "concluido" | "conflito" | "erro" | "cancelado" | "aprovado";

export type ImportRecordStatus = "novo" | "duplicado" | "conflito" | "erro" | "aprovado";

export interface ImportJob {
  id: string;
  empresa_id: string;
  usuario_id?: string;
  usuario_nome?: string;
  nome_arquivo: string;
  periodo?: string;
  data_importacao: string;
  status: ImportJobStatus;
  total_registros: number;
  novos: number;
  duplicados: number;
  conflitos: number;
  erros: number;
  observacoes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ImportRecord {
  id: string;
  import_job_id: string;
  empresa_id: string;
  tipo_registro: RecordCategory;
  placa: string;
  numero_frota?: string;
  data: string;
  conta: string;
  descricao_conta: string;
  quantidade: number;
  valor: number;
  hodometro?: number;
  preco_litro?: number;
  media_km_l?: number;
  km_rodado?: number;
  preco_por_km?: number;
  fornecedor?: string;
  documento?: string;
  numero_controle?: string;
  observacoes?: string;
  hash_registro: string;
  status: ImportRecordStatus;
  conflito: boolean;
  criado_em?: string;
}

export interface ImportConflict {
  id: string;
  import_record_id: string;
  empresa_id: string;
  motivo: string;
  valor_pdf: Partial<ImportRecord>;
  valor_existente: Partial<ImportRecord>;
  resolvido: boolean;
  resolvido_por?: string;
  data_resolucao?: string;
  created_at?: string;
}

export interface ImportLog {
  id: string;
  import_job_id: string;
  empresa_id: string;
  etapa: string; // 'Upload' | 'Leitura' | 'Parser' | 'Validação' | 'Hash' | 'Duplicidade' | 'Importação' | 'Conclusão' | 'Falha'
  mensagem: string;
  criado_em: string;
}

export interface ImportFilterOptions {
  categories: RecordCategory[]; // e.g. ["Combustível", "Pedágio", ...]
  minAmount?: number;
  startDate?: string;
  endDate?: string;
}

export interface ReportMold {
  id: string;
  empresa_id: string;
  nome: string;
  descricao?: string;
  icon?: string;
  categoria_filtro?: string;
  periodo_dias?: number; // 0 for all time, 30, 60, 90, 365
  placa_filtro?: string;
  fornecedor_filtro?: string;
  agrupar_por: "categoria" | "placa" | "fornecedor" | "mes" | "status";
  metrica: "soma_valor" | "quantidade" | "media_valor" | "soma_quantidade";
  tipo_grafico: "bar" | "pie" | "line" | "area" | "table";
  e_padrao?: boolean;
  created_at?: string;
}

