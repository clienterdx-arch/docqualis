"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Send, AlertCircle, CheckCircle2,
  Users, Plus, Trash2, FileText, Megaphone, Loader2, Save,
  LayoutGrid, MessageSquare, Hash, CalendarClock, List,
  CheckSquare, Camera, PenTool, AlignLeft, GitBranch, UserCheck,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { carregarPerfilUsuario } from "@/lib/perfil";

/* ─── Types ──────────────────────────────────────────────── */
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

const FIELD_TYPES: { type: FieldType; label: string; icon: React.ElementType }[] = [
  { type: "texto",           label: "Texto curto",     icon: MessageSquare },
  { type: "texto_longo",    label: "Texto longo",     icon: AlignLeft     },
  { type: "numero",         label: "Número",          icon: Hash          },
  { type: "data",           label: "Data",            icon: CalendarClock },
  { type: "selecao",        label: "Seleção",         icon: List          },
  { type: "multipla_escolha", label: "Múltipla escolha", icon: CheckSquare },
  { type: "foto",           label: "Foto / Arquivo",  icon: Camera        },
  { type: "assinatura",     label: "Assinatura",      icon: PenTool       },
];

function uid() { return Math.random().toString(36).slice(2, 9); }

/* ─── Page ───────────────────────────────────────────────── */
export default function NovoTemplatePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(1);

  const [empresaId, setEmpresaId]     = useState<string | null>(null);
  const [usuarioNome, setUsuarioNome] = useState("Usuário");
  const [dbUsuarios, setDbUsuarios]   = useState<{ nome: string; cargo?: string }[]>([]);
  const [isCarregando, setIsCarregando] = useState(true);
  const [isLoading, setIsLoading]     = useState(false);
  const [erro, setErro]               = useState<string | null>(null);
  const [sucesso, setSucesso]         = useState(false);

  // Step 1
  const [titulo, setTitulo]         = useState("");
  const [categoria, setCategoria]   = useState("");
  const [setor, setSetor]           = useState("");

  // Step 2
  const [etapas, setEtapas]         = useState<EtapaTemplate[]>([{ id: uid(), numero: 1, nome: "Etapa 1" }]);
  const [campos, setCampos]         = useState<FormField[]>([]);
  const [etapaAtiva, setEtapaAtiva] = useState(1);

  // Step 3
  const [aprovadores, setAprovadores]       = useState<string[]>([]);
  const [aprovadorInput, setAprovadorInput] = useState("");

  // Step 4
  const [alvos, setAlvos]           = useState<string[]>([]);
  const [exigeCiente, setExigeCiente] = useState(false);

  /* ── Session ──────────────────────────────────────────── */
  useEffect(() => {
    let active = true;
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }

      const perfil = await carregarPerfilUsuario<{ empresa_id?: string | null; nome?: string | null }>(
        session, "empresa_id, nome"
      );
      if (!active) return;
      if (!perfil?.empresa_id) {
        setErro("Empresa não identificada. Verifique seu perfil.");
        setIsCarregando(false);
        return;
      }
      setEmpresaId(perfil.empresa_id);
      setUsuarioNome(perfil.nome ?? session.user.email ?? "Usuário");

      const { data: uData } = await supabase
        .from("perfis").select("nome, cargo").eq("empresa_id", perfil.empresa_id).order("nome");
      if (active) setDbUsuarios(uData ?? []);
      if (active) setIsCarregando(false);
    };
    init();
    return () => { active = false; };
  }, [router]);

  /* ── Helpers ──────────────────────────────────────────── */
  function addField(type: FieldType) {
    setCampos((c) => [...c, {
      id: uid(), type, required: false, etapa: etapaAtiva,
      label: FIELD_TYPES.find((f) => f.type === type)?.label ?? "Campo",
      options: type === "selecao" || type === "multipla_escolha" ? ["Opção 1", "Opção 2"] : undefined,
    }]);
  }

  function addEtapa() {
    const n = etapas.length + 1;
    setEtapas((e) => [...e, { id: uid(), numero: n, nome: `Etapa ${n}` }]);
    setEtapaAtiva(n);
  }

  function addAprovador() {
    const v = aprovadorInput.trim();
    if (v && !aprovadores.includes(v)) {
      setAprovadores((a) => [...a, v]);
      setAprovadorInput("");
    }
  }

  /* ── Save ─────────────────────────────────────────────── */
  async function salvar(status: "RASCUNHO" | "EM_APROVACAO") {
    setErro(null);
    if (!empresaId) { setErro("Empresa não identificada."); return; }
    if (!titulo.trim()) { setErro("Informe o título do formulário."); return; }

    setIsLoading(true);
    const { error } = await supabase.from("registros_templates").insert({
      empresa_id: empresaId,
      titulo: titulo.trim(),
      categoria: categoria.trim() || "Geral",
      setor: setor.trim() || "Geral",
      status,
      campos,
      versao_major: 1, versao_minor: 0, versao_patch: 0,
      responsavel: usuarioNome,
      workflow: { engine: "STAGES", etapas, aprovadores_template: aprovadores },
    });
    setIsLoading(false);

    if (error) { setErro("Não foi possível salvar. Verifique as migrations do banco."); return; }
    setSucesso(true);
    setTimeout(() => router.push("/gestao-registros"), 1500);
  }

  /* ── Loading ──────────────────────────────────────────── */
  if (isCarregando) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-400 font-bold">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <p>Carregando...</p>
      </div>
    );
  }

  const etapaAtualObj = etapas.find((e) => e.numero === etapaAtiva);
  const camposDaEtapa = campos.filter((c) => c.etapa === etapaAtiva);

  /* ── Render ───────────────────────────────────────────── */
  return (
    <div className="max-w-5xl mx-auto p-6 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/gestao-registros"
          className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 shadow-sm transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Criar Novo Formulário</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Defina campos, etapas e fluxo de aprovação.</p>
        </div>
      </div>

      {/* Alert */}
      {(erro || sucesso) && (
        <div className={`mb-6 p-4 rounded-xl border flex items-center gap-3 text-sm font-semibold animate-in slide-in-from-top-4 ${erro ? "bg-red-50 border-red-200 text-red-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"}`}>
          {erro ? <AlertCircle className="w-5 h-5 shrink-0" /> : <CheckCircle2 className="w-5 h-5 shrink-0" />}
          {erro ?? "Salvo com sucesso! Redirecionando..."}
        </div>
      )}

      {/* Card */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[600px]">

        {/* Tab bar */}
        <div className="flex border-b border-slate-100 bg-slate-50 overflow-x-auto">
          {[
            { step: 1, icon: <FileText className="w-4 h-4" />,    title: "Identificação" },
            { step: 2, icon: <LayoutGrid className="w-4 h-4" />,  title: "Construtor"    },
            { step: 3, icon: <Users className="w-4 h-4" />,       title: "Aprovação"     },
            { step: 4, icon: <Megaphone className="w-4 h-4" />,   title: "Publicação"    },
          ].map(({ step, icon, title }) => (
            <button
              key={step}
              onClick={() => setActiveTab(step)}
              className={`flex-1 flex items-center justify-center gap-3 p-5 transition-all border-b-2 font-bold text-sm outline-none ${activeTab === step ? "bg-white border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-700"}`}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] transition-colors ${activeTab === step ? "bg-blue-600 text-white shadow-md shadow-blue-200" : "bg-slate-200 text-slate-500"}`}>
                {step}
              </span>
              <div className="flex items-center gap-2">
                <span className={activeTab === step ? "text-blue-600" : "text-slate-400"}>{icon}</span>
                <span className="hidden md:inline">{title}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-8 flex-1">

          {/* ── ABA 1: Identificação ─────────────────────── */}
          {activeTab === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <Field label="Título do Formulário" required>
                    <input
                      value={titulo}
                      onChange={(e) => setTitulo(e.target.value)}
                      placeholder="Ex: Checklist de Inspeção de EPI"
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-bold shadow-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    />
                  </Field>
                </div>
                <Field label="Categoria">
                  <input
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    placeholder="Ex: Segurança do Trabalho"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm shadow-sm outline-none focus:border-blue-500 transition-all"
                  />
                </Field>
                <Field label="Setor / Unidade">
                  <input
                    value={setor}
                    onChange={(e) => setSetor(e.target.value)}
                    placeholder="Ex: Produção"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm shadow-sm outline-none focus:border-blue-500 transition-all"
                  />
                </Field>
              </div>

              <div className="p-5 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
                <p className="font-bold mb-1">Formulários com etapas e aprovações intermediárias</p>
                <p className="leading-6 text-blue-600">
                  No próximo passo você pode dividir o formulário em etapas e definir um aprovador entre elas.
                  A próxima etapa só será liberada após a aprovação do responsável definido.
                </p>
              </div>
            </div>
          )}

          {/* ── ABA 2: Construtor ────────────────────────── */}
          {activeTab === 2 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4">

              {/* Stage tabs */}
              <div className="flex items-center gap-2 flex-wrap">
                {etapas.map((etapa) => (
                  <button
                    key={etapa.id}
                    onClick={() => setEtapaAtiva(etapa.numero)}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${etapaAtiva === etapa.numero ? "bg-blue-600 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
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

              {/* Approver gate (não exibe na etapa 1) */}
              {etapaAtualObj && etapaAtualObj.numero > 1 && (
                <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <GitBranch className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">Aprovador antes desta etapa</p>
                    <p className="text-xs text-amber-600 mt-0.5 mb-3">Esta etapa só será liberada após a aprovação abaixo.</p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <select
                        value={etapaAtualObj.aprovador ?? ""}
                        onChange={(e) => setEtapas((prev) => prev.map((et) =>
                          et.id === etapaAtualObj.id ? { ...et, aprovador: e.target.value } : et
                        ))}
                        className="flex-1 h-10 px-3 bg-white border border-amber-200 rounded-lg text-sm outline-none focus:border-amber-400"
                      >
                        <option value="">Selecione o aprovador...</option>
                        {dbUsuarios.map((u) => (
                          <option key={u.nome} value={u.nome}>
                            {u.nome}{u.cargo ? ` — ${u.cargo}` : ""}
                          </option>
                        ))}
                      </select>
                      <input
                        value={etapaAtualObj.nome}
                        onChange={(e) => setEtapas((prev) => prev.map((et) =>
                          et.id === etapaAtualObj.id ? { ...et, nome: e.target.value } : et
                        ))}
                        placeholder="Nome desta etapa"
                        className="w-full sm:w-52 h-10 px-3 bg-white border border-amber-200 rounded-lg text-sm outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="grid gap-5 xl:grid-cols-[1fr_220px]">
                {/* Field list */}
                <div className="space-y-2">
                  <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-widest">
                    Campos de {etapaAtualObj?.nome ?? `Etapa ${etapaAtiva}`}
                  </p>
                  {camposDaEtapa.length === 0 && (
                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-10 text-center text-sm text-slate-400">
                      Adicione campos usando os botões ao lado →
                    </div>
                  )}
                  {camposDaEtapa.map((campo, idx) => {
                    const ft = FIELD_TYPES.find((f) => f.type === campo.type);
                    return (
                      <div key={campo.id} className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
                        <span className="grid h-7 w-7 place-items-center rounded-lg bg-blue-50 text-xs font-bold text-blue-700 shrink-0">
                          {idx + 1}
                        </span>
                        <input
                          value={campo.label}
                          onChange={(e) => setCampos((prev) => prev.map((f) =>
                            f.id === campo.id ? { ...f, label: e.target.value } : f
                          ))}
                          className="flex-1 text-sm font-semibold outline-none bg-transparent"
                        />
                        {ft && (
                          <span className="hidden sm:flex items-center gap-1 px-2.5 py-1 bg-slate-100 rounded-full text-xs text-slate-500 font-medium shrink-0">
                            <ft.icon className="w-3 h-3" /> {ft.label}
                          </span>
                        )}
                        <button
                          onClick={() => setCampos((prev) => prev.map((f) =>
                            f.id === campo.id ? { ...f, required: !f.required } : f
                          ))}
                          className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-bold transition-colors ${campo.required ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}`}
                        >
                          {campo.required ? "Obrigatório" : "Opcional"}
                        </button>
                        <button
                          onClick={() => setCampos((prev) => prev.filter((f) => f.id !== campo.id))}
                          className="text-slate-300 hover:text-red-500 shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Field type buttons */}
                <aside className="space-y-2">
                  <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-widest">Adicionar campo</p>
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

          {/* ── ABA 3: Aprovação do Template ─────────────── */}
          {activeTab === 3 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-1">
                  <UserCheck className="w-4 h-4 text-blue-500" /> Aprovadores do Formulário
                </h3>
                <p className="text-sm text-slate-500 mb-6">
                  Estas pessoas precisam aprovar o formulário antes que ele fique disponível no Repositório.
                </p>

                <div className="flex flex-col md:flex-row gap-3 items-end mb-4">
                  <div className="flex-1">
                    <Field label="Selecionar aprovador">
                      <select
                        value={aprovadorInput}
                        onChange={(e) => setAprovadorInput(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-bold shadow-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">Selecione...</option>
                        {dbUsuarios.map((u) => (
                          <option key={u.nome} value={u.nome}>
                            {u.nome}{u.cargo ? ` — ${u.cargo}` : ""}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  <button
                    onClick={addAprovador}
                    className="w-full md:w-auto px-5 py-2.5 bg-slate-100 text-slate-700 hover:bg-blue-100 hover:text-blue-700 transition-colors font-bold rounded-lg text-sm flex items-center justify-center gap-2 h-[42px]"
                  >
                    <Plus className="w-4 h-4" /> Adicionar
                  </button>
                </div>

                {aprovadores.length > 0 ? (
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-100 border-b border-slate-200 text-[10px] uppercase font-black text-slate-600 tracking-widest">
                        <tr>
                          <th className="p-4">Aprovador</th>
                          <th className="p-4 text-right">Remover</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {aprovadores.map((ap) => (
                          <tr key={ap} className="hover:bg-slate-50">
                            <td className="p-4 font-bold text-slate-800">{ap}</td>
                            <td className="p-4 text-right">
                              <button
                                onClick={() => setAprovadores((prev) => prev.filter((a) => a !== ap))}
                                className="text-red-400 hover:text-red-600 p-1"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic">
                    Nenhum aprovador adicionado. O formulário poderá ser publicado diretamente.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── ABA 4: Publicação ────────────────────────── */}
          {activeTab === 4 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-4">Público alvo do formulário</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {["Apenas o Setor de Origem", "Todo o Corpo Clínico", "Toda a Liderança", "Área Administrativa", "Comitê da Qualidade"].map((alvo) => (
                      <label
                        key={alvo}
                        className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-all ${alvos.includes(alvo) ? "bg-blue-50 border-blue-300" : "bg-white border-slate-200 hover:border-blue-200"}`}
                      >
                        <input
                          type="checkbox"
                          checked={alvos.includes(alvo)}
                          onChange={() => setAlvos((prev) => prev.includes(alvo) ? prev.filter((x) => x !== alvo) : [...prev, alvo])}
                          className="w-4 h-4 accent-blue-600"
                        />
                        <span className="text-sm font-bold text-slate-700">{alvo}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <label className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={exigeCiente}
                      onChange={() => setExigeCiente(!exigeCiente)}
                      className="w-5 h-5 accent-blue-600"
                    />
                    <div>
                      <span className="block text-sm font-bold text-slate-800">Exigir confirmação de leitura</span>
                      <span className="block text-xs font-medium text-slate-500 mt-0.5">
                        Os responsáveis pelo preenchimento deverão confirmar ciência antes de iniciar.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Resumo */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-sm space-y-2 text-slate-600">
                <p><strong className="text-slate-800">Formulário:</strong> {titulo || "—"}</p>
                <p><strong className="text-slate-800">Categoria:</strong> {categoria || "Geral"}</p>
                <p><strong className="text-slate-800">Setor:</strong> {setor || "Geral"}</p>
                <p><strong className="text-slate-800">Etapas:</strong> {etapas.length}</p>
                <p><strong className="text-slate-800">Campos:</strong> {campos.length}</p>
                <p><strong className="text-slate-800">Aprovadores:</strong> {aprovadores.length > 0 ? aprovadores.join(", ") : "Nenhum"}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex gap-3 w-full md:w-auto">
            <button
              disabled={activeTab === 1}
              onClick={() => setActiveTab((s) => Math.max(1, s - 1))}
              className="px-5 py-2.5 bg-white border border-slate-300 text-slate-600 font-bold rounded-lg text-sm shadow-sm hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Voltar
            </button>
            <button
              onClick={() => salvar("RASCUNHO")}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-slate-300 text-slate-700 font-bold rounded-lg text-sm shadow-sm hover:bg-slate-100 transition-all"
            >
              <Save className="w-4 h-4 text-slate-500" /> Salvar como Rascunho
            </button>
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            {activeTab < 4 ? (
              <button
                onClick={() => setActiveTab((s) => Math.min(4, s + 1))}
                className="w-full md:w-auto px-6 py-2.5 bg-slate-800 text-white font-bold rounded-lg text-sm hover:bg-slate-900 shadow-md transition-colors"
              >
                Próxima Etapa
              </button>
            ) : (
              <button
                onClick={() => salvar("EM_APROVACAO")}
                disabled={isLoading}
                className="w-full md:w-auto px-8 py-2.5 bg-blue-600 text-white font-bold rounded-lg text-sm shadow-lg hover:bg-blue-700 flex items-center justify-center gap-2 transition-all disabled:opacity-70"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {isLoading ? "Enviando..." : "Enviar para Aprovação"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Helper ─────────────────────────────────────────────── */
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="w-full">
      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 flex items-center gap-1">
        {label} {required && <span className="text-red-500 text-sm leading-none">*</span>}
      </label>
      {children}
    </div>
  );
}
