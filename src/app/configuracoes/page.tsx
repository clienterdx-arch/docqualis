"use client";

import React, { useEffect, useState } from "react";
import {
  User, Building2, UserCircle, Users, ShieldAlert, CreditCard,
  Lock, History, Search, Plus, MoreVertical,
  CheckCircle2, XCircle, Filter, Download,
  KeyRound, Mail, Save, Globe, Smartphone,
  CheckSquare, Square, Settings, Copy, Layers
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { salvarPinAssinatura } from "@/lib/assinatura";
import { carregarPerfilUsuario } from "@/lib/perfil";

// ─── DADOS INICIAIS E CONFIGURAÇÕES GLOBAIS ─────────────────────────────────

const EMPTY_USERS: Array<{ id: string; name: string; email: string; role: string; department: string; status: string; lastLogin: string }> = [];

const EMPTY_DEPTS: Array<{ id: string; code: string; name: string; manager: string; headcount: number; status: string }> = [];

const EMPTY_LOGS: Array<{ id: string; timestamp: string; user: string; action: string; module: string; ip: string }> = [];

const MODULES_MATRIX = [
  "Gestão de Documentos",
  "Gestão de Processos",
  "Gestão de Registros",
  "Gestão de Indicadores",
  "Configurações Globais",
];

const ROLES_LIST = [
  "Administrador Global",
  "Gestor da Qualidade",
  "Revisor",
  "Aprovador Final",
  "Auditor Externo",
  "Operacional",
];

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

// ─── COMPONENTE PRINCIPAL ────────────────────────────────────────────────────
export default function ConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState("profile");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeRole, setActiveRole] = useState("Administrador Global");
  const [notice, setNotice] = useState<string | null>(null);
  const [perfilUsuario, setPerfilUsuario] = useState({
    nome: "Usuário",
    email: "",
    cargo: "",
    setor: "",
    perfilAcesso: "Perfil não informado",
  });
  const [pinAssinaturaConfigurado, setPinAssinaturaConfigurado] = useState(false);
  const [senhaAtualAssinatura, setSenhaAtualAssinatura] = useState("");
  const [novoPinAssinatura, setNovoPinAssinatura] = useState("");
  const [confirmacaoPinAssinatura, setConfirmacaoPinAssinatura] = useState("");
  const [salvandoPinAssinatura, setSalvandoPinAssinatura] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmacaoNovaSenha, setConfirmacaoNovaSenha] = useState("");
  const [salvandoSenha, setSalvandoSenha] = useState(false);
  const [enviandoResetSenha, setEnviandoResetSenha] = useState(false);

  function notify(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 3000);
  }

  useEffect(() => {
    async function carregarConta() {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      setPinAssinaturaConfigurado(Boolean(session?.user.user_metadata?.assinatura_pin_hash));

      const perfil = await carregarPerfilUsuario<{
        nome?: string | null;
        cargo?: string | null;
        setor?: string | null;
        perfil_acesso?: string | null;
      }>(session, "nome, cargo, setor, perfil_acesso");

      setPerfilUsuario({
        nome: perfil?.nome ?? session?.user.user_metadata?.name ?? session?.user.email?.split("@")[0] ?? "Usuário",
        email: session?.user.email ?? "",
        cargo: perfil?.cargo ?? "",
        setor: perfil?.setor ?? "",
        perfilAcesso: perfil?.perfil_acesso ?? "Perfil não informado",
      });
    }

    carregarConta();
  }, []);

  async function handleSalvarPinAssinatura() {
    if (novoPinAssinatura.length < 4) {
      notify("Use um PIN de assinatura com no mínimo 4 caracteres.");
      return;
    }

    if (novoPinAssinatura !== confirmacaoPinAssinatura) {
      notify("A confirmação do PIN não confere.");
      return;
    }

    if (!senhaAtualAssinatura) {
      notify("Informe sua senha atual para alterar o PIN.");
      return;
    }

    setSalvandoPinAssinatura(true);
    const result = await salvarPinAssinatura(novoPinAssinatura, senhaAtualAssinatura);
    setSalvandoPinAssinatura(false);

    if (!result.ok) {
      notify(result.message);
      return;
    }

    setSenhaAtualAssinatura("");
    setNovoPinAssinatura("");
    setConfirmacaoPinAssinatura("");
    setPinAssinaturaConfigurado(true);
      notify("PIN de assinatura atualizado.");
  }

  async function handleRedefinirSenha() {
    if (!senhaAtual) {
      notify("Informe sua senha atual.");
      return;
    }

    if (novaSenha.length < 6) {
      notify("A nova senha deve ter no minimo 6 caracteres.");
      return;
    }

    if (novaSenha !== confirmacaoNovaSenha) {
      notify("A confirmacao da nova senha nao confere.");
      return;
    }

    setSalvandoSenha(true);
    const { data } = await supabase.auth.getSession();
    const email = data.session?.user.email ?? perfilUsuario.email;

    if (!email) {
      setSalvandoSenha(false);
      notify("Nao foi possivel identificar o e-mail da conta.");
      return;
    }

    const login = await supabase.auth.signInWithPassword({ email, password: senhaAtual });
    if (login.error) {
      setSalvandoSenha(false);
      notify("Senha atual incorreta.");
      return;
    }

    const update = await supabase.auth.updateUser({ password: novaSenha });
    setSalvandoSenha(false);

    if (update.error) {
      notify("Nao foi possivel redefinir a senha.");
      return;
    }

    setSenhaAtual("");
    setNovaSenha("");
    setConfirmacaoNovaSenha("");
    notify("Senha redefinida com sucesso.");
  }

  async function handleEnviarRecuperacaoSenha() {
    const email = perfilUsuario.email.trim();
    if (!email) {
      notify("Nao foi possivel identificar o e-mail da conta.");
      return;
    }

    setEnviandoResetSenha(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login?reset=1`,
    });
    setEnviandoResetSenha(false);

    if (error) {
      notify("Nao foi possivel enviar o e-mail de recuperacao.");
      return;
    }

    notify("Enviamos um link de recuperacao para seu e-mail.");
  }

  // ─── RENDERIZADORES DE ABAS ───────────────────────────────────────────────

  const renderProfile = () => (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 max-w-4xl animate-in fade-in">
      <h2 className="text-xl font-bold text-slate-800 mb-6">Meu Perfil Público</h2>
      <div className="flex items-center gap-6 mb-8 border-b border-slate-100 pb-8">
        <div className="w-24 h-24 bg-[#2655e8] rounded-full flex items-center justify-center text-3xl font-bold text-white shadow-md">
          {getInitials(perfilUsuario.nome) || "US"}
        </div>
        <div>
          <h3 className="font-bold text-lg text-slate-900">{perfilUsuario.nome}</h3>
          <p className="text-sm text-slate-500 mb-3">{perfilUsuario.perfilAcesso} • {perfilUsuario.setor || "Setor não informado"}</p>
          <button onClick={() => notify("Upload de foto preparado para integração com armazenamento.")} className="px-4 py-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 text-sm font-semibold rounded-xl transition-colors">
            Alterar Foto
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nome Completo</label>
          <input type="text" value={perfilUsuario.nome} readOnly className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-600 cursor-not-allowed" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">E-mail (Login)</label>
          <input type="email" value={perfilUsuario.email} readOnly className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-600 cursor-not-allowed" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Telefone / WhatsApp</label>
          <input type="text" placeholder="Informe o telefone" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-[#2655e8] outline-none transition-colors" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Cargo Específico</label>
          <input type="text" value={perfilUsuario.cargo} placeholder="Cargo não informado" readOnly className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed" />
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 mb-8">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-blue-100 text-[#2655e8] flex items-center justify-center shadow-sm">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">PIN de assinatura eletrônica</h3>
              <p className="text-xs text-slate-500 mt-0.5">Usado para aprovar, devolver e registrar atos críticos.</p>
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${pinAssinaturaConfigurado ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
            {pinAssinaturaConfigurado ? "Configurado" : "Pendente"}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Senha atual</label>
            <input type="password" value={senhaAtualAssinatura} onChange={(event) => setSenhaAtualAssinatura(event.target.value)} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-[#2655e8]" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Novo PIN</label>
            <input type="password" value={novoPinAssinatura} onChange={(event) => setNovoPinAssinatura(event.target.value)} inputMode="numeric" autoComplete="new-password" className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-[#2655e8] tracking-[0.25em]" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Confirmar PIN</label>
            <input type="password" value={confirmacaoPinAssinatura} onChange={(event) => setConfirmacaoPinAssinatura(event.target.value)} inputMode="numeric" autoComplete="new-password" className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-[#2655e8] tracking-[0.25em]" />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button type="button" onClick={handleSalvarPinAssinatura} disabled={salvandoPinAssinatura} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-slate-800 disabled:opacity-50">
            {salvandoPinAssinatura ? "Salvando..." : "Salvar PIN de assinatura"}
          </button>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={() => notify("Perfil atualizado localmente. Integração com banco pendente.")} className="bg-[#2655e8] hover:bg-[#1e40af] text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all flex items-center gap-2">
          <Save className="w-4 h-4" /> Atualizar Perfil
        </button>
      </div>
    </div>
  );

  const renderPasswordResetTab = () => (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 max-w-3xl animate-in fade-in">
      <div className="flex items-start gap-4 border-b border-slate-100 pb-6">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#2655e8]">
          <KeyRound className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Redefinir senha</h2>
          <p className="mt-1 text-sm text-slate-500">Atualize a senha da sua conta de acesso ao sistema.</p>
        </div>
      </div>

      <div className="mt-6 grid gap-5">
        <label>
          <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Senha atual</span>
          <input
            type="password"
            value={senhaAtual}
            onChange={(event) => setSenhaAtual(event.target.value)}
            autoComplete="current-password"
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#2655e8] focus:bg-white"
          />
        </label>

        <label>
          <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nova senha</span>
          <input
            type="password"
            value={novaSenha}
            onChange={(event) => setNovaSenha(event.target.value)}
            autoComplete="new-password"
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#2655e8] focus:bg-white"
          />
        </label>

        <label>
          <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Confirmar nova senha</span>
          <input
            type="password"
            value={confirmacaoNovaSenha}
            onChange={(event) => setConfirmacaoNovaSenha(event.target.value)}
            autoComplete="new-password"
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#2655e8] focus:bg-white"
          />
        </label>
      </div>

      <div className="mt-7 flex justify-end">
        <button
          type="button"
          onClick={handleRedefinirSenha}
          disabled={salvandoSenha}
          className="inline-flex items-center gap-2 rounded-xl bg-[#2655e8] px-6 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#1e40af] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <KeyRound className="h-4 w-4" />
          {salvandoSenha ? "Redefinindo..." : "Redefinir senha"}
        </button>
      </div>

      <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <h3 className="text-sm font-bold text-amber-900">Esqueci minha senha atual</h3>
        <p className="mt-1 text-sm leading-6 text-amber-800">
          Envie um link de recuperacao para o e-mail cadastrado e cadastre uma nova senha sem precisar informar a senha atual.
        </p>
        <button
          type="button"
          onClick={handleEnviarRecuperacaoSenha}
          disabled={enviandoResetSenha || !perfilUsuario.email}
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-white px-4 py-2.5 text-sm font-bold text-amber-800 shadow-sm transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Mail className="h-4 w-4" />
          {enviandoResetSenha ? "Enviando..." : "Enviar link de recuperacao"}
        </button>
      </div>
    </div>
  );

  const renderUsersTab = () => {
    const filtered = EMPTY_USERS.filter(
      (u) =>
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div className="flex flex-col h-full animate-in fade-in">
        <div className="flex justify-between items-center mb-6 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Gestão de Usuários</h2>
            <p className="text-sm text-slate-500">Cadastre e gerencie os acessos, credenciais e status da sua equipe.</p>
          </div>
          <button onClick={() => notify("Cadastro de usuário preparado para a próxima etapa.")} className="px-4 py-2.5 bg-[#2655e8] text-white rounded-xl text-sm font-bold shadow-md hover:bg-[#1e40af] transition-all flex items-center gap-2">
            <Plus className="w-4 h-4" /> Novo Usuário
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex-1 flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar nome ou e-mail..."
                className="pl-10 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:border-[#2655e8] w-72 shadow-sm"
              />
            </div>
            <button onClick={() => { setSearchQuery(""); notify("Filtros limpos."); }} className="px-4 py-2 bg-white border border-slate-200 text-slate-500 rounded-xl text-xs font-bold hover:text-[#2655e8] shadow-sm flex items-center gap-2">
              <Filter className="w-3.5 h-3.5" /> Filtros
            </button>
          </div>

          <div className="overflow-y-auto flex-1 custom-scrollbar">
            <table className="w-full text-sm text-left border-collapse whitespace-nowrap">
              <thead className="bg-white text-[10px] font-black uppercase text-slate-400 tracking-widest border-b sticky top-0 shadow-sm z-10">
                <tr>
                  <th className="px-6 py-4">Usuário</th>
                  <th className="px-6 py-4">Perfil de Acesso</th>
                  <th className="px-6 py-4">Setor</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4">Último Login</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((user) => (
                  <tr key={user.id} className="hover:bg-[#eef2ff]/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black shadow-sm ${
                            user.status === "Bloqueado"
                              ? "bg-red-100 text-red-700"
                              : "bg-indigo-100 text-indigo-700"
                          }`}
                        >
                          {getInitials(user.name)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{user.name}</p>
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-md text-[11px] font-bold text-slate-600">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-600">{user.department}</td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          user.status === "Ativo"
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                            : "bg-red-50 border-red-200 text-red-700"
                        }`}
                      >
                        {user.status === "Ativo" ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}{" "}
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs font-medium">{user.lastLogin}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => notify(`Ações abertas para ${user.name}.`)} className="p-2 text-slate-400 hover:text-[#2655e8] hover:bg-[#eef2ff] rounded-lg transition-colors">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderRolesTab = () => {
    return (
      <div className="flex flex-col h-full animate-in fade-in">
        <div className="flex justify-between items-center mb-6 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Perfis de Acesso (RBAC)</h2>
            <p className="text-sm text-slate-500">Defina as permissões granulares por módulo para garantir Segregação de Funções (SoD).</p>
          </div>
          <button onClick={() => notify("Novo perfil de acesso preparado.")} className="px-4 py-2.5 bg-[#2655e8] text-white rounded-xl text-sm font-bold shadow-md hover:bg-[#1e40af] transition-all flex items-center gap-2">
            <Plus className="w-4 h-4" /> Criar Perfil
          </button>
        </div>

        <div className="flex flex-col xl:flex-row gap-6 flex-1 min-h-0">
          <div className="xl:w-72 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden shrink-0">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Perfis Existentes</h3>
            </div>
            <div className="overflow-y-auto custom-scrollbar p-3 space-y-1">
              {ROLES_LIST.map((role) => (
                <button
                  key={role}
                  onClick={() => setActiveRole(role)}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                    activeRole === role ? "bg-[#eef2ff] text-[#2655e8]" : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-start shrink-0">
              <div>
                <h3 className="text-lg font-black text-slate-900">{activeRole}</h3>
                <p className="text-sm text-slate-500 mt-1">Configuração de permissões e privilégios da matriz.</p>
              </div>
              <button onClick={() => notify(`Perfil ${activeRole} clonado para edição.`)} className="px-4 py-2 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-sm font-bold shadow-sm hover:bg-white transition-all flex items-center gap-2">
                <Copy className="w-4 h-4" /> Clonar Perfil
              </button>
            </div>

            <div className="overflow-y-auto custom-scrollbar p-6">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 rounded-tl-xl border-b border-slate-200">
                      Módulo do Sistema
                    </th>
                    {["Visualizar", "Criar", "Editar", "Excluir", "Aprovar"].map((action, i) => (
                      <th
                        key={action}
                        className={`px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center border-b border-slate-200 ${
                          i === 4 && "rounded-tr-xl"
                        }`}
                      >
                        {action}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {MODULES_MATRIX.map((mod) => {
                    const isAdmin = activeRole === "Administrador Global";
                    const isViewOnly = activeRole === "Auditor Externo";
                    return (
                      <tr key={mod} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-4 font-bold text-slate-700">{mod}</td>
                        {["Visualizar", "Criar", "Editar", "Excluir", "Aprovar"].map((action, j) => {
                          const isChecked = isAdmin || action === "Visualizar" || (!isViewOnly && j < 3);
                          return (
                            <td key={action} className="px-4 py-4 text-center">
                              <button
                                onClick={() => notify(`Permissão ${action} em ${mod} alternada.`)}
                                className={`p-1 rounded transition-colors ${
                                  isChecked ? "text-[#2655e8]" : "text-slate-300 hover:text-slate-400"
                                }`}
                              >
                                {isChecked ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
                <button onClick={() => notify("Matriz de permissões salva.")} className="px-6 py-2.5 bg-[#2655e8] text-white rounded-xl text-sm font-bold shadow-md hover:bg-[#1e40af] transition-all flex items-center gap-2">
                  <Save className="w-4 h-4" /> Salvar Matriz
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDepartmentsTab = () => {
    return (
      <div className="flex flex-col h-full animate-in fade-in">
        <div className="flex justify-between items-center mb-6 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Estrutura Organizacional</h2>
            <p className="text-sm text-slate-500">Cadastro de setores e departamentos base para todo o sistema.</p>
          </div>
          <button onClick={() => notify("Cadastro de setor preparado.")} className="px-4 py-2.5 bg-[#2655e8] text-white rounded-xl text-sm font-bold shadow-md hover:bg-[#1e40af] transition-all flex items-center gap-2">
            <Building2 className="w-4 h-4" /> Novo Setor
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex-1 flex flex-col">
          <div className="overflow-y-auto flex-1 custom-scrollbar">
            <table className="w-full text-sm text-left border-collapse whitespace-nowrap">
              <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b sticky top-0 shadow-sm z-10">
                <tr>
                  <th className="px-6 py-4">Código</th>
                  <th className="px-6 py-4">Nome do Setor</th>
                  <th className="px-6 py-4">Líder / Responsável</th>
                  <th className="px-6 py-4 text-center">Colaboradores</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {EMPTY_DEPTS.map((dept) => (
                  <tr key={dept.id} className="hover:bg-[#eef2ff]/30 transition-colors group">
                    <td className="px-6 py-4 font-mono font-bold text-[#2655e8] text-xs">{dept.code}</td>
                    <td className="px-6 py-4 font-bold text-slate-800">{dept.name}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <UserCircle className="w-4 h-4 text-slate-400" />
                        <span className="font-medium text-slate-700">{dept.manager}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-2 py-1 bg-slate-100 rounded-md text-xs font-bold text-slate-600">
                        {dept.headcount}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border bg-emerald-50 border-emerald-200 text-emerald-700">
                        <CheckCircle2 className="w-3 h-3" /> Ativo
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => notify(`Ações abertas para ${dept.name}.`)} className="p-2 text-slate-400 hover:text-[#2655e8] hover:bg-[#eef2ff] rounded-lg transition-colors">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderSecurityTab = () => {
    return (
      <div className="flex flex-col h-full animate-in fade-in overflow-y-auto custom-scrollbar pr-4 pb-10">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900">Políticas de Segurança e Compliance</h2>
          <p className="text-sm text-slate-500">Configure as regras globais de senhas e sessões de acesso ao tenant.</p>
        </div>

        <div className="space-y-6 max-w-4xl">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-8">
            <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
              <KeyRound className="w-6 h-6 text-[#2655e8]" />
              <h3 className="text-lg font-bold text-slate-900">Complexidade de Senha</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="font-bold text-sm text-slate-800">Tamanho Mínimo</p>
                    <p className="text-xs text-slate-500">Mínimo de 8 caracteres.</p>
                  </div>
                  <input type="number" defaultValue={8} className="w-20 px-3 py-1.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#2655e8] text-center font-bold" />
                </label>
                <label className="flex items-center justify-between cursor-pointer mt-6">
                  <div>
                    <p className="font-bold text-sm text-slate-800">Exigir Letra Maiúscula e Minúscula</p>
                  </div>
                  <input type="checkbox" defaultChecked className="w-4 h-4 accent-[#2655e8]" />
                </label>
                <label className="flex items-center justify-between cursor-pointer mt-6">
                  <div>
                    <p className="font-bold text-sm text-slate-800">Exigir Caractere Especial</p>
                    <p className="text-xs text-slate-500">Ex: !@#$%^&*</p>
                  </div>
                  <input type="checkbox" defaultChecked className="w-4 h-4 accent-[#2655e8]" />
                </label>
              </div>

              <div className="space-y-4 border-t pt-4 md:border-t-0 md:pt-0 md:border-l border-slate-100 md:pl-8">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="font-bold text-sm text-slate-800">Validade da Senha (Expiração)</p>
                    <p className="text-xs text-slate-500">Em dias (0 para nunca).</p>
                  </div>
                  <input type="number" defaultValue={90} className="w-20 px-3 py-1.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#2655e8] text-center font-bold" />
                </label>
                <label className="flex items-center justify-between cursor-pointer mt-6">
                  <div>
                    <p className="font-bold text-sm text-slate-800">Proibir Senhas Anteriores</p>
                    <p className="text-xs text-slate-500">Impede reúso do histórico.</p>
                  </div>
                  <input type="number" defaultValue={3} className="w-20 px-3 py-1.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#2655e8] text-center font-bold" />
                </label>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-8">
            <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
              <Smartphone className="w-6 h-6 text-[#2655e8]" />
              <h3 className="text-lg font-bold text-slate-900">Sessões e Autenticação MFA</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="font-bold text-sm text-slate-800">Timeout de Inatividade</p>
                    <p className="text-xs text-slate-500">Deslogar automaticamente (minutos).</p>
                  </div>
                  <input type="number" defaultValue={30} className="w-20 px-3 py-1.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#2655e8] text-center font-bold" />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="font-bold text-sm text-slate-800">Bloqueio por Tentativas Falhas</p>
                    <p className="text-xs text-slate-500">Após N tentativas erradas.</p>
                  </div>
                  <input type="number" defaultValue={5} className="w-20 px-3 py-1.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#2655e8] text-center font-bold" />
                </label>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-2 text-amber-700 font-bold text-sm">
                  <ShieldAlert className="w-4 h-4" /> 2FA (MFA)
                </div>
                <p className="text-xs text-amber-800 mb-4">A Autenticação em Dois Fatores adiciona uma camada crítica de segurança no login.</p>
                <button onClick={() => notify("Política de 2FA global marcada para revisão.")} className="w-full py-2 bg-white border border-amber-200 text-amber-700 rounded-xl text-sm font-bold shadow-sm hover:bg-amber-100 transition-all">
                  Forçar 2FA Global
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={() => notify("Políticas de segurança salvas.")} className="px-6 py-3 bg-[#2655e8] text-white rounded-xl text-sm font-bold shadow-md hover:bg-[#1e40af] transition-all flex items-center gap-2">
              <Save className="w-4 h-4" /> Salvar Políticas
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderGlobalTab = () => {
    return (
      <div className="flex flex-col h-full animate-in fade-in overflow-y-auto custom-scrollbar pr-4 pb-10">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900">Parâmetros Globais da Empresa</h2>
          <p className="text-sm text-slate-500">Informações gerais, marca (White-Label) e localização.</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-8 max-w-3xl">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="shrink-0 flex flex-col items-center">
              <div className="w-40 h-20 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-slate-400 mb-4 hover:border-[#2655e8] hover:bg-[#eef2ff] hover:text-[#2655e8] transition-all cursor-pointer">
                <Globe className="w-6 h-6 mb-1" />
                <span className="text-[10px] font-black uppercase tracking-widest text-center px-2">Logo</span>
              </div>
              <p className="text-[10px] text-slate-400 text-center">
                PNG ou JPG até 2MB.
                <br />
                Fundo transparente ideal.
              </p>
            </div>

            <div className="flex-1 space-y-5 w-full">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                  Nome da Instituição (Tenant)
                </label>
                <input
                  type="text"
                  placeholder="Nome da instituição"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 outline-none focus:border-[#2655e8]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                    Fuso Horário
                  </label>
                  <select className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:border-[#2655e8] bg-white font-medium text-slate-700">
                    <option>America/Sao_Paulo (UTC-03:00)</option>
                    <option>America/Manaus (UTC-04:00)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                    Formato de Data
                  </label>
                  <select className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:border-[#2655e8] bg-white font-medium text-slate-700">
                    <option>DD/MM/YYYY</option>
                    <option>MM/DD/YYYY</option>
                    <option>YYYY-MM-DD</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 mt-2 border-t border-slate-100 flex justify-end">
                <button onClick={() => notify("Workspace atualizado.")} className="px-6 py-2.5 bg-[#2655e8] text-white rounded-xl text-sm font-bold shadow-md hover:bg-[#1e40af] transition-all flex items-center gap-2">
                  <Save className="w-4 h-4" /> Atualizar Workspace
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAuditTab = () => {
    return (
      <div className="flex flex-col h-full animate-in fade-in">
        <div className="flex justify-between items-center mb-6 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Trilha de Auditoria Geral (Logs)</h2>
            <p className="text-sm text-slate-500">Registros imutáveis de atividades do sistema exigidos por normas de compliance.</p>
          </div>
          <button onClick={() => { window.print(); notify("Relatório enviado para impressão."); }} className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2">
            <Download className="w-4 h-4" /> Exportar Relatório PDF
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex-1 flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-wrap gap-4 shrink-0 items-center">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar usuário, ação ou IP..."
                className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:border-[#2655e8] shadow-sm"
              />
            </div>
            <input
              type="date"
              className="px-4 py-2 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:border-[#2655e8] shadow-sm text-slate-500"
            />
          </div>

          <div className="overflow-y-auto flex-1 custom-scrollbar">
            <table className="w-full text-sm text-left border-collapse whitespace-nowrap">
              <thead className="bg-slate-900 text-[10px] font-black uppercase text-slate-300 tracking-widest sticky top-0 z-10 shadow-md">
                <tr>
                  <th className="px-6 py-4">Data e Hora (Local)</th>
                  <th className="px-6 py-4">Usuário</th>
                  <th className="px-6 py-4">Ação Realizada</th>
                  <th className="px-6 py-4">Módulo Relacionado</th>
                  <th className="px-6 py-4 text-right">Endereço IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {EMPTY_LOGS.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-[#2655e8]">{log.timestamp}</td>
                    <td className="px-6 py-4 font-bold text-slate-700">{log.user}</td>
                    <td className="px-6 py-4 text-slate-800 font-medium">{log.action}</td>
                    <td className="px-6 py-4 text-slate-500">{log.module}</td>
                    <td className="px-6 py-4 text-right text-slate-400 font-mono">{log.ip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // ─── TABS E MENU LATERAL ──────────────────────────────────────────────────
  const MENUS = [
    {
      section: "Sua Conta",
      items: [
        { id: "profile", label: "Meu Perfil", icon: User },
        { id: "password", label: "Redefinir senha", icon: KeyRound },
      ],
    },
    {
      section: "Organização",
      items: [
        { id: "global", label: "Parâmetros Globais", icon: Globe },
        { id: "departments", label: "Setores e Departamentos", icon: Layers },
      ],
    },
    {
      section: "Controle de Acessos",
      items: [
        { id: "users", label: "Gestão de Usuários", icon: Users },
        { id: "roles", label: "Matriz RBAC (Perfis)", icon: ShieldAlert },
      ],
    },
    {
      section: "Compliance & TI",
      items: [
        { id: "security", label: "Segurança e Senhas", icon: Lock },
        { id: "audit", label: "Trilha de Auditoria", icon: History },
      ],
    },
    {
      section: "Faturamento",
      items: [{ id: "billing", label: "Assinatura (Plano)", icon: CreditCard }],
    },
  ];

  return (
    <div className="h-full bg-slate-50/50 flex animate-in fade-in duration-500">
      {notice && (
        <div className="fixed right-6 top-6 z-50 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 shadow-lg">
          <CheckCircle2 className="h-4 w-4" />
          {notice}
        </div>
      )}

      {/* SIDEBAR MASTER DE CONFIGURAÇÕES */}
      <div className="w-72 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="p-6 pb-4 border-b border-slate-100">
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-3">
            <Settings className="w-5 h-5 text-[#2655e8]" /> Ajustes do Sistema
          </h1>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-6">
          {MENUS.map((menu) => (
            <div key={menu.section}>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-3 mb-2">
                {menu.section}
              </h4>
              <div className="space-y-1">
                {menu.items.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;

                  if (tab.id === "billing") {
                    return (
                      <button
                        key={tab.id}
                        disabled
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold text-slate-400 hover:bg-slate-50 cursor-not-allowed"
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="w-4 h-4" /> {tab.label}
                        </div>
                      </button>
                    );
                  }

                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all outline-none ${
                        isActive
                          ? "bg-[#eef2ff] text-[#2655e8]"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <Icon className="w-4 h-4" /> {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ÁREA DE CONTEÚDO (DETAIL) */}
      <div className="flex-1 min-w-0 p-8 overflow-hidden flex flex-col">
        {activeTab === "profile" && renderProfile()}
        {activeTab === "password" && renderPasswordResetTab()}
        {activeTab === "users" && renderUsersTab()}
        {activeTab === "roles" && renderRolesTab()}
        {activeTab === "departments" && renderDepartmentsTab()}
        {activeTab === "security" && renderSecurityTab()}
        {activeTab === "global" && renderGlobalTab()}
        {activeTab === "audit" && renderAuditTab()}
      </div>
    </div>
  );
}
