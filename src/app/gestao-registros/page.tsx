"use client";

import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  Search, Plus, CheckCircle2, XCircle, Download, ArrowLeft,
  Filter, Edit3, Trash2, Copy, AlignLeft, Type, ListOrdered,
  CheckSquare, Calendar, Hash, UploadCloud, GripVertical,
  MoreVertical, Eye, Table2, Save, ChevronDown, ClipboardCheck,
  Clock3, ShieldCheck, Send, FileCheck2, AlertCircle, MessageSquare,
  Lock, KeyRound, X, CircleUser, PlusCircle, ArchiveX, FileText,
  Loader2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────
type FieldType = "text" | "textarea" | "number" | "date" | "radio" | "checkbox" | "select" | "file";
type FormStatus     = "Publicado" | "Rascunho";
type ApprovalStatus = "Rascunho" | "Enviado" | "Em Verificação" | "Em Aprovação" | "Aprovado" | "Rejeitado" | "Ajuste Solicitado" | "Excluído";
type ProtectedAction = "approve" | "reject" | null;
type ViewMode = "list" | "builder" | "responses" | "record";
type MainTab  = "modelos" | "registros";

interface FormField { id: string; type: FieldType; label: string; required: boolean; options?: string[]; }
interface ApprovalConfig { enabled: boolean; reviewerRole: string; approverRole: string; requirePinForFinalAction: boolean; approvalPin: string; }
interface FormTemplate { id: string; title: string; description: string; status: FormStatus; createdAt: string; approvalConfig: ApprovalConfig; fields: FormField[]; }
interface WorkflowEvent { id: string; status: ApprovalStatus; action: string; by: string; at: string; comment?: string; }
interface FormResponse { id: string; formId: string; submittedAt: string; submittedBy: string; data: Record<string, any>; approvalStatus: ApprovalStatus; currentOwner: string; workflowHistory: WorkflowEvent[]; }

// ─────────────────────────────────────────────────────────────────────────────
// MAPEAMENTO BANCO ↔ FRONTEND
// ─────────────────────────────────────────────────────────────────────────────
function dbToTemplate(row: any): FormTemplate {
  const wf = row.workflow ?? {};
  return {
    id: row.id,
    title: row.titulo ?? "",
    description: row.descricao ?? "",
    status: row.status === "ATIVO" ? "Publicado" : "Rascunho",
    createdAt: (row.created_at ?? "").slice(0, 10).split("-").reverse().join("/"),
    fields: Array.isArray(row.campos) ? row.campos : [],
    approvalConfig: {
      enabled:                  wf.enabled ?? true,
      reviewerRole:             wf.reviewerRole ?? "Supervisor",
      approverRole:             wf.approverRole ?? "Aprovador Final",
      requirePinForFinalAction: wf.requirePinForFinalAction ?? true,
      approvalPin:              wf.approvalPin ?? "123456",
    },
  };
}

function dbToResponse(row: any): FormResponse {
  return {
    id: row.numero ?? row.id,
    formId: row.template_id,
    submittedAt: row.data_preenchimento
      ? new Date(row.data_preenchimento).toLocaleString("pt-BR")
      : (row.created_at ? new Date(row.created_at).toLocaleString("pt-BR") : ""),
    submittedBy: row.preenchido_por ?? "Anônimo",
    approvalStatus: (row.status as ApprovalStatus) ?? "Enviado",
    currentOwner: row.dados?._currentOwner ?? "Aguardando",
    data: { ...row.dados, _currentOwner: undefined },
    workflowHistory: Array.isArray(row.historico) ? row.historico : [],
  };
}

function templateToDb(form: FormTemplate, empresaId: string) {
  return {
    empresa_id:  empresaId,
    titulo:      form.title,
    descricao:   form.description,
    status:      form.status === "Publicado" ? "ATIVO" : "RASCUNHO",
    campos:      form.fields,
    workflow:    form.approvalConfig,
    responsavel: "Usuário",
  };
}

function responseToDb(resp: FormResponse, empresaId: string) {
  return {
    empresa_id:         empresaId,
    template_id:        resp.formId,
    numero:             resp.id,
    preenchido_por:     resp.submittedBy,
    data_preenchimento: new Date().toISOString().slice(0, 10),
    status:             resp.approvalStatus,
    dados:              { ...resp.data, _currentOwner: resp.currentOwner },
    historico:          resp.workflowHistory,
    assinaturas:        [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGS UI
// ─────────────────────────────────────────────────────────────────────────────
const FIELD_ICONS: Record<FieldType, React.ComponentType<{ className?: string }>> = {
  text: Type, textarea: AlignLeft, number: Hash, date: Calendar,
  radio: CheckCircle2, checkbox: CheckSquare, select: ListOrdered, file: UploadCloud,
};

const FIELD_LABELS: Record<FieldType, string> = {
  text: "Resposta Curta", textarea: "Parágrafo", number: "Número",
  date: "Data", radio: "Múltipla Escolha", checkbox: "Caixas de Seleção",
  select: "Lista Suspensa", file: "Upload de Arquivo",
};

const STATUS_META: Record<ApprovalStatus, { label: string; color: string; icon: React.ComponentType<{ className?: string }>; bg: string; border: string }> = {
  "Rascunho":          { label: "Rascunho",           color: "text-slate-700",  icon: Edit3,      bg: "bg-slate-50",   border: "border-slate-200" },
  "Enviado":           { label: "Enviado",             color: "text-blue-700",   icon: Send,       bg: "bg-blue-50",    border: "border-blue-200" },
  "Em Verificação":    { label: "Em Verificação",      color: "text-amber-700",  icon: Clock3,     bg: "bg-amber-50",   border: "border-amber-200" },
  "Em Aprovação":      { label: "Em Aprovação",        color: "text-violet-700", icon: ShieldCheck,bg: "bg-violet-50",  border: "border-violet-200" },
  "Aprovado":          { label: "Aprovado",            color: "text-emerald-700",icon: FileCheck2, bg: "bg-emerald-50", border: "border-emerald-200" },
  "Rejeitado":         { label: "Rejeitado",           color: "text-red-700",    icon: XCircle,    bg: "bg-red-50",     border: "border-red-200" },
  "Ajuste Solicitado": { label: "Ajuste Solicitado",   color: "text-orange-700", icon: AlertCircle,bg: "bg-orange-50",  border: "border-orange-200" },
  "Excluído":          { label: "Excluído",            color: "text-slate-500",  icon: ArchiveX,   bg: "bg-slate-100",  border: "border-slate-200" },
};

// ─────────────────────────────────────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────────────────────────────────────
function generateId(prefix: string) { return `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`; }
function nowFormatted() { return new Date().toLocaleString("pt-BR"); }
function countByStatus(responses: FormResponse[], status: ApprovalStatus) { return responses.filter(r => r.approvalStatus === status).length; }
function getInitials(name: string) { return name.split(" ").filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join(""); }

// ─────────────────────────────────────────────────────────────────────────────
// MODAL DE PIN
// ─────────────────────────────────────────────────────────────────────────────
function PinApprovalModal({ isOpen, title, description, onClose, onConfirm, expectedPin }: {
  isOpen: boolean; title: string; description: string;
  onClose: () => void; onConfirm: () => void; expectedPin: string;
}) {
  const [pin, setPin]     = useState("");
  const [error, setError] = useState("");
  if (!isOpen) return null;

  const handleValidate = () => {
    if (!pin.trim()) { setError("Digite o PIN para continuar."); return; }
    if (pin !== expectedPin) { setError("PIN inválido. Tente novamente."); return; }
    setError(""); setPin(""); onConfirm();
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-[2rem] border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#eef2ff] border border-[#dbeafe] flex items-center justify-center">
              <Lock className="w-5 h-5 text-[#2655e8]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">{title}</h3>
              <p className="text-xs text-slate-500">{description}</p>
            </div>
          </div>
          <button type="button" onClick={() => { setPin(""); setError(""); onClose(); }} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6">
          <label className="text-[10px] uppercase tracking-widest font-black text-slate-400 block mb-2">PIN de Aprovação</label>
          <div className="relative">
            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="password" inputMode="numeric" value={pin}
              onChange={e => { setPin(e.target.value); if (error) setError(""); }}
              placeholder="Digite o PIN"
              className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl text-sm outline-none focus:border-[#2655e8]" />
          </div>
          {error && <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          <div className="mt-4 flex items-center justify-between gap-3">
            <button type="button" onClick={() => alert("Solicitar reset ao administrador.")} className="text-sm font-bold text-[#2655e8] hover:underline">Esqueci o PIN</button>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => { setPin(""); setError(""); onClose(); }} className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50">Cancelar</button>
              <button type="button" onClick={handleValidate} className="px-5 py-2.5 bg-[#2655e8] text-white rounded-xl text-sm font-bold shadow-md hover:bg-[#1e40af] transition-all">Confirmar</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FORM BUILDER (mantido idêntico ao original, apenas props adicionais)
// ─────────────────────────────────────────────────────────────────────────────
function FormBuilder({ initialData, onSave, onCancel, onSubmitResponse, isSaving }: {
  initialData?: FormTemplate; onSave: (form: FormTemplate) => void;
  onCancel: () => void; onSubmitResponse: (formId: string, data: Record<string, any>) => void;
  isSaving?: boolean;
}) {
  const [form, setForm] = useState<FormTemplate>(initialData || {
    id: generateId("FRM"), title: "Formulário Sem Título", description: "Descrição do formulário",
    status: "Rascunho", createdAt: new Date().toLocaleDateString("pt-BR"),
    approvalConfig: { enabled: true, reviewerRole: "Supervisor / Revisor", approverRole: "Aprovador Final", requirePinForFinalAction: true, approvalPin: "123456" },
    fields: [],
  });
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});

  const addField = (type: FieldType) => {
    const nf: FormField = { id: `f_${Date.now()}`, type, label: `Nova pergunta (${FIELD_LABELS[type]})`, required: false, options: ["radio","checkbox","select"].includes(type) ? ["Opção 1"] : undefined };
    setForm(p => ({ ...p, fields: [...p.fields, nf] }));
    setActiveFieldId(nf.id);
  };

  const updateField = (id: string, updates: Partial<FormField>) =>
    setForm(p => ({ ...p, fields: p.fields.map(f => f.id === id ? { ...f, ...updates } : f) }));

  const removeField = (id: string) => {
    setForm(p => ({ ...p, fields: p.fields.filter(f => f.id !== id) }));
    setFormData(p => { const n = { ...p }; delete n[id]; return n; });
    if (activeFieldId === id) setActiveFieldId(null);
  };

  const duplicateField = (field: FormField) => {
    const nf = { ...field, id: `f_${Date.now()}` };
    setForm(p => { const idx = p.fields.findIndex(f => f.id === field.id); const a = [...p.fields]; a.splice(idx + 1, 0, nf); return { ...p, fields: a }; });
    setActiveFieldId(nf.id);
  };

  const handleFieldChange = (fieldId: string, value: any, isCheckbox = false) => {
    if (isCheckbox) {
      setFormData(p => {
        const cur = p[fieldId] || [];
        return { ...p, [fieldId]: cur.includes(value) ? cur.filter((v: any) => v !== value) : [...cur, value] };
      });
    } else { setFormData(p => ({ ...p, [fieldId]: value })); }
  };

  const handleFormSubmit = () => {
    const missing = form.fields.filter(f => f.required && (!formData[f.id] || (Array.isArray(formData[f.id]) && !formData[f.id].length)));
    if (missing.length) { alert(`Campos obrigatórios:\n${missing.map(f => `- ${f.label}`).join("\n")}`); return; }
    onSubmitResponse(form.id, formData);
  };

  const renderPreviewField = (field: FormField) => {
    const value = formData[field.id] || (field.type === "checkbox" ? [] : "");
    switch (field.type) {
      case "text":     return <input type="text" value={value} onChange={e => handleFieldChange(field.id, e.target.value)} placeholder="Digite sua resposta" className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#2655e8]" />;
      case "textarea": return <textarea value={value} onChange={e => handleFieldChange(field.id, e.target.value)} placeholder="Digite sua resposta" rows={4} className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#2655e8] resize-none" />;
      case "number":   return <input type="number" value={value} onChange={e => handleFieldChange(field.id, e.target.value)} placeholder="Digite um número" className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#2655e8]" />;
      case "date":     return <input type="date" value={value} onChange={e => handleFieldChange(field.id, e.target.value)} className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#2655e8]" />;
      case "radio":    return <div className="space-y-3">{field.options?.map((opt, i) => (<label key={i} className="flex items-center gap-3 text-sm text-slate-700 cursor-pointer"><input type="radio" name={field.id} value={opt} checked={value === opt} onChange={e => handleFieldChange(field.id, e.target.value)} className="accent-[#2655e8] w-4 h-4" /><span>{opt}</span></label>))}</div>;
      case "checkbox": return <div className="space-y-3">{field.options?.map((opt, i) => (<label key={i} className="flex items-center gap-3 text-sm text-slate-700 cursor-pointer"><input type="checkbox" value={opt} checked={value.includes(opt)} onChange={() => handleFieldChange(field.id, opt, true)} className="accent-[#2655e8] w-4 h-4 rounded border-slate-300" /><span>{opt}</span></label>))}</div>;
      case "select":   return <select value={value} onChange={e => handleFieldChange(field.id, e.target.value)} className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#2655e8] bg-white cursor-pointer"><option value="">Selecione uma opção</option>{field.options?.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}</select>;
      case "file":     return <input type="file" onChange={e => { const f = e.target.files?.[0]; if (f) handleFieldChange(field.id, f.name); }} className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm outline-none file:mr-4 file:rounded-lg file:border-0 file:bg-[#eef2ff] file:px-4 file:py-2 file:text-[#2655e8] file:font-bold cursor-pointer hover:bg-slate-50" />;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] animate-in fade-in relative">
      {/* Toolbar */}
      <div className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center shrink-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={onCancel} className="p-2 hover:bg-slate-100 rounded-full text-slate-500"><ArrowLeft className="w-5 h-5" /></button>
          <div className="w-px h-6 bg-slate-200" />
          <span className="text-[10px] font-black uppercase tracking-widest text-[#2655e8] bg-[#eef2ff] px-2 py-1 rounded-md border border-[#e0e7ff]">{isPreviewMode ? "Pré-visualização" : "Construtor de Formulários"}</span>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={() => setIsPreviewMode(p => !p)} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 flex items-center gap-2">
            {isPreviewMode ? <><Edit3 className="w-4 h-4" /> Voltar para edição</> : <><Eye className="w-4 h-4" /> Pré-visualizar / Preencher</>}
          </button>
          {!isPreviewMode && (
            <button type="button" onClick={() => onSave({ ...form, status: "Publicado" })} disabled={isSaving} className="px-6 py-2 bg-[#2655e8] text-white rounded-xl text-sm font-bold shadow-md hover:bg-[#1e40af] flex items-center gap-2 disabled:opacity-60">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isSaving ? "Salvando..." : "Salvar e Publicar"}
            </button>
          )}
        </div>
      </div>

      {isPreviewMode ? (
        <div className="flex-1 overflow-y-auto p-8 pb-20">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white border border-slate-200 border-t-8 border-t-[#2655e8] rounded-2xl p-8 shadow-sm mb-6">
              <h1 className="text-3xl font-black text-slate-900 mb-3">{form.title}</h1>
              <p className="text-sm text-slate-600">{form.description}</p>
              {form.approvalConfig.enabled && (
                <div className="mt-6 pt-6 border-t border-slate-100">
                  <p className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-widest flex items-center gap-2"><Clock3 className="w-4 h-4" />Workflow de Aprovação Ativo</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-[10px] uppercase font-black tracking-widest text-amber-600 mb-1">Revisão por</p><p className="text-sm font-bold text-slate-800 flex items-center gap-2"><CircleUser className="w-4 h-4 text-amber-600" />{form.approvalConfig.reviewerRole}</p></div>
                    <div className="rounded-xl border border-violet-200 bg-violet-50 p-4"><p className="text-[10px] uppercase font-black tracking-widest text-violet-600 mb-1">Aprovação Final por</p><p className="text-sm font-bold text-slate-800 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-violet-600" />{form.approvalConfig.approverRole}</p></div>
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-6">
              {form.fields.length === 0 ? (
                <div className="p-12 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center text-slate-400 bg-white">
                  <ListOrdered className="w-10 h-10 mb-4 opacity-50" />
                  <p className="font-bold text-slate-600">Nenhum campo para preencher.</p>
                </div>
              ) : form.fields.map(field => (
                <div key={field.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <label className="block text-base font-bold text-slate-800 mb-4">{field.label}{field.required && <span className="text-red-500 ml-1">*</span>}</label>
                  {renderPreviewField(field)}
                </div>
              ))}
              {form.fields.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex justify-between items-center mt-8">
                  <p className="text-xs text-slate-500">Confirme se todos os dados estão corretos antes de enviar.</p>
                  <button type="button" onClick={handleFormSubmit} className="px-8 py-3 bg-[#2655e8] text-white rounded-xl text-sm font-bold shadow-md hover:bg-[#1e40af] flex items-center gap-2"><Send className="w-4 h-4" />Enviar Registro</button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-8 pb-32">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Cabeçalho do formulário */}
              <div className="bg-white border border-slate-200 border-t-8 border-t-[#2655e8] rounded-2xl p-8 shadow-sm">
                <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full text-3xl font-black text-slate-900 outline-none border-b border-transparent focus:border-slate-200 pb-2 mb-4 transition-all" placeholder="Título do Formulário" />
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full text-sm text-slate-600 outline-none border-b border-transparent focus:border-slate-200 pb-1 resize-none overflow-hidden" placeholder="Descrição do formulário" rows={2} />
              </div>

              {/* Config de Workflow */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-5"><ClipboardCheck className="w-5 h-5 text-[#2655e8]" /><h3 className="text-lg font-bold text-slate-900">Configuração do Workflow de Aprovação</h3></div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 block mb-2">Workflow Ativo</label>
                    <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={form.approvalConfig.enabled} onChange={e => setForm(p => ({ ...p, approvalConfig: { ...p.approvalConfig, enabled: e.target.checked } }))} className="w-4 h-4 accent-[#2655e8]" /><span className="text-sm font-medium text-slate-700">Exigir fluxo de aprovação</span></label>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 block mb-2">Revisor Inicial</label>
                    <input type="text" value={form.approvalConfig.reviewerRole} onChange={e => setForm(p => ({ ...p, approvalConfig: { ...p.approvalConfig, reviewerRole: e.target.value } }))} className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#2655e8] bg-slate-50" placeholder="Ex.: Supervisor" />
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 block mb-2">Aprovador Final</label>
                    <input type="text" value={form.approvalConfig.approverRole} onChange={e => setForm(p => ({ ...p, approvalConfig: { ...p.approvalConfig, approverRole: e.target.value } }))} className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#2655e8] bg-slate-50" placeholder="Ex.: Diretor" />
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 block mb-2">PIN obrigatório</label>
                    <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={form.approvalConfig.requirePinForFinalAction} onChange={e => setForm(p => ({ ...p, approvalConfig: { ...p.approvalConfig, requirePinForFinalAction: e.target.checked } }))} className="w-4 h-4 accent-[#2655e8]" /><span className="text-sm font-medium text-slate-700">Exigir PIN na aprovação</span></label>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 block mb-2">Definir PIN de Aprovação</label>
                    <input type="password" value={form.approvalConfig.approvalPin} onChange={e => setForm(p => ({ ...p, approvalConfig: { ...p.approvalConfig, approvalPin: e.target.value } }))} className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#2655e8]" placeholder="Ex.: 123456" />
                    <p className="text-xs text-slate-500 mt-2">Em produção, validado no backend via hash seguro.</p>
                  </div>
                  <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                    <div className="flex items-center gap-2 mb-2"><Lock className="w-4 h-4 text-blue-600" /><p className="text-xs font-black uppercase tracking-widest text-blue-600">Regra de Segurança</p></div>
                    <p className="text-sm text-slate-800 font-medium">O PIN será solicitado ao <strong>{form.approvalConfig.approverRole || "Aprovador Final"}</strong> quando ele tentar:</p>
                    <ul className="mt-3 space-y-2 text-sm text-slate-700">
                      <li><CheckCircle2 className="w-4 h-4 inline mr-2 text-emerald-600" />Aprovar o registro em definitivo</li>
                      <li><XCircle className="w-4 h-4 inline mr-2 text-red-600" />Rejeitar e invalidar o registro</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Campos do formulário */}
              {form.fields.map(field => {
                const isActive = activeFieldId === field.id;
                const Icon = FIELD_ICONS[field.type];
                return (
                  <div key={field.id} onClick={() => setActiveFieldId(field.id)} className={`bg-white border rounded-2xl transition-all relative group shadow-sm ${isActive ? "border-[#2655e8] ring-1 ring-[#2655e8]/20" : "border-slate-200 hover:border-slate-300"}`}>
                    <div className="p-6 pt-8">
                      {isActive ? (
                        <div className="space-y-4">
                          <div className="flex gap-4 items-start">
                            <input type="text" value={field.label} onChange={e => updateField(field.id, { label: e.target.value })} className="flex-1 text-base font-bold bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-[#2655e8]" placeholder="Pergunta" autoFocus />
                            <select value={field.type} onChange={e => updateField(field.id, { type: e.target.value as FieldType, options: ["radio","checkbox","select"].includes(e.target.value) ? (field.options?.length ? field.options : ["Opção 1"]) : undefined })} className="bg-white border border-slate-200 text-slate-700 font-bold rounded-xl px-4 py-3 outline-none focus:border-[#2655e8] cursor-pointer">
                              {Object.entries(FIELD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                          </div>
                          {["radio","checkbox","select"].includes(field.type) && (
                            <div className="space-y-2 pl-2">
                              {field.options?.map((opt, oIdx) => (
                                <div key={oIdx} className="flex items-center gap-3">
                                  {field.type === "radio" ? <div className="w-4 h-4 rounded-full border-2 border-slate-300" /> : field.type === "checkbox" ? <div className="w-4 h-4 rounded border-2 border-slate-300" /> : <span className="text-xs font-bold text-slate-400">{oIdx + 1}.</span>}
                                  <input type="text" value={opt} onChange={e => { const n = [...(field.options||[])]; n[oIdx] = e.target.value; updateField(field.id, { options: n }); }} className="flex-1 text-sm bg-transparent outline-none border-b border-transparent focus:border-slate-300 py-1" />
                                  <button type="button" onClick={() => updateField(field.id, { options: field.options?.filter((_, i) => i !== oIdx) })} className="text-slate-300 hover:text-red-500"><XCircle className="w-4 h-4" /></button>
                                </div>
                              ))}
                              <button type="button" onClick={() => updateField(field.id, { options: [...(field.options||[]), `Opção ${(field.options?.length||0)+1}`] })} className="text-xs font-bold text-[#2655e8] hover:underline mt-2 inline-flex items-center gap-1"><PlusCircle className="w-3.5 h-3.5" />Adicionar opção</button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-3 pointer-events-none">
                          <div className="flex justify-between items-start"><label className="text-base font-bold text-slate-800 flex items-center gap-2">{field.label}{field.required && <span className="text-red-500">*</span>}</label><Icon className="w-4 h-4 text-slate-400" /></div>
                          {["text","textarea","number","date","file"].includes(field.type) && <div className="w-1/2 border-b-2 border-slate-100 pb-2 text-slate-400 text-sm italic">{FIELD_LABELS[field.type]}...</div>}
                          {["radio","checkbox"].includes(field.type) && <div className="space-y-2">{field.options?.map((opt, i) => (<div key={i} className="flex items-center gap-2 text-sm text-slate-600">{field.type === "radio" ? <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300" /> : <div className="w-3.5 h-3.5 rounded border-2 border-slate-300" />}{opt}</div>))}</div>}
                          {field.type === "select" && <div className="w-1/2 p-2 border border-slate-200 rounded-lg text-sm text-slate-400 flex justify-between">Selecionar...<ChevronDown className="w-4 h-4" /></div>}
                        </div>
                      )}
                    </div>
                    {isActive && (
                      <div className="border-t border-slate-100 bg-slate-50/50 rounded-b-2xl p-4 flex justify-end items-center gap-4">
                        <button type="button" onClick={() => duplicateField(field)} className="text-slate-400 hover:text-slate-700" title="Duplicar"><Copy className="w-5 h-5" /></button>
                        <button type="button" onClick={() => removeField(field.id)} className="text-slate-400 hover:text-red-500" title="Excluir"><Trash2 className="w-5 h-5" /></button>
                        <div className="w-px h-6 bg-slate-200 mx-2" />
                        <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-slate-600">
                          Obrigatória
                          <div className={`w-10 h-5 rounded-full transition-colors flex items-center px-1 ${field.required ? "bg-[#2655e8]" : "bg-slate-300"}`}>
                            <div className={`w-3.5 h-3.5 bg-white rounded-full transition-transform ${field.required ? "translate-x-4" : "translate-x-0"}`} />
                          </div>
                          <input type="checkbox" checked={field.required} onChange={e => updateField(field.id, { required: e.target.checked })} className="hidden" />
                        </label>
                      </div>
                    )}
                  </div>
                );
              })}

              {form.fields.length === 0 && (
                <div className="p-12 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center text-slate-400 bg-white">
                  <ListOrdered className="w-10 h-10 mb-4 opacity-50" />
                  <p className="font-bold text-slate-600">Seu formulário está vazio.</p>
                  <p className="text-sm mt-1">Use a paleta ao lado para adicionar campos.</p>
                </div>
              )}
            </div>
          </div>

          {/* Paleta de campos */}
          <div className="w-72 bg-white border-l border-slate-200 p-6 flex flex-col shrink-0 shadow-[-4px_0_24px_rgba(0,0,0,0.02)] z-10">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Adicionar Campos</h4>
            <div className="space-y-2">
              {(Object.keys(FIELD_LABELS) as FieldType[]).map(type => {
                const Icon = FIELD_ICONS[type];
                return (
                  <button key={type} type="button" onClick={() => addField(type)} className="w-full flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl hover:border-[#2655e8] hover:bg-[#eef2ff] hover:text-[#2655e8] text-slate-600 font-bold text-sm transition-all text-left shadow-sm group">
                    <Icon className="w-4 h-4 text-slate-400 group-hover:text-[#2655e8]" />
                    {FIELD_LABELS[type]}
                    <Plus className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VISUALIZADOR DE RESPOSTAS (idêntico ao original)
// ─────────────────────────────────────────────────────────────────────────────
function ResponsesViewer({ form, responses, onBack, onOpenRecord }: {
  form: FormTemplate; responses: FormResponse[];
  onBack: () => void; onOpenRecord: (resp: FormResponse) => void;
}) {
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState<ApprovalStatus | "Todos">("Todos");

  const filteredResponses = useMemo(() => responses.filter(resp => {
    const matchSearch = resp.id.toLowerCase().includes(search.toLowerCase()) || resp.submittedBy.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "Todos" ? true : resp.approvalStatus === statusFilter;
    return matchSearch && matchStatus;
  }), [responses, search, statusFilter]);

  const statusCards = [
    { title: "Enviados",       subtitle: "Recebidos",   count: countByStatus(responses,"Enviado"),           status: "Enviado" as ApprovalStatus },
    { title: "Em Verificação", subtitle: "Revisão",     count: countByStatus(responses,"Em Verificação"),   status: "Em Verificação" as ApprovalStatus },
    { title: "Em Aprovação",   subtitle: "Homologação", count: countByStatus(responses,"Em Aprovação"),     status: "Em Aprovação" as ApprovalStatus },
    { title: "Aprovados",      subtitle: "Finalizados", count: countByStatus(responses,"Aprovado"),         status: "Aprovado" as ApprovalStatus },
    { title: "Ajustes",        subtitle: "Pendentes",   count: countByStatus(responses,"Ajuste Solicitado"),status: "Ajuste Solicitado" as ApprovalStatus },
    { title: "Rejeitados",     subtitle: "Devolvidos",  count: countByStatus(responses,"Rejeitado"),        status: "Rejeitado" as ApprovalStatus },
  ];

  return (
    <div className="h-full bg-slate-50/50 p-8 flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-500 hover:text-[#2655e8] shadow-sm"><ArrowLeft className="w-5 h-5" /></button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#2655e8] bg-[#eef2ff] px-2 py-1 rounded-md border border-[#e0e7ff]">Respostas e Tramitações</span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{form.id.slice(0,8)}</span>
            </div>
            <h1 className="text-3xl font-bold text-slate-900">{form.title}</h1>
          </div>
        </div>
        <button className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold shadow-sm hover:bg-slate-50 flex items-center gap-2"><Download className="w-4 h-4" />Exportar CSV</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-5 shrink-0">
        {statusCards.map(card => {
          const meta = STATUS_META[card.status]; const Icon = meta.icon;
          const isActive = statusFilter === card.status;
          return (
            <button key={card.status} type="button" onClick={() => setStatusFilter(p => p === card.status ? "Todos" : card.status)}
              className={`bg-white border rounded-[2rem] p-5 text-left shadow-sm hover:shadow-md ${isActive ? "border-[#2655e8] ring-2 ring-[#2655e8]/15" : "border-slate-200"}`}>
              <div className="flex justify-between items-start mb-5">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${meta.bg} ${meta.border} border`}><Icon className={`w-5 h-5 ${meta.color}`} /></div>
                <span className="text-4xl font-black text-slate-900">{card.count}</span>
              </div>
              <p className="text-lg font-bold text-slate-900">{card.title}</p>
              <p className="text-xs text-slate-500 font-medium">{card.subtitle}</p>
            </button>
          );
        })}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex-1 flex flex-col">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-3 md:justify-between md:items-center shrink-0">
          <div className="flex gap-3 items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} type="text" placeholder="Buscar ID ou preenchedor..." className="pl-10 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:border-[#2655e8] w-72 shadow-sm" />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as ApprovalStatus | "Todos")} className="px-4 py-2 text-sm bg-white border border-slate-200 rounded-xl outline-none cursor-pointer">
              <option value="Todos">Todos os status</option>
              {(Object.keys(STATUS_META) as ApprovalStatus[]).map(s => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
            </select>
          </div>
          <button className="px-4 py-2 bg-white border border-slate-200 text-slate-500 rounded-xl text-xs font-bold hover:text-[#2655e8] shadow-sm flex items-center gap-2"><Filter className="w-3.5 h-3.5" />Filtros Avançados</button>
        </div>

        <div className="overflow-auto flex-1">
          <table className="w-full text-sm text-left border-collapse whitespace-nowrap">
            <thead className="bg-white text-[10px] font-black uppercase text-slate-400 tracking-widest border-b sticky top-0 shadow-sm z-10">
              <tr>
                <th className="px-6 py-4 bg-white">Registro</th>
                <th className="px-6 py-4 bg-white">Data de Envio</th>
                <th className="px-6 py-4 bg-white">Preenchido por</th>
                <th className="px-6 py-4 bg-white">Status Workflow</th>
                <th className="px-6 py-4 bg-white border-r border-slate-100">Dono Atual</th>
                {form.fields.map(col => <th key={col.id} className="px-6 py-4 bg-slate-50/50 font-semibold max-w-[200px] truncate" title={col.label}>{col.label}</th>)}
                <th className="px-6 py-4 bg-white text-right sticky right-0 shadow-[-4px_0_10px_rgba(0,0,0,0.05)]">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredResponses.length === 0 ? (
                <tr><td colSpan={6 + form.fields.length} className="p-10 text-center text-slate-400">Nenhum registro encontrado.</td></tr>
              ) : filteredResponses.map(resp => {
                const meta = STATUS_META[resp.approvalStatus]; const Icon = meta.icon;
                return (
                  <tr key={resp.id} className="hover:bg-[#eef2ff]/30 transition-colors group">
                    <td className="px-6 py-4 font-mono font-bold text-[#2655e8] text-xs">{resp.id}</td>
                    <td className="px-6 py-4 text-slate-500 font-medium">{resp.submittedAt}</td>
                    <td className="px-6 py-4 font-bold text-slate-700"><div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 border border-slate-200">{getInitials(resp.submittedBy)}</div><span>{resp.submittedBy}</span></div></td>
                    <td className="px-6 py-4"><span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider font-black border ${meta.bg} ${meta.border} ${meta.color}`}><Icon className="w-3.5 h-3.5" />{meta.label}</span></td>
                    <td className="px-6 py-4 text-slate-600 font-medium border-r border-slate-100">{resp.currentOwner}</td>
                    {form.fields.map(col => { const val = resp.data[col.id]; const d = Array.isArray(val) ? val.join(", ") : val; return <td key={col.id} className="px-6 py-4 text-slate-600 max-w-[250px] truncate" title={d}>{d || "-"}</td>; })}
                    <td className="px-6 py-4 text-right sticky right-0 bg-white group-hover:bg-[#f5f7ff] shadow-[-4px_0_10px_rgba(0,0,0,0.02)]">
                      <button type="button" onClick={() => onOpenRecord(resp)} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold shadow-sm hover:text-[#2655e8] hover:border-[#e0e7ff] inline-flex items-center gap-2 ml-auto"><Eye className="w-3.5 h-3.5" />Abrir</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DETALHE DO REGISTRO (idêntico ao original)
// ─────────────────────────────────────────────────────────────────────────────
function RecordDetails({ form, response, onBack, onUpdateResponse }: {
  form: FormTemplate; response: FormResponse;
  onBack: () => void; onUpdateResponse: (updated: FormResponse) => void;
}) {
  const [comment, setComment]                         = useState("");
  const [isPinModalOpen, setIsPinModalOpen]           = useState(false);
  const [pendingProtectedAction, setPendingProtectedAction] = useState<ProtectedAction>(null);

  const meta = STATUS_META[response.approvalStatus]; const StatusIcon = meta.icon;
  const fieldsMap = useMemo(() => Object.fromEntries(form.fields.map(f => [f.id, f])), [form.fields]);

  const pushHistory = (status: ApprovalStatus, action: string, by: string, nextOwner: string, optionalComment?: string) => {
    const updated: FormResponse = {
      ...response, approvalStatus: status, currentOwner: nextOwner,
      workflowHistory: [...response.workflowHistory, { id: `wf_${Date.now()}`, status, action, by, at: nowFormatted(), comment: optionalComment }],
    };
    onUpdateResponse(updated);
    setComment("");
  };

  const handleSendToVerification  = () => pushHistory("Em Verificação","Encaminhado para verificação","Sistema / Usuário",form.approvalConfig.reviewerRole||"Revisor",comment||"Registro enviado para análise.");
  const handleSendToApproval      = () => pushHistory("Em Aprovação","Encaminhado para aprovação final",form.approvalConfig.reviewerRole||"Revisor",form.approvalConfig.approverRole||"Aprovador",comment||"Verificado e encaminhado.");
  const approveWithoutPin         = () => pushHistory("Aprovado","Registro aprovado",form.approvalConfig.approverRole||"Aprovador","Finalizado",comment||"Aprovado.");
  const rejectWithoutPin          = () => pushHistory("Rejeitado","Registro rejeitado",form.approvalConfig.approverRole||"Aprovador",response.submittedBy,comment||"Rejeitado.");
  const requestAdjustment         = () => pushHistory("Ajuste Solicitado","Ajuste solicitado",form.approvalConfig.reviewerRole||"Revisor",response.submittedBy,comment||"Necessário complementar informações.");
  const handleDelete              = () => pushHistory("Excluído","Registro excluído",form.approvalConfig.approverRole||"Aprovador","Lixeira",comment||"Movido para a lixeira.");

  const requestProtectedAction = (action: ProtectedAction) => {
    if (!form.approvalConfig.requirePinForFinalAction) { if (action === "approve") approveWithoutPin(); if (action === "reject") rejectWithoutPin(); return; }
    setPendingProtectedAction(action); setIsPinModalOpen(true);
  };

  const handleProtectedActionConfirmed = () => {
    setIsPinModalOpen(false);
    if (pendingProtectedAction === "approve") approveWithoutPin();
    if (pendingProtectedAction === "reject")  rejectWithoutPin();
    setPendingProtectedAction(null);
  };

  return (
    <>
      <div className="h-full bg-slate-50/50 p-8 flex flex-col gap-6 animate-in fade-in duration-500">
        <div className="flex justify-between items-end gap-4 shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-500 hover:text-[#2655e8] shadow-sm"><ArrowLeft className="w-5 h-5" /></button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#2655e8] bg-[#eef2ff] px-2 py-1 rounded-md border border-[#e0e7ff]">Registro em Tramitação</span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">{response.id}</span>
              </div>
              <h1 className="text-3xl font-bold text-slate-900">{form.title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {form.approvalConfig.requirePinForFinalAction && <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-bold bg-blue-50 border-blue-200 text-blue-700 shadow-sm"><Lock className="w-3.5 h-3.5" />Workflow Autenticado (PIN)</div>}
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-bold shadow-sm ${meta.bg} ${meta.border} ${meta.color}`}><StatusIcon className="w-4 h-4" />{meta.label}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 flex-1 min-h-0">
          <div className="xl:col-span-2 space-y-6 overflow-y-auto pr-1">
            {/* Metadados */}
            <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <div><p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-1">ID Registro</p><p className="text-sm font-bold text-[#2655e8] font-mono">{response.id}</p></div>
                <div><p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-1">Enviado em</p><p className="text-sm font-bold text-slate-800">{response.submittedAt}</p></div>
                <div><p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-1">Preenchido por</p><p className="text-sm font-bold text-slate-800">{response.submittedBy}</p></div>
                <div><p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-1">Dono Atual</p><p className="text-sm font-bold text-slate-800">{response.currentOwner}</p></div>
              </div>
            </div>

            {/* Dados preenchidos */}
            <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-8">
              <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4"><FileText className="w-6 h-6 text-[#2655e8]" /><h3 className="text-xl font-bold text-slate-900">Dados Preenchidos</h3></div>
              <div className="space-y-6">
                {Object.entries(response.data).filter(([k]) => !k.startsWith("_")).map(([fieldId, value]) => {
                  const field = fieldsMap[fieldId];
                  const displayValue = Array.isArray(value) ? value.join(", ") : String(value || "-");
                  return (
                    <div key={fieldId} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5">
                      <p className="text-xs uppercase tracking-widest font-black text-slate-500 mb-2">{field?.label || fieldId}</p>
                      <p className="text-base font-medium text-slate-800 whitespace-pre-wrap">{displayValue}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Histórico */}
            <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-8">
              <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4"><MessageSquare className="w-6 h-6 text-[#2655e8]" /><h3 className="text-xl font-bold text-slate-900">Histórico do Workflow</h3></div>
              <div className="space-y-4">
                {response.workflowHistory.map(event => {
                  const em = STATUS_META[event.status]; const EventIcon = em.icon;
                  return (
                    <div key={event.id} className="rounded-2xl border border-slate-200 p-5 relative overflow-hidden">
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${em.bg} border-l-4 ${em.border}`} />
                      <div className="flex justify-between items-start gap-4 mb-3 pl-3">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${em.bg} ${em.border}`}><EventIcon className={`w-4 h-4 ${em.color}`} /></div>
                          <div><p className="text-sm font-bold text-slate-900">{event.action}</p><p className="text-xs font-medium text-slate-500 mt-0.5">{event.by} • {event.at}</p></div>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider border ${em.bg} ${em.border} ${em.color}`}>{em.label}</span>
                      </div>
                      {event.comment && <div className="ml-14 rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-700 italic">"{event.comment}"</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Painel de aprovação */}
          <div className="space-y-6 overflow-y-auto pr-1">
            <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 sticky top-0">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Painel de Aprovação</h3>
              {response.approvalStatus !== "Excluído" && <textarea value={comment} onChange={e => setComment(e.target.value)} rows={4} placeholder="Adicione um comentário ou parecer..." className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#2655e8] resize-none mb-4 shadow-inner" />}
              <div className="space-y-3">
                {response.approvalStatus === "Enviado"           && <button type="button" onClick={handleSendToVerification} className="w-full px-5 py-3.5 bg-amber-500 text-white rounded-xl text-sm font-bold shadow-md hover:bg-amber-600 flex items-center justify-center gap-2"><Clock3 className="w-4 h-4" />Assumir para Verificação</button>}
                {response.approvalStatus === "Em Verificação"    && <><button type="button" onClick={handleSendToApproval} className="w-full px-5 py-3.5 bg-violet-600 text-white rounded-xl text-sm font-bold shadow-md hover:bg-violet-700 flex items-center justify-center gap-2"><ShieldCheck className="w-4 h-4" />Encaminhar para Aprovador</button><button type="button" onClick={requestAdjustment} className="w-full px-5 py-3.5 bg-white border-2 border-orange-500 text-orange-600 rounded-xl text-sm font-bold hover:bg-orange-50 flex items-center justify-center gap-2"><AlertCircle className="w-4 h-4" />Devolver para Ajustes</button></>}
                {response.approvalStatus === "Em Aprovação"      && <><button type="button" onClick={() => requestProtectedAction("approve")} className="w-full px-5 py-3.5 bg-emerald-600 text-white rounded-xl text-sm font-bold shadow-md hover:bg-emerald-700 flex items-center justify-center gap-2">{form.approvalConfig.requirePinForFinalAction ? <Lock className="w-4 h-4"/> : <CheckCircle2 className="w-4 h-4"/>}Aprovar Registro</button><button type="button" onClick={() => requestProtectedAction("reject")} className="w-full px-5 py-3.5 bg-white border-2 border-red-500 text-red-600 rounded-xl text-sm font-bold hover:bg-red-50 flex items-center justify-center gap-2">{form.approvalConfig.requirePinForFinalAction ? <Lock className="w-4 h-4"/> : <XCircle className="w-4 h-4"/>}Rejeitar Registro</button></>}
                {response.approvalStatus === "Ajuste Solicitado" && <button type="button" onClick={handleSendToVerification} className="w-full px-5 py-3.5 bg-[#2655e8] text-white rounded-xl text-sm font-bold shadow-md hover:bg-[#1e40af] flex items-center justify-center gap-2"><Send className="w-4 h-4" />Reenviar Formulário Corrigido</button>}
                {["Aprovado","Rejeitado","Excluído"].includes(response.approvalStatus) && <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center"><FileCheck2 className="w-8 h-8 text-slate-400 mx-auto mb-2" /><p className="text-sm font-bold text-slate-700">Fluxo Encerrado</p><p className="text-xs text-slate-500 mt-1">Este registro concluiu sua tramitação.</p></div>}
                {response.approvalStatus !== "Excluído" && <button type="button" onClick={handleDelete} className="w-full px-5 py-3 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl text-sm font-bold flex items-center justify-center gap-2 mt-4"><Trash2 className="w-4 h-4" />Excluir Registro</button>}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6">
              <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-widest">Regras deste modelo</h3>
              <div className="space-y-3 text-xs text-slate-700">
                <div className="rounded-xl border border-slate-200 p-4 bg-slate-50"><p className="font-black text-slate-900 mb-1 uppercase tracking-widest text-[10px]">Revisor</p><p className="font-medium text-slate-600">{form.approvalConfig.reviewerRole || "Não definido"}</p></div>
                <div className="rounded-xl border border-slate-200 p-4 bg-slate-50"><p className="font-black text-slate-900 mb-1 uppercase tracking-widest text-[10px]">Aprovador Final</p><p className="font-medium text-slate-600">{form.approvalConfig.approverRole || "Não definido"}</p></div>
                <div className="rounded-xl border border-slate-200 p-4 bg-slate-50"><p className="font-black text-slate-900 mb-1 uppercase tracking-widest text-[10px]">Exigência de PIN</p><p className="font-medium text-slate-600">{form.approvalConfig.requirePinForFinalAction ? "Obrigatório" : "Não exigido"}</p></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <PinApprovalModal isOpen={isPinModalOpen}
        title="Assinatura Eletrônica"
        description={`Você está prestes a ${pendingProtectedAction === "approve" ? "APROVAR" : "REJEITAR"} este documento.`}
        onClose={() => { setIsPinModalOpen(false); setPendingProtectedAction(null); }}
        onConfirm={handleProtectedActionConfirmed}
        expectedPin={form.approvalConfig.approvalPin} />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PÁGINA PRINCIPAL — integrada ao Supabase
// ─────────────────────────────────────────────────────────────────────────────
export default function GestaoRegistrosPage() {
  const router = useRouter();

  const [forms, setForms]         = useState<FormTemplate[]>([]);
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [nomeUsuario, setNomeUsuario] = useState("Usuário");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving]   = useState(false);
  const [toast, setToast]         = useState<{ tipo: "ok" | "err"; msg: string } | null>(null);

  const [mainTab, setMainTab]         = useState<MainTab>("modelos");
  const [viewMode, setViewMode]       = useState<ViewMode>("list");
  const [activeForm, setActiveForm]   = useState<FormTemplate | null>(null);
  const [activeResponse, setActiveResponse] = useState<FormResponse | null>(null);
  const [search, setSearch]           = useState("");

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

  /* ── TOAST ───────────────────────────────────────────── */
  function mostrar(tipo: "ok" | "err", msg: string) {
    setToast({ tipo, msg }); setTimeout(() => setToast(null), 3500);
  }

  /* ── FETCH ───────────────────────────────────────────── */
  const fetchDados = useCallback(async () => {
    if (!empresaId) return;
    setIsLoading(true);
    const [rT, rR] = await Promise.all([
      supabase.from("registros_templates").select("*").eq("empresa_id", empresaId).order("created_at", { ascending: false }),
      supabase.from("registros_preenchidos").select("*").eq("empresa_id", empresaId).order("created_at", { ascending: false }),
    ]);
    setForms((rT.data ?? []).map(dbToTemplate));
    setResponses((rR.data ?? []).map(dbToResponse));
    setIsLoading(false);
  }, [empresaId]);

  useEffect(() => { fetchDados(); }, [fetchDados]);

  /* ── SALVAR TEMPLATE ─────────────────────────────────── */
  const handleSaveForm = useCallback(async (savedForm: FormTemplate) => {
    if (!empresaId) return;
    setIsSaving(true);

    const payload = templateToDb(savedForm, empresaId);
    let error;

    // Verifica se é um UUID (do banco) ou um ID gerado localmente
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(savedForm.id);

    if (isUUID) {
      ({ error } = await supabase.from("registros_templates").update(payload).eq("id", savedForm.id).eq("empresa_id", empresaId));
    } else {
      const { data, error: insertError } = await supabase.from("registros_templates").insert(payload).select().single();
      error = insertError;
      if (data) savedForm = dbToTemplate(data);
    }

    if (error) { mostrar("err", "Erro ao salvar formulário."); }
    else { mostrar("ok", "Formulário salvo e publicado!"); await fetchDados(); setViewMode("list"); }
    setIsSaving(false);
  }, [empresaId, fetchDados]);

  /* ── SUBMIT DE RESPOSTA ──────────────────────────────── */
  const handleSubmitNewResponse = useCallback(async (formId: string, data: Record<string, any>) => {
    if (!empresaId) return;
    const form = forms.find(f => f.id === formId);
    const numero = generateId("REG");

    const newResp: FormResponse = {
      id: numero, formId, submittedAt: nowFormatted(), submittedBy: nomeUsuario,
      approvalStatus: "Enviado", currentOwner: form?.approvalConfig.reviewerRole || "Aguardando",
      data, workflowHistory: [{ id: `wf_${Date.now()}`, status: "Enviado", action: "Registro preenchido e enviado", by: nomeUsuario, at: nowFormatted() }],
    };

    const { error } = await supabase.from("registros_preenchidos").insert(responseToDb(newResp, empresaId));
    if (error) { mostrar("err", "Erro ao enviar registro."); return; }

    mostrar("ok", `Registro ${numero} enviado para aprovação!`);
    await fetchDados();
    setViewMode("list");
    setMainTab("registros");
  }, [empresaId, forms, nomeUsuario, fetchDados]);

  /* ── ATUALIZAR RESPOSTA (WORKFLOW) ────────────────────── */
  const handleUpdateResponse = useCallback(async (updated: FormResponse) => {
    if (!empresaId) return;

    // Encontra o ID real no banco (pode ser UUID diferente do "numero")
    const { data: rows } = await supabase
      .from("registros_preenchidos")
      .select("id")
      .eq("numero", updated.id)
      .eq("empresa_id", empresaId)
      .single();

    const dbId = rows?.id ?? updated.id;

    const { error } = await supabase
      .from("registros_preenchidos")
      .update({
        status:   updated.approvalStatus,
        historico: updated.workflowHistory,
        dados:    { ...updated.data, _currentOwner: updated.currentOwner },
      })
      .eq("id", dbId)
      .eq("empresa_id", empresaId);

    if (error) { mostrar("err", "Erro ao atualizar workflow."); return; }

    // Atualiza estado local
    setResponses(prev => prev.map(r => r.id === updated.id ? updated : r));
    setActiveResponse(updated);
  }, [empresaId]);

  /* ── FILTROS ─────────────────────────────────────────── */
  const filteredForms = useMemo(() =>
    forms.filter(f => f.title.toLowerCase().includes(search.toLowerCase()) || f.id.toLowerCase().includes(search.toLowerCase()))
  , [forms, search]);

  const filteredGlobalResponses = useMemo(() =>
    responses.filter(r => {
      const formRef = forms.find(f => f.id === r.formId);
      return r.id.toLowerCase().includes(search.toLowerCase()) || r.submittedBy.toLowerCase().includes(search.toLowerCase()) || formRef?.title.toLowerCase().includes(search.toLowerCase());
    })
  , [responses, forms, search]);

  const getResponseCount = (formId: string) => responses.filter(r => r.formId === formId && r.approvalStatus !== "Excluído").length;

  // Stats globais
  const globalAprovados     = countByStatus(responses, "Aprovado");
  const globalEmVerificacao = countByStatus(responses, "Enviado") + countByStatus(responses, "Em Verificação") + countByStatus(responses, "Em Aprovação") + countByStatus(responses, "Ajuste Solicitado");
  const globalRejeitados    = countByStatus(responses, "Rejeitado");
  const globalExcluidos     = countByStatus(responses, "Excluído");

  /* ── VIEWS SECUNDÁRIAS ───────────────────────────────── */
  if (viewMode === "builder") {
    return <FormBuilder initialData={activeForm || undefined} onSave={handleSaveForm} onCancel={() => setViewMode("list")} onSubmitResponse={handleSubmitNewResponse} isSaving={isSaving} />;
  }

  if (viewMode === "responses" && activeForm) {
    return <ResponsesViewer form={activeForm} responses={responses.filter(r => r.formId === activeForm.id)} onBack={() => setViewMode("list")} onOpenRecord={resp => { setActiveResponse(resp); setViewMode("record"); }} />;
  }

  if (viewMode === "record" && activeForm && activeResponse) {
    return <RecordDetails form={activeForm} response={activeResponse} onBack={() => setViewMode(mainTab === "registros" ? "list" : "responses")} onUpdateResponse={handleUpdateResponse} />;
  }

  /* ── LISTAGEM PRINCIPAL ──────────────────────────────── */
  return (
    <div className="h-full bg-slate-50/50 p-8 flex flex-col gap-6 animate-in fade-in duration-500">

      {/* TOAST */}
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 font-bold text-sm text-white ${toast.tipo === "ok" ? "bg-emerald-600" : "bg-red-600"}`}>
          {toast.tipo === "ok" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {toast.msg}
        </div>
      )}

      {/* HEADER */}
      <div className="flex justify-between items-end gap-4 shrink-0 mb-2">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Gestão de Registros</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Formulários dinâmicos com workflow de aprovação e assinatura eletrônica.</p>
        </div>
        <div className="flex gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={mainTab === "modelos" ? "Buscar modelo..." : "Buscar registro..."} className="pl-10 pr-4 py-2.5 text-sm font-medium bg-white border border-slate-200 rounded-xl outline-none focus:border-[#2655e8] w-72 shadow-sm" />
          </div>
          <button onClick={() => { setActiveForm(null); setViewMode("builder"); }} className="px-5 py-2.5 bg-[#2655e8] text-white rounded-xl text-sm font-bold shadow-md hover:bg-[#1e40af] flex items-center gap-2">
            <Plus className="w-4 h-4" /> Criar Formulário
          </button>
        </div>
      </div>

      {/* TABS */}
      <div className="border-b border-slate-200 flex gap-8 text-[13px] font-bold text-slate-500 shrink-0">
        {[{ key: "modelos", label: "Modelos de Formulários", icon: FileText }, { key: "registros", label: "Base de Registros", icon: Table2 }].map(t => (
          <button key={t.key} onClick={() => setMainTab(t.key as MainTab)}
            className={`pb-4 border-b-[3px] flex items-center gap-2 transition-all outline-none ${mainTab === t.key ? "border-[#2655e8] text-[#2655e8]" : "border-transparent hover:text-slate-800"}`}>
            <t.icon className="w-4 h-4" />{t.label}
          </button>
        ))}
      </div>

      {/* ABA: MODELOS */}
      {mainTab === "modelos" && (
        isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 overflow-y-auto pb-8">
            {/* Card Criar */}
            <div onClick={() => { setActiveForm(null); setViewMode("builder"); }} className="bg-white border-2 border-dashed border-slate-200 rounded-[2rem] hover:border-[#2655e8] hover:bg-[#eef2ff]/30 cursor-pointer flex flex-col items-center justify-center text-slate-400 hover:text-[#2655e8] min-h-[260px] shadow-sm group transition-all">
              <div className="w-14 h-14 bg-slate-50 group-hover:bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-transparent group-hover:border-[#e0e7ff]"><Plus className="w-6 h-6 text-slate-400 group-hover:text-[#2655e8]" /></div>
              <span className="text-base font-bold text-slate-600 group-hover:text-[#2655e8]">Criar Modelo em Branco</span>
              <span className="text-xs font-medium mt-1 opacity-70">Adicione campos e configure aprovações</span>
            </div>

            {filteredForms.map(form => {
              const respCount = getResponseCount(form.id);
              return (
                <div key={form.id} className="bg-white border border-slate-200 rounded-[2rem] hover:border-[#2655e8]/50 hover:shadow-lg transition-all flex flex-col min-h-[320px] relative overflow-hidden group">
                  <div className="h-2 w-full bg-[#2655e8]" />
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border shadow-sm ${form.status === "Publicado" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"}`}>{form.status}</span>
                      <button className="text-slate-300 hover:text-slate-600"><MoreVertical className="w-5 h-5" /></button>
                    </div>
                    <div className="mb-2">
                      <span className="text-[10px] font-mono font-black text-[#2655e8] bg-[#eef2ff] px-2 py-0.5 rounded border border-[#e0e7ff] mb-2 inline-block">{form.id.slice(0, 8)}...</span>
                      <h4 className="text-xl font-bold text-slate-900 leading-tight line-clamp-2">{form.title}</h4>
                    </div>
                    <p className="text-sm text-slate-500 font-medium mb-6 line-clamp-3 flex-1">{form.description}</p>
                    {form.approvalConfig.enabled && (
                      <div className="flex items-center gap-2 mb-6">
                        <div className="flex -space-x-2">
                          <div className="w-6 h-6 rounded-full bg-amber-100 border border-white flex items-center justify-center text-amber-700" title={form.approvalConfig.reviewerRole}><Clock3 className="w-3 h-3" /></div>
                          <div className="w-6 h-6 rounded-full bg-violet-100 border border-white flex items-center justify-center text-violet-700" title={form.approvalConfig.approverRole}><ShieldCheck className="w-3 h-3" /></div>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Workflow Ativo</span>
                      </div>
                    )}
                    <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-5">
                      <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setActiveForm(form); setViewMode("responses"); }}>
                        <div className="p-2.5 bg-[#eef2ff] rounded-xl border border-[#e0e7ff]"><Table2 className="w-5 h-5 text-[#2655e8]" /></div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Registros</p>
                          <p className="text-lg font-black text-slate-800 leading-none">{respCount}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setActiveForm(form); setViewMode("builder"); }} className="p-2.5 text-slate-400 hover:text-[#2655e8] hover:bg-[#eef2ff] rounded-xl transition-colors border border-transparent hover:border-[#e0e7ff]" title="Editar"><Edit3 className="w-5 h-5" /></button>
                        <button onClick={() => { setActiveForm(form); setViewMode("responses"); }} className="p-2.5 text-slate-400 hover:text-[#2655e8] hover:bg-[#eef2ff] rounded-xl transition-colors border border-transparent hover:border-[#e0e7ff]" title="Ver respostas"><Eye className="w-5 h-5" /></button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ABA: REGISTROS */}
      {mainTab === "registros" && (
        <div className="flex flex-col flex-1 min-h-0 gap-6 animate-in fade-in">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 shrink-0">
            {[
              { label: "Registros Aprovados",      valor: globalAprovados,     cor: "bg-emerald-50 border-emerald-100 text-emerald-600", icon: FileCheck2 },
              { label: "Em Verificação",            valor: globalEmVerificacao, cor: "bg-amber-50 border-amber-100 text-amber-600",       icon: Clock3 },
              { label: "Registros Rejeitados",      valor: globalRejeitados,    cor: "bg-red-50 border-red-100 text-red-600",             icon: XCircle },
              { label: "Registros Excluídos",       valor: globalExcluidos,     cor: "bg-slate-100 border-slate-200 text-slate-500",      icon: ArchiveX },
            ].map(s => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
                  <div className="flex justify-between items-start"><div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${s.cor}`}><Icon className="w-6 h-6" /></div><span className="text-3xl font-black text-slate-900">{s.valor}</span></div>
                  <div className="mt-6"><h4 className="text-base font-bold text-slate-800">{s.label}</h4></div>
                </div>
              );
            })}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex-1 flex flex-col">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
              <button className="px-4 py-2 bg-white border border-slate-200 text-slate-500 rounded-xl text-xs font-bold hover:text-[#2655e8] shadow-sm flex items-center gap-2"><Filter className="w-3.5 h-3.5" />Filtros Avançados</button>
              <button className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold shadow-sm hover:bg-slate-50 flex items-center gap-2"><Download className="w-4 h-4" />Exportar CSV</button>
            </div>

            <div className="overflow-auto flex-1">
              <table className="w-full text-sm text-left border-collapse whitespace-nowrap">
                <thead className="bg-white text-[10px] font-black uppercase text-slate-400 tracking-widest border-b sticky top-0 shadow-sm z-10">
                  <tr>
                    <th className="px-6 py-4 bg-white">Registro</th>
                    <th className="px-6 py-4 bg-white">Formulário Ref.</th>
                    <th className="px-6 py-4 bg-white">Data de Envio</th>
                    <th className="px-6 py-4 bg-white">Preenchido por</th>
                    <th className="px-6 py-4 bg-white">Status Workflow</th>
                    <th className="px-6 py-4 bg-white">Responsável Atual</th>
                    <th className="px-6 py-4 bg-white text-right sticky right-0">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr><td colSpan={7} className="p-10 text-center"><Loader2 className="w-5 h-5 animate-spin text-blue-500 mx-auto" /></td></tr>
                  ) : filteredGlobalResponses.length === 0 ? (
                    <tr><td colSpan={7} className="p-10 text-center text-slate-400">Nenhum registro encontrado.</td></tr>
                  ) : filteredGlobalResponses.map(resp => {
                    const meta = STATUS_META[resp.approvalStatus]; const Icon = meta.icon;
                    const form = forms.find(f => f.id === resp.formId);
                    return (
                      <tr key={resp.id} className="hover:bg-[#eef2ff]/30 transition-colors group">
                        <td className="px-6 py-4 font-mono font-bold text-[#2655e8] text-xs">{resp.id}</td>
                        <td className="px-6 py-4 font-medium text-slate-700">{form?.title || resp.formId}</td>
                        <td className="px-6 py-4 text-slate-500 font-medium">{resp.submittedAt}</td>
                        <td className="px-6 py-4 font-bold text-slate-700"><div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 border border-slate-200">{getInitials(resp.submittedBy)}</div><span>{resp.submittedBy}</span></div></td>
                        <td className="px-6 py-4"><span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider font-black border ${meta.bg} ${meta.border} ${meta.color}`}><Icon className="w-3.5 h-3.5" />{meta.label}</span></td>
                        <td className="px-6 py-4 text-slate-600 font-medium">{resp.currentOwner}</td>
                        <td className="px-6 py-4 text-right sticky right-0 bg-white group-hover:bg-[#f5f7ff]">
                          <button type="button" onClick={() => { const f = forms.find(x => x.id === resp.formId); if (f) { setActiveForm(f); setActiveResponse(resp); setViewMode("record"); } }} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold shadow-sm hover:text-[#2655e8] hover:border-[#e0e7ff] inline-flex items-center gap-2 ml-auto">
                            <Eye className="w-3.5 h-3.5" />Abrir
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}