"use client";

import React, { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  Archive,
  BarChart3,
  Bot,
  CheckCircle2,
  ChevronRight,
  ClipboardSignature,
  Cloud,
  DatabaseZap,
  Download,
  FileCheck2,
  FileJson,
  Fingerprint,
  Gauge,
  GitBranch,
  Globe2,
  HardDriveDownload,
  Layers3,
  Loader2,
  LockKeyhole,
  MapPin,
  MessageSquareText,
  Plus,
  QrCode,
  ScanLine,
  Search,
  Send,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Timer,
  UploadCloud,
  Webhook,
  XCircle,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { carregarPerfilUsuario } from "@/lib/perfil";
import {
  calculateRiskScore,
  createField,
  createRegistryId,
  createSchemaFromPrompt,
  defaultWorkflow,
  sha256Hex,
  summarizeAnalytics,
} from "@/lib/registros/nexus";
import type {
  RegistryAnalytics,
  RegistryField,
  RegistryFieldType,
  RegistryRecord,
  RegistryRecordStatus,
  RegistryTemplate,
  RegistryTemplateStatus,
  RegistryWorkflowStep,
} from "@/types/registros";

type ModuleView = "templates" | "builder" | "records" | "workflow" | "truth" | "analytics" | "field" | "governance" | "integrations";

type PerfilRegistros = {
  empresa_id?: string | null;
  nome?: string | null;
  perfil_acesso?: string | null;
};

type DbRow = Record<string, unknown>;

const fieldTypes: Array<{ type: RegistryFieldType; label: string; icon: React.ElementType }> = [
  { type: "text", label: "Texto", icon: MessageSquareText },
  { type: "number", label: "Numero", icon: Gauge },
  { type: "date", label: "Data", icon: Timer },
  { type: "select", label: "Dropdown", icon: Layers3 },
  { type: "photo", label: "Foto", icon: UploadCloud },
  { type: "signature", label: "Assinatura", icon: Fingerprint },
  { type: "geo", label: "Geo", icon: MapPin },
  { type: "qr", label: "QR/Barcode", icon: QrCode },
  { type: "audio", label: "Audio", icon: Bot },
  { type: "ocr", label: "OCR", icon: ScanLine },
];

const statusLabels: Record<RegistryRecordStatus, string> = {
  RASCUNHO: "Rascunho",
  ENVIADO: "Enviado",
  EM_VERIFICACAO: "Em verificacao",
  EM_APROVACAO: "Em aprovacao",
  APROVADO: "Aprovado",
  REJEITADO: "Rejeitado",
  AJUSTE_SOLICITADO: "Ajuste solicitado",
  CANCELADO: "Cancelado",
};

const statusStyles: Record<RegistryRecordStatus, string> = {
  RASCUNHO: "border-slate-200 bg-slate-50 text-slate-600",
  ENVIADO: "border-blue-200 bg-blue-50 text-blue-700",
  EM_VERIFICACAO: "border-amber-200 bg-amber-50 text-amber-700",
  EM_APROVACAO: "border-violet-200 bg-violet-50 text-violet-700",
  APROVADO: "border-emerald-200 bg-emerald-50 text-emerald-700",
  REJEITADO: "border-red-200 bg-red-50 text-red-700",
  AJUSTE_SOLICITADO: "border-orange-200 bg-orange-50 text-orange-700",
  CANCELADO: "border-slate-200 bg-slate-100 text-slate-500",
};

const viewItems: Array<{ key: ModuleView; label: string; icon: React.ElementType; description: string }> = [
  { key: "templates", label: "Central", icon: ClipboardSignature, description: "Templates, registros e cards executivos" },
  { key: "builder", label: "Builder", icon: Sparkles, description: "NL para schema, campos, logica e versao" },
  { key: "records", label: "Registros", icon: DatabaseZap, description: "Aggregates, status e acoes" },
  { key: "workflow", label: "Workflow", icon: GitBranch, description: "BPMN/DMN, SLA e delegacao" },
  { key: "truth", label: "Verdade", icon: LockKeyhole, description: "Hash, eventos e verificacao" },
  { key: "analytics", label: "BI", icon: BarChart3, description: "Funis, gargalos e coortes" },
  { key: "field", label: "Campo", icon: Smartphone, description: "PWA offline, camera e sync" },
  { key: "governance", label: "Governanca", icon: ShieldCheck, description: "LGPD, RBAC/ABAC e retencao" },
  { key: "integrations", label: "Integracoes", icon: Webhook, description: "Webhooks, API e conectores" },
];

const fieldExperienceItems: Array<{ label: string; icon: React.ElementType; description: string }> = [
  { label: "PWA instalavel", icon: Smartphone, description: "Service Worker + IndexedDB/Dexie na proxima etapa" },
  { label: "Modo aviao", icon: Cloud, description: "Fila de sync com retry e conflito auditavel" },
  { label: "Foto antifraude", icon: MapPin, description: "EXIF, geolocalizacao e timestamp" },
  { label: "Touch 44px+", icon: Gauge, description: "Operacao one-thumb e contraste AA" },
];

const integrationItems: Array<{ label: string; icon: React.ElementType; description: string }> = [
  { label: "Webhooks HMAC", icon: Webhook, description: "Retries, DLQ e replay manual" },
  { label: "API REST/GraphQL", icon: Globe2, description: "OpenAPI 3.1 e OAuth 2.1" },
  { label: "Conectores", icon: Cloud, description: "Teams, Slack, WhatsApp, Drive, ERP" },
  { label: "IoT inbound", icon: Activity, description: "Sensores podem abrir registros" },
];

function isObject(value: unknown): value is DbRow {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function textValue(row: DbRow, key: string, fallback = ""): string {
  const value = row[key];
  return typeof value === "string" ? value : fallback;
}

function numberValue(row: DbRow, key: string, fallback = 0): number {
  const value = row[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function boolValue(row: DbRow, key: string): boolean {
  return row[key] === true;
}

function normalizeTemplateStatus(value: string): RegistryTemplateStatus {
  const normalized = value.toUpperCase();
  if (normalized === "ATIVO" || normalized === "PUBLICADO") return "PUBLICADO";
  if (normalized === "REVISAO") return "REVISAO";
  if (normalized === "OBSOLETO") return "OBSOLETO";
  return "RASCUNHO";
}

function normalizeRecordStatus(value: string): RegistryRecordStatus {
  const normalized = value.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_");
  if (normalized === "EM_VERIFICACAO") return "EM_VERIFICACAO";
  if (normalized === "EM_APROVACAO") return "EM_APROVACAO";
  if (normalized === "APROVADO") return "APROVADO";
  if (normalized === "REJEITADO") return "REJEITADO";
  if (normalized === "AJUSTE_SOLICITADO") return "AJUSTE_SOLICITADO";
  if (normalized === "CANCELADO" || normalized === "EXCLUIDO") return "CANCELADO";
  if (normalized === "RASCUNHO") return "RASCUNHO";
  return "ENVIADO";
}

function parseFields(value: unknown): RegistryField[] {
  if (!Array.isArray(value)) return [];

  return value.filter(isObject).map((item, index) => ({
    id: textValue(item, "id", `field_${index + 1}`),
    type: (textValue(item, "type", "text") as RegistryFieldType) || "text",
    label: textValue(item, "label", `Campo ${index + 1}`),
    required: item.required === true,
    options: Array.isArray(item.options) ? item.options.filter((option): option is string => typeof option === "string") : undefined,
    helpText: textValue(item, "helpText") || undefined,
    piiCategory: item.piiCategory === "personal" || item.piiCategory === "sensitive" ? item.piiCategory : "none",
    riskWeight: numberValue(item, "riskWeight", 4),
  }));
}

function parseWorkflow(value: unknown): RegistryWorkflowStep[] {
  if (isObject(value) && Array.isArray(value.steps)) {
    return value.steps.filter(isObject).map((item, index) => ({
      id: textValue(item, "id", `step_${index + 1}`),
      type: textValue(item, "type", "task") as RegistryWorkflowStep["type"],
      label: textValue(item, "label", `Etapa ${index + 1}`),
      owner: textValue(item, "owner", "Qualidade"),
      slaHours: numberValue(item, "slaHours", 24),
      escalation: textValue(item, "escalation", "Gestor"),
    }));
  }

  return defaultWorkflow();
}

function mapTemplate(row: DbRow): RegistryTemplate {
  const major = numberValue(row, "versao_major", 1);
  const minor = numberValue(row, "versao_minor", 0);
  const patch = numberValue(row, "versao_patch", 0);

  return {
    id: textValue(row, "id"),
    empresa_id: textValue(row, "empresa_id"),
    titulo: textValue(row, "titulo", "Template sem titulo"),
    descricao: textValue(row, "descricao"),
    status: normalizeTemplateStatus(textValue(row, "status", "RASCUNHO")),
    categoria: textValue(row, "categoria", "Qualidade"),
    setor: textValue(row, "setor", "Geral"),
    versao: `v${major}.${minor}.${patch}`,
    campos: parseFields(row.campos),
    workflowSteps: parseWorkflow(row.workflow),
    conditionalLogic: Array.isArray(row.conditional_logic) ? row.conditional_logic.filter((item): item is string => typeof item === "string") : [],
    piiPolicy: isObject(row.pii_policy) ? textValue(row.pii_policy, "classificacao", "Sem PII detectada") : "Sem PII detectada",
    retentionDays: isObject(row.retention_policy) ? numberValue(row.retention_policy, "retentionDays", 1825) : 1825,
    created_at: textValue(row, "created_at"),
  };
}

function mapRecord(row: DbRow, templateMap: Map<string, RegistryTemplate>): RegistryRecord {
  const templateId = textValue(row, "template_id") || null;
  const template = templateId ? templateMap.get(templateId) : undefined;

  return {
    id: textValue(row, "id"),
    empresa_id: textValue(row, "empresa_id"),
    template_id: templateId,
    numero: textValue(row, "numero", textValue(row, "id", "REG")),
    template_titulo: template?.titulo ?? textValue(row, "template_titulo", "Registro avulso"),
    status: normalizeRecordStatus(textValue(row, "status", "ENVIADO")),
    preenchido_por: textValue(row, "preenchido_por", "Usuario"),
    current_owner: textValue(row, "current_owner", isObject(row.dados) ? textValue(row.dados, "_currentOwner", "Qualidade") : "Qualidade"),
    submitted_at: textValue(row, "submitted_at", textValue(row, "created_at")),
    risk_score: numberValue(row, "risk_score", 0),
    flag_revisao_humana: boolValue(row, "flag_revisao_humana"),
    hash_sha256: textValue(row, "hash_sha256") || null,
    total_eventos: numberValue(row, "total_eventos", 0),
  };
}

function formatDate(value: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-BR");
}

function KpiCard({
  label,
  value,
  description,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  description: string;
  icon: React.ElementType;
  tone: string;
}) {
  return (
    <div className="min-h-[120px] rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className={`grid h-10 w-10 place-items-center rounded-lg ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
        <strong className="text-3xl font-semibold tracking-normal text-slate-950">{value}</strong>
      </div>
      <h3 className="mt-4 text-xs font-extrabold uppercase tracking-normal text-slate-950">{label}</h3>
      <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
    </div>
  );
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-2xl font-semibold tracking-normal text-slate-950">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

export default function GestaoRegistrosPage() {
  const router = useRouter();
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [usuarioNome, setUsuarioNome] = useState("Usuario");
  const [templates, setTemplates] = useState<RegistryTemplate[]>([]);
  const [records, setRecords] = useState<RegistryRecord[]>([]);
  const [view, setView] = useState<ModuleView>("templates");
  const [search, setSearch] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [builderPrompt, setBuilderPrompt] = useState("Checklist diario de EPI com foto, assinatura e bloqueio se item critico estiver faltando");
  const [draftTitle, setDraftTitle] = useState("Checklist Diario de EPI");
  const [draftCategory, setDraftCategory] = useState("Seguranca do Trabalho");
  const [draftSector, setDraftSector] = useState("Obra / Campo");
  const [draftFields, setDraftFields] = useState<RegistryField[]>(createSchemaFromPrompt(builderPrompt));
  const [recordData, setRecordData] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;

      if (!data.session) {
        router.push("/login");
        return;
      }

      const perfil = await carregarPerfilUsuario<PerfilRegistros>(data.session, "empresa_id, nome, perfil_acesso");
      if (!active) return;

      if (!perfil?.empresa_id) {
        setMessage({ type: "error", text: "Nao foi possivel identificar a empresa vinculada ao usuario." });
        setIsLoading(false);
        return;
      }

      setEmpresaId(perfil.empresa_id);
      setUsuarioNome(perfil.nome ?? data.session.user.email ?? "Usuario");
    });

    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    if (!empresaId) return;
    let active = true;

    Promise.all([
      supabase.from("registros_templates").select("*").eq("empresa_id", empresaId).order("created_at", { ascending: false }),
      supabase.from("registros_preenchidos").select("*").eq("empresa_id", empresaId).order("created_at", { ascending: false }),
    ]).then(([templatesResult, recordsResult]) => {
      if (!active) return;

      if (templatesResult.error || recordsResult.error) {
        setMessage({ type: "error", text: "Nao foi possivel carregar registros. Verifique as migrations do banco." });
        setTemplates([]);
        setRecords([]);
        setIsLoading(false);
        return;
      }

      const mappedTemplates = (Array.isArray(templatesResult.data) ? templatesResult.data : []).map((row) => mapTemplate(row as DbRow));
      const templateMap = new Map(mappedTemplates.map((template) => [template.id, template]));
      const mappedRecords = (Array.isArray(recordsResult.data) ? recordsResult.data : []).map((row) => mapRecord(row as DbRow, templateMap));

      setTemplates(mappedTemplates);
      setRecords(mappedRecords);
      setSelectedTemplateId((current) => current || mappedTemplates[0]?.id || "");
      setIsLoading(false);
    });

    return () => {
      active = false;
    };
  }, [empresaId, refreshKey]);

  const analytics: RegistryAnalytics = useMemo(() => summarizeAnalytics(templates, records), [templates, records]);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) ?? templates[0] ?? null,
    [selectedTemplateId, templates]
  );

  const filteredTemplates = useMemo(() => {
    const term = search.trim().toLowerCase();
    return templates.filter((template) => !term || [template.titulo, template.descricao, template.categoria, template.setor].some((value) => value.toLowerCase().includes(term)));
  }, [templates, search]);

  const filteredRecords = useMemo(() => {
    const term = search.trim().toLowerCase();
    return records.filter((record) => !term || [record.numero, record.template_titulo, record.preenchido_por, record.current_owner, statusLabels[record.status]].some((value) => value.toLowerCase().includes(term)));
  }, [records, search]);

  function generateDraft() {
    const fields = createSchemaFromPrompt(builderPrompt);
    setDraftFields(fields);
    setMessage({ type: "success", text: "Schema gerado e pronto para edicao." });
  }

  function addField(type: RegistryFieldType) {
    setDraftFields((current) => [...current, createField(type, current.length + 1)]);
  }

  function updateFieldLabel(fieldId: string, label: string) {
    setDraftFields((current) => current.map((field) => field.id === fieldId ? { ...field, label } : field));
  }

  function toggleRequired(fieldId: string) {
    setDraftFields((current) => current.map((field) => field.id === fieldId ? { ...field, required: !field.required } : field));
  }

  async function saveTemplate(status: RegistryTemplateStatus) {
    if (!empresaId) return;
    if (!draftTitle.trim()) {
      setMessage({ type: "error", text: "Informe o nome do template." });
      return;
    }

    setIsSaving(true);
    const risk = calculateRiskScore(draftFields);
    const payload = {
      empresa_id: empresaId,
      titulo: draftTitle.trim(),
      descricao: builderPrompt.trim(),
      codigo: `REG-FRM-${Date.now().toString().slice(-5)}`,
      status: status === "PUBLICADO" ? "PUBLICADO" : "RASCUNHO",
      categoria: draftCategory,
      setor: draftSector,
      versao_major: 1,
      versao_minor: status === "PUBLICADO" ? 0 : 1,
      versao_patch: 0,
      campos: draftFields,
      schema_json: { fields: draftFields, generatedFromPrompt: builderPrompt },
      workflow: { engine: "BPMN_COMPAT", steps: defaultWorkflow(), slaHours: 24 },
      dmn_rules: [{ when: "risk_score >= 70", then: "comite_executivo" }],
      conditional_logic: ["Se campo critico = Nao conforme, obrigar foto, assinatura e abrir plano de acao."],
      analytics_config: { funnel: true, heatmap: true, cohort: true },
      pii_policy: { classificacao: draftFields.some((field) => field.piiCategory === "sensitive") ? "Contem dados sensiveis" : "Sem PII sensivel detectada" },
      retention_policy: { retentionDays: 1825, legalBasis: "Obrigacao regulatoria / qualidade" },
      marketplace_scope: "privado",
      responsavel: usuarioNome,
      published_at: status === "PUBLICADO" ? new Date().toISOString() : null,
    };

    const { error } = await supabase.from("registros_templates").insert(payload);
    setIsSaving(false);

    if (error) {
      setMessage({ type: "error", text: "Nao foi possivel salvar o template. Aplique a migration do NEXUS Registry OS." });
      return;
    }

    setMessage({ type: "success", text: `Template salvo com score de risco estrutural ${risk}.` });
    setRefreshKey((current) => current + 1);
    setView("templates");
  }

  async function submitRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!empresaId || !selectedTemplate) return;

    const missing = selectedTemplate.campos.filter((field) => field.required && !recordData[field.id]?.trim());
    if (missing.length > 0) {
      setMessage({ type: "error", text: `Campos obrigatorios pendentes: ${missing.map((field) => field.label).join(", ")}` });
      return;
    }

    setIsSaving(true);
    const numero = createRegistryId(records.length);
    const risk = calculateRiskScore(selectedTemplate.campos);
    const snapshot = {
      templateId: selectedTemplate.id,
      templateTitle: selectedTemplate.titulo,
      templateVersion: selectedTemplate.versao,
      data: recordData,
      submittedBy: usuarioNome,
      submittedAt: new Date().toISOString(),
    };
    const hash = await sha256Hex(snapshot).catch(() => null);
    const payload = {
      empresa_id: empresaId,
      template_id: selectedTemplate.id,
      numero,
      preenchido_por: usuarioNome,
      status: risk >= 70 ? "EM_VERIFICACAO" : "ENVIADO",
      dados: recordData,
      snapshot,
      historico: [{ status: "ENVIADO", by: usuarioNome, at: new Date().toISOString(), action: "Registro criado" }],
      assinaturas: [],
      current_owner: risk >= 70 ? "Qualidade / Risco" : "Supervisor",
      hash_sha256: hash,
      risk_score: risk,
      flag_revisao_humana: risk >= 70,
      device_fingerprint: "browser-session",
    };

    const { error } = await supabase.from("registros_preenchidos").insert(payload);
    setIsSaving(false);

    if (error) {
      setMessage({ type: "error", text: "Nao foi possivel criar o registro. Verifique a migration e o RLS." });
      return;
    }

    setRecordData({});
    setMessage({ type: "success", text: `${numero} criado com hash criptografico e trilha de evento.` });
    setRefreshKey((current) => current + 1);
    setView("records");
  }

  async function updateRecordStatus(record: RegistryRecord, status: RegistryRecordStatus) {
    if (!empresaId) return;

    const { error } = await supabase
      .from("registros_preenchidos")
      .update({
        status,
        current_owner: status === "APROVADO" ? "Encerrado" : "Qualidade",
        approved_at: status === "APROVADO" ? new Date().toISOString() : null,
        rejected_at: status === "REJEITADO" ? new Date().toISOString() : null,
      })
      .eq("empresa_id", empresaId)
      .eq("id", record.id);

    if (error) {
      setMessage({ type: "error", text: "Nao foi possivel atualizar o registro." });
      return;
    }

    setMessage({ type: "success", text: `${record.numero} atualizado para ${statusLabels[status]}.` });
    setRefreshKey((current) => current + 1);
  }

  function exportCsv() {
    const headers = ["Numero", "Template", "Status", "Preenchido por", "Responsavel", "Risco", "Hash", "Enviado em"];
    const rows = filteredRecords.map((record) => [
      record.numero,
      record.template_titulo,
      statusLabels[record.status],
      record.preenchido_por,
      record.current_owner,
      String(record.risk_score),
      record.hash_sha256 ?? "",
      formatDate(record.submitted_at),
    ]);
    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map((row) => row.map(escape).join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `nexus-registros-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1540px] flex-col gap-6">
        <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-extrabold uppercase tracking-normal text-blue-700">
              <ClipboardSignature className="h-3.5 w-3.5" />
              Gestao de Registros
            </span>
            <h1 className="mt-4 text-4xl font-semibold tracking-normal text-slate-950">NEXUS Registry OS</h1>
            <p className="mt-2 max-w-4xl text-base leading-7 text-slate-600">
              Sistema de registro de verdade operacional: form builder, workflow, auditoria criptografica, BI, campo offline e governanca em uma unica central.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={exportCsv} className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:border-blue-200 hover:text-blue-700">
              <Download className="h-4 w-4" />
              Exportar
            </button>
            <button type="button" onClick={() => setView("builder")} className="inline-flex h-11 items-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 hover:bg-blue-700">
              <Plus className="h-4 w-4" />
              Criar template
            </button>
          </div>
        </header>

        {message && (
          <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-semibold ${message.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
            {message.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            {message.text}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <KpiCard label="Templates" value={analytics.totalTemplates} description="Modelos versionados" icon={FileJson} tone="bg-blue-50 text-blue-600" />
          <KpiCard label="Publicados" value={analytics.publishedTemplates} description="Disponiveis para campo" icon={FileCheck2} tone="bg-emerald-50 text-emerald-600" />
          <KpiCard label="Registros" value={analytics.totalRecords} description="Aggregates operacionais" icon={DatabaseZap} tone="bg-violet-50 text-violet-600" />
          <KpiCard label="Pendentes" value={analytics.pendingRecords} description="Fluxo em andamento" icon={Timer} tone="bg-amber-50 text-amber-600" />
          <KpiCard label="Alto risco" value={analytics.highRiskRecords} description="Revisao humana" icon={AlertTriangle} tone="bg-red-50 text-red-600" />
          <KpiCard label="Forense" value={`${analytics.forensicCoverage}%`} description="Hash/eventos" icon={Fingerprint} tone="bg-slate-100 text-slate-700" />
        </section>

        <section className="grid gap-6 xl:grid-cols-[300px_1fr]">
          <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar templates ou registros..."
                className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </label>

            <nav className="mt-4 space-y-1">
              {viewItems.map((item) => (
                <button
                  type="button"
                  key={item.key}
                  onClick={() => setView(item.key)}
                  className={`flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition ${view === item.key ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"}`}
                >
                  <item.icon className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    <strong className="block text-sm">{item.label}</strong>
                    <span className="mt-0.5 block text-xs leading-4 text-slate-500">{item.description}</span>
                  </span>
                </button>
              ))}
            </nav>
          </aside>

          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            {isLoading ? (
              <div className="grid min-h-[520px] place-items-center text-blue-600">
                <div className="flex items-center gap-3 text-sm font-semibold">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Carregando NEXUS Registry OS...
                </div>
              </div>
            ) : (
              <div className="p-5 lg:p-6">
                {view === "templates" && (
                  <div className="space-y-6">
                    <SectionHeader title="Central de Templates" description="Templates inteligentes por setor, com versionamento, logica condicional e politicas LGPD." />
                    <div className="grid gap-4 lg:grid-cols-2">
                      {filteredTemplates.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center lg:col-span-2">
                          <Sparkles className="mx-auto h-8 w-8 text-blue-600" />
                          <h3 className="mt-4 text-lg font-semibold">Nenhum template encontrado</h3>
                          <p className="mt-2 text-sm text-slate-500">Crie o primeiro template usando linguagem natural.</p>
                        </div>
                      ) : filteredTemplates.map((template) => (
                        <article key={template.id} className="rounded-lg border border-slate-200 p-5 transition hover:border-blue-200 hover:shadow-sm">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${template.status === "PUBLICADO" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
                                {template.status}
                              </span>
                              <h3 className="mt-3 text-lg font-semibold text-slate-950">{template.titulo}</h3>
                              <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">{template.descricao || "Sem descricao"}</p>
                            </div>
                            <strong className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600">{template.versao}</strong>
                          </div>
                          <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
                            <div className="rounded-lg bg-slate-50 p-3">
                              <span className="block text-xs font-bold uppercase text-slate-400">Campos</span>
                              <strong>{template.campos.length}</strong>
                            </div>
                            <div className="rounded-lg bg-slate-50 p-3">
                              <span className="block text-xs font-bold uppercase text-slate-400">Workflow</span>
                              <strong>{template.workflowSteps.length}</strong>
                            </div>
                            <div className="rounded-lg bg-slate-50 p-3">
                              <span className="block text-xs font-bold uppercase text-slate-400">Retencao</span>
                              <strong>{template.retentionDays}d</strong>
                            </div>
                          </div>
                          <button type="button" onClick={() => { setSelectedTemplateId(template.id); setView("records"); }} className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-blue-700">
                            Abrir registros
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </article>
                      ))}
                    </div>
                  </div>
                )}

                {view === "builder" && (
                  <div className="space-y-6">
                    <SectionHeader title="Form Builder com Inteligencia Generativa" description="Digite a necessidade operacional, gere o schema e ajuste campos, obrigatoriedade, PII e risco." />
                    <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
                      <div className="space-y-4">
                        <label className="block">
                          <span className="text-xs font-extrabold uppercase tracking-normal text-slate-500">Prompt do gestor</span>
                          <textarea value={builderPrompt} onChange={(event) => setBuilderPrompt(event.target.value)} className="mt-2 min-h-28 w-full rounded-lg border border-slate-200 p-4 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100" />
                        </label>
                        <div className="grid gap-3 md:grid-cols-3">
                          <input value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100" placeholder="Titulo" />
                          <input value={draftCategory} onChange={(event) => setDraftCategory(event.target.value)} className="h-11 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100" placeholder="Categoria" />
                          <input value={draftSector} onChange={(event) => setDraftSector(event.target.value)} className="h-11 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100" placeholder="Setor" />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={generateDraft} className="inline-flex h-11 items-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white">
                            <Sparkles className="h-4 w-4" />
                            Gerar schema
                          </button>
                          {fieldTypes.map((item) => (
                            <button key={item.type} type="button" onClick={() => addField(item.type)} className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50">
                              <item.icon className="h-4 w-4" />
                              {item.label}
                            </button>
                          ))}
                        </div>
                        <div className="space-y-3">
                          {draftFields.map((field, index) => (
                            <article key={field.id} className="rounded-lg border border-slate-200 bg-white p-4">
                              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                                <span className="grid h-9 w-9 place-items-center rounded-lg bg-blue-50 text-sm font-bold text-blue-700">{index + 1}</span>
                                <input value={field.label} onChange={(event) => updateFieldLabel(field.id, event.target.value)} className="h-10 flex-1 rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-blue-300" />
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{field.type}</span>
                                <button type="button" onClick={() => toggleRequired(field.id)} className={`h-10 rounded-lg px-3 text-xs font-bold ${field.required ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                                  {field.required ? "Obrigatorio" : "Opcional"}
                                </button>
                              </div>
                            </article>
                          ))}
                        </div>
                      </div>
                      <aside className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                        <h3 className="text-lg font-semibold">Publicacao segura</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-500">O template sera salvo com schema JSON, workflow BPMN-compativel, regra DMN, politica PII e retencao.</p>
                        <div className="mt-5 space-y-3 text-sm">
                          <div className="flex justify-between"><span>Campos</span><strong>{draftFields.length}</strong></div>
                          <div className="flex justify-between"><span>PII sensivel</span><strong>{draftFields.filter((field) => field.piiCategory === "sensitive").length}</strong></div>
                          <div className="flex justify-between"><span>Risk score</span><strong>{calculateRiskScore(draftFields)}</strong></div>
                          <div className="flex justify-between"><span>Workflow</span><strong>{defaultWorkflow().length} etapas</strong></div>
                        </div>
                        <div className="mt-6 grid gap-3">
                          <button type="button" disabled={isSaving} onClick={() => saveTemplate("RASCUNHO")} className="h-11 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 disabled:opacity-60">
                            Salvar rascunho
                          </button>
                          <button type="button" disabled={isSaving} onClick={() => saveTemplate("PUBLICADO")} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 disabled:opacity-60">
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                            Publicar template
                          </button>
                        </div>
                      </aside>
                    </div>
                  </div>
                )}

                {view === "records" && (
                  <div className="space-y-6">
                    <SectionHeader title="Registro Inteligente Vivo" description="Cada submissao vira um aggregate com numero legivel, hash, evento imutavel e fluxo rastreavel." />
                    <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
                      <form onSubmit={submitRecord} className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                        <h3 className="text-lg font-semibold">Novo registro</h3>
                        <select value={selectedTemplateId} onChange={(event) => setSelectedTemplateId(event.target.value)} className="mt-4 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-300">
                          {templates.map((template) => <option key={template.id} value={template.id}>{template.titulo}</option>)}
                        </select>
                        {selectedTemplate ? (
                          <div className="mt-4 space-y-3">
                            {selectedTemplate.campos.slice(0, 8).map((field) => (
                              <label key={field.id} className="block">
                                <span className="text-xs font-extrabold uppercase tracking-normal text-slate-500">{field.label}{field.required ? " *" : ""}</span>
                                <input value={recordData[field.id] ?? ""} onChange={(event) => setRecordData((current) => ({ ...current, [field.id]: event.target.value }))} className="mt-2 h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100" placeholder={field.type === "photo" ? "Anexar evidencia na proxima etapa" : "Preencher"} />
                              </label>
                            ))}
                            <button type="submit" disabled={isSaving} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 disabled:opacity-60">
                              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                              Enviar registro
                            </button>
                          </div>
                        ) : (
                          <p className="mt-4 rounded-lg bg-white p-4 text-sm text-slate-500">Crie um template antes de registrar.</p>
                        )}
                      </form>
                      <div className="overflow-hidden rounded-lg border border-slate-200">
                        <table className="w-full min-w-[920px] text-left text-sm">
                          <caption className="sr-only">Base de registros NEXUS</caption>
                          <thead className="bg-slate-50 text-xs font-extrabold uppercase text-slate-500">
                            <tr>
                              <th scope="col" className="px-4 py-3">Registro</th>
                              <th scope="col" className="px-4 py-3">Template</th>
                              <th scope="col" className="px-4 py-3">Status</th>
                              <th scope="col" className="px-4 py-3">Risco</th>
                              <th scope="col" className="px-4 py-3">Hash/Eventos</th>
                              <th scope="col" className="px-4 py-3 text-right">Acoes</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredRecords.map((record) => (
                              <tr key={record.id} className="hover:bg-slate-50">
                                <td className="px-4 py-4">
                                  <strong className="block text-slate-950">{record.numero}</strong>
                                  <span className="text-xs text-slate-500">{formatDate(record.submitted_at)}</span>
                                </td>
                                <td className="px-4 py-4 text-slate-600">{record.template_titulo}</td>
                                <td className="px-4 py-4">
                                  <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusStyles[record.status]}`}>{statusLabels[record.status]}</span>
                                </td>
                                <td className="px-4 py-4">
                                  <span className={`font-bold ${record.risk_score >= 70 ? "text-red-700" : record.risk_score >= 40 ? "text-amber-700" : "text-emerald-700"}`}>{record.risk_score}</span>
                                </td>
                                <td className="px-4 py-4 text-xs text-slate-500">
                                  <div>{record.hash_sha256 ? `${record.hash_sha256.slice(0, 12)}...` : "Sem hash"}</div>
                                  <div>{record.total_eventos} evento(s)</div>
                                </td>
                                <td className="px-4 py-4 text-right">
                                  <div className="flex justify-end gap-2">
                                    <button type="button" onClick={() => updateRecordStatus(record, "APROVADO")} className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100">Aprovar</button>
                                    <button type="button" onClick={() => updateRecordStatus(record, "REJEITADO")} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100">Rejeitar</button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {view === "workflow" && (
                  <div className="space-y-6">
                    <SectionHeader title="Workflow Engine BPMN/DMN" description="Fluxos com tarefas, gateways, SLA, escalonamento, delegacao e regras de roteamento." />
                    <div className="grid gap-4 lg:grid-cols-3">
                      {defaultWorkflow().map((step, index) => (
                        <article key={step.id} className="rounded-lg border border-slate-200 p-5">
                          <span className="grid h-10 w-10 place-items-center rounded-lg bg-blue-50 font-bold text-blue-700">{index + 1}</span>
                          <h3 className="mt-4 text-lg font-semibold">{step.label}</h3>
                          <p className="mt-2 text-sm text-slate-500">Owner: {step.owner}</p>
                          <p className="mt-1 text-sm text-slate-500">SLA: {step.slaHours}h · Escala: {step.escalation}</p>
                        </article>
                      ))}
                    </div>
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
                      Regra DMN ativa: se risk_score maior ou igual a 70, direcionar para Qualidade/Risco e marcar revisao humana.
                    </div>
                  </div>
                )}

                {view === "truth" && (
                  <div className="space-y-6">
                    <SectionHeader title="Certificado de Verdade Operacional" description="Hash SHA-256, trilha append-only, snapshots e verificacao publica futura por QR Code." />
                    <div className="grid gap-4 lg:grid-cols-3">
                      <KpiCard label="Eventos" value={records.reduce((sum, record) => sum + record.total_eventos, 0)} description="Eventos imutaveis registrados" icon={Activity} tone="bg-blue-50 text-blue-600" />
                      <KpiCard label="Com hash" value={records.filter((record) => record.hash_sha256).length} description="Submissoes com SHA-256" icon={Fingerprint} tone="bg-emerald-50 text-emerald-600" />
                      <KpiCard label="Verificacao" value="QR" description="/verificar/{hash} preparado" icon={QrCode} tone="bg-violet-50 text-violet-600" />
                    </div>
                    <div className="rounded-lg border border-slate-200 p-5">
                      <h3 className="font-semibold">Ultimos hashes</h3>
                      <div className="mt-4 space-y-2">
                        {records.filter((record) => record.hash_sha256).slice(0, 6).map((record) => (
                          <div key={record.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                            <span className="font-semibold">{record.numero}</span>
                            <code className="text-xs text-slate-500">{record.hash_sha256}</code>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {view === "analytics" && (
                  <div className="space-y-6">
                    <SectionHeader title="BI Nativo" description="Analitica de fluxo, gargalos, coortes, tempo medio e exportacao para data lake." />
                    <div className="grid gap-4 lg:grid-cols-4">
                      <KpiCard label="Aprovados" value={analytics.approvedRecords} description="Registros encerrados" icon={CheckCircle2} tone="bg-emerald-50 text-emerald-600" />
                      <KpiCard label="Rejeitados" value={records.filter((record) => record.status === "REJEITADO").length} description="Top motivos em breve" icon={XCircle} tone="bg-red-50 text-red-600" />
                      <KpiCard label="Gargalo" value="SLA" description="Etapas pendentes" icon={Timer} tone="bg-amber-50 text-amber-600" />
                      <KpiCard label="Data lake" value="MV" description="Views materializadas" icon={HardDriveDownload} tone="bg-blue-50 text-blue-600" />
                    </div>
                    <div className="grid gap-3 md:grid-cols-7">
                      {["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"].map((day, index) => (
                        <div key={day} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                          <span className="text-xs font-bold text-slate-500">{day}</span>
                          <div className="mt-4 h-24 rounded-md bg-blue-100" style={{ opacity: 0.25 + index * 0.09 }} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {view === "field" && (
                  <div className="space-y-6">
                    <SectionHeader title="Experiencia de Campo Offline-First" description="Mobile-first, operacao com luva, fila offline, camera, geofence e sync com auditoria de conflito." />
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      {fieldExperienceItems.map(({ label, icon: Icon, description }) => (
                        <article key={label} className="rounded-lg border border-slate-200 p-5">
                          <Icon className="h-6 w-6 text-blue-600" />
                          <h3 className="mt-4 font-semibold">{label}</h3>
                          <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
                        </article>
                      ))}
                    </div>
                  </div>
                )}

                {view === "governance" && (
                  <div className="space-y-6">
                    <SectionHeader title="Governanca, Seguranca e Compliance" description="RBAC/ABAC, DPO console, retencao LGPD, PII discovery e logs imutaveis." />
                    <div className="grid gap-4 lg:grid-cols-2">
                      <article className="rounded-lg border border-slate-200 p-5">
                        <h3 className="font-semibold">Politicas ativas</h3>
                        <ul className="mt-4 space-y-3 text-sm text-slate-600">
                          <li>RLS forte por empresa_id em todas as tabelas NEXUS.</li>
                          <li>Eventos append-only com trigger de bloqueio para UPDATE/DELETE.</li>
                          <li>PII classificada por campo e politica de retencao no template.</li>
                          <li>PIN simples sera substituido por 2FA/WebAuthn em acoes criticas.</li>
                        </ul>
                      </article>
                      <article className="rounded-lg border border-slate-200 p-5">
                        <h3 className="font-semibold">DPO Console</h3>
                        <p className="mt-3 text-sm leading-6 text-slate-500">Estrutura pronta para relatorios LGPD, atendimento a titulares, RIPD e expurgo auditado por tipo de registro.</p>
                        <button type="button" className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white">
                          <Archive className="h-4 w-4" />
                          Ver politicas
                        </button>
                      </article>
                    </div>
                  </div>
                )}

                {view === "integrations" && (
                  <div className="space-y-6">
                    <SectionHeader title="Integracao Total" description="Webhooks HMAC, API publica, WhatsApp, Teams, Slack, ERP e sensores IoT." />
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      {integrationItems.map(({ label, icon: Icon, description }) => (
                        <article key={label} className="rounded-lg border border-slate-200 p-5">
                          <Icon className="h-6 w-6 text-blue-600" />
                          <h3 className="mt-4 font-semibold">{label}</h3>
                          <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
                        </article>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}
