"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Copy,
  FileText,
  GitBranch,
  GripVertical,
  Layers,
  Loader2,
  Plus,
  Save,
  Send,
  Settings,
  Trash2,
  UserCheck,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { carregarPerfilUsuario } from "@/lib/perfil";

type FieldType = "texto" | "paragrafo" | "multipla_escolha" | "caixas" | "dropdown" | "data" | "numero" | "arquivo" | "assinatura";
type ActiveStep = 1 | 2 | 3 | 4;

interface Option {
  id: string;
  label: string;
}

interface FormField {
  id: string;
  type: FieldType;
  question: string;
  required: boolean;
  options?: Option[];
  etapa: number;
}

interface FormStage {
  id: string;
  nome: string;
  descricao: string;
  aprovador: string;
}

const TYPE_LABELS: Record<FieldType, string> = {
  texto: "Resposta curta",
  paragrafo: "Parágrafo",
  multipla_escolha: "Múltipla escolha",
  caixas: "Caixas de seleção",
  dropdown: "Lista suspensa",
  data: "Data",
  numero: "Número",
  arquivo: "Upload de arquivo",
  assinatura: "Assinatura",
};

const ALL_TYPES: FieldType[] = ["texto", "paragrafo", "multipla_escolha", "caixas", "dropdown", "data", "numero", "arquivo", "assinatura"];

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function hasOptions(type: FieldType) {
  return type === "multipla_escolha" || type === "caixas" || type === "dropdown";
}

function makeField(etapa = 1, type: FieldType = "multipla_escolha"): FormField {
  return {
    id: uid(),
    type,
    question: "",
    required: false,
    etapa,
    options: hasOptions(type) ? [{ id: uid(), label: "Opção 1" }] : undefined,
  };
}

export default function NovoTemplatePage() {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState<ActiveStep>(1);
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [usuarioNome, setUsuarioNome] = useState("Usuário");
  const [dbUsuarios, setDbUsuarios] = useState<{ nome: string; cargo?: string }[]>([]);
  const [isCarregando, setIsCarregando] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [codigo, setCodigo] = useState("");
  const [categoria, setCategoria] = useState("");
  const [setor, setSetor] = useState("");
  const [versao, setVersao] = useState("1.0");

  const [stages, setStages] = useState<FormStage[]>([{ id: uid(), nome: "Etapa 1", descricao: "", aprovador: "" }]);
  const [fields, setFields] = useState<FormField[]>([makeField(1)]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [aprovadoresPublicacao, setAprovadoresPublicacao] = useState<string[]>([]);
  const [aprovadorAtual, setAprovadorAtual] = useState("");

  useEffect(() => {
    setSelectedFieldId((current) => current ?? fields[0]?.id ?? null);
  }, [fields]);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      const perfil = await carregarPerfilUsuario<{ empresa_id?: string | null; nome?: string | null }>(session, "empresa_id, nome");
      if (!active) return;

      if (!perfil?.empresa_id) {
        setMsg({ type: "err", text: "Não foi possível identificar a empresa vinculada ao usuário." });
        setIsCarregando(false);
        return;
      }

      setEmpresaId(perfil.empresa_id);
      setUsuarioNome(perfil.nome ?? session.user.email ?? "Usuário");

      const { data } = await supabase.from("perfis").select("nome, cargo").eq("empresa_id", perfil.empresa_id).order("nome");
      if (active) {
        setDbUsuarios(data ?? []);
        setIsCarregando(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [router]);

  const selectedField = fields.find((field) => field.id === selectedFieldId) ?? fields[0];

  const stageOptions = useMemo(
    () => stages.map((stage, index) => ({ ...stage, numero: index + 1 })),
    [stages]
  );

  function updateField(id: string, patch: Partial<FormField>) {
    setFields((current) => current.map((field) => field.id === id ? { ...field, ...patch } : field));
  }

  function addField() {
    const field = makeField(stageOptions[0]?.numero ?? 1);
    setFields((current) => [...current, field]);
    setSelectedFieldId(field.id);
  }

  function duplicateField(field: FormField) {
    const copyField = {
      ...field,
      id: uid(),
      options: field.options?.map((option) => ({ ...option, id: uid() })),
    };
    setFields((current) => [...current, copyField]);
    setSelectedFieldId(copyField.id);
  }

  function removeField(id: string) {
    setFields((current) => {
      const next = current.filter((field) => field.id !== id);
      return next.length > 0 ? next : [makeField()];
    });
    setSelectedFieldId(null);
  }

  function addOption(fieldId: string) {
    const field = fields.find((item) => item.id === fieldId);
    if (!field) return;
    updateField(fieldId, { options: [...(field.options ?? []), { id: uid(), label: `Opção ${(field.options?.length ?? 0) + 1}` }] });
  }

  function updateOption(fieldId: string, optionId: string, label: string) {
    const field = fields.find((item) => item.id === fieldId);
    if (!field?.options) return;
    updateField(fieldId, { options: field.options.map((option) => option.id === optionId ? { ...option, label } : option) });
  }

  function removeOption(fieldId: string, optionId: string) {
    const field = fields.find((item) => item.id === fieldId);
    if (!field?.options || field.options.length <= 1) return;
    updateField(fieldId, { options: field.options.filter((option) => option.id !== optionId) });
  }

  function addStage() {
    const nextStage: FormStage = { id: uid(), nome: `Etapa ${stages.length + 1}`, descricao: "", aprovador: "" };
    setStages((current) => [...current, nextStage]);
  }

  function updateStage(id: string, patch: Partial<FormStage>) {
    setStages((current) => current.map((stage) => stage.id === id ? { ...stage, ...patch } : stage));
  }

  function removeStage(id: string) {
    if (stages.length <= 1) return;
    const index = stages.findIndex((stage) => stage.id === id);
    const etapaRemovida = index + 1;
    setStages((current) => current.filter((stage) => stage.id !== id));
    setFields((current) => current.map((field) => ({ ...field, etapa: field.etapa === etapaRemovida ? 1 : Math.max(1, field.etapa > etapaRemovida ? field.etapa - 1 : field.etapa) })));
  }

  async function salvar(status: "RASCUNHO" | "EM_APROVACAO") {
    if (!empresaId) return;
    if (!titulo.trim()) {
      setMsg({ type: "err", text: "Informe o nome do template." });
      setActiveStep(1);
      return;
    }
    if (fields.some((field) => !field.question.trim())) {
      setMsg({ type: "err", text: "Todas as perguntas precisam ter um título." });
      setActiveStep(2);
      return;
    }

    setIsSaving(true);
    const campos = fields.map((field) => ({
      id: field.id,
      type: field.type,
      label: field.question.trim(),
      required: field.required,
      options: field.options?.map((option) => option.label),
      etapa: field.etapa,
    }));

    const etapas = stages.map((stage, index) => ({
      id: stage.id,
      numero: index + 1,
      nome: stage.nome || `Etapa ${index + 1}`,
      descricao: stage.descricao,
      aprovador: stage.aprovador,
    }));

    const [major, minor] = versao.split(".").map((part) => Number(part) || 0);
    const { error } = await supabase.from("registros_templates").insert({
      empresa_id: empresaId,
      titulo: titulo.trim(),
      descricao: descricao.trim(),
      codigo: codigo.trim(),
      categoria: categoria.trim() || "Geral",
      setor: setor.trim() || "Geral",
      status,
      campos,
      versao_major: major || 1,
      versao_minor: minor || 0,
      versao_patch: 0,
      responsavel: usuarioNome,
      workflow: { engine: "STAGES", etapas, aprovadores_template: aprovadoresPublicacao },
    });
    setIsSaving(false);

    if (error) {
      setMsg({ type: "err", text: "Não foi possível salvar o template. Verifique a estrutura do banco." });
      return;
    }

    setMsg({ type: "ok", text: status === "EM_APROVACAO" ? "Template enviado para aprovação." : "Rascunho salvo." });
    setTimeout(() => router.push("/gestao-registros"), 1200);
  }

  if (isCarregando) {
    return (
      <div className="flex h-screen items-center justify-center gap-3 font-semibold text-slate-400">
        <Loader2 className="h-7 w-7 animate-spin text-blue-500" /> Carregando...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center gap-4">
          <Link href="/gestao-registros" className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 shadow-sm transition hover:bg-slate-50">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Criar template de registro</h1>
            <p className="mt-1 text-sm text-slate-500">Monte o formulário, defina etapas e envie para aprovação.</p>
          </div>
        </div>

        {msg && (
          <div className={`mb-6 flex items-center gap-3 rounded-xl border p-4 text-sm font-semibold ${msg.type === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
            {msg.type === "ok" ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <AlertCircle className="h-5 w-5 shrink-0" />}
            {msg.text}
          </div>
        )}

        <section className="flex min-h-[640px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex overflow-x-auto border-b border-slate-100 bg-slate-50">
            <StepButton active={activeStep === 1} onClick={() => setActiveStep(1)} step="1" icon={<FileText className="h-4 w-4" />} title="Identificação" />
            <StepButton active={activeStep === 2} onClick={() => setActiveStep(2)} step="2" icon={<ClipboardList className="h-4 w-4" />} title="Campos" />
            <StepButton active={activeStep === 3} onClick={() => setActiveStep(3)} step="3" icon={<GitBranch className="h-4 w-4" />} title="Etapas e aprovações" />
            <StepButton active={activeStep === 4} onClick={() => setActiveStep(4)} step="4" icon={<Send className="h-4 w-4" />} title="Publicação" />
          </div>

          <div className="flex-1 p-8">
            {activeStep === 1 && (
              <div className="space-y-7">
                <div className="grid gap-5 md:grid-cols-3">
                  <Field label="Nome do template *" className="md:col-span-2">
                    <input value={titulo} onChange={(event) => setTitulo(event.target.value)} placeholder="Ex: checklist, formulário, inspeção..." className={inputClass} />
                  </Field>
                  <Field label="Versão">
                    <input value={versao} onChange={(event) => setVersao(event.target.value)} className={inputClass} />
                  </Field>
                  <Field label="Código">
                    <input value={codigo} onChange={(event) => setCodigo(event.target.value.toUpperCase())} placeholder="REG.001" className={inputClass} />
                  </Field>
                  <Field label="Categoria">
                    <input value={categoria} onChange={(event) => setCategoria(event.target.value)} placeholder="Categoria do registro" className={inputClass} />
                  </Field>
                  <Field label="Setor / unidade">
                    <input value={setor} onChange={(event) => setSetor(event.target.value)} placeholder="Setor aplicável" className={inputClass} />
                  </Field>
                </div>
                <Field label="Descrição do formulário">
                  <textarea value={descricao} onChange={(event) => setDescricao(event.target.value)} rows={5} placeholder="Explique o objetivo do formulário e quando deve ser usado." className={`${inputClass} resize-none`} />
                </Field>
              </div>
            )}

            {activeStep === 2 && (
              <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
                <div className="space-y-4">
                  {fields.map((field) => (
                    <FieldCard
                      key={field.id}
                      field={field}
                      stages={stageOptions}
                      active={selectedFieldId === field.id}
                      onSelect={() => setSelectedFieldId(field.id)}
                      onUpdate={(patch) => updateField(field.id, patch)}
                      onDuplicate={() => duplicateField(field)}
                      onRemove={() => removeField(field.id)}
                      onAddOption={() => addOption(field.id)}
                      onUpdateOption={(optionId, label) => updateOption(field.id, optionId, label)}
                      onRemoveOption={(optionId) => removeOption(field.id, optionId)}
                    />
                  ))}
                </div>
                <aside className="h-fit rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Ferramentas</p>
                  <button onClick={addField} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
                    <Plus className="h-4 w-4" /> Adicionar campo
                  </button>
                  {selectedField && (
                    <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-500">
                      Campo selecionado: <strong className="text-slate-700">{selectedField.question || "Sem título"}</strong>
                    </div>
                  )}
                </aside>
              </div>
            )}

            {activeStep === 3 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-950">Etapas do preenchimento</h2>
                    <p className="text-sm text-slate-500">Cada etapa pode exigir um aprovador antes de liberar a próxima fase.</p>
                  </div>
                  <button onClick={addStage} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                    <Plus className="h-4 w-4" /> Nova etapa
                  </button>
                </div>
                <div className="space-y-3">
                  {stages.map((stage, index) => (
                    <div key={stage.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="mb-4 flex items-center gap-3">
                        <span className="grid h-8 w-8 place-items-center rounded-full bg-blue-600 text-sm font-bold text-white">{index + 1}</span>
                        <div className="min-w-0 flex-1">
                          <input value={stage.nome} onChange={(event) => updateStage(stage.id, { nome: event.target.value })} className="w-full border-0 border-b border-transparent bg-transparent text-base font-semibold outline-none focus:border-blue-500" />
                        </div>
                        {stages.length > 1 && (
                          <button onClick={() => removeStage(stage.id)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Descrição da etapa">
                          <input value={stage.descricao} onChange={(event) => updateStage(stage.id, { descricao: event.target.value })} placeholder="Orientação interna" className={inputClass} />
                        </Field>
                        <Field label="Aprovador entre etapas">
                          <select value={stage.aprovador} onChange={(event) => updateStage(stage.id, { aprovador: event.target.value })} className={inputClass}>
                            <option value="">Sem aprovação intermediária</option>
                            {dbUsuarios.map((user) => <option key={user.nome} value={user.nome}>{user.nome}{user.cargo ? ` - ${user.cargo}` : ""}</option>)}
                          </select>
                        </Field>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeStep === 4 && (
              <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-950"><UserCheck className="h-5 w-5 text-blue-600" /> Aprovação do template</h2>
                  <p className="mt-1 text-sm text-slate-500">Defina quem aprova o modelo antes de ficar disponível no repositório.</p>
                  <div className="mt-5 flex gap-2">
                    <select value={aprovadorAtual} onChange={(event) => setAprovadorAtual(event.target.value)} className={inputClass}>
                      <option value="">Selecione um aprovador...</option>
                      {dbUsuarios.map((user) => <option key={user.nome} value={user.nome}>{user.nome}{user.cargo ? ` - ${user.cargo}` : ""}</option>)}
                    </select>
                    <button
                      onClick={() => {
                        if (aprovadorAtual && !aprovadoresPublicacao.includes(aprovadorAtual)) {
                          setAprovadoresPublicacao((current) => [...current, aprovadorAtual]);
                          setAprovadorAtual("");
                        }
                      }}
                      className="rounded-lg bg-blue-600 px-4 text-white hover:bg-blue-700"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-4 space-y-2">
                    {aprovadoresPublicacao.length === 0 ? (
                      <p className="text-sm italic text-slate-400">Nenhum aprovador final adicionado.</p>
                    ) : (
                      aprovadoresPublicacao.map((aprovador) => (
                        <div key={aprovador} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700">
                          {aprovador}
                          <button onClick={() => setAprovadoresPublicacao((current) => current.filter((item) => item !== aprovador))} className="text-slate-400 hover:text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-950">Resumo</h3>
                  <dl className="mt-4 space-y-3 text-sm">
                    <Summary label="Campos" value={String(fields.length)} />
                    <Summary label="Etapas" value={String(stages.length)} />
                    <Summary label="Aprovações intermediárias" value={String(stages.filter((stage) => stage.aprovador).length)} />
                    <Summary label="Aprovadores finais" value={String(aprovadoresPublicacao.length)} />
                  </dl>
                </aside>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
            <button
              onClick={() => setActiveStep((step) => Math.max(1, step - 1) as ActiveStep)}
              disabled={activeStep === 1}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Voltar
            </button>
            <div className="flex gap-3">
              <button onClick={() => salvar("RASCUNHO")} disabled={isSaving} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
                <Save className="h-4 w-4" /> Salvar rascunho
              </button>
              {activeStep < 4 ? (
                <button onClick={() => setActiveStep((step) => Math.min(4, step + 1) as ActiveStep)} className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800">
                  Próxima etapa
                </button>
              ) : (
                <button onClick={() => salvar("EM_APROVACAO")} disabled={isSaving} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Enviar para aprovação
                </button>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

const inputClass = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-50";

function StepButton({ active, onClick, step, icon, title }: { active: boolean; onClick: () => void; step: string; icon: React.ReactNode; title: string }) {
  return (
    <button onClick={onClick} className={`flex min-w-[180px] flex-1 items-center justify-center gap-2 border-b-2 px-4 py-4 text-sm font-semibold transition ${active ? "border-blue-600 bg-white text-blue-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
      <span className={`grid h-6 w-6 place-items-center rounded-full text-xs font-bold ${active ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500"}`}>{step}</span>
      {icon}
      {title}
    </button>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</label>
      {children}
    </div>
  );
}

function FieldCard({
  field,
  stages,
  active,
  onSelect,
  onUpdate,
  onDuplicate,
  onRemove,
  onAddOption,
  onUpdateOption,
  onRemoveOption,
}: {
  field: FormField;
  stages: Array<FormStage & { numero: number }>;
  active: boolean;
  onSelect: () => void;
  onUpdate: (patch: Partial<FormField>) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onAddOption: () => void;
  onUpdateOption: (optionId: string, label: string) => void;
  onRemoveOption: (optionId: string) => void;
}) {
  const showOptions = hasOptions(field.type);

  return (
    <article onClick={onSelect} className={`rounded-xl border bg-white p-5 shadow-sm transition ${active ? "border-blue-500 ring-4 ring-blue-50" : "border-slate-200 hover:border-slate-300"}`}>
      <div className="mb-4 flex items-start gap-3">
        <GripVertical className="mt-3 h-4 w-4 text-slate-300" />
        <div className="grid flex-1 gap-3 md:grid-cols-[1fr_190px]">
          <input value={field.question} onChange={(event) => onUpdate({ question: event.target.value })} placeholder="Pergunta" className={inputClass} />
          <div className="relative">
            <select
              value={field.type}
              onChange={(event) => {
                const type = event.target.value as FieldType;
                onUpdate({ type, options: hasOptions(type) ? field.options ?? [{ id: uid(), label: "Opção 1" }] : undefined });
              }}
              className={`${inputClass} appearance-none pr-8`}
            >
              {ALL_TYPES.map((type) => <option key={type} value={type}>{TYPE_LABELS[type]}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        </div>
      </div>

      {showOptions && field.options && (
        <div className="ml-7 space-y-2">
          {field.options.map((option, index) => (
            <div key={option.id} className="flex items-center gap-2">
              <span className="text-xs text-slate-400">{index + 1}.</span>
              <input value={option.label} onChange={(event) => onUpdateOption(option.id, event.target.value)} className="flex-1 border-0 border-b border-slate-200 bg-transparent py-1 text-sm outline-none focus:border-blue-500" />
              {field.options!.length > 1 && (
                <button onClick={() => onRemoveOption(option.id)} className="text-slate-300 hover:text-red-500">x</button>
              )}
            </div>
          ))}
          <button onClick={onAddOption} className="text-sm font-semibold text-blue-600">Adicionar opção</button>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-slate-400" />
          <select value={field.etapa} onChange={(event) => onUpdate({ etapa: Number(event.target.value) })} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 outline-none">
            {stages.map((stage) => <option key={stage.id} value={stage.numero}>{stage.nome}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
            <input type="checkbox" checked={field.required} onChange={() => onUpdate({ required: !field.required })} className="h-4 w-4 accent-blue-600" />
            Obrigatório
          </label>
          <button onClick={onDuplicate} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" title="Duplicar"><Copy className="h-4 w-4" /></button>
          <button onClick={onRemove} className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600" title="Excluir"><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>
    </article>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-b-0">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-semibold text-slate-950">{value}</dd>
    </div>
  );
}
