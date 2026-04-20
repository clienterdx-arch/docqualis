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
    // Blindagem de tipagem para Vercel
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

    // LISTA DE PROCESSOS AGORA VAZIA (SISTEMA LIMPO)
    const processosVigentes: any[] = [];

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
    if (!confirm("Tem certeza que deseja tornar este documento OBSOLETO?")) return;
    
    const { error } = await supabase.from('documentos').update({ status: 'Obsoleto' }).eq('id', id);
    if (!error) {
      setMensagemSistema({ tipo: 'sucesso', texto: 'Documento arquivado com sucesso.' });
      setDocSelecionado(null);
      fetchDocumentos();
      setTimeout(() => setMensagemSistema(null), 3000);
    }
  };

  const handleCriarNovaVersao = (doc: any) => {
    const query = new URLSearchParams({
      base_id: doc.id,
      codigo: doc.codigo,
      titulo: doc.titulo,
      tipo: doc.tipo_documento || "",
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
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 font-bold text-sm animate-in slide-in-from-top-10
          ${mensagemSistema.tipo === 'sucesso' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}
        `}>
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
          <button onClick={() => setIsExportModalOpen(true)} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-50 transition-all"><FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Exportar Lista Mestra</button>
          <Link href="/novo-documento" className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 shadow-md transition-all"><FilePlus className="w-4 h-4" /> Novo Documento</Link>
        </div>
      </div>

      {/* TABS */}
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

      {/* BLOCOS DE STATUS */}
      {viewState === "blocos" && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5 animate-in fade-in">
          <DashboardBlock title="Repositório" desc="Vigentes" count={countRepositorio} icon={<FileCheck className="w-6 h-6" />} color="emerald" onClick={() => { setPastaAtiva("Repositório"); setViewState("lista"); }} isLoading={isLoading} />
          <DashboardBlock title="Em Elaboração" desc="Rascunhos" count={countElaboracao} icon={<FileEdit className="w-6 h-6" />} color="blue" onClick={() => { setPastaAtiva("Em Elaboração"); setViewState("lista"); }} isLoading={isLoading} />
          <DashboardBlock title="Em Verificação" desc="Revisão" count={countVerificacao} icon={<Clock className="w-6 h-6" />} color="amber" onClick={() => { setPastaAtiva("Em Verificação"); setViewState("lista"); }} isLoading={isLoading} />
          <DashboardBlock title="Em Homologação" desc="Aprovação" count={countHomologacao} icon={<ShieldCheck className="w-6 h-6" />} color="purple" onClick={() => { setPastaAtiva("Em Homologação"); setViewState("lista"); }} isLoading={isLoading} />
          <DashboardBlock title="Rejeitados" desc="Devolvidos" count={countRejeitados} icon={<XCircle className="w-6 h-6" />} color="red" onClick={() => { setPastaAtiva("Rejeitados"); setViewState("lista"); }} isLoading={isLoading} />
          <DashboardBlock title="Obsoletos" desc="Arquivados" count={countObsoleto} icon={<Archive className="w-6 h-6" />} color="slate" onClick={() => { setPastaAtiva("Obsoletos"); setViewState("lista"); }} isLoading={isLoading} />
        </div>
      )}

      {/* LISTAGEM DE DOCUMENTOS */}
      {viewState === "lista" && (
        <div className="animate-in slide-in-from-right-8">
          <button onClick={() => setViewState("blocos")} className="flex items-center gap-2 text-blue-600 font-bold mb-6 hover:underline"><ArrowLeft className="w-4 h-4"/> Voltar para Pastas</button>
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-black text-slate-500">
                  <th className="px-4 py-3 text-blue-700">Código</th>
                  <th className="px-4 py-3">Título do Documento</th>
                  <th className="px-4 py-3">Elaborador</th>
                  <th className="px-4 py-3">Setor</th>
                  <th className="px-4 py-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {documentosFiltrados.map((doc: any) => (
                  <tr key={doc.id} className="hover:bg-slate-50 text-sm">
                    <td className="px-4 py-4 font-mono font-bold text-blue-700">{doc.codigo}</td>
                    <td className="px-4 py-4 font-bold text-slate-800">{doc.titulo}</td>
                    <td className="px-4 py-4 font-medium text-slate-600">{doc.elaborador}</td>
                    <td className="px-4 py-4 font-bold text-slate-700">{doc.setor}</td>
                    <td className="px-4 py-4 text-right">
                      {pastaAtiva === "Repositório" ? (
                        <button onClick={() => abrirFicha(doc)} className="p-2 text-slate-400 hover:text-blue-600 transition-all"><FileSearch className="w-5 h-5"/></button>
                      ) : (
                        <Link href={`/editar-documento/${doc.id}`} className="text-blue-600 font-bold hover:underline">Retomar</Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {documentosFiltrados.length === 0 && <div className="p-10 text-center text-slate-400 font-bold">Pasta vazia.</div>}
          </div>
        </div>
      )}

      {/* SUB-MODULOS CONFIG */}
      {viewState === "inspecao" && <PainelInspecao documentos={documentos} isLoading={isLoading} aoAtualizar={fetchDocumentos} />}
      {viewState === "copias" && <PainelCopiasControladas documentos={documentos.filter(d => d.status === "Repositório")} />}
      {viewState === "config" && <PainelConfiguracaoAdmin setMensagemSistema={setMensagemSistema} />}

      {/* FICHA TÉCNICA (DRAWER) */}
      {docSelecionado && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-end z-[100] animate-in fade-in">
          <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col p-8 animate-in slide-in-from-right-8">
            <div className="flex justify-between items-start mb-8">
              <div>
                <span className="font-mono text-xs font-black text-blue-700">{docSelecionado.codigo}</span>
                <h3 className="text-2xl font-black text-slate-900">{docSelecionado.titulo}</h3>
              </div>
              <button onClick={() => setDocSelecionado(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full"><X/></button>
            </div>
            <div className="flex-1 space-y-6">
               <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 grid grid-cols-2 gap-4">
                  <div><p className="text-[10px] font-black text-slate-400 uppercase">Versão</p><p className="font-bold">Rev. {docSelecionado.versao}</p></div>
                  <div><p className="text-[10px] font-black text-slate-400 uppercase">Setor</p><p className="font-bold">{docSelecionado.setor}</p></div>
                  <div><p className="text-[10px] font-black text-slate-400 uppercase">Vencimento</p><p className="font-bold">{docSelecionado.dt_vencimento}</p></div>
                  <div><p className="text-[10px] font-black text-slate-400 uppercase">Status</p><p className="font-bold text-emerald-600">{docSelecionado.status}</p></div>
               </div>
               <button onClick={(e) => handleVisualizarConteudo(e, docSelecionado)} className="w-full py-4 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 flex items-center justify-center gap-2 shadow-lg"><Eye className="w-5 h-5"/> Visualizar Documento</button>
            </div>
            {docSelecionado.status === "Repositório" && (
              <div className="pt-6 border-t flex gap-4">
                <button onClick={() => handleTornarObsoleto(docSelecionado.id)} className="flex-1 py-3 border border-red-200 text-red-600 font-bold rounded-xl hover:bg-red-50">Obsoleto</button>
                <button onClick={() => handleCriarNovaVersao(docSelecionado)} className="flex-1 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-black">Criar Revisão</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// COMPONENTES AUXILIARES (CONFIGURAÇÃO BLINDADA)
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
    let dbError;
    if (activeTab === 'tipos' && novaSigla) {
      const { error } = await (supabase.from('config_tipos_doc').insert([{ nome: novoNome, sigla: novaSigla.toUpperCase() }]) as any);
      dbError = error;
    } else if (activeTab === 'diretorias') {
      const { error } = await (supabase.from('config_diretorias').insert([{ nome: novoNome }]) as any);
      dbError = error;
    } else if (activeTab === 'setores' && novaSigla && novoDirId) {
      const { error } = await (supabase.from('config_setores').insert([{ nome: novoNome, sigla: novaSigla.toUpperCase(), diretoria_id: novoDirId }]) as any);
      dbError = error;
    }
    if (!dbError) { setNovoNome(""); setNovaSigla(""); carregarTudo(); }
  };

  const removerItem = async (tabela: string, id: string) => {
    const { error } = await (supabase.from(tabela).delete() as any).eq('id', id);
    if (!error) carregarTudo();
  };

  return (
    <div className="flex bg-white rounded-2xl border min-h-[400px]">
      <div className="w-64 bg-slate-50 border-r p-4">
        <button onClick={() => setActiveTab('tipos')} className={`w-full text-left p-3 rounded-lg font-bold mb-2 ${activeTab === 'tipos' ? 'bg-blue-100 text-blue-700' : ''}`}>Tipos de Doc</button>
        <button onClick={() => setActiveTab('diretorias')} className={`w-full text-left p-3 rounded-lg font-bold mb-2 ${activeTab === 'diretorias' ? 'bg-blue-100 text-blue-700' : ''}`}>Diretorias</button>
        <button onClick={() => setActiveTab('setores')} className={`w-full text-left p-3 rounded-lg font-bold ${activeTab === 'setores' ? 'bg-blue-100 text-blue-700' : ''}`}>Setores</button>
      </div>
      <div className="flex-1 p-8">
        <div className="flex gap-3 mb-6 bg-slate-50 p-4 rounded-xl items-end">
           <div className="flex-1">
             <label className="block text-[10px] font-black text-slate-400 mb-1">Nome</label>
             <input type="text" value={novoNome} onChange={e => setNovoNome(e.target.value)} className="w-full p-2 border rounded-lg text-sm" />
           </div>
           {(activeTab === 'tipos' || activeTab === 'setores') && (
             <div className="w-24">
               <label className="block text-[10px] font-black text-slate-400 mb-1">Sigla</label>
               <input type="text" value={novaSigla} onChange={e => setNovaSigla(e.target.value)} className="w-full p-2 border rounded-lg text-sm uppercase" />
             </div>
           )}
           {activeTab === 'setores' && (
             <div className="w-48">
               <label className="block text-[10px] font-black text-slate-400 mb-1">Diretoria</label>
               <select value={novoDirId} onChange={e => setNovoDirId(e.target.value)} className="w-full p-2 border rounded-lg text-sm">
                 <option value="">Selecione...</option>
                 {diretorias.map((d:any) => <option key={d.id} value={d.id}>{d.nome}</option>)}
               </select>
             </div>
           )}
           <button onClick={handleAdd} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold text-sm h-[38px]">+</button>
        </div>
        <table className="w-full text-sm">
          <tbody>
            {(activeTab === 'tipos' ? tipos : activeTab === 'diretorias' ? diretorias : setores).map((item: any) => (
              <tr key={item.id} className="border-b">
                <td className="py-3 font-bold">{item.sigla || item.nome}</td>
                <td className="py-3 text-slate-500">{item.sigla ? item.nome : ""}</td>
                <td className="py-3 text-right"><button onClick={() => removerItem(activeTab === 'tipos' ? 'config_tipos_doc' : activeTab === 'diretorias' ? 'config_diretorias' : 'config_setores', item.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4"/></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DashboardBlock({ title, desc, count, icon, color, onClick, isLoading }: any) {
  const colorMap: any = { emerald: "text-emerald-600 bg-emerald-50", blue: "text-blue-600 bg-blue-50", amber: "text-amber-600 bg-amber-50", purple: "text-purple-600 bg-purple-50", slate: "text-slate-600 bg-slate-50", red: "text-red-600 bg-red-50" };
  return (
    <div onClick={onClick} className="bg-white rounded-2xl p-5 border cursor-pointer hover:shadow-md transition-all flex flex-col justify-between h-32">
      <div className="flex justify-between items-start">
        <div className={`p-2 rounded-lg ${colorMap[color]}`}>{icon}</div>
        <span className="text-2xl font-black">{isLoading ? "..." : count}</span>
      </div>
      <div><h3 className="text-xs font-black text-slate-800 uppercase">{title}</h3><p className="text-[10px] text-slate-500">{desc}</p></div>
    </div>
  );
}

function PainelInspecao({ documentos }: any) { return <div className="p-10 bg-white border rounded-2xl text-center font-bold text-slate-400">Módulo de Inspeção Ativo. {documentos.length} docs monitorados.</div>; }
function PainelCopiasControladas({ documentos }: any) { return <div className="p-10 bg-white border rounded-2xl text-center font-bold text-slate-400">Central de Cópias: {documentos.length} docs vigentes prontos para impressão controlada.</div>; }