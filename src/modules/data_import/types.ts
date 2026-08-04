export type RecordCategory =
  | "Combustível"
  | "Pedágio"
  | "Multa"
  | "Seguro"
  | "Manutenção"
  | "Lubrificantes"
  | "Pneus"
  | "Peças"
  | "Outros";

export type ImportJobStatus = "processando" | "concluido" | "conflito" | "erro" | "cancelado";

export type ImportRecordStatus = "novo" | "duplicado" | "conflito" | "erro";

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
