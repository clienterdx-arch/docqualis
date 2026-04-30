"use client";

import React, { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  CircleGauge,
  ClipboardList,
  FileSpreadsheet,
  Filter,
  Layers3,
  LineChart,
  Loader2,
  Plus,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Target,
  X,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { carregarPerfilUsuario } from "@/lib/perfil";
import { classificarStatusIndicador, statusLabel } from "@/lib/indicadores/status";
import type {
  IndicadorCategoriaDonabedian,
  IndicadorDimensaoQualidade,
  IndicadorPolaridade,
  IndicadorResumo,
  IndicadorStatus,
  IndicadorTipoCalculo,
} from "@/types/indicadores";

type ViewMode = "tabela" | "setores" | "kanban" | "estrategico" | "risco";

type PerfilIndicadores = {
  empresa_id?: string | null;
  nome?: string | null;
  perfil_acesso?: string | null;
};

type NovoIndicadorForm = {
  nome: string;
  setor: string;
  responsavel: string;
  categoria_donabedian: IndicadorCategoriaDonabedian;
  dimensao_qualidade: IndicadorDimensaoQualidade;
  tipo_calculo: IndicadorTipoCalculo;
  unidade: string;
  meta: string;
  polaridade: IndicadorPolaridade;
  frequencia: string;
  perspectiva_bsc: string;
};

const emptyForm: NovoIndicadorForm = {
  nome: "",
  setor: "",
  responsavel: "",
  categoria_donabedian: "PROCESSO",
  dimensao_qualidade: "SEGURANCA",
  tipo_calculo: "percentual",
  unidade: "%",
  meta: "",
  polaridade: "MAIOR_MELHOR",
  frequencia: "mensal",
  perspectiva_bsc: "Processos Internos",
};

const statusStyles: Record<IndicadorStatus, string> = {
  dentro_meta: "border-emerald-200 bg-emerald-50 text-emerald-700",
  alerta: "border-amber-200 bg-amber-50 text-amber-700",
  critico: "border-red-200 bg-red-50 text-red-700",
  sem_dados: "border-slate-200 bg-slate-50 text-slate-600",
  desatualizado: "border-orange-200 bg-orange-50 text-orange-700",
};

const statusOrder: IndicadorStatus[] = ["dentro_meta", "alerta", "critico", "sem_dados", "desatualizado"];

function readText(row: Record<string, unknown>, key: string, fallback = ""): string {
  const value = row[key];
  return typeof value === "string" ? value : fallback;
}

function readNumber(row: Record<string, unknown>, key: string): number | null {
  const value = row[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeStatus(value: string, indicator: Pick<IndicadorResumo, "meta" | "polaridade" | "ultimo_resultado">): IndicadorStatus {
  if (statusOrder.includes(value as IndicadorStatus)) return value as IndicadorStatus;
  return classificarStatusIndicador({
    valor: indicator.ultimo_resultado,
    meta: indicator.meta,
    polaridade: indicator.polaridade,
  });
}

function mapIndicador(row: Record<string, unknown>): IndicadorResumo {
  const meta = readNumber(row, "meta");
  const ultimoResultado = readNumber(row, "ultimo_resultado");
  const polaridade = (readText(row, "polaridade", "MAIOR_MELHOR") as IndicadorPolaridade) || "MAIOR_MELHOR";
  const base = {
    id: readText(row, "id"),
    empresa_id: readText(row, "empresa_id"),
    codigo: readText(row, "codigo") || null,
    nome: readText(row, "nome", "Indicador sem nome"),
    setor: readText(row, "setor") || null,
    responsavel: readText(row, "responsavel") || null,
    categoria_donabedian: (readText(row, "categoria_donabedian", "PROCESSO") as IndicadorCategoriaDonabedian) || "PROCESSO",
    dimensao_qualidade: (readText(row, "dimensao_qualidade") as IndicadorDimensaoQualidade) || null,
    tipo_calculo: (readText(row, "tipo_calculo", readText(row, "tipo", "absoluto")) as IndicadorTipoCalculo) || "absoluto",
    unidade: readText(row, "unidade") || null,
    meta,
    polaridade,
    frequencia: readText(row, "frequencia", "mensal"),
    ultimo_periodo: readText(row, "ultimo_periodo") || null,
    ultimo_resultado: ultimoResultado,
    ultima_atualizacao: readText(row, "ultima_atualizacao") || null,
  };

  return {
    ...base,
    status: normalizeStatus(readText(row, "status", "sem_dados"), base),
  };
}

function formatNumber(value: number | null | undefined, unidade?: string | null): string {
  if (value == null || Number.isNaN(value)) return "-";
  const formatted = value.toLocaleString("pt-BR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: unidade === "%" ? 1 : 0,
  });
  return unidade === "%" ? `${formatted}%` : `${formatted}${unidade ? ` ${unidade}` : ""}`;
}

function KpiCard({
  label,
  value,
  description,
  tone,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  description: string;
  tone: string;
  icon: React.ElementType;
}) {
  return (
    <div className="min-h-[118px] rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className={`grid h-10 w-10 place-items-center rounded-lg ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
        <strong className="text-3xl font-semibold tracking-normal text-slate-950">{value}</strong>
      </div>
      <div className="mt-4">
        <h3 className="text-xs font-extrabold uppercase tracking-normal text-slate-950">{label}</h3>
        <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-blue-50 text-blue-600">
        <BarChart3 className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-950">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

export default function GestaoIndicadoresPage() {
  const router = useRouter();
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [usuarioNome, setUsuarioNome] = useState("usuario");
  const [indicadores, setIndicadores] = useState<IndicadorResumo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [setorFiltro, setSetorFiltro] = useState("todos");
  const [viewMode, setViewMode] = useState<ViewMode>("tabela");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState<NovoIndicadorForm>(emptyForm);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;

      if (!data.session) {
        router.push("/login");
        return;
      }

      const perfil = await carregarPerfilUsuario<PerfilIndicadores>(data.session, "empresa_id, nome, perfil_acesso");
      if (!active) return;

      if (!perfil?.empresa_id) {
        setErrorMessage("Nao foi possivel identificar a empresa vinculada ao usuario.");
        setIsLoading(false);
        return;
      }

      setEmpresaId(perfil.empresa_id);
      setUsuarioNome(perfil.nome ?? data.session.user.email ?? "usuario");
    });

    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    if (!empresaId) return;
    let active = true;

    supabase
      .from("indicadores")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("setor", { ascending: true })
      .order("nome", { ascending: true })
      .then(({ data, error }) => {
        if (!active) return;

        if (error) {
          setErrorMessage("Nao foi possivel carregar os indicadores desta empresa.");
          setIndicadores([]);
        } else {
          const rows = Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
          setIndicadores(rows.map(mapIndicador));
        }

        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [empresaId]);

  const setores = useMemo(() => {
    const unique = new Set(indicadores.map((indicador) => indicador.setor ?? "Sem setor"));
    return Array.from(unique).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [indicadores]);

  const indicadoresFiltrados = useMemo(() => {
    const term = search.trim().toLowerCase();
    return indicadores.filter((indicador) => {
      const matchesSetor = setorFiltro === "todos" || (indicador.setor ?? "Sem setor") === setorFiltro;
      const matchesSearch = !term || [
        indicador.nome,
        indicador.codigo,
        indicador.setor,
        indicador.responsavel,
        indicador.categoria_donabedian,
        indicador.dimensao_qualidade,
      ].some((value) => String(value ?? "").toLowerCase().includes(term));

      return matchesSetor && matchesSearch;
    });
  }, [indicadores, search, setorFiltro]);

  const kpis = useMemo(() => {
    const total = indicadores.length;
    const naMeta = indicadores.filter((item) => item.status === "dentro_meta").length;
    const alerta = indicadores.filter((item) => item.status === "alerta").length;
    const critico = indicadores.filter((item) => item.status === "critico").length;
    const semDados = indicadores.filter((item) => item.status === "sem_dados" || item.status === "desatualizado").length;
    const saude = total === 0 ? 0 : Math.round((naMeta / total) * 100);

    return { total, naMeta, alerta, critico, semDados, saude };
  }, [indicadores]);

  const indicadoresPorSetor = useMemo(() => {
    return indicadoresFiltrados.reduce<Record<string, IndicadorResumo[]>>((acc, indicador) => {
      const key = indicador.setor ?? "Sem setor";
      acc[key] = [...(acc[key] ?? []), indicador];
      return acc;
    }, {});
  }, [indicadoresFiltrados]);

  const indicadoresPorBsc = useMemo(() => {
    return indicadoresFiltrados.reduce<Record<string, IndicadorResumo[]>>((acc, indicador) => {
      const key = indicador.categoria_donabedian === "ESTRATEGICO" ? "Estrategica" : indicador.categoria_donabedian;
      acc[key] = [...(acc[key] ?? []), indicador];
      return acc;
    }, {});
  }, [indicadoresFiltrados]);

  function updateForm<K extends keyof NovoIndicadorForm>(key: K, value: NovoIndicadorForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleCreateIndicador(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!empresaId) return;

    const nome = form.nome.trim();
    if (!nome) {
      setErrorMessage("Informe o nome do indicador antes de salvar.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const payload = {
      empresa_id: empresaId,
      nome,
      setor: form.setor.trim() || "Sem setor",
      responsavel: form.responsavel.trim() || usuarioNome,
      categoria_donabedian: form.categoria_donabedian,
      dimensao_qualidade: form.dimensao_qualidade,
      tipo_calculo: form.tipo_calculo,
      tipo: form.tipo_calculo,
      unidade: form.unidade.trim() || null,
      meta: form.meta.trim() ? Number(form.meta.replace(",", ".")) : null,
      polaridade: form.polaridade,
      frequencia: form.frequencia,
      perspectiva_bsc: form.perspectiva_bsc,
      status: "sem_dados",
    };

    const { data, error } = await supabase.from("indicadores").insert(payload).select("*").single();

    if (error) {
      setErrorMessage("Nao foi possivel criar o indicador. Verifique o vinculo da empresa e tente novamente.");
      setIsSaving(false);
      return;
    }

    const row = data as Record<string, unknown>;
    setIndicadores((current) => [mapIndicador(row), ...current]);
    setForm(emptyForm);
    setIsCreateOpen(false);
    setSuccessMessage("Indicador criado com sucesso.");
    setIsSaving(false);
  }

  function exportarCsv() {
    const headers = ["Nome", "Setor", "Responsavel", "Categoria", "Dimensao", "Meta", "Status"];
    const rows = indicadoresFiltrados.map((item) => [
      item.nome,
      item.setor ?? "",
      item.responsavel ?? "",
      item.categoria_donabedian,
      item.dimensao_qualidade ?? "",
      formatNumber(item.meta, item.unidade),
      statusLabel(item.status),
    ]);

    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map((row) => row.map(escape).join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `indicadores-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-8 py-8 text-slate-950">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-6">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-extrabold uppercase tracking-normal text-blue-700">
              <BarChart3 className="h-3.5 w-3.5" />
              Gestao de Indicadores
            </span>
            <h1 className="mt-4 text-4xl font-semibold tracking-normal text-slate-950">Central de Indicadores</h1>
            <p className="mt-2 max-w-3xl text-base leading-7 text-slate-600">
              Monitore estrutura, processo, resultado e estrategia com isolamento por empresa, leitura executiva e base preparada para SPC.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={exportarCsv}
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-700"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Exportar CSV
            </button>
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Novo KPI
            </button>
          </div>
        </header>

        {errorMessage && (
          <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            <AlertTriangle className="h-4 w-4" />
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            {successMessage}
          </div>
        )}

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-6">
          <KpiCard label="Cadastrados" value={kpis.total} description="Indicadores ativos na empresa" tone="bg-blue-50 text-blue-600" icon={ClipboardList} />
          <KpiCard label="Na meta" value={kpis.naMeta} description="Resultado dentro do esperado" tone="bg-emerald-50 text-emerald-600" icon={CheckCircle2} />
          <KpiCard label="Em alerta" value={kpis.alerta} description="Requer acompanhamento" tone="bg-amber-50 text-amber-600" icon={CircleGauge} />
          <KpiCard label="Criticos" value={kpis.critico} description="Fora da meta ou em risco" tone="bg-red-50 text-red-600" icon={ShieldAlert} />
          <KpiCard label="Sem dados" value={kpis.semDados} description="Sem alimentacao recente" tone="bg-slate-100 text-slate-600" icon={LineChart} />
          <KpiCard label="Saude" value={`${kpis.saude}%`} description="Proporcao dentro da meta" tone="bg-violet-50 text-violet-600" icon={Target} />
        </section>

        <section className="grid gap-6 xl:grid-cols-[280px_1fr]">
          <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold uppercase tracking-normal text-slate-500">Navegacao</h2>
              <Filter className="h-4 w-4 text-slate-400" />
            </div>

            <button
              type="button"
              onClick={() => setSetorFiltro("todos")}
              className={`mt-4 flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold transition ${setorFiltro === "todos" ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"}`}
            >
              Todos os setores
              <span>{indicadores.length}</span>
            </button>

            <div className="mt-2 space-y-1">
              {setores.map((setor) => {
                const count = indicadores.filter((indicador) => (indicador.setor ?? "Sem setor") === setor).length;
                return (
                  <button
                    type="button"
                    key={setor}
                    onClick={() => setSetorFiltro(setor)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-semibold transition ${setorFiltro === setor ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"}`}
                  >
                    <span className="truncate">{setor}</span>
                    <span className="ml-3 text-xs text-slate-400">{count}</span>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="sticky top-0 z-10 border-b border-slate-100 bg-white/95 p-4 backdrop-blur">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <label className="relative block min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar indicador, setor, responsavel ou categoria..."
                    className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100"
                  />
                </label>

                <div className="flex flex-wrap gap-2">
                  {([
                    ["tabela", "Tabela"],
                    ["setores", "Setores"],
                    ["kanban", "Kanban"],
                    ["estrategico", "Mapa"],
                    ["risco", "Risco x Impacto"],
                  ] as Array<[ViewMode, string]>).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setViewMode(key)}
                      className={`h-10 rounded-lg px-3 text-xs font-extrabold uppercase tracking-normal transition ${viewMode === key ? "bg-blue-600 text-white shadow-sm shadow-blue-600/20" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-5">
              {isLoading ? (
                <div className="grid min-h-[360px] place-items-center text-blue-600">
                  <div className="flex items-center gap-3 text-sm font-semibold">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Carregando indicadores...
                  </div>
                </div>
              ) : indicadoresFiltrados.length === 0 ? (
                <EmptyState
                  title="Nenhum indicador encontrado"
                  description="Crie o primeiro KPI ou ajuste os filtros para visualizar a base de indicadores desta empresa."
                />
              ) : (
                <>
                  {viewMode === "tabela" && (
                    <div className="overflow-hidden rounded-lg border border-slate-200">
                      <table className="w-full min-w-[980px] border-collapse text-left">
                        <caption className="sr-only">Tabela da central de indicadores</caption>
                        <thead className="bg-slate-50 text-[11px] font-extrabold uppercase tracking-normal text-slate-500">
                          <tr>
                            <th scope="col" className="px-4 py-3">Indicador</th>
                            <th scope="col" className="px-4 py-3">Setor</th>
                            <th scope="col" className="px-4 py-3">Categoria</th>
                            <th scope="col" className="px-4 py-3">Meta</th>
                            <th scope="col" className="px-4 py-3">Resultado</th>
                            <th scope="col" className="px-4 py-3">Status</th>
                            <th scope="col" className="px-4 py-3 text-right">Acoes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                          {indicadoresFiltrados.map((indicador) => (
                            <tr key={indicador.id} className="hover:bg-slate-50">
                              <td className="px-4 py-4">
                                <div className="font-semibold text-slate-950">{indicador.nome}</div>
                                <div className="mt-1 text-xs text-slate-500">{indicador.codigo ?? indicador.responsavel ?? "Sem responsavel definido"}</div>
                              </td>
                              <td className="px-4 py-4 text-slate-600">{indicador.setor ?? "Sem setor"}</td>
                              <td className="px-4 py-4 text-slate-600">{indicador.categoria_donabedian}</td>
                              <td className="px-4 py-4 font-semibold text-slate-700">{formatNumber(indicador.meta, indicador.unidade)}</td>
                              <td className="px-4 py-4 font-semibold text-slate-950">{formatNumber(indicador.ultimo_resultado, indicador.unidade)}</td>
                              <td className="px-4 py-4">
                                <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${statusStyles[indicador.status]}`}>
                                  {statusLabel(indicador.status)}
                                </span>
                              </td>
                              <td className="px-4 py-4 text-right">
                                <button
                                  type="button"
                                  onClick={() => router.push(`/indicadores/${indicador.id}`)}
                                  className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50"
                                >
                                  Abrir
                                  <ChevronRight className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {viewMode === "setores" && (
                    <div className="space-y-4">
                      {Object.entries(indicadoresPorSetor).map(([setor, items]) => (
                        <section key={setor} className="rounded-lg border border-slate-200 p-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-slate-950">{setor}</h3>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{items.length} KPI</span>
                          </div>
                          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {items.map((indicador) => (
                              <article key={indicador.id} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                                <div className="flex items-start justify-between gap-3">
                                  <h4 className="font-semibold text-slate-950">{indicador.nome}</h4>
                                  <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-bold ${statusStyles[indicador.status]}`}>
                                    {statusLabel(indicador.status)}
                                  </span>
                                </div>
                                <p className="mt-2 text-xs leading-5 text-slate-500">{indicador.responsavel ?? "Sem responsavel"}</p>
                              </article>
                            ))}
                          </div>
                        </section>
                      ))}
                    </div>
                  )}

                  {viewMode === "kanban" && (
                    <div className="grid gap-4 xl:grid-cols-5">
                      {statusOrder.map((status) => (
                        <section key={status} className="min-h-[420px] rounded-lg border border-slate-200 bg-slate-50 p-3">
                          <div className="mb-3 flex items-center justify-between">
                            <h3 className="text-xs font-extrabold uppercase tracking-normal text-slate-600">{statusLabel(status)}</h3>
                            <span className="text-xs font-bold text-slate-400">{indicadoresFiltrados.filter((item) => item.status === status).length}</span>
                          </div>
                          <div className="space-y-3">
                            {indicadoresFiltrados.filter((item) => item.status === status).map((indicador) => (
                              <article key={indicador.id} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                                <h4 className="text-sm font-semibold text-slate-950">{indicador.nome}</h4>
                                <p className="mt-2 text-xs text-slate-500">{indicador.setor ?? "Sem setor"}</p>
                              </article>
                            ))}
                          </div>
                        </section>
                      ))}
                    </div>
                  )}

                  {viewMode === "estrategico" && (
                    <div className="grid gap-4 xl:grid-cols-2">
                      {["ESTRATEGICO", "RESULTADO", "PROCESSO", "ESTRUTURA"].map((perspectiva) => (
                        <section key={perspectiva} className="rounded-lg border border-slate-200 p-5">
                          <div className="flex items-center gap-3">
                            <div className="grid h-10 w-10 place-items-center rounded-lg bg-blue-50 text-blue-600">
                              <Layers3 className="h-5 w-5" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-slate-950">{perspectiva}</h3>
                              <p className="text-xs text-slate-500">Leitura estrategica por classificacao</p>
                            </div>
                          </div>
                          <div className="mt-4 space-y-2">
                            {(indicadoresPorBsc[perspectiva] ?? []).map((indicador) => (
                              <div key={indicador.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                                <span className="font-semibold text-slate-700">{indicador.nome}</span>
                                <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${statusStyles[indicador.status]}`}>
                                  {statusLabel(indicador.status)}
                                </span>
                              </div>
                            ))}
                            {(indicadoresPorBsc[perspectiva] ?? []).length === 0 && (
                              <p className="rounded-lg bg-slate-50 px-3 py-6 text-center text-sm font-semibold text-slate-400">Sem indicadores nesta categoria.</p>
                            )}
                          </div>
                        </section>
                      ))}
                    </div>
                  )}

                  {viewMode === "risco" && (
                    <div className="rounded-lg border border-slate-200 p-5">
                      <div className="mb-5 flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-slate-950">Matriz de Risco x Impacto</h3>
                          <p className="text-sm text-slate-500">Preparada para receber os vinculos do modulo de riscos.</p>
                        </div>
                        <SlidersHorizontal className="h-5 w-5 text-slate-400" />
                      </div>
                      <div className="grid grid-cols-5 gap-2">
                        {Array.from({ length: 25 }).map((_, index) => {
                          const row = Math.floor(index / 5) + 1;
                          const col = (index % 5) + 1;
                          const score = row * col;
                          const tone = score >= 16 ? "bg-red-50 text-red-700 border-red-100" : score >= 9 ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-emerald-50 text-emerald-700 border-emerald-100";
                          return (
                            <div key={`${row}-${col}`} className={`min-h-20 rounded-lg border p-3 ${tone}`}>
                              <div className="text-xs font-bold">P{row} x I{col}</div>
                              <div className="mt-3 text-2xl font-semibold">0</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        </section>
      </div>

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <form onSubmit={handleCreateIndicador} className="w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">Novo KPI</h2>
                <p className="mt-1 text-sm text-slate-500">Cadastre a ficha minima para iniciar a gestao do indicador.</p>
              </div>
              <button type="button" onClick={() => setIsCreateOpen(false)} className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-4 px-6 py-5 md:grid-cols-2">
              <label className="md:col-span-2">
                <span className="text-xs font-extrabold uppercase tracking-normal text-slate-500">Nome do indicador</span>
                <input value={form.nome} onChange={(event) => updateForm("nome", event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100" placeholder="Ex: Higienizacao das maos" />
              </label>

              <label>
                <span className="text-xs font-extrabold uppercase tracking-normal text-slate-500">Setor</span>
                <input value={form.setor} onChange={(event) => updateForm("setor", event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100" placeholder="Ex: UTI" />
              </label>

              <label>
                <span className="text-xs font-extrabold uppercase tracking-normal text-slate-500">Responsavel</span>
                <input value={form.responsavel} onChange={(event) => updateForm("responsavel", event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100" placeholder={usuarioNome} />
              </label>

              <label>
                <span className="text-xs font-extrabold uppercase tracking-normal text-slate-500">Donabedian</span>
                <select value={form.categoria_donabedian} onChange={(event) => updateForm("categoria_donabedian", event.target.value as IndicadorCategoriaDonabedian)} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100">
                  <option value="ESTRUTURA">Estrutura</option>
                  <option value="PROCESSO">Processo</option>
                  <option value="RESULTADO">Resultado</option>
                  <option value="ESTRATEGICO">Estrategico</option>
                </select>
              </label>

              <label>
                <span className="text-xs font-extrabold uppercase tracking-normal text-slate-500">Dimensao da qualidade</span>
                <select value={form.dimensao_qualidade} onChange={(event) => updateForm("dimensao_qualidade", event.target.value as IndicadorDimensaoQualidade)} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100">
                  <option value="SEGURANCA">Seguranca</option>
                  <option value="EFETIVIDADE">Efetividade</option>
                  <option value="CENTRALIDADE_PACIENTE">Centralidade no paciente</option>
                  <option value="OPORTUNIDADE">Oportunidade</option>
                  <option value="EFICIENCIA">Eficiencia</option>
                  <option value="EQUIDADE">Equidade</option>
                </select>
              </label>

              <label>
                <span className="text-xs font-extrabold uppercase tracking-normal text-slate-500">Tipo de calculo</span>
                <select value={form.tipo_calculo} onChange={(event) => updateForm("tipo_calculo", event.target.value as IndicadorTipoCalculo)} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100">
                  <option value="absoluto">Absoluto</option>
                  <option value="percentual">Percentual</option>
                  <option value="taxa">Taxa</option>
                  <option value="razao">Razao</option>
                  <option value="media">Media</option>
                  <option value="mediana">Mediana</option>
                  <option value="soma">Soma</option>
                  <option value="contagem">Contagem</option>
                </select>
              </label>

              <label>
                <span className="text-xs font-extrabold uppercase tracking-normal text-slate-500">Polaridade</span>
                <select value={form.polaridade} onChange={(event) => updateForm("polaridade", event.target.value as IndicadorPolaridade)} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100">
                  <option value="MAIOR_MELHOR">Maior melhor</option>
                  <option value="MENOR_MELHOR">Menor melhor</option>
                  <option value="ALVO">Alvo/faixa</option>
                </select>
              </label>

              <label>
                <span className="text-xs font-extrabold uppercase tracking-normal text-slate-500">Meta</span>
                <input value={form.meta} onChange={(event) => updateForm("meta", event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100" placeholder="Ex: 95" inputMode="decimal" />
              </label>

              <label>
                <span className="text-xs font-extrabold uppercase tracking-normal text-slate-500">Unidade</span>
                <input value={form.unidade} onChange={(event) => updateForm("unidade", event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100" placeholder="%, dias, horas" />
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
              <button type="button" onClick={() => setIsCreateOpen(false)} className="h-11 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100">
                Cancelar
              </button>
              <button type="submit" disabled={isSaving} className="inline-flex h-11 items-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Salvar KPI
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
