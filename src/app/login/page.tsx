"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Sparkles, ArrowRight, ShieldCheck, Mail, Lock, Loader2, Building2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Autenticação no Supabase
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        throw new Error("E-mail ou senha incorretos.");
      }

      if (data.session) {
        // 2. Login de sucesso! Redireciona para o Painel Executivo
        router.push("/");
      }
    } catch (err: any) {
      setError(err.message || "Ocorreu um erro ao tentar acessar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-sans bg-white">
      
      {/* LADO ESQUERDO - BRANDING (Visual SaaS) */}
      <div className="hidden lg:flex w-1/2 bg-[#0f172a] relative flex-col justify-between overflow-hidden">
        {/* Efeito de brilho no fundo */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-[#2655e8]/20 blur-[120px]"></div>
          <div className="absolute bottom-[10%] -right-[20%] w-[60%] h-[60%] rounded-full bg-indigo-500/20 blur-[100px]"></div>
        </div>

        <div className="p-12 relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-[#2655e8] rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="font-black text-2xl tracking-tight text-white">
              DocQualis<span className="text-[#2655e8]">.</span>
            </span>
          </div>

          <div className="max-w-md">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-6">
              <ShieldCheck className="w-3.5 h-3.5" />
              SaaS Multi-Tenant
            </div>
            <h1 className="text-4xl lg:text-5xl font-black text-white leading-[1.1] tracking-tight mb-6">
              O ecossistema definitivo para Gestão da Qualidade.
            </h1>
            <p className="text-lg text-slate-400 font-medium leading-relaxed">
              Conecte documentos, processos, riscos e indicadores em uma única plataforma estruturada para alta performance organizacional.
            </p>
          </div>
        </div>

        <div className="p-12 relative z-10">
          <div className="flex items-center gap-4 text-sm font-bold text-slate-400">
            <span>ISO 9001</span>
            <div className="w-1 h-1 rounded-full bg-slate-600"></div>
            <span>ONA Nível 3</span>
            <div className="w-1 h-1 rounded-full bg-slate-600"></div>
            <span>LGPD Compliance</span>
          </div>
        </div>
      </div>

      {/* LADO DIREITO - FORMULÁRIO DE LOGIN */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-8 sm:p-12 relative">
        
        {/* Logo Mobile */}
        <div className="flex lg:hidden items-center gap-3 mb-12 absolute top-8 left-8">
          <div className="w-8 h-8 bg-[#2655e8] rounded-lg flex items-center justify-center text-white shadow-md">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="font-black text-xl tracking-tight text-slate-900">
            DocQualis<span className="text-[#2655e8]">.</span>
          </span>
        </div>

        <div className="w-full max-w-[420px] animate-in fade-in slide-in-from-bottom-8 duration-700">
          
          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Acessar Sistema</h2>
            <p className="text-sm font-medium text-slate-500">
              Insira suas credenciais corporativas para entrar no seu ambiente (workspace).
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-sm font-bold text-red-600 flex items-start gap-3 animate-in fade-in">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2 pl-1">
                  E-mail Corporativo
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@hospital.com.br"
                    className="w-full h-14 pl-12 pr-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:bg-white focus:border-[#2655e8] focus:ring-4 focus:ring-[#2655e8]/10 transition-all text-slate-900 placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2 pl-1 pr-2">
                  <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500">
                    Senha
                  </label>
                  <a href="#" className="text-xs font-bold text-[#2655e8] hover:underline">
                    Esqueceu a senha?
                  </a>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-14 pl-12 pr-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:bg-white focus:border-[#2655e8] focus:ring-4 focus:ring-[#2655e8]/10 transition-all text-slate-900 placeholder:text-slate-400"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full h-14 mt-4 bg-[#2655e8] text-white rounded-2xl text-sm font-bold shadow-lg shadow-[#2655e8]/30 hover:bg-[#1e40af] hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Autenticando...
                </>
              ) : (
                <>
                  Entrar no Workspace
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-slate-100 flex items-center justify-center gap-2 text-xs font-medium text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            Acesso seguro e criptografado de ponta a ponta.
          </div>
        </div>
      </div>
    </div>
  );
}

// Componente local apenas para o icone de erro não quebrar caso não seja importado acima
function AlertCircle(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}