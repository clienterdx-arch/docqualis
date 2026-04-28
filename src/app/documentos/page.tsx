"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FilePlus, Search, FileCheck, Clock, Archive, FileEdit,
  FileSpreadsheet, X, ArrowLeft, ShieldCheck,
  User, RefreshCw, FileText, CheckCircle2, AlertCircle,
  Edit, History, Plus, Trash2, Layers, BookOpen,
  Building2, Settings, Printer, Copy, XCircle,
  Workflow, Eye, FileSearch,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { carregarPerfilUsuario } from "@/lib/perfil";

/* ─────────────────────────────────────────────────────────────────
 * TIPOS
 * ───────────────────────────────────────────────────────────────*/
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
  dt_vencimento: string;
  isProcesso: boolean;
  empresa_id: string;
}

interface MensagemSistema {
  tipo: "sucesso" | "alerta" | "erro";
  texto: string;
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

  // ✅ Estado de sessão e empresa
  const [empresaId, setEmpresaId] = useState<string | null>(null);

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

      const perfil = await carregarPerfilUsuario<{ empresa_id?: string | null }>(session, "empresa_id");
      if (perfil?.empresa_id) {
        setEmpresaId(perfil.empresa_id);
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
    if (!confirm("Tem certeza que deseja tornar este documento OBSOLETO? Ele sairá da vigência.")) return;

    const { error } = await supabase
      .from("documentos")
      .update({ status: "Obsoleto" })
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
  const countRepositorio  = documentos.filter((d) => d.status === "Repositório").length;
  const countElaboracao   = documentos.filter((d) => d.status === "Em Elaboração" || d.status === "EM_FLUXO").length;
  const countVerificacao  = documentos.filter((d) => d.status === "Em Verificação").length;
  const countHomologacao  = documentos.filter((d) => d.status === "Em Homologação").length;
  const countRejeitados   = documentos.filter((d) => d.status === "Rejeitado" || d.status === "Devolvido").length;
  const countObsoleto     = documentos.filter((d) => d.status === "Obsoleto").length;

  const documentosFiltrados = documentos.filter((doc) => {
    if (pastaAtiva === "Em Elaboração") return doc.status === "Em Elaboração" || doc.status === "EM_FLUXO";
    if (pastaAtiva === "Rejeitados")    return doc.status === "Rejeitado" || doc.status === "Devolvido";
    return doc.status === pastaAtiva;
  });

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
          { key: "blocos",   label: "Pastas de Tramitação",       icon: <Layers className="w-4 h-4" /> },
          { key: "inspecao", label: "Inspeção 360°",              icon: <Search className="w-4 h-4" /> },
          { key: "copias",   label: "Cópias Controladas",         icon: <Printer className="w-4 h-4" /> },
          { key: "config",   label: "Configuração Organizacional", icon: <Settings className="w-4 h-4" /> },
        ].map((tab) => {
          const isActive =
            tab.key === "blocos"
              ? viewState === "blocos" || viewState === "lista"
              : viewState === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setViewState(tab.key as typeof viewState)}
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
            <DashboardBlock title="Repositório"   desc="Vigentes"   count={countRepositorio} icon={<FileCheck className="w-6 h-6" />}   color="emerald" onClick={() => { setPastaAtiva("Repositório");  setViewState("lista"); }} isLoading={isLoading} />
            <DashboardBlock title="Em Elaboração" desc="Rascunhos"  count={countElaboracao}  icon={<FileEdit className="w-6 h-6" />}     color="blue"    onClick={() => { setPastaAtiva("Em Elaboração"); setViewState("lista"); }} isLoading={isLoading} />
            <DashboardBlock title="Em Verificação" desc="Revisão"   count={countVerificacao} icon={<Clock className="w-6 h-6" />}        color="amber"   onClick={() => { setPastaAtiva("Em Verificação"); setViewState("lista"); }} isLoading={isLoading} />
            <DashboardBlock title="Em Homologação" desc="Aprovação" count={countHomologacao} icon={<ShieldCheck className="w-6 h-6" />} color="purple"  onClick={() => { setPastaAtiva("Em Homologação"); setViewState("lista"); }} isLoading={isLoading} />
            <DashboardBlock title="Rejeitados"    desc="Devolvidos" count={countRejeitados}  icon={<XCircle className="w-6 h-6" />}      color="red"     onClick={() => { setPastaAtiva("Rejeitados");   setViewState("lista"); }} isLoading={isLoading} />
            <DashboardBlock title="Obsoletos"     desc="Arquivados" count={countObsoleto}    icon={<Archive className="w-6 h-6" />}      color="slate"   onClick={() => { setPastaAtiva("Obsoletos");    setViewState("lista"); }} isLoading={isLoading} />
          </div>
        </div>
      )}

      {/* VISÃO: LISTA */}
      {viewState === "lista" && (
        <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
          <div className="flex items-center gap-4 mb-2">
            <button onClick={() => setViewState("blocos")} className="p-2 bg-white border border-slate-100 rounded-lg text-slate-500 hover:bg-slate-50 shadow-sm transition-all">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-slate-800">Pasta: <span className="text-blue-600">{pastaAtiva}</span></h2>
          </div>

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
                  {pastaAtiva === "Em Verificação" && <th className="px-4 py-3">Pendente de</th>}
                  <th className="px-4 py-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {documentosFiltrados.map((doc) => (
                  <tr key={doc.id} className="hover:bg-blue-50/40 transition-colors group text-sm">
                    <td className="px-4 py-3 font-mono font-bold text-blue-700">{doc.codigo}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest border whitespace-nowrap
                        ${doc.isProcesso ? "bg-indigo-50 text-indigo-600 border-indigo-200" : "bg-slate-100 text-slate-500 border-slate-100"}`}>
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
                    {pastaAtiva === "Em Verificação" && (
                      <td className="px-4 py-3 font-bold text-amber-600 text-xs truncate max-w-[150px]">
                        {doc.verificador_pendente?.split(";")[0]}
                      </td>
                    )}
                    <td className="px-4 py-3 text-right">
                      {pastaAtiva === "Repositório" ? (
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={(e) => handleVisualizarConteudo(e, doc)} title="Visualizar Documento" className="p-2 bg-white border border-slate-100 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); abrirFicha(doc); }} title="Ver Ficha Técnica" className="p-2 bg-white border border-slate-100 text-slate-600 rounded-lg hover:bg-slate-100 transition-all shadow-sm">
                            <FileSearch className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          {(pastaAtiva === "Em Elaboração" || pastaAtiva === "Rejeitados") && (
                            <Link href={`/editar-documento/${doc.id}`} onClick={(e) => e.stopPropagation()} className="px-3 py-1.5 bg-white border border-slate-100 text-slate-700 font-bold rounded-lg text-xs hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50 shadow-sm transition-all inline-flex items-center gap-1.5">
                              <Edit className="w-3.5 h-3.5" /> Retomar
                            </Link>
                          )}
                          {(pastaAtiva === "Em Verificação" || pastaAtiva === "Em Homologação") && (
                            <Link href={`/documento/${doc.id}`} onClick={(e) => e.stopPropagation()} className="px-3 py-1.5 bg-white border border-slate-100 text-slate-700 font-bold rounded-lg text-xs hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50 shadow-sm transition-all inline-flex items-center gap-1.5">
                              <Search className="w-3.5 h-3.5" /> Analisar
                            </Link>
                          )}
                          {pastaAtiva === "Obsoletos" && (
                            <button onClick={(e) => { e.stopPropagation(); abrirFicha(doc, "historico"); }} className="text-slate-500 font-bold flex items-center justify-end gap-1.5 hover:text-blue-600 transition-colors">
                              <History className="w-3.5 h-3.5" /> Histórico
                            </button>
                          )}
                        </div>
                      )}
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

      {/* VISÃO: INSPEÇÃO */}
      {viewState === "inspecao" && (
        <PainelInspecao documentos={documentos} isLoading={isLoading} aoAtualizar={fetchDocumentos} />
      )}

      {/* VISÃO: CÓPIAS */}
      {viewState === "copias" && (
        <PainelCopiasControladas
          documentos={documentos.filter((d) => d.status === "Repositório" && !d.isProcesso)}
          empresaId={empresaId}
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

            {docSelecionado.status === "Repositório" && (
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-4 shrink-0">
                <button onClick={() => handleTornarObsoleto(docSelecionado.id)} className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-red-200 text-red-600 font-bold rounded-xl text-sm hover:bg-red-50 transition-all shadow-sm">
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
function PainelCopiasControladas({ documentos, empresaId, setMensagemSistema }: {
  documentos: Documento[];
  empresaId: string | null;
  setMensagemSistema: (m: MensagemSistema) => void;
}) {
  const [busca, setBusca] = useState("");

  const docsFiltrados = documentos.filter((doc) =>
    doc.titulo?.toLowerCase().includes(busca.toLowerCase()) ||
    doc.codigo?.toLowerCase().includes(busca.toLowerCase())
  );

  // ✅ Registra cópia controlada no banco
  const handleRegistrarCopia = async (doc: Documento) => {
    if (!empresaId) return;
    const entregueA = prompt(`Registrar cópia de "${doc.titulo}"\n\nNome do destinatário:`);
    if (!entregueA?.trim()) return;

    const { error } = await supabase.from("copias_controladas").insert({
      empresa_id: empresaId,
      documento_id: doc.id,
      numero_copia: Date.now(), // substituir por sequência real
      entregue_a: entregueA,
      setor_destino: doc.setor,
      status: "EM_USO",
    });

    if (!error) {
      setMensagemSistema({ tipo: "sucesso", texto: `Cópia registrada para ${entregueA}.` });
    } else {
      setMensagemSistema({ tipo: "erro", texto: "Erro ao registrar cópia." });
    }
  };

  return (
    <div className="animate-in slide-in-from-bottom-4">
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Controle de Cópias Físicas</h3>
          <p className="text-sm text-slate-500 font-medium mt-1">Gere cópias rastreáveis para distribuição nos setores.</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-3 py-2.5 rounded-lg w-full md:w-96 shadow-inner">
          <Search className="w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Buscar documento vigente..." value={busca} onChange={(e) => setBusca(e.target.value)}
            className="w-full bg-transparent text-sm outline-none font-bold text-slate-700" />
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr className="text-[10px] uppercase font-black text-slate-500 tracking-widest">
                <th className="px-6 py-4">Código Oficial</th>
                <th className="px-6 py-4">Título do Documento</th>
                <th className="px-6 py-4 text-center">Revisão</th>
                <th className="px-6 py-4">Setor Origem</th>
                <th className="px-6 py-4 text-right">Controle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {docsFiltrados.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-mono font-bold text-blue-700">{doc.codigo}</td>
                  <td className="px-6 py-4 font-bold text-slate-800">{doc.titulo}</td>
                  <td className="px-6 py-4 text-center font-bold text-slate-500">{doc.versao}</td>
                  <td className="px-6 py-4 font-semibold text-slate-600">{doc.setor}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleRegistrarCopia(doc)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-900 shadow-md transition-colors"
                    >
                      <Copy className="w-3 h-3" /> Registrar Cópia
                    </button>
                  </td>
                </tr>
              ))}
              {docsFiltrados.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500 font-bold">Nenhum documento vigente encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
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
  const [activeTab, setActiveTab] = useState<"tipos" | "diretorias" | "setores">("tipos");
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
            {activeTab === "tipos" ? "Tipos Documentais" : activeTab === "diretorias" ? "Estrutura de Diretorias" : "Mapeamento de Setores"}
          </h2>
          <p className="text-sm text-slate-500">
            {activeTab === "tipos" ? "Gerencie as nomenclaturas (Ex: POP, MAN)." : activeTab === "diretorias" ? "Defina a alta gestão." : "Cadastre as unidades operacionais."}
          </p>
        </div>

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
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
 * SUB-COMPONENTES
 * ───────────────────────────────────────────────────────────────*/
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
        <h3 className="text-xs font-black text-slate-800 uppercase">{title}</h3>
        <p className="text-[10px] text-slate-500">{desc}</p>
      </div>
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
