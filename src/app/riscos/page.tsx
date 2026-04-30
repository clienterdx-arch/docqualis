"use client";

import React, { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  ClipboardCheck,
  DatabaseZap,
  Download,
  Fingerprint,
  GitBranch,
  Gauge,
  Layers3,
  LineChart,
  Loader2,
  LockKeyhole,
  Network,
  Plus,
  Radar,
  Scale,
  Search,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { carregarPerfilUsuario } from "@/lib/perfil";
import {
  buildGraphFromRisks,
  calculateInherentScore,
  calculateResidualScore,
  classifyRisk,
  createRiskCode,
  estimateMonteCarlo,
  summarizeRisks,
} from "@/lib/riscos/eris";
import type {
  ErisRisk,
  ErisScenario,
  RiskCategory,
  RiskClassification,
  RiskDistribution,
  RiskStatus,
} from "@/types/riscos";

type ViewMode =
  | "cockpit"
  | "graph"
  | "matrix"
  | "montecarlo"
  | "scenarios"
  | "kri"
  | "controls"
  | "rca"
  | "opportunities"
  | "audit"
  | "governance";

type PerfilRiscos = {
  empresa_id?: string | null;
  nome?: string | null;
  perfil_acesso?: string | null;
};

type DbRow = Record<string, unknown>;

type RiskForm = {
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
  estrategia: string;
  perda_minima: string;
  perda_mais_provavel: string;
  perda_maxima: string;
};

const emptyForm: RiskForm = {
  titulo: "",
  descricao: "",
  causa: "",
  consequencia: "",
  categoria: "Operacional",
  setor: "",
  responsavel: "",
  processo_vinculado: "",
  probabilidade: 3,
  impacto: 3,
  velocidade: 2,
  estrategia: "Mitigar",
  perda_minima: "50000",
  perda_mais_provavel: "250000",
  perda_maxima: "1000000",
};

const viewItems: Array<{ key: ViewMode; label: string; icon: React.ElementType; description: string }> = [
  { key: "cockpit", label: "Cockpit", icon: ShieldAlert, description: "Top riscos, exposicao e decisoes" },
  { key: "graph", label: "Risk Graph", icon: Network, description: "Causas, controles e consequencias" },
  { key: "matrix", label: "Matriz", icon: Radar, description: "Inerente vs residual" },
  { key: "montecarlo", label: "Monte Carlo", icon: LineChart, description: "VaR, CVaR e percentis" },
  { key: "scenarios", label: "Stress", icon: SlidersHorizontal, description: "What-if e cenarios CFO" },
  { key: "kri", label: "KRI", icon: Gauge, description: "Indicadores vivos e forecast" },
  { key: "controls", label: "Controles", icon: ClipboardCheck, description: "COSO, NIST, CSA e lacunas" },
  { key: "rca", label: "RCA", icon: GitBranch, description: "Ishikawa, 5 Whys e FTA" },
  { key: "opportunities", label: "Oportunidades", icon: Sparkles, description: "Risco positivo e ROI" },
  { key: "audit", label: "Auditoria", icon: Fingerprint, description: "Hash-chain e assurance" },
  { key: "governance", label: "Governanca", icon: Scale, description: "Apetite, 3 linhas e ABAC" },
];

const statusLabels: Record<RiskStatus, string> = {
  IDENTIFICADO: "Identificado",
  EM_ANALISE: "Em analise",
  AVALIADO: "Avaliado",
  EM_TRATAMENTO: "Em tratamento",
  MONITORAMENTO: "Monitoramento",
  ENCERRADO: "Encerrado",
  ACEITO_FORMALMENTE: "Aceito formalmente",
  TRANSFERIDO: "Transferido",
  REATIVADO: "Reativado",
};

const classStyles: Record<RiskClassification, string> = {
  BAIXO: "border-emerald-200 bg-emerald-50 text-emerald-700",
  MODERADO: "border-amber-200 bg-amber-50 text-amber-700",
  ALTO: "border-orange-200 bg-orange-50 text-orange-700",
  CRITICO: "border-red-200 bg-red-50 text-red-700",
};

function textValue(row: DbRow, key: string, fallback = ""): string {
  const value = row[key];
  return typeof value === "string" ? value : fallback;
}

function numberValue(row: DbRow, key: string, fallback = 0): number {
  const value = row[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function normalizeClass(value: string, score: number): RiskClassification {
  const upper = value.toUpperCase();
  if (upper === "CRITICO" || upper === "ALTO" || upper === "MODERADO" || upper === "BAIXO") return upper;
  return classifyRisk(score);
}

function normalizeStatus(value: string): RiskStatus {
  const normalized = value.toUpperCase();
  if (normalized === "EM_ANALISE" || normalized === "AVALIADO" || normalized === "EM_TRATAMENTO" || normalized === "MONITORAMENTO" || normalized === "ENCERRADO" || normalized === "ACEITO_FORMALMENTE" || normalized === "TRANSFERIDO" || normalized === "REATIVADO") {
    return normalized;
  }
  return "IDENTIFICADO";
}

function normalizeCategory(value: string): RiskCategory {
  const allowed: RiskCategory[] = ["Operacional", "Assistencial", "Financeiro", "Cyber", "Compliance", "Estrategico", "Reputacional"];
  return allowed.includes(value as RiskCategory) ? value as RiskCategory : "Operacional";
}

function normalizeDistribution(value: string): RiskDistribution {
  const allowed: RiskDistribution[] = ["Normal", "LogNormal", "Triangular", "PERT", "Beta", "Poisson", "Bernoulli"];
  return allowed.includes(value as RiskDistribution) ? value as RiskDistribution : "PERT";
}

function mapRisk(row: DbRow): ErisRisk {
  const probability = numberValue(row, "probabilidade", 1);
  const impact = numberValue(row, "impacto", 1);
  const velocity = numberValue(row, "velocidade", 1);
  const score = numberValue(row, "nivel_risco", calculateInherentScore(probability, impact, velocity));
  const residualProbability = numberValue(row, "risco_residual_probabilidade", Math.max(1, probability - 1));
  const residualImpact = numberValue(row, "risco_residual_impacto", Math.max(1, impact - 1));

  return {
    id: textValue(row, "id"),
    empresa_id: textValue(row, "empresa_id"),
    codigo: textValue(row, "codigo", "RIS"),
    titulo: textValue(row, "titulo", "Risco sem titulo"),
    descricao: textValue(row, "descricao"),
    causa: textValue(row, "causa"),
    consequencia: textValue(row, "consequencia"),
    categoria: normalizeCategory(textValue(row, "categoria", "Operacional")),
    setor: textValue(row, "setor", "Geral"),
    responsavel: textValue(row, "responsavel", "Owner nao definido"),
    processo_vinculado: textValue(row, "processo_vinculado"),
    probabilidade: probability,
    impacto: impact,
    velocidade: velocity,
    nivel_risco: score,
    residual_score: numberValue(row, "residual_score", calculateResidualScore(residualProbability, residualImpact, 35)),
    classificacao: normalizeClass(textValue(row, "classificacao"), score),
    status: normalizeStatus(textValue(row, "status")),
    estrategia: textValue(row, "estrategia", "Mitigar"),
    distribuicao: normalizeDistribution(textValue(row, "distribuicao", "PERT")),
    perda_minima: numberValue(row, "perda_minima", 50000),
    perda_mais_provavel: numberValue(row, "perda_mais_provavel", 250000),
    perda_maxima: numberValue(row, "perda_maxima", 1000000),
    var_p95: numberValue(row, "var_p95", 0),
    cvar_p95: numberValue(row, "cvar_p95", 0),
    controles: numberValue(row, "total_controles", 0),
    kri: numberValue(row, "total_kri", 0),
    eventos: numberValue(row, "total_eventos", 0),
    prazo_tratamento: textValue(row, "prazo_tratamento"),
    data_revisao: textValue(row, "data_revisao"),
  };
}

function currency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function KpiCard({
  label,
  value,
  description,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  description: string;
  icon: React.ElementType;
  tone: string;
}) {
  return (
    <div className="min-h-[120px] rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className={`grid h-10 w-10 place-items-center rounded-lg ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
        <strong className="text-3xl font-semibold tracking-normal text-slate-950">{value}</strong>
      </div>
      <h3 className="mt-4 text-xs font-extrabold uppercase tracking-normal text-slate-950">{label}</h3>
      <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
    </div>
  );
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-2xl font-semibold tracking-normal text-slate-950">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

export default function GestaoRiscosPage() {
  const router = useRouter();
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [usuarioNome, setUsuarioNome] = useState("Usuario");
  const [riscos, setRiscos] = useState<ErisRisk[]>([]);
  const [view, setView] = useState<ViewMode>("cockpit");
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState<"TODOS" | RiskClassification>("TODOS");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [form, setForm] = useState<RiskForm>(emptyForm);
  const [scenarioName, setScenarioName] = useState("Recessao 2026");
  const [scenarioShock, setScenarioShock] = useState(18);
  const [simulatedRiskId, setSimulatedRiskId] = useState<string>("");
  const [scenarioResult, setScenarioResult] = useState<ErisScenario | null>(null);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;

      if (!data.session) {
        router.push("/login");
        return;
      }

      const perfil = await carregarPerfilUsuario<PerfilRiscos>(data.session, "empresa_id, nome, perfil_acesso");
      if (!active) return;

      if (!perfil?.empresa_id) {
        setMessage({ type: "error", text: "Nao foi possivel identificar a empresa vinculada ao usuario." });
        setIsLoading(false);
        return;
      }

      setEmpresaId(perfil.empresa_id);
      setUsuarioNome(perfil.nome ?? data.session.user.email ?? "Usuario");
    });

    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    if (!empresaId) return;
    let active = true;

    supabase
      .from("vw_riscos_eris")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("nivel_risco", { ascending: false })
      .then(async ({ data, error }) => {
        if (!active) return;

        if (error) {
          const fallback = await supabase.from("riscos").select("*").eq("empresa_id", empresaId).order("created_at", { ascending: false });
          if (!active) return;

          if (fallback.error) {
            setMessage({ type: "error", text: "Nao foi possivel carregar riscos. Aplique a migration ERIS no Supabase." });
            setRiscos([]);
          } else {
            setRiscos((fallback.data ?? []).map((row) => mapRisk(row as DbRow)));
          }
        } else {
          setRiscos((data ?? []).map((row) => mapRisk(row as DbRow)));
        }

        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [empresaId, refreshKey]);

  const analytics = useMemo(() => summarizeRisks(riscos), [riscos]);
  const graph = useMemo(() => buildGraphFromRisks(riscos.slice(0, 12)), [riscos]);
  const selectedSimulationRisk = useMemo(() => riscos.find((risk) => risk.id === simulatedRiskId) ?? riscos[0] ?? null, [riscos, simulatedRiskId]);
  const simulation = useMemo(() => selectedSimulationRisk ? estimateMonteCarlo(selectedSimulationRisk.perda_minima, selectedSimulationRisk.perda_mais_provavel, selectedSimulationRisk.perda_maxima, 6000) : null, [selectedSimulationRisk]);

  const filteredRisks = useMemo(() => {
    const term = search.trim().toLowerCase();
    return riscos.filter((risk) => {
      const matchesClass = classFilter === "TODOS" || risk.classificacao === classFilter;
      const matchesSearch = !term || [risk.codigo, risk.titulo, risk.descricao, risk.setor, risk.responsavel, risk.categoria, risk.processo_vinculado].some((value) => value.toLowerCase().includes(term));
      return matchesClass && matchesSearch;
    });
  }, [riscos, search, classFilter]);

  function updateForm<K extends keyof RiskForm>(key: K, value: RiskForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function createRisk(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!empresaId) return;

    if (!form.titulo.trim()) {
      setMessage({ type: "error", text: "Informe o titulo do risco." });
      return;
    }

    setIsSaving(true);
    const score = calculateInherentScore(form.probabilidade, form.impacto, form.velocidade);
    const residual = calculateResidualScore(Math.max(1, form.probabilidade - 1), Math.max(1, form.impacto - 1), 35);
    const losses = estimateMonteCarlo(Number(form.perda_minima), Number(form.perda_mais_provavel), Number(form.perda_maxima), 8000);

    const payload = {
      empresa_id: empresaId,
      codigo: createRiskCode(riscos.length),
      titulo: form.titulo.trim(),
      descricao: form.descricao.trim(),
      causa: form.causa.trim(),
      consequencia: form.consequencia.trim(),
      categoria: form.categoria,
      setor: form.setor.trim() || "Geral",
      responsavel: form.responsavel.trim() || usuarioNome,
      processo_vinculado: form.processo_vinculado.trim(),
      origem: "ERIS Risk OS",
      probabilidade: form.probabilidade,
      impacto: form.impacto,
      velocidade: form.velocidade,
      nivel_risco: score,
      residual_score: residual,
      classificacao: classifyRisk(score),
      status: "IDENTIFICADO",
      estrategia: form.estrategia,
      distribuicao: "PERT",
      perda_minima: Number(form.perda_minima),
      perda_mais_provavel: Number(form.perda_mais_provavel),
      perda_maxima: Number(form.perda_maxima),
      var_p95: losses.p95,
      cvar_p95: losses.cvar95,
      bowtie: {
        causas: [form.causa],
        evento: form.titulo,
        consequencias: [form.consequencia],
        barreiras: ["Controle preventivo a definir", "Controle detectivo a definir"],
      },
      rca: { ishikawa: {}, fiveWhys: [] },
      opportunity: { enabled: false },
      next_review_at: classifyRisk(score) === "CRITICO" ? new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10) : new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10),
    };

    const { error } = await supabase.from("riscos").insert(payload);
    setIsSaving(false);

    if (error) {
      setMessage({ type: "error", text: "Nao foi possivel criar o risco. Verifique a migration ERIS e o RLS." });
      return;
    }

    setForm(emptyForm);
    setMessage({ type: "success", text: "Risco criado com score, VaR, bow-tie e evento de auditoria." });
    setRefreshKey((current) => current + 1);
  }

  async function transitionRisk(risk: ErisRisk, status: RiskStatus) {
    if (!empresaId) return;
    const { error } = await supabase.from("riscos").update({ status }).eq("empresa_id", empresaId).eq("id", risk.id);

    if (error) {
      setMessage({ type: "error", text: "Nao foi possivel transicionar o risco." });
      return;
    }

    setMessage({ type: "success", text: `${risk.codigo} movido para ${statusLabels[status]}.` });
    setRefreshKey((current) => current + 1);
  }

  async function runScenario() {
    if (!empresaId) return;
    const adjusted = riscos.map((risk) => ({
      ...risk,
      var_p95: risk.var_p95 * (1 + scenarioShock / 100),
      cvar_p95: risk.cvar_p95 * (1 + scenarioShock / 100),
    }));
    const result = {
      var_p95: adjusted.reduce((sum, risk) => sum + risk.var_p95, 0),
      cvar_p95: adjusted.reduce((sum, risk) => sum + risk.cvar_p95, 0),
    };

    const payload = {
      empresa_id: empresaId,
      nome: scenarioName,
      descricao: `Choque global de ${scenarioShock}% sobre exposicao simulada.`,
      tipo: "WHAT_IF",
      variaveis: { shockPercent: scenarioShock },
      resultado: result,
      var_p95: result.var_p95,
      cvar_p95: result.cvar_p95,
      status: "SIMULADO",
    };

    const { data, error } = await supabase.from("riscos_cenarios").insert(payload).select("*").single();
    if (error) {
      setScenarioResult({ id: "local", nome: scenarioName, tipo: "WHAT_IF", var_p95: result.var_p95, cvar_p95: result.cvar_p95, status: "SIMULADO_LOCAL" });
      setMessage({ type: "error", text: "Cenario calculado localmente. A tabela de cenarios ainda precisa da migration ERIS." });
      return;
    }

    const row = data as DbRow;
    setScenarioResult({
      id: textValue(row, "id"),
      nome: textValue(row, "nome"),
      tipo: "WHAT_IF",
      var_p95: numberValue(row, "var_p95"),
      cvar_p95: numberValue(row, "cvar_p95"),
      status: textValue(row, "status"),
    });
    setMessage({ type: "success", text: "Cenario salvo e simulado." });
  }

  function exportCsv() {
    const headers = ["Codigo", "Titulo", "Categoria", "Setor", "Classificacao", "Score", "Residual", "VaR P95", "CVaR P95", "Status"];
    const rows = filteredRisks.map((risk) => [
      risk.codigo,
      risk.titulo,
      risk.categoria,
      risk.setor,
      risk.classificacao,
      String(risk.nivel_risco),
      String(risk.residual_score),
      String(risk.var_p95),
      String(risk.cvar_p95),
      statusLabels[risk.status],
    ]);
    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map((row) => row.map(escape).join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `eris-risk-register-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1540px] flex-col gap-6">
        <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-extrabold uppercase tracking-normal text-blue-700">
              <BrainCircuit className="h-3.5 w-3.5" />
              Sistema Nervoso Central de Riscos
            </span>
            <h1 className="mt-4 text-4xl font-semibold tracking-normal text-slate-950">ERIS Risk OS</h1>
            <p className="mt-2 max-w-4xl text-base leading-7 text-slate-600">
              Risco corporativo vivo: grafo, matriz residual, Monte Carlo, KRI, controles, RCA, oportunidades, auditoria criptografica e governanca executiva.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={exportCsv} className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:border-blue-200 hover:text-blue-700">
              <Download className="h-4 w-4" />
              Exportar
            </button>
            <button type="button" onClick={() => setView("cockpit")} className="inline-flex h-11 items-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 hover:bg-blue-700">
              <Plus className="h-4 w-4" />
              Novo risco abaixo
            </button>
          </div>
        </header>

        {message && (
          <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-semibold ${message.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
            {message.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            {message.text}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <KpiCard label="Riscos" value={analytics.total} description="Registro corporativo" icon={ShieldAlert} tone="bg-blue-50 text-blue-600" />
          <KpiCard label="Criticos" value={analytics.criticos} description="Exigem decisao executiva" icon={AlertTriangle} tone="bg-red-50 text-red-600" />
          <KpiCard label="Altos" value={analytics.altos} description="Prioridade de tratamento" icon={Gauge} tone="bg-orange-50 text-orange-600" />
          <KpiCard label="Controles" value={analytics.controles} description="Cobertura declarada" icon={ShieldCheck} tone="bg-emerald-50 text-emerald-600" />
          <KpiCard label="VaR P95" value={currency(analytics.varP95)} description="Exposicao agregada" icon={LineChart} tone="bg-violet-50 text-violet-600" />
          <KpiCard label="Apetite" value={analytics.appetiteBreaches} description="Hard limits violados" icon={Scale} tone="bg-slate-100 text-slate-700" />
        </section>

        <section className="grid gap-6 xl:grid-cols-[310px_1fr]">
          <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar risco, setor, owner..."
                className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </label>

            <div className="mt-3 grid grid-cols-2 gap-2">
              {(["TODOS", "CRITICO", "ALTO", "MODERADO", "BAIXO"] as Array<"TODOS" | RiskClassification>).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setClassFilter(item)}
                  className={`h-9 rounded-lg text-xs font-bold ${classFilter === item ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                >
                  {item}
                </button>
              ))}
            </div>

            <nav className="mt-4 space-y-1">
              {viewItems.map((item) => (
                <button
                  type="button"
                  key={item.key}
                  onClick={() => setView(item.key)}
                  className={`flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition ${view === item.key ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"}`}
                >
                  <item.icon className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    <strong className="block text-sm">{item.label}</strong>
                    <span className="mt-0.5 block text-xs leading-4 text-slate-500">{item.description}</span>
                  </span>
                </button>
              ))}
            </nav>
          </aside>

          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            {isLoading ? (
              <div className="grid min-h-[540px] place-items-center text-blue-600">
                <div className="flex items-center gap-3 text-sm font-semibold">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Carregando ERIS Risk OS...
                </div>
              </div>
            ) : (
              <div className="p-5 lg:p-6">
                {view === "cockpit" && (
                  <div className="space-y-6">
                    <SectionHeader title="Cockpit Executivo de Riscos" description="Lista priorizada com exposicao probabilistica, status, controles e acoes executivas." />

                    <form onSubmit={createRisk} className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                      <div className="grid gap-3 lg:grid-cols-4">
                        <input value={form.titulo} onChange={(event) => updateForm("titulo", event.target.value)} placeholder="Titulo do risco" className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-blue-300 lg:col-span-2" />
                        <select value={form.categoria} onChange={(event) => updateForm("categoria", event.target.value as RiskCategory)} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-300">
                          {["Operacional", "Assistencial", "Financeiro", "Cyber", "Compliance", "Estrategico", "Reputacional"].map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                        <input value={form.setor} onChange={(event) => updateForm("setor", event.target.value)} placeholder="Setor" className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-300" />
                        <input value={form.causa} onChange={(event) => updateForm("causa", event.target.value)} placeholder="Causa principal" className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-300" />
                        <input value={form.consequencia} onChange={(event) => updateForm("consequencia", event.target.value)} placeholder="Consequencia" className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-300" />
                        <input value={form.responsavel} onChange={(event) => updateForm("responsavel", event.target.value)} placeholder="Owner" className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-300" />
                        <input value={form.processo_vinculado} onChange={(event) => updateForm("processo_vinculado", event.target.value)} placeholder="Processo vinculado" className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-300" />
                      </div>
                      <div className="mt-4 grid gap-3 lg:grid-cols-6">
                        <label className="text-xs font-bold text-slate-500">Probabilidade<input type="number" min={1} max={5} value={form.probabilidade} onChange={(event) => updateForm("probabilidade", Number(event.target.value))} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" /></label>
                        <label className="text-xs font-bold text-slate-500">Impacto<input type="number" min={1} max={5} value={form.impacto} onChange={(event) => updateForm("impacto", Number(event.target.value))} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" /></label>
                        <label className="text-xs font-bold text-slate-500">Velocidade<input type="number" min={1} max={5} value={form.velocidade} onChange={(event) => updateForm("velocidade", Number(event.target.value))} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" /></label>
                        <label className="text-xs font-bold text-slate-500">Perda min<input value={form.perda_minima} onChange={(event) => updateForm("perda_minima", event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" /></label>
                        <label className="text-xs font-bold text-slate-500">Mais provavel<input value={form.perda_mais_provavel} onChange={(event) => updateForm("perda_mais_provavel", event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" /></label>
                        <label className="text-xs font-bold text-slate-500">Perda max<input value={form.perda_maxima} onChange={(event) => updateForm("perda_maxima", event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" /></label>
                      </div>
                      <button type="submit" disabled={isSaving} className="mt-4 inline-flex h-11 items-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 disabled:opacity-60">
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        Criar risco ERIS
                      </button>
                    </form>

                    <div className="overflow-hidden rounded-lg border border-slate-200">
                      <table className="w-full min-w-[980px] text-left text-sm">
                        <caption className="sr-only">Risk register ERIS</caption>
                        <thead className="bg-slate-50 text-xs font-extrabold uppercase text-slate-500">
                          <tr>
                            <th scope="col" className="px-4 py-3">Risco</th>
                            <th scope="col" className="px-4 py-3">Categoria</th>
                            <th scope="col" className="px-4 py-3">Score</th>
                            <th scope="col" className="px-4 py-3">Residual</th>
                            <th scope="col" className="px-4 py-3">VaR P95</th>
                            <th scope="col" className="px-4 py-3">Status</th>
                            <th scope="col" className="px-4 py-3 text-right">Acoes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredRisks.map((risk) => (
                            <tr key={risk.id} className="hover:bg-slate-50">
                              <td className="px-4 py-4">
                                <strong className="block text-slate-950">{risk.codigo} · {risk.titulo}</strong>
                                <span className="text-xs text-slate-500">{risk.setor} · {risk.responsavel}</span>
                              </td>
                              <td className="px-4 py-4 text-slate-600">{risk.categoria}</td>
                              <td className="px-4 py-4">
                                <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${classStyles[risk.classificacao]}`}>{risk.classificacao} {risk.nivel_risco}</span>
                              </td>
                              <td className="px-4 py-4 font-semibold text-slate-700">{risk.residual_score}</td>
                              <td className="px-4 py-4 font-semibold text-slate-950">{currency(risk.var_p95)}</td>
                              <td className="px-4 py-4 text-slate-600">{statusLabels[risk.status]}</td>
                              <td className="px-4 py-4 text-right">
                                <div className="flex justify-end gap-2">
                                  <button type="button" onClick={() => transitionRisk(risk, "EM_TRATAMENTO")} className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100">Tratar</button>
                                  <button type="button" onClick={() => transitionRisk(risk, "ACEITO_FORMALMENTE")} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200">Aceitar</button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {view === "graph" && (
                  <div className="space-y-6">
                    <SectionHeader title="Risk Graph" description="Grafo de propriedade: causas, riscos, consequencias, processos e controles conectados." />
                    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
                      <div className="relative min-h-[520px] overflow-hidden rounded-lg border border-slate-200 bg-slate-950 p-6 text-white">
                        {graph.nodes.slice(0, 30).map((node, index) => {
                          const x = 8 + ((index * 23) % 78);
                          const y = 10 + ((index * 37) % 76);
                          const color = node.type === "RISCO" ? "bg-red-500" : node.type === "CONTROLE" ? "bg-emerald-400" : node.type === "PROCESSO" ? "bg-blue-400" : "bg-slate-300";
                          return (
                            <div key={node.id} className="absolute" style={{ left: `${x}%`, top: `${y}%` }}>
                              <div className={`h-4 w-4 rounded-full ${color} shadow-lg shadow-white/20`} />
                              <span className="mt-1 block max-w-28 truncate text-[10px] text-slate-200">{node.title}</span>
                            </div>
                          );
                        })}
                        <div className="absolute bottom-5 left-5 rounded-lg bg-white/10 p-3 text-xs text-slate-200">
                          {graph.nodes.length} nos · {graph.edges.length} arestas · Bow-Tie automatico
                        </div>
                      </div>
                      <aside className="rounded-lg border border-slate-200 p-5">
                        <h3 className="font-semibold">Algoritmos preparados</h3>
                        <ul className="mt-4 space-y-3 text-sm text-slate-600">
                          <li>Louvain para clusters sistemicos.</li>
                          <li>PageRank para riscos-pivo.</li>
                          <li>Bow-Tie por causa-evento-consequencia.</li>
                          <li>Busca semantica futura por embeddings JSONB/pgvector.</li>
                        </ul>
                      </aside>
                    </div>
                  </div>
                )}

                {view === "matrix" && (
                  <div className="space-y-6">
                    <SectionHeader title="Matriz Interativa de Nova Geracao" description="Probabilidade x impacto com camada residual, velocidade e leitura de apetite." />
                    <div className="relative min-h-[560px] rounded-lg border border-slate-200 bg-gradient-to-tr from-emerald-50 via-amber-50 to-red-100 p-6">
                      <div className="absolute bottom-6 left-6 text-xs font-bold text-slate-500">Probabilidade</div>
                      <div className="absolute left-6 top-6 text-xs font-bold text-slate-500">Impacto</div>
                      {filteredRisks.map((risk) => (
                        <div key={risk.id}>
                          <div
                            className="absolute h-3 w-3 rounded-full bg-red-600 shadow-lg"
                            style={{ left: `${10 + risk.probabilidade * 16}%`, bottom: `${10 + risk.impacto * 15}%` }}
                            title={risk.titulo}
                          />
                          <div
                            className="absolute h-3 w-3 rounded-full bg-blue-600 shadow-lg"
                            style={{ left: `${10 + Math.max(1, risk.probabilidade - 1) * 16}%`, bottom: `${10 + Math.max(1, risk.impacto - 1) * 15}%` }}
                            title={`${risk.titulo} residual`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {view === "montecarlo" && (
                  <div className="space-y-6">
                    <SectionHeader title="Motor Probabilistico" description="Simulacao PERT simplificada no cliente com VaR, CVaR e curva de excedencia." />
                    <select value={selectedSimulationRisk?.id ?? ""} onChange={(event) => setSimulatedRiskId(event.target.value)} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-300">
                      {riscos.map((risk) => <option key={risk.id} value={risk.id}>{risk.codigo} · {risk.titulo}</option>)}
                    </select>
                    {simulation && selectedSimulationRisk && (
                      <div className="grid gap-4 md:grid-cols-5">
                        <KpiCard label="P50" value={currency(simulation.p50)} description={selectedSimulationRisk.distribuicao} icon={Target} tone="bg-blue-50 text-blue-600" />
                        <KpiCard label="P90" value={currency(simulation.p90)} description="Percentil 90" icon={LineChart} tone="bg-violet-50 text-violet-600" />
                        <KpiCard label="VaR P95" value={currency(simulation.p95)} description="Value at Risk" icon={AlertTriangle} tone="bg-orange-50 text-orange-600" />
                        <KpiCard label="P99" value={currency(simulation.p99)} description="Evento extremo" icon={ShieldAlert} tone="bg-red-50 text-red-600" />
                        <KpiCard label="CVaR" value={currency(simulation.cvar95)} description="Expected shortfall" icon={BrainCircuit} tone="bg-slate-100 text-slate-700" />
                      </div>
                    )}
                  </div>
                )}

                {view === "scenarios" && (
                  <div className="space-y-6">
                    <SectionHeader title="What-if & Stress Testing" description="Cenarios nomeados para CFO: choque macro, ransomware, greve, fornecedor unico e backtesting." />
                    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
                      <div className="rounded-lg border border-slate-200 p-5">
                        <div className="grid gap-3 md:grid-cols-3">
                          <input value={scenarioName} onChange={(event) => setScenarioName(event.target.value)} className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-semibold" />
                          <label className="text-xs font-bold text-slate-500">Choque %<input type="number" value={scenarioShock} onChange={(event) => setScenarioShock(Number(event.target.value))} className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm" /></label>
                          <button type="button" onClick={runScenario} className="h-11 self-end rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white">Rodar cenario</button>
                        </div>
                        {scenarioResult && (
                          <div className="mt-5 grid gap-4 md:grid-cols-2">
                            <KpiCard label="VaR P95 Cenario" value={currency(scenarioResult.var_p95)} description={scenarioResult.nome} icon={LineChart} tone="bg-orange-50 text-orange-600" />
                            <KpiCard label="CVaR Cenario" value={currency(scenarioResult.cvar_p95)} description={scenarioResult.status} icon={AlertTriangle} tone="bg-red-50 text-red-600" />
                          </div>
                        )}
                      </div>
                      <aside className="rounded-lg border border-slate-200 p-5">
                        <h3 className="font-semibold">Cenarios predefinidos</h3>
                        <div className="mt-4 space-y-2 text-sm text-slate-600">
                          <p>Recessao 2026</p>
                          <p>Ataque ransomware critico</p>
                          <p>Saida de fornecedor unico</p>
                          <p>Greve logistica 30 dias</p>
                        </div>
                      </aside>
                    </div>
                  </div>
                )}

                {view === "kri" && (
                  <div className="space-y-6">
                    <SectionHeader title="KRI Engine" description="Indicadores-chave de risco vivos com limites, anomalia, forecast e workflow." />
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <KpiCard label="KRIs" value={riscos.reduce((sum, risk) => sum + risk.kri, 0)} description="Vinculados aos riscos" icon={Gauge} tone="bg-blue-50 text-blue-600" />
                      <KpiCard label="Vermelhos" value={analytics.kriVermelho} description="Disparam tratamento" icon={AlertTriangle} tone="bg-red-50 text-red-600" />
                      <KpiCard label="Forecast" value="30/60/90" description="Preparado para ARIMA/Prophet" icon={LineChart} tone="bg-violet-50 text-violet-600" />
                      <KpiCard label="Fonte" value="SQL/API" description="Webhook, ERP, sensor ou CSV" icon={DatabaseZap} tone="bg-emerald-50 text-emerald-600" />
                    </div>
                  </div>
                )}

                {view === "controls" && (
                  <div className="space-y-6">
                    <SectionHeader title="Controle Interno como Cidadao de Primeira Classe" description="Catalogo COSO/NIST/ISO, CSA, teste de controle e matriz risco x controle." />
                    <div className="grid gap-4 lg:grid-cols-3">
                      {["Preventivo", "Detectivo", "Corretivo"].map((type) => (
                        <article key={type} className="rounded-lg border border-slate-200 p-5">
                          <ShieldCheck className="h-6 w-6 text-blue-600" />
                          <h3 className="mt-4 font-semibold">Controle {type}</h3>
                          <p className="mt-2 text-sm leading-6 text-slate-500">Design effectiveness, operating effectiveness, evidencias e proxima testagem.</p>
                        </article>
                      ))}
                    </div>
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
                      Mapa de cobertura: riscos com seta residual curta indicam controle fraco ou inefetivo.
                    </div>
                  </div>
                )}

                {view === "rca" && (
                  <div className="space-y-6">
                    <SectionHeader title="RCA Integrado" description="Ishikawa 6M, 5 Whys estruturado, FTA e Pareto automatico das causas." />
                    <div className="grid gap-4 md:grid-cols-2">
                      {["Metodo", "Maquina", "Material", "Mao-de-obra", "Meio", "Medicao"].map((item) => (
                        <div key={item} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                          <h3 className="font-semibold">{item}</h3>
                          <p className="mt-2 text-sm text-slate-500">Causas e evidencias vinculadas aos riscos.</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {view === "opportunities" && (
                  <div className="space-y-6">
                    <SectionHeader title="Opportunity Engine" description="ISO 31000 trata incerteza tambem como upside: valor esperado, ROI e portfolio otimo." />
                    <div className="grid gap-4 md:grid-cols-3">
                      <KpiCard label="Oportunidades" value={riscos.filter((risk) => risk.estrategia === "Explorar").length} description="Upside registrado" icon={Sparkles} tone="bg-emerald-50 text-emerald-600" />
                      <KpiCard label="ROI esperado" value="A calcular" description="Valor esperado x esforco" icon={Target} tone="bg-blue-50 text-blue-600" />
                      <KpiCard label="Pareto" value="Portfolio" description="Sugestao por orcamento" icon={BarChart3} tone="bg-violet-50 text-violet-600" />
                    </div>
                  </div>
                )}

                {view === "audit" && (
                  <div className="space-y-6">
                    <SectionHeader title="Auditoria e Continuous Assurance" description="Hash-chain, eventos, RBA, papeis de trabalho, achados e maturidade COSO ERM." />
                    <div className="grid gap-4 md:grid-cols-3">
                      <KpiCard label="Eventos" value={riscos.reduce((sum, risk) => sum + risk.eventos, 0)} description="Audit trail criptografico" icon={Fingerprint} tone="bg-blue-50 text-blue-600" />
                      <KpiCard label="RBA" value="Ativo" description="Plano baseado em risco" icon={ClipboardCheck} tone="bg-emerald-50 text-emerald-600" />
                      <KpiCard label="Maturidade" value="COSO" description="Inicial a otimizado" icon={Layers3} tone="bg-violet-50 text-violet-600" />
                    </div>
                  </div>
                )}

                {view === "governance" && (
                  <div className="space-y-6">
                    <SectionHeader title="Governanca, RBAC/ABAC e Compliance" description="Tres Linhas, segregacao de funcoes, apetite/tolerancia e aceite C-level." />
                    <div className="grid gap-4 lg:grid-cols-2">
                      <article className="rounded-lg border border-slate-200 p-5">
                        <h3 className="font-semibold">Modelo de Tres Linhas</h3>
                        <ul className="mt-4 space-y-3 text-sm text-slate-600">
                          <li>1a linha: owners operacionais avaliam e tratam riscos.</li>
                          <li>2a linha: risco/compliance define metodologia e desafia avaliacao.</li>
                          <li>3a linha: auditoria consulta trilhas, controles e evidencias.</li>
                        </ul>
                      </article>
                      <article className="rounded-lg border border-slate-200 p-5">
                        <h3 className="font-semibold">Apetite de risco</h3>
                        <p className="mt-3 text-sm leading-6 text-slate-500">Risk Appetite Statement versionado, hard limits por categoria e bloqueio de aceite acima do toleravel sem escalonamento ao conselho.</p>
                        <button type="button" className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white">
                          <LockKeyhole className="h-4 w-4" />
                          Ver statement
                        </button>
                      </article>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}
