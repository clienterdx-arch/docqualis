// Tipos e metadados compartilhados do módulo de Ocorrências.
// Registros reais devem vir do Supabase por empresa_id. Não usar dados de exemplo em tela.

export type TipoRegistro = "NI" | "NC" | "EL" | "RC" | "MF";

export type StatusRegistro =
  | "AGUARDANDO_TRIAGEM"
  | "EM_TRATATIVA"
  | "APROVACAO"
  | "EFICACIA"
  | "CONCLUIDO"
  | "CANCELADO"
  | "SUSPENSO";

export type PrioridadeRegistro = "BAIXA" | "MEDIA" | "ALTA";
export type GravidadeRegistro = "LEVE" | "MEDIA" | "GRAVE";
export type OrigemRegistro = "QR_CODE" | "FORMULARIO";
export type PeriodoRegistro = "DIURNO" | "VESPERTINO" | "NOTURNO";
export type FerramentaAnalise = "ISHIKAWA" | "5PORQUES";

export interface PlanoAcaoItem {
  id: string;
  acao: string;
  responsavel: string;
  prazo: string;
  status: "PENDENTE" | "EM_ANDAMENTO" | "CONCLUIDO";
}

export interface Registro {
  id: string;
  codigo: string;
  tipo: TipoRegistro;
  status: StatusRegistro;
  prioridade: PrioridadeRegistro;
  dataRegistro: string;
  origem: OrigemRegistro;
  dataOcorrencia: string;
  periodo: PeriodoRegistro;
  anonimo: boolean;
  notificadorNome: string;
  notificadorCargo: string;
  notificadorSetor: string;
  notificadorEmail: string;
  setorOcorrencia: string;
  descricao: string;
  envolvePaciente: boolean;
  pacienteNome: string;
  pacienteAtendimento: string;
  pacienteConsequencias: string;
  acaoImediata: string;
  dataClassificacao: string;
  classificacaoNQSP: string;
  gravidade: GravidadeRegistro;
  classificacaoDesfecho: string;
  categoriaNotiVisa: string;
  numeroNotivisa: string;
  linkNotivisa: string;
  quebraAcordo: string;
  trativaSugerida: string;
  tipoAcao: string;
  unidadeResponsavel: string;
  responsavelTratativa: string;
  prazoTratativa: string;
  ferramentasAnalise: FerramentaAnalise[];
  planoAcao: PlanoAcaoItem[];
  justificativaRecusa?: string;
  historico: { id: string; data: string; autor: string; acao: string; obs?: string }[];
}

export const TIPO_CONFIG: Record<TipoRegistro, { label: string; cor: string; bg: string; border: string; abrev: string }> = {
  NI: { label: "Notificação de Incidente", cor: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200", abrev: "Incidente" },
  NC: { label: "Não Conformidade", cor: "text-violet-700", bg: "bg-violet-50", border: "border-violet-200", abrev: "Não Conformidade" },
  EL: { label: "Elogio", cor: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", abrev: "Elogio" },
  RC: { label: "Reclamação", cor: "text-rose-700", bg: "bg-rose-50", border: "border-rose-200", abrev: "Reclamação" },
  MF: { label: "Manifestação", cor: "text-sky-700", bg: "bg-sky-50", border: "border-sky-200", abrev: "Manifestação" },
};

export const STATUS_CONFIG: Record<StatusRegistro, { label: string; cls: string }> = {
  AGUARDANDO_TRIAGEM: { label: "Aguardando Triagem", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  EM_TRATATIVA: { label: "Em Tratativa", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  APROVACAO: { label: "Em Aprovação", cls: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  EFICACIA: { label: "Aval. Eficácia", cls: "bg-purple-50 text-purple-700 border-purple-200" },
  CONCLUIDO: { label: "Concluído", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  CANCELADO: { label: "Cancelado", cls: "bg-slate-100 text-slate-500 border-slate-200" },
  SUSPENSO: { label: "Suspenso", cls: "bg-yellow-50 text-yellow-700 border-yellow-200" },
};

export const SETORES = [
  "Selecione um setor",
  "Gestão da Qualidade",
  "Diretoria Executiva",
];

export const USUARIOS = [
  "Responsável da Qualidade",
  "Gestor responsável",
];
