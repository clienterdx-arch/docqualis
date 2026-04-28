"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Target, TrendingUp, Users, Zap, Briefcase, Map, BarChart3,
  Rocket, CheckCircle2, AlertTriangle, Clock, ArrowRight,
  Crosshair, Plus, FileText, X, Loader2, Save, Trash2,
  TrendingDown, Minus, AlertCircle, ChevronUp, ChevronDown,
  Shield, Star, Eye, Lightbulb, Activity, PieChart,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

/* ─────────────────────────────────────────────────────────────────
 * TIPOS
 * ───────────────────────────────────────────────────────────────*/
interface Perspectiva {
  id: string; empresa_id: string; nome: string; cor: string; icone: string; ordem: number;
}
interface Objetivo {
  id: string; empresa_id: string; perspectiva_id: string; titulo: string; descricao: string;
  responsavel: string; prazo: string; status: string; progresso: number; indicador_id: string | null;
}
interface Iniciativa {
  id: string; empresa_id: string; objetivo_id: string; titulo: string; descricao: string;
  responsavel: string; prazo: string; status: string; progresso: number;
}
interface SwotItem {
  id: string; empresa_id: string; tipo: string; descricao: string; impacto: string; responsavel: string;
}
interface Indicador {
  id: string; empresa_id: string; nome: string; perspectiva_bsc: string; meta: number;
  tipo: string; unidade: string; status: string; frequencia: string; responsavel: string;
}
interface Medicao {
  indicador_id: string; valor: number; periodo: string; data_medicao: string;
}

/* ─────────────────────────────────────────────────────────────────
 * PERSPECTIVAS PADRÃO BSC (criadas automaticamente se não existirem)
 * ───────────────────────────────────────────────────────────────*/
const BSC_PERSPECTIVAS_DEFAULT = [
  { nome: "Perspectiva Financeira",                   cor: "#10b981", icone: "TrendingUp", ordem: 1 },
  { nome: "Perspectiva Clientes & Mercado",            cor: "#3b82f6", icone: "Users",      ordem: 2 },
  { nome: "Perspectiva Processos Internos",            cor: "#8b5cf6", icone: "Zap",        ordem: 3 },
  { nome: "Perspectiva Aprendizado & Crescimento",     cor: "#f59e0b", icone: "Briefcase",  ordem: 4 },
];

/* ─────────────────────────────────────────────────────────────────
 * HELPERS
 * ───────────────────────────────────────────────────────────────*/
function getStatusColor(status: string) {
  if (["CONCLUIDO", "No Alvo", "ATIVO"].includes(status)) return "bg-emerald-500";
  if (["EM_ANDAMENTO", "Atenção"].includes(status))        return "bg-amber-400";
  if (["ATRASADO", "Crítico"].includes(status))            return "bg-red-500";
  return "bg-slate-300";
}

function getStatusBadge(status: string) {
  if (["CONCLUIDO", "No Alvo", "ATIVO"].includes(status))
    return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (["EM_ANDAMENTO", "Atenção"].includes(status))
    return "text-amber-700 bg-amber-50 border-amber-200";
  if (["ATRASADO", "Crítico"].includes(status))
    return "text-red-700 bg-red-50 border-red-200";
  return "text-slate-600 bg-slate-50 border-slate-200";
}

function getImpactoBadge(impacto: string) {
  if (impacto === "ALTO")  return "text-red-700 bg-red-50 border-red-200";
  if (impacto === "MEDIO") return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-emerald-700 bg-emerald-50 border-emerald-200";
}

function PerspectivaIcon({ nome }: { nome: string }) {
  if (nome.includes("Financ"))    return <TrendingUp className="w-5 h-5" />;
  if (nome.includes("Cliente"))   return <Users className="w-5 h-5" />;
  if (nome.includes("Processo"))  return <Zap className="w-5 h-5" />;
  return <Briefcase className="w-5 h-5" />;
}

function SwotIcon({ tipo }: { tipo: string }) {
  if (tipo === "FORCA")        return <Star className="w-4 h-4" />;
  if (tipo === "FRAQUEZA")     return <AlertTriangle className="w-4 h-4" />;
  if (tipo === "OPORTUNIDADE") return <Lightbulb className="w-4 h-4" />;
  return <Shield className="w-4 h-4" />;
}

const SWOT_CONFIG = {
  FORCA:        { label: "Forças",        cor: "bg-emerald-50 border-emerald-200", headerCor: "bg-emerald-600", text: "text-emerald-700" },
  FRAQUEZA:     { label: "Fraquezas",     cor: "bg-red-50 border-red-200",         headerCor: "bg-red-600",     text: "text-red-700" },
  OPORTUNIDADE: { label: "Oportunidades", cor: "bg-blue-50 border-blue-200",        headerCor: "bg-blue-600",    text: "text-blue-700" },
  AMEACA:       { label: "Ameaças",       cor: "bg-amber-50 border-amber-200",      headerCor: "bg-amber-600",   text: "text-amber-700" },
};

/* ─────────────────────────────────────────────────────────────────
 * COMPONENTE PRINCIPAL
 * ───────────────────────────────────────────────────────────────*/
export default function PlanejamentoEstrategicoPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"dashboard" | "mapa" | "indicadores" | "iniciativas" | "swot">("dashboard");

  const [empresaId, setEmpresaId]       = useState<string | null>(null);
  const [perspectivas, setPerspectivas] = useState<Perspectiva[]>([]);
  const [objetivos, setObjetivos]       = useState<Objetivo[]>([]);
  const [iniciativas, setIniciativas]   = useState<Iniciativa[]>([]);
  const [swotItems, setSwotItems]       = useState<SwotItem[]>([]);
  const [indicadores, setIndicadores]   = useState<Indicador[]>([]);
  const [medicoes, setMedicoes]         = useState<Medicao[]>([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [toast, setToast]               = useState<{ tipo: "ok" | "err"; msg: string } | null>(null);

  // Modais
  const [modalObj, setModalObj]       = useState(false);
  const [modalIni, setModalIni]       = useState(false);
  const [modalSwot, setModalSwot]     = useState(false);
  const [modalInd, setModalInd]       = useState(false);
  const [salvando, setSalvando]       = useState(false);

  // Forms
  const [formObj, setFormObj] = useState({ perspectiva_id: "", titulo: "", descricao: "", responsavel: "", prazo: "", status: "NAO_INICIADO", progresso: 0 });
  const [formIni, setFormIni] = useState({ objetivo_id: "", titulo: "", descricao: "", responsavel: "", prazo: "", status: "NAO_INICIADO", progresso: 0 });
  const [formSwot, setFormSwot] = useState({ tipo: "FORCA", descricao: "", impacto: "MEDIO", responsavel: "" });
  const [formInd, setFormInd] = useState({ nome: "", perspectiva_bsc: "Financeira", meta: 0, tipo: "PERCENTUAL", unidade: "%", status: "ATIVO", frequencia: "MENSAL", responsavel: "" });

  /* ── SESSÃO ──────────────────────────────────────────── */
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      const { data: perfil } = await supabase.from("perfis").select("empresa_id").eq("id", session.user.id).single();
      if (perfil?.empresa_id) setEmpresaId(perfil.empresa_id);
    };
    init();
  }, [router]);

  /* ── TOAST ───────────────────────────────────────────── */
  function mostrar(tipo: "ok" | "err", msg: string) {
    setToast({ tipo, msg });
    setTimeout(() => setToast(null), 3500);
  }

  /* ── FETCH ───────────────────────────────────────────── */
  const fetchTudo = useCallback(async () => {
    if (!empresaId) return;
    setIsLoading(true);

    const [rP, rO, rI, rS, rInd, rM] = await Promise.all([
      supabase.from("planejamento_perspectivas").select("*").eq("empresa_id", empresaId).order("ordem"),
      supabase.from("planejamento_objetivos").select("*").eq("empresa_id", empresaId).order("created_at"),
      supabase.from("planejamento_iniciativas").select("*").eq("empresa_id", empresaId).order("created_at"),
      supabase.from("planejamento_swot").select("*").eq("empresa_id", empresaId).order("tipo"),
      supabase.from("indicadores").select("*").eq("empresa_id", empresaId).order("nome"),
      supabase.from("indicadores_medicoes").select("*").eq("empresa_id", empresaId).order("data_medicao", { ascending: false }),
    ]);

    let persp = rP.data ?? [];

    // Cria perspectivas padrão BSC se não existirem
    if (persp.length === 0) {
      const inserts = BSC_PERSPECTIVAS_DEFAULT.map((p) => ({ ...p, empresa_id: empresaId }));
      const { data: criadas } = await supabase.from("planejamento_perspectivas").insert(inserts).select();
      persp = criadas ?? [];
    }

    setPerspectivas(persp);
    setObjetivos(rO.data ?? []);
    setIniciativas(rI.data ?? []);
    setSwotItems(rS.data ?? []);
    setIndicadores(rInd.data ?? []);
    setMedicoes(rM.data ?? []);
    setIsLoading(false);
  }, [empresaId]);

  useEffect(() => { fetchTudo(); }, [fetchTudo]);

  /* ── MÉTRICAS EXECUTIVAS ─────────────────────────────── */
  const totalObjetivos  = objetivos.length;
  const concluidos      = objetivos.filter((o) => o.status === "CONCLUIDO").length;
  const emAndamento     = objetivos.filter((o) => o.status === "EM_ANDAMENTO").length;
  const atrasados       = objetivos.filter((o) => o.status === "ATRASADO").length;
  const execucaoGlobal  = totalObjetivos > 0 ? Math.round(objetivos.reduce((s, o) => s + (o.progresso ?? 0), 0) / totalObjetivos) : 0;

  /* ── ÚLTIMA MEDIÇÃO POR INDICADOR ────────────────────── */
  function ultimaMedicao(indId: string) {
    return medicoes.find((m) => m.indicador_id === indId);
  }

  function tendencia(ind: Indicador) {
    const todas = medicoes.filter((m) => m.indicador_id === ind.id);
    if (todas.length < 2) return "stable";
    const [last, prev] = todas;
    return last.valor > prev.valor ? "up" : last.valor < prev.valor ? "down" : "stable";
  }

  /* ── SALVAR OBJETIVO ─────────────────────────────────── */
  async function salvarObjetivo() {
    if (!formObj.titulo || !formObj.perspectiva_id) { mostrar("err", "Preencha Perspectiva e Título."); return; }
    setSalvando(true);
    const { error } = await supabase.from("planejamento_objetivos").insert({ ...formObj, empresa_id: empresaId! });
    if (error) mostrar("err", error.message);
    else { mostrar("ok", "Objetivo estratégico criado!"); setModalObj(false); setFormObj({ perspectiva_id: "", titulo: "", descricao: "", responsavel: "", prazo: "", status: "NAO_INICIADO", progresso: 0 }); fetchTudo(); }
    setSalvando(false);
  }

  /* ── SALVAR INICIATIVA ───────────────────────────────── */
  async function salvarIniciativa() {
    if (!formIni.titulo || !formIni.objetivo_id) { mostrar("err", "Preencha Objetivo vinculado e Título."); return; }
    setSalvando(true);
    const { error } = await supabase.from("planejamento_iniciativas").insert({ ...formIni, empresa_id: empresaId! });
    if (error) mostrar("err", error.message);
    else { mostrar("ok", "Iniciativa criada!"); setModalIni(false); setFormIni({ objetivo_id: "", titulo: "", descricao: "", responsavel: "", prazo: "", status: "NAO_INICIADO", progresso: 0 }); fetchTudo(); }
    setSalvando(false);
  }

  /* ── SALVAR SWOT ─────────────────────────────────────── */
  async function salvarSwot() {
    if (!formSwot.descricao) { mostrar("err", "Descreva o item."); return; }
    setSalvando(true);
    const { error } = await supabase.from("planejamento_swot").insert({ ...formSwot, empresa_id: empresaId! });
    if (error) mostrar("err", error.message);
    else { mostrar("ok", "Item SWOT adicionado!"); setModalSwot(false); setFormSwot({ tipo: "FORCA", descricao: "", impacto: "MEDIO", responsavel: "" }); fetchTudo(); }
    setSalvando(false);
  }

  /* ── SALVAR INDICADOR ────────────────────────────────── */
  async function salvarIndicador() {
    if (!formInd.nome) { mostrar("err", "Preencha o nome do indicador."); return; }
    setSalvando(true);
    const { error } = await supabase.from("indicadores").insert({ ...formInd, empresa_id: empresaId! });
    if (error) mostrar("err", error.message);
    else { mostrar("ok", "Indicador criado!"); setModalInd(false); setFormInd({ nome: "", perspectiva_bsc: "Financeira", meta: 0, tipo: "PERCENTUAL", unidade: "%", status: "ATIVO", frequencia: "MENSAL", responsavel: "" }); fetchTudo(); }
    setSalvando(false);
  }

  /* ── ATUALIZAR PROGRESSO ─────────────────────────────── */
  async function atualizarProgresso(id: string, tipo: "objetivo" | "iniciativa", valor: number) {
    const tabela = tipo === "objetivo" ? "planejamento_objetivos" : "planejamento_iniciativas";
    await supabase.from(tabela).update({ progresso: valor }).eq("id", id);
    if (tipo === "objetivo") setObjetivos((p) => p.map((o) => o.id === id ? { ...o, progresso: valor } : o));
    else setIniciativas((p) => p.map((i) => i.id === id ? { ...i, progresso: valor } : i));
  }

  /* ── EXCLUIR ─────────────────────────────────────────── */
  async function excluir(tabela: string, id: string) {
    if (!confirm("Excluir este item?")) return;
    await supabase.from(tabela).delete().eq("id", id);
    fetchTudo();
  }

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center gap-3 text-slate-400">
      <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      <span className="font-bold">Carregando Planejamento Estratégico...</span>
    </div>
  );

  /* ─────────────────────────────────────────────────────────
   * RENDER
   * ───────────────────────────────────────────────────────*/
  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">

      {/* TOAST */}
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 font-bold text-sm text-white ${toast.tipo === "ok" ? "bg-emerald-600" : "bg-red-600"}`}>
          {toast.tipo === "ok" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {toast.msg}
        </div>
      )}

      {/* ── HEADER ──────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            Planejamento Estratégico
            <span className="px-3 py-1 bg-slate-800 text-white text-[10px] uppercase font-black rounded-full tracking-widest">Ciclo 2026–2028</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Balanced Scorecard · Análise SWOT · Indicadores · Iniciativas Estratégicas</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-50 shadow-sm transition-all">
            <FileText className="w-4 h-4" /> Relatório Executivo
          </button>
          <button onClick={() => setModalObj(true)} className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 shadow-md transition-all">
            <Plus className="w-4 h-4" /> Novo Objetivo
          </button>
        </div>
      </div>

      {/* ── TABS ────────────────────────────────────────── */}
      <div className="border-b border-slate-200 mb-8 flex gap-6 text-sm font-bold text-slate-500 overflow-x-auto whitespace-nowrap">
        {[
          { key: "dashboard",    label: "Painel Executivo",    icon: <PieChart className="w-4 h-4" /> },
          { key: "mapa",         label: "Mapa Estratégico",    icon: <Map className="w-4 h-4" /> },
          { key: "indicadores",  label: "Indicadores (KPIs)",  icon: <BarChart3 className="w-4 h-4" /> },
          { key: "iniciativas",  label: "Iniciativas & Planos",icon: <Rocket className="w-4 h-4" /> },
          { key: "swot",         label: "Análise SWOT",        icon: <Crosshair className="w-4 h-4" /> },
        ].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
            className={`pb-4 border-b-2 transition-all flex items-center gap-2 ${tab === t.key ? "border-blue-600 text-blue-600" : "border-transparent hover:text-slate-800"}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════
          ABA 1: PAINEL EXECUTIVO
      ══════════════════════════════════════════════════ */}
      {tab === "dashboard" && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4">

          {/* KPIs PRINCIPAIS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            <KpiCard titulo="Execução Global"   valor={`${execucaoGlobal}%`} desc="Média de progresso"       cor="blue"    icon={<Target className="w-5 h-5" />} />
            <KpiCard titulo="Objetivos"          valor={totalObjetivos}        desc={`${concluidos} concluídos`} cor="emerald" icon={<CheckCircle2 className="w-5 h-5" />} />
            <KpiCard titulo="Em Andamento"       valor={emAndamento}           desc="Objetivos ativos"          cor="amber"   icon={<Activity className="w-5 h-5" />} />
            <KpiCard titulo="Atrasados"          valor={atrasados}             desc="Requer atenção imediata"   cor="red"     icon={<AlertTriangle className="w-5 h-5" />} />
          </div>

          {/* PROGRESSO POR PERSPECTIVA */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 mb-6">Execução por Perspectiva BSC</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {perspectivas.map((p) => {
                const objsP = objetivos.filter((o) => o.perspectiva_id === p.id);
                const progP = objsP.length > 0 ? Math.round(objsP.reduce((s, o) => s + (o.progresso ?? 0), 0) / objsP.length) : 0;
                return (
                  <div key={p.id} className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0" style={{ backgroundColor: p.cor }}>
                      <PerspectivaIcon nome={p.nome} />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm font-bold text-slate-700 mb-1">
                        <span className="truncate max-w-[200px]">{p.nome.replace("Perspectiva ", "")}</span>
                        <span>{progP}%</span>
                      </div>
                      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${progP}%`, backgroundColor: p.cor }} />
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium mt-1">{objsP.length} objetivo(s)</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* GRID: OBJETIVOS RECENTES + SWOT RESUMO */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Objetivos recentes */}
            <div className="lg:col-span-2 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-800">Objetivos Estratégicos</h2>
                <button onClick={() => setTab("mapa")} className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1">Ver mapa <ArrowRight className="w-3 h-3" /></button>
              </div>
              <div className="space-y-3">
                {objetivos.length === 0 ? (
                  <EmptyState msg="Nenhum objetivo cadastrado. Clique em 'Novo Objetivo'." />
                ) : objetivos.slice(0, 5).map((o) => {
                  const persp = perspectivas.find((p) => p.id === o.perspectiva_id);
                  return (
                    <div key={o.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 hover:bg-white hover:shadow-sm transition-all">
                      <div className="w-2 h-10 rounded-full shrink-0" style={{ backgroundColor: persp?.cor ?? "#94a3b8" }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{o.titulo}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{persp?.nome.replace("Perspectiva ", "") ?? "—"} · {o.responsavel || "Sem responsável"}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="w-16">
                          <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                            <span>{o.progresso ?? 0}%</span>
                          </div>
                          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-blue-500" style={{ width: `${o.progresso ?? 0}%` }} />
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${getStatusBadge(o.status)}`}>{o.status}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SWOT Resumo */}
            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-800">Análise SWOT</h2>
                <button onClick={() => setTab("swot")} className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1">Ver completo <ArrowRight className="w-3 h-3" /></button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {(["FORCA","FRAQUEZA","OPORTUNIDADE","AMEACA"] as const).map((tipo) => {
                  const itens = swotItems.filter((s) => s.tipo === tipo);
                  const cfg = SWOT_CONFIG[tipo];
                  return (
                    <div key={tipo} className={`p-3 rounded-xl border ${cfg.cor}`}>
                      <div className={`text-[9px] font-black uppercase tracking-widest mb-2 ${cfg.text} flex items-center gap-1`}>
                        <SwotIcon tipo={tipo} />{cfg.label}
                      </div>
                      <p className="text-2xl font-black text-slate-800">{itens.length}</p>
                      <p className="text-[10px] text-slate-500">item(ns)</p>
                    </div>
                  );
                })}
              </div>
              <button onClick={() => setModalSwot(true)} className="mt-4 w-full py-2 border border-dashed border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:border-blue-300 hover:text-blue-600 transition-colors flex items-center justify-center gap-2">
                <Plus className="w-3 h-3" /> Adicionar item SWOT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          ABA 2: MAPA ESTRATÉGICO BSC
      ══════════════════════════════════════════════════ */}
      {tab === "mapa" && (
        <div className="space-y-4 animate-in slide-in-from-bottom-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Execução Global</p>
                <p className="text-3xl font-black text-slate-800">{execucaoGlobal}<span className="text-lg text-slate-500">%</span></p>
              </div>
              <div className="w-px h-10 bg-slate-200" />
              <div className="flex items-center gap-4 text-xs font-bold text-slate-600">
                <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-500" /> Concluído</span>
                <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-amber-400" /> Em andamento</span>
                <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500" /> Atrasado</span>
                <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-slate-300" /> Não iniciado</span>
              </div>
            </div>
            <button onClick={() => setModalObj(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition-all">
              <Plus className="w-4 h-4" /> Objetivo
            </button>
          </div>

          {perspectivas.map((p) => {
            const objsP = objetivos.filter((o) => o.perspectiva_id === p.id);
            return (
              <div key={p.id} className="rounded-2xl border-2 overflow-hidden" style={{ borderColor: p.cor + "40" }}>
                <div className="px-6 py-3 flex items-center gap-3" style={{ backgroundColor: p.cor + "15" }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: p.cor }}>
                    <PerspectivaIcon nome={p.nome} />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-slate-800">{p.nome}</h2>
                    <p className="text-[10px] text-slate-500 font-medium">{objsP.length} objetivo(s) mapeado(s)</p>
                  </div>
                </div>

                <div className="p-4 bg-white flex flex-wrap gap-4 min-h-[100px] items-start">
                  {objsP.length === 0 ? (
                    <div className="flex items-center justify-center w-full py-4 text-sm text-slate-400 font-medium">
                      Nenhum objetivo. <button onClick={() => { setFormObj({ ...formObj, perspectiva_id: p.id }); setModalObj(true); }} className="ml-2 text-blue-600 font-bold hover:underline">Adicionar</button>
                    </div>
                  ) : objsP.map((obj) => (
                    <div key={obj.id} className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all w-full md:w-60 cursor-pointer relative overflow-hidden group">
                      {/* Barra de progresso no topo */}
                      <div className="absolute top-0 inset-x-0 h-1 bg-slate-100">
                        <div className={`h-full ${getStatusColor(obj.status)}`} style={{ width: `${obj.progresso ?? 0}%` }} />
                      </div>

                      <div className="flex justify-between items-start mt-1 mb-2">
                        <div className={`w-2.5 h-2.5 rounded-full mt-0.5 ${getStatusColor(obj.status)}`} />
                        <button onClick={() => excluir("planejamento_objetivos", obj.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all p-0.5">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <h3 className="text-sm font-bold text-slate-800 leading-tight mb-3">{obj.titulo}</h3>

                      {obj.responsavel && (
                        <p className="text-[10px] text-slate-500 font-medium mb-3 truncate">👤 {obj.responsavel}</p>
                      )}

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                          <span>Progresso</span>
                          <span>{obj.progresso ?? 0}%</span>
                        </div>
                        <input type="range" min={0} max={100} step={5} value={obj.progresso ?? 0}
                          onChange={(e) => atualizarProgresso(obj.id, "objetivo", Number(e.target.value))}
                          className="w-full accent-blue-600 h-1" />
                      </div>

                      {/* Iniciativas vinculadas */}
                      {(() => {
                        const inisObj = iniciativas.filter((i) => i.objetivo_id === obj.id);
                        if (inisObj.length === 0) return null;
                        return (
                          <div className="mt-3 pt-3 border-t border-slate-100">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{inisObj.length} iniciativa(s)</p>
                            {inisObj.slice(0, 2).map((ini) => (
                              <div key={ini.id} className="flex items-center gap-1.5 text-[10px] text-slate-600 font-medium">
                                <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor(ini.status)}`} />
                                <span className="truncate">{ini.titulo}</span>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  ))}

                  {/* Botão adicionar objetivo na perspectiva */}
                  <button onClick={() => { setFormObj({ ...formObj, perspectiva_id: p.id }); setModalObj(true); }}
                    className="w-full md:w-60 border-2 border-dashed border-slate-200 rounded-xl p-4 flex items-center justify-center gap-2 text-sm font-bold text-slate-400 hover:border-blue-300 hover:text-blue-600 transition-all min-h-[100px]">
                    <Plus className="w-4 h-4" /> Adicionar objetivo
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          ABA 3: INDICADORES ESTRATÉGICOS (KPIs)
      ══════════════════════════════════════════════════ */}
      {tab === "indicadores" && (
        <div className="space-y-6 animate-in slide-in-from-right-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-blue-600" /> Painel de Bordo Estratégico (KPIs)
            </h2>
            <button onClick={() => setModalInd(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 shadow-md transition-all">
              <Plus className="w-4 h-4" /> Novo Indicador
            </button>
          </div>

          {indicadores.filter((i) => i.perspectiva_bsc).length === 0 ? (
            <EmptyState msg="Nenhum indicador estratégico cadastrado." />
          ) : (
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase font-black text-slate-400 tracking-widest">
                    <tr>
                      <th className="px-6 py-4">Indicador</th>
                      <th className="px-6 py-4">Perspectiva</th>
                      <th className="px-6 py-4">Responsável</th>
                      <th className="px-6 py-4 text-center">Meta</th>
                      <th className="px-6 py-4 text-center">Realizado</th>
                      <th className="px-6 py-4 text-center">Tendência</th>
                      <th className="px-6 py-4 w-40">Desempenho</th>
                      <th className="px-6 py-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {indicadores.map((ind) => {
                      const med = ultimaMedicao(ind.id);
                      const atual = med?.valor ?? 0;
                      const percentual = ind.meta > 0 ? Math.min(Math.round((atual / ind.meta) * 100), 100) : 0;
                      const tend = tendencia(ind);
                      return (
                        <tr key={ind.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-6 py-4">
                            <p className="font-bold text-slate-800">{ind.nome}</p>
                            <p className="text-[10px] text-slate-400 font-medium">{ind.frequencia} · {ind.tipo}</p>
                          </td>
                          <td className="px-6 py-4 font-medium text-slate-600">{ind.perspectiva_bsc || "—"}</td>
                          <td className="px-6 py-4 font-medium text-slate-600">{ind.responsavel || "—"}</td>
                          <td className="px-6 py-4 text-center font-bold text-slate-500">{ind.meta}{ind.unidade}</td>
                          <td className="px-6 py-4 text-center font-black text-slate-900">{med ? `${atual}${ind.unidade}` : "—"}</td>
                          <td className="px-6 py-4 text-center">
                            {tend === "up"     && <ChevronUp className="w-5 h-5 text-emerald-500 mx-auto" />}
                            {tend === "down"   && <ChevronDown className="w-5 h-5 text-red-500 mx-auto" />}
                            {tend === "stable" && <Minus className="w-5 h-5 text-slate-400 mx-auto" />}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${percentual >= 80 ? "bg-emerald-500" : percentual >= 50 ? "bg-amber-400" : "bg-red-500"}`} style={{ width: `${percentual}%` }} />
                              </div>
                              <span className="text-xs font-bold text-slate-600 w-8">{percentual}%</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-black uppercase border ${getStatusBadge(ind.status)}`}>{ind.status}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          ABA 4: INICIATIVAS & PLANO DE AÇÃO ESTRATÉGICO
      ══════════════════════════════════════════════════ */}
      {tab === "iniciativas" && (
        <div className="space-y-6 animate-in slide-in-from-right-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Rocket className="w-5 h-5 text-blue-600" /> Portfólio de Iniciativas Estratégicas
            </h2>
            <button onClick={() => setModalIni(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 shadow-md transition-all">
              <Plus className="w-4 h-4" /> Nova Iniciativa
            </button>
          </div>

          {/* Cards por objetivo */}
          {objetivos.length === 0 ? (
            <EmptyState msg="Cadastre objetivos estratégicos antes de criar iniciativas." />
          ) : objetivos.map((obj) => {
            const inisObj = iniciativas.filter((i) => i.objetivo_id === obj.id);
            if (inisObj.length === 0) return null;
            const persp = perspectivas.find((p) => p.id === obj.perspectiva_id);
            return (
              <div key={obj.id} className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3" style={{ backgroundColor: (persp?.cor ?? "#94a3b8") + "10" }}>
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: persp?.cor ?? "#94a3b8" }} />
                  <div>
                    <p className="text-sm font-black text-slate-800">{obj.titulo}</p>
                    <p className="text-[10px] text-slate-500 font-medium">{persp?.nome.replace("Perspectiva ", "") ?? "—"}</p>
                  </div>
                  <span className={`ml-auto px-2 py-0.5 rounded text-[10px] font-black uppercase border ${getStatusBadge(obj.status)}`}>{obj.status}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-50 text-[10px] uppercase font-black text-slate-400 tracking-widest border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-3">Iniciativa</th>
                        <th className="px-6 py-3">Responsável</th>
                        <th className="px-6 py-3 text-center">Prazo</th>
                        <th className="px-6 py-3 text-center">Status</th>
                        <th className="px-6 py-3 w-40">Progresso</th>
                        <th className="px-6 py-3 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {inisObj.map((ini) => (
                        <tr key={ini.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-6 py-3">
                            <p className="font-bold text-slate-800">{ini.titulo}</p>
                            {ini.descricao && <p className="text-[10px] text-slate-400 mt-0.5 max-w-xs truncate">{ini.descricao}</p>}
                          </td>
                          <td className="px-6 py-3 font-medium text-slate-600">{ini.responsavel || "—"}</td>
                          <td className="px-6 py-3 text-center font-medium text-slate-600 flex items-center justify-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />{ini.prazo || "—"}
                          </td>
                          <td className="px-6 py-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${getStatusBadge(ini.status)}`}>{ini.status}</span>
                          </td>
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${ini.progresso === 100 ? "bg-emerald-500" : "bg-blue-500"}`} style={{ width: `${ini.progresso ?? 0}%` }} />
                              </div>
                              <span className="text-xs font-bold text-slate-600 w-8">{ini.progresso ?? 0}%</span>
                            </div>
                            <input type="range" min={0} max={100} step={5} value={ini.progresso ?? 0}
                              onChange={(e) => atualizarProgresso(ini.id, "iniciativa", Number(e.target.value))}
                              className="w-full accent-blue-600 h-1 mt-1" />
                          </td>
                          <td className="px-6 py-3 text-right">
                            <button onClick={() => excluir("planejamento_iniciativas", ini.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 p-1.5 rounded transition-all">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}

          {iniciativas.length === 0 && <EmptyState msg="Nenhuma iniciativa cadastrada. Clique em 'Nova Iniciativa'." />}
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          ABA 5: ANÁLISE SWOT
      ══════════════════════════════════════════════════ */}
      {tab === "swot" && (
        <div className="space-y-6 animate-in slide-in-from-right-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Crosshair className="w-5 h-5 text-blue-600" /> Matriz de Análise SWOT
              </h2>
              <p className="text-sm text-slate-500 font-medium mt-1">Forças · Fraquezas · Oportunidades · Ameaças</p>
            </div>
            <button onClick={() => setModalSwot(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 shadow-md transition-all">
              <Plus className="w-4 h-4" /> Adicionar Item
            </button>
          </div>

          {/* Resumo SWOT */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(["FORCA","FRAQUEZA","OPORTUNIDADE","AMEACA"] as const).map((tipo) => {
              const itens = swotItems.filter((s) => s.tipo === tipo);
              const cfg = SWOT_CONFIG[tipo];
              return (
                <div key={tipo} className={`p-4 rounded-xl border ${cfg.cor} text-center`}>
                  <div className={`flex items-center justify-center gap-1.5 ${cfg.text} font-black text-xs uppercase tracking-widest mb-2`}>
                    <SwotIcon tipo={tipo} />{cfg.label}
                  </div>
                  <p className="text-3xl font-black text-slate-800">{itens.length}</p>
                  <p className="text-[10px] text-slate-500 font-medium">item(ns)</p>
                </div>
              );
            })}
          </div>

          {/* Matriz 2x2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(["FORCA","FRAQUEZA","OPORTUNIDADE","AMEACA"] as const).map((tipo) => {
              const itens = swotItems.filter((s) => s.tipo === tipo);
              const cfg = SWOT_CONFIG[tipo];
              return (
                <div key={tipo} className={`rounded-2xl border-2 overflow-hidden ${cfg.cor}`}>
                  <div className={`${cfg.headerCor} px-5 py-3 flex items-center justify-between`}>
                    <div className="flex items-center gap-2 text-white font-black text-sm uppercase tracking-widest">
                      <SwotIcon tipo={tipo} />{cfg.label}
                    </div>
                    <button onClick={() => { setFormSwot({ ...formSwot, tipo }); setModalSwot(true); }}
                      className="w-6 h-6 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="p-4 space-y-2 min-h-[120px]">
                    {itens.length === 0 ? (
                      <p className={`text-sm font-medium opacity-50 ${cfg.text}`}>Nenhum item cadastrado.</p>
                    ) : itens.map((item) => (
                      <div key={item.id} className="bg-white/80 rounded-xl p-3 border border-white/60 shadow-sm group flex items-start gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-bold text-slate-800 leading-snug">{item.descricao}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${getImpactoBadge(item.impacto)}`}>{item.impacto}</span>
                            {item.responsavel && <span className="text-[9px] text-slate-400 font-medium">{item.responsavel}</span>}
                          </div>
                        </div>
                        <button onClick={() => excluir("planejamento_swot", item.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all p-0.5 shrink-0">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Análise cruzada */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-500" /> Análise Cruzada SWOT
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-2">🟢 SO — Crescimento</p>
                <p className="text-xs text-slate-600 font-medium">Use as Forças para aproveitar as Oportunidades. Estratégia ofensiva de expansão e consolidação.</p>
              </div>
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
                <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-2">🟡 ST — Confronto</p>
                <p className="text-xs text-slate-600 font-medium">Use as Forças para minimizar as Ameaças. Estratégia de defesa e fortalecimento competitivo.</p>
              </div>
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest mb-2">🔵 WO — Desenvolvimento</p>
                <p className="text-xs text-slate-600 font-medium">Supere as Fraquezas aproveitando Oportunidades. Estratégia de melhoria e capacitação.</p>
              </div>
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
                <p className="text-[10px] font-black text-red-700 uppercase tracking-widest mb-2">🔴 WT — Sobrevivência</p>
                <p className="text-xs text-slate-600 font-medium">Minimize Fraquezas e evite Ameaças. Estratégia de redução de riscos e reposicionamento.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────
       * MODAIS
       * ───────────────────────────────────────────────────*/}

      {/* MODAL: NOVO OBJETIVO */}
      {modalObj && (
        <Drawer titulo="Novo Objetivo Estratégico" onClose={() => setModalObj(false)}>
          <div className="space-y-4">
            <div>
              <FL label="Perspectiva BSC" required />
              <select value={formObj.perspectiva_id} onChange={(e) => setFormObj({ ...formObj, perspectiva_id: e.target.value })} className={CS}>
                <option value="">Selecione...</option>
                {perspectivas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
            <div>
              <FL label="Título do Objetivo" required />
              <input value={formObj.titulo} onChange={(e) => setFormObj({ ...formObj, titulo: e.target.value })} className={CI} placeholder="Ex: Aumentar a satisfação do paciente em 20%" />
            </div>
            <div>
              <FL label="Descrição" />
              <textarea value={formObj.descricao} onChange={(e) => setFormObj({ ...formObj, descricao: e.target.value })} rows={3} className={CT} placeholder="Detalhe o objetivo e sua importância estratégica..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FL label="Responsável" />
                <input value={formObj.responsavel} onChange={(e) => setFormObj({ ...formObj, responsavel: e.target.value })} className={CI} placeholder="Nome do responsável" />
              </div>
              <div>
                <FL label="Prazo" />
                <input type="date" value={formObj.prazo} onChange={(e) => setFormObj({ ...formObj, prazo: e.target.value })} className={CI} />
              </div>
            </div>
            <div>
              <FL label="Status Inicial" />
              <select value={formObj.status} onChange={(e) => setFormObj({ ...formObj, status: e.target.value })} className={CS}>
                <option value="NAO_INICIADO">Não Iniciado</option>
                <option value="EM_ANDAMENTO">Em Andamento</option>
                <option value="CONCLUIDO">Concluído</option>
                <option value="ATRASADO">Atrasado</option>
              </select>
            </div>
          </div>
          <DrawerFooter onCancel={() => setModalObj(false)} onSave={salvarObjetivo} salvando={salvando} label="Criar Objetivo" />
        </Drawer>
      )}

      {/* MODAL: NOVA INICIATIVA */}
      {modalIni && (
        <Drawer titulo="Nova Iniciativa Estratégica" onClose={() => setModalIni(false)}>
          <div className="space-y-4">
            <div>
              <FL label="Objetivo Vinculado" required />
              <select value={formIni.objetivo_id} onChange={(e) => setFormIni({ ...formIni, objetivo_id: e.target.value })} className={CS}>
                <option value="">Selecione...</option>
                {objetivos.map((o) => {
                  const p = perspectivas.find((pp) => pp.id === o.perspectiva_id);
                  return <option key={o.id} value={o.id}>[{p?.nome.replace("Perspectiva ", "").slice(0, 3).toUpperCase()}] {o.titulo}</option>;
                })}
              </select>
            </div>
            <div>
              <FL label="Título da Iniciativa" required />
              <input value={formIni.titulo} onChange={(e) => setFormIni({ ...formIni, titulo: e.target.value })} className={CI} placeholder="Ex: Implementar pesquisa de satisfação mensal" />
            </div>
            <div>
              <FL label="Descrição / Escopo" />
              <textarea value={formIni.descricao} onChange={(e) => setFormIni({ ...formIni, descricao: e.target.value })} rows={3} className={CT} placeholder="Descreva as atividades e entregáveis..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FL label="Responsável (Sponsor)" />
                <input value={formIni.responsavel} onChange={(e) => setFormIni({ ...formIni, responsavel: e.target.value })} className={CI} placeholder="Líder do projeto" />
              </div>
              <div>
                <FL label="Prazo Final" />
                <input type="date" value={formIni.prazo} onChange={(e) => setFormIni({ ...formIni, prazo: e.target.value })} className={CI} />
              </div>
            </div>
            <div>
              <FL label="Status" />
              <select value={formIni.status} onChange={(e) => setFormIni({ ...formIni, status: e.target.value })} className={CS}>
                <option value="NAO_INICIADO">Não Iniciado</option>
                <option value="EM_ANDAMENTO">Em Andamento</option>
                <option value="CONCLUIDO">Concluído</option>
                <option value="ATRASADO">Atrasado</option>
              </select>
            </div>
          </div>
          <DrawerFooter onCancel={() => setModalIni(false)} onSave={salvarIniciativa} salvando={salvando} label="Criar Iniciativa" />
        </Drawer>
      )}

      {/* MODAL: SWOT */}
      {modalSwot && (
        <Drawer titulo="Adicionar Item à Análise SWOT" onClose={() => setModalSwot(false)}>
          <div className="space-y-4">
            <div>
              <FL label="Quadrante" required />
              <div className="grid grid-cols-2 gap-3">
                {(["FORCA","FRAQUEZA","OPORTUNIDADE","AMEACA"] as const).map((tipo) => {
                  const cfg = SWOT_CONFIG[tipo];
                  return (
                    <button key={tipo} onClick={() => setFormSwot({ ...formSwot, tipo })}
                      className={`p-3 rounded-xl border-2 text-sm font-bold flex items-center gap-2 transition-all ${formSwot.tipo === tipo ? `${cfg.headerCor} text-white border-transparent` : `bg-white border-slate-200 text-slate-600 hover:border-slate-300`}`}>
                      <SwotIcon tipo={tipo} />{cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <FL label="Descrição" required />
              <textarea value={formSwot.descricao} onChange={(e) => setFormSwot({ ...formSwot, descricao: e.target.value })} rows={4} className={CT}
                placeholder={
                  formSwot.tipo === "FORCA"        ? "Ex: Time de qualidade altamente capacitado e certificado..." :
                  formSwot.tipo === "FRAQUEZA"     ? "Ex: Alta rotatividade de colaboradores no setor de enfermagem..." :
                  formSwot.tipo === "OPORTUNIDADE" ? "Ex: Expansão do plano de saúde para novas regiões..." :
                  "Ex: Aumento da concorrência de clínicas de baixo custo..."
                } />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FL label="Impacto" />
                <select value={formSwot.impacto} onChange={(e) => setFormSwot({ ...formSwot, impacto: e.target.value })} className={CS}>
                  <option value="ALTO">Alto</option>
                  <option value="MEDIO">Médio</option>
                  <option value="BAIXO">Baixo</option>
                </select>
              </div>
              <div>
                <FL label="Responsável" />
                <input value={formSwot.responsavel} onChange={(e) => setFormSwot({ ...formSwot, responsavel: e.target.value })} className={CI} placeholder="Quem acompanha" />
              </div>
            </div>
          </div>
          <DrawerFooter onCancel={() => setModalSwot(false)} onSave={salvarSwot} salvando={salvando} label="Adicionar Item" />
        </Drawer>
      )}

      {/* MODAL: NOVO INDICADOR */}
      {modalInd && (
        <Drawer titulo="Novo Indicador Estratégico (KPI)" onClose={() => setModalInd(false)}>
          <div className="space-y-4">
            <div>
              <FL label="Nome do Indicador" required />
              <input value={formInd.nome} onChange={(e) => setFormInd({ ...formInd, nome: e.target.value })} className={CI} placeholder="Ex: Índice de Satisfação do Paciente" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FL label="Perspectiva BSC" />
                <select value={formInd.perspectiva_bsc} onChange={(e) => setFormInd({ ...formInd, perspectiva_bsc: e.target.value })} className={CS}>
                  <option>Financeira</option>
                  <option>Clientes</option>
                  <option>Processos</option>
                  <option>Aprendizado</option>
                </select>
              </div>
              <div>
                <FL label="Tipo" />
                <select value={formInd.tipo} onChange={(e) => setFormInd({ ...formInd, tipo: e.target.value })} className={CS}>
                  <option value="PERCENTUAL">Percentual</option>
                  <option value="NUMERO">Número</option>
                  <option value="TEMPO">Tempo</option>
                  <option value="INDICE">Índice</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FL label="Meta" required />
                <input type="number" value={formInd.meta} onChange={(e) => setFormInd({ ...formInd, meta: Number(e.target.value) })} className={CI} placeholder="Ex: 90" />
              </div>
              <div>
                <FL label="Unidade" />
                <input value={formInd.unidade} onChange={(e) => setFormInd({ ...formInd, unidade: e.target.value })} className={CI} placeholder="%, pts, dias..." />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FL label="Frequência de Medição" />
                <select value={formInd.frequencia} onChange={(e) => setFormInd({ ...formInd, frequencia: e.target.value })} className={CS}>
                  <option value="MENSAL">Mensal</option>
                  <option value="TRIMESTRAL">Trimestral</option>
                  <option value="ANUAL">Anual</option>
                  <option value="SEMANAL">Semanal</option>
                </select>
              </div>
              <div>
                <FL label="Responsável" />
                <input value={formInd.responsavel} onChange={(e) => setFormInd({ ...formInd, responsavel: e.target.value })} className={CI} placeholder="Nome" />
              </div>
            </div>
          </div>
          <DrawerFooter onCancel={() => setModalInd(false)} onSave={salvarIndicador} salvando={salvando} label="Criar Indicador" />
        </Drawer>
      )}

    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
 * ESTILOS REUTILIZÁVEIS
 * ───────────────────────────────────────────────────────────────*/
const CS = "w-full h-10 px-3 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 bg-slate-50 focus:bg-white font-medium";
const CI = "w-full h-10 px-3 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 bg-slate-50 focus:bg-white font-medium";
const CT = "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 bg-slate-50 focus:bg-white resize-none font-medium";

/* ─────────────────────────────────────────────────────────────────
 * SUB-COMPONENTES
 * ───────────────────────────────────────────────────────────────*/
function KpiCard({ titulo, valor, desc, cor, icon }: any) {
  const cores: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600 border-blue-100", emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100", red: "bg-red-50 text-red-600 border-red-100",
  };
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
      <div className={`inline-flex p-2.5 rounded-xl border mb-3 ${cores[cor]}`}>{icon}</div>
      <h3 className="text-3xl font-black text-slate-800">{valor}</h3>
      <p className="text-sm font-bold text-slate-700 mt-1">{titulo}</p>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{desc}</p>
    </div>
  );
}

function FL({ label, required }: { label: string; required?: boolean }) {
  return <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{label} {required && <span className="text-red-500">*</span>}</label>;
}

function EmptyState({ msg }: { msg: string }) {
  return <div className="p-12 text-center bg-white border border-dashed border-slate-200 rounded-2xl text-slate-400 font-medium text-sm">{msg}</div>;
}

function Drawer({ titulo, onClose, children }: { titulo: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-end z-50 animate-in fade-in">
      <div className="bg-white w-full max-w-lg h-full shadow-2xl flex flex-col border-l border-slate-100 animate-in slide-in-from-right-8">
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <h2 className="text-lg font-bold text-slate-900">{titulo}</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}

function DrawerFooter({ onCancel, onSave, salvando, label }: { onCancel: () => void; onSave: () => void; salvando: boolean; label: string }) {
  return (
    <div className="flex gap-3 mt-6 pt-6 border-t border-slate-100">
      <button onClick={onSave} disabled={salvando}
        className="flex-1 h-11 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
        {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {salvando ? "Salvando..." : label}
      </button>
      <button onClick={onCancel} className="h-11 px-4 border border-slate-200 bg-white text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all">
        Cancelar
      </button>
    </div>
  );
}