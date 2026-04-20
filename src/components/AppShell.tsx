"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useCallback, type ReactNode } from "react";
import {
  FileText,
  Workflow,
  LineChart,
  Bell,
  Search,
  Settings,
  ChevronDown,
  Sparkles,
  ClipboardSignature,
} from "lucide-react";

// =========================================================================
// TIPOS
// =========================================================================
interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
  badge?: string;
  /** Prefixos de rota que também ativam este item */
  activeFor?: string[];
}

// =========================================================================
// CONSTANTES — fora do componente para evitar recriação a cada render
// =========================================================================
const NAV_ITEMS: NavItem[] = [
  {
    label: "Gestão de Documentos",
    href: "/",
    icon: <FileText className="w-5 h-5" aria-hidden="true" />,
    activeFor: ["/documento", "/editar-documento", "/novo-documento"],
  },
  {
    label: "Gestão de Processos",
    href: "/processos",
    icon: <Workflow className="w-5 h-5" aria-hidden="true" />,
  },
  {
    label: "Gestão de Registros",
    href: "/gestao-registros",
    icon: <ClipboardSignature className="w-5 h-5" aria-hidden="true" />,
  },
  {
    label: "Gestão de Indicadores",
    href: "/indicadores",
    icon: <LineChart className="w-5 h-5" aria-hidden="true" />,
    badge: "CAPA",
  },
];

// =========================================================================
// HELPER — lógica de rota ativa centralizada
// =========================================================================
function isRouteActive(pathname: string, item: NavItem): boolean {
  if (item.href === "/") {
    return (
      pathname === "/" ||
      (item.activeFor ?? []).some((prefix) => pathname.startsWith(prefix))
    );
  }
  if (pathname.startsWith(item.href)) return true;
  return (item.activeFor ?? []).some((prefix) => pathname.startsWith(prefix));
}

// =========================================================================
// SUB-COMPONENTE — Item de navegação
// =========================================================================
function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isRouteActive(pathname, item);

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={[
        "flex items-center justify-between px-3 py-2.5 rounded-xl transition-all group",
        active
          ? "bg-[#eef2ff] text-[#2655e8] font-bold"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium",
      ].join(" ")}
    >
      <div className="flex items-center gap-3">
        <span
          className={[
            "transition-colors",
            active
              ? "text-[#2655e8]"
              : "text-slate-400 group-hover:text-[#2655e8]",
          ].join(" ")}
        >
          {item.icon}
        </span>
        <span className="text-sm">{item.label}</span>
      </div>

      {item.badge && (
        <span
          className={[
            "text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md",
            active
              ? "bg-[#e0e7ff] text-[#2655e8]"
              : "bg-slate-100 text-slate-500",
          ].join(" ")}
        >
          {item.badge}
        </span>
      )}
    </Link>
  );
}

// =========================================================================
// SUB-COMPONENTE — Barra de pesquisa com Ctrl+K
// =========================================================================
function SearchBar() {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "k") {
      e.preventDefault();
      inputRef.current?.focus();
    }
    if (e.key === "Escape") {
      inputRef.current?.blur();
    }
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="flex-1 max-w-xl">
      <div className="relative group">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#2655e8] transition-colors pointer-events-none"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          type="search"
          placeholder="Buscar documentos, POPs, riscos, indicadores..."
          aria-label="Busca global"
          className="w-full bg-slate-100 border border-transparent focus:border-[#e0e7ff] focus:bg-white text-sm rounded-full pl-10 pr-20 py-2 outline-none transition-all shadow-inner placeholder:text-slate-400"
        />
        <div
          className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1"
          aria-hidden="true"
        >
          <kbd className="text-[10px] font-bold text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded">
            Ctrl
          </kbd>
          <kbd className="text-[10px] font-bold text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded">
            K
          </kbd>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// COMPONENTE PRINCIPAL — AppShell (Client)
// =========================================================================
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/login") {
    return <>{children}</>;
  }

  const isSettingsActive = pathname.startsWith("/configuracoes");

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── SIDEBAR ─────────────────────────────────────────── */}
      <aside
        role="navigation"
        aria-label="Menu principal"
        className="w-72 bg-white border-r border-slate-200 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-20 shrink-0"
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-slate-100 shrink-0">
          <Link href="/" className="flex items-center gap-2.5" aria-label="DocQualis — página inicial">
            <div className="w-8 h-8 bg-[#2655e8] rounded-lg flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
              <Sparkles className="w-4 h-4" aria-hidden="true" />
            </div>
            <span className="font-black text-xl tracking-tight text-slate-800">
              DocQualis<span className="text-[#2655e8]">.</span>
            </span>
          </Link>
        </div>

        {/* Nav Items */}
        <div className="flex-1 overflow-y-auto py-6 px-4 custom-scrollbar">
          <p className="mb-4 px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Módulos do Sistema
          </p>
          <nav aria-label="Módulos" className="space-y-1.5">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} />
            ))}
          </nav>
        </div>

        {/* Configurações */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
          <Link
            href="/configuracoes"
            aria-current={isSettingsActive ? "page" : undefined}
            className={[
              "flex items-center gap-3 px-3 py-2.5 w-full rounded-xl transition-all text-sm font-medium",
              isSettingsActive
                ? "bg-[#eef2ff] text-[#2655e8] font-bold shadow-sm border border-[#e0e7ff]"
                : "text-slate-600 hover:bg-white hover:shadow-sm hover:text-slate-900 border border-transparent",
            ].join(" ")}
          >
            <Settings
              className={[
                "w-5 h-5",
                isSettingsActive ? "text-[#2655e8]" : "text-slate-400",
              ].join(" ")}
              aria-hidden="true"
            />
            Configurações Globais
          </Link>
        </div>
      </aside>

      {/* ── MAIN ────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm z-10 shrink-0">
          <SearchBar />

          <div className="flex items-center gap-5 pl-6">
            {/* Notificações */}
            <button
              type="button"
              aria-label="Ver notificações"
              className="relative p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-all"
            >
              <Bell className="w-5 h-5" aria-hidden="true" />
              <span
                aria-hidden="true"
                className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 border-2 border-white rounded-full"
              />
              <span className="sr-only">Você tem notificações</span>
            </button>

            <div className="w-px h-6 bg-slate-200" role="separator" />

            {/* Usuário */}
            <button
              type="button"
              aria-label="Menu do usuário"
              className="flex items-center gap-3 cursor-pointer group"
            >
              <div className="text-right hidden md:block">
                <p className="text-sm font-bold text-slate-800 leading-tight">
                  Sua Conta (CEO)
                </p>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#2655e8]">
                  Administrador
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-[#2655e8] text-white flex items-center justify-center font-bold shadow-md ring-2 ring-white group-hover:ring-[#eef2ff] transition-all select-none">
                CE
              </div>
              <ChevronDown
                className="w-4 h-4 text-slate-400 group-hover:text-slate-700"
                aria-hidden="true"
              />
            </button>
          </div>
        </header>

        {/* Conteúdo da página */}
        <main className="flex-1 overflow-y-auto relative">
          {children}
        </main>
      </div>
    </div>
  );
}