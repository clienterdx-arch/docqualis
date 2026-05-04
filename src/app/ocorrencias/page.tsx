"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle, CheckCircle2, Clock, FileWarning, HeartHandshake,
  Plus, Search, Settings, X, ChevronRight, MessageSquare,
  User, Calendar, Building2, ClipboardList,
  Eye, Ban, CheckCheck,
  ArrowRight, AlertCircle, FileText,
} from "lucide-react";

import {
  Registro, TipoRegistro, StatusRegistro, PlanoAcaoItem,
  TIPO_CONFIG, STATUS_CONFIG, SETORES, USUARIOS,
} from "@/lib/ocorrencias";
import { supabase } from "@/lib/supabase";
import { carregarPerfilUsuario } from "@/lib/perfil";

// ─── CONSTANTES ──────────────────────────────────────────────────────────────

const WORKFLOW_STEPS: { status: StatusRegistro; label: string }[] = [
  { status: "AGUARDANDO_TRIAGEM", label: "Triagem" },
  { status: "EM_TRATATIVA",       label: "Tratativa" },
  { status: "APROVACAO",          label: "Aprovação" },
  { status: "EFICACIA",           label: "Eficácia" },
  { status: "CONCLUIDO",          label: "Concluído" },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function notificadorDisplay(r: Registro): string {
  if (r.anonimo) return "Anônimo";
  return r.notificadorNome || "—";
}

function resumoDescricao(descricao: string, max = 80): string {
  if (!descricao) return "Sem descrição";
  return descricao.length > max ? descricao.slice(0, max) + "…" : descricao;
}

function TipoBadge({ tipo }: { tipo: TipoRegistro }) {
  const cfg = TIPO_CONFIG[tipo];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${cfg.bg} ${cfg.border} ${cfg.cor}`}>
      {cfg.label}
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

// ─── TIPOS DE ABA ─────────────────────────────────────────────────────────────

type BoardTab = "triagem" | "NI" | "NC" | "OUV";
type SubTab = "todos" | "aguardando" | "andamento" | "cancelados";
type PerfilOcorrencias = { empresa_id?: string | null; nome?: string | null };
type DbRow = Record<string, unknown>;

function isObject(value: unknown): value is DbRow {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function textValue(row: DbRow, key: string, fallback = "") {
  const value = row[key];
  return typeof value === "string" ? value : fallback;
}

function arrayValue<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function normalizeStatusRegistro(value: string): StatusRegistro {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, "_");
  const allowed: StatusRegistro[] = [
    "AGUARDANDO_TRIAGEM",
    "EM_TRATATIVA",
    "APROVACAO",
    "EFICACIA",
    "CONCLUIDO",
    "CANCELADO",
    "SUSPENSO",
  ];
  return allowed.includes(normalized as StatusRegistro)
    ? (normalized as StatusRegistro)
    : "AGUARDANDO_TRIAGEM";
}

function normalizeTipoRegistro(value: string): TipoRegistro {
  const normalized = value.toUpperCase();
  return normalized === "NC" || normalized === "EL" || normalized === "RC" || normalized === "MF"
    ? normalized
    : "NI";
}

function buildEmptyRegistro(): Registro {
  return {
    id: "",
    codigo: "",
    tipo: "NI",
    status: "AGUARDANDO_TRIAGEM",
    prioridade: "MEDIA",
    dataRegistro: "",
    origem: "FORMULARIO",
    dataOcorrencia: "",
    periodo: "DIURNO",
    anonimo: false,
    notificadorNome: "",
    notificadorCargo: "",
    notificadorSetor: "",
    notificadorEmail: "",
    setorOcorrencia: "",
    descricao: "",
    envolvePaciente: false,
    pacienteNome: "",
    pacienteAtendimento: "",
    pacienteConsequencias: "",
    acaoImediata: "",
    dataClassificacao: "",
    classificacaoNQSP: "",
    gravidade: "LEVE",
    classificacaoDesfecho: "",
    categoriaNotiVisa: "",
    numeroNotivisa: "",
    linkNotivisa: "",
    quebraAcordo: "",
    trativaSugerida: "",
    tipoAcao: "",
    unidadeResponsavel: "",
    responsavelTratativa: "",
    prazoTratativa: "",
    ferramentasAnalise: [],
    planoAcao: [],
    historico: [],
  };
}

function mapRegistroDb(row: DbRow): Registro {
  const dados = isObject(row.dados) ? row.dados : {};
  return {
    ...buildEmptyRegistro(),
    ...dados,
    id: textValue(row, "id", textValue(dados, "id")),
    codigo: textValue(row, "numero", textValue(dados, "codigo")),
    tipo: normalizeTipoRegistro(textValue(dados, "tipo")),
    status: normalizeStatusRegistro(textValue(row, "status", textValue(dados, "status"))),
    dataRegistro: textValue(row, "data_preenchimento", textValue(dados, "dataRegistro")),
    historico: arrayValue<Registro["historico"][number]>(row.historico).length
      ? arrayValue<Registro["historico"][number]>(row.historico)
      : arrayValue<Registro["historico"][number]>(dados.historico),
    planoAcao: arrayValue<PlanoAcaoItem>(dados.planoAcao),
  } as Registro;
}

function registroDadosPayload(registro: Registro) {
  return {
    ...registro,
    id: undefined,
    codigo: registro.codigo,
  };
}

// ─── MODAL OVERLAY ────────────────────────────────────────────────────────────

function ModalOverlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="relative">{children}</div>
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

export default function OcorrenciasPage() {
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [usuarioNome, setUsuarioNome] = useState("Usuário");
  const [isLoading, setIsLoading] = useState(true);
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
  const [novoForm, setNovoForm] = useState({
    tipo: "NI" as TipoRegistro,
    descricao: "",
    setorOcorrencia: SETORES[0],
    dataOcorrencia: "",
    periodo: "DIURNO" as "DIURNO" | "VESPERTINO" | "NOTURNO",
    anonimo: false,
    notificadorNome: "",
    notificadorCargo: "",
  });

  // form assumir
  const [assumirForm, setAssumirForm] = useState({ responsavel: USUARIOS[0], prazo: "" });

  // form recusar
  const [recusarJustificativa, setRecusarJustificativa] = useState("");

  // form nova ação (no detalhe)
  const [novaAcao, setNovaAcao] = useState({ acao: "", responsavel: USUARIOS[0], prazo: "" });

  function notificar(msg: string, tipo: "ok" | "erro" = "ok") {
    setAviso({ msg, tipo });
    setTimeout(() => setAviso(null), 3500);
  }

  async function carregarRegistros(empresaAtualId: string) {
    setIsLoading(true);

    const { data, error } = await supabase
      .from("registros_preenchidos")
      .select("*")
      .eq("empresa_id", empresaAtualId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      setRegistros([]);
      notificar("Não foi possível carregar ocorrências reais do banco.", "erro");
    } else {
      setRegistros((data ?? []).map((row) => mapRegistroDb(row as DbRow)));
    }

    setIsLoading(false);
  }

  useEffect(() => {
    let ativo = true;

    async function init() {
      setIsLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();

      if (!ativo) return;
      if (!sessionData.session) {
        setRegistros([]);
        setIsLoading(false);
        return;
      }

      const perfil = await carregarPerfilUsuario<PerfilOcorrencias>(
        sessionData.session,
        "empresa_id, nome"
      );

      if (!ativo) return;
      if (!perfil?.empresa_id) {
        setRegistros([]);
        setIsLoading(false);
        notificar("Não foi possível identificar a empresa do usuário.", "erro");
        return;
      }

      setEmpresaId(perfil.empresa_id);
      setUsuarioNome(perfil.nome ?? "Usuário");
      await carregarRegistros(perfil.empresa_id);
    }

    void init();

    return () => {
      ativo = false;
    };
  }, []);

  // ── Stats ───────────────────────────────────────────────────────────────────

  const aguardandoTriagem = registros.filter((r) => r.status === "AGUARDANDO_TRIAGEM").length;
  const emTratativa = registros.filter((r) => r.status === "EM_TRATATIVA" || r.status === "APROVACAO").length;
  const concluidos = registros.filter((r) => r.status === "CONCLUIDO").length;

  // ── Actions ─────────────────────────────────────────────────────────────────

  async function salvarRegistro(registro: Registro) {
    if (!empresaId) return false;

    const { error } = await supabase
      .from("registros_preenchidos")
      .update({
        status: registro.status,
        dados: registroDadosPayload(registro),
        snapshot: registroDadosPayload(registro),
        historico: registro.historico,
        updated_at: new Date().toISOString(),
      })
      .eq("empresa_id", empresaId)
      .eq("id", registro.id);

    if (error) {
      notificar("Não foi possível salvar a ocorrência no banco.", "erro");
      return false;
    }

    return true;
  }

  async function criarRegistro() {
    if (!novoForm.descricao.trim()) { notificar("Descreva o ocorrido.", "erro"); return; }
    if (!empresaId) { notificar("Não foi possível identificar a empresa do usuário.", "erro"); return; }
    const seq = registros.filter((r) => r.tipo === novoForm.tipo).length + 1;
    const codigo = `${novoForm.tipo}-${String(seq).padStart(4, "0")}`;
    const hoje = new Date().toLocaleDateString("pt-BR");
    const agora = new Date().toLocaleString("pt-BR");

    const novo: Registro = {
      id: `r${Date.now()}`,
      codigo,
      tipo: novoForm.tipo,
      status: "AGUARDANDO_TRIAGEM",
      prioridade: "MEDIA",
      dataRegistro: hoje,
      origem: "FORMULARIO",
      dataOcorrencia: novoForm.dataOcorrencia || hoje,
      periodo: novoForm.periodo,
      anonimo: novoForm.anonimo,
      notificadorNome: novoForm.anonimo ? "" : novoForm.notificadorNome,
      notificadorCargo: novoForm.anonimo ? "" : novoForm.notificadorCargo,
      notificadorSetor: "",
      notificadorEmail: "",
      setorOcorrencia: novoForm.setorOcorrencia,
      descricao: novoForm.descricao,
      envolvePaciente: false,
      pacienteNome: "", pacienteAtendimento: "", pacienteConsequencias: "", acaoImediata: "",
      dataClassificacao: "", classificacaoNQSP: "", gravidade: "LEVE",
      classificacaoDesfecho: "", categoriaNotiVisa: "", numeroNotivisa: "", linkNotivisa: "",
      quebraAcordo: "", trativaSugerida: "", tipoAcao: "", unidadeResponsavel: "",
      responsavelTratativa: "", prazoTratativa: "",
      ferramentasAnalise: [], planoAcao: [],
      historico: [{ id: `h${Date.now()}`, data: agora, autor: usuarioNome, acao: `Registro criado. Código ${codigo} gerado automaticamente.` }],
    };

    const { data, error } = await supabase
      .from("registros_preenchidos")
      .insert({
        empresa_id: empresaId,
        numero: codigo,
        preenchido_por: usuarioNome,
        status: novo.status,
        dados: registroDadosPayload(novo),
        snapshot: registroDadosPayload(novo),
        historico: novo.historico,
        risk_score: 0,
      })
      .select("*")
      .single();

    if (error) {
      notificar("Não foi possível criar a ocorrência no banco.", "erro");
      return;
    }

    const registroCriado = mapRegistroDb(data as DbRow);
    setRegistros((prev) => [registroCriado, ...prev]);
    setModalNovoAberto(false);
    setNovoForm({ tipo: "NI", descricao: "", setorOcorrencia: SETORES[0], dataOcorrencia: "", periodo: "DIURNO", anonimo: false, notificadorNome: "", notificadorCargo: "" });
    notificar(`Registro ${codigo} criado e enviado para triagem.`);
    setBoard("triagem");
  }

  async function assumirRegistro() {
    if (!assumirForm.responsavel) { notificar("Selecione o responsável.", "erro"); return; }
    const atual = registros.find((r) => r.id === modalAssumirId);
    if (!atual) return;
    const atualizado: Registro = {
      ...atual,
      status: "EM_TRATATIVA" as StatusRegistro,
      responsavelTratativa: assumirForm.responsavel,
      prazoTratativa: assumirForm.prazo,
      historico: [...atual.historico, {
        id: `h${Date.now()}`, data: new Date().toLocaleString("pt-BR"),
        autor: usuarioNome, acao: "Triagem realizada. Registro assumido.",
        obs: `Responsável: ${assumirForm.responsavel}.${assumirForm.prazo ? ` Prazo: ${assumirForm.prazo}.` : ""}`,
      }],
    };
    if (!(await salvarRegistro(atualizado))) return;
    setRegistros((prev) => prev.map((r) => r.id === atualizado.id ? atualizado : r));
    setModalAssumirId(null);
    setAssumirForm({ responsavel: USUARIOS[0], prazo: "" });
    notificar("Registro assumido e enviado para tratativa.");
    return;
    setRegistros((prev) => prev.map((r) => {
      if (r.id !== modalAssumirId) return r;
      return {
        ...r,
        status: "EM_TRATATIVA" as StatusRegistro,
        responsavelTratativa: assumirForm.responsavel,
        prazoTratativa: assumirForm.prazo,
        historico: [...r.historico, {
          id: `h${Date.now()}`, data: new Date().toLocaleString("pt-BR"),
          autor: usuarioNome, acao: "Triagem realizada. Registro assumido.",
          obs: `Responsável: ${assumirForm.responsavel}.${assumirForm.prazo ? ` Prazo: ${assumirForm.prazo}.` : ""}`,
        }],
      };
    }));
    setModalAssumirId(null);
    setAssumirForm({ responsavel: USUARIOS[0], prazo: "" });
    notificar("Registro assumido e enviado para tratativa.");
  }

  async function recusarRegistro() {
    if (!recusarJustificativa.trim()) { notificar("A justificativa é obrigatória.", "erro"); return; }
    const atual = registros.find((r) => r.id === modalRecusarId);
    if (!atual) return;
    const atualizado: Registro = {
      ...atual,
      status: "CANCELADO" as StatusRegistro,
      justificativaRecusa: recusarJustificativa,
      historico: [...atual.historico, {
        id: `h${Date.now()}`, data: new Date().toLocaleString("pt-BR"),
        autor: usuarioNome, acao: "Triagem: Registro recusado.",
        obs: recusarJustificativa,
      }],
    };
    if (!(await salvarRegistro(atualizado))) return;
    setRegistros((prev) => prev.map((r) => r.id === atualizado.id ? atualizado : r));
    setModalRecusarId(null);
    setRecusarJustificativa("");
    notificar("Registro recusado com justificativa.");
    return;
    setRegistros((prev) => prev.map((r) => {
      if (r.id !== modalRecusarId) return r;
      return {
        ...r,
        status: "CANCELADO" as StatusRegistro,
        justificativaRecusa: recusarJustificativa,
        historico: [...r.historico, {
          id: `h${Date.now()}`, data: new Date().toLocaleString("pt-BR"),
          autor: usuarioNome, acao: "Triagem: Registro recusado.",
          obs: recusarJustificativa,
        }],
      };
    }));
    setModalRecusarId(null);
    setRecusarJustificativa("");
    notificar("Registro recusado com justificativa.");
  }

  async function adicionarAcao(registroId: string) {
    if (!novaAcao.acao.trim()) { notificar("Descreva a ação.", "erro"); return; }
    const atual = registros.find((r) => r.id === registroId);
    if (!atual) return;
    const item: PlanoAcaoItem = {
      id: `pa${Date.now()}`,
      acao: novaAcao.acao,
      responsavel: novaAcao.responsavel,
      prazo: novaAcao.prazo,
      status: "PENDENTE",
    };
    const atualizado: Registro = { ...atual, planoAcao: [...atual.planoAcao, item] };
    if (!(await salvarRegistro(atualizado))) return;
    setRegistros((prev) => prev.map((r) => r.id === atualizado.id ? atualizado : r));
    setNovaAcao({ acao: "", responsavel: USUARIOS[0], prazo: "" });
    notificar("Ação adicionada ao plano.");
    return;
    setRegistros((prev) => prev.map((r) => {
      if (r.id !== registroId) return r;
      const item: PlanoAcaoItem = {
        id: `pa${Date.now()}`, acao: novaAcao.acao,
        responsavel: novaAcao.responsavel, prazo: novaAcao.prazo, status: "PENDENTE",
      };
      return { ...r, planoAcao: [...r.planoAcao, item] };
    }));
    setNovaAcao({ acao: "", responsavel: USUARIOS[0], prazo: "" });
    notificar("Ação adicionada ao plano.");
  }

  async function avancarWorkflow(registroId: string) {
    const mapa: Partial<Record<StatusRegistro, StatusRegistro>> = {
      EM_TRATATIVA: "APROVACAO",
      APROVACAO: "EFICACIA",
      EFICACIA: "CONCLUIDO",
    };
    const atual = registros.find((r) => r.id === registroId);
    const proximoAtual = atual ? mapa[atual.status] : null;
    if (!atual || !proximoAtual) return;
    const atualizado: Registro = {
      ...atual,
      status: proximoAtual,
      historico: [...atual.historico, {
        id: `h${Date.now()}`, data: new Date().toLocaleString("pt-BR"),
        autor: usuarioNome, acao: `Status avançado para: ${STATUS_CONFIG[proximoAtual].label}.`,
      }],
    };
    if (!(await salvarRegistro(atualizado))) return;
    setRegistros((prev) => prev.map((r) => r.id === atualizado.id ? atualizado : r));
    return;
    setRegistros((prev) => prev.map((r) => {
      if (r.id !== registroId) return r;
      const proximo = mapa[r.status];
      if (!proximo) return r;
      return {
        ...r, status: proximo,
        historico: [...r.historico, {
          id: `h${Date.now()}`, data: new Date().toLocaleString("pt-BR"),
          autor: usuarioNome, acao: `Status avançado para: ${STATUS_CONFIG[proximo].label}.`,
        }],
      };
    }));
  }

  // ── Filtros ──────────────────────────────────────────────────────────────────

  const buscaLC = busca.toLowerCase();
  const matchBusca = (r: Registro) =>
    r.descricao.toLowerCase().includes(buscaLC) ||
    r.codigo.toLowerCase().includes(buscaLC) ||
    r.setorOcorrencia.toLowerCase().includes(buscaLC);

  const triagem = registros.filter((r) => r.status === "AGUARDANDO_TRIAGEM" && matchBusca(r));

  function registrosPorTipo(tipos: TipoRegistro[], sub: SubTab) {
    let list = registros.filter((r) => tipos.includes(r.tipo) && r.status !== "AGUARDANDO_TRIAGEM");
    if (sub === "aguardando") list = list.filter((r) => r.status === "EM_TRATATIVA");
    if (sub === "andamento")  list = list.filter((r) => r.status === "APROVACAO" || r.status === "EFICACIA");
    if (sub === "cancelados") list = list.filter((r) => r.status === "CANCELADO" || r.status === "SUSPENSO");
    return list.filter(matchBusca);
  }

  const detalhe = detalheId ? registros.find((r) => r.id === detalheId) ?? null : null;

  // ── Classes compartilhadas ───────────────────────────────────────────────────

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
            <th className="px-5 py-3">Descrição</th>
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
                <p className="font-bold text-slate-800 truncate max-w-[240px]">{resumoDescricao(r.descricao, 70)}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <TipoBadge tipo={r.tipo} />
                  {r.envolvePaciente && <span className="text-[9px] font-black text-rose-500 uppercase tracking-wider">Paciente</span>}
                </div>
              </td>
              <td className="px-5 py-3.5 text-slate-600 font-medium">{r.setorOcorrencia}</td>
              <td className="px-5 py-3.5">
                {r.responsavelTratativa
                  ? <span className="flex items-center gap-1.5 text-slate-700 font-medium"><User className="w-3.5 h-3.5 text-slate-400" />{r.responsavelTratativa}</span>
                  : <span className="text-slate-300 text-xs">—</span>}
              </td>
              <td className="px-5 py-3.5">
                {r.prazoTratativa
                  ? <span className="flex items-center gap-1.5 text-slate-500 text-xs"><Calendar className="w-3 h-3" />{r.prazoTratativa}</span>
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
                    <div className="shrink-0">
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
                        {r.envolvePaciente && (
                          <span className="px-2 py-0.5 bg-rose-50 text-rose-600 text-[10px] font-bold rounded-full border border-rose-200">Envolve Paciente</span>
                        )}
                      </div>
                      <p className="font-bold text-slate-900 line-clamp-2 text-sm">{r.descricao}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{r.setorOcorrencia}</span>
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{r.dataOcorrencia} · {r.periodo.charAt(0) + r.periodo.slice(1).toLowerCase()}</span>
                        <span className="flex items-center gap-1"><User className="w-3 h-3" />{notificadorDisplay(r)}</span>
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
      { key: "todos",      label: "Todos assumidos",       count: todos.length },
      { key: "aguardando", label: "Aguardando tratativa",  count: aguard.length },
      { key: "andamento",  label: "Em andamento",          count: andando.length },
      { key: "cancelados", label: "Cancelados / Suspensos", count: cancel.length },
    ];

    return (
      <div className="flex flex-col h-full animate-in fade-in">
        <div className="mb-5 shrink-0">
          <h2 className="text-lg font-bold text-slate-900">{titulo}</h2>
          <p className="text-sm text-slate-500 mt-0.5">{descricao}</p>
        </div>

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
                {detalhe.envolvePaciente && (
                  <span className="px-2 py-0.5 bg-rose-50 text-rose-600 text-[10px] font-bold rounded-full border border-rose-200">Envolve Paciente</span>
                )}
              </div>
              <p className="text-sm text-slate-600 mt-1 line-clamp-2">{detalhe.descricao}</p>
            </div>
            <button onClick={() => setDetalheId(null)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg shrink-0 ml-4">
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
                      {i < WORKFLOW_STEPS.length - 1 && (
                        <div className="flex-1 flex flex-col items-center">
                          <div className={`h-0.5 w-full ${i < stepIdx ? "bg-[#2655e8]" : "bg-slate-200"}`} />
                          <p className={`text-[9px] font-bold mt-1 ${current ? "text-[#2655e8]" : done ? "text-slate-500" : "text-slate-300"}`}>{step.label}</p>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* Informações do registro */}
            <div className="px-6 py-4 border-b border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Informações</p>
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Setor</p><p className="text-sm font-bold text-slate-700">{detalhe.setorOcorrencia}</p></div>
                <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Data do Registro</p><p className="text-sm font-bold text-slate-700">{detalhe.dataRegistro}</p></div>
                <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Data da Ocorrência</p><p className="text-sm font-bold text-slate-700">{detalhe.dataOcorrencia}</p></div>
                <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Período</p><p className="text-sm font-bold text-slate-700">{detalhe.periodo.charAt(0) + detalhe.periodo.slice(1).toLowerCase()}</p></div>
                <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Notificador</p><p className="text-sm font-bold text-slate-700">{notificadorDisplay(detalhe)}</p></div>
                <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Responsável Tratativa</p><p className="text-sm font-bold text-slate-700">{detalhe.responsavelTratativa || "—"}</p></div>
                {detalhe.prazoTratativa && (
                  <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Prazo</p><p className="text-sm font-bold text-slate-700">{detalhe.prazoTratativa}</p></div>
                )}
                {detalhe.gravidade !== "LEVE" && (
                  <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Gravidade</p>
                    <span className={`text-xs font-black px-2.5 py-1 rounded-full ${detalhe.gravidade === "GRAVE" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>{detalhe.gravidade}</span>
                  </div>
                )}
              </div>

              {/* Dados do paciente (se houver) */}
              {detalhe.envolvePaciente && detalhe.pacienteNome && (
                <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl">
                  <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-2">Dados do Paciente</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-slate-500">Nome: </span><span className="font-bold text-slate-700">{detalhe.pacienteNome}</span></div>
                    {detalhe.pacienteAtendimento && <div><span className="text-slate-500">Atendimento: </span><span className="font-bold text-slate-700">{detalhe.pacienteAtendimento}</span></div>}
                  </div>
                </div>
              )}

              {/* Ferramentas de análise */}
              {detalhe.ferramentasAnalise.length > 0 && (
                <div className="mt-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Ferramentas de Análise</p>
                  <div className="flex gap-2">
                    {detalhe.ferramentasAnalise.map((f) => (
                      <span key={f} className="px-2.5 py-1 bg-violet-50 border border-violet-200 text-violet-700 text-xs font-bold rounded-lg">
                        {f === "ISHIKAWA" ? "Diagrama de Ishikawa" : "5 Porquês"}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Justificativa de recusa */}
              {detalhe.justificativaRecusa && (
                <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Justificativa de Recusa</p>
                  <p className="text-xs text-slate-600 italic">{detalhe.justificativaRecusa}</p>
                </div>
              )}
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
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ${pa.status === "CONCLUIDO" ? "bg-emerald-50 text-emerald-700" : pa.status === "EM_ANDAMENTO" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500"}`}>
                        {pa.status === "CONCLUIDO" ? "Concluído" : pa.status === "EM_ANDAMENTO" ? "Em andamento" : "Pendente"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-slate-400 mb-4">Nenhuma ação cadastrada.</p>}

              {["EM_TRATATIVA", "APROVACAO"].includes(detalhe.status) && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Nova Ação</p>
                  <input value={novaAcao.acao} onChange={(e) => setNovaAcao((f) => ({ ...f, acao: e.target.value }))} className={INPUT_CLS} placeholder="Descreva a ação corretiva..." />
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
          { label: "Total de Registros",       value: registros.length,   icon: <ClipboardList className="w-5 h-5" />, cor: "text-slate-600",  bg: "bg-slate-100" },
          { label: "Aguardando Triagem",        value: aguardandoTriagem,  icon: <Clock className="w-5 h-5" />,        cor: "text-blue-600",   bg: "bg-blue-50" },
          { label: "Em Tratativa / Aprovação",  value: emTratativa,        icon: <AlertCircle className="w-5 h-5" />, cor: "text-amber-600",  bg: "bg-amber-50" },
          { label: "Concluídos",                value: concluidos,         icon: <CheckCircle2 className="w-5 h-5" />, cor: "text-emerald-600", bg: "bg-emerald-50" },
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
        <ModalOverlay>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">Novo Registro</h3>
              <button onClick={() => setModalNovoAberto(false)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">

              {/* Tipo */}
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Tipo de Registro *</label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(TIPO_CONFIG) as TipoRegistro[]).map((t) => {
                    const cfg = TIPO_CONFIG[t];
                    return (
                      <button key={t} onClick={() => setNovoForm((f) => ({ ...f, tipo: t }))}
                        className={`flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl border-2 text-xs font-bold transition-all ${novoForm.tipo === t ? `${cfg.bg} ${cfg.border} ${cfg.cor}` : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"}`}>
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Descrição do ocorrido *</label>
                <textarea value={novoForm.descricao} onChange={(e) => setNovoForm((f) => ({ ...f, descricao: e.target.value }))} rows={3} className={INPUT_CLS + " resize-none"} placeholder="Descreva o que aconteceu com o máximo de detalhes..." />
              </div>

              {/* Setor e Data */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Setor</label>
                  <select value={novoForm.setorOcorrencia} onChange={(e) => setNovoForm((f) => ({ ...f, setorOcorrencia: e.target.value }))} className={SELECT_CLS}>
                    {SETORES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Data da Ocorrência</label>
                  <input type="date" value={novoForm.dataOcorrencia} onChange={(e) => setNovoForm((f) => ({ ...f, dataOcorrencia: e.target.value }))} className={INPUT_CLS} />
                </div>
              </div>

              {/* Período */}
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Período</label>
                <div className="flex gap-2">
                  {(["DIURNO", "VESPERTINO", "NOTURNO"] as const).map((p) => (
                    <button key={p} onClick={() => setNovoForm((f) => ({ ...f, periodo: p }))}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${novoForm.periodo === p ? "bg-[#2655e8] text-white border-[#2655e8]" : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"}`}>
                      {p.charAt(0) + p.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Anônimo */}
              <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <input type="checkbox" checked={novoForm.anonimo} onChange={(e) => setNovoForm((f) => ({ ...f, anonimo: e.target.checked }))} className="w-4 h-4 accent-[#2655e8]" />
                <div>
                  <p className="text-sm font-bold text-slate-700">Registro Anônimo</p>
                  <p className="text-xs text-slate-400">Sua identidade não será revelada a terceiros.</p>
                </div>
              </label>

              {/* Notificador (só se não anônimo) */}
              {!novoForm.anonimo && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Nome do Notificador</label>
                    <input value={novoForm.notificadorNome} onChange={(e) => setNovoForm((f) => ({ ...f, notificadorNome: e.target.value }))} className={INPUT_CLS} placeholder="Nome completo..." />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Cargo</label>
                    <input value={novoForm.notificadorCargo} onChange={(e) => setNovoForm((f) => ({ ...f, notificadorCargo: e.target.value }))} className={INPUT_CLS} placeholder="Ex: Enfermeiro..." />
                  </div>
                </div>
              )}
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
          <ModalOverlay>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-black text-slate-900">Assumir Registro</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{reg.codigo} · {resumoDescricao(reg.descricao, 50)}</p>
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
          <ModalOverlay>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-black text-slate-900">Recusar Registro</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{reg.codigo} · {resumoDescricao(reg.descricao, 50)}</p>
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

      {/* ── Slide-over: Detalhe ───────────────────────────────────────────── */}
      <SlideDetalhe />
    </div>
  );
}
