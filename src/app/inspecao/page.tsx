"use client";

import React, { useState, useEffect } from "react";
import { 
  Search, Filter, FileText, Download, ShieldCheck, 
  AlertCircle, Clock, CheckCircle2, FileBarChart, 
  Calendar, User, RefreshCw, ChevronRight, Printer
} from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function InspecaoQualidadePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [documentos, setDocumentos] = useState<any[]>([]);
  const [filtroGlobal, setFiltroGlobal] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("Todos");

  useEffect(() => {
    fetchTodosDocumentos();
  }, []);

  const fetchTodosDocumentos = async () => {
    setIsLoading(true);
    // Busca TUDO, sem filtro de pasta, para inspeção total
    // Correção TypeScript para Vercel build (as any)
    const { data, error } = await (supabase
      .from('documentos')
      .select('*') as any)
      .order('created_at', { ascending: false });
    
    if (data) setDocumentos(data);
    setIsLoading(false);
  };

  // Lógica de filtragem em tempo real (In-memory para velocidade Enterprise)
  const docsFiltrados = documentos.filter(doc => {
    const busca = filtroGlobal.toLowerCase();
    const matchesTexto = doc.titulo?.toLowerCase().includes(busca) || doc.codigo?.toLowerCase().includes(busca) || doc.elaborador?.toLowerCase().includes(busca);
    const matchesStatus = statusFiltro === "Todos" || doc.status === statusFiltro;
    return matchesTexto && matchesStatus;
  });

  // Métricas de Inspeção
  const total = docsFiltrados.length;
  const pendentes = docsFiltrados.filter(d => d.status !== 'Repositório' && d.status !== 'Obsoleto').length;
  const vigentes = docsFiltrados.filter(d => d.status === 'Repositório').length;

  const getStatusStyle = (status: string) => {
    switch(status) {
      case 'Repositório': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Em Verificação': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Em Homologação': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Em Elaboração': return 'bg-blue-50 text-blue-700 border-blue-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  // FUNÇÃO: GERAR RELATÓRIO DE AUDITORIA (PDF Simulado/Print)
  const gerarRelatorioPDF = () => {
    window.print(); // O CSS de print está otimizado para gerar um PDF limpo
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto animate-in fade-in duration-500 print:p-0">
      
      {/* HEADER - OCULTAR NO PRINT */}
      <div className="flex items-center justify-between mb-8 print:hidden">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-blue-600" />
            Central de Inspeção e Auditoria
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Controle total de conformidade e rastreabilidade ISO 9001.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={gerarRelatorioPDF}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-50 shadow-sm transition-all"
          >
            <Printer className="w-4 h-4 text-blue-600" /> Gerar Relatório PDF
          </button>
        </div>
      </div>

      {/* CARDS DE RESUMO ANALÍTICO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 print:grid-cols-3">
        <ResumoCard titulo="Documentos em Inspeção" valor={total} icon={<FileText className="w-5 h-5"/>} cor="blue" />
        <ResumoCard titulo="Processos com Pendência" valor={pendentes} icon={<Clock className="w-5 h-5"/>} cor="amber" />
        <ResumoCard titulo="Índice de Vigência" valor={total > 0 ? `${Math.round((vigentes/total)*100)}%` : '100%'} icon={<CheckCircle2 className="w-5 h-5"/>} cor="emerald" />
      </div>

      {/* ÁREA DE BUSCA E FILTROS - OCULTAR NO PRINT */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-wrap items-center gap-4 print:hidden">
        <div className="flex-1 min-w-[300px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Localizar por Código, Título ou Responsável..." 
            value={filtroGlobal}
            onChange={(e) => setFiltroGlobal(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 focus:bg-white transition-all"
          />
        </div>
        
        <select 
          value={statusFiltro}
          onChange={(e) => setStatusFiltro(e.target.value)}
          className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 outline-none cursor-pointer"
        >
          <option value="Todos">Todos os Status</option>
          <option value="Repositório">Vigentes (Repositório)</option>
          <option value="Em Verificação">Em Verificação</option>
          <option value="Em Homologação">Em Homologação</option>
          <option value="Em Elaboração">Em Elaboração</option>
          <option value="Obsoleto">Obsoletos</option>
        </select>

        <div className="h-8 w-px bg-slate-200"></div>

        <button onClick={fetchTodosDocumentos} className="p-2.5 text-slate-400 hover:text-blue-600 transition-colors">
          <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* TABELA DE AUDITORIA MASTER */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-[10px] uppercase font-black text-slate-500 tracking-widest">
                <th className="px-6 py-4">Status Atual</th>
                <th className="px-6 py-4">Identificação</th>
                <th className="px-6 py-4">Setor / Unidade</th>
                <th className="px-6 py-4">Responsável Atual</th>
                <th className="px-6 py-4 text-center">Vencimento</th>
                <th className="px-6 py-4 text-right print:hidden">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {docsFiltrados.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${getStatusStyle(doc.status)}`}>
                      {doc.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-mono font-bold text-blue-700">{doc.codigo}</div>
                    <div className="font-bold text-slate-800 text-xs mt-0.5">{doc.titulo}</div>
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-600 uppercase text-[10px]">{doc.setor}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                       <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-black">
                         {doc.elaborador?.substring(0,2).toUpperCase()}
                       </div>
                       <span className="font-medium text-slate-700">{doc.elaborador}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex flex-col items-center">
                      <span className="font-bold text-slate-700">{doc.dt_vencimento ? new Date(doc.dt_vencimento).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : 'N/A'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right print:hidden">
                    <div className="flex items-center justify-end gap-2">
                       <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Ver Histórico">
                         <RefreshCw className="w-4 h-4" />
                       </button>
                       <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Visualizar">
                         <ChevronRight className="w-5 h-5" />
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
              
              {docsFiltrados.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <AlertCircle className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-500 font-bold">Nenhum documento localizado nesta auditoria.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

function ResumoCard({ titulo, valor, icon, cor }: any) {
  const cores: any = {
    blue: "text-blue-600 bg-blue-50",
    amber: "text-amber-600 bg-amber-50",
    emerald: "text-emerald-600 bg-emerald-50",
  };
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
      <div className={`p-3 rounded-xl ${cores[cor]}`}>{icon}</div>
      <div>
        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{titulo}</p>
        <p className="text-2xl font-black text-slate-800">{valor}</p>
      </div>
    </div>
  );
}