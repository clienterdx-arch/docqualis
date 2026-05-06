"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Clock,
  Eye,
  Loader2,
  Search,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { carregarPerfilUsuario } from "@/lib/perfil";
import {
  mapRegistroDb,
  OCORRENCIA_MODULES,
  OcorrenciaModuloKey,
  Registro,
  STATUS_CONFIG,
  TIPO_CONFIG,
} from "@/lib/ocorrencias";

type PerfilOcorrencias = { empresa_id?: string | null };

function isModuloKey(value: string): value is OcorrenciaModuloKey {
  return value in OCORRENCIA_MODULES;
}

function fmt(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("pt-BR");
}

function resumo(value: string, max = 92) {
  if (!value) return "Sem descrição";
  return value.length > max ? `${value.slice(0, max)}...` : value;
}

function notificador(registro: Registro) {
  if (registro.anonimo) return "Anônimo";
  return registro.notificadorNome || "-";
}

function filtrarModulo(registros: Registro[], modulo: OcorrenciaModuloKey) {
  const config = OCORRENCIA_MODULES[modulo];
  if (modulo === "triagem") return registros.filter((registro) => registro.status === "AGUARDANDO_TRIAGEM");
  return registros.filter((registro) => config.types.includes(registro.tipo));
}

export default function OcorrenciasModuloPage() {
  const params = useParams<{ modulo: string }>();
  const router = useRouter();
  const moduloKey = params.modulo;
  const moduloValido = isModuloKey(moduloKey);
  const modulo = moduloValido ? OCORRENCIA_MODULES[moduloKey] : null;

  const [registros, setRegistros] = useState<Registro[]>([]);
  const [busca, setBusca] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!moduloValido) {
      setIsLoading(false);
      return;
    }

    let ativo = true;

    async function carregar() {
      setIsLoading(true);
      setErro(null);

      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push("/login");
        return;
      }

      const perfil = await carregarPerfilUsuario<PerfilOcorrencias>(data.session, "empresa_id");
      if (!ativo) return;

      if (!perfil?.empresa_id) {
        setErro("Não foi possível identificar a empresa vinculada ao usuário.");
        setIsLoading(false);
        return;
      }

      const response = await supabase
        .from("registros_preenchidos")
        .select("*")
        .eq("empresa_id", perfil.empresa_id)
        .order("created_at", { ascending: false });

      if (!ativo) return;

      if (response.error) {
        setErro("Não foi possível carregar ocorrências.");
        setRegistros([]);
      } else {
        setRegistros((response.data ?? []).map((row) => mapRegistroDb(row as Record<string, unknown>)));
      }

      setIsLoading(false);
    }

    void carregar();

    return () => {
      ativo = false;
    };
  }, [moduloValido, router]);

  const listaModulo = useMemo(() => {
    if (!moduloValido) return [];
    return filtrarModulo(registros, moduloKey);
  }, [moduloKey, moduloValido, registros]);

  const filtrados = useMemo(() => {
    const term = busca.trim().toLowerCase();
    if (!term) return listaModulo;
    return listaModulo.filter((registro) => {
      const base = [
        registro.codigo,
        TIPO_CONFIG[registro.tipo]?.label,
        STATUS_CONFIG[registro.status]?.label,
        registro.setorOcorrencia,
        registro.descricao,
        registro.notificadorNome,
        registro.pacienteNome,
      ].join(" ").toLowerCase();
      return base.includes(term);
    });
  }, [busca, listaModulo]);

  const placar = useMemo(() => {
    const aguardando = listaModulo.filter((r) => r.status === "AGUARDANDO_TRIAGEM").length;
    const emTratativa = listaModulo.filter((r) => ["EM_TRATATIVA", "APROVACAO", "EFICACIA"].includes(r.status)).length;
    const concluidos = listaModulo.filter((r) => r.status === "CONCLUIDO").length;
    return [
      { label: "Total do módulo", value: listaModulo.length, icon: <ClipboardList className="h-5 w-5" />, tone: "bg-slate-100 text-slate-600" },
      { label: "Aguardando", value: aguardando, icon: <Clock className="h-5 w-5" />, tone: "bg-blue-50 text-blue-600" },
      { label: "Em tratativa", value: emTratativa, icon: <AlertCircle className="h-5 w-5" />, tone: "bg-amber-50 text-amber-600" },
      { label: "Concluídos", value: concluidos, icon: <CheckCircle2 className="h-5 w-5" />, tone: "bg-emerald-50 text-emerald-600" },
    ];
  }, [listaModulo]);

  if (!moduloValido || !modulo) {
    return (
      <main className="min-h-screen bg-slate-50 px-8 py-8">
        <div className="mx-auto max-w-[1200px] rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
          <Link href="/ocorrencias" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
          <h1 className="mt-6 text-2xl font-semibold text-slate-950">Módulo não encontrado</h1>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-7">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link href="/ocorrencias" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-blue-700">
              <ArrowLeft className="h-4 w-4" /> Voltar para Ocorrências
            </Link>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">{modulo.title}</h1>
            <p className="mt-1 text-sm text-slate-500">{modulo.description}</p>
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar registros..."
              className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
            />
          </div>
        </header>

        {erro && (
          <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {erro}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {placar.map((item) => (
            <div key={item.label} className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <span className={`grid h-10 w-10 place-items-center rounded-lg ${item.tone}`}>
                {item.icon}
              </span>
              <div>
                <p className="text-3xl font-semibold tabular-nums text-slate-950">
                  {isLoading ? "..." : item.value}
                </p>
                <p className="text-xs font-medium text-slate-500">{item.label}</p>
              </div>
            </div>
          ))}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-1">
            <h2 className="text-lg font-semibold text-slate-950">Triagem de registros</h2>
            <p className="text-sm text-slate-500">
              {moduloKey === "triagem" ? "Registros aguardando avaliação da Qualidade." : "Registros do módulo selecionado."}
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20 text-blue-600">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              <span className="text-sm font-semibold">Carregando registros...</span>
            </div>
          ) : filtrados.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 py-16 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
              <h3 className="mt-4 text-base font-semibold text-slate-800">Nenhum registro encontrado</h3>
              <p className="mt-1 text-sm text-slate-500">A lista deste módulo está vazia.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Registro</th>
                    <th className="px-5 py-3">Tipo</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Setor</th>
                    <th className="px-5 py-3">Notificador</th>
                    <th className="px-5 py-3">Data</th>
                    <th className="px-5 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filtrados.map((registro) => {
                    const status = STATUS_CONFIG[registro.status];
                    const tipo = TIPO_CONFIG[registro.tipo];
                    const acao = registro.status === "AGUARDANDO_TRIAGEM" ? "Aceitar" : "Tratar";
                    return (
                      <tr key={registro.id} className="hover:bg-slate-50">
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-950">{registro.codigo || "Sem código"}</p>
                          <p className="mt-1 text-xs text-slate-500">{resumo(registro.descricao)}</p>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${tipo.bg} ${tipo.border} ${tipo.cor}`}>
                            {tipo.abrev}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${status.cls}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-500">{registro.setorOcorrencia || "-"}</td>
                        <td className="px-5 py-4 text-slate-500">{notificador(registro)}</td>
                        <td className="px-5 py-4 text-slate-500">{fmt(registro.dataOcorrencia || registro.dataRegistro)}</td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Link
                              href={`/ocorrencias/${moduloKey}/${registro.id}${registro.status === "AGUARDANDO_TRIAGEM" ? "?acao=aceitar" : ""}`}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-700"
                            >
                              <Eye className="h-3.5 w-3.5" /> {acao}
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
