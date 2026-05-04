"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Plus, Search, CheckCircle2, XCircle, Clock,
  Loader2, AlertCircle, Send, Trash2, CalendarClock,
  QrCode, Users, Eye, PenLine, MessageSquare, Hash,
  Camera, PenTool, List, AlignLeft, LayoutGrid,
  ClipboardCheck, Activity, FileCheck2, Archive, ChevronRight,
  CheckSquare, UploadCloud, Megaphone, FileText, Save,
  UserCheck, GitBranch,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { carregarPerfilUsuario } from "@/lib/perfil";

/* ─── Types ──────────────────────────────────────────────── */
type MainTab = "templates" | "pipeline" | "repositorio" | "registros";
type TemplateStatus = "RASCUNHO" | "EM_APROVACAO" | "APROVADO" | "REJEITADO";
type RegistroStatus = "EM_PREENCHIMENTO" | "EM_APROVACAO" | "CONCLUIDO" | "REJEITADO";
type FieldType = "texto" | "texto_longo" | "numero" | "data" | "selecao" | "multipla_escolha" | "foto" | "assinatura";

interface FormField {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  options?: string[];
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
const FIELD_TYPES: { type: FieldType; label: string; icon: React.ElementType }[] = [
  { type: "texto", label: "Texto curto", icon: MessageSquare },
  { type: "texto_longo", label: "Texto longo", icon: AlignLeft },
  { type: "numero", label: "Número", icon: Hash },
  { type: "data", label: "Data", icon: CalendarClock },
  { type: "selecao", label: "Seleção", icon: List },
  { type: "multipla_escolha", label: "Múltipla escolha", icon: CheckSquare },
  { type: "foto", label: "Foto / Arquivo", icon: Camera },
  { type: "assinatura", label: "Assinatura", icon: PenTool },
];

const TEMPLATE_STATUS: Record<TemplateStatus, { label: string; style: string; dot: string }> = {
  RASCUNHO: { label: "Rascunho", style: "border-slate-200 bg-slate-50 text-slate-600", dot: "bg-slate-400" },
  EM_APROVACAO: { label: "Pendente de aprovação", style: "border-amber-200 bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  APROVADO: { label: "Aprovado", style: "border-emerald-200 bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  REJEITADO: { label: "Rejeitado", style: "border-red-200 bg-red-50 text-red-700", dot: "bg-red-500" },
};

const REGISTRO_STATUS: Record<RegistroStatus, { label: string; style: string }> = {
  EM_PREENCHIMENTO: { label: "Em preenchimento", style: "border-blue-200 bg-blue-50 text-blue-700" },
  EM_APROVACAO: { label: "Aguardando aprovação", style: "border-amber-200 bg-amber-50 text-amber-700" },
  CONCLUIDO: { label: "Concluído", style: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  REJEITADO: { label: "Rejeitado", style: "border-red-200 bg-red-50 text-red-700" },
};

/* ─── Helpers ────────────────────────────────────────────── */
function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

function fmt(value: string): string {
  if (!value) return "-";
  const d = new Date(value);
  return isNaN(d.getTime()) ? value : d.toLocaleDateString("pt-BR");
}

function normalizeTemplateStatus(raw: unknown): TemplateStatus {
  const s = String(raw ?? "").toUpperCase();
  if (s === "EM_APROVACAO") return "EM_APROVACAO";
  if (s === "APROVADO") return "APROVADO";
  if (s === "REJEITADO") return "REJEITADO";
  return "RASCUNHO";
}

function normalizeRegistroStatus(raw: unknown): RegistroStatus {
  const s = String(raw ?? "").toUpperCase();
  if (s === "EM_APROVACAO") return "EM_APROVACAO";
  if (s === "CONCLUIDO" || s === "APROVADO") return "CONCLUIDO";
  if (s === "REJEITADO") return "REJEITADO";
  return "EM_PREENCHIMENTO";
}

function mapTemplate(row: Record<string, unknown>): Template {
  const wf = (row.workflow && typeof row.workflow === "object" ? row.workflow : {}) as Record<string, unknown>;
  return {
    id: String(row.id ?? ""),
    empresa_id: String(row.empresa_id ?? ""),
    titulo: String(row.titulo ?? "Sem título"),
    categoria: String(row.categoria ?? "Geral"),
    setor: String(row.setor ?? "Geral"),
    status: normalizeTemplateStatus(row.status),
    etapas: Array.isArray(wf.etapas) ? (wf.etapas as EtapaTemplate[]) : [{ id: "1", numero: 1, nome: "Etapa 1" }],
    campos: Array.isArray(row.campos) ? (row.campos as FormField[]) : [],
    aprovadores_template: Array.isArray(wf.aprovadores_template) ? (wf.aprovadores_template as string[]) : [],
    responsavel: String(row.responsavel ?? ""),
    created_at: String(row.created_at ?? ""),
  };
}

function mapRegistro(row: Record<string, unknown>, templateMap: Map<string, Template>): Registro {
  const dados = (row.dados && typeof row.dados === "object" ? row.dados : {}) as Record<string, unknown>;
  const tid = String(row.template_id ?? "");
  return {
    id: String(row.id ?? ""),
    empresa_id: String(row.empresa_id ?? ""),
    template_id: tid,
    template_titulo: templateMap.get(tid)?.titulo ?? String(row.template_titulo ?? "Registro"),
    status: normalizeRegistroStatus(row.status),
    preenchido_por: String(row.preenchido_por ?? ""),
    etapa_atual: typeof dados._etapa_atual === "number" ? dados._etapa_atual : 1,
    historico: Array.isArray(row.historico) ? (row.historico as Registro["historico"]) : [],
    created_at: String(row.created_at ?? ""),
  };
}

/* ─── Main Component ─────────────────────────────────────── */
export default function GestaoRegistrosPage() {
  const router = useRouter();
  const [tab, setTab] = useState<MainTab>("templates");
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [usuarioNome, setUsuarioNome] = useState("Usuário");
  const [dbUsuarios, setDbUsuarios] = useState<{ nome: string; cargo?: string }[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Wizard state
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);

  // Wizard step 1
  const [wTitulo, setWTitulo] = useState("");
  const [wCategoria, setWCategoria] = useState("");
  const [wSetor, setWSetor] = useState("");

  // Wizard step 2
  const [wEtapas, setWEtapas] = useState<EtapaTemplate[]>([{ id: uid(), numero: 1, nome: "Etapa 1" }]);
  const [wCampos, setWCampos] = useState<FormField[]>([]);
  const [wEtapaAtiva, setWEtapaAtiva] = useState(1);

  // Wizard step 3
  const [wAprovadores, setWAprovadores] = useState<string[]>([]);
  const [wAprovadorInput, setWAprovadorInput] = useState("");

  // Wizard step 4 — divulgation checkboxes
  const [wAlvos, setWAlvos] = useState<string[]>([]);
  const [wExigeCiente, setWExigeCiente] = useState(false);

  // Traceability row expand
  const [expandedRegistro, setExpandedRegistro] = useState<string | null>(null);

  /* ── Auth + bootstrap ────────────────────────────────── */
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
        setMessage({ type: "error", text: "Empresa não identificada. Verifique seu perfil." });
        setIsLoading(false);
        return;
      }
      setEmpresaId(perfil.empresa_id);
      setUsuarioNome(perfil.nome ?? data.session.user.email ?? "Usuário");
      const { data: uData } = await supabase
        .from("perfis").select("nome, cargo").eq("empresa_id", perfil.empresa_id).order("nome");
      if (active) setDbUsuarios(uData ?? []);
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
      const mapped = (tRes.data ?? []).map((r) => mapTemplate(r as Record<string, unknown>));
      const tMap = new Map(mapped.map((t) => [t.id, t]));
      setTemplates(mapped);
      setRegistros((rRes.data ?? []).map((r) => mapRegistro(r as Record<string, unknown>, tMap)));
      setIsLoading(false);
    });
    return () => { active = false; };
  }, [empresaId, refreshKey]);

  /* ── Wizard helpers ──────────────────────────────────── */
  function openWizard() {
    setWTitulo(""); setWCategoria(""); setWSetor("");
    setWEtapas([{ id: uid(), numero: 1, nome: "Etapa 1" }]);
    setWCampos([]); setWEtapaAtiva(1);
    setWAprovadores([]); setWAprovadorInput("");
    setWAlvos([]); setWExigeCiente(false);
    setWizardStep(1); setWizardOpen(true);
    setMessage(null);
  }

  function addField(type: FieldType) {
    setWCampos((c) => [...c, {
      id: uid(), type, required: false, etapa: wEtapaAtiva,
      label: FIELD_TYPES.find((f) => f.type === type)?.label ?? "Campo",
      options: type === "selecao" || type === "multipla_escolha" ? ["Opção 1", "Opção 2"] : undefined,
    }]);
  }

  function addEtapa() {
    const n = wEtapas.length + 1;
    setWEtapas((e) => [...e, { id: uid(), numero: n, nome: `Etapa ${n}` }]);
    setWEtapaAtiva(n);
  }

  function addAprovador() {
    if (wAprovadorInput.trim() && !wAprovadores.includes(wAprovadorInput.trim())) {
      setWAprovadores((a) => [...a, wAprovadorInput.trim()]);
      setWAprovadorInput("");
    }
  }

  /* ── Save template ───────────────────────────────────── */
  async function saveTemplate(status: TemplateStatus) {
    if (!empresaId) return;
    if (!wTitulo.trim()) { setMessage({ type: "error", text: "Informe o título do formulário." }); return; }
    setIsSaving(true);
    const { error } = await supabase.from("registros_templates").insert({
      empresa_id: empresaId,
      titulo: wTitulo.trim(),
      categoria: wCategoria.trim() || "Geral",
      setor: wSetor.trim() || "Geral",
      status,
      campos: wCampos,
      versao_major: 1, versao_minor: 0, versao_patch: 0,
      responsavel: usuarioNome,
      workflow: { engine: "STAGES", etapas: wEtapas, aprovadores_template: wAprovadores },
    });
    setIsSaving(false);
    if (error) { setMessage({ type: "error", text: "Não foi possível salvar. Verifique as migrations." }); return; }
    setMessage({ type: "success", text: status === "EM_APROVACAO" ? "Formulário enviado para aprovação." : "Rascunho salvo com sucesso." });
    setWizardOpen(false);
    setRefreshKey((k) => k + 1);
    setTab(status === "EM_APROVACAO" ? "pipeline" : "templates");
  }

  /* ── Approve / Reject template ───────────────────────── */
  async function changeTemplateStatus(id: string, status: TemplateStatus) {
    if (!empresaId) return;
    const { error } = await supabase.from("registros_templates")
      .update({ status }).eq("empresa_id", empresaId).eq("id", id);
    if (error) { setMessage({ type: "error", text: "Erro ao atualizar status." }); return; }
    setMessage({ type: "success", text: status === "APROVADO" ? "Formulário aprovado e disponível no Repositório." : "Formulário rejeitado." });
    setRefreshKey((k) => k + 1);
  }

  /* ── Start a record ──────────────────────────────────── */
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
    setMessage({ type: "success", text: "Registro iniciado! Continue preenchendo na aba Registros Cadastrados." });
    setRefreshKey((k) => k + 1);
    setTab("registros");
  }

  /* ── Conclude a record ───────────────────────────────── */
  async function concludeRecord(id: string) {
    if (!empresaId) return;
    const { error } = await supabase.from("registros_preenchidos")
      .update({ status: "CONCLUIDO", approved_at: new Date().toISOString() })
      .eq("empresa_id", empresaId).eq("id", id);
    if (error) { setMessage({ type: "error", text: "Erro ao concluir registro." }); return; }
    setMessage({ type: "success", text: "Registro concluído." });
    setRefreshKey((k) => k + 1);
  }

  /* ── Derived ─────────────────────────────────────────── */
  const term = search.trim().toLowerCase();
  const filteredTemplates = templates.filter((t) =>
    !term || t.titulo.toLowerCase().includes(term) || t.categoria.toLowerCase().includes(term) || t.setor.toLowerCase().includes(term)
  );
  const pipelineList = templates.filter((t) => t.status !== "APROVADO");
  const repositorioList = templates.filter((t) => t.status === "APROVADO");
  const filteredRegistros = registros.filter((r) =>
    !term || r.template_titulo.toLowerCase().includes(term) || r.preenchido_por.toLowerCase().includes(term)
  );

  /* ──────────────────────────────────────────────────────
     WIZARD VIEW
  ────────────────────────────────────────────────────── */
  if (wizardOpen) {
    const etapaAtualObj = wEtapas.find((e) => e.numero === wEtapaAtiva);
    const camposDaEtapa = wCampos.filter((c) => c.etapa === wEtapaAtiva);

    return (
      <div className="max-w-5xl mx-auto p-6 animate-in fade-in duration-500">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => setWizardOpen(false)}
            className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 shadow-sm transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Criar Novo Formulário</h1>
            <p className="text-sm text-slate-500 mt-1 font-medium">Defina os campos, etapas e fluxo de aprovação.</p>
          </div>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-xl border flex items-center gap-3 text-sm font-semibold ${message.type === "error" ? "bg-red-50 border-red-200 text-red-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"}`}>
            {message.type === "error" ? <AlertCircle className="w-5 h-5 shrink-0" /> : <CheckCircle2 className="w-5 h-5 shrink-0" />}
            {message.text}
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[600px]">
          {/* Tab bar */}
          <div className="flex border-b border-slate-100 bg-slate-50 overflow-x-auto">
            {[
              { step: 1, icon: <FileText className="w-4 h-4" />, title: "Identificação" },
              { step: 2, icon: <LayoutGrid className="w-4 h-4" />, title: "Construtor" },
              { step: 3, icon: <Users className="w-4 h-4" />, title: "Aprovação" },
              { step: 4, icon: <Megaphone className="w-4 h-4" />, title: "Publicação" },
            ].map(({ step, icon, title }) => (
              <button
                key={step}
                onClick={() => setWizardStep(step)}
                className={`flex-1 flex items-center justify-center gap-3 p-5 transition-all border-b-2 font-bold text-sm outline-none ${wizardStep === step ? "bg-white border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-700"}`}
              >
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] transition-colors ${wizardStep === step ? "bg-blue-600 text-white shadow-md shadow-blue-200" : "bg-slate-200 text-slate-500"}`}>
                  {step}
                </span>
                <div className="flex items-center gap-2">
                  <span className={wizardStep === step ? "text-blue-600" : "text-slate-400"}>{icon}</span>
                  <span className="hidden md:inline">{title}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="p-8 flex-1">

            {/* Step 1: Identificação */}
            {wizardStep === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-3">
                    <WField label="Título do Formulário" required>
                      <input
                        value={wTitulo}
                        onChange={(e) => setWTitulo(e.target.value)}
                        placeholder="Ex: Checklist de Inspeção de EPI"
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-bold shadow-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                    </WField>
                  </div>
                  <WField label="Categoria">
                    <input
                      value={wCategoria}
                      onChange={(e) => setWCategoria(e.target.value)}
                      placeholder="Ex: Segurança do Trabalho"
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm shadow-sm outline-none focus:border-blue-500"
                    />
                  </WField>
                  <WField label="Setor / Unidade">
                    <input
                      value={wSetor}
                      onChange={(e) => setWSetor(e.target.value)}
                      placeholder="Ex: Produção"
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm shadow-sm outline-none focus:border-blue-500"
                    />
                  </WField>
                </div>
                <div className="p-5 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
                  <p className="font-bold">Sobre formulários com etapas</p>
                  <p className="mt-1 leading-6 text-blue-600">
                    No próximo passo você poderá dividir o formulário em etapas e definir um aprovador entre cada etapa.
                    Isso é útil quando parte do preenchimento depende de uma aprovação intermediária antes de continuar.
                  </p>
                </div>
              </div>
            )}

            {/* Step 2: Construtor de Formulário */}
            {wizardStep === 2 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4">
                {/* Stage tabs */}
                <div className="flex items-center gap-2 flex-wrap">
                  {wEtapas.map((etapa) => (
                    <button
                      key={etapa.id}
                      onClick={() => setWEtapaAtiva(etapa.numero)}
                      className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${wEtapaAtiva === etapa.numero ? "bg-blue-600 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                    >
                      {etapa.nome}
                    </button>
                  ))}
                  <button
                    onClick={addEtapa}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold bg-white border border-dashed border-slate-300 text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" /> Nova etapa
                  </button>
                </div>

                {/* Stage approver gate (not for stage 1) */}
                {etapaAtualObj && etapaAtualObj.numero > 1 && (
                  <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <GitBranch className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">Aprovador antes desta etapa</p>
                      <p className="text-xs text-amber-600 mt-0.5 mb-3">Esta etapa só será liberada após a aprovação abaixo.</p>
                      <div className="flex gap-2">
                        <select
                          value={etapaAtualObj.aprovador ?? ""}
                          onChange={(e) => setWEtapas((prev) => prev.map((et) => et.id === etapaAtualObj.id ? { ...et, aprovador: e.target.value } : et))}
                          className="flex-1 h-10 px-3 bg-white border border-amber-200 rounded-lg text-sm outline-none focus:border-amber-400"
                        >
                          <option value="">Selecione o aprovador...</option>
                          {dbUsuarios.map((u) => <option key={u.nome} value={u.nome}>{u.nome}{u.cargo ? ` — ${u.cargo}` : ""}</option>)}
                        </select>
                        <input
                          value={etapaAtualObj.nome}
                          onChange={(e) => setWEtapas((prev) => prev.map((et) => et.id === etapaAtualObj.id ? { ...et, nome: e.target.value } : et))}
                          placeholder="Nome desta etapa"
                          className="w-48 h-10 px-3 bg-white border border-amber-200 rounded-lg text-sm outline-none focus:border-amber-400"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid gap-5 xl:grid-cols-[1fr_220px]">
                  {/* Field list */}
                  <div className="space-y-2">
                    <p className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">
                      Campos da {etapaAtualObj?.nome ?? `Etapa ${wEtapaAtiva}`}
                    </p>
                    {camposDaEtapa.length === 0 && (
                      <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center text-sm text-slate-400">
                        Adicione campos usando os botões ao lado →
                      </div>
                    )}
                    {camposDaEtapa.map((campo, idx) => {
                      const ft = FIELD_TYPES.find((f) => f.type === campo.type);
                      return (
                        <div key={campo.id} className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
                          <span className="grid h-7 w-7 place-items-center rounded-lg bg-blue-50 text-xs font-bold text-blue-700 shrink-0">{idx + 1}</span>
                          <input
                            value={campo.label}
                            onChange={(e) => setWCampos((prev) => prev.map((f) => f.id === campo.id ? { ...f, label: e.target.value } : f))}
                            className="flex-1 text-sm font-semibold outline-none bg-transparent border-0 focus:ring-0"
                          />
                          <span className="hidden sm:flex items-center gap-1 px-2.5 py-1 bg-slate-100 rounded-full text-xs text-slate-500 font-medium shrink-0">
                            {ft && <ft.icon className="w-3 h-3" />} {ft?.label}
                          </span>
                          <button
                            onClick={() => setWCampos((prev) => prev.map((f) => f.id === campo.id ? { ...f, required: !f.required } : f))}
                            className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-bold transition-colors ${campo.required ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}`}
                          >
                            {campo.required ? "Obrigatório" : "Opcional"}
                          </button>
                          <button onClick={() => setWCampos((prev) => prev.filter((f) => f.id !== campo.id))} className="text-slate-300 hover:text-red-500 shrink-0">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Field type buttons */}
                  <aside className="space-y-2">
                    <p className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Adicionar campo</p>
                    {FIELD_TYPES.map(({ type, label, icon: Icon }) => (
                      <button
                        key={type}
                        onClick={() => addField(type)}
                        className="flex items-center gap-2.5 w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50 transition-all shadow-sm"
                      >
                        <Icon className="w-4 h-4 shrink-0" /> {label}
                      </button>
                    ))}
                  </aside>
                </div>
              </div>
            )}

            {/* Step 3: Fluxo de Aprovação do Template */}
            {wizardStep === 3 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-1">
                    <UserCheck className="w-4 h-4 text-blue-500" /> Aprovadores do Formulário
                  </h3>
                  <p className="text-sm text-slate-500 mb-5">
                    Estas pessoas precisam aprovar o formulário antes que ele fique disponível no Repositório.
                  </p>
                  <div className="flex gap-3 items-end mb-4">
                    <div className="flex-1">
                      <WField label="Selecionar aprovador">
                        <select
                          value={wAprovadorInput}
                          onChange={(e) => setWAprovadorInput(e.target.value)}
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-bold shadow-sm outline-none focus:border-blue-500"
                        >
                          <option value="">Selecione...</option>
                          {dbUsuarios.map((u) => <option key={u.nome} value={u.nome}>{u.nome}{u.cargo ? ` — ${u.cargo}` : ""}</option>)}
                        </select>
                      </WField>
                    </div>
                    <button
                      onClick={addAprovador}
                      className="px-5 py-2.5 bg-slate-100 text-slate-700 hover:bg-blue-100 hover:text-blue-700 font-bold rounded-lg text-sm flex items-center gap-2 h-[42px]"
                    >
                      <Plus className="w-4 h-4" /> Adicionar
                    </button>
                  </div>
                  {wAprovadores.length > 0 && (
                    <div className="space-y-2">
                      {wAprovadores.map((ap) => (
                        <div key={ap} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl">
                          <span className="text-sm font-semibold text-slate-800">{ap}</span>
                          <button onClick={() => setWAprovadores((prev) => prev.filter((a) => a !== ap))} className="text-slate-300 hover:text-red-500">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {wAprovadores.length === 0 && (
                    <p className="text-sm text-slate-400 italic">Nenhum aprovador adicionado. O formulário poderá ser publicado diretamente.</p>
                  )}
                </div>
              </div>
            )}

            {/* Step 4: Publicação */}
            {wizardStep === 4 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-800 mb-4">Público alvo do formulário</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {["Apenas o Setor de Origem", "Todo o Corpo Clínico", "Toda a Liderança", "Área Administrativa", "Comitê da Qualidade"].map((alvo) => (
                        <label
                          key={alvo}
                          className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-all ${wAlvos.includes(alvo) ? "bg-blue-50 border-blue-300" : "bg-white border-slate-200 hover:border-blue-200"}`}
                        >
                          <input
                            type="checkbox"
                            checked={wAlvos.includes(alvo)}
                            onChange={() => setWAlvos((prev) => prev.includes(alvo) ? prev.filter((x) => x !== alvo) : [...prev, alvo])}
                            className="w-4 h-4 accent-blue-600"
                          />
                          <span className="text-sm font-bold text-slate-700">{alvo}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="pt-4 border-t border-slate-100">
                    <label className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                      <input type="checkbox" checked={wExigeCiente} onChange={() => setWExigeCiente(!wExigeCiente)} className="w-5 h-5 accent-blue-600" />
                      <div>
                        <span className="block text-sm font-bold text-slate-800">Exigir confirmação de leitura</span>
                        <span className="block text-xs text-slate-500 mt-0.5">Os responsáveis pelo preenchimento deverão confirmar ciência antes de iniciar.</span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-sm space-y-2 text-slate-600">
                  <p><strong className="text-slate-800">Formulário:</strong> {wTitulo || "—"}</p>
                  <p><strong className="text-slate-800">Etapas:</strong> {wEtapas.length}</p>
                  <p><strong className="text-slate-800">Campos:</strong> {wCampos.length}</p>
                  <p><strong className="text-slate-800">Aprovadores:</strong> {wAprovadores.length > 0 ? wAprovadores.join(", ") : "Nenhum"}</p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 bg-slate-50 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex gap-3 w-full md:w-auto">
              <button
                disabled={wizardStep === 1}
                onClick={() => setWizardStep((s) => Math.max(1, s - 1) as 1 | 2 | 3 | 4)}
                className="px-5 py-2.5 bg-white border border-slate-300 text-slate-600 font-bold rounded-lg text-sm shadow-sm hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Voltar
              </button>
              <button
                onClick={() => saveTemplate("RASCUNHO")}
                disabled={isSaving}
                className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-300 text-slate-700 font-bold rounded-lg text-sm shadow-sm hover:bg-slate-100"
              >
                <Save className="w-4 h-4 text-slate-500" /> Salvar Rascunho
              </button>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              {wizardStep < 4 ? (
                <button
                  onClick={() => setWizardStep((s) => Math.min(4, s + 1) as 1 | 2 | 3 | 4)}
                  className="w-full md:w-auto px-6 py-2.5 bg-slate-800 text-white font-bold rounded-lg text-sm hover:bg-slate-900 shadow-md"
                >
                  Próxima Etapa
                </button>
              ) : (
                <button
                  onClick={() => saveTemplate("EM_APROVACAO")}
                  disabled={isSaving}
                  className="w-full md:w-auto px-8 py-2.5 bg-blue-600 text-white font-bold rounded-lg text-sm shadow-lg hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {isSaving ? "Enviando..." : "Enviar para Aprovação"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ──────────────────────────────────────────────────────
     MAIN VIEW
  ────────────────────────────────────────────────────── */
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
            onClick={openWizard}
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
            <button className="ml-auto text-current opacity-60 hover:opacity-100" onClick={() => setMessage(null)}>✕</button>
          </div>
        )}

        {/* Tab navigation */}
        <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
          {(
            [
              { key: "templates" as MainTab, label: "Templates", icon: FileText, count: templates.length, alert: false },
              { key: "pipeline" as MainTab, label: "Pipeline de Aprovação", icon: GitBranch, count: pipelineList.filter((t) => t.status === "EM_APROVACAO").length, alert: true },
              { key: "repositorio" as MainTab, label: "Repositório de Formulários", icon: Archive, count: repositorioList.length, alert: false },
              { key: "registros" as MainTab, label: "Registros Cadastrados", icon: ClipboardCheck, count: registros.length, alert: false },
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

        {/* Search bar (shared) */}
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-blue-600">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span className="text-sm font-semibold">Carregando...</span>
          </div>
        ) : (
          <>
            {/* ─── TAB: Templates ─────────────────────────────── */}
            {tab === "templates" && (
              <div className="space-y-4">
                {filteredTemplates.length === 0 ? (
                  <EmptyState
                    icon={FileText}
                    title="Nenhum formulário encontrado"
                    description={'Clique em "Criar Formulário" para começar.'}
                  />
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {filteredTemplates.map((tpl) => {
                      const st = TEMPLATE_STATUS[tpl.status];
                      return (
                        <article key={tpl.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:border-blue-200 transition-all">
                          <div className="flex items-start justify-between gap-3">
                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${st.style}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                              {st.label}
                            </span>
                          </div>
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

            {/* ─── TAB: Pipeline ──────────────────────────────── */}
            {tab === "pipeline" && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {pipelineList.length === 0 ? (
                  <EmptyState icon={GitBranch} title="Nenhum formulário no pipeline" description="Formulários enviados para aprovação aparecerão aqui." />
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
                                    <button
                                      onClick={() => changeTemplateStatus(tpl.id, "APROVADO")}
                                      className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 flex items-center gap-1"
                                    >
                                      <CheckCircle2 className="h-3.5 w-3.5" /> Aprovar
                                    </button>
                                    <button
                                      onClick={() => changeTemplateStatus(tpl.id, "REJEITADO")}
                                      className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100 flex items-center gap-1"
                                    >
                                      <XCircle className="h-3.5 w-3.5" /> Rejeitar
                                    </button>
                                  </>
                                )}
                                {tpl.status === "REJEITADO" && (
                                  <button
                                    onClick={() => changeTemplateStatus(tpl.id, "EM_APROVACAO")}
                                    className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-100"
                                  >
                                    Reenviar
                                  </button>
                                )}
                                {tpl.status === "RASCUNHO" && (
                                  <button
                                    onClick={() => changeTemplateStatus(tpl.id, "EM_APROVACAO")}
                                    className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100"
                                  >
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

            {/* ─── TAB: Repositório ───────────────────────────── */}
            {tab === "repositorio" && (
              <div className="space-y-4">
                {repositorioList.length === 0 ? (
                  <EmptyState
                    icon={Archive}
                    title="Nenhum formulário aprovado ainda"
                    description="Aprove formulários no Pipeline para que apareçam aqui disponíveis para uso."
                  />
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

            {/* ─── TAB: Registros Cadastrados ─────────────────── */}
            {tab === "registros" && (
              <div className="space-y-3">
                {filteredRegistros.length === 0 ? (
                  <EmptyState
                    icon={ClipboardCheck}
                    title="Nenhum registro encontrado"
                    description='Inicie o preenchimento de um formulário no Repositório clicando em "Preencher".'
                  />
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
                          const st = REGISTRO_STATUS[reg.status];
                          const isExpanded = expandedRegistro === reg.id;
                          const tpl = templates.find((t) => t.id === reg.template_id);
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
                                      onClick={() => setExpandedRegistro(isExpanded ? null : reg.id)}
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
                              {isExpanded && (
                                <tr>
                                  <td colSpan={6} className="bg-slate-50 px-5 py-4">
                                    <p className="text-xs font-extrabold uppercase text-slate-400 tracking-wider mb-3">Rastreabilidade ponta a ponta</p>
                                    {reg.historico.length === 0 ? (
                                      <p className="text-xs text-slate-400 italic">Sem eventos registrados.</p>
                                    ) : (
                                      <div className="relative space-y-0">
                                        {reg.historico.map((ev, idx) => (
                                          <div key={idx} className="flex gap-3 items-start pb-4 last:pb-0">
                                            <div className="flex flex-col items-center">
                                              <span className="h-5 w-5 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                                                <span className="h-2 w-2 rounded-full bg-white" />
                                              </span>
                                              {idx < reg.historico.length - 1 && <span className="w-px flex-1 bg-slate-200 mt-1" style={{ minHeight: 16 }} />}
                                            </div>
                                            <div className="flex-1 min-w-0 pb-1">
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

/* ─── Sub-components ─────────────────────────────────────── */
function WField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 flex items-center gap-1">
        {label} {required && <span className="text-red-500 text-sm leading-none">*</span>}
      </label>
      {children}
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
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
