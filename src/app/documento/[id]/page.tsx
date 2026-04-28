"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft, FileText, CheckCircle2, XCircle,
  AlertCircle, ShieldCheck, KeyRound, Clock,
  Loader2, FileSignature, Printer, Lock
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { carregarPerfilUsuario } from "@/lib/perfil";

export default function SalaRevisaoPage() {
  const router = useRouter();
  const params = useParams();
  const documentoId = params.id as string;

  const [documento,    setDocumento]    = useState<any>(null);
  const [isLoading,    setIsLoading]    = useState(true);
  const [emailUsuario, setEmailUsuario] = useState("");
  const [nomeUsuario,  setNomeUsuario]  = useState("Usuário");
  const [empresaId,    setEmpresaId]    = useState<string | null>(null);

  // ✅ Permissão baseada no perfil_acesso real
  const [isQualidade, setIsQualidade] = useState(false);

  const [justificativa,   setJustificativa]   = useState("");
  const [senhaAssinatura, setSenhaAssinatura] = useState("");
  const [isProcessando,   setIsProcessando]   = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: "sucesso" | "erro"; msg: string } | null>(null);

  /* ── INICIALIZAÇÃO ────────────────────────────────────── */
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);

      // Sessão do usuário
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      setEmailUsuario(session.user.email ?? "");

      const perfil = await carregarPerfilUsuario<{ empresa_id?: string | null; nome?: string | null; perfil_acesso?: string | null }>(session, "empresa_id, nome, perfil_acesso");
      if (perfil) {
        setEmpresaId(perfil.empresa_id ?? null);
        setNomeUsuario(perfil.nome ?? "Usuário");
        // ✅ Permissão real — Gestores de Qualidade e Admins podem imprimir
        setIsQualidade(["GESTOR_QUALIDADE", "APROVADOR", "ADMIN_TENANT", "SUPERADMIN"].includes(perfil.perfil_acesso ?? ""));
      }

      // Carrega documento com filtro de empresa
      if (documentoId && perfil?.empresa_id) {
        const { data, error } = await supabase
          .from("documentos")
          .select("*")
          .eq("id", documentoId)
          .eq("empresa_id", perfil.empresa_id) // ✅ Segurança multi-tenant
          .single();

        if (data) setDocumento(data);
        if (error) console.error("Documento não encontrado:", error);
      }

      setIsLoading(false);
    };
    init();
  }, [documentoId, router]);

  /* ── DERIVADOS ────────────────────────────────────────── */
  const isFormulario = documento?.tipo_documento?.toLowerCase().includes("formul") || documento?.codigo?.includes("FOR");
  const podeImprimir = isQualidade || isFormulario;

  /* ── ASSINATURA ELETRÔNICA ────────────────────────────── */
  const handleAssinatura = async (acao: "Aprovar" | "Devolver") => {
    setFeedback(null);

    if (!senhaAssinatura) {
      setFeedback({ tipo: "erro", msg: "A Assinatura Eletrônica (Senha) é obrigatória." }); return;
    }
    if (acao === "Devolver" && !justificativa.trim()) {
      setFeedback({ tipo: "erro", msg: "Para devolver, preencha o parecer técnico justificando a decisão." }); return;
    }
    if (!empresaId) {
      setFeedback({ tipo: "erro", msg: "Não foi possível identificar a empresa do usuário." }); return;
    }

    setIsProcessando(true);

    try {
      // ✅ Validação REAL da senha via Supabase Auth (não mais hardcoded!)
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: emailUsuario,
        password: senhaAssinatura,
      });

      if (authError) {
        setFeedback({ tipo: "erro", msg: "Assinatura inválida. Senha incorreta." });
        setIsProcessando(false);
        return;
      }

      // Determina próximo status
      let novoStatus = "";
      if (acao === "Aprovar") {
        if (documento.status === "Em Verificação")  novoStatus = "Em Homologação";
        else if (documento.status === "Em Homologação") novoStatus = "Repositório";
        else novoStatus = documento.status;
      } else {
        novoStatus = "Em Elaboração";
      }

      // Audit trail no campo justificativa
      const dataHora = new Date().toLocaleString("pt-BR");
      const registroAuditoria = `\n[${dataHora}] ${acao.toUpperCase()} por ${nomeUsuario} — Parecer: ${justificativa || "Aprovado sem ressalvas."}`;
      const historicoAtualizado = (documento.justificativa ?? "") + registroAuditoria;

      const { error } = await supabase
        .from("documentos")
        .update({
          status:       novoStatus,
          justificativa: historicoAtualizado,
          ...(novoStatus === "Repositório" ? { dt_homologacao: new Date().toISOString().slice(0, 10) } : {}),
        })
        .eq("id", documentoId)
        .eq("empresa_id", empresaId); // ✅ Segurança extra

      if (error) throw error;

      setFeedback({ tipo: "sucesso", msg: `Documento ${acao === "Aprovar" ? "aprovado e avançado" : "devolvido para ajustes"} com sucesso!` });
      setTimeout(() => router.push("/documentos"), 2000);

    } catch (e: any) {
      setFeedback({ tipo: "erro", msg: e.message });
    } finally {
      setIsProcessando(false);
    }
  };

  const handleImprimir = () => {
    if (podeImprimir && documento?.arquivo_url) {
      window.open(documento.arquivo_url, "_blank");
    }
  };

  /* ── LOADING / NOT FOUND ──────────────────────────────── */
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#2655e8]" />
        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Acessando Cofre Digital...</p>
      </div>
    );
  }

  if (!documento) {
    return (
      <div className="p-8 text-center font-bold text-slate-500">
        Documento não encontrado ou acesso não autorizado.
      </div>
    );
  }

  /* ── RENDER ───────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-8 animate-in fade-in duration-500">

      {/* DLP — bloqueio de impressão para não autorizados */}
      <style dangerouslySetInnerHTML={{ __html: `@media print { ${!podeImprimir ? "body { display: none !important; }" : ""} }` }} />

      <div className="max-w-7xl mx-auto space-y-8">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <Link href="/documentos" className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-[#2655e8] hover:border-[#2655e8] hover:shadow-md transition-all">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Sala de Homologação</h1>
                <span className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border shadow-sm ${documento.status === "Em Homologação" ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                  {documento.status}
                </span>
              </div>
              <p className="text-sm text-slate-500 font-medium flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" /> Trilhas de Auditoria CFR 21 Part 11 Ativas
              </p>
            </div>
          </div>
        </div>

        {feedback && (
          <div className={`p-4 rounded-2xl border flex items-center gap-3 text-sm font-black animate-in slide-in-from-top-4 shadow-sm ${feedback.tipo === "sucesso" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"}`}>
            {feedback.tipo === "sucesso" ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
            {feedback.msg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* ESQUERDA: VIEWER */}
          <div className="lg:col-span-8 space-y-6">

            {/* CARD DE IDENTIFICAÇÃO */}
            <div className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
              <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${podeImprimir ? "bg-[#2655e8]" : "bg-red-500"}`} />
              <div className="flex items-center gap-5">
                <div className={`p-5 rounded-2xl shrink-0 border shadow-sm ${podeImprimir ? "bg-blue-50 text-[#2655e8] border-blue-100" : "bg-slate-50 text-slate-400 border-slate-200"}`}>
                  {podeImprimir ? <FileSignature className="w-8 h-8" /> : <Lock className="w-8 h-8" />}
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-black text-[#2655e8] font-mono tracking-tighter bg-[#eef2ff] px-2 py-0.5 rounded border border-[#e0e7ff]">{documento.codigo}</span>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Rev. {documento.versao}</span>
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest bg-slate-100 px-2 py-0.5 rounded">{documento.setor}</span>
                  </div>
                  <h2 className="text-xl font-black text-slate-800 leading-tight">{documento.titulo}</h2>
                </div>
              </div>
              <div className="shrink-0 w-full md:w-auto">
                {podeImprimir ? (
                  <button onClick={handleImprimir} className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white text-[#2655e8] border-2 border-[#eef2ff] font-black rounded-2xl text-xs hover:bg-[#2655e8] hover:text-white transition-all shadow-sm">
                    <Printer className="w-4 h-4" /> IMPRIMIR PDF
                  </button>
                ) : (
                  <div className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-slate-50 text-slate-400 border border-slate-200 font-bold rounded-2xl text-xs cursor-not-allowed" title="Prevenção de Perda de Dados ativa.">
                    <Lock className="w-4 h-4" /> IMPRESSÃO BLOQUEADA
                  </div>
                )}
              </div>
            </div>

            {/* PDF VIEWER */}
            <div className="bg-slate-200 p-1.5 rounded-[2.5rem] border border-slate-300 shadow-inner overflow-hidden">
              <div className="bg-white rounded-[2rem] overflow-hidden h-[800px] relative shadow-2xl border border-slate-300">
                {documento.arquivo_url ? (
                  <iframe src={`${documento.arquivo_url}#toolbar=0&navpanes=0&scrollbar=0`} className="w-full h-full border-none absolute inset-0" title="DocQualis Secure Viewer" />
                ) : (
                  <div className="flex-1 h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50">
                    <FileText className="w-20 h-20 opacity-10 mb-4" />
                    <p className="font-black uppercase tracking-tighter">Documento sem arquivo PDF associado.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* DIREITA: PAINEL DE ASSINATURA */}
          <div className="lg:col-span-4 space-y-6">

            <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-sm flex flex-col overflow-hidden">
              <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">Painel de Assinatura</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Validação Eletrônica com Senha</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100">
                  <ShieldCheck className="w-5 h-5 text-[#2655e8]" />
                </div>
              </div>

              <div className="p-8 space-y-8 flex-1 flex flex-col">

                {/* RESUMO DO DOCUMENTO */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Elaborado por</p>
                    <p className="text-xs font-bold text-slate-700 truncate">{documento.elaborador}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Aguardando</p>
                    <p className="text-xs font-bold text-amber-600 truncate">
                      {documento.status === "Em Verificação" ? documento.verificador_pendente?.split(";")[0] : documento.aprovador}
                    </p>
                  </div>
                </div>

                {/* PARECER */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Parecer Técnico / Notas de Revisão</label>
                  <textarea rows={5} value={justificativa} onChange={(e) => setJustificativa(e.target.value)} placeholder="Descreva observações ou motivos da devolução..."
                    className="w-full px-5 py-4 bg-slate-50/50 border border-slate-200 rounded-[1.5rem] text-sm font-medium outline-none focus:border-[#2655e8] focus:bg-white focus:ring-4 focus:ring-[#2655e8]/5 transition-all resize-none shadow-sm" />
                </div>

                {/* SENHA DE ASSINATURA */}
                <div>
                  <label className="block text-[10px] font-black text-slate-800 uppercase tracking-widest mb-3 px-1 flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-[#2655e8]" /> Senha de Assinatura Eletrônica
                  </label>
                  <input type="password" value={senhaAssinatura} onChange={(e) => setSenhaAssinatura(e.target.value)} placeholder="Sua senha de autenticação"
                    className="w-full px-6 py-4 bg-slate-900 border-none rounded-[1.5rem] text-white text-sm font-black outline-none focus:ring-4 focus:ring-blue-500/20 transition-all text-center tracking-[0.5em]" />
                  {/* ✅ Aviso claro de que é a senha real do sistema */}
                  <p className="mt-3 text-[10px] text-slate-400 text-center font-medium italic">
                    Use sua senha de acesso ao DocQualis. Ao assinar, você confirma a leitura integral.
                  </p>
                </div>

                {/* BOTÕES DE AÇÃO */}
                <div className="grid grid-cols-1 gap-3 pt-2">
                  <button onClick={() => handleAssinatura("Aprovar")} disabled={isProcessando}
                    className="w-full py-4 bg-[#2655e8] text-white rounded-2xl text-sm font-black hover:bg-[#1e40af] shadow-xl shadow-blue-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 uppercase tracking-widest">
                    {isProcessando ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                    APROVAR E AVANÇAR
                  </button>
                  <button onClick={() => handleAssinatura("Devolver")} disabled={isProcessando}
                    className="w-full py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl text-sm font-bold hover:bg-red-50 hover:text-red-600 hover:border-red-100 flex items-center justify-center gap-2 transition-all disabled:opacity-50 uppercase tracking-widest">
                    <XCircle className="w-5 h-5" /> DEVOLVER PARA AJUSTES
                  </button>
                </div>

              </div>
            </div>

            {/* AUDIT TRAIL */}
            <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-sm p-8">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-8 flex items-center gap-2 px-1">
                <Clock className="w-4 h-4" /> Histórico de Tramitação
              </h3>
              <div className="space-y-6 relative border-l-2 border-slate-100 ml-3 pl-8">
                {documento.justificativa?.split("\n").filter((j: string) => j.trim() !== "").reverse().map((linha: string, idx: number) => {
                  const isAprovacao = linha.toUpperCase().includes("APROVAR");
                  return (
                    <div key={idx} className="relative">
                      <div className={`absolute -left-[41px] top-1 flex items-center justify-center w-5 h-5 rounded-full border-4 border-white shadow-sm z-10 ${isAprovacao ? "bg-emerald-500" : "bg-red-500"}`} />
                      <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                        <p className="text-[11px] text-slate-700 font-bold leading-relaxed">{linha}</p>
                      </div>
                    </div>
                  );
                })}

                {/* Entrada inicial */}
                <div className="relative">
                  <div className="absolute -left-[41px] top-1 flex items-center justify-center w-5 h-5 rounded-full border-4 border-white bg-[#2655e8] shadow-sm z-10" />
                  <div className="bg-[#eef2ff] p-4 rounded-2xl border border-[#e0e7ff]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-black text-[#2655e8] text-[10px] uppercase tracking-widest">Criação</span>
                      <time className="text-[9px] font-black text-slate-400">{new Date(documento.created_at).toLocaleDateString("pt-BR")}</time>
                    </div>
                    <div className="text-[11px] text-slate-600 font-bold uppercase tracking-tight">Registro inicial submetido por {documento.elaborador}</div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
