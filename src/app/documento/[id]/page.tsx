"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { 
  ArrowLeft, FileText, CheckCircle2, XCircle, 
  AlertCircle, ShieldCheck, KeyRound, Clock, 
  UserCheck, Loader2, FileSignature, Printer, Lock
} from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function SalaRevisaoPage() {
  const router = useRouter();
  const params = useParams();
  const documentoId = params.id as string;

  // ==========================================================
  // CONTROLE DE ACESSO ENTERPRISE (DLP - Data Loss Prevention)
  // ==========================================================
  const isQualidade = false; // Mock: Defina como 'true' para simular a visão da Qualidade

  const [documento, setDocumento] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Estados da Assinatura Eletrônica
  const [justificativa, setJustificativa] = useState("");
  const [senhaAssinatura, setSenhaAssinatura] = useState("");
  const [isProcessando, setIsProcessando] = useState(false);
  const [feedback, setFeedback] = useState<{tipo: 'sucesso' | 'erro', msg: string} | null>(null);

  useEffect(() => {
    const fetchDocumento = async () => {
      setIsLoading(true);
      if (documentoId) {
        const { data, error } = await supabase
          .from('documentos')
          .select('*')
          .eq('id', documentoId)
          .single();
        
        if (data) setDocumento(data);
        if (error) console.error(error);
      }
      setIsLoading(false);
    };
    fetchDocumento();
  }, [documentoId]);

  // Lógica de Permissão de Impressão (Qualidade OU se for Formulário)
  const isFormulario = documento?.tipo_documento?.toLowerCase().includes('formul') || documento?.codigo?.includes('FOR');
  const podeImprimir = isQualidade || isFormulario;

  const handleAssinatura = async (acao: 'Aprovar' | 'Devolver') => {
    setFeedback(null);

    if (!senhaAssinatura) {
      setFeedback({ tipo: 'erro', msg: "A Assinatura Eletrônica (Senha) é obrigatória." });
      return;
    }
    
    if (senhaAssinatura.trim() !== "123456") { 
      setFeedback({ tipo: 'erro', msg: "Assinatura inválida. Senha incorreta." });
      return;
    }

    if (acao === 'Devolver' && !justificativa.trim()) {
      setFeedback({ tipo: 'erro', msg: "Para devolver, preencha o parecer técnico justificando a decisão." });
      return;
    }

    setIsProcessando(true);

    try {
      let novoStatus = "";
      if (acao === 'Aprovar') {
        if (documento.status === "Em Verificação") novoStatus = "Em Homologação";
        else if (documento.status === "Em Homologação") novoStatus = "Repositório"; 
        else novoStatus = documento.status;
      } else {
        novoStatus = "Em Elaboração"; 
      }

      const dataHora = new Date().toLocaleString('pt-BR');
      const registroAuditoria = `\n[${dataHora}] ${acao.toUpperCase()} por CEO - Parecer: ${justificativa || 'Aprovado sem ressalvas.'}`;
      const historicoAtualizado = (documento.justificativa || '') + registroAuditoria;

      const { error } = await supabase
        .from('documentos')
        .update({ 
          status: novoStatus,
          justificativa: historicoAtualizado 
        })
        .eq('id', documentoId);

      if (error) throw error;

      setFeedback({ tipo: 'sucesso', msg: `Documento ${acao === 'Aprovar' ? 'aprovado' : 'devolvido'} com sucesso! Autenticando...` });
      setTimeout(() => router.push('/'), 2000);

    } catch (err: any) {
      setFeedback({ tipo: 'erro', msg: err.message });
    } finally {
      setIsProcessando(false);
    }
  };

  const handleImprimir = () => {
    if (podeImprimir && documento?.arquivo_url) {
      window.open(documento.arquivo_url, '_blank');
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center font-bold text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <p>Acessando Cofre Digital do Documento...</p>
      </div>
    );
  }

  if (!documento) {
    return <div className="p-8 text-center font-bold text-slate-500">Documento não encontrado.</div>;
  }

  return (
    <div className="p-8 max-w-[1400px] mx-auto animate-in fade-in duration-500">
      
      {/* INJEÇÃO DE CSS PARA BLOQUEAR CTRL+P DO NAVEGADOR SE NÃO TIVER PERMISSÃO */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          ${!podeImprimir ? 'body { display: none !important; }' : ''}
        }
      `}} />

      {/* HEADER DA SALA DE REVISÃO */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-50 hover:shadow-sm transition-all">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Análise e Homologação</h1>
              <span className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border
                ${documento.status === 'Em Homologação' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-amber-50 text-amber-700 border-amber-200'}
              `}>
                {documento.status}
              </span>
            </div>
            <p className="text-sm text-slate-500 font-medium flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500"/> Ambiente Seguro CFR 21 Part 11
            </p>
          </div>
        </div>
      </div>

      {feedback && (
        <div className={`mb-8 p-4 rounded-xl border flex items-center gap-3 text-sm font-bold animate-in slide-in-from-top-4 shadow-sm
          ${feedback.tipo === 'sucesso' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}
        `}>
          {feedback.tipo === 'sucesso' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          {feedback.msg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* COLUNA ESQUERDA: VISUALIZADOR DE PDF E METADADOS */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Card de Metadados Modernizado com DLP (Prevenção de Perda de Dados) */}
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex items-center justify-between gap-5 relative overflow-hidden">
            
            {/* Faixa de Segurança Visual */}
            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${podeImprimir ? 'bg-blue-500' : 'bg-red-500'}`}></div>

            <div className="flex items-center gap-5">
              <div className={`p-4 rounded-2xl shrink-0 border ${podeImprimir ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                {podeImprimir ? <FileSignature className="w-8 h-8" /> : <Lock className="w-8 h-8" />}
              </div>
              <div className="flex-1 pt-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-sm font-black text-blue-700 font-mono tracking-wider bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{documento.codigo}</span>
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Revisão {documento.versao}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{documento.setor}</span>
                </div>
                <h2 className="text-xl font-bold text-slate-800 leading-snug">{documento.titulo}</h2>
              </div>
            </div>

            {/* Controle Inteligente de Impressão/Download */}
            <div className="shrink-0">
              {podeImprimir ? (
                <button onClick={handleImprimir} className="flex items-center gap-2 px-5 py-2.5 bg-blue-50 text-blue-700 border border-blue-200 font-bold rounded-xl text-sm hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                  <Printer className="w-4 h-4" /> Baixar / Imprimir PDF
                </button>
              ) : (
                <div className="flex items-center gap-2 px-5 py-2.5 bg-slate-50 text-slate-400 border border-slate-200 font-bold rounded-xl text-sm cursor-not-allowed" title="Impressão restrita. Apenas equipe da Qualidade ou Formulários.">
                  <Lock className="w-4 h-4" /> Impressão Bloqueada
                </div>
              )}
            </div>
          </div>

          {/* Leitor de PDF - #toolbar=0 bloqueia a impressão nativa do Iframe */}
          <div className="bg-slate-100 p-2 rounded-3xl border border-slate-200 shadow-inner">
            <div className="bg-white rounded-2xl overflow-hidden h-[750px] shadow-sm border border-slate-200 flex flex-col relative">
              {documento.arquivo_url ? (
                <iframe 
                  src={`${documento.arquivo_url}#toolbar=0&navpanes=0`} 
                  className="w-full h-full border-none absolute inset-0"
                  title="Visualizador de Documento"
                ></iframe>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50">
                  <FileText className="w-16 h-16 opacity-20 mb-4" />
                  <p className="font-bold">Nenhum arquivo PDF anexado a este registro.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA: WORKFLOW DE ASSINATURA */}
        <div className="lg:col-span-4 space-y-6">
          
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden">
            {/* Header do Painel */}
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800">Painel de Assinatura</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Controle de Fluxo</p>
              </div>
              <ShieldCheck className="w-5 h-5 text-blue-500" />
            </div>

            <div className="p-6 space-y-6 flex-1 flex flex-col">
              
              {/* Resumo da Tramitação */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-500">Elaborador:</span>
                  <span className="font-bold text-slate-800 flex items-center gap-1.5"><UserCheck className="w-3.5 h-3.5 text-blue-500"/> {documento.elaborador}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-500">Data Base:</span>
                  <span className="font-bold text-slate-800">{new Date(documento.dt_elaboracao).toLocaleDateString('pt-BR', {timeZone:'UTC'})}</span>
                </div>
                <div className="flex justify-between items-center text-xs pt-3 mt-1 border-t border-slate-200/60">
                  <span className="font-bold text-slate-500">Aguardando:</span>
                  <span className="font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">{documento.status === 'Em Verificação' ? documento.verificador_pendente?.split(';')[0] : documento.aprovador}</span>
                </div>
              </div>

              {/* Caixa de Parecer */}
              <div className="flex-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Parecer Técnico / Resumo</label>
                <textarea 
                  rows={4} 
                  value={justificativa}
                  onChange={(e) => setJustificativa(e.target.value)}
                  placeholder="Escreva suas observações (Obrigatório em caso de devolução)..."
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all resize-none"
                ></textarea>
              </div>

              {/* Assinatura (Senha) */}
              <div className="pt-2">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-blue-500" /> Assinatura Eletrônica
                </label>
                <input 
                  type="password" 
                  value={senhaAssinatura}
                  onChange={(e) => setSenhaAssinatura(e.target.value)}
                  placeholder="Senha: 123456"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all text-center tracking-widest"
                />
              </div>

              {/* Botões de Ação */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button 
                  onClick={() => handleAssinatura('Devolver')}
                  disabled={isProcessando}
                  className="w-full py-3.5 bg-white border-2 border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:border-red-200 hover:text-red-600 hover:bg-red-50 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" /> Devolver
                </button>

                <button 
                  onClick={() => handleAssinatura('Aprovar')}
                  disabled={isProcessando}
                  className="w-full py-3.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {isProcessando ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                  Aprovar
                </button>
              </div>

            </div>
          </div>

          {/* Trilha de Auditoria */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
             <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-5 flex items-center gap-2">
               <Clock className="w-4 h-4" /> Histórico de Tramitação
             </h3>
             <div className="space-y-5 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-slate-100">
                
                {documento.justificativa?.split('\n').filter((j: string) => j.trim() !== '').map((linha: string, idx: number) => {
                  const isAprovacao = linha.includes('APROVAR');
                  return (
                    <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className={`flex items-center justify-center w-4 h-4 rounded-full border-2 border-white shadow-sm shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 ${isAprovacao ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                      <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                        <div className="text-[10px] text-slate-600 font-medium leading-relaxed">{linha}</div>
                      </div>
                    </div>
                  )
                })}

                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-4 h-4 rounded-full border-2 border-white bg-blue-500 shadow-sm shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10"></div>
                  <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-800 text-xs">Criação</span>
                      <time className="text-[9px] font-bold text-slate-400">{new Date(documento.created_at).toLocaleDateString('pt-BR')}</time>
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium">Submetido por {documento.elaborador}</div>
                  </div>
                </div>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}