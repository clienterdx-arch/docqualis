// Tipos e metadados compartilhados do modulo de Ocorrencias.
// Registros reais devem vir do Supabase por empresa_id. Nao usar dados de exemplo em tela.

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
  MF: { label: "Oportunidade de Melhoria", cor: "text-sky-700", bg: "bg-sky-50", border: "border-sky-200", abrev: "Melhoria" },
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

export type OcorrenciaModuloKey =
  | "triagem"
  | "incidentes"
  | "nao-conformidades"
  | "ouvidoria"
  | "melhoria";

export const OCORRENCIA_MODULES: Record<OcorrenciaModuloKey, {
  title: string;
  shortTitle: string;
  description: string;
  types: TipoRegistro[];
  tone: "blue" | "orange" | "violet" | "rose" | "sky";
}> = {
  triagem: {
    title: "Registro e triagem de notificações",
    shortTitle: "Triagem",
    description: "Registros aguardando avaliação da Qualidade.",
    types: ["NI", "NC", "EL", "RC", "MF"],
    tone: "blue",
  },
  incidentes: {
    title: "Notificações de Incidente",
    shortTitle: "Incidentes",
    description: "Incidentes, eventos assistenciais e notificações NQSP.",
    types: ["NI"],
    tone: "orange",
  },
  "nao-conformidades": {
    title: "Não Conformidades",
    shortTitle: "Não conformidades",
    description: "Quebras de acordo, desvios e falhas de processo.",
    types: ["NC"],
    tone: "violet",
  },
  ouvidoria: {
    title: "Ouvidoria",
    shortTitle: "Ouvidoria",
    description: "Elogios, reclamações e manifestações tratadas pela qualidade.",
    types: ["EL", "RC"],
    tone: "rose",
  },
  melhoria: {
    title: "Oportunidade de Melhoria",
    shortTitle: "Melhoria",
    description: "Ideias e oportunidades registradas para melhoria do sistema.",
    types: ["MF"],
    tone: "sky",
  },
};

export const PRIORIDADE_OPTIONS: PrioridadeRegistro[] = ["BAIXA", "MEDIA", "ALTA"];
export const GRAVIDADE_OPTIONS: GravidadeRegistro[] = ["LEVE", "MEDIA", "GRAVE"];
export const ORIGEM_OPTIONS: OrigemRegistro[] = ["QR_CODE", "FORMULARIO"];
export const PERIODO_OPTIONS: PeriodoRegistro[] = ["DIURNO", "VESPERTINO", "NOTURNO"];

export const CLASSIFICACAO_OCORRENCIA_OPTIONS = [
  "Manter classificação atual",
  "Converter para Não Conformidade",
  "Converter para Reclamação",
  "Cancelar ocorrência",
];

export const DESFECHO_INCIDENTE_OPTIONS = [
  "Circunstância de Risco",
  "Near Miss (Quase erro)",
  "Evento sem Dano",
  "Evento com Dano Leve",
  "Evento com Dano Moderado",
  "Evento com Dano Grave",
  "Evento com Dano Óbito",
  "Never Event",
];

export const CATEGORIA_NOTIVISA_OPTIONS = [
  "Acidente do paciente",
  "Broncoaspiração",
  "Evasão do paciente",
  "Extubação endotraqueal acidental",
  "Falha nas administrações de dieta",
  "Falha na administração de O2 ou gazes medicinais",
  "Falha na assistência radiológica",
  "Falha no procedimento de transplante e enxerto",
  "Falha ocorrida no laboratório clínico ou de patologia",
  "Falhas durante a assistência em saúde",
  "Falhas durante o procedimento cirúrgico",
  "Falhas envolvendo cateter venoso",
  "Falhas envolvendo sondas",
  "Falhas na documentação",
  "Falhas na identificação do paciente",
  "Falha nas atividades administrativas",
  "Falhas no cuidado e na proteção do paciente",
  "Incidente/evento adverso relacionado a diálise peritoneal",
  "Incidente/evento adverso relacionado a hemodiálise",
  "Lesão por pressão",
  "Queda do paciente",
  "Queimadura do paciente",
  "Tromboembolismo venoso TEV",
];

export const TIPO_ACAO_OPTIONS = [
  "Melhoria",
  "Corretiva",
  "Preventiva",
  "Não se aplica",
];

export const TEMPLATE_OCORRENCIA_PADRAO = [
  {
    tab: 1,
    title: "Dados de identificação",
    requiredFields: [
      "Código",
      "Prioridade",
      "Data do registro",
      "Origem",
      "Data da ocorrência",
      "Período",
      "Dados de identificação do notificador",
      "Setor da ocorrência",
      "Descrição da ocorrência",
      "Envolve paciente?",
    ],
  },
  {
    tab: 2,
    title: "Dados do paciente",
    requiredFields: [
      "Nome completo do paciente",
      "Nº atendimento",
      "Consequências para o paciente",
      "Ação imediata",
    ],
  },
  {
    tab: 3,
    title: "Classificação NQSP",
    requiredFields: [
      "Data da classificação",
      "Classificação da ocorrência",
      "Gravidade da ocorrência",
    ],
  },
];

export type DbRow = Record<string, unknown>;

export function isObject(value: unknown): value is DbRow {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function textValue(row: DbRow, key: string, fallback = "") {
  const value = row[key];
  return typeof value === "string" ? value : fallback;
}

export function arrayValue<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function normalizeStatusRegistro(value: string): StatusRegistro {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, "_");
  const allowed: StatusRegistro[] = [
    "AGUARDANDO_TRIAGEM",
    "EM_TRATATIVA",
    "APROVACAO",
    "EFICACIA",
    "CONCLUIDO",
    "CANCELADO",
    "SUSPENSO",
  ];
  return allowed.includes(normalized as StatusRegistro)
    ? (normalized as StatusRegistro)
    : "AGUARDANDO_TRIAGEM";
}

export function normalizeTipoRegistro(value: string): TipoRegistro {
  const normalized = value.toUpperCase();
  return normalized === "NC" || normalized === "EL" || normalized === "RC" || normalized === "MF"
    ? normalized
    : "NI";
}

export function buildEmptyRegistro(): Registro {
  return {
    id: "",
    codigo: "",
    tipo: "NI",
    status: "AGUARDANDO_TRIAGEM",
    prioridade: "MEDIA",
    dataRegistro: "",
    origem: "FORMULARIO",
    dataOcorrencia: "",
    periodo: "DIURNO",
    anonimo: false,
    notificadorNome: "",
    notificadorCargo: "",
    notificadorSetor: "",
    notificadorEmail: "",
    setorOcorrencia: "",
    descricao: "",
    envolvePaciente: false,
    pacienteNome: "",
    pacienteAtendimento: "",
    pacienteConsequencias: "",
    acaoImediata: "",
    dataClassificacao: "",
    classificacaoNQSP: "",
    gravidade: "LEVE",
    classificacaoDesfecho: "",
    categoriaNotiVisa: "",
    numeroNotivisa: "",
    linkNotivisa: "",
    quebraAcordo: "",
    trativaSugerida: "",
    tipoAcao: "",
    unidadeResponsavel: "",
    responsavelTratativa: "",
    prazoTratativa: "",
    ferramentasAnalise: [],
    planoAcao: [],
    historico: [],
  };
}

export function mapRegistroDb(row: DbRow): Registro {
  const dados = isObject(row.dados) ? row.dados : {};
  return {
    ...buildEmptyRegistro(),
    ...dados,
    id: textValue(row, "id", textValue(dados, "id")),
    codigo: textValue(row, "numero", textValue(dados, "codigo")),
    tipo: normalizeTipoRegistro(textValue(dados, "tipo")),
    status: normalizeStatusRegistro(textValue(row, "status", textValue(dados, "status"))),
    dataRegistro: textValue(row, "data_preenchimento", textValue(dados, "dataRegistro")),
    historico: arrayValue<Registro["historico"][number]>(row.historico).length
      ? arrayValue<Registro["historico"][number]>(row.historico)
      : arrayValue<Registro["historico"][number]>(dados.historico),
    planoAcao: arrayValue<PlanoAcaoItem>(dados.planoAcao),
  } as Registro;
}

export function registroDadosPayload(registro: Registro) {
  return {
    ...registro,
    id: undefined,
    codigo: registro.codigo,
  };
}
