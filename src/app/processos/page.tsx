"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ChevronRight,
  Clock3,
  Cpu,
  FileCheck,
  FileEdit,
  FolderArchive,
  Network,
  Plus,
  Search,
  Sparkles,
  Workflow,
} from "lucide-react";
import { useRouter } from "next/navigation";

type ViewState = "home" | "dashboard" | "list";
type ModuloAtivo = "SIPOC" | "BPMN";
type PastaStatus =
  | "EM_ELABORACAO"
  | "EM_VERIFICACAO"
  | "REPOSITORIO"
  | "OBSOLETO";

type ProcessoItem = {
  id: string;
  code: string;
  name: string;
  owner: string;
  version: number;
  module: ModuloAtivo;
  status: PastaStatus;
  updatedAt?: string;
};

function cn(...items: Array<string | false | null | undefined>) {
  return items.filter(Boolean).join(" ");
}

const STATUS_META: Record<
  PastaStatus,
  {
    label: string;
    badge: string;
    dot: string;
  }
> = {
  REPOSITORIO: {
    label: "Repositório",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  EM_ELABORACAO: {
    label: "Em elaboração",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
  },
  EM_VERIFICACAO: {
    label: "Em verificação",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
  OBSOLETO: {
    label: "Obsoleto",
    badge: "bg-slate-100 text-slate-600 border-slate-200",
    dot: "bg-slate-400",
  },
};

function StatusBadge({ status }: { status: PastaStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest",
        meta.badge
      )}
    >
      <span className={cn("h-2 w-2 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}

function ModuleCard({
  title,
  description,
  count,
  icon,
  accent,
  onClick,
}: {
  title: string;
  description: string;
  count: number;
  icon: React.ReactNode;
  accent: "blue" | "emerald";
  onClick: () => void;
}) {
  const colors =
    accent === "blue"
      ? "hover:border-[#2655e8] hover:ring-4 hover:ring-[#2655e8]/10"
      : "hover:border-emerald-500 hover:ring-4 hover:ring-emerald-500/10";

  const iconBox =
    accent === "blue"
      ? "bg-[#eef2ff] text-[#2655e8] border-[#e0e7ff]"
      : "bg-emerald-50 text-emerald-600 border-emerald-100";

  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-8 text-left shadow-sm transition-all duration-300 hover:-translate-y-1",
        colors
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50/50 to-white opacity-100" />
      <div className="relative">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-2xl border shadow-sm",
              iconBox
            )}
          >
            {icon}
          </div>

          <div className="text-right">
            <div className="text-4xl font-black text-slate-900">{count}</div>
            <div className="text-[11px] font-black uppercase tracking-widest text-slate-400">
              processos
            </div>
          </div>
        </div>

        <h2 className="mb-3 text-2xl font-bold text-slate-900">{title}</h2>
        <p className="max-w-xl text-sm font-medium leading-relaxed text-slate-500">
          {description}
        </p>

        <div className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-[#2655e8] transition-all group-hover:translate-x-1">
          Abrir módulo
          <ChevronRight className="h-4 w-4" />
        </div>
      </div>
    </button>
  );
}

function StatCard({
  title,
  subtitle,
  value,
  icon,
  accent,
  onClick,
}: {
  title: string;
  subtitle: string;
  value: number;
  icon: React.ReactNode;
  accent: "emerald" | "blue" | "amber" | "slate";
  onClick: () => void;
}) {
  const palette = {
    emerald: "bg-emerald-50 border-emerald-100 text-emerald-600",
    blue: "bg-blue-50 border-blue-100 text-[#2655e8]",
    amber: "bg-amber-50 border-amber-100 text-amber-600",
    slate: "bg-slate-100 border-slate-200 text-slate-500",
  }[accent];

  const hoverBorder = {
    emerald: "hover:border-emerald-400",
    blue: "hover:border-[#2655e8]",
    amber: "hover:border-amber-400",
    slate: "hover:border-slate-400",
  }[accent];

  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
        hoverBorder
      )}
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-xl border shadow-sm",
            palette
          )}
        >
          {icon}
        </div>
        <span className="text-4xl font-black text-slate-900">{value}</span>
      </div>

      <p className="text-lg font-bold text-slate-800">{title}</p>
      <p className="mt-1 text-xs font-medium text-slate-500">{subtitle}</p>
    </button>
  );
}

export default function ProcessosPage() {
  const router = useRouter();

  const [viewState, setViewState] = useState<ViewState>("home");
  const [moduloAtivo, setModuloAtivo] = useState<ModuloAtivo>("BPMN");
  const [pastaAtiva, setPastaAtiva] = useState<PastaStatus>("REPOSITORIO");
  const [items, setItems] = useState<ProcessoItem[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sortField, setSortField] = useState<"name" | "code" | "updatedAt">(
    "updatedAt"
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  async function loadItems() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/processos", { cache: "no-store" });

      if (!res.ok) {
        console.error("Erro HTTP ao buscar processos:", res.status);
        setItems([]);
        return;
      }

      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erro ao buscar processos:", error);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadItems();
  }, []);

  const bpmnCount = useMemo(
    () => items.filter((item) => item.module === "BPMN").length,
    [items]
  );

  const sipocCount = useMemo(
    () => items.filter((item) => item.module === "SIPOC").length,
    [items]
  );

  const docsAtuais = useMemo(
    () => items.filter((p) => p.module === moduloAtivo),
    [items, moduloAtivo]
  );

  const counts = useMemo(
    () => ({
      REPOSITORIO: docsAtuais.filter((d) => d.status === "REPOSITORIO").length,
      EM_ELABORACAO: docsAtuais.filter((d) => d.status === "EM_ELABORACAO")
        .length,
      EM_VERIFICACAO: docsAtuais.filter((d) => d.status === "EM_VERIFICACAO")
        .length,
      OBSOLETO: docsAtuais.filter((d) => d.status === "OBSOLETO").length,
    }),
    [docsAtuais]
  );

  const docsFiltrados = useMemo(() => {
    const q = search.trim().toLowerCase();

    const filtered = docsAtuais.filter((p) => {
      const byStatus = p.status === pastaAtiva;
      const bySearch =
        q.length === 0 ||
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.owner.toLowerCase().includes(q);

      return byStatus && bySearch;
    });

    const sorted = [...filtered].sort((a, b) => {
      let result = 0;

      if (sortField === "name") result = a.name.localeCompare(b.name);
      if (sortField === "code") result = a.code.localeCompare(b.code);
      if (sortField === "updatedAt") {
        result = (a.updatedAt || "").localeCompare(b.updatedAt || "");
      }

      return sortDirection === "asc" ? result : -result;
    });

    return sorted;
  }, [docsAtuais, pastaAtiva, search, sortField, sortDirection]);

  async function createNew(module: ModuloAtivo) {
    try {
      const res = await fetch("/api/processos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module }),
      });

      if (!res.ok) {
        throw new Error("Erro ao criar processo");
      }

      const created = await res.json();

      if (module === "BPMN") {
        router.push(`/modelagem?id=${created.id}`);
        return;
      }

      await loadItems();
      setModuloAtivo("SIPOC");
      setViewState("dashboard");
    } catch (error) {
      console.error(error);
      window.alert("Não foi possível criar o processo.");
    }
  }

  function openModule(module: ModuloAtivo) {
    setModuloAtivo(module);
    setViewState("dashboard");
  }

  function openList(status: PastaStatus) {
    setPastaAtiva(status);
    setSearch("");
    setViewState("list");
  }

  function formatDate(value?: string) {
    if (!value) return "—";
    return new Date(value).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  function toggleSort(field: "name" | "code" | "updatedAt") {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }

    setSortField(field);
    setSortDirection("asc");
  }

  return (
    <div className="min-h-screen bg-slate-50/50 p-8 flex flex-col animate-in fade-in duration-500">
      <div className="mx-auto max-w-7xl w-full">
        {viewState === "home" && (
          <>
            <div className="mb-10">
              <div className="mb-4 inline-flex items-center gap-2 rounded-md border border-[#e0e7ff] bg-[#eef2ff] px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-[#2655e8] shadow-sm">
                <Sparkles className="h-3.5 w-3.5" />
                Gestão de processos enterprise
              </div>

              <h1 className="text-4xl font-black tracking-tight text-slate-900">
                Processos & Modelagem
              </h1>
              <p className="mt-3 max-w-3xl text-base font-medium text-slate-500">
                Estruture, modele, publique e governe seus processos com uma
                experiência visual moderna para BPMN e SIPOC.
              </p>
            </div>

            <div className="mb-10 grid grid-cols-1 gap-5 md:grid-cols-3">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total de processos</p>
                  <p className="text-4xl font-black text-slate-900">{items.length}</p>
                </div>
                <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100"><Workflow className="w-6 h-6 text-slate-400"/></div>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#2655e8] mb-1">Modelagens BPMN</p>
                  <p className="text-4xl font-black text-slate-900">{bpmnCount}</p>
                </div>
                <div className="w-12 h-12 bg-[#eef2ff] rounded-xl flex items-center justify-center border border-[#e0e7ff]"><Cpu className="w-6 h-6 text-[#2655e8]"/></div>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">Mapeamentos SIPOC</p>
                  <p className="text-4xl font-black text-slate-900">{sipocCount}</p>
                </div>
                <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center border border-emerald-100"><Network className="w-6 h-6 text-emerald-600"/></div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <ModuleCard
                title="Mapeamento SIPOC"
                description="Visualize cadeia de valor, fornecedores, entradas, saídas, clientes e elementos de governança do processo."
                count={sipocCount}
                icon={<Network className="h-7 w-7" />}
                accent="blue"
                onClick={() => openModule("SIPOC")}
              />

              <ModuleCard
                title="Studio BPMN"
                description="Editor visual com canvas interativo, workflow, salvamento e experiência de diagrama de blocos profissional."
                count={bpmnCount}
                icon={<Cpu className="h-7 w-7" />}
                accent="emerald"
                onClick={() => openModule("BPMN")}
              />
            </div>
          </>
        )}

        {viewState === "dashboard" && (
          <>
            <div className="mb-8 flex flex-wrap items-center gap-4">
              <button
                onClick={() => setViewState("home")}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:border-[#2655e8] hover:text-[#2655e8]"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>

              <div>
                <div className="flex items-center gap-2 mb-1">
                   <span className="text-[10px] font-black uppercase tracking-widest text-[#2655e8] bg-[#eef2ff] px-2 py-0.5 rounded border border-[#e0e7ff]">Módulo Ativo</span>
                </div>
                <h2 className="text-2xl font-black text-slate-900">
                  {moduloAtivo === "SIPOC"
                    ? "Mapeamento SIPOC"
                    : "Modelagem BPMN"}
                </h2>
                <p className="text-sm font-medium text-slate-500 mt-1">
                  {docsAtuais.length} processo(s) cadastrados neste módulo.
                </p>
              </div>

              <div className="ml-auto">
                <button
                  onClick={() => createNew(moduloAtivo)}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#2655e8] px-5 py-3 text-sm font-bold text-white shadow-md transition hover:bg-[#1e40af]"
                >
                  <Plus className="h-4 w-4" />
                  {moduloAtivo === "SIPOC" ? "Novo Mapeamento SIPOC" : "Nova Modelagem BPMN"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Repositório"
                subtitle="Processos vigentes e publicados"
                value={counts.REPOSITORIO}
                icon={<FileCheck className="h-5 w-5" />}
                accent="emerald"
                onClick={() => openList("REPOSITORIO")}
              />

              <StatCard
                title="Em elaboração"
                subtitle="Rascunhos em construção"
                value={counts.EM_ELABORACAO}
                icon={<FileEdit className="h-5 w-5" />}
                accent="blue"
                onClick={() => openList("EM_ELABORACAO")}
              />

              <StatCard
                title="Em verificação"
                subtitle="Fluxos aguardando validação"
                value={counts.EM_VERIFICACAO}
                icon={<AlertCircle className="h-5 w-5" />}
                accent="amber"
                onClick={() => openList("EM_VERIFICACAO")}
              />

              <StatCard
                title="Obsoletos"
                subtitle="Itens arquivados/inativos"
                value={counts.OBSOLETO}
                icon={<FolderArchive className="h-5 w-5" />}
                accent="slate"
                onClick={() => openList("OBSOLETO")}
              />
            </div>
          </>
        )}

        {viewState === "list" && (
          <>
            <div className="mb-6 flex flex-wrap items-center gap-4">
              <button
                onClick={() => setViewState("dashboard")}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:border-[#2655e8] hover:text-[#2655e8]"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>

              <div>
                <h2 className="text-2xl font-black text-slate-900">
                  Base de Processos
                </h2>
                <p className="text-sm font-bold text-slate-500 mt-1">
                  Módulo {moduloAtivo} • Listando <strong className="text-[#2655e8]">{STATUS_META[pastaAtiva].label}</strong>
                </p>
              </div>

              <div className="ml-auto flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar código, nome ou responsável..."
                    className="h-11 w-[320px] rounded-xl border border-slate-200 bg-white shadow-sm pl-10 pr-4 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#2655e8]"
                  />
                </div>

                <button
                  onClick={() => createNew(moduloAtivo)}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#2655e8] px-5 text-sm font-bold text-white shadow-md transition hover:bg-[#1e40af]"
                >
                  <Plus className="h-4 w-4" />
                  Novo
                </button>
              </div>
            </div>

            <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="min-w-full text-left border-collapse whitespace-nowrap">
                  <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 sticky top-0">
                    <tr>
                      <th className="px-6 py-4">
                        <button onClick={() => toggleSort("code")} className="font-black flex items-center gap-1 hover:text-slate-700">
                          Código {sortField === "code" && (sortDirection === "asc" ? "↑" : "↓")}
                        </button>
                      </th>
                      <th className="px-6 py-4">
                        <button onClick={() => toggleSort("name")} className="font-black flex items-center gap-1 hover:text-slate-700">
                          Nome do Processo {sortField === "name" && (sortDirection === "asc" ? "↑" : "↓")}
                        </button>
                      </th>
                      <th className="px-6 py-4">Responsável</th>
                      <th className="px-6 py-4 text-center">Versão</th>
                      <th className="px-6 py-4">
                        <button onClick={() => toggleSort("updatedAt")} className="font-black flex items-center gap-1 hover:text-slate-700">
                          Atualizado em {sortField === "updatedAt" && (sortDirection === "asc" ? "↑" : "↓")}
                        </button>
                      </th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Ação</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 text-sm">
                    {isLoading && (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-sm font-bold text-slate-400">
                          Carregando processos...
                        </td>
                      </tr>
                    )}

                    {!isLoading &&
                      docsFiltrados.map((item) => (
                        <tr key={item.id} className="transition-colors hover:bg-[#eef2ff]/30 group">
                          <td className="px-6 py-5 font-mono font-bold text-[#2655e8]">
                            {item.code}
                          </td>
                          <td className="px-6 py-5">
                            <div className="font-bold text-slate-800">
                              {item.name}
                            </div>
                            <div className="mt-0.5 text-xs font-medium text-slate-500">
                              Módulo {item.module}
                            </div>
                          </td>
                          <td className="px-6 py-5 font-bold text-slate-700">
                            {item.owner}
                          </td>
                          <td className="px-6 py-5 text-center font-bold text-slate-600">
                            v{item.version}
                          </td>
                          <td className="px-6 py-5 font-medium text-slate-500">
                            {formatDate(item.updatedAt)}
                          </td>
                          <td className="px-6 py-5">
                            <StatusBadge status={item.status} />
                          </td>
                          <td className="px-6 py-5 text-right">
                            <button
                              onClick={() => {
                                if (item.module === "BPMN") {
                                  router.push(`/modelagem?id=${item.id}`);
                                  return;
                                }
                                window.alert("O editor SIPOC ainda não foi implementado nesta tela.");
                              }}
                              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 shadow-sm transition-all hover:border-[#2655e8] hover:text-[#2655e8] hover:bg-[#eef2ff]"
                            >
                              <Workflow className="h-3.5 w-3.5" />
                              Abrir
                            </button>
                          </td>
                        </tr>
                      ))}

                    {!isLoading && docsFiltrados.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-sm font-bold text-slate-400">
                          Nenhum processo encontrado para este filtro.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between text-xs font-bold text-slate-400 px-2">
              <span>{docsFiltrados.length} registro(s) encontrado(s)</span>
              <span className="inline-flex items-center gap-1.5 uppercase tracking-wider">
                <Clock3 className="h-3.5 w-3.5" />
                Ordenação: {sortField} / {sortDirection}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}