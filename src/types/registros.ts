export type RegistryFieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "time"
  | "currency"
  | "percent"
  | "select"
  | "multi_select"
  | "likert"
  | "matrix"
  | "file"
  | "photo"
  | "signature"
  | "geo"
  | "qr"
  | "audio"
  | "ocr";

export type RegistryTemplateStatus = "RASCUNHO" | "PUBLICADO" | "REVISAO" | "OBSOLETO";

export type RegistryRecordStatus =
  | "RASCUNHO"
  | "ENVIADO"
  | "EM_VERIFICACAO"
  | "EM_APROVACAO"
  | "APROVADO"
  | "REJEITADO"
  | "AJUSTE_SOLICITADO"
  | "CANCELADO";

export type RegistryPillar =
  | "builder"
  | "workflow"
  | "verdade"
  | "inteligencia"
  | "analytics"
  | "campo"
  | "governanca"
  | "integracoes"
  | "exportacao"
  | "realtime"
  | "observabilidade";

export interface RegistryField {
  id: string;
  type: RegistryFieldType;
  label: string;
  required: boolean;
  options?: string[];
  helpText?: string;
  piiCategory?: "none" | "personal" | "sensitive";
  riskWeight?: number;
}

export interface RegistryWorkflowStep {
  id: string;
  type: "task" | "exclusive_gateway" | "parallel_gateway" | "timer" | "message" | "subprocess";
  label: string;
  owner: string;
  slaHours: number;
  escalation: string;
}

export interface RegistryTemplate {
  id: string;
  empresa_id: string;
  titulo: string;
  descricao: string;
  status: RegistryTemplateStatus;
  categoria: string;
  setor: string;
  versao: string;
  campos: RegistryField[];
  workflowSteps: RegistryWorkflowStep[];
  conditionalLogic: string[];
  piiPolicy: string;
  retentionDays: number;
  created_at: string;
}

export interface RegistryRecord {
  id: string;
  empresa_id: string;
  template_id: string | null;
  numero: string;
  template_titulo: string;
  status: RegistryRecordStatus;
  preenchido_por: string;
  current_owner: string;
  submitted_at: string;
  risk_score: number;
  flag_revisao_humana: boolean;
  hash_sha256: string | null;
  total_eventos: number;
}

export interface RegistryAnalytics {
  totalTemplates: number;
  publishedTemplates: number;
  totalRecords: number;
  approvedRecords: number;
  pendingRecords: number;
  highRiskRecords: number;
  forensicCoverage: number;
}

