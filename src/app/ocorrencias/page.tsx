"use client";

import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  FileWarning,
  HeartPulse,
  MessageSquareWarning,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
  User,
  XCircle,
} from "lucide-react";

/* ──────────────────────────────────────────────────────────────────────────────
 * TYPES
 * ────────────────────────────────────────────────────────────────────────────*/

type ModuloTipo =
  | "NAO_CONFORMIDADE"
  | "EVENTO_ADVERSO"
  | "ELOGIO_RECLAMACAO";

type StatusOcorrencia =
  | "REGISTRO"
  | "TRATATIVA"
  | "CONCLUIDO"
  | "CANCELADO";

type Gravidade = "BAIXA" | "MODERADA" | "ALTA" | "GRAVE" | "SENTINELA";

type PerfilAcesso =
  | "NOTIFICADOR"
  | "TRATADOR"
  | "GESTOR"
  | "QUALIDADE"
  | "ADMIN";

type ClassificacaoManifestacao = "ELOGIO" | "RECLAMACAO" | "SUGESTAO";

type EventoClassificacao =
  | "QUEDA"
  | "MEDICACAO"
  | "IDENTIFICACAO"
  | "LESAO_PRESSAO"
  | "INFECÇÃO"
  | "PROCEDIMENTO"
  | "OUTRO";

type NaoConformidadeClassificacao =
  | "PROCESSO"
  | "DOCUMENTO"
  | "TREINAMENTO"
  | "ESTRUTURA"
  | "EQUIPAMENTO"
  | "FORNECEDOR"
  | "OUTRO";

type HistoricoItem = {
  id: string;
  data: string;
  autor: string;
  acao: string;
  observacao?: string;
};

type PlanoAcaoItem = {
  id: string;
  descricao: string;
  responsavel: string;
  prazo: string;
  status: "PENDENTE" | "EM_ANDAMENTO" | "CONCLUIDO";
};

type Ocorrencia = {
  id: string;
  numero: string;
  tipo: ModuloTipo;
  status: StatusOcorrencia;
  titulo: string;
  descricao: string;
  setor: string;
  areaNotificante: string;
  dataOcorrencia: string;
  dataRegistro: string;
  localOcorrencia: string;
  anonimo: boolean;
  envolvePaciente: boolean;
  identificacaoRestrita: boolean;
  nomeNotificador?: string;
  perfilResponsavel: PerfilAcesso;
  responsavelTratativa: string;
  prioridade: "BAIXA" | "MEDIA" | "ALTA" | "CRITICA";
  gravidade?: Gravidade;
  danoPaciente?: boolean;
  classificacaoEvento?: EventoClassificacao;
  classificacaoNC?: NaoConformidadeClassificacao;
  classificacaoManifestacao?: ClassificacaoManifestacao;
  pacienteCodigo?: string;
  causaRaiz?: string;
  acaoImediata?: string;
  planoAcao: PlanoAcaoItem[];
  conclusao?: string;
  motivoCancelamento?: string;
  prazoTratativa?: string;
  historico: HistoricoItem[];
};

/* ──────────────────────────────────────────────────────────────────────────────
 * MOCK VAZIO (SISTEMA LIMPO)
 * ────────────────────────────────────────────────────────────────────────────*/

const SETORES = [
  "Qualidade",
  "Pronto Atendimento",
  "UTI Adulto",
  "Centro Cirúrgico",
  "Internação",
  "Farmácia",
  "SADT",
  "Recepção",
  "Ouvidoria",
];

const USUARIOS = [
  "Ana Silva",
  "Dr. Carlos",
  "Enf. Roberta",
  "João Pedro",
  "Marina Souza",
  "Lucas Oliveira",
];

const INITIAL_DATA: Ocorrencia[] = [];

/* ──────────────────────────────────────────────────────────────────────────────
 * HELPERS
 * ────────────────────────────────────────────────────────────────────────────*/

function cn(...items: Array<string | false | null | undefined>) {
  return items.filter(Boolean).join(" ");
}

function genId(prefix = "id") {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function statusLabel(status: StatusOcorrencia) {
  return {
    REGISTRO: "Registro",
    TRATATIVA: "Em tratativa",
    CONCLUIDO: "Concluídas",
    CANCELADO: "Canceladas",
  }[status];
}

function statusClass(status: StatusOcorrencia) {
  return {
    REGISTRO: "bg-blue-50 text-blue-700 border-blue-200",
    TRATATIVA: "bg-amber-50 text-amber-700 border-amber-200",
    CONCLUIDO: "bg-emerald-50 text-emerald-700 border-emerald-200",
    CANCELADO: "bg-slate-100 text-slate-600 border-slate-200",
  }[status];
}

function tipoLabel(tipo: ModuloTipo) {
  return {
    NAO_CONFORMIDADE: "Não conformidades",
    EVENTO_ADVERSO: "Eventos adversos",
    ELOGIO_RECLAMACAO: "Elogios e Reclamações",
  }[tipo];
}

function tipoIcon(tipo: ModuloTipo) {
  switch (tipo) {
    case "NAO_CONFORMIDADE":
      return <FileWarning className="w-4 h-4" />;
    case "EVENTO_ADVERSO":
      return <HeartPulse className="w-4 h-4" />;
    case "ELOGIO_RECLAMACAO":
      return <MessageSquareWarning className="w-4 h-4" />;
  }
}

function prioridadeClass(prioridade: Ocorrencia["prioridade"]) {
  return {
    BAIXA: "bg-slate-100 text-slate-700",
    MEDIA: "bg-blue-100 text-blue-700",
    ALTA: "bg-amber-100 text-amber-700",
    CRITICA: "bg-red-100 text-red-700",
  }[prioridade];
}

function novoNumero(seq: number) {
  return `OC-2026-${String(seq).padStart(4, "0")}`;
}

/* ──────────────────────────────────────────────────────────────────────────────
 * MAIN
 * ────────────────────────────────────────────────────────────────────────────*/

export default function OcorrenciasPage() {
  const [tipoAtivo, setTipoAtivo] = useState<ModuloTipo>("NAO_CONFORMIDADE");
  const [statusAtivo, setStatusAtivo] = useState<StatusOcorrencia | "DASHBOARD">(
    "REGISTRO"
  );
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>(INITIAL_DATA);

  const [form, setForm] = useState<Omit<Ocorrencia, "id" | "numero" | "historico">>({
    tipo: "NAO_CONFORMIDADE",
    status: "REGISTRO",
    titulo: "",
    descricao: "",
    setor: "Qualidade",
    areaNotificante: "Qualidade",
    dataOcorrencia: "",
    dataRegistro: new Date().toISOString().slice(0, 10),
    localOcorrencia: "",
    anonimo: false,
    envolvePaciente: false,
    identificacaoRestrita: false,
    nomeNotificador: "",
    perfilResponsavel: "QUALIDADE",
    responsavelTratativa: "Ana Silva",
    prioridade: "MEDIA",
    gravidade: "BAIXA",
    danoPaciente: false,
    classificacaoEvento: undefined,
    classificacaoNC: undefined,
    classificacaoManifestacao: undefined,
    pacienteCodigo: "",
    causaRaiz: "",
    acaoImediata: "",
    planoAcao: [],
    conclusao: "",
    motivoCancelamento: "",
    prazoTratativa: "",
  });

  const filtered = useMemo(() => {
    return ocorrencias.filter((item) => {
      const byTipo = item.tipo === tipoAtivo;
      const byStatus = statusAtivo === "DASHBOARD" ? true : item.status === statusAtivo;
      const byQuery =
        !query ||
        item.titulo.toLowerCase().includes(query.toLowerCase()) ||
        item.numero.toLowerCase().includes(query.toLowerCase()) ||
        item.setor.toLowerCase().includes(query.toLowerCase());

      return byTipo && byStatus && byQuery;
    });
  }, [ocorrencias, tipoAtivo, statusAtivo, query]);

  const dashboardData = useMemo(() => {
    const base = ocorrencias.filter((o) => o.tipo === tipoAtivo);

    const total = base.length;
    const registro = base.filter((o) => o.status === "REGISTRO").length;
    const tratativa = base.filter((o) => o.status === "TRATATIVA").length;
    const concluido = base.filter((o) => o.status === "CONCLUIDO").length;
    const cancelado = base.filter((o) => o.status === "CANCELADO").length;

    const porSetor = SETORES.map((setor) => ({
      setor,
      total: base.filter((o) => o.setor === setor).length,
    })).filter((i) => i.total > 0);

    const criticos = base.filter((o) => o.prioridade === "CRITICA").length;
    const alta = base.filter((o) => o.prioridade === "ALTA").length;
    const anonimos = base.filter((o) => o.anonimo).length;

    return {
      total,
      registro,
      tratativa,
      concluido,
      cancelado,
      porSetor,
      criticos,
      alta,
      anonimos,
      taxaConclusao: total ? Math.round((concluido / total) * 100) : 0,
    };
  }, [ocorrencias, tipoAtivo]);

  const selected = useMemo(
    () => ocorrencias.find((o) => o.id === selectedId) ?? null,
    [ocorrencias, selectedId]
  );

  function resetForm(tipo: ModuloTipo = tipoAtivo) {
    setForm({
      tipo,
      status: "REGISTRO",
      titulo: "",
      descricao: "",
      setor: "Qualidade",
      areaNotificante: "Qualidade",
      dataOcorrencia: "",
      dataRegistro: new Date().toISOString().slice(0, 10),
      localOcorrencia: "",
      anonimo: false,
      envolvePaciente: false,
      identificacaoRestrita: false,
      nomeNotificador: "",
      perfilResponsavel: "QUALIDADE",
      responsavelTratativa: "Ana Silva",
      prioridade: "MEDIA",
      gravidade: "BAIXA",
      danoPaciente: false,
      classificacaoEvento: undefined,
      classificacaoNC: undefined,
      classificacaoManifestacao: undefined,
      pacienteCodigo: "",
      causaRaiz: "",
      acaoImediata: "",
      planoAcao: [],
      conclusao: "",
      motivoCancelamento: "",
      prazoTratativa: "",
    });
  }

  function addPlanoAcao() {
    setForm((prev) => ({
      ...prev,
      planoAcao: [
        ...prev.planoAcao,
        {
          id: genId("pa"),
          descricao: "",
          responsavel: "Ana Silva",
          prazo: "",
          status: "PENDENTE",
        },
      ],
    }));
  }

  function updatePlanoAcao(
    id: string,
    field: keyof PlanoAcaoItem,
    value: string
  ) {
    setForm((prev) => ({
      ...prev,
      planoAcao: prev.planoAcao.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }));
  }

  function removePlanoAcao(id: string) {
    setForm((prev) => ({
      ...prev,
      planoAcao: prev.planoAcao.filter((item) => item.id !== id),
    }));
  }

  function salvarOcorrencia() {
    if (!form.titulo || !form.descricao || !form.setor || !form.dataOcorrencia) {
      return;
    }

    const next: Ocorrencia = {
      id: genId("oc"),
      numero: novoNumero(ocorrencias.length + 1),
      ...form,
      historico: [
        {
          id: genId("h"),
          data: new Date().toLocaleString("pt-BR"),
          autor: form.anonimo ? "Anônimo" : form.nomeNotificador || "Usuário",
          action: "Registro criado",
        } as any,
      ],
    };

    setOcorrencias((prev) => [next, ...prev]);
    setSelectedId(next.id);
    setTipoAtivo(next.tipo);
    setStatusAtivo("REGISTRO");
    resetForm(next.tipo);
  }

  function moverStatus(id: string, nextStatus: StatusOcorrencia) {
    setOcorrencias((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              status: nextStatus,
              historico: [
                ...item.historico,
                {
                  id: genId("h"),
                  data: new Date().toLocaleString("pt-BR"),
                  autor: "Sistema/Usuário",
                  acao: `Status alterado para ${statusLabel(nextStatus)}`,
                },
              ],
            }
          : item
      )
    );
  }

  function excluirRegistro(id: string) {
    setOcorrencias((prev) => prev.filter((item) => item.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 md:p-8 text-slate-900">
      <div className="max-w-[1800px] mx-auto space-y-8">
        {/* HEADER */}
        <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm">
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-[10px] font-black uppercase tracking-[0.18em] text-indigo-700 mb-3">
                <ShieldAlert className="w-3.5 h-3.5" />
                Gestão de Ocorrências
              </div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900">
                Qualidade, Segurança do Paciente e Ouvidoria
              </h1>
              <p className="text-sm text-slate-500 font-medium mt-2 max-w-4xl">
                Módulo estruturado para registro, tratativa, conclusão, cancelamento e monitoramento
                de não conformidades, eventos adversos e manifestações, alinhado às melhores práticas
                de qualidade, acreditação, segurança do paciente e governança.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 min-w-[320px]">
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Total</p>
                <p className="text-2xl font-black mt-2">{dashboardData.total}</p>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                <p className="text-[10px] uppercase font-black tracking-widest text-amber-700">Tratativa</p>
                <p className="text-2xl font-black mt-2 text-amber-700">{dashboardData.tratativa}</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                <p className="text-[10px] uppercase font-black tracking-widest text-emerald-700">Concluídas</p>
                <p className="text-2xl font-black mt-2 text-emerald-700">{dashboardData.concluido}</p>
              </div>
              <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
                <p className="text-[10px] uppercase font-black tracking-widest text-red-700">Críticas</p>
                <p className="text-2xl font-black mt-2 text-red-700">{dashboardData.criticos}</p>
              </div>
            </div>
          </div>
        </div>

        {/* TABS TIPO */}
        <div className="bg-white border border-slate-100 rounded-[2rem] p-4 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              {
                value: "NAO_CONFORMIDADE" as ModuloTipo,
                label: "Não conformidades",
                desc: "Processos, documentos, estrutura, falhas e desvios",
              },
              {
                value: "EVENTO_ADVERSO" as ModuloTipo,
                label: "Eventos adversos",
                desc: "Segurança do paciente, incidentes e dano",
              },
              {
                value: "ELOGIO_RECLAMACAO" as ModuloTipo,
                label: "Elogios e Reclamações",
                desc: "Ouvidoria, percepção do cliente e melhoria",
              },
            ].map((item) => (
              <button
                key={item.value}
                onClick={() => {
                  setTipoAtivo(item.value);
                  resetForm(item.value);
                }}
                className={cn(
                  "rounded-2xl border p-5 text-left transition-all",
                  tipoAtivo === item.value
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/20"
                    : "bg-white border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/40"
                )}
              >
                <div className="flex items-center gap-2 text-sm font-black">
                  {tipoIcon(item.value)}
                  {item.label}
                </div>
                <p
                  className={cn(
                    "text-xs mt-2 font-medium",
                    tipoAtivo === item.value ? "text-white/80" : "text-slate-500"
                  )}
                >
                  {item.desc}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* GRID PRINCIPAL */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          {/* COLUNA ESQUERDA */}
          <div className="xl:col-span-8 space-y-6">
            {/* STATUS TABS */}
            <div className="bg-white border border-slate-100 rounded-[2rem] p-4 shadow-sm">
              <div className="flex flex-wrap gap-2">
                {[
                  { key: "REGISTRO", label: "Registro", icon: ClipboardList },
                  { key: "TRATATIVA", label: "Em tratativa", icon: AlertTriangle },
                  { key: "CONCLUIDO", label: "Concluídas", icon: CheckCircle2 },
                  { key: "CANCELADO", label: "Canceladas", icon: XCircle },
                  { key: "DASHBOARD", label: "Painel de monitoramento", icon: BarChart3 },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setStatusAtivo(tab.key as StatusOcorrencia | "DASHBOARD")}
                    className={cn(
                      "px-4 py-3 rounded-2xl border text-sm font-bold flex items-center gap-2 transition-all",
                      statusAtivo === tab.key
                        ? "bg-slate-900 text-white border-slate-900 shadow-md"
                        : "bg-white text-slate-600 border-slate-100 hover:bg-slate-50"
                    )}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* DASHBOARD */}
            {statusAtivo === "DASHBOARD" ? (
              <div className="space-y-6">
                <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm">
                  <div className="mb-6">
                    <h2 className="text-lg font-bold text-slate-800">Painel de Monitoramento</h2>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                      Visão gerencial do módulo: {tipoLabel(tipoAtivo)}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <KpiCard label="Total" value={dashboardData.total} />
                    <KpiCard label="Registro" value={dashboardData.registro} />
                    <KpiCard label="Tratativa" value={dashboardData.tratativa} />
                    <KpiCard label="Concluídas" value={dashboardData.concluido} />
                    <KpiCard label="Taxa de conclusão" value={`${dashboardData.taxaConclusao}%`} />
                  </div>
                </div>

                <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Distribuição por Setor</h3>
                  <div className="space-y-4">
                    {dashboardData.porSetor.length === 0 ? (
                      <div className="text-sm text-slate-400">Sem dados para exibir.</div>
                    ) : (
                      dashboardData.porSetor.map((item) => {
                        const percent = dashboardData.total
                          ? Math.round((item.total / dashboardData.total) * 100)
                          : 0;
                        return (
                          <div key={item.setor}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-bold text-slate-700">{item.setor}</span>
                              <span className="text-sm font-bold text-slate-500">
                                {item.total} ({percent}%)
                              </span>
                            </div>
                            <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-indigo-600"
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <KpiCard label="Anonimizadas" value={dashboardData.anonimos} />
                  <KpiCard label="Prioridade alta" value={dashboardData.alta} />
                  <KpiCard label="Prioridade crítica" value={dashboardData.criticos} />
                </div>
              </div>
            ) : (
              <>
                {/* LISTAGEM */}
                <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
                    <div>
                      <h2 className="text-lg font-bold text-slate-800">
                        {statusLabel(statusAtivo as StatusOcorrencia)}
                      </h2>
                      <p className="text-xs text-slate-500 font-medium mt-1">
                        Registros filtrados por módulo e etapa do fluxo.
                      </p>
                    </div>

                    <div className="relative w-full lg:w-[320px]">
                      <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Buscar por número, título ou setor..."
                        className="w-full h-11 pl-11 pr-4 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-medium outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
                      />
                    </div>
                  </div>

                  <div className="border border-slate-100 rounded-3xl overflow-hidden">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase font-black text-slate-400 tracking-widest">
                        <tr>
                          <th className="px-6 py-4">Ocorrência</th>
                          <th className="px-6 py-4">Setor</th>
                          <th className="px-6 py-4">Responsável</th>
                          <th className="px-6 py-4">Prioridade</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4 text-center">Abrir</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {filtered.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4">
                              <div>
                                <p className="font-bold text-slate-800">{item.titulo}</p>
                                <p className="text-[11px] text-slate-400 font-medium mt-1">
                                  {item.numero} • {tipoLabel(item.tipo)}
                                </p>
                              </div>
                            </td>
                            <td className="px-6 py-4 font-medium text-slate-600">{item.setor}</td>
                            <td className="px-6 py-4 font-medium text-slate-600">
                              {item.responsavelTratativa}
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={cn(
                                  "px-2.5 py-1 rounded-full text-[11px] font-black",
                                  prioridadeClass(item.prioridade)
                                )}
                              >
                                {item.prioridade}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={cn(
                                  "px-3 py-1 rounded-full text-[11px] font-black border",
                                  statusClass(item.status)
                                )}
                              >
                                {statusLabel(item.status)}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <button
                                onClick={() => setSelectedId(item.id)}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:text-indigo-700 hover:border-indigo-200 hover:bg-indigo-50 transition-all"
                              >
                                Abrir <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {filtered.length === 0 && (
                      <div className="p-10 text-center text-sm text-slate-400 font-medium">
                        Nenhum registro encontrado para esse filtro.
                      </div>
                    )}
                  </div>
                </div>

                {/* DETALHE */}
                <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Painel do Registro</h3>
                  {!selected ? (
                    <div className="text-sm text-slate-400 font-medium">
                      Selecione um registro para visualizar os detalhes e avançar no workflow.
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest">
                              {selected.numero}
                            </span>
                            <span
                              className={cn(
                                "px-3 py-1 rounded-full text-[11px] font-black border",
                                statusClass(selected.status)
                              )}
                            >
                              {statusLabel(selected.status)}
                            </span>
                          </div>
                          <h4 className="text-xl font-bold text-slate-900">{selected.titulo}</h4>
                          <p className="text-sm text-slate-500 mt-2 max-w-4xl">{selected.descricao}</p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {selected.status !== "TRATATIVA" && (
                            <button
                              onClick={() => moverStatus(selected.id, "TRATATIVA")}
                              className="px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 transition-all"
                            >
                              Enviar para tratativa
                            </button>
                          )}
                          {selected.status !== "CONCLUIDO" && (
                            <button
                              onClick={() => moverStatus(selected.id, "CONCLUIDO")}
                              className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-all"
                            >
                              Concluir
                            </button>
                          )}
                          {selected.status !== "CANCELADO" && (
                            <button
                              onClick={() => moverStatus(selected.id, "CANCELADO")}
                              className="px-4 py-2 rounded-xl bg-slate-700 text-white text-sm font-bold hover:bg-slate-800 transition-all"
                            >
                              Cancelar
                            </button>
                          )}
                          <button
                            onClick={() => excluirRegistro(selected.id)}
                            className="px-4 py-2 rounded-xl bg-red-50 text-red-700 border border-red-200 text-sm font-bold hover:bg-red-100 transition-all"
                          >
                            Excluir
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <InfoCard label="Setor" value={selected.setor} />
                        <InfoCard label="Área notificante" value={selected.areaNotificante} />
                        <InfoCard label="Responsável" value={selected.responsavelTratativa} />
                        <InfoCard label="Data ocorrência" value={selected.dataOcorrencia} />
                        <InfoCard label="Local" value={selected.localOcorrencia} />
                        <InfoCard label="Prioridade" value={selected.prioridade} />
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <TextBlock title="Ação imediata" text={selected.acaoImediata || "-"} />
                        <TextBlock title="Causa raiz" text={selected.causaRaiz || "-"} />
                        <TextBlock title="Conclusão" text={selected.conclusao || "-"} />
                        <TextBlock
                          title="Motivo de cancelamento"
                          text={selected.motivoCancelamento || "-"}
                        />
                      </div>

                      <div>
                        <h5 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-3">
                          Plano de ação
                        </h5>
                        {selected.planoAcao.length === 0 ? (
                          <div className="text-sm text-slate-400">Sem plano de ação cadastrado.</div>
                        ) : (
                          <div className="space-y-3">
                            {selected.planoAcao.map((pa) => (
                              <div
                                key={pa.id}
                                className="border border-slate-100 rounded-2xl p-4 bg-slate-50"
                              >
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                                  <div>
                                    <p className="font-bold text-slate-800">{pa.descricao}</p>
                                    <p className="text-xs text-slate-500 mt-1">
                                      Responsável: {pa.responsavel} • Prazo: {pa.prazo || "-"}
                                    </p>
                                  </div>
                                  <span className="px-3 py-1 rounded-full bg-white border border-slate-200 text-[11px] font-black text-slate-600">
                                    {pa.status}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <h5 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-3">
                          Histórico
                        </h5>
                        <div className="space-y-3">
                          {selected.historico.map((h) => (
                            <div key={h.id} className="border-l-4 border-indigo-200 pl-4 py-1">
                              <p className="text-sm font-bold text-slate-700">{h.acao}</p>
                              <p className="text-xs text-slate-500 mt-1">
                                {h.data} • {h.autor}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* COLUNA DIREITA - FORMULÁRIO */}
          <div className="xl:col-span-4">
            <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm sticky top-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Novo Registro</h2>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    Cadastro estruturado com fluxo de tratativa.
                  </p>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-indigo-600" />
                </div>
              </div>

              <div className="space-y-5 max-h-[80vh] overflow-y-auto pr-1 custom-scrollbar">
                <FieldLabel label="Tipo de ocorrência" />
                <select
                  value={form.tipo}
                  onChange={(e) => setForm({ ...form, tipo: e.target.value as ModuloTipo })}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:bg-white focus:border-indigo-500"
                >
                  <option value="NAO_CONFORMIDADE">Não conformidade</option>
                  <option value="EVENTO_ADVERSO">Evento adverso</option>
                  <option value="ELOGIO_RECLAMACAO">Elogio / Reclamação</option>
                </select>

                <FieldLabel label="Título" />
                <input
                  value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:bg-white focus:border-indigo-500"
                  placeholder="Título objetivo da ocorrência"
                />

                <FieldLabel label="Descrição" />
                <textarea
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  className="w-full min-h-[110px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none focus:bg-white focus:border-indigo-500 resize-none"
                  placeholder="Descreva o fato com objetividade, rastreabilidade e clareza."
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <FieldLabel label="Setor" />
                    <select
                      value={form.setor}
                      onChange={(e) => setForm({ ...form, setor: e.target.value })}
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:bg-white focus:border-indigo-500"
                    >
                      {SETORES.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <FieldLabel label="Área notificante" />
                    <select
                      value={form.areaNotificante}
                      onChange={(e) => setForm({ ...form, areaNotificante: e.target.value })}
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:bg-white focus:border-indigo-500"
                    >
                      {SETORES.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <FieldLabel label="Data da ocorrência" />
                    <input
                      type="date"
                      value={form.dataOcorrencia}
                      onChange={(e) => setForm({ ...form, dataOcorrencia: e.target.value })}
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:bg-white focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <FieldLabel label="Prazo de tratativa" />
                    <input
                      type="date"
                      value={form.prazoTratativa || ""}
                      onChange={(e) => setForm({ ...form, prazoTratativa: e.target.value })}
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:bg-white focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <FieldLabel label="Local da ocorrência" />
                  <input
                    value={form.localOcorrencia}
                    onChange={(e) => setForm({ ...form, localOcorrencia: e.target.value })}
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:bg-white focus:border-indigo-500"
                    placeholder="Ex.: Leito, recepção, corredor, farmácia..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <FieldLabel label="Responsável pela tratativa" />
                    <select
                      value={form.responsavelTratativa}
                      onChange={(e) =>
                        setForm({ ...form, responsavelTratativa: e.target.value })
                      }
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:bg-white focus:border-indigo-500"
                    >
                      {USUARIOS.map((u) => (
                        <option key={u}>{u}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <FieldLabel label="Perfil responsável" />
                    <select
                      value={form.perfilResponsavel}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          perfilResponsavel: e.target.value as PerfilAcesso,
                        })
                      }
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:bg-white focus:border-indigo-500"
                    >
                      <option value="NOTIFICADOR">Notificador</option>
                      <option value="TRATADOR">Tratador</option>
                      <option value="GESTOR">Gestor</option>
                      <option value="QUALIDADE">Qualidade</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </div>

                  <div>
                    <FieldLabel label="Prioridade" />
                    <select
                      value={form.prioridade}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          prioridade: e.target.value as Ocorrencia["prioridade"],
                        })
                      }
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:bg-white focus:border-indigo-500"
                    >
                      <option value="BAIXA">Baixa</option>
                      <option value="MEDIA">Média</option>
                      <option value="ALTA">Alta</option>
                      <option value="CRITICA">Crítica</option>
                    </select>
                  </div>

                  <div>
                    <FieldLabel label="Gravidade" />
                    <select
                      value={form.gravidade}
                      onChange={(e) =>
                        setForm({ ...form, gravidade: e.target.value as Gravidade })
                      }
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:bg-white focus:border-indigo-500"
                    >
                      <option value="BAIXA">Baixa</option>
                      <option value="MODERADA">Moderada</option>
                      <option value="ALTA">Alta</option>
                      <option value="GRAVE">Grave</option>
                      <option value="SENTINELA">Sentinela</option>
                    </select>
                  </div>
                </div>

                {form.tipo === "NAO_CONFORMIDADE" && (
                  <div>
                    <FieldLabel label="Classificação da não conformidade" />
                    <select
                      value={form.classificacaoNC || ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          classificacaoNC:
                            e.target.value as NaoConformidadeClassificacao,
                        })
                      }
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:bg-white focus:border-indigo-500"
                    >
                      <option value="">Selecione</option>
                      <option value="PROCESSO">Processo</option>
                      <option value="DOCUMENTO">Documento</option>
                      <option value="TREINAMENTO">Treinamento</option>
                      <option value="ESTRUTURA">Estrutura</option>
                      <option value="EQUIPAMENTO">Equipamento</option>
                      <option value="FORNECEDOR">Fornecedor</option>
                      <option value="OUTRO">Outro</option>
                    </select>
                  </div>
                )}

                {form.tipo === "EVENTO_ADVERSO" && (
                  <>
                    <div>
                      <FieldLabel label="Classificação do evento" />
                      <select
                        value={form.classificacaoEvento || ""}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            classificacaoEvento: e.target.value as EventoClassificacao,
                          })
                        }
                        className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:bg-white focus:border-indigo-500"
                      >
                        <option value="">Selecione</option>
                        <option value="QUEDA">Queda</option>
                        <option value="MEDICACAO">Medicação</option>
                        <option value="IDENTIFICACAO">Identificação</option>
                        <option value="LESAO_PRESSAO">Lesão por pressão</option>
                        <option value="INFECÇÃO">Infecção</option>
                        <option value="PROCEDIMENTO">Procedimento</option>
                        <option value="OUTRO">Outro</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <FieldLabel label="Código do paciente" />
                        <input
                          value={form.pacienteCodigo || ""}
                          onChange={(e) =>
                            setForm({ ...form, pacienteCodigo: e.target.value })
                          }
                          className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:bg-white focus:border-indigo-500"
                          placeholder="Identificação restrita"
                        />
                      </div>

                      <div className="flex items-end">
                        <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
                          <input
                            type="checkbox"
                            checked={!!form.danoPaciente}
                            onChange={(e) =>
                              setForm({ ...form, danoPaciente: e.target.checked })
                            }
                            className="w-4 h-4"
                          />
                          Houve dano ao paciente
                        </label>
                      </div>
                    </div>
                  </>
                )}

                {form.tipo === "ELOGIO_RECLAMACAO" && (
                  <div>
                    <FieldLabel label="Classificação da manifestação" />
                    <select
                      value={form.classificacaoManifestacao || ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          classificacaoManifestacao:
                            e.target.value as ClassificacaoManifestacao,
                        })
                      }
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:bg-white focus:border-indigo-500"
                    >
                      <option value="">Selecione</option>
                      <option value="ELOGIO">Elogio</option>
                      <option value="RECLAMACAO">Reclamação</option>
                      <option value="SUGESTAO">Sugestão</option>
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.anonimo}
                      onChange={(e) => setForm({ ...form, anonimo: e.target.checked })}
                      className="w-4 h-4"
                    />
                    Registro anônimo
                  </label>

                  <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.identificacaoRestrita}
                      onChange={(e) =>
                        setForm({ ...form, identificacaoRestrita: e.target.checked })
                      }
                      className="w-4 h-4"
                    />
                    Dados sensíveis restritos
                  </label>
                </div>

                {!form.anonimo && (
                  <div>
                    <FieldLabel label="Nome do notificador" />
                    <input
                      value={form.nomeNotificador || ""}
                      onChange={(e) =>
                        setForm({ ...form, nomeNotificador: e.target.value })
                      }
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:bg-white focus:border-indigo-500"
                      placeholder="Nome do profissional/notificador"
                    />
                  </div>
                )}

                <div>
                  <FieldLabel label="Ação imediata" />
                  <textarea
                    value={form.acaoImediata || ""}
                    onChange={(e) => setForm({ ...form, acaoImediata: e.target.value })}
                    className="w-full min-h-[90px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none focus:bg-white focus:border-indigo-500 resize-none"
                    placeholder="Ações adotadas no momento do registro."
                  />
                </div>

                <div>
                  <FieldLabel label="Causa raiz / análise preliminar" />
                  <textarea
                    value={form.causaRaiz || ""}
                    onChange={(e) => setForm({ ...form, causaRaiz: e.target.value })}
                    className="w-full min-h-[90px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none focus:bg-white focus:border-indigo-500 resize-none"
                    placeholder="Análise preliminar da causa raiz."
                  />
                </div>

                <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">Plano de ação</h4>
                      <p className="text-xs text-slate-500 font-medium mt-1">
                        Registre ações corretivas, preventivas ou de melhoria.
                      </p>
                    </div>
                    <button
                      onClick={addPlanoAcao}
                      className="px-3 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700"
                    >
                      Adicionar
                    </button>
                  </div>

                  <div className="space-y-4">
                    {form.planoAcao.map((pa) => (
                      <div key={pa.id} className="bg-white border border-slate-200 rounded-2xl p-4">
                        <div className="grid grid-cols-1 gap-3">
                          <input
                            value={pa.descricao}
                            onChange={(e) =>
                              updatePlanoAcao(pa.id, "descricao", e.target.value)
                            }
                            className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:bg-white focus:border-indigo-500"
                            placeholder="Descrição da ação"
                          />
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <select
                              value={pa.responsavel}
                              onChange={(e) =>
                                updatePlanoAcao(pa.id, "responsavel", e.target.value)
                              }
                              className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:bg-white focus:border-indigo-500"
                            >
                              {USUARIOS.map((u) => (
                                <option key={u}>{u}</option>
                              ))}
                            </select>

                            <input
                              type="date"
                              value={pa.prazo}
                              onChange={(e) =>
                                updatePlanoAcao(pa.id, "prazo", e.target.value)
                              }
                              className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:bg-white focus:border-indigo-500"
                            />

                            <div className="flex gap-2">
                              <select
                                value={pa.status}
                                onChange={(e) =>
                                  updatePlanoAcao(pa.id, "status", e.target.value)
                                }
                                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:bg-white focus:border-indigo-500"
                              >
                                <option value="PENDENTE">Pendente</option>
                                <option value="EM_ANDAMENTO">Em andamento</option>
                                <option value="CONCLUIDO">Concluído</option>
                              </select>
                              <button
                                onClick={() => removePlanoAcao(pa.id)}
                                className="w-11 h-11 shrink-0 rounded-2xl border border-red-200 bg-red-50 text-red-600 flex items-center justify-center"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {form.planoAcao.length === 0 && (
                      <div className="text-sm text-slate-400 font-medium">
                        Nenhuma ação cadastrada.
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    onClick={() => salvarOcorrencia()}
                    className="flex-1 h-12 rounded-2xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Salvar registro
                  </button>

                  <button
                    onClick={() => resetForm(form.tipo)}
                    className="h-12 px-4 rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
                  >
                    Limpar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RODAPÉ CONCEITUAL */}
        <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <RodapeCard
              icon={<ShieldAlert className="w-5 h-5 text-indigo-600" />}
              title="Governança"
              text="Fluxo estruturado com rastreabilidade, status e responsáveis definidos."
            />
            <RodapeCard
              icon={<User className="w-5 h-5 text-indigo-600" />}
              title="LGPD"
              text="Suporte a anonimização, restrição de identificação e controle de acesso."
            />
            <RodapeCard
              icon={<AlertTriangle className="w-5 h-5 text-indigo-600" />}
              title="Segurança"
              text="Classificação de gravidade, dano e tratativa conforme criticidade."
            />
            <RodapeCard
              icon={<BarChart3 className="w-5 h-5 text-indigo-600" />}
              title="Indicadores"
              text="Pronto para integrar dashboards, SLA, tendência e performance da tratativa."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────
 * SUBCOMPONENTS
 * ────────────────────────────────────────────────────────────────────────────*/

function KpiCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
      <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">{label}</p>
      <p className="text-2xl font-black text-slate-900 mt-2">{value}</p>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
      <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">{label}</p>
      <p className="text-sm font-bold text-slate-800 mt-2">{value || "-"}</p>
    </div>
  );
}

function TextBlock({ title, text }: { title: string; text: string }) {
  return (
    <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50">
      <h5 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-2">{title}</h5>
      <p className="text-sm text-slate-700 leading-relaxed">{text}</p>
    </div>
  );
}

function FieldLabel({ label }: { label: string }) {
  return (
    <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2">
      {label}
    </label>
  );
}

function RodapeCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5">
      <div className="mb-3">{icon}</div>
      <h4 className="text-sm font-bold text-slate-800">{title}</h4>
      <p className="text-xs text-slate-500 font-medium mt-2 leading-relaxed">{text}</p>
    </div>
  );
}