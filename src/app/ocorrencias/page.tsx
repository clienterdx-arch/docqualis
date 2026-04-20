"use client";

import React, { useState } from "react";
import { 
  Wrench, Activity, AlertTriangle, FileText, 
  MessageSquare, Plus, Search, Filter, CheckCircle2, 
  Clock, XCircle, ListTodo, Target, ChevronRight
} from "lucide-react";

// ==========================================
// DADOS SIMULADOS (Inteligência Relacional)
// ==========================================
const mockOcorrencias = [
  { id: "OC-26-001", tipo: "Evento Adverso", descricao: "Erro na administração de medicação (Troca de leito).", setor: "UTI Adulto", gravidade: "Alta", status: "Em Investigação", data: "12/04/2026" },
  { id: "OC-26-002", tipo: "Manifestação", descricao: "Reclamação sobre tempo de espera superior a 2h na triagem.", setor: "Pronto Atendimento", gravidade: "Média", status: "Ações Abertas", data: "10/04/2026" },
  { id: "OC-26-003", tipo: "Não Conformidade", descricao: "Geladeira de vacinas operando a 12°C (Fora do limite).", setor: "Farmácia", gravidade: "Crítica", status: "Ações Abertas", data: "09/04/2026" },
  { id: "OC-26-004", tipo: "Não Conformidade", descricao: "Ausência de assinatura no termo de consentimento cirúrgico.", setor: "Centro Cirúrgico", gravidade: "Alta", status: "Concluído", data: "05/04/2026" },
];

const mockAcoes = [
  { id: "ACT-101", ocorrenciaId: "OC-26-003", oQue: "Solicitar manutenção corretiva urgente do termostato.", quem: "Engenharia", prazo: "10/04/2026", status: "Atrasado" },
  { id: "ACT-102", ocorrenciaId: "OC-26-003", oQue: "Transferir lote de vacinas para backup térmico.", quem: "Farmacêutico Chefe", prazo: "09/04/2026", status: "Concluído" },
  { id: "ACT-103", ocorrenciaId: "OC-26-002", oQue: "Revisar escala médica do PA nos horários de pico.", quem: "Diretoria Médica", prazo: "20/04/2026", status: "Em Andamento" },
  { id: "ACT-104", ocorrenciaId: "OC-26-001", oQue: "Realizar treinamento de dupla checagem com equipe noturna.", quem: "Coord. Enfermagem", prazo: "18/04/2026", status: "Em Andamento" },
];

export default function GestaoOcorrenciasPage() {
  const [viewState, setViewState] = useState<"dashboard" | "ocorrencias" | "acoes">("acoes");

  // Cálculos Automáticos para os KPIs
  const totalNCs = mockOcorrencias.filter(o => o.tipo === "Não Conformidade").length;
  const totalEventos = mockOcorrencias.filter(o => o.tipo === "Evento Adverso").length;
  const totalSAC = mockOcorrencias.filter(o => o.tipo === "Manifestação").length;
  const acoesAtrasadas = mockAcoes.filter(a => a.status === "Atrasado").length;

  const getTipoColor = (tipo: string) => {
    if (tipo === "Não Conformidade") return "bg-purple-100 text-purple-700";
    if (tipo === "Evento Adverso") return "bg-red-100 text-red-700";
    return "bg-blue-100 text-blue-700"; // Manifestação/SAC
  };

  const getGravidadeColor = (gravidade: string) => {
    if (gravidade === "Crítica") return "text-red-600 bg-red-50 border-red-200";
    if (gravidade === "Alta") return "text-orange-600 bg-orange-50 border-orange-200";
    if (gravidade === "Média") return "text-amber-600 bg-amber-50 border-amber-200";
    return "text-emerald-600 bg-emerald-50 border-emerald-200";
  };

  const getStatusAcaoColor = (status: string) => {
    if (status === "Concluído") return "text-emerald-700 bg-emerald-100";
    if (status === "Atrasado") return "text-red-700 bg-red-100";
    return "text-blue-700 bg-blue-100";
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto animate-in fade-in duration-500 relative">
      
      {/* HEADER DO MÓDULO */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Gestão de Ocorrências (CAPA)</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Não Conformidades, Eventos Adversos e Manifestações.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 bg-slate-800 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-900 shadow-md transition-all">
            <Plus className="w-4 h-4" /> Nova Notificação
          </button>
        </div>
      </div>

      {/* NAVEGAÇÃO INTERNA (TABS) */}
      <div className="border-b border-slate-200 mb-8 flex gap-8 text-sm font-bold text-slate-500">
        <button onClick={() => setViewState("dashboard")} className={`pb-4 border-b-2 transition-all ${viewState === "dashboard" ? "border-blue-600 text-blue-600" : "border-transparent hover:text-slate-800"}`}>
          <div className="flex items-center gap-2"><Activity className="w-4 h-4"/> Dashboard</div>
        </button>
        <button onClick={() => setViewState("ocorrencias")} className={`pb-4 border-b-2 transition-all ${viewState === "ocorrencias" ? "border-blue-600 text-blue-600" : "border-transparent hover:text-slate-800"}`}>
          <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4"/> Registro de Ocorrências</div>
        </button>
        <button onClick={() => setViewState("acoes")} className={`pb-4 border-b-2 transition-all ${viewState === "acoes" ? "border-blue-600 text-blue-600" : "border-transparent hover:text-slate-800"}`}>
          <div className="flex items-center gap-2">
            <ListTodo className="w-4 h-4"/> Gestão de Ações (5W2H)
            {acoesAtrasadas > 0 && <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">{acoesAtrasadas}</span>}
          </div>
        </button>
      </div>

      {/* VISÃO 1: DASHBOARD EXECUTIVO */}
      {viewState === "dashboard" && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <KpiCard titulo="Não Conformidades" valor={totalNCs} desc="Desvios de Processo" icon={<Wrench className="w-5 h-5"/>} cor="purple" />
            <KpiCard titulo="Eventos Adversos" valor={totalEventos} desc="Segurança do Paciente" icon={<AlertTriangle className="w-5 h-5"/>} cor="red" />
            <KpiCard titulo="Manifestações (SAC)" valor={totalSAC} desc="Ouvidoria / Clientes" icon={<MessageSquare className="w-5 h-5"/>} cor="blue" />
            <KpiCard titulo="Ações Atrasadas" valor={acoesAtrasadas} desc="Planos de Ação (CAPA)" icon={<Clock className="w-5 h-5"/>} cor={acoesAtrasadas > 0 ? "red" : "emerald"} />
          </div>
          
          {/* Espaço para futuros gráficos (Espinha de Peixe / Pareto) */}
          <div className="bg-white p-12 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-slate-400">
             <Target className="w-12 h-12 mb-4 opacity-50" />
             <p className="font-bold">Gráficos de Pareto e Causa-Raiz (Ishikawa) serão renderizados aqui.</p>
          </div>
        </div>
      )}

      {/* VISÃO 2: CAIXA DE ENTRADA DE OCORRÊNCIAS */}
      {viewState === "ocorrencias" && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden animate-in slide-in-from-right-8">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-lg w-96 shadow-sm">
              <Search className="w-4 h-4 text-slate-400" />
              <input type="text" placeholder="Buscar por código ou descrição..." className="text-sm outline-none w-full font-medium" />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-600 shadow-sm hover:bg-slate-50">
              <Filter className="w-4 h-4"/> Filtrar por Setor
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-white border-b border-slate-200 text-[10px] uppercase font-black text-slate-400 tracking-widest">
                <tr>
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Classificação</th>
                  <th className="px-6 py-4">Descrição do Relato</th>
                  <th className="px-6 py-4">Setor Origem</th>
                  <th className="px-6 py-4 text-center">Gravidade</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {mockOcorrencias.map(o => (
                  <tr key={o.id} className="hover:bg-slate-50 cursor-pointer transition-colors group">
                    <td className="px-6 py-4 font-mono font-bold text-slate-900">{o.id}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2 py-1 rounded text-[10px] font-black uppercase ${getTipoColor(o.tipo)}`}>{o.tipo}</span>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-700 truncate max-w-xs">{o.descricao}</td>
                    <td className="px-6 py-4 font-medium text-slate-500">{o.setor}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${getGravidadeColor(o.gravidade)}`}>{o.gravidade}</span>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-600">{o.status}</td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-blue-600 font-bold text-xs hover:underline flex items-center justify-end gap-1 w-full">Tratar <ChevronRight className="w-3 h-3"/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VISÃO 3: GESTÃO DE AÇÕES (O QUE VOCÊ PEDIU - RASTREABILIDADE) */}
      {viewState === "acoes" && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden animate-in slide-in-from-right-8">
          <div className="p-5 border-b border-slate-100 bg-slate-50/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><ListTodo className="w-5 h-5 text-blue-600"/> Controle de Planos de Ação (5W2H)</h2>
              <p className="text-xs font-medium text-slate-500 mt-1">Acompanhamento de ações corretivas e preventivas atreladas a ocorrências.</p>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-md hover:bg-blue-700 transition-colors">
              <Plus className="w-4 h-4"/> Adicionar Ação Avulsa
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-white border-b border-slate-200 text-[10px] uppercase font-black text-slate-500 tracking-widest">
                <tr>
                  <th className="px-6 py-4">Ação (O que fazer)</th>
                  <th className="px-6 py-4">Responsável (Quem)</th>
                  <th className="px-6 py-4 text-center">Prazo (Quando)</th>
                  <th className="px-6 py-4">Origem (Ocorrência)</th>
                  <th className="px-6 py-4 text-right">Status do Plano</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {mockAcoes.sort((a, b) => a.status === "Atrasado" ? -1 : 1).map(acao => {
                  const ocorrenciaOrigem = mockOcorrencias.find(o => o.id === acao.ocorrenciaId);
                  
                  return (
                    <tr key={acao.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800">{acao.oQue}</div>
                        <div className="text-[10px] font-black text-slate-400 uppercase mt-1 tracking-widest">{acao.id}</div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-600 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] text-slate-600 font-bold border border-white shadow-sm">
                           {acao.quem.substring(0, 2).toUpperCase()}
                        </div>
                        {acao.quem}
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-slate-700">{acao.prazo}</td>
                      <td className="px-6 py-4">
                        <div className="inline-flex flex-col items-start cursor-pointer group">
                          <span className="text-xs font-black text-blue-600 group-hover:underline">{acao.ocorrenciaId}</span>
                          <span className="text-[10px] font-medium text-slate-400 truncate max-w-[150px]" title={ocorrenciaOrigem?.descricao}>{ocorrenciaOrigem?.descricao}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${getStatusAcaoColor(acao.status)}`}>
                          {acao.status === 'Concluído' ? <CheckCircle2 className="w-3 h-3"/> : (acao.status === 'Atrasado' ? <XCircle className="w-3 h-3"/> : <Clock className="w-3 h-3"/>)}
                          {acao.status}
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

    </div>
  );
}

// COMPONENTE AUXILIAR
function KpiCard({ titulo, valor, desc, icon, cor }: any) {
  const cores: any = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    red: "bg-red-50 text-red-600 border-red-100",
    purple: "bg-purple-50 text-purple-600 border-purple-100",
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow cursor-pointer">
      <div className="flex justify-between items-start mb-2">
        <div className={`p-2.5 rounded-xl border ${cores[cor]}`}>{icon}</div>
      </div>
      <div>
        <h3 className="text-3xl font-black text-slate-800 tracking-tight">{valor}</h3>
        <p className="text-sm font-bold text-slate-600 mt-1">{titulo}</p>
        <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mt-1">{desc}</p>
      </div>
    </div>
  );
}