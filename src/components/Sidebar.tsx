"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  ClipboardSignature,
  FileText,
  GitMerge,
  LayoutDashboard,
  LogOut,
  Settings,
  Target,
  TriangleAlert,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { carregarPerfilUsuario } from "@/lib/perfil";

type MenuItem = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  activeFor?: string[];
};

type PerfilSidebar = {
  nome?: string | null;
  cargo?: string | null;
  perfil_acesso?: string | null;
  empresa?: { nome?: string | null } | null;
};

function iniciais(nome?: string | null) {
  const partes = String(nome ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (partes.length === 0) return "DQ";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
}

function rotuloPerfil(perfil: PerfilSidebar | null) {
  const funcao = perfil?.cargo || perfil?.perfil_acesso || "Usuário";
  const empresa = perfil?.empresa?.nome || "Workspace";
  return `${funcao} - ${empresa}`;
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [perfil, setPerfil] = useState<PerfilSidebar | null>(null);

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;

      const perfilComEmpresa = await carregarPerfilUsuario<PerfilSidebar>(
        data.session,
        "nome, cargo, perfil_acesso, empresa:empresa_id(nome)"
      );

      if (!ativo) return;

      if (perfilComEmpresa) {
        setPerfil(perfilComEmpresa);
        return;
      }

      const perfilSemEmpresa = await carregarPerfilUsuario<PerfilSidebar>(
        data.session,
        "nome, cargo, perfil_acesso"
      );

      if (ativo) setPerfil(perfilSemEmpresa);
    }

    void carregar();

    return () => {
      ativo = false;
    };
  }, []);

  if (pathname === "/login") return null;

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const menuItems: MenuItem[] = [
    { label: "Painel Executivo", icon: LayoutDashboard, href: "/" },
    {
      label: "Gestão de Documentos",
      icon: FileText,
      href: "/documentos",
      activeFor: ["/documento", "/editar-documento", "/novo-documento"],
    },
    { label: "Gestão de Processos", icon: GitMerge, href: "/processos" },
    { label: "Gestão de Ocorrências", icon: TriangleAlert, href: "/ocorrencias" },
    { label: "Gestão de Registros", icon: ClipboardSignature, href: "/gestao-registros" },
    { label: "Gestão de Indicadores", icon: BarChart3, href: "/indicadores" },
    { label: "Planejamento Estratégico", icon: Target, href: "/estrategico" },
  ];

  const isActive = (item: MenuItem) => {
    if (item.href === "/") return pathname === "/";
    return pathname === item.href ||
      pathname.startsWith(item.href + "/") ||
      item.activeFor?.some((path) => pathname === path || pathname.startsWith(path + "/"));
  };

  const isSettingsActive = pathname === "/configuracoes" || pathname.startsWith("/configuracoes/");

  return (
    <aside className="z-30 flex h-screen w-72 shrink-0 flex-col justify-between border-r border-slate-200 bg-white">
      <div className="flex-1 overflow-y-auto pb-4">
        <div className="flex items-center gap-3 p-6">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#2655e8] font-bold text-white shadow-sm">
            DQ
          </div>

          <div>
            <h1 className="text-sm font-bold leading-tight text-slate-800">DocQualis</h1>
            <h2 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Gestão ISO 9001
            </h2>
          </div>
        </div>

        <div className="flex flex-col items-center border-b border-slate-100 px-5 pb-6 text-center">
          <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-lg font-black text-[#2655e8] shadow-sm">
            {iniciais(perfil?.nome)}
          </div>

          <h3 className="max-w-full truncate text-sm font-bold text-slate-800">
            {perfil?.nome || "Carregando usuário"}
          </h3>

          <p className="mt-1 max-w-full text-balance text-xs font-semibold leading-snug text-slate-500">
            {rotuloPerfil(perfil)}
          </p>

          <span className="mt-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-600">
            Online
          </span>
        </div>

        <nav className="mt-6 flex flex-col gap-1 px-3">
          <p className="mb-2 px-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
            Módulos Master
          </p>

          {menuItems.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
                  active
                    ? "bg-[#eef2ff] text-[#2655e8]"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <item.icon
                  className={`h-5 w-5 shrink-0 ${
                    active ? "text-[#2655e8]" : "text-slate-400"
                  }`}
                />

                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="shrink-0 border-t border-slate-100 p-4">
        <Link
          href="/configuracoes"
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
            isSettingsActive
              ? "bg-slate-100 text-slate-900"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Settings className="h-5 w-5 shrink-0" />
          Configurações
        </Link>

        <button
          onClick={handleLogout}
          className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-500 transition-all hover:bg-red-50 hover:text-red-500"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          Sair
        </button>
      </div>
    </aside>
  );
}
