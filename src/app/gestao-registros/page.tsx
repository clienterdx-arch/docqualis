"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Search, CheckCircle2, XCircle,
  Loader2, AlertCircle, PenLine,
  QrCode, Users, Eye, LayoutGrid,
  ClipboardCheck, Activity, FileCheck2, Archive, FileText,
  GitBranch,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { carregarPerfilUsuario } from "@/lib/perfil";

/* ─── Types ──────────────────────────────────────────────── */
type MainTab = "templates" | "pipeline" | "repositorio" | "registros";
type TemplateStatus = "RASCUNHO" | "EM_APROVACAO" | "APROVADO" | "REJEITADO";
type RegistroStatus = "EM_PREENCHIMENTO" | "EM_APROVACAO" | "CONCLUIDO" | "REJEITADO";

interface FormField {
  id: string;
  type: string;
  label: string;
  required: boolean;
  etapa: number;
}

interface EtapaTemplate {
  id: string;
  numero: number;
  nome: string;
  aprovador?: string;
}

interface Template {
  id: string;
  empresa_id: string;
  titulo: string;
  categoria: string;
  setor: string;
  status: TemplateStatus;
  etapas: EtapaTemplate[];
  campos: FormField[];
  aprovadores_template: string[];
  responsavel: string;
  created_at: string;
}

interface Registro {
  id: string;
  empresa_id: string;
  template_id: string;
  template_titulo: string;
  status: RegistroStatus;
  preenchido_por: string;
  etapa_atual: number;
  historico: { etapa: number; acao: string; por: string; em: string }[];
  created_at: string;
}

/* ─── Constants ──────────────────────────────────────────── */
const TEMPLATE_STATUS: Record<TemplateStatus, { label: string; style: string; dot: string }> = {
  RASCUNHO:    { label: "Rascunho",               style: "border-slate-200 bg-slate-50 text-slate-600",   dot: "bg-slate-400"   },
  EM_APROVACAO:{ label: "Pendente de aprovação",  style: "border-amber-200 bg-amber-50 text-amber-700",   dot: "bg-amber-500"   },
  APROVADO:    { label: "Aprovado",               style: "border-emerald-200 bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  REJEITADO:   { label: "Rejeitado",              style: "border-red-200 bg-red-50 text-red-700",         dot: "bg-red-500"     },
};

const REGISTRO_STATUS: Record<RegistroStatus, { label: string; style: string }> = {
  EM_PREENCHIMENTO: { label: "Em preenchimento",      style: "border-blue-200 bg-blue-50 text-blue-700"       },
  EM_APROVACAO:     { label: "Aguardando aprovação",  style: "border-amber-200 bg-amber-50 text-amber-700"    },
  CONCLUIDO:        { label: "Concluído",             style: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  REJEITADO:        { label: "Rejeitado",             style: "border-red-200 bg-red-50 text-red-700"          },
};

/* ─── Helpers ────────────────────────────────────────────── */
function fmt(value: string): string {
  if (!value) return "-";
  const d = new Date(value);
  return isNaN(d.getTime()) ? value : d.toLocaleDateString("pt-BR");
}

function normalizeTemplateStatus(raw: unknown): TemplateStatus {
  const s = String(raw ?? "").toUpperCase();
  if (s === "EM_APROVACAO") return "EM_APROVACAO";
  if (s === "APROVADO")     return "APROVADO";
  if (s === "REJEITADO")    return "REJEITADO";
  return "RASCUNHO";
}

function normalizeRegistroStatus(raw: unknown): RegistroStatus {
  const s = String(raw ?? "").toUpperCase();
  if (s === "EM_APROVACAO")                  return "EM_APROVACAO";
  if (s === "CONCLUIDO" || s === "APROVADO") return "CONCLUIDO";
  if (s === "REJEITADO")                     return "REJEITADO";
  return "EM_PREENCHIMENTO";
}

function mapTemplate(row: Record<string, unknown>): Template {
  const wf = (row.workflow && typeof row.workflow === "object" ? row.workflow : {}) as Record<string, unknown>;
  return {
    id:                  String(row.id ?? ""),
    empresa_id:          String(row.empresa_id ?? ""),
    titulo:              String(row.titulo ?? "Sem título"),
    categoria:           String(row.categoria ?? "Geral"),
    setor:               String(row.setor ?? "Geral"),
    status:              normalizeTemplateStatus(row.status),
    etapas:              Array.isArray(wf.etapas) ? (wf.etapas as EtapaTemplate[]) : [{ id: "1", numero: 1, nome: "Etapa 1" }],
    campos:              Array.isArray(row.campos) ? (row.campos as FormField[]) : [],
    aprovadores_template: Array.isArray(wf.aprovadores_template) ? (wf.aprovadores_template as string[]) : [],
    responsavel:         String(row.responsavel ?? ""),
    created_at:          String(row.created_at ?? ""),
  };
}

function mapRegistro(row: Record<string, unknown>, templateMap: Map<string, Template>): Registro {
  const dados = (row.dados && typeof row.dados === "object" ? row.dados : {}) as Record<string, unknown>;
  const tid   = String(row.template_id ?? "");
  return {
    id:              String(row.id ?? ""),
    empresa_id:      String(row.empresa_id ?? ""),
    template_id:     tid,
    template_titulo: templateMap.get(tid)?.titulo ?? String(row.template_titulo ?? "Registro"),
    status:          normalizeRegistroStatus(row.status),
    preenchido_por:  String(row.preenchido_por ?? ""),
    etapa_atual:     typeof dados._etapa_atual === "number" ? dados._etapa_atual : 1,
    historico:       Array.isArray(row.historico) ? (row.historico as Registro["historico"]) : [],
    created_at:      String(row.created_at ?? ""),
  };
}

/* ─── Page ───────────────────────────────────────────────── */
export default function GestaoRegistrosPage() {
  const router = useRouter();
  const [tab, setTab]             = useState<MainTab>("templates");
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [usuarioNome, setUsuarioNome] = useState("Usuário");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch]       = useState("");
  const [message, setMessage]     = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [expandedRegistro, setExpandedRegistro] = useState<string | null>(null);

  /* ── Auth ────────────────────────────────────────────── */
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      if (!data.session) { router.push("/login"); return; }
      const perfil = await carregarPerfilUsuario<{ empresa_id?: string | null; nome?: string | null }>(
        data.session, "empresa_id, nome"
      );
      if (!active) return;
      if (!perfil?.empresa_id) {
        setMessage({ type: "error", text: "Empresa não identificada." });
        setIsLoading(false);
        return;
      }
      setEmpresaId(perfil.empresa_id);
      setUsuarioNome(perfil.nome ?? data.session.user.email ?? "Usuário");
    });
    return () => { active = false; };
  }, [router]);

  /* ── Load data ───────────────────────────────────────── */
  useEffect(() => {
    if (!empresaId) return;
    let active = true;
    Promise.all([
      supabase.from("registros_templates").select("*").eq("empresa_id", empresaId).order("created_at", { ascending: false }),
      supabase.from("registros_preenchidos").select("*").eq("empresa_id", empresaId).order("created_at", { ascending: false }),
    ]).then(([tRes, rRes]) => {
      if (!active) return;
      const mapped  = (tRes.data ?? []).map((r) => mapTemplate(r as Record<string, unknown>));
      const tMap    = new Map(mapped.map((t) => [t.id, t]));
      setTemplates(mapped);
      setRegistros((rRes.data ?? []).map((r) => mapRegistro(r as Record<string, unknown>, tMap)));
      setIsLoading(false);
    });
    return () => { active = false; };
  }, [empresaId, refreshKey]);

  /* ── Actions ─────────────────────────────────────────── */
  async function changeTemplateStatus(id: string, status: TemplateStatus) {
    if (!empresaId) return;
    const { error } = await supabase.from("registros_templates")
      .update({ status }).eq("empresa_id", empresaId).eq("id", id);
    if (error) { setMessage({ type: "error", text: "Erro ao atualizar status." }); return; }
    setMessage({ type: "success", text: status === "APROVADO" ? "Formulário aprovado e disponível no Repositório." : "Formulário rejeitado." });
    setRefreshKey((k) => k + 1);
  }

  async function startRecord(templateId: string) {
    if (!empresaId) return;
    const tpl = templates.find((t) => t.id === templateId);
    if (!tpl) return;
    const { error } = await supabase.from("registros_preenchidos").insert({
      empresa_id: empresaId,
      template_id: templateId,
      template_titulo: tpl.titulo,
      status: "EM_PREENCHIMENTO",
      preenchido_por: usuarioNome,
      dados: { _etapa_atual: 1 },
      historico: [{ etapa: 1, acao: "Registro iniciado", por: usuarioNome, em: new Date().toISOString() }],
      risk_score: 0, flag_revisao_humana: false,
    });
    if (error) { setMessage({ type: "error", text: "Erro ao iniciar registro." }); return; }
    setMessage({ type: "success", text: "Registro iniciado! Acesse a aba Registros Cadastrados para continuar." });
    setRefreshKey((k) => k + 1);
    setTab("registros");
  }

  async function concludeRecord(id: string) {
    if (!empresaId) return;
    const { error } = await supabase.from("registros_preenchidos")
      .update({ status: "CONCLUIDO", approved_at: new Date().toISOString() })
      .eq("empresa_id", empresaId).eq("id", id);
    if (error) { setMessage({ type: "error", text: "Erro ao concluir registro." }); return; }
    setMessage({ type: "success", text: "Registro concluído com sucesso." });
    setRefreshKey((k) => k + 1);
  }

  /* ── Derived ─────────────────────────────────────────── */
  const term             = search.trim().toLowerCase();
  const filteredTemplates = templates.filter((t) =>
    !term || t.titulo.toLowerCase().includes(term) || t.categoria.toLowerCase().includes(term) || t.setor.toLowerCase().includes(term)
  );
  const pipelineList     = templates.filter((t) => t.status !== "APROVADO");
  const repositorioList  = templates.filter((t) => t.status === "APROVADO");
  const filteredRegistros = registros.filter((r) =>
    !term || r.template_titulo.toLowerCase().includes(term) || r.preenchido_por.toLowerCase().includes(term)
  );
  const pendingCount     = pipelineList.filter((t) => t.status === "EM_APROVACAO").length;

  /* ── Render ──────────────────────────────────────────── */
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1400px] flex flex-col gap-6">

        {/* Header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-extrabold uppercase tracking-normal text-blue-700">
              <ClipboardCheck className="h-3.5 w-3.5" />
              Gestão de Registros
            </span>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Formulários e Registros</h1>
            <p className="mt-1 text-sm text-slate-500">Crie formulários, gerencie aprovações e acompanhe o preenchimento com rastreabilidade.</p>
          </div>
          <button
            onClick={() => router.push("/novo-template")}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 hover:bg-blue-700 shrink-0"
          >
            <Plus className="h-4 w-4" /> Criar Formulário
          </button>
        </header>

        {/* Message */}
        {message && (
          <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-semibold ${message.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
            {message.type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
            {message.text}
            <button className="ml-auto opacity-60 hover:opacity-100" onClick={() => setMessage(null)}>✕</button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
          {(
            [
              { key: "templates"   as MainTab, label: "Templates",                icon: FileText,      count: templates.length,     alert: false },
              { key: "pipeline"    as MainTab, label: "Pipeline de Aprovação",    icon: GitBranch,     count: pendingCount,          alert: true  },
              { key: "repositorio" as MainTab, label: "Repositório de Formulários", icon: Archive,     count: repositorioList.length, alert: false },
              { key: "registros"   as MainTab, label: "Registros Cadastrados",    icon: ClipboardCheck, count: registros.length,    alert: false },
            ]
          ).map(({ key, label, icon: Icon, count, alert }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${tab === key ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"}`}
            >
              <Icon className="h-4 w-4" />
              {label}
              {count > 0 && (
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${alert && tab !== key ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
          />
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-blue-600">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span className="text-sm font-semibold">Carregando...</span>
          </div>
        ) : (
          <>
            {/* ── Templates ──────────────────────────────── */}
            {tab === "templates" && (
              <div className="space-y-4">
                {filteredTemplates.length === 0 ? (
                  <Empty icon={FileText} title="Nenhum formulário encontrado" description='Clique em "Criar Formulário" para começar.' />
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {filteredTemplates.map((tpl) => {
                      const st = TEMPLATE_STATUS[tpl.status];
                      return (
                        <article key={tpl.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:border-blue-200 transition-all">
                          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${st.style}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                            {st.label}
                          </span>
                          <h3 className="mt-3 text-base font-semibold text-slate-900">{tpl.titulo}</h3>
                          <p className="mt-1 text-xs text-slate-500">{tpl.categoria} · {tpl.setor}</p>
                          <div className="mt-4 flex gap-3 text-xs text-slate-500">
                            <span className="flex items-center gap-1"><LayoutGrid className="h-3.5 w-3.5" /> {tpl.campos.length} campos</span>
                            <span className="flex items-center gap-1"><Activity className="h-3.5 w-3.5" /> {tpl.etapas.length} etapa(s)</span>
                          </div>
                          <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-400">
                            Criado por {tpl.responsavel || "—"} · {fmt(tpl.created_at)}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── Pipeline ───────────────────────────────── */}
            {tab === "pipeline" && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {pipelineList.length === 0 ? (
                  <Empty icon={GitBranch} title="Nenhum formulário no pipeline" description="Formulários enviados para aprovação aparecerão aqui." />
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-[10px] font-extrabold uppercase text-slate-500 tracking-widest border-b border-slate-200">
                      <tr>
                        <th className="px-5 py-3">Formulário</th>
                        <th className="px-5 py-3">Categoria</th>
                        <th className="px-5 py-3">Status</th>
                        <th className="px-5 py-3">Responsável</th>
                        <th className="px-5 py-3">Data</th>
                        <th className="px-5 py-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pipelineList.map((tpl) => {
                        const st = TEMPLATE_STATUS[tpl.status];
                        return (
                          <tr key={tpl.id} className="hover:bg-slate-50">
                            <td className="px-5 py-4 font-semibold text-slate-900">{tpl.titulo}</td>
                            <td className="px-5 py-4 text-slate-500">{tpl.categoria}</td>
                            <td className="px-5 py-4">
                              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${st.style}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                                {st.label}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-slate-500">{tpl.responsavel || "—"}</td>
                            <td className="px-5 py-4 text-slate-500">{fmt(tpl.created_at)}</td>
                            <td className="px-5 py-4 text-right">
                              <div className="flex justify-end gap-2">
                                {tpl.status === "EM_APROVACAO" && (
                                  <>
                                    <button onClick={() => changeTemplateStatus(tpl.id, "APROVADO")} className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 flex items-center gap-1">
                                      <CheckCircle2 className="h-3.5 w-3.5" /> Aprovar
                                    </button>
                                    <button onClick={() => changeTemplateStatus(tpl.id, "REJEITADO")} className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100 flex items-center gap-1">
                                      <XCircle className="h-3.5 w-3.5" /> Rejeitar
                                    </button>
                                  </>
                                )}
                                {tpl.status === "REJEITADO" && (
                                  <button onClick={() => changeTemplateStatus(tpl.id, "EM_APROVACAO")} className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-100">
                                    Reenviar para aprovação
                                  </button>
                                )}
                                {tpl.status === "RASCUNHO" && (
                                  <button onClick={() => changeTemplateStatus(tpl.id, "EM_APROVACAO")} className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100">
                                    Enviar para aprovação
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* ── Repositório ────────────────────────────── */}
            {tab === "repositorio" && (
              <div className="space-y-4">
                {repositorioList.length === 0 ? (
                  <Empty icon={Archive} title="Nenhum formulário aprovado ainda" description="Aprove formulários no Pipeline para que apareçam disponíveis aqui." />
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {repositorioList.map((tpl) => (
                      <article key={tpl.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:border-blue-200 hover:shadow-md transition-all flex flex-col gap-4">
                        <div>
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Disponível
                          </span>
                          <h3 className="mt-3 text-base font-semibold text-slate-900">{tpl.titulo}</h3>
                          <p className="mt-1 text-xs text-slate-500">{tpl.categoria} · {tpl.setor}</p>
                        </div>
                        <div className="flex gap-3 text-xs text-slate-500">
                          <span className="flex items-center gap-1"><LayoutGrid className="h-3.5 w-3.5" /> {tpl.campos.length} campos</span>
                          <span className="flex items-center gap-1"><Activity className="h-3.5 w-3.5" /> {tpl.etapas.length} etapa(s)</span>
                          {tpl.aprovadores_template.length > 0 && (
                            <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {tpl.aprovadores_template.length} aprovador(es)</span>
                          )}
                        </div>
                        <div className="mt-auto flex gap-2 pt-3 border-t border-slate-100">
                          <button className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                            <Eye className="h-3.5 w-3.5" /> Visualizar
                          </button>
                          <button
                            onClick={() => startRecord(tpl.id)}
                            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                          >
                            <PenLine className="h-3.5 w-3.5" /> Preencher
                          </button>
                          <button className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                            <QrCode className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Registros Cadastrados ──────────────────── */}
            {tab === "registros" && (
              <div className="space-y-3">
                {filteredRegistros.length === 0 ? (
                  <Empty icon={ClipboardCheck} title="Nenhum registro encontrado" description='Inicie o preenchimento de um formulário no Repositório clicando em "Preencher".' />
                ) : (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-[10px] font-extrabold uppercase text-slate-500 tracking-widest border-b border-slate-200">
                        <tr>
                          <th className="px-5 py-3">Formulário</th>
                          <th className="px-5 py-3">Etapa</th>
                          <th className="px-5 py-3">Status</th>
                          <th className="px-5 py-3">Preenchido por</th>
                          <th className="px-5 py-3">Início</th>
                          <th className="px-5 py-3 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredRegistros.map((reg) => {
                          const st      = REGISTRO_STATUS[reg.status];
                          const isOpen  = expandedRegistro === reg.id;
                          const tpl     = templates.find((t) => t.id === reg.template_id);
                          return (
                            <React.Fragment key={reg.id}>
                              <tr className="hover:bg-slate-50">
                                <td className="px-5 py-4 font-semibold text-slate-900">{reg.template_titulo}</td>
                                <td className="px-5 py-4 text-slate-500">
                                  {tpl ? `${reg.etapa_atual} / ${tpl.etapas.length}` : `Etapa ${reg.etapa_atual}`}
                                </td>
                                <td className="px-5 py-4">
                                  <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${st.style}`}>
                                    {st.label}
                                  </span>
                                </td>
                                <td className="px-5 py-4 text-slate-500">{reg.preenchido_por}</td>
                                <td className="px-5 py-4 text-slate-500">{fmt(reg.created_at)}</td>
                                <td className="px-5 py-4 text-right">
                                  <div className="flex justify-end gap-2">
                                    <button
                                      onClick={() => setExpandedRegistro(isOpen ? null : reg.id)}
                                      className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 flex items-center gap-1"
                                    >
                                      <Activity className="h-3.5 w-3.5" /> Rastreabilidade
                                    </button>
                                    {reg.status === "EM_PREENCHIMENTO" && (
                                      <>
                                        <button className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 flex items-center gap-1">
                                          <PenLine className="h-3.5 w-3.5" /> Continuar
                                        </button>
                                        <button
                                          onClick={() => concludeRecord(reg.id)}
                                          className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 flex items-center gap-1"
                                        >
                                          <FileCheck2 className="h-3.5 w-3.5" /> Concluir
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>

                              {/* Traceability timeline */}
                              {isOpen && (
                                <tr>
                                  <td colSpan={6} className="bg-slate-50 px-5 py-5">
                                    <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-widest mb-4">Rastreabilidade ponta a ponta</p>
                                    {reg.historico.length === 0 ? (
                                      <p className="text-xs text-slate-400 italic">Sem eventos registrados.</p>
                                    ) : (
                                      <div className="space-y-0">
                                        {reg.historico.map((ev, idx) => (
                                          <div key={idx} className="flex gap-3 items-start pb-4 last:pb-0">
                                            <div className="flex flex-col items-center shrink-0">
                                              <span className="h-5 w-5 rounded-full bg-blue-600 flex items-center justify-center">
                                                <span className="h-2 w-2 rounded-full bg-white" />
                                              </span>
                                              {idx < reg.historico.length - 1 && (
                                                <span className="w-px flex-1 bg-slate-200 mt-1" style={{ minHeight: 16 }} />
                                              )}
                                            </div>
                                            <div className="flex-1 pb-1">
                                              <p className="text-xs font-semibold text-slate-800">{ev.acao}</p>
                                              <p className="text-[11px] text-slate-500 mt-0.5">
                                                {ev.por} · Etapa {ev.etapa} · {fmt(ev.em)}
                                              </p>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

/* ─── Empty state ────────────────────────────────────────── */
function Empty({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-xl bg-blue-50">
        <Icon className="h-6 w-6 text-blue-600" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-800">{title}</h3>
      <p className="mt-1 text-sm text-slate-500 max-w-sm">{description}</p>
    </div>
  );
}
