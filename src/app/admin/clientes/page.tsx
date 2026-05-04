"use client";

import React, { useState } from "react";
import {
  Building2, Users, Plus, Search, X, CheckCircle2,
  AlertCircle, XCircle, Eye, MoreVertical, Sparkles,
  Calendar, Mail, Clock, Shield, ChevronRight,
  RefreshCw, Ban, BarChart3, Globe, Copy, Check,
  Zap, Crown, FlaskConical,
} from "lucide-react";

// ─── TIPOS ────────────────────────────────────────────────────────────────────

type PlanoCliente = "trial" | "mensal" | "anual" | "enterprise";
type StatusCliente = "ativo" | "trial" | "suspenso" | "cancelado";

interface ClienteAdmin {
  id: string;
  nome: string;
  cnpj: string;
  logoUrl?: string;
  plano: PlanoCliente;
  status: StatusCliente;
  trialEndsAt?: string;
  criadoEm: string;
  qtdUsuarios: number;
  qtdDocumentos: number;
  adminNome: string;
  adminEmail: string;
  modulosAtivos: string[];
}

interface NovoClienteForm {
  // Empresa
  nome: string;
  cnpj: string;
  plano: PlanoCliente;
  // Admin
  adminNome: string;
  adminEmail: string;
  adminCargo: string;
}

// ─── CONSTANTES ───────────────────────────────────────────────────────────────

const PLANO_CONFIG: Record<PlanoCliente, { label: string; cor: string; bg: string; border: string; icon: React.ReactNode }> = {
  trial:      { label: "Trial",      cor: "text-amber-700",   bg: "bg-amber-50",   border: "border-amber-200",   icon: <FlaskConical className="w-3.5 h-3.5" /> },
  mensal:     { label: "Mensal",     cor: "text-blue-700",    bg: "bg-blue-50",    border: "border-blue-200",    icon: <Zap className="w-3.5 h-3.5" /> },
  anual:      { label: "Anual",      cor: "text-violet-700",  bg: "bg-violet-50",  border: "border-violet-200",  icon: <Crown className="w-3.5 h-3.5" /> },
  enterprise: { label: "Enterprise", cor: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", icon: <Sparkles className="w-3.5 h-3.5" /> },
};

const STATUS_CONFIG: Record<StatusCliente, { label: string; cls: string; icon: React.ReactNode }> = {
  ativo:     { label: "Ativo",     cls: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="w-3 h-3" /> },
  trial:     { label: "Trial",     cls: "bg-amber-50 text-amber-700 border-amber-200",       icon: <Clock className="w-3 h-3" /> },
  suspenso:  { label: "Suspenso",  cls: "bg-red-50 text-red-700 border-red-200",             icon: <Ban className="w-3 h-3" /> },
  cancelado: { label: "Cancelado", cls: "bg-slate-100 text-slate-500 border-slate-200",      icon: <XCircle className="w-3 h-3" /> },
};

const MOCK_CLIENTES: ClienteAdmin[] = [
  {
    id: "c1", nome: "Hospital São Lucas", cnpj: "12.345.678/0001-00",
    plano: "anual", status: "ativo", criadoEm: "15/01/2026",
    qtdUsuarios: 28, qtdDocumentos: 142,
    adminNome: "Dra. Patricia Souza", adminEmail: "patricia@saolucas.com.br",
    modulosAtivos: ["Gestão de Documentos", "Ocorrências & Eventos", "Gestão de Riscos", "Gestão de Indicadores"],
  },
  {
    id: "c2", nome: "Clínica Bem-Estar", cnpj: "98.765.432/0001-11",
    plano: "trial", status: "trial", trialEndsAt: "11/05/2026", criadoEm: "11/04/2026",
    qtdUsuarios: 3, qtdDocumentos: 8,
    adminNome: "Dr. Carlos Melo", adminEmail: "carlos@clinicabemestar.com",
    modulosAtivos: ["Gestão de Documentos"],
  },
  {
    id: "c3", nome: "Hospital Regional Norte", cnpj: "55.123.456/0001-33",
    plano: "enterprise", status: "ativo", criadoEm: "03/04/2025",
    qtdUsuarios: 74, qtdDocumentos: 389,
    adminNome: "Roberto Andrade", adminEmail: "roberto@hrnorte.org.br",
    modulosAtivos: ["Gestão de Documentos", "Gestão de Processos", "Gestão de Riscos", "Ocorrências & Eventos", "Gestão de Registros", "Gestão de Indicadores", "Planej. Estratégico"],
  },
  {
    id: "c4", nome: "Santa Casa de Misericórdia", cnpj: "22.987.654/0001-55",
    plano: "mensal", status: "suspenso", criadoEm: "10/09/2025",
    qtdUsuarios: 15, qtdDocumentos: 67,
    adminNome: "Irmã Maria José", adminEmail: "admin@santacasa.org",
    modulosAtivos: ["Gestão de Documentos", "Ocorrências & Eventos"],
  },
  {
    id: "c5", nome: "UPA Centro", cnpj: "33.111.222/0001-77",
    plano: "mensal", status: "ativo", criadoEm: "20/02/2026",
    qtdUsuarios: 11, qtdDocumentos: 34,
    adminNome: "Enf. Fernanda Lima", adminEmail: "fernanda@upacentro.gov.br",
    modulosAtivos: ["Gestão de Documentos", "Ocorrências & Eventos", "Gestão de Indicadores"],
  },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const INPUT_CLS = "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-[#2655e8] focus:bg-white outline-none transition-colors";
const SELECT_CLS = "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-[#2655e8] outline-none transition-colors";

function diasRestantesTrialCor(trialEndsAt?: string): string {
  if (!trialEndsAt) return "";
  const [d, m, y] = trialEndsAt.split("/").map(Number);
  const diff = Math.ceil((new Date(y, m - 1, d).getTime() - Date.now()) / 86400000);
  if (diff <= 3) return "text-red-600 font-black";
  if (diff <= 7) return "text-amber-600 font-bold";
  return "text-slate-500";
}

function diasRestantes(trialEndsAt?: string): number | null {
  if (!trialEndsAt) return null;
  const [d, m, y] = trialEndsAt.split("/").map(Number);
  return Math.ceil((new Date(y, m - 1, d).getTime() - Date.now()) / 86400000);
}

function getIniciais(nome: string) {
  return nome.trim().split(" ").filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join("");
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

export default function AdminClientesPage() {
  const [clientes, setClientes] = useState<ClienteAdmin[]>(MOCK_CLIENTES);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<StatusCliente | "todos">("todos");
  const [aviso, setAviso] = useState<{ msg: string; tipo: "ok" | "erro" | "info" } | null>(null);

  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const [detalheId, setDetalheId] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const [form, setForm] = useState<NovoClienteForm>({
    nome: "", cnpj: "", plano: "trial",
    adminNome: "", adminEmail: "", adminCargo: "Analista da Qualidade",
  });

  function notificar(msg: string, tipo: "ok" | "erro" | "info" = "ok") {
    setAviso({ msg, tipo });
    setTimeout(() => setAviso(null), 4000);
  }

  // ── Stats ───────────────────────────────────────────────────────────────────

  const totalAtivos    = clientes.filter((c) => c.status === "ativo").length;
  const totalTrial     = clientes.filter((c) => c.status === "trial").length;
  const totalSuspensos = clientes.filter((c) => c.status === "suspenso").length;
  const totalUsuarios  = clientes.reduce((s, c) => s + c.qtdUsuarios, 0);

  // ── Criar cliente ────────────────────────────────────────────────────────────

  async function criarCliente() {
    if (!form.nome.trim() || !form.adminEmail.trim() || !form.adminNome.trim()) {
      notificar("Nome da empresa, nome e e-mail do admin são obrigatórios.", "erro");
      return;
    }

    setCarregando(true);
    try {
      const res = await fetch("/api/admin/empresa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empresa: { nome: form.nome, cnpj: form.cnpj, plano: form.plano },
          adminUser: { email: form.adminEmail, nome: form.adminNome, cargo: form.adminCargo },
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        notificar(json.error ?? "Erro ao criar cliente.", "erro");
        return;
      }

      // Adiciona ao mock local para visualização imediata
      const hoje = new Date().toLocaleDateString("pt-BR");
      const trial = new Date();
      trial.setDate(trial.getDate() + 30);

      const novo: ClienteAdmin = {
        id: json.empresaId ?? `c${Date.now()}`,
        nome: form.nome,
        cnpj: form.cnpj,
        plano: form.plano,
        status: form.plano === "trial" ? "trial" : "ativo",
        trialEndsAt: form.plano === "trial" ? trial.toLocaleDateString("pt-BR") : undefined,
        criadoEm: hoje,
        qtdUsuarios: 1,
        qtdDocumentos: 0,
        adminNome: form.adminNome,
        adminEmail: form.adminEmail,
        modulosAtivos: ["Gestão de Documentos"],
      };

      setClientes((prev) => [novo, ...prev]);
      setModalNovoAberto(false);
      setForm({ nome: "", cnpj: "", plano: "trial", adminNome: "", adminEmail: "", adminCargo: "Analista da Qualidade" });
      notificar(`Empresa "${form.nome}" criada. Convite enviado para ${form.adminEmail}.`);

    } catch {
      notificar("Erro de conexão com o servidor.", "erro");
    } finally {
      setCarregando(false);
    }
  }

  function toggleStatus(id: string) {
    setClientes((prev) => prev.map((c) => {
      if (c.id !== id) return c;
      const novoStatus: StatusCliente = c.status === "suspenso" ? "ativo" : "suspenso";
      notificar(`Cliente "${c.nome}" ${novoStatus === "suspenso" ? "suspenso" : "reativado"}.`, "info");
      return { ...c, status: novoStatus };
    }));
    setMenuId(null);
  }

  function copiarInvite(email: string) {
    const link = `${window.location.origin}/login?invite=${btoa(email)}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
      notificar("Link de convite copiado!", "info");
    });
    setMenuId(null);
  }

  // ── Filtros ──────────────────────────────────────────────────────────────────

  const listaFiltrada = clientes.filter((c) => {
    const matchBusca = c.nome.toLowerCase().includes(busca.toLowerCase()) ||
      c.cnpj.includes(busca) ||
      c.adminEmail.toLowerCase().includes(busca.toLowerCase());
    const matchStatus = filtroStatus === "todos" || c.status === filtroStatus;
    return matchBusca && matchStatus;
  });

  const detalhe = detalheId ? clientes.find((c) => c.id === detalheId) ?? null : null;

  // ─── RENDER ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-slate-50/50">

      {/* Toast */}
      {aviso && (
        <div className={`fixed right-6 top-6 z-50 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold shadow-lg transition-all ${
          aviso.tipo === "ok"   ? "bg-emerald-50 border-emerald-200 text-emerald-700" :
          aviso.tipo === "erro" ? "bg-red-50 border-red-200 text-red-700" :
                                  "bg-blue-50 border-blue-200 text-blue-700"
        }`}>
          {aviso.tipo === "ok"   ? <CheckCircle2 className="w-4 h-4" /> :
           aviso.tipo === "erro" ? <AlertCircle className="w-4 h-4" /> :
                                   <AlertCircle className="w-4 h-4" />}
          {aviso.msg}
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="w-6 h-6 bg-[#2655e8] rounded-md flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-xs font-black text-[#2655e8] uppercase tracking-widest">DocQualis Admin</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900">Gestão de Clientes</h1>
          <p className="text-sm text-slate-500 mt-0.5">Cadastre e gerencie todas as empresas que usam o DocQualis.</p>
        </div>
        <button
          onClick={() => setModalNovoAberto(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#2655e8] text-white rounded-xl text-sm font-bold shadow-md hover:bg-[#1e40af] transition-all"
        >
          <Plus className="w-4 h-4" /> Novo Cliente
        </button>
      </div>

      {/* Stats */}
      <div className="px-8 py-4 grid grid-cols-4 gap-4 shrink-0">
        {[
          { label: "Total de Clientes", value: clientes.length,  icon: <Building2 className="w-5 h-5" />, cor: "text-slate-600",   bg: "bg-slate-100" },
          { label: "Ativos",            value: totalAtivos,      icon: <CheckCircle2 className="w-5 h-5" />, cor: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Em Trial",          value: totalTrial,       icon: <FlaskConical className="w-5 h-5" />, cor: "text-amber-600",  bg: "bg-amber-50" },
          { label: "Total de Usuários", value: totalUsuarios,    icon: <Users className="w-5 h-5" />, cor: "text-blue-600",    bg: "bg-blue-50" },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-2xl px-5 py-4 flex items-center gap-4 shadow-sm">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.bg} ${s.cor}`}>{s.icon}</div>
            <div>
              <p className="text-2xl font-black text-slate-900">{s.value}</p>
              <p className="text-xs text-slate-500 font-medium">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="px-8 pb-3 shrink-0 flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar empresa, CNPJ ou e-mail..."
            className="pl-10 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:border-[#2655e8] w-full shadow-sm"
          />
        </div>
        <div className="flex gap-2">
          {(["todos", "ativo", "trial", "suspenso", "cancelado"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFiltroStatus(s)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all capitalize ${
                filtroStatus === s
                  ? "bg-[#2655e8] text-white shadow-sm"
                  : "bg-white border border-slate-200 text-slate-600 hover:border-[#2655e8] hover:text-[#2655e8]"
              }`}
            >
              {s === "todos" ? "Todos" : STATUS_CONFIG[s as StatusCliente].label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela */}
      <div className="flex-1 px-8 pb-8 overflow-hidden flex flex-col min-h-0">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex-1 flex flex-col">
          <div className="overflow-y-auto flex-1 custom-scrollbar">
            <table className="w-full text-sm text-left border-collapse whitespace-nowrap">
              <thead className="bg-white text-[10px] font-black uppercase text-slate-400 tracking-widest border-b sticky top-0 shadow-sm z-10">
                <tr>
                  <th className="px-6 py-4">Empresa</th>
                  <th className="px-6 py-4">Admin</th>
                  <th className="px-6 py-4 text-center">Plano</th>
                  <th className="px-6 py-4 text-center">Usuários</th>
                  <th className="px-6 py-4 text-center">Docs</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4">Início</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {listaFiltrada.map((c) => {
                  const plano = PLANO_CONFIG[c.plano];
                  const status = STATUS_CONFIG[c.status];
                  const dias = diasRestantes(c.trialEndsAt);

                  return (
                    <tr key={c.id} className="hover:bg-[#eef2ff]/20 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#2655e8] to-[#7c3aed] flex items-center justify-center text-white text-xs font-black shadow-sm shrink-0">
                            {getIniciais(c.nome)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{c.nome}</p>
                            <p className="text-xs text-slate-400 font-mono">{c.cnpj || "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-700 text-xs">{c.adminNome}</p>
                        <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3" /> {c.adminEmail}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${plano.bg} ${plano.border} ${plano.cor}`}>
                          {plano.icon} {plano.label}
                        </span>
                        {c.status === "trial" && dias !== null && (
                          <p className={`text-[10px] mt-0.5 ${diasRestantesTrialCor(c.trialEndsAt)}`}>
                            {dias > 0 ? `${dias} dias restantes` : "Expirado"}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center gap-1.5 text-sm font-black text-slate-700">
                          <Users className="w-3.5 h-3.5 text-slate-400" /> {c.qtdUsuarios}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-black text-slate-700">{c.qtdDocumentos}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${status.cls}`}>
                          {status.icon} {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Calendar className="w-3 h-3" /> {c.criadoEm}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setDetalheId(c.id)}
                            className="p-2 text-slate-400 hover:text-[#2655e8] hover:bg-[#eef2ff] rounded-lg transition-colors"
                            title="Ver detalhes"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <div className="relative">
                            <button
                              onClick={() => setMenuId(menuId === c.id ? null : c.id)}
                              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            {menuId === c.id && (
                              <div className="absolute right-0 top-9 w-52 bg-white border border-slate-200 rounded-xl shadow-lg z-20 overflow-hidden py-1">
                                <button
                                  onClick={() => { copiarInvite(c.adminEmail); }}
                                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                                >
                                  {copiado ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                                  Copiar link de convite
                                </button>
                                <button
                                  onClick={() => { setDetalheId(c.id); setMenuId(null); }}
                                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                                >
                                  <BarChart3 className="w-4 h-4" /> Ver módulos ativos
                                </button>
                                <div className="my-1 border-t border-slate-100" />
                                <button
                                  onClick={() => toggleStatus(c.id)}
                                  className={`flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-colors ${
                                    c.status === "suspenso"
                                      ? "text-emerald-600 hover:bg-emerald-50"
                                      : "text-red-600 hover:bg-red-50"
                                  }`}
                                >
                                  {c.status === "suspenso"
                                    ? <><RefreshCw className="w-4 h-4" /> Reativar acesso</>
                                    : <><Ban className="w-4 h-4" /> Suspender acesso</>
                                  }
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {listaFiltrada.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-16 text-center">
                      <Building2 className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                      <p className="text-sm text-slate-400 font-medium">Nenhum cliente encontrado.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Modal: Novo Cliente ────────────────────────────────────────────── */}
      {modalNovoAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900">Novo Cliente</h3>
                <p className="text-xs text-slate-500 mt-0.5">Cria a empresa e envia convite para o admin.</p>
              </div>
              <button onClick={() => setModalNovoAberto(false)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">

              {/* Dados da empresa */}
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Dados da Empresa</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Nome da Empresa *</label>
                    <input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} className={INPUT_CLS} placeholder="Hospital São Lucas" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">CNPJ</label>
                    <input value={form.cnpj} onChange={(e) => setForm((f) => ({ ...f, cnpj: e.target.value }))} className={INPUT_CLS} placeholder="00.000.000/0001-00" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Plano</label>
                    <div className="grid grid-cols-4 gap-2">
                      {(Object.keys(PLANO_CONFIG) as PlanoCliente[]).map((p) => {
                        const cfg = PLANO_CONFIG[p];
                        return (
                          <button
                            key={p}
                            onClick={() => setForm((f) => ({ ...f, plano: p }))}
                            className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 text-xs font-bold transition-all ${
                              form.plano === p
                                ? `${cfg.bg} ${cfg.border} ${cfg.cor}`
                                : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                            }`}
                          >
                            <span className={form.plano === p ? cfg.cor : "text-slate-400"}>{cfg.icon}</span>
                            {cfg.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Usuário admin */}
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Usuário Administrador</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Nome Completo *</label>
                    <input value={form.adminNome} onChange={(e) => setForm((f) => ({ ...f, adminNome: e.target.value }))} className={INPUT_CLS} placeholder="Dra. Patricia Souza" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">E-mail *</label>
                    <input type="email" value={form.adminEmail} onChange={(e) => setForm((f) => ({ ...f, adminEmail: e.target.value }))} className={INPUT_CLS} placeholder="admin@empresa.com.br" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Cargo</label>
                    <input value={form.adminCargo} onChange={(e) => setForm((f) => ({ ...f, adminCargo: e.target.value }))} className={INPUT_CLS} placeholder="Analista da Qualidade" />
                  </div>
                </div>
              </div>

              {/* Aviso sobre o que acontece */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-1.5">
                <p className="text-xs font-black text-blue-700 uppercase tracking-wider">O que acontece ao criar:</p>
                <ul className="text-xs text-blue-700 space-y-1 list-none">
                  {[
                    "✦ Empresa criada no banco com isolamento total de dados",
                    "✦ Usuário admin convidado via e-mail (link de acesso)",
                    "✦ Perfil ADMIN criado com acesso a todos os módulos",
                    "✦ Estrutura padrão de diretorias e setores gerada",
                    form.plano === "trial" ? "✦ Trial de 30 dias iniciado automaticamente" : "✦ Plano ativo imediatamente",
                  ].map((txt, i) => <li key={i}>{txt}</li>)}
                </ul>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
              <button onClick={() => setModalNovoAberto(false)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl">Cancelar</button>
              <button
                onClick={criarCliente}
                disabled={carregando}
                className="flex items-center gap-2 px-5 py-2 bg-[#2655e8] text-white text-sm font-bold rounded-xl hover:bg-[#1e40af] shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {carregando ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Criando...</>
                ) : (
                  <><ChevronRight className="w-4 h-4" /> Criar Cliente</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Slide-over: Detalhe do Cliente ───────────────────────────────────── */}
      {detalhe && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={() => setDetalheId(null)} />
          <div className="relative w-full max-w-lg bg-white shadow-2xl flex flex-col h-full overflow-hidden">

            {/* Header */}
            <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#2655e8] to-[#7c3aed] flex items-center justify-center text-white text-sm font-black shadow-md">
                  {getIniciais(detalhe.nome)}
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900">{detalhe.nome}</h2>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">{detalhe.cnpj || "CNPJ não informado"}</p>
                </div>
              </div>
              <button onClick={() => setDetalheId(null)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-5 space-y-6">

              {/* Status + Plano */}
              <div className="flex gap-3">
                <div className={`flex-1 flex items-center gap-2 px-4 py-3 rounded-xl border-2 ${STATUS_CONFIG[detalhe.status].cls}`}>
                  {STATUS_CONFIG[detalhe.status].icon}
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider">Status</p>
                    <p className="text-sm font-black">{STATUS_CONFIG[detalhe.status].label}</p>
                  </div>
                </div>
                <div className={`flex-1 flex items-center gap-2 px-4 py-3 rounded-xl border-2 ${PLANO_CONFIG[detalhe.plano].bg} ${PLANO_CONFIG[detalhe.plano].border} ${PLANO_CONFIG[detalhe.plano].cor}`}>
                  {PLANO_CONFIG[detalhe.plano].icon}
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider">Plano</p>
                    <p className="text-sm font-black">{PLANO_CONFIG[detalhe.plano].label}</p>
                  </div>
                </div>
              </div>

              {/* Trial warning */}
              {detalhe.status === "trial" && detalhe.trialEndsAt && (
                <div className={`p-3 rounded-xl border flex items-center gap-3 ${
                  (diasRestantes(detalhe.trialEndsAt) ?? 0) <= 3
                    ? "bg-red-50 border-red-200 text-red-700"
                    : "bg-amber-50 border-amber-200 text-amber-700"
                }`}>
                  <Clock className="w-4 h-4 shrink-0" />
                  <p className="text-xs font-bold">
                    Trial expira em {detalhe.trialEndsAt} · {diasRestantes(detalhe.trialEndsAt)} dias restantes
                  </p>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Usuários cadastrados", value: detalhe.qtdUsuarios, icon: <Users className="w-4 h-4" />, cor: "text-blue-600 bg-blue-50" },
                  { label: "Documentos criados", value: detalhe.qtdDocumentos, icon: <Globe className="w-4 h-4" />, cor: "text-violet-600 bg-violet-50" },
                ].map((s) => (
                  <div key={s.label} className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${s.cor}`}>{s.icon}</div>
                    <div>
                      <p className="text-xl font-black text-slate-900">{s.value}</p>
                      <p className="text-[10px] text-slate-500 font-medium">{s.label}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Admin */}
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Administrador</p>
                <div className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-[#2655e8] text-white flex items-center justify-center text-sm font-black shrink-0">
                    {getIniciais(detalhe.adminNome)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 text-sm">{detalhe.adminNome}</p>
                    <p className="text-xs text-slate-500 flex items-center gap-1"><Mail className="w-3 h-3" />{detalhe.adminEmail}</p>
                  </div>
                  <button
                    onClick={() => copiarInvite(detalhe.adminEmail)}
                    className="p-2 text-slate-400 hover:text-[#2655e8] hover:bg-[#eef2ff] rounded-lg transition-colors"
                    title="Copiar link de convite"
                  >
                    {copiado ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Módulos ativos */}
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Módulos Ativos</p>
                <div className="flex flex-wrap gap-2">
                  {detalhe.modulosAtivos.map((m) => (
                    <span key={m} className="px-3 py-1.5 bg-[#eef2ff] border border-[#c7d2fe] text-[#2655e8] text-xs font-bold rounded-lg">
                      {m}
                    </span>
                  ))}
                </div>
              </div>

              {/* Datas */}
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Informações</p>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-xs text-slate-500">Cliente desde</span>
                    <span className="text-xs font-bold text-slate-700">{detalhe.criadoEm}</span>
                  </div>
                  {detalhe.trialEndsAt && (
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-xs text-slate-500">Trial expira em</span>
                      <span className="text-xs font-bold text-slate-700">{detalhe.trialEndsAt}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center py-2">
                    <span className="text-xs text-slate-500">ID do tenant</span>
                    <span className="text-xs font-mono text-slate-400">{detalhe.id}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
              <button
                onClick={() => toggleStatus(detalhe.id)}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                  detalhe.status === "suspenso"
                    ? "bg-emerald-500 text-white hover:bg-emerald-600"
                    : "bg-white border border-red-200 text-red-600 hover:bg-red-50"
                }`}
              >
                {detalhe.status === "suspenso"
                  ? <><RefreshCw className="w-4 h-4" /> Reativar Acesso</>
                  : <><Ban className="w-4 h-4" /> Suspender Acesso</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overlay para fechar menus */}
      {menuId && <div className="fixed inset-0 z-10" onClick={() => setMenuId(null)} />}
    </div>
  );
}
