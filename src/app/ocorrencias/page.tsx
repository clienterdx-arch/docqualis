"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  FileText,
  FileWarning,
  HeartHandshake,
  Lightbulb,
  Loader2,
  SearchCheck,
  Settings,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { carregarPerfilUsuario } from "@/lib/perfil";
import {
  mapRegistroDb,
  OCORRENCIA_MODULES,
  OcorrenciaModuloKey,
  Registro,
} from "@/lib/ocorrencias";

type PerfilOcorrencias = { empresa_id?: string | null };

const MODULOS: OcorrenciaModuloKey[] = [
  "triagem",
  "incidentes",
  "nao-conformidades",
  "ouvidoria",
  "melhoria",
];

const ICONES: Record<OcorrenciaModuloKey, React.ReactNode> = {
  triagem: <ClipboardList className="h-5 w-5" />,
  incidentes: <AlertTriangle className="h-5 w-5" />,
  "nao-conformidades": <FileWarning className="h-5 w-5" />,
  ouvidoria: <HeartHandshake className="h-5 w-5" />,
  melhoria: <Lightbulb className="h-5 w-5" />,
};

const TONS: Record<string, string> = {
  blue: "bg-blue-50 text-blue-600 border-blue-100",
  orange: "bg-orange-50 text-orange-600 border-orange-100",
  violet: "bg-violet-50 text-violet-600 border-violet-100",
  rose: "bg-rose-50 text-rose-600 border-rose-100",
  sky: "bg-sky-50 text-sky-600 border-sky-100",
  emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
};

function contaModulo(registros: Registro[], key: OcorrenciaModuloKey) {
  const modulo = OCORRENCIA_MODULES[key];
  if (key === "triagem") return registros.filter((r) => r.status === "AGUARDANDO_TRIAGEM").length;
  return registros.filter((r) => modulo.types.includes(r.tipo)).length;
}

export default function OcorrenciasPage() {
  const router = useRouter();
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [templatesCount, setTemplatesCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
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

      const [registrosResponse, templatesResponse] = await Promise.all([
        supabase
          .from("registros_preenchidos")
          .select("*")
          .eq("empresa_id", perfil.empresa_id)
          .order("created_at", { ascending: false }),
        supabase
          .from("registros_templates")
          .select("id, categoria, workflow, schema_json")
          .eq("empresa_id", perfil.empresa_id)
          .order("created_at", { ascending: false }),
      ]);

      if (!ativo) return;

      if (registrosResponse.error) {
        setErro("Não foi possível carregar ocorrências.");
        setRegistros([]);
      } else {
        setRegistros((registrosResponse.data ?? []).map((row) => mapRegistroDb(row as Record<string, unknown>)));
      }

      if (!templatesResponse.error) {
        setTemplatesCount((templatesResponse.data ?? []).filter(isTemplateOcorrencias).length);
      }

      setIsLoading(false);
    }

    void carregar();

    return () => {
      ativo = false;
    };
  }, [router]);

  const placar = useMemo(() => {
    const aguardando = registros.filter((r) => r.status === "AGUARDANDO_TRIAGEM").length;
    const emTratativa = registros.filter((r) => r.status === "EM_TRATATIVA" || r.status === "APROVACAO").length;
    const concluidos = registros.filter((r) => r.status === "CONCLUIDO").length;
    return [
      { label: "Total de Registros", value: registros.length, icon: <ClipboardList className="h-5 w-5" />, tone: "bg-slate-100 text-slate-600" },
      { label: "Aguardando Triagem", value: aguardando, icon: <SearchCheck className="h-5 w-5" />, tone: "bg-blue-50 text-blue-600" },
      { label: "Em Tratativa / Aprovação", value: emTratativa, icon: <AlertCircle className="h-5 w-5" />, tone: "bg-amber-50 text-amber-600" },
      { label: "Concluídos", value: concluidos, icon: <CheckCircle2 className="h-5 w-5" />, tone: "bg-emerald-50 text-emerald-600" },
    ];
  }, [registros]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-7">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Gestão de Ocorrências</h1>
            <p className="mt-1 text-sm text-slate-500">
              Incidentes, não conformidades, ouvidoria e oportunidades com triagem integrada.
            </p>
          </div>

          <Link
            href="/ocorrencias/configuracoes"
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-700"
          >
            <Settings className="h-4 w-4" /> Configurações
          </Link>
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

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <Link
            href="/ocorrencias/templates"
            className="group flex min-h-[156px] flex-col justify-between rounded-lg border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-4">
              <span className={`grid h-10 w-10 place-items-center rounded-lg border ${TONS.emerald}`}>
                <FileText className="h-5 w-5" />
              </span>
              <span className="text-3xl font-semibold tabular-nums text-slate-950">
                {isLoading ? "..." : templatesCount}
              </span>
            </div>
            <div>
              <h2 className="text-xs font-extrabold uppercase leading-snug tracking-normal text-slate-950">
                Cadastro de Template
              </h2>
              <p className="mt-1 text-xs leading-snug text-slate-500">Modelos de formulários para registros de ocorrência.</p>
            </div>
          </Link>

          {MODULOS.map((key) => {
            const modulo = OCORRENCIA_MODULES[key];
            const count = contaModulo(registros, key);
            return (
              <Link
                key={key}
                href={`/ocorrencias/${key}`}
                className="group flex min-h-[156px] flex-col justify-between rounded-lg border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className={`grid h-10 w-10 place-items-center rounded-lg border ${TONS[modulo.tone]}`}>
                    {ICONES[key]}
                  </span>
                  <span className="text-3xl font-semibold tabular-nums text-slate-950">
                    {isLoading ? "..." : count}
                  </span>
                </div>
                <div>
                  <h2 className="text-xs font-extrabold uppercase leading-snug tracking-normal text-slate-950">
                    {modulo.title}
                  </h2>
                  <p className="mt-1 text-xs leading-snug text-slate-500">{modulo.description}</p>
                </div>
              </Link>
            );
          })}
        </section>

        {isLoading && (
          <div className="flex items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white py-16 text-blue-600">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            <span className="text-sm font-semibold">Carregando ocorrências...</span>
          </div>
        )}
      </div>
    </main>
  );
}

function isTemplateOcorrencias(row: Record<string, unknown>) {
  const categoria = String(row.categoria ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const workflow = typeof row.workflow === "object" && row.workflow !== null ? row.workflow as Record<string, unknown> : {};
  const schema = typeof row.schema_json === "object" && row.schema_json !== null ? row.schema_json as Record<string, unknown> : {};

  return categoria.includes("ocorr") ||
    String(workflow.modulo ?? "").toLowerCase() === "ocorrencias" ||
    String(schema.modulo ?? "").toLowerCase() === "ocorrencias";
}
