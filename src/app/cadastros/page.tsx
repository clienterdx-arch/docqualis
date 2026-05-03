"use client";

import React, { useState } from "react";
import {
  Building2, Users, Tag, FolderOpen, Plus, Search,
  MoreVertical, CheckCircle2, XCircle, X, Save,
  Shield, Layers, Mail, Edit2, AlertCircle,
} from "lucide-react";
import type {
  Diretoria, Setor, CategoriaDocumento, UsuarioCadastro,
  NivelPermissao, ModuloSistema,
} from "@/types/cadastros";
import { MODULOS_SISTEMA } from "@/types/cadastros";

// ─── DADOS MOCK ───────────────────────────────────────────────────────────────

const MOCK_DIRETORIAS: Diretoria[] = [
  { id: "DIR-001", empresa_id: "", codigo: "EXE", nome: "Diretoria Executiva", descricao: "Alta direção da instituição", responsavel: "Roberto Silva", qtd_setores: 2, status: "ativo", created_at: "" },
  { id: "DIR-002", empresa_id: "", codigo: "ASS", nome: "Diretoria Assistencial", descricao: "Gestão das áreas de cuidado ao paciente", responsavel: "Dra. Patricia Reis", qtd_setores: 8, status: "ativo", created_at: "" },
  { id: "DIR-003", empresa_id: "", codigo: "ADM", nome: "Diretoria Administrativa", descricao: "Gestão administrativa e financeira", responsavel: "Carlos Mendes", qtd_setores: 5, status: "ativo", created_at: "" },
  { id: "DIR-004", empresa_id: "", codigo: "QUA", nome: "Qualidade e Segurança", descricao: "Controle de qualidade e gestão de riscos", responsavel: "Deivid Coimbra", qtd_setores: 2, status: "ativo", created_at: "" },
];

const MOCK_SETORES: Setor[] = [
  { id: "SET-001", empresa_id: "", diretoria_id: "DIR-002", diretoria_nome: "Diretoria Assistencial", codigo: "UTI", nome: "UTI Adulto", descricao: "Unidade de Terapia Intensiva Adulto", responsavel: "Enf. Marina Costa", status: "ativo", created_at: "" },
  { id: "SET-002", empresa_id: "", diretoria_id: "DIR-002", diretoria_nome: "Diretoria Assistencial", codigo: "CME", nome: "Centro de Material Esterilizado", descricao: "Processamento e esterilização de materiais", responsavel: "Téc. José Almeida", status: "ativo", created_at: "" },
  { id: "SET-003", empresa_id: "", diretoria_id: "DIR-003", diretoria_nome: "Diretoria Administrativa", codigo: "FAR", nome: "Farmácia Hospitalar", descricao: "Dispensação e controle de medicamentos", responsavel: "Farm. Ana Lima", status: "ativo", created_at: "" },
  { id: "SET-004", empresa_id: "", diretoria_id: "DIR-004", diretoria_nome: "Qualidade e Segurança", codigo: "GQS", nome: "Gestão da Qualidade", descricao: "Coordenação do sistema de gestão da qualidade", responsavel: "Deivid Coimbra", status: "ativo", created_at: "" },
  { id: "SET-005", empresa_id: "", diretoria_id: "DIR-002", diretoria_nome: "Diretoria Assistencial", codigo: "NHO", nome: "Núcleo de Higienização", descricao: "Limpeza e desinfecção de ambientes hospitalares", responsavel: "Marcos Ferreira", status: "ativo", created_at: "" },
  { id: "SET-006", empresa_id: "", diretoria_id: "DIR-003", diretoria_nome: "Diretoria Administrativa", codigo: "TI", nome: "Tecnologia da Informação", descricao: "Infraestrutura e sistemas de informação", responsavel: "Lucas Santos", status: "ativo", created_at: "" },
];

const PERFIS_ACESSO = [
  "Administrador Global",
  "Gestor de Módulo",
  "Aprovador Final",
  "Revisor",
  "Operacional",
  "Auditor Externo",
  "Somente Leitura",
];

function permissoesPadrao(perfil: string): Record<ModuloSistema, NivelPermissao> {
  const base = {} as Record<ModuloSistema, NivelPermissao>;
  MODULOS_SISTEMA.forEach((m) => { base[m] = "sem_acesso"; });
  if (perfil === "Administrador Global") {
    MODULOS_SISTEMA.forEach((m) => { base[m] = "administrar"; });
  } else if (perfil === "Gestor de Módulo") {
    MODULOS_SISTEMA.forEach((m) => { base[m] = "editar"; });
    base["Configurações"] = "sem_acesso";
  } else if (perfil === "Aprovador Final") {
    MODULOS_SISTEMA.forEach((m) => { base[m] = "aprovar"; });
    base["Configurações"] = "sem_acesso";
  } else if (perfil === "Revisor") {
    MODULOS_SISTEMA.forEach((m) => { base[m] = "editar"; });
    base["Configurações"] = "sem_acesso";
  } else if (perfil === "Operacional") {
    base["Gestão de Documentos"] = "visualizar";
    base["Gestão de Processos"] = "visualizar";
    base["Ocorrências & Eventos"] = "editar";
    base["Gestão de Registros"] = "editar";
  } else if (perfil === "Auditor Externo" || perfil === "Somente Leitura") {
    MODULOS_SISTEMA.forEach((m) => { base[m] = "visualizar"; });
    base["Configurações"] = "sem_acesso";
  }
  return base;
}

const MOCK_USUARIOS: UsuarioCadastro[] = [
  { id: "USR-001", empresa_id: "", nome: "Deivid Coimbra", email: "deivid@docqualis.com", cargo: "Analista da Qualidade", setor: "Gestão da Qualidade", setor_id: "SET-004", diretoria: "Qualidade e Segurança", diretoria_id: "DIR-004", perfil: "Administrador Global", status: "ativo", permissoes: permissoesPadrao("Administrador Global"), ultimo_login: "Agora mesmo", created_at: "" },
  { id: "USR-002", empresa_id: "", nome: "Patricia Reis", email: "patricia@docqualis.com", cargo: "Médica da Qualidade", setor: "Gestão da Qualidade", setor_id: "SET-004", diretoria: "Qualidade e Segurança", diretoria_id: "DIR-004", perfil: "Aprovador Final", status: "ativo", permissoes: permissoesPadrao("Aprovador Final"), ultimo_login: "Hoje, 08:30", created_at: "" },
  { id: "USR-003", empresa_id: "", nome: "Tyago Alves", email: "tyago@docqualis.com", cargo: "Gerente Assistencial", setor: "UTI Adulto", setor_id: "SET-001", diretoria: "Diretoria Assistencial", diretoria_id: "DIR-002", perfil: "Gestor de Módulo", status: "ativo", permissoes: permissoesPadrao("Gestor de Módulo"), ultimo_login: "Ontem, 14:15", created_at: "" },
  { id: "USR-004", empresa_id: "", nome: "Roberto Silva", email: "roberto@docqualis.com", cargo: "Diretor Executivo", setor: "Diretoria Executiva", setor_id: "DIR-001", diretoria: "Diretoria Executiva", diretoria_id: "DIR-001", perfil: "Revisor", status: "ativo", permissoes: permissoesPadrao("Revisor"), ultimo_login: "15/04/2026", created_at: "" },
  { id: "USR-005", empresa_id: "", nome: "Ana Beatriz Santos", email: "ana.b@docqualis.com", cargo: "Técnica de Enfermagem", setor: "UTI Adulto", setor_id: "SET-001", diretoria: "Diretoria Assistencial", diretoria_id: "DIR-002", perfil: "Operacional", status: "bloqueado", permissoes: permissoesPadrao("Operacional"), ultimo_login: "01/04/2026", created_at: "" },
];

const PALETA_CORES = [
  "#2655e8", "#059669", "#7c3aed", "#d97706", "#dc2626",
  "#0891b2", "#db2777", "#65a30d", "#9333ea", "#0d9488",
  "#1d4ed8", "#b45309", "#be123c", "#0f766e", "#6d28d9",
];

const MOCK_CATEGORIAS: CategoriaDocumento[] = [
  { id: "CAT-001", empresa_id: "", nome: "Procedimento Operacional Padrão", sigla: "POP", descricao: "Documentos que descrevem passo a passo de atividades operacionais", cor: "#2655e8", status: "ativo", created_at: "" },
  { id: "CAT-002", empresa_id: "", nome: "Instrução de Trabalho", sigla: "IT", descricao: "Orientações específicas para tarefas técnicas", cor: "#059669", status: "ativo", created_at: "" },
  { id: "CAT-003", empresa_id: "", nome: "Política", sigla: "POL", descricao: "Diretrizes e princípios organizacionais", cor: "#7c3aed", status: "ativo", created_at: "" },
  { id: "CAT-004", empresa_id: "", nome: "Formulário", sigla: "FOR", descricao: "Modelos para registro de informações", cor: "#d97706", status: "ativo", created_at: "" },
  { id: "CAT-005", empresa_id: "", nome: "Manual", sigla: "MAN", descricao: "Documentos de referência geral do sistema", cor: "#dc2626", status: "ativo", created_at: "" },
  { id: "CAT-006", empresa_id: "", nome: "Protocolo Clínico", sigla: "PCL", descricao: "Diretrizes para condutas assistenciais", cor: "#0891b2", status: "ativo", created_at: "" },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function getIniciais(nome: string) {
  return nome.trim().split(" ").filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join("");
}

const NIVEL_CONFIG: Record<NivelPermissao, { label: string; cls: string }> = {
  sem_acesso:  { label: "Sem Acesso",  cls: "bg-slate-100 text-slate-400 border-slate-200" },
  visualizar:  { label: "Visualizar",  cls: "bg-sky-50 text-sky-700 border-sky-200" },
  editar:      { label: "Editar",      cls: "bg-blue-50 text-[#2655e8] border-blue-200" },
  aprovar:     { label: "Aprovar",     cls: "bg-violet-50 text-violet-700 border-violet-200" },
  administrar: { label: "Administrar", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

const NIVEIS: NivelPermissao[] = ["sem_acesso", "visualizar", "editar", "aprovar", "administrar"];

function StatusBadge({ status }: { status: string }) {
  if (status === "ativo") return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border bg-emerald-50 border-emerald-200 text-emerald-700">
      <CheckCircle2 className="w-3 h-3" /> Ativo
    </span>
  );
  if (status === "bloqueado") return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border bg-amber-50 border-amber-200 text-amber-700">
      <AlertCircle className="w-3 h-3" /> Bloqueado
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border bg-red-50 border-red-200 text-red-700">
      <XCircle className="w-3 h-3" /> Inativo
    </span>
  );
}

// ─── COMPONENTES BASE ─────────────────────────────────────────────────────────

const INPUT_CLS = "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-[#2655e8] focus:bg-white outline-none transition-colors";
const SELECT_CLS = "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-[#2655e8] outline-none transition-colors";

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function Modal({
  aberto, titulo, onFechar, onSalvar, children, largura = "max-w-lg",
}: {
  aberto: boolean;
  titulo: string;
  onFechar: () => void;
  onSalvar?: () => void;
  children: React.ReactNode;
  largura?: string;
}) {
  if (!aberto) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${largura} flex flex-col max-h-[90vh]`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <h3 className="text-base font-black text-slate-900">{titulo}</h3>
          <button onClick={onFechar} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5 custom-scrollbar">
          {children}
        </div>
        {onSalvar && (
          <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 shrink-0 bg-slate-50/50">
            <button onClick={onFechar} className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors">
              Cancelar
            </button>
            <button onClick={onSalvar} className="flex items-center gap-2 px-5 py-2 bg-[#2655e8] text-white text-sm font-bold rounded-xl hover:bg-[#1e40af] transition-colors shadow-sm">
              <Save className="w-4 h-4" /> Salvar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function TabelaHeader({ children }: { children: React.ReactNode }) {
  return (
    <thead className="bg-white text-[10px] font-black uppercase text-slate-400 tracking-widest border-b sticky top-0 shadow-sm z-10">
      <tr>{children}</tr>
    </thead>
  );
}

function Th({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return <th className={`px-6 py-4 ${center ? "text-center" : ""}`}>{children}</th>;
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

type Tab = "diretorias" | "setores" | "usuarios" | "categorias";

const MENUS = [
  {
    section: "Organização",
    items: [
      { id: "diretorias" as Tab, label: "Diretorias", icon: Building2 },
      { id: "setores" as Tab, label: "Setores", icon: Layers },
    ],
  },
  {
    section: "Acessos",
    items: [{ id: "usuarios" as Tab, label: "Usuários", icon: Users }],
  },
  {
    section: "Documentos",
    items: [{ id: "categorias" as Tab, label: "Categorias de Documento", icon: Tag }],
  },
];

export default function CadastrosPage() {
  const [tab, setTab] = useState<Tab>("diretorias");
  const [busca, setBusca] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);

  // ── Diretorias state
  const [diretorias, setDiretorias] = useState<Diretoria[]>(MOCK_DIRETORIAS);
  const [modalDir, setModalDir] = useState(false);
  const [formDir, setFormDir] = useState<Partial<Diretoria>>({});

  // ── Setores state
  const [setores, setSetores] = useState<Setor[]>(MOCK_SETORES);
  const [modalSet, setModalSet] = useState(false);
  const [formSet, setFormSet] = useState<Partial<Setor>>({});

  // ── Usuários state
  const [usuarios, setUsuarios] = useState<UsuarioCadastro[]>(MOCK_USUARIOS);
  const [modalUsr, setModalUsr] = useState(false);
  const [formUsr, setFormUsr] = useState<Partial<UsuarioCadastro>>({});
  const [modalPerm, setModalPerm] = useState(false);
  const [usrPerm, setUsrPerm] = useState<UsuarioCadastro | null>(null);
  const [permEdit, setPermEdit] = useState<Record<ModuloSistema, NivelPermissao>>({} as Record<ModuloSistema, NivelPermissao>);

  // ── Categorias state
  const [categorias, setCategorias] = useState<CategoriaDocumento[]>(MOCK_CATEGORIAS);
  const [modalCat, setModalCat] = useState(false);
  const [formCat, setFormCat] = useState<Partial<CategoriaDocumento>>({});

  function notificar(msg: string) {
    setAviso(msg);
    window.setTimeout(() => setAviso(null), 3000);
  }

  // ── Actions: Diretorias ───────────────────────────────────────────────────

  function abrirNovaDiretoria() { setFormDir({ status: "ativo" }); setModalDir(true); }

  function editarDiretoria(d: Diretoria) { setFormDir(d); setModalDir(true); }

  function salvarDiretoria() {
    if (!formDir.nome?.trim() || !formDir.codigo?.trim()) { notificar("Código e nome são obrigatórios."); return; }
    if (formDir.id) {
      setDiretorias((prev) => prev.map((x) => x.id === formDir.id ? { ...x, ...formDir } as Diretoria : x));
    } else {
      const id = `DIR-${String(diretorias.length + 1).padStart(3, "0")}`;
      setDiretorias((prev) => [...prev, { ...formDir, id, empresa_id: "", qtd_setores: 0, created_at: "" } as Diretoria]);
    }
    setModalDir(false);
    notificar(formDir.id ? "Diretoria atualizada." : "Diretoria criada com sucesso.");
  }

  // ── Actions: Setores ──────────────────────────────────────────────────────

  function abrirNovoSetor() { setFormSet({ status: "ativo" }); setModalSet(true); }

  function editarSetor(s: Setor) { setFormSet(s); setModalSet(true); }

  function salvarSetor() {
    if (!formSet.nome?.trim() || !formSet.codigo?.trim()) { notificar("Código e nome são obrigatórios."); return; }
    const dirNome = diretorias.find((d) => d.id === formSet.diretoria_id)?.nome ?? "";
    if (formSet.id) {
      setSetores((prev) => prev.map((x) => x.id === formSet.id ? { ...x, ...formSet, diretoria_nome: dirNome } as Setor : x));
    } else {
      const id = `SET-${String(setores.length + 1).padStart(3, "0")}`;
      setSetores((prev) => [...prev, { ...formSet, id, empresa_id: "", diretoria_nome: dirNome, created_at: "" } as Setor]);
    }
    setModalSet(false);
    notificar(formSet.id ? "Setor atualizado." : "Setor criado com sucesso.");
  }

  // ── Actions: Usuários ─────────────────────────────────────────────────────

  function abrirNovoUsuario() { setFormUsr({ status: "ativo", perfil: "Operacional" }); setModalUsr(true); }

  function editarUsuario(u: UsuarioCadastro) { setFormUsr(u); setModalUsr(true); }

  function salvarUsuario() {
    if (!formUsr.nome?.trim() || !formUsr.email?.trim()) { notificar("Nome e e-mail são obrigatórios."); return; }
    if (formUsr.id) {
      setUsuarios((prev) => prev.map((x) => x.id === formUsr.id ? { ...x, ...formUsr } as UsuarioCadastro : x));
    } else {
      const id = `USR-${String(usuarios.length + 1).padStart(3, "0")}`;
      setUsuarios((prev) => [...prev, {
        ...formUsr, id, empresa_id: "", created_at: "",
        permissoes: permissoesPadrao(formUsr.perfil ?? "Operacional"),
      } as UsuarioCadastro]);
    }
    setModalUsr(false);
    notificar(formUsr.id ? "Usuário atualizado." : "Usuário criado. Convite será enviado por e-mail.");
  }

  function abrirPermissoes(u: UsuarioCadastro) {
    setUsrPerm(u);
    setPermEdit({ ...u.permissoes });
    setModalPerm(true);
  }

  function salvarPermissoes() {
    if (!usrPerm) return;
    setUsuarios((prev) => prev.map((x) => x.id === usrPerm.id ? { ...x, permissoes: permEdit } : x));
    setModalPerm(false);
    notificar(`Permissões de ${usrPerm.nome} atualizadas.`);
  }

  // ── Actions: Categorias ───────────────────────────────────────────────────

  function abrirNovaCategoria() { setFormCat({ status: "ativo", cor: "#2655e8" }); setModalCat(true); }

  function editarCategoria(c: CategoriaDocumento) { setFormCat(c); setModalCat(true); }

  function salvarCategoria() {
    if (!formCat.nome?.trim() || !formCat.sigla?.trim()) { notificar("Nome e sigla são obrigatórios."); return; }
    if (formCat.id) {
      setCategorias((prev) => prev.map((x) => x.id === formCat.id ? { ...x, ...formCat } as CategoriaDocumento : x));
    } else {
      const id = `CAT-${String(categorias.length + 1).padStart(3, "0")}`;
      setCategorias((prev) => [...prev, { ...formCat, id, empresa_id: "", created_at: "" } as CategoriaDocumento]);
    }
    setModalCat(false);
    notificar(formCat.id ? "Categoria atualizada." : "Categoria criada com sucesso.");
  }

  // ── Renders ───────────────────────────────────────────────────────────────

  const filteredDiretorias = diretorias.filter((d) =>
    d.nome.toLowerCase().includes(busca.toLowerCase()) ||
    d.codigo.toLowerCase().includes(busca.toLowerCase())
  );

  const filteredSetores = setores.filter((s) =>
    s.nome.toLowerCase().includes(busca.toLowerCase()) ||
    s.codigo.toLowerCase().includes(busca.toLowerCase()) ||
    s.diretoria_nome.toLowerCase().includes(busca.toLowerCase())
  );

  const filteredUsuarios = usuarios.filter((u) =>
    u.nome.toLowerCase().includes(busca.toLowerCase()) ||
    u.email.toLowerCase().includes(busca.toLowerCase()) ||
    u.setor.toLowerCase().includes(busca.toLowerCase())
  );

  const filteredCategorias = categorias.filter((c) =>
    c.nome.toLowerCase().includes(busca.toLowerCase()) ||
    c.sigla.toLowerCase().includes(busca.toLowerCase())
  );

  function renderDiretorias() {
    return (
      <div className="flex flex-col h-full animate-in fade-in">
        <div className="flex justify-between items-start mb-6 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Diretorias</h2>
            <p className="text-sm text-slate-500 mt-0.5">Nível hierárquico superior que agrupa setores.</p>
          </div>
          <button onClick={abrirNovaDiretoria} className="flex items-center gap-2 px-4 py-2.5 bg-[#2655e8] text-white rounded-xl text-sm font-bold shadow-md hover:bg-[#1e40af] transition-all">
            <Plus className="w-4 h-4" /> Nova Diretoria
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex-1 flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar diretoria..." className="pl-10 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:border-[#2655e8] w-full shadow-sm" />
            </div>
          </div>
          <div className="overflow-y-auto flex-1 custom-scrollbar">
            <table className="w-full text-sm text-left border-collapse whitespace-nowrap">
              <TabelaHeader>
                <Th>Código</Th><Th>Nome</Th><Th>Responsável</Th>
                <Th center>Setores</Th><Th center>Status</Th><Th>Ações</Th>
              </TabelaHeader>
              <tbody className="divide-y divide-slate-100">
                {filteredDiretorias.map((d) => (
                  <tr key={d.id} className="hover:bg-[#eef2ff]/30 transition-colors group">
                    <td className="px-6 py-4 font-mono font-bold text-[#2655e8] text-xs">{d.codigo}</td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800">{d.nome}</p>
                      {d.descricao && <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{d.descricao}</p>}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-600">{d.responsavel || <span className="text-slate-300">—</span>}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-2 py-1 bg-slate-100 rounded-md text-xs font-bold text-slate-600">{d.qtd_setores}</span>
                    </td>
                    <td className="px-6 py-4 text-center"><StatusBadge status={d.status} /></td>
                    <td className="px-6 py-4">
                      <button onClick={() => editarDiretoria(d)} className="p-2 text-slate-400 hover:text-[#2655e8] hover:bg-[#eef2ff] rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredDiretorias.length === 0 && (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400">Nenhuma diretoria encontrada.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  function renderSetores() {
    return (
      <div className="flex flex-col h-full animate-in fade-in">
        <div className="flex justify-between items-start mb-6 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Setores</h2>
            <p className="text-sm text-slate-500 mt-0.5">Unidades organizacionais vinculadas a uma diretoria.</p>
          </div>
          <button onClick={abrirNovoSetor} className="flex items-center gap-2 px-4 py-2.5 bg-[#2655e8] text-white rounded-xl text-sm font-bold shadow-md hover:bg-[#1e40af] transition-all">
            <Plus className="w-4 h-4" /> Novo Setor
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex-1 flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar setor ou diretoria..." className="pl-10 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:border-[#2655e8] w-full shadow-sm" />
            </div>
          </div>
          <div className="overflow-y-auto flex-1 custom-scrollbar">
            <table className="w-full text-sm text-left border-collapse whitespace-nowrap">
              <TabelaHeader>
                <Th>Código</Th><Th>Nome do Setor</Th><Th>Diretoria</Th>
                <Th>Responsável</Th><Th center>Status</Th><Th>Ações</Th>
              </TabelaHeader>
              <tbody className="divide-y divide-slate-100">
                {filteredSetores.map((s) => (
                  <tr key={s.id} className="hover:bg-[#eef2ff]/30 transition-colors group">
                    <td className="px-6 py-4 font-mono font-bold text-[#2655e8] text-xs">{s.codigo}</td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800">{s.nome}</p>
                      {s.descricao && <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[220px]">{s.descricao}</p>}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-md text-[11px] font-bold text-slate-600">
                        {s.diretoria_nome}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-600">{s.responsavel || <span className="text-slate-300">—</span>}</td>
                    <td className="px-6 py-4 text-center"><StatusBadge status={s.status} /></td>
                    <td className="px-6 py-4">
                      <button onClick={() => editarSetor(s)} className="p-2 text-slate-400 hover:text-[#2655e8] hover:bg-[#eef2ff] rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredSetores.length === 0 && (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400">Nenhum setor encontrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  function renderUsuarios() {
    return (
      <div className="flex flex-col h-full animate-in fade-in">
        <div className="flex justify-between items-start mb-6 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Usuários</h2>
            <p className="text-sm text-slate-500 mt-0.5">Cadastre colaboradores e defina suas permissões por módulo.</p>
          </div>
          <button onClick={abrirNovoUsuario} className="flex items-center gap-2 px-4 py-2.5 bg-[#2655e8] text-white rounded-xl text-sm font-bold shadow-md hover:bg-[#1e40af] transition-all">
            <Plus className="w-4 h-4" /> Novo Usuário
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex-1 flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar nome, e-mail ou setor..." className="pl-10 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:border-[#2655e8] w-full shadow-sm" />
            </div>
          </div>
          <div className="overflow-y-auto flex-1 custom-scrollbar">
            <table className="w-full text-sm text-left border-collapse whitespace-nowrap">
              <TabelaHeader>
                <Th>Usuário</Th><Th>Cargo / Setor</Th><Th>Diretoria</Th>
                <Th>Perfil</Th><Th center>Status</Th><Th>Permissões</Th><Th>Ações</Th>
              </TabelaHeader>
              <tbody className="divide-y divide-slate-100">
                {filteredUsuarios.map((u) => (
                  <tr key={u.id} className="hover:bg-[#eef2ff]/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black shadow-sm ${u.status === "bloqueado" ? "bg-red-100 text-red-700" : "bg-indigo-100 text-indigo-700"}`}>
                          {getIniciais(u.nome)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{u.nome}</p>
                          <p className="text-xs text-slate-500 flex items-center gap-1"><Mail className="w-3 h-3" /> {u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-700">{u.cargo}</p>
                      <p className="text-xs text-slate-400">{u.setor}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">{u.diretoria}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-md text-[11px] font-bold text-slate-600">
                        {u.perfil}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center"><StatusBadge status={u.status} /></td>
                    <td className="px-6 py-4">
                      <button onClick={() => abrirPermissoes(u)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#2655e8] bg-[#eef2ff] border border-[#c7d2fe] rounded-lg hover:bg-[#e0e7ff] transition-colors">
                        <Shield className="w-3.5 h-3.5" /> Permissões
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <button onClick={() => editarUsuario(u)} className="p-2 text-slate-400 hover:text-[#2655e8] hover:bg-[#eef2ff] rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredUsuarios.length === 0 && (
                  <tr><td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-400">Nenhum usuário encontrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  function renderCategorias() {
    return (
      <div className="flex flex-col h-full animate-in fade-in">
        <div className="flex justify-between items-start mb-6 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Categorias de Documento</h2>
            <p className="text-sm text-slate-500 mt-0.5">Tipos de documento usados em todo o módulo de Gestão de Documentos.</p>
          </div>
          <button onClick={abrirNovaCategoria} className="flex items-center gap-2 px-4 py-2.5 bg-[#2655e8] text-white rounded-xl text-sm font-bold shadow-md hover:bg-[#1e40af] transition-all">
            <Plus className="w-4 h-4" /> Nova Categoria
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex-1 flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar categoria ou sigla..." className="pl-10 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:border-[#2655e8] w-full shadow-sm" />
            </div>
          </div>
          <div className="overflow-y-auto flex-1 custom-scrollbar">
            <table className="w-full text-sm text-left border-collapse whitespace-nowrap">
              <TabelaHeader>
                <Th>Sigla</Th><Th>Nome da Categoria</Th><Th>Descrição</Th><Th center>Status</Th><Th>Ações</Th>
              </TabelaHeader>
              <tbody className="divide-y divide-slate-100">
                {filteredCategorias.map((c) => (
                  <tr key={c.id} className="hover:bg-[#eef2ff]/30 transition-colors group">
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-black text-white shadow-sm" style={{ backgroundColor: c.cor }}>
                        {c.sigla}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-800">{c.nome}</td>
                    <td className="px-6 py-4 text-slate-500 text-xs max-w-xs truncate">{c.descricao || <span className="text-slate-300">—</span>}</td>
                    <td className="px-6 py-4 text-center"><StatusBadge status={c.status} /></td>
                    <td className="px-6 py-4">
                      <button onClick={() => editarCategoria(c)} className="p-2 text-slate-400 hover:text-[#2655e8] hover:bg-[#eef2ff] rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredCategorias.length === 0 && (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-400">Nenhuma categoria encontrada.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ─── RENDER ───────────────────────────────────────────────────────────────────

  return (
    <div className="h-full bg-slate-50/50 flex animate-in fade-in duration-500">

      {/* Toast */}
      {aviso && (
        <div className="fixed right-6 top-6 z-50 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 shadow-lg">
          <CheckCircle2 className="h-4 w-4" /> {aviso}
        </div>
      )}

      {/* Sidebar de navegação */}
      <div className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="p-6 pb-4 border-b border-slate-100">
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-3">
            <FolderOpen className="w-5 h-5 text-[#2655e8]" /> Cadastros
          </h1>
          <p className="text-xs text-slate-500 mt-1">Dados mestre do sistema</p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-6">
          {MENUS.map((menu) => (
            <div key={menu.section}>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-3 mb-2">{menu.section}</h4>
              <div className="space-y-1">
                {menu.items.map((item) => {
                  const Icon = item.icon;
                  const ativo = tab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => { setTab(item.id); setBusca(""); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all outline-none ${ativo ? "bg-[#eef2ff] text-[#2655e8]" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
                    >
                      <Icon className="w-4 h-4" /> {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="flex-1 min-w-0 p-8 overflow-hidden flex flex-col">
        {tab === "diretorias" && renderDiretorias()}
        {tab === "setores" && renderSetores()}
        {tab === "usuarios" && renderUsuarios()}
        {tab === "categorias" && renderCategorias()}
      </div>

      {/* ── Modal: Diretoria ─────────────────────────────────────────────────── */}
      <Modal
        aberto={modalDir}
        titulo={formDir.id ? "Editar Diretoria" : "Nova Diretoria"}
        onFechar={() => setModalDir(false)}
        onSalvar={salvarDiretoria}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Campo label="Código *">
              <input value={formDir.codigo ?? ""} onChange={(e) => setFormDir((f) => ({ ...f, codigo: e.target.value.toUpperCase() }))} maxLength={5} className={INPUT_CLS} placeholder="EXE" />
            </Campo>
            <div className="col-span-2">
              <Campo label="Nome *">
                <input value={formDir.nome ?? ""} onChange={(e) => setFormDir((f) => ({ ...f, nome: e.target.value }))} className={INPUT_CLS} placeholder="Diretoria Executiva" />
              </Campo>
            </div>
          </div>
          <Campo label="Responsável">
            <input value={formDir.responsavel ?? ""} onChange={(e) => setFormDir((f) => ({ ...f, responsavel: e.target.value }))} className={INPUT_CLS} placeholder="Nome do responsável" />
          </Campo>
          <Campo label="Descrição">
            <textarea value={formDir.descricao ?? ""} onChange={(e) => setFormDir((f) => ({ ...f, descricao: e.target.value }))} rows={3} className={INPUT_CLS + " resize-none"} placeholder="Breve descrição da diretoria..." />
          </Campo>
          <Campo label="Status">
            <select value={formDir.status ?? "ativo"} onChange={(e) => setFormDir((f) => ({ ...f, status: e.target.value as "ativo" | "inativo" }))} className={SELECT_CLS}>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </Campo>
        </div>
      </Modal>

      {/* ── Modal: Setor ─────────────────────────────────────────────────────── */}
      <Modal
        aberto={modalSet}
        titulo={formSet.id ? "Editar Setor" : "Novo Setor"}
        onFechar={() => setModalSet(false)}
        onSalvar={salvarSetor}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Campo label="Código *">
              <input value={formSet.codigo ?? ""} onChange={(e) => setFormSet((f) => ({ ...f, codigo: e.target.value.toUpperCase() }))} maxLength={6} className={INPUT_CLS} placeholder="UTI" />
            </Campo>
            <div className="col-span-2">
              <Campo label="Nome *">
                <input value={formSet.nome ?? ""} onChange={(e) => setFormSet((f) => ({ ...f, nome: e.target.value }))} className={INPUT_CLS} placeholder="UTI Adulto" />
              </Campo>
            </div>
          </div>
          <Campo label="Diretoria">
            <select value={formSet.diretoria_id ?? ""} onChange={(e) => setFormSet((f) => ({ ...f, diretoria_id: e.target.value }))} className={SELECT_CLS}>
              <option value="">Selecione a diretoria...</option>
              {diretorias.filter((d) => d.status === "ativo").map((d) => (
                <option key={d.id} value={d.id}>{d.codigo} — {d.nome}</option>
              ))}
            </select>
          </Campo>
          <Campo label="Responsável">
            <input value={formSet.responsavel ?? ""} onChange={(e) => setFormSet((f) => ({ ...f, responsavel: e.target.value }))} className={INPUT_CLS} placeholder="Nome do responsável" />
          </Campo>
          <Campo label="Descrição">
            <textarea value={formSet.descricao ?? ""} onChange={(e) => setFormSet((f) => ({ ...f, descricao: e.target.value }))} rows={3} className={INPUT_CLS + " resize-none"} placeholder="Breve descrição do setor..." />
          </Campo>
          <Campo label="Status">
            <select value={formSet.status ?? "ativo"} onChange={(e) => setFormSet((f) => ({ ...f, status: e.target.value as "ativo" | "inativo" }))} className={SELECT_CLS}>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </Campo>
        </div>
      </Modal>

      {/* ── Modal: Usuário ────────────────────────────────────────────────────── */}
      <Modal
        aberto={modalUsr}
        titulo={formUsr.id ? "Editar Usuário" : "Novo Usuário"}
        onFechar={() => setModalUsr(false)}
        onSalvar={salvarUsuario}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Campo label="Nome Completo *">
                <input value={formUsr.nome ?? ""} onChange={(e) => setFormUsr((f) => ({ ...f, nome: e.target.value }))} className={INPUT_CLS} placeholder="Nome do colaborador" />
              </Campo>
            </div>
            <Campo label="E-mail *">
              <input type="email" value={formUsr.email ?? ""} onChange={(e) => setFormUsr((f) => ({ ...f, email: e.target.value }))} className={INPUT_CLS} placeholder="email@empresa.com" />
            </Campo>
            <Campo label="Cargo">
              <input value={formUsr.cargo ?? ""} onChange={(e) => setFormUsr((f) => ({ ...f, cargo: e.target.value }))} className={INPUT_CLS} placeholder="Ex: Analista da Qualidade" />
            </Campo>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Campo label="Diretoria">
              <select value={formUsr.diretoria_id ?? ""} onChange={(e) => {
                const dir = diretorias.find((d) => d.id === e.target.value);
                setFormUsr((f) => ({ ...f, diretoria_id: e.target.value, diretoria: dir?.nome ?? "" }));
              }} className={SELECT_CLS}>
                <option value="">Selecione...</option>
                {diretorias.filter((d) => d.status === "ativo").map((d) => (
                  <option key={d.id} value={d.id}>{d.nome}</option>
                ))}
              </select>
            </Campo>
            <Campo label="Setor">
              <select value={formUsr.setor_id ?? ""} onChange={(e) => {
                const set = setores.find((s) => s.id === e.target.value);
                setFormUsr((f) => ({ ...f, setor_id: e.target.value, setor: set?.nome ?? "" }));
              }} className={SELECT_CLS}>
                <option value="">Selecione...</option>
                {setores.filter((s) => s.status === "ativo").map((s) => (
                  <option key={s.id} value={s.id}>{s.nome}</option>
                ))}
              </select>
            </Campo>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Campo label="Perfil de Acesso">
              <select value={formUsr.perfil ?? "Operacional"} onChange={(e) => setFormUsr((f) => ({ ...f, perfil: e.target.value }))} className={SELECT_CLS}>
                {PERFIS_ACESSO.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Campo>
            <Campo label="Status">
              <select value={formUsr.status ?? "ativo"} onChange={(e) => setFormUsr((f) => ({ ...f, status: e.target.value as UsuarioCadastro["status"] }))} className={SELECT_CLS}>
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
                <option value="bloqueado">Bloqueado</option>
              </select>
            </Campo>
          </div>
          {!formUsr.id && (
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-[#2655e8] font-medium">
              Um convite será enviado para o e-mail informado. As permissões individuais podem ser ajustadas após o cadastro.
            </div>
          )}
        </div>
      </Modal>

      {/* ── Modal: Permissões ─────────────────────────────────────────────────── */}
      <Modal
        aberto={modalPerm}
        titulo={`Permissões — ${usrPerm?.nome ?? ""}`}
        onFechar={() => setModalPerm(false)}
        onSalvar={salvarPermissoes}
        largura="max-w-2xl"
      >
        <div>
          <p className="text-xs text-slate-500 mb-5">
            Defina o nível de acesso deste usuário em cada módulo do sistema. As permissões abaixo sobrepõem o perfil padrão.
          </p>
          <div className="space-y-2">
            {/* Header */}
            <div className="grid grid-cols-[1fr_repeat(5,_minmax(0,_1fr))] gap-2 mb-3">
              <div />
              {NIVEIS.map((n) => (
                <div key={n} className="text-center text-[10px] font-black uppercase tracking-wider text-slate-400">
                  {NIVEL_CONFIG[n].label}
                </div>
              ))}
            </div>
            {MODULOS_SISTEMA.map((modulo) => {
              const atual = permEdit[modulo] ?? "sem_acesso";
              return (
                <div key={modulo} className="grid grid-cols-[1fr_repeat(5,_minmax(0,_1fr))] gap-2 items-center py-2.5 px-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                  <span className="text-sm font-bold text-slate-700">{modulo}</span>
                  {NIVEIS.map((nivel) => (
                    <button
                      key={nivel}
                      onClick={() => setPermEdit((p) => ({ ...p, [modulo]: nivel }))}
                      className={`h-8 rounded-lg text-[10px] font-black border transition-all ${
                        atual === nivel
                          ? NIVEL_CONFIG[nivel].cls + " shadow-sm"
                          : "bg-white border-slate-200 text-slate-300 hover:border-slate-300"
                      }`}
                    >
                      {atual === nivel ? "●" : "○"}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
          {/* Legenda */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap gap-2">
            {NIVEIS.map((n) => (
              <span key={n} className={`px-2.5 py-1 rounded-md text-[10px] font-black border ${NIVEL_CONFIG[n].cls}`}>
                {NIVEL_CONFIG[n].label}
              </span>
            ))}
          </div>
        </div>
      </Modal>

      {/* ── Modal: Categoria de Documento ────────────────────────────────────── */}
      <Modal
        aberto={modalCat}
        titulo={formCat.id ? "Editar Categoria" : "Nova Categoria de Documento"}
        onFechar={() => setModalCat(false)}
        onSalvar={salvarCategoria}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Campo label="Sigla *">
              <input value={formCat.sigla ?? ""} onChange={(e) => setFormCat((f) => ({ ...f, sigla: e.target.value.toUpperCase() }))} maxLength={5} className={INPUT_CLS} placeholder="POP" />
            </Campo>
            <div className="col-span-2">
              <Campo label="Nome *">
                <input value={formCat.nome ?? ""} onChange={(e) => setFormCat((f) => ({ ...f, nome: e.target.value }))} className={INPUT_CLS} placeholder="Procedimento Operacional Padrão" />
              </Campo>
            </div>
          </div>
          <Campo label="Descrição">
            <textarea value={formCat.descricao ?? ""} onChange={(e) => setFormCat((f) => ({ ...f, descricao: e.target.value }))} rows={3} className={INPUT_CLS + " resize-none"} placeholder="Breve descrição desta categoria..." />
          </Campo>
          <Campo label="Cor de identificação">
            <div className="flex flex-wrap gap-2 mt-1">
              {PALETA_CORES.map((cor) => (
                <button
                  key={cor}
                  onClick={() => setFormCat((f) => ({ ...f, cor }))}
                  className={`w-8 h-8 rounded-lg shadow-sm border-2 transition-transform hover:scale-110 ${formCat.cor === cor ? "border-slate-800 scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: cor }}
                  title={cor}
                />
              ))}
            </div>
            {formCat.cor && (
              <div className="mt-3 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg shadow-sm" style={{ backgroundColor: formCat.cor }} />
                <span className="text-xs font-mono text-slate-500">{formCat.cor}</span>
                <span className="px-2.5 py-1 rounded-md text-xs font-black text-white" style={{ backgroundColor: formCat.cor }}>
                  {formCat.sigla || "SGL"}
                </span>
              </div>
            )}
          </Campo>
          <Campo label="Status">
            <select value={formCat.status ?? "ativo"} onChange={(e) => setFormCat((f) => ({ ...f, status: e.target.value as "ativo" | "inativo" }))} className={SELECT_CLS}>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </Campo>
        </div>
      </Modal>

    </div>
  );
}
