"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Database,
  FileText,
  History,
  Link2,
  Loader2,
  Plus,
  ShieldAlert,
  Target,
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

type DetailTab = "visao" | "ficha" | "dados" | "analise" | "plano" | "grafico" | "vinculos" | "historico";

type PerfilIndicador = {
  empresa_id?: string | null;
  nome?: string | null;
};

type FichaTecnica = {
  id: string;
  objetivo: string | null;
  formula: string | null;
  fonte_dados: string | null;
  periodicidade_coleta: string | null;
  periodicidade_analise: string | null;
  responsavel_coleta: string | null;
  responsavel_analise: string | null;
  status: string;
};

type MedicaoIndicador = {
  id: string;
  periodo: string;
  valor: number | null;
  data_medicao: string | null;
  responsavel: string | null;
  observacao: string | null;
};

type AnaliseIndicador = {
  id: string;
  periodo: string | null;
  valor_realizado: number | null;
  meta: number | null;
  narrativa: string | null;
  autor: string | null;
  status: string | null;
};

type MedicaoForm = {
  periodo: string;
  valor: string;
  responsavel: string;
  observacao: string;
};

type AnaliseForm = {
  periodo: string;
  narrativa: string;
  plano: string;
};

const tabs: Array<{ key: DetailTab; label: string; icon: React.ElementType }> = [
  { key: "visao", label: "Visao Geral", icon: Target },
  { key: "ficha", label: "Ficha Tecnica", icon: FileText },
  { key: "dados", label: "Dados", icon: Database },
  { key: "analise", label: "Analise Critica", icon: ClipboardCheck },
  { key: "plano", label: "Plano de Acao", icon: ShieldAlert },
  { key: "grafico", label: "Grafico", icon: BarChart3 },
  { key: "vinculos", label: "Vinculos", icon: Link2 },
  { key: "historico", label: "Historico", icon: History },
];

const statusStyles: Record<IndicadorStatus, string> = {
  dentro_meta: "border-emerald-200 bg-emerald-50 text-emerald-700",
  alerta: "border-amber-200 bg-amber-50 text-amber-700",
  critico: "border-red-200 bg-red-50 text-red-700",
  sem_dados: "border-slate-200 bg-slate-50 text-slate-600",
  desatualizado: "border-orange-200 bg-orange-50 text-orange-700",
};

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

function mapIndicador(row: Record<string, unknown>): IndicadorResumo {
  const meta = readNumber(row, "meta");
  const ultimoResultado = readNumber(row, "ultimo_resultado");
  const polaridade = (readText(row, "polaridade", "MAIOR_MELHOR") as IndicadorPolaridade) || "MAIOR_MELHOR";
  const statusRaw = readText(row, "status", "sem_dados") as IndicadorStatus;
  const status = ["dentro_meta", "alerta", "critico", "sem_dados", "desatualizado"].includes(statusRaw)
    ? statusRaw
    : classificarStatusIndicador({ valor: ultimoResultado, meta, polaridade });

  return {
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
    status,
    ultimo_periodo: readText(row, "ultimo_periodo") || null,
    ultimo_resultado: ultimoResultado,
    ultima_atualizacao: readText(row, "ultima_atualizacao") || null,
  };
}

function mapMedicao(row: Record<string, unknown>): MedicaoIndicador {
  return {
    id: readText(row, "id"),
    periodo: readText(row, "periodo", readText(row, "data_medicao", "-")),
    valor: readNumber(row, "valor"),
    data_medicao: readText(row, "data_medicao") || null,
    responsavel: readText(row, "responsavel") || null,
    observacao: readText(row, "observacao") || null,
  };
}

function mapAnalise(row: Record<string, unknown>): AnaliseIndicador {
  return {
    id: readText(row, "id"),
    periodo: readText(row, "periodo") || null,
    valor_realizado: readNumber(row, "valor_realizado"),
    meta: readNumber(row, "meta"),
    narrativa: readText(row, "narrativa") || null,
    autor: readText(row, "autor") || null,
    status: readText(row, "status") || null,
  };
}

function mapFicha(row: Record<string, unknown>): FichaTecnica {
  return {
    id: readText(row, "id"),
    objetivo: readText(row, "objetivo") || null,
    formula: readText(row, "formula") || null,
    fonte_dados: readText(row, "fonte_dados") || null,
    periodicidade_coleta: readText(row, "periodicidade_coleta") || null,
    periodicidade_analise: readText(row, "periodicidade_analise") || null,
    responsavel_coleta: readText(row, "responsavel_coleta") || null,
    responsavel_analise: readText(row, "responsavel_analise") || null,
    status: readText(row, "status", "RASCUNHO"),
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

function InfoCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-extrabold uppercase tracking-normal text-slate-500">{label}</p>
      <strong className="mt-3 block text-2xl font-semibold text-slate-950">{value}</strong>
      <p className="mt-1 text-sm text-slate-500">{hint}</p>
    </div>
  );
}

export default function IndicadorDetalhePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const indicadorId = params.id;
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [usuarioNome, setUsuarioNome] = useState("usuario");
  const [indicador, setIndicador] = useState<IndicadorResumo | null>(null);
  const [ficha, setFicha] = useState<FichaTecnica | null>(null);
  const [medicoes, setMedicoes] = useState<MedicaoIndicador[]>([]);
  const [analises, setAnalises] = useState<AnaliseIndicador[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingFicha, setIsSavingFicha] = useState(false);
  const [isSavingMedicao, setIsSavingMedicao] = useState(false);
  const [isSavingAnalise, setIsSavingAnalise] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>("visao");
  const [medicaoForm, setMedicaoForm] = useState<MedicaoForm>({
    periodo: "",
    valor: "",
    responsavel: "",
    observacao: "",
  });
  const [analiseForm, setAnaliseForm] = useState<AnaliseForm>({
    periodo: "",
    narrativa: "",
    plano: "",
  });

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;

      if (!data.session) {
        router.push("/login");
        return;
      }

      const perfil = await carregarPerfilUsuario<PerfilIndicador>(data.session, "empresa_id, nome");
      if (!active) return;

      if (!perfil?.empresa_id) {
        setErrorMessage("Nao foi possivel identificar a empresa vinculada ao usuario.");
        setIsLoading(false);
        return;
      }

      setEmpresaId(perfil.empresa_id);
      setUsuarioNome(perfil.nome ?? data.session.user.email ?? "usuario");

      const { data: row, error } = await supabase
        .from("indicadores")
        .select("*")
        .eq("empresa_id", perfil.empresa_id)
        .eq("id", indicadorId)
        .single();

      if (!active) return;

      if (error || !row) {
        setErrorMessage("Indicador nao encontrado ou sem permissao de acesso.");
        setIndicador(null);
      } else {
        const mapped = mapIndicador(row as Record<string, unknown>);
        setIndicador(mapped);
        setMedicaoForm((current) => ({
          ...current,
          responsavel: current.responsavel || perfil.nome || data.session.user.email || "",
        }));

        const [fichaResult, medicoesResult, analisesResult] = await Promise.all([
          supabase
            .from("indicadores_ficha_tecnica")
            .select("*")
            .eq("empresa_id", perfil.empresa_id)
            .eq("indicador_id", indicadorId)
            .is("deleted_at", null)
            .order("created_at", { ascending: false })
            .limit(1),
          supabase
            .from("indicadores_medicoes")
            .select("*")
            .eq("empresa_id", perfil.empresa_id)
            .eq("indicador_id", indicadorId)
            .is("deleted_at", null)
            .order("data_medicao", { ascending: true })
            .order("created_at", { ascending: true }),
          supabase
            .from("indicadores_analises")
            .select("*")
            .eq("empresa_id", perfil.empresa_id)
            .eq("indicador_id", indicadorId)
            .is("deleted_at", null)
            .order("created_at", { ascending: false }),
        ]);

        if (!active) return;

        const fichaRows = Array.isArray(fichaResult.data) ? (fichaResult.data as Record<string, unknown>[]) : [];
        const medicaoRows = Array.isArray(medicoesResult.data) ? (medicoesResult.data as Record<string, unknown>[]) : [];
        const analiseRows = Array.isArray(analisesResult.data) ? (analisesResult.data as Record<string, unknown>[]) : [];
        setFicha(fichaRows[0] ? mapFicha(fichaRows[0]) : null);
        setMedicoes(medicaoRows.map(mapMedicao));
        setAnalises(analiseRows.map(mapAnalise));
      }

      setIsLoading(false);
    });

    return () => {
      active = false;
    };
  }, [indicadorId, router]);

  const tabDescription = useMemo(() => {
    const descriptions: Record<DetailTab, string> = {
      visao: "Resumo executivo, saude do indicador e ultimos sinais de performance.",
      ficha: "Ficha tecnica versionada, workflow de revisao e criterios do indicador.",
      dados: "Alimentacao por periodo, importacao e validacoes da serie historica.",
      analise: "Analise critica estruturada por resultado, comparacao, causas e decisao.",
      plano: "Plano de acao 5W2H vinculado aos desvios e causas especiais.",
      grafico: "Graficos operacionais, SPC, run chart, metas e anotacoes.",
      vinculos: "Conexoes com riscos, processos, documentos e requisitos de qualidade.",
      historico: "Linha do tempo de auditoria, aprovacoes e alteracoes relevantes.",
    };

    return descriptions[activeTab];
  }, [activeTab]);

  const serieGrafico = useMemo(() => {
    return medicoes
      .filter((item) => item.valor != null)
      .map((item) => ({
        periodo: item.periodo || item.data_medicao || "-",
        valor: item.valor ?? 0,
      }));
  }, [medicoes]);

  const chart = useMemo(() => {
    const valores = serieGrafico.map((item) => item.valor);
    if (indicador?.meta != null) valores.push(indicador.meta);
    const min = Math.min(0, ...valores);
    const max = Math.max(1, ...valores);
    const width = 760;
    const height = 240;
    const pad = 34;
    const scaleY = (valor: number) => height - pad - ((valor - min) / Math.max(max - min, 1)) * (height - pad * 2);
    const points = serieGrafico.map((item, index) => {
      const x = serieGrafico.length <= 1 ? width / 2 : pad + (index / (serieGrafico.length - 1)) * (width - pad * 2);
      return { ...item, x, y: scaleY(item.valor) };
    });

    return {
      width,
      height,
      min,
      max,
      points,
      polyline: points.map((point) => `${point.x},${point.y}`).join(" "),
      metaY: indicador?.meta == null ? null : scaleY(indicador.meta),
    };
  }, [indicador?.meta, serieGrafico]);

  function exportarFicha() {
    if (!indicador) return;

    const linhas = [
      ["Campo", "Valor"],
      ["Nome", indicador.nome],
      ["Codigo", indicador.codigo ?? ""],
      ["Setor", indicador.setor ?? ""],
      ["Responsavel", indicador.responsavel ?? ""],
      ["Categoria", indicador.categoria_donabedian],
      ["Dimensao", indicador.dimensao_qualidade ?? ""],
      ["Tipo de calculo", indicador.tipo_calculo],
      ["Meta", formatNumber(indicador.meta, indicador.unidade)],
      ["Polaridade", indicador.polaridade],
      ["Frequencia", indicador.frequencia],
      ["Status", statusLabel(indicador.status)],
    ];

    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const csv = linhas.map((row) => row.map(escape).join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ficha-indicador-${indicador.id}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function criarFichaTecnica() {
    if (!empresaId || !indicador) return;
    setIsSavingFicha(true);
    setErrorMessage(null);

    const payload = {
      empresa_id: empresaId,
      indicador_id: indicador.id,
      objetivo: `Acompanhar ${indicador.nome}.`,
      formula: indicador.tipo_calculo,
      fonte_dados: "Preenchimento manual",
      periodicidade_coleta: indicador.frequencia,
      periodicidade_analise: indicador.frequencia,
      responsavel_coleta: indicador.responsavel ?? usuarioNome,
      responsavel_analise: usuarioNome,
      status: "RASCUNHO",
    };

    const { data, error } = await supabase.from("indicadores_ficha_tecnica").insert(payload).select("*").single();
    if (error || !data) {
      setErrorMessage("Nao foi possivel cadastrar a ficha tecnica deste indicador.");
    } else {
      setFicha(mapFicha(data as Record<string, unknown>));
      setActiveTab("ficha");
    }
    setIsSavingFicha(false);
  }

  async function salvarMedicao(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!empresaId || !indicador) return;

    const valor = Number(medicaoForm.valor.replace(",", "."));
    if (!medicaoForm.periodo.trim() || !Number.isFinite(valor)) {
      setErrorMessage("Informe periodo e valor para alimentar o indicador.");
      return;
    }

    setIsSavingMedicao(true);
    setErrorMessage(null);

    const payload = {
      empresa_id: empresaId,
      indicador_id: indicador.id,
      periodo: medicaoForm.periodo.trim(),
      valor,
      data_medicao: new Date().toISOString().slice(0, 10),
      responsavel: medicaoForm.responsavel.trim() || usuarioNome,
      observacao: medicaoForm.observacao.trim() || null,
    };

    const { data, error } = await supabase.from("indicadores_medicoes").insert(payload).select("*").single();
    if (error || !data) {
      setErrorMessage("Nao foi possivel salvar a medicao.");
      setIsSavingMedicao(false);
      return;
    }

    const status = classificarStatusIndicador({ valor, meta: indicador.meta, polaridade: indicador.polaridade });
    setMedicoes((current) => [...current, mapMedicao(data as Record<string, unknown>)]);
    setIndicador((current) =>
      current
        ? {
            ...current,
            ultimo_resultado: valor,
            ultimo_periodo: medicaoForm.periodo.trim(),
            ultima_atualizacao: new Date().toISOString(),
            status,
          }
        : current,
    );
    setMedicaoForm((current) => ({ ...current, periodo: "", valor: "", observacao: "" }));
    void supabase
      .from("indicadores")
      .update({
        ultimo_resultado: valor,
        ultimo_periodo: medicaoForm.periodo.trim(),
        ultima_atualizacao: new Date().toISOString(),
        status,
      })
      .eq("empresa_id", empresaId)
      .eq("id", indicador.id);
    setIsSavingMedicao(false);
  }

  async function salvarAnalise(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!empresaId || !indicador) return;

    if (!analiseForm.narrativa.trim()) {
      setErrorMessage("Escreva a analise critica antes de salvar.");
      return;
    }

    setIsSavingAnalise(true);
    setErrorMessage(null);

    const ultimo = medicoes[medicoes.length - 1];
    const payload = {
      empresa_id: empresaId,
      indicador_id: indicador.id,
      periodo: analiseForm.periodo.trim() || ultimo?.periodo || indicador.ultimo_periodo,
      valor_realizado: ultimo?.valor ?? indicador.ultimo_resultado,
      meta: indicador.meta,
      narrativa: analiseForm.plano.trim()
        ? `${analiseForm.narrativa.trim()}\n\nPlano de acao: ${analiseForm.plano.trim()}`
        : analiseForm.narrativa.trim(),
      autor: usuarioNome,
      status: "RASCUNHO",
    };

    const { data, error } = await supabase.from("indicadores_analises").insert(payload).select("*").single();
    if (error || !data) {
      setErrorMessage("Nao foi possivel salvar a analise critica.");
    } else {
      setAnalises((current) => [mapAnalise(data as Record<string, unknown>), ...current]);
      setAnaliseForm({ periodo: "", narrativa: "", plano: "" });
    }
    setIsSavingAnalise(false);
  }

  if (isLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 text-blue-600">
        <div className="flex items-center gap-3 text-sm font-semibold">
          <Loader2 className="h-5 w-5 animate-spin" />
          Carregando indicador...
        </div>
      </main>
    );
  }

  if (errorMessage || !indicador) {
    return (
      <main className="min-h-screen bg-slate-50 px-8 py-8">
        <div className="mx-auto max-w-4xl rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">
          <div className="flex items-center gap-3 font-semibold">
            <AlertTriangle className="h-5 w-5" />
            {errorMessage ?? "Indicador indisponivel."}
          </div>
          <button
            type="button"
            onClick={() => router.push("/indicadores")}
            className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-red-700 shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para indicadores
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-8 py-8 text-slate-950">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-6">
        <header className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <button
            type="button"
            onClick={() => router.push("/indicadores")}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Indicadores
          </button>

          <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-extrabold uppercase tracking-normal text-blue-700">
                  {indicador.codigo ?? "KPI"}
                </span>
                <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusStyles[indicador.status]}`}>
                  {statusLabel(indicador.status)}
                </span>
              </div>
              <h1 className="mt-3 text-4xl font-semibold tracking-normal text-slate-950">{indicador.nome}</h1>
              <p className="mt-2 text-base text-slate-600">
                {indicador.setor ?? "Sem setor"} · {indicador.responsavel ?? "Sem responsavel"} · {indicador.categoria_donabedian}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={exportarFicha}
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm"
              >
                <FileText className="h-4 w-4" />
                Exportar ficha
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("dados")}
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20"
              >
                <CheckCircle2 className="h-4 w-4" />
                Alimentar dado
              </button>
            </div>
          </div>
        </header>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <InfoCard label="Meta" value={formatNumber(indicador.meta, indicador.unidade)} hint={`Polaridade: ${indicador.polaridade}`} />
          <InfoCard label="Ultimo resultado" value={formatNumber(indicador.ultimo_resultado, indicador.unidade)} hint={indicador.ultimo_periodo ?? "Sem periodo alimentado"} />
          <InfoCard label="Frequencia" value={indicador.frequencia} hint="Periodicidade de coleta" />
          <InfoCard label="Dimensao" value={indicador.dimensao_qualidade ?? "-"} hint="IOM/STEEEP" />
        </section>

        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex gap-2 overflow-x-auto border-b border-slate-100 p-3">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition ${activeTab === key ? "bg-blue-600 text-white shadow-sm shadow-blue-600/20" : "text-slate-600 hover:bg-slate-100"}`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {activeTab === "visao" && (
              <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
                <section className="rounded-lg border border-slate-200 bg-slate-50 p-6">
                  <h2 className="text-2xl font-semibold text-slate-950">Visao geral</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{tabDescription}</p>
                  <div className="mt-6 grid gap-3 md:grid-cols-3">
                    <InfoCard label="Pontos no grafico" value={String(serieGrafico.length)} hint="Sem limite de 4 medicoes" />
                    <InfoCard label="Analises" value={String(analises.length)} hint="Analise critica registrada" />
                    <InfoCard label="Ficha tecnica" value={ficha ? ficha.status : "Pendente"} hint="Cadastro versionado" />
                  </div>
                </section>
                <section className="rounded-lg border border-slate-200 bg-white p-5">
                  <h3 className="font-semibold text-slate-950">Acoes rapidas</h3>
                  <div className="mt-4 grid gap-2">
                    <button type="button" onClick={() => setActiveTab("ficha")} className="rounded-lg border border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700 hover:border-blue-200 hover:bg-blue-50">Cadastrar ou revisar ficha</button>
                    <button type="button" onClick={() => setActiveTab("dados")} className="rounded-lg border border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700 hover:border-blue-200 hover:bg-blue-50">Inserir dados no grafico</button>
                    <button type="button" onClick={() => setActiveTab("analise")} className="rounded-lg border border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700 hover:border-blue-200 hover:bg-blue-50">Registrar analise critica</button>
                  </div>
                </section>
              </div>
            )}

            {activeTab === "ficha" && (
              <section className="rounded-lg border border-slate-200 bg-slate-50 p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold text-slate-950">Ficha tecnica</h2>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{tabDescription}</p>
                  </div>
                  <button
                    type="button"
                    onClick={criarFichaTecnica}
                    disabled={isSavingFicha}
                    className="inline-flex h-11 items-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 disabled:opacity-60"
                  >
                    {isSavingFicha ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    {ficha ? "Nova versao" : "Cadastrar ficha"}
                  </button>
                </div>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {[
                    ["Objetivo", ficha?.objetivo ?? `Acompanhar ${indicador.nome}.`],
                    ["Formula", ficha?.formula ?? indicador.tipo_calculo],
                    ["Fonte de dados", ficha?.fonte_dados ?? "Preenchimento manual"],
                    ["Coleta", ficha?.periodicidade_coleta ?? indicador.frequencia],
                    ["Analise", ficha?.periodicidade_analise ?? indicador.frequencia],
                    ["Responsavel pela analise", ficha?.responsavel_analise ?? indicador.responsavel ?? usuarioNome],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg border border-slate-200 bg-white p-4">
                      <p className="text-xs font-extrabold uppercase tracking-normal text-slate-500">{label}</p>
                      <p className="mt-2 text-sm font-semibold text-slate-800">{value}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {activeTab === "dados" && (
              <section className="grid gap-5 xl:grid-cols-[360px_1fr]">
                <form onSubmit={salvarMedicao} className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                  <h2 className="text-xl font-semibold text-slate-950">Inserir dado</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">Cada novo periodo entra no mesmo grafico, sem limite de quatro pontos.</p>
                  <div className="mt-5 grid gap-4">
                    <label>
                      <span className="text-xs font-extrabold uppercase tracking-normal text-slate-500">Periodo</span>
                      <input value={medicaoForm.periodo} onChange={(event) => setMedicaoForm((current) => ({ ...current, periodo: event.target.value }))} placeholder="Ex: Jan/2026" className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100" />
                    </label>
                    <label>
                      <span className="text-xs font-extrabold uppercase tracking-normal text-slate-500">Valor</span>
                      <input value={medicaoForm.valor} onChange={(event) => setMedicaoForm((current) => ({ ...current, valor: event.target.value }))} inputMode="decimal" placeholder="Ex: 92,5" className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100" />
                    </label>
                    <label>
                      <span className="text-xs font-extrabold uppercase tracking-normal text-slate-500">Responsavel</span>
                      <input value={medicaoForm.responsavel} onChange={(event) => setMedicaoForm((current) => ({ ...current, responsavel: event.target.value }))} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100" />
                    </label>
                    <label>
                      <span className="text-xs font-extrabold uppercase tracking-normal text-slate-500">Observacao</span>
                      <textarea value={medicaoForm.observacao} onChange={(event) => setMedicaoForm((current) => ({ ...current, observacao: event.target.value }))} rows={3} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100" />
                    </label>
                  </div>
                  <button type="submit" disabled={isSavingMedicao} className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 disabled:opacity-60">
                    {isSavingMedicao ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Salvar dado
                  </button>
                </form>
                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <table className="w-full min-w-[620px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-extrabold uppercase tracking-normal text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Periodo</th>
                        <th className="px-4 py-3">Valor</th>
                        <th className="px-4 py-3">Responsavel</th>
                        <th className="px-4 py-3">Observacao</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {medicoes.map((medicao) => (
                        <tr key={medicao.id}>
                          <td className="px-4 py-3 font-semibold text-slate-800">{medicao.periodo}</td>
                          <td className="px-4 py-3 font-semibold text-slate-950">{formatNumber(medicao.valor, indicador.unidade)}</td>
                          <td className="px-4 py-3 text-slate-600">{medicao.responsavel ?? "-"}</td>
                          <td className="px-4 py-3 text-slate-500">{medicao.observacao ?? "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {activeTab === "grafico" && (
              <section className="rounded-lg border border-slate-200 bg-white p-6">
                <h2 className="text-2xl font-semibold text-slate-950">Grafico do indicador</h2>
                <p className="mt-2 text-sm text-slate-600">{serieGrafico.length} ponto(s) exibidos na mesma serie.</p>
                <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-4">
                  {serieGrafico.length === 0 ? (
                    <p className="py-16 text-center text-sm font-semibold text-slate-400">Insira dados para visualizar o grafico.</p>
                  ) : (
                    <svg viewBox={`0 0 ${chart.width} ${chart.height}`} className="h-[280px] min-w-[760px] w-full">
                      <line x1="34" y1={chart.height - 34} x2={chart.width - 34} y2={chart.height - 34} stroke="#cbd5e1" />
                      <line x1="34" y1="34" x2="34" y2={chart.height - 34} stroke="#cbd5e1" />
                      {chart.metaY != null && (
                        <line x1="34" x2={chart.width - 34} y1={chart.metaY} y2={chart.metaY} stroke="#f59e0b" strokeDasharray="6 6" />
                      )}
                      <polyline fill="none" stroke="#2563eb" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" points={chart.polyline} />
                      {chart.points.map((point) => (
                        <g key={`${point.periodo}-${point.x}`}>
                          <circle cx={point.x} cy={point.y} r="6" fill="#2563eb" />
                          <text x={point.x} y={point.y - 12} textAnchor="middle" className="fill-slate-700 text-[12px] font-bold">
                            {formatNumber(point.valor, indicador.unidade)}
                          </text>
                          <text x={point.x} y={chart.height - 10} textAnchor="middle" className="fill-slate-500 text-[11px] font-semibold">
                            {point.periodo}
                          </text>
                        </g>
                      ))}
                    </svg>
                  )}
                </div>
              </section>
            )}

            {activeTab === "analise" && (
              <section className="grid gap-5 xl:grid-cols-[420px_1fr]">
                <form onSubmit={salvarAnalise} className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                  <h2 className="text-xl font-semibold text-slate-950">Analise critica</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{tabDescription}</p>
                  <label className="mt-5 block">
                    <span className="text-xs font-extrabold uppercase tracking-normal text-slate-500">Periodo</span>
                    <input value={analiseForm.periodo} onChange={(event) => setAnaliseForm((current) => ({ ...current, periodo: event.target.value }))} placeholder={indicador.ultimo_periodo ?? "Ex: Jan/2026"} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100" />
                  </label>
                  <label className="mt-4 block">
                    <span className="text-xs font-extrabold uppercase tracking-normal text-slate-500">Narrativa</span>
                    <textarea value={analiseForm.narrativa} onChange={(event) => setAnaliseForm((current) => ({ ...current, narrativa: event.target.value }))} rows={6} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100" />
                  </label>
                  <label className="mt-4 block">
                    <span className="text-xs font-extrabold uppercase tracking-normal text-slate-500">Plano de acao</span>
                    <textarea value={analiseForm.plano} onChange={(event) => setAnaliseForm((current) => ({ ...current, plano: event.target.value }))} rows={4} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100" />
                  </label>
                  <button type="submit" disabled={isSavingAnalise} className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 disabled:opacity-60">
                    {isSavingAnalise ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}
                    Salvar analise
                  </button>
                </form>
                <div className="space-y-3">
                  {analises.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-sm font-semibold text-slate-400">Nenhuma analise critica cadastrada.</div>
                  ) : (
                    analises.map((analise) => (
                      <article key={analise.id} className="rounded-lg border border-slate-200 bg-white p-5">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="font-semibold text-slate-950">{analise.periodo ?? "Sem periodo"}</h3>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">{analise.status ?? "RASCUNHO"}</span>
                        </div>
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{analise.narrativa}</p>
                        <p className="mt-4 text-xs font-semibold text-slate-400">Autor: {analise.autor ?? "-"}</p>
                      </article>
                    ))
                  )}
                </div>
              </section>
            )}

            {(activeTab === "plano" || activeTab === "vinculos" || activeTab === "historico") && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-8">
                <h2 className="text-2xl font-semibold text-slate-950">{tabs.find((tab) => tab.key === activeTab)?.label}</h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">{tabDescription}</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
