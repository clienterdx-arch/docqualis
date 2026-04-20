"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  ShieldAlert, Target, Activity, Plus, Search, 
  Filter, AlertTriangle, ArrowUpRight, ArrowDownRight, 
  CheckCircle2, AlertCircle, FileSpreadsheet
} from "lucide-react";

// ==========================================
// DADOS SIMULADOS (Para você ver a Matriz ganhando vida antes de ligarmos o banco)
// ==========================================
const mockRiscos = [
  { id: 1, codigo: "RSK.OP.001", descricao: "Falha na calibração de equipamentos da UTI", categoria: "Operacional", impacto: 5, probabilidade: 3, status: "Ação Pendente", dono: "Engenharia Clínica" },
  { id: 2, codigo: "RSK.TI.002", descricao: "Vazamento de dados de pacientes (LGPD)", categoria: "Segurança da Informação", impacto: 5, probabilidade: 4, status: "Em Monitoramento", dono: "TI" },
  { id: 3, codigo: "RSK.RH.003", descricao: "Alta rotatividade da equipe de enfermagem", categoria: "Recursos Humanos", impacto: 3, probabilidade: 4, status: "Ação Pendente", dono: "RH" },
  { id: 4, codigo: "RSK.FN.004", descricao: "Atraso no repasse de operadoras de saúde", categoria: "Financeiro", impacto: 4, probabilidade: 2, status: "Mitigado", dono: "Faturamento" },
  { id: 5, codigo: "RSK.OP.005", descricao: "Ruptura de estoque de medicamentos padrão", categoria: "Suprimentos", impacto: 4, probabilidade: 3, status: "Em Monitoramento", dono: "Farmácia" },
  { id: 6, codigo: "RSK.AD.006", descricao: "Autuação da Vigilância Sanitária por falta de POP", categoria: "Compliance", impacto: 3, probabilidade: 1, status: "Mitigado", dono: "Qualidade" },
];

export default function GestaoRiscosPage() {
  const [viewState, setViewState] = useState<"dashboard" | "lista">("dashboard");

  // Cálculos Automáticos para o Dashboard
  const riscosCalculados = mockRiscos.map(r => ({ ...r, score: r.impacto * r.probabilidade }));
  const totalRiscos = riscosCalculados.length;
  const riscosCriticos = riscosCalculados.filter(r => r.score >= 15).length;
  const acoesPendentes = riscosCalculados.filter(r => r.status === "Ação Pendente").length;

  // Função matemática para pintar a Matriz 5x5
  const getRiskColor = (score: number) => {
    if (score <= 4) return 'bg-emerald-100 border-emerald-200 text-emerald-700 hover:bg-emerald-200';
    if (score <= 9) return 'bg-amber-100 border-amber-200 text-amber-700 hover:bg-amber-200';
    if (score <= 14) return 'bg-orange-100 border-orange-200 text-orange-700 hover:bg-orange-200';
    if (score <= 19) return 'bg-red-100 border-red-200 text-red-700 hover:bg-red-200';
    return 'bg-purple-100 border-purple-200 text-purple-700 hover:bg-purple-200';
  };

  const getRiskLabel = (score: number) => {
    if (score <= 4) return { label: 'Baixo', color: 'text-emerald-600 bg-emerald-50' };
    if (score <= 9) return { label: 'Moderado', color: 'text-amber-600 bg-amber-50' };
    if (score <= 14) return { label: 'Alto', color: 'text-orange-600 bg-orange-50' };
    if (score <= 19) return { label: 'Muito Alto', color: 'text-red-600 bg-red-50' };
    return { label: 'Extremo', color: 'text-purple-600 bg-purple-50' };
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto animate-in fade-in duration-500 relative">
      
      {/* HEADER DO MÓDULO */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Gestão de Riscos</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Matriz ISO 31000 e Gestão de Oportunidades</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-50 shadow-sm transition-all">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Exportar Registro
          </button>
          <button className="flex items-center gap-2 bg-slate-800 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-900 shadow-md transition-all">
            <Plus className="w-4 h-4" /> Registrar Risco
          </button>
        </div>
      </div>

      {/* NAVEGAÇÃO INTERNA (TABS) */}
      <div className="border-b border-slate-200 mb-8 flex gap-8 text-sm font-bold text-slate-500">
        <button onClick={() => setViewState("dashboard")} className={`pb-4 border-b-2 transition-all ${viewState === "dashboard" ? "border-blue-600 text-blue-600" : "border-transparent hover:text-slate-800"}`}>
          Painel Executivo (Heatmap)
        </button>
        <button onClick={() => setViewState("lista")} className={`pb-4 border-b-2 transition-all ${viewState === "lista" ? "border-blue-600 text-blue-600" : "border-transparent hover:text-slate-800"}`}>
          Registro Geral de Riscos
        </button>
      </div>

      {/* VISÃO 1: DASHBOARD & MATRIZ 5x5 */}
      {viewState === "dashboard" && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4">
          
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <KpiCard titulo="Riscos Mapeados" valor={totalRiscos} desc="Total no sistema" icon={<ShieldAlert className="w-5 h-5"/>} cor="blue" />
            <KpiCard titulo="Riscos Críticos" valor={riscosCriticos} desc="Score ≥ 15 (Extremo/Muito Alto)" icon={<AlertTriangle className="w-5 h-5"/>} cor="red" />
            <KpiCard titulo="Ações Pendentes" valor={acoesPendentes} desc="Planos de Mitigação Atrasados" icon={<Activity className="w-5 h-5"/>} cor="amber" />
            <KpiCard titulo="Apetite ao Risco" valor="72%" desc="Índice de Tolerância" icon={<Target className="w-5 h-5"/>} cor="emerald" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* A ESTRELA DO SHOW: MATRIZ DE RISCO 5x5 */}
            <div className="lg:col-span-2 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Matriz de Calor (Heatmap 5x5)</h2>
                  <p className="text-xs text-slate-500 font-medium">Distribuição de Probabilidade x Impacto</p>
                </div>
              </div>

              <div className="relative pl-8 pb-8">
                {/* Eixo Y (Probabilidade) */}
                <div className="absolute left-0 top-0 bottom-8 flex items-center justify-center w-8">
                  <span className="transform -rotate-90 text-[10px] font-black tracking-widest text-slate-400 uppercase whitespace-nowrap">
                    Probabilidade
                  </span>
                </div>

                {/* Grid 5x5 */}
                <div className="grid grid-cols-5 gap-2 h-80">
                  {[5, 4, 3, 2, 1].map(prob => (
                    [1, 2, 3, 4, 5].map(imp => {
                      const score = prob * imp;
                      const riscosNestaCelula = riscosCalculados.filter(r => r.impacto === imp && r.probabilidade === prob);
                      
                      return (
                        <div 
                          key={`${prob}-${imp}`} 
                          className={`rounded-xl border flex items-center justify-center cursor-pointer transition-all shadow-sm ${getRiskColor(score)} relative group`}
                          title={`Probabilidade: ${prob} | Impacto: ${imp} | Score: ${score}`}
                        >
                          <span className="text-xs font-black opacity-30 absolute top-2 right-2">{score}</span>
                          {riscosNestaCelula.length > 0 && (
                            <span className="w-8 h-8 rounded-full bg-white/60 shadow-sm backdrop-blur-sm flex items-center justify-center font-black text-lg transform group-hover:scale-110 transition-transform">
                              {riscosNestaCelula.length}
                            </span>
                          )}
                        </div>
                      )
                    })
                  ))}
                </div>

                {/* Eixo X (Impacto) */}
                <div className="absolute bottom-0 left-8 right-0 flex items-center justify-center h-8">
                  <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
                    Impacto
                  </span>
                </div>
              </div>

              {/* Legenda */}
              <div className="mt-4 flex items-center justify-center gap-6">
                <LegendaItem cor="bg-emerald-100" texto="Baixo (1-4)" />
                <LegendaItem cor="bg-amber-100" texto="Moderado (5-9)" />
                <LegendaItem cor="bg-orange-100" texto="Alto (10-14)" />
                <LegendaItem cor="bg-red-100" texto="Muito Alto (15-19)" />
                <LegendaItem cor="bg-purple-100" texto="Extremo (20-25)" />
              </div>
            </div>

            {/* TOP RISCOS (Alerta Executivo) */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
               <h2 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2">
                 <AlertCircle className="w-4 h-4 text-red-500" /> Top Riscos Críticos
               </h2>
               <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                 {riscosCalculados.filter(r => r.score >= 12).sort((a,b) => b.score - a.score).map(risco => (
                   <div key={risco.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:shadow-sm transition-all cursor-pointer">
                     <div className="flex justify-between items-start mb-2">
                       <span className="text-[10px] font-black text-slate-400 uppercase">{risco.codigo}</span>
                       <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${getRiskLabel(risco.score).color}`}>
                         Score: {risco.score}
                       </span>
                     </div>
                     <p className="text-sm font-bold text-slate-800 leading-snug">{risco.descricao}</p>
                     <div className="mt-3 flex items-center justify-between text-xs font-medium text-slate-500">
                       <span>Dono: <span className="font-bold text-slate-700">{risco.dono}</span></span>
                     </div>
                   </div>
                 ))}
               </div>
            </div>

          </div>
        </div>
      )}

      {/* VISÃO 2: TABELA DE REGISTRO (RISK REGISTER) */}
      {viewState === "lista" && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden animate-in slide-in-from-right-8">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-lg w-96 shadow-sm">
              <Search className="w-4 h-4 text-slate-400" />
              <input type="text" placeholder="Buscar por código, descrição ou dono..." className="text-sm outline-none w-full font-medium" />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-600 shadow-sm hover:bg-slate-50">
              <Filter className="w-4 h-4"/> Filtros Avançados
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-white border-b border-slate-200 text-[10px] uppercase font-black text-slate-400 tracking-widest">
                <tr>
                  <th className="px-6 py-4">ID do Risco</th>
                  <th className="px-6 py-4">Descrição do Evento</th>
                  <th className="px-6 py-4">Categoria</th>
                  <th className="px-6 py-4 text-center">Prob x Imp</th>
                  <th className="px-6 py-4 text-center">RNP (Score)</th>
                  <th className="px-6 py-4">Responsável</th>
                  <th className="px-6 py-4">Status de Mitigação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {riscosCalculados.sort((a,b) => b.score - a.score).map(r => (
                  <tr key={r.id} className="hover:bg-slate-50 cursor-pointer transition-colors group">
                    <td className="px-6 py-4 font-mono font-bold text-slate-600">{r.codigo}</td>
                    <td className="px-6 py-4 font-bold text-slate-800 truncate max-w-xs">{r.descricao}</td>
                    <td className="px-6 py-4 font-medium text-slate-600">{r.categoria}</td>
                    <td className="px-6 py-4 text-center text-xs font-bold text-slate-400">{r.probabilidade} x {r.impacto}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block px-2 py-1 rounded-md text-[10px] font-black uppercase ${getRiskLabel(r.score).color}`}>
                        {r.score} - {getRiskLabel(r.score).label}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">{r.dono}</td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                        {r.status === 'Mitigado' ? <CheckCircle2 className="w-4 h-4 text-emerald-500"/> : <Activity className="w-4 h-4 text-amber-500"/>}
                        {r.status}
                      </span>
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

// COMPONENTES AUXILIARES DO RISCO
function KpiCard({ titulo, valor, desc, icon, cor }: any) {
  const cores: any = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    red: "bg-red-50 text-red-600 border-red-100",
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
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

function LegendaItem({ cor, texto }: { cor: string, texto: string }) {
  return (
    <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
      <span className={`w-4 h-4 rounded border border-white shadow-sm ${cor}`}></span>
      {texto}
    </div>
  );
}