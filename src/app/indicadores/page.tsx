"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  TrendingUp, TrendingDown, Minus, CheckCircle2,
  ArrowLeft, Save, BarChart2, LineChart,
  Settings2, TableProperties, PlusCircle, Trash2, GitCompare,
  Search, ChevronRight, ChevronDown, FolderTree,
  FileCheck, Plus, XCircle, FileText,
  MessageSquarePlus, Eye, BarChart3, Loader2,
  AlertCircle, X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";


import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  TrendingUp, TrendingDown, Minus, CheckCircle2,
  ArrowLeft, Download, Save, BarChart2, LineChart,
  Settings2, TableProperties, PlusCircle, Trash2, GitCompare,
  Search, ChevronRight, ChevronDown, FolderTree,
  FileCheck, Activity, Plus, XCircle, FileText,
  MessageSquarePlus, Eye, BarChart3, Loader2,
  AlertCircle, X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

/* ─────────────────────────────────────────────────────────────────
 * TIPOS
 * ───────────────────────────────────────────────────────────────*/
interface Indicador {
  id: string; empresa_id: string; nome: string; setor: string;
  responsavel: string; perspectiva_bsc: string; tipo: string;
  unidade: string; meta: number; meta_minima: number; meta_maxima: number;
  polaridade: string; frequencia: string; status: string; formula: string;
}

interface Medicao {
  id: string; indicador_id: string; empresa_id: string;
  valor: number; periodo: string; data_medicao: string;
  responsavel: string; observacao: string;
}

interface Analise {
  id: string; indicador_id: string; empresa_id: string;
  periodo: string; valor_realizado: number; meta: number;
  narrativa: string; plano_acao: any[]; autor: string; status: string;
}

interface DataRow {
  id: number; supabase_id?: string; periodo: string;
  realizado: number | null; meta: number;
  extra1: number | null; extra2: number | null;
  extra3: number | null; extra4: number | null;
}

/* ─────────────────────────────────────────────────────────────────
 * CONSTANTES
 * ───────────────────────────────────────────────────────────────*/
const MAIN_COLOR   = "#2655e8";
const TARGET_RED   = "#ff0000";
const BORDER_LIGHT = "#f1f5f9";
const LABEL_BLACK  = "#000000";

/* ─────────────────────────────────────────────────────────────────
 * UTILS
 * ───────────────────────────────────────────────────────────────*/
const formatValue = (v: number | null | undefined, tipo: string, d = 1): string => {
  if (v == null || isNaN(v)) return "-";
  const n = Number(v);
  if (tipo === "percentual") return `${n.toFixed(d)}%`;
  if (tipo === "moeda")      return `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: d })}`;
  if (tipo === "tempo")      return `${n.toFixed(d)}h`;
  return n.toFixed(d);
};

function getTipo(ind: Indicador) {
  if (ind.unidade === "%") return "percentual";
  return ind.tipo?.toLowerCase() ?? "absoluto";
}

function getStatusColor(ind: Indicador, valor: number | null) {
  if (valor == null) return "bg-slate-300";
  const meta = ind.meta ?? 0;
  const pct  = meta > 0 ? (valor / meta) * 100 : 0;
  if (pct >= 95)  return "bg-emerald-500";
  if (pct >= 75)  return "bg-amber-400";
  return "bg-red-500";
}

function getStatusKey(ind: Indicador, valor: number | null): "verde" | "amarelo" | "vermelho" {
  if (valor == null) return "vermelho";
  const pct = ind.meta > 0 ? (valor / ind.meta) * 100 : 0;
  if (pct >= 95) return "verde";
  if (pct >= 75) return "amarelo";
  return "vermelho";
}

function getInitials(name: string) {
  return name.replace(/Dr\. |Dra\. |Enf\. /g, "").split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
}

function TIcon({ val, target, pol }: { val: number | null; target: number; pol: string }) {
  if (val == null) return <Minus className="w-4 h-4 text-slate-400" />;
  const isUp  = val > target;
  const isGood = (isUp && pol === "MAIOR_MELHOR") || (!isUp && pol === "MENOR_MELHOR");
  return isUp
    ? <TrendingUp  className={`w-4 h-4 ${isGood ? "text-emerald-500" : "text-red-500"}`} />
    : <TrendingDown className={`w-4 h-4 ${isGood ? "text-emerald-500" : "text-red-500"}`} />;
}

function VarianceBadge({ value, invert = false }: { value: number; invert?: boolean }) {
  if (value === 0) return <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full"><Minus className="w-3 h-3" /> 0</span>;
  const isPositive = value > 0;
  const isGood = invert ? !isPositive : isPositive;
  return (
    <span className={`flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-md border shadow-sm ${isGood ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-red-50 text-red-700 border-red-100"}`}>
      {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
      {Math.abs(value).toFixed(1)}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────
 * GRÁFICO PRINCIPAL (SVG)
 * ───────────────────────────────────────────────────────────────*/
function PremiumChart({ data, config, metaVal, faixas, formato }: any) {
  const W = 900, H = 420;
  const PAD = { t: 60, r: 30, b: 40, l: 55 };
  const cW = W - PAD.l - PAD.r;
  const cH = H - PAD.t - PAD.b;

  const validData = data.filter((d: any) => d.realizado != null);
  const activeExtras = (config.extraSeries || []).filter((s: any) => s.active);
  const allSeries = [
    { key: "realizado", type: config.tipo, color: MAIN_COLOR },
    ...activeExtras,
  ];

  const barSeries  = allSeries.filter(s => s.type === "bar");
  const lineSeries = allSeries.filter(s => s.type === "line" || s.type === "misto");

  const allVals = validData.flatMap((d: any) => allSeries.map(s => Number(d[s.key]) || 0));
  const calcMin = allVals.length ? Math.min(...allVals, metaVal) : 0;
  const calcMax = allVals.length ? Math.max(...allVals, metaVal) : 100;
  const vMin  = config.eixoYAuto ? calcMin * 0.85 : config.eixoYMin;
  const vMax  = config.eixoYAuto ? calcMax * 1.10  : config.eixoYMax;
  const range = vMax - vMin || 1;

  const toY = (v: number) => PAD.t + (1 - (v - vMin) / range) * cH;
  const totalGroupW = 36;
  const gap = 2;
  const singleBarW = barSeries.length > 0 ? (totalGroupW - gap * (barSeries.length - 1)) / barSeries.length : 0;
  const innerPad  = totalGroupW / 2 + 6;
  const usableW   = cW - 2 * innerPad;
  const toX = (i: number) => PAD.l + innerPad + (i / Math.max(1, data.length - 1)) * usableW;

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} className="block overflow-visible font-sans select-none">
      <rect x={PAD.l} y={PAD.t} width={cW} height={cH} fill="#fff" stroke={BORDER_LIGHT} strokeWidth="1.5" />

      {[0, 0.25, 0.5, 0.75, 1].map((f, i) => (
        <g key={i}>
          <line x1={PAD.l} y1={PAD.t + f * cH} x2={PAD.l + cW} y2={PAD.t + f * cH} stroke="#f1f5f9" strokeWidth="1" />
          <text x={PAD.l - 8} y={PAD.t + f * cH + 4} textAnchor="end" fill="#475569" fontSize="12" fontWeight="600">
            {formatValue(vMax - f * range, formato, 0)}
          </text>
        </g>
      ))}

      {config.mostrarFaixas && faixas.map((f: any, i: number) => {
        const y1 = toY(Math.min(f.max, vMax)), y2 = toY(Math.max(f.min, vMin));
        return <rect key={i} x={PAD.l} y={Math.min(y1, y2)} width={cW} height={Math.abs(y2 - y1)} fill={f.cor} fillOpacity={0.06} />;
      })}

      {barSeries.map((series, sIdx) =>
        validData.map((d: any, i: number) => {
          const val = d[series.key]; if (val == null) return null;
          const cx = toX(i);
          const yPos = toY(val);
          const h = Math.max(0, PAD.t + cH - yPos);
          const offset = (sIdx - (barSeries.length - 1) / 2) * (singleBarW + gap);
          return <rect key={`b-${series.key}-${i}`} x={cx + offset - singleBarW / 2} y={yPos} width={singleBarW} height={h} fill={series.color} opacity="0.95" />;
        })
      )}

      {lineSeries.map(series => {
        const pts = validData.filter((d: any) => d[series.key] != null).map((d: any, i: number) => `${toX(i)},${toY(d[series.key])}`).join(" L ");
        return pts ? <path key={`l-${series.key}`} d={`M ${pts}`} fill="none" stroke={series.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /> : null;
      })}

      {config.mostrarMeta && data.length > 0 && (
        <g>
          <line x1={PAD.l} y1={toY(metaVal)} x2={PAD.l + cW} y2={toY(metaVal)} stroke={TARGET_RED} strokeWidth="1.5" strokeDasharray="4 4" opacity="0.8" />
          <rect x={PAD.l + cW - 62} y={toY(metaVal) - 12} width="62" height="24" fill="#fff" stroke={TARGET_RED} strokeWidth="1.5" rx="12" />
          <text x={PAD.l + cW - 31} y={toY(metaVal) + 4} textAnchor="middle" fill={TARGET_RED} fontSize="11" fontWeight="800">Meta: {metaVal}</text>
        </g>
      )}

      {allSeries.map(series =>
        validData.map((d: any, i: number) => {
          const val = d[series.key]; if (val == null) return null;
          const cx = toX(i), cy = toY(val);
          const isLine = series.type === "line" || series.type === "misto";
          return (
            <g key={`p-${series.key}-${i}`}>
              {isLine && <circle cx={cx} cy={cy} r="4" fill="#fff" stroke={series.color} strokeWidth="2.5" />}
              {config.mostrarRotulos && <text x={cx} y={cy - 12} textAnchor="middle" fill={LABEL_BLACK} fontSize="13" fontWeight="500">{formatValue(val, formato, 1)}</text>}
            </g>
          );
        })
      )}

      {data.map((d: any, i: number) => (
        <g key={`x-${i}`}>
          <line x1={toX(i)} y1={PAD.t + cH} x2={toX(i)} y2={PAD.t + cH + 6} stroke="#e2e8f0" strokeWidth="1.5" />
          <text x={toX(i)} y={PAD.t + cH + 22} textAnchor="middle" fill="#475569" fontSize="12" fontWeight="600">{d.periodo}</text>
        </g>
      ))}
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────
 * MINI GRÁFICO COMPARATIVO
 * ───────────────────────────────────────────────────────────────*/
function MiniBarChart({ title, labelA1, labelA2, valA, colorA, labelB1, labelB2, valB, colorB, showTrendLine, tipo }: any) {
  const W = 200, H = 360, PAD = { t: 20, r: 10, b: 50, l: 40 };
  const cH = H - PAD.t - PAD.b, cW = W - PAD.l - PAD.r;
  const vMax = Math.max(valA, valB) * 1.2 || 1;
  const pA = (valA / vMax) * 100, pB = (valB / vMax) * 100;
  const barW = 36, innerPad = barW / 2 + 14;
  const xA = PAD.l + innerPad, xB = PAD.l + innerPad + (cW - 2 * innerPad);

  return (
    <div className="flex flex-col h-full bg-white border border-slate-100 rounded-[1.5rem] shadow-sm">
      <div className="text-center mt-6 shrink-0 px-2 h-10 flex items-center justify-center">
        <h4 className="text-[11px] font-black text-slate-600 uppercase tracking-widest leading-tight">{title}</h4>
      </div>
      <div className="flex-1 w-full min-h-0 flex justify-center pb-2">
        <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} className="block overflow-visible select-none">
          <rect x={PAD.l} y={PAD.t} width={cW} height={cH} fill="#fff" stroke={BORDER_LIGHT} strokeWidth="1.5" />
          {[0,.25,.5,.75,1].map((f,i) => (
            <g key={i}>
              <line x1={PAD.l} y1={PAD.t+f*cH} x2={PAD.l+cW} y2={PAD.t+f*cH} stroke="#f1f5f9" strokeWidth="1"/>
              <text x={PAD.l-8} y={PAD.t+f*cH+4} textAnchor="end" fill="#64748b" fontSize="11" fontWeight="600">{formatValue(vMax-f*vMax, tipo, 0)}</text>
            </g>
          ))}
          {showTrendLine && <line x1={xA} y1={PAD.t+(1-pA/100)*cH} x2={xB} y2={PAD.t+(1-pB/100)*cH} stroke={LABEL_BLACK} strokeWidth="2" strokeDasharray="4 4"/>}
          <rect x={xA-barW/2} y={PAD.t+(1-pA/100)*cH} width={barW} height={Math.max(0,(pA/100)*cH)} fill={colorA} rx="2"/>
          <text x={xA} y={PAD.t+(1-pA/100)*cH-10} textAnchor="middle" fill={LABEL_BLACK} fontSize="13" fontWeight="500">{formatValue(valA, tipo, 1)}</text>
          <text x={xA} y={H-30} textAnchor="middle" fill={LABEL_BLACK} fontSize="12" fontWeight="700">{labelA1}</text>
          <text x={xA} y={H-14} textAnchor="middle" fill={LABEL_BLACK} fontSize="12" fontWeight="700">{labelA2}</text>
          <rect x={xB-barW/2} y={PAD.t+(1-pB/100)*cH} width={barW} height={Math.max(0,(pB/100)*cH)} fill={colorB} rx="2"/>
          <text x={xB} y={PAD.t+(1-pB/100)*cH-10} textAnchor="middle" fill={LABEL_BLACK} fontSize="13" fontWeight="500">{formatValue(valB, tipo, 1)}</text>
          <text x={xB} y={H-30} textAnchor="middle" fill={LABEL_BLACK} fontSize="12" fontWeight="700">{labelB1}</text>
          <text x={xB} y={H-14} textAnchor="middle" fill={LABEL_BLACK} fontSize="12" fontWeight="700">{labelB2}</text>
        </svg>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
 * DETALHE DO INDICADOR (DRILL-DOWN)
 * ───────────────────────────────────────────────────────────────*/
function IndicadorDetailView({ ind, empresaId, nomeUsuario, onBack }: {
  ind: Indicador; empresaId: string; nomeUsuario: string; onBack: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"dados" | "compare" | "config_grafico" | "config_kpi" | "capa">("dados");
  const [capaView, setCapaView]   = useState<"list" | "detail">("list");

  const [dataSeries, setDataSeries] = useState<DataRow[]>([]);
  const [analises, setAnalises]     = useState<Analise[]>([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [salvando, setSalvando]     = useState(false);
  const [toast, setToast]           = useState<{ tipo: "ok" | "err"; msg: string } | null>(null);

  const [extraSeries, setExtraSeries] = useState([
    { key: "extra1", label: "Série Opcional 1", active: false, type: "line", color: "#10b981" },
    { key: "extra2", label: "Série Opcional 2", active: false, type: "line", color: "#f59e0b" },
    { key: "extra3", label: "Série Opcional 3", active: false, type: "line", color: "#8b5cf6" },
    { key: "extra4", label: "Série Opcional 4", active: false, type: "line", color: "#ec4899" },
  ]);

  const [kpiConfig, setKpiConfig] = useState({
    nome: ind.nome, setor: ind.setor, formato: getTipo(ind),
    decimais: 1, polaridade: ind.polaridade, agrupamento: 1,
  });

  const [chartConfig, setChartConfig] = useState({
    tipo: "bar", eixoYAuto: true, eixoYMin: 0, eixoYMax: 100,
    mostrarRotulos: true, mostrarFaixas: false, mostrarMeta: true,
  });

  const [metaVal, setMetaVal] = useState(ind.meta ?? 0);

  // CAPA form
  const [capaForm, setCapaForm] = useState({
    periodo: "", narrativa: "", plano_acao: [{ acao: "", responsavel: "", prazo: "" }]
  });

  /* ── CARREGAR MEDIÇÕES ──────────────────────────────────── */
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const { data: meds } = await supabase
        .from("indicadores_medicoes")
        .select("*")
        .eq("indicador_id", ind.id)
        .eq("empresa_id", empresaId)
        .order("data_medicao", { ascending: true });

      const { data: ans } = await supabase
        .from("indicadores_analises")
        .select("*")
        .eq("indicador_id", ind.id)
        .eq("empresa_id", empresaId)
        .order("created_at", { ascending: false });

      setDataSeries((meds ?? []).map((m, i) => ({
        id: i + 1,
        supabase_id: m.id,
        periodo: m.periodo ?? m.data_medicao?.slice(0, 7) ?? `P${i + 1}`,
        realizado: m.valor,
        meta: ind.meta ?? 0,
        extra1: null, extra2: null, extra3: null, extra4: null,
      })));
      setAnalises(ans ?? []);
      setIsLoading(false);
    };
    load();
  }, [ind.id, ind.meta, empresaId]);

  /* ── TOAST ──────────────────────────────────────────────── */
  function mostrar(tipo: "ok" | "err", msg: string) {
    setToast({ tipo, msg });
    setTimeout(() => setToast(null), 3000);
  }

  /* ── SALVAR MEDIÇÕES NO BANCO ────────────────────────────── */
  async function salvarLancamentos() {
    setSalvando(true);
    let erros = 0;
    for (const row of dataSeries) {
      if (row.realizado == null) continue;
      const payload = {
        empresa_id:   empresaId,
        indicador_id: ind.id,
        valor:        row.realizado,
        periodo:      row.periodo,
        data_medicao: new Date().toISOString().slice(0, 10),
        responsavel:  nomeUsuario,
      };
      if (row.supabase_id) {
        const { error } = await supabase.from("indicadores_medicoes").update(payload).eq("id", row.supabase_id);
        if (error) erros++;
      } else {
        const { data, error } = await supabase.from("indicadores_medicoes").insert(payload).select().single();
        if (error) erros++;
        else setDataSeries(prev => prev.map(r => r.id === row.id ? { ...r, supabase_id: data.id } : r));
      }
    }
    setSalvando(false);
    erros === 0 ? mostrar("ok", "Lançamentos salvos com sucesso!") : mostrar("err", `${erros} erro(s) ao salvar. Tente novamente.`);
  }

  /* ── SALVAR ANÁLISE CAPA ─────────────────────────────────── */
  async function salvarAnalise() {
    if (!capaForm.narrativa || !capaForm.periodo) { mostrar("err", "Preencha Período e Narrativa."); return; }
    setSalvando(true);
    const ultimo = dataSeries.filter(d => d.realizado != null).slice(-1)[0];
    const { error } = await supabase.from("indicadores_analises").insert({
      empresa_id:       empresaId,
      indicador_id:     ind.id,
      periodo:          capaForm.periodo,
      valor_realizado:  ultimo?.realizado ?? null,
      meta:             ind.meta,
      narrativa:        capaForm.narrativa,
      plano_acao:       capaForm.plano_acao,
      autor:            nomeUsuario,
      status:           "ABERTA",
    });
    if (error) mostrar("err", error.message);
    else {
      mostrar("ok", "Análise registrada!");
      setCapaView("list");
      setCapaForm({ periodo: "", narrativa: "", plano_acao: [{ acao: "", responsavel: "", prazo: "" }] });
      const { data } = await supabase.from("indicadores_analises").select("*").eq("indicador_id", ind.id).eq("empresa_id", empresaId).order("created_at", { ascending: false });
      setAnalises(data ?? []);
    }
    setSalvando(false);
  }

  /* ── TABELA DE DADOS ─────────────────────────────────────── */
  const handleUpdate = (idx: number, field: string, val: string) => {
    setDataSeries(prev => prev.map((r, i) => i === idx ? { ...r, [field]: val === "" ? null : field === "periodo" ? val : Number(val) } : r));
  };

  const handleAddRow = () => {
    setDataSeries(prev => [...prev, { id: Date.now(), periodo: "", realizado: null, meta: metaVal, extra1: null, extra2: null, extra3: null, extra4: null }]);
  };

  const handleDeleteRow = (id: number) => {
    setDataSeries(prev => prev.filter(r => r.id !== id));
  };

  /* ── AGREGAÇÃO ───────────────────────────────────────────── */
  const aggregatedData = useMemo(() => {
    if (kpiConfig.agrupamento === 1) return dataSeries;
    const result = [];
    for (let i = 0; i < dataSeries.length; i += kpiConfig.agrupamento) {
      const slice  = dataSeries.slice(i, i + kpiConfig.agrupamento);
      const valids = slice.filter(r => r.realizado != null);
      const label  = kpiConfig.agrupamento === 3 ? `T${Math.floor(i/3)+1}` : kpiConfig.agrupamento === 6 ? `S${Math.floor(i/6)+1}` : `P${Math.floor(i/kpiConfig.agrupamento)+1}`;
      result.push({ id: i, periodo: label, realizado: valids.length ? valids.reduce((s, r) => s + (r.realizado as number), 0) / valids.length : null, meta: metaVal, extra1: null, extra2: null, extra3: null, extra4: null });
    }
    return result;
  }, [dataSeries, kpiConfig.agrupamento, metaVal]);

  /* ── MÉTRICAS ───────────────────────────────────────────── */
  const validData = dataSeries.filter(d => d.realizado != null);
  const ultimo    = validData[validData.length - 1];
  const ytd       = validData.length ? validData.reduce((s, d) => s + (d.realizado as number), 0) / validData.length : 0;

  const faixas = [
    { nome: "Crítico", min: 0,            max: metaVal * 0.75, cor: "#ef4444" },
    { nome: "Atenção", min: metaVal * 0.75, max: metaVal,       cor: "#f59e0b" },
    { nome: "Ideal",   min: metaVal,        max: metaVal * 1.5,  cor: "#10b981" },
  ];

  const CI = "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 bg-white font-medium";
  const CS = "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 bg-white font-medium";

  return (
    <div className="w-full h-full bg-slate-50/50 p-6 md:p-8 flex flex-col animate-in fade-in duration-500">
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 font-bold text-sm text-white ${toast.tipo === "ok" ? "bg-emerald-600" : "bg-red-600"}`}>
          {toast.tipo === "ok" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {toast.msg}
        </div>
      )}

      <div className="w-full max-w-7xl mx-auto flex flex-col h-full gap-8">

        {/* HEADER EXECUTIVO */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <div className="flex items-center gap-5">
            <button onClick={onBack} className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-all shadow-sm">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-[10px] font-mono font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{ind.id.slice(0, 8)}</span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{kpiConfig.setor}</span>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{kpiConfig.nome}</h2>
            </div>
          </div>
          <div className="flex items-center gap-6 border-l border-slate-100 pl-6">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Último Fechamento</p>
              <span className="text-2xl font-black text-blue-700 leading-none">{formatValue(ultimo?.realizado, kpiConfig.formato, kpiConfig.decimais)}</span>
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Desvio da Meta</p>
              <div className="flex items-center gap-1.5">
                <TIcon val={ultimo?.realizado ?? null} target={metaVal} pol={kpiConfig.polaridade} />
                <span className="text-sm font-bold text-slate-700">{ultimo?.realizado != null ? Math.abs(ultimo.realizado - metaVal).toFixed(1) : "—"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ÁREA DE GRÁFICOS */}
        <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Evolução Temporal</h2>
              <p className="text-xs text-slate-500 font-medium mt-1">
                {validData.length} medição(ões) registrada(s) · Meta: {formatValue(metaVal, kpiConfig.formato, kpiConfig.decimais)}
              </p>
            </div>
            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-100">
              <select value={kpiConfig.agrupamento} onChange={e => setKpiConfig({ ...kpiConfig, agrupamento: Number(e.target.value) })} className="bg-transparent text-[11px] font-bold text-slate-600 outline-none cursor-pointer pl-3 pr-2 py-1">
                <option value={1}>Mensal</option>
                <option value={3}>Trimestral</option>
                <option value={6}>Semestral</option>
              </select>
              <div className="w-px h-4 bg-slate-200 mx-1" />
              <div className="flex gap-1 pr-1">
                <button onClick={() => setChartConfig({ ...chartConfig, tipo: "line" })} className={`p-1.5 rounded-xl ${chartConfig.tipo === "line" ? "bg-white shadow border border-slate-100 text-blue-600" : "text-slate-400"}`}><LineChart className="w-4 h-4" /></button>
                <button onClick={() => setChartConfig({ ...chartConfig, tipo: "bar" })} className={`p-1.5 rounded-xl ${chartConfig.tipo === "bar" ? "bg-white shadow border border-slate-100 text-blue-600" : "text-slate-400"}`}><BarChart2 className="w-4 h-4" /></button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[500px]">
            <div className="lg:col-span-8 min-w-0 relative">
              {isLoading ? (
                <div className="w-full h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
              ) : dataSeries.length === 0 ? (
                <div className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-2xl text-slate-400 font-bold bg-slate-50/50">
                  <BarChart3 className="w-10 h-10 mb-2 opacity-50" />
                  Nenhum dado lançado. Use a aba "Alimentação Mensal".
                </div>
              ) : (
                <PremiumChart
                  data={aggregatedData}
                  config={{ ...chartConfig, extraSeries }}
                  metaVal={metaVal}
                  faixas={faixas}
                  formato={kpiConfig.formato}
                />
              )}
            </div>
            <div className="lg:col-span-2">
              <MiniBarChart title="Realizado x Meta" labelA1="Meta" labelA2="" valA={metaVal} colorA={TARGET_RED} labelB1="YTD" labelB2="Atual" valB={ytd} colorB={MAIN_COLOR} tipo={kpiConfig.formato} />
            </div>
            <div className="lg:col-span-2">
              <MiniBarChart title="Último vs Média YTD" labelA1="Último" labelA2="" valA={ultimo?.realizado ?? 0} colorA="#94a3b8" labelB1="Média" labelB2="YTD" valB={ytd} colorB={MAIN_COLOR} tipo={kpiConfig.formato} showTrendLine />
            </div>
          </div>
        </div>

        {/* ABAS INFERIORES */}
        <div className="bg-white border border-slate-100 rounded-[2rem] shadow-sm flex flex-col overflow-hidden min-h-[500px]">
          <div className="flex border-b border-slate-100 px-8 pt-2 bg-slate-50/80 overflow-x-auto gap-8">
            {[
              { id: "dados",         label: "Alimentação Mensal",     icon: TableProperties },
              { id: "compare",       label: "Comparar Indicadores",   icon: GitCompare },
              { id: "config_grafico",label: "Painel Visual",          icon: Settings2 },
              { id: "config_kpi",    label: "Estrutura do KPI",       icon: FileText },
              { id: "capa",         label: `Análise Crítica & CAPA (${analises.length})`, icon: MessageSquarePlus },
            ].map(t => (
              <button key={t.id} onClick={() => { setActiveTab(t.id as any); if (t.id === "capa") setCapaView("list"); }}
                className={`py-5 flex items-center gap-2 text-sm font-bold border-b-[3px] whitespace-nowrap outline-none transition-colors ${activeTab === t.id ? "text-blue-700 border-blue-600" : "text-slate-400 border-transparent hover:text-slate-700"}`}>
                <t.icon className="w-4 h-4" />{t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-8 bg-white">

            {/* ABA: ALIMENTAÇÃO MENSAL */}
            {activeTab === "dados" && (
              <div className="space-y-6 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Lançamento de Resultados</h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">Insira os valores. O gráfico atualiza em tempo real.</p>
                  </div>
                  <button onClick={salvarLancamentos} disabled={salvando} className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-md hover:bg-slate-800 transition-all disabled:opacity-60">
                    {salvando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    {salvando ? "Salvando..." : "Salvar Lançamentos"}
                  </button>
                </div>

                <div className="border border-slate-100 rounded-2xl overflow-x-auto shadow-sm">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase font-black text-slate-400 tracking-widest">
                      <tr>
                        <th className="px-6 py-4 border-r border-slate-100 text-center">Período</th>
                        <th className="px-6 py-4 border-r border-slate-100">Valor Realizado</th>
                        {extraSeries.filter(s => s.active).map(s => (
                          <th key={s.key} className="px-6 py-4 border-r border-slate-100" style={{ color: s.color }}>{s.label}</th>
                        ))}
                        <th className="px-6 py-4 border-r border-slate-100">Meta</th>
                        <th className="px-6 py-4 border-r border-slate-100 text-center">Desvio</th>
                        <th className="px-6 py-4 w-12 text-center">Del</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {dataSeries.length === 0 ? (
                        <tr><td colSpan={5 + extraSeries.filter(s => s.active).length} className="text-center p-8 text-slate-400 font-medium">Nenhum mês adicionado ainda.</td></tr>
                      ) : dataSeries.map((row, idx) => {
                        const desvio = row.realizado != null ? row.realizado - row.meta : 0;
                        const isLast = idx === dataSeries.length - 1;
                        return (
                          <tr key={row.id} className="hover:bg-slate-50 transition-colors group">
                            <td className="px-6 py-2.5 text-center border-r border-slate-100 bg-slate-50/50">
                              <input type="text" value={row.periodo} onChange={e => handleUpdate(idx, "periodo", e.target.value)} className="w-24 px-2 py-1 text-center font-bold bg-transparent outline-none focus:bg-white focus:shadow focus:rounded-md text-slate-800" />
                              {isLast && <span className="block text-[9px] font-black uppercase tracking-widest mt-0.5 text-blue-600">Atual</span>}
                            </td>
                            <td className="px-6 py-2.5 border-r border-slate-100">
                              <input type="number" value={row.realizado ?? ""} onChange={e => handleUpdate(idx, "realizado", e.target.value)}
                                className="w-36 px-4 py-2 border border-slate-100 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all bg-white shadow-sm" placeholder="-" />
                            </td>
                            {extraSeries.filter(s => s.active).map(s => (
                              <td key={s.key} className="px-6 py-2.5 border-r border-slate-100">
                                <input type="number" value={(row as any)[s.key] ?? ""} onChange={e => handleUpdate(idx, s.key, e.target.value)}
                                  className="w-36 px-4 py-2 border border-slate-100 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-blue-500 bg-white shadow-sm" placeholder="-" />
                              </td>
                            ))}
                            <td className="px-6 py-2.5 border-r border-slate-100">
                              <input type="number" value={row.meta} onChange={e => handleUpdate(idx, "meta", e.target.value)} className="w-20 px-2 py-1 bg-transparent text-slate-500 outline-none font-bold" />
                            </td>
                            <td className="px-6 py-2.5 text-center border-r border-slate-100">
                              {row.realizado != null ? <VarianceBadge value={desvio} /> : <span className="text-xs text-slate-300 font-bold">—</span>}
                            </td>
                            <td className="px-6 py-2.5 text-center">
                              <button onClick={() => handleDeleteRow(row.id)} className="p-2 rounded-xl text-slate-300 hover:bg-red-50 hover:text-red-500 transition-all mx-auto flex">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <button onClick={handleAddRow} className="w-full p-4 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold text-slate-500 hover:border-blue-300 hover:text-blue-600 transition-all bg-white">
                  <PlusCircle className="w-5 h-5" /> Lançar Próximo Período
                </button>
              </div>
            )}

            {/* ABA: COMPARAR INDICADORES */}
            {activeTab === "compare" && (
              <div className="space-y-6 animate-in fade-in">
                <h3 className="text-lg font-bold text-slate-800">Comparativo Multi-Indicador</h3>
                <div className="w-full h-64 border-2 border-dashed border-slate-100 rounded-3xl flex items-center justify-center text-slate-400 font-bold bg-slate-50">
                  Selecione outro indicador para comparar (em desenvolvimento)
                </div>
              </div>
            )}

            {/* ABA: CONFIG VISUAL */}
            {activeTab === "config_grafico" && (
              <div className="space-y-6 animate-in fade-in max-w-4xl">
                <h3 className="text-lg font-bold text-slate-800">Parâmetros Visuais do Dashboard</h3>

                {/* Séries extras */}
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-inner space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">Séries de Dados Adicionais (até 4)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {extraSeries.map(s => (
                      <div key={s.key} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                        <input type="checkbox" checked={s.active} onChange={e => setExtraSeries(prev => prev.map(x => x.key === s.key ? { ...x, active: e.target.checked } : x))} className="w-4 h-4 accent-blue-600" />
                        <input type="text" value={s.label} onChange={e => setExtraSeries(prev => prev.map(x => x.key === s.key ? { ...x, label: e.target.value } : x))} disabled={!s.active} className="flex-1 text-sm font-bold border-b border-slate-100 outline-none bg-transparent disabled:opacity-40" />
                        <select value={s.type} onChange={e => setExtraSeries(prev => prev.map(x => x.key === s.key ? { ...x, type: e.target.value } : x))} disabled={!s.active} className="text-xs font-bold outline-none bg-slate-50 border border-slate-100 rounded px-2 py-1 disabled:opacity-40">
                          <option value="line">Linha</option>
                          <option value="bar">Barra</option>
                        </select>
                        <input type="color" value={s.color} onChange={e => setExtraSeries(prev => prev.map(x => x.key === s.key ? { ...x, color: e.target.value } : x))} disabled={!s.active} className="w-8 h-8 rounded cursor-pointer disabled:opacity-40" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 shadow-inner space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">Meta e Eixo Y</h4>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Valor da Meta</label>
                      <input type="number" value={metaVal} onChange={e => setMetaVal(Number(e.target.value))} className={CI} />
                    </div>
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-sm font-medium text-slate-700">Eixo Y Automático</span>
                      <input type="checkbox" checked={chartConfig.eixoYAuto} onChange={() => setChartConfig({ ...chartConfig, eixoYAuto: !chartConfig.eixoYAuto })} className="w-4 h-4 accent-blue-600" />
                    </label>
                  </div>
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 shadow-inner space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">Elementos Visuais</h4>
                    <label className="flex items-center justify-between cursor-pointer"><span className="text-sm font-medium text-slate-700">Rótulos nos Pontos</span><input type="checkbox" checked={chartConfig.mostrarRotulos} onChange={() => setChartConfig({ ...chartConfig, mostrarRotulos: !chartConfig.mostrarRotulos })} className="w-4 h-4 accent-blue-600" /></label>
                    <label className="flex items-center justify-between cursor-pointer"><span className="text-sm font-medium text-slate-700">Linha de Meta</span><input type="checkbox" checked={chartConfig.mostrarMeta} onChange={() => setChartConfig({ ...chartConfig, mostrarMeta: !chartConfig.mostrarMeta })} className="w-4 h-4 accent-blue-600" /></label>
                    <label className="flex items-center justify-between cursor-pointer"><span className="text-sm font-medium text-slate-700">Faixas de Semáforo</span><input type="checkbox" checked={chartConfig.mostrarFaixas} onChange={() => setChartConfig({ ...chartConfig, mostrarFaixas: !chartConfig.mostrarFaixas })} className="w-4 h-4 accent-blue-600" /></label>
                  </div>
                </div>
              </div>
            )}

            {/* ABA: ESTRUTURA DO KPI */}
            {activeTab === "config_kpi" && (
              <div className="space-y-6 animate-in fade-in max-w-3xl">
                <h3 className="text-lg font-bold text-slate-800">Mapeamento Estrutural do KPI</h3>
                <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm grid grid-cols-2 gap-5">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Nome</label>
                    <input value={kpiConfig.nome} onChange={e => setKpiConfig({ ...kpiConfig, nome: e.target.value })} className={CI} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Formatação</label>
                    <select value={kpiConfig.formato} onChange={e => setKpiConfig({ ...kpiConfig, formato: e.target.value })} className={CS}>
                      <option value="absoluto">Número Absoluto</option>
                      <option value="percentual">Percentual (%)</option>
                      <option value="moeda">Moeda (R$)</option>
                      <option value="tempo">Horas (h)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Casas Decimais</label>
                    <select value={kpiConfig.decimais} onChange={e => setKpiConfig({ ...kpiConfig, decimais: Number(e.target.value) })} className={CS}>
                      <option value={0}>0 — Inteiro</option>
                      <option value={1}>1 — Ex: 0.0</option>
                      <option value={2}>2 — Ex: 0.00</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Polaridade</label>
                    <select value={kpiConfig.polaridade} onChange={e => setKpiConfig({ ...kpiConfig, polaridade: e.target.value })} className={CS}>
                      <option value="MAIOR_MELHOR">Maior Melhor</option>
                      <option value="MENOR_MELHOR">Menor Melhor</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Setor</label>
                    <input value={kpiConfig.setor} disabled className="w-full px-3 py-2 border border-slate-100 bg-slate-50 rounded-lg text-sm font-bold text-slate-500 outline-none" />
                  </div>
                </div>
              </div>
            )}

            {/* ABA: ANÁLISE CRÍTICA / CAPA */}
            {activeTab === "capa" && (
              <div className="animate-in fade-in">
                {capaView === "list" && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-bold text-slate-800">Análises Críticas & CAPA</h3>
                        <p className="text-xs text-slate-500 font-medium mt-1">Histórico de análises de desvio e planos de ação corretiva.</p>
                      </div>
                      <button onClick={() => setCapaView("detail")} className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 shadow-md">
                        <Plus className="w-4 h-4" /> Nova Análise
                      </button>
                    </div>

                    <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase font-black text-slate-400 tracking-widest">
                          <tr>
                            <th className="px-6 py-4">Período</th>
                            <th className="px-6 py-4 text-center">Realizado</th>
                            <th className="px-6 py-4 text-center">Meta</th>
                            <th className="px-6 py-4">Autor</th>
                            <th className="px-6 py-4 text-center">Status</th>
                            <th className="px-6 py-4 text-center">Ações CAPA</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {analises.length === 0 ? (
                            <tr><td colSpan={6} className="p-10 text-center text-slate-400 font-bold">Nenhuma análise registrada.</td></tr>
                          ) : analises.map(a => (
                            <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4 font-bold text-slate-800">{a.periodo}</td>
                              <td className="px-6 py-4 text-center font-black text-blue-700">{formatValue(a.valor_realizado, kpiConfig.formato, 1)}</td>
                              <td className="px-6 py-4 text-center font-bold text-slate-500">{formatValue(a.meta, kpiConfig.formato, 1)}</td>
                              <td className="px-6 py-4 font-medium text-slate-600">{a.autor}</td>
                              <td className="px-6 py-4 text-center"><span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${a.status === "CONCLUIDA" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-blue-50 text-blue-700 border-blue-100"}`}>{a.status}</span></td>
                              <td className="px-6 py-4 text-center"><span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md text-[11px] font-bold border border-blue-100">{(a.plano_acao ?? []).length} ação(ões)</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {capaView === "detail" && (
                  <div className="space-y-6 animate-in slide-in-from-right-4">
                    <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
                      <button onClick={() => setCapaView("list")} className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 hover:text-blue-600"><ArrowLeft className="w-4 h-4" /></button>
                      <div>
                        <h3 className="text-lg font-bold text-slate-800">Nova Análise Crítica</h3>
                        <p className="text-xs text-slate-500 font-medium">Registre o desvio e o plano de ação CAPA.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-4">
                        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 shadow-inner space-y-3">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Contexto</h4>
                          <div><p className="text-xs text-slate-400">Último Realizado</p><p className="text-2xl font-black text-blue-700">{formatValue(ultimo?.realizado, kpiConfig.formato, 1)}</p></div>
                          <div><p className="text-xs text-slate-400">Meta</p><p className="text-lg font-bold text-red-600">{formatValue(metaVal, kpiConfig.formato, 1)}</p></div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Período de Referência</label>
                          <input value={capaForm.periodo} onChange={e => setCapaForm({ ...capaForm, periodo: e.target.value })} placeholder="Ex: Jan/2026" className={CI} />
                        </div>
                      </div>

                      <div className="md:col-span-2 space-y-5">
                        <div>
                          <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">Narrativa da Análise</label>
                          <textarea value={capaForm.narrativa} onChange={e => setCapaForm({ ...capaForm, narrativa: e.target.value })} rows={4} className="w-full p-4 border border-slate-200 rounded-2xl text-sm outline-none focus:border-blue-500 resize-none shadow-sm" placeholder="Descreva os fatores que causaram o desvio..." />
                        </div>

                        <div>
                          <div className="flex justify-between items-center mb-3">
                            <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Plano de Ação CAPA</label>
                            <button onClick={() => setCapaForm({ ...capaForm, plano_acao: [...capaForm.plano_acao, { acao: "", responsavel: "", prazo: "" }] })} className="text-xs font-bold text-blue-600 flex items-center gap-1">
                              <PlusCircle className="w-3.5 h-3.5" /> Adicionar Ação
                            </button>
                          </div>
                          <div className="border border-slate-100 rounded-2xl overflow-hidden">
                            <table className="w-full text-sm">
                              <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">
                                <tr><th className="px-4 py-3">Ação Corretiva</th><th className="px-4 py-3">Responsável</th><th className="px-4 py-3">Prazo</th><th className="px-4 py-3 w-8" /></tr>
                              </thead>
                              <tbody>
                                {capaForm.plano_acao.map((pa, idx) => (
                                  <tr key={idx} className="border-b border-slate-50">
                                    <td className="px-4 py-2"><input value={pa.acao} onChange={e => { const pl = [...capaForm.plano_acao]; pl[idx].acao = e.target.value; setCapaForm({ ...capaForm, plano_acao: pl }); }} className="w-full text-sm outline-none font-medium text-slate-700" placeholder="Descreva a ação..." /></td>
                                    <td className="px-4 py-2"><input value={pa.responsavel} onChange={e => { const pl = [...capaForm.plano_acao]; pl[idx].responsavel = e.target.value; setCapaForm({ ...capaForm, plano_acao: pl }); }} className="w-full text-sm outline-none font-medium text-slate-600" placeholder="Responsável" /></td>
                                    <td className="px-4 py-2"><input type="date" value={pa.prazo} onChange={e => { const pl = [...capaForm.plano_acao]; pl[idx].prazo = e.target.value; setCapaForm({ ...capaForm, plano_acao: pl }); }} className="text-sm outline-none font-medium" /></td>
                                    <td className="px-4 py-2"><button onClick={() => { const pl = capaForm.plano_acao.filter((_, i) => i !== idx); setCapaForm({ ...capaForm, plano_acao: pl }); }} className="text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        <div className="flex justify-end pt-2">
                          <button onClick={salvarAnalise} disabled={salvando} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl text-sm shadow-md hover:bg-blue-700 transition-all disabled:opacity-60">
                            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            {salvando ? "Salvando..." : "Salvar Análise e CAPA"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
/* ─────────────────────────────────────────────────────────────────
 * MODAL: NOVO INDICADOR
 * ───────────────────────────────────────────────────────────────*/
function ModalNovoIndicador({ onClose, onSalvo, empresaId }: {
  onClose: () => void; onSalvo: () => void; empresaId: string;
}) {
  const [form, setForm] = useState({
    nome: "", setor: "", responsavel: "", perspectiva_bsc: "Financeira",
    tipo: "PERCENTUAL", unidade: "%", meta: 0, polaridade: "MAIOR_MELHOR",
    frequencia: "MENSAL", status: "ATIVO",
  });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro]         = useState<string | null>(null);

  const CI = "w-full h-10 px-3 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 bg-slate-50 focus:bg-white font-medium";
  const CS = "w-full h-10 px-3 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 bg-slate-50 font-medium";

  async function salvar() {
    if (!form.nome || !form.setor) { setErro("Preencha Nome e Setor."); return; }
    setSalvando(true);
    const { error } = await supabase.from("indicadores").insert({ ...form, empresa_id: empresaId });
    if (error) { setErro(error.message); setSalvando(false); return; }
    onSalvo();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-end z-50 animate-in fade-in">
      <div className="bg-white w-full max-w-lg h-full shadow-2xl flex flex-col border-l border-slate-100 animate-in slide-in-from-right-8">
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <h2 className="text-lg font-bold text-slate-900">Novo Indicador (KPI)</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {erro && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-bold flex items-center gap-2"><AlertCircle className="w-4 h-4" />{erro}</div>}
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Nome do Indicador <span className="text-red-500">*</span></label>
            <input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} className={CI} placeholder="Ex: Taxa de Infecção Hospitalar" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Setor <span className="text-red-500">*</span></label>
              <input value={form.setor} onChange={e => setForm({ ...form, setor: e.target.value })} className={CI} placeholder="Ex: UTI Adulto" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Responsável</label>
              <input value={form.responsavel} onChange={e => setForm({ ...form, responsavel: e.target.value })} className={CI} placeholder="Nome" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Perspectiva BSC</label>
              <select value={form.perspectiva_bsc} onChange={e => setForm({ ...form, perspectiva_bsc: e.target.value })} className={CS}>
                <option>Financeira</option><option>Clientes</option><option>Processos</option><option>Aprendizado</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Tipo</label>
              <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} className={CS}>
                <option value="PERCENTUAL">Percentual</option>
                <option value="NUMERO">Número</option>
                <option value="TEMPO">Tempo</option>
                <option value="INDICE">Índice</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Meta</label>
              <input type="number" value={form.meta} onChange={e => setForm({ ...form, meta: Number(e.target.value) })} className={CI} />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Unidade</label>
              <input value={form.unidade} onChange={e => setForm({ ...form, unidade: e.target.value })} className={CI} placeholder="%, pts, h..." />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Polaridade</label>
              <select value={form.polaridade} onChange={e => setForm({ ...form, polaridade: e.target.value })} className={CS}>
                <option value="MAIOR_MELHOR">Maior Melhor</option>
                <option value="MENOR_MELHOR">Menor Melhor</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Frequência</label>
              <select value={form.frequencia} onChange={e => setForm({ ...form, frequencia: e.target.value })} className={CS}>
                <option value="MENSAL">Mensal</option>
                <option value="TRIMESTRAL">Trimestral</option>
                <option value="ANUAL">Anual</option>
              </select>
            </div>
          </div>
        </div>
        <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3 shrink-0">
          <button onClick={salvar} disabled={salvando} className="flex-1 h-11 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-60">
            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {salvando ? "Salvando..." : "Cadastrar Indicador"}
          </button>
          <button onClick={onClose} className="h-11 px-4 border border-slate-200 bg-white rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">Cancelar</button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
 * PÁGINA PRINCIPAL
 * ───────────────────────────────────────────────────────────────*/
export default function GestaoIndicadoresPage() {
  const router = useRouter();
  const [tab, setTab]           = useState("painel");
  const [search, setSearch]     = useState("");
  const [expanded, setExpanded] = useState<string[]>([]);

  const [indicadores, setIndicadores]   = useState<Indicador[]>([]);
  const [medicoes, setMedicoes]         = useState<Medicao[]>([]);
  const [empresaId, setEmpresaId]       = useState<string | null>(null);
  const [nomeUsuario, setNomeUsuario]   = useState("Usuário");
  const [isLoading, setIsLoading]       = useState(true);
  const [indicadorAtivo, setIndicadorAtivo] = useState<Indicador | null>(null);
  const [modalNovo, setModalNovo]       = useState(false);

  /* ── SESSÃO ──────────────────────────────────────────── */
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      const { data: perfil } = await supabase.from("perfis").select("empresa_id, nome").eq("id", session.user.id).single();
      if (perfil?.empresa_id) { setEmpresaId(perfil.empresa_id); setNomeUsuario(perfil.nome ?? "Usuário"); }
    };
    init();
  }, [router]);

  /* ── FETCH ───────────────────────────────────────────── */
  const fetchDados = useCallback(async () => {
    if (!empresaId) return;
    setIsLoading(true);
    const [rI, rM] = await Promise.all([
      supabase.from("indicadores").select("*").eq("empresa_id", empresaId).order("setor").order("nome"),
      supabase.from("indicadores_medicoes").select("*").eq("empresa_id", empresaId).order("data_medicao", { ascending: false }),
    ]);
    setIndicadores(rI.data ?? []);
    setMedicoes(rM.data ?? []);
    setIsLoading(false);
  }, [empresaId]);

  useEffect(() => { fetchDados(); }, [fetchDados]);

  /* ── ÚLTIMA MEDIÇÃO ──────────────────────────────────── */
  function getUltimaMedicao(indId: string): Medicao | null {
    return medicoes.find(m => m.indicador_id === indId) ?? null;
  }

  /* ── DADOS FILTRADOS ─────────────────────────────────── */
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return indicadores.filter(i =>
      !q || i.nome.toLowerCase().includes(q) || i.setor?.toLowerCase().includes(q) || i.responsavel?.toLowerCase().includes(q)
    );
  }, [indicadores, search]);

  /* ── AGRUPAMENTO POR SETOR ───────────────────────────── */
  const setores = useMemo(() => {
    const map = new Map<string, { inds: Indicador[]; verde: number; amarelo: number; vermelho: number }>();
    for (const ind of filtered) {
      const s = ind.setor ?? "Sem Setor";
      if (!map.has(s)) map.set(s, { inds: [], verde: 0, amarelo: 0, vermelho: 0 });
      const entry = map.get(s)!;
      const med   = getUltimaMedicao(ind.id);
      const key   = getStatusKey(ind, med?.valor ?? null);
      entry.inds.push(ind);
      entry[key]++;
    }
    return Array.from(map.entries()).map(([nome, data]) => ({ nome, ...data }));
  }, [filtered, medicoes]);

  /* ── ESTATÍSTICAS ────────────────────────────────────── */
  const stats = useMemo(() => {
    const total  = indicadores.length;
    let v = 0, a = 0, r = 0;
    for (const ind of indicadores) {
      const med = getUltimaMedicao(ind.id);
      const key = getStatusKey(ind, med?.valor ?? null);
      if (key === "verde")    v++;
      else if (key === "amarelo") a++;
      else r++;
    }
    return { total, verde: v, amarelo: a, vermelho: r, pct: total ? Math.round((v / total) * 100) : 0 };
  }, [indicadores, medicoes]);

  /* ── DRILL DOWN ──────────────────────────────────────── */
  if (indicadorAtivo && empresaId) {
    return <IndicadorDetailView ind={indicadorAtivo} empresaId={empresaId} nomeUsuario={nomeUsuario} onBack={() => setIndicadorAtivo(null)} />;
  }

  /* ─────────────────────────────────────────────────────
   * RENDER PRINCIPAL
   * ───────────────────────────────────────────────────*/
  return (
    <div className="w-full h-full bg-slate-50/50 p-6 md:p-8 flex flex-col animate-in fade-in duration-500">
      <div className="w-full max-w-7xl mx-auto flex flex-col h-full gap-6">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 shrink-0">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              Gestão de Indicadores
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-[10px] font-black uppercase rounded-md border border-blue-200">KPIs</span>
            </h1>
            <p className="text-sm text-slate-500 mt-1 font-medium">
              Monitoramento de performance · <strong className="text-slate-700">{stats.total} indicador(es) ativo(s)</strong>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar indicador..."
                className="pl-10 pr-10 py-2.5 text-sm font-medium bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-400 w-72 shadow-sm" />
              {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2"><XCircle className="w-4 h-4 text-slate-300 hover:text-red-500" /></button>}
            </div>
            <button onClick={() => setModalNovo(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 shadow-md">
              <Plus className="w-4 h-4" /> Novo KPI
            </button>
          </div>
        </div>

        {/* TABS */}
        <div className="border-b border-slate-200 flex gap-8 text-[13px] font-bold text-slate-500 overflow-x-auto shrink-0">
          {[
            { key: "painel",   label: "Base de Indicadores", icon: FolderTree },
            { key: "cadastro", label: "Fichas Técnicas",      icon: FileCheck },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`pb-4 border-b-[3px] flex items-center gap-2 whitespace-nowrap transition-all outline-none ${tab === t.key ? "border-blue-600 text-blue-700" : "border-transparent hover:text-slate-800"}`}>
              <t.icon className="w-4 h-4" />{t.label}
            </button>
          ))}
        </div>

        {/* CONTEÚDO */}
        <div className="flex-1 overflow-hidden flex flex-col pb-4">

          {/* ABA: PAINEL PRINCIPAL */}
          {tab === "painel" && (
            <div className="flex flex-col h-full gap-6">

              {/* KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
                {[
                  { l: "Cadastrados",         v: stats.total,    c: "text-slate-800",   bc: "bg-white border-slate-100" },
                  { l: "Em Atenção (Amarelo)", v: stats.amarelo,  c: "text-amber-600",   bc: "bg-white border-amber-100" },
                  { l: "Críticos (Vermelho)",  v: stats.vermelho, c: "text-red-600",     bc: "bg-white border-red-100" },
                  { l: "% Na Meta (Verde)",    v: `${stats.pct}%`, c: "text-emerald-700", bc: "bg-emerald-50 border-emerald-100" },
                ].map(s => (
                  <div key={s.l} className={`p-5 rounded-2xl shadow-sm border flex flex-col gap-2 ${s.bc}`}>
                    <span className="text-[10px] font-black uppercase text-slate-500">{s.l}</span>
                    <span className={`text-3xl font-black ${s.c}`}>{s.v}</span>
                  </div>
                ))}
              </div>

              {/* TREE VIEW */}
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden flex-1 flex flex-col">
                <div className="p-4 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center shrink-0">
                  <div className="flex gap-2">
                    <button onClick={() => setExpanded(setores.map(s => s.nome))} className="px-4 py-2 bg-white border border-slate-200 text-slate-500 rounded-xl text-xs font-bold hover:text-blue-600 shadow-sm">Expandir Tudo</button>
                    <button onClick={() => setExpanded([])} className="px-4 py-2 bg-white border border-slate-200 text-slate-500 rounded-xl text-xs font-bold hover:text-blue-600 shadow-sm">Recolher</button>
                  </div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-4 hidden sm:block">TreeView · {stats.total} KPIs</span>
                </div>

                <div className="overflow-y-auto flex-1 p-2">
                  {isLoading ? (
                    <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
                  ) : setores.length === 0 ? (
                    <div className="p-10 text-center text-slate-400 font-bold">
                      {search ? "Nenhum indicador encontrado." : "Nenhum indicador cadastrado. Clique em \"Novo KPI\" para começar."}
                    </div>
                  ) : setores.map(s => (
                    <div key={s.nome} className="mb-1">
                      <button
                        onClick={() => setExpanded(prev => prev.includes(s.nome) ? prev.filter(x => x !== s.nome) : [...prev, s.nome])}
                        className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all outline-none ${expanded.includes(s.nome) ? "bg-slate-50 border border-slate-100 shadow-inner" : "hover:bg-slate-50 border border-transparent"}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-6 h-6 flex items-center justify-center">
                            {expanded.includes(s.nome) ? <ChevronDown className="w-5 h-5 text-blue-600" /> : <ChevronRight className="w-5 h-5 text-slate-300" />}
                          </div>
                          <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-[10px] font-black shadow-sm text-blue-600">
                            {s.nome.slice(0, 3).toUpperCase()}
                          </div>
                          <span className="font-bold text-slate-800 text-base">{s.nome}</span>
                          <span className="text-[10px] font-bold text-slate-400 bg-white border border-slate-100 px-2 py-0.5 rounded-full">{s.inds.length}</span>
                        </div>
                        <div className="flex gap-4 pr-4">
                          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500" /><span className="text-xs font-bold text-slate-500">{s.vermelho}</span></div>
                          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-400" /><span className="text-xs font-bold text-slate-500">{s.amarelo}</span></div>
                          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-xs font-bold text-slate-500">{s.verde}</span></div>
                        </div>
                      </button>

                      {expanded.includes(s.nome) && (
                        <div className="mt-2 sm:ml-14 mr-2 mb-4 bg-white border border-slate-50 rounded-3xl overflow-hidden shadow-inner overflow-x-auto">
                          <table className="w-full text-left text-sm whitespace-nowrap min-w-[600px]">
                            <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">
                              <tr>
                                <th className="px-6 py-3">Indicador</th>
                                <th className="px-6 py-3">Responsável</th>
                                <th className="px-6 py-3 text-center">Status</th>
                                <th className="px-6 py-3 text-right">Realizado</th>
                                <th className="px-6 py-3 text-right">Meta</th>
                                <th className="px-6 py-3 text-right" />
                              </tr>
                            </thead>
                            <tbody>
                              {s.inds.map(ind => {
                                const med   = getUltimaMedicao(ind.id);
                                const valor = med?.valor ?? null;
                                const statusKey = getStatusKey(ind, valor);
                                return (
                                  <tr key={ind.id} onClick={() => setIndicadorAtivo(ind)} className="hover:bg-blue-50/30 cursor-pointer group border-b last:border-0 border-slate-50">
                                    <td className="px-6 py-4 font-bold text-slate-800">{ind.nome}</td>
                                    <td className="px-6 py-4 font-medium text-slate-500">{ind.responsavel || "—"}</td>
                                    <td className="px-6 py-4 text-center">
                                      <div className="flex items-center justify-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${getStatusColor(ind, valor)}`} />
                                        <TIcon val={valor} target={ind.meta} pol={ind.polaridade} />
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 text-right font-black text-slate-900">{formatValue(valor, getTipo(ind), 1)}</td>
                                    <td className="px-6 py-4 text-right font-bold text-slate-400">{formatValue(ind.meta, getTipo(ind), 1)}</td>
                                    <td className="px-6 py-4 text-right">
                                      <button className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-500 shadow-sm flex items-center gap-1 ml-auto group-hover:text-blue-600 group-hover:border-blue-200">
                                        <BarChart3 className="w-3.5 h-3.5" /> Analisar
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ABA: FICHAS TÉCNICAS */}
          {tab === "cadastro" && (
            <div className="flex flex-col h-full">
              <div className="flex justify-between items-center mb-6 shrink-0">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Fichas Técnicas de KPIs</h2>
                  <p className="text-sm text-slate-500">Repositório estrutural de todos os indicadores cadastrados.</p>
                </div>
                <button onClick={() => setModalNovo(true)} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-md hover:bg-blue-700">
                  <Plus className="w-4 h-4" /> Cadastrar Indicador
                </button>
              </div>

              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden flex-1 flex flex-col">
                <div className="overflow-y-auto flex-1 overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap min-w-[700px]">
                    <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-widest sticky top-0 shadow-sm z-10">
                      <tr>
                        <th className="px-6 py-4">Indicador</th>
                        <th className="px-6 py-4">Setor</th>
                        <th className="px-6 py-4">Perspectiva</th>
                        <th className="px-6 py-4 text-center">Meta</th>
                        <th className="px-6 py-4 text-center">Frequência</th>
                        <th className="px-6 py-4 text-center">Polaridade</th>
                        <th className="px-6 py-4 text-center">Status</th>
                        <th className="px-6 py-4" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {isLoading ? (
                        <tr><td colSpan={8} className="p-10 text-center"><Loader2 className="w-5 h-5 animate-spin text-blue-500 mx-auto" /></td></tr>
                      ) : indicadores.length === 0 ? (
                        <tr><td colSpan={8} className="p-10 text-center text-slate-400 font-bold">Nenhum indicador cadastrado.</td></tr>
                      ) : indicadores.map(ind => (
                        <tr key={ind.id} onClick={() => setIndicadorAtivo(ind)} className="hover:bg-slate-50 cursor-pointer group transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-800">{ind.nome}</td>
                          <td className="px-6 py-4 font-medium text-slate-600">{ind.setor || "—"}</td>
                          <td className="px-6 py-4 font-medium text-slate-600">{ind.perspectiva_bsc || "—"}</td>
                          <td className="px-6 py-4 text-center font-bold text-slate-700">{formatValue(ind.meta, getTipo(ind), 1)}</td>
                          <td className="px-6 py-4 text-center"><span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-black uppercase">{ind.frequencia}</span></td>
                          <td className="px-6 py-4 text-center text-xs font-bold text-slate-500">{ind.polaridade === "MAIOR_MELHOR" ? "↑ Maior Melhor" : "↓ Menor Melhor"}</td>
                          <td className="px-6 py-4 text-center"><span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${ind.status === "ATIVO" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-100 text-slate-500 border-slate-200"}`}>{ind.status}</span></td>
                          <td className="px-6 py-4 text-right"><button className="text-xs font-bold text-slate-400 group-hover:text-blue-600 flex items-center gap-1 ml-auto"><ChevronRight className="w-4 h-4" /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: NOVO INDICADOR */}
      {modalNovo && empresaId && (
        <ModalNovoIndicador empresaId={empresaId} onClose={() => setModalNovo(false)} onSalvo={fetchDados} />
      )}
    </div>
  );
}