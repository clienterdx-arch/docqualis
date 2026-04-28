"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  ClipboardSignature,
  FileText,
  GitMerge,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldAlert,
} from "lucide-react";

type MenuItem = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  activeFor?: string[];
};

export default function Sidebar() {
  const pathname = usePathname();

  if (pathname === "/login") return null;

  const menuItems: MenuItem[] = [
    { label: "Painel Executivo", icon: LayoutDashboard, href: "/" },
    {
      label: "Gestão de Documentos",
      icon: FileText,
      href: "/documentos",
      activeFor: ["/documento", "/editar-documento", "/novo-documento"],
    },
    { label: "Gestão de Processos", icon: GitMerge, href: "/processos" },
    { label: "Gestão de Riscos", icon: ShieldAlert, href: "/riscos" },
    { label: "Gestão de Registros", icon: ClipboardSignature, href: "/gestao-registros" },
    { label: "Gestão de Indicadores", icon: BarChart3, href: "/indicadores" },
  ];

  const isActive = (item: MenuItem) => {
    if (item.href === "/") return pathname === "/";
    return pathname === item.href ||
      pathname.startsWith(item.href + "/") ||
      item.activeFor?.some((path) => pathname === path || pathname.startsWith(path + "/"));
  };

  const isSettingsActive = pathname === "/configuracoes" || pathname.startsWith("/configuracoes/");

  return (
    <aside className="w-72 h-screen bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 z-30">
      <div className="flex-1 overflow-y-auto pb-4">
        <div className="p-6 flex items-center gap-3">
          <div className="w-9 h-9 bg-[#2655e8] rounded-lg flex items-center justify-center text-white font-bold shadow-sm shrink-0">
            DQ
          </div>

          <div>
            <h1 className="text-sm font-bold text-slate-800 leading-tight">DocQualis</h1>
            <h2 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Gestão ISO 9001
            </h2>
          </div>
        </div>

        <div className="flex flex-col items-center pb-6 border-b border-slate-100">
          <div className="w-16 h-16 rounded-full bg-slate-100 border-2 border-white shadow-sm flex items-center justify-center text-slate-600 font-bold text-xl mb-2">
            CEO
          </div>

          <h3 className="font-bold text-slate-800 text-sm">Diretoria Executiva</h3>

          <span className="text-[10px] text-emerald-600 font-black bg-emerald-50 px-2 py-0.5 rounded-full mt-1 uppercase">
            Online
          </span>
        </div>

        <nav className="flex flex-col gap-1 px-3 mt-6">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 mb-2">
            Módulos Master
          </p>

          {menuItems.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  active
                    ? "bg-[#eef2ff] text-[#2655e8]"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <item.icon
                  className={`w-5 h-5 shrink-0 ${
                    active ? "text-[#2655e8]" : "text-slate-400"
                  }`}
                />

                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-slate-100 shrink-0">
        <Link
          href="/configuracoes"
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            isSettingsActive
              ? "bg-slate-100 text-slate-900"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Settings className="w-5 h-5 shrink-0" />
          Configurações
        </Link>

        <button className="mt-2 w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-500 hover:bg-red-50 hover:text-red-500 transition-all">
          <LogOut className="w-5 h-5 shrink-0" />
          Sair
        </button>
      </div>
    </aside>
  );
}
