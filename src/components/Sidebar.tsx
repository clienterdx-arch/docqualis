"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Search, FileText, LayoutDashboard, Settings, LogOut, 
  Layers, Inbox, Eye, Users, Plus, ChevronLeft, ChevronRight, 
  BarChart3, ClipboardSignature, GitMerge
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(true);

  // INTELIGÊNCIA DTO: Se a rota for a tela de login, a sidebar não é renderizada.
  if (pathname === '/login') {
    return null;
  }

  // Função auxiliar para verificar se a rota está ativa
  const isActive = (path: string) => {
    if (path === '/' && pathname !== '/') return false;
    return pathname.startsWith(path);
  };

  return (
    <>
      {/* PAINEL PRIMÁRIO (Claro) */}
      <aside className={`${isExpanded ? "w-64" : "w-0 overflow-hidden"} transition-all duration-300 bg-white border-r border-slate-200 flex flex-col justify-between z-20 shrink-0 whitespace-nowrap`}>
        <div className="flex-1 overflow-y-auto custom-scrollbar pb-4">
          
          <div className="p-6 flex items-center gap-3">
            <div className="w-8 h-8 bg-[#2655e8] rounded-lg flex items-center justify-center text-white font-bold shadow-sm shrink-0">DQ</div>
            <div>
              <h1 className="text-sm font-bold text-slate-800 leading-tight">DocQualis</h1>
              <h2 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Gestão ISO 9001</h2>
            </div>
          </div>

          <div className="flex flex-col items-center pb-6 border-b border-slate-100">
            <div className="w-16 h-16 rounded-full bg-slate-100 border-2 border-white shadow-sm flex items-center justify-center text-slate-600 font-bold text-xl mb-2 shrink-0">
              CEO
            </div>
            <h3 className="font-bold text-slate-800">Diretoria</h3>
            <span className="text-xs text-slate-500 font-medium bg-slate-100 px-2 py-1 rounded-full mt-1">
              🟢 Disponível
            </span>
          </div>

          <div className="p-4">
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-400">
              <Search className="w-4 h-4 shrink-0" />
              <input type="text" placeholder="Pesquisar módulo..." className="bg-transparent text-sm outline-none w-full text-slate-700" />
            </div>
          </div>

          <nav className="flex flex-col gap-1 px-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 mb-2 mt-2">Módulos do Sistema</p>
            
            <Link href="/" className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${isActive('/') ? 'bg-[#eef2ff] text-[#2655e8]' : 'text-slate-600 hover:bg-slate-50'}`}>
              <LayoutDashboard className="w-5 h-5 shrink-0" /> Painel Executivo
            </Link>
            
            <Link href="/documentos" className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${isActive('/documentos') ? 'bg-[#eef2ff] text-[#2655e8]' : 'text-slate-600 hover:bg-slate-50'}`}>
              <FileText className="w-5 h-5 shrink-0" /> Gestão de Documentos
            </Link>

            <Link href="/processos" className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${isActive('/processos') ? 'bg-[#eef2ff] text-[#2655e8]' : 'text-slate-600 hover:bg-slate-50'}`}>
              <GitMerge className="w-5 h-5 shrink-0" /> Gestão de Processos
            </Link>

            {/* Módulo Gestão de Registros (DocForms) */}
            <Link href="/gestao-registros" className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${isActive('/gestao-registros') ? 'bg-[#eef2ff] text-[#2655e8]' : 'text-slate-600 hover:bg-slate-50'}`}>
              <ClipboardSignature className="w-5 h-5 shrink-0" /> Gestão de Registros
            </Link>

            {/* Módulo Gestão de Indicadores */}
            <Link href="/indicadores" className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${isActive('/indicadores') ? 'bg-[#eef2ff] text-[#2655e8]' : 'text-slate-600 hover:bg-slate-50'}`}>
              <div className="flex items-center gap-3">
                 <BarChart3 className="w-5 h-5 shrink-0" /> Gestão de Indicadores
              </div>
              <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded text-[9px] font-black">CAPA</span>
            </Link>
          </nav>
        </div>

        <div className="p-4 border-t border-slate-100 shrink-0">
          <Link href="/configuracoes" className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${isActive('/configuracoes') ? 'bg-[#eef2ff] text-[#2655e8]' : 'text-slate-600 hover:bg-slate-50'}`}>
            <Settings className="w-5 h-5 shrink-0" /> Configurações Globais
          </Link>
        </div>
      </aside>

      {/* PAINEL SECUNDÁRIO (Escuro) */}
      <aside className="w-16 bg-[#0f172a] flex flex-col items-center py-4 justify-between relative z-30 shadow-xl shrink-0">
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="absolute -left-3 top-6 bg-white border border-slate-200 rounded-full p-1 shadow-md hover:bg-slate-50 text-slate-600 transition-transform hover:scale-105 outline-none"
        >
          {isExpanded ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        <div className="flex flex-col items-center gap-6 mt-10">
          <button className="p-2 bg-[#2655e8] rounded-xl text-white hover:bg-[#1e40af] transition-colors shadow-lg shadow-indigo-900/50">
            <Layers className="w-5 h-5" />
          </button>
          <button className="text-slate-400 hover:text-white transition-colors" title="Caixa de Entrada"><Inbox className="w-5 h-5" /></button>
          <button className="text-slate-400 hover:text-white transition-colors" title="Visualização Rápida"><Eye className="w-5 h-5" /></button>
          <button className="text-slate-400 hover:text-white transition-colors" title="Usuários do Sistema"><Users className="w-5 h-5" /></button>
          <div className="w-6 h-px bg-slate-700 my-2"></div>
          <button className="text-slate-400 hover:text-white transition-colors" title="Ação Rápida"><Plus className="w-5 h-5" /></button>
        </div>
        <button className="text-slate-400 hover:text-red-400 transition-colors" title="Sair"><LogOut className="w-5 h-5" /></button>
      </aside>
    </>
  );
}