"use client";

import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  FileWarning,
  HeartHandshake,
  LayoutTemplate,
  MessageSquareWarning,
  Plus,
  QrCode,
  Search,
  ShieldAlert,
  Sparkles,
  Trash2,
  User,
  XCircle,
} from "lucide-react";

/* ──────────────────────────────────────────────────────────────────────────────
 * TYPES
 * ────────────────────────────────────────────────────────────────────────────*/

type ModuloTipo =
  | "TEMPLATE"
  | "NAO_CONFORMIDADE"
  | "INCIDENTE"
  | "MELHORIA"
  | "OUVIDORIA";

type StatusOcorrencia =
  | "REGISTRO"
  | "ANALISE"
  | "TRATATIVA"
  | "VALIDACAO"
  | "CONCLUIDO"
  | "CANCELADO";

type Gravidade = "BAIXA" | "MODERADA" | "ALTA" | "GRAVE" | "SENTINELA";

type PerfilAcesso =
  | "NOTIFICADOR"
  | "TRATADOR"
  | "GESTOR"
  | "QUALIDADE"
  | "ADMIN";

type ClassificacaoOuvidoria =
  | "ELOGIO"
  | "RECLAMACAO"
  | "MANIFESTACAO"
  | "SUGESTAO";

type IncidenteClassificacao =
  | "QUEDA"
  | "MEDICACAO"
  | "IDENTIFICACAO"
  | "LESAO_PRESSAO"
  | "INFECCAO"
  | "PROCEDIMENTO"
  | "OUTRO";

type NaoConformidadeClassificacao =
  | "PROCESSO"
  | "DOCUMENTO"
  | "TREINAMENTO"
  | "ESTRUTURA"
  | "EQUIPAMENTO"
  | "FORNECEDOR"
  | "OUTRO";

type MelhoriaClassificacao =
  | "PROCESSO"
  | "SEGURANCA"
  | "EXPERIENCIA"
  | "EFICIENCIA"
  | "CUSTO"
  | "INOVACAO"
  | "OUTRO";

type HistoricoItem = {
  id: string;
  data: string;
  autor: string;
  acao: string;
  observacao?: string;
};

type PlanoAcaoStatus = "PENDENTE" | "EM_ANDAMENTO" | "CONCLUIDO";

type PlanoAcaoItem = {
  id: string;
  descricao: string;
  responsavel: string;
  prazo: string;
  status: PlanoAcaoStatus;
};

type TemplateFieldType =
  | "TEXTO"
  | "SELECAO"
  | "DATA"
  | "UPLOAD"
  | "CHECKLIST"
  | "TEXTO_LONGO";

type TemplateField = {
  id: string;
  label: string;
  tipo: TemplateFieldType;
  obrigatorio: boolean;
  opcoes?: string[];
};

type FormTemplate = {
  id: string;
  nome: string;
  descricao: string;
  tipoVinculado: Exclude<ModuloTipo, "TEMPLATE">;
  versao: string;
  publico: boolean;
  workflowPadrao: StatusOcorrencia[];
  responsavelPadrao: string;
  qrCodeUrl: string;
  linkPublico: string;
  campos: TemplateField[];
  criadoEm: string;
};

type Ocorrencia = {
  id: string;
  numero: string;
  tipo: Exclude<ModuloTipo, "TEMPLATE">;
  status: StatusOcorrencia;
  titulo: string;
  descricao: string;
  setor: string;
  areaNotificante: string;
  dataOcorrencia: string;
  dataRegistro: string;
  localOcorrencia: string;
  anonimo: boolean;
  envolvePaciente: boolean;
  identificacaoRestrita: boolean;
  nomeNotificador?: string;
  perfilResponsavel: PerfilAcesso;
  responsavelTratativa: string;
  prioridade: "BAIXA" | "MEDIA" | "ALTA" | "CRITICA";
  gravidade?: Gravidade;
  danoPaciente?: boolean;
  classificacaoIncidente?: IncidenteClassificacao;
  classificacaoNC?: NaoConformidadeClassificacao;
  classificacaoOuvidoria?: ClassificacaoOuvidoria;
  classificacaoMelhoria?: MelhoriaClassificacao;
  pacienteCodigo?: string;
  causaRaiz?: string;
  acaoImediata?: string;
  planoAcao: PlanoAcaoItem[];
  conclusao?: string;
  motivoCancelamento?: string;
  prazoTratativa?: string;
  templateId?: string;
  historico: HistoricoItem[];
};

type ViewMode = "TABLE" | "KANBAN";

/* ──────────────────────────────────────────────────────────────────────────────
 * MOCKS / BASES
 * ────────────────────────────────────────────────────────────────────────────*/

const SETORES = [
  "Qualidade",
  "Pronto Atendimento",
  "UTI Adulto",
  "Centro Cirúrgico",
  "Internação",
  "Farmácia",
  "SADT",
  "Recepção",
  "Ouvidoria",
  "Diretoria Técnica",
];

const USUARIOS = [
  "Ana Silva",
  "Dr. Carlos",
  "Enf. Roberta",
  "João Pedro",
  "Marina Souza",
  "Lucas Oliveira",
];

const INITIAL_TEMPLATES: FormTemplate[] = [
  {
    id: "tpl-001",
    nome: "Formulário de Notificação de Incidente Assistencial",
    descricao:
      "Template público para registro estruturado de incidentes assistenciais com triagem inicial.",
    tipoVinculado: "INCIDENTE",
    versao: "1.0",
    publico: true,
    workflowPadrao: ["REGISTRO", "ANALISE", "TRATATIVA", "VALIDACAO", "CONCLUIDO"],
    responsavelPadrao: "Ana Silva",
    qrCodeUrl: "QR-INCIDENTE-001",
    linkPublico: "https://docqualis.app/public/form/tpl-001",
    criadoEm: "2026-04-23",
    campos: [
      { id: "f1", label: "Descrição do fato", tipo: "TEXTO_LONGO", obrigatorio: true },
      { id: "f2", label: "Setor", tipo: "SELECAO", obrigatorio: true, opcoes: SETORES },
      { id: "f3", label: "Data da ocorrência", tipo: "DATA", obrigatorio: true },
      { id: "f4", label: "Houve dano?", tipo: "CHECKLIST", obrigatorio: false },
      { id: "f5", label: "Anexar evidência", tipo: "UPLOAD", obrigatorio: false },
    ],
  },
  {
    id: "tpl-002",
    nome: "Manifestação da Ouvidoria",
    descricao:
      "Template externo para elogios, reclamações, manifestações e sugestões do cliente.",
    tipoVinculado: "OUVIDORIA",
    versao: "1.0",
    publico: true,
    workflowPadrao: ["REGISTRO", "ANALISE", "TRATATIVA", "CONCLUIDO"],
    responsavelPadrao: "Lucas Oliveira",
    qrCodeUrl: "QR-OUVIDORIA-002",
    linkPublico: "https://docqualis.app/public/form/tpl-002",
    criadoEm: "2026-04-23",
    campos: [
      { id: "f1", label: "Nome", tipo: "TEXTO", obrigatorio: false },
      { id: "f2", label: "Mensagem", tipo: "TEXTO_LONGO", obrigatorio: true },
      {
        id: "f3",
        label: "Tipo de manifestação",
        tipo: "SELECAO",
        obrigatorio: true,
        opcoes: ["ELOGIO", "RECLAMACAO", "MANIFESTACAO", "SUGESTAO"],
      },
      { id: "f4", label: "Anexar arquivo", tipo: "UPLOAD", obrigatorio: false },
    ],
  },
];

const INITIAL_DATA: Ocorrencia[] = [];

const KANBAN_COLUMNS: { key: StatusOcorrencia; label: string }[] = [
  { key: "REGISTRO", label: "Registro" },
  { key: "ANALISE", label: "Em análise" },
  { key: "TRATATIVA", label: "Em tratativa" },
  { key: "VALIDACAO", label: "Validação" },
  { key: "CONCLUIDO", label: "Concluído" },
];

/* ──────────────────────────────────────────────────────────────────────────────
 * HELPERS
 * ────────────────────────────────────────────────────────────────────────────*/

function cn(...items: Array<string | false | null | undefined>) {
  return items.filter(Boolean).join(" ");
}

function genId(prefix = "id") {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function formatNowPtBr() {
  return new Date().toLocaleString("pt-BR");
}

function novoNumero(seq: number) {
  return `OC-2026-${String(seq).padStart(4, "0")}`;
}

function statusLabel(status: StatusOcorrencia) {
  return {
    REGISTRO: "Registro",
    ANALISE: "Em análise",
    TRATATIVA: "Em tratativa",
    VALIDACAO: "Validação",
    CONCLUIDO: "Concluído",
    CANCELADO: "Cancelado",
  }[status];
}

function statusClass(status: StatusOcorrencia) {
  return {
    REGISTRO: "bg-blue-50 text-blue-700 border-blue-200",
    ANALISE: "bg-violet-50 text-violet-700 border-violet-200",
    TRATATIVA: "bg-amber-50 text-amber-700 border-amber-200",
    VALIDACAO: "bg-cyan-50 text-cyan-700 border-cyan-200",
    CONCLUIDO: "bg-emerald-50 text-emerald-700 border-emerald-200",
    CANCELADO: "bg-slate-100 text-slate-600 border-slate-200",
  }[status];
}

function tipoLabel(tipo: ModuloTipo | Exclude<ModuloTipo, "TEMPLATE">) {
  return {
    TEMPLATE: "Template de formulário",
    NAO_CONFORMIDADE: "Não conformidade",
    INCIDENTE: "Notificação de incidente",
    MELHORIA: "Oportunidade de melhoria",
    OUVIDORIA: "Elogios, reclamações e manifestação",
  }[tipo];
}

function tipoDesc(tipo: ModuloTipo) {
  return {
    TEMPLATE: "Modelos inteligentes para registro externo e interno com QR Code",
    NAO_CONFORMIDADE: "Falhas, desvios, documentos, estrutura e processos",
    INCIDENTE: "Segurança do paciente, risco assistencial e eventos",
    MELHORIA: "Sugestões estruturadas para melhoria contínua",
    OUVIDORIA: "Elogios, reclamações, manifestações e percepção do cliente",
  }[tipo];
}

function tipoCardClass(tipo: ModuloTipo, active: boolean) {
  if (active) {
    return {
      TEMPLATE: "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/20",
      NAO_CONFORMIDADE:
        "bg-violet-600 text-white border-violet-600 shadow-lg shadow-violet-600/20",
      INCIDENTE:
        "bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-500/20",
      MELHORIA:
        "bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-600/20",
      OUVIDORIA:
        "bg-rose-600 text-white border-rose-600 shadow-lg shadow-rose-600/20",
    }[tipo];
  }

  return "bg-white border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/40";
}

function tipoIcon(tipo: ModuloTipo | Exclude<ModuloTipo, "TEMPLATE">) {
  switch (tipo) {
    case "TEMPLATE":
      return <LayoutTemplate className="w-4 h-4" />;
    case "NAO_CONFORMIDADE":
      return <FileWarning className="w-4 h-4" />;
    case "INCIDENTE":
      return <AlertTriangle className="w-4 h-4" />;
    case "MELHORIA":
      return <Sparkles className="w-4 h-4" />;
    case "OUVIDORIA":
      return <HeartHandshake className="w-4 h-4" />;
  }
}

function prioridadeClass(prioridade: Ocorrencia["prioridade"]) {
  return {
    BAIXA: "bg-slate-100 text-slate-700",
    MEDIA: "bg-blue-100 text-blue-700",
    ALTA: "bg-amber-100 text-amber-700",
    CRITICA: "bg-red-100 text-red-700",
  }[prioridade];
}

function isOcorrenciaTipo(tipo: ModuloTipo): tipo is Exclude<ModuloTipo, "TEMPLATE"> {
  return tipo !== "TEMPLATE";
}

function getSlaStatus(item: Ocorrencia) {
  if (!item.prazoTratativa) return "Sem SLA";
  if (item.status === "CONCLUIDO") return "Concluído";
  const hoje = new Date();
  const prazo = new Date(item.prazoTratativa);
  return prazo < hoje ? "Atrasado" : "Dentro do prazo";
}

function getTemplateTypeBadgeClass(tipo: Exclude<ModuloTipo, "TEMPLATE">) {
  return {
    NAO_CONFORMIDADE: "bg-violet-50 text-violet-700 border-violet-200",
    INCIDENTE: "bg-orange-50 text-orange-700 border-orange-200",
    MELHORIA: "bg-emerald-50 text-emerald-700 border-emerald-200",
    OUVIDORIA: "bg-rose-50 text-rose-700 border-rose-200",
  }[tipo];
}

/* ──────────────────────────────────────────────────────────────────────────────
 * MAIN PAGE
 * ────────────────────────────────────────────────────────────────────────────*/

export default function OcorrenciasPage() {
  const [tipoAtivo, setTipoAtivo] = useState<ModuloTipo>("NAO_CONFORMIDADE");
  const [statusAtivo, setStatusAtivo] = useState<StatusOcorrencia | "DASHBOARD">("REGISTRO");
  const [viewMode, setViewMode] = useState<ViewMode>("TABLE");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>(INITIAL_DATA);
  const [templates, setTemplates] = useState<FormTemplate[]>(INITIAL_TEMPLATES);

  const [templateForm, setTemplateForm] = useState<{
    nome: string;
    descricao: string;
    tipoVinculado: Exclude<ModuloTipo, "TEMPLATE">;
    responsavelPadrao: string;
    publico: boolean;
    campos: TemplateField[];
  }>({
    nome: "",
    descricao: "",
    tipoVinculado: "NAO_CONFORMIDADE",
    responsavelPadrao: "Ana Silva",
    publico: true,
    campos: [
      {
        id: genId("field"),
        label: "Descrição do fato",
        tipo: "TEXTO_LONGO",
        obrigatorio: true,
      },
    ],
  });

  const [form, setForm] = useState<Omit<Ocorrencia, "id" | "numero" | "historico">>({
    tipo: "NAO_CONFORMIDADE",
    status: "REGISTRO",
    titulo: "",
    descricao: "",
    setor: "Qualidade",
    areaNotificante: "Qualidade",
    dataOcorrencia: "",
    dataRegistro: new Date().toISOString().slice(0, 10),
    localOcorrencia: "",
    anonimo: false,
    envolvePaciente: false,
    identificacaoRestrita: false,
    nomeNotificador: "",
    perfilResponsavel: "QUALIDADE",
    responsavelTratativa: "Ana Silva",
    prioridade: "MEDIA",
    gravidade: "BAIXA",
    danoPaciente: false,
    classificacaoIncidente: undefined,
    classificacaoNC: undefined,
    classificacaoOuvidoria: undefined,
    classificacaoMelhoria: undefined,
    pacienteCodigo: "",
    causaRaiz: "",
    acaoImediata: "",
    planoAcao: [],
    conclusao: "",
    motivoCancelamento: "",
    prazoTratativa: "",
    templateId: "",
  });

  const filtered = useMemo(() => {
    if (!isOcorrenciaTipo(tipoAtivo)) return [];

    return ocorrencias.filter((item) => {
      const byTipo = item.tipo === tipoAtivo;
      const byStatus = statusAtivo === "DASHBOARD" ? true : item.status === statusAtivo;
      const byQuery =
        !query ||
        item.titulo.toLowerCase().includes(query.toLowerCase()) ||
        item.numero.toLowerCase().includes(query.toLowerCase()) ||
        item.setor.toLowerCase().includes(query.toLowerCase()) ||
        item.responsavelTratativa.toLowerCase().includes(query.toLowerCase());

      return byTipo && byStatus && byQuery;
    });
  }, [ocorrencias, tipoAtivo, statusAtivo, query]);

  const dashboardData = useMemo(() => {
    const base = isOcorrenciaTipo(tipoAtivo)
      ? ocorrencias.filter((o) => o.tipo === tipoAtivo)
      : ocorrencias;

    const total = base.length;
    const registro = base.filter((o) => o.status === "REGISTRO").length;
    const analise = base.filter((o) => o.status === "ANALISE").length;
    const tratativa = base.filter((o) => o.status === "TRATATIVA").length;
    const validacao = base.filter((o) => o.status === "VALIDACAO").length;
    const concluido = base.filter((o) => o.status === "CONCLUIDO").length;
    const cancelado = base.filter((o) => o.status === "CANCELADO").length;

    const porSetor = SETORES.map((setor) => ({
      setor,
      total: base.filter((o) => o.setor === setor).length,
    })).filter((i) => i.total > 0);

    const criticos = base.filter((o) => o.prioridade === "CRITICA").length;
    const alta = base.filter((o) => o.prioridade === "ALTA").length;
    const anonimos = base.filter((o) => o.anonimo).length;
    const atrasados = base.filter((o) => getSlaStatus(o) === "Atrasado").length;
    const dentroPrazo = base.filter((o) => getSlaStatus(o) === "Dentro do prazo").length;

    return {
      total,
      registro,
      analise,
      tratativa,
      validacao,
      concluido,
      cancelado,
      porSetor,
      criticos,
      alta,
      anonimos,
      atrasados,
      dentroPrazo,
      taxaConclusao: total ? Math.round((concluido / total) * 100) : 0,
    };
  }, [ocorrencias, tipoAtivo]);

  const selected = useMemo(
    () => ocorrencias.find((o) => o.id === selectedId) ?? null,
    [ocorrencias, selectedId]
  );

  const templateStats = useMemo(() => {
    return {
      total: templates.length,
      publicos: templates.filter((t) => t.publico).length,
      incidentes: templates.filter((t) => t.tipoVinculado === "INCIDENTE").length,
      ouvidoria: templates.filter((t) => t.tipoVinculado === "OUVIDORIA").length,
    };
  }, [templates]);

  function resetForm(tipo?: ModuloTipo) {
    const nextTipo =
      tipo && isOcorrenciaTipo(tipo) ? tipo : isOcorrenciaTipo(tipoAtivo) ? tipoAtivo : "NAO_CONFORMIDADE";

    setForm({
      tipo: nextTipo,
      status: "REGISTRO",
      titulo: "",
      descricao: "",
      setor: "Qualidade",
      areaNotificante: "Qualidade",
      dataOcorrencia: "",
      dataRegistro: new Date().toISOString().slice(0, 10),
      localOcorrencia: "",
      anonimo: false,
      envolvePaciente: false,
      identificacaoRestrita: false,
      nomeNotificador: "",
      perfilResponsavel: "QUALIDADE",
      responsavelTratativa: "Ana Silva",
      prioridade: "MEDIA",
      gravidade: "BAIXA",
      danoPaciente: false,
      classificacaoIncidente: undefined,
      classificacaoNC: undefined,
      classificacaoOuvidoria: undefined,
      classificacaoMelhoria: undefined,
      pacienteCodigo: "",
      causaRaiz: "",
      acaoImediata: "",
      planoAcao: [],
      conclusao: "",
      motivoCancelamento: "",
      prazoTratativa: "",
      templateId: "",
    });
  }

  function addPlanoAcao() {
    setForm((prev) => ({
      ...prev,
      planoAcao: [
        ...prev.planoAcao,
        {
          id: genId("pa"),
          descricao: "",
          responsavel: "Ana Silva",
          prazo: "",
          status: "PENDENTE",
        },
      ],
    }));
  }

  function updatePlanoAcao(id: string, field: keyof PlanoAcaoItem, value: string) {
    setForm((prev) => ({
      ...prev,
      planoAcao: prev.planoAcao.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }));
  }

  function removePlanoAcao(id: string) {
    setForm((prev) => ({
      ...prev,
      planoAcao: prev.planoAcao.filter((item) => item.id !== id),
    }));
  }

  function salvarOcorrencia() {
    if (
      !form.titulo.trim() ||
      !form.descricao.trim() ||
      !form.setor.trim() ||
      !form.dataOcorrencia
    ) {
      return;
    }

    const next: Ocorrencia = {
      id: genId("oc"),
      numero: novoNumero(ocorrencias.length + 1),
      ...form,
      historico: [
        {
          id: genId("h"),
          data: formatNowPtBr(),
          autor: form.anonimo ? "Anônimo" : form.nomeNotificador || "Usuário",
          acao: "Registro criado",
        },
      ],
    };

    setOcorrencias((prev) => [next, ...prev]);
    setSelectedId(next.id);
    setTipoAtivo(next.tipo);
    setStatusAtivo("REGISTRO");
    resetForm(next.tipo);
  }

  function moverStatus(id: string, nextStatus: StatusOcorrencia) {
    setOcorrencias((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              status: nextStatus,
              historico: [
                ...item.historico,
                {
                  id: genId("h"),
                  data: formatNowPtBr(),
                  autor: "Sistema/Usuário",
                  acao: `Status alterado para ${statusLabel(nextStatus)}`,
                },
              ],
            }
          : item
      )
    );
  }

  function excluirRegistro(id: string) {
    setOcorrencias((prev) => prev.filter((item) => item.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  function addTemplateField() {
    setTemplateForm((prev) => ({
      ...prev,
      campos: [
        ...prev.campos,
        {
          id: genId("field"),
          label: "",
          tipo: "TEXTO",
          obrigatorio: false,
        },
      ],
    }));
  }

  function updateTemplateField(id: string, field: keyof TemplateField, value: any) {
    setTemplateForm((prev) => ({
      ...prev,
      campos: prev.campos.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }));
  }

  function removeTemplateField(id: string) {
    setTemplateForm((prev) => ({
      ...prev,
      campos: prev.campos.filter((item) => item.id !== id),
    }));
  }

  function salvarTemplate() {
    if (!templateForm.nome.trim() || !templateForm.descricao.trim()) return;

    const novo: FormTemplate = {
      id: genId("tpl"),
      nome: templateForm.nome,
      descricao: templateForm.descricao,
      tipoVinculado: templateForm.tipoVinculado,
      versao: "1.0",
      publico: templateForm.publico,
      workflowPadrao: ["REGISTRO", "ANALISE", "TRATATIVA", "VALIDACAO", "CONCLUIDO"],
      responsavelPadrao: templateForm.responsavelPadrao,
      qrCodeUrl: `QR-${Date.now()}`,
      linkPublico: `https://docqualis.app/public/form/${Date.now()}`,
      criadoEm: new Date().toISOString().slice(0, 10),
      campos: templateForm.campos,
    };

    setTemplates((prev) => [novo, ...prev]);

    setTemplateForm({
      nome: "",
      descricao: "",
      tipoVinculado: "NAO_CONFORMIDADE",
      responsavelPadrao: "Ana Silva",
      publico: true,
      campos: [
        {
          id: genId("field"),
          label: "Descrição do fato",
          tipo: "TEXTO_LONGO",
          obrigatorio: true,
        },
      ],
    });
  }

  function onSelectTipo(tipo: ModuloTipo) {
    setTipoAtivo(tipo);
    setQuery("");
    setSelectedId(null);
    setStatusAtivo(tipo === "TEMPLATE" ? "DASHBOARD" : "REGISTRO");

    if (isOcorrenciaTipo(tipo)) {
      resetForm(tipo);
    }
  }

  const tipoCards: { value: ModuloTipo; label: string; desc: string }[] = [
    {
      value: "TEMPLATE",
      label: "Template de formulário",
      desc: "Modelos dinâmicos + QR Code + link público",
    },
    {
      value: "NAO_CONFORMIDADE",
      label: "Não conformidade",
      desc: "Falhas, desvios, processo, estrutura e documentos",
    },
    {
      value: "INCIDENTE",
      label: "Notificações de incidente",
      desc: "Segurança do paciente e incidentes assistenciais",
    },
    {
      value: "MELHORIA",
      label: "Oportunidades de melhoria",
      desc: "Melhoria contínua e evolução operacional",
    },
    {
      value: "OUVIDORIA",
      label: "Elogios, reclamações e manifestação",
      desc: "Ouvidoria, experiência e percepção do cliente",
    },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 md:p-8 text-slate-900">
      <div className="max-w-[1800px] mx-auto space-y-8">
        {/* HEADER */}
        <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm">
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-[10px] font-black uppercase tracking-[0.18em] text-indigo-700 mb-3">
                <ShieldAlert className="w-3.5 h-3.5" />
                Gestão de Ocorrências
              </div>

              <h1 className="text-3xl font-black tracking-tight text-slate-900">
                Qualidade, Segurança do Paciente e Ouvidoria
              </h1>

              <p className="text-sm text-slate-500 font-medium mt-2 max-w-5xl">
                Central inteligente para registro, análise, tratativa, validação, conclusão e
                monitoramento de ocorrências, com templates dinâmicos, rastreabilidade, workflow e
                governança institucional.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 min-w-[320px]">
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">
                  Total
                </p>
                <p className="text-2xl font-black mt-2">
                  {tipoAtivo === "TEMPLATE" ? templateStats.total : dashboardData.total}
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                <p className="text-[10px] uppercase font-black tracking-widest text-amber-700">
                  Tratativa
                </p>
                <p className="text-2xl font-black mt-2 text-amber-700">
                  {tipoAtivo === "TEMPLATE" ? templateStats.publicos : dashboardData.tratativa}
                </p>
              </div>

              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                <p className="text-[10px] uppercase font-black tracking-widest text-emerald-700">
                  Concluídos
                </p>
                <p className="text-2xl font-black mt-2 text-emerald-700">
                  {tipoAtivo === "TEMPLATE" ? templateStats.incidentes : dashboardData.concluido}
                </p>
              </div>

              <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
                <p className="text-[10px] uppercase font-black tracking-widest text-red-700">
                  Críticos
                </p>
                <p className="text-2xl font-black mt-2 text-red-700">
                  {tipoAtivo === "TEMPLATE" ? templateStats.ouvidoria : dashboardData.criticos}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* TOP CARDS */}
        <div className="bg-white border border-slate-100 rounded-[2rem] p-4 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
            {tipoCards.map((item) => {
              const count =
                item.value === "TEMPLATE"
                  ? templates.length
                  : ocorrencias.filter((o) => o.tipo === item.value).length;

              const active = tipoAtivo === item.value;

              return (
                <button
                  key={item.value}
                  onClick={() => onSelectTipo(item.value)}
                  className={cn(
                    "rounded-2xl border p-5 text-left transition-all min-h-[122px]",
                    tipoCardClass(item.value, active)
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-black">
                      {tipoIcon(item.value)}
                      <span>{item.label}</span>
                    </div>

                    <div
                      className={cn(
                        "min-w-8 h-8 px-2 rounded-xl flex items-center justify-center text-xs font-black",
                        active ? "bg-white/15 text-white" : "bg-slate-50 text-slate-700"
                      )}
                    >
                      {count}
                    </div>
                  </div>

                  <p
                    className={cn(
                      "text-xs mt-3 font-medium leading-relaxed",
                      active ? "text-white/80" : "text-slate-500"
                    )}
                  >
                    {item.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* TEMPLATE MODULE */}
        {tipoAtivo === "TEMPLATE" ? (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            <div className="xl:col-span-8 space-y-6">
              <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">Central de Templates</h2>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                      Criação, versionamento, QR Code e publicação segura de formulários.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <KpiCard label="Templates" value={templateStats.total} />
                    <KpiCard label="Públicos" value={templateStats.publicos} />
                    <KpiCard label="Incidentes" value={templateStats.incidentes} />
                    <KpiCard label="Ouvidoria" value={templateStats.ouvidoria} />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                  <FeatureCard
                    icon={<LayoutTemplate className="w-5 h-5 text-indigo-600" />}
                    title="Builder de Formulário"
                    text="Estrutura para campos dinâmicos, validação, obrigatoriedade e vinculação por tipo."
                  />
                  <FeatureCard
                    icon={<QrCode className="w-5 h-5 text-indigo-600" />}
                    title="QR Code e Link Público"
                    text="Cada template pode ser disponibilizado externamente para pacientes, colaboradores e terceiros."
                  />
                  <FeatureCard
                    icon={<ShieldAlert className="w-5 h-5 text-indigo-600" />}
                    title="Workflow e Governança"
                    text="Defina responsáveis, fluxo padrão e rastreabilidade desde o registro até a conclusão."
                  />
                </div>

                <div className="space-y-4">
                  {templates.length === 0 ? (
                    <div className="border border-dashed border-slate-200 rounded-3xl p-10 text-center text-sm text-slate-400">
                      Nenhum template cadastrado.
                    </div>
                  ) : (
                    templates.map((template) => (
                      <div
                        key={template.id}
                        className="border border-slate-100 rounded-3xl p-5 bg-white hover:bg-slate-50/70 transition-colors"
                      >
                        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest">
                                {template.id}
                              </span>
                              <span
                                className={cn(
                                  "px-3 py-1 rounded-full text-[11px] font-black border",
                                  getTemplateTypeBadgeClass(template.tipoVinculado)
                                )}
                              >
                                {tipoLabel(template.tipoVinculado)}
                              </span>
                              <span className="px-3 py-1 rounded-full text-[11px] font-black border bg-indigo-50 text-indigo-700 border-indigo-200">
                                Versão {template.versao}
                              </span>
                            </div>

                            <div>
                              <h3 className="text-base font-bold text-slate-900">{template.nome}</h3>
                              <p className="text-sm text-slate-500 mt-1 max-w-3xl">
                                {template.descricao}
                              </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <MiniInfo title="Responsável padrão" value={template.responsavelPadrao} />
                              <MiniInfo
                                title="Link público"
                                value={template.publico ? "Ativo" : "Restrito"}
                              />
                              <MiniInfo title="Campos" value={String(template.campos.length)} />
                            </div>

                            <div>
                              <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">
                                Workflow padrão
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {template.workflowPadrao.map((status) => (
                                  <span
                                    key={status}
                                    className={cn(
                                      "px-3 py-1 rounded-full text-[11px] font-black border",
                                      statusClass(status)
                                    )}
                                  >
                                    {statusLabel(status)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="xl:w-[300px] shrink-0 border border-slate-100 rounded-3xl p-5 bg-slate-50">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="text-sm font-bold text-slate-800">Distribuição</h4>
                              <QrCode className="w-4 h-4 text-slate-400" />
                            </div>

                            <div className="aspect-square rounded-3xl border border-dashed border-slate-200 bg-white flex items-center justify-center text-slate-400 text-xs font-bold">
                              QR CODE
                            </div>

                            <div className="mt-4 space-y-2">
                              <button className="w-full h-11 rounded-2xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-all">
                                Gerar novo QR Code
                              </button>
                              <button className="w-full h-11 rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">
                                Copiar link público
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="mt-5 border-t border-slate-100 pt-5">
                          <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-3">
                            Campos do formulário
                          </p>

                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                            {template.campos.map((field) => (
                              <div
                                key={field.id}
                                className="border border-slate-100 rounded-2xl p-4 bg-slate-50"
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <p className="text-sm font-bold text-slate-800">{field.label}</p>
                                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                    {field.tipo}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500 mt-2">
                                  {field.obrigatorio ? "Campo obrigatório" : "Campo opcional"}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="xl:col-span-4">
              <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm sticky top-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">Novo Template</h2>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                      Estruture formulários inteligentes por módulo.
                    </p>
                  </div>

                  <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                    <Plus className="w-5 h-5 text-indigo-600" />
                  </div>
                </div>

                <div className="space-y-5 max-h-[80vh] overflow-y-auto pr-1">
                  <SectionTitle title="Identificação do template" />

                  <div>
                    <FieldLabel label="Nome do template" />
                    <input
                      value={templateForm.nome}
                      onChange={(e) =>
                        setTemplateForm((prev) => ({ ...prev, nome: e.target.value }))
                      }
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:bg-white focus:border-indigo-500"
                      placeholder="Ex.: Formulário de incidente assistencial"
                    />
                  </div>

                  <div>
                    <FieldLabel label="Descrição" />
                    <textarea
                      value={templateForm.descricao}
                      onChange={(e) =>
                        setTemplateForm((prev) => ({ ...prev, descricao: e.target.value }))
                      }
                      className="w-full min-h-[100px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none focus:bg-white focus:border-indigo-500 resize-none"
                      placeholder="Explique a finalidade do template e sua aplicação."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <FieldLabel label="Tipo vinculado" />
                      <select
                        value={templateForm.tipoVinculado}
                        onChange={(e) =>
                          setTemplateForm((prev) => ({
                            ...prev,
                            tipoVinculado: e.target.value as Exclude<ModuloTipo, "TEMPLATE">,
                          }))
                        }
                        className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:bg-white focus:border-indigo-500"
                      >
                        <option value="NAO_CONFORMIDADE">Não conformidade</option>
                        <option value="INCIDENTE">Notificação de incidente</option>
                        <option value="MELHORIA">Oportunidade de melhoria</option>
                        <option value="OUVIDORIA">Ouvidoria</option>
                      </select>
                    </div>

                    <div>
                      <FieldLabel label="Responsável padrão" />
                      <select
                        value={templateForm.responsavelPadrao}
                        onChange={(e) =>
                          setTemplateForm((prev) => ({
                            ...prev,
                            responsavelPadrao: e.target.value,
                          }))
                        }
                        className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:bg-white focus:border-indigo-500"
                      >
                        {USUARIOS.map((u) => (
                          <option key={u}>{u}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="pt-1">
                    <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={templateForm.publico}
                        onChange={(e) =>
                          setTemplateForm((prev) => ({ ...prev, publico: e.target.checked }))
                        }
                        className="w-4 h-4"
                      />
                      Disponibilizar link público e QR Code
                    </label>
                  </div>

                  <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">Campos do formulário</h4>
                        <p className="text-xs text-slate-500 font-medium mt-1">
                          Estrutura inicial do template.
                        </p>
                      </div>

                      <button
                        onClick={addTemplateField}
                        className="px-3 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-all"
                      >
                        Adicionar campo
                      </button>
                    </div>

                    <div className="space-y-4">
                      {templateForm.campos.map((field) => (
                        <div
                          key={field.id}
                          className="bg-white border border-slate-200 rounded-2xl p-4"
                        >
                          <div className="grid grid-cols-1 gap-3">
                            <input
                              value={field.label}
                              onChange={(e) =>
                                updateTemplateField(field.id, "label", e.target.value)
                              }
                              className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:bg-white focus:border-indigo-500"
                              placeholder="Rótulo do campo"
                            />

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <select
                                value={field.tipo}
                                onChange={(e) =>
                                  updateTemplateField(
                                    field.id,
                                    "tipo",
                                    e.target.value as TemplateFieldType
                                  )
                                }
                                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:bg-white focus:border-indigo-500"
                              >
                                <option value="TEXTO">Texto curto</option>
                                <option value="TEXTO_LONGO">Texto longo</option>
                                <option value="SELECAO">Seleção</option>
                                <option value="DATA">Data</option>
                                <option value="UPLOAD">Upload</option>
                                <option value="CHECKLIST">Checklist</option>
                              </select>

                              <label className="flex items-center gap-3 text-sm font-medium text-slate-700 h-11 px-4 rounded-2xl border border-slate-200 bg-slate-50">
                                <input
                                  type="checkbox"
                                  checked={field.obrigatorio}
                                  onChange={(e) =>
                                    updateTemplateField(field.id, "obrigatorio", e.target.checked)
                                  }
                                  className="w-4 h-4"
                                />
                                Obrigatório
                              </label>

                              <button
                                onClick={() => removeTemplateField(field.id)}
                                className="h-11 rounded-2xl border border-red-200 bg-red-50 text-red-600 text-sm font-bold hover:bg-red-100 transition-all flex items-center justify-center gap-2"
                              >
                                <Trash2 className="w-4 h-4" />
                                Remover
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}

                      {templateForm.campos.length === 0 && (
                        <div className="text-sm text-slate-400 font-medium">
                          Nenhum campo cadastrado.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 flex gap-3">
                    <button
                      onClick={salvarTemplate}
                      className="flex-1 h-12 rounded-2xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Salvar template
                    </button>

                    <button
                      onClick={() =>
                        setTemplateForm({
                          nome: "",
                          descricao: "",
                          tipoVinculado: "NAO_CONFORMIDADE",
                          responsavelPadrao: "Ana Silva",
                          publico: true,
                          campos: [
                            {
                              id: genId("field"),
                              label: "Descrição do fato",
                              tipo: "TEXTO_LONGO",
                              obrigatorio: true,
                            },
                          ],
                        })
                      }
                      className="h-12 px-4 rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
                    >
                      Limpar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* OCCURRENCES MODULE */
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            {/* COLUNA ESQUERDA */}
            <div className="xl:col-span-8 space-y-6">
              {/* STATUS TABS */}
              <div className="bg-white border border-slate-100 rounded-[2rem] p-4 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: "REGISTRO", label: "Registro", icon: ClipboardList },
                      { key: "ANALISE", label: "Em análise", icon: Search },
                      { key: "TRATATIVA", label: "Em tratativa", icon: AlertTriangle },
                      { key: "VALIDACAO", label: "Validação", icon: CheckCircle2 },
                      { key: "CONCLUIDO", label: "Concluído", icon: CheckCircle2 },
                      { key: "CANCELADO", label: "Cancelado", icon: XCircle },
                      { key: "DASHBOARD", label: "Painel de monitoramento", icon: BarChart3 },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() =>
                          setStatusAtivo(tab.key as StatusOcorrencia | "DASHBOARD")
                        }
                        className={cn(
                          "px-4 py-3 rounded-2xl border text-sm font-bold flex items-center gap-2 transition-all",
                          statusAtivo === tab.key
                            ? "bg-slate-900 text-white border-slate-900 shadow-md"
                            : "bg-white text-slate-600 border-slate-100 hover:bg-slate-50"
                        )}
                      >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {statusAtivo !== "DASHBOARD" && (
                    <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-1">
                      <button
                        onClick={() => setViewMode("TABLE")}
                        className={cn(
                          "px-3 h-10 rounded-xl text-xs font-black transition-all",
                          viewMode === "TABLE"
                            ? "bg-white text-slate-900 shadow-sm"
                            : "text-slate-500 hover:text-slate-700"
                        )}
                      >
                        Tabela
                      </button>
                      <button
                        onClick={() => setViewMode("KANBAN")}
                        className={cn(
                          "px-3 h-10 rounded-xl text-xs font-black transition-all",
                          viewMode === "KANBAN"
                            ? "bg-white text-slate-900 shadow-sm"
                            : "text-slate-500 hover:text-slate-700"
                        )}
                      >
                        Kanban
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* DASHBOARD */}
              {statusAtivo === "DASHBOARD" ? (
                <div className="space-y-6">
                  <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm">
                    <div className="mb-6">
                      <h2 className="text-lg font-bold text-slate-800">Painel de Monitoramento</h2>
                      <p className="text-xs text-slate-500 font-medium mt-1">
                        Visão executiva do módulo: {tipoLabel(tipoAtivo)}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-4">
                      <KpiCard label="Total" value={dashboardData.total} />
                      <KpiCard label="Registro" value={dashboardData.registro} />
                      <KpiCard label="Análise" value={dashboardData.analise} />
                      <KpiCard label="Tratativa" value={dashboardData.tratativa} />
                      <KpiCard label="Validação" value={dashboardData.validacao} />
                      <KpiCard label="Concluído" value={dashboardData.concluido} />
                      <KpiCard label="Atrasado" value={dashboardData.atrasados} />
                      <KpiCard label="Conclusão" value={`${dashboardData.taxaConclusao}%`} />
                    </div>
                  </div>

                  <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Distribuição por Setor</h3>
                    <div className="space-y-4">
                      {dashboardData.porSetor.length === 0 ? (
                        <div className="text-sm text-slate-400">Sem dados para exibir.</div>
                      ) : (
                        dashboardData.porSetor.map((item) => {
                          const percent = dashboardData.total
                            ? Math.round((item.total / dashboardData.total) * 100)
                            : 0;
                          return (
                            <div key={item.setor}>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-bold text-slate-700">
                                  {item.setor}
                                </span>
                                <span className="text-sm font-bold text-slate-500">
                                  {item.total} ({percent}%)
                                </span>
                              </div>
                              <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-indigo-600"
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <KpiCard label="Anonimizadas" value={dashboardData.anonimos} />
                    <KpiCard label="Alta prioridade" value={dashboardData.alta} />
                    <KpiCard label="Críticas" value={dashboardData.criticos} />
                    <KpiCard label="Dentro do SLA" value={dashboardData.dentroPrazo} />
                  </div>
                </div>
              ) : (
                <>
                  {/* LISTAGEM */}
                  <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
                      <div>
                        <h2 className="text-lg font-bold text-slate-800">
                          {statusLabel(statusAtivo as StatusOcorrencia)}
                        </h2>
                        <p className="text-xs text-slate-500 font-medium mt-1">
                          Registros filtrados por módulo, etapa do fluxo e busca inteligente.
                        </p>
                      </div>

                      <div className="relative w-full lg:w-[320px]">
                        <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder="Buscar por número, título, setor ou responsável..."
                          className="w-full h-11 pl-11 pr-4 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-medium outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
                        />
                      </div>
                    </div>

                    {viewMode === "TABLE" ? (
                      <div className="border border-slate-100 rounded-3xl overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm whitespace-nowrap min-w-[1100px]">
                            <thead className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase font-black text-slate-400 tracking-widest">
                              <tr>
                                <th className="px-6 py-4">Nº ocorrência</th>
                                <th className="px-6 py-4">Tipo</th>
                                <th className="px-6 py-4">Título</th>
                                <th className="px-6 py-4">Setor</th>
                                <th className="px-6 py-4">Responsável</th>
                                <th className="px-6 py-4">Prioridade</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Data</th>
                                <th className="px-6 py-4">SLA</th>
                                <th className="px-6 py-4 text-center">Abrir</th>
                              </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-50">
                              {filtered.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                  <td className="px-6 py-4 font-bold text-slate-700">{item.numero}</td>
                                  <td className="px-6 py-4">
                                    <span className="inline-flex items-center gap-2 text-slate-600 font-medium">
                                      {tipoIcon(item.tipo)}
                                      {tipoLabel(item.tipo)}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div>
                                      <p className="font-bold text-slate-800">{item.titulo}</p>
                                      <p className="text-[11px] text-slate-400 font-medium mt-1">
                                        {item.templateId ? `Template: ${item.templateId}` : "Sem template"}
                                      </p>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 font-medium text-slate-600">{item.setor}</td>
                                  <td className="px-6 py-4 font-medium text-slate-600">
                                    {item.responsavelTratativa}
                                  </td>
                                  <td className="px-6 py-4">
                                    <span
                                      className={cn(
                                        "px-2.5 py-1 rounded-full text-[11px] font-black",
                                        prioridadeClass(item.prioridade)
                                      )}
                                    >
                                      {item.prioridade}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4">
                                    <span
                                      className={cn(
                                        "px-3 py-1 rounded-full text-[11px] font-black border",
                                        statusClass(item.status)
                                      )}
                                    >
                                      {statusLabel(item.status)}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 font-medium text-slate-600">
                                    {item.dataOcorrencia || "-"}
                                  </td>
                                  <td className="px-6 py-4">
                                    <span
                                      className={cn(
                                        "px-3 py-1 rounded-full text-[11px] font-black border",
                                        getSlaStatus(item) === "Atrasado"
                                          ? "bg-red-50 text-red-700 border-red-200"
                                          : getSlaStatus(item) === "Dentro do prazo"
                                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                          : "bg-slate-50 text-slate-600 border-slate-200"
                                      )}
                                    >
                                      {getSlaStatus(item)}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                    <button
                                      onClick={() => setSelectedId(item.id)}
                                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:text-indigo-700 hover:border-indigo-200 hover:bg-indigo-50 transition-all"
                                    >
                                      Abrir <ArrowRight className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {filtered.length === 0 && (
                          <div className="p-10 text-center text-sm text-slate-400 font-medium">
                            Nenhum registro encontrado para esse filtro.
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
                        {KANBAN_COLUMNS.map((column) => {
                          const columnItems = filtered.filter((item) => item.status === column.key);

                          return (
                            <div
                              key={column.key}
                              className="border border-slate-100 rounded-3xl bg-slate-50 p-4 min-h-[420px]"
                            >
                              <div className="flex items-center justify-between mb-4">
                                <div>
                                  <h3 className="text-sm font-bold text-slate-800">
                                    {column.label}
                                  </h3>
                                  <p className="text-[11px] text-slate-400 font-medium mt-1">
                                    {columnItems.length} registro(s)
                                  </p>
                                </div>

                                <span
                                  className={cn(
                                    "px-3 py-1 rounded-full text-[11px] font-black border",
                                    statusClass(column.key)
                                  )}
                                >
                                  {columnItems.length}
                                </span>
                              </div>

                              <div className="space-y-3">
                                {columnItems.length === 0 ? (
                                  <div className="border border-dashed border-slate-200 rounded-2xl p-4 text-xs text-slate-400 text-center bg-white">
                                    Sem registros nesta etapa.
                                  </div>
                                ) : (
                                  columnItems.map((item) => (
                                    <button
                                      key={item.id}
                                      onClick={() => setSelectedId(item.id)}
                                      className="w-full text-left border border-slate-100 rounded-2xl p-4 bg-white hover:border-indigo-200 hover:bg-indigo-50/40 transition-all"
                                    >
                                      <div className="flex items-start justify-between gap-3">
                                        <div>
                                          <p className="text-sm font-bold text-slate-800">
                                            {item.titulo}
                                          </p>
                                          <p className="text-[11px] text-slate-400 font-medium mt-1">
                                            {item.numero}
                                          </p>
                                        </div>

                                        <span
                                          className={cn(
                                            "px-2 py-1 rounded-full text-[10px] font-black",
                                            prioridadeClass(item.prioridade)
                                          )}
                                        >
                                          {item.prioridade}
                                        </span>
                                      </div>

                                      <div className="mt-3 space-y-2">
                                        <p className="text-xs text-slate-500">{item.setor}</p>
                                        <div className="flex items-center justify-between text-[11px]">
                                          <span className="text-slate-400">
                                            {item.responsavelTratativa}
                                          </span>
                                          <span
                                            className={cn(
                                              "font-black",
                                              getSlaStatus(item) === "Atrasado"
                                                ? "text-red-600"
                                                : "text-emerald-600"
                                            )}
                                          >
                                            {getSlaStatus(item)}
                                          </span>
                                        </div>
                                      </div>
                                    </button>
                                  ))
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* DETALHE */}
                  <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Painel do Registro</h3>

                    {!selected ? (
                      <div className="text-sm text-slate-400 font-medium">
                        Selecione um registro para visualizar detalhes, auditoria e avançar no workflow.
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                          <div>
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest">
                                {selected.numero}
                              </span>
                              <span
                                className={cn(
                                  "px-3 py-1 rounded-full text-[11px] font-black border",
                                  statusClass(selected.status)
                                )}
                              >
                                {statusLabel(selected.status)}
                              </span>
                              <span className="px-3 py-1 rounded-full text-[11px] font-black border bg-slate-50 text-slate-600 border-slate-200">
                                {tipoLabel(selected.tipo)}
                              </span>
                            </div>

                            <h4 className="text-xl font-bold text-slate-900">{selected.titulo}</h4>
                            <p className="text-sm text-slate-500 mt-2 max-w-4xl">
                              {selected.descricao}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {selected.status !== "ANALISE" && selected.status !== "CANCELADO" && (
                              <button
                                onClick={() => moverStatus(selected.id, "ANALISE")}
                                className="px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-bold hover:bg-violet-700 transition-all"
                              >
                                Enviar para análise
                              </button>
                            )}

                            {selected.status !== "TRATATIVA" && selected.status !== "CANCELADO" && (
                              <button
                                onClick={() => moverStatus(selected.id, "TRATATIVA")}
                                className="px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 transition-all"
                              >
                                Enviar para tratativa
                              </button>
                            )}

                            {selected.status !== "VALIDACAO" &&
                              selected.status !== "CANCELADO" && (
                                <button
                                  onClick={() => moverStatus(selected.id, "VALIDACAO")}
                                  className="px-4 py-2 rounded-xl bg-cyan-600 text-white text-sm font-bold hover:bg-cyan-700 transition-all"
                                >
                                  Enviar para validação
                                </button>
                              )}

                            {selected.status !== "CONCLUIDO" &&
                              selected.status !== "CANCELADO" && (
                                <button
                                  onClick={() => moverStatus(selected.id, "CONCLUIDO")}
                                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-all"
                                >
                                  Concluir
                                </button>
                              )}

                            {selected.status !== "CANCELADO" && (
                              <button
                                onClick={() => moverStatus(selected.id, "CANCELADO")}
                                className="px-4 py-2 rounded-xl bg-slate-700 text-white text-sm font-bold hover:bg-slate-800 transition-all"
                              >
                                Cancelar
                              </button>
                            )}

                            <button
                              onClick={() => excluirRegistro(selected.id)}
                              className="px-4 py-2 rounded-xl bg-red-50 text-red-700 border border-red-200 text-sm font-bold hover:bg-red-100 transition-all"
                            >
                              Excluir
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <InfoCard label="Setor" value={selected.setor} />
                          <InfoCard label="Área notificante" value={selected.areaNotificante} />
                          <InfoCard label="Responsável" value={selected.responsavelTratativa} />
                          <InfoCard label="Data ocorrência" value={selected.dataOcorrencia} />
                          <InfoCard label="Local" value={selected.localOcorrencia || "-"} />
                          <InfoCard label="Prioridade" value={selected.prioridade} />
                          <InfoCard label="SLA" value={getSlaStatus(selected)} />
                          <InfoCard
                            label="Template vinculado"
                            value={selected.templateId || "Não vinculado"}
                          />
                          <InfoCard
                            label="Notificador"
                            value={
                              selected.anonimo
                                ? "Anônimo"
                                : selected.nomeNotificador || "Não informado"
                            }
                          />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <TextBlock title="Ação imediata" text={selected.acaoImediata || "-"} />
                          <TextBlock title="Causa raiz" text={selected.causaRaiz || "-"} />
                          <TextBlock title="Conclusão" text={selected.conclusao || "-"} />
                          <TextBlock
                            title="Motivo de cancelamento"
                            text={selected.motivoCancelamento || "-"}
                          />
                        </div>

                        <div>
                          <h5 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-3">
                            Plano de ação
                          </h5>

                          {selected.planoAcao.length === 0 ? (
                            <div className="text-sm text-slate-400">Sem plano de ação cadastrado.</div>
                          ) : (
                            <div className="space-y-3">
                              {selected.planoAcao.map((pa) => (
                                <div
                                  key={pa.id}
                                  className="border border-slate-100 rounded-2xl p-4 bg-slate-50"
                                >
                                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                                    <div>
                                      <p className="font-bold text-slate-800">{pa.descricao}</p>
                                      <p className="text-xs text-slate-500 mt-1">
                                        Responsável: {pa.responsavel} • Prazo: {pa.prazo || "-"}
                                      </p>
                                    </div>

                                    <span className="px-3 py-1 rounded-full bg-white border border-slate-200 text-[11px] font-black text-slate-600">
                                      {pa.status}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div>
                          <h5 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-3">
                            Histórico / Audit Trail
                          </h5>

                          <div className="space-y-3">
                            {selected.historico.map((h) => (
                              <div key={h.id} className="border-l-4 border-indigo-200 pl-4 py-1">
                                <p className="text-sm font-bold text-slate-700">{h.acao}</p>
                                <p className="text-xs text-slate-500 mt-1">
                                  {h.data} • {h.autor}
                                </p>
                                {h.observacao && (
                                  <p className="text-xs text-slate-500 mt-1">{h.observacao}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* COLUNA DIREITA - FORMULÁRIO */}
            <div className="xl:col-span-4">
              <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm sticky top-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">Novo Registro</h2>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                      Cadastro estruturado com workflow, classificação e rastreabilidade.
                    </p>
                  </div>

                  <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                    <Plus className="w-5 h-5 text-indigo-600" />
                  </div>
                </div>

                <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-1">
                  <SectionTitle title="Identificação" />

                  <div>
                    <FieldLabel label="Tipo de ocorrência" />
                    <select
                      value={form.tipo}
                      onChange={(e) =>
                        setForm({ ...form, tipo: e.target.value as Exclude<ModuloTipo, "TEMPLATE"> })
                      }
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:bg-white focus:border-indigo-500"
                    >
                      <option value="NAO_CONFORMIDADE">Não conformidade</option>
                      <option value="INCIDENTE">Notificação de incidente</option>
                      <option value="MELHORIA">Oportunidade de melhoria</option>
                      <option value="OUVIDORIA">Ouvidoria</option>
                    </select>
                  </div>

                  <div>
                    <FieldLabel label="Template de formulário" />
                    <select
                      value={form.templateId || ""}
                      onChange={(e) => setForm({ ...form, templateId: e.target.value })}
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:bg-white focus:border-indigo-500"
                    >
                      <option value="">Sem template vinculado</option>
                      {templates
                        .filter((t) => t.tipoVinculado === form.tipo)
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.nome}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <FieldLabel label="Título" />
                    <input
                      value={form.titulo}
                      onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:bg-white focus:border-indigo-500"
                      placeholder="Título objetivo da ocorrência"
                    />
                  </div>

                  <div>
                    <FieldLabel label="Descrição" />
                    <textarea
                      value={form.descricao}
                      onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                      className="w-full min-h-[110px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none focus:bg-white focus:border-indigo-500 resize-none"
                      placeholder="Descreva o fato com objetividade, rastreabilidade e clareza."
                    />
                  </div>

                  <SectionTitle title="Classificação e encaminhamento" />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <FieldLabel label="Setor" />
                      <select
                        value={form.setor}
                        onChange={(e) => setForm({ ...form, setor: e.target.value })}
                        className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:bg-white focus:border-indigo-500"
                      >
                        {SETORES.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <FieldLabel label="Área notificante" />
                      <select
                        value={form.areaNotificante}
                        onChange={(e) => setForm({ ...form, areaNotificante: e.target.value })}
                        className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:bg-white focus:border-indigo-500"
                      >
                        {SETORES.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <FieldLabel label="Data da ocorrência" />
                      <input
                        type="date"
                        value={form.dataOcorrencia}
                        onChange={(e) => setForm({ ...form, dataOcorrencia: e.target.value })}
                        className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:bg-white focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <FieldLabel label="Prazo de tratativa" />
                      <input
                        type="date"
                        value={form.prazoTratativa || ""}
                        onChange={(e) => setForm({ ...form, prazoTratativa: e.target.value })}
                        className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:bg-white focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <FieldLabel label="Local da ocorrência" />
                    <input
                      value={form.localOcorrencia}
                      onChange={(e) => setForm({ ...form, localOcorrencia: e.target.value })}
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:bg-white focus:border-indigo-500"
                      placeholder="Ex.: Leito, recepção, corredor, farmácia..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <FieldLabel label="Responsável pela tratativa" />
                      <select
                        value={form.responsavelTratativa}
                        onChange={(e) =>
                          setForm({ ...form, responsavelTratativa: e.target.value })
                        }
                        className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:bg-white focus:border-indigo-500"
                      >
                        {USUARIOS.map((u) => (
                          <option key={u}>{u}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <FieldLabel label="Perfil responsável" />
                      <select
                        value={form.perfilResponsavel}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            perfilResponsavel: e.target.value as PerfilAcesso,
                          })
                        }
                        className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:bg-white focus:border-indigo-500"
                      >
                        <option value="NOTIFICADOR">Notificador</option>
                        <option value="TRATADOR">Tratador</option>
                        <option value="GESTOR">Gestor</option>
                        <option value="QUALIDADE">Qualidade</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </div>

                    <div>
                      <FieldLabel label="Prioridade" />
                      <select
                        value={form.prioridade}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            prioridade: e.target.value as Ocorrencia["prioridade"],
                          })
                        }
                        className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:bg-white focus:border-indigo-500"
                      >
                        <option value="BAIXA">Baixa</option>
                        <option value="MEDIA">Média</option>
                        <option value="ALTA">Alta</option>
                        <option value="CRITICA">Crítica</option>
                      </select>
                    </div>

                    <div>
                      <FieldLabel label="Gravidade" />
                      <select
                        value={form.gravidade}
                        onChange={(e) =>
                          setForm({ ...form, gravidade: e.target.value as Gravidade })
                        }
                        className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:bg-white focus:border-indigo-500"
                      >
                        <option value="BAIXA">Baixa</option>
                        <option value="MODERADA">Moderada</option>
                        <option value="ALTA">Alta</option>
                        <option value="GRAVE">Grave</option>
                        <option value="SENTINELA">Sentinela</option>
                      </select>
                    </div>
                  </div>

                  {form.tipo === "NAO_CONFORMIDADE" && (
                    <div>
                      <FieldLabel label="Classificação da não conformidade" />
                      <select
                        value={form.classificacaoNC || ""}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            classificacaoNC: e.target.value as NaoConformidadeClassificacao,
                          })
                        }
                        className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:bg-white focus:border-indigo-500"
                      >
                        <option value="">Selecione</option>
                        <option value="PROCESSO">Processo</option>
                        <option value="DOCUMENTO">Documento</option>
                        <option value="TREINAMENTO">Treinamento</option>
                        <option value="ESTRUTURA">Estrutura</option>
                        <option value="EQUIPAMENTO">Equipamento</option>
                        <option value="FORNECEDOR">Fornecedor</option>
                        <option value="OUTRO">Outro</option>
                      </select>
                    </div>
                  )}

                  {form.tipo === "INCIDENTE" && (
                    <>
                      <div>
                        <FieldLabel label="Classificação do incidente" />
                        <select
                          value={form.classificacaoIncidente || ""}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              classificacaoIncidente: e.target.value as IncidenteClassificacao,
                            })
                          }
                          className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:bg-white focus:border-indigo-500"
                        >
                          <option value="">Selecione</option>
                          <option value="QUEDA">Queda</option>
                          <option value="MEDICACAO">Medicação</option>
                          <option value="IDENTIFICACAO">Identificação</option>
                          <option value="LESAO_PRESSAO">Lesão por pressão</option>
                          <option value="INFECCAO">Infecção</option>
                          <option value="PROCEDIMENTO">Procedimento</option>
                          <option value="OUTRO">Outro</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <FieldLabel label="Código do paciente" />
                          <input
                            value={form.pacienteCodigo || ""}
                            onChange={(e) =>
                              setForm({ ...form, pacienteCodigo: e.target.value })
                            }
                            className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:bg-white focus:border-indigo-500"
                            placeholder="Identificação restrita"
                          />
                        </div>

                        <div className="flex items-end">
                          <label className="flex items-center gap-3 text-sm font-medium text-slate-700 h-11">
                            <input
                              type="checkbox"
                              checked={!!form.danoPaciente}
                              onChange={(e) =>
                                setForm({ ...form, danoPaciente: e.target.checked })
                              }
                              className="w-4 h-4"
                            />
                            Houve dano ao paciente
                          </label>
                        </div>
                      </div>
                    </>
                  )}

                  {form.tipo === "MELHORIA" && (
                    <div>
                      <FieldLabel label="Classificação da melhoria" />
                      <select
                        value={form.classificacaoMelhoria || ""}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            classificacaoMelhoria: e.target.value as MelhoriaClassificacao,
                          })
                        }
                        className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:bg-white focus:border-indigo-500"
                      >
                        <option value="">Selecione</option>
                        <option value="PROCESSO">Processo</option>
                        <option value="SEGURANCA">Segurança</option>
                        <option value="EXPERIENCIA">Experiência</option>
                        <option value="EFICIENCIA">Eficiência</option>
                        <option value="CUSTO">Custo</option>
                        <option value="INOVACAO">Inovação</option>
                        <option value="OUTRO">Outro</option>
                      </select>
                    </div>
                  )}

                  {form.tipo === "OUVIDORIA" && (
                    <div>
                      <FieldLabel label="Classificação da manifestação" />
                      <select
                        value={form.classificacaoOuvidoria || ""}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            classificacaoOuvidoria: e.target.value as ClassificacaoOuvidoria,
                          })
                        }
                        className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:bg-white focus:border-indigo-500"
                      >
                        <option value="">Selecione</option>
                        <option value="ELOGIO">Elogio</option>
                        <option value="RECLAMACAO">Reclamação</option>
                        <option value="MANIFESTACAO">Manifestação</option>
                        <option value="SUGESTAO">Sugestão</option>
                      </select>
                    </div>
                  )}

                  <SectionTitle title="Privacidade e análise" />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                    <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={form.anonimo}
                        onChange={(e) => setForm({ ...form, anonimo: e.target.checked })}
                        className="w-4 h-4"
                      />
                      Registro anônimo
                    </label>

                    <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={form.identificacaoRestrita}
                        onChange={(e) =>
                          setForm({ ...form, identificacaoRestrita: e.target.checked })
                        }
                        className="w-4 h-4"
                      />
                      Dados sensíveis restritos
                    </label>
                  </div>

                  {!form.anonimo && (
                    <div>
                      <FieldLabel label="Nome do notificador" />
                      <input
                        value={form.nomeNotificador || ""}
                        onChange={(e) =>
                          setForm({ ...form, nomeNotificador: e.target.value })
                        }
                        className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:bg-white focus:border-indigo-500"
                        placeholder="Nome do profissional/notificador"
                      />
                    </div>
                  )}

                  <div>
                    <FieldLabel label="Ação imediata" />
                    <textarea
                      value={form.acaoImediata || ""}
                      onChange={(e) => setForm({ ...form, acaoImediata: e.target.value })}
                      className="w-full min-h-[90px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none focus:bg-white focus:border-indigo-500 resize-none"
                      placeholder="Ações adotadas no momento do registro."
                    />
                  </div>

                  <div>
                    <FieldLabel label="Causa raiz / análise preliminar" />
                    <textarea
                      value={form.causaRaiz || ""}
                      onChange={(e) => setForm({ ...form, causaRaiz: e.target.value })}
                      className="w-full min-h-[90px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none focus:bg-white focus:border-indigo-500 resize-none"
                      placeholder="Análise preliminar da causa raiz."
                    />
                  </div>

                  <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">Plano de ação</h4>
                        <p className="text-xs text-slate-500 font-medium mt-1">
                          Registre ações corretivas, preventivas ou de melhoria.
                        </p>
                      </div>

                      <button
                        onClick={addPlanoAcao}
                        className="px-3 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-all"
                      >
                        Adicionar
                      </button>
                    </div>

                    <div className="space-y-4">
                      {form.planoAcao.map((pa) => (
                        <div key={pa.id} className="bg-white border border-slate-200 rounded-2xl p-4">
                          <div className="grid grid-cols-1 gap-3">
                            <input
                              value={pa.descricao}
                              onChange={(e) =>
                                updatePlanoAcao(pa.id, "descricao", e.target.value)
                              }
                              className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:bg-white focus:border-indigo-500"
                              placeholder="Descrição da ação"
                            />

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <select
                                value={pa.responsavel}
                                onChange={(e) =>
                                  updatePlanoAcao(pa.id, "responsavel", e.target.value)
                                }
                                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:bg-white focus:border-indigo-500"
                              >
                                {USUARIOS.map((u) => (
                                  <option key={u}>{u}</option>
                                ))}
                              </select>

                              <input
                                type="date"
                                value={pa.prazo}
                                onChange={(e) => updatePlanoAcao(pa.id, "prazo", e.target.value)}
                                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:bg-white focus:border-indigo-500"
                              />

                              <div className="flex gap-2">
                                <select
                                  value={pa.status}
                                  onChange={(e) =>
                                    updatePlanoAcao(
                                      pa.id,
                                      "status",
                                      e.target.value as PlanoAcaoStatus
                                    )
                                  }
                                  className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:bg-white focus:border-indigo-500"
                                >
                                  <option value="PENDENTE">Pendente</option>
                                  <option value="EM_ANDAMENTO">Em andamento</option>
                                  <option value="CONCLUIDO">Concluído</option>
                                </select>

                                <button
                                  onClick={() => removePlanoAcao(pa.id)}
                                  className="w-11 h-11 shrink-0 rounded-2xl border border-red-200 bg-red-50 text-red-600 flex items-center justify-center"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      {form.planoAcao.length === 0 && (
                        <div className="text-sm text-slate-400 font-medium">
                          Nenhuma ação cadastrada.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 flex gap-3">
                    <button
                      onClick={salvarOcorrencia}
                      className="flex-1 h-12 rounded-2xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Salvar registro
                    </button>

                    <button
                      onClick={() => resetForm(form.tipo)}
                      className="h-12 px-4 rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
                    >
                      Limpar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* RODAPÉ */}
        <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <RodapeCard
              icon={<ShieldAlert className="w-5 h-5 text-indigo-600" />}
              title="Governança"
              text="Fluxo estruturado com rastreabilidade, status, responsáveis e histórico completo."
            />
            <RodapeCard
              icon={<User className="w-5 h-5 text-indigo-600" />}
              title="LGPD"
              text="Suporte a anonimização, dados restritos e controle mais seguro de identificação."
            />
            <RodapeCard
              icon={<QrCode className="w-5 h-5 text-indigo-600" />}
              title="QR Code"
              text="Templates podem ser publicados externamente para coleta rápida e padronizada."
            />
            <RodapeCard
              icon={<BarChart3 className="w-5 h-5 text-indigo-600" />}
              title="Indicadores"
              text="Base pronta para SLA, dashboards, reincidência, tendência e performance da tratativa."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────
 * SUBCOMPONENTS
 * ────────────────────────────────────────────────────────────────────────────*/

function KpiCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
      <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">{label}</p>
      <p className="text-2xl font-black text-slate-900 mt-2">{value}</p>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
      <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">{label}</p>
      <p className="text-sm font-bold text-slate-800 mt-2">{value || "-"}</p>
    </div>
  );
}

function TextBlock({ title, text }: { title: string; text: string }) {
  return (
    <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50">
      <h5 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-2">
        {title}
      </h5>
      <p className="text-sm text-slate-700 leading-relaxed">{text}</p>
    </div>
  );
}

function FieldLabel({ label }: { label: string }) {
  return (
    <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2">
      {label}
    </label>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="pt-1">
      <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
        {title}
      </h3>
    </div>
  );
}

function RodapeCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5">
      <div className="mb-3">{icon}</div>
      <h4 className="text-sm font-bold text-slate-800">{title}</h4>
      <p className="text-xs text-slate-500 font-medium mt-2 leading-relaxed">{text}</p>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="bg-slate-50 border border-slate-100 rounded-3xl p-5">
      <div className="mb-3">{icon}</div>
      <h4 className="text-sm font-bold text-slate-800">{title}</h4>
      <p className="text-xs text-slate-500 font-medium mt-2 leading-relaxed">{text}</p>
    </div>
  );
}

function MiniInfo({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
      <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">{title}</p>
      <p className="text-sm font-bold text-slate-800 mt-2">{value}</p>
    </div>
  );
}