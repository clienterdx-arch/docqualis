"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Plus, Send, Save, Trash2, Copy,
  ChevronDown, AlertCircle, CheckCircle2, Loader2,
  Eye, GitBranch, Settings, ClipboardList, UserCheck,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { carregarPerfilUsuario } from "@/lib/perfil";

/* ─── Types ──────────────────────────────────────────────── */
type FieldType =
  | "texto" | "paragrafo" | "multipla_escolha"
  | "caixas" | "dropdown" | "data" | "numero"
  | "arquivo" | "assinatura";

type ActiveTab = "perguntas" | "configuracoes";

interface Option { id: string; label: string; }

interface FormItem {
  kind: "field" | "section";
  id: string;
  // field
  type?: FieldType;
  question?: string;
  required?: boolean;
  options?: Option[];
  // section
  sectionName?: string;
  sectionDesc?: string;
  aprovador?: string;
}

/* ─── Constants ──────────────────────────────────────────── */
const TYPE_LABELS: Record<FieldType, string> = {
  texto:            "Resposta curta",
  paragrafo:        "Parágrafo",
  multipla_escolha: "Múltipla escolha",
  caixas:           "Caixas de seleção",
  dropdown:         "Lista suspensa",
  data:             "Data",
  numero:           "Número",
  arquivo:          "Upload de arquivo",
  assinatura:       "Assinatura",
};

const ALL_TYPES: FieldType[] = [
  "texto", "paragrafo", "multipla_escolha",
  "caixas", "dropdown", "data", "numero",
  "arquivo", "assinatura",
];

function hasOptions(type?: FieldType) {
  return type === "multipla_escolha" || type === "caixas" || type === "dropdown";
}

/* ─── Factories ──────────────────────────────────────────── */
function uid() { return Math.random().toString(36).slice(2, 9); }

function makeField(type: FieldType = "multipla_escolha"): FormItem {
  return {
    kind: "field", id: uid(), type, question: "", required: false,
    options: hasOptions(type) ? [{ id: uid(), label: "Opção 1" }] : undefined,
  };
}

function makeSection(): FormItem {
  return { kind: "section", id: uid(), sectionName: "Nova seção", sectionDesc: "", aprovador: "" };
}

/* ─── Option bullet ──────────────────────────────────────── */
function Bullet({ type, index }: { type?: FieldType; index: number }) {
  if (type === "caixas")           return <span className="text-slate-400 text-base leading-none">☐</span>;
  if (type === "dropdown")         return <span className="text-sm text-slate-400">{index + 1}.</span>;
  return <span className="h-4 w-4 rounded-full border-2 border-slate-400 shrink-0 inline-block" />;
}

/* ─── Toggle switch ──────────────────────────────────────── */
function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${on ? "bg-blue-600" : "bg-slate-300"}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${on ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
}

/* ─── Page ───────────────────────────────────────────────── */
export default function NovoTemplatePage() {
  const router = useRouter();

  /* auth */
  const [empresaId, setEmpresaId]   = useState<string | null>(null);
  const [usuarioNome, setUsuarioNome] = useState("Usuário");
  const [dbUsuarios, setDbUsuarios] = useState<{ nome: string; cargo?: string }[]>([]);
  const [isCarregando, setIsCarregando] = useState(true);
  const [isSaving, setIsSaving]     = useState(false);
  const [msg, setMsg]               = useState<{ type: "ok" | "err"; text: string } | null>(null);

  /* form */
  const [formTitle, setFormTitle]   = useState("Formulário sem título");
  const [formDesc, setFormDesc]     = useState("");
  const [items, setItems]           = useState<FormItem[]>([makeField()]);
  const [activeId, setActiveId]     = useState<string | null>(() => {
    const first = makeField();
    return first.id;
  });

  /* configurações */
  const [activeTab, setActiveTab]   = useState<ActiveTab>("perguntas");
  const [categoria, setCategoria]   = useState("");
  const [setor, setSetor]           = useState("");
  const [aprovadores, setAprovadores] = useState<string[]>([]);
  const [apInput, setApInput]       = useState("");

  // sync activeId with first item on mount
  useEffect(() => { setActiveId(items[0]?.id ?? null); }, []); // eslint-disable-line

  /* ── Session ────────────────────────────────────────── */
  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      const perfil = await carregarPerfilUsuario<{ empresa_id?: string | null; nome?: string | null }>(
        session, "empresa_id, nome"
      );
      if (!active) return;
      if (!perfil?.empresa_id) { setIsCarregando(false); return; }
      setEmpresaId(perfil.empresa_id);
      setUsuarioNome(perfil.nome ?? session.user.email ?? "Usuário");
      const { data: u } = await supabase.from("perfis").select("nome, cargo").eq("empresa_id", perfil.empresa_id).order("nome");
      if (active) { setDbUsuarios(u ?? []); setIsCarregando(false); }
    })();
    return () => { active = false; };
  }, [router]);

  /* ── Item helpers ────────────────────────────────────── */
  function updateItem(id: string, patch: Partial<FormItem>) {
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, ...patch } : i));
  }

  function insertAfter(id: string | null, newItem: FormItem) {
    setItems((prev) => {
      if (id === null) return [...prev, newItem];
      const idx = prev.findIndex((i) => i.id === id);
      const next = [...prev];
      next.splice(idx + 1, 0, newItem);
      return next;
    });
    setActiveId(newItem.id);
  }

  function addField(type: FieldType = "multipla_escolha") {
    insertAfter(activeId, makeField(type));
  }

  function addSection() {
    insertAfter(activeId, makeSection());
  }

  function deleteItem(id: string) {
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== id);
      return next.length ? next : [makeField()];
    });
    setActiveId(null);
  }

  function duplicateItem(id: string) {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    const dup: FormItem = {
      ...item, id: uid(),
      options: item.options?.map((o) => ({ ...o, id: uid() })),
    };
    insertAfter(id, dup);
  }

  function addOption(itemId: string) {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    const n = (item.options?.length ?? 0) + 1;
    updateItem(itemId, { options: [...(item.options ?? []), { id: uid(), label: `Opção ${n}` }] });
  }

  function updateOption(itemId: string, optId: string, label: string) {
    const item = items.find((i) => i.id === itemId);
    if (!item?.options) return;
    updateItem(itemId, { options: item.options.map((o) => o.id === optId ? { ...o, label } : o) });
  }

  function removeOption(itemId: string, optId: string) {
    const item = items.find((i) => i.id === itemId);
    if (!item?.options || item.options.length <= 1) return;
    updateItem(itemId, { options: item.options.filter((o) => o.id !== optId) });
  }

  /* ── Save ────────────────────────────────────────────── */
  async function salvar(status: "RASCUNHO" | "EM_APROVACAO") {
    if (!empresaId) return;
    if (!formTitle.trim()) { setMsg({ type: "err", text: "Informe o título do formulário." }); return; }

    let curEtapa = 1;
    const etapas: object[] = [{ id: uid(), numero: 1, nome: "Etapa 1", aprovador: "" }];
    const campos: object[] = [];

    for (const item of items) {
      if (item.kind === "section") {
        curEtapa++;
        etapas.push({ id: item.id, numero: curEtapa, nome: item.sectionName || `Etapa ${curEtapa}`, aprovador: item.aprovador || "" });
      } else {
        campos.push({
          id: item.id, type: item.type,
          label: item.question || "Campo sem título",
          required: item.required || false,
          options: item.options?.map((o) => o.label),
          etapa: curEtapa,
        });
      }
    }

    setIsSaving(true);
    const { error } = await supabase.from("registros_templates").insert({
      empresa_id: empresaId,
      titulo: formTitle.trim(),
      categoria: categoria.trim() || "Geral",
      setor: setor.trim() || "Geral",
      status, campos,
      versao_major: 1, versao_minor: 0, versao_patch: 0,
      responsavel: usuarioNome,
      workflow: { engine: "STAGES", etapas, aprovadores_template: aprovadores },
    });
    setIsSaving(false);

    if (error) { setMsg({ type: "err", text: "Erro ao salvar. Verifique as migrations." }); return; }
    setMsg({ type: "ok", text: status === "EM_APROVACAO" ? "Enviado para aprovação!" : "Rascunho salvo!" });
    setTimeout(() => router.push("/gestao-registros"), 1500);
  }

  /* ── Loading ─────────────────────────────────────────── */
  if (isCarregando) {
    return (
      <div className="h-screen flex items-center justify-center gap-3 text-slate-400 font-semibold">
        <Loader2 className="w-7 h-7 animate-spin text-blue-500" /> Carregando...
      </div>
    );
  }

  /* ──────────────────────────────────────────────────────
     RENDER
  ────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-[#f0f4f9] flex flex-col">

      {/* ── Top bar ────────────────────────────────────── */}
      <header className="bg-white shadow-sm sticky top-0 z-30">
        <div className="flex items-center justify-between px-4 h-14 gap-3">
          {/* Left */}
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/gestao-registros" className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-full shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
              <ClipboardList className="w-4 h-4 text-white" />
            </div>
            <input
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              className="text-base font-medium text-slate-800 border-0 border-b-2 border-transparent focus:border-blue-600 outline-none px-1 py-0.5 bg-transparent min-w-0 w-full max-w-xs"
            />
          </div>

          {/* Right */}
          <div className="flex items-center gap-2 shrink-0">
            <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full" title="Pré-visualizar">
              <Eye className="w-5 h-5" />
            </button>
            <button
              onClick={() => salvar("RASCUNHO")}
              disabled={isSaving}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
            >
              <Save className="w-4 h-4" /> Rascunho
            </button>
            <button
              onClick={() => salvar("EM_APROVACAO")}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-sm disabled:opacity-60"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span className="hidden sm:inline">Enviar para Aprovação</span>
              <span className="sm:hidden">Enviar</span>
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex justify-center border-t border-slate-100">
          {(["perguntas", "configuracoes"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-8 py-3 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 ${activeTab === t ? "text-blue-600 border-blue-600" : "text-slate-500 border-transparent hover:text-slate-700 hover:border-slate-300"}`}
            >
              {t === "perguntas" ? <><ClipboardList className="w-4 h-4" /> Perguntas</> : <><Settings className="w-4 h-4" /> Configurações</>}
            </button>
          ))}
        </div>
      </header>

      {/* ── Message bar ─────────────────────────────────── */}
      {msg && (
        <div className={`flex items-center justify-center gap-2 py-2 text-sm font-semibold ${msg.type === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
          {msg.type === "ok" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {msg.text}
        </div>
      )}

      {/* ──────────────────────────────────────────────────
          TAB: Perguntas
      ────────────────────────────────────────────────── */}
      {activeTab === "perguntas" && (
        <div className="flex flex-1 py-8 px-4 gap-4 justify-center">

          {/* Canvas */}
          <div className="w-full max-w-2xl space-y-4">

            {/* Form header card */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
              <div className="h-2.5 bg-blue-600 rounded-t-xl" />
              <div className="p-6 space-y-3">
                <input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Título do formulário"
                  className="w-full text-3xl font-normal text-slate-900 border-0 border-b-2 border-slate-200 focus:border-blue-600 outline-none pb-2 bg-transparent transition-colors"
                />
                <input
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Descrição do formulário"
                  className="w-full text-sm text-slate-500 border-0 border-b border-slate-100 focus:border-blue-400 outline-none pb-1 bg-transparent"
                />
              </div>
            </div>

            {/* Item cards */}
            {items.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                isActive={activeId === item.id}
                dbUsuarios={dbUsuarios}
                onActivate={() => setActiveId(item.id)}
                onUpdate={(patch) => updateItem(item.id, patch)}
                onDelete={() => deleteItem(item.id)}
                onDuplicate={() => duplicateItem(item.id)}
                onAddOption={() => addOption(item.id)}
                onUpdateOption={(optId, label) => updateOption(item.id, optId, label)}
                onRemoveOption={(optId) => removeOption(item.id, optId)}
              />
            ))}
          </div>

          {/* Right sidebar */}
          <div className="hidden md:flex flex-col items-center gap-1 pt-0 sticky top-24 h-fit">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-1.5 flex flex-col gap-1">
              <SideBtn icon={Plus} label="Adicionar pergunta" onClick={() => addField()} />
              <SideBtn icon={GitBranch} label="Adicionar aprovação intermediária" onClick={addSection} />
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────
          TAB: Configurações
      ────────────────────────────────────────────────── */}
      {activeTab === "configuracoes" && (
        <div className="flex-1 py-8 px-4">
          <div className="max-w-2xl mx-auto space-y-4">

            {/* Approvers */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-1">
                <UserCheck className="w-5 h-5 text-blue-600" />
                <h2 className="text-base font-semibold text-slate-800">Aprovadores do formulário</h2>
              </div>
              <p className="text-sm text-slate-500 mb-5">
                Quem deve aprovar este formulário antes de ser publicado no Repositório.
              </p>
              <div className="flex gap-2 mb-4">
                <select
                  value={apInput}
                  onChange={(e) => setApInput(e.target.value)}
                  className="flex-1 h-10 px-3 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-600 bg-white"
                >
                  <option value="">Selecione um aprovador...</option>
                  {dbUsuarios.map((u) => (
                    <option key={u.nome} value={u.nome}>{u.nome}{u.cargo ? ` — ${u.cargo}` : ""}</option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    if (apInput && !aprovadores.includes(apInput)) {
                      setAprovadores((a) => [...a, apInput]);
                      setApInput("");
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {aprovadores.length > 0 ? (
                <div className="space-y-2">
                  {aprovadores.map((ap) => (
                    <div key={ap} className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                      <span className="text-sm font-medium text-slate-800">{ap}</span>
                      <button onClick={() => setAprovadores((a) => a.filter((x) => x !== ap))} className="text-slate-400 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic">Nenhum aprovador adicionado. O formulário poderá ser publicado diretamente.</p>
              )}
            </div>

            {/* Classification */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-base font-semibold text-slate-800 mb-5">Classificação</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <CfgField label="Categoria">
                  <input
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    placeholder="Ex: Segurança do Trabalho"
                    className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-600"
                  />
                </CfgField>
                <CfgField label="Setor / Unidade">
                  <input
                    value={setor}
                    onChange={(e) => setSetor(e.target.value)}
                    placeholder="Ex: Produção"
                    className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-600"
                  />
                </CfgField>
              </div>
            </div>

            {/* Save buttons */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => salvar("RASCUNHO")}
                disabled={isSaving}
                className="flex items-center gap-2 px-5 py-2.5 border border-slate-200 bg-white rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                <Save className="w-4 h-4" /> Salvar Rascunho
              </button>
              <button
                onClick={() => salvar("EM_APROVACAO")}
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-sm disabled:opacity-60"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Enviar para Aprovação
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── ItemCard ───────────────────────────────────────────── */
interface ItemCardProps {
  item: FormItem;
  isActive: boolean;
  dbUsuarios: { nome: string; cargo?: string }[];
  onActivate: () => void;
  onUpdate: (patch: Partial<FormItem>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onAddOption: () => void;
  onUpdateOption: (optId: string, label: string) => void;
  onRemoveOption: (optId: string) => void;
}

function ItemCard({
  item, isActive, dbUsuarios,
  onActivate, onUpdate, onDelete, onDuplicate,
  onAddOption, onUpdateOption, onRemoveOption,
}: ItemCardProps) {

  /* ── Section card ──────────────────────────────────── */
  if (item.kind === "section") {
    return (
      <div
        onClick={onActivate}
        className={`bg-white rounded-xl shadow-sm overflow-hidden border transition-all cursor-pointer ${isActive ? "border-blue-500 shadow-md" : "border-slate-200 hover:border-slate-300"}`}
      >
        <div className={`h-1.5 ${isActive ? "bg-blue-600" : "bg-slate-300"}`} />
        <div className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <GitBranch className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Aprovação intermediária</span>
          </div>
          {isActive ? (
            <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
              <input
                value={item.sectionName ?? ""}
                onChange={(e) => onUpdate({ sectionName: e.target.value })}
                placeholder="Nome da seção"
                className="w-full text-lg font-medium border-0 border-b-2 border-slate-200 focus:border-blue-600 outline-none pb-1 bg-transparent transition-colors"
              />
              <input
                value={item.sectionDesc ?? ""}
                onChange={(e) => onUpdate({ sectionDesc: e.target.value })}
                placeholder="Descrição (opcional)"
                className="w-full text-sm text-slate-500 border-0 border-b border-slate-100 focus:border-blue-400 outline-none pb-1 bg-transparent"
              />
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">
                  Aprovador antes desta seção
                </label>
                <select
                  value={item.aprovador ?? ""}
                  onChange={(e) => onUpdate({ aprovador: e.target.value })}
                  className="w-full sm:w-80 h-10 px-3 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-600 bg-white"
                >
                  <option value="">Selecione o aprovador...</option>
                  {dbUsuarios.map((u) => (
                    <option key={u.nome} value={u.nome}>{u.nome}{u.cargo ? ` — ${u.cargo}` : ""}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button
                  onClick={onDelete}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remover seção
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-base font-medium text-slate-700">{item.sectionName || "Seção sem nome"}</p>
              {item.aprovador
                ? <p className="text-sm text-slate-500 mt-0.5">Aprovador: <strong>{item.aprovador}</strong></p>
                : <p className="text-sm text-slate-400 mt-0.5 italic">Sem aprovador definido</p>
              }
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ── Field card ────────────────────────────────────── */
  const showOptions = hasOptions(item.type);

  return (
    <div
      onClick={onActivate}
      className={`bg-white rounded-xl shadow-sm overflow-hidden border transition-all cursor-pointer ${isActive ? "border-blue-500 shadow-md" : "border-slate-200 hover:border-slate-300"}`}
    >
      {isActive && <div className="h-1.5 bg-blue-600 rounded-t-xl" />}

      <div className="p-5 sm:p-6">
        {isActive ? (
          /* ─ EDIT MODE ─ */
          <div onClick={(e) => e.stopPropagation()}>
            {/* Question + Type selector */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              <input
                value={item.question ?? ""}
                onChange={(e) => onUpdate({ question: e.target.value })}
                placeholder="Pergunta"
                autoFocus
                className="flex-1 bg-slate-50 border border-slate-200 focus:border-blue-600 outline-none rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
              />
              <div className="relative shrink-0">
                <select
                  value={item.type ?? "multipla_escolha"}
                  onChange={(e) => {
                    const t = e.target.value as FieldType;
                    onUpdate({
                      type: t,
                      options: hasOptions(t)
                        ? (item.options?.length ? item.options : [{ id: Math.random().toString(36).slice(2), label: "Opção 1" }])
                        : undefined,
                    });
                  }}
                  className="h-10 pl-3 pr-8 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:border-blue-600 bg-white appearance-none cursor-pointer w-full sm:w-48"
                >
                  {ALL_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </div>
            </div>

            {/* Options */}
            {showOptions && item.options && (
              <div className="space-y-2 mb-4 pl-1">
                {item.options.map((opt, oi) => (
                  <div key={opt.id} className="flex items-center gap-2">
                    <Bullet type={item.type} index={oi} />
                    <input
                      value={opt.label}
                      onChange={(e) => onUpdateOption(opt.id, e.target.value)}
                      className="flex-1 border-0 border-b border-slate-200 focus:border-blue-600 outline-none text-sm pb-0.5 bg-transparent"
                    />
                    {item.options!.length > 1 && (
                      <button onClick={() => onRemoveOption(opt.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                        <span className="text-base leading-none">×</span>
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={onAddOption}
                  className="flex items-center gap-2 text-sm text-slate-400 hover:text-blue-600 pl-1 mt-1 transition-colors"
                >
                  <Bullet type={item.type} index={item.options.length} />
                  <span className="text-blue-600 font-medium">Adicionar opção</span>
                </button>
              </div>
            )}

            {/* Non-option preview */}
            {!showOptions && (
              <div className="mb-4 pl-1">
                {item.type === "texto"      && <div className="border-b border-slate-300 pb-1 text-sm text-slate-400 w-48">Resposta curta</div>}
                {item.type === "paragrafo"  && <div className="border-b border-slate-300 pb-1 text-sm text-slate-400 w-full">Resposta longa</div>}
                {item.type === "data"       && <div className="text-sm text-slate-400">📅 DD/MM/AAAA</div>}
                {item.type === "numero"     && <div className="border-b border-slate-300 pb-1 text-sm text-slate-400 w-28">Número</div>}
                {item.type === "arquivo"    && <div className="text-sm text-slate-400">📎 Arquivo</div>}
                {item.type === "assinatura" && <div className="text-sm text-slate-400">✍️ Assinatura digital</div>}
              </div>
            )}

            {/* Footer actions */}
            <div className="flex items-center justify-end gap-1 pt-3 border-t border-slate-100">
              <button onClick={onDuplicate} title="Duplicar" className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
                <Copy className="w-4 h-4" />
              </button>
              <button onClick={onDelete} title="Excluir" className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
              <div className="w-px h-5 bg-slate-200 mx-2" />
              <span className="text-sm text-slate-600 mr-2">Obrigatória</span>
              <Toggle on={item.required ?? false} onChange={() => onUpdate({ required: !item.required })} />
            </div>
          </div>
        ) : (
          /* ─ READ MODE ─ */
          <div>
            <p className="text-sm font-medium text-slate-800">
              {item.question || <span className="text-slate-400 italic">Pergunta sem título</span>}
              {item.required && <span className="text-red-500 ml-1">*</span>}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">{TYPE_LABELS[item.type ?? "texto"]}</p>
            {showOptions && item.options && (
              <div className="mt-2.5 space-y-1.5">
                {item.options.slice(0, 3).map((opt, oi) => (
                  <div key={opt.id} className="flex items-center gap-2 text-sm text-slate-500">
                    <Bullet type={item.type} index={oi} />
                    {opt.label}
                  </div>
                ))}
                {item.options.length > 3 && (
                  <p className="text-xs text-slate-400 pl-6">+{item.options.length - 3} opção(ões)...</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Helpers ────────────────────────────────────────────── */
function SideBtn({ icon: Icon, label, onClick }: { icon: React.ElementType; label: string; onClick: () => void }) {
  return (
    <button
      title={label}
      onClick={onClick}
      className="w-10 h-10 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
    >
      <Icon className="w-5 h-5" />
    </button>
  );
}

function CfgField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>
      {children}
    </div>
  );
}
