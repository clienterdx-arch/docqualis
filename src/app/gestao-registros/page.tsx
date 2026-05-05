"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Archive,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  FileCheck2,
  FileText,
  GitBranch,
  LayoutGrid,
  Loader2,
  PenLine,
  Plus,
  QrCode,
  Search,
  Send,
  XCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { carregarPerfilUsuario } from "@/lib/perfil";

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

function fmt(value: string): string {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("pt-BR");
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

export default function GestaoRegistrosPage() {
  const router = useRouter();
  const [tab, setTab] = useState<MainTab>("templates");
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [usuarioNome, setUsuarioNome] = useState("Usuário");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [expandedRegistro, setExpandedRegistro] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      if (!data.session) {
        router.push("/login");
        return;
      }

      const perfil = await carregarPerfilUsuario<{ empresa_id?: string | null; nome?: string | null }>(
        data.session,
        "empresa_id, nome"
      );

      if (!active) return;
      if (!perfil?.empresa_id) {
        setMessage({ type: "error", text: "Não foi possível identificar a empresa vinculada ao usuário." });
        setIsLoading(false);
        return;
      }

      setEmpresaId(perfil.empresa_id);
      setUsuarioNome(perfil.nome ?? data.session.user.email ?? "Usuário");
    });

    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    if (!empresaId) return;
    let active = true;
    setIsLoading(true);

    Promise.all([
      supabase.from("registros_templates").select("*").eq("empresa_id", empresaId).order("created_at", { ascending: false }),
      supabase.from("registros_preenchidos").select("*").eq("empresa_id", empresaId).order("created_at", { ascending: false }),
    ]).then(([templateResponse, registrosResponse]) => {
      if (!active) return;

      if (templateResponse.error || registrosResponse.error) {
        setMessage({ type: "error", text: "Não foi possível carregar os registros da empresa." });
        setIsLoading(false);
        return;
      }

      const mappedTemplates = (templateResponse.data ?? []).map((row) => mapTemplate(row as Record<string, unknown>));
      const templateMap = new Map(mappedTemplates.map((template) => [template.id, template]));
      const mappedRegistros = (registrosResponse.data ?? []).map((row) => mapRegistro(row as Record<string, unknown>, templateMap));

      setTemplates(mappedTemplates);
      setRegistros(mappedRegistros);
      setIsLoading(false);
    });

    return () => {
      active = false;
    };
  }, [empresaId, refreshKey]);

  async function changeTemplateStatus(id: string, status: TemplateStatus) {
    if (!empresaId) return;
    const { error } = await supabase
      .from("registros_templates")
      .update({ status })
      .eq("empresa_id", empresaId)
      .eq("id", id);

    if (error) {
      setMessage({ type: "error", text: "Não foi possível atualizar o template." });
      return;
    }

    setMessage({
      type: "success",
      text: status === "APROVADO" ? "Template aprovado e disponível no repositório." : "Status do template atualizado.",
    });
    setRefreshKey((key) => key + 1);
  }

  async function startRecord(templateId: string) {
    if (!empresaId) return;
    const template = templates.find((item) => item.id === templateId);
    if (!template) return;

    const { error } = await supabase.from("registros_preenchidos").insert({
      empresa_id: empresaId,
      template_id: templateId,
      template_titulo: template.titulo,
      status: "EM_PREENCHIMENTO",
      preenchido_por: usuarioNome,
      dados: { _etapa_atual: 1 },
      historico: [{ etapa: 1, acao: "Registro iniciado", por: usuarioNome, em: new Date().toISOString() }],
      risk_score: 0,
      flag_revisao_humana: false,
    });

    if (error) {
      setMessage({ type: "error", text: "Não foi possível iniciar o preenchimento." });
      return;
    }

    setMessage({ type: "success", text: "Registro iniciado. Continue pela aba Registros cadastrados." });
    setTab("registros");
    setRefreshKey((key) => key + 1);
  }

  async function concludeRecord(id: string) {
    if (!empresaId) return;
    const registro = registros.find((item) => item.id === id);
    const historico = [
      ...(registro?.historico ?? []),
      { etapa: registro?.etapa_atual ?? 1, acao: "Registro concluído", por: usuarioNome, em: new Date().toISOString() },
    ];

    const { error } = await supabase
      .from("registros_preenchidos")
      .update({ status: "CONCLUIDO", approved_at: new Date().toISOString(), historico })
      .eq("empresa_id", empresaId)
      .eq("id", id);

    if (error) {
      setMessage({ type: "error", text: "Não foi possível concluir o registro." });
      return;
    }

    setMessage({ type: "success", text: "Registro concluído com rastreabilidade atualizada." });
    setRefreshKey((key) => key + 1);
  }

  function showQrCode(template: Template) {
    const url = `${window.location.origin}/gestao-registros?template=${template.id}`;
    window.prompt("Link para gerar QR Code do formulário:", url);
  }

  const pipelineList = useMemo(() => templates.filter((template) => template.status !== "APROVADO"), [templates]);
  const repositorioList = useMemo(() => templates.filter((template) => template.status === "APROVADO"), [templates]);
  const pendingCount = pipelineList.filter((template) => template.status === "EM_APROVACAO").length;

  const term = search.trim().toLowerCase();
  const filteredTemplates = templates.filter((template) =>
    !term ||
    template.titulo.toLowerCase().includes(term) ||
    template.categoria.toLowerCase().includes(term) ||
    template.setor.toLowerCase().includes(term)
  );
  const filteredPipeline = pipelineList.filter((template) =>
    !term || template.titulo.toLowerCase().includes(term) || template.responsavel.toLowerCase().includes(term)
  );
  const filteredRepositorio = repositorioList.filter((template) =>
    !term || template.titulo.toLowerCase().includes(term) || template.categoria.toLowerCase().includes(term)
  );
  const filteredRegistros = registros.filter((registro) =>
    !term ||
    registro.template_titulo.toLowerCase().includes(term) ||
    registro.preenchido_por.toLowerCase().includes(term)
  );

  const cards = [
    {
      key: "templates" as MainTab,
      title: "Templates",
      description: "Modelos de formulários criados pela Qualidade",
      count: templates.length,
      icon: FileText,
      tone: "green",
    },
    {
      key: "pipeline" as MainTab,
      title: "Pipeline de templates",
      description: "Aprovação, revisão e rejeições",
      count: pipelineList.length,
      icon: GitBranch,
      tone: "blue",
    },
    {
      key: "repositorio" as MainTab,
      title: "Repositório de registros",
      description: "Templates aprovados prontos para uso",
      count: repositorioList.length,
      icon: Archive,
      tone: "slate",
    },
    {
      key: "registros" as MainTab,
      title: "Registros cadastrados",
      description: "Preenchimentos, conclusão e rastreabilidade",
      count: registros.length,
      icon: ClipboardCheck,
      tone: "purple",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-7">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Gestão de Registros</h1>
            <p className="mt-1 text-sm text-slate-500">Crie formulários, aprove templates e acompanhe registros com rastreabilidade ponta a ponta.</p>
          </div>
          <button
            onClick={() => router.push("/novo-template")}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" /> Criar template
          </button>
        </header>

        {message && (
          <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-semibold ${message.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
            {message.type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
            {message.text}
            <button className="ml-auto opacity-60 transition hover:opacity-100" onClick={() => setMessage(null)}>x</button>
          </div>
        )}

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <ModuleCard
              key={card.key}
              active={tab === card.key}
              title={card.title}
              description={card.description}
              count={card.count}
              icon={card.icon}
              tone={card.tone}
              onClick={() => setTab(card.key)}
            />
          ))}
        </section>

        <section className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">{cards.find((card) => card.key === tab)?.title}</h2>
              <p className="text-sm text-slate-500">{cards.find((card) => card.key === tab)?.description}</p>
            </div>
            <div className="relative w-full lg:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nome, setor ou responsável..."
                className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20 text-blue-600">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              <span className="text-sm font-semibold">Carregando registros...</span>
            </div>
          ) : (
            <>
              {tab === "templates" && (
                filteredTemplates.length === 0 ? (
                  <Empty icon={FileText} title="Nenhum template encontrado" description="Crie o primeiro modelo de formulário para começar." />
                ) : (
                  <TemplateGrid templates={filteredTemplates} />
                )
              )}

              {tab === "pipeline" && (
                filteredPipeline.length === 0 ? (
                  <Empty icon={GitBranch} title="Pipeline vazio" description="Templates enviados para aprovação ou rejeitados aparecerão aqui." />
                ) : (
                  <PipelineTable templates={filteredPipeline} onChangeStatus={changeTemplateStatus} />
                )
              )}

              {tab === "repositorio" && (
                filteredRepositorio.length === 0 ? (
                  <Empty icon={Archive} title="Nenhum template aprovado" description="Aprove templates no pipeline para liberá-los para preenchimento." />
                ) : (
                  <RepositoryGrid templates={filteredRepositorio} onStart={startRecord} onQrCode={showQrCode} />
                )
              )}

              {tab === "registros" && (
                filteredRegistros.length === 0 ? (
                  <Empty icon={ClipboardCheck} title="Nenhum registro cadastrado" description="Inicie um preenchimento pelo repositório para acompanhar aqui." />
                ) : (
                  <RegistrosTable
                    registros={filteredRegistros}
                    templates={templates}
                    expandedRegistro={expandedRegistro}
                    onToggleTrace={setExpandedRegistro}
                    onConclude={concludeRecord}
                    onMessage={setMessage}
                  />
                )
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function ModuleCard({
  active,
  title,
  description,
  count,
  icon: Icon,
  tone,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  count: number;
  icon: React.ElementType;
  tone: string;
  onClick: () => void;
}) {
  const toneClass: Record<string, string> = {
    green: "bg-emerald-50 text-emerald-600",
    blue: "bg-blue-50 text-blue-600",
    slate: "bg-slate-50 text-slate-600",
    purple: "bg-violet-50 text-violet-600",
  };

  return (
    <button
      onClick={onClick}
      className={`min-h-[126px] rounded-xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${active ? "border-blue-300 ring-4 ring-blue-50" : "border-slate-200"}`}
    >
      <div className="flex items-start justify-between gap-4">
        <span className={`grid h-10 w-10 place-items-center rounded-lg ${toneClass[tone] ?? toneClass.blue}`}>
          <Icon className="h-5 w-5" />
        </span>
        <span className="text-3xl font-semibold tabular-nums text-slate-950">{count}</span>
      </div>
      <h3 className="mt-4 text-xs font-extrabold uppercase tracking-normal text-slate-950">{title}</h3>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
    </button>
  );
}

function TemplateGrid({ templates }: { templates: Template[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {templates.map((template) => {
        const status = TEMPLATE_STATUS[template.status];
        return (
          <article key={template.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200">
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${status.style}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
              {status.label}
            </span>
            <h3 className="mt-3 text-base font-semibold text-slate-900">{template.titulo}</h3>
            <p className="mt-1 text-xs text-slate-500">{template.categoria} · {template.setor}</p>
            <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1"><LayoutGrid className="h-3.5 w-3.5" /> {template.campos.length} campos</span>
              <span className="flex items-center gap-1"><GitBranch className="h-3.5 w-3.5" /> {template.etapas.length} etapa(s)</span>
            </div>
            <div className="mt-4 border-t border-slate-100 pt-4 text-xs text-slate-400">
              Criado por {template.responsavel || "-"} · {fmt(template.created_at)}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function PipelineTable({
  templates,
  onChangeStatus,
}: {
  templates: Template[];
  onChangeStatus: (id: string, status: TemplateStatus) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
          <tr>
            <th className="px-5 py-3">Template</th>
            <th className="px-5 py-3">Setor</th>
            <th className="px-5 py-3">Status</th>
            <th className="px-5 py-3">Responsável</th>
            <th className="px-5 py-3">Data</th>
            <th className="px-5 py-3 text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {templates.map((template) => {
            const status = TEMPLATE_STATUS[template.status];
            return (
              <tr key={template.id} className="hover:bg-slate-50">
                <td className="px-5 py-4 font-semibold text-slate-900">{template.titulo}</td>
                <td className="px-5 py-4 text-slate-500">{template.setor}</td>
                <td className="px-5 py-4">
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${status.style}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                    {status.label}
                  </span>
                </td>
                <td className="px-5 py-4 text-slate-500">{template.responsavel || "-"}</td>
                <td className="px-5 py-4 text-slate-500">{fmt(template.created_at)}</td>
                <td className="px-5 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    {template.status === "EM_APROVACAO" && (
                      <>
                        <button onClick={() => onChangeStatus(template.id, "APROVADO")} className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Aprovar
                        </button>
                        <button onClick={() => onChangeStatus(template.id, "REJEITADO")} className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100">
                          <XCircle className="h-3.5 w-3.5" /> Rejeitar
                        </button>
                      </>
                    )}
                    {template.status === "REJEITADO" && (
                      <button onClick={() => onChangeStatus(template.id, "EM_APROVACAO")} className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-100">
                        <Send className="h-3.5 w-3.5" /> Reenviar
                      </button>
                    )}
                    {template.status === "RASCUNHO" && (
                      <button onClick={() => onChangeStatus(template.id, "EM_APROVACAO")} className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100">
                        <Send className="h-3.5 w-3.5" /> Enviar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RepositoryGrid({
  templates,
  onStart,
  onQrCode,
}: {
  templates: Template[];
  onStart: (templateId: string) => void;
  onQrCode: (template: Template) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {templates.map((template) => (
        <article key={template.id} className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Disponível
            </span>
            <h3 className="mt-3 text-base font-semibold text-slate-900">{template.titulo}</h3>
            <p className="mt-1 text-xs text-slate-500">{template.categoria} · {template.setor}</p>
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1"><LayoutGrid className="h-3.5 w-3.5" /> {template.campos.length} campos</span>
            <span className="flex items-center gap-1"><GitBranch className="h-3.5 w-3.5" /> {template.etapas.length} etapa(s)</span>
          </div>
          <div className="mt-auto grid grid-cols-[1fr_1fr_auto] gap-2 border-t border-slate-100 pt-3">
            <button className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
              <Eye className="h-3.5 w-3.5" /> Visualizar
            </button>
            <button onClick={() => onStart(template.id)} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 py-2 text-xs font-semibold text-white hover:bg-blue-700">
              <PenLine className="h-3.5 w-3.5" /> Preencher
            </button>
            <button onClick={() => onQrCode(template)} className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50" title="Gerar QR Code">
              <QrCode className="h-3.5 w-3.5" />
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

function RegistrosTable({
  registros,
  templates,
  expandedRegistro,
  onToggleTrace,
  onConclude,
  onMessage,
}: {
  registros: Registro[];
  templates: Template[];
  expandedRegistro: string | null;
  onToggleTrace: (id: string | null) => void;
  onConclude: (id: string) => void;
  onMessage: (message: { type: "success" | "error"; text: string }) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
          <tr>
            <th className="px-5 py-3">Registro</th>
            <th className="px-5 py-3">Etapa</th>
            <th className="px-5 py-3">Status</th>
            <th className="px-5 py-3">Preenchido por</th>
            <th className="px-5 py-3">Início</th>
            <th className="px-5 py-3 text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {registros.map((registro) => {
            const status = REGISTRO_STATUS[registro.status];
            const isOpen = expandedRegistro === registro.id;
            const template = templates.find((item) => item.id === registro.template_id);
            return (
              <React.Fragment key={registro.id}>
                <tr className="hover:bg-slate-50">
                  <td className="px-5 py-4 font-semibold text-slate-900">{registro.template_titulo}</td>
                  <td className="px-5 py-4 text-slate-500">{template ? `${registro.etapa_atual} / ${template.etapas.length}` : `Etapa ${registro.etapa_atual}`}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${status.style}`}>{status.label}</span>
                  </td>
                  <td className="px-5 py-4 text-slate-500">{registro.preenchido_por || "-"}</td>
                  <td className="px-5 py-4 text-slate-500">{fmt(registro.created_at)}</td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => onToggleTrace(isOpen ? null : registro.id)} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100">
                        Rastreabilidade
                      </button>
                      {registro.status === "EM_PREENCHIMENTO" && (
                        <>
                          <button onClick={() => onMessage({ type: "success", text: "Preenchimento retomado. Editor do registro será aberto na próxima etapa." })} className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100">
                            <PenLine className="h-3.5 w-3.5" /> Continuar
                          </button>
                          <button onClick={() => onConclude(registro.id)} className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100">
                            <FileCheck2 className="h-3.5 w-3.5" /> Concluir
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
                {isOpen && (
                  <tr>
                    <td colSpan={6} className="bg-slate-50 px-5 py-5">
                      <p className="mb-4 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Rastreabilidade ponta a ponta</p>
                      {registro.historico.length === 0 ? (
                        <p className="text-xs italic text-slate-400">Sem eventos registrados.</p>
                      ) : (
                        <div className="space-y-0">
                          {registro.historico.map((event, index) => (
                            <div key={`${event.em}-${index}`} className="flex items-start gap-3 pb-4 last:pb-0">
                              <div className="flex shrink-0 flex-col items-center">
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600">
                                  <span className="h-2 w-2 rounded-full bg-white" />
                                </span>
                                {index < registro.historico.length - 1 && <span className="mt-1 min-h-4 flex-1 bg-slate-200" style={{ width: 1 }} />}
                              </div>
                              <div className="flex-1 pb-1">
                                <p className="text-xs font-semibold text-slate-800">{event.acao}</p>
                                <p className="mt-0.5 text-[11px] text-slate-500">{event.por} · Etapa {event.etapa} · {fmt(event.em)}</p>
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
  );
}

function Empty({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-xl bg-blue-50">
        <Icon className="h-6 w-6 text-blue-600" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-800">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>
    </div>
  );
}
