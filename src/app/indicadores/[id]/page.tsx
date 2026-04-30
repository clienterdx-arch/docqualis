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
  const [indicador, setIndicador] = useState<IndicadorResumo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>("visao");

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
        setIndicador(mapIndicador(row as Record<string, unknown>));
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
              <button type="button" className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm">
                <FileText className="h-4 w-4" />
                Exportar ficha
              </button>
              <button type="button" className="inline-flex h-11 items-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20">
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
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8">
              <h2 className="text-2xl font-semibold text-slate-950">{tabs.find((tab) => tab.key === activeTab)?.label}</h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">{tabDescription}</p>
              <p className="mt-5 rounded-lg bg-white px-4 py-3 text-sm font-medium text-slate-500">
                Esta tela-base ja garante navegacao funcional. A proxima etapa conecta cada aba aos registros versionados, alimentacoes, SPC, planos de acao e auditoria criados na fundacao do banco.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
