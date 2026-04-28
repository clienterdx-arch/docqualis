"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  BarChart3,
  CalendarClock,
  ClipboardCheck,
  FileSpreadsheet,
  Filter,
  Gauge,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldAlert,
  Target,
  Trash2,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { carregarPerfilUsuario } from "@/lib/perfil";

type Risco = {
  id?: string;
  empresa_id?: string;
  codigo: string;
  titulo: string;
  descricao: string;
  causa?: string;
  consequencia?: string;
  categoria: string;
  processo_vinculado?: string;
  setor: string;
  responsavel: string;
  origem?: string;
  probabilidade: number;
  impacto: number;
  nivel_risco?: number;
  classificacao: string;
  status: string;
  estrategia: string;
  plano_tratamento?: string;
  controles_existentes?: string;
  praticas_controle?: string;
  barreiras_preventivas?: string;
  barreiras_detectivas?: string;
  barreiras_corretivas?: string;
  risco_residual_probabilidade?: number;
  risco_residual_impacto?: number;
  monitoramento?: string;
  kpi_relacionado?: string;
  prazo_tratamento?: string;
  data_avaliacao?: string;
  data_revisao?: string;
};

const hoje = new Date().toISOString().slice(0, 10);

const riscoInicial: Risco = {
  codigo: "",
  titulo: "",
  descricao: "",
  causa: "",
  consequencia: "",
  categoria: "Assistencial",
  processo_vinculado: "",
  setor: "",
  responsavel: "",
  origem: "Mapeamento de processo",
  probabilidade: 1,
  impacto: 1,
  classificacao: "BAIXO",
  status: "IDENTIFICADO",
  estrategia: "Mitigar",
  plano_tratamento: "",
  controles_existentes: "",
  praticas_controle: "",
  barreiras_preventivas: "",
  barreiras_detectivas: "",
  barreiras_corretivas: "",
  risco_residual_probabilidade: 1,
  risco_residual_impacto: 1,
  monitoramento: "",
  kpi_relacionado: "",
  prazo_tratamento: "",
  data_avaliacao: hoje,
  data_revisao: "",
};

function calcularScore(probabilidade: number, impacto: number) {
  return Number(probabilidade || 0) * Number(impacto || 0);
}

function classificar(score: number) {
  if (score <= 5) return "BAIXO";
  if (score <= 10) return "MODERADO";
  if (score <= 15) return "ALTO";
  return "CRITICO";
}

function classeRisco(classificacao?: string) {
  const c = classificacao?.toUpperCase();

  if (c === "CRITICO") return "bg-red-50 text-red-700 border-red-200";
  if (c === "ALTO") return "bg-orange-50 text-orange-700 border-orange-200";
  if (c === "MODERADO") return "bg-amber-50 text-amber-700 border-amber-200";

  return "bg-emerald-50 text-emerald-700 border-emerald-200";
}

function classeCelula(score: number) {
  if (score >= 16) return "bg-red-100 text-red-800 border-red-200";
  if (score >= 11) return "bg-orange-100 text-orange-800 border-orange-200";
  if (score >= 6) return "bg-amber-100 text-amber-800 border-amber-200";

  return "bg-emerald-100 text-emerald-800 border-emerald-200";
}

function normalizarData(data?: string | null) {
  if (!data) return "";
  return String(data).slice(0, 10);
}

function dataAtrasada(data?: string | null) {
  if (!data) return false;

  const hojeLocal = new Date();
  hojeLocal.setHours(0, 0, 0, 0);

  const prazo = new Date(`${String(data).slice(0, 10)}T00:00:00`);
  return prazo < hojeLocal;
}

export default function GestaoRiscosPage() {
  const router = useRouter();

  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [riscos, setRiscos] = useState<Risco[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [riscoEditando, setRiscoEditando] = useState<Risco>(riscoInicial);
  const [busca, setBusca] = useState("");
  const [filtroClassificacao, setFiltroClassificacao] = useState("TODOS");
  const [mensagem, setMensagem] = useState<string | null>(null);

  const carregarSessao = useCallback(async () => {
    setIsLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push("/login");
      return;
    }

    const perfil = await carregarPerfilUsuario<{ empresa_id?: string | null }>(
      session,
      "empresa_id"
    );

    if (!perfil?.empresa_id) {
      setMensagem("Não foi possível identificar a empresa vinculada ao usuário.");
      setIsLoading(false);
      return;
    }

    setEmpresaId(perfil.empresa_id);
  }, [router]);

  const carregarRiscos = useCallback(async () => {
    if (!empresaId) return;

    setIsLoading(true);

    const { data, error } = await supabase
      .from("riscos")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("created_at", { ascending: false });

    if (error) {
      setMensagem(`Erro ao carregar riscos: ${error.message}`);
      setIsLoading(false);
      return;
    }

    const formatados: Risco[] = (data ?? []).map((r: any) => {
      const score = calcularScore(Number(r.probabilidade || 1), Number(r.impacto || 1));

      return {
        id: r.id,
        empresa_id: r.empresa_id,
        codigo: r.codigo ?? "",
        titulo: r.titulo ?? "",
        descricao: r.descricao ?? "",
        causa: r.causa ?? "",
        consequencia: r.consequencia ?? "",
        categoria: r.categoria ?? "Operacional",
        processo_vinculado: r.processo_vinculado ?? "",
        setor: r.setor ?? "",
        responsavel: r.responsavel ?? "",
        origem: r.origem ?? "Mapeamento de processo",
        probabilidade: Number(r.probabilidade || 1),
        impacto: Number(r.impacto || 1),
        nivel_risco: r.nivel_risco ?? score,
        classificacao: r.classificacao ?? classificar(score),
        status: r.status ?? "IDENTIFICADO",
        estrategia: r.estrategia ?? "Mitigar",
        plano_tratamento: r.plano_tratamento ?? "",
        controles_existentes: r.controles_existentes ?? "",
        praticas_controle: r.praticas_controle ?? "",
        barreiras_preventivas: r.barreiras_preventivas ?? "",
        barreiras_detectivas: r.barreiras_detectivas ?? "",
        barreiras_corretivas: r.barreiras_corretivas ?? "",
        risco_residual_probabilidade: Number(r.risco_residual_probabilidade || 1),
        risco_residual_impacto: Number(r.risco_residual_impacto || 1),
        monitoramento: r.monitoramento ?? "",
        kpi_relacionado: r.kpi_relacionado ?? "",
        prazo_tratamento: normalizarData(r.prazo_tratamento),
        data_avaliacao: normalizarData(r.data_avaliacao) || hoje,
        data_revisao: normalizarData(r.data_revisao),
      };
    });

    setRiscos(formatados);
    setIsLoading(false);
  }, [empresaId]);

  useEffect(() => {
    carregarSessao();
  }, [carregarSessao]);

  useEffect(() => {
    carregarRiscos();
  }, [carregarRiscos]);

  const riscosFiltrados = useMemo(() => {
    return riscos.filter((risco) => {
      const texto = [
        risco.codigo,
        risco.titulo,
        risco.descricao,
        risco.setor,
        risco.processo_vinculado,
        risco.responsavel,
        risco.categoria,
        risco.status,
      ]
        .join(" ")
        .toLowerCase();

      const passaBusca = texto.includes(busca.toLowerCase());
      const passaClassificacao =
        filtroClassificacao === "TODOS" ||
        risco.classificacao?.toUpperCase() === filtroClassificacao;

      return passaBusca && passaClassificacao;
    });
  }, [riscos, busca, filtroClassificacao]);

  const indicadores = useMemo(() => {
    const total = riscos.length;
    const criticos = riscos.filter((r) => r.classificacao === "CRITICO").length;
    const altos = riscos.filter((r) => r.classificacao === "ALTO").length;
    const tratamento = riscos.filter((r) => r.status === "EM_TRATAMENTO").length;
    const atrasados = riscos.filter((r) => dataAtrasada(r.prazo_tratamento)).length;

    return { total, criticos, altos, tratamento, atrasados };
  }, [riscos]);

  function abrirNovo() {
    const proximo = String(riscos.length + 1).padStart(3, "0");

    setRiscoEditando({
      ...riscoInicial,
      codigo: `RIS-${proximo}`,
      data_avaliacao: hoje,
    });

    setModalAberto(true);
  }

  function abrirEdicao(risco: Risco) {
    setRiscoEditando({
      ...riscoInicial,
      ...risco,
      prazo_tratamento: normalizarData(risco.prazo_tratamento),
      data_avaliacao: normalizarData(risco.data_avaliacao) || hoje,
      data_revisao: normalizarData(risco.data_revisao),
      risco_residual_probabilidade: risco.risco_residual_probabilidade ?? 1,
      risco_residual_impacto: risco.risco_residual_impacto ?? 1,
    });

    setModalAberto(true);
  }

  function atualizarCampo(campo: keyof Risco, valor: string | number) {
    const atualizado = { ...riscoEditando, [campo]: valor };

    const score = calcularScore(
      Number(campo === "probabilidade" ? valor : atualizado.probabilidade),
      Number(campo === "impacto" ? valor : atualizado.impacto)
    );

    atualizado.classificacao = classificar(score);

    setRiscoEditando(atualizado);
  }

  async function salvarRisco() {
    if (!empresaId) {
      setMensagem("Empresa não identificada.");
      return;
    }

    if (!riscoEditando.titulo?.trim()) {
      setMensagem("Preencha o título do risco.");
      return;
    }

    if (!riscoEditando.setor?.trim()) {
      setMensagem("Preencha o setor.");
      return;
    }

    if (!riscoEditando.responsavel?.trim()) {
      setMensagem("Preencha o responsável.");
      return;
    }

    setSalvando(true);

    const score = calcularScore(
      Number(riscoEditando.probabilidade),
      Number(riscoEditando.impacto)
    );

    const payload = {
      empresa_id: empresaId,
      codigo: riscoEditando.codigo,
      titulo: riscoEditando.titulo,
      descricao: riscoEditando.descricao,
      causa: riscoEditando.causa,
      consequencia: riscoEditando.consequencia,
      categoria: riscoEditando.categoria,
      processo_vinculado: riscoEditando.processo_vinculado,
      setor: riscoEditando.setor,
      responsavel: riscoEditando.responsavel,
      origem: riscoEditando.origem,
      probabilidade: Number(riscoEditando.probabilidade),
      impacto: Number(riscoEditando.impacto),
      classificacao: classificar(score),
      status: riscoEditando.status,
      estrategia: riscoEditando.estrategia,
      plano_tratamento: riscoEditando.plano_tratamento,
      controles_existentes: riscoEditando.controles_existentes,
      praticas_controle: riscoEditando.praticas_controle,
      barreiras_preventivas: riscoEditando.barreiras_preventivas,
      barreiras_detectivas: riscoEditando.barreiras_detectivas,
      barreiras_corretivas: riscoEditando.barreiras_corretivas,
      risco_residual_probabilidade: Number(
        riscoEditando.risco_residual_probabilidade || 1
      ),
      risco_residual_impacto: Number(riscoEditando.risco_residual_impacto || 1),
      monitoramento: riscoEditando.monitoramento,
      kpi_relacionado: riscoEditando.kpi_relacionado,
      prazo_tratamento: riscoEditando.prazo_tratamento || null,
      data_avaliacao: riscoEditando.data_avaliacao || hoje,
      data_revisao: riscoEditando.data_revisao || null,
    };

    const { error } = riscoEditando.id
      ? await supabase
          .from("riscos")
          .update(payload)
          .eq("id", riscoEditando.id)
          .eq("empresa_id", empresaId)
      : await supabase.from("riscos").insert(payload);

    if (error) {
      setMensagem(error.message);
      setSalvando(false);
      return;
    }

    setMensagem("Risco salvo com sucesso.");
    setModalAberto(false);
    setSalvando(false);
    await carregarRiscos();
  }

  async function excluirRisco(id?: string) {
    if (!id || !empresaId) return;

    const confirmar = window.confirm("Deseja excluir este risco?");
    if (!confirmar) return;

    const { error } = await supabase
      .from("riscos")
      .delete()
      .eq("id", id)
      .eq("empresa_id", empresaId);

    if (error) {
      setMensagem(`Erro ao excluir risco: ${error.message}`);
      return;
    }

    setMensagem("Risco excluído.");
    setModalAberto(false);
    await carregarRiscos();
  }

  function exportarCsv() {
    const colunas = [
      "Código",
      "Processo",
      "Setor",
      "Risco",
      "Causa",
      "Consequência",
      "Probabilidade",
      "Impacto",
      "Score",
      "Classificação",
      "Controles",
      "Práticas de Controle",
      "Barreiras Preventivas",
      "Barreiras Detectivas",
      "Barreiras Corretivas",
      "Estratégia",
      "Plano",
      "Status",
      "Responsável",
      "Prazo",
    ];

    const linhas = riscosFiltrados.map((r) => [
      r.codigo,
      r.processo_vinculado,
      r.setor,
      r.titulo,
      r.causa,
      r.consequencia,
      r.probabilidade,
      r.impacto,
      calcularScore(r.probabilidade, r.impacto),
      r.classificacao,
      r.controles_existentes,
      r.praticas_controle,
      r.barreiras_preventivas,
      r.barreiras_detectivas,
      r.barreiras_corretivas,
      r.estrategia,
      r.plano_tratamento,
      r.status,
      r.responsavel,
      r.prazo_tratamento,
    ]);

    const csv = [colunas, ...linhas]
      .map((linha) =>
        linha.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(";")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = `matriz-riscos-${hoje}.csv`;
    a.click();

    URL.revokeObjectURL(url);
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const scoreAtual = calcularScore(
    Number(riscoEditando.probabilidade),
    Number(riscoEditando.impacto)
  );

  const scoreResidual = calcularScore(
    Number(riscoEditando.risco_residual_probabilidade || 1),
    Number(riscoEditando.risco_residual_impacto || 1)
  );

  return (
    <div className="p-8 max-w-[1600px] mx-auto bg-slate-50 min-h-screen">
      {mensagem && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-sm font-bold">
          <AlertCircle className="w-4 h-4" />
          {mensagem}
          <button onClick={() => setMensagem(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-[11px] font-black uppercase tracking-widest mb-3">
            <ShieldAlert className="w-3.5 h-3.5" />
            ISO 9001 • ISO 31000 • ONA
          </div>

          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Gestão de Riscos
          </h1>

          <p className="text-sm text-slate-500 font-medium mt-1">
            Matriz de riscos, controles, barreiras, tratamento e monitoramento institucional.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={carregarRiscos}
            className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-bold flex items-center gap-2 shadow-sm hover:bg-slate-50"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </button>

          <button
            onClick={exportarCsv}
            className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-bold flex items-center gap-2 shadow-sm hover:bg-slate-50"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Exportar matriz
          </button>

          <button
            onClick={abrirNovo}
            className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold flex items-center gap-2 shadow-md hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Novo risco
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        {[
          {
            label: "Total de riscos",
            value: indicadores.total,
            icon: <Layers className="w-5 h-5" />,
            color: "text-blue-700 bg-blue-50",
          },
          {
            label: "Críticos",
            value: indicadores.criticos,
            icon: <AlertTriangle className="w-5 h-5" />,
            color: "text-red-700 bg-red-50",
          },
          {
            label: "Altos",
            value: indicadores.altos,
            icon: <Gauge className="w-5 h-5" />,
            color: "text-orange-700 bg-orange-50",
          },
          {
            label: "Em tratamento",
            value: indicadores.tratamento,
            icon: <ClipboardCheck className="w-5 h-5" />,
            color: "text-violet-700 bg-violet-50",
          },
          {
            label: "Atrasados",
            value: indicadores.atrasados,
            icon: <CalendarClock className="w-5 h-5" />,
            color: "text-amber-700 bg-amber-50",
          },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm"
          >
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center ${card.color}`}
            >
              {card.icon}
            </div>

            <p className="text-3xl font-black text-slate-900 mt-4">
              {card.value}
            </p>

            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
              {card.label}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-6 mb-8">
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900">
                Matriz de Mapeamento de Riscos
              </h2>

              <p className="text-xs text-slate-500 font-medium">
                Visão tabular semelhante à planilha de gestão institucional.
              </p>
            </div>

            <BarChart3 className="w-5 h-5 text-slate-400" />
          </div>

          <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por código, processo, setor, risco ou responsável..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none focus:bg-white focus:border-blue-500"
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

              <select
                value={filtroClassificacao}
                onChange={(e) => setFiltroClassificacao(e.target.value)}
                className="pl-10 pr-8 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 outline-none"
              >
                <option value="TODOS">Todos os níveis</option>
                <option value="BAIXO">Baixo</option>
                <option value="MODERADO">Moderado</option>
                <option value="ALTO">Alto</option>
                <option value="CRITICO">Crítico</option>
              </select>
            </div>
          </div>

          <div className="overflow-auto max-h-[620px]">
            <table className="w-full min-w-[1500px] text-sm border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-900 text-white text-[10px] uppercase tracking-widest">
                  {[
                    "Código",
                    "Processo",
                    "Setor",
                    "Risco",
                    "Causa",
                    "Consequência",
                    "P",
                    "I",
                    "Score",
                    "Nível",
                    "Controles",
                    "Barreiras",
                    "Estratégia",
                    "Status",
                    "Responsável",
                    "Prazo",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left font-black border-r border-slate-700 last:border-r-0"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {riscosFiltrados.map((risco) => {
                  const score = calcularScore(risco.probabilidade, risco.impacto);

                  return (
                    <tr
                      key={risco.id}
                      onClick={() => abrirEdicao(risco)}
                      className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 font-black text-blue-700">
                        {risco.codigo}
                      </td>

                      <td className="px-4 py-3 text-slate-700">
                        {risco.processo_vinculado || "-"}
                      </td>

                      <td className="px-4 py-3 text-slate-700">
                        {risco.setor || "-"}
                      </td>

                      <td className="px-4 py-3 font-bold text-slate-900">
                        {risco.titulo || "-"}
                      </td>

                      <td className="px-4 py-3 text-slate-600 max-w-[220px] truncate">
                        {risco.causa || "-"}
                      </td>

                      <td className="px-4 py-3 text-slate-600 max-w-[220px] truncate">
                        {risco.consequencia || "-"}
                      </td>

                      <td className="px-4 py-3 font-black text-center">
                        {risco.probabilidade}
                      </td>

                      <td className="px-4 py-3 font-black text-center">
                        {risco.impacto}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`px-2.5 py-1 rounded-lg border text-xs font-black ${classeCelula(
                            score
                          )}`}
                        >
                          {score}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`px-2.5 py-1 rounded-lg border text-xs font-black ${classeRisco(
                            risco.classificacao
                          )}`}
                        >
                          {risco.classificacao}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-slate-600 max-w-[220px] truncate">
                        {risco.controles_existentes || "-"}
                      </td>

                      <td className="px-4 py-3 text-slate-600 max-w-[260px] truncate">
                        {[
                          risco.barreiras_preventivas,
                          risco.barreiras_detectivas,
                          risco.barreiras_corretivas,
                        ]
                          .filter(Boolean)
                          .join(" | ") || "-"}
                      </td>

                      <td className="px-4 py-3 font-bold text-slate-700">
                        {risco.estrategia || "-"}
                      </td>

                      <td className="px-4 py-3 text-slate-600">
                        {risco.status || "-"}
                      </td>

                      <td className="px-4 py-3 text-slate-700">
                        {risco.responsavel || "-"}
                      </td>

                      <td
                        className={`px-4 py-3 ${
                          dataAtrasada(risco.prazo_tratamento)
                            ? "text-red-600 font-black"
                            : "text-slate-600"
                        }`}
                      >
                        {risco.prazo_tratamento || "-"}
                      </td>
                    </tr>
                  );
                })}

                {riscosFiltrados.length === 0 && (
                  <tr>
                    <td
                      colSpan={16}
                      className="px-6 py-16 text-center text-slate-400 font-bold"
                    >
                      Nenhum risco encontrado. Clique em “Novo risco” para começar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-black text-slate-900">
                Mapa de Calor 5x5
              </h2>

              <p className="text-xs text-slate-500 font-medium">
                Probabilidade x Impacto
              </p>
            </div>

            <Target className="w-5 h-5 text-slate-400" />
          </div>

          <div className="grid grid-cols-[36px_repeat(5,1fr)] gap-2">
            <div />

            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="text-center text-[10px] font-black text-slate-400 uppercase"
              >
                I{i}
              </div>
            ))}

            {[5, 4, 3, 2, 1].map((p) => (
              <React.Fragment key={p}>
                <div className="flex items-center justify-center text-[10px] font-black text-slate-400">
                  P{p}
                </div>

                {[1, 2, 3, 4, 5].map((i) => {
                  const score = p * i;
                  const qtd = riscos.filter(
                    (r) => r.probabilidade === p && r.impacto === i
                  ).length;

                  return (
                    <div
                      key={`${p}-${i}`}
                      className={`h-16 rounded-2xl border flex flex-col items-center justify-center ${classeCelula(
                        score
                      )}`}
                    >
                      <span className="text-sm font-black">{score}</span>
                      <span className="text-[10px] font-bold">
                        {qtd} risco(s)
                      </span>
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>

          <div className="mt-6 space-y-3">
            {["BAIXO", "MODERADO", "ALTO", "CRITICO"].map((nivel) => (
              <div
                key={nivel}
                className="flex items-center justify-between text-xs"
              >
                <span
                  className={`px-2.5 py-1 rounded-lg border font-black ${classeRisco(
                    nivel
                  )}`}
                >
                  {nivel}
                </span>

                <span className="font-bold text-slate-500">
                  {riscos.filter((r) => r.classificacao === nivel).length} registro(s)
                </span>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2 text-sm font-black text-slate-800 mb-2">
              <Activity className="w-4 h-4 text-blue-600" />
              Critério sugerido
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Avaliação baseada em probabilidade e impacto, com tratamento conforme
              prioridade, barreiras e controles para reduzir o risco residual.
            </p>
          </div>
        </div>
      </div>

      {modalAberto && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-6xl max-h-[92vh] overflow-hidden rounded-3xl shadow-2xl border border-slate-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-900">
                  {riscoEditando.id ? "Editar Risco" : "Cadastrar Novo Risco"}
                </h2>

                <p className="text-sm text-slate-500 font-medium">
                  Identificação, análise, controles, barreiras e tratamento.
                </p>
              </div>

              <button
                onClick={() => setModalAberto(false)}
                className="p-2 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(92vh-160px)]">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
                <Campo label="Código">
                  <input
                    value={riscoEditando.codigo}
                    onChange={(e) => atualizarCampo("codigo", e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                  />
                </Campo>

                <Campo label="Categoria">
                  <select
                    value={riscoEditando.categoria}
                    onChange={(e) => atualizarCampo("categoria", e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                  >
                    <option>Assistencial</option>
                    <option>Operacional</option>
                    <option>Estratégico</option>
                    <option>Financeiro</option>
                    <option>Legal/Compliance</option>
                    <option>Tecnologia</option>
                    <option>Imagem/Reputação</option>
                  </select>
                </Campo>

                <Campo label="Setor">
                  <input
                    value={riscoEditando.setor}
                    onChange={(e) => atualizarCampo("setor", e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                  />
                </Campo>

                <Campo label="Responsável">
                  <input
                    value={riscoEditando.responsavel}
                    onChange={(e) => atualizarCampo("responsavel", e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                  />
                </Campo>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                <Campo label="Processo vinculado">
                  <input
                    value={riscoEditando.processo_vinculado || ""}
                    onChange={(e) =>
                      atualizarCampo("processo_vinculado", e.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                  />
                </Campo>

                <Campo label="Origem do risco">
                  <select
                    value={riscoEditando.origem || ""}
                    onChange={(e) => atualizarCampo("origem", e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                  >
                    <option>Mapeamento de processo</option>
                    <option>Auditoria interna</option>
                    <option>Ocorrência/evento</option>
                    <option>Indicador crítico</option>
                    <option>Análise estratégica</option>
                    <option>Requisito legal/normativo</option>
                  </select>
                </Campo>
              </div>

              <Campo label="Título do risco">
                <input
                  value={riscoEditando.titulo}
                  onChange={(e) => atualizarCampo("titulo", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 mb-4"
                />
              </Campo>

              <Campo label="Descrição do risco">
                <textarea
                  value={riscoEditando.descricao || ""}
                  onChange={(e) => atualizarCampo("descricao", e.target.value)}
                  className="w-full min-h-[90px] rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 mb-6"
                />
              </Campo>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                <Campo label="Causa / fonte do risco">
                  <textarea
                    value={riscoEditando.causa || ""}
                    onChange={(e) => atualizarCampo("causa", e.target.value)}
                    className="w-full min-h-[90px] rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                  />
                </Campo>

                <Campo label="Consequência / impacto esperado">
                  <textarea
                    value={riscoEditando.consequencia || ""}
                    onChange={(e) => atualizarCampo("consequencia", e.target.value)}
                    className="w-full min-h-[90px] rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                  />
                </Campo>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
                <Campo label="Probabilidade">
                  <select
                    value={riscoEditando.probabilidade}
                    onChange={(e) =>
                      atualizarCampo("probabilidade", Number(e.target.value))
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </Campo>

                <Campo label="Impacto">
                  <select
                    value={riscoEditando.impacto}
                    onChange={(e) => atualizarCampo("impacto", Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </Campo>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-2">
                    Score inerente
                  </p>

                  <div
                    className={`inline-flex px-3 py-1.5 rounded-xl border text-sm font-black ${classeCelula(
                      scoreAtual
                    )}`}
                  >
                    {scoreAtual} — {classificar(scoreAtual)}
                  </div>
                </div>

                <Campo label="Status">
                  <select
                    value={riscoEditando.status}
                    onChange={(e) => atualizarCampo("status", e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                  >
                    <option value="IDENTIFICADO">Identificado</option>
                    <option value="EM_TRATAMENTO">Em tratamento</option>
                    <option value="MONITORANDO">Monitorando</option>
                    <option value="TRATADO">Tratado</option>
                    <option value="ACEITO">Aceito</option>
                  </select>
                </Campo>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                <Campo label="Controles existentes">
                  <textarea
                    value={riscoEditando.controles_existentes || ""}
                    onChange={(e) =>
                      atualizarCampo("controles_existentes", e.target.value)
                    }
                    className="w-full min-h-[90px] rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                  />
                </Campo>

                <Campo label="Práticas de controle">
                  <textarea
                    value={riscoEditando.praticas_controle || ""}
                    onChange={(e) =>
                      atualizarCampo("praticas_controle", e.target.value)
                    }
                    className="w-full min-h-[90px] rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                  />
                </Campo>

                <Campo label="Monitoramento / evidência">
                  <textarea
                    value={riscoEditando.monitoramento || ""}
                    onChange={(e) => atualizarCampo("monitoramento", e.target.value)}
                    className="w-full min-h-[90px] rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                  />
                </Campo>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                <Campo label="Barreiras preventivas">
                  <textarea
                    value={riscoEditando.barreiras_preventivas || ""}
                    onChange={(e) =>
                      atualizarCampo("barreiras_preventivas", e.target.value)
                    }
                    className="w-full min-h-[90px] rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                  />
                </Campo>

                <Campo label="Barreiras detectivas">
                  <textarea
                    value={riscoEditando.barreiras_detectivas || ""}
                    onChange={(e) =>
                      atualizarCampo("barreiras_detectivas", e.target.value)
                    }
                    className="w-full min-h-[90px] rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                  />
                </Campo>

                <Campo label="Barreiras corretivas">
                  <textarea
                    value={riscoEditando.barreiras_corretivas || ""}
                    onChange={(e) =>
                      atualizarCampo("barreiras_corretivas", e.target.value)
                    }
                    className="w-full min-h-[90px] rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                  />
                </Campo>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
                <Campo label="Estratégia de tratamento">
                  <select
                    value={riscoEditando.estrategia}
                    onChange={(e) => atualizarCampo("estrategia", e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                  >
                    <option>Mitigar</option>
                    <option>Eliminar</option>
                    <option>Transferir</option>
                    <option>Aceitar</option>
                    <option>Explorar oportunidade</option>
                  </select>
                </Campo>

                <Campo label="Prazo de tratamento">
                  <input
                    type="date"
                    value={riscoEditando.prazo_tratamento || ""}
                    onChange={(e) =>
                      atualizarCampo("prazo_tratamento", e.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                  />
                </Campo>

                <Campo label="Data de avaliação">
                  <input
                    type="date"
                    value={riscoEditando.data_avaliacao || ""}
                    onChange={(e) => atualizarCampo("data_avaliacao", e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                  />
                </Campo>

                <Campo label="Próxima revisão">
                  <input
                    type="date"
                    value={riscoEditando.data_revisao || ""}
                    onChange={(e) => atualizarCampo("data_revisao", e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                  />
                </Campo>
              </div>

              <Campo label="Plano de tratamento">
                <textarea
                  value={riscoEditando.plano_tratamento || ""}
                  onChange={(e) =>
                    atualizarCampo("plano_tratamento", e.target.value)
                  }
                  className="w-full min-h-[110px] rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                />
              </Campo>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mt-6">
                <Campo label="Probabilidade residual">
                  <select
                    value={riscoEditando.risco_residual_probabilidade || 1}
                    onChange={(e) =>
                      atualizarCampo(
                        "risco_residual_probabilidade",
                        Number(e.target.value)
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </Campo>

                <Campo label="Impacto residual">
                  <select
                    value={riscoEditando.risco_residual_impacto || 1}
                    onChange={(e) =>
                      atualizarCampo("risco_residual_impacto", Number(e.target.value))
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </Campo>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-2">
                    Score residual
                  </p>

                  <div
                    className={`inline-flex px-3 py-1.5 rounded-xl border text-sm font-black ${classeCelula(
                      scoreResidual
                    )}`}
                  >
                    {scoreResidual} — {classificar(scoreResidual)}
                  </div>
                </div>

                <Campo label="KPI relacionado">
                  <input
                    value={riscoEditando.kpi_relacionado || ""}
                    onChange={(e) =>
                      atualizarCampo("kpi_relacionado", e.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                  />
                </Campo>
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 flex items-center justify-between bg-slate-50">
              <button
                onClick={() => excluirRisco(riscoEditando.id)}
                disabled={!riscoEditando.id}
                className="px-4 py-2.5 rounded-xl border border-red-200 text-red-600 bg-white text-sm font-bold flex items-center gap-2 disabled:opacity-40"
              >
                <Trash2 className="w-4 h-4" />
                Excluir
              </button>

              <div className="flex gap-3">
                <button
                  onClick={() => setModalAberto(false)}
                  className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-bold"
                >
                  Cancelar
                </button>

                <button
                  onClick={salvarRisco}
                  disabled={salvando}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold flex items-center gap-2 shadow-md hover:bg-blue-700 disabled:opacity-70"
                >
                  {salvando ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Salvar risco
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Campo({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
        {label}
      </span>
      {children}
    </label>
  );
}