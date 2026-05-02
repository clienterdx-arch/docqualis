"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FilePlus, Search, FileCheck, Clock, Archive,
  FileSpreadsheet, X, ArrowLeft,
  User, RefreshCw, FileText, CheckCircle2, AlertCircle,
  Edit, History, Plus, Trash2, Layers, BookOpen,
  Building2, Settings, Printer, Copy,
  Workflow, Eye, FileSearch, ShieldCheck,
  ChevronDown, ChevronRight, FolderOpen,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { carregarPerfilUsuario } from "@/lib/perfil";

/* ─────────────────────────────────────────────────────────────────
 * TIPOS
 * ───────────────────────────────────────────────────────────────*/
interface ProcessoItem {
  id: string;
  code: string;
  name: string;
  owner: string;
  version: number;
  module: "SIPOC" | "BPMN";
  status: string;
  setor?: string;
}

interface Documento {
  id: string;
  codigo: string;
  titulo: string;
  tipo_documento: string;
  setor: string;
  diretoria: string;
  elaborador: string;
  aprovador: string;
  verificador_pendente: string;
  status: string;
  versao: number;
  justificativa: string;
  arquivo_url: string;
  dt_elaboracao: string;
  dt_elaboracao_raw?: string | null;
  dt_vencimento: string;
  dt_vencimento_raw?: string | null;
  isProcesso: boolean;
  empresa_id: string;
}

interface MensagemSistema {
  tipo: "sucesso" | "alerta" | "erro";
  texto: string;
}

function normalizarTexto(valor: unknown) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/_/g, " ")
    .toLowerCase()
    .trim();
}

function statusRepositorio(status: string) {
  const atual = normalizarTexto(status);
  return atual.includes("repositorio") || atual.includes("aprovado") || atual.includes("vigente");
}

function statusObsoleto(status: string) {
  const atual = normalizarTexto(status);
  return atual.includes("obsoleto") || atual.includes("arquivado") || atual.includes("fora de vigencia");
}

function statusElaboracao(status: string) {
  const atual = normalizarTexto(status);
  return atual.includes("elaboracao") || atual.includes("em fluxo") || atual === "em fluxo";
}

function statusVerificacao(status: string) {
  return normalizarTexto(status).includes("verificacao");
}

function statusHomologacao(status: string) {
  return normalizarTexto(status).includes("homologacao");
}

function statusRejeitado(status: string) {
  const atual = normalizarTexto(status);
  return atual.includes("rejeitado") || atual.includes("devolvido");
}

/* ─────────────────────────────────────────────────────────────────
 * COMPONENTE PRINCIPAL
 * ───────────────────────────────────────────────────────────────*/
export default function GestaoDocumentosPage() {
  const router = useRouter();
  const [viewState, setViewState] = useState<"blocos" | "lista" | "config" | "inspecao" | "copias">("blocos");
  const [pastaAtiva, setPastaAtiva] = useState<string>("");
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [docSelecionado, setDocSelecionado] = useState<Documento | null>(null);
  const [fichaTab, setFichaTab] = useState<"detalhes" | "historico">("detalhes");
  const [mensagemSistema, setMensagemSistema] = useState<MensagemSistema | null>(null);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filtrosRepositorio, setFiltrosRepositorio] = useState({
    codigo: "",
    nome: "",
    elaborador: "",
    data: "",
    setor: "",
  });

  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [perfilAcesso, setPerfilAcesso] = useState<string | null>(null);
  const [processosRepo, setProcessosRepo] = useState<ProcessoItem[]>([]);
  const [setoresAbertos, setSetoresAbertos] = useState<Set<string>>(new Set());
  const [filtroLateral, setFiltroLateral] = useState<{ setor: string; tipo: string } | null>(null);

  /* ── FEEDBACK ─────────────────────────────────────────────── */
  function mostrarMensagem(tipo: MensagemSistema["tipo"], texto: string) {
    setMensagemSistema({ tipo, texto });
    setTimeout(() => setMensagemSistema(null), 3500);
  }

  function exportarListaMestra() {
    if (documentos.length === 0) {
      mostrarMensagem("alerta", "Nenhum documento encontrado para exportar.");
      return;
    }

    const colunas = ["Codigo", "Titulo", "Tipo", "Diretoria", "Setor", "Status", "Versao", "Elaborador", "Aprovador", "Vencimento"];
    const escaparCsv = (valor: unknown) => `"${String(valor ?? "").replace(/"/g, '""')}"`;
    const linhas = documentos.map((doc) => [
      doc.codigo,
      doc.titulo,
      doc.tipo_documento,
      doc.diretoria,
      doc.setor,
      doc.status,
      doc.versao,
      doc.elaborador,
      doc.aprovador,
      doc.dt_vencimento,
    ].map(escaparCsv).join(";"));

    const blob = new Blob([[colunas.join(";"), ...linhas].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `lista-mestra-documentos-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setIsExportModalOpen(false);
    mostrarMensagem("sucesso", "Lista Mestra exportada com sucesso.");
  }

  /* ── SESSÃO ───────────────────────────────────────────────── */
  useEffect(() => {
    async function iniciar() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }

      const perfil = await carregarPerfilUsuario<{ empresa_id?: string | null; perfil_acesso?: string | null }>(session, "empresa_id, perfil_acesso");
      if (perfil?.empresa_id) {
        setEmpresaId(perfil.empresa_id);
        setPerfilAcesso(perfil.perfil_acesso ?? null);
      } else {
        mostrarMensagem("erro", "Não foi possível identificar a empresa vinculada ao seu usuário.");
        setIsLoading(false);
      }
    }
    iniciar();
  }, [router]);

  const obterEmpresaId = useCallback(async () => {
    if (empresaId) return empresaId;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push("/login");
      return null;
    }

    const perfil = await carregarPerfilUsuario<{ empresa_id?: string | null }>(session, "empresa_id");
    if (perfil?.empresa_id) {
      setEmpresaId(perfil.empresa_id);
      return perfil.empresa_id;
    }

    return null;
  }, [empresaId, router]);

  /* ── FETCH DOCUMENTOS ─────────────────────────────────────── */
  const fetchDocumentos = useCallback(async () => {
    if (!empresaId) return;
    setIsLoading(true);

    const { data, error } = await supabase
      .from("documentos")
      .select("*")
      .eq("empresa_id", empresaId)   // ✅ Isolamento por tenant
      .order("created_at", { ascending: false });

    if (error) {
      mostrarMensagem("erro", "Erro ao carregar documentos.");
      setIsLoading(false);
      return;
    }

    const docsFormatados: Documento[] = (data ?? []).map((doc: any) => ({
      ...doc,
      isProcesso: false,
      status: doc.status ?? "Em Elaboração",
      dt_elaboracao_raw: doc.dt_elaboracao ?? doc.created_at ?? null,
      dt_vencimento_raw: doc.dt_vencimento ?? null,
      dt_elaboracao: doc.dt_elaboracao
        ? new Date(doc.dt_elaboracao).toLocaleDateString("pt-BR", { timeZone: "UTC" })
        : "-",
      dt_vencimento: doc.dt_vencimento
        ? new Date(doc.dt_vencimento).toLocaleDateString("pt-BR", { timeZone: "UTC" })
        : "-",
    }));

    setDocumentos(docsFormatados);
    setIsLoading(false);
  }, [empresaId]);

  useEffect(() => { fetchDocumentos(); }, [fetchDocumentos]);

  useEffect(() => {
    fetch("/api/processos", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: ProcessoItem[]) => {
        if (Array.isArray(data)) setProcessosRepo(data.filter((p) => p.status === "REPOSITORIO"));
      })
      .catch(() => {});
  }, []);

  /* ── HANDLERS ─────────────────────────────────────────────── */
  const abrirFicha = (doc: Documento, tab: "detalhes" | "historico" = "detalhes") => {
    setDocSelecionado(doc);
    setFichaTab(tab);
  };

  const handleVisualizarConteudo = (e: React.MouseEvent, doc: Documento) => {
    e.stopPropagation();
    if (doc.isProcesso) {
      router.push("/processos");
    } else if (doc.arquivo_url) {
      window.open(doc.arquivo_url, "_blank");
    } else {
      mostrarMensagem("alerta", "Arquivo não localizado para este documento.");
    }
  };

  const handleTornarObsoleto = async (id: string) => {
    if (!empresaId) {
      mostrarMensagem("erro", "Não foi possível identificar a empresa do usuário.");
      return;
    }
    if (!podeTornarObsoleto) {
      mostrarMensagem("alerta", "Apenas Qualidade ou administradores autorizados podem tornar documentos obsoletos.");
      return;
    }
    if (!confirm("Tem certeza que deseja tornar este documento OBSOLETO? Ele sairá da vigência.")) return;
    const motivo = window.prompt("Informe o motivo obrigatório da obsolescência:");
    if (!motivo?.trim()) {
      mostrarMensagem("alerta", "Para tornar obsoleto, o motivo deve ser preenchido.");
      return;
    }

    const { error } = await supabase
      .from("documentos")
      .update({
        status: "Obsoleto",
        justificativa: `Obsolescência registrada em ${new Date().toLocaleDateString("pt-BR")}: ${motivo.trim()}`,
      })
      .eq("id", id)
      .eq("empresa_id", empresaId); // ✅ Segurança extra

    if (!error) {
      mostrarMensagem("sucesso", "Documento arquivado como Obsoleto com sucesso.");
      setDocSelecionado(null);
      fetchDocumentos();
    } else {
      mostrarMensagem("erro", "Erro ao arquivar documento.");
    }
  };

  const handleCriarNovaVersao = (doc: Documento) => {
    const query = new URLSearchParams({
      base_id: doc.id,
      codigo: doc.codigo,
      titulo: doc.titulo,
      tipo: doc.tipo_documento ?? "",
      diretoria: doc.diretoria ?? "",
      setor: doc.setor ?? "",
      versao: String(Number(doc.versao) + 1),
      acao: "revisao",
    }).toString();
    router.push(`/novo-documento?${query}`);
  };

  /* ── CONTADORES ───────────────────────────────────────────── */
  const countRepositorio  = documentos.filter((d) => statusRepositorio(d.status)).length;
  const countElaboracao   = documentos.filter((d) => statusElaboracao(d.status)).length;
  const countVerificacao  = documentos.filter((d) => statusVerificacao(d.status)).length;
  const countHomologacao  = documentos.filter((d) => statusHomologacao(d.status)).length;
  const countRejeitados   = documentos.filter((d) => statusRejeitado(d.status)).length;
  const countObsoleto     = documentos.filter((d) => statusObsoleto(d.status)).length;
  const countPipeline = documentos.filter((d) => statusElaboracao(d.status) || statusVerificacao(d.status) || statusHomologacao(d.status) || statusRejeitado(d.status)).length;
  const perfilNormalizado = normalizarTexto(perfilAcesso);
  const perfilQualidade =
    perfilNormalizado.includes("qualidade") ||
    perfilNormalizado.includes("nqsp") ||
    perfilNormalizado.includes("admin") ||
    perfilNormalizado.includes("super");
  const podeConfigurarDocumentos = perfilQualidade;
  const podeTornarObsoleto = perfilQualidade;
  const podeHomologar = perfilQualidade;
  const podeDistribuirCopias = perfilQualidade;
  const podeRecolherCopias = perfilQualidade;

  function abrirConfiguracao() {
    if (!podeConfigurarDocumentos) {
      mostrarMensagem("alerta", "A configuração organizacional é restrita aos administradores e perfis autorizados.");
      return;
    }

    setViewState("config");
  }

  const isPipelineAtivo = normalizarTexto(pastaAtiva).includes("pipeline");
  const isRepositorioAtivo = normalizarTexto(pastaAtiva).includes("repositorio");
  const filtrosRepositorioAtivos = Object.values(filtrosRepositorio).some(Boolean);
  const setoresRepositorio = Array.from(
    new Set(documentos.filter((doc) => statusRepositorio(doc.status)).map((doc) => doc.setor).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));

  const docsRepositorio = React.useMemo(
    () => documentos.filter((d) => statusRepositorio(d.status)),
    [documentos]
  );

  const arvoreRepositorio = React.useMemo(() => {
    const setorMap = new Map<string, Set<string>>();
    docsRepositorio.forEach((doc) => {
      const setor = doc.setor || "Sem setor";
      if (!setorMap.has(setor)) setorMap.set(setor, new Set());
      const tipo = doc.tipo_documento || "Outros";
      setorMap.get(setor)!.add(tipo);
    });
    processosRepo.forEach((proc) => {
      const setor = proc.setor || proc.owner || "Sem setor";
      if (!setorMap.has(setor)) setorMap.set(setor, new Set());
      setorMap.get(setor)!.add("Mapa de processo");
    });
    return Array.from(setorMap.entries())
      .sort(([a], [b]) => a.localeCompare(b, "pt-BR"))
      .map(([setor, tipos]) => ({
        setor,
        tipos: Array.from(tipos).sort((a, b) => {
          if (a === "Mapa de processo") return 1;
          if (b === "Mapa de processo") return -1;
          return a.localeCompare(b, "pt-BR");
        }),
      }));
  }, [docsRepositorio, processosRepo]);

  function documentoPassaFiltrosRepositorio(doc: Documento) {
    if (!statusRepositorio(doc.status)) return false;

    const codigo = normalizarTexto(doc.codigo);
    const titulo = normalizarTexto(doc.titulo);
    const elaborador = normalizarTexto(doc.elaborador);
    const setor = normalizarTexto(doc.setor);
    const dataElaboracao = doc.dt_elaboracao_raw?.slice(0, 10) ?? "";

    if (filtrosRepositorio.codigo && !codigo.includes(normalizarTexto(filtrosRepositorio.codigo))) return false;
    if (filtrosRepositorio.nome && !titulo.includes(normalizarTexto(filtrosRepositorio.nome))) return false;
    if (filtrosRepositorio.elaborador && !elaborador.includes(normalizarTexto(filtrosRepositorio.elaborador))) return false;
    if (filtrosRepositorio.setor && setor !== normalizarTexto(filtrosRepositorio.setor)) return false;
    if (filtrosRepositorio.data && dataElaboracao !== filtrosRepositorio.data) return false;

    return true;
  }

  const documentosFiltrados = documentos.filter((doc) => {
    const pasta = normalizarTexto(pastaAtiva);
    if (isPipelineAtivo) return statusElaboracao(doc.status) || statusVerificacao(doc.status) || statusHomologacao(doc.status) || statusRejeitado(doc.status);
    if (pasta.includes("elaboracao")) return statusElaboracao(doc.status);
    if (pasta.includes("verificacao")) return statusVerificacao(doc.status);
    if (pasta.includes("homologacao")) return statusHomologacao(doc.status);
    if (pasta.includes("rejeitados")) return statusRejeitado(doc.status);
    if (pasta.includes("obsoleto")) return statusObsoleto(doc.status);
    if (isRepositorioAtivo) {
      if (!documentoPassaFiltrosRepositorio(doc)) return false;
      if (filtroLateral) {
        if (filtroLateral.tipo === "Mapa de processo") return false;
        if (normalizarTexto(doc.setor) !== normalizarTexto(filtroLateral.setor)) return false;
        if (normalizarTexto(doc.tipo_documento) !== normalizarTexto(filtroLateral.tipo)) return false;
      }
      return true;
    }
    return normalizarTexto(doc.status) === pasta;
  });

  const processosLateral = filtroLateral?.tipo === "Mapa de processo"
    ? processosRepo.filter((p) => normalizarTexto(p.setor ?? p.owner) === normalizarTexto(filtroLateral.setor))
    : [];

  /* ── RENDER ───────────────────────────────────────────────── */
  return (
    <div className="p-8 max-w-[1400px] mx-auto animate-in fade-in duration-500 relative print:p-0">

      {/* TOAST */}
      {mensagemSistema && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 font-bold text-sm animate-in slide-in-from-top-10 print:hidden
          ${mensagemSistema.tipo === "sucesso" ? "bg-emerald-600 text-white" : ""}
          ${mensagemSistema.tipo === "alerta"  ? "bg-amber-500 text-white"   : ""}
          ${mensagemSistema.tipo === "erro"    ? "bg-red-600 text-white"     : ""}
        `}>
          {mensagemSistema.tipo === "sucesso" && <CheckCircle2 className="w-5 h-5" />}
          {mensagemSistema.tipo === "alerta"  && <AlertCircle  className="w-5 h-5" />}
          {mensagemSistema.tipo === "erro"    && <X             className="w-5 h-5" />}
          {mensagemSistema.texto}
        </div>
      )}

      {/* HEADER */}
      <div className="flex items-center justify-between mb-8 print:hidden">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Gestão de Documentos</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Controle de informação documentada ISO 9001</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-2 bg-white border border-slate-100 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-50 shadow-sm transition-all"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Exportar Lista Mestra
          </button>
          <Link
            href="/novo-documento"
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 shadow-md transition-all"
          >
            <FilePlus className="w-4 h-4" /> Novo Documento
          </Link>
        </div>
      </div>

      {/* TABS */}
      <div className="border-b border-slate-100 mb-8 flex gap-8 text-sm font-bold text-slate-500 overflow-x-auto print:hidden">
        {[
          { key: "blocos",   label: "Pastas de Tramitação", icon: <Layers className="w-4 h-4" /> },
          { key: "inspecao", label: "Inspeção 360°",        icon: <Search className="w-4 h-4" /> },
        ].map((tab) => {
          const isActive =
            tab.key === "blocos"
              ? viewState === "blocos" || viewState === "lista"
              : viewState === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => (tab.key === "config" ? abrirConfiguracao() : setViewState(tab.key as typeof viewState))}
              className={`pb-4 border-b-2 transition-all flex items-center gap-2 ${
                isActive ? "border-blue-600 text-blue-600" : "border-transparent hover:text-slate-800"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          );
        })}
      </div>

      {/* VISÃO: BLOCOS */}
      {viewState === "blocos" && (
        <div className="animate-in fade-in">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-slate-900">Dashboard de documentos</h2>
            <p className="text-sm text-slate-500 mt-1">Visão operacional do ciclo de vida documental.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            <DashboardBlock title="Repositório" desc="Documentos aprovados no fluxo" count={countRepositorio} icon={<FileCheck className="w-6 h-6" />} color="emerald" onClick={() => { setPastaAtiva("Repositório"); setViewState("lista"); }} isLoading={isLoading} />
            <DashboardBlock title="Pipeline de documentos" desc="Elaboração, verificação, rejeição e homologação" count={countPipeline} icon={<Workflow className="w-6 h-6" />} color="blue" onClick={() => { setPastaAtiva("Pipeline de Documentos"); setViewState("lista"); }} isLoading={isLoading} />
            <DashboardBlock title="Obsoletos" desc="Documentos arquivados e fora de vigência" count={countObsoleto} icon={<Archive className="w-6 h-6" />} color="slate" onClick={() => { setPastaAtiva("Obsoletos"); setViewState("lista"); }} isLoading={isLoading} />
            <DashboardBlock title="Configuração" desc="Parâmetros e estrutura organizacional" count={3} icon={<Settings className="w-6 h-6" />} color="purple" onClick={abrirConfiguracao} isLoading={isLoading} />
          </div>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-5">
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Composição do pipeline</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Etapas ativas antes do repositório.</p>
                </div>
                <span className="text-xs font-black text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-3 py-1">{countPipeline} em fluxo</span>
              </div>
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                <PipelineMiniCard label="Em elaboração" value={countElaboracao} color="blue" />
                <PipelineMiniCard label="Em verificação" value={countVerificacao} color="amber" />
                <PipelineMiniCard label="Aguardando homologação" value={countHomologacao} color="purple" />
                <PipelineMiniCard label="Rejeitados" value={countRejeitados} color="red" />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900">Controle de cópias controladas</h3>
              <p className="text-xs text-slate-500 mt-1">Emita, rastreie e recolha cópias de documentos vigentes aprovados.</p>
              <button onClick={() => setViewState("copias")} className="mt-5 w-full h-11 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
                <Copy className="w-4 h-4" /> Abrir central de cópias
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VISÃO: LISTA */}
      {viewState === "lista" && (
        <div className="animate-in slide-in-from-right-8 duration-300">
          {/* Header */}
          <div className="flex items-center gap-3 mb-5">
            <button onClick={() => { setViewState("blocos"); setFiltroLateral(null); }} className="p-2 bg-white border border-slate-100 rounded-lg text-slate-500 hover:bg-slate-50 shadow-sm transition-all">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-slate-800">Pasta: <span className="text-blue-600">{pastaAtiva}</span></h2>
            {filtroLateral && (
              <div className="flex items-center gap-2 ml-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-xs font-bold text-blue-700">
                <FolderOpen className="w-3.5 h-3.5" />
                {filtroLateral.setor} / {filtroLateral.tipo}
                <button onClick={() => setFiltroLateral(null)} className="ml-1 hover:text-blue-900">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {isRepositorioAtivo ? (
            <div className="flex gap-4 items-start">
              {/* SIDEBAR HIERÁRQUICA */}
              <div className="w-56 shrink-0 bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden sticky top-4">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Navegar por setor</p>
                </div>
                <div className="py-1.5 max-h-[calc(100vh-220px)] overflow-y-auto">
                  {arvoreRepositorio.length === 0 && (
                    <p className="px-4 py-6 text-xs font-medium text-slate-400 text-center">Nenhum setor encontrado.</p>
                  )}
                  {arvoreRepositorio.map(({ setor, tipos }) => {
                    const aberto = setoresAbertos.has(setor);
                    const selecionadoNesteSetor = filtroLateral?.setor === setor;
                    return (
                      <div key={setor}>
                        <button
                          onClick={() => {
                            const novo = new Set(setoresAbertos);
                            if (aberto) novo.delete(setor); else novo.add(setor);
                            setSetoresAbertos(novo);
                            if (selecionadoNesteSetor) setFiltroLateral(null);
                          }}
                          className={"w-full flex items-center gap-2 px-3 py-2.5 text-left text-xs font-bold transition-colors hover:bg-slate-50 " + (selecionadoNesteSetor ? "text-blue-700" : "text-slate-700")}
                        >
                          {aberto
                            ? <ChevronDown className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                            : <ChevronRight className="w-3.5 h-3.5 shrink-0 text-slate-400" />}
                          <FolderOpen className={"w-4 h-4 shrink-0 " + (selecionadoNesteSetor ? "text-blue-500" : "text-amber-500")} />
                          <span className="truncate">{setor}</span>
                          <span className="ml-auto shrink-0 text-[10px] font-black text-slate-400 bg-slate-100 rounded-full px-1.5 py-0.5">{tipos.length}</span>
                        </button>
                        {aberto && (
                          <div className="ml-3 border-l border-slate-100 pl-1.5 mb-1">
                            {tipos.map((tipo) => {
                              const ativo = filtroLateral?.setor === setor && filtroLateral?.tipo === tipo;
                              const eMapa = tipo === "Mapa de processo";
                              return (
                                <button
                                  key={tipo}
                                  onClick={() => setFiltroLateral(ativo ? null : { setor, tipo })}
                                  className={"w-full flex items-center gap-2 px-2.5 py-2 text-left text-xs font-semibold rounded-lg transition-colors " + (ativo ? "bg-blue-50 text-blue-700 font-bold" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900")}
                                >
                                  <span className={"w-4 h-4 shrink-0 flex items-center justify-center rounded text-[9px] font-black " + (eMapa ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500")}>
                                    {eMapa ? "M" : tipo.slice(0, 2).toUpperCase()}
                                  </span>
                                  <span className="truncate">{tipo}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* CONTEÚDO PRINCIPAL */}
              <div className="flex-1 min-w-0 space-y-4">
                {!filtroLateral && (
                  <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">Filtros do repositório</h3>
                        <p className="mt-0.5 text-xs font-medium text-slate-500">Busque por código, título, elaborador, data ou setor.</p>
                      </div>
                      {filtrosRepositorioAtivos && (
                        <button onClick={() => setFiltrosRepositorio({ codigo: "", nome: "", elaborador: "", data: "", setor: "" })} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-blue-300 hover:text-blue-700">
                          Limpar filtros
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                      <input value={filtrosRepositorio.codigo} onChange={(e) => setFiltrosRepositorio((a) => ({ ...a, codigo: e.target.value }))} placeholder="Código" className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none transition focus:border-blue-500 focus:bg-white" />
                      <input value={filtrosRepositorio.nome} onChange={(e) => setFiltrosRepositorio((a) => ({ ...a, nome: e.target.value }))} placeholder="Nome ou palavra-chave" className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none transition focus:border-blue-500 focus:bg-white" />
                      <input value={filtrosRepositorio.elaborador} onChange={(e) => setFiltrosRepositorio((a) => ({ ...a, elaborador: e.target.value }))} placeholder="Elaborador" className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none transition focus:border-blue-500 focus:bg-white" />
                      <input type="date" value={filtrosRepositorio.data} onChange={(e) => setFiltrosRepositorio((a) => ({ ...a, data: e.target.value }))} className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none transition focus:border-blue-500 focus:bg-white" />
                      <select value={filtrosRepositorio.setor} onChange={(e) => setFiltrosRepositorio((a) => ({ ...a, setor: e.target.value }))} className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none transition focus:border-blue-500 focus:bg-white">
                        <option value="">Todos os setores</option>
                        {setoresRepositorio.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                )}

                {filtroLateral && (
                  <div className="rounded-xl border border-blue-100 bg-blue-50/50 px-4 py-2.5 text-xs font-semibold text-blue-700 flex items-center gap-2">
                    <FolderOpen className="w-3.5 h-3.5" />
                    Exibindo: <strong>{filtroLateral.setor}</strong> &rsaquo; <strong>{filtroLateral.tipo}</strong>
                    {filtroLateral.tipo === "Mapa de processo"
                      ? <span className="ml-auto text-emerald-700 font-bold">{processosLateral.length} processo(s)</span>
                      : <span className="ml-auto text-blue-700 font-bold">{documentosFiltrados.length} documento(s)</span>
                    }
                  </div>
                )}

                {filtroLateral?.tipo === "Mapa de processo" ? (
                  <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase font-black text-slate-500 tracking-widest">
                          <th className="px-4 py-3">Código</th>
                          <th className="px-4 py-3">Módulo</th>
                          <th className="px-4 py-3">Nome do Processo</th>
                          <th className="px-4 py-3 text-center">Rev</th>
                          <th className="px-4 py-3">Responsável</th>
                          <th className="px-4 py-3 text-right">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {processosLateral.map((proc) => (
                          <tr key={proc.id} className="hover:bg-blue-50/40 transition-colors text-sm">
                            <td className="px-4 py-3 font-mono font-bold text-emerald-700">{proc.code}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest border bg-emerald-50 text-emerald-700 border-emerald-200">{proc.module}</span>
                            </td>
                            <td className="px-4 py-3 font-bold text-slate-800">{proc.name}</td>
                            <td className="px-4 py-3 text-center text-slate-500 font-medium">{proc.version}</td>
                            <td className="px-4 py-3 text-slate-600 font-medium">
                              <span className="flex items-center gap-1.5"><User className="w-3 h-3 text-slate-400" />{proc.owner}</span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <a href="/processos" className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50 shadow-sm transition-all inline-flex items-center gap-1.5">
                                <Eye className="w-3.5 h-3.5" /> Abrir
                              </a>
                            </td>
                          </tr>
                        ))}
                        {processosLateral.length === 0 && (
                          <tr><td colSpan={6} className="px-6 py-10 text-center text-slate-400 font-bold text-sm">Nenhum processo no repositório para este setor.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase font-black text-slate-500 tracking-widest">
                          <th className="px-4 py-3">Código</th>
                          <th className="px-4 py-3">Tipo</th>
                          <th className="px-4 py-3">Título do Documento</th>
                          <th className="px-4 py-3 text-center">Rev</th>
                          <th className="px-4 py-3">Elaborador</th>
                          <th className="px-4 py-3">Elaboração</th>
                          <th className="px-4 py-3">Setor</th>
                          <th className="px-4 py-3 text-right">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {documentosFiltrados.map((doc) => (
                          <tr key={doc.id} className="hover:bg-blue-50/40 transition-colors group text-sm">
                            <td className="px-4 py-3 font-mono font-bold text-blue-700">{doc.codigo}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest border bg-slate-100 text-slate-500 border-slate-100">{doc.tipo_documento}</span>
                            </td>
                            <td className="px-4 py-3 font-bold text-slate-800">{doc.titulo}</td>
                            <td className="px-4 py-3 text-center text-slate-500 font-medium">{doc.versao}</td>
                            <td className="px-4 py-3 text-slate-600 font-medium">
                              <span className="flex items-center gap-1.5"><User className="w-3 h-3 text-slate-400" />{doc.elaborador}</span>
                            </td>
                            <td className="px-4 py-3 text-slate-600 font-medium">{doc.dt_elaboracao}</td>
                            <td className="px-4 py-3 font-bold text-slate-700">{doc.setor}</td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button onClick={(e) => handleVisualizarConteudo(e, doc)} title="Visualizar" className="p-2 bg-white border border-slate-100 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); abrirFicha(doc); }} title="Ficha Técnica" className="p-2 bg-white border border-slate-100 text-slate-600 rounded-lg hover:bg-slate-100 transition-all shadow-sm">
                                  <FileSearch className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {documentosFiltrados.length === 0 && !isLoading && (
                          <tr><td colSpan={8} className="px-6 py-10 text-center text-slate-400 font-bold text-sm">Nenhum documento encontrado.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* PIPELINE / OBSOLETOS */
            <div className="space-y-4">
              <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1000px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase font-black text-slate-500 tracking-widest">
                      <th className="px-4 py-3">Código</th>
                      <th className="px-4 py-3">Tipo</th>
                      <th className="px-4 py-3">Título do Documento</th>
                      <th className="px-4 py-3 text-center">Rev</th>
                      <th className="px-4 py-3">Elaborador</th>
                      <th className="px-4 py-3">Elaboração</th>
                      <th className="px-4 py-3">Setor</th>
                      {isPipelineAtivo && <th className="px-4 py-3">Status</th>}
                      {pastaAtiva === "Em Verificação" && <th className="px-4 py-3">Pendente de</th>}
                      <th className="px-4 py-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {documentosFiltrados.map((doc) => (
                      <tr key={doc.id} className="hover:bg-blue-50/40 transition-colors group text-sm">
                        <td className="px-4 py-3 font-mono font-bold text-blue-700">{doc.codigo}</td>
                        <td className="px-4 py-3">
                          <span className={"px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest border whitespace-nowrap " + (doc.isProcesso ? "bg-indigo-50 text-indigo-600 border-indigo-200" : "bg-slate-100 text-slate-500 border-slate-100")}>
                            {doc.tipo_documento}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-800">{doc.titulo}</td>
                        <td className="px-4 py-3 text-center text-slate-500 font-medium">{doc.versao}</td>
                        <td className="px-4 py-3 text-slate-600 font-medium flex items-center gap-1.5">
                          <User className="w-3 h-3 text-slate-400" />{doc.elaborador}
                        </td>
                        <td className="px-4 py-3 text-slate-600 font-medium">{doc.dt_elaboracao}</td>
                        <td className="px-4 py-3 font-bold text-slate-700">{doc.setor}</td>
                        {isPipelineAtivo && (
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">{doc.status}</span>
                          </td>
                        )}
                        {pastaAtiva === "Em Verificação" && (
                          <td className="px-4 py-3 font-bold text-amber-600 text-xs truncate max-w-[150px]">{doc.verificador_pendente?.split(";")[0]}</td>
                        )}
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {(statusElaboracao(doc.status) || statusRejeitado(doc.status)) && (
                              <a href={"/editar-documento/" + doc.id} className="px-3 py-1.5 bg-white border border-slate-100 text-slate-700 font-bold rounded-lg text-xs hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50 shadow-sm transition-all inline-flex items-center gap-1.5">
                                <Edit className="w-3.5 h-3.5" /> Retomar
                              </a>
                            )}
                            {(statusVerificacao(doc.status) || statusHomologacao(doc.status)) && (
                              statusHomologacao(doc.status) && !podeHomologar ? (
                                <a href={"/documento/" + doc.id} className="px-3 py-1.5 bg-white border border-slate-100 text-slate-500 font-bold rounded-lg text-xs hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50 shadow-sm transition-all inline-flex items-center gap-1.5">
                                  <Eye className="w-3.5 h-3.5" /> Acompanhar
                                </a>
                              ) : (
                                <a href={"/documento/" + doc.id} className="px-3 py-1.5 bg-white border border-slate-100 text-slate-700 font-bold rounded-lg text-xs hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50 shadow-sm transition-all inline-flex items-center gap-1.5">
                                  <Search className="w-3.5 h-3.5" /> Analisar
                                </a>
                              )
                            )}
                            {pastaAtiva === "Obsoletos" && (
                              <button onClick={(e) => { e.stopPropagation(); abrirFicha(doc, "historico"); }} className="text-slate-500 font-bold flex items-center justify-end gap-1.5 hover:text-blue-600 transition-colors">
                                <History className="w-3.5 h-3.5" /> Histórico
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {documentosFiltrados.length === 0 && !isLoading && (
                  <div className="p-8 text-center text-slate-500 font-medium">Nenhum documento encontrado nesta pasta.</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

            {/* VISÃO: INSPEÇÃO */}
      {viewState === "inspecao" && (
        <PainelInspecao documentos={documentos} isLoading={isLoading} aoAtualizar={fetchDocumentos} />
      )}

      {/* VISÃO: CÓPIAS */}
      {viewState === "copias" && (
        <PainelCopiasControladas
          documentos={documentos.filter((d) => statusRepositorio(d.status) && !d.isProcesso)}
          empresaId={empresaId}
          podeDistribuir={podeDistribuirCopias}
          podeRecolher={podeRecolherCopias}
          setMensagemSistema={setMensagemSistema}
        />
      )}

      {/* VISÃO: CONFIG */}
      {viewState === "config" && (
        <PainelConfiguracaoAdmin
          empresaId={empresaId}
          obterEmpresaId={obterEmpresaId}
          setMensagemSistema={setMensagemSistema}
        />
      )}

      {/* MODAL EXPORTAR */}
      {isExportModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 print:hidden">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-md font-bold text-slate-900">Gerar Relatório</h3>
              <button onClick={() => setIsExportModalOpen(false)} className="text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 text-center">
              <FileSpreadsheet className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
              <button onClick={exportarListaMestra} className="w-full py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold shadow-lg hover:bg-emerald-700 transition-colors">
                Exportar Base
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: FICHA TÉCNICA */}
      {docSelecionado && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-end z-[100] animate-in fade-in print:hidden">
          <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col animate-in slide-in-from-right-8 border-l border-slate-100">

            <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50 shrink-0">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl border shadow-inner mt-1 bg-blue-50 text-blue-600 border-blue-100">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-sm font-black text-blue-700">{docSelecionado.codigo}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-600 border border-slate-200">Rev. {docSelecionado.versao}</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 leading-tight pr-4">{docSelecionado.titulo}</h3>
                  <div className="mt-3">
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border
                      ${docSelecionado.status === "Repositório"   ? "bg-emerald-50 text-emerald-700 border-emerald-200" : ""}
                      ${docSelecionado.status === "Obsoleto"      ? "bg-slate-100 text-slate-500 border-slate-200"       : ""}
                      ${docSelecionado.status === "Em Verificação"? "bg-amber-50 text-amber-700 border-amber-200"         : ""}
                    `}>
                      {docSelecionado.status}
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={() => setDocSelecionado(null)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full transition-colors shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 overflow-y-auto flex-1 bg-white space-y-8">
              <section>
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest border-b border-slate-100 pb-2 mb-4 flex items-center gap-2">
                  <BookOpen className="w-4 h-4" /> 1. Identificação do Documento
                </h4>
                <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                  <div className="col-span-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Título</p>
                    <p className="text-sm font-bold text-slate-800">{docSelecionado.titulo}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tipo de Documento</p>
                    <p className="text-sm font-bold text-slate-700">{docSelecionado.tipo_documento}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Setor Responsável</p>
                    <p className="text-sm font-bold text-slate-700">{docSelecionado.setor}</p>
                  </div>
                  {docSelecionado.diretoria && (
                    <div className="col-span-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Diretoria Vinculada</p>
                      <p className="text-sm font-bold text-slate-700">{docSelecionado.diretoria}</p>
                    </div>
                  )}
                </div>
              </section>

              <section>
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest border-b border-slate-100 pb-2 mb-4 flex items-center gap-2">
                  <History className="w-4 h-4" /> 2. Controle de Versão e Prazos
                </h4>
                <div className="grid grid-cols-2 gap-y-4 gap-x-6 bg-slate-50 p-5 rounded-xl border border-slate-100">
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Versão Vigente</p>
                    <p className="text-base font-black text-blue-600">{docSelecionado.versao}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Situação</p>
                    <p className="text-sm font-bold text-slate-800">{docSelecionado.status}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Data de Elaboração</p>
                    <p className="text-sm font-bold text-slate-700">{docSelecionado.dt_elaboracao}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Vencimento (Validade)</p>
                    <p className="text-sm font-bold text-slate-700">{docSelecionado.dt_vencimento}</p>
                  </div>
                  <div className="col-span-2 mt-2 pt-4 border-t border-slate-200/60">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Justificativa</p>
                    <p className="text-sm text-slate-600 italic bg-white p-3 rounded-lg border border-slate-100">
                      {docSelecionado.justificativa || "Sem justificativa registrada."}
                    </p>
                  </div>
                </div>
              </section>

              <section>
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest border-b border-slate-100 pb-2 mb-4 flex items-center gap-2">
                  <User className="w-4 h-4" /> 3. Matriz de Responsabilidades
                </h4>
                <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Elaborador</p>
                    <p className="text-sm font-bold text-slate-800">{docSelecionado.elaborador || "Sistema/Legado"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Aprovador Final</p>
                    <p className="text-sm font-bold text-slate-800">{docSelecionado.aprovador || "Comitê da Qualidade"}</p>
                  </div>
                  {docSelecionado.verificador_pendente && (
                    <div className="col-span-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Verificadores</p>
                      <ul className="text-sm text-slate-600 mt-1 space-y-1">
                        {docSelecionado.verificador_pendente.split(";").map((v, i) => (
                          <li key={i} className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-slate-300 rounded-full" />{v}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </section>
            </div>

            {statusRepositorio(docSelecionado.status) && (
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-4 shrink-0">
                <button onClick={() => handleTornarObsoleto(docSelecionado.id)} disabled={!podeTornarObsoleto} className={`flex items-center justify-center gap-2 px-5 py-2.5 bg-white border font-bold rounded-xl text-sm transition-all shadow-sm ${podeTornarObsoleto ? "border-red-200 text-red-600 hover:bg-red-50" : "border-slate-200 text-slate-400 cursor-not-allowed"}`}>
                  <Archive className="w-4 h-4" /> Tornar Obsoleto
                </button>
                <button onClick={() => handleCriarNovaVersao(docSelecionado)} className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl text-sm hover:bg-blue-700 transition-all shadow-md">
                  <Edit className="w-4 h-4" /> Criar Nova Versão (Rev. {Number(docSelecionado.versao) + 1})
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
 * PAINEL INSPEÇÃO
 * ───────────────────────────────────────────────────────────────*/
function PainelInspecao({ documentos, isLoading, aoAtualizar }: {
  documentos: Documento[]; isLoading: boolean; aoAtualizar: () => void;
}) {
  const [filtroGlobal, setFiltroGlobal] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("Todos");

  const docsFiltrados = documentos.filter((doc) => {
    const busca = filtroGlobal.toLowerCase();
    const matchesTexto =
      doc.titulo?.toLowerCase().includes(busca) ||
      doc.codigo?.toLowerCase().includes(busca) ||
      doc.elaborador?.toLowerCase().includes(busca);
    const matchesStatus = statusFiltro === "Todos" || doc.status === statusFiltro;
    return matchesTexto && matchesStatus;
  });

  const total    = docsFiltrados.length;
  const pendentes = docsFiltrados.filter((d) => d.status !== "Repositório" && d.status !== "Obsoleto").length;
  const vigentes  = docsFiltrados.filter((d) => d.status === "Repositório").length;

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "Repositório":    return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Em Verificação": return "bg-amber-50 text-amber-700 border-amber-200";
      case "Em Homologação": return "bg-purple-50 text-purple-700 border-purple-200";
      case "Em Elaboração":  return "bg-blue-50 text-blue-700 border-blue-200";
      case "Rejeitado":
      case "Devolvido":      return "bg-red-50 text-red-700 border-red-200";
      default:               return "bg-slate-50 text-slate-700 border-slate-100";
    }
  };

  return (
    <div className="animate-in slide-in-from-bottom-4">
      <div className="flex justify-end mb-6 print:hidden">
        <button onClick={() => window.print()} className="flex items-center gap-2 bg-white border border-slate-100 text-slate-700 px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-50 shadow-sm transition-all">
          <Printer className="w-4 h-4 text-blue-600" /> Relatório PDF / Imprimir
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <ResumoCard titulo="Documentos em Inspeção" valor={total}    icon={<FileText className="w-5 h-5" />}    cor="blue"    />
        <ResumoCard titulo="Com Pendência"          valor={pendentes} icon={<Clock className="w-5 h-5" />}       cor="amber"   />
        <ResumoCard titulo="Índice de Vigência"     valor={total > 0 ? `${Math.round((vigentes / total) * 100)}%` : "100%"} icon={<CheckCircle2 className="w-5 h-5" />} cor="emerald" />
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm mb-6 flex flex-wrap items-center gap-4 print:hidden">
        <div className="flex-1 min-w-[300px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Localizar por Código, Título ou Responsável..." value={filtroGlobal} onChange={(e) => setFiltroGlobal(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-lg text-sm outline-none focus:border-blue-500 focus:bg-white transition-all" />
        </div>
        <select value={statusFiltro} onChange={(e) => setStatusFiltro(e.target.value)} className="px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-lg text-sm font-bold text-slate-600 outline-none cursor-pointer">
          <option value="Todos">Todos os Status</option>
          <option value="Repositório">Vigentes</option>
          <option value="Em Verificação">Em Verificação</option>
          <option value="Em Homologação">Em Homologação</option>
          <option value="Em Elaboração">Em Elaboração</option>
          <option value="Rejeitado">Rejeitados</option>
        </select>
        <button onClick={aoAtualizar} className="p-2.5 text-slate-400 hover:text-blue-600 transition-colors">
          <RefreshCw className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr className="text-[10px] uppercase font-black text-slate-500 tracking-widest">
                <th className="px-6 py-4">Status Atual</th>
                <th className="px-6 py-4">Identificação</th>
                <th className="px-6 py-4">Setor</th>
                <th className="px-6 py-4">Responsável Atual</th>
                <th className="px-6 py-4 text-center">Vencimento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {docsFiltrados.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${getStatusStyle(doc.status)}`}>{doc.status}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-mono font-bold text-blue-700">{doc.codigo}</div>
                    <div className="font-bold text-slate-800 text-xs mt-0.5 max-w-[200px] truncate" title={doc.titulo}>{doc.titulo}</div>
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-600 uppercase text-[10px]">{doc.setor}</td>
                  <td className="px-6 py-4 font-medium text-slate-700">
                    <div className="flex flex-col">
                      <span>{doc.elaborador}</span>
                      {doc.status === "Em Verificação" && (
                        <span className="text-[9px] text-amber-600 font-bold">Aguardando: {doc.verificador_pendente?.split(";")[0]}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center font-bold text-slate-700">{doc.dt_vencimento}</td>
                </tr>
              ))}
              {docsFiltrados.length === 0 && !isLoading && (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500 font-bold">Nenhum documento localizado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
 * PAINEL CÓPIAS CONTROLADAS
 * ───────────────────────────────────────────────────────────────*/
type StatusCopiaControlada = "Distribuída" | "Em uso" | "Recolhida" | "Substituída" | "Cancelada" | "Vencida";

type CopiaControlada = {
  id: string;
  numero: number;
  documentoId: string;
  documentoCodigo: string;
  documentoTitulo: string;
  revisao: number;
  setor: string;
  profissional: string;
  motivo: string;
  quantidade: number;
  responsavelEmissao: string;
  dataEmissao: string;
  previsaoRecolhimento: string;
  status: StatusCopiaControlada;
  recolhimento?: {
    data: string;
    responsavel: string;
    origem: string;
    destino: string;
    observacao: string;
  };
  historico: string[];
};

function PainelCopiasControladas({ documentos, empresaId, podeDistribuir, podeRecolher, setMensagemSistema }: {
  documentos: Documento[];
  empresaId: string | null;
  podeDistribuir: boolean;
  podeRecolher: boolean;
  setMensagemSistema: (m: MensagemSistema) => void;
}) {
  const [busca, setBusca] = useState("");
  const [copias, setCopias] = useState<CopiaControlada[]>([]);
  const [setoresList, setSetoresList] = useState<string[]>([]);
  const [usuariosList, setUsuariosList] = useState<string[]>([]);
  const [nomeUsuarioLogado, setNomeUsuarioLogado] = useState("");
  const [isCarregando, setIsCarregando] = useState(true);
  const [documentoEmissao, setDocumentoEmissao] = useState<Documento | null>(null);
  const [copiaRecolhimento, setCopiaRecolhimento] = useState<CopiaControlada | null>(null);
  const [filtroReg, setFiltroReg] = useState({ doc: "", setor: "", profissional: "", status: "" });
  const [formEmissao, setFormEmissao] = useState({
    profissional: "",
    setor: "",
    motivo: "",
    quantidade: 1,
    responsavel: "",
    previsaoRecolhimento: "",
  });
  const [formRecolhimento, setFormRecolhimento] = useState({
    data: new Date().toISOString().slice(0, 10),
    responsavel: "",
    origem: "",
    destino: "Destruída",
    observacao: "",
  });

  useEffect(() => {
    if (!empresaId) return;
    async function carregar() {
      setIsCarregando(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const perfil = await carregarPerfilUsuario<{ nome?: string }>(session, "nome");
        if (perfil?.nome) setNomeUsuarioLogado(perfil.nome);
      }
      const [resSetores, resPerfis, resCopias] = await Promise.all([
        supabase.from("config_setores").select("nome").eq("empresa_id", empresaId).order("nome"),
        supabase.from("perfis").select("nome").eq("empresa_id", empresaId).order("nome"),
        supabase.from("copias_controladas").select("*").eq("empresa_id", empresaId).order("created_at", { ascending: false }),
      ]);
      if (resSetores.data) setSetoresList(resSetores.data.map((s: any) => s.nome).filter(Boolean));
      if (resPerfis.data) setUsuariosList(resPerfis.data.map((p: any) => p.nome).filter(Boolean));
      if (resCopias.data) {
        const mapa = Object.fromEntries(documentos.map((d) => [d.id, d]));
        setCopias(resCopias.data.map((c: any) => {
          const doc = mapa[c.documento_id];
          return {
            id: c.id,
            numero: c.numero_copia ?? 0,
            documentoId: c.documento_id,
            documentoCodigo: c.documento_codigo ?? doc?.codigo ?? "",
            documentoTitulo: c.documento_titulo ?? doc?.titulo ?? "",
            revisao: c.revisao ?? doc?.versao ?? 0,
            setor: c.setor_destino ?? "",
            profissional: c.entregue_a ?? "",
            motivo: c.motivo ?? "",
            quantidade: c.quantidade ?? 1,
            responsavelEmissao: c.responsavel_emissao ?? "",
            dataEmissao: c.data_emissao ?? "",
            previsaoRecolhimento: c.previsao_recolhimento ?? "",
            status: (c.status ?? "Distribuída") as StatusCopiaControlada,
            historico: (c.historico ?? "").split("\n").filter(Boolean),
          };
        }));
      }
      setIsCarregando(false);
    }
    carregar();
  }, [empresaId, documentos]);

  const docsFiltrados = documentos.filter((doc) =>
    doc.titulo?.toLowerCase().includes(busca.toLowerCase()) ||
    doc.codigo?.toLowerCase().includes(busca.toLowerCase())
  );

  const copiasAtivas = copias.filter((c) => !["Recolhida", "Cancelada", "Substituída"].includes(c.status));
  const hojeIso = new Date().toISOString().slice(0, 10);
  const copiasVencidas = copiasAtivas.filter((c) => c.previsaoRecolhimento && c.previsaoRecolhimento < hojeIso).length;
  const documentosComCopiasAtivas = new Set(copiasAtivas.map((c) => c.documentoId)).size;
  const copiasPendentes = copiasAtivas.filter((c) => c.status === "Distribuída" || c.status === "Em uso").length;
  const copiasRecolhidas = copias.filter((c) => c.status === "Recolhida").length;

  function abrirEmissao(doc: Documento) {
    if (!podeDistribuir) {
      setMensagemSistema({ tipo: "alerta", texto: "A emissÃ£o de cÃ³pias controladas Ã© restrita Ã  Qualidade." });
      return;
    }
    setDocumentoEmissao(doc);
    setFormEmissao({
      profissional: "",
      setor: doc.setor ?? "",
      motivo: "",
      quantidade: 1,
      responsavel: nomeUsuarioLogado,
      previsaoRecolhimento: "",
    });
  }

  function rodapeCopia(copia: CopiaControlada) {
    const numero = String(copia.numero).padStart(3, "0");
    const dataRecolhimento = copia.previsaoRecolhimento
      ? new Date(`${copia.previsaoRecolhimento}T00:00:00`).toLocaleDateString("pt-BR")
      : "Não definida";
    return `CÓPIA CONTROLADA IMPRESSA Nº ${numero} — Emissor: ${copia.responsavelEmissao} — Data de recolhimento: ${dataRecolhimento}`;
  }

  function gerarPdfControlado(copia: CopiaControlada) {
    const rodape = rodapeCopia(copia);
    const printWindow = window.open("", "_blank", "width=900,height=900");
    if (!printWindow) { setMensagemSistema({ tipo: "alerta", texto: "Popup bloqueado. Permita popups para este site e tente novamente." }); return; }

    printWindow.document.write(`
      <html>
        <head>
          <title>${copia.documentoCodigo} - Cópia Controlada ${String(copia.numero).padStart(3, "0")}</title>
          <style>
            body { font-family: Inter, Arial, sans-serif; margin: 32px; color: #0f172a; }
            .header { border-bottom: 2px solid #1d4ed8; padding-bottom: 16px; margin-bottom: 24px; }
            .badge { display: inline-block; padding: 6px 10px; border-radius: 8px; background: #eff6ff; color: #1d4ed8; font-size: 12px; font-weight: 800; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 24px; }
            .box { border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; }
            .label { font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: .08em; }
            .value { margin-top: 4px; font-size: 14px; font-weight: 700; }
            .footer { position: fixed; left: 0; right: 0; bottom: 0; border-top: 2px solid #1d4ed8; padding: 10px 32px; font-size: 11px; font-weight: 800; color: #1d4ed8; text-align: center; background: #eff6ff; letter-spacing: .04em; }
          </style>
        </head>
        <body>
          <div class="header">
            <span class="badge">Cópia Controlada Nº ${String(copia.numero).padStart(3, "0")}</span>
            <h1>${copia.documentoTitulo}</h1>
            <p>${copia.documentoCodigo} · Revisão ${String(copia.revisao).padStart(2, "0")}</p>
          </div>
          <div class="grid">
            <div class="box"><div class="label">Destinatário</div><div class="value">${copia.profissional}</div></div>
            <div class="box"><div class="label">Setor / unidade</div><div class="value">${copia.setor}</div></div>
            <div class="box"><div class="label">Emitida por</div><div class="value">${copia.responsavelEmissao}</div></div>
            <div class="box"><div class="label">Quantidade</div><div class="value">${copia.quantidade}</div></div>
            <div class="box"><div class="label">Motivo</div><div class="value">${copia.motivo}</div></div>
            <div class="box"><div class="label">Previsão de recolhimento</div><div class="value">${copia.previsaoRecolhimento || "Não aplicável"}</div></div>
          </div>
          <div class="footer">${rodape}</div>
          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  async function salvarEmissao() {
    if (!documentoEmissao || !empresaId) return;
    if (!podeDistribuir) {
      setMensagemSistema({ tipo: "alerta", texto: "A emissão de cópias controladas é restrita à Qualidade." });
      return;
    }
    if (!formEmissao.profissional.trim() || !formEmissao.setor.trim() || !formEmissao.motivo.trim() || !formEmissao.responsavel.trim()) {
      setMensagemSistema({ tipo: "alerta", texto: "Preencha destinatário, setor, motivo e responsável pela emissão." });
      return;
    }
    const duplicata = copias.find((cp) =>
      cp.documentoId === documentoEmissao.id &&
      normalizarTexto(cp.setor) === normalizarTexto(formEmissao.setor) &&
      !["Recolhida", "Cancelada", "Substituída"].includes(cp.status)
    );
    if (duplicata) {
      setMensagemSistema({ tipo: "alerta", texto: "Já existe cópia ativa Nº " + String(duplicata.numero).padStart(3, "0") + " para o setor \"" + duplicata.setor + "\". Recolha antes de emitir uma nova." });
      return;
    }
    const copiasDoDoc = copias.filter((cp) => cp.documentoId === documentoEmissao.id);
    const numero = copiasDoDoc.length > 0 ? Math.max(...copiasDoDoc.map((cp) => cp.numero)) + 1 : 1;
    const dataEmissao = new Date().toISOString().slice(0, 10);
    const novaCopia: CopiaControlada = {
      id: crypto.randomUUID(),
      numero,
      documentoId: documentoEmissao.id,
      documentoCodigo: documentoEmissao.codigo,
      documentoTitulo: documentoEmissao.titulo,
      revisao: documentoEmissao.versao,
      setor: formEmissao.setor.trim(),
      profissional: formEmissao.profissional.trim(),
      motivo: formEmissao.motivo.trim(),
      quantidade: Number(formEmissao.quantidade || 1),
      responsavelEmissao: formEmissao.responsavel.trim(),
      dataEmissao,
      previsaoRecolhimento: formEmissao.previsaoRecolhimento,
      status: "Distribuída",
      historico: [new Date().toLocaleString("pt-BR") + " - Cópia emitida por " + formEmissao.responsavel.trim() + " para " + formEmissao.profissional.trim() + " (" + formEmissao.setor.trim() + ")."],
    };
    const { error } = await supabase.from("copias_controladas").insert({
      empresa_id: empresaId,
      documento_id: documentoEmissao.id,
      documento_codigo: documentoEmissao.codigo,
      documento_titulo: documentoEmissao.titulo,
      revisao: documentoEmissao.versao,
      numero_copia: numero,
      entregue_a: novaCopia.profissional,
      setor_destino: novaCopia.setor,
      status: novaCopia.status,
      motivo: novaCopia.motivo,
      quantidade: novaCopia.quantidade,
      responsavel_emissao: novaCopia.responsavelEmissao,
      data_emissao: dataEmissao,
      previsao_recolhimento: novaCopia.previsaoRecolhimento || null,
      rodape_pdf: rodapeCopia(novaCopia),
      historico: novaCopia.historico.join("\n"),
    });
    if (error) {
      setMensagemSistema({ tipo: "erro", texto: "Erro ao salvar cópia. Tente novamente." });
      return;
    }
    setCopias((atuais) => [novaCopia, ...atuais]);
    setDocumentoEmissao(null);
    gerarPdfControlado(novaCopia);
    setMensagemSistema({ tipo: "sucesso", texto: "Cópia controlada Nº " + String(numero).padStart(3, "0") + " emitida com sucesso." });
  }
  function abrirRecolhimento(copia: CopiaControlada) {
    if (!podeRecolher) {
      setMensagemSistema({ tipo: "alerta", texto: "O recolhimento de cÃ³pias controladas Ã© restrito Ã  Qualidade." });
      return;
    }
    setCopiaRecolhimento(copia);
    setFormRecolhimento({
      data: new Date().toISOString().slice(0, 10),
      responsavel: "",
      origem: `${copia.profissional} - ${copia.setor}`,
      destino: "Destruída",
      observacao: "",
    });
  }

  async function salvarRecolhimento() {
    if (!podeRecolher) {
      setMensagemSistema({ tipo: "alerta", texto: "O recolhimento de cópias controladas é restrito à Qualidade." });
      return;
    }
    if (!copiaRecolhimento || !formRecolhimento.responsavel.trim()) {
      setMensagemSistema({ tipo: "alerta", texto: "Informe quem recolheu a cópia." });
      return;
    }
    const { error } = await supabase
      .from("copias_controladas")
      .update({ status: "Recolhida" })
      .eq("id", copiaRecolhimento.id);
    if (error) {
      setMensagemSistema({ tipo: "erro", texto: "Erro ao registrar recolhimento." });
      return;
    }
    setCopias((atuais) => atuais.map((cp) => {
      if (cp.id !== copiaRecolhimento.id) return cp;
      return {
        ...cp,
        status: "Recolhida" as StatusCopiaControlada,
        recolhimento: { ...formRecolhimento },
        historico: [
          new Date().toLocaleString("pt-BR") + " - Recolhida por " + formRecolhimento.responsavel + " de " + formRecolhimento.origem + ". Destino: " + formRecolhimento.destino + ".",
          ...cp.historico,
        ],
      };
    }));
    setCopiaRecolhimento(null);
    setMensagemSistema({ tipo: "sucesso", texto: "Cópia recolhida e encerrada formalmente." });
  }
  function classeStatus(status: StatusCopiaControlada) {
    if (status === "Recolhida") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (status === "Vencida") return "bg-red-50 text-red-700 border-red-200";
    if (status === "Cancelada" || status === "Substituída") return "bg-slate-100 text-slate-600 border-slate-200";
    return "bg-blue-50 text-blue-700 border-blue-200";
  }


  const copiasFiltradas = copias.filter((cp) => {
    if (filtroReg.doc && !cp.documentoTitulo.toLowerCase().includes(filtroReg.doc.toLowerCase()) && !cp.documentoCodigo.toLowerCase().includes(filtroReg.doc.toLowerCase())) return false;
    if (filtroReg.setor && normalizarTexto(cp.setor) !== normalizarTexto(filtroReg.setor)) return false;
    if (filtroReg.profissional && !normalizarTexto(cp.profissional).includes(normalizarTexto(filtroReg.profissional))) return false;
    if (filtroReg.status && cp.status !== filtroReg.status) return false;
    return true;
  });

  if (isCarregando) return (
    <div className="flex items-center justify-center p-12 bg-white rounded-2xl border border-slate-100 shadow-sm">
      <RefreshCw className="animate-spin w-5 h-5 text-blue-600 mr-2" />
      <span className="text-sm font-bold text-slate-500">Carregando central de cópias...</span>
    </div>
  );
  return (
    <div className="animate-in slide-in-from-bottom-4 space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col xl:flex-row justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900">Controle de Cópias Controladas</h3>
          <p className="text-sm text-slate-500 font-medium mt-1 max-w-3xl">
            Central para emissão, distribuição, recolhimento e rastreabilidade de cópias controladas de documentos vigentes.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-3 py-2.5 rounded-xl w-full xl:w-96 shadow-inner">
          <Search className="w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Buscar documento vigente..." value={busca} onChange={(e) => setBusca(e.target.value)}
            className="w-full bg-transparent text-sm outline-none font-bold text-slate-700" />
        </div>
      </div>

      {(!podeDistribuir || !podeRecolher) && (
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-semibold text-blue-900">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
            <p>
              Política ativa: somente Qualidade ou administradores autorizados emitem, distribuem e recolhem cópias controladas. Usuários operacionais acompanham e visualizam documentos vigentes.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <ResumoCopiaCard titulo="Cópias distribuídas" valor={copiasAtivas.length} icon={<Copy className="w-5 h-5" />} cor="blue" />
        <ResumoCopiaCard titulo="Pendentes de recolhimento" valor={copiasPendentes} icon={<Clock className="w-5 h-5" />} cor="amber" />
        <ResumoCopiaCard titulo="Cópias recolhidas" valor={copiasRecolhidas} icon={<CheckCircle2 className="w-5 h-5" />} cor="emerald" />
        <ResumoCopiaCard titulo="Cópias vencidas" valor={copiasVencidas} icon={<AlertCircle className="w-5 h-5" />} cor="red" />
        <ResumoCopiaCard titulo="Documentos com cópias ativas" valor={documentosComCopiasAtivas} icon={<FileText className="w-5 h-5" />} cor="slate" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[0.9fr_1.1fr] gap-6">
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h4 className="text-sm font-bold text-slate-900">Documentos vigentes para emissão</h4>
            <p className="text-xs text-slate-500 mt-1">Somente documentos aprovados no repositório podem gerar cópia controlada.</p>
          </div>
          <div className="max-h-[520px] overflow-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-100 sticky top-0">
                <tr className="text-[10px] uppercase font-black text-slate-500 tracking-widest">
                  <th className="px-5 py-3">Documento</th>
                  <th className="px-5 py-3 text-center">Rev</th>
                  <th className="px-5 py-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {docsFiltrados.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-mono font-bold text-blue-700">{doc.codigo}</p>
                      <p className="font-bold text-slate-800 text-xs max-w-[280px] truncate">{doc.titulo}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{doc.setor}</p>
                    </td>
                    <td className="px-5 py-4 text-center font-bold text-slate-500">{String(doc.versao).padStart(2, "0")}</td>
                    <td className="px-5 py-4 text-right">
                      <button onClick={() => abrirEmissao(doc)} disabled={!podeDistribuir} className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold shadow-sm transition-colors ${podeDistribuir ? "bg-slate-900 text-white hover:bg-slate-800" : "bg-slate-100 text-slate-400 cursor-not-allowed"}`}>
                        <Plus className="w-3 h-3" /> Emitir cópia
                      </button>
                    </td>
                  </tr>
                ))}
                {docsFiltrados.length === 0 && (
                  <tr><td colSpan={3} className="px-6 py-12 text-center text-slate-500 font-bold">Nenhum documento vigente encontrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100">
            <h4 className="text-sm font-bold text-slate-900">Registros emitidos</h4>
            <p className="text-xs text-slate-500 mt-1">Histórico de emissão, status e recolhimento.</p>
          </div>
          <div className="p-3 border-b border-slate-100 grid grid-cols-2 gap-2 bg-slate-50/60">
            <input placeholder="Documento..." value={filtroReg.doc} onChange={(e) => setFiltroReg((f) => ({ ...f, doc: e.target.value }))} className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none focus:border-blue-500" />
            <select value={filtroReg.setor} onChange={(e) => setFiltroReg((f) => ({ ...f, setor: e.target.value }))} className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none focus:border-blue-500">
              <option value="">Todos os setores</option>
              {setoresList.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <input placeholder="Profissional..." value={filtroReg.profissional} onChange={(e) => setFiltroReg((f) => ({ ...f, profissional: e.target.value }))} className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none focus:border-blue-500" />
            <select value={filtroReg.status} onChange={(e) => setFiltroReg((f) => ({ ...f, status: e.target.value }))} className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none focus:border-blue-500">
              <option value="">Todos os status</option>
              <option value="Distribuída">Distribuída</option>
              <option value="Em uso">Em uso</option>
              <option value="Recolhida">Recolhida</option>
              <option value="Cancelada">Cancelada</option>
              <option value="Substituída">Substituída</option>
              <option value="Vencida">Vencida</option>
            </select>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr className="text-[10px] uppercase font-black text-slate-500 tracking-widest">
                  <th className="px-4 py-3">Nº Cópia</th>
                  <th className="px-4 py-3">Documento</th>
                  <th className="px-4 py-3">Revisão</th>
                  <th className="px-4 py-3">Setor</th>
                  <th className="px-4 py-3">Profissional</th>
                  <th className="px-4 py-3">Emissão</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Recolhimento</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {copiasFiltradas.map((copia) => (
                  <tr key={copia.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-black text-blue-700">{String(copia.numero).padStart(3, "0")}</td>
                    <td className="px-4 py-3 font-bold text-slate-800 max-w-[180px] truncate">{copia.documentoTitulo}</td>
                    <td className="px-4 py-3 font-bold text-slate-500">Rev. {String(copia.revisao).padStart(2, "0")}</td>
                    <td className="px-4 py-3 font-semibold text-slate-600">{copia.setor}</td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{copia.profissional}</td>
                    <td className="px-4 py-3 text-slate-500">{copia.dataEmissao ? new Date(copia.dataEmissao + "T00:00:00").toLocaleDateString("pt-BR") : "—"}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded-md border text-[10px] font-black uppercase ${classeStatus(copia.status)}`}>{copia.status}</span></td>
                    <td className="px-4 py-3 text-slate-500">{copia.recolhimento?.data ? new Date(copia.recolhimento.data + "T00:00:00").toLocaleDateString("pt-BR") : "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => gerarPdfControlado(copia)} className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50">PDF</button>
                        {!["Recolhida", "Cancelada", "Substituída"].includes(copia.status) && (
                          <button onClick={() => abrirRecolhimento(copia)} disabled={!podeRecolher} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${podeRecolher ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-slate-100 text-slate-400 cursor-not-allowed"}`}>Recolher</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {copiasFiltradas.length === 0 && (
                  <tr><td colSpan={9} className="px-6 py-12 text-center text-slate-500 font-bold">{copias.length === 0 ? "Nenhuma cópia controlada emitida ainda." : "Nenhuma cópia encontrada com os filtros."}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
        <h4 className="text-sm font-black">Regra crítica de revisão</h4>
        <p className="text-xs font-medium mt-1">Quando uma nova revisão for aprovada, o sistema deve alertar: existem cópias controladas ativas da revisão anterior. É necessário recolher ou substituir.</p>
      </div>

      {documentoEmissao && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Emitir cópia controlada</h3>
                <p className="text-xs text-slate-500 mt-1">{documentoEmissao.codigo} · Rev. {String(documentoEmissao.versao).padStart(2, "0")}</p>
              </div>
              <button onClick={() => setDocumentoEmissao(null)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <label>
                <span className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Profissional Destinatário</span>
                <select value={formEmissao.profissional} onChange={(e) => setFormEmissao((f) => ({ ...f, profissional: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium outline-none focus:border-blue-500">
                  <option value="">Selecione o profissional...</option>
                  {usuariosList.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </label>
              <label>
                <span className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Setor / Unidade</span>
                <select value={formEmissao.setor} onChange={(e) => setFormEmissao((f) => ({ ...f, setor: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium outline-none focus:border-blue-500">
                  <option value="">Selecione o setor...</option>
                  {setoresList.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <Field label="Motivo da distribuição" value={formEmissao.motivo} onChange={(v) => setFormEmissao((f) => ({ ...f, motivo: v }))} />
              <label>
                <span className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Responsável pela Emissão</span>
                <input type="text" value={formEmissao.responsavel} readOnly className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium outline-none text-slate-600 cursor-default" />
              </label>
              <Field label="Quantidade de cópias" type="number" value={String(formEmissao.quantidade)} onChange={(v) => setFormEmissao((f) => ({ ...f, quantidade: Number(v || 1) }))} />
              <Field label="Previsão de recolhimento" type="date" value={formEmissao.previsaoRecolhimento} onChange={(v) => setFormEmissao((f) => ({ ...f, previsaoRecolhimento: v }))} />
            </div>
            <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setDocumentoEmissao(null)} className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm font-bold">Cancelar</button>
              <button onClick={salvarEmissao} className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold shadow-md hover:bg-blue-700">Emitir e gerar PDF</button>
            </div>
          </div>
        </div>
      )}

      {copiaRecolhimento && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900">Recolher cópia nº {String(copiaRecolhimento.numero).padStart(3, "0")}</h3>
              <button onClick={() => setCopiaRecolhimento(null)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Data do recolhimento" type="date" value={formRecolhimento.data} onChange={(v) => setFormRecolhimento((f) => ({ ...f, data: v }))} />
              <Field label="Quem recolheu" value={formRecolhimento.responsavel} onChange={(v) => setFormRecolhimento((f) => ({ ...f, responsavel: v }))} />
              <Field label="De quem/setor foi recolhida" value={formRecolhimento.origem} onChange={(v) => setFormRecolhimento((f) => ({ ...f, origem: v }))} />
              <label>
                <span className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Destino</span>
                <select value={formRecolhimento.destino} onChange={(e) => setFormRecolhimento((f) => ({ ...f, destino: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium outline-none focus:border-blue-500">
                  <option>Destruída</option>
                  <option>Arquivada</option>
                  <option>Substituída</option>
                </select>
              </label>
              <div className="md:col-span-2">
                <Field label="Observação" value={formRecolhimento.observacao} onChange={(v) => setFormRecolhimento((f) => ({ ...f, observacao: v }))} />
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setCopiaRecolhimento(null)} className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm font-bold">Cancelar</button>
              <button onClick={salvarRecolhimento} className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold shadow-md hover:bg-emerald-700">Confirmar recolhimento</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label>
      <span className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium outline-none focus:border-blue-500"
      />
    </label>
  );
}

function ResumoCopiaCard({ titulo, valor, icon, cor }: { titulo: string; valor: number; icon: React.ReactNode; cor: string }) {
  const cores: Record<string, string> = {
    blue: "text-blue-600 bg-blue-50",
    amber: "text-amber-600 bg-amber-50",
    emerald: "text-emerald-600 bg-emerald-50",
    red: "text-red-600 bg-red-50",
    slate: "text-slate-600 bg-slate-100",
  };

  return (
    <div className="h-32 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${cores[cor]}`}>{icon}</div>
      <div>
        <p className="text-2xl font-black text-slate-900">{valor}</p>
        <p className="text-[10px] font-bold uppercase text-slate-500 leading-tight mt-1">{titulo}</p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
 * PAINEL CONFIGURAÇÃO ADMIN
 * ───────────────────────────────────────────────────────────────*/
function PainelConfiguracaoAdmin({ empresaId, obterEmpresaId, setMensagemSistema }: {
  empresaId: string | null;
  obterEmpresaId: () => Promise<string | null>;
  setMensagemSistema: (m: MensagemSistema) => void;
}) {
  const [activeTab, setActiveTab] = useState<"tipos" | "diretorias" | "setores" | "permissoes">("tipos");
  const [tipos, setTipos]         = useState<any[]>([]);
  const [diretorias, setDiretorias] = useState<any[]>([]);
  const [setores, setSetores]     = useState<any[]>([]);
  const [novoNome, setNovoNome]   = useState("");
  const [novaSigla, setNovaSigla] = useState("");
  const [novoDirId, setNovoDirId] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const carregarTudo = useCallback(async () => {
    const empresaAtualId = empresaId ?? await obterEmpresaId();
    if (!empresaAtualId) return;

    setIsLoading(true);
    const [resTipos, resDir, resSetores] = await Promise.all([
      supabase.from("config_tipos_doc").select("*").eq("empresa_id", empresaAtualId).order("sigla"),
      supabase.from("config_diretorias").select("*").eq("empresa_id", empresaAtualId).order("nome"),
      supabase.from("config_setores").select("*, config_diretorias(nome)").eq("empresa_id", empresaAtualId).order("nome"),
    ]);
    if (resTipos.data)   setTipos(resTipos.data);
    if (resDir.data)     setDiretorias(resDir.data);
    if (resSetores.data) setSetores(resSetores.data);
    setIsLoading(false);
  }, [empresaId, obterEmpresaId]);

  useEffect(() => { carregarTudo(); }, [carregarTudo]);

  const handleAdd = async () => {
    const empresaAtualId = empresaId ?? await obterEmpresaId();

    if (!empresaAtualId) {
      setMensagemSistema({ tipo: "erro", texto: "Não foi possível identificar a empresa do usuário." });
      return;
    }

    if (!novoNome.trim()) {
      setMensagemSistema({ tipo: "alerta", texto: "Informe o nome antes de adicionar." });
      return;
    }

    if (activeTab === "permissoes") return;

    if ((activeTab === "tipos" || activeTab === "setores") && !novaSigla.trim()) {
      setMensagemSistema({ tipo: "alerta", texto: "Informe a sigla antes de adicionar." });
      return;
    }

    if (activeTab === "setores" && !novoDirId) {
      setMensagemSistema({ tipo: "alerta", texto: "Selecione a diretoria vinculada ao setor." });
      return;
    }

    let error;

    if (activeTab === "tipos") {
      ({ error } = await supabase.from("config_tipos_doc").insert({ nome: novoNome.trim(), sigla: novaSigla.trim().toUpperCase(), empresa_id: empresaAtualId }));
    } else if (activeTab === "diretorias") {
      ({ error } = await supabase.from("config_diretorias").insert({ nome: novoNome.trim(), empresa_id: empresaAtualId }));
    } else if (activeTab === "setores") {
      ({ error } = await supabase.from("config_setores").insert({ nome: novoNome.trim(), sigla: novaSigla.trim().toUpperCase(), diretoria_id: novoDirId, empresa_id: empresaAtualId }));
    }

    if (!error) {
      setNovoNome(""); setNovaSigla(""); setNovoDirId("");
      carregarTudo();
      setMensagemSistema({ tipo: "sucesso", texto: "Item adicionado com sucesso!" });
    } else {
      setMensagemSistema({ tipo: "erro", texto: error.message || "Erro ao adicionar item." });
    }
  };

  const removerItem = async (tabela: string, id: string) => {
    if (!confirm("Deseja remover este item?")) return;
    const { error } = await supabase.from(tabela).delete().eq("id", id);
    if (!error) {
      carregarTudo();
    } else {
      setMensagemSistema({ tipo: "erro", texto: "Não foi possível remover. Verifique se há itens vinculados." });
    }
  };

  if (isLoading) return (
    <div className="text-center p-12 text-slate-500 font-bold flex justify-center bg-white rounded-xl border border-slate-100">
      <RefreshCw className="animate-spin w-6 h-6 mr-2" /> Carregando Configurações...
    </div>
  );

  return (
    <div className="flex bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden min-h-[500px] animate-in fade-in">
      <div className="w-64 bg-slate-50 border-r border-slate-100 p-4 shrink-0">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 px-3">Parâmetros do Sistema</h3>
        <nav className="space-y-1">
          {[
            { key: "tipos",      label: "Tipos de Documento", icon: <BookOpen className="w-4 h-4" /> },
            { key: "diretorias", label: "Diretorias",         icon: <Building2 className="w-4 h-4" /> },
            { key: "setores",    label: "Setores",            icon: <Layers className="w-4 h-4" /> },
            { key: "permissoes", label: "Permissões",         icon: <ShieldCheck className="w-4 h-4" /> },
          ].map((tab) => (
            <button key={tab.key} onClick={() => { setActiveTab(tab.key as typeof activeTab); setNovoNome(""); setNovaSigla(""); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === tab.key ? "bg-blue-100 text-blue-700" : "text-slate-600 hover:bg-slate-200"}`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex-1 p-8 flex flex-col bg-white">
        <div className="mb-6 pb-6 border-b border-slate-50">
          <h2 className="text-xl font-bold text-slate-800 mb-1">
            {activeTab === "tipos" ? "Tipos Documentais" : activeTab === "diretorias" ? "Estrutura de Diretorias" : activeTab === "setores" ? "Mapeamento de Setores" : "Matriz de Permissões"}
          </h2>
          <p className="text-sm text-slate-500">
            {activeTab === "tipos" ? "Gerencie as nomenclaturas (Ex: POP, MAN)." : activeTab === "diretorias" ? "Defina a alta gestão." : activeTab === "setores" ? "Cadastre as unidades operacionais." : "Estratifique quem elabora, homologa, torna obsoleto, distribui e recolhe cópias."}
          </p>
        </div>

        {activeTab === "permissoes" ? (
          <MatrizPermissoesDocumentos />
        ) : (
          <>
        <div className="flex gap-3 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100 items-end">
          {activeTab === "setores" && (
            <div className="w-64">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Diretoria Mãe</label>
              <select value={novoDirId} onChange={(e) => setNovoDirId(e.target.value)} className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none">
                <option value="">Selecione...</option>
                {diretorias.map((d: any) => <option key={d.id} value={d.id}>{d.nome}</option>)}
              </select>
            </div>
          )}
          {(activeTab === "tipos" || activeTab === "setores") && (
            <div className="w-32">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Sigla</label>
              <input type="text" value={novaSigla} onChange={(e) => setNovaSigla(e.target.value)} placeholder="Ex: UTI"
                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm uppercase font-bold outline-none" />
            </div>
          )}
          <div className="flex-1">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Nome por Extenso</label>
            <input type="text" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} placeholder="Digite o nome..."
              className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none" />
          </div>
          <button onClick={handleAdd} className="px-5 py-2.5 bg-blue-600 text-white font-bold rounded-lg text-sm hover:bg-blue-700 shadow-md flex items-center gap-2 h-[42px] transition-all">
            <Plus className="w-4 h-4" /> Adicionar
          </button>
        </div>

        <div className="flex-1 border border-slate-100 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase font-black text-slate-500 tracking-widest">
              <tr>
                {(activeTab === "tipos" || activeTab === "setores") && <th className="px-4 py-3 w-32">Sigla</th>}
                <th className="px-4 py-3">Nome / Descrição</th>
                {activeTab === "setores" && <th className="px-4 py-3">Diretoria Vinculada</th>}
                <th className="px-4 py-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 bg-white">
              {activeTab === "tipos" && tipos.map((t: any) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono font-bold text-blue-700">{t.sigla}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{t.nome}</td>
                  <td className="px-4 py-3 text-right"><button onClick={() => removerItem("config_tipos_doc", t.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors"><Trash2 className="w-4 h-4" /></button></td>
                </tr>
              ))}
              {activeTab === "diretorias" && diretorias.map((d: any) => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{d.nome}</td>
                  <td className="px-4 py-3 text-right"><button onClick={() => removerItem("config_diretorias", d.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors"><Trash2 className="w-4 h-4" /></button></td>
                </tr>
              ))}
              {activeTab === "setores" && setores.map((s: any) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono font-bold text-blue-700">{s.sigla}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{s.nome}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs font-bold">{s.config_diretorias?.nome || "Sem vínculo"}</td>
                  <td className="px-4 py-3 text-right"><button onClick={() => removerItem("config_setores", s.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors"><Trash2 className="w-4 h-4" /></button></td>
                </tr>
              ))}
              {activeTab === "tipos"      && tipos.length === 0      && <tr><td colSpan={3} className="p-8 text-center text-slate-400 font-medium">Nenhum Tipo cadastrado.</td></tr>}
              {activeTab === "diretorias" && diretorias.length === 0  && <tr><td colSpan={2} className="p-8 text-center text-slate-400 font-medium">Nenhuma Diretoria cadastrada.</td></tr>}
              {activeTab === "setores"    && setores.length === 0     && <tr><td colSpan={4} className="p-8 text-center text-slate-400 font-medium">Nenhum Setor cadastrado.</td></tr>}
            </tbody>
          </table>
        </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
 * SUB-COMPONENTES
 * ───────────────────────────────────────────────────────────────*/
function MatrizPermissoesDocumentos() {
  const regras = [
    { acao: "Elaborar documento", usuario: true, qualidade: true, admin: true, detalhe: "Usuario cria rascunho, anexa arquivo e envia ao fluxo." },
    { acao: "Enviar ao fluxo", usuario: true, qualidade: true, admin: true, detalhe: "Autor encaminha para verificacao e acompanha a tramitacao." },
    { acao: "Homologar documento", usuario: false, qualidade: true, admin: true, detalhe: "Homologacao final fica restrita a Qualidade." },
    { acao: "Tornar obsoleto", usuario: false, qualidade: true, admin: true, detalhe: "Exige motivo obrigatorio e registro em justificativa." },
    { acao: "Emitir copia controlada", usuario: false, qualidade: true, admin: true, detalhe: "Somente documentos vigentes do repositorio podem gerar copia." },
    { acao: "Recolher copia controlada", usuario: false, qualidade: true, admin: true, detalhe: "Encerramento formal com responsavel, origem, destino e observacao." },
    { acao: "Visualizar repositorio", usuario: true, qualidade: true, admin: true, detalhe: "Todos visualizam documentos aprovados e vigentes." },
    { acao: "Configurar parametros", usuario: false, qualidade: true, admin: true, detalhe: "Tipos, diretorias, setores e permissoes do modulo." },
  ];

  const Marcador = ({ ativo }: { ativo: boolean }) => (
    <span className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full border text-[10px] font-black ${ativo ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-400"}`}>
      {ativo ? "SIM" : "NAO"}
    </span>
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {[
          { titulo: "Usuario operacional", texto: "Elabora, envia ao fluxo, acompanha andamento e visualiza o repositorio.", cor: "bg-slate-50 text-slate-700 border-slate-200" },
          { titulo: "Qualidade", texto: "Homologa, torna obsoleto, distribui e recolhe copias controladas.", cor: "bg-blue-50 text-blue-700 border-blue-100" },
          { titulo: "Administrador", texto: "Mantem parametros, perfis autorizados e regras organizacionais.", cor: "bg-violet-50 text-violet-700 border-violet-100" },
        ].map((item) => (
          <div key={item.titulo} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl border ${item.cor}`}>
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-black text-slate-900">{item.titulo}</h3>
            <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500">{item.texto}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-500">
            <tr>
              <th className="px-5 py-4">Acao</th>
              <th className="px-5 py-4 text-center">Usuario</th>
              <th className="px-5 py-4 text-center">Qualidade</th>
              <th className="px-5 py-4 text-center">Admin</th>
              <th className="px-5 py-4">Regra operacional</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {regras.map((regra) => (
              <tr key={regra.acao} className="hover:bg-slate-50">
                <td className="px-5 py-4 font-bold text-slate-900">{regra.acao}</td>
                <td className="px-5 py-4 text-center"><Marcador ativo={regra.usuario} /></td>
                <td className="px-5 py-4 text-center"><Marcador ativo={regra.qualidade} /></td>
                <td className="px-5 py-4 text-center"><Marcador ativo={regra.admin} /></td>
                <td className="px-5 py-4 text-xs font-medium leading-relaxed text-slate-500">{regra.detalhe}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DashboardBlock({ title, desc, count, icon, color, onClick, isLoading }: any) {
  const colorMap: Record<string, string> = {
    emerald: "text-emerald-600 bg-emerald-50",
    blue:    "text-blue-600 bg-blue-50",
    amber:   "text-amber-600 bg-amber-50",
    purple:  "text-purple-600 bg-purple-50",
    slate:   "text-slate-600 bg-slate-50",
    red:     "text-red-600 bg-red-50",
  };
  return (
    <div onClick={onClick} className="bg-white rounded-2xl p-5 border border-slate-100 cursor-pointer hover:shadow-md transition-all flex flex-col justify-between h-32">
      <div className="flex justify-between items-start">
        <div className={`p-2 rounded-lg ${colorMap[color]}`}>{icon}</div>
        <span className="text-2xl font-black">{isLoading ? "..." : count}</span>
      </div>
      <div>
        <h3 className="text-[11px] font-black text-slate-800 uppercase leading-tight">{title}</h3>
        <p className="text-[10px] text-slate-500 leading-snug mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

function PipelineMiniCard({ label, value, color }: { label: string; value: number; color: string }) {
  const cores: Record<string, string> = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    purple: "bg-purple-50 text-purple-700 border-purple-100",
    red: "bg-red-50 text-red-700 border-red-100",
  };

  return (
    <div className={`rounded-xl border px-3 py-3 ${cores[color]}`}>
      <p className="text-xl font-black leading-none">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-wide leading-tight">{label}</p>
    </div>
  );
}

function ResumoCard({ titulo, valor, icon, cor }: any) {
  const cores: Record<string, string> = {
    blue:    "text-blue-600 bg-blue-50",
    amber:   "text-amber-600 bg-amber-50",
    emerald: "text-emerald-600 bg-emerald-50",
  };
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
      <div className={`p-3 rounded-xl ${cores[cor]}`}>{icon}</div>
      <div>
        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{titulo}</p>
        <p className="text-2xl font-black text-slate-800">{valor}</p>
      </div>
    </div>
  );
}
