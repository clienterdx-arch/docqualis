"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  FilePlus, Search, FileCheck, Clock, Archive, FileEdit,
  FileSpreadsheet, X, ArrowLeft, ShieldCheck,
  User, RefreshCw, FileText, CheckCircle2, AlertCircle, 
  Edit, History, Plus, Trash2, Layers, BookOpen, 
  Building2, Settings, Printer, ChevronRight, Copy, XCircle,
  Workflow, Eye, FileSearch
} from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function GestaoDocumentosPage() {
  const router = useRouter();
  const [viewState, setViewState] = useState<"blocos" | "lista" | "config" | "inspecao" | "copias">("blocos");
  const [pastaAtiva, setPastaAtiva] = useState<string>("");
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  
  const [docSelecionado, setDocSelecionado] = useState<any>(null);
  const [fichaTab, setFichaTab] = useState<'detalhes' | 'historico'>('detalhes');
  const [mensagemSistema, setMensagemSistema] = useState<{tipo: 'sucesso' | 'alerta' | 'erro', texto: string} | null>(null);

  const [documentos, setDocumentos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { fetchDocumentos(); }, []);

  const fetchDocumentos = async () => {
    setIsLoading(true);
    const { data, error } = await (supabase.from('documentos').select('*') as any).order('created_at', { ascending: false });
    
    let docsFormatados: any[] = [];
    if (data) {
      docsFormatados = data.map((doc: any) => ({
        ...doc,
        isProcesso: false,
        status: doc.status || "Em Elaboração",
        dt_elaboracao: doc.dt_elaboracao ? new Date(doc.dt_elaboracao).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : "-",
        dt_vencimento: doc.dt_vencimento ? new Date(doc.dt_vencimento).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : "-",
      }));
    }

    // Integra os Processos/Fluxos Aprovados (Mock) para aparecer no repositório geral
    const processosVigentes = [
      { id: 'PRC-OP-001', codigo: "PRC-OP-001", titulo: "Atendimento de Urgência (P.A.)", versao: 3, status: "Repositório", elaborador: "Diretoria Médica", setor: "P.A.", dt_elaboracao: "15/03/2026", dt_vencimento: "15/03/2027", isProcesso: true, tipoFluxo: 'SIPOC' },
      { id: 'FLX-UTI-001', codigo: "FLX-UTI-001", titulo: "Prevenção de PAV na UTI", versao: 2, status: "Repositório", elaborador: "Enfermagem UTI", setor: "UTI", dt_elaboracao: "10/02/2026", dt_vencimento: "10/02/2027", isProcesso: true, tipoFluxo: 'BPMN' }
    ];

    setDocumentos([...docsFormatados, ...processosVigentes]);
    setIsLoading(false);
  };

  const abrirFicha = (doc: any, tab: 'detalhes' | 'historico' = 'detalhes') => { 
    setDocSelecionado(doc); 
    setFichaTab(tab); 
  };

  const handleVisualizarConteudo = (e: React.MouseEvent, doc: any) => {
    e.stopPropagation();
    if (doc.isProcesso) {
      router.push('/processos');
    } else if (doc.arquivo_url) {
      window.open(doc.arquivo_url, '_blank');
    } else {
      alert("Arquivo não localizado.");
    }
  };

  const handleTornarObsoleto = async (id: string) => {
    if (!confirm("Tem certeza que deseja tornar este documento OBSOLETO? Ele sairá da vigência e não poderá mais ser acessado pelos usuários finais.")) return;
    
    if(docSelecionado.isProcesso) {
      alert("Ação não disponível para fluxos mockados.");
      return;
    }

    const { error } = await supabase.from('documentos').update({ status: 'Obsoleto' }).eq('id', id);
    if (!error) {
      setMensagemSistema({ tipo: 'sucesso', texto: 'Documento arquivado como Obsoleto com sucesso.' });
      setDocSelecionado(null);
      fetchDocumentos();
      setTimeout(() => setMensagemSistema(null), 3000);
    } else {
      setMensagemSistema({ tipo: 'erro', texto: 'Erro ao arquivar documento.' });
      setTimeout(() => setMensagemSistema(null), 3000);
    }
  };

  const handleCriarNovaVersao = (doc: any) => {
    const query = new URLSearchParams({
      base_id: doc.id,
      codigo: doc.codigo,
      titulo: doc.titulo,
      tipo: doc.tipo_documento || doc.tipoFluxo || "",
      diretoria: doc.diretoria || "",
      setor: doc.setor || "",
      versao: String(Number(doc.versao) + 1), 
      acao: "revisao"
    }).toString();
    
    router.push(`/novo-documento?${query}`);
  };

  const countRepositorio = documentos.filter((d: any) => d.status === "Repositório").length;
  const countElaboracao = documentos.filter((d: any) => d.status === "Em Elaboração" || d.status === "EM_FLUXO").length;
  const countVerificacao = documentos.filter((d: any) => d.status === "Em Verificação").length;
  const countHomologacao = documentos.filter((d: any) => d.status === "Em Homologação").length;
  const countRejeitados = documentos.filter((d: any) => d.status === "Rejeitado" || d.status === "Devolvido").length;
  const countObsoleto = documentos.filter((d: any) => d.status === "Obsoleto").length;

  const documentosFiltrados = documentos.filter((doc: any) => {
    if (pastaAtiva === "Em Elaboração") return doc.status === "Em Elaboração" || doc.status === "EM_FLUXO";
    if (pastaAtiva === "Rejeitados") return doc.status === "Rejeitado" || doc.status === "Devolvido";
    return doc.status === pastaAtiva;
  });

  return (
    <div className="p-8 max-w-[1400px] mx-auto animate-in fade-in duration-500 relative print:p-0">
      
      {mensagemSistema && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 font-bold text-sm animate-in slide-in-from-top-10 print:hidden
          ${mensagemSistema.tipo === 'sucesso' ? 'bg-emerald-600 text-white' : ''}
          ${mensagemSistema.tipo === 'alerta' ? 'bg-amber-500 text-white' : ''}
          ${mensagemSistema.tipo === 'erro' ? 'bg-red-600 text-white' : ''}
        `}>
          {mensagemSistema.tipo === 'sucesso' && <CheckCircle2 className="w-5 h-5"/>}
          {mensagemSistema.tipo === 'alerta' && <AlertCircle className="w-5 h-5"/>}
          {mensagemSistema.tipo === 'erro' && <X className="w-5 h-5"/>}
          {mensagemSistema.texto}
        </div>
      )}

      {/* HEADER PRINCIPAL */}
      <div className="flex items-center justify-between mb-8 print:hidden">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Gestão de Documentos</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Controle de informação documentada ISO 9001</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setIsExportModalOpen(true)} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-50 shadow-sm transition-all"><FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Exportar Lista Mestra</button>
          <Link href="/novo-documento" className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 shadow-md transition-all"><FilePlus className="w-4 h-4" /> Novo Documento</Link>
        </div>
      </div>

      {/* TABS DE NAVEGAÇÃO */}
      <div className="border-b border-slate-200 mb-8 flex gap-8 text-sm font-bold text-slate-500 overflow-x-auto print:hidden">
        <button onClick={() => setViewState("blocos")} className={`pb-4 border-b-2 transition-all flex items-center gap-2 ${viewState === "blocos" || viewState === "lista" ? "border-blue-600 text-blue-600" : "border-transparent hover:text-slate-800"}`}>
          <Layers className="w-4 h-4"/> Pastas de Tramitação
        </button>
        <button onClick={() => setViewState("inspecao")} className={`pb-4 border-b-2 transition-all flex items-center gap-2 ${viewState === "inspecao" ? "border-blue-600 text-blue-600" : "border-transparent hover:text-slate-800"}`}>
          <Search className="w-4 h-4"/> Inspeção 360°
        </button>
        <button onClick={() => setViewState("copias")} className={`pb-4 border-b-2 transition-all flex items-center gap-2 ${viewState === "copias" ? "border-blue-600 text-blue-600" : "border-transparent hover:text-slate-800"}`}>
          <Printer className="w-4 h-4"/> Cópias Controladas
        </button>
        <button onClick={() => setViewState("config")} className={`pb-4 border-b-2 transition-all flex items-center gap-2 ${viewState === "config" ? "border-blue-600 text-blue-600" : "border-transparent hover:text-slate-800"}`}>
          <Settings className="w-4 h-4"/> Configuração Organizacional
        </button>
      </div>

      {/* VISÃO 1: BLOCOS (PASTAS) */}
      {viewState === "blocos" && (
        <div className="animate-in fade-in">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
            <DashboardBlock title="Repositório" desc="Vigentes" count={countRepositorio} icon={<FileCheck className="w-6 h-6" />} color="emerald" onClick={() => { setPastaAtiva("Repositório"); setViewState("lista"); }} isLoading={isLoading} />
            <DashboardBlock title="Em Elaboração" desc="Rascunhos" count={countElaboracao} icon={<FileEdit className="w-6 h-6" />} color="blue" onClick={() => { setPastaAtiva("Em Elaboração"); setViewState("lista"); }} isLoading={isLoading} />
            <DashboardBlock title="Em Verificação" desc="Revisão" count={countVerificacao} icon={<Clock className="w-6 h-6" />} color="amber" onClick={() => { setPastaAtiva("Em Verificação"); setViewState("lista"); }} isLoading={isLoading} />
            <DashboardBlock title="Em Homologação" desc="Aprovação" count={countHomologacao} icon={<ShieldCheck className="w-6 h-6" />} color="purple" onClick={() => { setPastaAtiva("Em Homologação"); setViewState("lista"); }} isLoading={isLoading} />
            <DashboardBlock title="Rejeitados" desc="Devolvidos" count={countRejeitados} icon={<XCircle className="w-6 h-6" />} color="red" onClick={() => { setPastaAtiva("Rejeitados"); setViewState("lista"); }} isLoading={isLoading} />
            <DashboardBlock title="Obsoletos" desc="Arquivados" count={countObsoleto} icon={<Archive className="w-6 h-6" />} color="slate" onClick={() => { setPastaAtiva("Obsoletos"); setViewState("lista"); }} isLoading={isLoading} />
          </div>
        </div>
      )}

      {/* VISÃO 2: LISTAGEM DENTRO DE UMA PASTA */}
      {viewState === "lista" && (
        <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
          <div className="flex items-center gap-4 mb-2">
            <button onClick={() => setViewState("blocos")} className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 shadow-sm transition-all"><ArrowLeft className="w-5 h-5" /></button>
            <h2 className="text-xl font-bold text-slate-800">Pasta: <span className="text-blue-600">{pastaAtiva}</span></h2>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-black text-slate-500 tracking-widest">
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
                {documentosFiltrados.map((doc: any) => (
                  <tr key={doc.id} className="hover:bg-blue-50/40 transition-colors group text-sm">
                    <td className="px-4 py-3 font-mono font-bold text-blue-700">{doc.codigo}</td>
                    
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest border whitespace-nowrap
                        ${doc.isProcesso ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-slate-100 text-slate-500 border-slate-200'}
                      `}>
                        {doc.tipo_documento || doc.tipoFluxo}
                      </span>
                    </td>

                    <td className="px-4 py-3 font-bold text-slate-800">{doc.titulo}</td>

                    <td className="px-4 py-3 text-center text-slate-500 font-medium">{doc.versao}</td>
                    <td className="px-4 py-3 text-slate-600 font-medium flex items-center gap-1.5"><User className="w-3 h-3 text-slate-400"/>{doc.elaborador}</td>
                    <td className="px-4 py-3 text-slate-600 font-medium">{doc.dt_elaboracao}</td>
                    <td className="px-4 py-3 text-slate-600 font-medium font-bold text-slate-700">{doc.setor}</td>
                    {pastaAtiva === "Em Verificação" && <td className="px-4 py-3 font-bold text-amber-600 text-xs truncate max-w-[150px]">{doc.verificador_pendente?.split(';')[0]}</td>}
                    
                    <td className="px-4 py-3 text-right">
                      {pastaAtiva === "Repositório" ? (
                        <div className="flex items-center justify-end gap-2">
                           <button 
                            onClick={(e) => handleVisualizarConteudo(e, doc)}
                            className="p-2 bg-white border border-slate-200 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                            title="Consultar Rotina (Visualizar Documento/Fluxo)"
                           >
                             <Eye className="w-4 h-4" />
                           </button>
                           <button 
                            onClick={(e) => { e.stopPropagation(); abrirFicha(doc); }}
                            className="p-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-100 transition-all shadow-sm"
                            title="Ver Ficha Técnica (Metadados)"
                           >
                             <FileSearch className="w-4 h-4" />
                           </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          {(pastaAtiva === "Em Elaboração" || pastaAtiva === "Rejeitados") && (
                            <Link href={`/editar-documento/${doc.id}`} onClick={(e) => e.stopPropagation()} className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-lg text-xs hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50 shadow-sm transition-all inline-flex items-center justify-center gap-1.5">
                              <Edit className="w-3.5 h-3.5"/> Retomar
                            </Link>
                          )}
                          {(pastaAtiva === "Em Verificação" || pastaAtiva === "Em Homologação") && (
                            <Link href={`/documento/${doc.id}`} onClick={(e) => e.stopPropagation()} className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-lg text-xs hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50 shadow-sm transition-all inline-flex items-center justify-center gap-1.5">
                              <Search className="w-3.5 h-3.5"/> Analisar
                            </Link>
                          )}
                          
                          {pastaAtiva === "Obsoletos" && (
                            <button onClick={(e) => { e.stopPropagation(); abrirFicha(doc, 'historico'); }} className="text-slate-500 font-bold flex items-center justify-end gap-1.5 hover:text-blue-600 transition-colors">
                              <History className="w-3.5 h-3.5"/> Histórico
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

      {/* VISÃO 3: INSPEÇÃO */}
      {viewState === "inspecao" && (
        <PainelInspecao documentos={documentos} isLoading={isLoading} aoAtualizar={fetchDocumentos} />
      )}

      {/* VISÃO 4: CÓPIAS CONTROLADAS */}
      {viewState === "copias" && (
        <PainelCopiasControladas documentos={documentos.filter(d => d.status === "Repositório" && !d.isProcesso)} />
      )}

      {/* VISÃO 5: CONFIGURAÇÃO ORGANIZACIONAL */}
      {viewState === "config" && (
        <PainelConfiguracaoAdmin setMensagemSistema={setMensagemSistema} />
      )}

      {/* MODAL EXPORTAR */}
      {isExportModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in print:hidden">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-md font-bold text-slate-900">Gerar Relatório</h3>
              <button onClick={() => setIsExportModalOpen(false)} className="text-slate-400"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-6 text-center">
              <FileSpreadsheet className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
              <button onClick={() => setIsExportModalOpen(false)} className="w-full py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold shadow-lg hover:bg-emerald-700 transition-colors">Exportar Base</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: FICHA TÉCNICA */}
      {docSelecionado && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-end z-[100] animate-in fade-in print:hidden">
          <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col animate-in slide-in-from-right-8 border-l border-slate-200">
            
            <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50 shrink-0">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl border shadow-inner mt-1 ${docSelecionado.isProcesso ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                  {docSelecionado.isProcesso ? <Workflow className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                     <span className="font-mono text-sm font-black text-blue-700">{docSelecionado.codigo}</span>
                     <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-slate-200 text-slate-600">Rev. {docSelecionado.versao}</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 leading-tight pr-4">{docSelecionado.titulo}</h3>
                  
                  <div className="mt-3 flex items-center gap-2">
                     <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border
                        ${docSelecionado.status === 'Repositório' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : ''}
                        ${docSelecionado.status === 'Obsoleto' ? 'bg-slate-100 text-slate-500 border-slate-200' : ''}
                        ${docSelecionado.status === 'Em Verificação' ? 'bg-amber-50 text-amber-700 border-amber-200' : ''}
                     `}>
                        Status: {docSelecionado.status}
                     </span>
                  </div>
                </div>
              </div>
              <button onClick={() => setDocSelecionado(null)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full transition-colors shrink-0"><X className="w-5 h-5"/></button>
            </div>

            <div className="p-8 overflow-y-auto flex-1 bg-white custom-scrollbar space-y-8">
               <section>
                  <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest border-b border-slate-100 pb-2 mb-4 flex items-center gap-2">
                    <BookOpen className="w-4 h-4"/> 1. Identificação do Documento
                  </h4>
                  <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                    <div className="col-span-2">
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Título</p>
                       <p className="text-sm font-bold text-slate-800">{docSelecionado.titulo}</p>
                    </div>
                    <div>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tipo de Documento</p>
                       <p className="text-sm font-bold text-slate-700">{docSelecionado.tipo_documento || docSelecionado.tipoFluxo}</p>
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
                    <History className="w-4 h-4"/> 2. Controle de Versão e Prazos
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
                       <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Justificativa da Versão Atual</p>
                       <p className="text-sm text-slate-600 italic bg-white p-3 rounded-lg border border-slate-100">{docSelecionado.justificativa || "Sem justificativa registrada na elaboração desta versão."}</p>
                    </div>
                  </div>
               </section>

               <section>
                  <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest border-b border-slate-100 pb-2 mb-4 flex items-center gap-2">
                    <User className="w-4 h-4"/> 3. Matriz de Responsabilidades
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
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Verificadores (Consenso)</p>
                         <ul className="text-sm text-slate-600 mt-1 space-y-1">
                           {docSelecionado.verificador_pendente.split(';').map((v: string, i: number) => <li key={i} className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-slate-300 rounded-full"/> {v}</li>)}
                         </ul>
                      </div>
                    )}
                  </div>
               </section>
            </div>

            {docSelecionado.status === "Repositório" && (
              <div className="p-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-4 shrink-0">
                 <button 
                   onClick={() => handleTornarObsoleto(docSelecionado.id)}
                   className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-red-200 text-red-600 font-bold rounded-xl text-sm hover:bg-red-50 transition-all shadow-sm"
                 >
                   <Archive className="w-4 h-4"/> Tornar Obsoleto
                 </button>
                 
                 <button 
                   onClick={() => handleCriarNovaVersao(docSelecionado)}
                   className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl text-sm hover:bg-blue-700 transition-all shadow-md"
                 >
                   <Edit className="w-4 h-4"/> Criar Nova Versão (Rev. {Number(docSelecionado.versao) + 1})
                 </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// COMPONENTES DE SUB-MÓDULOS
// ==========================================

function PainelInspecao({ documentos, isLoading, aoAtualizar }: any) {
  const [filtroGlobal, setFiltroGlobal] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("Todos");

  const docsFiltrados = documentos.filter((doc: any) => {
    const busca = filtroGlobal.toLowerCase();
    const matchesTexto = doc.titulo?.toLowerCase().includes(busca) || doc.codigo?.toLowerCase().includes(busca) || doc.elaborador?.toLowerCase().includes(busca);
    const matchesStatus = statusFiltro === "Todos" || doc.status === statusFiltro;
    return matchesTexto && matchesStatus;
  });

  const total = docsFiltrados.length;
  const pendentes = docsFiltrados.filter((d:any) => d.status !== 'Repositório' && d.status !== 'Obsoleto').length;
  const vigentes = docsFiltrados.filter((d:any) => d.status === 'Repositório').length;

  const getStatusStyle = (status: string) => {
    switch(status) {
      case 'Repositório': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Em Verificação': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Em Homologação': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Em Elaboração': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Rejeitado':
      case 'Devolvido': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const gerarRelatorioPDF = () => window.print();

  return (
    <div className="animate-in slide-in-from-bottom-4">
      <div className="hidden print:block mb-8">
        <h2 className="text-2xl font-black text-slate-900 border-b border-slate-200 pb-2">Relatório de Inspeção de Documentos</h2>
        <p className="text-sm text-slate-500 mt-2">Gerado em: {new Date().toLocaleString('pt-BR')}</p>
      </div>

      <div className="flex justify-end mb-6 print:hidden">
        <button onClick={gerarRelatorioPDF} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-50 shadow-sm transition-all">
          <Printer className="w-4 h-4 text-blue-600" /> Relatório PDF / Imprimir
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 print:grid-cols-3">
        <ResumoCard titulo="Documentos em Inspeção" valor={total} icon={<FileText className="w-5 h-5"/>} cor="blue" />
        <ResumoCard titulo="Processos com Pendência" valor={pendentes} icon={<Clock className="w-5 h-5"/>} cor="amber" />
        <ResumoCard titulo="Índice de Vigência" valor={total > 0 ? `${Math.round((vigentes/total)*100)}%` : '100%'} icon={<CheckCircle2 className="w-5 h-5"/>} cor="emerald" />
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-wrap items-center gap-4 print:hidden">
        <div className="flex-1 min-w-[300px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Localizar por Código, Título ou Responsável..." 
            value={filtroGlobal} onChange={(e) => setFiltroGlobal(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 focus:bg-white transition-all"
          />
        </div>
        <select value={statusFiltro} onChange={(e) => setStatusFiltro(e.target.value)} className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 outline-none cursor-pointer">
          <option value="Todos">Todos os Status</option>
          <option value="Repositório">Vigentes</option>
          <option value="Em Verificação">Em Verificação</option>
          <option value="Em Homologação">Em Homologação</option>
          <option value="Em Elaboração">Em Elaboração</option>
          <option value="Rejeitado">Rejeitados</option>
        </select>
        <button onClick={aoAtualizar} className="p-2.5 text-slate-400 hover:text-blue-600 transition-colors">
          <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden print:border-none print:shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 print:bg-white print:border-black">
              <tr className="text-[10px] uppercase font-black text-slate-500 tracking-widest print:text-black">
                <th className="px-6 py-4">Status Atual</th>
                <th className="px-6 py-4">Identificação</th>
                <th className="px-6 py-4">Setor</th>
                <th className="px-6 py-4">Responsável Atual</th>
                <th className="px-6 py-4 text-center">Vencimento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 print:divide-black/20">
              {docsFiltrados.map((doc:any) => (
                <tr key={doc.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border print:border-none print:px-0 ${getStatusStyle(doc.status)}`}>
                      {doc.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-mono font-bold text-blue-700 print:text-black">{doc.codigo}</div>
                    <div className="font-bold text-slate-800 text-xs mt-0.5 max-w-[200px] truncate flex items-center gap-1.5" title={doc.titulo}>
                      {doc.titulo}
                      {doc.isProcesso && <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-600 border border-indigo-200">{doc.tipoFluxo}</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-600 uppercase text-[10px]">{doc.setor}</td>
                  <td className="px-6 py-4 font-medium text-slate-700">
                    <div className="flex flex-col">
                      <span>{doc.elaborador}</span>
                      {doc.status === 'Em Verificação' && <span className="text-[9px] text-amber-600 font-bold">Aguardando: {doc.verificador_pendente?.split(';')[0]}</span>}
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

function PainelCopiasControladas({ documentos }: { documentos: any[] }) {
  const [busca, setBusca] = useState("");

  const docsFiltrados = documentos.filter((doc: any) => 
    doc.titulo?.toLowerCase().includes(busca.toLowerCase()) || 
    doc.codigo?.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="animate-in slide-in-from-bottom-4">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
           <h3 className="text-lg font-bold text-slate-800">Controle de Cópias Físicas</h3>
           <p className="text-sm text-slate-500 font-medium mt-1">Gere cópias rastreáveis com marca d'água para distribuição nos setores.</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-lg w-full md:w-96 shadow-inner">
          <Search className="w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar documento vigente para impressão..." 
            value={busca} onChange={(e) => setBusca(e.target.value)}
            className="w-full bg-transparent text-sm outline-none font-bold text-slate-700"
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-[10px] uppercase font-black text-slate-500 tracking-widest">
                <th className="px-6 py-4">Código Oficial</th>
                <th className="px-6 py-4">Título do Documento</th>
                <th className="px-6 py-4 text-center">Revisão</th>
                <th className="px-6 py-4">Setor Origem</th>
                <th className="px-6 py-4 text-right">Controle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {docsFiltrados.map((doc:any) => (
                <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-mono font-bold text-blue-700">{doc.codigo}</td>
                  <td className="px-6 py-4 font-bold text-slate-800">{doc.titulo}</td>
                  <td className="px-6 py-4 text-center font-bold text-slate-500">{doc.versao}</td>
                  <td className="px-6 py-4 font-semibold text-slate-600">{doc.setor}</td>
                  <td className="px-6 py-4 text-right">
                    <button className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-900 shadow-md transition-colors">
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

function DashboardBlock({ title, desc, count, icon, color, onClick, isLoading }: any) {
  const colorMap: any = { 
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100", 
    blue: "bg-blue-50 text-blue-600 border-blue-100", 
    amber: "bg-amber-50 text-amber-600 border-amber-100", 
    purple: "bg-purple-50 text-purple-600 border-purple-100", 
    slate: "bg-slate-50 text-slate-600 border-slate-200",
    red: "bg-red-50 text-red-600 border-red-100"
  };
  
  return (
    <div onClick={onClick} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group min-h-[140px] flex flex-col justify-between">
      <div className="flex justify-between items-start">
        <div className={`p-2.5 rounded-xl border ${colorMap[color]} transition-colors`}>{icon}</div>
        <div className="text-right">{isLoading ? <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div> : <span className="text-2xl font-black text-slate-800">{count}</span>}</div>
      </div>
      <div><h3 className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{title}</h3><p className="text-[10px] text-slate-500 font-medium leading-tight">{desc}</p></div>
    </div>
  );
}

function ResumoCard({ titulo, valor, icon, cor }: any) {
  const cores: any = { blue: "text-blue-600 bg-blue-50", amber: "text-amber-600 bg-amber-50", emerald: "text-emerald-600 bg-emerald-50" };
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
      <div className={`p-3 rounded-xl ${cores[cor]}`}>{icon}</div>
      <div><p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{titulo}</p><p className="text-2xl font-black text-slate-800">{valor}</p></div>
    </div>
  );
}

function PainelConfiguracaoAdmin({ setMensagemSistema }: any) {
  const [activeTab, setActiveTab] = useState<'tipos' | 'diretorias' | 'setores'>('tipos');

  const [tipos, setTipos] = useState<any[]>([]);
  const [diretorias, setDiretorias] = useState<any[]>([]);
  const [setores, setSetores] = useState<any[]>([]);

  const [novoNome, setNovoNome] = useState("");
  const [novaSigla, setNovaSigla] = useState("");
  const [novoDirId, setNovoDirId] = useState("");

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => { carregarTudo(); }, []);

  const carregarTudo = async () => {
    setIsLoading(true);
    const [resTipos, resDir, resSetores] = await Promise.all([
      (supabase.from('config_tipos_doc').select('*') as any).order('sigla'),
      (supabase.from('config_diretorias').select('*') as any).order('nome'),
      (supabase.from('config_setores').select('*, config_diretorias(nome)') as any).order('nome')
    ]);
    if (resTipos.data) setTipos(resTipos.data);
    if (resDir.data) setDiretorias(resDir.data);
    if (resSetores.data) setSetores(resSetores.data);
    setIsLoading(false);
  };

  const handleAdd = async () => {
    if (!novoNome) return;
    let error;
    if (activeTab === 'tipos' && novaSigla) {
      const res: any = await supabase.from('config_tipos_doc').insert([{ nome: novoNome, sigla: novaSigla.toUpperCase() }]);
      error = res.error;
    } else if (activeTab === 'diretorias') {
      const res: any = await supabase.from('config_diretorias').insert([{ nome: novoNome }]);
      error = res.error;
    } else if (activeTab === 'setores' && novaSigla && novoDirId) {
      const res: any = await supabase.from('config_setores').insert([{ nome: novoNome, sigla: novaSigla.toUpperCase(), diretoria_id: novoDirId }]);
      error = res.error;
    } else return;

    if (!error) { 
      setNovoNome(""); setNovaSigla(""); setNovoDirId(""); carregarTudo(); 
      setMensagemSistema({tipo:'sucesso', texto:'Registro salvo com sucesso!'}); setTimeout(()=>setMensagemSistema(null),3000); 
    }
  };

  const removerItem = async (tabela: string, id: string) => {
    const { error } = await (supabase.from(tabela).delete() as any).eq('id', id);
    if (!error) { carregarTudo(); setMensagemSistema({tipo:'sucesso', texto:'Item removido!'}); setTimeout(()=>setMensagemSistema(null),3000); }
    else { setMensagemSistema({tipo:'erro', texto:'Erro ao remover. Pode haver documentos vinculados a este item.'}); setTimeout(()=>setMensagemSistema(null),3000); }
  };

  if (isLoading) return <div className="text-center p-12 text-slate-500 font-bold flex justify-center bg-white rounded-xl border border-slate-200"><RefreshCw className="animate-spin w-6 h-6 mr-2"/> Carregando Módulo de Configurações...</div>;

  return (
    <div className="flex bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px] animate-in fade-in">
      <div className="w-64 bg-slate-50 border-r border-slate-200 p-4 shrink-0">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 px-3">Parâmetros do Sistema</h3>
        <nav className="space-y-1">
          <button onClick={() => { setActiveTab('tipos'); setNovoNome(""); setNovaSigla(""); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'tipos' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-200'}`}><BookOpen className="w-4 h-4"/> Tipos de Documento</button>
          <button onClick={() => { setActiveTab('diretorias'); setNovoNome(""); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'diretorias' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-200'}`}><Building2 className="w-4 h-4"/> Diretorias</button>
          <button onClick={() => { setActiveTab('setores'); setNovoNome(""); setNovaSigla(""); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'setores' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-200'}`}><Layers className="w-4 h-4"/> Setores</button>
        </nav>
      </div>

      <div className="flex-1 p-8 flex flex-col bg-white">
        <div className="mb-6 pb-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-800 mb-1">{activeTab === 'tipos' ? "Tipos Documentais" : activeTab === 'diretorias' ? "Estrutura de Diretorias" : "Mapeamento de Setores"}</h2>
          <p className="text-sm text-slate-500">{activeTab === 'tipos' ? "Gerencie as nomenclaturas (Ex: POP, MAN)." : activeTab === 'diretorias' ? "Defina a alta gestão." : "Cadastre as unidades operacionais."}</p>
        </div>

        <div className="flex gap-3 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200 items-end">
          {activeTab === 'setores' && (
            <div className="w-64"><label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Diretoria Mãe</label><select value={novoDirId} onChange={(e) => setNovoDirId(e.target.value)} className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm outline-none"><option value="">Selecione...</option>{diretorias.map((d: any) => <option key={d.id} value={d.id}>{d.nome}</option>)}</select></div>
          )}
          {(activeTab === 'tipos' || activeTab === 'setores') && (
            <div className="w-32"><label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Sigla</label><input type="text" value={novaSigla} onChange={(e) => setNovaSigla(e.target.value)} placeholder="Ex: UTI" className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm uppercase font-bold outline-none" /></div>
          )}
          <div className="flex-1"><label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Nome por Extenso</label><input type="text" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} placeholder="Digite o nome..." className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm outline-none" /></div>
          <button onClick={handleAdd} className="px-5 py-2.5 bg-blue-600 text-white font-bold rounded-lg text-sm hover:bg-blue-700 shadow-md flex items-center justify-center gap-2 h-[42px] transition-all"><Plus className="w-4 h-4"/> Adicionar</button>
        </div>

        <div className="flex-1 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 border-b border-slate-200 text-[10px] uppercase font-black text-slate-500 tracking-widest">
              <tr>{(activeTab === 'tipos' || activeTab === 'setores') && <th className="px-4 py-3 w-32">Sigla</th>}<th className="px-4 py-3">Nome / Descrição</th>{activeTab === 'setores' && <th className="px-4 py-3">Diretoria Vinculada</th>}<th className="px-4 py-3 text-right">Ação</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {activeTab === 'tipos' && tipos.map((t: any) => (<tr key={t.id} className="hover:bg-slate-50"><td className="px-4 py-3 font-mono font-bold text-blue-700">{t.sigla}</td><td className="px-4 py-3 font-medium text-slate-800">{t.nome}</td><td className="px-4 py-3 text-right"><button onClick={() => removerItem('config_tipos_doc', t.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors"><Trash2 className="w-4 h-4"/></button></td></tr>))}
              {activeTab === 'diretorias' && diretorias.map((d: any) => (<tr key={d.id} className="hover:bg-slate-50"><td className="px-4 py-3 font-medium text-slate-800">{d.nome}</td><td className="px-4 py-3 text-right"><button onClick={() => removerItem('config_diretorias', d.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors"><Trash2 className="w-4 h-4"/></button></td></tr>))}
              {activeTab === 'setores' && setores.map((s: any) => (<tr key={s.id} className="hover:bg-slate-50"><td className="px-4 py-3 font-mono font-bold text-blue-700">{s.sigla}</td><td className="px-4 py-3 font-medium text-slate-800">{s.nome}</td><td className="px-4 py-3 text-slate-500 text-xs font-bold">{s.config_diretorias?.nome || "Sem vínculo"}</td><td className="px-4 py-3 text-right"><button onClick={() => removerItem('config_setores', s.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors"><Trash2 className="w-4 h-4"/></button></td></tr>))}
              {activeTab === 'tipos' && tipos.length === 0 && <tr><td colSpan={3} className="p-8 text-center text-slate-400 font-medium">Nenhum Tipo cadastrado.</td></tr>}
              {activeTab === 'diretorias' && diretorias.length === 0 && <tr><td colSpan={2} className="p-8 text-center text-slate-400 font-medium">Nenhuma Diretoria cadastrada.</td></tr>}
              {activeTab === 'setores' && setores.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-slate-400 font-medium">Nenhum Setor cadastrado.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}