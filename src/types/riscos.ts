export type RiskClassification = "BAIXO" | "MODERADO" | "ALTO" | "CRITICO";

export type RiskStatus =
  | "IDENTIFICADO"
  | "EM_ANALISE"
  | "AVALIADO"
  | "EM_TRATAMENTO"
  | "MONITORAMENTO"
  | "ENCERRADO"
  | "ACEITO_FORMALMENTE"
  | "TRANSFERIDO"
  | "REATIVADO";

export type RiskCategory =
  | "Operacional"
  | "Assistencial"
  | "Financeiro"
  | "Cyber"
  | "Compliance"
  | "Estrategico"
  | "Reputacional";

export type RiskDistribution = "Normal" | "LogNormal" | "Triangular" | "PERT" | "Beta" | "Poisson" | "Bernoulli";

export type RiskNodeType =
  | "RISCO"
  | "CAUSA"
  | "CONSEQUENCIA"
  | "CONTROLE"
  | "PROCESSO"
  | "ATIVO"
  | "STAKEHOLDER"
  | "REGULAMENTO"
  | "KRI"
  | "CENARIO";

export interface ErisRisk {
  id: string;
  empresa_id: string;
  codigo: string;
  titulo: string;
  descricao: string;
  causa: string;
  consequencia: string;
  categoria: RiskCategory;
  setor: string;
  responsavel: string;
  processo_vinculado: string;
  probabilidade: number;
  impacto: number;
  velocidade: number;
  nivel_risco: number;
  residual_score: number;
  classificacao: RiskClassification;
  status: RiskStatus;
  estrategia: string;
  distribuicao: RiskDistribution;
  perda_minima: number;
  perda_mais_provavel: number;
  perda_maxima: number;
  var_p95: number;
  cvar_p95: number;
  controles: number;
  kri: number;
  eventos: number;
  prazo_tratamento: string;
  data_revisao: string;
}

export interface ErisRiskNode {
  id: string;
  type: RiskNodeType;
  title: string;
  riskId?: string;
  weight: number;
}

export interface ErisRiskEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  weight: number;
}

export interface ErisControl {
  id: string;
  risco_id: string;
  titulo: string;
  tipo: "Preventivo" | "Detectivo" | "Corretivo" | "Compensatorio";
  natureza: "Manual" | "Automatico" | "Hibrido";
  framework: string;
  design_effectiveness: number;
  operating_effectiveness: number;
  status: string;
}

export interface ErisKri {
  id: string;
  risco_id: string;
  nome: string;
  valor_atual: number | null;
  limite_vermelho: number | null;
  status: "VERDE" | "AMARELO" | "VERMELHO" | "SEM_DADOS";
  forecast_30d: number | null;
  anomaly_score: number | null;
}

export interface ErisScenario {
  id: string;
  nome: string;
  tipo: "WHAT_IF" | "STRESS" | "REVERSE" | "BACKTEST";
  var_p95: number;
  cvar_p95: number;
  status: string;
}

export interface ErisAnalytics {
  total: number;
  criticos: number;
  altos: number;
  tratamento: number;
  controles: number;
  kriVermelho: number;
  varP95: number;
  cvarP95: number;
  appetiteBreaches: number;
}

