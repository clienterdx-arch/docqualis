"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Sparkles,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [lembrarEmail, setLembrarEmail] = useState(true);
  const [capsLockAtivo, setCapsLockAtivo] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [campoTocado, setCampoTocado] = useState({
    email: false,
    senha: false,
  });

  useEffect(() => {
    const emailSalvo = localStorage.getItem("docqualis_remember_email");
    if (emailSalvo) {
      setEmail(emailSalvo);
      setLembrarEmail(true);
    }
  }, []);

  const emailValido = useMemo(() => {
    return /\S+@\S+\.\S+/.test(email);
  }, [email]);

  const senhaValida = useMemo(() => {
    return senha.trim().length >= 6;
  }, [senha]);

  const formularioValido = emailValido && senhaValida;

  const emailInvalido = campoTocado.email && email.length > 0 && !emailValido;
  const senhaInvalida = campoTocado.senha && senha.length > 0 && !senhaValida;

  const handleKeyState = (e: React.KeyboardEvent<HTMLInputElement>) => {
    setCapsLockAtivo(e.getModifierState("CapsLock"));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    setCampoTocado({
      email: true,
      senha: true,
    });

    if (!email || !senha) {
      setErro("Por favor, preencha seu e-mail e senha para continuar.");
      return;
    }

    if (!emailValido) {
      setErro("Digite um e-mail válido.");
      return;
    }

    if (!senhaValida) {
      setErro("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setIsLoading(true);

    try {
      // CORREÇÃO: "as any" para evitar erro de build na Vercel com o Supabase Auth
      const { data, error } = await (supabase.auth as any).signInWithPassword({
        email: email.trim(),
        password: senha,
      });

      if (error) {
        throw new Error("Credenciais inválidas. Verifique seu e-mail e senha.");
      }

      if (lembrarEmail) {
        localStorage.setItem("docqualis_remember_email", email.trim());
      } else {
        localStorage.removeItem("docqualis_remember_email");
      }

      if (data.user) {
        router.push("/");
      }
    } catch (err: any) {
      setErro(err?.message || "Não foi possível entrar no sistema.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-slate-50 animate-in fade-in duration-700">
      {/* LADO ESQUERDO */}
      <div className="hidden lg:flex w-1/2 bg-slate-900 relative overflow-hidden flex-col justify-between p-12">
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/20 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative z-10 flex items-center gap-3 text-white">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/30">
            <Sparkles className="w-5 h-5" />
          </div>
          <span className="font-black text-2xl tracking-tight">
            DocQualis<span className="text-blue-500">.</span>
          </span>
        </div>

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300 backdrop-blur-sm mb-6">
            <CheckCircle2 className="w-4 h-4 text-blue-400" />
            Plataforma Inteligente de Gestão da Qualidade
          </div>

          <h1 className="text-4xl font-black text-white leading-tight mb-6">
            A evolução da Gestão da Qualidade na Saúde.
          </h1>

          <p className="text-lg text-slate-400 font-medium max-w-md leading-relaxed mb-12">
            Controle de documentos, riscos, indicadores e melhoria contínua em
            uma plataforma robusta, segura e aderente às melhores práticas de
            compliance e acreditação.
          </p>

          <div className="space-y-4">
            <div className="flex items-center gap-3 text-slate-300">
              <ShieldCheck className="w-5 h-5 text-blue-500" />
              <span className="font-medium">
                Trilhas de auditoria automatizadas
              </span>
            </div>

            <div className="flex items-center gap-3 text-slate-300">
              <Lock className="w-5 h-5 text-blue-500" />
              <span className="font-medium">
                Segurança de acesso e compliance institucional
              </span>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-slate-500 text-sm font-medium">
          &copy; {new Date().getFullYear()} DocQualis Enterprise. Todos os
          direitos reservados.
        </div>
      </div>

      {/* LADO DIREITO */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 relative">
        <div className="w-full max-w-md bg-white p-8 sm:p-10 rounded-3xl shadow-[0_12px_40px_rgba(15,23,42,0.06)] border border-slate-100">
          {/* Logo Mobile */}
          <div className="flex lg:hidden items-center justify-center gap-2 mb-10">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-md">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="font-black text-2xl tracking-tight text-slate-900">
              DocQualis<span className="text-blue-600">.</span>
            </span>
          </div>

          <div className="mb-8 text-center lg:text-left">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Bem-vindo de volta
            </h2>
            <p className="text-sm text-slate-500 mt-2 font-medium leading-relaxed">
              Acesse o painel executivo para continuar com segurança.
            </p>
          </div>

          {erro && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm font-bold rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-1 duration-300">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{erro}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6" noValidate>
            {/* E-mail */}
            <div>
              <label
                htmlFor="email"
                className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2"
              >
                E-mail Corporativo
              </label>

              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                </div>

                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (erro) setErro(null);
                  }}
                  onBlur={() =>
                    setCampoTocado((prev) => ({ ...prev, email: true }))
                  }
                  aria-invalid={emailInvalido}
                  className={`block w-full pl-11 pr-4 py-3.5 bg-slate-50 border rounded-2xl text-sm font-medium text-slate-900 outline-none transition-all shadow-inner placeholder:text-slate-400
                    ${
                      emailInvalido
                        ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                        : "border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    }`}
                  placeholder="voce@instituicao.com.br"
                />
              </div>

              {emailInvalido && (
                <p className="mt-2 text-xs font-semibold text-red-600">
                  Informe um e-mail válido.
                </p>
              )}
            </div>

            {/* Senha */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="senha"
                  className="block text-[10px] font-black text-slate-400 uppercase tracking-widest"
                >
                  Senha de Acesso
                </label>

                <Link
                  href="/esqueci-senha"
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors"
                >
                  Esqueceu a senha?
                </Link>
              </div>

              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                </div>

                <input
                  id="senha"
                  name="senha"
                  type={mostrarSenha ? "text" : "password"}
                  autoComplete="current-password"
                  value={senha}
                  onChange={(e) => {
                    setSenha(e.target.value);
                    if (erro) setErro(null);
                  }}
                  onBlur={() =>
                    setCampoTocado((prev) => ({ ...prev, senha: true }))
                  }
                  onKeyUp={handleKeyState}
                  onKeyDown={handleKeyState}
                  aria-invalid={senhaInvalida}
                  className={`block w-full pl-11 pr-12 py-3.5 bg-slate-50 border rounded-2xl text-sm font-mono tracking-[0.18em] font-bold text-slate-900 outline-none transition-all shadow-inner placeholder:text-slate-400
                    ${
                      senhaInvalida
                        ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                        : "border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    }`}
                  placeholder="••••••••"
                />

                <button
                  type="button"
                  onClick={() => setMostrarSenha((prev) => !prev)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-700 transition-colors"
                  aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                  title={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                >
                  {mostrarSenha ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>

              <div className="mt-2 min-h-[20px]">
                {capsLockAtivo ? (
                  <p className="text-xs font-semibold text-amber-600">
                    Caps Lock ativado.
                  </p>
                ) : senhaInvalida ? (
                  <p className="text-xs font-semibold text-red-600">
                    A senha deve ter pelo menos 6 caracteres.
                  </p>
                ) : null}
              </div>
            </div>

            {/* Opções */}
            <div className="flex items-center justify-between gap-4">
              <label className="inline-flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={lembrarEmail}
                  onChange={(e) => setLembrarEmail(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-slate-600">
                  Lembrar meu e-mail
                </span>
              </label>

              <div className="hidden sm:block text-[11px] font-semibold text-slate-400">
                Acesso seguro
              </div>
            </div>

            {/* Botão */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-2xl font-bold text-sm transition-all shadow-lg shadow-blue-600/20 disabled:opacity-70 disabled:cursor-not-allowed active:scale-[0.99]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Entrando...
                </>
              ) : (
                <>
                  Acessar Sistema
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Rodapé do card */}
            <div className="pt-2">
              <p className="text-center text-xs text-slate-400 leading-relaxed">
                Ao acessar, você concorda com as políticas de segurança e uso da
                plataforma institucional.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}