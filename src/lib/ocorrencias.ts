// Tipos e dados compartilhados do módulo de Ocorrências

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
  // ABA 1
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
  // ABA 2
  pacienteNome: string;
  pacienteAtendimento: string;
  pacienteConsequencias: string;
  acaoImediata: string;
  // ABA 3
  dataClassificacao: string;
  classificacaoNQSP: string;
  gravidade: GravidadeRegistro;
  // ABA 4 NI (Notivisa)
  classificacaoDesfecho: string;
  categoriaNotiVisa: string;
  numeroNotivisa: string;
  linkNotivisa: string;
  // ABA 4 NC
  quebraAcordo: string;
  // ABA 5 NI / ABA 4 NC — Tratativa
  trativaSugerida: string;
  tipoAcao: string;
  unidadeResponsavel: string;
  responsavelTratativa: string;
  prazoTratativa: string;
  // Ferramentas de análise & Plano de ação
  ferramentasAnalise: FerramentaAnalise[];
  planoAcao: PlanoAcaoItem[];
  // Meta
  justificativaRecusa?: string;
  historico: { id: string; data: string; autor: string; acao: string; obs?: string }[];
}

export const TIPO_CONFIG: Record<TipoRegistro, { label: string; cor: string; bg: string; border: string; abrev: string }> = {
  NI: { label: "Notif. de Incidente",  cor: "text-orange-700", bg: "bg-orange-50",  border: "border-orange-200", abrev: "Incidente" },
  NC: { label: "Não Conformidade",     cor: "text-violet-700", bg: "bg-violet-50",  border: "border-violet-200", abrev: "Não Conformidade" },
  EL: { label: "Elogio",              cor: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", abrev: "Elogio" },
  RC: { label: "Reclamação",          cor: "text-rose-700",    bg: "bg-rose-50",    border: "border-rose-200",    abrev: "Reclamação" },
  MF: { label: "Manifestação",        cor: "text-sky-700",     bg: "bg-sky-50",     border: "border-sky-200",     abrev: "Manifestação" },
};

export const STATUS_CONFIG: Record<StatusRegistro, { label: string; cls: string }> = {
  AGUARDANDO_TRIAGEM: { label: "Aguardando Triagem", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  EM_TRATATIVA:       { label: "Em Tratativa",       cls: "bg-amber-50 text-amber-700 border-amber-200" },
  APROVACAO:          { label: "Em Aprovação",        cls: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  EFICACIA:           { label: "Aval. Eficácia",     cls: "bg-purple-50 text-purple-700 border-purple-200" },
  CONCLUIDO:          { label: "Concluído",           cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  CANCELADO:          { label: "Cancelado",           cls: "bg-slate-100 text-slate-500 border-slate-200" },
  SUSPENSO:           { label: "Suspenso",            cls: "bg-yellow-50 text-yellow-700 border-yellow-200" },
};

export const SETORES = [
  "UTI Adulto", "CME", "Farmácia", "Gestão da Qualidade", "Internação",
  "Centro Cirúrgico", "Pronto Atendimento", "Recepção", "SADT", "Nutrição",
  "Diretoria Executiva", "TI", "Engenharia Clínica",
];

export const USUARIOS = [
  "Enf. Marina Costa", "Dr. Carlos Lima", "Farm. Ana Pereira",
  "Deivid Coimbra", "Tyago Alves", "Patricia Reis", "Roberto Silva",
];

const hist = (acao: string, obs?: string) => ({
  id: `h${Math.random()}`, data: "03/05/2026 08:00", autor: "Sistema", acao, obs,
});

const base: Omit<Registro, "id" | "codigo" | "tipo" | "status"> = {
  prioridade: "MEDIA", dataRegistro: "03/05/2026", origem: "FORMULARIO",
  dataOcorrencia: "02/05/2026", periodo: "DIURNO", anonimo: false,
  notificadorNome: "", notificadorCargo: "", notificadorSetor: "", notificadorEmail: "",
  setorOcorrencia: "UTI Adulto", descricao: "", envolvePaciente: false,
  pacienteNome: "", pacienteAtendimento: "", pacienteConsequencias: "", acaoImediata: "",
  dataClassificacao: "", classificacaoNQSP: "", gravidade: "LEVE",
  classificacaoDesfecho: "", categoriaNotiVisa: "", numeroNotivisa: "", linkNotivisa: "",
  quebraAcordo: "", trativaSugerida: "", tipoAcao: "", unidadeResponsavel: "",
  responsavelTratativa: "", prazoTratativa: "",
  ferramentasAnalise: [], planoAcao: [], historico: [],
};

export const MOCK_REGISTROS: Registro[] = [
  {
    ...base, id: "r1", codigo: "NI-0001", tipo: "NI", status: "AGUARDANDO_TRIAGEM",
    anonimo: true, setorOcorrencia: "UTI Adulto", dataOcorrencia: "02/05/2026", periodo: "NOTURNO",
    descricao: "Paciente encontrado no chão às 03h45. Grade da cama estava baixa. Médico plantonista acionado, sem lesões graves.",
    envolvePaciente: true,
    historico: [hist("Registro criado. Código NI-0001 gerado automaticamente.")],
  },
  {
    ...base, id: "r2", codigo: "NC-0001", tipo: "NC", status: "AGUARDANDO_TRIAGEM",
    notificadorNome: "Equipe de Auditoria", notificadorCargo: "Auditor Interno", notificadorSetor: "Qualidade",
    setorOcorrencia: "Internação", dataOcorrencia: "01/05/2026", periodo: "DIURNO",
    descricao: "Auditoria identificou 12 prontuários sem evolução médica registrada no dia anterior, contrariando o POP MED-004.",
    envolvePaciente: true,
    historico: [hist("Registro criado. Código NC-0001 gerado automaticamente.")],
  },
  {
    ...base, id: "r3", codigo: "RC-0001", tipo: "RC", status: "AGUARDANDO_TRIAGEM",
    anonimo: true, setorOcorrencia: "Pronto Atendimento", dataOcorrencia: "01/05/2026", periodo: "VESPERTINO",
    descricao: "Paciente aguardou mais de 4 horas sem atendimento médico. Relata falta de informação sobre a fila.",
    historico: [hist("Registro criado. Código RC-0001 gerado automaticamente.")],
  },
  {
    ...base, id: "r4", codigo: "NI-0002", tipo: "NI", status: "EM_TRATATIVA",
    prioridade: "ALTA", notificadorNome: "Enf. Marina Costa", notificadorCargo: "Enfermeira", notificadorSetor: "Farmácia",
    setorOcorrencia: "Farmácia", dataOcorrencia: "28/04/2026", periodo: "DIURNO",
    descricao: "Paciente recebeu dose de heparina 5000 UI quando a prescrição era de 2500 UI. Médico acionado imediatamente.",
    envolvePaciente: true, pacienteNome: "José da Silva", pacienteAtendimento: "ATD-20260428-009",
    responsavelTratativa: "Farm. Ana Pereira", prazoTratativa: "10/05/2026",
    dataClassificacao: "29/04/2026", classificacaoNQSP: "MANTER", gravidade: "GRAVE",
    ferramentasAnalise: ["ISHIKAWA", "5PORQUES"],
    planoAcao: [
      { id: "pa1", acao: "Revisar protocolo de dupla checagem de medicamentos", responsavel: "Deivid Coimbra", prazo: "07/05/2026", status: "EM_ANDAMENTO" },
      { id: "pa2", acao: "Treinamento da equipe de farmácia", responsavel: "Farm. Ana Pereira", prazo: "12/05/2026", status: "PENDENTE" },
    ],
    historico: [
      hist("Registro criado."),
      hist("Triagem realizada. Aceito pela Qualidade.", "Incidente grave. Responsável: Farm. Ana Pereira."),
    ],
  },
  {
    ...base, id: "r5", codigo: "NC-0002", tipo: "NC", status: "APROVACAO",
    prioridade: "MEDIA", notificadorNome: "Engenharia Clínica", notificadorCargo: "Engenheiro", notificadorSetor: "SADT",
    setorOcorrencia: "SADT", dataOcorrencia: "25/04/2026", periodo: "DIURNO",
    descricao: "Autoclave do SADT com calibração vencida há 3 meses, contrariando o POP ENG-002.",
    responsavelTratativa: "Tyago Alves", prazoTratativa: "08/05/2026",
    dataClassificacao: "26/04/2026", classificacaoNQSP: "MANTER", gravidade: "MEDIA",
    ferramentasAnalise: ["5PORQUES"],
    planoAcao: [
      { id: "pa1", acao: "Enviar equipamento para calibração externa", responsavel: "Engenharia", prazo: "05/05/2026", status: "CONCLUIDO" },
      { id: "pa2", acao: "Implantar controle semestral de calibração", responsavel: "Tyago Alves", prazo: "08/05/2026", status: "EM_ANDAMENTO" },
    ],
    historico: [hist("Registro criado."), hist("Aceito pela Qualidade."), hist("Tratativa concluída. Aguardando aprovação.")],
  },
  {
    ...base, id: "r6", codigo: "EL-0001", tipo: "EL", status: "EM_TRATATIVA",
    anonimo: true, setorOcorrencia: "Recepção", dataOcorrencia: "30/04/2026", periodo: "DIURNO",
    descricao: "Paciente elogiou atenção e agilidade da equipe de recepção durante admissão hospitalar.",
    responsavelTratativa: "Deivid Coimbra",
    planoAcao: [
      { id: "pa1", acao: "Compartilhar elogio com a equipe em reunião mensal", responsavel: "Deivid Coimbra", prazo: "10/05/2026", status: "PENDENTE" },
    ],
    historico: [hist("Registro criado."), hist("Aceito pela Qualidade.")],
  },
  {
    ...base, id: "r7", codigo: "NI-0003", tipo: "NI", status: "CONCLUIDO",
    prioridade: "ALTA", notificadorNome: "Dr. Carlos Lima", notificadorCargo: "Médico", notificadorSetor: "Centro Cirúrgico",
    setorOcorrencia: "Centro Cirúrgico", dataOcorrencia: "20/04/2026", periodo: "DIURNO",
    descricao: "Paciente levado ao CC sem pulseira de identificação. Procedimento foi interrompido.",
    envolvePaciente: true, responsavelTratativa: "Deivid Coimbra", prazoTratativa: "30/04/2026",
    dataClassificacao: "21/04/2026", classificacaoNQSP: "MANTER", gravidade: "GRAVE",
    ferramentasAnalise: ["ISHIKAWA"],
    planoAcao: [
      { id: "pa1", acao: "Checklist pré-cirúrgico atualizado com verificação de pulseira", responsavel: "Deivid Coimbra", prazo: "25/04/2026", status: "CONCLUIDO" },
    ],
    historico: [hist("Registro criado."), hist("Aceito."), hist("Tratativa concluída."), hist("Aprovado."), hist("Eficácia avaliada. Concluído.")],
  },
  {
    ...base, id: "r8", codigo: "NC-0003", tipo: "NC", status: "CANCELADO",
    setorOcorrencia: "CME", dataOcorrencia: "15/04/2026", periodo: "DIURNO",
    descricao: "Instrumental cirúrgico processado sem seguir o POP CME-001.",
    justificativaRecusa: "Verificado que não houve desvio; notificação foi erro de interpretação do POP.",
    historico: [hist("Registro criado."), hist("Registro cancelado após verificação in loco.")],
  },
  {
    ...base, id: "r9", codigo: "MF-0001", tipo: "MF", status: "EM_TRATATIVA",
    anonimo: true, setorOcorrencia: "Recepção", dataOcorrencia: "29/04/2026", periodo: "DIURNO",
    descricao: "Familiar de paciente sugere instalação de rampa de acesso no bloco B para cadeirantes.",
    responsavelTratativa: "Deivid Coimbra", prazoTratativa: "20/05/2026",
    planoAcao: [
      { id: "pa1", acao: "Levantar custo de instalação da rampa", responsavel: "Manutenção", prazo: "15/05/2026", status: "PENDENTE" },
    ],
    historico: [hist("Registro criado."), hist("Aceito pela Qualidade.")],
  },
];
