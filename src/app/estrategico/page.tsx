"use client";

import React, { useState } from "react";
import { 
  Target, TrendingUp, Users, Zap, Briefcase, 
  Map, BarChart3, Rocket, CheckCircle2, AlertTriangle, 
  Clock, ArrowRight, Crosshair, Filter, Plus, PieChart, FileText
} from "lucide-react";

// ==========================================
// DADOS SIMULADOS (Arquitetura BSC Nível Enterprise)
// ==========================================
const mockPerspectivas = [
  { id: "fin", nome: "Perspectiva Financeira", cor: "bg-emerald-50 border-emerald-200 text-emerald-800", icon: <TrendingUp className="w-5 h-5 text-emerald-600" /> },
  { id: "cli", nome: "Perspectiva Clientes & Mercado", cor: "bg-blue-50 border-blue-200 text-blue-800", icon: <Users className="w-5 h-5 text-blue-600" /> },
  { id: "pro", nome: "Perspectiva Processos Internos", cor: "bg-purple-50 border-purple-200 text-purple-800", icon: <Zap className="w-5 h-5 text-purple-600" /> },
  { id: "apr", nome: "Perspectiva Aprendizado & Crescimento", cor: "bg-amber-50 border-amber-200 text-amber-800", icon: <Briefcase className="w-5 h-5 text-amber-600" /> },
];

const mockObjetivos = [
  // Financeira
  { id: "OBJ-F1", perspectiva: "fin", titulo: "Garantir Sustentabilidade Financeira", status: "No Alvo", progresso: 92 },
  { id: "OBJ-F2", perspectiva: "fin", titulo: "Aumentar Receita com Novos Serviços", status: "Atenção", progresso: 75 },
  // Clientes
  { id: "OBJ-C1", perspectiva: "cli", titulo: "Excelência na Experiência do Paciente", status: "No Alvo", progresso: 95 },
  { id: "OBJ-C2", perspectiva: "cli", titulo: "Reconhecimento como Hospital de Alta Complexidade", status: "No Alvo", progresso: 88 },
  // Processos
  { id: "OBJ-P1", perspectiva: "pro", titulo: "Otimizar o Giro de Leitos", status: "Crítico", progresso: 54 },
  { id: "OBJ-P2", perspectiva: "pro", titulo: "Garantir Conformidade ONA/ISO 9001", status: "No Alvo", progresso: 98 },
  { id: "OBJ-P3", perspectiva: "pro", titulo: "Digitalização do Prontuário", status: "Atenção", progresso: 68 },
  // Aprendizado
  { id: "OBJ-A1", perspectiva: "apr", titulo: "Capacitação de Lideranças", status: "No Alvo", progresso: 85 },
  { id: "OBJ-A2", perspectiva: "apr", titulo: "Retenção de Talentos Clínicos", status: "Atenção", progresso: 70 },
];

const mockIndicadores = [
  { id: "IND-01", objetivoId: "OBJ-C1", nome: "NPS (Net Promoter Score)", atual: 82, meta: 85, unidade: "pts", status: "Atenção" },
  { id: "IND-02", objetivoId: "OBJ-P1", nome: "Tempo Médio de Internação", atual: 6.2, meta: 4.5, unidade: "dias", status: "Crítico" },
  { id: "IND-03", objetivoId: "OBJ-F1", nome: "Margem EBITDA", atual: 18.5, meta: 18.0, unidade: "%", status: "No Alvo" },
  { id: "IND-04", objetivoId: "OBJ-P2", nome: "Taxa de Adesão a Protocolos", atual: 96, meta: 95, unidade: "%", status: "No Alvo" },
];

const mockIniciativas = [
  { id: "PRJ-01", nome: "Projeto Lean Health (Redução de Desperdícios)", objetivoId: "OBJ-P1", lider: "Diretoria Médica", prazo: "30/11/2026", progresso: 45, status: "Em Andamento" },
  { id: "PRJ-02", nome: "Implantação do DocQualis SGQ", objetivoId: "OBJ-P2", lider: "Qualidade", prazo: "15/06/2026", progresso: 85, status: "Em Andamento" },
  { id: "PRJ-03", nome: "Programa de Liderança 360", objetivoId: "OBJ-A1", lider: "RH", prazo: "10/05/2026", progresso: 100, status: "Concluído" },
];

export default function PlanejamentoEstrategicoPage() {
  const [viewState, setViewState] = useState<"mapa" | "indicadores" | "iniciativas">("mapa");

  const getStatusColor = (status: string) => {
    if (status === "No Alvo" || status === "Concluído") return "bg-emerald-500";
    if (status === "Atenção" || status === "Em Andamento") return "bg-amber-400";
    return "bg-red-500"; // Crítico / Atrasado
  };

  const getStatusBadge = (status: string) => {
    if (status === "No Alvo" || status === "Concluído") return "text-emerald-700 bg-emerald-100 border-emerald-200";
    if (status === "Atenção" || status === "Em Andamento") return "text-amber-700 bg-amber-100 border-amber-200";
    return "text-red-700 bg-red-100 border-red-200";
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto animate-in fade-in duration-500 relative">
      
      {/* HEADER DO MÓDULO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            Planejamento Estratégico 
            <span className="px-3 py-1 bg-slate-800 text-white text-[10px] uppercase font-black rounded-full tracking-widest">Ciclo 2026-2028</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Metodologia Balanced Scorecard (BSC) e Gestão de Metas.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-50 shadow-sm transition-all">
            <FileText className="w-4 h-4" /> Relatório Executivo
          </button>
          <button className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 shadow-md transition-all">
            <Plus className="w-4 h-4" /> Novo Objetivo
          </button>
        </div>
      </div>

      {/* NAVEGAÇÃO INTERNA (TABS) */}
      <div className="border-b border-slate-200 mb-8 flex gap-8 text-sm font-bold text-slate-500 overflow-x-auto whitespace-nowrap">
        <button onClick={() => setViewState("mapa")} className={`pb-4 border-b-2 transition-all ${viewState === "mapa" ? "border-blue-600 text-blue-600" : "border-transparent hover:text-slate-800"}`}>
          <div className="flex items-center gap-2"><Map className="w-4 h-4"/> Mapa Estratégico (BSC)</div>
        </button>
        <button onClick={() => setViewState("indicadores")} className={`pb-4 border-b-2 transition-all ${viewState === "indicadores" ? "border-blue-600 text-blue-600" : "border-transparent hover:text-slate-800"}`}>
          <div className="flex items-center gap-2"><BarChart3 className="w-4 h-4"/> Indicadores (KPIs)</div>
        </button>
        <button onClick={() => setViewState("iniciativas")} className={`pb-4 border-b-2 transition-all ${viewState === "iniciativas" ? "border-blue-600 text-blue-600" : "border-transparent hover:text-slate-800"}`}>
          <div className="flex items-center gap-2"><Rocket className="w-4 h-4"/> Iniciativas e Projetos</div>
        </button>
      </div>

      {/* ==========================================
          VISÃO 1: MAPA ESTRATÉGICO BSC (A Jóia da Coroa)
      ========================================== */}
      {viewState === "mapa" && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4">
          
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
             <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Execução Global</p>
                  <p className="text-3xl font-black text-slate-800">81<span className="text-lg text-slate-500">%</span></p>
                </div>
                <div className="w-px h-10 bg-slate-200"></div>
                <div className="flex items-center gap-4 text-sm font-bold text-slate-600">
                   <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-500"></div> No Alvo</span>
                   <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-amber-400"></div> Atenção</span>
                   <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500"></div> Crítico</span>
                </div>
             </div>
             <div className="text-right text-xs font-medium text-slate-500 max-w-sm">
                O Mapa Estratégico demonstra a relação de causa e efeito. O aprendizado da base impulsiona os processos, que geram valor ao cliente, resultando em retorno financeiro.
             </div>
          </div>

          <div className="space-y-4">
            {mockPerspectivas.map(perspectiva => {
              const objsDaPerspectiva = mockObjetivos.filter(o => o.perspectiva === perspectiva.id);
              
              return (
                <div key={perspectiva.id} className={`p-6 rounded-2xl border ${perspectiva.cor} flex flex-col lg:flex-row gap-6 relative overflow-hidden group`}>
                  
                  {/* Título da Perspectiva */}
                  <div className="lg:w-48 shrink-0 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-2">
                      {perspectiva.icon}
                      <h2 className="text-sm font-black uppercase tracking-widest">{perspectiva.nome.replace("Perspectiva ", "")}</h2>
                    </div>
                    <p className="text-[10px] font-medium opacity-70">Objetivos mapeados: {objsDaPerspectiva.length}</p>
                  </div>

                  {/* Linha Divisória Visual */}
                  <div className="hidden lg:block w-px bg-current opacity-20"></div>

                  {/* Cards de Objetivos (Swinlane) */}
                  <div className="flex-1 flex flex-wrap gap-4 items-center">
                    {objsDaPerspectiva.map(obj => (
                      <div key={obj.id} className="bg-white/90 backdrop-blur-sm border border-white/50 p-4 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-1 transition-all w-full md:w-64 cursor-pointer relative overflow-hidden group/card">
                         
                         {/* Barra de Progresso no Topo do Card */}
                         <div className="absolute top-0 inset-x-0 h-1 bg-slate-100">
                            <div className={`h-full ${getStatusColor(obj.status)} transition-all`} style={{ width: `${obj.progresso}%` }}></div>
                         </div>

                         <div className="flex justify-between items-start mb-3 mt-1">
                           <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">{obj.id}</span>
                           <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor(obj.status)} shadow-sm`} title={obj.status}></div>
                         </div>
                         <h3 className="text-sm font-bold text-slate-800 leading-tight mb-4">{obj.titulo}</h3>
                         
                         <div className="flex items-center justify-between mt-auto">
                           <span className="text-xs font-bold text-slate-500">{obj.progresso}% Concluído</span>
                           <ArrowRight className="w-4 h-4 text-slate-300 group-hover/card:text-blue-500 transition-colors" />
                         </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==========================================
          VISÃO 2: INDICADORES ESTRATÉGICOS (KPIs)
      ========================================== */}
      {viewState === "indicadores" && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden animate-in slide-in-from-right-8">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 px-2"><PieChart className="w-5 h-5 text-blue-600"/> Painel de Bordo (KPIs)</h2>
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-600 shadow-sm hover:bg-slate-50">
              <Filter className="w-4 h-4"/> Filtrar
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-white border-b border-slate-200 text-[10px] uppercase font-black text-slate-400 tracking-widest">
                <tr>
                  <th className="px-6 py-4">Indicador de Desempenho</th>
                  <th className="px-6 py-4">Objetivo Vinculado</th>
                  <th className="px-6 py-4 text-center">Meta</th>
                  <th className="px-6 py-4 text-center">Realizado</th>
                  <th className="px-6 py-4 text-center">Desempenho</th>
                  <th className="px-6 py-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {mockIndicadores.map(ind => {
                  const objetivoOrigem = mockObjetivos.find(o => o.id === ind.objetivoId);
                  // Cálculo simples de % de atingimento (considerando que mais é melhor para a barra visual)
                  const percentual = Math.min(Math.round((ind.atual / ind.meta) * 100), 100);
                  
                  return (
                    <tr key={ind.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800">{ind.nome}</div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{ind.id}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-bold text-blue-600 cursor-pointer hover:underline">{objetivoOrigem?.id}</span>
                        <div className="text-[10px] font-medium text-slate-500 truncate max-w-[200px] mt-0.5">{objetivoOrigem?.titulo}</div>
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-slate-500">{ind.meta} <span className="text-[10px]">{ind.unidade}</span></td>
                      <td className="px-6 py-4 text-center font-black text-slate-900 text-base">{ind.atual} <span className="text-[10px] font-bold text-slate-500">{ind.unidade}</span></td>
                      <td className="px-6 py-4 w-48">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full ${getStatusColor(ind.status)}`} style={{ width: `${percentual}%` }}></div>
                          </div>
                          <span className="text-xs font-bold text-slate-600 w-8">{percentual}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase border tracking-wider ${getStatusBadge(ind.status)}`}>
                          {ind.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==========================================
          VISÃO 3: INICIATIVAS E PROJETOS
      ========================================== */}
      {viewState === "iniciativas" && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden animate-in slide-in-from-right-8">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 px-2"><Crosshair className="w-5 h-5 text-blue-600"/> Portfólio de Projetos</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-white border-b border-slate-200 text-[10px] uppercase font-black text-slate-400 tracking-widest">
                <tr>
                  <th className="px-6 py-4">Iniciativa / Projeto</th>
                  <th className="px-6 py-4">Sponsor (Líder)</th>
                  <th className="px-6 py-4 text-center">Prazo Final</th>
                  <th className="px-6 py-4 w-48">Progresso de Execução</th>
                  <th className="px-6 py-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {mockIniciativas.map(prj => (
                  <tr key={prj.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800">{prj.nome}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] px-1.5 py-0.5 bg-blue-50 text-blue-600 font-black rounded uppercase tracking-wider border border-blue-100">Alinhamento: {prj.objetivoId}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-600 flex items-center gap-2">
                       <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] text-slate-600 font-bold border border-white shadow-sm">
                         {prj.lider.substring(0, 2).toUpperCase()}
                       </div>
                       {prj.lider}
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-slate-700 flex items-center justify-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400"/> {prj.prazo}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                         <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                           <div className={`h-full ${prj.progresso === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${prj.progresso}%` }}></div>
                         </div>
                         <span className="text-xs font-bold text-slate-600 w-8">{prj.progresso}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-blue-600 font-bold text-xs hover:underline">Atualizar Status</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}