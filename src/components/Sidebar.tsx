"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  LayoutDashboard,
  Settings,
  LogOut,
  Layers,
  Inbox,
  Users,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  ClipboardSignature,
  GitMerge,
  ShieldAlert,
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(true);

  if (pathname === "/login") return null;

  const isActive = (path: string) => {
    if (path === "/" && pathname !== "/") return false;
    return pathname === path || pathname.startsWith(path + "/");
  };

  const menuItems = [
    { label: "Painel Executivo", icon: LayoutDashboard, href: "/" },
    { label: "Gestão de Documentos", icon: FileText, href: "/documentos" },
    { label: "Gestão de Processos", icon: GitMerge, href: "/processos" },
    { label: "Gestão de Riscos", icon: ShieldAlert, href: "/riscos" },
    { label: "Gestão de Registros", icon: ClipboardSignature, href: "/gestao-registros" },
    { label: "Gestão de Indicadores", icon: BarChart3, href: "/indicadores", badge: "CAPA" },
  ];

  return (
    <>
      <aside
        className={`${
          isExpanded ? "w-64" : "w-20"
        } transition-all duration-300 bg-white border-r border-slate-200 flex flex-col justify-between z-20 shrink-0 whitespace-nowrap`}
      >
        <div className="flex-1 overflow-y-auto custom-scrollbar pb-4">
          <div className={`p-6 flex items-center ${isExpanded ? "gap-3" : "justify-center"}`}>
            <div className="w-8 h-8 bg-[#2655e8] rounded-lg flex items-center justify-center text-white font-bold shadow-sm shrink-0">
              DQ
            </div>

            {isExpanded && (
              <div>
                <h1 className="text-sm font-bold text-slate-800 leading-tight">DocQualis</h1>
                <h2 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  Gestão ISO 9001
                </h2>
              </div>
            )}
          </div>

          {isExpanded && (
            <div className="flex flex-col items-center pb-6 border-b border-slate-100">
              <div className="w-16 h-16 rounded-full bg-slate-100 border-2 border-white shadow-sm flex items-center justify-center text-slate-600 font-bold text-xl mb-2 shrink-0">
                CEO
              </div>
              <h3 className="font-bold text-slate-800 text-sm">Diretoria Executiva</h3>
              <span className="text-[10px] text-emerald-600 font-black bg-emerald-50 px-2 py-0.5 rounded-full mt-1 uppercase">
                🟢 Online
              </span>
            </div>
          )}

          <nav className="flex flex-col gap-1 px-3 mt-6">
            {isExpanded && (
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 mb-2">
                Módulos Master
              </p>
            )}

            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                title={!isExpanded ? item.label : undefined}
                className={`w-full flex items-center ${
                  isExpanded ? "justify-between px-3" : "justify-center px-0"
                } py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive(item.href)
                    ? "bg-[#eef2ff] text-[#2655e8]"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <div className={`flex items-center ${isExpanded ? "gap-3" : "justify-center"}`}>
                  <item.icon
                    className={`w-5 h-5 shrink-0 ${
                      isActive(item.href) ? "text-[#2655e8]" : "text-slate-400"
                    }`}
                  />

                  {isExpanded && item.label}
                </div>

                {isExpanded && item.badge && (
                  <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded text-[8px] font-black">
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-100 shrink-0">
          <Link
            href="/configuracoes"
            title={!isExpanded ? "Configurações" : undefined}
            className={`w-full flex items-center ${
              isExpanded ? "gap-3 px-3" : "justify-center px-0"
            } py-2.5 rounded-xl text-sm font-semibold transition-all ${
              isActive("/configuracoes")
                ? "bg-slate-100 text-slate-900"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Settings className="w-5 h-5 shrink-0" />
            {isExpanded && "Configurações"}
          </Link>
        </div>
      </aside>

      <aside className="w-16 bg-[#0f172a] flex flex-col items-center py-4 justify-between relative z-30 shadow-xl shrink-0">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="absolute -left-3 top-6 bg-white border rounded-full p-1 shadow-md text-slate-600 hover:scale-110 transition-all"
          title={isExpanded ? "Recolher menu" : "Expandir menu"}
        >
          {isExpanded ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>

        <div className="flex flex-col items-center gap-6 mt-10">
          <button className="p-2 bg-[#2655e8] rounded-xl text-white shadow-lg" title="Módulos">
            <Layers className="w-5 h-5" />
          </button>

          <button className="text-slate-400 hover:text-white" title="Inbox">
            <Inbox className="w-5 h-5" />
          </button>

          <button className="text-slate-400 hover:text-white" title="Usuários">
            <Users className="w-5 h-5" />
          </button>
        </div>

        <button className="text-slate-400 hover:text-red-400 transition-colors mb-4" title="Sair">
          <LogOut className="w-5 h-5" />
        </button>
      </aside>
    </>
  );
}