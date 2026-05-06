"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileText,
  Loader2,
  Save,
  Send,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { carregarPerfilUsuario } from "@/lib/perfil";
import {
  CATEGORIA_NOTIVISA_OPTIONS,
  CLASSIFICACAO_OCORRENCIA_OPTIONS,
  DESFECHO_INCIDENTE_OPTIONS,
  GRAVIDADE_OPTIONS,
  mapRegistroDb,
  OCORRENCIA_MODULES,
  OcorrenciaModuloKey,
  ORIGEM_OPTIONS,
  PERIODO_OPTIONS,
  PRIORIDADE_OPTIONS,
  Registro,
  registroDadosPayload,
  SETORES,
  TIPO_ACAO_OPTIONS,
  USUARIOS,
} from "@/lib/ocorrencias";

type PerfilOcorrencias = { empresa_id?: string | null; nome?: string | null };
type Mensagem = { type: "success" | "error"; text: string };

function isModuloKey(value: string): value is OcorrenciaModuloKey {
  return value in OCORRENCIA_MODULES;
}

function hojeInput() {
  return new Date().toISOString().slice(0, 10);
}

function toDateInput(value: string) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const br = value.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function fmtStatus(value: string) {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/^\w|\s\w/g, (match) => match.toUpperCase());
}

function moduloDestino(registro: Registro): OcorrenciaModuloKey {
  if (registro.status === "AGUARDANDO_TRIAGEM") return "triagem";
  if (registro.tipo === "NI") return "incidentes";
  if (registro.tipo === "NC") return "nao-conformidades";
  if (registro.tipo === "MF") return "melhoria";
  return "ouvidoria";
}

function proximoStatus(registro: Registro) {
  if (registro.classificacaoNQSP === "Cancelar ocorrência") return "CANCELADO" as const;
  if (registro.status === "AGUARDANDO_TRIAGEM") return "EM_TRATATIVA" as const;
  if (registro.status === "EM_TRATATIVA") return "APROVACAO" as const;
  if (registro.status === "APROVACAO") return "EFICACIA" as const;
  if (registro.status === "EFICACIA") return "CONCLUIDO" as const;
  return registro.status;
}

function tipoAposClassificacao(registro: Registro) {
  if (registro.classificacaoNQSP === "Converter para Não Conformidade") return "NC" as const;
  if (registro.classificacaoNQSP === "Converter para Reclamação") return "RC" as const;
  return registro.tipo;
}

function normalizaLista(values: string[], fallback: string[]) {
  const lista = values.map((item) => item.trim()).filter(Boolean);
  return lista.length > 0 ? lista : fallback;
}

export default function OcorrenciaDetalhePage() {
  const params = useParams<{ modulo: string; id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const moduloKey = params.modulo;
  const moduloValido = isModuloKey(moduloKey);

  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [usuarioNome, setUsuarioNome] = useState("Usuário");
  const [registro, setRegistro] = useState<Registro | null>(null);
  const [activeTab, setActiveTab] = useState(1);
  const [setores, setSetores] = useState<string[]>(SETORES);
  const [usuarios, setUsuarios] = useState<string[]>(USUARIOS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [mensagem, setMensagem] = useState<Mensagem | null>(null);

  const isAceite = searchParams.get("acao") === "aceitar" || registro?.status === "AGUARDANDO_TRIAGEM";

  useEffect(() => {
    if (!moduloValido) {
      setIsLoading(false);
      return;
    }

    let ativo = true;

    async function carregar() {
      setIsLoading(true);
      setMensagem(null);

      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push("/login");
        return;
      }

      const perfil = await carregarPerfilUsuario<PerfilOcorrencias>(data.session, "empresa_id, nome");
      if (!ativo) return;

      if (!perfil?.empresa_id) {
        setMensagem({ type: "error", text: "Não foi possível identificar a empresa vinculada ao usuário." });
        setIsLoading(false);
        return;
      }

      setEmpresaId(perfil.empresa_id);
      setUsuarioNome(perfil.nome ?? data.session.user.email ?? "Usuário");

      const [registroResponse, setoresResponse, usuariosResponse] = await Promise.all([
        supabase
          .from("registros_preenchidos")
          .select("*")
          .eq("empresa_id", perfil.empresa_id)
          .eq("id", params.id)
          .maybeSingle(),
        supabase
          .from("config_setores")
          .select("nome")
          .eq("empresa_id", perfil.empresa_id)
          .order("nome"),
        supabase
          .from("perfis")
          .select("nome")
          .eq("empresa_id", perfil.empresa_id)
          .order("nome"),
      ]);

      if (!ativo) return;

      if (registroResponse.error || !registroResponse.data) {
        setMensagem({ type: "error", text: "Ocorrência não encontrada." });
        setRegistro(null);
      } else {
        const mapped = mapRegistroDb(registroResponse.data as Record<string, unknown>);
        setRegistro({
          ...mapped,
          dataRegistro: toDateInput(mapped.dataRegistro) || hojeInput(),
          dataOcorrencia: toDateInput(mapped.dataOcorrencia),
          dataClassificacao: toDateInput(mapped.dataClassificacao),
          prazoTratativa: toDateInput(mapped.prazoTratativa),
        });
      }

      if (!setoresResponse.error) {
        setSetores(normalizaLista((setoresResponse.data ?? []).map((item) => String(item.nome ?? "")), SETORES));
      }

      if (!usuariosResponse.error) {
        setUsuarios(normalizaLista((usuariosResponse.data ?? []).map((item) => String(item.nome ?? "")), USUARIOS));
      }

      setIsLoading(false);
    }

    void carregar();

    return () => {
      ativo = false;
    };
  }, [moduloValido, params.id, router]);

  const tabs = useMemo(() => {
    const base = [
      { id: 1, title: "Identificação", icon: <FileText className="h-4 w-4" /> },
      { id: 2, title: "Paciente", icon: <UserRound className="h-4 w-4" /> },
      { id: 3, title: "Classificação NQSP", icon: <ShieldCheck className="h-4 w-4" /> },
    ];

    if (registro?.tipo === "NI") {
      return [
        ...base,
        { id: 4, title: "Incidente", icon: <AlertCircle className="h-4 w-4" /> },
        { id: 5, title: "Tratativa", icon: <ClipboardList className="h-4 w-4" /> },
      ];
    }

    if (registro?.tipo === "NC") {
      return [
        ...base,
        { id: 4, title: "Não conformidade", icon: <AlertCircle className="h-4 w-4" /> },
      ];
    }

    return [
      ...base,
      { id: 4, title: "Tratativa", icon: <ClipboardList className="h-4 w-4" /> },
    ];
  }, [registro?.tipo]);

  function update<K extends keyof Registro>(key: K, value: Registro[K]) {
    setRegistro((atual) => atual ? { ...atual, [key]: value } : atual);
  }

  function registroComDataClassificacao(atual: Registro) {
    const needsDate = atual.status === "AGUARDANDO_TRIAGEM" || searchParams.get("acao") === "aceitar";
    return {
      ...atual,
      dataRegistro: atual.dataRegistro || hojeInput(),
      dataClassificacao: needsDate && !atual.dataClassificacao ? hojeInput() : atual.dataClassificacao,
    };
  }

  function validarProsseguir(atual: Registro) {
    const obrigatorios = [
      atual.codigo,
      atual.prioridade,
      atual.dataRegistro,
      atual.origem,
      atual.dataOcorrencia,
      atual.periodo,
      atual.setorOcorrencia,
      atual.descricao,
      atual.dataClassificacao,
      atual.classificacaoNQSP,
      atual.gravidade,
    ];

    if (atual.envolvePaciente) {
      obrigatorios.push(
        atual.pacienteNome,
        atual.pacienteAtendimento,
        atual.pacienteConsequencias,
        atual.acaoImediata
      );
    }

    return obrigatorios.every((value) => String(value ?? "").trim().length > 0);
  }

  async function salvar(modo: "rascunho" | "prosseguir") {
    if (!registro || !empresaId) return;

    let atualizado = registroComDataClassificacao(registro);

    if (modo === "prosseguir" && !validarProsseguir(atualizado)) {
      setMensagem({ type: "error", text: "Preencha os campos obrigatórios antes de prosseguir." });
      return;
    }

    if (modo === "prosseguir") {
      atualizado = {
        ...atualizado,
        tipo: tipoAposClassificacao(atualizado),
        status: proximoStatus(atualizado),
      };
    }

    const historico = [
      ...atualizado.historico,
      {
        id: `h${Date.now()}`,
        data: new Date().toLocaleString("pt-BR"),
        autor: usuarioNome,
        acao: modo === "rascunho"
          ? "Rascunho da ocorrência salvo."
          : isAceite
            ? "Ocorrência aceita pela Qualidade."
            : "Ocorrência encaminhada para a próxima etapa.",
      },
    ];

    atualizado = { ...atualizado, historico };

    setIsSaving(true);
    setMensagem(null);

    const { error } = await supabase
      .from("registros_preenchidos")
      .update({
        status: atualizado.status,
        dados: registroDadosPayload(atualizado),
        snapshot: registroDadosPayload(atualizado),
        historico: atualizado.historico,
        updated_at: new Date().toISOString(),
      })
      .eq("empresa_id", empresaId)
      .eq("id", atualizado.id);

    setIsSaving(false);

    if (error) {
      setMensagem({ type: "error", text: "Não foi possível salvar a ocorrência." });
      return;
    }

    setRegistro(atualizado);
    setMensagem({
      type: "success",
      text: modo === "rascunho" ? "Rascunho salvo com sucesso." : "Ocorrência atualizada com sucesso.",
    });

    if (modo === "prosseguir") {
      setTimeout(() => router.push(`/ocorrencias/${moduloDestino(atualizado)}`), 900);
    }
  }

  if (!moduloValido) {
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

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 text-blue-600">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        <span className="text-sm font-semibold">Carregando ocorrência...</span>
      </main>
    );
  }

  if (!registro) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1000px] rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
          <Link href={`/ocorrencias/${moduloKey}`} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-blue-700">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
          <h1 className="mt-6 text-2xl font-semibold text-slate-950">Ocorrência não encontrada</h1>
          {mensagem && <p className="mt-2 text-sm text-red-600">{mensagem.text}</p>}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header className="flex flex-col gap-4">
          <Link href={`/ocorrencias/${moduloKey}`} className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-blue-700">
            <ArrowLeft className="h-4 w-4" /> Voltar para lista
          </Link>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
              {isAceite ? "Aceitar ocorrência" : "Tratativa da ocorrência"}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {registro.codigo || "Sem código"} · {fmtStatus(registro.status)}
            </p>
          </div>
        </header>

        {mensagem && (
          <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-semibold ${
            mensagem.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}>
            {mensagem.type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
            {mensagem.text}
          </div>
        )}

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex overflow-x-auto border-b border-slate-100 bg-slate-50">
            {tabs.map((tab) => (
              <TabButton
                key={tab.id}
                active={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                step={tab.id}
                icon={tab.icon}
                title={tab.title}
              />
            ))}
          </div>

          <div className="min-h-[520px] p-8">
            {activeTab === 1 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-4">
                  <InputField label="Código" required value={registro.codigo} onChange={(value) => update("codigo", value)} readOnly />
                  <SelectField label="Prioridade" required value={registro.prioridade} onChange={(value) => update("prioridade", value as Registro["prioridade"])} options={PRIORIDADE_OPTIONS} />
                  <InputField label="Data do registro" required type="date" value={registro.dataRegistro} onChange={(value) => update("dataRegistro", value)} readOnly />
                  <SelectField label="Origem" required value={registro.origem} onChange={(value) => update("origem", value as Registro["origem"])} options={ORIGEM_OPTIONS} />
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                  <InputField label="Data da ocorrência" required type="date" value={registro.dataOcorrencia} onChange={(value) => update("dataOcorrencia", value)} />
                  <SelectField label="Período" required value={registro.periodo} onChange={(value) => update("periodo", value as Registro["periodo"])} options={PERIODO_OPTIONS} />
                  <SelectField label="Setor da Ocorrência" required value={registro.setorOcorrencia} onChange={(value) => update("setorOcorrencia", value)} options={setores} />
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                  <h2 className="mb-4 text-sm font-semibold text-slate-900">Dados de identificação do notificador</h2>
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-4">
                    <InputField label="Nome" value={registro.notificadorNome} onChange={(value) => update("notificadorNome", value)} />
                    <InputField label="Cargo/Função" value={registro.notificadorCargo} onChange={(value) => update("notificadorCargo", value)} />
                    <InputField label="Setor" value={registro.notificadorSetor} onChange={(value) => update("notificadorSetor", value)} />
                    <InputField label="E-mail" type="email" value={registro.notificadorEmail} onChange={(value) => update("notificadorEmail", value)} />
                  </div>
                </div>

                <TextareaField label="Descrição da Ocorrência" required value={registro.descricao} onChange={(value) => update("descricao", value)} rows={5} />
                <SelectField
                  label="Envolve paciente?"
                  required
                  value={registro.envolvePaciente ? "Sim" : "Não"}
                  onChange={(value) => update("envolvePaciente", value === "Sim")}
                  options={["Sim", "Não"]}
                />
              </div>
            )}

            {activeTab === 2 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <InputField label="Nome completo do Paciente" required value={registro.pacienteNome} onChange={(value) => update("pacienteNome", value)} />
                  <InputField label="Nº atendimento" required value={registro.pacienteAtendimento} onChange={(value) => update("pacienteAtendimento", value)} />
                </div>
                <TextareaField label="Consequências para o paciente" required value={registro.pacienteConsequencias} onChange={(value) => update("pacienteConsequencias", value)} rows={5} />
                <TextareaField label="Ação Imediata" required value={registro.acaoImediata} onChange={(value) => update("acaoImediata", value)} rows={4} />
              </div>
            )}

            {activeTab === 3 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                  <InputField label="Data da classificação (NQSP)" required type="date" value={registro.dataClassificacao} onChange={(value) => update("dataClassificacao", value)} />
                  <SelectField label="Classificação da ocorrência" required value={registro.classificacaoNQSP} onChange={(value) => update("classificacaoNQSP", value)} options={CLASSIFICACAO_OCORRENCIA_OPTIONS} />
                  <SelectField label="Gravidade da Ocorrência" required value={registro.gravidade} onChange={(value) => update("gravidade", value as Registro["gravidade"])} options={GRAVIDADE_OPTIONS} />
                </div>
              </div>
            )}

            {activeTab === 4 && registro.tipo === "NI" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <SelectField label="Classificação Desfecho" value={registro.classificacaoDesfecho} onChange={(value) => update("classificacaoDesfecho", value)} options={DESFECHO_INCIDENTE_OPTIONS} />
                  <SelectField label="Categoria dos Incidentes (Notivisa)" value={registro.categoriaNotiVisa} onChange={(value) => update("categoriaNotiVisa", value)} options={CATEGORIA_NOTIVISA_OPTIONS} />
                </div>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <InputField label="Nº NOTIVISA (quando aplicável)" value={registro.numeroNotivisa} onChange={(value) => update("numeroNotivisa", value)} />
                  <InputField label="Link do PDF da notificação NOTIVISA (quando aplicável)" value={registro.linkNotivisa} onChange={(value) => update("linkNotivisa", value)} />
                </div>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <TextareaField label="Tratativa Sugerida" value={registro.trativaSugerida} onChange={(value) => update("trativaSugerida", value)} rows={4} />
                  <SelectField label="Tipo de Ação" value={registro.tipoAcao} onChange={(value) => update("tipoAcao", value)} options={TIPO_ACAO_OPTIONS} />
                </div>
              </div>
            )}

            {activeTab === 5 && registro.tipo === "NI" && (
              <TratativaFields
                registro={registro}
                setores={setores}
                usuarios={usuarios}
                update={update}
              />
            )}

            {activeTab === 4 && registro.tipo === "NC" && (
              <div className="space-y-6">
                <TextareaField label="Quebra do acordo" value={registro.quebraAcordo} onChange={(value) => update("quebraAcordo", value)} rows={4} />
                <TratativaFields
                  registro={registro}
                  setores={setores}
                  usuarios={usuarios}
                  update={update}
                />
              </div>
            )}

            {activeTab === 4 && registro.tipo !== "NI" && registro.tipo !== "NC" && (
              <TratativaFields
                registro={registro}
                setores={setores}
                usuarios={usuarios}
                update={update}
              />
            )}
          </div>

          <div className="flex flex-col gap-4 border-t border-slate-200 bg-slate-50 p-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <CalendarClock className="h-4 w-4" />
              {registro.dataClassificacao ? `Classificação registrada em ${registro.dataClassificacao}` : "Classificação NQSP pendente"}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => salvar("rascunho")}
                disabled={isSaving}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:opacity-60"
              >
                <Save className="h-4 w-4" /> Salvar como rascunho
              </button>
              <button
                onClick={() => salvar("prosseguir")}
                disabled={isSaving}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-700 disabled:opacity-60"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Prosseguir
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function TratativaFields({
  registro,
  setores,
  usuarios,
  update,
}: {
  registro: Registro;
  setores: string[];
  usuarios: string[];
  update: <K extends keyof Registro>(key: K, value: Registro[K]) => void;
}) {
  return (
    <div className="space-y-6">
      <TextareaField label="Tratativa Sugerida" value={registro.trativaSugerida} onChange={(value) => update("trativaSugerida", value)} rows={5} />
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <SelectField label="Tipo de ação" value={registro.tipoAcao} onChange={(value) => update("tipoAcao", value)} options={TIPO_ACAO_OPTIONS} />
        <SelectField label="Unidade responsável pela tratativa" value={registro.unidadeResponsavel} onChange={(value) => update("unidadeResponsavel", value)} options={setores} />
      </div>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <SelectField label="Responsável pela tratativa" value={registro.responsavelTratativa} onChange={(value) => update("responsavelTratativa", value)} options={usuarios} />
        <InputField label="Data prazo para tratativa" type="date" value={registro.prazoTratativa} onChange={(value) => update("prazoTratativa", value)} />
      </div>
    </div>
  );
}

function TabButton({ active, onClick, step, icon, title }: {
  active: boolean;
  onClick: () => void;
  step: number;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex min-w-[170px] flex-1 items-center justify-center gap-3 border-b-2 p-5 text-sm font-semibold transition ${
        active
          ? "border-blue-600 bg-white text-blue-700"
          : "border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-700"
      }`}
    >
      <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black ${
        active ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500"
      }`}>
        {step}
      </span>
      <span className={active ? "text-blue-600" : "text-slate-400"}>{icon}</span>
      <span className="hidden md:inline">{title}</span>
    </button>
  );
}

function Label({ label, required }: { label: string; required?: boolean }) {
  return (
    <label className="mb-1.5 flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-slate-500">
      {label} {required && <span className="text-sm leading-none text-red-500">*</span>}
    </label>
  );
}

function InputField({
  label,
  value,
  onChange,
  type = "text",
  required,
  readOnly,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  readOnly?: boolean;
}) {
  return (
    <div>
      <Label label={label} required={required} />
      <input
        type={type}
        value={value}
        readOnly={readOnly}
        onChange={(event) => onChange(event.target.value)}
        className={`h-11 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50 ${
          readOnly ? "bg-slate-50 text-slate-500" : "bg-white"
        }`}
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  required?: boolean;
}) {
  return (
    <div>
      <Label label={label} required={required} />
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
      >
        <option value="">Selecione...</option>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </div>
  );
}

function TextareaField({
  label,
  value,
  onChange,
  rows,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows: number;
  required?: boolean;
}) {
  return (
    <div>
      <Label label={label} required={required} />
      <textarea
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
      />
    </div>
  );
}
