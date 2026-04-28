"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, UploadCloud, Send, AlertCircle, CheckCircle2,
  Users, CalendarClock, Plus, Trash2, FileText, Megaphone, Loader2, Save
} from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function NovoDocumentoPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(1);

  // ✅ Sessão real
  const [empresaId, setEmpresaId]     = useState<string | null>(null);
  const [nomeUsuario, setNomeUsuario] = useState("Usuário");
  const [emailUsuario, setEmailUsuario] = useState("");

  const [dbTipos, setDbTipos]           = useState<any[]>([]);
  const [dbDiretorias, setDbDiretorias] = useState<any[]>([]);
  const [dbSetores, setDbSetores]       = useState<any[]>([]);
  const [dbUsuarios, setDbUsuarios]     = useState<any[]>([]); // ✅ Usuários reais
  const [isCarregandoConfigs, setIsCarregandoConfigs] = useState(true);

  const [tipoDocumento, setTipoDocumento]   = useState("");
  const [diretoria, setDiretoria]           = useState("");
  const [setor, setSetor]                   = useState("");
  const [numeroDoc, setNumeroDoc]           = useState("");
  const [titulo, setTitulo]                 = useState("");
  const [versao, setVersao]                 = useState(1);
  const [file, setFile]                     = useState<File | null>(null);

  const [verificadoresSelecionados, setVerificadoresSelecionados] = useState<any[]>([]);
  const [verificadorAtual, setVerificadorAtual]     = useState("");
  const [prazoVerificadorAtual, setPrazoVerificadorAtual] = useState("");
  const [homologador, setHomologador]       = useState("");

  const [dtElaboracao, setDtElaboracao]     = useState(new Date().toISOString().split("T")[0]);
  const [dtVencimento, setDtVencimento]     = useState("");
  const [dtAlerta, setDtAlerta]             = useState("");
  const [justificativaCriacao, setJustificativaCriacao] = useState("");

  const [alvosDivulgacao, setAlvosDivulgacao] = useState<string[]>([]);
  const [exigeCiente, setExigeCiente]       = useState(false);

  const [isLoading, setIsLoading]   = useState(false);
  const [erro, setErro]             = useState<string | null>(null);
  const [sucesso, setSucesso]       = useState(false);

  /* ── SESSÃO E CONFIGS ─────────────────────────────────── */
  useEffect(() => {
    const init = async () => {
      setIsCarregandoConfigs(true);

      // Sessão do usuário
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      setEmailUsuario(session.user.email ?? "");

      const { data: perfil } = await supabase
        .from("perfis")
        .select("empresa_id, nome")
        .eq("id", session.user.id)
        .single();

      if (!perfil?.empresa_id) return;
      setEmpresaId(perfil.empresa_id);
      setNomeUsuario(perfil.nome ?? "Usuário");

      // Configs da empresa (✅ filtradas por empresa_id)
      const [resTipos, resDir, resSetores, resUsuarios] = await Promise.all([
        supabase.from("config_tipos_doc").select("*").eq("empresa_id", perfil.empresa_id).order("nome"),
        supabase.from("config_diretorias").select("*").eq("empresa_id", perfil.empresa_id).order("nome"),
        supabase.from("config_setores").select("*").eq("empresa_id", perfil.empresa_id).order("nome"),
        supabase.from("perfis").select("nome, cargo, setor").eq("empresa_id", perfil.empresa_id).order("nome"),
      ]);

      if (resTipos.data)   setDbTipos(resTipos.data);
      if (resDir.data)     setDbDiretorias(resDir.data);
      if (resSetores.data) setDbSetores(resSetores.data);
      if (resUsuarios.data) setDbUsuarios(resUsuarios.data);

      setIsCarregandoConfigs(false);
    };
    init();
  }, [router]);

  // Resetar setor ao mudar diretoria
  useEffect(() => { setSetor(""); }, [diretoria]);

  // Alerta automático 60 dias antes do vencimento
  useEffect(() => {
    if (dtVencimento) {
      const v = new Date(dtVencimento);
      v.setDate(v.getDate() - 60);
      setDtAlerta(v.toISOString().split("T")[0]);
    } else {
      setDtAlerta("");
    }
  }, [dtVencimento]);

  /* ── DERIVADOS ────────────────────────────────────────── */
  const diretoriaObj      = dbDiretorias.find((d) => d.nome === diretoria);
  const setoresFiltrados  = diretoriaObj ? dbSetores.filter((s) => s.diretoria_id === diretoriaObj.id) : [];
  const siglaTipo         = dbTipos.find((t) => t.nome === tipoDocumento)?.sigla ?? "XXX";
  const siglaSetor        = dbSetores.find((s) => s.nome === setor)?.sigla ?? "XXX";
  const prefixoCodigo     = tipoDocumento && setor ? `${siglaTipo}.${siglaSetor}` : "XXX.XXX";
  const codigoFinal       = numeroDoc ? `${prefixoCodigo}.${String(numeroDoc).padStart(3, "0")}` : prefixoCodigo;

  /* ── HANDLERS ─────────────────────────────────────────── */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 100 * 1024 * 1024) { setErro("Arquivo muito pesado (Máximo 100MB)."); return; }
    setFile(f); setErro(null);
  };

  const verificarDuplicidade = useCallback(async () => {
    if (!numeroDoc || prefixoCodigo === "XXX.XXX") return false;
    const { data } = await supabase
      .from("documentos")
      .select("status, versao")
      .eq("codigo", codigoFinal)
      .eq("versao", versao)
      .eq("empresa_id", empresaId!)
      .maybeSingle();
    if (data) {
      setErro(`O documento ${codigoFinal} Rev.${versao} já existe (Status: ${data.status}). Altere a versão ou número.`);
      return true;
    }
    return false;
  }, [codigoFinal, versao, numeroDoc, prefixoCodigo, empresaId]);

  const uploadArquivo = async (sufixo: string): Promise<string> => {
    if (!file) return "";
    const ext      = file.name.split(".").pop();
    const filePath = `documentos/${Date.now()}-${sufixo}.${ext}`;
    await supabase.storage.from("documentos-oficiais").upload(filePath, file);
    const { data } = supabase.storage.from("documentos-oficiais").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const montar = (status: string, publicUrl: string) => ({
    empresa_id:          empresaId!,
    codigo:              codigoFinal,
    titulo,
    versao:              Number(versao),
    tipo_documento:      tipoDocumento,
    diretoria,
    setor,
    dt_elaboracao:       dtElaboracao || null,
    dt_vencimento:       dtVencimento || null,
    dt_alerta:           dtAlerta || null,
    justificativa:       justificativaCriacao,
    verificador_pendente: verificadoresSelecionados.map((v) => `${v.nome} (Até ${v.prazo})`).join("; "),
    aprovador:           homologador,
    confidencialidade:   "Público",
    alvo_divulgacao:     alvosDivulgacao.join(", "),
    exige_ciente:        exigeCiente,
    status,
    arquivo_url:         publicUrl,
    elaborador:          nomeUsuario, // ✅ Nome real do usuário logado
  });

  const handleSalvarRascunho = async () => {
    setErro(null);
    if (!titulo) { setErro("Para salvar rascunho, preencha o Título do Documento."); return; }
    setIsLoading(true);
    if (await verificarDuplicidade()) { setIsLoading(false); return; }
    try {
      const url = await uploadArquivo("rascunho");
      const { error } = await supabase.from("documentos").insert(montar("Em Elaboração", url));
      if (error) throw error;
      setSucesso(true);
      setTimeout(() => router.push("/documentos"), 1500);
    } catch (e: any) { setErro(e.message); }
    finally { setIsLoading(false); }
  };

  const handleSubmit = async () => {
    setErro(null);
    if (!tipoDocumento || !setor || !numeroDoc || !titulo || !dtVencimento || !homologador) {
      setErro("Existem campos obrigatórios não preenchidos. Verifique os asteriscos vermelhos."); return;
    }
    if (!file) { setErro("Anexe o documento original em formato PDF ou DOCX."); return; }
    setIsLoading(true);
    if (await verificarDuplicidade()) { setIsLoading(false); return; }
    try {
      const url = await uploadArquivo("final");
      const { error } = await supabase.from("documentos").insert(montar("Em Verificação", url));
      if (error) throw error;
      setSucesso(true);
      setTimeout(() => router.push("/documentos"), 1500);
    } catch (e: any) { setErro(e.message); }
    finally { setIsLoading(false); }
  };

  /* ── LOADING STATE ────────────────────────────────────── */
  if (isCarregandoConfigs) {
    return (
      <div className="h-full flex flex-col items-center justify-center font-bold text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <p>Sincronizando com a Matriz Organizacional...</p>
      </div>
    );
  }

  /* ── RENDER ───────────────────────────────────────────── */
  return (
    <div className="max-w-5xl mx-auto p-6 animate-in fade-in duration-500">

      <div className="flex items-center gap-4 mb-8">
        <Link href="/documentos" className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 shadow-sm transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Elaborar Novo Documento</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Fluxo de auditoria e tramitação documental.</p>
        </div>
      </div>

      {(erro || sucesso) && (
        <div className={`mb-6 p-4 rounded-xl border flex items-center gap-3 text-sm font-semibold animate-in slide-in-from-top-4 ${erro ? "bg-red-50 border-red-200 text-red-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"}`}>
          {erro ? <AlertCircle className="w-5 h-5 shrink-0" /> : <CheckCircle2 className="w-5 h-5 shrink-0" />}
          {erro || "Salvo com sucesso! Redirecionando..."}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[600px]">

        <div className="flex border-b border-slate-100 bg-slate-50 overflow-x-auto">
          <TabButton active={activeTab === 1} onClick={() => setActiveTab(1)} step="1" icon={<FileText className="w-4 h-4" />}       title="Identificação" />
          <TabButton active={activeTab === 2} onClick={() => setActiveTab(2)} step="2" icon={<Users className="w-4 h-4" />}          title="Validação" />
          <TabButton active={activeTab === 3} onClick={() => setActiveTab(3)} step="3" icon={<CalendarClock className="w-4 h-4" />}  title="Prazos" />
          <TabButton active={activeTab === 4} onClick={() => setActiveTab(4)} step="4" icon={<Megaphone className="w-4 h-4" />}      title="Divulgação" />
        </div>

        <div className="p-8 flex-1">

          {/* ABA 1: IDENTIFICAÇÃO */}
          {activeTab === 1 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <SelectField label="Tipo de Documento" required value={tipoDocumento} onChange={setTipoDocumento} options={dbTipos.map((t) => t.nome)} />
                <SelectField label="Diretoria" required value={diretoria} onChange={setDiretoria} options={dbDiretorias.map((d) => d.nome)} />
                <SelectField label="Setor / Unidade" required value={setor} onChange={setSetor} options={setoresFiltrados.map((s) => s.nome)} disabled={!diretoria || setoresFiltrados.length === 0} placeholderText={!diretoria ? "Selecione uma Diretoria" : "Selecione o Setor..."} />
              </div>

              <div className="p-6 bg-slate-50 border border-slate-100 rounded-xl grid grid-cols-1 md:grid-cols-12 gap-4 items-end shadow-inner">
                <div className="col-span-1 md:col-span-3">
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Código Base (Auto)</label>
                  <div className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-mono font-bold text-slate-500">{prefixoCodigo}</div>
                </div>
                <div className="col-span-1 md:col-span-3">
                  <InputField label="Número (Ex: 001)" required type="number" value={numeroDoc} onChange={setNumeroDoc} placeholder="001" />
                </div>
                <div className="col-span-1 md:col-span-2">
                  <InputField label="Versão" required type="number" value={versao} onChange={(v: any) => setVersao(Number(v))} placeholder="1" />
                </div>
                <div className="col-span-1 md:col-span-4">
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Código Oficial</label>
                  <div className="w-full px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-lg flex items-center shadow-sm">
                    <span className="text-sm font-mono font-bold text-blue-900 tracking-wider">{codigoFinal}</span>
                  </div>
                </div>
              </div>

              <InputField label="Título do Documento" required type="text" value={titulo} onChange={setTitulo} placeholder="Ex: Protocolo de Higienização das Mãos" />

              <div className="border-t border-slate-100 pt-6">
                <input type="file" id="file-upload" className="hidden" accept=".pdf,.docx" onChange={handleFileChange} />
                <label htmlFor="file-upload" className="w-full border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-all bg-slate-50">
                  <div className="p-3 bg-white rounded-full shadow-sm mb-3">
                    <UploadCloud className="w-6 h-6 text-blue-600" />
                  </div>
                  <p className="text-sm font-bold text-slate-700">{file ? file.name : "Clique para Anexar o Documento Oficial"}</p>
                  <p className="text-xs text-slate-400 mt-1">Formatos suportados: PDF ou DOCX (Max: 100MB) <span className="text-red-500 font-bold">*</span></p>
                </label>
              </div>
            </div>
          )}

          {/* ABA 2: VALIDAÇÃO */}
          {activeTab === 2 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
                  <Users className="w-4 h-4 text-blue-500" /> Selecione Revisores / Verificadores
                </h3>
                <div className="flex flex-col md:flex-row gap-3 items-end mb-4">
                  <div className="flex-1">
                    {/* ✅ Usuários reais do banco */}
                    <SelectField label="Membro da Equipe" value={verificadorAtual} onChange={setVerificadorAtual} options={dbUsuarios.map((u) => u.nome)} />
                  </div>
                  <div className="w-full md:w-48">
                    <InputField label="Prazo" type="date" value={prazoVerificadorAtual} onChange={setPrazoVerificadorAtual} />
                  </div>
                  <button
                    onClick={() => {
                      const u = dbUsuarios.find((x) => x.nome === verificadorAtual);
                      if (u && prazoVerificadorAtual && !verificadoresSelecionados.find((v) => v.nome === u.nome)) {
                        setVerificadoresSelecionados([...verificadoresSelecionados, { ...u, prazo: prazoVerificadorAtual }]);
                      }
                    }}
                    className="w-full md:w-auto px-5 py-2.5 bg-slate-100 text-slate-700 hover:bg-blue-100 hover:text-blue-700 transition-colors font-bold rounded-lg text-sm flex items-center justify-center gap-2 h-[42px]"
                  >
                    <Plus className="w-4 h-4" /> Adicionar
                  </button>
                </div>

                {verificadoresSelecionados.length > 0 && (
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-100 border-b border-slate-200 text-[10px] uppercase font-black text-slate-600 tracking-widest">
                        <tr><th className="p-4">Nome</th><th className="p-4">Cargo/Setor</th><th className="p-4">Prazo</th><th className="p-4 text-right">Remover</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {verificadoresSelecionados.map((v, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="p-4 font-bold text-slate-800">{v.nome}</td>
                            <td className="p-4 text-slate-500">{v.cargo || v.setor || "-"}</td>
                            <td className="p-4 text-slate-700 font-semibold">{v.prazo}</td>
                            <td className="p-4 text-right">
                              <button onClick={() => setVerificadoresSelecionados(verificadoresSelecionados.filter((x) => x.nome !== v.nome))} className="text-red-400 hover:text-red-600 p-1">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="pt-6 border-t border-slate-100 w-full md:w-1/2">
                <SelectField label="Homologador Final" required value={homologador} onChange={setHomologador} options={["Comitê da Qualidade", "Diretoria Executiva"]} />
              </div>
            </div>
          )}

          {/* ABA 3: PRAZOS */}
          {activeTab === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-6 rounded-xl border border-slate-200 shadow-inner">
                <InputField label="Data de Elaboração" required type="date" value={dtElaboracao} onChange={setDtElaboracao} />
                <InputField label="Vencimento do Documento" required type="date" value={dtVencimento} onChange={setDtVencimento} />
                <div className="flex flex-col">
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-1.5">Alerta de Revisão (Auto)</label>
                  <div className="w-full px-4 py-2.5 bg-amber-50 text-amber-700 rounded-lg font-bold border border-amber-200 flex items-center">
                    {dtAlerta || "Aguardando Vencimento..."}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Justificativa de Criação / Revisão</label>
                <textarea rows={4} value={justificativaCriacao} onChange={(e) => setJustificativaCriacao(e.target.value)} placeholder="Indique o motivo ou o que mudou nesta revisão..."
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 resize-none shadow-sm" />
              </div>
            </div>
          )}

          {/* ABA 4: DIVULGAÇÃO */}
          {activeTab === 4 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-4">Público Alvo da Divulgação</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {["Apenas o Setor de Origem", "Todo o Corpo Clínico", "Toda a Liderança", "Área Administrativa", "Comitê da Qualidade"].map((alvo) => (
                      <label key={alvo} className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-all ${alvosDivulgacao.includes(alvo) ? "bg-blue-50 border-blue-300" : "bg-white border-slate-200 hover:border-blue-200"}`}>
                        <input type="checkbox" checked={alvosDivulgacao.includes(alvo)} onChange={() => setAlvosDivulgacao((prev) => prev.includes(alvo) ? prev.filter((x) => x !== alvo) : [...prev, alvo])} className="w-4 h-4 accent-blue-600" />
                        <span className="text-sm font-bold text-slate-700">{alvo}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-100">
                  <label className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                    <input type="checkbox" checked={exigeCiente} onChange={() => setExigeCiente(!exigeCiente)} className="w-5 h-5 accent-blue-600" />
                    <div>
                      <span className="block text-sm font-bold text-slate-800">Exigir Assinatura Eletrônica de Treinamento</span>
                      <span className="block text-xs font-medium text-slate-500 mt-0.5">Os colaboradores notificados deverão marcar "Li e Compreendi" no sistema.</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* FOOTER */}
        <div className="p-6 bg-slate-50 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex gap-3 w-full md:w-auto">
            <button disabled={activeTab === 1} onClick={() => setActiveTab(activeTab - 1)} className="px-5 py-2.5 bg-white border border-slate-300 text-slate-600 font-bold rounded-lg text-sm shadow-sm hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
              Voltar
            </button>
            <button onClick={handleSalvarRascunho} disabled={isLoading} className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-slate-300 text-slate-700 font-bold rounded-lg text-sm shadow-sm hover:bg-slate-100 transition-all">
              <Save className="w-4 h-4 text-slate-500" /> Salvar como Rascunho
            </button>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            {activeTab < 4 ? (
              <button onClick={() => setActiveTab(activeTab + 1)} className="w-full md:w-auto px-6 py-2.5 bg-slate-800 text-white font-bold rounded-lg text-sm hover:bg-slate-900 shadow-md transition-colors">
                Próxima Etapa
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={isLoading} className="w-full md:w-auto px-8 py-2.5 bg-blue-600 text-white font-bold rounded-lg text-sm shadow-lg hover:bg-blue-700 flex items-center justify-center gap-2 transition-all disabled:opacity-70">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {isLoading ? "Processando..." : "Finalizar e Protocolar"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── COMPONENTES AUXILIARES ───────────────────────────── */
function TabButton({ active, onClick, step, icon, title }: any) {
  return (
    <button onClick={onClick} className={`flex-1 flex items-center justify-center gap-3 p-5 transition-all border-b-2 font-bold text-sm outline-none ${active ? "bg-white border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-700"}`}>
      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] transition-colors ${active ? "bg-blue-600 text-white shadow-md shadow-blue-200" : "bg-slate-200 text-slate-500"}`}>{step}</span>
      <div className="flex items-center gap-2"><span className={active ? "text-blue-600" : "text-slate-400"}>{icon}</span><span className="hidden md:inline">{title}</span></div>
    </button>
  );
}

function InputField({ label, type, value, onChange, placeholder, required }: any) {
  return (
    <div className="w-full">
      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 flex items-center gap-1">
        {label} {required && <span className="text-red-500 text-sm leading-none">*</span>}
      </label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-bold shadow-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" />
    </div>
  );
}

function SelectField({ label, options, value, onChange, disabled = false, placeholderText, required }: any) {
  return (
    <div className="w-full">
      <label className={`block text-[10px] font-black uppercase mb-1.5 flex items-center gap-1 ${disabled ? "text-slate-300" : "text-slate-400"}`}>
        {label} {required && <span className="text-red-500 text-sm leading-none">*</span>}
      </label>
      <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}
        className={`w-full px-4 py-2.5 border rounded-lg text-sm font-bold outline-none transition-all shadow-sm ${disabled ? "bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed" : "bg-white border-slate-200 text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer"}`}>
        <option value="">{placeholderText || "Selecione uma opção..."}</option>
        {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  );
}
