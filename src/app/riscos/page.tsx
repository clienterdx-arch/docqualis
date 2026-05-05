"use client";

import React, { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  Archive,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileCheck2,
  FileText,
  Filter,
  GitBranch,
  History,
  KanbanSquare,
  Layers,
  Library,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Target,
  Trash2,
  X,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { carregarPerfilUsuario } from "@/lib/perfil";

type ViewMode =
  | "dashboard"
  | "mapa"
  | "matriz"
  | "cadastro"
  | "acoes"
  | "revisoes"
  | "kanban"
  | "biblioteca"
  | "relatorios"
  | "configuracoes";

type RiskLevel = "Baixo" | "Moderado" | "Alto" | "Crítico";
type RiskStatus = "Ativo" | "Inativo" | "Em revisão" | "Em tratamento" | "Monitorado" | "Identificado" | "Em análise" | "Aguardando evidência";
type RiskCategory = "Assistencial" | "Operacional" | "Financeiro" | "Jurídico" | "Ambiental" | "Estratégico" | "Imagem";
type RiskDecision = "Evitar" | "Reter" | "Reduzir" | "Eliminar";
type ActionStatus = "Não iniciada" | "Em andamento" | "Aguardando evidência" | "Concluída" | "Vencida" | "Cancelada";

type DbRow = Record<string, unknown>;

interface Risk {
  id: string;
  empresa_id: string;
  code: string;
  sector: string;
  process: string;
  title: string;
  description: string;
  cause: string;
  consequence: string;
  origin: string;
  category: RiskCategory;
  impactType: string;
  affectedArea: string;
  decision: RiskDecision;
  decisionJustification: string;
  impact: number;
  probability: number;
  score: number;
  level: RiskLevel;
  inherentImpact: number;
  inherentProbability: number;
  inherentScore: number;
  inherentLevel: RiskLevel;
  residualImpact: number;
  residualProbability: number;
  residualScore: number;
  residualLevel: RiskLevel;
  status: RiskStatus;
  responsible: string;
  inclusionDate: string;
  lastReviewDate: string;
  nextReviewDate: string;
  observation: string;
  createdAt: string;
}

interface RiskAction {
  id: string;
  riskId: string;
  description: string;
  actionType: string;
  responsible: string;
  sector: string;
  dueDate: string;
  priority: string;
  status: ActionStatus;
  evidenceUrl: string;
  completedAt: string;
  effectivenessValidation: string;
}

interface RiskControl {
  id: string;
  riskId: string;
  description: string;
  controlType: string;
  effectiveness: string;
  documentName: string;
  indicatorName: string;
  responsible: string;
  lastVerifiedAt: string;
}

interface TimelineEvent {
  id: string;
  riskId: string;
  eventType: string;
  description: string;
  user: string;
  createdAt: string;
}

interface RiskForm {
  sector: string;
  process: string;
  responsible: string;
  title: string;
  description: string;
  cause: string;
  consequence: string;
  origin: string;
  category: RiskCategory;
  impactType: string;
  affectedArea: string;
  status: RiskStatus;
  decision: RiskDecision;
  decisionJustification: string;
  impact: number;
  probability: number;
  residualImpact: number;
  residualProbability: number;
  nextReviewDate: string;
  observation: string;
  controlDescription: string;
  controlType: string;
  controlEffectiveness: string;
  controlResponsible: string;
  controlLastVerifiedAt: string;
  contingencyImmediateAction: string;
  contingencyContact: string;
  contingencyDeadline: string;
  contingencyChannel: string;
  contingencyTeam: string;
  contingencyReference: string;
  contingencyInternalNotification: boolean;
  contingencyExternalNotification: boolean;
  contingencyOpenOccurrence: boolean;
  contingencyNotifyLeadership: boolean;
  actionDescription: string;
  actionType: string;
  actionResponsible: string;
  actionSector: string;
  actionDueDate: string;
  actionPriority: string;
}

interface ActionForm {
  riskId: string;
  description: string;
  actionType: string;
  responsible: string;
  sector: string;
  dueDate: string;
  priority: string;
}

const categories: RiskCategory[] = ["Assistencial", "Operacional", "Financeiro", "Jurídico", "Ambiental", "Estratégico", "Imagem"];
const origins = ["Auditoria", "Notificação", "Indicador", "Planejamento estratégico", "Reclamação", "Incidente", "Mapeamento de processo", "Análise crítica"];
const decisions: RiskDecision[] = ["Evitar", "Reter", "Reduzir", "Eliminar"];
const statuses: RiskStatus[] = ["Ativo", "Inativo", "Em revisão", "Em tratamento", "Monitorado", "Identificado", "Em análise", "Aguardando evidência"];
const impactLabels = ["Insignificante", "Menor", "Moderada", "Maior", "Catastrófica"];
const probabilityLabels = ["Raro", "Pouco provável", "Possível", "Provável", "Quase certo"];
const barrierTypes = ["Administrativa", "Física", "Tecnológica", "Educacional", "Documental", "Assistencial", "Automatizada"];
const effectivenessOptions = ["Forte", "Moderada", "Fraca", "Inexistente"];
const actionTypes = ["Preventiva", "Corretiva", "Melhoria", "Mitigação", "Contingência"];
const actionStatuses: ActionStatus[] = ["Não iniciada", "Em andamento", "Aguardando evidência", "Concluída", "Vencida", "Cancelada"];

const libraryRisks = [
  "Queda de paciente",
  "Erro de medicação",
  "Falha na identificação do paciente",
  "Falha no prontuário",
  "Infecção relacionada à assistência",
  "Falha na esterilização",
  "Falha de equipamento crítico",
  "Desabastecimento de insumos",
  "Glosa hospitalar",
  "Perda de documentos",
  "Vazamento de dados",
  "Falha de comunicação entre equipes",
].map((title, index) => ({
  id: `LIB-${String(index + 1).padStart(2, "0")}`,
  title,
  category: index < 6 ? "Assistencial" as RiskCategory : index < 9 ? "Operacional" as RiskCategory : "Imagem" as RiskCategory,
  consequence: "Impacto potencial na segurança, continuidade operacional ou conformidade institucional.",
  suggestedControls: "Padronização do processo, dupla checagem, treinamento e monitoramento periódico.",
  suggestedContingency: "Acionar responsável, registrar ocorrência, conter impacto e comunicar liderança conforme criticidade.",
}));

const emptyForm: RiskForm = {
  sector: "",
  process: "",
  responsible: "",
  title: "",
  description: "",
  cause: "",
  consequence: "",
  origin: "Análise crítica",
  category: "Operacional",
  impactType: "Institucional",
  affectedArea: "",
  status: "Ativo",
  decision: "Reduzir",
  decisionJustification: "",
  impact: 3,
  probability: 3,
  residualImpact: 2,
  residualProbability: 2,
  nextReviewDate: "",
  observation: "",
  controlDescription: "",
  controlType: "Administrativa",
  controlEffectiveness: "Moderada",
  controlResponsible: "",
  controlLastVerifiedAt: "",
  contingencyImmediateAction: "",
  contingencyContact: "",
  contingencyDeadline: "",
  contingencyChannel: "",
  contingencyTeam: "",
  contingencyReference: "",
  contingencyInternalNotification: false,
  contingencyExternalNotification: false,
  contingencyOpenOccurrence: false,
  contingencyNotifyLeadership: false,
  actionDescription: "",
  actionType: "Mitigação",
  actionResponsible: "",
  actionSector: "",
  actionDueDate: "",
  actionPriority: "Alta",
};

const emptyActionForm: ActionForm = {
  riskId: "",
  description: "",
  actionType: "Mitigação",
  responsible: "",
  sector: "",
  dueDate: "",
  priority: "Alta",
};

function textValue(row: DbRow, keys: string[], fallback = ""): string {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return fallback;
}

function numberValue(row: DbRow, keys: string[], fallback = 0): number {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return fallback;
}

function dateValue(row: DbRow, keys: string[]): string {
  return textValue(row, keys, "");
}

function normalizeText(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function calculateScore(impact: number, probability: number): number {
  return Math.max(1, Math.min(25, Number(impact || 1) * Number(probability || 1)));
}

function classifyRisk(score: number): RiskLevel {
  if (score >= 16) return "Crítico";
  if (score >= 10) return "Alto";
  if (score >= 5) return "Moderado";
  return "Baixo";
}

function normalizeLevel(value: string, score: number): RiskLevel {
  const normalized = normalizeText(value);
  if (normalized.includes("critic")) return "Crítico";
  if (normalized.includes("alto")) return "Alto";
  if (normalized.includes("moder")) return "Moderado";
  if (normalized.includes("baixo")) return "Baixo";
  return classifyRisk(score);
}

function normalizeCategory(value: string): RiskCategory {
  const normalized = normalizeText(value);
  if (normalized.includes("assist")) return "Assistencial";
  if (normalized.includes("financ")) return "Financeiro";
  if (normalized.includes("jur")) return "Jurídico";
  if (normalized.includes("ambient")) return "Ambiental";
  if (normalized.includes("estrat")) return "Estratégico";
  if (normalized.includes("imagem") || normalized.includes("reput")) return "Imagem";
  return "Operacional";
}

function normalizeDecision(value: string): RiskDecision {
  const normalized = normalizeText(value);
  if (normalized.includes("evitar")) return "Evitar";
  if (normalized.includes("reter") || normalized.includes("aceit")) return "Reter";
  if (normalized.includes("eliminar")) return "Eliminar";
  return "Reduzir";
}

function normalizeStatus(value: string): RiskStatus {
  const normalized = normalizeText(value);
  if (normalized.includes("inativo") || normalized.includes("encerrado")) return "Inativo";
  if (normalized.includes("revis")) return "Em revisão";
  if (normalized.includes("trat")) return "Em tratamento";
  if (normalized.includes("monitor")) return "Monitorado";
  if (normalized.includes("analise")) return "Em análise";
  if (normalized.includes("evid")) return "Aguardando evidência";
  if (normalized.includes("ident")) return "Identificado";
  return "Ativo";
}

function createRiskCode(total: number): string {
  return `RIS-${new Date().getFullYear()}-${String(total + 1).padStart(4, "0")}`;
}

function nextReviewDate(level: RiskLevel): string {
  const date = new Date();
  const days = level === "Crítico" ? 90 : level === "Alto" ? 180 : 365;
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function fmtDate(value: string): string {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function isOverdue(value: string): boolean {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() < new Date().setHours(0, 0, 0, 0);
}

function daysLate(value: string): number {
  if (!isOverdue(value)) return 0;
  const date = new Date(value);
  return Math.ceil((Date.now() - date.getTime()) / 86400000);
}

function levelStyle(level: RiskLevel): string {
  if (level === "Crítico") return "border-red-200 bg-red-50 text-red-700";
  if (level === "Alto") return "border-orange-200 bg-orange-50 text-orange-700";
  if (level === "Moderado") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function matrixCellStyle(level: RiskLevel): string {
  if (level === "Crítico") return "bg-red-500 text-white";
  if (level === "Alto") return "bg-orange-400 text-white";
  if (level === "Moderado") return "bg-yellow-300 text-slate-900";
  return "bg-emerald-500 text-white";
}

function mapRisk(row: DbRow): Risk {
  const impact = numberValue(row, ["impact_score", "impacto"], 1);
  const probability = numberValue(row, ["probability_score", "probabilidade"], 1);
  const score = numberValue(row, ["risk_score", "nivel_risco"], calculateScore(impact, probability));
  const residualImpact = numberValue(row, ["residual_impact_score", "risco_residual_impacto"], Math.max(1, impact - 1));
  const residualProbability = numberValue(row, ["residual_probability_score", "risco_residual_probabilidade"], Math.max(1, probability - 1));
  const residualScore = numberValue(row, ["residual_score"], calculateScore(residualImpact, residualProbability));
  const inherentImpact = numberValue(row, ["inherent_impact_score"], impact);
  const inherentProbability = numberValue(row, ["inherent_probability_score"], probability);
  const inherentScore = numberValue(row, ["inherent_score"], calculateScore(inherentImpact, inherentProbability));
  const level = normalizeLevel(textValue(row, ["risk_level", "classificacao"]), score);

  return {
    id: textValue(row, ["id"]),
    empresa_id: textValue(row, ["empresa_id"]),
    code: textValue(row, ["code", "codigo"], "RIS"),
    sector: textValue(row, ["sector_name", "sector", "setor"], "Geral"),
    process: textValue(row, ["process_name", "process", "processo_vinculado"], "Não vinculado"),
    title: textValue(row, ["title", "titulo"], "Risco sem título"),
    description: textValue(row, ["description", "descricao"]),
    cause: textValue(row, ["cause", "causa"]),
    consequence: textValue(row, ["consequence", "consequencia"]),
    origin: textValue(row, ["origin", "origem"], "Análise crítica"),
    category: normalizeCategory(textValue(row, ["category", "categoria"], "Operacional")),
    impactType: textValue(row, ["impact_type"], "Institucional"),
    affectedArea: textValue(row, ["affected_area"], ""),
    decision: normalizeDecision(textValue(row, ["decision", "estrategia"], "Reduzir")),
    decisionJustification: textValue(row, ["decision_justification", "acceptance_reason"]),
    impact,
    probability,
    score,
    level,
    inherentImpact,
    inherentProbability,
    inherentScore,
    inherentLevel: normalizeLevel(textValue(row, ["inherent_level"]), inherentScore),
    residualImpact,
    residualProbability,
    residualScore,
    residualLevel: normalizeLevel(textValue(row, ["residual_level"]), residualScore),
    status: normalizeStatus(textValue(row, ["status"], "Ativo")),
    responsible: textValue(row, ["responsible_name", "responsible", "responsavel"], "Não definido"),
    inclusionDate: dateValue(row, ["inclusion_date", "data_avaliacao", "created_at"]),
    lastReviewDate: dateValue(row, ["last_review_date", "data_revisao"]),
    nextReviewDate: dateValue(row, ["next_review_date", "next_review_at", "data_revisao"]),
    observation: textValue(row, ["observation", "monitoramento", "plano_tratamento"]),
    createdAt: dateValue(row, ["created_at"]),
  };
}

function mapAction(row: DbRow): RiskAction {
  const status = normalizeActionStatus(textValue(row, ["status"], "Não iniciada"), textValue(row, ["due_date", "prazo"]));
  return {
    id: textValue(row, ["id"]),
    riskId: textValue(row, ["risk_id", "risco_id"]),
    description: textValue(row, ["description", "descricao", "acao"]),
    actionType: textValue(row, ["action_type", "tipo_acao"], "Mitigação"),
    responsible: textValue(row, ["responsible_name", "responsavel"]),
    sector: textValue(row, ["sector_name", "setor"]),
    dueDate: dateValue(row, ["due_date", "prazo"]),
    priority: textValue(row, ["priority", "prioridade"], "Alta"),
    status,
    evidenceUrl: textValue(row, ["evidence_url", "evidencia_url"]),
    completedAt: dateValue(row, ["completed_at", "data_conclusao"]),
    effectivenessValidation: textValue(row, ["effectiveness_validation", "validacao_eficacia"]),
  };
}

function mapControl(row: DbRow): RiskControl {
  return {
    id: textValue(row, ["id"]),
    riskId: textValue(row, ["risk_id", "risco_id"]),
    description: textValue(row, ["description", "descricao", "titulo"]),
    controlType: textValue(row, ["control_type", "tipo"], "Administrativa"),
    effectiveness: textValue(row, ["effectiveness", "operating_effectiveness"], "Moderada"),
    documentName: textValue(row, ["document_name", "document_id", "framework"]),
    indicatorName: textValue(row, ["indicator_name", "indicator_id"]),
    responsible: textValue(row, ["responsible_name", "responsavel"]),
    lastVerifiedAt: dateValue(row, ["last_verified_at", "ultima_testagem"]),
  };
}

function mapTimeline(row: DbRow): TimelineEvent {
  return {
    id: textValue(row, ["id"]),
    riskId: textValue(row, ["risk_id", "risco_id"]),
    eventType: textValue(row, ["event_type"], "Evento"),
    description: textValue(row, ["description", "descricao"], "Evento registrado"),
    user: textValue(row, ["user_name", "actor_name"], "Sistema"),
    createdAt: dateValue(row, ["created_at"]),
  };
}

function normalizeActionStatus(value: string, dueDate: string): ActionStatus {
  const normalized = normalizeText(value);
  if (normalized.includes("concl")) return "Concluída";
  if (normalized.includes("cancel")) return "Cancelada";
  if (normalized.includes("evid")) return "Aguardando evidência";
  if (isOverdue(dueDate)) return "Vencida";
  if (normalized.includes("andamento")) return "Em andamento";
  if (normalized.includes("venc")) return "Vencida";
  return "Não iniciada";
}

export default function GestaoRiscosPage() {
  const router = useRouter();
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [usuarioNome, setUsuarioNome] = useState("Usuário");
  const [riscos, setRiscos] = useState<Risk[]>([]);
  const [actions, setActions] = useState<RiskAction[]>([]);
  const [controls, setControls] = useState<RiskControl[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [view, setView] = useState<ViewMode>("dashboard");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    sector: "Todos",
    process: "Todos",
    category: "Todos",
    level: "Todos",
    status: "Todos",
    responsible: "Todos",
    criticalOnly: false,
    withoutPlan: false,
    overdueActions: false,
    pendingReview: false,
  });
  const [selectedCell, setSelectedCell] = useState<{ impact: number; probability: number } | null>(null);
  const [selectedRiskId, setSelectedRiskId] = useState("");
  const [formTab, setFormTab] = useState<"identificacao" | "classificacao" | "avaliacao" | "controles" | "contingencia" | "acao" | "historico">("identificacao");
  const [form, setForm] = useState<RiskForm>(emptyForm);
  const [actionForm, setActionForm] = useState<ActionForm>(emptyActionForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      if (!data.session) {
        router.push("/login");
        return;
      }

      const perfil = await carregarPerfilUsuario<{ empresa_id?: string | null; nome?: string | null }>(data.session, "empresa_id, nome");
      if (!active) return;

      if (!perfil?.empresa_id) {
        setMessage({ type: "error", text: "Não foi possível identificar a empresa vinculada ao usuário." });
        setIsLoading(false);
        return;
      }

      setEmpresaId(perfil.empresa_id);
      setUsuarioNome(perfil.nome ?? data.session.user.email ?? "Usuário");
    });

    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    if (!empresaId) return;
    let active = true;
    setIsLoading(true);

    Promise.all([
      supabase.from("riscos").select("*").eq("empresa_id", empresaId).is("deleted_at", null).order("created_at", { ascending: false }),
      supabase.from("risk_actions").select("*").eq("empresa_id", empresaId).order("created_at", { ascending: false }),
      supabase.from("risk_controls").select("*").eq("empresa_id", empresaId).order("created_at", { ascending: false }),
      supabase.from("risk_timeline").select("*").eq("empresa_id", empresaId).order("created_at", { ascending: false }),
    ]).then(async ([riskResponse, actionResponse, controlResponse, timelineResponse]) => {
      if (!active) return;

      if (riskResponse.error) {
        setMessage({ type: "error", text: "Não foi possível carregar os riscos." });
        setRiscos([]);
        setIsLoading(false);
        return;
      }

      setRiscos((riskResponse.data ?? []).map((row) => mapRisk(row as DbRow)));
      setActions(actionResponse.error ? [] : (actionResponse.data ?? []).map((row) => mapAction(row as DbRow)));

      if (controlResponse.error) {
        const legacyControls = await supabase.from("riscos_controles").select("*").eq("empresa_id", empresaId).order("created_at", { ascending: false });
        if (active) setControls(legacyControls.error ? [] : (legacyControls.data ?? []).map((row) => mapControl(row as DbRow)));
      } else {
        setControls((controlResponse.data ?? []).map((row) => mapControl(row as DbRow)));
      }

      setTimeline(timelineResponse.error ? [] : (timelineResponse.data ?? []).map((row) => mapTimeline(row as DbRow)));
      setIsLoading(false);
    });

    return () => {
      active = false;
    };
  }, [empresaId, refreshKey]);

  const selectedRisk = riscos.find((risk) => risk.id === selectedRiskId) ?? riscos[0] ?? null;
  const sectors = optionList(riscos.map((risk) => risk.sector));
  const processes = optionList(riscos.map((risk) => risk.process));
  const responsibles = optionList(riscos.map((risk) => risk.responsible));

  const actionsByRisk = useMemo(() => groupBy(actions, (action) => action.riskId), [actions]);
  const controlsByRisk = useMemo(() => groupBy(controls, (control) => control.riskId), [controls]);
  const timelineByRisk = useMemo(() => groupBy(timeline, (event) => event.riskId), [timeline]);

  const filteredRisks = useMemo(() => {
    const term = normalizeText(search);
    return riscos.filter((risk) => {
      const actionList = actionsByRisk.get(risk.id) ?? [];
      const controlList = controlsByRisk.get(risk.id) ?? [];
      const matchesTerm = !term || [risk.code, risk.title, risk.sector, risk.process, risk.category, risk.responsible, risk.description].some((value) => normalizeText(value).includes(term));
      const matchesFilters =
        (filters.sector === "Todos" || risk.sector === filters.sector) &&
        (filters.process === "Todos" || risk.process === filters.process) &&
        (filters.category === "Todos" || risk.category === filters.category) &&
        (filters.level === "Todos" || risk.level === filters.level) &&
        (filters.status === "Todos" || risk.status === filters.status) &&
        (filters.responsible === "Todos" || risk.responsible === filters.responsible) &&
        (!filters.criticalOnly || risk.level === "Crítico") &&
        (!filters.withoutPlan || actionList.length === 0) &&
        (!filters.overdueActions || actionList.some((action) => action.status === "Vencida")) &&
        (!filters.pendingReview || isOverdue(risk.nextReviewDate)) &&
        (controlList.length > 0 || !filters.withoutPlan || actionList.length === 0);

      return matchesTerm && matchesFilters;
    });
  }, [actionsByRisk, controlsByRisk, filters, riscos, search]);

  const analytics = useMemo(() => {
    const activeRisks = riscos.filter((risk) => risk.status !== "Inativo");
    const withoutPlan = riscos.filter((risk) => (actionsByRisk.get(risk.id) ?? []).length === 0).length;
    const overdueActions = actions.filter((action) => action.status === "Vencida").length;
    const pendingReview = riscos.filter((risk) => isOverdue(risk.nextReviewDate)).length;
    return {
      total: riscos.length,
      active: activeRisks.length,
      critical: riscos.filter((risk) => risk.level === "Crítico").length,
      high: riscos.filter((risk) => risk.level === "Alto").length,
      moderate: riscos.filter((risk) => risk.level === "Moderado").length,
      low: riscos.filter((risk) => risk.level === "Baixo").length,
      withoutPlan,
      overdueActions,
      pendingReview,
    };
  }, [actions, actionsByRisk, riscos]);

  const topSectors = useMemo(() => countBy(riscos, (risk) => risk.sector).slice(0, 6), [riscos]);
  const byCategory = useMemo(() => countBy(riscos, (risk) => risk.category), [riscos]);
  const byLevel = useMemo(() => countBy(riscos, (risk) => risk.level), [riscos]);
  const byStatus = useMemo(() => countBy(riscos, (risk) => risk.status), [riscos]);
  const monthly = useMemo(() => {
    const map = new Map<string, number>();
    riscos.forEach((risk) => {
      const date = new Date(risk.createdAt || risk.inclusionDate);
      const key = Number.isNaN(date.getTime()) ? "Sem data" : `${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return Array.from(map.entries()).slice(0, 8).map(([label, value]) => ({ label, value }));
  }, [riscos]);

  const matrixRisks = selectedCell ? filteredRisks.filter((risk) => risk.impact === selectedCell.impact && risk.probability === selectedCell.probability) : [];
  const formScore = calculateScore(form.impact, form.probability);
  const formLevel = classifyRisk(formScore);
  const residualScore = calculateScore(form.residualImpact, form.residualProbability);
  const residualLevel = classifyRisk(residualScore);

  function updateForm<K extends keyof RiskForm>(key: K, value: RiskForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateActionForm<K extends keyof ActionForm>(key: K, value: ActionForm[K]) {
    setActionForm((current) => ({ ...current, [key]: value }));
  }

  function validateRiskForm(): string | null {
    if (!form.title.trim()) return "Informe o risco inventariado.";
    if (!form.sector.trim()) return "Informe o setor.";
    if (!form.responsible.trim()) return "Informe o gestor responsável.";
    if (form.decision === "Reter" && !form.decisionJustification.trim()) return "Para reter o risco, informe justificativa e data de reavaliação.";
    if (form.decision === "Reter" && !form.nextReviewDate) return "Para reter o risco, informe a data de reavaliação.";
    if (form.decision === "Reduzir" && !form.actionDescription.trim() && (formLevel === "Alto" || formLevel === "Crítico")) return "Risco Alto ou Crítico exige plano de ação.";
    if (form.decision === "Eliminar" && (!form.decisionJustification.trim() || !form.observation.trim())) return "Para eliminar o risco, informe justificativa e evidência/observação.";
    if ((formLevel === "Alto" || formLevel === "Crítico") && !form.actionDescription.trim()) return "Risco Alto ou Crítico exige plano de ação obrigatório.";
    return null;
  }

  async function createRisk(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!empresaId) return;

    const validation = validateRiskForm();
    if (validation) {
      setMessage({ type: "error", text: validation });
      return;
    }

    setIsSaving(true);
    const code = createRiskCode(riscos.length);
    const payload = {
      empresa_id: empresaId,
      codigo: code,
      titulo: form.title.trim(),
      descricao: form.description.trim(),
      causa: form.cause.trim(),
      consequencia: form.consequence.trim(),
      categoria: form.category,
      processo_vinculado: form.process.trim(),
      setor: form.sector.trim(),
      responsavel: form.responsible.trim(),
      origem: form.origin,
      probabilidade: form.probability,
      impacto: form.impact,
      nivel_risco: formScore,
      classificacao: formLevel,
      status: normalizeText(form.status).replace(/\s/g, "_").toUpperCase(),
      estrategia: form.decision,
      plano_tratamento: form.actionDescription || form.observation,
      controles_existentes: form.controlDescription,
      risco_residual_probabilidade: form.residualProbability,
      risco_residual_impacto: form.residualImpact,
      residual_score: residualScore,
      data_avaliacao: new Date().toISOString().slice(0, 10),
      data_revisao: new Date().toISOString().slice(0, 10),
      next_review_at: form.nextReviewDate || nextReviewDate(formLevel),
      monitoramento: form.observation,
      acceptance_reason: form.decision === "Reter" ? form.decisionJustification : null,
      bowtie: {
        causas: [form.cause],
        evento: form.title,
        consequencias: [form.consequence],
        contingencia: {
          acao_imediata: form.contingencyImmediateAction,
          acionar: form.contingencyContact,
          prazo_resposta: form.contingencyDeadline,
          canal: form.contingencyChannel,
          equipe: form.contingencyTeam,
          documento: form.contingencyReference,
          notificacao_interna: form.contingencyInternalNotification,
          notificacao_externa: form.contingencyExternalNotification,
          abre_ocorrencia: form.contingencyOpenOccurrence,
          comunica_direcao: form.contingencyNotifyLeadership,
        },
      },
    };

    const { data, error } = await supabase.from("riscos").insert(payload).select("id").single();
    const riskId = textValue((data ?? {}) as DbRow, ["id"]);

    if (error || !riskId) {
      setIsSaving(false);
      setMessage({ type: "error", text: "Não foi possível cadastrar o risco." });
      return;
    }

    await Promise.all([
      createTimeline(riskId, "Cadastro", `Risco ${code} cadastrado por ${usuarioNome}.`),
      form.controlDescription.trim() ? insertControl(riskId) : Promise.resolve(),
      form.actionDescription.trim() ? insertAction(riskId, {
        riskId,
        description: form.actionDescription,
        actionType: form.actionType,
        responsible: form.actionResponsible || form.responsible,
        sector: form.actionSector || form.sector,
        dueDate: form.actionDueDate,
        priority: form.actionPriority,
      }) : Promise.resolve(),
    ]);

    setIsSaving(false);
    setForm(emptyForm);
    setMessage({ type: "success", text: `Risco ${code} cadastrado com pontuação ${formScore} (${formLevel}).` });
    setRefreshKey((current) => current + 1);
    setView("mapa");
  }

  async function createTimeline(riskId: string, eventType: string, description: string) {
    if (!empresaId) return;
    await supabase.from("risk_timeline").insert({
      empresa_id: empresaId,
      risk_id: riskId,
      event_type: eventType,
      description,
      user_id: null,
      user_name: usuarioNome,
    });
  }

  async function insertControl(riskId: string) {
    if (!empresaId) return;
    await supabase.from("risk_controls").insert({
      empresa_id: empresaId,
      risk_id: riskId,
      description: form.controlDescription,
      control_type: form.controlType,
      effectiveness: form.controlEffectiveness,
      responsible_name: form.controlResponsible || form.responsible,
      last_verified_at: form.controlLastVerifiedAt || null,
    });
  }

  async function insertAction(riskId: string, action: ActionForm) {
    if (!empresaId) return;
    await supabase.from("risk_actions").insert({
      empresa_id: empresaId,
      risk_id: riskId,
      description: action.description,
      action_type: action.actionType,
      responsible_name: action.responsible,
      sector_name: action.sector,
      due_date: action.dueDate || null,
      priority: action.priority,
      status: "Não iniciada",
    });
  }

  async function createAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!empresaId || !actionForm.riskId) return;
    if (!actionForm.description.trim()) {
      setMessage({ type: "error", text: "Informe a descrição da ação." });
      return;
    }

    setIsSaving(true);
    await insertAction(actionForm.riskId, actionForm);
    await createTimeline(actionForm.riskId, "Plano de ação", `Ação vinculada: ${actionForm.description}`);
    setIsSaving(false);
    setActionForm(emptyActionForm);
    setMessage({ type: "success", text: "Ação vinculada ao risco." });
    setRefreshKey((current) => current + 1);
  }

  async function updateRiskStatus(risk: Risk, status: RiskStatus) {
    if (!empresaId) return;
    let extra: Record<string, string | null> = {};
    if (status === "Inativo") {
      const reason = window.prompt("Informe o motivo obrigatório para inativar o risco:");
      if (!reason?.trim()) {
        setMessage({ type: "error", text: "Para inativar, é obrigatório informar motivo." });
        return;
      }
      extra = { acceptance_reason: reason.trim() };
    }

    const { error } = await supabase
      .from("riscos")
      .update({ status: normalizeText(status).replace(/\s/g, "_").toUpperCase(), ...extra })
      .eq("empresa_id", empresaId)
      .eq("id", risk.id);

    if (error) {
      setMessage({ type: "error", text: "Não foi possível atualizar o status do risco." });
      return;
    }

    await createTimeline(risk.id, "Status", `${risk.code} alterado para ${status}.`);
    setMessage({ type: "success", text: `${risk.code} atualizado para ${status}.` });
    setRefreshKey((current) => current + 1);
  }

  function useLibraryRisk(item: typeof libraryRisks[number]) {
    setForm({
      ...emptyForm,
      title: item.title,
      category: item.category,
      description: item.title,
      consequence: item.consequence,
      controlDescription: item.suggestedControls,
      contingencyImmediateAction: item.suggestedContingency,
      actionDescription: "Definir e implantar plano de mitigação para o risco selecionado.",
    });
    setView("cadastro");
    setFormTab("identificacao");
  }

  function exportCsv() {
    const headers = ["Código", "Setor", "Processo", "Risco", "Classificação", "Impacto", "Probabilidade", "Pontuação", "Nível", "Status", "Responsável", "Próxima revisão"];
    const rows = filteredRisks.map((risk) => [
      risk.code,
      risk.sector,
      risk.process,
      risk.title,
      risk.category,
      String(risk.impact),
      String(risk.probability),
      String(risk.score),
      risk.level,
      risk.status,
      risk.responsible,
      fmtDate(risk.nextReviewDate),
    ]);
    const escape = (value: string) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map((row) => row.map(escape).join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `matriz-riscos-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const viewCards = [
    { key: "dashboard" as ViewMode, title: "Dashboard", description: "Visão executiva e gráficos", count: analytics.total, icon: BarChart3, tone: "blue" },
    { key: "mapa" as ViewMode, title: "Mapa geral", description: "Tabela mestre de riscos", count: filteredRisks.length, icon: FileText, tone: "slate" },
    { key: "matriz" as ViewMode, title: "Matriz 5x5", description: "Impacto x probabilidade", count: analytics.critical, icon: Target, tone: "red" },
    { key: "cadastro" as ViewMode, title: "Cadastro", description: "Novo risco e avaliação", count: analytics.withoutPlan, icon: Plus, tone: "green" },
    { key: "acoes" as ViewMode, title: "Planos de ação", description: "Tratativas e evidências", count: actions.length, icon: ClipboardCheck, tone: "orange" },
    { key: "revisoes" as ViewMode, title: "Revisões", description: "Prazos pendentes", count: analytics.pendingReview, icon: RefreshCw, tone: "purple" },
    { key: "kanban" as ViewMode, title: "Kanban", description: "Tratamento dos riscos", count: analytics.active, icon: KanbanSquare, tone: "blue" },
    { key: "biblioteca" as ViewMode, title: "Biblioteca", description: "Riscos padrão", count: libraryRisks.length, icon: Library, tone: "green" },
    { key: "relatorios" as ViewMode, title: "Relatórios", description: "PDF, Excel e auditoria", count: 8, icon: Download, tone: "slate" },
    { key: "configuracoes" as ViewMode, title: "Configuração", description: "Escalas e cadastros", count: 9, icon: Settings, tone: "purple" },
  ];

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1480px] flex-col gap-7">
        <header className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Gestão de Riscos</h1>
            <p className="mt-1 max-w-4xl text-sm leading-6 text-slate-500">
              Cadastro, matriz, controles, contingência, plano de ação, reavaliações e rastreabilidade para riscos institucionais e assistenciais.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={exportCsv} className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:border-blue-200 hover:text-blue-700">
              <Download className="h-4 w-4" /> Exportar matriz
            </button>
            <button onClick={() => setView("cadastro")} className="inline-flex h-11 items-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 hover:bg-blue-700">
              <Plus className="h-4 w-4" /> Novo risco
            </button>
          </div>
        </header>

        {message && (
          <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-semibold ${message.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
            {message.type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
            {message.text}
            <button onClick={() => setMessage(null)} className="ml-auto opacity-60 hover:opacity-100">x</button>
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {viewCards.map(({ key: viewKey, ...card }) => (
            <ModuleCard key={viewKey} active={view === viewKey} {...card} onClick={() => setView(viewKey)} />
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[300px_1fr]">
          <aside className="h-fit rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar risco, setor, processo..."
                className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-50"
              />
            </label>
            <div className="mt-4 space-y-3">
              <SelectFilter label="Setor" value={filters.sector} options={["Todos", ...sectors]} onChange={(value) => setFilters((current) => ({ ...current, sector: value }))} />
              <SelectFilter label="Processo" value={filters.process} options={["Todos", ...processes]} onChange={(value) => setFilters((current) => ({ ...current, process: value }))} />
              <SelectFilter label="Classificação" value={filters.category} options={["Todos", ...categories]} onChange={(value) => setFilters((current) => ({ ...current, category: value }))} />
              <SelectFilter label="Nível" value={filters.level} options={["Todos", "Baixo", "Moderado", "Alto", "Crítico"]} onChange={(value) => setFilters((current) => ({ ...current, level: value }))} />
              <SelectFilter label="Status" value={filters.status} options={["Todos", ...statuses]} onChange={(value) => setFilters((current) => ({ ...current, status: value }))} />
              <SelectFilter label="Responsável" value={filters.responsible} options={["Todos", ...responsibles]} onChange={(value) => setFilters((current) => ({ ...current, responsible: value }))} />
            </div>
            <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
              <CheckFilter label="Somente críticos" checked={filters.criticalOnly} onChange={() => setFilters((current) => ({ ...current, criticalOnly: !current.criticalOnly }))} />
              <CheckFilter label="Sem plano de ação" checked={filters.withoutPlan} onChange={() => setFilters((current) => ({ ...current, withoutPlan: !current.withoutPlan }))} />
              <CheckFilter label="Ações vencidas" checked={filters.overdueActions} onChange={() => setFilters((current) => ({ ...current, overdueActions: !current.overdueActions }))} />
              <CheckFilter label="Revisão pendente" checked={filters.pendingReview} onChange={() => setFilters((current) => ({ ...current, pendingReview: !current.pendingReview }))} />
            </div>
          </aside>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            {isLoading ? (
              <div className="flex min-h-[560px] items-center justify-center gap-3 text-sm font-semibold text-blue-600">
                <Loader2 className="h-5 w-5 animate-spin" /> Carregando riscos...
              </div>
            ) : (
              <>
                {view === "dashboard" && <DashboardView analytics={analytics} topSectors={topSectors} byCategory={byCategory} byLevel={byLevel} byStatus={byStatus} monthly={monthly} />}
                {view === "mapa" && <RiskMapView risks={filteredRisks} actionsByRisk={actionsByRisk} controlsByRisk={controlsByRisk} onStatus={updateRiskStatus} />}
                {view === "matriz" && <MatrixView risks={filteredRisks} selectedCell={selectedCell} onSelectCell={setSelectedCell} matrixRisks={matrixRisks} />}
                {view === "cadastro" && (
                  <RiskFormView
                    form={form}
                    formTab={formTab}
                    formScore={formScore}
                    formLevel={formLevel}
                    residualScore={residualScore}
                    residualLevel={residualLevel}
                    isSaving={isSaving}
                    onTab={setFormTab}
                    onSubmit={createRisk}
                    updateForm={updateForm}
                  />
                )}
                {view === "acoes" && (
                  <ActionsView risks={riscos} actions={actions} actionForm={actionForm} isSaving={isSaving} updateActionForm={updateActionForm} onSubmit={createAction} />
                )}
                {view === "revisoes" && <ReviewsView risks={filteredRisks} onStatus={updateRiskStatus} />}
                {view === "kanban" && <KanbanView risks={filteredRisks} actionsByRisk={actionsByRisk} />}
                {view === "biblioteca" && <LibraryView onUse={useLibraryRisk} />}
                {view === "relatorios" && <ReportsView onExport={exportCsv} />}
                {view === "configuracoes" && <ConfigView />}
              </>
            )}
          </section>
        </section>

        {selectedRisk && view !== "cadastro" && (
          <section className="grid gap-5 xl:grid-cols-[1fr_380px]">
            <RiskDetail risk={selectedRisk} actions={actionsByRisk.get(selectedRisk.id) ?? []} controls={controlsByRisk.get(selectedRisk.id) ?? []} timeline={timelineByRisk.get(selectedRisk.id) ?? []} />
            <RiskRulesPanel risk={selectedRisk} actions={actionsByRisk.get(selectedRisk.id) ?? []} controls={controlsByRisk.get(selectedRisk.id) ?? []} />
          </section>
        )}
      </div>
    </main>
  );
}

function optionList(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function groupBy<T>(items: T[], keyFn: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  items.forEach((item) => {
    const key = keyFn(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  });
  return map;
}

function countBy<T>(items: T[], keyFn: (item: T) => string): Array<{ label: string; value: number }> {
  const map = new Map<string, number>();
  items.forEach((item) => {
    const key = keyFn(item) || "Não informado";
    map.set(key, (map.get(key) ?? 0) + 1);
  });
  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

function ModuleCard({
  active,
  title,
  description,
  count,
  icon: Icon,
  tone,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  count: number;
  icon: React.ElementType;
  tone: string;
  onClick: () => void;
}) {
  const tones: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-emerald-50 text-emerald-600",
    red: "bg-red-50 text-red-600",
    orange: "bg-orange-50 text-orange-600",
    purple: "bg-violet-50 text-violet-600",
    slate: "bg-slate-50 text-slate-600",
  };
  return (
    <button onClick={onClick} className={`min-h-[126px] rounded-xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${active ? "border-blue-300 ring-4 ring-blue-50" : "border-slate-200"}`}>
      <div className="flex items-start justify-between gap-4">
        <span className={`grid h-10 w-10 place-items-center rounded-lg ${tones[tone] ?? tones.blue}`}>
          <Icon className="h-5 w-5" />
        </span>
        <span className="text-3xl font-semibold tabular-nums text-slate-950">{count}</span>
      </div>
      <h3 className="mt-4 text-xs font-extrabold uppercase tracking-normal text-slate-950">{title}</h3>
      <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
    </button>
  );
}

function SelectFilter({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-300">
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function CheckFilter({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-600">
      <input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 accent-blue-600" />
      {label}
    </label>
  );
}

function DashboardView({
  analytics,
  topSectors,
  byCategory,
  byLevel,
  byStatus,
  monthly,
}: {
  analytics: { total: number; active: number; critical: number; high: number; moderate: number; low: number; withoutPlan: number; overdueActions: number; pendingReview: number };
  topSectors: Array<{ label: string; value: number }>;
  byCategory: Array<{ label: string; value: number }>;
  byLevel: Array<{ label: string; value: number }>;
  byStatus: Array<{ label: string; value: number }>;
  monthly: Array<{ label: string; value: number }>;
}) {
  return (
    <div className="space-y-6">
      <SectionHeader title="Dashboard de Gestão de Riscos" description="Visão executiva para priorizar riscos críticos, ações vencidas e revisões pendentes." />
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
        <MiniKpi label="Total" value={analytics.total} icon={ShieldAlert} tone="bg-blue-50 text-blue-600" />
        <MiniKpi label="Ativos" value={analytics.active} icon={CheckCircle2} tone="bg-emerald-50 text-emerald-600" />
        <MiniKpi label="Críticos" value={analytics.critical} icon={AlertTriangle} tone="bg-red-50 text-red-600" />
        <MiniKpi label="Altos" value={analytics.high} icon={AlertCircle} tone="bg-orange-50 text-orange-600" />
        <MiniKpi label="Moderados" value={analytics.moderate} icon={Target} tone="bg-amber-50 text-amber-600" />
        <MiniKpi label="Baixos" value={analytics.low} icon={ShieldCheck} tone="bg-emerald-50 text-emerald-600" />
        <MiniKpi label="Sem ação" value={analytics.withoutPlan} icon={ClipboardCheck} tone="bg-slate-100 text-slate-700" />
        <MiniKpi label="Ações vencidas" value={analytics.overdueActions} icon={AlertTriangle} tone="bg-red-50 text-red-600" />
        <MiniKpi label="Revisão pendente" value={analytics.pendingReview} icon={RefreshCw} tone="bg-violet-50 text-violet-600" />
        <MiniKpi label="Setores críticos" value={topSectors.length} icon={Layers} tone="bg-blue-50 text-blue-600" />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <BarPanel title="Riscos por setor" data={topSectors} />
        <BarPanel title="Riscos por classificação" data={byCategory} />
        <BarPanel title="Riscos por nível" data={byLevel} />
        <BarPanel title="Riscos por status" data={byStatus} />
      </div>
      <BarPanel title="Evolução mensal de riscos cadastrados" data={monthly} wide />
    </div>
  );
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-2xl font-semibold tracking-tight text-slate-950">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

function MiniKpi({ label, value, icon: Icon, tone }: { label: string; value: number | string; icon: React.ElementType; tone: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <span className={`grid h-9 w-9 place-items-center rounded-lg ${tone}`}>
          <Icon className="h-4 w-4" />
        </span>
        <strong className="text-2xl font-semibold tabular-nums text-slate-950">{value}</strong>
      </div>
      <p className="mt-3 text-xs font-bold uppercase tracking-normal text-slate-500">{label}</p>
    </div>
  );
}

function BarPanel({ title, data, wide }: { title: string; data: Array<{ label: string; value: number }>; wide?: boolean }) {
  const max = Math.max(1, ...data.map((item) => item.value));
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-5 ${wide ? "xl:col-span-2" : ""}`}>
      <h3 className="text-sm font-bold text-slate-950">{title}</h3>
      <div className="mt-4 space-y-3">
        {data.length === 0 ? (
          <p className="text-sm text-slate-400">Sem dados para exibir.</p>
        ) : (
          data.map((item) => (
            <div key={item.label}>
              <div className="mb-1 flex items-center justify-between gap-3 text-xs font-semibold text-slate-600">
                <span>{item.label}</span>
                <span>{item.value}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div className="h-2 rounded-full bg-blue-600" style={{ width: `${Math.max(8, (item.value / max) * 100)}%` }} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function RiskMapView({
  risks,
  actionsByRisk,
  controlsByRisk,
  onStatus,
}: {
  risks: Risk[];
  actionsByRisk: Map<string, RiskAction[]>;
  controlsByRisk: Map<string, RiskControl[]>;
  onStatus: (risk: Risk, status: RiskStatus) => void;
}) {
  return (
    <div className="space-y-5">
      <SectionHeader title="Mapa Geral de Riscos" description="Tabela mestre com filtros avançados, pontuação, nível, revisão e ações vinculadas." />
      <div className="overflow-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[1320px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
            <tr>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Setor</th>
              <th className="px-4 py-3">Processo</th>
              <th className="px-4 py-3">Risco inventariado</th>
              <th className="px-4 py-3">Consequência</th>
              <th className="px-4 py-3">Classificação</th>
              <th className="px-4 py-3">Decisão</th>
              <th className="px-4 py-3">I x P</th>
              <th className="px-4 py-3">Nível</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Responsável</th>
              <th className="px-4 py-3">Próxima revisão</th>
              <th className="px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {risks.map((risk) => {
              const actions = actionsByRisk.get(risk.id) ?? [];
              const controls = controlsByRisk.get(risk.id) ?? [];
              return (
                <tr key={risk.id} className="hover:bg-slate-50">
                  <td className="px-4 py-4 font-mono text-xs font-bold text-blue-700">{risk.code}</td>
                  <td className="px-4 py-4 text-slate-600">{risk.sector}</td>
                  <td className="px-4 py-4 text-slate-600">{risk.process}</td>
                  <td className="px-4 py-4">
                    <strong className="block text-slate-950">{risk.title}</strong>
                    <span className="line-clamp-1 text-xs text-slate-500">{risk.description}</span>
                    {controls.length === 0 && <span className="mt-1 inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">sem controle</span>}
                  </td>
                  <td className="px-4 py-4 text-slate-600">{risk.consequence || "-"}</td>
                  <td className="px-4 py-4 text-slate-600">{risk.category}</td>
                  <td className="px-4 py-4 text-slate-600">{risk.decision}</td>
                  <td className="px-4 py-4 text-slate-600">{risk.impact} x {risk.probability} = {risk.score}</td>
                  <td className="px-4 py-4"><LevelBadge level={risk.level} /></td>
                  <td className="px-4 py-4 text-slate-600">{risk.status}</td>
                  <td className="px-4 py-4 text-slate-600">{risk.responsible}</td>
                  <td className={`px-4 py-4 font-semibold ${isOverdue(risk.nextReviewDate) ? "text-red-600" : "text-slate-600"}`}>{fmtDate(risk.nextReviewDate)}</td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">{actions.length} ação(ões)</span>
                      <button onClick={() => onStatus(risk, "Em tratamento")} className="rounded-lg bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700 hover:bg-blue-100">Tratar</button>
                      <button onClick={() => onStatus(risk, "Inativo")} className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700 hover:bg-slate-200">Inativar</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {risks.length === 0 && (
              <tr>
                <td colSpan={13} className="px-4 py-16 text-center text-sm text-slate-400">Nenhum risco encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LevelBadge({ level }: { level: RiskLevel }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${levelStyle(level)}`}>{level}</span>;
}

function MatrixView({
  risks,
  selectedCell,
  onSelectCell,
  matrixRisks,
}: {
  risks: Risk[];
  selectedCell: { impact: number; probability: number } | null;
  onSelectCell: (cell: { impact: number; probability: number } | null) => void;
  matrixRisks: Risk[];
}) {
  return (
    <div className="space-y-6">
      <SectionHeader title="Matriz Visual 5x5" description="Impacto no eixo vertical e probabilidade no eixo horizontal. Clique em uma célula para ver os riscos." />
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
        <div className="grid grid-cols-[150px_repeat(5,minmax(96px,1fr))] gap-2">
          <div />
          {probabilityLabels.map((label, index) => <AxisLabel key={label} value={index + 1} label={label} />)}
          {[5, 4, 3, 2, 1].map((impact) => (
            <React.Fragment key={impact}>
              <AxisLabel value={impact} label={impactLabels[impact - 1]} vertical />
              {[1, 2, 3, 4, 5].map((probability) => {
                const score = calculateScore(impact, probability);
                const level = classifyRisk(score);
                const count = risks.filter((risk) => risk.impact === impact && risk.probability === probability).length;
                const active = selectedCell?.impact === impact && selectedCell?.probability === probability;
                return (
                  <button
                    key={`${impact}-${probability}`}
                    onClick={() => onSelectCell(active ? null : { impact, probability })}
                    className={`min-h-[86px] rounded-lg border-2 border-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 ${matrixCellStyle(level)} ${active ? "ring-4 ring-blue-200" : ""}`}
                  >
                    <span className="block text-xs font-bold opacity-80">Score {score}</span>
                    <strong className="mt-2 block text-2xl font-semibold">{count}</strong>
                    <span className="mt-1 block text-xs font-bold">{level}</span>
                  </button>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {selectedCell && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-slate-950">Riscos no quadrante impacto {selectedCell.impact} x probabilidade {selectedCell.probability}</h3>
            <button onClick={() => onSelectCell(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {matrixRisks.length === 0 ? (
              <p className="text-sm text-slate-400">Nenhum risco neste quadrante.</p>
            ) : (
              matrixRisks.map((risk) => (
                <article key={risk.id} className="rounded-lg border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{risk.code} · {risk.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{risk.sector} · {risk.responsible}</p>
                    </div>
                    <LevelBadge level={risk.level} />
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AxisLabel({ value, label, vertical }: { value: number; label: string; vertical?: boolean }) {
  return (
    <div className={`flex items-center gap-2 rounded-lg bg-slate-200 px-3 py-3 text-xs font-bold text-slate-700 ${vertical ? "justify-end text-right" : "justify-center text-center"}`}>
      <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-slate-700">{value}</span>
      <span>{label}</span>
    </div>
  );
}

function RiskFormView({
  form,
  formTab,
  formScore,
  formLevel,
  residualScore,
  residualLevel,
  isSaving,
  onTab,
  onSubmit,
  updateForm,
}: {
  form: RiskForm;
  formTab: "identificacao" | "classificacao" | "avaliacao" | "controles" | "contingencia" | "acao" | "historico";
  formScore: number;
  formLevel: RiskLevel;
  residualScore: number;
  residualLevel: RiskLevel;
  isSaving: boolean;
  onTab: (tab: "identificacao" | "classificacao" | "avaliacao" | "controles" | "contingencia" | "acao" | "historico") => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  updateForm: <K extends keyof RiskForm>(key: K, value: RiskForm[K]) => void;
}) {
  const tabs: Array<{ key: typeof formTab; label: string; icon: React.ElementType }> = [
    { key: "identificacao", label: "Identificação", icon: FileText },
    { key: "classificacao", label: "Classificação", icon: Filter },
    { key: "avaliacao", label: "Avaliação", icon: Target },
    { key: "controles", label: "Controles e Barreiras", icon: ShieldCheck },
    { key: "contingencia", label: "Contingência", icon: AlertCircle },
    { key: "acao", label: "Plano de Ação", icon: ClipboardCheck },
    { key: "historico", label: "Histórico", icon: History },
  ];

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <SectionHeader title="Cadastro de Risco" description="Fluxo completo com identificação, avaliação, controles, contingência, plano de ação e reavaliação." />
      <div className="flex gap-1 overflow-x-auto border-b border-slate-200">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.key} type="button" onClick={() => onTab(tab.key)} className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold whitespace-nowrap ${formTab === tab.key ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
              <Icon className="h-4 w-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      {formTab === "identificacao" && (
        <div className="grid gap-5 md:grid-cols-3">
          <Input label="Setor *" value={form.sector} onChange={(value) => updateForm("sector", value)} />
          <Input label="Processo" value={form.process} onChange={(value) => updateForm("process", value)} />
          <Input label="Gestor responsável *" value={form.responsible} onChange={(value) => updateForm("responsible", value)} />
          <Input label="Risco inventariado *" value={form.title} onChange={(value) => updateForm("title", value)} className="md:col-span-3" />
          <Textarea label="Descrição detalhada" value={form.description} onChange={(value) => updateForm("description", value)} className="md:col-span-3" />
          <Input label="Causa provável" value={form.cause} onChange={(value) => updateForm("cause", value)} />
          <Input label="Consequência" value={form.consequence} onChange={(value) => updateForm("consequence", value)} />
          <Input label="Área afetada" value={form.affectedArea} onChange={(value) => updateForm("affectedArea", value)} />
        </div>
      )}

      {formTab === "classificacao" && (
        <div className="grid gap-5 md:grid-cols-3">
          <Select label="Origem do risco" value={form.origin} options={origins} onChange={(value) => updateForm("origin", value)} />
          <Select label="Classificação" value={form.category} options={categories} onChange={(value) => updateForm("category", value as RiskCategory)} />
          <Input label="Tipo de impacto" value={form.impactType} onChange={(value) => updateForm("impactType", value)} />
          <Select label="Status" value={form.status} options={statuses} onChange={(value) => updateForm("status", value as RiskStatus)} />
          <Select label="Decisão sobre o risco" value={form.decision} options={decisions} onChange={(value) => updateForm("decision", value as RiskDecision)} />
          <Input label="Próxima revisão" type="date" value={form.nextReviewDate} onChange={(value) => updateForm("nextReviewDate", value)} />
          <Textarea label="Justificativa / aprovação da decisão" value={form.decisionJustification} onChange={(value) => updateForm("decisionJustification", value)} className="md:col-span-3" />
          <Textarea label="Observações / evidência" value={form.observation} onChange={(value) => updateForm("observation", value)} className="md:col-span-3" />
        </div>
      )}

      {formTab === "avaliacao" && (
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="grid gap-5 md:grid-cols-2">
            <ScoreSelect label="Impacto inerente" value={form.impact} labels={impactLabels} onChange={(value) => updateForm("impact", value)} />
            <ScoreSelect label="Probabilidade inerente" value={form.probability} labels={probabilityLabels} onChange={(value) => updateForm("probability", value)} />
            <ScoreSelect label="Impacto residual" value={form.residualImpact} labels={impactLabels} onChange={(value) => updateForm("residualImpact", value)} />
            <ScoreSelect label="Probabilidade residual" value={form.residualProbability} labels={probabilityLabels} onChange={(value) => updateForm("residualProbability", value)} />
          </div>
          <aside className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="text-sm font-bold text-slate-950">Comparativo</h3>
            <div className="mt-4 space-y-3">
              <RiskScoreBox label="Risco inerente" score={formScore} level={formLevel} />
              <RiskScoreBox label="Risco residual" score={residualScore} level={residualLevel} />
              <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-600">
                {residualScore < formScore ? "Redução de risco após controles." : residualScore === formScore ? "Risco mantido após controles." : "Aumento de risco residual. Exige nova análise."}
              </div>
            </div>
          </aside>
        </div>
      )}

      {formTab === "controles" && (
        <div className="grid gap-5 md:grid-cols-2">
          <Textarea label="Descrição do controle existente" value={form.controlDescription} onChange={(value) => updateForm("controlDescription", value)} className="md:col-span-2" />
          <Select label="Tipo de barreira" value={form.controlType} options={barrierTypes} onChange={(value) => updateForm("controlType", value)} />
          <Select label="Efetividade" value={form.controlEffectiveness} options={effectivenessOptions} onChange={(value) => updateForm("controlEffectiveness", value)} />
          <Input label="Responsável pelo controle" value={form.controlResponsible} onChange={(value) => updateForm("controlResponsible", value)} />
          <Input label="Última verificação" type="date" value={form.controlLastVerifiedAt} onChange={(value) => updateForm("controlLastVerifiedAt", value)} />
        </div>
      )}

      {formTab === "contingencia" && (
        <div className="grid gap-5 md:grid-cols-2">
          <Textarea label="O que fazer imediatamente" value={form.contingencyImmediateAction} onChange={(value) => updateForm("contingencyImmediateAction", value)} className="md:col-span-2" />
          <Input label="Quem deve ser acionado" value={form.contingencyContact} onChange={(value) => updateForm("contingencyContact", value)} />
          <Input label="Prazo de resposta" value={form.contingencyDeadline} onChange={(value) => updateForm("contingencyDeadline", value)} />
          <Input label="Canal de comunicação" value={form.contingencyChannel} onChange={(value) => updateForm("contingencyChannel", value)} />
          <Input label="Equipe envolvida" value={form.contingencyTeam} onChange={(value) => updateForm("contingencyTeam", value)} />
          <Input label="Documento de referência" value={form.contingencyReference} onChange={(value) => updateForm("contingencyReference", value)} className="md:col-span-2" />
          <div className="grid gap-3 md:col-span-2 md:grid-cols-2">
            <BooleanCheck label="Necessita notificação interna" checked={form.contingencyInternalNotification} onChange={() => updateForm("contingencyInternalNotification", !form.contingencyInternalNotification)} />
            <BooleanCheck label="Necessita notificação externa" checked={form.contingencyExternalNotification} onChange={() => updateForm("contingencyExternalNotification", !form.contingencyExternalNotification)} />
            <BooleanCheck label="Necessita abertura de ocorrência" checked={form.contingencyOpenOccurrence} onChange={() => updateForm("contingencyOpenOccurrence", !form.contingencyOpenOccurrence)} />
            <BooleanCheck label="Necessita comunicação à direção" checked={form.contingencyNotifyLeadership} onChange={() => updateForm("contingencyNotifyLeadership", !form.contingencyNotifyLeadership)} />
          </div>
        </div>
      )}

      {formTab === "acao" && (
        <div className="grid gap-5 md:grid-cols-3">
          <Textarea label="Descrição da ação" value={form.actionDescription} onChange={(value) => updateForm("actionDescription", value)} className="md:col-span-3" />
          <Select label="Tipo da ação" value={form.actionType} options={actionTypes} onChange={(value) => updateForm("actionType", value)} />
          <Input label="Responsável" value={form.actionResponsible} onChange={(value) => updateForm("actionResponsible", value)} />
          <Input label="Setor responsável" value={form.actionSector} onChange={(value) => updateForm("actionSector", value)} />
          <Input label="Prazo" type="date" value={form.actionDueDate} onChange={(value) => updateForm("actionDueDate", value)} />
          <Select label="Prioridade" value={form.actionPriority} options={["Baixa", "Média", "Alta", "Crítica"]} onChange={(value) => updateForm("actionPriority", value)} />
        </div>
      )}

      {formTab === "historico" && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <History className="mx-auto h-8 w-8 text-slate-400" />
          <h3 className="mt-3 font-semibold text-slate-950">Histórico automático</h3>
          <p className="mt-1 text-sm text-slate-500">Após salvar, cadastro, alterações, ações, controles e revisões passam a compor a linha do tempo do risco.</p>
        </div>
      )}

      <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
        <button type="submit" disabled={isSaving} className="inline-flex h-11 items-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Salvar risco
        </button>
      </div>
    </form>
  );
}

function Input({ label, value, onChange, type = "text", className = "" }: { label: string; value: string; onChange: (value: string) => void; type?: string; className?: string }) {
  return (
    <label className={className}>
      <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className={fieldClass} />
    </label>
  );
}

function Textarea({ label, value, onChange, className = "" }: { label: string; value: string; onChange: (value: string) => void; className?: string }) {
  return (
    <label className={className}>
      <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={4} className={`${fieldClass} resize-none`} />
    </label>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label>
      <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className={fieldClass}>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function ScoreSelect({ label, value, labels, onChange }: { label: string; value: number; labels: string[]; onChange: (value: number) => void }) {
  return (
    <label>
      <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</span>
      <select value={value} onChange={(event) => onChange(Number(event.target.value))} className={fieldClass}>
        {[1, 2, 3, 4, 5].map((score) => <option key={score} value={score}>{score} - {labels[score - 1]}</option>)}
      </select>
    </label>
  );
}

function BooleanCheck({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
      {label}
      <input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 accent-blue-600" />
    </label>
  );
}

function RiskScoreBox({ label, score, level }: { label: string; score: number; level: RiskLevel }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <strong className="text-3xl font-semibold text-slate-950">{score}</strong>
        <LevelBadge level={level} />
      </div>
    </div>
  );
}

const fieldClass = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-50";

function ActionsView({
  risks,
  actions,
  actionForm,
  isSaving,
  updateActionForm,
  onSubmit,
}: {
  risks: Risk[];
  actions: RiskAction[];
  actionForm: ActionForm;
  isSaving: boolean;
  updateActionForm: <K extends keyof ActionForm>(key: K, value: ActionForm[K]) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="space-y-6">
      <SectionHeader title="Planos de Ação" description="Ações preventivas, corretivas, mitigação e contingência vinculadas aos riscos." />
      <form onSubmit={onSubmit} className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-5 md:grid-cols-3">
        <label className="block">
          <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-500">Risco vinculado</span>
          <select value={actionForm.riskId} onChange={(event) => updateActionForm("riskId", event.target.value)} className={fieldClass}>
            <option value="">Selecione um risco...</option>
            {risks.map((risk) => (
              <option key={risk.id} value={risk.id}>{risk.code} - {risk.title}</option>
            ))}
          </select>
        </label>
        <Input label="Responsável" value={actionForm.responsible} onChange={(value) => updateActionForm("responsible", value)} />
        <Input label="Prazo" type="date" value={actionForm.dueDate} onChange={(value) => updateActionForm("dueDate", value)} />
        <Textarea label="Descrição da ação" value={actionForm.description} onChange={(value) => updateActionForm("description", value)} className="md:col-span-3" />
        <Select label="Tipo" value={actionForm.actionType} options={actionTypes} onChange={(value) => updateActionForm("actionType", value)} />
        <Input label="Setor responsável" value={actionForm.sector} onChange={(value) => updateActionForm("sector", value)} />
        <Select label="Prioridade" value={actionForm.priority} options={["Baixa", "Média", "Alta", "Crítica"]} onChange={(value) => updateActionForm("priority", value)} />
        <div className="md:col-span-3">
          <button disabled={isSaving} className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Adicionar ação
          </button>
        </div>
      </form>
      <ActionTable actions={actions} risks={risks} />
    </div>
  );
}

function ActionTable({ actions, risks }: { actions: RiskAction[]; risks: Risk[] }) {
  return (
    <div className="overflow-auto rounded-xl border border-slate-200">
      <table className="w-full min-w-[980px] text-left text-sm">
        <thead className="bg-slate-50 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
          <tr>
            <th className="px-4 py-3">Risco</th>
            <th className="px-4 py-3">Ação</th>
            <th className="px-4 py-3">Tipo</th>
            <th className="px-4 py-3">Responsável</th>
            <th className="px-4 py-3">Prazo</th>
            <th className="px-4 py-3">Prioridade</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {actions.map((action) => (
            <tr key={action.id}>
              <td className="px-4 py-4 text-slate-600">{risks.find((risk) => risk.id === action.riskId)?.code ?? "-"}</td>
              <td className="px-4 py-4 font-semibold text-slate-950">{action.description}</td>
              <td className="px-4 py-4 text-slate-600">{action.actionType}</td>
              <td className="px-4 py-4 text-slate-600">{action.responsible}</td>
              <td className={`px-4 py-4 font-semibold ${action.status === "Vencida" ? "text-red-600" : "text-slate-600"}`}>{fmtDate(action.dueDate)}</td>
              <td className="px-4 py-4 text-slate-600">{action.priority}</td>
              <td className="px-4 py-4 text-slate-600">{action.status}</td>
            </tr>
          ))}
          {actions.length === 0 && <tr><td colSpan={7} className="px-4 py-14 text-center text-sm text-slate-400">Nenhuma ação cadastrada.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function ReviewsView({ risks, onStatus }: { risks: Risk[]; onStatus: (risk: Risk, status: RiskStatus) => void }) {
  const pending = risks.filter((risk) => isOverdue(risk.nextReviewDate) || !risk.nextReviewDate);
  return (
    <div className="space-y-5">
      <SectionHeader title="Revisões Pendentes" description="Risco crítico: 3 meses. Alto: 6 meses. Moderado e baixo: anual ou sob demanda." />
      <div className="overflow-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-slate-50 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
            <tr>
              <th className="px-4 py-3">Risco</th>
              <th className="px-4 py-3">Setor</th>
              <th className="px-4 py-3">Última revisão</th>
              <th className="px-4 py-3">Próxima revisão</th>
              <th className="px-4 py-3">Dias em atraso</th>
              <th className="px-4 py-3">Responsável</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {pending.map((risk) => (
              <tr key={risk.id}>
                <td className="px-4 py-4 font-semibold text-slate-950">{risk.code} · {risk.title}</td>
                <td className="px-4 py-4 text-slate-600">{risk.sector}</td>
                <td className="px-4 py-4 text-slate-600">{fmtDate(risk.lastReviewDate)}</td>
                <td className="px-4 py-4 text-red-600">{fmtDate(risk.nextReviewDate)}</td>
                <td className="px-4 py-4 font-semibold text-red-600">{daysLate(risk.nextReviewDate)}</td>
                <td className="px-4 py-4 text-slate-600">{risk.responsible}</td>
                <td className="px-4 py-4">
                  <button onClick={() => onStatus(risk, "Em revisão")} className="rounded-lg bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700 hover:bg-violet-100">Revisar</button>
                </td>
              </tr>
            ))}
            {pending.length === 0 && <tr><td colSpan={7} className="px-4 py-14 text-center text-sm text-slate-400">Nenhuma revisão pendente.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KanbanView({ risks, actionsByRisk }: { risks: Risk[]; actionsByRisk: Map<string, RiskAction[]> }) {
  const columns: RiskStatus[] = ["Identificado", "Em análise", "Em tratamento", "Aguardando evidência", "Em revisão", "Monitorado", "Inativo"];
  return (
    <div className="space-y-5">
      <SectionHeader title="Kanban de Tratamento dos Riscos" description="Acompanhe o fluxo de identificação, análise, tratamento, evidência, reavaliação e monitoramento." />
      <div className="grid gap-4 xl:grid-cols-7">
        {columns.map((status) => {
          const items = risks.filter((risk) => risk.status === status || (status === "Identificado" && risk.status === "Ativo"));
          return (
            <div key={status} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-500">{status}</h3>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-slate-500">{items.length}</span>
              </div>
              <div className="space-y-3">
                {items.map((risk) => (
                  <article key={risk.id} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                    <p className="text-xs font-bold text-blue-700">{risk.code}</p>
                    <h4 className="mt-1 text-sm font-semibold text-slate-950">{risk.title}</h4>
                    <p className="mt-1 text-xs text-slate-500">{risk.sector} · {risk.responsible}</p>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <LevelBadge level={risk.level} />
                      <span className="text-xs font-bold text-slate-500">{actionsByRisk.get(risk.id)?.length ?? 0} ações</span>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LibraryView({ onUse }: { onUse: (item: typeof libraryRisks[number]) => void }) {
  return (
    <div className="space-y-5">
      <SectionHeader title="Biblioteca de Riscos" description="Riscos padrão para acelerar cadastros mantendo análise, controles e plano de ação personalizáveis." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {libraryRisks.map((item) => (
          <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <BookOpen className="h-5 w-5 text-blue-600" />
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">{item.category}</span>
            </div>
            <h3 className="mt-4 font-semibold text-slate-950">{item.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">{item.consequence}</p>
            <button onClick={() => onUse(item)} className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-3 text-xs font-bold text-white hover:bg-blue-700">
              <Plus className="h-3.5 w-3.5" /> Usar no cadastro
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}

function ReportsView({ onExport }: { onExport: () => void }) {
  const reports = ["Matriz completa de riscos", "Relatório executivo", "Riscos críticos", "Riscos por setor", "Ações vencidas", "Revisões pendentes", "Riscos inativos", "Histórico de revisões", "Comparativo inerente x residual"];
  return (
    <div className="space-y-5">
      <SectionHeader title="Relatórios" description="Exportações para auditoria, comitê executivo e acompanhamento operacional." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {reports.map((report) => (
          <button key={report} onClick={onExport} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-blue-200">
            <span className="font-semibold text-slate-800">{report}</span>
            <Download className="h-4 w-4 text-blue-600" />
          </button>
        ))}
      </div>
    </div>
  );
}

function ConfigView() {
  const groups = [
    { title: "Classificações de risco", items: categories },
    { title: "Escalas de impacto", items: impactLabels.map((label, index) => `${index + 1} ${label}`) },
    { title: "Escalas de probabilidade", items: probabilityLabels.map((label, index) => `${index + 1} ${label}`) },
    { title: "Tipos de barreira", items: barrierTypes },
    { title: "Tipos de ação", items: actionTypes },
    { title: "Status", items: statuses },
  ];
  return (
    <div className="space-y-5">
      <SectionHeader title="Cadastros Auxiliares" description="Estrutura base para parametrização da matriz, barreiras, ações, status e vínculos." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {groups.map((group) => (
          <article key={group.title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-semibold text-slate-950">{group.title}</h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {group.items.map((item) => <span key={item} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{item}</span>)}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function RiskDetail({ risk, actions, controls, timeline }: { risk: Risk; actions: RiskAction[]; controls: RiskControl[]; timeline: TimelineEvent[] }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-bold text-blue-700">{risk.code}</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">{risk.title}</h2>
          <p className="mt-1 text-sm text-slate-500">{risk.sector} · {risk.process} · {risk.responsible}</p>
        </div>
        <LevelBadge level={risk.level} />
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-4">
        <RiskScoreBox label="Inerente" score={risk.inherentScore} level={risk.inherentLevel} />
        <RiskScoreBox label="Atual" score={risk.score} level={risk.level} />
        <RiskScoreBox label="Residual" score={risk.residualScore} level={risk.residualLevel} />
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Redução</p>
          <strong className="mt-3 block text-3xl font-semibold text-slate-950">{risk.inherentScore - risk.residualScore}</strong>
        </div>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <InfoPanel title="Descrição" content={risk.description || "Sem descrição."} />
        <InfoPanel title="Causa provável" content={risk.cause || "Não informada."} />
        <InfoPanel title="Consequência" content={risk.consequence || "Não informada."} />
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <ListPanel title="Controles e barreiras" empty="Nenhum controle cadastrado." items={controls.map((control) => `${control.description} · ${control.effectiveness}`)} />
        <ListPanel title="Planos de ação" empty="Nenhuma ação vinculada." items={actions.map((action) => `${action.description} · ${action.status}`)} />
      </div>
      <div className="mt-5">
        <ListPanel title="Linha do tempo" empty="Sem eventos de auditoria." items={timeline.slice(0, 6).map((event) => `${fmtDate(event.createdAt)} · ${event.eventType}: ${event.description}`)} />
      </div>
    </section>
  );
}

function RiskRulesPanel({ risk, actions, controls }: { risk: Risk; actions: RiskAction[]; controls: RiskControl[] }) {
  const rules = [
    { label: "Alto ou crítico exige plano de ação", ok: !(risk.level === "Alto" || risk.level === "Crítico") || actions.length > 0 },
    { label: "Ação vencida deve ser tratada", ok: !actions.some((action) => action.status === "Vencida") },
    { label: "Revisão dentro do prazo", ok: !isOverdue(risk.nextReviewDate) },
    { label: "Reter exige justificativa", ok: risk.decision !== "Reter" || Boolean(risk.decisionJustification) },
    { label: "Controle/barreira cadastrado", ok: controls.length > 0 },
    { label: "Residual alto/crítico exige nova análise", ok: !(risk.residualLevel === "Alto" || risk.residualLevel === "Crítico") },
  ];
  return (
    <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="font-semibold text-slate-950">Regras automáticas</h3>
      <div className="mt-4 space-y-3">
        {rules.map((rule) => (
          <div key={rule.label} className={`flex items-start gap-3 rounded-lg border p-3 text-sm font-semibold ${rule.ok ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
            {rule.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
            {rule.label}
          </div>
        ))}
      </div>
    </aside>
  );
}

function InfoPanel({ title, content }: { title: string; content: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{content}</p>
    </div>
  );
}

function ListPanel({ title, empty, items }: { title: string; empty: string; items: string[] }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{title}</p>
      <div className="mt-3 space-y-2">
        {items.length === 0 ? <p className="text-sm text-slate-400">{empty}</p> : items.map((item) => <p key={item} className="rounded-lg bg-white px-3 py-2 text-sm text-slate-600">{item}</p>)}
      </div>
    </div>
  );
}
