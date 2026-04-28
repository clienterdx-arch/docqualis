"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ShieldAlert, Target, Activity, Plus, Search,
  Filter, AlertTriangle, CheckCircle2, AlertCircle,
  FileSpreadsheet, X, Loader2, Trash2, Save
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

/* ─────────────────────────────────────────────────────────────────
 * TIPOS
 * ───────────────────────────────────────────────────────────────*/
interface Risco {
  id: string;
  empresa_id: string;
  codigo: string;
  titulo: string;
  descricao: string;
  categoria: string;
  processo_vinculado: string;
  setor: string;
  responsavel: string;
  probabilidade: number;
  impacto: number;
  nivel_risco: number;
  classificacao: string;
  status: string;
  estrategia: string;
  plano_tratamento: string;
  controles_existentes: string;
  prazo_tratamento: string;
  data_avaliacao: string;
}

const FORM_INICIAL: Omit<Risco, "id" | "empresa_id" | "nivel_risco" | "classificacao"> = {
  codigo: "",
  titulo: "",
  descricao: "",
  categoria: "Operacional",
  processo_vinculado: "",
  setor: "",
  responsavel: "",
  probabilidade: 3,
  impacto: 3,
  status: "IDENTIFICADO",
  estrategia: "Mitigar",
  plano_tratamento: "",
  controles_existentes: "",
  prazo_tratamento: "",
  data_avaliacao: new Date().toISOString().slice(0, 10),
};

const CATEGORIAS = ["Operacional", "Financeiro", "Assistencial", "Estratégico", "Segurança da Informação", "Compliance", "Recursos Humanos", "Suprimentos"];
const ESTRATEGIAS = ["Mitigar", "Transferir", "Aceitar", "Eliminar"];
const STATUS_OPTS  = ["IDENTIFICADO", "EM_TRATAMENTO", "TRATADO", "ACEITO", "MONITORANDO"];

/* ─────────────────────────────────────────────────────────────────
 * HELPERS
 * ───────────────────────────────────────────────────────────────*/
function getRiskColor(score: number) {
  if (score <= 4)  return "bg-emerald-100 border-emerald-200 text-emerald-700 hover:bg-emerald-200";
  if (score <= 9)  return "bg-amber-100 border-amber-200 text-amber-700 hover:bg-amber-200";
  if (score <= 14) return "bg-orange-100 border-orange-200 text-orange-700 hover:bg-orange-200";
  if (score <= 19) return "bg-red-100 border-red-200 text-red-700 hover:bg-red-200";
  return "bg-purple-100 border-purple-200 text-purple-700 hover:bg-purple-200";
}

function getRiskLabel(score: number) {
  if (score <= 4)  return { label: "Baixo",      color: "text-emerald-600 bg-emerald-50" };
  if (score <= 9)  return { label: "Moderado",   color: "text-amber-600 bg-amber-50" };
  if (score <= 14) return { label: "Alto",        color: "text-orange-600 bg-orange-50" };
  if (score <= 19) return { label: "Muito Alto",  color: "text-red-600 bg-red-50" };
  return             { label: "Extremo",     color: "text-purple-600 bg-purple-50" };
}

function calcScore(prob: number, imp: number) { return prob * imp; }

function gerarCodigo(categoria: string, seq: number) {
  const siglas: Record<string, string> = {
    "Operacional": "OP", "Financeiro": "FN", "Assistencial": "AS",
    "Estratégico": "ES", "Segurança da Informação": "TI",
    "Compliance": "CO", "Recursos Humanos": "RH", "Suprimentos": "SU",
  };
  const sigla = siglas[categoria] ?? "XX";
  return `RSK.${sigla}.${String(seq).padStart(3, "0")}`;
}

/* ─────────────────────────────────────────────────────────────────
 * COMPONENTE PRINCIPAL
 * ───────────────────────────────────────────────────────────────*/
export default function GestaoRiscosPage() {
  const router = useRouter();
  const [viewState, setViewState]   = useState<"dashboard" | "lista">("dashboard");
  const [riscos, setRiscos]         = useState<Risco[]>([]);
  const [empresaId, setEmpresaId]   = useState<string | null>(null);
  const [isLoading, setIsLoading]   = useState(true);
  const [salvando, setSalvando]     = useState(false);
  const [query, setQuery]           = useState("");
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm]             = useState({ ...FORM_INICIAL });
  const [toast, setToast]           = useState<{ tipo: "ok" | "err"; msg: string } | null>(null);
  const [riscoSelecionado, setRiscoSelecionado] = useState<Risco | null>(null);

  /* ── SESSÃO ─────────────────────────────────────────────── */
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }

      const { data: perfil } = await supabase
        .from("perfis").select("empresa_id").eq("id", session.user.id).single();

      if (perfil?.empresa_id) setEmpresaId(perfil.empresa_id);
    };
    init();
  }, [router]);

  /* ── FETCH RISCOS ───────────────────────────────────────── */
  const fetchRiscos = useCallback(async () => {
    if (!empresaId) return;
    setIsLoading(true);
    const { data, error } = await supabase
      .from("riscos")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("created_at", { ascending: false });

    if (!error) setRiscos(data ?? []);
    setIsLoading(false);
  }, [empresaId]);

  useEffect(() => { fetchRiscos(); }, [fetchRiscos]);

  /* ── TOAST ──────────────────────────────────────────────── */
  function mostrar(tipo: "ok" | "err", msg: string) {
    setToast({ tipo, msg });
    setTimeout(() => setToast(null), 3500);
  }

  /* ── SALVAR RISCO ───────────────────────────────────────── */
  async function salvarRisco() {
    if (!form.titulo.trim() || !form.descricao.trim()) {
      mostrar("err", "Preencha pelo menos Título e Descrição."); return;
    }
    if (!empresaId) return;
    setSalvando(true);

    const score  = calcScore(form.probabilidade, form.impacto);
    const classif = getRiskLabel(score).label.toUpperCase().replace(" ", "_");
    const seq    = riscos.length + 1;
    const codigo = form.codigo || gerarCodigo(form.categoria, seq);

    const payload = {
      empresa_id:          empresaId,
      codigo,
      titulo:              form.titulo,
      descricao:           form.descricao,
      categoria:           form.categoria,
      processo_vinculado:  form.processo_vinculado,
      setor:               form.setor,
      responsavel:         form.responsavel,
      probabilidade:       form.probabilidade,
      impacto:             form.impacto,
      classificacao:       classif,
      status:              form.status,
      estrategia:          form.estrategia,
      plano_tratamento:    form.plano_tratamento,
      controles_existentes: form.controles_existentes,
      prazo_tratamento:    form.prazo_tratamento || null,
      data_avaliacao:      form.data_avaliacao,
    };

    const { error } = await supabase.from("riscos").insert(payload);
    if (error) { mostrar("err", "Erro ao salvar: " + error.message); }
    else {
      mostrar("ok", `Risco ${codigo} registrado com sucesso!`);
      setModalAberto(false);
      setForm({ ...FORM_INICIAL });
      fetchRiscos();
    }
    setSalvando(false);
  }

  /* ── EXCLUIR RISCO ──────────────────────────────────────── */
  async function excluirRisco(id: string) {
    if (!confirm("Deseja excluir este risco? Esta ação não pode ser desfeita.")) return;
    const { error } = await supabase.from("riscos").delete().eq("id", id).eq("empresa_id", empresaId!);
    if (!error) {
      setRiscos((prev) => prev.filter((r) => r.id !== id));
      if (riscoSelecionado?.id === id) setRiscoSelecionado(null);
      mostrar("ok", "Risco excluído.");
    }
  }

  /* ── DADOS CALCULADOS ───────────────────────────────────── */
  const riscosCalculados = riscos.map((r) => ({
    ...r,
    score: r.nivel_risco ?? calcScore(r.probabilidade, r.impacto),
  }));

  const riscosFiltrados = riscosCalculados.filter((r) => {
    const q = query.toLowerCase();
    return !q || r.titulo?.toLowerCase().includes(q) || r.codigo?.toLowerCase().includes(q) || r.responsavel?.toLowerCase().includes(q) || r.categoria?.toLowerCase().includes(q);
  });

  const totalRiscos    = riscosCalculados.length;
  const riscosCriticos = riscosCalculados.filter((r) => r.score >= 15).length;
  const acoesPendentes = riscosCalculados.filter((r) => r.status === "IDENTIFICADO" || r.status === "EM_TRATAMENTO").length;

  /* ─────────────────────────────────────────────────────────
   * RENDER
   * ───────────────────────────────────────────────────────*/
  return (
    <div className="p-8 max-w-[1400px] mx-auto animate-in fade-in duration-500 relative">

      {/* TOAST */}
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 font-bold text-sm text-white ${toast.tipo === "ok" ? "bg-emerald-600" : "bg-red-600"}`}>
          {toast.tipo === "ok" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {toast.msg}
        </div>
      )}

      {/* HEADER */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Gestão de Riscos</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Matriz ISO 31000 — {totalRiscos} risco(s) mapeado(s)</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-50 shadow-sm transition-all">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Exportar Registro
          </button>
          <button
            onClick={() => setModalAberto(true)}
            className="flex items-center gap-2 bg-slate-800 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-900 shadow-md transition-all"
          >
            <Plus className="w-4 h-4" /> Registrar Risco
          </button>
        </div>
      </div>

      {/* TABS */}
      <div className="border-b border-slate-200 mb-8 flex gap-8 text-sm font-bold text-slate-500">
        <button onClick={() => setViewState("dashboard")} className={`pb-4 border-b-2 transition-all ${viewState === "dashboard" ? "border-blue-600 text-blue-600" : "border-transparent hover:text-slate-800"}`}>
          Painel Executivo (Heatmap)
        </button>
        <button onClick={() => setViewState("lista")} className={`pb-4 border-b-2 transition-all ${viewState === "lista" ? "border-blue-600 text-blue-600" : "border-transparent hover:text-slate-800"}`}>
          Registro Geral de Riscos
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-24 text-slate-400 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          <span className="font-bold">Carregando riscos...</span>
        </div>
      ) : (
        <>
          {/* ── DASHBOARD ──────────────────────────────────── */}
          {viewState === "dashboard" && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4">

              {/* KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <KpiCard titulo="Riscos Mapeados"  valor={totalRiscos}    desc="Total no sistema"                    icon={<ShieldAlert className="w-5 h-5" />} cor="blue"    />
                <KpiCard titulo="Riscos Críticos"  valor={riscosCriticos} desc="Score ≥ 15 (Extremo/Muito Alto)"     icon={<AlertTriangle className="w-5 h-5" />} cor="red"   />
                <KpiCard titulo="Ações Pendentes"  valor={acoesPendentes} desc="Identificados ou em tratamento"       icon={<Activity className="w-5 h-5" />} cor="amber"      />
                <KpiCard titulo="Apetite ao Risco" valor={totalRiscos > 0 ? `${Math.round(((totalRiscos - riscosCriticos) / totalRiscos) * 100)}%` : "—"} desc="Índice de Tolerância" icon={<Target className="w-5 h-5" />} cor="emerald" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* MATRIZ 5x5 */}
                <div className="lg:col-span-2 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-center mb-8">
                    <div>
                      <h2 className="text-lg font-bold text-slate-800">Matriz de Calor (Heatmap 5x5)</h2>
                      <p className="text-xs text-slate-500 font-medium">Distribuição de Probabilidade × Impacto</p>
                    </div>
                  </div>

                  <div className="relative pl-8 pb-8">
                    <div className="absolute left-0 top-0 bottom-8 flex items-center justify-center w-8">
                      <span className="transform -rotate-90 text-[10px] font-black tracking-widest text-slate-400 uppercase whitespace-nowrap">Probabilidade</span>
                    </div>

                    <div className="grid grid-cols-5 gap-2 h-80">
                      {[5, 4, 3, 2, 1].map((prob) =>
                        [1, 2, 3, 4, 5].map((imp) => {
                          const score = prob * imp;
                          const naCelula = riscosCalculados.filter((r) => r.impacto === imp && r.probabilidade === prob);
                          return (
                            <div
                              key={`${prob}-${imp}`}
                              className={`rounded-xl border flex items-center justify-center cursor-pointer transition-all shadow-sm ${getRiskColor(score)} relative group`}
                              title={`Prob: ${prob} | Impacto: ${imp} | Score: ${score}`}
                            >
                              <span className="text-xs font-black opacity-30 absolute top-2 right-2">{score}</span>
                              {naCelula.length > 0 && (
                                <span className="w-8 h-8 rounded-full bg-white/60 shadow-sm backdrop-blur-sm flex items-center justify-center font-black text-lg transform group-hover:scale-110 transition-transform">
                                  {naCelula.length}
                                </span>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>

                    <div className="absolute bottom-0 left-8 right-0 flex items-center justify-center h-8">
                      <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Impacto</span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-center gap-6 flex-wrap">
                    <LegendaItem cor="bg-emerald-100" texto="Baixo (1-4)" />
                    <LegendaItem cor="bg-amber-100"   texto="Moderado (5-9)" />
                    <LegendaItem cor="bg-orange-100"  texto="Alto (10-14)" />
                    <LegendaItem cor="bg-red-100"     texto="Muito Alto (15-19)" />
                    <LegendaItem cor="bg-purple-100"  texto="Extremo (20-25)" />
                  </div>
                </div>

                {/* TOP RISCOS */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                  <h2 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500" /> Top Riscos Críticos
                  </h2>
                  {riscosCalculados.filter((r) => r.score >= 12).length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-sm text-slate-400 font-medium">
                      Nenhum risco crítico cadastrado.
                    </div>
                  ) : (
                    <div className="space-y-4 flex-1 overflow-y-auto pr-2">
                      {riscosCalculados.filter((r) => r.score >= 12).sort((a, b) => b.score - a.score).map((risco) => (
                        <div
                          key={risco.id}
                          onClick={() => setRiscoSelecionado(risco)}
                          className="p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:shadow-sm transition-all cursor-pointer"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase">{risco.codigo}</span>
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${getRiskLabel(risco.score).color}`}>Score: {risco.score}</span>
                          </div>
                          <p className="text-sm font-bold text-slate-800 leading-snug">{risco.titulo}</p>
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{risco.descricao}</p>
                          <div className="mt-3 text-xs font-medium text-slate-500">
                            Dono: <span className="font-bold text-slate-700">{risco.responsavel || "—"}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* DETALHE DO RISCO SELECIONADO */}
              {riscoSelecionado && (
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 animate-in slide-in-from-bottom-4">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm font-black text-blue-700">{riscoSelecionado.codigo}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${getRiskLabel(riscoSelecionado.score).color}`}>
                          Score: {riscoSelecionado.score} — {getRiskLabel(riscoSelecionado.score).label}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900">{riscoSelecionado.titulo}</h3>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => excluirRisco(riscoSelecionado.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                      <button onClick={() => setRiscoSelecionado(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"><X className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <InfoBox label="Categoria"    value={riscoSelecionado.categoria} />
                    <InfoBox label="Responsável"  value={riscoSelecionado.responsavel || "—"} />
                    <InfoBox label="Estratégia"   value={riscoSelecionado.estrategia || "—"} />
                    <InfoBox label="Status"       value={riscoSelecionado.status} />
                    <InfoBox label="Probabilidade" value={String(riscoSelecionado.probabilidade)} />
                    <InfoBox label="Impacto"      value={String(riscoSelecionado.impacto)} />
                    <InfoBox label="Avaliado em"  value={riscoSelecionado.data_avaliacao || "—"} />
                    <InfoBox label="Prazo tratamento" value={riscoSelecionado.prazo_tratamento || "—"} />
                  </div>
                  {riscoSelecionado.descricao && (
                    <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Descrição</p>
                      <p className="text-sm text-slate-700">{riscoSelecionado.descricao}</p>
                    </div>
                  )}
                  {riscoSelecionado.plano_tratamento && (
                    <div className="mt-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                      <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Plano de Tratamento</p>
                      <p className="text-sm text-blue-800">{riscoSelecionado.plano_tratamento}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── LISTA ──────────────────────────────────────── */}
          {viewState === "lista" && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden animate-in slide-in-from-right-8">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-lg w-96 shadow-sm">
                  <Search className="w-4 h-4 text-slate-400" />
                  <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por código, título ou responsável..." className="text-sm outline-none w-full font-medium" />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-white border-b border-slate-200 text-[10px] uppercase font-black text-slate-400 tracking-widest">
                    <tr>
                      <th className="px-6 py-4">ID do Risco</th>
                      <th className="px-6 py-4">Título / Descrição</th>
                      <th className="px-6 py-4">Categoria</th>
                      <th className="px-6 py-4 text-center">Prob × Imp</th>
                      <th className="px-6 py-4 text-center">Score</th>
                      <th className="px-6 py-4">Responsável</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-center">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {riscosFiltrados.sort((a, b) => b.score - a.score).map((r) => (
                      <tr key={r.id} onClick={() => { setRiscoSelecionado(r); setViewState("dashboard"); }} className="hover:bg-slate-50 cursor-pointer transition-colors">
                        <td className="px-6 py-4 font-mono font-bold text-slate-600">{r.codigo}</td>
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-800">{r.titulo}</p>
                          <p className="text-xs text-slate-400 mt-0.5 max-w-xs truncate">{r.descricao}</p>
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-600">{r.categoria}</td>
                        <td className="px-6 py-4 text-center text-xs font-bold text-slate-400">{r.probabilidade} × {r.impacto}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-block px-2 py-1 rounded-md text-[10px] font-black uppercase ${getRiskLabel(r.score).color}`}>
                            {r.score} — {getRiskLabel(r.score).label}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-700">{r.responsavel || "—"}</td>
                        <td className="px-6 py-4">
                          <span className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                            {r.status === "TRATADO" ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Activity className="w-4 h-4 text-amber-500" />}
                            {r.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button onClick={(e) => { e.stopPropagation(); excluirRisco(r.id); }} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {riscosFiltrados.length === 0 && (
                  <div className="p-12 text-center text-slate-400 font-medium">
                    {query ? "Nenhum risco encontrado para esta busca." : "Nenhum risco cadastrado. Clique em \"Registrar Risco\" para começar."}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── MODAL: REGISTRAR RISCO ─────────────────────────── */}
      {modalAberto && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-end z-50 animate-in fade-in">
          <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col border-l border-slate-100 animate-in slide-in-from-right-8">

            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Registrar Novo Risco</h2>
                <p className="text-xs text-slate-500 font-medium mt-1">ISO 31000 — Identificação e avaliação</p>
              </div>
              <button onClick={() => setModalAberto(false)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">

              <div>
                <FL label="Título do Risco" required />
                <input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 bg-slate-50 focus:bg-white"
                  placeholder="Ex: Falha na calibração de equipamentos" />
              </div>

              <div>
                <FL label="Descrição detalhada" />
                <textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 bg-slate-50 focus:bg-white resize-none"
                  placeholder="Descreva o evento de risco e suas consequências..." />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FL label="Categoria" required />
                  <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                    className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 bg-slate-50">
                    {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <FL label="Responsável (Dono)" />
                  <input value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })}
                    className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 bg-slate-50 focus:bg-white"
                    placeholder="Nome do responsável" />
                </div>
              </div>

              {/* SLIDERS DE PROBABILIDADE E IMPACTO */}
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Avaliação de Risco</p>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold text-slate-600">Probabilidade</label>
                    <span className="text-sm font-black text-blue-700">{form.probabilidade}/5</span>
                  </div>
                  <input type="range" min={1} max={5} step={1} value={form.probabilidade} onChange={(e) => setForm({ ...form, probabilidade: Number(e.target.value) })}
                    className="w-full accent-blue-600" />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold text-slate-600">Impacto</label>
                    <span className="text-sm font-black text-blue-700">{form.impacto}/5</span>
                  </div>
                  <input type="range" min={1} max={5} step={1} value={form.impacto} onChange={(e) => setForm({ ...form, impacto: Number(e.target.value) })}
                    className="w-full accent-blue-600" />
                </div>

                {/* PREVIEW DO SCORE */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <span className="text-xs font-bold text-slate-600">Score calculado:</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-black ${getRiskLabel(calcScore(form.probabilidade, form.impacto)).color}`}>
                    {calcScore(form.probabilidade, form.impacto)} — {getRiskLabel(calcScore(form.probabilidade, form.impacto)).label}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FL label="Estratégia" />
                  <select value={form.estrategia} onChange={(e) => setForm({ ...form, estrategia: e.target.value })}
                    className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 bg-slate-50">
                    {ESTRATEGIAS.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <FL label="Status" />
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 bg-slate-50">
                    {STATUS_OPTS.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <FL label="Plano de Tratamento" />
                <textarea value={form.plano_tratamento} onChange={(e) => setForm({ ...form, plano_tratamento: e.target.value })} rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 bg-slate-50 focus:bg-white resize-none"
                  placeholder="Descreva as ações de mitigação planejadas..." />
              </div>

              <div>
                <FL label="Controles Existentes" />
                <textarea value={form.controles_existentes} onChange={(e) => setForm({ ...form, controles_existentes: e.target.value })} rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 bg-slate-50 focus:bg-white resize-none"
                  placeholder="Quais controles já existem para este risco?" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FL label="Setor" />
                  <input value={form.setor} onChange={(e) => setForm({ ...form, setor: e.target.value })}
                    className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 bg-slate-50 focus:bg-white"
                    placeholder="Ex: UTI Adulto" />
                </div>
                <div>
                  <FL label="Prazo de Tratamento" />
                  <input type="date" value={form.prazo_tratamento} onChange={(e) => setForm({ ...form, prazo_tratamento: e.target.value })}
                    className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 bg-slate-50 focus:bg-white" />
                </div>
              </div>

            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3 shrink-0">
              <button onClick={salvarRisco} disabled={salvando}
                className="flex-1 h-11 bg-slate-800 text-white rounded-xl text-sm font-bold hover:bg-slate-900 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {salvando ? "Salvando..." : "Registrar Risco"}
              </button>
              <button onClick={() => setModalAberto(false)} className="h-11 px-4 border border-slate-200 bg-white text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
 * SUB-COMPONENTES
 * ───────────────────────────────────────────────────────────────*/
function KpiCard({ titulo, valor, desc, icon, cor }: any) {
  const cores: Record<string, string> = {
    blue:    "bg-blue-50 text-blue-600 border-blue-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    amber:   "bg-amber-50 text-amber-600 border-amber-100",
    red:     "bg-red-50 text-red-600 border-red-100",
  };
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-2">
        <div className={`p-2.5 rounded-xl border ${cores[cor]}`}>{icon}</div>
      </div>
      <div>
        <h3 className="text-3xl font-black text-slate-800 tracking-tight">{valor}</h3>
        <p className="text-sm font-bold text-slate-600 mt-1">{titulo}</p>
        <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mt-1">{desc}</p>
      </div>
    </div>
  );
}

function LegendaItem({ cor, texto }: { cor: string; texto: string }) {
  return (
    <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
      <span className={`w-4 h-4 rounded border border-white shadow-sm ${cor}`} />{texto}
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-sm font-bold text-slate-800">{value}</p>
    </div>
  );
}

function FL({ label, required }: { label: string; required?: boolean }) {
  return (
    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
  );
}