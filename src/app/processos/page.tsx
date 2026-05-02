"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  Cpu,
  Download,
  FileCheck,
  FileText,
  FolderArchive,
  Gauge,
  GitMerge,
  GripVertical,
  History,
  Link2,
  MessageSquare,
  Network,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  TimerReset,
  Users,
  Workflow,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { carregarPerfilUsuario } from "@/lib/perfil";

type ViewState = "home" | "list" | "sipoc" | "raci" | "vsm";
type ModuloAtivo = "SIPOC" | "BPMN";
type StrategicModule = "SIPOC" | "BPMN" | "RACI" | "VSM";
type PastaStatus =
  | "EM_ELABORACAO"
  | "EM_VERIFICACAO"
  | "REPOSITORIO"
  | "OBSOLETO";

type ProcessoItem = {
  id: string;
  code: string;
  name: string;
  owner: string;
  version: number;
  module: ModuloAtivo;
  status: PastaStatus;
  updatedAt?: string;
};

type SipocRow = {
  id: string;
  fornecedor: string;
  entrada: string;
  acordoEntrada: string;
  etapa: string;
  saida: string;
  acordoSaida: string;
  cliente: string;
  slaEsperado: number;
  slaReal: number;
};

type RaciRow = {
  id: string;
  tarefa: string;
  responsavel: string;
  aprovador: string;
  consultado: string;
  informado: string;
};

type VsmRow = {
  id: string;
  etapa: string;
  execucao: number;
  espera: number;
  valor: "VA" | "NVA" | "NNVA";
};

type SipocWorkspace = "catalogo" | "editor";
type SipocWizardStep = "identificacao" | "quadro" | "indicadores" | "interacoes";
type SipocCatalogFilter = "TODOS" | "REPOSITORIO" | "PIPELINE" | "OBSOLETO";
type SipocClassification = "ASSISTENCIAL" | "APOIO" | "GERENCIAL" | "ESTRATEGICO";
type SipocWorkflowStatus =
  | "RASCUNHO"
  | "EM_REVISAO"
  | "EM_APROVACAO"
  | "APROVADO"
  | "OBSOLETO";
type IndicatorCategory = "ESTRUTURA" | "PROCESSO" | "RESULTADO" | "ESTRATEGICO";
type RiskCategory = "ASSISTENCIAL" | "OPERACIONAL" | "FINANCEIRO" | "REPUTACIONAL";

type SipocProfile = {
  nome: string;
  codigo: string;
  setor: string;
  versao: string;
  classificacao: SipocClassification;
  status: SipocWorkflowStatus;
  emissao: string;
  dono: string;
  aprovador: string;
};

type SipocCatalogItem = {
  id: string;
  nome: string;
  codigo: string;
  setor: string;
  versao: string;
  classificacao: SipocClassification;
  status: SipocWorkflowStatus;
  dono: string;
  atualizadoEm: string;
  etapas: number;
  indicadores: number;
  riscos: number;
};

type SipocIndicator = {
  id: string;
  nome: string;
  categoria: IndicatorCategory;
  meta: string;
  atual: string;
  unidade: string;
};

type SipocRisk = {
  id: string;
  nome: string;
  categoria: RiskCategory;
  probabilidade: number;
  impacto: number;
  planoAcao: string;
  controles: string;
};

type SipocStage = {
  id: string;
  nome: string;
  responsavel: string;
  sla: number;
  riskIds: string[];
  indicatorIds: string[];
  bpmLink: string;
  documentLink: string;
  comentario: string;
};

function cn(...items: Array<string | false | null | undefined>) {
  return items.filter(Boolean).join(" ");
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const STATUS_META: Record<
  PastaStatus,
  {
    label: string;
    badge: string;
    dot: string;
  }
> = {
  REPOSITORIO: {
    label: "Repositório",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  EM_ELABORACAO: {
    label: "Em elaboração",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
  },
  EM_VERIFICACAO: {
    label: "Em verificação",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
  OBSOLETO: {
    label: "Obsoleto",
    badge: "bg-slate-100 text-slate-600 border-slate-200",
    dot: "bg-slate-400",
  },
};

const DEFAULT_SIPOC_ROWS: SipocRow[] = [
  {
    id: "sipoc-1",
    fornecedor: "Diretoria",
    entrada: "Diretriz estratégica",
    acordoEntrada: "Diretriz aprovada e comunicada em até 48h",
    etapa: "Planejar processo",
    saida: "Escopo aprovado",
    acordoSaida: "Escopo validado com dono do processo",
    cliente: "Gestor do processo",
    slaEsperado: 48,
    slaReal: 32,
  },
  {
    id: "sipoc-2",
    fornecedor: "Cliente interno",
    entrada: "Solicitação validada",
    acordoEntrada: "Solicitação completa, registrada e priorizada",
    etapa: "Executar atividade crítica",
    saida: "Entrega operacional",
    acordoSaida: "Entrega conforme requisito e prazo acordado",
    cliente: "Área solicitante",
    slaEsperado: 24,
    slaReal: 29,
  },
  {
    id: "sipoc-3",
    fornecedor: "Qualidade",
    entrada: "Checklist de controle",
    acordoEntrada: "Checklist vigente preenchido sem campos críticos ausentes",
    etapa: "Verificar conformidade",
    saida: "Parecer técnico",
    acordoSaida: "Parecer emitido com evidência e recomendação",
    cliente: "Dono do processo",
    slaEsperado: 12,
    slaReal: 8,
  },
];

const SIPOC_CLASSIFICATION_META: Record<
  SipocClassification,
  { label: string; description: string }
> = {
  ASSISTENCIAL: {
    label: "Processo Assistencial / Operacional",
    description: "Fluxo diretamente relacionado ao cuidado ou operação principal.",
  },
  APOIO: {
    label: "Processo de Apoio",
    description: "Sustenta a operação com recursos, suporte ou infraestrutura.",
  },
  GERENCIAL: {
    label: "Processo Gerencial",
    description: "Coordena rotinas, metas, pessoas e resultados táticos.",
  },
  ESTRATEGICO: {
    label: "Processo Estratégico",
    description: "Direciona decisões executivas, governança e desempenho.",
  },
};

const SIPOC_WORKFLOW_META: Record<
  SipocWorkflowStatus,
  { label: string; tone: string }
> = {
  RASCUNHO: {
    label: "Rascunho",
    tone: "border-slate-200 bg-slate-50 text-slate-600",
  },
  EM_REVISAO: {
    label: "Em revisão",
    tone: "border-blue-200 bg-blue-50 text-blue-700",
  },
  EM_APROVACAO: {
    label: "Em aprovação",
    tone: "border-amber-200 bg-amber-50 text-amber-700",
  },
  APROVADO: {
    label: "Aprovado",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  OBSOLETO: {
    label: "Obsoleto",
    tone: "border-red-200 bg-red-50 text-red-700",
  },
};

const INDICATOR_CATEGORY_META: Record<
  IndicatorCategory,
  { label: string; tone: string }
> = {
  ESTRUTURA: {
    label: "Estrutura",
    tone: "border-slate-200 bg-slate-50 text-slate-700",
  },
  PROCESSO: {
    label: "Processo",
    tone: "border-blue-200 bg-blue-50 text-blue-700",
  },
  RESULTADO: {
    label: "Resultado",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  ESTRATEGICO: {
    label: "Estratégico",
    tone: "border-violet-200 bg-violet-50 text-violet-700",
  },
};

const RISK_CATEGORY_META: Record<RiskCategory, { label: string; tone: string }> = {
  ASSISTENCIAL: {
    label: "Assistencial",
    tone: "border-red-200 bg-red-50 text-red-700",
  },
  OPERACIONAL: {
    label: "Operacional",
    tone: "border-amber-200 bg-amber-50 text-amber-700",
  },
  FINANCEIRO: {
    label: "Financeiro",
    tone: "border-blue-200 bg-blue-50 text-blue-700",
  },
  REPUTACIONAL: {
    label: "Reputacional",
    tone: "border-violet-200 bg-violet-50 text-violet-700",
  },
};

const DEFAULT_SIPOC_PROFILE: SipocProfile = {
  nome: "Atendimento e Resolução de Solicitações",
  codigo: "SIPOC.PROC.001",
  setor: "Qualidade",
  versao: "01",
  classificacao: "ASSISTENCIAL",
  status: "RASCUNHO",
  emissao: "28/04/2026",
  dono: "Gestor do Processo",
  aprovador: "Diretoria Executiva",
};

const DEFAULT_SIPOC_CATALOG: SipocCatalogItem[] = [
  {
    id: "sipoc-doc-1",
    nome: DEFAULT_SIPOC_PROFILE.nome,
    codigo: DEFAULT_SIPOC_PROFILE.codigo,
    setor: DEFAULT_SIPOC_PROFILE.setor,
    versao: DEFAULT_SIPOC_PROFILE.versao,
    classificacao: DEFAULT_SIPOC_PROFILE.classificacao,
    status: DEFAULT_SIPOC_PROFILE.status,
    dono: DEFAULT_SIPOC_PROFILE.dono,
    atualizadoEm: "28/04/2026",
    etapas: 4,
    indicadores: 4,
    riscos: 3,
  },
  {
    id: "sipoc-doc-2",
    nome: "Gestão de Documentos Controlados",
    codigo: "SIPOC.DOC.002",
    setor: "Qualidade",
    versao: "01",
    classificacao: "APOIO",
    status: "EM_REVISAO",
    dono: "Coordenação da Qualidade",
    atualizadoEm: "27/04/2026",
    etapas: 5,
    indicadores: 3,
    riscos: 2,
  },
  {
    id: "sipoc-doc-3",
    nome: "Revisão Estratégica do SGQ",
    codigo: "SIPOC.SGQ.003",
    setor: "Diretoria Executiva",
    versao: "02",
    classificacao: "ESTRATEGICO",
    status: "APROVADO",
    dono: "Diretoria Executiva",
    atualizadoEm: "25/04/2026",
    etapas: 6,
    indicadores: 5,
    riscos: 4,
  },
];

const DEFAULT_SIPOC_INDICATORS: SipocIndicator[] = [
  {
    id: "ind-estrutura-1",
    nome: "Disponibilidade da equipe",
    categoria: "ESTRUTURA",
    meta: "95",
    atual: "92",
    unidade: "%",
  },
  {
    id: "ind-processo-1",
    nome: "Cumprimento de SLA",
    categoria: "PROCESSO",
    meta: "90",
    atual: "83",
    unidade: "%",
  },
  {
    id: "ind-resultado-1",
    nome: "Resolutividade na primeira tratativa",
    categoria: "RESULTADO",
    meta: "85",
    atual: "78",
    unidade: "%",
  },
  {
    id: "ind-estrategico-1",
    nome: "Satisfação do cliente interno",
    categoria: "ESTRATEGICO",
    meta: "4.5",
    atual: "4.2",
    unidade: "/5",
  },
];

const DEFAULT_SIPOC_RISKS: SipocRisk[] = [
  {
    id: "risk-1",
    nome: "Atraso na análise da solicitação",
    categoria: "OPERACIONAL",
    probabilidade: 4,
    impacto: 3,
    planoAcao: "Revisar dimensionamento e fila de priorização",
    controles: "Painel diário de SLA e alerta de atraso",
  },
  {
    id: "risk-2",
    nome: "Falha na comunicação com o cliente interno",
    categoria: "REPUTACIONAL",
    probabilidade: 3,
    impacto: 4,
    planoAcao: "Padronizar mensagem de retorno e responsáveis",
    controles: "Checklist de comunicação e trilha de auditoria",
  },
  {
    id: "risk-3",
    nome: "Execução fora do protocolo aprovado",
    categoria: "ASSISTENCIAL",
    probabilidade: 2,
    impacto: 5,
    planoAcao: "Reciclagem do POP e auditoria amostral",
    controles: "POP vigente, dupla checagem e registro formal",
  },
];

const DEFAULT_SIPOC_STAGES: SipocStage[] = [
  {
    id: "stage-1",
    nome: "Receber demanda",
    responsavel: "Analista do processo",
    sla: 4,
    riskIds: ["risk-2"],
    indicatorIds: ["ind-processo-1"],
    bpmLink: "/modelagem",
    documentLink: "/documentos",
    comentario: "Entrada formal com registro obrigatório.",
  },
  {
    id: "stage-2",
    nome: "Analisar requisitos",
    responsavel: "Qualidade",
    sla: 12,
    riskIds: ["risk-1"],
    indicatorIds: ["ind-estrutura-1", "ind-processo-1"],
    bpmLink: "/modelagem",
    documentLink: "/documentos",
    comentario: "Validar critérios antes de encaminhar.",
  },
  {
    id: "stage-3",
    nome: "Executar tratativa",
    responsavel: "Dono do processo",
    sla: 24,
    riskIds: ["risk-3"],
    indicatorIds: ["ind-resultado-1"],
    bpmLink: "/modelagem",
    documentLink: "/documentos",
    comentario: "Execução deve seguir POP vigente.",
  },
  {
    id: "stage-4",
    nome: "Validar e encerrar",
    responsavel: "Gestor da área",
    sla: 8,
    riskIds: ["risk-2"],
    indicatorIds: ["ind-estrategico-1"],
    bpmLink: "/modelagem",
    documentLink: "/documentos",
    comentario: "Encerrar com retorno ao cliente interno.",
  },
];

const DEFAULT_RACI_ROWS: RaciRow[] = [
  {
    id: "raci-1",
    tarefa: "Receber solicitação",
    responsavel: "Analista do processo",
    aprovador: "Gestor da área",
    consultado: "Qualidade",
    informado: "Diretoria",
  },
  {
    id: "raci-2",
    tarefa: "Validar requisito",
    responsavel: "Qualidade",
    aprovador: "Coordenador",
    consultado: "Jurídico",
    informado: "Área solicitante",
  },
  {
    id: "raci-3",
    tarefa: "Publicar processo",
    responsavel: "",
    aprovador: "Gestor; Diretoria",
    consultado: "TI",
    informado: "Todos os envolvidos",
  },
];

const DEFAULT_VSM_ROWS: VsmRow[] = [
  {
    id: "vsm-1",
    etapa: "Entrada da demanda",
    execucao: 1,
    espera: 4,
    valor: "NNVA",
  },
  {
    id: "vsm-2",
    etapa: "Análise técnica",
    execucao: 3,
    espera: 12,
    valor: "VA",
  },
  {
    id: "vsm-3",
    etapa: "Aprovação",
    execucao: 1,
    espera: 18,
    valor: "NVA",
  },
  {
    id: "vsm-4",
    etapa: "Publicação",
    execucao: 2,
    espera: 3,
    valor: "VA",
  },
];

function StatusBadge({ status }: { status: PastaStatus }) {
  const meta = STATUS_META[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest",
        meta.badge
      )}
    >
      <span className={cn("h-2 w-2 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}

function ModuleDashboardCard({
  title,
  subtitle,
  value,
  icon,
  accent,
  onClick,
}: {
  title: string;
  subtitle: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  accent: "emerald" | "blue" | "amber" | "violet";
  onClick: () => void;
}) {
  const palette = {
    emerald: "bg-emerald-50 border-emerald-100 text-emerald-600",
    blue: "bg-blue-50 border-blue-100 text-[#2655e8]",
    amber: "bg-amber-50 border-amber-100 text-amber-600",
    violet: "bg-violet-50 border-violet-100 text-violet-600",
  }[accent];

  const hoverBorder = {
    emerald: "hover:border-emerald-400",
    blue: "hover:border-[#2655e8]",
    amber: "hover:border-amber-400",
    violet: "hover:border-violet-400",
  }[accent];

  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex h-32 flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
        hoverBorder
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg border shadow-sm",
            palette
          )}
        >
          {icon}
        </div>
        <span className="text-2xl font-black text-slate-950">{value}</span>
      </div>

      <div>
        <p className="text-[11px] font-black uppercase leading-tight text-slate-900">
          {title}
        </p>
        <p className="mt-0.5 text-[10px] font-medium leading-snug text-slate-500">
          {subtitle}
        </p>
      </div>
    </button>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  icon,
  tone = "slate",
}: {
  title: string;
  value: React.ReactNode;
  subtitle: string;
  icon: React.ReactNode;
  tone?: "slate" | "blue" | "emerald" | "amber" | "red" | "violet";
}) {
  const palette = {
    slate: "bg-slate-100 text-slate-600 border-slate-200",
    blue: "bg-blue-50 text-[#2655e8] border-blue-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    red: "bg-red-50 text-red-600 border-red-100",
    violet: "bg-violet-50 text-violet-600 border-violet-100",
  }[tone];

  return (
    <div className="flex h-28 flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg border",
            palette
          )}
        >
          {icon}
        </div>
        <span className="text-2xl font-black text-slate-950">{value}</span>
      </div>

      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
          {title}
        </p>
        <p className="mt-0.5 text-xs font-medium text-slate-500">{subtitle}</p>
      </div>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
  action,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
        <div>
          <h3 className="text-lg font-black text-slate-950">{title}</h3>
          {subtitle && (
            <p className="mt-1 text-sm font-medium text-slate-500">{subtitle}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function TableInput({
  value,
  onChange,
  type = "text",
  className,
}: {
  value: string | number;
  onChange: (value: string) => void;
  type?: "text" | "number";
  className?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={cn(
        "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#2655e8] focus:ring-4 focus:ring-[#2655e8]/10",
        className
      )}
    />
  );
}

function formatDate(date?: string) {
  if (!date) return "Sem data";

  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(date));
  } catch {
    return date;
  }
}

function approverCount(value: string) {
  return value
    .split(/[,;/]+/)
    .map((item) => item.trim())
    .filter(Boolean).length;
}

function riskScoreMeta(score: number) {
  if (score >= 16) {
    return {
      label: "Crítico",
      tone: "border-red-200 bg-red-50 text-red-700",
      bar: "bg-red-500",
    };
  }

  if (score >= 10) {
    return {
      label: "Alto",
      tone: "border-amber-200 bg-amber-50 text-amber-700",
      bar: "bg-amber-500",
    };
  }

  if (score >= 5) {
    return {
      label: "Moderado",
      tone: "border-blue-200 bg-blue-50 text-blue-700",
      bar: "bg-blue-500",
    };
  }

  return {
    label: "Baixo",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
    bar: "bg-emerald-500",
  };
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default function ProcessosPage() {
  const router = useRouter();

  const [viewState, setViewState] = useState<ViewState>("home");
  const [moduloAtivo, setModuloAtivo] = useState<ModuloAtivo>("BPMN");
  const [pastaAtiva, setPastaAtiva] = useState<PastaStatus>("REPOSITORIO");
  const [items, setItems] = useState<ProcessoItem[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sortField, setSortField] = useState<"name" | "code" | "updatedAt">(
    "updatedAt"
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [sipocRows, setSipocRows] = useState<SipocRow[]>(DEFAULT_SIPOC_ROWS);
  const [sipocWorkspace, setSipocWorkspace] =
    useState<SipocWorkspace>("catalogo");
  const [selectedSipocId, setSelectedSipocId] = useState<string | null>(
    DEFAULT_SIPOC_CATALOG[0]?.id ?? null
  );
  const [sipocCatalog, setSipocCatalog] = useState<SipocCatalogItem[]>(
    DEFAULT_SIPOC_CATALOG
  );
  const [sipocWizardStep, setSipocWizardStep] =
    useState<SipocWizardStep>("identificacao");
  const [sipocCatalogFilter, setSipocCatalogFilter] =
    useState<SipocCatalogFilter>("TODOS");
  const [sipocProfile, setSipocProfile] =
    useState<SipocProfile>(DEFAULT_SIPOC_PROFILE);
  const [sipocIndicators, setSipocIndicators] = useState<SipocIndicator[]>(
    DEFAULT_SIPOC_INDICATORS
  );
  const [sipocRisks, setSipocRisks] =
    useState<SipocRisk[]>(DEFAULT_SIPOC_RISKS);
  const [sipocStages, setSipocStages] =
    useState<SipocStage[]>(DEFAULT_SIPOC_STAGES);
  const [draggedSipocStageId, setDraggedSipocStageId] = useState<string | null>(
    null
  );
  const [raciRows, setRaciRows] = useState<RaciRow[]>(DEFAULT_RACI_ROWS);
  const [vsmRows, setVsmRows] = useState<VsmRow[]>(DEFAULT_VSM_ROWS);

  async function loadItems() {
    setIsLoading(true);

    try {
      const res = await fetch("/api/processos", { cache: "no-store" });

      if (!res.ok) {
        console.error("Erro HTTP ao buscar processos:", res.status);
        setItems([]);
        return;
      }

      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erro ao buscar processos:", error);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    async function carregarRiscosCadastrados() {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!session) return;

      const perfil = await carregarPerfilUsuario<{ empresa_id?: string | null }>(
        session,
        "empresa_id"
      );
      if (!perfil?.empresa_id) return;

      const { data, error } = await supabase
        .from("riscos")
        .select("*")
        .eq("empresa_id", perfil.empresa_id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error || !data?.length) return;

      const riscos = data.map((row: Record<string, unknown>): SipocRisk => ({
        id: String(row.id),
        nome: String(row.titulo ?? row.nome ?? row.descricao ?? "Risco cadastrado"),
        categoria: String(row.categoria ?? row.tipo ?? "OPERACIONAL").toUpperCase().includes("FINANCE")
          ? "FINANCEIRO"
          : String(row.categoria ?? row.tipo ?? "").toUpperCase().includes("REPUT")
            ? "REPUTACIONAL"
            : String(row.categoria ?? row.tipo ?? "").toUpperCase().includes("ASSIST")
              ? "ASSISTENCIAL"
              : "OPERACIONAL",
        probabilidade: Number(row.probabilidade ?? row.probability ?? 1) || 1,
        impacto: Number(row.impacto ?? row.impact ?? 1) || 1,
        planoAcao: String(row.plano_acao ?? row.planoAcao ?? "Plano de acao vinculado ao risco"),
        controles: String(row.controles ?? row.controle ?? "Controle existente no modulo de riscos"),
      }));

      setSipocRisks(riscos);
    }

    void carregarRiscosCadastrados();
  }, []);

  useEffect(() => {
    if (!selectedSipocId) return;

    setSipocCatalog((current) =>
      current.map((item) =>
        item.id === selectedSipocId
          ? {
              ...item,
              etapas: sipocStages.length,
              indicadores: sipocIndicators.length,
              riscos: sipocRisks.length,
            }
          : item
      )
    );
  }, [
    selectedSipocId,
    sipocStages.length,
    sipocIndicators.length,
    sipocRisks.length,
  ]);

  const docsAtuais = useMemo(
    () => items.filter((item) => item.module === moduloAtivo),
    [items, moduloAtivo]
  );

  const bpmnCount = useMemo(
    () => items.filter((item) => item.module === "BPMN").length,
    [items]
  );

  const sipocCount = useMemo(
    () => Math.max(items.filter((item) => item.module === "SIPOC").length, sipocRows.length),
    [items, sipocRows.length]
  );

  const counts = useMemo(() => {
    return docsAtuais.reduce<Record<PastaStatus, number>>(
      (acc, item) => {
        acc[item.status] += 1;
        return acc;
      },
      {
        REPOSITORIO: 0,
        EM_ELABORACAO: 0,
        EM_VERIFICACAO: 0,
        OBSOLETO: 0,
      }
    );
  }, [docsAtuais]);

  const docsFiltrados = useMemo(() => {
    const termo = search.trim().toLowerCase();
    const filtered = docsAtuais.filter((item) => {
      const matchesStatus = item.status === pastaAtiva;
      const matchesSearch =
        !termo ||
        item.code.toLowerCase().includes(termo) ||
        item.name.toLowerCase().includes(termo) ||
        item.owner.toLowerCase().includes(termo);

      return matchesStatus && matchesSearch;
    });

    return [...filtered].sort((a, b) => {
      const first = String(a[sortField] || "");
      const second = String(b[sortField] || "");
      const compare = first.localeCompare(second, "pt-BR");

      return sortDirection === "asc" ? compare : -compare;
    });
  }, [docsAtuais, pastaAtiva, search, sortDirection, sortField]);

  const sipocDentroSla = useMemo(
    () => sipocRows.filter((row) => row.slaReal <= row.slaEsperado).length,
    [sipocRows]
  );

  const sipocForaSla = sipocRows.length - sipocDentroSla;

  const sipocLinkedIndicatorIds = useMemo(
    () => new Set(sipocStages.flatMap((stage) => stage.indicatorIds)),
    [sipocStages]
  );

  const sipocLinkedRiskIds = useMemo(
    () => new Set(sipocStages.flatMap((stage) => stage.riskIds)),
    [sipocStages]
  );

  const sipocHighRiskCount = useMemo(
    () =>
      sipocRisks.filter((risk) => risk.probabilidade * risk.impacto >= 10)
        .length,
    [sipocRisks]
  );

  const sipocPerformanceAverage = useMemo(() => {
    const usable = sipocIndicators
      .map((indicator) => {
        const atual = Number(indicator.atual.replace(",", "."));
        const meta = Number(indicator.meta.replace(",", "."));
        if (!Number.isFinite(atual) || !Number.isFinite(meta) || meta === 0) {
          return null;
        }
        return Math.min(125, Math.round((atual / meta) * 100));
      })
      .filter((value): value is number => value !== null);

    if (!usable.length) return 0;

    return Math.round(
      usable.reduce((total, value) => total + value, 0) / usable.length
    );
  }, [sipocIndicators]);

  const raciSemResponsavel = useMemo(
    () => raciRows.filter((row) => !row.responsavel.trim()).length,
    [raciRows]
  );

  const raciConflitosAprovador = useMemo(
    () => raciRows.filter((row) => approverCount(row.aprovador) > 1).length,
    [raciRows]
  );

  const raciValido = raciSemResponsavel === 0 && raciConflitosAprovador === 0;

  const vsmLeadTime = useMemo(
    () => vsmRows.reduce((total, row) => total + row.execucao + row.espera, 0),
    [vsmRows]
  );

  const vsmTempoValor = useMemo(
    () =>
      vsmRows
        .filter((row) => row.valor === "VA")
        .reduce((total, row) => total + row.execucao, 0),
    [vsmRows]
  );

  const vsmEficiencia = vsmLeadTime
    ? Math.round((vsmTempoValor / vsmLeadTime) * 100)
    : 0;

  const sipocCatalogFiltrado = useMemo(() => {
    if (sipocCatalogFilter === "REPOSITORIO") {
      return sipocCatalog.filter((item) => item.status === "APROVADO");
    }
    if (sipocCatalogFilter === "PIPELINE") {
      return sipocCatalog.filter((item) =>
        ["RASCUNHO", "EM_REVISAO", "EM_APROVACAO"].includes(item.status)
      );
    }
    if (sipocCatalogFilter === "OBSOLETO") {
      return sipocCatalog.filter((item) => item.status === "OBSOLETO");
    }
    return sipocCatalog;
  }, [sipocCatalog, sipocCatalogFilter]);

  const gargalo = useMemo(
    () =>
      [...vsmRows].sort((a, b) => {
        if (b.espera !== a.espera) return b.espera - a.espera;
        return b.execucao - a.execucao;
      })[0],
    [vsmRows]
  );

  function openModule(module: StrategicModule) {
    if (module === "BPMN") {
      setModuloAtivo("BPMN");
      setPastaAtiva("REPOSITORIO");
      setViewState("list");
      return;
    }

    if (module === "SIPOC") {
      setSipocWorkspace("catalogo");
      setViewState("sipoc");
      return;
    }

    if (module === "RACI") {
      setViewState("raci");
      return;
    }

    setViewState("vsm");
  }

  function openList(status: PastaStatus, module: ModuloAtivo = moduloAtivo) {
    setModuloAtivo(module);
    setPastaAtiva(status);
    setSearch("");
    setViewState("list");
  }

  function toggleSort(field: "name" | "code" | "updatedAt") {
    if (sortField === field) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortField(field);
    setSortDirection("asc");
  }

  async function createNew(module: ModuloAtivo) {
    try {
      const res = await fetch("/api/processos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module }),
      });

      if (!res.ok) {
        console.error("Erro ao criar processo:", res.status);
        return;
      }

      const created = (await res.json()) as ProcessoItem;
      setItems((current) => [created, ...current]);
      setModuloAtivo(module);

      if (module === "BPMN") {
        router.push(`/modelagem?id=${created.id}`);
        return;
      }

      createSipocDocument();
      setViewState("sipoc");
    } catch (error) {
      console.error("Erro ao criar processo:", error);
    }
  }

  function updateSipocRow(
    id: string,
    field: keyof SipocRow,
    value: string | number
  ) {
    setSipocRows((current) =>
      current.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  }

  function updateSipocProfile(
    field: keyof SipocProfile,
    value: SipocProfile[keyof SipocProfile]
  ) {
    setSipocProfile((current) => ({ ...current, [field]: value }));

    if (!selectedSipocId) return;

    setSipocCatalog((current) =>
      current.map((item) => {
        if (item.id !== selectedSipocId) return item;

        return {
          ...item,
          nome: field === "nome" ? String(value) : item.nome,
          codigo: field === "codigo" ? String(value) : item.codigo,
          setor: field === "setor" ? String(value) : item.setor,
          versao: field === "versao" ? String(value) : item.versao,
          classificacao:
            field === "classificacao"
              ? (value as SipocClassification)
              : item.classificacao,
          status:
            field === "status" ? (value as SipocWorkflowStatus) : item.status,
          dono: field === "dono" ? String(value) : item.dono,
          atualizadoEm: new Intl.DateTimeFormat("pt-BR").format(new Date()),
        };
      })
    );
  }

  function openSipocDocument(item: SipocCatalogItem) {
    setSelectedSipocId(item.id);
    setSipocProfile({
      nome: item.nome,
      codigo: item.codigo,
      setor: item.setor,
      versao: item.versao,
      classificacao: item.classificacao,
      status: item.status,
      emissao: item.atualizadoEm,
      dono: item.dono,
      aprovador: DEFAULT_SIPOC_PROFILE.aprovador,
    });
    setSipocWizardStep("identificacao");
    setSipocWorkspace("editor");
  }

  function createSipocDocument() {
    const nextNumber = String(sipocCatalog.length + 1).padStart(3, "0");
    const today = new Intl.DateTimeFormat("pt-BR").format(new Date());
    const newItem: SipocCatalogItem = {
      id: makeId("sipoc-doc"),
      nome: "Nova SIPOC",
      codigo: `SIPOC.PROC.${nextNumber}`,
      setor: "Setor responsavel",
      versao: "01",
      classificacao: "ASSISTENCIAL",
      status: "RASCUNHO",
      dono: "Dono do processo",
      atualizadoEm: today,
      etapas: 1,
      indicadores: 0,
      riscos: 0,
    };

    setSipocCatalog((current) => [newItem, ...current]);
    setSelectedSipocId(newItem.id);
    setSipocProfile({
      nome: newItem.nome,
      codigo: newItem.codigo,
      setor: newItem.setor,
      versao: newItem.versao,
      classificacao: newItem.classificacao,
      status: newItem.status,
      emissao: newItem.atualizadoEm,
      dono: newItem.dono,
      aprovador: DEFAULT_SIPOC_PROFILE.aprovador,
    });
    setSipocRows([
      {
        id: makeId("sipoc-row"),
        fornecedor: "Novo fornecedor",
        entrada: "Nova entrada",
        acordoEntrada: "Como deve chegar",
        etapa: "Nova etapa",
        saida: "Nova saída",
        acordoSaida: "Como deve ser entregue",
        cliente: "Novo cliente",
        slaEsperado: 24,
        slaReal: 0,
      },
    ]);
    setSipocStages([
      {
        id: makeId("stage"),
        nome: "Nova etapa",
        responsavel: "Responsável",
        sla: 8,
        riskIds: [],
        indicatorIds: [],
        bpmLink: "/modelagem",
        documentLink: "/documentos",
        comentario: "",
      },
    ]);
    setSipocIndicators([]);
    setSipocWizardStep("identificacao");
    setSipocWorkspace("editor");
  }

  function updateSipocStage(
    id: string,
    field: keyof SipocStage,
    value: string | number | string[]
  ) {
    setSipocStages((current) =>
      current.map((stage) =>
        stage.id === id ? { ...stage, [field]: value } : stage
      )
    );
  }

  function updateSipocIndicator(
    id: string,
    field: keyof SipocIndicator,
    value: string
  ) {
    setSipocIndicators((current) =>
      current.map((indicator) =>
        indicator.id === id ? { ...indicator, [field]: value } : indicator
      )
    );
  }

  function updateSipocRisk(
    id: string,
    field: keyof SipocRisk,
    value: string | number
  ) {
    setSipocRisks((current) =>
      current.map((risk) => (risk.id === id ? { ...risk, [field]: value } : risk))
    );
  }

  function linkSipocStageItem(
    stageId: string,
    field: "riskIds" | "indicatorIds",
    itemId: string
  ) {
    if (!itemId) return;

    setSipocStages((current) =>
      current.map((stage) => {
        if (stage.id !== stageId || stage[field].includes(itemId)) return stage;
        return { ...stage, [field]: [...stage[field], itemId] };
      })
    );
  }

  function removeSipocStageItem(
    stageId: string,
    field: "riskIds" | "indicatorIds",
    itemId: string
  ) {
    setSipocStages((current) =>
      current.map((stage) =>
        stage.id === stageId
          ? { ...stage, [field]: stage[field].filter((id) => id !== itemId) }
          : stage
      )
    );
  }

  function moveSipocStage(targetId: string) {
    if (!draggedSipocStageId || draggedSipocStageId === targetId) return;

    setSipocStages((current) => {
      const draggedIndex = current.findIndex(
        (stage) => stage.id === draggedSipocStageId
      );
      const targetIndex = current.findIndex((stage) => stage.id === targetId);

      if (draggedIndex < 0 || targetIndex < 0) return current;

      const next = [...current];
      const [dragged] = next.splice(draggedIndex, 1);
      next.splice(targetIndex, 0, dragged);
      return next;
    });
  }

  function exportSipocPdf() {
    const classification = SIPOC_CLASSIFICATION_META[sipocProfile.classificacao];
    const workflow = SIPOC_WORKFLOW_META[sipocProfile.status];

    const columns = [
      {
        label: "S - Fornecedores",
        items: Array.from(new Set(sipocRows.map((row) => row.fornecedor))),
      },
      {
        label: "I - Entradas",
        items: Array.from(new Set(sipocRows.map((row) => row.entrada))),
      },
      {
        label: "P - Processo",
        items: sipocStages.map(
          (stage) => `${stage.nome} | ${stage.responsavel} | SLA ${stage.sla}h`
        ),
      },
      {
        label: "O - Saídas",
        items: Array.from(new Set(sipocRows.map((row) => row.saida))),
      },
      {
        label: "C - Clientes",
        items: Array.from(new Set(sipocRows.map((row) => row.cliente))),
      },
    ];

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(sipocProfile.codigo)} - SIPOC</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 32px;
              color: #0f172a;
              font-family: Inter, Arial, sans-serif;
              background: #fff;
            }
            .header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 18px;
              margin-bottom: 22px;
            }
            .brand { display: flex; gap: 12px; align-items: center; }
            .logo {
              width: 42px;
              height: 42px;
              border-radius: 10px;
              background: #2655e8;
              color: #fff;
              display: grid;
              place-items: center;
              font-weight: 900;
            }
            h1 { margin: 0; font-size: 24px; letter-spacing: -0.02em; }
            h2 { margin: 26px 0 10px; font-size: 16px; }
            .muted { color: #64748b; font-size: 12px; font-weight: 600; }
            .meta {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 10px;
              margin-bottom: 22px;
            }
            .box {
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              padding: 12px;
              min-height: 68px;
            }
            .label {
              color: #64748b;
              font-size: 9px;
              text-transform: uppercase;
              font-weight: 900;
              letter-spacing: .08em;
            }
            .value { margin-top: 5px; font-size: 13px; font-weight: 800; }
            .sipoc {
              display: grid;
              grid-template-columns: repeat(5, 1fr);
              gap: 10px;
            }
            .column {
              border: 1px solid #dbeafe;
              border-radius: 14px;
              overflow: hidden;
              min-height: 230px;
            }
            .column h3 {
              margin: 0;
              padding: 12px;
              background: #eff6ff;
              color: #1d4ed8;
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: .08em;
            }
            ul { margin: 0; padding: 12px 14px 14px 28px; }
            li { margin: 0 0 8px; font-size: 11px; line-height: 1.45; }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 8px;
              font-size: 11px;
            }
            th, td {
              border: 1px solid #e2e8f0;
              padding: 9px;
              vertical-align: top;
            }
            th {
              background: #f8fafc;
              text-align: left;
              font-size: 9px;
              text-transform: uppercase;
              letter-spacing: .08em;
              color: #475569;
            }
            .footer {
              margin-top: 28px;
              padding-top: 14px;
              border-top: 1px solid #e2e8f0;
              display: flex;
              justify-content: space-between;
              font-size: 10px;
              color: #64748b;
            }
            @media print {
              body { padding: 22px; }
              .column { break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="brand">
              <div class="logo">DQ</div>
              <div>
                <h1>DocQualis</h1>
                <div class="muted">Módulo: Gestão de Processos - SIPOC</div>
              </div>
            </div>
            <div class="muted">Padrão institucional ISO / ONA / JCI</div>
          </div>

          <div class="meta">
            <div class="box"><div class="label">Processo</div><div class="value">${escapeHtml(sipocProfile.nome)}</div></div>
            <div class="box"><div class="label">Tipo</div><div class="value">${escapeHtml(classification.label)}</div></div>
            <div class="box"><div class="label">Código / Versão</div><div class="value">${escapeHtml(sipocProfile.codigo)} - Rev. ${escapeHtml(sipocProfile.versao)}</div></div>
            <div class="box"><div class="label">Status / Emissão</div><div class="value">${escapeHtml(workflow.label)} - ${escapeHtml(sipocProfile.emissao)}</div></div>
          </div>

          <h2>Estrutura SIPOC</h2>
          <div class="sipoc">
            ${columns
              .map(
                (column) => `
                  <section class="column">
                    <h3>${escapeHtml(column.label)}</h3>
                    <ul>${column.items
                      .map((item) => `<li>${escapeHtml(item)}</li>`)
                      .join("")}</ul>
                  </section>
                `
              )
              .join("")}
          </div>

          <h2>Indicadores Vinculados</h2>
          <table>
            <thead><tr><th>Categoria</th><th>Indicador</th><th>Meta</th><th>Atual</th></tr></thead>
            <tbody>
              ${sipocIndicators
                .map(
                  (indicator) => `
                    <tr>
                      <td>${escapeHtml(INDICATOR_CATEGORY_META[indicator.categoria].label)}</td>
                      <td>${escapeHtml(indicator.nome)}</td>
                      <td>${escapeHtml(indicator.meta)}${escapeHtml(indicator.unidade)}</td>
                      <td>${escapeHtml(indicator.atual)}${escapeHtml(indicator.unidade)}</td>
                    </tr>
                  `
                )
                .join("")}
            </tbody>
          </table>

          <h2>Riscos por Etapa</h2>
          <table>
            <thead><tr><th>Etapa</th><th>Riscos</th><th>Controles</th><th>Plano de ação</th></tr></thead>
            <tbody>
              ${sipocStages
                .map((stage) => {
                  const risks = stage.riskIds
                    .map((riskId) => sipocRisks.find((risk) => risk.id === riskId))
                    .filter(Boolean) as SipocRisk[];

                  return `
                    <tr>
                      <td>${escapeHtml(stage.nome)}</td>
                      <td>${risks.map((risk) => escapeHtml(risk.nome)).join("<br/>")}</td>
                      <td>${risks.map((risk) => escapeHtml(risk.controles)).join("<br/>")}</td>
                      <td>${risks.map((risk) => escapeHtml(risk.planoAcao)).join("<br/>")}</td>
                    </tr>
                  `;
                })
                .join("")}
            </tbody>
          </table>

          <div class="footer">
            <span>Responsável: ${escapeHtml(sipocProfile.dono)}</span>
            <span>Aprovador: ${escapeHtml(sipocProfile.aprovador)}</span>
            <span>Controle de versão: Rev. ${escapeHtml(sipocProfile.versao)}</span>
          </div>

          <script>window.onload = () => setTimeout(() => window.print(), 250)</script>
        </body>
      </html>
    `;

    const win = window.open("", "_blank", "width=1280,height=900");
    if (!win) return;
    win.document.write(html);
    win.document.close();
  }

  function updateRaciRow(id: string, field: keyof RaciRow, value: string) {
    setRaciRows((current) =>
      current.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  }

  function updateVsmRow(
    id: string,
    field: keyof VsmRow,
    value: string | number
  ) {
    setVsmRows((current) =>
      current.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  }

  function renderHeader() {
    return (
      <div className="mb-8 flex flex-wrap items-start justify-between gap-6">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#2655e8]">
            <Sparkles className="h-3.5 w-3.5" />
            Gestão de Processos Enterprise
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-950">
            Gestão de Processos
          </h1>
          <p className="mt-2 max-w-2xl text-base font-medium leading-relaxed text-slate-500">
            BPM, Lean e qualidade integrados para modelar, governar e melhorar
            processos com rastreabilidade operacional.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => loadItems()}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-[#2655e8] hover:text-[#2655e8]"
          >
            <Clock3 className="h-4 w-4" />
            Atualizar
          </button>
          <button
            onClick={() => createNew("BPMN")}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#2655e8] px-5 text-sm font-bold text-white shadow-md transition hover:bg-[#1e40af]"
          >
            <Plus className="h-4 w-4" />
            Novo BPMN
          </button>
        </div>
      </div>
    );
  }

  function renderHome() {
    const totalModelos = bpmnCount + sipocRows.length;

    return (
      <>
        {renderHeader()}

        <section className="mb-6">
          <h2 className="text-2xl font-black text-slate-950">
            Dashboard de processos
          </h2>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Visão executiva de BPM, responsabilidades e eficiência Lean.
          </p>
        </section>

        <div className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          <ModuleDashboardCard
            title="Mapeamento SIPOC"
            subtitle="Cadeia cliente-fornecedor e SLA por interação"
            value={sipocCount}
            icon={<Network className="h-5 w-5" />}
            accent="emerald"
            onClick={() => openModule("SIPOC")}
          />
          <ModuleDashboardCard
            title="Studio BPM"
            subtitle="Canvas BPMN com conectores inteligentes"
            value={bpmnCount}
            icon={<Cpu className="h-5 w-5" />}
            accent="blue"
            onClick={() => openModule("BPMN")}
          />
          <ModuleDashboardCard
            title="Matriz RACI"
            subtitle="Papéis R/A/C/I vinculados às tarefas"
            value={raciRows.length}
            icon={<Users className="h-5 w-5" />}
            accent="amber"
            onClick={() => openModule("RACI")}
          />
          <ModuleDashboardCard
            title="VSM - Eficiência"
            subtitle="Lead time, valor agregado e gargalos"
            value={`${vsmEficiencia}%`}
            icon={<BarChart3 className="h-5 w-5" />}
            accent="violet"
            onClick={() => openModule("VSM")}
          />
        </div>

        <div className="grid grid-cols-1 gap-5">
          <Panel
            title="Arquitetura integrada"
            subtitle={`${totalModelos} artefato(s) monitorados entre SIPOC, BPMN, RACI e VSM.`}
          >
            <div className="grid gap-3 p-6 md:grid-cols-4">
              {[
                {
                  title: "SIPOC",
                  text: "Mapeia fornecedores, entradas, saídas, clientes e SLA.",
                  icon: <Network className="h-4 w-4" />,
                },
                {
                  title: "BPM",
                  text: "Desenha o fluxo operacional com tarefas e decisões.",
                  icon: <Workflow className="h-4 w-4" />,
                },
                {
                  title: "RACI",
                  text: "Garante dono, aprovação e comunicação por tarefa.",
                  icon: <Users className="h-4 w-4" />,
                },
                {
                  title: "VSM",
                  text: "Mede espera, execução, valor agregado e gargalos.",
                  icon: <Gauge className="h-4 w-4" />,
                },
              ].map((item, index) => (
                <div
                  key={item.title}
                  className="relative rounded-xl border border-slate-200 bg-slate-50/60 p-4"
                >
                  {index < 3 && (
                    <ChevronRight className="absolute -right-3 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-slate-300 md:block" />
                  )}
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg border border-blue-100 bg-white text-[#2655e8] shadow-sm">
                    {item.icon}
                  </div>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-900">
                    {item.title}
                  </p>
                  <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500">
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
          </Panel>

        </div>
      </>
    );
  }

  function renderList() {
    return (
      <>
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <button
            onClick={() => setViewState("home")}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:border-[#2655e8] hover:text-[#2655e8]"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div>
            <h2 className="text-2xl font-black text-slate-950">
              Studio BPM
            </h2>
            <p className="mt-1 text-sm font-bold text-slate-500">
              Base BPMN • Listando{" "}
              <strong className="text-[#2655e8]">
                {STATUS_META[pastaAtiva].label}
              </strong>
            </p>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar código, processo ou responsável..."
                className="h-11 w-[320px] rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm font-medium text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#2655e8] focus:ring-4 focus:ring-[#2655e8]/10"
              />
            </div>

            <button
              onClick={() => createNew("BPMN")}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#2655e8] px-5 text-sm font-bold text-white shadow-md transition hover:bg-[#1e40af]"
            >
              <Plus className="h-4 w-4" />
              Novo fluxo
            </button>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          <ModuleDashboardCard
            title="Repositório"
            subtitle="Processos vigentes e publicados"
            value={counts.REPOSITORIO}
            icon={<FileCheck className="h-5 w-5" />}
            accent="emerald"
            onClick={() => openList("REPOSITORIO", "BPMN")}
          />
          <ModuleDashboardCard
            title="Em elaboração"
            subtitle="Rascunhos de modelagem BPMN"
            value={counts.EM_ELABORACAO}
            icon={<Workflow className="h-5 w-5" />}
            accent="blue"
            onClick={() => openList("EM_ELABORACAO", "BPMN")}
          />
          <ModuleDashboardCard
            title="Em verificação"
            subtitle="Fluxos aguardando validação"
            value={counts.EM_VERIFICACAO}
            icon={<AlertCircle className="h-5 w-5" />}
            accent="amber"
            onClick={() => openList("EM_VERIFICACAO", "BPMN")}
          />
          <ModuleDashboardCard
            title="Obsoletos"
            subtitle="Processos arquivados ou inativos"
            value={counts.OBSOLETO}
            icon={<FolderArchive className="h-5 w-5" />}
            accent="violet"
            onClick={() => openList("OBSOLETO", "BPMN")}
          />
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="min-w-full border-collapse whitespace-nowrap text-left">
              <thead className="sticky top-0 border-b border-slate-100 bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <tr>
                  <th className="px-6 py-4">
                    <button
                      onClick={() => toggleSort("code")}
                      className="flex items-center gap-1 font-black hover:text-slate-700"
                    >
                      Código{" "}
                      {sortField === "code" &&
                        (sortDirection === "asc" ? "↑" : "↓")}
                    </button>
                  </th>
                  <th className="px-6 py-4">
                    <button
                      onClick={() => toggleSort("name")}
                      className="flex items-center gap-1 font-black hover:text-slate-700"
                    >
                      Processo{" "}
                      {sortField === "name" &&
                        (sortDirection === "asc" ? "↑" : "↓")}
                    </button>
                  </th>
                  <th className="px-6 py-4">Responsável</th>
                  <th className="px-6 py-4 text-center">Versão</th>
                  <th className="px-6 py-4">
                    <button
                      onClick={() => toggleSort("updatedAt")}
                      className="flex items-center gap-1 font-black hover:text-slate-700"
                    >
                      Atualizado{" "}
                      {sortField === "updatedAt" &&
                        (sortDirection === "asc" ? "↑" : "↓")}
                    </button>
                  </th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Ação</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-sm">
                {isLoading && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-12 text-center text-sm font-bold text-slate-400"
                    >
                      Carregando processos...
                    </td>
                  </tr>
                )}

                {!isLoading &&
                  docsFiltrados.map((item) => (
                    <tr
                      key={item.id}
                      className="group transition-colors hover:bg-blue-50/30"
                    >
                      <td className="px-6 py-5 font-mono font-bold text-[#2655e8]">
                        {item.code}
                      </td>
                      <td className="px-6 py-5">
                        <div className="font-bold text-slate-800">
                          {item.name}
                        </div>
                        <div className="mt-0.5 text-xs font-medium text-slate-500">
                          Studio BPM
                        </div>
                      </td>
                      <td className="px-6 py-5 font-bold text-slate-700">
                        {item.owner}
                      </td>
                      <td className="px-6 py-5 text-center font-bold text-slate-600">
                        v{item.version}
                      </td>
                      <td className="px-6 py-5 font-medium text-slate-500">
                        {formatDate(item.updatedAt)}
                      </td>
                      <td className="px-6 py-5">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="px-6 py-5 text-right">
                        <button
                          onClick={() => router.push(`/modelagem?id=${item.id}`)}
                          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 shadow-sm transition-all hover:border-[#2655e8] hover:bg-blue-50 hover:text-[#2655e8]"
                        >
                          <Workflow className="h-3.5 w-3.5" />
                          Abrir
                        </button>
                      </td>
                    </tr>
                  ))}

                {!isLoading && docsFiltrados.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-12 text-center text-sm font-bold text-slate-400"
                    >
                      Nenhum processo encontrado para este filtro.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between px-2 text-xs font-bold text-slate-400">
          <span>{docsFiltrados.length} registro(s) encontrado(s)</span>
          <span className="inline-flex items-center gap-1.5 uppercase tracking-wider">
            <Clock3 className="h-3.5 w-3.5" />
            Ordenação: {sortField} / {sortDirection}
          </span>
        </div>
      </>
    );
  }

  function renderSipocCatalog() {
    const approvedCount = sipocCatalog.filter(
      (item) => item.status === "APROVADO"
    ).length;
    const inFlowCount = sipocCatalog.filter((item) =>
      ["RASCUNHO", "EM_REVISAO", "EM_APROVACAO"].includes(item.status)
    ).length;
    const obsoleteCount = sipocCatalog.filter(
      (item) => item.status === "OBSOLETO"
    ).length;
    return (
      <>
        <ModuleHeader
          eyebrow="Mapeamento SIPOC"
          title="Biblioteca de SIPOCs"
          subtitle="Escolha uma SIPOC existente para abrir o quadro clássico ou crie uma nova cadeia cliente-fornecedor."
          onBack={() => setViewState("home")}
          action={
            <button
              onClick={createSipocDocument}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#2655e8] px-5 text-sm font-bold text-white shadow-md transition hover:bg-[#1e40af]"
            >
              <Plus className="h-4 w-4" />
              Criar SIPOC
            </button>
          }
        />

        <div className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-3">
          <ModuleDashboardCard
            title="Repositório"
            subtitle="SIPOCs aprovadas concentradas no repositório documental"
            value={approvedCount}
            icon={<FileCheck className="h-5 w-5" />}
            accent="emerald"
            onClick={() => setSipocCatalogFilter("REPOSITORIO")}
          />
          <ModuleDashboardCard
            title="Pipeline de documentos"
            subtitle="Rascunho, revisão e aprovação do SIPOC"
            value={inFlowCount}
            icon={<Workflow className="h-5 w-5" />}
            accent="blue"
            onClick={() => setSipocCatalogFilter("PIPELINE")}
          />
          <ModuleDashboardCard
            title="Obsoletos"
            subtitle="SIPOCs arquivadas ou fora de vigência"
            value={obsoleteCount}
            icon={<FolderArchive className="h-5 w-5" />}
            accent="violet"
            onClick={() => setSipocCatalogFilter("OBSOLETO")}
          />
        </div>

        <Panel
          title="SIPOCs cadastradas"
          subtitle="Abra uma SIPOC por vez para editar o quadro clássico e vincular indicadores, riscos, documentos e BPM."
          action={
            <div className="flex flex-wrap items-center gap-2">
              {sipocCatalogFilter !== "TODOS" && (
                <button
                  onClick={() => setSipocCatalogFilter("TODOS")}
                  className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 shadow-sm transition hover:border-[#2655e8] hover:text-[#2655e8]"
                >
                  Ver todas
                </button>
              )}
              <button
                onClick={createSipocDocument}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 shadow-sm transition hover:border-[#2655e8] hover:text-[#2655e8]"
              >
                <Plus className="h-4 w-4" />
                Criar SIPOC
              </button>
            </div>
          }
        >
          <div className="overflow-x-auto custom-scrollbar">
            <table className="min-w-[1050px] w-full text-left">
              <thead className="border-b border-slate-100 bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <tr>
                  <th className="px-6 py-4">Código</th>
                  <th className="px-6 py-4">Nome da SIPOC</th>
                  <th className="px-6 py-4">Setor</th>
                  <th className="px-6 py-4">Classificação</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-center">Etapas</th>
                  <th className="px-6 py-4 text-center">Vínculos</th>
                  <th className="px-6 py-4">Atualização</th>
                  <th className="px-6 py-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {sipocCatalogFiltrado.map((item) => {
                  const workflow = SIPOC_WORKFLOW_META[item.status];
                  const classification =
                    SIPOC_CLASSIFICATION_META[item.classificacao];

                  return (
                    <tr
                      key={item.id}
                      className="transition-colors hover:bg-blue-50/30"
                    >
                      <td className="px-6 py-5 font-mono font-bold text-[#2655e8]">
                        {item.codigo}
                      </td>
                      <td className="px-6 py-5">
                        <div className="font-black text-slate-900">
                          {item.nome}
                        </div>
                        <div className="mt-0.5 text-xs font-medium text-slate-500">
                          Rev. {item.versao} • Dono: {item.dono}
                        </div>
                      </td>
                      <td className="px-6 py-5 font-bold text-slate-600">
                        {item.setor}
                      </td>
                      <td className="px-6 py-5">
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600">
                          {classification.label}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <span
                          className={cn(
                            "inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest",
                            workflow.tone
                          )}
                        >
                          {workflow.label}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-center font-black text-slate-800">
                        {item.etapas}
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className="font-black text-slate-900">
                          {item.indicadores + item.riscos}
                        </span>
                        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          {item.indicadores} ind. / {item.riscos} riscos
                        </div>
                      </td>
                      <td className="px-6 py-5 font-medium text-slate-500">
                        {item.atualizadoEm}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <button
                          onClick={() => openSipocDocument(item)}
                          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 shadow-sm transition-all hover:border-[#2655e8] hover:bg-blue-50 hover:text-[#2655e8]"
                        >
                          <Network className="h-3.5 w-3.5" />
                          Abrir SIPOC
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      </>
    );
  }

  function renderSipocAdvanced() {
    const slaPercent = sipocRows.length
      ? Math.round((sipocDentroSla / sipocRows.length) * 100)
      : 0;

    const workflow = SIPOC_WORKFLOW_META[sipocProfile.status];
    const classification =
      SIPOC_CLASSIFICATION_META[sipocProfile.classificacao];
    const suppliers = Array.from(new Set(sipocRows.map((row) => row.fornecedor)));
    const inputs = Array.from(new Set(sipocRows.map((row) => row.entrada)));
    const outputs = Array.from(new Set(sipocRows.map((row) => row.saida)));
    const customers = Array.from(new Set(sipocRows.map((row) => row.cliente)));

    const sipocColumns = [
      {
        letter: "S",
        title: "Supplier",
        label: "Fornecedores",
        icon: <Users className="h-4 w-4" />,
        tone: "border-blue-100 bg-blue-50 text-blue-700",
        items: suppliers,
      },
      {
        letter: "I",
        title: "Inputs",
        label: "Entradas",
        icon: <FileText className="h-4 w-4" />,
        tone: "border-slate-200 bg-slate-50 text-slate-700",
        items: inputs,
      },
      {
        letter: "P",
        title: "Process",
        label: "Processo",
        icon: <Workflow className="h-4 w-4" />,
        tone: "border-blue-200 bg-white text-[#2655e8]",
        items: [],
      },
      {
        letter: "O",
        title: "Outputs",
        label: "Saídas",
        icon: <CheckCircle2 className="h-4 w-4" />,
        tone: "border-emerald-100 bg-emerald-50 text-emerald-700",
        items: outputs,
      },
      {
        letter: "C",
        title: "Customers",
        label: "Clientes",
        icon: <Target className="h-4 w-4" />,
        tone: "border-violet-100 bg-violet-50 text-violet-700",
        items: customers,
      },
    ];

    const workflowSteps: SipocWorkflowStatus[] = [
      "RASCUNHO",
      "EM_REVISAO",
      "EM_APROVACAO",
      "APROVADO",
      "OBSOLETO",
    ];

    return (
      <>
        <ModuleHeader
          eyebrow="Mapeamento SIPOC"
          title={sipocProfile.nome}
          subtitle="SIPOC controlado com indicadores, riscos, workflow documental e integração com BPM, documentos e qualidade."
          onBack={() => setSipocWorkspace("catalogo")}
          action={
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={exportSipocPdf}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-[#2655e8] hover:text-[#2655e8]"
              >
                <Download className="h-4 w-4" />
                Exportar PDF
              </button>
            </div>
          }
        />

        <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-4">
          {[
            { key: "identificacao", title: "1. Identificação", text: "Setor, nome, código e governança" },
            { key: "quadro", title: "2. Quadro SIPOC", text: "SIPOC clássico com riscos por etapa" },
            { key: "indicadores", title: "3. Indicadores", text: "Estrutura, processo, resultado e estratégico" },
            { key: "interacoes", title: "4. Interações", text: "Fornecedores, entregas e acordos SLA" },
          ].map((step) => (
            <button
              key={step.key}
              onClick={() => setSipocWizardStep(step.key as SipocWizardStep)}
              className={cn(
                "rounded-2xl border p-4 text-left shadow-sm transition",
                sipocWizardStep === step.key
                  ? "border-[#2655e8] bg-blue-50 text-[#2655e8]"
                  : "border-slate-200 bg-white text-slate-600 hover:border-blue-200"
              )}
            >
              <p className="text-xs font-black uppercase tracking-widest">{step.title}</p>
              <p className="mt-1 text-[11px] font-semibold leading-relaxed">{step.text}</p>
            </button>
          ))}
        </div>

        {sipocWizardStep === "identificacao" && (
        <Panel
          title="Documento controlado SIPOC"
          subtitle="Identificação, classificação obrigatória e workflow de revisão do processo."
        >
          <div className="grid gap-5 p-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Nome do processo
                </span>
                <TableInput
                  value={sipocProfile.nome}
                  onChange={(value) => updateSipocProfile("nome", value)}
                />
              </label>
              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Código do documento
                </span>
                <TableInput
                  value={sipocProfile.codigo}
                  onChange={(value) => updateSipocProfile("codigo", value)}
                />
              </label>
              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Setor
                </span>
                <TableInput
                  value={sipocProfile.setor}
                  onChange={(value) => updateSipocProfile("setor", value)}
                />
              </label>
              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Classificação
                </span>
                <select
                  value={sipocProfile.classificacao}
                  onChange={(event) =>
                    updateSipocProfile(
                      "classificacao",
                      event.target.value as SipocClassification
                    )
                  }
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#2655e8] focus:ring-4 focus:ring-[#2655e8]/10"
                >
                  {Object.entries(SIPOC_CLASSIFICATION_META).map(
                    ([value, meta]) => (
                      <option key={value} value={value}>
                        {meta.label}
                      </option>
                    )
                  )}
                </select>
                <p className="text-xs font-medium text-slate-500">
                  {classification.description}
                </p>
              </label>
              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Status do workflow
                </span>
                <select
                  value={sipocProfile.status}
                  onChange={(event) =>
                    updateSipocProfile(
                      "status",
                      event.target.value as SipocWorkflowStatus
                    )
                  }
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#2655e8] focus:ring-4 focus:ring-[#2655e8]/10"
                >
                  {Object.entries(SIPOC_WORKFLOW_META).map(([value, meta]) => (
                    <option key={value} value={value}>
                      {meta.label}
                    </option>
                  ))}
                </select>
                <span
                  className={cn(
                    "inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest",
                    workflow.tone
                  )}
                >
                  {workflow.label}
                </span>
              </label>
              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Dono do processo
                </span>
                <TableInput
                  value={sipocProfile.dono}
                  onChange={(value) => updateSipocProfile("dono", value)}
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Versão
                  </span>
                  <TableInput
                    value={sipocProfile.versao}
                    onChange={(value) => updateSipocProfile("versao", value)}
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Emissão
                  </span>
                  <TableInput
                    value={sipocProfile.emissao}
                    onChange={(value) => updateSipocProfile("emissao", value)}
                  />
                </label>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-blue-100 bg-white text-[#2655e8]">
                  <History className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-950">
                    Workflow documental
                  </p>
                  <p className="text-xs font-medium text-slate-500">
                    Controle de versão, aprovação e obsolescência.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {workflowSteps.map((step, index) => {
                  const activeIndex = workflowSteps.indexOf(sipocProfile.status);
                  const done = index <= activeIndex;
                  const meta = SIPOC_WORKFLOW_META[step];

                  return (
                    <div key={step} className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-full border text-[10px] font-black",
                          done
                            ? "border-[#2655e8] bg-[#2655e8] text-white"
                            : "border-slate-200 bg-white text-slate-400"
                        )}
                      >
                        {index + 1}
                      </div>
                      <span
                        className={cn(
                          "text-xs font-bold",
                          done ? "text-slate-900" : "text-slate-400"
                        )}
                      >
                        {meta.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 rounded-xl border border-white bg-white p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Aprovação
                </p>
                <p className="mt-2 text-sm font-bold text-slate-900">
                  {sipocProfile.aprovador}
                </p>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  Última revisão registrada em {sipocProfile.emissao}.
                </p>
              </div>
            </div>
          </div>
        </Panel>
        )}

        {sipocWizardStep === "identificacao" && (
        <div className="my-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Performance"
            value={`${sipocPerformanceAverage}%`}
            subtitle="Média dos indicadores vinculados"
            icon={<Activity className="h-4 w-4" />}
            tone={sipocPerformanceAverage >= 90 ? "emerald" : "amber"}
          />
          <MetricCard
            title="Riscos vinculados"
            value={sipocLinkedRiskIds.size}
            subtitle={`${sipocHighRiskCount} risco(s) alto/crítico`}
            icon={<CircleAlert className="h-4 w-4" />}
            tone={sipocHighRiskCount ? "red" : "emerald"}
          />
          <MetricCard
            title="Indicadores"
            value={sipocLinkedIndicatorIds.size}
            subtitle="Relacionados às etapas"
            icon={<BarChart3 className="h-4 w-4" />}
            tone="blue"
          />
          <MetricCard
            title="SLA conforme"
            value={`${slaPercent}%`}
            subtitle={`${sipocForaSla} interação(ões) fora do SLA`}
            icon={<TimerReset className="h-4 w-4" />}
            tone={sipocForaSla ? "amber" : "emerald"}
          />
        </div>
        )}

        {sipocWizardStep !== "identificacao" && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Etapa atual</p>
            <p className="mt-1 text-sm font-black text-slate-900">
              {sipocWizardStep === "quadro" && "Quadro SIPOC clássico"}
              {sipocWizardStep === "indicadores" && "Indicadores vinculados"}
              {sipocWizardStep === "interacoes" && "Interações cliente-fornecedor"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {sipocWizardStep === "quadro" && (
              <>
                <button
                  onClick={() =>
                    setSipocStages((current) => [
                      ...current,
                      {
                        id: makeId("stage"),
                        nome: "Nova etapa",
                        responsavel: "Responsável",
                        sla: 8,
                        riskIds: [],
                        indicatorIds: [],
                        bpmLink: "/modelagem",
                        documentLink: "/documentos",
                        comentario: "",
                      },
                    ])
                  }
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#2655e8] px-4 text-xs font-bold text-white shadow-sm transition hover:bg-[#1e40af]"
                >
                  <Plus className="h-4 w-4" />
                  Nova etapa
                </button>
                <button
                  onClick={() =>
                    setSipocRisks((current) => [
                      ...current,
                      {
                        id: makeId("risk"),
                        nome: "Novo risco do processo",
                        categoria: "OPERACIONAL",
                        probabilidade: 1,
                        impacto: 1,
                        planoAcao: "Definir plano de ação",
                        controles: "Definir controles existentes",
                      },
                    ])
                  }
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 shadow-sm transition hover:border-red-300 hover:text-red-600"
                >
                  <Plus className="h-4 w-4" />
                  Novo risco
                </button>
              </>
            )}
            {sipocWizardStep === "interacoes" && (
              <button
                onClick={() =>
                  setSipocRows((current) => [
                    ...current,
                    {
                      id: makeId("sipoc-row"),
                      fornecedor: "Novo fornecedor",
                      entrada: "Nova entrada",
                      acordoEntrada: "Como deve chegar",
                      etapa: "Interação",
                      saida: "Nova saída",
                      acordoSaida: "Como deve ser entregue",
                      cliente: "Novo cliente",
                      slaEsperado: 24,
                      slaReal: 0,
                    },
                  ])
                }
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#2655e8] px-4 text-xs font-bold text-white shadow-sm transition hover:bg-[#1e40af]"
              >
                <Plus className="h-4 w-4" />
                Nova interação
              </button>
            )}
          </div>
        </div>
        )}

        {sipocWizardStep === "quadro" && (
          <div className="grid gap-6">
            <Panel
              title="Quadro SIPOC clássico"
              subtitle="Cinco colunas SIPOC com mini-fluxo interativo no bloco Process."
            >
              <div className="grid gap-4 p-6 xl:grid-cols-5">
                {sipocColumns.map((column) => (
                  <section
                    key={column.letter}
                    className="min-h-[390px] rounded-2xl border border-slate-200 bg-white shadow-sm"
                  >
                    <div
                      className={cn(
                        "flex items-center justify-between border-b px-4 py-4",
                        column.tone
                      )}
                    >
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.22em]">
                          {column.title}
                        </p>
                        <h3 className="mt-1 text-sm font-black">
                          {column.letter} - {column.label}
                        </h3>
                      </div>
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/60 bg-white/70">
                        {column.icon}
                      </div>
                    </div>

                    {column.letter === "P" ? (
                      <div className="space-y-3 p-4">
                        {sipocStages.map((stage, index) => {
                          const stageRisks = stage.riskIds
                            .map((riskId) =>
                              sipocRisks.find((risk) => risk.id === riskId)
                            )
                            .filter(Boolean) as SipocRisk[];
                          const maxRiskScore = stageRisks.length
                            ? Math.max(
                                ...stageRisks.map(
                                  (risk) => risk.probabilidade * risk.impacto
                                )
                              )
                            : 0;
                          const riskMeta = riskScoreMeta(maxRiskScore);

                          return (
                            <article
                              key={stage.id}
                              draggable
                              onDragStart={() => setDraggedSipocStageId(stage.id)}
                              onDragOver={(event) => event.preventDefault()}
                              onDrop={() => moveSipocStage(stage.id)}
                              onDragEnd={() => setDraggedSipocStageId(null)}
                              className={cn(
                                "rounded-xl border border-slate-200 bg-slate-50/70 p-3 transition",
                                draggedSipocStageId === stage.id &&
                                  "opacity-60 ring-4 ring-blue-100"
                              )}
                            >
                              <div className="mb-3 flex items-start gap-2">
                                <span className="mt-1 text-slate-300">
                                  <GripVertical className="h-4 w-4" />
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="mb-2 flex items-center gap-2">
                                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#2655e8] text-[10px] font-black text-white">
                                      {index + 1}
                                    </span>
                                    <input
                                      value={stage.nome}
                                      onChange={(event) =>
                                        updateSipocStage(
                                          stage.id,
                                          "nome",
                                          event.target.value
                                        )
                                      }
                                      className="min-w-0 flex-1 border-0 bg-transparent text-sm font-black text-slate-950 outline-none"
                                    />
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <input
                                      value={stage.responsavel}
                                      onChange={(event) =>
                                        updateSipocStage(
                                          stage.id,
                                          "responsavel",
                                          event.target.value
                                        )
                                      }
                                      className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 outline-none focus:border-[#2655e8]"
                                    />
                                    <input
                                      type="number"
                                      value={stage.sla}
                                      onChange={(event) =>
                                        updateSipocStage(
                                          stage.id,
                                          "sla",
                                          Number(event.target.value || 0)
                                        )
                                      }
                                      className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 outline-none focus:border-[#2655e8]"
                                    />
                                  </div>
                                </div>
                              </div>

                              <div className="mb-3 flex flex-wrap gap-1.5">
                                <span
                                  className={cn(
                                    "inline-flex rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-widest",
                                    riskMeta.tone
                                  )}
                                >
                                  Risco {riskMeta.label}
                                </span>
                                <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-blue-700">
                                  {stage.indicatorIds.length} indicador(es)
                                </span>
                              </div>

                              <div className="mb-2 flex flex-wrap gap-1.5">
                                {stage.indicatorIds.map((indicatorId) => {
                                  const indicator = sipocIndicators.find(
                                    (item) => item.id === indicatorId
                                  );
                                  if (!indicator) return null;
                                  return (
                                    <button
                                      key={indicatorId}
                                      onClick={() =>
                                        removeSipocStageItem(
                                          stage.id,
                                          "indicatorIds",
                                          indicatorId
                                        )
                                      }
                                      className="rounded-full border border-blue-100 bg-white px-2 py-1 text-[9px] font-bold text-blue-700"
                                    >
                                      {indicator.nome}
                                    </button>
                                  );
                                })}
                              </div>

                              <select
                                value=""
                                onChange={(event) =>
                                  linkSipocStageItem(
                                    stage.id,
                                    "indicatorIds",
                                    event.target.value
                                  )
                                }
                                className="mb-2 h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-600 outline-none focus:border-[#2655e8]"
                              >
                                <option value="">Vincular indicador...</option>
                                {sipocIndicators.map((indicator) => (
                                  <option key={indicator.id} value={indicator.id}>
                                    {indicator.nome}
                                  </option>
                                ))}
                              </select>

                              <select
                                value=""
                                onChange={(event) =>
                                  linkSipocStageItem(
                                    stage.id,
                                    "riskIds",
                                    event.target.value
                                  )
                                }
                                className="mb-2 h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-600 outline-none focus:border-[#2655e8]"
                              >
                                <option value="">Vincular risco...</option>
                                {sipocRisks.map((risk) => (
                                  <option key={risk.id} value={risk.id}>
                                    {risk.nome}
                                  </option>
                                ))}
                              </select>

                              <textarea
                                value={stage.comentario}
                                onChange={(event) =>
                                  updateSipocStage(
                                    stage.id,
                                    "comentario",
                                    event.target.value
                                  )
                                }
                                className="min-h-[54px] w-full resize-none rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-medium text-slate-600 outline-none focus:border-[#2655e8]"
                                placeholder="Comentário da etapa..."
                              />
                            </article>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="space-y-2 p-4">
                        {column.items.map((item) => (
                          <div
                            key={item}
                            className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-3 text-sm font-bold leading-snug text-slate-700"
                          >
                            {item}
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                ))}
              </div>
            </Panel>

            <div className="grid gap-6">
              {(["indicadores"] as SipocWizardStep[]).includes(sipocWizardStep) && (
              <Panel
                title="Indicadores de performance"
                subtitle="Estrutura, processo, resultado e estratégia."
              >
                <div className="space-y-3 p-6">
                  {sipocIndicators.map((indicator) => {
                    const meta = INDICATOR_CATEGORY_META[indicator.categoria];

                    return (
                      <div
                        key={indicator.id}
                        className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-[1fr_150px_90px_90px]"
                      >
                        <input
                          value={indicator.nome}
                          onChange={(event) =>
                            updateSipocIndicator(
                              indicator.id,
                              "nome",
                              event.target.value
                            )
                          }
                          className="min-w-0 border-0 bg-transparent text-sm font-black text-slate-900 outline-none"
                        />
                        <select
                          value={indicator.categoria}
                          onChange={(event) =>
                            updateSipocIndicator(
                              indicator.id,
                              "categoria",
                              event.target.value as IndicatorCategory
                            )
                          }
                          className={cn(
                            "h-9 rounded-lg border px-2 text-xs font-black uppercase tracking-widest outline-none",
                            meta.tone
                          )}
                        >
                          {Object.entries(INDICATOR_CATEGORY_META).map(
                            ([value, category]) => (
                              <option key={value} value={value}>
                                {category.label}
                              </option>
                            )
                          )}
                        </select>
                        <TableInput
                          value={indicator.meta}
                          onChange={(value) =>
                            updateSipocIndicator(indicator.id, "meta", value)
                          }
                          className="h-9"
                        />
                        <TableInput
                          value={indicator.atual}
                          onChange={(value) =>
                            updateSipocIndicator(indicator.id, "atual", value)
                          }
                          className="h-9"
                        />
                      </div>
                    );
                  })}
                </div>
              </Panel>
              )}

              <Panel
                title="Mapa de riscos integrado"
                subtitle="Probabilidade x impacto define o nível automaticamente."
              >
                <div className="space-y-3 p-6">
                  {sipocRisks.map((risk) => {
                    const category = RISK_CATEGORY_META[risk.categoria];
                    const score = risk.probabilidade * risk.impacto;
                    const level = riskScoreMeta(score);

                    return (
                      <div
                        key={risk.id}
                        className="rounded-xl border border-slate-200 bg-white p-4"
                      >
                        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                          <input
                            value={risk.nome}
                            onChange={(event) =>
                              updateSipocRisk(
                                risk.id,
                                "nome",
                                event.target.value
                              )
                            }
                            className="min-w-[220px] flex-1 border-0 bg-transparent text-sm font-black text-slate-950 outline-none"
                          />
                          <span
                            className={cn(
                              "rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest",
                              level.tone
                            )}
                          >
                            {level.label} • {score}
                          </span>
                        </div>

                        <div className="grid gap-3 md:grid-cols-[150px_1fr_1fr]">
                          <select
                            value={risk.categoria}
                            onChange={(event) =>
                              updateSipocRisk(
                                risk.id,
                                "categoria",
                                event.target.value as RiskCategory
                              )
                            }
                            className={cn(
                              "h-9 rounded-lg border px-2 text-xs font-black uppercase tracking-widest outline-none",
                              category.tone
                            )}
                          >
                            {Object.entries(RISK_CATEGORY_META).map(
                              ([value, meta]) => (
                                <option key={value} value={value}>
                                  {meta.label}
                                </option>
                              )
                            )}
                          </select>
                          <div className="grid grid-cols-2 gap-2">
                            <TableInput
                              type="number"
                              value={risk.probabilidade}
                              onChange={(value) =>
                                updateSipocRisk(
                                  risk.id,
                                  "probabilidade",
                                  Number(value || 0)
                                )
                              }
                              className="h-9 text-center"
                            />
                            <TableInput
                              type="number"
                              value={risk.impacto}
                              onChange={(value) =>
                                updateSipocRisk(
                                  risk.id,
                                  "impacto",
                                  Number(value || 0)
                                )
                              }
                              className="h-9 text-center"
                            />
                          </div>
                          <div className="h-2 self-center rounded-full bg-slate-100">
                            <div
                              className={cn("h-full rounded-full", level.bar)}
                              style={{ width: `${Math.min(100, score * 4)}%` }}
                            />
                          </div>
                        </div>

                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          <TableInput
                            value={risk.controles}
                            onChange={(value) =>
                              updateSipocRisk(risk.id, "controles", value)
                            }
                          />
                          <TableInput
                            value={risk.planoAcao}
                            onChange={(value) =>
                              updateSipocRisk(risk.id, "planoAcao", value)
                            }
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Panel>
            </div>
          </div>
        )}

        {sipocWizardStep === "indicadores" && (
          <Panel
            title="Indicadores vinculados ao processo"
            subtitle="Cadastre o nome do indicador e classifique como estrutura, processo, resultado ou estratégico."
            action={
              <button
                onClick={() =>
                  setSipocIndicators((current) => [
                    ...current,
                    {
                      id: makeId("indicator"),
                      nome: "Novo indicador",
                      categoria: "PROCESSO",
                      meta: "",
                      atual: "",
                      unidade: "",
                    },
                  ])
                }
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#2655e8] px-4 text-xs font-bold text-white shadow-sm transition hover:bg-[#1e40af]"
              >
                <Plus className="h-4 w-4" />
                Adicionar indicador
              </button>
            }
          >
            <div className="grid gap-3 p-6">
              {sipocIndicators.map((indicator) => {
                const meta = INDICATOR_CATEGORY_META[indicator.categoria];

                return (
                  <div key={indicator.id} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-[1fr_220px]">
                    <input
                      value={indicator.nome}
                      onChange={(event) =>
                        updateSipocIndicator(indicator.id, "nome", event.target.value)
                      }
                      placeholder="Nome do indicador"
                      className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-black text-slate-900 outline-none focus:border-[#2655e8] focus:bg-white"
                    />
                    <select
                      value={indicator.categoria}
                      onChange={(event) =>
                        updateSipocIndicator(
                          indicator.id,
                          "categoria",
                          event.target.value as IndicatorCategory
                        )
                      }
                      className={cn(
                        "h-10 rounded-lg border px-3 text-xs font-black uppercase tracking-widest outline-none",
                        meta.tone
                      )}
                    >
                      {Object.entries(INDICATOR_CATEGORY_META).map(([value, category]) => (
                        <option key={value} value={value}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}

              {sipocIndicators.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
                  <BarChart3 className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="mt-3 text-sm font-black text-slate-700">Nenhum indicador vinculado</p>
                  <p className="mt-1 text-xs font-medium text-slate-500">Adicione os indicadores que medem este processo.</p>
                </div>
              )}
            </div>
          </Panel>
        )}

        {sipocWizardStep === "interacoes" && (
          <Panel
            title="Gestão em lista"
            subtitle="Base analítica para auditoria, SLA, fornecedores, entradas, saídas e clientes."
          >
            <div className="overflow-x-auto custom-scrollbar">
              <table className="min-w-[1180px] w-full text-left">
                <thead className="border-b border-slate-100 bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <tr>
                    <th className="px-5 py-4">Fornecedor</th>
                    <th className="px-5 py-4">Entrada / Produto recebido</th>
                    <th className="px-5 py-4">Acordo / Requisito de entrada</th>
                    <th className="px-5 py-4">Saída / Produto entregue</th>
                    <th className="px-5 py-4">Cliente</th>
                    <th className="px-5 py-4">Acordo / Requisito de saída</th>
                    <th className="px-5 py-4 text-center">SLA (h)</th>
                    <th className="px-5 py-4 text-center">Real (h)</th>
                    <th className="px-5 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sipocRows.map((row) => {
                    const dentroSla = row.slaReal <= row.slaEsperado;

                    return (
                      <tr key={row.id} className="align-top">
                        {(
                          [
                            "fornecedor",
                            "entrada",
                            "acordoEntrada",
                            "saida",
                            "cliente",
                            "acordoSaida",
                          ] as Array<keyof SipocRow>
                        ).map((field) => (
                          <td key={field} className="px-5 py-4">
                            <TableInput
                              value={row[field] as string}
                              onChange={(value) =>
                                updateSipocRow(row.id, field, value)
                              }
                            />
                          </td>
                        ))}
                        <td className="px-5 py-4">
                          <TableInput
                            type="number"
                            value={row.slaEsperado}
                            onChange={(value) =>
                              updateSipocRow(
                                row.id,
                                "slaEsperado",
                                Number(value || 0)
                              )
                            }
                            className="text-center"
                          />
                        </td>
                        <td className="px-5 py-4">
                          <TableInput
                            type="number"
                            value={row.slaReal}
                            onChange={(value) =>
                              updateSipocRow(
                                row.id,
                                "slaReal",
                                Number(value || 0)
                              )
                            }
                            className="text-center"
                          />
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={cn(
                              "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-widest",
                              dentroSla
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border-red-200 bg-red-50 text-red-700"
                            )}
                          >
                            {dentroSla ? (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5" />
                            )}
                            {dentroSla ? "Dentro do SLA" : "Fora do SLA"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        )}

        {sipocWizardStep === "identificacao" && (
        <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Panel
            title="Integrações do processo"
            subtitle="O SIPOC passa a conversar com os módulos-chave do SGQ."
          >
            <div className="grid gap-3 p-6 md:grid-cols-2">
              {[
                {
                  label: "BPM Studio",
                  text: "Fluxo completo, conectores e modelagem BPMN.",
                  icon: <Workflow className="h-4 w-4" />,
                },
                {
                  label: "Documentos",
                  text: "POP, protocolos e documentos controlados relacionados.",
                  icon: <FileCheck className="h-4 w-4" />,
                },
                {
                  label: "Indicadores",
                  text: "Performance operacional e estratégica vinculada.",
                  icon: <BarChart3 className="h-4 w-4" />,
                },
                {
                  label: "Riscos",
                  text: "Riscos por etapa, controles e planos de ação.",
                  icon: <ShieldCheck className="h-4 w-4" />,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-slate-200 bg-white p-4"
                >
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-[#2655e8]">
                    {item.icon}
                  </div>
                  <p className="text-sm font-black text-slate-950">
                    {item.label}
                  </p>
                  <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">
                    {item.text}
                  </p>
                  <div className="mt-3 inline-flex items-center gap-1 text-xs font-black text-[#2655e8]">
                    <Link2 className="h-3.5 w-3.5" />
                    Vinculado ao processo
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel
            title="Histórico e comentários"
            subtitle="Rastreabilidade executiva para revisão e auditoria."
          >
            <div className="space-y-3 p-6">
              {[
                "Criação do SIPOC em modo rascunho",
                "Classificação obrigatória definida",
                "Indicadores e riscos vinculados às etapas",
                "Aguardando revisão formal do dono do processo",
              ].map((item, index) => (
                <div
                  key={item}
                  className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4"
                >
                  <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-xs font-black text-[#2655e8]">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{item}</p>
                    <p className="mt-1 text-xs font-medium text-slate-500">
                      Sistema • {sipocProfile.emissao}
                    </p>
                  </div>
                </div>
              ))}

              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                <div className="mb-2 flex items-center gap-2 text-[#2655e8]">
                  <MessageSquare className="h-4 w-4" />
                  <p className="text-xs font-black uppercase tracking-widest">
                    Comentários por etapa
                  </p>
                </div>
                <p className="text-sm font-semibold leading-relaxed text-slate-700">
                  Os comentários informados no bloco Process são preservados na
                  rastreabilidade do SIPOC e entram na exportação institucional.
                </p>
              </div>
            </div>
          </Panel>
        </div>
        )}
      </>
    );
  }

  function renderSipoc() {
    const slaPercent = sipocRows.length
      ? Math.round((sipocDentroSla / sipocRows.length) * 100)
      : 0;

    return (
      <>
        <ModuleHeader
          eyebrow="Mapeamento SIPOC"
          title="Cadeia cliente-fornecedor"
          subtitle="Fornecedores, entradas, etapas, saídas, clientes e SLA em uma visão operacional integrada."
          onBack={() => setViewState("home")}
          action={
            <button
              onClick={() =>
                setSipocRows((current) => [
                  ...current,
                  {
                    id: makeId("sipoc"),
                    fornecedor: "Novo fornecedor",
                    entrada: "Nova entrada",
                    acordoEntrada: "Como deve chegar",
                    etapa: "Nova etapa",
                    saida: "Nova saída",
                    acordoSaida: "Como deve ser entregue",
                    cliente: "Novo cliente",
                    slaEsperado: 24,
                    slaReal: 0,
                  },
                ])
              }
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#2655e8] px-5 text-sm font-bold text-white shadow-md transition hover:bg-[#1e40af]"
            >
              <Plus className="h-4 w-4" />
              Nova interação
            </button>
          }
        />

        <div className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Interações"
            value={sipocRows.length}
            subtitle="Cadeias mapeadas"
            icon={<Network className="h-4 w-4" />}
            tone="blue"
          />
          <MetricCard
            title="Dentro do SLA"
            value={`${slaPercent}%`}
            subtitle={`${sipocDentroSla} interação(ões) conforme`}
            icon={<CheckCircle2 className="h-4 w-4" />}
            tone="emerald"
          />
          <MetricCard
            title="Fora do SLA"
            value={sipocForaSla}
            subtitle="Precisam de tratativa"
            icon={<XCircle className="h-4 w-4" />}
            tone={sipocForaSla ? "red" : "slate"}
          />
          <MetricCard
            title="Tempo médio"
            value={`${Math.round(
              sipocRows.reduce((sum, row) => sum + row.slaReal, 0) /
                Math.max(sipocRows.length, 1)
            )}h`}
            subtitle="SLA real registrado"
            icon={<TimerReset className="h-4 w-4" />}
            tone="amber"
          />
        </div>

        <Panel
          title="Mapa SIPOC operacional"
          subtitle="Edite inline e acompanhe automaticamente o status do SLA."
        >
          <div className="overflow-x-auto custom-scrollbar">
            <table className="min-w-[1180px] w-full text-left">
              <thead className="border-b border-slate-100 bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <tr>
                  <th className="px-5 py-4">Fornecedor</th>
                  <th className="px-5 py-4">Entrada</th>
                  <th className="px-5 py-4">Processo / etapa</th>
                  <th className="px-5 py-4">Saída</th>
                  <th className="px-5 py-4">Cliente</th>
                  <th className="px-5 py-4 text-center">SLA esperado</th>
                  <th className="px-5 py-4 text-center">Tempo real</th>
                  <th className="px-5 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sipocRows.map((row) => {
                  const dentroSla = row.slaReal <= row.slaEsperado;

                  return (
                    <tr key={row.id} className="align-top">
                      <td className="px-5 py-4">
                        <TableInput
                          value={row.fornecedor}
                          onChange={(value) =>
                            updateSipocRow(row.id, "fornecedor", value)
                          }
                        />
                      </td>
                      <td className="px-5 py-4">
                        <TableInput
                          value={row.entrada}
                          onChange={(value) =>
                            updateSipocRow(row.id, "entrada", value)
                          }
                        />
                      </td>
                      <td className="px-5 py-4">
                        <TableInput
                          value={row.etapa}
                          onChange={(value) =>
                            updateSipocRow(row.id, "etapa", value)
                          }
                        />
                      </td>
                      <td className="px-5 py-4">
                        <TableInput
                          value={row.saida}
                          onChange={(value) =>
                            updateSipocRow(row.id, "saida", value)
                          }
                        />
                      </td>
                      <td className="px-5 py-4">
                        <TableInput
                          value={row.cliente}
                          onChange={(value) =>
                            updateSipocRow(row.id, "cliente", value)
                          }
                        />
                      </td>
                      <td className="px-5 py-4">
                        <TableInput
                          type="number"
                          value={row.slaEsperado}
                          onChange={(value) =>
                            updateSipocRow(
                              row.id,
                              "slaEsperado",
                              Number(value || 0)
                            )
                          }
                          className="text-center"
                        />
                      </td>
                      <td className="px-5 py-4">
                        <TableInput
                          type="number"
                          value={row.slaReal}
                          onChange={(value) =>
                            updateSipocRow(
                              row.id,
                              "slaReal",
                              Number(value || 0)
                            )
                          }
                          className="text-center"
                        />
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={cn(
                            "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-widest",
                            dentroSla
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-red-200 bg-red-50 text-red-700"
                          )}
                        >
                          {dentroSla ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5" />
                          )}
                          {dentroSla ? "Dentro do SLA" : "Fora do SLA"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      </>
    );
  }

  function renderRaci() {
    return (
      <>
        <ModuleHeader
          eyebrow="Matriz RACI"
          title="Responsabilidades do processo"
          subtitle="Defina responsável, aprovador, consultados e informados para cada tarefa antes da publicação."
          onBack={() => setViewState("home")}
          action={
            <button
              onClick={() =>
                setRaciRows((current) => [
                  ...current,
                  {
                    id: makeId("raci"),
                    tarefa: "Nova tarefa BPM",
                    responsavel: "",
                    aprovador: "",
                    consultado: "",
                    informado: "",
                  },
                ])
              }
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#2655e8] px-5 text-sm font-bold text-white shadow-md transition hover:bg-[#1e40af]"
            >
              <Plus className="h-4 w-4" />
              Nova tarefa
            </button>
          }
        />

        <div className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Tarefas BPM"
            value={raciRows.length}
            subtitle="Linhas da matriz"
            icon={<Workflow className="h-4 w-4" />}
            tone="blue"
          />
          <MetricCard
            title="Sem responsável"
            value={raciSemResponsavel}
            subtitle="Bloqueiam publicação"
            icon={<CircleAlert className="h-4 w-4" />}
            tone={raciSemResponsavel ? "red" : "emerald"}
          />
          <MetricCard
            title="Conflitos A"
            value={raciConflitosAprovador}
            subtitle="Aprovadores múltiplos"
            icon={<GitMerge className="h-4 w-4" />}
            tone={raciConflitosAprovador ? "amber" : "emerald"}
          />
          <MetricCard
            title="Publicação"
            value={raciValido ? "OK" : "Ação"}
            subtitle={raciValido ? "Matriz validada" : "Revise pendências"}
            icon={<ShieldCheck className="h-4 w-4" />}
            tone={raciValido ? "emerald" : "red"}
          />
        </div>

        <Panel
          title="Tabela RACI"
          subtitle="Edição rápida inline e validação automática das regras críticas."
        >
          <div className="overflow-x-auto custom-scrollbar">
            <table className="min-w-[1080px] w-full text-left">
              <thead className="border-b border-slate-100 bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <tr>
                  <th className="px-5 py-4">Tarefa BPM</th>
                  <th className="px-5 py-4">R - Responsável</th>
                  <th className="px-5 py-4">A - Aprovador</th>
                  <th className="px-5 py-4">C - Consultado</th>
                  <th className="px-5 py-4">I - Informado</th>
                  <th className="px-5 py-4">Validação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {raciRows.map((row) => {
                  const missingOwner = !row.responsavel.trim();
                  const approverConflict = approverCount(row.aprovador) > 1;
                  const valid = !missingOwner && !approverConflict;

                  return (
                    <tr key={row.id} className="align-top">
                      <td className="px-5 py-4">
                        <TableInput
                          value={row.tarefa}
                          onChange={(value) =>
                            updateRaciRow(row.id, "tarefa", value)
                          }
                        />
                      </td>
                      <td className="px-5 py-4">
                        <TableInput
                          value={row.responsavel}
                          onChange={(value) =>
                            updateRaciRow(row.id, "responsavel", value)
                          }
                        />
                      </td>
                      <td className="px-5 py-4">
                        <TableInput
                          value={row.aprovador}
                          onChange={(value) =>
                            updateRaciRow(row.id, "aprovador", value)
                          }
                        />
                      </td>
                      <td className="px-5 py-4">
                        <TableInput
                          value={row.consultado}
                          onChange={(value) =>
                            updateRaciRow(row.id, "consultado", value)
                          }
                        />
                      </td>
                      <td className="px-5 py-4">
                        <TableInput
                          value={row.informado}
                          onChange={(value) =>
                            updateRaciRow(row.id, "informado", value)
                          }
                        />
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={cn(
                            "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-widest",
                            valid
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-red-200 bg-red-50 text-red-700"
                          )}
                        >
                          {valid ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : (
                            <CircleAlert className="h-3.5 w-3.5" />
                          )}
                          {valid
                            ? "OK"
                            : missingOwner
                              ? "Sem responsável"
                              : "Conflito A"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      </>
    );
  }

  function renderVsm() {
    return (
      <>
        <ModuleHeader
          eyebrow="Value Stream Mapping"
          title="Eficiência do processo"
          subtitle="Meça execução, espera, valor agregado e gargalos para priorizar melhoria contínua."
          onBack={() => setViewState("home")}
          action={
            <button
              onClick={() =>
                setVsmRows((current) => [
                  ...current,
                  {
                    id: makeId("vsm"),
                    etapa: "Nova etapa",
                    execucao: 1,
                    espera: 0,
                    valor: "VA",
                  },
                ])
              }
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#2655e8] px-5 text-sm font-bold text-white shadow-md transition hover:bg-[#1e40af]"
            >
              <Plus className="h-4 w-4" />
              Nova etapa
            </button>
          }
        />

        <div className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Lead time"
            value={`${vsmLeadTime}h`}
            subtitle="Execução + espera"
            icon={<Clock3 className="h-4 w-4" />}
            tone="blue"
          />
          <MetricCard
            title="Valor agregado"
            value={`${vsmTempoValor}h`}
            subtitle={`${vsmEficiencia}% de eficiência`}
            icon={<Gauge className="h-4 w-4" />}
            tone="emerald"
          />
          <MetricCard
            title="Gargalo"
            value={`${gargalo?.espera || 0}h`}
            subtitle={gargalo?.etapa || "Sem etapa"}
            icon={<CircleAlert className="h-4 w-4" />}
            tone="amber"
          />
          <MetricCard
            title="Etapas"
            value={vsmRows.length}
            subtitle="Fluxo analisado"
            icon={<BarChart3 className="h-4 w-4" />}
            tone="violet"
          />
        </div>

        <Panel
          title="Linha do tempo VSM"
          subtitle="O tamanho visual acompanha o tempo de espera; etapas críticas aparecem destacadas."
        >
          <div className="overflow-x-auto custom-scrollbar p-6">
            <div className="flex min-w-[980px] items-stretch gap-4">
              {vsmRows.map((row, index) => {
                const isGargalo = gargalo?.id === row.id;
                const tone =
                  row.valor === "VA"
                    ? "border-emerald-200 bg-emerald-50"
                    : row.valor === "NNVA"
                      ? "border-amber-200 bg-amber-50"
                      : "border-red-200 bg-red-50";

                return (
                  <div key={row.id} className="flex flex-1 items-center gap-4">
                    <div
                      className={cn(
                        "min-h-[170px] flex-1 rounded-2xl border p-4",
                        tone,
                        isGargalo && "ring-4 ring-amber-200"
                      )}
                    >
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                            Etapa {index + 1}
                          </p>
                          <p className="mt-1 text-sm font-black text-slate-900">
                            {row.etapa}
                          </p>
                        </div>
                        {isGargalo && (
                          <span className="rounded-full border border-amber-200 bg-white px-2 py-1 text-[9px] font-black uppercase tracking-widest text-amber-700">
                            Gargalo
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                        <div className="rounded-lg bg-white/80 p-3">
                          <p className="text-slate-400">Execução</p>
                          <p className="mt-1 text-lg text-slate-950">
                            {row.execucao}h
                          </p>
                        </div>
                        <div className="rounded-lg bg-white/80 p-3">
                          <p className="text-slate-400">Espera</p>
                          <p className="mt-1 text-lg text-slate-950">
                            {row.espera}h
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 h-2 rounded-full bg-white">
                        <div
                          className="h-full rounded-full bg-[#2655e8]"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(12, (row.espera / Math.max(vsmLeadTime, 1)) * 100)
                            )}%`,
                          }}
                        />
                      </div>
                    </div>

                    {index < vsmRows.length - 1 && (
                      <ChevronRight className="h-5 w-5 shrink-0 text-slate-300" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </Panel>

        <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <Panel
            title="Dados por etapa"
            subtitle="Ajuste tempos e classificação para recalcular automaticamente."
          >
            <div className="overflow-x-auto custom-scrollbar">
              <table className="min-w-[860px] w-full text-left">
                <thead className="border-b border-slate-100 bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <tr>
                    <th className="px-5 py-4">Etapa</th>
                    <th className="px-5 py-4 text-center">Execução (h)</th>
                    <th className="px-5 py-4 text-center">Espera (h)</th>
                    <th className="px-5 py-4">Classificação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vsmRows.map((row) => (
                    <tr key={row.id}>
                      <td className="px-5 py-4">
                        <TableInput
                          value={row.etapa}
                          onChange={(value) =>
                            updateVsmRow(row.id, "etapa", value)
                          }
                        />
                      </td>
                      <td className="px-5 py-4">
                        <TableInput
                          type="number"
                          value={row.execucao}
                          onChange={(value) =>
                            updateVsmRow(
                              row.id,
                              "execucao",
                              Number(value || 0)
                            )
                          }
                          className="text-center"
                        />
                      </td>
                      <td className="px-5 py-4">
                        <TableInput
                          type="number"
                          value={row.espera}
                          onChange={(value) =>
                            updateVsmRow(row.id, "espera", Number(value || 0))
                          }
                          className="text-center"
                        />
                      </td>
                      <td className="px-5 py-4">
                        <select
                          value={row.valor}
                          onChange={(event) =>
                            updateVsmRow(
                              row.id,
                              "valor",
                              event.target.value as VsmRow["valor"]
                            )
                          }
                          className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#2655e8] focus:ring-4 focus:ring-[#2655e8]/10"
                        >
                          <option value="VA">Valor agregado</option>
                          <option value="NNVA">Necessário sem valor agregado</option>
                          <option value="NVA">Não valor agregado</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="Insights automáticos" subtitle="Leitura Lean do fluxo atual.">
            <div className="space-y-3 p-6">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-black text-slate-950">
                  Etapa com maior tempo de espera
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-600">
                  {gargalo?.etapa} concentra {gargalo?.espera}h de espera.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-black text-slate-950">
                  Eficiência do processo
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-600">
                  {vsmEficiencia < 40
                    ? "Processo ineficiente: há excesso de espera ou retrabalho."
                    : "Processo com eficiência aceitável, mas ainda com oportunidades de melhoria."}
                </p>
              </div>
            </div>
          </Panel>
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <div className="mx-auto w-full max-w-[1440px] px-8 py-8">
        {viewState === "home" && renderHome()}
        {viewState === "list" && renderList()}
        {viewState === "sipoc" &&
          (sipocWorkspace === "catalogo"
            ? renderSipocCatalog()
            : renderSipocAdvanced())}
        {viewState === "raci" && renderRaci()}
        {viewState === "vsm" && renderVsm()}
      </div>
    </div>
  );
}

function ModuleHeader({
  eyebrow,
  title,
  subtitle,
  onBack,
  action,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  onBack: () => void;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-start gap-4">
      <button
        onClick={onBack}
        className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-[#2655e8] hover:text-[#2655e8]"
        aria-label="Voltar"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>

      <div>
        <div className="mb-2 inline-flex items-center rounded-lg border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#2655e8]">
          {eyebrow}
        </div>
        <h1 className="text-3xl font-black tracking-tight text-slate-950">
          {title}
        </h1>
        <p className="mt-1 max-w-3xl text-sm font-medium leading-relaxed text-slate-500">
          {subtitle}
        </p>
      </div>

      {action && <div className="ml-auto">{action}</div>}
    </div>
  );
}
