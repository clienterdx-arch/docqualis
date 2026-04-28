"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileCheck2,
  FileText,
  Gauge,
  LayoutDashboard,
  LineChart,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingUp,
  Workflow,
  XCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type Priority = "critica" | "alta" | "media" | "baixa";
type ModuleKey =
  | "documentos"
  | "processos"
  | "riscos"
  | "ocorrencias"
  | "registros"
  | "indicadores"
  | "estrategico";

type PerfilUsuario = {
  nome: string;
  cargo: string | null;
  perfil_acesso: string | null;
  empresa_id: string;
};

type ProcessoItem = {
  id: string;
  code: string;
  name: string;
  owner: string;
  version: number;
  module: "SIPOC" | "BPMN";
  status: "EM_ELABORACAO" | "EM_VERIFICACAO" | "REPOSITORIO" | "OBSOLETO";
  updatedAt?: string;
};

type DashboardRow = Record<string, unknown>;

type DashboardData = {
  documentos: DashboardRow[];
  processos: ProcessoItem[];
  riscos: DashboardRow[];
  ocorrencias: DashboardRow[];
  registros: DashboardRow[];
  indicadores: DashboardRow[];
  medicoes: DashboardRow[];
  objetivos: DashboardRow[];
  iniciativas: DashboardRow[];
};

type PendingItem = {
  id: string;
  module: ModuleKey;
  moduleLabel: string;
  title: string;
  subtitle: string;
  status: string;
  href: string;
  dueDate?: string | null;
  owner?: string | null;
  priority: Priority;
  isMine: boolean;
};

type ModuleSummary = {
  key: ModuleKey;
  label: string;
  href: string;
  total: number;
  open: number;
  mine: number;
  critical: number;
  accent: "blue" | "emerald" | "amber" | "red" | "violet" | "cyan" | "slate";
  icon: React.ReactNode;
};

const EMPTY_DATA: DashboardData = {
  documentos: [],
  processos: [],
  riscos: [],
  ocorrencias: [],
  registros: [],
  indicadores: [],
  medicoes: [],
  objetivos: [],
  iniciativas: [],
};

const MODULE_META: Record<ModuleKey, { label: string; href: string }> = {
  documentos: { label: "Documentos", href: "/documentos" },
  processos: { label: "Processos", href: "/processos" },
  riscos: { label: "Riscos", href: "/riscos" },
  ocorrencias: { label: "Ocorrências", href: "/ocorrencias" },
  registros: { label: "Registros", href: "/gestao-registros" },
  indicadores: { label: "Indicadores", href: "/indicadores" },
  estrategico: { label: "Estratégico", href: "/estrategico" },
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function normalizeText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function asString(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback;
  const text = String(value);
  return text.length > 0 ? text : fallback;
}

function optionalString(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  return String(value);
}

function asObject(value: unknown): DashboardRow {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as DashboardRow
    : {};
}

function userMatches(value: unknown, perfil: PerfilUsuario | null, email: string) {
  const source = normalizeText(value);
  if (!source || !perfil) return false;

  return [perfil.nome, perfil.cargo, perfil.perfil_acesso, email]
    .filter(Boolean)
    .map(normalizeText)
    .some((needle) => needle.length > 2 && source.includes(needle));
}

function parseDate(value: unknown) {
  if (!value) return null;
  const raw = String(value);
  const date = /^\d{4}-\d{2}-\d{2}/.test(raw)
    ? new Date(`${raw.slice(0, 10)}T00:00:00`)
    : new Date(raw);

  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function daysUntil(value: unknown) {
  const due = parseDate(value);
  if (!due) return null;
  return Math.ceil((due.getTime() - startOfToday().getTime()) / 86400000);
}

function formatDate(value: unknown) {
  const date = parseDate(value);
  if (!date) return "Sem prazo";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function dueLabel(value: unknown) {
  const days = daysUntil(value);
  if (days === null) return "Sem prazo definido";
  if (days < 0) return `${Math.abs(days)} dia(s) em atraso`;
  if (days === 0) return "Vence hoje";
  if (days === 1) return "Vence amanhã";
  return `Vence em ${days} dias`;
}

function priorityFromDue(value: unknown, critical = false): Priority {
  const days = daysUntil(value);
  if (critical || (days !== null && days < 0)) return "critica";
  if (days !== null && days <= 3) return "alta";
  if (days !== null && days <= 7) return "media";
  return "baixa";
}

function priorityRank(priority: Priority) {
  return { critica: 0, alta: 1, media: 2, baixa: 3 }[priority];
}

function isOpenStatus(status: unknown, closed: string[]) {
  const value = normalizeText(status);
  return !closed.some((item) => value === item || value.includes(item));
}

function readableProcessStatus(status: ProcessoItem["status"]) {
  return {
    EM_ELABORACAO: "Em elaboração",
    EM_VERIFICACAO: "Em verificação",
    REPOSITORIO: "Repositório",
    OBSOLETO: "Obsoleto",
  }[status];
}

function latestMeasurement(indicadorId: string, medicoes: DashboardRow[]) {
  return medicoes.find((medicao) => medicao.indicador_id === indicadorId) ?? null;
}

function isKpiBelowTarget(indicador: DashboardRow, medicao: DashboardRow | null) {
  if (!medicao || medicao.valor == null || indicador.meta == null) return true;
  const value = Number(medicao.valor);
  const target = Number(indicador.meta);
  if (Number.isNaN(value) || Number.isNaN(target)) return true;
  if (target === 0) return false;
  return normalizeText(indicador.polaridade).includes("menor") ? value > target : value < target;
}

function moduleAccentClasses(accent: ModuleSummary["accent"]) {
  return {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    red: "bg-red-50 text-red-700 border-red-100",
    violet: "bg-violet-50 text-violet-700 border-violet-100",
    cyan: "bg-cyan-50 text-cyan-700 border-cyan-100",
    slate: "bg-slate-100 text-slate-700 border-slate-200",
  }[accent];
}

function priorityClasses(priority: Priority) {
  return {
    critica: "bg-red-50 text-red-700 border-red-200",
    alta: "bg-amber-50 text-amber-700 border-amber-200",
    media: "bg-blue-50 text-blue-700 border-blue-200",
    baixa: "bg-slate-50 text-slate-600 border-slate-200",
  }[priority];
}

function priorityLabel(priority: Priority) {
  return {
    critica: "Crítica",
    alta: "Alta",
    media: "Média",
    baixa: "Baixa",
  }[priority];
}

function buildPendingItems(data: DashboardData, perfil: PerfilUsuario | null, email: string) {
  const items: PendingItem[] = [];

  const addItem = (item: PendingItem) => {
    items.push(item);
  };

  data.documentos.forEach((doc) => {
    const status = String(doc.status ?? "");
    const normalized = normalizeText(status);
    const isPending =
      normalized.includes("em elaboracao") ||
      normalized.includes("em_fluxo") ||
      normalized.includes("em verificacao") ||
      normalized.includes("em homologacao") ||
      normalized.includes("rejeitado") ||
      normalized.includes("devolvido");

    if (!isPending) return;

    const docId = asString(doc.id);
    const owner = normalized.includes("verificacao")
      ? doc.verificador_pendente
      : normalized.includes("homologacao")
        ? doc.aprovador
        : doc.elaborador;
    const dueDate = optionalString(doc.dt_vencimento ?? doc.dt_alerta);
    const isMine = userMatches(owner, perfil, email) || userMatches(doc.elaborador, perfil, email);
    const href = normalized.includes("elaboracao") || normalized.includes("rejeitado") || normalized.includes("devolvido")
      ? `/editar-documento/${docId}`
      : `/documento/${docId}`;

    addItem({
      id: `doc-${docId}`,
      module: "documentos",
      moduleLabel: MODULE_META.documentos.label,
      title: `${doc.codigo ? `${asString(doc.codigo)} · ` : ""}${asString(doc.titulo, "Documento sem título")}`,
      subtitle: normalized.includes("homologacao") ? "Assinatura de homologação pendente" : "Tramitação documental pendente",
      status,
      href,
      dueDate,
      owner: optionalString(owner),
      priority: priorityFromDue(dueDate, normalized.includes("rejeitado") || normalized.includes("devolvido")),
      isMine,
    });
  });

  data.processos.forEach((processo) => {
    if (processo.status === "REPOSITORIO" || processo.status === "OBSOLETO") return;

    addItem({
      id: `proc-${processo.id}`,
      module: "processos",
      moduleLabel: MODULE_META.processos.label,
      title: `${processo.code} · ${processo.name}`,
      subtitle: `Módulo ${processo.module} aguardando evolução de workflow`,
      status: readableProcessStatus(processo.status),
      href: "/processos",
      dueDate: null,
      owner: processo.owner,
      priority: processo.status === "EM_VERIFICACAO" ? "alta" : "media",
      isMine: userMatches(processo.owner, perfil, email),
    });
  });

  data.riscos.forEach((risco) => {
    if (!isOpenStatus(risco.status, ["concluido", "finalizado", "tratado", "encerrado", "cancelado"])) return;

    const score = Number(risco.nivel_risco ?? risco.score ?? (Number(risco.probabilidade ?? 0) * Number(risco.impacto ?? 0)));
    const isCritical = score >= 14 || normalizeText(risco.classificacao).includes("alto") || normalizeText(risco.status).includes("critico");

    const riscoId = asString(risco.id);

    addItem({
      id: `risco-${riscoId}`,
      module: "riscos",
      moduleLabel: MODULE_META.riscos.label,
      title: `${risco.codigo ? `${asString(risco.codigo)} · ` : ""}${asString(risco.titulo, "Risco sem título")}`,
      subtitle: isCritical ? `Risco elevado com score ${Number.isNaN(score) ? "-" : score}` : "Tratamento de risco pendente",
      status: asString(risco.status, "Aberto"),
      href: "/riscos",
      dueDate: optionalString(risco.prazo_tratamento),
      owner: optionalString(risco.responsavel),
      priority: priorityFromDue(risco.prazo_tratamento, isCritical),
      isMine: userMatches(risco.responsavel, perfil, email),
    });
  });

  data.ocorrencias.forEach((ocorrencia) => {
    if (!isOpenStatus(ocorrencia.status, ["concluido", "cancelado"])) return;

    const critical =
      normalizeText(ocorrencia.prioridade).includes("critica") ||
      normalizeText(ocorrencia.prioridade).includes("alta") ||
      normalizeText(ocorrencia.gravidade).includes("grave") ||
      normalizeText(ocorrencia.gravidade).includes("sentinela");

    const ocorrenciaId = asString(ocorrencia.id);

    addItem({
      id: `oco-${ocorrenciaId}`,
      module: "ocorrencias",
      moduleLabel: MODULE_META.ocorrencias.label,
      title: `${ocorrencia.numero ? `${asString(ocorrencia.numero)} · ` : ""}${asString(ocorrencia.titulo, "Ocorrência sem título")}`,
      subtitle: `${asString(ocorrencia.tipo, "Evento")} em ${asString(ocorrencia.setor, "setor não informado")}`,
      status: asString(ocorrencia.status, "Aberta"),
      href: "/ocorrencias",
      dueDate: optionalString(ocorrencia.prazo_tratativa),
      owner: optionalString(ocorrencia.responsavel_tratativa),
      priority: priorityFromDue(ocorrencia.prazo_tratativa, critical),
      isMine: userMatches(ocorrencia.responsavel_tratativa, perfil, email),
    });
  });

  data.registros.forEach((registro) => {
    const status = asString(registro.status, "Enviado");
    if (!isOpenStatus(status, ["aprovado", "rejeitado", "excluido"])) return;

    const dados = asObject(registro.dados);
    const owner = dados._currentOwner ?? registro.current_owner ?? registro.preenchido_por;
    const registroId = asString(registro.id);

    addItem({
      id: `reg-${registroId}`,
      module: "registros",
      moduleLabel: MODULE_META.registros.label,
      title: `${asString(registro.numero ?? registro.id, "Registro")} · ${asString(dados.titulo, "Registro em workflow")}`,
      subtitle: `Preenchido por ${asString(registro.preenchido_por, "usuário não informado")}`,
      status,
      href: "/gestao-registros",
      dueDate: optionalString(registro.data_preenchimento),
      owner: optionalString(owner),
      priority: normalizeText(status).includes("ajuste") ? "alta" : "media",
      isMine: userMatches(owner, perfil, email) || userMatches(registro.preenchido_por, perfil, email),
    });
  });

  data.indicadores.forEach((indicador) => {
    if (!isOpenStatus(indicador.status, ["inativo", "cancelado"])) return;

    const indicadorId = asString(indicador.id);
    const medicao = latestMeasurement(indicadorId, data.medicoes);
    const belowTarget = isKpiBelowTarget(indicador, medicao);
    if (!belowTarget) return;

    addItem({
      id: `kpi-${indicadorId}`,
      module: "indicadores",
      moduleLabel: MODULE_META.indicadores.label,
      title: asString(indicador.nome, "Indicador sem nome"),
      subtitle: medicao ? `Realizado ${asString(medicao.valor)} / meta ${asString(indicador.meta)}` : "Sem medição registrada",
      status: medicao ? "Fora da meta" : "Sem medição",
      href: "/indicadores",
      dueDate: null,
      owner: optionalString(indicador.responsavel),
      priority: medicao ? "alta" : "media",
      isMine: userMatches(indicador.responsavel, perfil, email),
    });
  });

  [...data.objetivos, ...data.iniciativas].forEach((item) => {
    if (!isOpenStatus(item.status, ["concluido", "cancelado"])) return;
    const critical = normalizeText(item.status).includes("atrasado");

    const itemId = asString(item.id);

    addItem({
      id: `str-${itemId}`,
      module: "estrategico",
      moduleLabel: MODULE_META.estrategico.label,
      title: asString(item.titulo, "Item estratégico sem título"),
      subtitle: item.objetivo_id ? "Iniciativa estratégica em andamento" : "Objetivo estratégico em andamento",
      status: asString(item.status, "Aberto"),
      href: "/estrategico",
      dueDate: optionalString(item.prazo),
      owner: optionalString(item.responsavel),
      priority: priorityFromDue(item.prazo, critical),
      isMine: userMatches(item.responsavel, perfil, email),
    });
  });

  return items.sort((a, b) => {
    const priority = priorityRank(a.priority) - priorityRank(b.priority);
    if (priority !== 0) return priority;

    const aDays = daysUntil(a.dueDate) ?? 999;
    const bDays = daysUntil(b.dueDate) ?? 999;
    return aDays - bDays;
  });
}

function buildModuleSummaries(data: DashboardData, pendingItems: PendingItem[]): ModuleSummary[] {
  const count = (key: ModuleKey) => pendingItems.filter((item) => item.module === key);
  const make = (
    key: ModuleKey,
    total: number,
    accent: ModuleSummary["accent"],
    icon: React.ReactNode
  ): ModuleSummary => {
    const moduleItems = count(key);
    return {
      key,
      label: MODULE_META[key].label,
      href: MODULE_META[key].href,
      total,
      open: moduleItems.length,
      mine: moduleItems.filter((item) => item.isMine).length,
      critical: moduleItems.filter((item) => item.priority === "critica" || item.priority === "alta").length,
      accent,
      icon,
    };
  };

  return [
    make("documentos", data.documentos.length, "blue", <FileText className="h-5 w-5" />),
    make("processos", data.processos.length, "emerald", <Workflow className="h-5 w-5" />),
    make("riscos", data.riscos.length, "red", <ShieldAlert className="h-5 w-5" />),
    make("ocorrencias", data.ocorrencias.length, "amber", <AlertTriangle className="h-5 w-5" />),
    make("registros", data.registros.length, "violet", <ClipboardCheck className="h-5 w-5" />),
    make("indicadores", data.indicadores.length, "cyan", <LineChart className="h-5 w-5" />),
    make("estrategico", data.objetivos.length + data.iniciativas.length, "slate", <Target className="h-5 w-5" />),
  ];
}

function ExecutiveMetric({
  title,
  value,
  subtitle,
  icon,
  tone,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  tone: "blue" | "red" | "amber" | "emerald";
}) {
  const palette = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    red: "bg-red-50 text-red-700 border-red-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
  }[tone];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl border", palette)}>
          {icon}
        </div>
        <span className="text-3xl font-black text-slate-900">{value}</span>
      </div>
      <div className="mt-5">
        <p className="text-sm font-bold text-slate-800">{title}</p>
        <p className="mt-1 text-xs font-medium text-slate-500">{subtitle}</p>
      </div>
    </div>
  );
}

function PendingRow({ item }: { item: PendingItem }) {
  return (
    <Link
      href={item.href}
      className="group grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-[#2655e8] hover:bg-[#eef2ff]/30 md:grid-cols-[1fr_auto]"
    >
      <div className="min-w-0">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
            {item.moduleLabel}
          </span>
          <span className={cn("rounded-md border px-2 py-1 text-[10px] font-black uppercase tracking-widest", priorityClasses(item.priority))}>
            {priorityLabel(item.priority)}
          </span>
          {item.isMine && (
            <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700">
              Minha
            </span>
          )}
        </div>

        <h3 className="truncate text-sm font-black text-slate-900">{item.title}</h3>
        <p className="mt-1 text-xs font-medium text-slate-500">{item.subtitle}</p>
      </div>

      <div className="flex items-center justify-between gap-5 md:justify-end">
        <div className="text-left md:text-right">
          <p className="text-xs font-bold text-slate-700">{item.status}</p>
          <p className="mt-1 text-[11px] font-bold text-slate-400">{dueLabel(item.dueDate)}</p>
        </div>
        <ArrowRight className="h-4 w-4 text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:text-[#2655e8]" />
      </div>
    </Link>
  );
}

function ModuleCard({ module }: { module: ModuleSummary }) {
  return (
    <Link
      href={module.href}
      className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#2655e8] hover:shadow-md"
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl border", moduleAccentClasses(module.accent))}>
          {module.icon}
        </div>
        <ArrowRight className="h-4 w-4 text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:text-[#2655e8]" />
      </div>

      <p className="text-sm font-black text-slate-900">{module.label}</p>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-slate-50 px-2 py-2">
          <p className="text-lg font-black text-slate-900">{module.open}</p>
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Abertas</p>
        </div>
        <div className="rounded-lg bg-blue-50 px-2 py-2">
          <p className="text-lg font-black text-blue-700">{module.mine}</p>
          <p className="text-[9px] font-black uppercase tracking-widest text-blue-500">Minhas</p>
        </div>
        <div className="rounded-lg bg-red-50 px-2 py-2">
          <p className="text-lg font-black text-red-700">{module.critical}</p>
          <p className="text-[9px] font-black uppercase tracking-widest text-red-500">Atenção</p>
        </div>
      </div>
    </Link>
  );
}

export default function PainelExecutivoPage() {
  const router = useRouter();
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [emailUsuario, setEmailUsuario] = useState("");
  const [data, setData] = useState<DashboardData>(EMPTY_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const carregarPainel = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;

    if (!session) {
      router.push("/login");
      return;
    }

    setEmailUsuario(session.user.email ?? "");

    const { data: perfisData, error: perfilError } = await supabase
      .from("perfis")
      .select("empresa_id, nome, cargo, perfil_acesso")
      .eq("id", session.user.id)
      .limit(1);

    const perfilData = perfisData?.[0];

    if (perfilError || !perfilData?.empresa_id) {
      setLoadError("Não foi possível carregar o perfil do usuário.");
      setIsLoading(false);
      return;
    }

    const perfilAtual = perfilData as PerfilUsuario;
    setPerfil(perfilAtual);

    const processosPromise = fetch("/api/processos", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : []))
      .then((rows) => (Array.isArray(rows) ? rows : []))
      .catch(() => []);

    const [
      documentos,
      riscos,
      ocorrencias,
      registros,
      indicadores,
      medicoes,
      objetivos,
      iniciativas,
      processos,
    ] = await Promise.all([
      supabase.from("documentos").select("*").eq("empresa_id", perfilAtual.empresa_id).order("created_at", { ascending: false }),
      supabase.from("riscos").select("*").eq("empresa_id", perfilAtual.empresa_id),
      supabase.from("ocorrencias").select("*").eq("empresa_id", perfilAtual.empresa_id).order("created_at", { ascending: false }),
      supabase.from("registros_preenchidos").select("*").eq("empresa_id", perfilAtual.empresa_id).order("created_at", { ascending: false }),
      supabase.from("indicadores").select("*").eq("empresa_id", perfilAtual.empresa_id).order("nome"),
      supabase.from("indicadores_medicoes").select("*").eq("empresa_id", perfilAtual.empresa_id).order("data_medicao", { ascending: false }),
      supabase.from("planejamento_objetivos").select("*").eq("empresa_id", perfilAtual.empresa_id),
      supabase.from("planejamento_iniciativas").select("*").eq("empresa_id", perfilAtual.empresa_id),
      processosPromise,
    ]);

    const queryErrors = [documentos, riscos, ocorrencias, registros, indicadores, medicoes, objetivos, iniciativas]
      .filter((result) => "error" in result && result.error)
      .map((result) => result.error?.message);

    if (queryErrors.length > 0) {
      setLoadError("Alguns módulos não responderam. O painel exibiu os dados disponíveis.");
    }

    setData({
      documentos: documentos.data ?? [],
      riscos: riscos.data ?? [],
      ocorrencias: ocorrencias.data ?? [],
      registros: registros.data ?? [],
      indicadores: indicadores.data ?? [],
      medicoes: medicoes.data ?? [],
      objetivos: objetivos.data ?? [],
      iniciativas: iniciativas.data ?? [],
      processos,
    });

    setIsLoading(false);
  }, [router]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void carregarPainel();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [carregarPainel]);

  const pendingItems = useMemo(
    () => buildPendingItems(data, perfil, emailUsuario),
    [data, emailUsuario, perfil]
  );
  const moduleSummaries = useMemo(
    () => buildModuleSummaries(data, pendingItems),
    [data, pendingItems]
  );

  const myItems = pendingItems.filter((item) => item.isMine);
  const visibleItems = myItems.length > 0 ? myItems : pendingItems;
  const criticalItems = pendingItems.filter((item) => item.priority === "critica" || item.priority === "alta");
  const weekItems = pendingItems.filter((item) => {
    const days = daysUntil(item.dueDate);
    return days !== null && days >= 0 && days <= 7;
  });
  const completedModules = moduleSummaries.filter((module) => module.open === 0).length;
  const healthScore = moduleSummaries.length
    ? Math.round((completedModules / moduleSummaries.length) * 100)
    : 0;

  const hoje = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm font-bold text-slate-500 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-[#2655e8]" />
          Carregando painel executivo...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-lg border border-[#dbeafe] bg-[#eef2ff] px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-[#2655e8]">
              <LayoutDashboard className="h-3.5 w-3.5" />
              Painel Executivo
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
              Olá, {perfil?.nome?.split(" ")[0] ?? "usuário"}
            </h1>
            <p className="mt-2 text-sm font-medium text-slate-500">
              {hoje}. Resumo consolidado das pendências e sinais de atenção do SGQ.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={carregarPainel}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:border-[#2655e8] hover:text-[#2655e8]"
            >
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </button>
            <Link
              href="/documentos"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#2655e8] px-5 text-sm font-bold text-white shadow-md transition hover:bg-[#1e40af]"
            >
              <FileText className="h-4 w-4" />
              Abrir Documentos
            </Link>
          </div>
        </header>

        {loadError && (
          <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
            <AlertCircle className="h-5 w-5" />
            {loadError}
          </div>
        )}

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ExecutiveMetric
            title="Minhas pendências"
            value={myItems.length}
            subtitle={myItems.length > 0 ? "Itens vinculados ao seu usuário" : "Nenhum item nominal encontrado"}
            icon={<Sparkles className="h-5 w-5" />}
            tone="blue"
          />
          <ExecutiveMetric
            title="Atenção executiva"
            value={criticalItems.length}
            subtitle="Atrasos, criticidade alta ou fora da meta"
            icon={<AlertTriangle className="h-5 w-5" />}
            tone="red"
          />
          <ExecutiveMetric
            title="Próximos 7 dias"
            value={weekItems.length}
            subtitle="Prazos chegando no curto prazo"
            icon={<CalendarClock className="h-5 w-5" />}
            tone="amber"
          />
          <ExecutiveMetric
            title="Saúde do SGQ"
            value={`${healthScore}%`}
            subtitle={`${completedModules} de ${moduleSummaries.length} módulos sem pendência`}
            icon={<Gauge className="h-5 w-5" />}
            tone="emerald"
          />
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_0.9fr]">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  {myItems.length > 0 ? "Minha fila prioritária" : "Fila prioritária da empresa"}
                </h2>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  {visibleItems.length} item(ns) ordenado(s) por criticidade e prazo.
                </p>
              </div>
              <span className="hidden rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black uppercase tracking-widest text-slate-400 shadow-sm sm:inline-flex">
                Top {Math.min(8, visibleItems.length)}
              </span>
            </div>

            <div className="space-y-3">
              {visibleItems.slice(0, 8).map((item) => (
                <PendingRow key={item.id} item={item} />
              ))}

              {visibleItems.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-sm">
                  <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
                  <h3 className="mt-4 text-lg font-black text-slate-900">Fila limpa</h3>
                  <p className="mt-2 text-sm font-medium text-slate-500">
                    Nenhuma pendência aberta foi encontrada nos módulos monitorados.
                  </p>
                </div>
              )}
            </div>
          </div>

          <aside className="flex flex-col gap-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-slate-900">Agenda da Semana</h2>
                  <p className="mt-1 text-xs font-medium text-slate-500">Prazos em até 7 dias</p>
                </div>
                <Clock3 className="h-5 w-5 text-slate-400" />
              </div>

              <div className="space-y-3">
                {weekItems.slice(0, 5).map((item) => (
                  <Link key={item.id} href={item.href} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 transition hover:border-[#2655e8] hover:bg-[#eef2ff]">
                    <div className={cn("mt-1 h-2.5 w-2.5 rounded-full", item.priority === "critica" ? "bg-red-500" : item.priority === "alta" ? "bg-amber-500" : "bg-blue-500")} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-black text-slate-800">{item.title}</p>
                      <p className="mt-1 text-[11px] font-bold text-slate-400">{formatDate(item.dueDate)} · {item.moduleLabel}</p>
                    </div>
                  </Link>
                ))}

                {weekItems.length === 0 && (
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-5 text-center text-sm font-bold text-slate-400">
                    Sem vencimentos próximos.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-slate-900">Pulso do Sistema</h2>
                  <p className="mt-1 text-xs font-medium text-slate-500">Leitura executiva por volume</p>
                </div>
                <Activity className="h-5 w-5 text-slate-400" />
              </div>

              <div className="space-y-4">
                {[
                  { label: "Itens abertos", value: pendingItems.length, icon: <BarChart3 className="h-4 w-4" />, color: "text-blue-700 bg-blue-50" },
                  { label: "Itens críticos", value: criticalItems.length, icon: <XCircle className="h-4 w-4" />, color: "text-red-700 bg-red-50" },
                  { label: "Módulos monitorados", value: moduleSummaries.length, icon: <FileCheck2 className="h-4 w-4" />, color: "text-emerald-700 bg-emerald-50" },
                  { label: "Pendências não nominais", value: Math.max(pendingItems.length - myItems.length, 0), icon: <TrendingUp className="h-4 w-4" />, color: "text-amber-700 bg-amber-50" },
                ].map((metric) => (
                  <div key={metric.label} className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", metric.color)}>
                        {metric.icon}
                      </div>
                      <span className="text-sm font-bold text-slate-700">{metric.label}</span>
                    </div>
                    <span className="text-lg font-black text-slate-900">{metric.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </section>

        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-900">Pendências por módulo</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">Consolidação operacional para navegação rápida.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {moduleSummaries.map((module) => (
              <ModuleCard key={module.key} module={module} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
