"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  Cpu,
  FileCheck,
  FolderArchive,
  Gauge,
  GitMerge,
  Network,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  TimerReset,
  Users,
  Workflow,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";

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
  etapa: string;
  saida: string;
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
    etapa: "Planejar processo",
    saida: "Escopo aprovado",
    cliente: "Gestor do processo",
    slaEsperado: 48,
    slaReal: 32,
  },
  {
    id: "sipoc-2",
    fornecedor: "Cliente interno",
    entrada: "Solicitação validada",
    etapa: "Executar atividade crítica",
    saida: "Entrega operacional",
    cliente: "Área solicitante",
    slaEsperado: 24,
    slaReal: 29,
  },
  {
    id: "sipoc-3",
    fornecedor: "Qualidade",
    entrada: "Checklist de controle",
    etapa: "Verificar conformidade",
    saida: "Parecer técnico",
    cliente: "Dono do processo",
    slaEsperado: 12,
    slaReal: 8,
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

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.35fr_0.9fr]">
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

          <Panel
            title="Validação inteligente"
            subtitle="Alertas para publicar processos com governança."
          >
            <div className="space-y-3 p-6">
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-600">
                    <CircleAlert className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900">
                      Tarefas sem responsável
                    </p>
                    <p className="text-xs font-medium text-slate-500">
                      Obrigatório antes da publicação
                    </p>
                  </div>
                </div>
                <span className="text-xl font-black text-slate-950">
                  {raciSemResponsavel}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-amber-100 bg-amber-50 text-amber-600">
                    <GitMerge className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900">
                      Conflitos de aprovador
                    </p>
                    <p className="text-xs font-medium text-slate-500">
                      Evita múltiplos aprovadores na mesma tarefa
                    </p>
                  </div>
                </div>
                <span className="text-xl font-black text-slate-950">
                  {raciConflitosAprovador}
                </span>
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                <p className="text-sm font-black text-slate-900">
                  Insight Lean
                </p>
                <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-600">
                  Etapa com maior espera:{" "}
                  <strong className="text-[#2655e8]">{gargalo?.etapa}</strong>{" "}
                  ({gargalo?.espera}h). Priorize essa etapa para reduzir o
                  lead time total.
                </p>
              </div>
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
                    etapa: "Nova etapa",
                    saida: "Nova saída",
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
        {viewState === "sipoc" && renderSipoc()}
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
