"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle, CheckCircle2, Clock, FileWarning, HeartHandshake,
  Plus, Search, Settings, X, ChevronRight, MessageSquare,
  User, Calendar, Building2, ShieldCheck, ClipboardList,
  MoreVertical, Eye, Ban, CheckCheck, QrCode, Loader2,
  ArrowRight, AlertCircle, XCircle, FileText, Sparkles,
} from "lucide-react";

// ─── TYPES ───────────────────────────────────────────────────────────────────

type TipoRegistro = "NI" | "NC" | "EL" | "RC" | "MF";

type StatusRegistro =
  | "AGUARDANDO_TRIAGEM"
  | "EM_TRATATIVA"
  | "APROVACAO"
  | "EFICACIA"
  | "CONCLUIDO"
  | "CANCELADO"
  | "SUSPENSO";

type PlanoAcaoItem = {
  id: string;
  acao: string;
  responsavel: string;
  prazo: string;
  status: "PENDENTE" | "EM_ANDAMENTO" | "CONCLUIDO";
};

type HistoricoItem = {
  id: string;
  data: string;
  autor: string;
  acao: string;
  obs?: string;
};

type Registro = {
  id: string;
  codigo: string;
  tipo: TipoRegistro;
  titulo: string;
  descricao: string;
  setor: string;
  dataRegistro: string;
  notificador: string;
  anonimo: boolean;
  status: StatusRegistro;
  responsavel: string;
  prazo: string;
  justificativaRecusa?: string;
  responsavelTratativa?: string;
  ferramentasAnalise: ("ISHIKAWA" | "5PORQUES")[];
  planoAcao: PlanoAcaoItem[];
  historico: HistoricoItem[];
  avaliadorEficacia?: string;
};

// ─── CONSTANTES ──────────────────────────────────────────────────────────────

const TIPO_CONFIG: Record<TipoRegistro, { label: string; cor: string; bg: string; border: string; icon: React.ReactNode }> = {
  NI: { label: "Notif. de Incidente", cor: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200", icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  NC: { label: "Não Conformidade",    cor: "text-violet-700", bg: "bg-violet-50", border: "border-violet-200", icon: <FileWarning className="w-3.5 h-3.5" /> },
  EL: { label: "Elogio",             cor: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", icon: <HeartHandshake className="w-3.5 h-3.5" /> },
  RC: { label: "Reclamação",         cor: "text-rose-700",    bg: "bg-rose-50",    border: "border-rose-200",    icon: <MessageSquare className="w-3.5 h-3.5" /> },
  MF: { label: "Manifestação",       cor: "text-sky-700",     bg: "bg-sky-50",     border: "border-sky-200",     icon: <FileText className="w-3.5 h-3.5" /> },
};

const STATUS_CONFIG: Record<StatusRegistro, { label: string; cls: string }> = {
  AGUARDANDO_TRIAGEM: { label: "Aguardando Triagem", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  EM_TRATATIVA:       { label: "Em Tratativa",       cls: "bg-amber-50 text-amber-700 border-amber-200" },
  APROVACAO:          { label: "Em Aprovação",       cls: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  EFICACIA:           { label: "Aval. Eficácia",     cls: "bg-purple-50 text-purple-700 border-purple-200" },
  CONCLUIDO:          { label: "Concluído",          cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  CANCELADO:          { label: "Cancelado",          cls: "bg-slate-100 text-slate-500 border-slate-200" },
  SUSPENSO:           { label: "Suspenso",           cls: "bg-yellow-50 text-yellow-700 border-yellow-200" },
};

const WORKFLOW_STEPS: { status: StatusRegistro; label: string }[] = [
  { status: "AGUARDANDO_TRIAGEM", label: "Triagem" },
  { status: "EM_TRATATIVA",       label: "Tratativa" },
  { status: "APROVACAO",          label: "Aprovação" },
  { status: "EFICACIA",           label: "Eficácia" },
  { status: "CONCLUIDO",          label: "Concluído" },
];

const SETORES = ["UTI Adulto", "CME", "Farmácia", "Gestão da Qualidade", "Internação", "Centro Cirúrgico", "Pronto Atendimento", "Recepção", "SADT", "Nutrição"];
const USUARIOS = ["Enf. Marina Costa", "Dr. Carlos Lima", "Farm. Ana Pereira", "Deivid Coimbra", "Tyago Alves", "Patricia Reis"];

// ─── MOCK DATA ────────────────────────────────────────────────────────────────

const MOCK: Registro[] = [
  {
    id: "r1", codigo: "NI-0001", tipo: "NI", titulo: "Queda de paciente na UTI",
    descricao: "Paciente encontrado no chão às 03h45. Grade da cama estava baixa.", setor: "UTI Adulto",
    dataRegistro: "03/05/2026", notificador: "Téc. Enfermagem (anônimo)", anonimo: true,
    status: "AGUARDANDO_TRIAGEM", responsavel: "", prazo: "",
    ferramentasAnalise: [], planoAcao: [],
    historico: [{ id: "h1", data: "03/05/2026 08:12", autor: "Sistema", acao: "Registro criado. Código NI-0001 gerado automaticamente." }],
  },
  {
    id: "r2", codigo: "NC-0001", tipo: "NC", titulo: "Documentação incompleta no prontuário",
    descricao: "Auditoria identificou 12 prontuários sem evolução médica no dia anterior.", setor: "Internação",
    dataRegistro: "02/05/2026", notificador: "Auditoria Interna", anonimo: false,
    status: "AGUARDANDO_TRIAGEM", responsavel: "", prazo: "",
    ferramentasAnalise: [], planoAcao: [],
    historico: [{ id: "h1", data: "02/05/2026 14:30", autor: "Sistema", acao: "Registro criado. Código NC-0001 gerado automaticamente." }],
  },
  {
    id: "r3", codigo: "RC-0001", tipo: "RC", titulo: "Tempo de espera excessivo no PA",
    descricao: "Paciente aguardou mais de 4 horas sem atendimento médico.", setor: "Pronto Atendimento",
    dataRegistro: "01/05/2026", notificador: "Paciente (anônimo)", anonimo: true,
    status: "AGUARDANDO_TRIAGEM", responsavel: "", prazo: "",
    ferramentasAnalise: [], planoAcao: [],
    historico: [{ id: "h1", data: "01/05/2026 16:00", autor: "Sistema", acao: "Registro criado. Código RC-0001 gerado automaticamente." }],
  },
  {
    id: "r4", codigo: "NI-0002", tipo: "NI", titulo: "Medicamento errado administrado",
    descricao: "Paciente recebeu dose de heparina diferente da prescrita.", setor: "Farmácia",
    dataRegistro: "28/04/2026", notificador: "Enf. Marina Costa", anonimo: false,
    status: "EM_TRATATIVA", responsavel: "Farm. Ana Pereira", prazo: "10/05/2026",
    ferramentasAnalise: ["ISHIKAWA", "5PORQUES"],
    planoAcao: [
      { id: "pa1", acao: "Revisar protocolo de dupla checagem de medicamentos", responsavel: "Deivid Coimbra", prazo: "07/05/2026", status: "EM_ANDAMENTO" },
      { id: "pa2", acao: "Treinamento da equipe de farmácia", responsavel: "Farm. Ana Pereira", prazo: "12/05/2026", status: "PENDENTE" },
    ],
    historico: [
      { id: "h1", data: "28/04/2026 09:00", autor: "Sistema", acao: "Registro criado." },
      { id: "h2", data: "29/04/2026 10:15", autor: "Deivid Coimbra", acao: "Triagem realizada. Registro assumido.", obs: "Incidente grave. Responsável designado: Farm. Ana Pereira." },
    ],
  },
  {
    id: "r5", codigo: "NC-0002", tipo: "NC", titulo: "Equipamento sem calibração no SADT",
    descricao: "Autoclave do SADT com calibração vencida há 3 meses.", setor: "SADT",
    dataRegistro: "25/04/2026", notificador: "Engenharia Clínica", anonimo: false,
    status: "APROVACAO", responsavel: "Tyago Alves", prazo: "08/05/2026",
    ferramentasAnalise: ["5PORQUES"],
    planoAcao: [
      { id: "pa1", acao: "Enviar equipamento para calibração externa", responsavel: "Engenharia", prazo: "05/05/2026", status: "CONCLUIDO" },
      { id: "pa2", acao: "Implantar controle semestral de calibração", responsavel: "Tyago Alves", prazo: "08/05/2026", status: "EM_ANDAMENTO" },
    ],
    historico: [
      { id: "h1", data: "25/04/2026 11:00", autor: "Sistema", acao: "Registro criado." },
      { id: "h2", data: "26/04/2026 08:30", autor: "Patricia Reis", acao: "Triagem realizada. Registro assumido." },
      { id: "h3", data: "30/04/2026 16:00", autor: "Tyago Alves", acao: "Tratativa concluída. Encaminhado para aprovação." },
    ],
  },
  {
    id: "r6", codigo: "EL-0001", tipo: "EL", titulo: "Excelente atendimento na recepção",
    descricao: "Paciente elogiou atenção e agilidade da equipe de recepção durante admissão.", setor: "Recepção",
    dataRegistro: "30/04/2026", notificador: "Paciente (anônimo)", anonimo: true,
    status: "EM_TRATATIVA", responsavel: "Deivid Coimbra", prazo: "",
    ferramentasAnalise: [],
    planoAcao: [{ id: "pa1", acao: "Compartilhar elogio com a equipe em reunião mensal", responsavel: "Deivid Coimbra", prazo: "10/05/2026", status: "PENDENTE" }],
    historico: [
      { id: "h1", data: "30/04/2026 14:00", autor: "Sistema", acao: "Registro criado." },
      { id: "h2", data: "01/05/2026 09:00", autor: "Deivid Coimbra", acao: "Registro assumido e encaminhado." },
    ],
  },
  {
    id: "r7", codigo: "NI-0003", tipo: "NI", titulo: "Falha na identificação de paciente",
    descricao: "Paciente sem pulseira de identificação levado ao centro cirúrgico.", setor: "Centro Cirúrgico",
    dataRegistro: "20/04/2026", notificador: "Dr. Carlos Lima", anonimo: false,
    status: "CONCLUIDO", responsavel: "Deivid Coimbra", prazo: "30/04/2026",
    ferramentasAnalise: ["ISHIKAWA"],
    planoAcao: [
      { id: "pa1", acao: "Checklist pré-cirúrgico atualizado com verificação de pulseira", responsavel: "Deivid Coimbra", prazo: "25/04/2026", status: "CONCLUIDO" },
    ],
    historico: [
      { id: "h1", data: "20/04/2026", autor: "Sistema", acao: "Registro criado." },
      { id: "h2", data: "21/04/2026", autor: "Patricia Reis", acao: "Triagem assumida." },
      { id: "h3", data: "26/04/2026", autor: "Deivid Coimbra", acao: "Tratativa concluída." },
      { id: "h4", data: "28/04/2026", autor: "Patricia Reis", acao: "Aprovação realizada." },
      { id: "h5", data: "30/04/2026", autor: "Deivid Coimbra", acao: "Eficácia avaliada positivamente. Registro concluído." },
    ],
  },
  {
    id: "r8", codigo: "NC-0003", tipo: "NC", titulo: "Processo de esterilização não seguido",
    descricao: "Instrumental cirúrgico processado sem seguir o POP CME-001.", setor: "CME",
    dataRegistro: "15/04/2026", notificador: "Qualidade", anonimo: false,
    status: "CANCELADO", responsavel: "José Almeida", prazo: "20/04/2026",
    ferramentasAnalise: [], planoAcao: [],
    justificativaRecusa: "Verificado que não houve desvio; notificação foi erro de interpretação do POP.",
    historico: [
      { id: "h1", data: "15/04/2026", autor: "Sistema", acao: "Registro criado." },
      { id: "h2", data: "16/04/2026", autor: "Deivid Coimbra", acao: "Registro cancelado após verificação in loco.", obs: "Não houve desvio real." },
    ],
  },
  {
    id: "r9", codigo: "MF-0001", tipo: "MF", titulo: "Sugestão de nova rota de acesso para cadeirantes",
    descricao: "Familiar de paciente sugere instalação de rampa de acesso no bloco B.", setor: "Recepção",
    dataRegistro: "29/04/2026", notificador: "Familiar (anônimo)", anonimo: true,
    status: "EM_TRATATIVA", responsavel: "Deivid Coimbra", prazo: "20/05/2026",
    ferramentasAnalise: [], planoAcao: [
      { id: "pa1", acao: "Levantar custo de instalação da rampa", responsavel: "Manutenção", prazo: "15/05/2026", status: "PENDENTE" },
    ],
    historico: [
      { id: "h1", data: "29/04/2026", autor: "Sistema", acao: "Registro criado." },
      { id: "h2", data: "30/04/2026", autor: "Deivid Coimbra", acao: "Triagem realizada. Registro assumido." },
    ],
  },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function TipoBadge({ tipo }: { tipo: TipoRegistro }) {
  const cfg = TIPO_CONFIG[tipo];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${cfg.bg} ${cfg.border} ${cfg.cor}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function StatusBadge({ status }: { status: StatusRegistro }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

function statusWorkflowIdx(status: StatusRegistro) {
  return WORKFLOW_STEPS.findIndex((s) => s.status === status);
}

// ─── TIPO SELETOR ─────────────────────────────────────────────────────────────

type BoardTab = "triagem" | "NI" | "NC" | "OUV";
type SubTab = "todos" | "aguardando" | "andamento" | "cancelados";

// ─── MODAIS ───────────────────────────────────────────────────────────────────

function ModalOverlay({ children, onFechar }: { children: React.ReactNode; onFechar: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="relative">{children}</div>
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

export default function OcorrenciasPage() {
  const [registros, setRegistros] = useState<Registro[]>(MOCK);
  const [board, setBoard] = useState<BoardTab>("triagem");
  const [subTab, setSubTab] = useState<SubTab>("todos");
  const [busca, setBusca] = useState("");
  const [aviso, setAviso] = useState<{ msg: string; tipo: "ok" | "erro" } | null>(null);

  // modais
  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const [modalAssumirId, setModalAssumirId] = useState<string | null>(null);
  const [modalRecusarId, setModalRecusarId] = useState<string | null>(null);
  const [detalheId, setDetalheId] = useState<string | null>(null);

  // form novo registro
  const [novoForm, setNovoForm] = useState({ tipo: "NI" as TipoRegistro, titulo: "", descricao: "", setor: SETORES[0], anonimo: false });

  // form assumir
  const [assumirForm, setAssumirForm] = useState({ responsavel: USUARIOS[0], prazo: "" });

  // form recusar
  const [recusarJustificativa, setRecusarJustificativa] = useState("");

  // form plano de ação (no detalhe)
  const [novaAcao, setNovaAcao] = useState({ acao: "", responsavel: USUARIOS[0], prazo: "" });

  function notificar(msg: string, tipo: "ok" | "erro" = "ok") {
    setAviso({ msg, tipo });
    setTimeout(() => setAviso(null), 3500);
  }

  // ── Stats ───────────────────────────────────────────────────────────────────

  const aguardandoTriagem = registros.filter((r) => r.status === "AGUARDANDO_TRIAGEM").length;
  const emTratativa = registros.filter((r) => r.status === "EM_TRATATIVA" || r.status === "APROVACAO").length;
  const concluidos = registros.filter((r) => r.status === "CONCLUIDO").length;

  // ── Actions ─────────────────────────────────────────────────────────────────

  function criarRegistro() {
    if (!novoForm.titulo.trim()) { notificar("Informe o título.", "erro"); return; }
    const seq = registros.filter((r) => r.tipo === novoForm.tipo).length + 1;
    const codigo = `${novoForm.tipo}-${String(seq).padStart(4, "0")}`;
    const novo: Registro = {
      id: `r${Date.now()}`, codigo, tipo: novoForm.tipo,
      titulo: novoForm.titulo, descricao: novoForm.descricao,
      setor: novoForm.setor, dataRegistro: new Date().toLocaleDateString("pt-BR"),
      notificador: novoForm.anonimo ? "Anônimo" : "Usuário atual",
      anonimo: novoForm.anonimo, status: "AGUARDANDO_TRIAGEM",
      responsavel: "", prazo: "", ferramentasAnalise: [], planoAcao: [],
      historico: [{ id: `h${Date.now()}`, data: new Date().toLocaleString("pt-BR"), autor: "Sistema", acao: `Registro criado. Código ${codigo} gerado automaticamente.` }],
    };
    setRegistros((prev) => [novo, ...prev]);
    setModalNovoAberto(false);
    setNovoForm({ tipo: "NI", titulo: "", descricao: "", setor: SETORES[0], anonimo: false });
    notificar(`Registro ${codigo} criado e enviado para triagem.`);
    setBoard("triagem");
  }

  function assumirRegistro() {
    if (!assumirForm.responsavel) { notificar("Selecione o responsável pela tratativa.", "erro"); return; }
    setRegistros((prev) => prev.map((r) => {
      if (r.id !== modalAssumirId) return r;
      return {
        ...r, status: "EM_TRATATIVA" as StatusRegistro,
        responsavel: assumirForm.responsavel,
        prazo: assumirForm.prazo,
        historico: [...r.historico, {
          id: `h${Date.now()}`, data: new Date().toLocaleString("pt-BR"),
          autor: "Deivid Coimbra", acao: "Triagem realizada. Registro assumido.",
          obs: `Responsável pela tratativa: ${assumirForm.responsavel}.${assumirForm.prazo ? ` Prazo: ${assumirForm.prazo}.` : ""}`,
        }],
      };
    }));
    setModalAssumirId(null);
    setAssumirForm({ responsavel: USUARIOS[0], prazo: "" });
    notificar("Registro assumido e enviado para tratativa.");
  }

  function recusarRegistro() {
    if (!recusarJustificativa.trim()) { notificar("A justificativa é obrigatória para recusar.", "erro"); return; }
    setRegistros((prev) => prev.map((r) => {
      if (r.id !== modalRecusarId) return r;
      return {
        ...r, status: "CANCELADO" as StatusRegistro,
        justificativaRecusa: recusarJustificativa,
        historico: [...r.historico, {
          id: `h${Date.now()}`, data: new Date().toLocaleString("pt-BR"),
          autor: "Deivid Coimbra", acao: "Triagem: Registro recusado.",
          obs: recusarJustificativa,
        }],
      };
    }));
    setModalRecusarId(null);
    setRecusarJustificativa("");
    notificar("Registro recusado com justificativa registrada.");
  }

  function adicionarAcao(registroId: string) {
    if (!novaAcao.acao.trim()) { notificar("Descreva a ação.", "erro"); return; }
    setRegistros((prev) => prev.map((r) => {
      if (r.id !== registroId) return r;
      return {
        ...r, planoAcao: [...r.planoAcao, {
          id: `pa${Date.now()}`, acao: novaAcao.acao,
          responsavel: novaAcao.responsavel, prazo: novaAcao.prazo, status: "PENDENTE",
        }],
      };
    }));
    setNovaAcao({ acao: "", responsavel: USUARIOS[0], prazo: "" });
    notificar("Ação adicionada ao plano.");
  }

  function avancarWorkflow(registroId: string) {
    const mapa: Partial<Record<StatusRegistro, StatusRegistro>> = {
      EM_TRATATIVA: "APROVACAO",
      APROVACAO: "EFICACIA",
      EFICACIA: "CONCLUIDO",
    };
    setRegistros((prev) => prev.map((r) => {
      if (r.id !== registroId) return r;
      const proximo = mapa[r.status];
      if (!proximo) return r;
      return {
        ...r, status: proximo,
        historico: [...r.historico, {
          id: `h${Date.now()}`, data: new Date().toLocaleString("pt-BR"),
          autor: "Deivid Coimbra", acao: `Status avançado para: ${STATUS_CONFIG[proximo].label}.`,
        }],
      };
    }));
  }

  // ── Filters ─────────────────────────────────────────────────────────────────

  const triagem = registros.filter((r) => r.status === "AGUARDANDO_TRIAGEM" && r.titulo.toLowerCase().includes(busca.toLowerCase()));

  function registrosPorTipo(tipos: TipoRegistro[], sub: SubTab) {
    let list = registros.filter((r) => tipos.includes(r.tipo) && r.status !== "AGUARDANDO_TRIAGEM");
    if (sub === "aguardando") list = list.filter((r) => r.status === "EM_TRATATIVA");
    if (sub === "andamento")  list = list.filter((r) => r.status === "APROVACAO" || r.status === "EFICACIA");
    if (sub === "cancelados") list = list.filter((r) => r.status === "CANCELADO" || r.status === "SUSPENSO");
    if (sub === "todos")      list = list.filter((r) => !["CANCELADO", "SUSPENSO"].includes(r.status) || true);
    return list.filter((r) => r.titulo.toLowerCase().includes(busca.toLowerCase()) || r.codigo.toLowerCase().includes(busca.toLowerCase()));
  }

  const detalhe = detalheId ? registros.find((r) => r.id === detalheId) ?? null : null;

  // ─── RENDER: HEADER + STATS ───────────────────────────────────────────────

  const INPUT_CLS = "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-[#2655e8] focus:bg-white outline-none transition-colors";
  const SELECT_CLS = "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-[#2655e8] outline-none transition-colors";

  // ─── RENDER: TABELA DE REGISTROS ─────────────────────────────────────────

  function TabelaRegistros({ lista }: { lista: Registro[] }) {
    if (lista.length === 0) return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <ClipboardList className="w-10 h-10 mb-3 opacity-40" />
        <p className="text-sm font-medium">Nenhum registro encontrado.</p>
      </div>
    );
    return (
      <table className="w-full text-sm text-left border-collapse whitespace-nowrap">
        <thead className="bg-white text-[10px] font-black uppercase text-slate-400 tracking-widest border-b sticky top-0 shadow-sm z-10">
          <tr>
            <th className="px-5 py-3">Código</th>
            <th className="px-5 py-3">Título</th>
            <th className="px-5 py-3">Setor</th>
            <th className="px-5 py-3">Responsável</th>
            <th className="px-5 py-3">Prazo</th>
            <th className="px-5 py-3 text-center">Status</th>
            <th className="px-5 py-3 text-right">Ação</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {lista.map((r) => (
            <tr key={r.id} className="hover:bg-[#eef2ff]/30 transition-colors group">
              <td className="px-5 py-3.5">
                <span className={`font-mono font-black text-xs px-2 py-1 rounded-md ${TIPO_CONFIG[r.tipo].bg} ${TIPO_CONFIG[r.tipo].cor}`}>{r.codigo}</span>
              </td>
              <td className="px-5 py-3.5">
                <p className="font-bold text-slate-800 truncate max-w-[220px]">{r.titulo}</p>
                <p className="text-xs text-slate-400 mt-0.5">{r.setor}</p>
              </td>
              <td className="px-5 py-3.5 text-slate-600 font-medium">{r.setor}</td>
              <td className="px-5 py-3.5">
                {r.responsavel
                  ? <span className="flex items-center gap-1.5 text-slate-700 font-medium"><User className="w-3.5 h-3.5 text-slate-400" />{r.responsavel}</span>
                  : <span className="text-slate-300 text-xs">—</span>}
              </td>
              <td className="px-5 py-3.5">
                {r.prazo
                  ? <span className="flex items-center gap-1.5 text-slate-500 text-xs"><Calendar className="w-3 h-3" />{r.prazo}</span>
                  : <span className="text-slate-300 text-xs">—</span>}
              </td>
              <td className="px-5 py-3.5 text-center"><StatusBadge status={r.status} /></td>
              <td className="px-5 py-3.5 text-right">
                <button onClick={() => setDetalheId(r.id)} className="p-2 text-slate-400 hover:text-[#2655e8] hover:bg-[#eef2ff] rounded-lg transition-colors">
                  <Eye className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  // ─── RENDER: BOARD TRIAGEM ────────────────────────────────────────────────

  function BoardTriagem() {
    return (
      <div className="flex flex-col h-full animate-in fade-in">
        <div className="flex items-center justify-between mb-5 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Triagem de Registros</h2>
            <p className="text-sm text-slate-500 mt-0.5">Registros aguardando avaliação da Qualidade. Assuma ou recuse com justificativa.</p>
          </div>
          <span className="px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-black rounded-xl">{triagem.length} aguardando</span>
        </div>

        {triagem.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <CheckCircle2 className="w-12 h-12 mb-3 text-emerald-400 opacity-60" />
            <p className="text-sm font-bold text-slate-600">Fila em dia!</p>
            <p className="text-xs text-slate-400 mt-1">Nenhum registro aguardando triagem.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
            {triagem.map((r) => (
              <div key={r.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div>
                      <span className={`font-mono font-black text-xs px-2.5 py-1.5 rounded-lg block text-center ${TIPO_CONFIG[r.tipo].bg} ${TIPO_CONFIG[r.tipo].cor}`}>
                        {r.codigo}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <TipoBadge tipo={r.tipo} />
                        {r.anonimo && (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-full border border-slate-200">Anônimo</span>
                        )}
                      </div>
                      <p className="font-bold text-slate-900 truncate">{r.titulo}</p>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{r.descricao}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                        <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{r.setor}</span>
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{r.dataRegistro}</span>
                        <span className="flex items-center gap-1"><User className="w-3 h-3" />{r.notificador}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => { setModalAssumirId(r.id); setAssumirForm({ responsavel: USUARIOS[0], prazo: "" }); }}
                      className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
                    >
                      <CheckCheck className="w-3.5 h-3.5" /> Assumir
                    </button>
                    <button
                      onClick={() => { setModalRecusarId(r.id); setRecusarJustificativa(""); }}
                      className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-red-50 border border-red-200 text-red-600 text-xs font-bold rounded-xl transition-colors"
                    >
                      <Ban className="w-3.5 h-3.5" /> Recusar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ─── RENDER: BOARD CATEGORIA ──────────────────────────────────────────────

  function BoardCategoria({ tipos, titulo, descricao }: { tipos: TipoRegistro[]; titulo: string; descricao: string }) {
    const todos   = registrosPorTipo(tipos, "todos");
    const aguard  = registrosPorTipo(tipos, "aguardando");
    const andando = registrosPorTipo(tipos, "andamento");
    const cancel  = registrosPorTipo(tipos, "cancelados");

    const mapa: Record<SubTab, Registro[]> = { todos, aguardando: aguard, andamento: andando, cancelados: cancel };

    const SUBTABS: { key: SubTab; label: string; count: number }[] = [
      { key: "todos",      label: "Todos assumidos", count: todos.length },
      { key: "aguardando", label: "Aguardando tratativa", count: aguard.length },
      { key: "andamento",  label: "Em andamento",    count: andando.length },
      { key: "cancelados", label: "Cancelados / Suspensos", count: cancel.length },
    ];

    return (
      <div className="flex flex-col h-full animate-in fade-in">
        <div className="mb-5 shrink-0">
          <h2 className="text-lg font-bold text-slate-900">{titulo}</h2>
          <p className="text-sm text-slate-500 mt-0.5">{descricao}</p>
        </div>

        {/* Sub-tabs */}
        <div className="flex gap-2 mb-4 shrink-0 overflow-x-auto pb-1">
          {SUBTABS.map((st) => (
            <button
              key={st.key}
              onClick={() => setSubTab(st.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${subTab === st.key ? "bg-[#2655e8] text-white shadow-sm" : "bg-white border border-slate-200 text-slate-600 hover:border-[#2655e8] hover:text-[#2655e8]"}`}
            >
              {st.label}
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${subTab === st.key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                {st.count}
              </span>
            </button>
          ))}
        </div>

        <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-y-auto flex-1 custom-scrollbar">
            <TabelaRegistros lista={mapa[subTab]} />
          </div>
        </div>
      </div>
    );
  }

  // ─── BOARDS CONFIG ────────────────────────────────────────────────────────

  const BOARDS: { key: BoardTab; label: string; icon: React.ReactNode; count?: number; color: string }[] = [
    { key: "triagem", label: "Triagem de Registros", icon: <ClipboardList className="w-4 h-4" />, count: aguardandoTriagem, color: "border-blue-300 bg-blue-50 text-blue-700" },
    { key: "NI",      label: "Notif. de Incidente",  icon: <AlertTriangle className="w-4 h-4" />, count: registros.filter((r) => r.tipo === "NI" && r.status !== "AGUARDANDO_TRIAGEM").length, color: "border-orange-300 bg-orange-50 text-orange-700" },
    { key: "NC",      label: "Não Conformidades",    icon: <FileWarning className="w-4 h-4" />,   count: registros.filter((r) => r.tipo === "NC" && r.status !== "AGUARDANDO_TRIAGEM").length, color: "border-violet-300 bg-violet-50 text-violet-700" },
    { key: "OUV",     label: "Ouvidoria",            icon: <HeartHandshake className="w-4 h-4" />, count: registros.filter((r) => ["EL", "RC", "MF"].includes(r.tipo) && r.status !== "AGUARDANDO_TRIAGEM").length, color: "border-rose-300 bg-rose-50 text-rose-700" },
  ];

  // ─── RENDER DETALHE (slide-over) ─────────────────────────────────────────

  function SlideDetalhe() {
    if (!detalhe) return null;
    const stepIdx = statusWorkflowIdx(detalhe.status);
    const podeAvancar = ["EM_TRATATIVA", "APROVACAO", "EFICACIA"].includes(detalhe.status);

    return (
      <div className="fixed inset-0 z-40 flex justify-end">
        <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={() => setDetalheId(null)} />
        <div className="relative w-full max-w-2xl bg-white shadow-2xl flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100 shrink-0">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`font-mono font-black text-sm px-2.5 py-1 rounded-lg ${TIPO_CONFIG[detalhe.tipo].bg} ${TIPO_CONFIG[detalhe.tipo].cor}`}>{detalhe.codigo}</span>
                <TipoBadge tipo={detalhe.tipo} />
              </div>
              <h2 className="text-base font-bold text-slate-900 mt-1">{detalhe.titulo}</h2>
            </div>
            <button onClick={() => setDetalheId(null)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {/* Workflow timeline */}
            <div className="px-6 py-4 border-b border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Workflow</p>
              <div className="flex items-center gap-1">
                {WORKFLOW_STEPS.map((step, i) => {
                  const done = i <= stepIdx;
                  const current = i === stepIdx;
                  return (
                    <React.Fragment key={step.status}>
                      <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-black border-2 transition-all ${current ? "bg-[#2655e8] text-white border-[#2655e8]" : done ? "bg-[#eef2ff] text-[#2655e8] border-[#c7d2fe]" : "bg-white text-slate-300 border-slate-200"}`}>
                        {done && !current ? <CheckCheck className="w-3.5 h-3.5" /> : i + 1}
                      </div>
                      <div className="flex-1 flex flex-col items-center">
                        <div className={`h-0.5 w-full ${i < stepIdx ? "bg-[#2655e8]" : "bg-slate-200"}`} />
                        <p className={`text-[9px] font-bold mt-1 ${current ? "text-[#2655e8]" : done ? "text-slate-500" : "text-slate-300"}`}>{step.label}</p>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* Info do registro */}
            <div className="px-6 py-4 border-b border-slate-100 grid grid-cols-2 gap-4">
              <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Setor</p><p className="text-sm font-bold text-slate-700">{detalhe.setor}</p></div>
              <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Data do Registro</p><p className="text-sm font-bold text-slate-700">{detalhe.dataRegistro}</p></div>
              <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Notificador</p><p className="text-sm font-bold text-slate-700">{detalhe.notificador}</p></div>
              <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Responsável Tratativa</p><p className="text-sm font-bold text-slate-700">{detalhe.responsavel || "—"}</p></div>
              {detalhe.prazo && <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Prazo</p><p className="text-sm font-bold text-slate-700">{detalhe.prazo}</p></div>}
              {detalhe.ferramentasAnalise.length > 0 && (
                <div className="col-span-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ferramentas de Análise</p>
                  <div className="flex gap-2">
                    {detalhe.ferramentasAnalise.map((f) => (
                      <span key={f} className="px-2.5 py-1 bg-violet-50 border border-violet-200 text-violet-700 text-xs font-bold rounded-lg">{f === "ISHIKAWA" ? "Diagrama de Ishikawa" : "5 Porquês"}</span>
                    ))}
                  </div>
                </div>
              )}
              <div className="col-span-2"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Descrição</p><p className="text-sm text-slate-600 leading-relaxed">{detalhe.descricao}</p></div>
            </div>

            {/* Plano de ação */}
            <div className="px-6 py-4 border-b border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Plano de Ação</p>
              {detalhe.planoAcao.length > 0 ? (
                <div className="space-y-2 mb-4">
                  {detalhe.planoAcao.map((pa) => (
                    <div key={pa.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${pa.status === "CONCLUIDO" ? "bg-emerald-500" : pa.status === "EM_ANDAMENTO" ? "bg-amber-500" : "bg-slate-300"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800">{pa.acao}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{pa.responsavel} · {pa.prazo || "Sem prazo"}</p>
                      </div>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${pa.status === "CONCLUIDO" ? "bg-emerald-50 text-emerald-700" : pa.status === "EM_ANDAMENTO" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500"}`}>
                        {pa.status === "CONCLUIDO" ? "Concluído" : pa.status === "EM_ANDAMENTO" ? "Em andamento" : "Pendente"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-slate-400 mb-4">Nenhuma ação cadastrada.</p>}

              {["EM_TRATATIVA", "APROVACAO"].includes(detalhe.status) && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Nova Ação</p>
                  <input value={novaAcao.acao} onChange={(e) => setNovaAcao((f) => ({ ...f, acao: e.target.value }))} className={INPUT_CLS} placeholder="Descreva a ação..." />
                  <div className="grid grid-cols-2 gap-3">
                    <select value={novaAcao.responsavel} onChange={(e) => setNovaAcao((f) => ({ ...f, responsavel: e.target.value }))} className={SELECT_CLS}>
                      {USUARIOS.map((u) => <option key={u}>{u}</option>)}
                    </select>
                    <input type="date" value={novaAcao.prazo} onChange={(e) => setNovaAcao((f) => ({ ...f, prazo: e.target.value }))} className={INPUT_CLS} />
                  </div>
                  <button onClick={() => adicionarAcao(detalhe.id)} className="w-full py-2 bg-[#2655e8] text-white text-xs font-bold rounded-xl hover:bg-[#1e40af] transition-colors">
                    + Adicionar Ação
                  </button>
                </div>
              )}
            </div>

            {/* Histórico */}
            <div className="px-6 py-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Histórico</p>
              <div className="space-y-3">
                {detalhe.historico.map((h) => (
                  <div key={h.id} className="flex gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#2655e8] mt-1.5 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-slate-700">{h.acao}</p>
                      {h.obs && <p className="text-xs text-slate-500 mt-0.5 italic">"{h.obs}"</p>}
                      <p className="text-[10px] text-slate-400 mt-1">{h.data} · {h.autor}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer com ações do workflow */}
          {podeAvancar && (
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 shrink-0 flex justify-between items-center">
              <p className="text-xs text-slate-500">Avançar para o próximo estágio do workflow:</p>
              <button
                onClick={() => { avancarWorkflow(detalhe.id); setDetalheId(null); notificar("Registro avançado no workflow."); }}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#2655e8] text-white text-sm font-bold rounded-xl hover:bg-[#1e40af] transition-colors shadow-sm"
              >
                Avançar <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── RENDER PRINCIPAL ─────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-slate-50/50">

      {/* Toast */}
      {aviso && (
        <div className={`fixed right-6 top-6 z-50 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold shadow-lg ${aviso.tipo === "ok" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"}`}>
          {aviso.tipo === "ok" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {aviso.msg}
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Ocorrências & Eventos</h1>
          <p className="text-sm text-slate-500 mt-0.5">Gestão de incidentes, não conformidades e ouvidoria com workflow integrado.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar registros..." className="pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#2655e8] w-56 shadow-sm" />
          </div>
          <button onClick={() => setModalNovoAberto(true)} className="flex items-center gap-2 px-4 py-2.5 bg-[#2655e8] text-white rounded-xl text-sm font-bold shadow-md hover:bg-[#1e40af] transition-all">
            <Plus className="w-4 h-4" /> Novo Registro
          </button>
          <Link href="/ocorrencias/configuracoes" className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:border-[#2655e8] hover:text-[#2655e8] transition-all">
            <Settings className="w-4 h-4" /> Configurações
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="px-8 py-4 grid grid-cols-4 gap-4 shrink-0">
        {[
          { label: "Total de Registros", value: registros.length, icon: <ClipboardList className="w-5 h-5" />, cor: "text-slate-600", bg: "bg-slate-100" },
          { label: "Aguardando Triagem", value: aguardandoTriagem, icon: <Clock className="w-5 h-5" />, cor: "text-blue-600", bg: "bg-blue-50" },
          { label: "Em Tratativa / Aprovação", value: emTratativa, icon: <AlertCircle className="w-5 h-5" />, cor: "text-amber-600", bg: "bg-amber-50" },
          { label: "Concluídos", value: concluidos, icon: <CheckCircle2 className="w-5 h-5" />, cor: "text-emerald-600", bg: "bg-emerald-50" },
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

      {/* Board selector */}
      <div className="px-8 flex gap-3 shrink-0 pb-2">
        {BOARDS.map((b) => (
          <button
            key={b.key}
            onClick={() => { setBoard(b.key); setSubTab("todos"); }}
            className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl text-sm font-bold border-2 transition-all ${board === b.key ? b.color + " shadow-sm" : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"}`}
          >
            {b.icon} {b.label}
            {b.count !== undefined && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${board === b.key ? "bg-white/40" : "bg-slate-100 text-slate-500"}`}>{b.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Board content */}
      <div className="flex-1 px-8 pb-8 overflow-hidden flex flex-col min-h-0 pt-2">
        {board === "triagem" && <BoardTriagem />}
        {board === "NI"  && <BoardCategoria tipos={["NI"]} titulo="Notificações de Incidente" descricao="Registros de incidentes e eventos sentinela após triagem." />}
        {board === "NC"  && <BoardCategoria tipos={["NC"]} titulo="Não Conformidades" descricao="Desvios de processo, documento, treinamento e outros." />}
        {board === "OUV" && <BoardCategoria tipos={["EL", "RC", "MF"]} titulo="Ouvidoria — Elogios, Reclamações e Manifestações" descricao="Registros de ouvidoria com classificação por tipo." />}
      </div>

      {/* ── Modal: Novo Registro ──────────────────────────────────────────── */}
      {modalNovoAberto && (
        <ModalOverlay onFechar={() => setModalNovoAberto(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">Novo Registro</h3>
              <button onClick={() => setModalNovoAberto(false)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Tipo de Registro *</label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(TIPO_CONFIG) as TipoRegistro[]).map((t) => {
                    const cfg = TIPO_CONFIG[t];
                    return (
                      <button key={t} onClick={() => setNovoForm((f) => ({ ...f, tipo: t }))}
                        className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border-2 text-xs font-bold transition-all ${novoForm.tipo === t ? `${cfg.bg} ${cfg.border} ${cfg.cor}` : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"}`}>
                        <span className={novoForm.tipo === t ? cfg.cor : "text-slate-400"}>{cfg.icon}</span>
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Título *</label>
                <input value={novoForm.titulo} onChange={(e) => setNovoForm((f) => ({ ...f, titulo: e.target.value }))} className={INPUT_CLS} placeholder="Descreva brevemente o ocorrido..." />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Detalhes</label>
                <textarea value={novoForm.descricao} onChange={(e) => setNovoForm((f) => ({ ...f, descricao: e.target.value }))} rows={3} className={INPUT_CLS + " resize-none"} placeholder="Informações adicionais relevantes..." />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Setor</label>
                <select value={novoForm.setor} onChange={(e) => setNovoForm((f) => ({ ...f, setor: e.target.value }))} className={SELECT_CLS}>
                  {SETORES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={novoForm.anonimo} onChange={(e) => setNovoForm((f) => ({ ...f, anonimo: e.target.checked }))} className="w-4 h-4 accent-[#2655e8]" />
                <div>
                  <p className="text-sm font-bold text-slate-700">Registro Anônimo</p>
                  <p className="text-xs text-slate-400">Sua identidade não será revelada.</p>
                </div>
              </label>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
              <button onClick={() => setModalNovoAberto(false)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl">Cancelar</button>
              <button onClick={criarRegistro} className="flex items-center gap-2 px-5 py-2 bg-[#2655e8] text-white text-sm font-bold rounded-xl hover:bg-[#1e40af] shadow-sm">
                <ChevronRight className="w-4 h-4" /> Enviar para Triagem
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* ── Modal: Assumir ────────────────────────────────────────────────── */}
      {modalAssumirId && (() => {
        const reg = registros.find((r) => r.id === modalAssumirId);
        return reg ? (
          <ModalOverlay onFechar={() => setModalAssumirId(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-black text-slate-900">Assumir Registro</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{reg.codigo} · {reg.titulo}</p>
                </div>
                <button onClick={() => setModalAssumirId(null)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"><X className="w-4 h-4" /></button>
              </div>
              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Responsável pela Tratativa *</label>
                  <select value={assumirForm.responsavel} onChange={(e) => setAssumirForm((f) => ({ ...f, responsavel: e.target.value }))} className={SELECT_CLS}>
                    {USUARIOS.map((u) => <option key={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Prazo para Tratativa</label>
                  <input type="date" value={assumirForm.prazo} onChange={(e) => setAssumirForm((f) => ({ ...f, prazo: e.target.value }))} className={INPUT_CLS} />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
                <button onClick={() => setModalAssumirId(null)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl">Cancelar</button>
                <button onClick={assumirRegistro} className="flex items-center gap-2 px-5 py-2 bg-emerald-500 text-white text-sm font-bold rounded-xl hover:bg-emerald-600 shadow-sm">
                  <CheckCheck className="w-4 h-4" /> Confirmar Assumir
                </button>
              </div>
            </div>
          </ModalOverlay>
        ) : null;
      })()}

      {/* ── Modal: Recusar ────────────────────────────────────────────────── */}
      {modalRecusarId && (() => {
        const reg = registros.find((r) => r.id === modalRecusarId);
        return reg ? (
          <ModalOverlay onFechar={() => setModalRecusarId(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-black text-slate-900">Recusar Registro</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{reg.codigo} · {reg.titulo}</p>
                </div>
                <button onClick={() => setModalRecusarId(null)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"><X className="w-4 h-4" /></button>
              </div>
              <div className="px-6 py-5">
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl mb-4 text-xs text-red-700 font-medium">
                  A justificativa é obrigatória para recusar um registro e ficará registrada no histórico.
                </div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Justificativa *</label>
                <textarea value={recusarJustificativa} onChange={(e) => setRecusarJustificativa(e.target.value)} rows={4} className={INPUT_CLS + " resize-none"} placeholder="Descreva o motivo da recusa..." />
              </div>
              <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
                <button onClick={() => setModalRecusarId(null)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl">Cancelar</button>
                <button onClick={recusarRegistro} className="flex items-center gap-2 px-5 py-2 bg-red-500 text-white text-sm font-bold rounded-xl hover:bg-red-600 shadow-sm">
                  <Ban className="w-4 h-4" /> Confirmar Recusa
                </button>
              </div>
            </div>
          </ModalOverlay>
        ) : null;
      })()}

      {/* ── Slide-over: Detalhe do Registro ──────────────────────────────── */}
      <SlideDetalhe />
    </div>
  );
}
