"use client";

import React, { useMemo, useState } from "react";
import {
  Search,
  Plus,
  CheckCircle2,
  XCircle,
  Download,
  ArrowLeft,
  Filter,
  Edit3,
  Trash2,
  Copy,
  AlignLeft,
  Type,
  ListOrdered,
  CheckSquare,
  Calendar,
  Hash,
  UploadCloud,
  GripVertical,
  MoreVertical,
  Eye,
  Table2,
  Save,
  ChevronDown,
  ClipboardCheck,
  Clock3,
  ShieldCheck,
  Send,
  FileCheck2,
  AlertCircle,
  MessageSquare,
  Lock,
  KeyRound,
  X,
  CircleUser,
  PlusCircle,
  ArchiveX,
  FileText,
} from "lucide-react";

// ──────────────────────────────────────────────────────────────────────────────
// TIPOS
// ──────────────────────────────────────────────────────────────────────────────

type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "radio"
  | "checkbox"
  | "select"
  | "file";

type FormStatus = "Publicado" | "Rascunho";

type ApprovalStatus =
  | "Rascunho"
  | "Enviado"
  | "Em Verificação"
  | "Em Aprovação"
  | "Aprovado"
  | "Rejeitado"
  | "Ajuste Solicitado"
  | "Excluído";

type ProtectedAction = "approve" | "reject" | null;
type ViewMode = "list" | "builder" | "responses" | "record";
type MainTab = "modelos" | "registros";

interface FormField {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  options?: string[];
}

interface ApprovalConfig {
  enabled: boolean;
  reviewerRole: string;
  approverRole: string;
  requirePinForFinalAction: boolean;
  approvalPin: string;
}

interface FormTemplate {
  id: string;
  title: string;
  description: string;
  status: FormStatus;
  createdAt: string;
  approvalConfig: ApprovalConfig;
  fields: FormField[];
}

interface WorkflowEvent {
  id: string;
  status: ApprovalStatus;
  action: string;
  by: string;
  at: string;
  comment?: string;
}

interface FormResponse {
  id: string;
  formId: string;
  submittedAt: string;
  submittedBy: string;
  data: Record<string, any>;
  approvalStatus: ApprovalStatus;
  currentOwner: string;
  workflowHistory: WorkflowEvent[];
}

// ──────────────────────────────────────────────────────────────────────────────
// MOCKS
// ──────────────────────────────────────────────────────────────────────────────

const MOCK_FORMS: FormTemplate[] = [
  {
    id: "FRM-001",
    title: "Checklist de Inspeção de Equipamentos",
    description:
      "Registro operacional para inspeção pré-uso de equipamentos com validação posterior pelo engenheiro responsável.",
    status: "Publicado",
    createdAt: "10/04/2026",
    approvalConfig: {
      enabled: true,
      reviewerRole: "Supervisor Técnico",
      approverRole: "Engenheiro Responsável",
      requirePinForFinalAction: true,
      approvalPin: "123456",
    },
    fields: [
      { id: "f1", type: "date", label: "Data da Inspeção", required: true },
      {
        id: "f2",
        type: "text",
        label: "Código do Equipamento",
        required: true,
      },
      {
        id: "f3",
        type: "checkbox",
        label: "Itens Verificados",
        required: true,
        options: ["Estrutura", "Lubrificação", "Painel", "Segurança"],
      },
      {
        id: "f4",
        type: "textarea",
        label: "Observações",
        required: false,
      },
      {
        id: "f5",
        type: "file",
        label: "Anexar Evidência",
        required: false,
      },
    ],
  },
  {
    id: "FRM-002",
    title: "Auditoria Interna de Qualidade",
    description:
      "Formulário para auditorias internas com validação por gestor da qualidade antes da homologação.",
    status: "Publicado",
    createdAt: "12/04/2026",
    approvalConfig: {
      enabled: true,
      reviewerRole: "Coordenador da Área",
      approverRole: "Gestor da Qualidade",
      requirePinForFinalAction: true,
      approvalPin: "654321",
    },
    fields: [
      {
        id: "f1",
        type: "select",
        label: "Setor Auditado",
        required: true,
        options: ["Farmácia", "UTI", "Recepção", "Centro Cirúrgico"],
      },
      {
        id: "f2",
        type: "radio",
        label: "Conformidade geral encontrada",
        required: true,
        options: ["Conforme", "Parcialmente Conforme", "Não Conforme"],
      },
      {
        id: "f3",
        type: "textarea",
        label: "Descrição dos achados",
        required: true,
      },
      {
        id: "f4",
        type: "textarea",
        label: "Plano de ação sugerido",
        required: false,
      },
    ],
  },
];

const MOCK_RESPONSES: FormResponse[] = [
  {
    id: "REG-1001",
    formId: "FRM-001",
    submittedAt: "16/04/2026 07:20",
    submittedBy: "Carlos Mendes",
    approvalStatus: "Em Aprovação",
    currentOwner: "Engenheiro Responsável",
    data: {
      f1: "2026-04-16",
      f2: "EQP-992",
      f3: ["Estrutura", "Lubrificação", "Segurança"],
      f4: "Equipamento apto para uso. Pequeno ajuste visual no painel.",
      f5: "evidencia_eqp_992.jpg",
    },
    workflowHistory: [
      {
        id: "wf1",
        status: "Enviado",
        action: "Registro enviado",
        by: "Carlos Mendes",
        at: "16/04/2026 07:20",
      },
      {
        id: "wf2",
        status: "Em Verificação",
        action: "Encaminhado para verificação",
        by: "Sistema",
        at: "16/04/2026 07:21",
        comment: "Direcionado ao Supervisor Técnico.",
      },
      {
        id: "wf3",
        status: "Em Aprovação",
        action: "Encaminhado para aprovação final",
        by: "Supervisor Técnico",
        at: "16/04/2026 08:10",
        comment: "Checklist revisado e apto para homologação.",
      },
    ],
  },
  {
    id: "REG-1002",
    formId: "FRM-001",
    submittedAt: "16/04/2026 08:05",
    submittedBy: "João Silva",
    approvalStatus: "Aprovado",
    currentOwner: "Finalizado",
    data: {
      f1: "2026-04-16",
      f2: "EQP-110",
      f3: ["Estrutura", "Painel", "Segurança"],
      f4: "Sem intercorrências.",
      f5: "vistoria_eqp_110.png",
    },
    workflowHistory: [
      {
        id: "wf4",
        status: "Enviado",
        action: "Registro enviado",
        by: "João Silva",
        at: "16/04/2026 08:05",
      },
      {
        id: "wf5",
        status: "Em Verificação",
        action: "Encaminhado para verificação",
        by: "Sistema",
        at: "16/04/2026 08:06",
      },
      {
        id: "wf6",
        status: "Em Aprovação",
        action: "Encaminhado para aprovação final",
        by: "Supervisor Técnico",
        at: "16/04/2026 08:30",
      },
      {
        id: "wf7",
        status: "Aprovado",
        action: "Registro aprovado",
        by: "Engenheiro Responsável",
        at: "16/04/2026 09:02",
        comment: "Checklist aprovado sem ressalvas.",
      },
    ],
  },
  {
    id: "REG-2001",
    formId: "FRM-002",
    submittedAt: "16/04/2026 09:15",
    submittedBy: "Ana Beatriz",
    approvalStatus: "Ajuste Solicitado",
    currentOwner: "Auditor Responsável",
    data: {
      f1: "UTI",
      f2: "Parcialmente Conforme",
      f3: "Foram identificados registros incompletos em checklists de higienização.",
      f4: "Reforçar treinamento e revisar checklist padrão.",
    },
    workflowHistory: [
      {
        id: "wf8",
        status: "Enviado",
        action: "Registro enviado",
        by: "Ana Beatriz",
        at: "16/04/2026 09:15",
      },
      {
        id: "wf9",
        status: "Em Verificação",
        action: "Encaminhado para verificação",
        by: "Sistema",
        at: "16/04/2026 09:16",
      },
      {
        id: "wf10",
        status: "Ajuste Solicitado",
        action: "Ajuste solicitado",
        by: "Coordenador da Área",
        at: "16/04/2026 10:02",
        comment:
          "Detalhar melhor as evidências observadas e associar ação corretiva ao responsável.",
      },
    ],
  },
];

// ──────────────────────────────────────────────────────────────────────────────
// CONFIGS UI
// ──────────────────────────────────────────────────────────────────────────────

const FIELD_ICONS: Record<FieldType, React.ComponentType<{ className?: string }>> =
  {
    text: Type,
    textarea: AlignLeft,
    number: Hash,
    date: Calendar,
    radio: CheckCircle2,
    checkbox: CheckSquare,
    select: ListOrdered,
    file: UploadCloud,
  };

const FIELD_LABELS: Record<FieldType, string> = {
  text: "Resposta Curta",
  textarea: "Parágrafo",
  number: "Número",
  date: "Data",
  radio: "Múltipla Escolha",
  checkbox: "Caixas de Seleção",
  select: "Lista Suspensa",
  file: "Upload de Arquivo",
};

const STATUS_META: Record<
  ApprovalStatus,
  {
    label: string;
    color: string;
    icon: React.ComponentType<{ className?: string }>;
    bg: string;
    border: string;
  }
> = {
  Rascunho: {
    label: "Rascunho",
    color: "text-slate-700",
    icon: Edit3,
    bg: "bg-slate-50",
    border: "border-slate-200",
  },
  Enviado: {
    label: "Enviado",
    color: "text-blue-700",
    icon: Send,
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
  "Em Verificação": {
    label: "Em Verificação",
    color: "text-amber-700",
    icon: Clock3,
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
  "Em Aprovação": {
    label: "Em Aprovação",
    color: "text-violet-700",
    icon: ShieldCheck,
    bg: "bg-violet-50",
    border: "border-violet-200",
  },
  Aprovado: {
    label: "Aprovado",
    color: "text-emerald-700",
    icon: FileCheck2,
    bg: "bg-emerald-50",
    border: "border-emerald-200",
  },
  Rejeitado: {
    label: "Rejeitado",
    color: "text-red-700",
    icon: XCircle,
    bg: "bg-red-50",
    border: "border-red-200",
  },
  "Ajuste Solicitado": {
    label: "Ajuste Solicitado",
    color: "text-orange-700",
    icon: AlertCircle,
    bg: "bg-orange-50",
    border: "border-orange-200",
  },
  Excluído: {
    label: "Excluído",
    color: "text-slate-500",
    icon: ArchiveX,
    bg: "bg-slate-100",
    border: "border-slate-200",
  },
};

function generateId(prefix: string) {
  return `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
}

function nowFormatted() {
  return new Date().toLocaleString("pt-BR");
}

function countByStatus(responses: FormResponse[], status: ApprovalStatus) {
  return responses.filter((r) => r.approvalStatus === status).length;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

// ──────────────────────────────────────────────────────────────────────────────
// MODAL DE PIN
// ──────────────────────────────────────────────────────────────────────────────

function PinApprovalModal({
  isOpen,
  title,
  description,
  onClose,
  onConfirm,
  expectedPin,
}: {
  isOpen: boolean;
  title: string;
  description: string;
  onClose: () => void;
  onConfirm: () => void;
  expectedPin: string;
}) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleValidate = () => {
    if (!pin.trim()) {
      setError("Digite o PIN para continuar.");
      return;
    }

    if (pin !== expectedPin) {
      setError("PIN inválido. Tente novamente.");
      return;
    }

    setError("");
    setPin("");
    onConfirm();
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-[2rem] border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#eef2ff] border border-[#dbeafe] flex items-center justify-center">
              <Lock className="w-5 h-5 text-[#2655e8]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">{title}</h3>
              <p className="text-xs text-slate-500">{description}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setPin("");
              setError("");
              onClose();
            }}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6">
          <label className="text-[10px] uppercase tracking-widest font-black text-slate-400 block mb-2">
            PIN de Aprovação
          </label>

          <div className="relative">
            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                if (error) setError("");
              }}
              placeholder="Digite o PIN"
              className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl text-sm outline-none focus:border-[#2655e8]"
            />
          </div>

          {error && (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => window.alert("Solicitar reset ao administrador.")}
              className="text-sm font-bold text-[#2655e8] hover:underline"
            >
              Esqueci o PIN
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setPin("");
                  setError("");
                  onClose();
                }}
                className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleValidate}
                className="px-5 py-2.5 bg-[#2655e8] text-white rounded-xl text-sm font-bold shadow-md hover:bg-[#1e40af] transition-all"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// COMPONENTE: FORM BUILDER
// ──────────────────────────────────────────────────────────────────────────────

function FormBuilder({
  initialData,
  onSave,
  onCancel,
  onSubmitResponse,
}: {
  initialData?: FormTemplate;
  onSave: (form: FormTemplate) => void;
  onCancel: () => void;
  onSubmitResponse: (formId: string, data: Record<string, any>) => void;
}) {
  const [form, setForm] = useState<FormTemplate>(
    initialData || {
      id: generateId("FRM"),
      title: "Formulário Sem Título",
      description: "Descrição do formulário",
      status: "Rascunho",
      createdAt: new Date().toLocaleDateString("pt-BR"),
      approvalConfig: {
        enabled: true,
        reviewerRole: "Supervisor / Revisor",
        approverRole: "Aprovador Final",
        requirePinForFinalAction: true,
        approvalPin: "123456",
      },
      fields: [],
    }
  );

  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});

  const addField = (type: FieldType) => {
    const newField: FormField = {
      id: `f_${Date.now()}`,
      type,
      label: `Nova pergunta (${FIELD_LABELS[type]})`,
      required: false,
      options: ["radio", "checkbox", "select"].includes(type)
        ? ["Opção 1"]
        : undefined,
    };

    setForm((prev) => ({
      ...prev,
      fields: [...prev.fields, newField],
    }));
    setActiveFieldId(newField.id);
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    setForm((prev) => ({
      ...prev,
      fields: prev.fields.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    }));
  };

  const removeField = (id: string) => {
    setForm((prev) => ({
      ...prev,
      fields: prev.fields.filter((f) => f.id !== id),
    }));

    setFormData((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

    if (activeFieldId === id) setActiveFieldId(null);
  };

  const duplicateField = (field: FormField) => {
    const newField = { ...field, id: `f_${Date.now()}` };

    setForm((prev) => {
      const idx = prev.fields.findIndex((f) => f.id === field.id);
      const newFields = [...prev.fields];
      newFields.splice(idx + 1, 0, newField);
      return { ...prev, fields: newFields };
    });

    setActiveFieldId(newField.id);
  };

  const handleFieldChange = (fieldId: string, value: any, isCheckbox = false) => {
    if (isCheckbox) {
      setFormData((prev) => {
        const current = prev[fieldId] || [];
        if (current.includes(value)) {
          return { ...prev, [fieldId]: current.filter((v: any) => v !== value) };
        }
        return { ...prev, [fieldId]: [...current, value] };
      });
    } else {
      setFormData((prev) => ({ ...prev, [fieldId]: value }));
    }
  };

  const handleFormSubmit = () => {
    const missingRequired = form.fields.filter(
      (f) =>
        f.required &&
        (!formData[f.id] ||
          (Array.isArray(formData[f.id]) && formData[f.id].length === 0))
    );

    if (missingRequired.length > 0) {
      alert(
        `Por favor, preencha os seguintes campos obrigatórios:\n${missingRequired
          .map((f) => `- ${f.label}`)
          .join("\n")}`
      );
      return;
    }

    onSubmitResponse(form.id, formData);
  };

  const renderPreviewField = (field: FormField) => {
    const value = formData[field.id] || (field.type === "checkbox" ? [] : "");

    switch (field.type) {
      case "text":
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder="Digite sua resposta"
            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#2655e8]"
          />
        );

      case "textarea":
        return (
          <textarea
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder="Digite sua resposta"
            rows={4}
            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#2655e8] resize-none"
          />
        );

      case "number":
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder="Digite um número"
            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#2655e8]"
          />
        );

      case "date":
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#2655e8]"
          />
        );

      case "radio":
        return (
          <div className="space-y-3">
            {field.options?.map((opt, i) => (
              <label
                key={i}
                className="flex items-center gap-3 text-sm text-slate-700 cursor-pointer"
              >
                <input
                  type="radio"
                  name={field.id}
                  value={opt}
                  checked={value === opt}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  className="accent-[#2655e8] w-4 h-4"
                />
                <span>{opt}</span>
              </label>
            ))}
          </div>
        );

      case "checkbox":
        return (
          <div className="space-y-3">
            {field.options?.map((opt, i) => (
              <label
                key={i}
                className="flex items-center gap-3 text-sm text-slate-700 cursor-pointer"
              >
                <input
                  type="checkbox"
                  value={opt}
                  checked={value.includes(opt)}
                  onChange={() => handleFieldChange(field.id, opt, true)}
                  className="accent-[#2655e8] w-4 h-4 rounded border-slate-300"
                />
                <span>{opt}</span>
              </label>
            ))}
          </div>
        );

      case "select":
        return (
          <select
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#2655e8] bg-white cursor-pointer"
          >
            <option value="">Selecione uma opção</option>
            {field.options?.map((opt, i) => (
              <option key={i} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        );

      case "file":
        return (
          <input
            type="file"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFieldChange(field.id, file.name);
            }}
            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm outline-none file:mr-4 file:rounded-lg file:border-0 file:bg-[#eef2ff] file:px-4 file:py-2 file:text-[#2655e8] file:font-bold file:cursor-pointer cursor-pointer hover:bg-slate-50 transition-colors"
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] animate-in fade-in relative">
      <div className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center shrink-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={onCancel}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-px h-6 bg-slate-200"></div>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#2655e8] bg-[#eef2ff] px-2 py-1 rounded-md border border-[#e0e7ff]">
            {isPreviewMode
              ? "Pré-visualização e Preenchimento"
              : "Construtor de Formulários"}
          </span>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setIsPreviewMode((prev) => !prev)}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all flex items-center gap-2"
          >
            {isPreviewMode ? <Edit3 className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {isPreviewMode ? "Voltar para edição" : "Pré-visualizar / Preencher"}
          </button>

          {!isPreviewMode && (
            <button
              type="button"
              onClick={() => onSave({ ...form, status: "Publicado" })}
              className="px-6 py-2 bg-[#2655e8] text-white rounded-xl text-sm font-bold shadow-md hover:bg-[#1e40af] transition-all flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Salvar e Publicar Modelo
            </button>
          )}
        </div>
      </div>

      {isPreviewMode ? (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 pb-20">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white border border-slate-200 border-t-8 border-t-[#2655e8] rounded-2xl p-8 shadow-sm mb-6">
              <h1 className="text-3xl font-black text-slate-900 mb-3">{form.title}</h1>
              <p className="text-sm text-slate-600">{form.description}</p>

              {form.approvalConfig.enabled && (
                <div className="mt-6 pt-6 border-t border-slate-100">
                  <p className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-widest flex items-center gap-2">
                    <Clock3 className="w-4 h-4" />
                    Workflow de Aprovação Ativo
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <p className="text-[10px] uppercase font-black tracking-widest text-amber-600 mb-1">
                        Revisão por
                      </p>
                      <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <CircleUser className="w-4 h-4 text-amber-600" />
                        {form.approvalConfig.reviewerRole}
                      </p>
                    </div>

                    <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
                      <p className="text-[10px] uppercase font-black tracking-widest text-violet-600 mb-1">
                        Aprovação Final por
                      </p>
                      <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-violet-600" />
                        {form.approvalConfig.approverRole}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6">
              {form.fields.length === 0 ? (
                <div className="p-12 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 bg-white">
                  <ListOrdered className="w-10 h-10 mb-4 opacity-50" />
                  <p className="font-bold text-slate-600">Nenhum campo para preencher.</p>
                  <p className="text-sm mt-1">
                    Adicione campos no construtor antes de enviar.
                  </p>
                </div>
              ) : (
                form.fields.map((field) => (
                  <div
                    key={field.id}
                    className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <label className="block text-base font-bold text-slate-800 mb-4">
                      {field.label}
                      {field.required && (
                        <span className="text-red-500 ml-1" title="Campo Obrigatório">
                          *
                        </span>
                      )}
                    </label>
                    {renderPreviewField(field)}
                  </div>
                ))
              )}

              {form.fields.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex justify-between items-center mt-8">
                  <p className="text-xs text-slate-500">
                    Confirme se todos os dados estão corretos antes de enviar.
                  </p>
                  <button
                    type="button"
                    onClick={handleFormSubmit}
                    className="px-8 py-3 bg-[#2655e8] text-white rounded-xl text-sm font-bold shadow-md hover:bg-[#1e40af] transition-all flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Enviar Registro
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto custom-scrollbar p-8 pb-32">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="bg-white border border-slate-200 border-t-8 border-t-[#2655e8] rounded-2xl p-8 shadow-sm">
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full text-3xl font-black text-slate-900 outline-none border-b border-transparent focus:border-slate-200 pb-2 mb-4 transition-all"
                  placeholder="Título do Formulário"
                />
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full text-sm text-slate-600 outline-none border-b border-transparent focus:border-slate-200 pb-1 transition-all resize-none overflow-hidden"
                  placeholder="Descrição do formulário"
                  rows={2}
                />
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-5">
                  <ClipboardCheck className="w-5 h-5 text-[#2655e8]" />
                  <h3 className="text-lg font-bold text-slate-900">
                    Configuração do Workflow de Aprovação
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 block mb-2">
                      Workflow Ativo
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.approvalConfig.enabled}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            approvalConfig: {
                              ...prev.approvalConfig,
                              enabled: e.target.checked,
                            },
                          }))
                        }
                        className="w-4 h-4 accent-[#2655e8]"
                      />
                      <span className="text-sm font-medium text-slate-700">
                        Exigir fluxo de aprovação
                      </span>
                    </label>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 block mb-2">
                      Revisor Inicial
                    </label>
                    <input
                      type="text"
                      value={form.approvalConfig.reviewerRole}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          approvalConfig: {
                            ...prev.approvalConfig,
                            reviewerRole: e.target.value,
                          },
                        }))
                      }
                      className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#2655e8] bg-slate-50 focus:bg-white transition-colors"
                      placeholder="Ex.: Supervisor Técnico"
                    />
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 block mb-2">
                      Aprovador Final
                    </label>
                    <input
                      type="text"
                      value={form.approvalConfig.approverRole}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          approvalConfig: {
                            ...prev.approvalConfig,
                            approverRole: e.target.value,
                          },
                        }))
                      }
                      className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#2655e8] bg-slate-50 focus:bg-white transition-colors"
                      placeholder="Ex.: Diretor"
                    />
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 block mb-2">
                      PIN obrigatório
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.approvalConfig.requirePinForFinalAction}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            approvalConfig: {
                              ...prev.approvalConfig,
                              requirePinForFinalAction: e.target.checked,
                            },
                          }))
                        }
                        className="w-4 h-4 accent-[#2655e8]"
                      />
                      <span className="text-sm font-medium text-slate-700">
                        Exigir PIN na aprovação
                      </span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 block mb-2">
                      Definir PIN de Aprovação
                    </label>
                    <input
                      type="password"
                      value={form.approvalConfig.approvalPin}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          approvalConfig: {
                            ...prev.approvalConfig,
                            approvalPin: e.target.value,
                          },
                        }))
                      }
                      className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#2655e8]"
                      placeholder="Ex.: 123456"
                    />
                    <p className="text-xs text-slate-500 mt-2">
                      Em produção, este valor é configurado no painel de administração
                      e validado no backend.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Lock className="w-4 h-4 text-blue-600" />
                      <p className="text-xs font-black uppercase tracking-widest text-blue-600">
                        Regra de Segurança
                      </p>
                    </div>
                    <p className="text-sm text-slate-800 font-medium">
                      O PIN será solicitado ao{" "}
                      <strong>{form.approvalConfig.approverRole || "Aprovador Final"}</strong>{" "}
                      quando ele tentar:
                    </p>
                    <ul className="mt-3 space-y-2 text-sm text-slate-700">
                      <li>
                        <CheckCircle2 className="w-4 h-4 inline mr-2 text-emerald-600" />
                        Aprovar o registro em definitivo
                      </li>
                      <li>
                        <XCircle className="w-4 h-4 inline mr-2 text-red-600" />
                        Rejeitar e invalidar o registro
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {form.fields.map((field) => {
                const isActive = activeFieldId === field.id;
                const Icon = FIELD_ICONS[field.type];

                return (
                  <div
                    key={field.id}
                    onClick={() => setActiveFieldId(field.id)}
                    className={`bg-white border rounded-2xl transition-all relative group shadow-sm ${
                      isActive
                        ? "border-[#2655e8] ring-1 ring-[#2655e8]/20"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-4 cursor-grab opacity-0 group-hover:opacity-100 flex justify-center items-center">
                      <GripVertical className="w-4 h-4 text-slate-300 rotate-90" />
                    </div>

                    <div className="p-6 pt-8">
                      {isActive ? (
                        <div className="space-y-4">
                          <div className="flex gap-4 items-start">
                            <input
                              type="text"
                              value={field.label}
                              onChange={(e) =>
                                updateField(field.id, { label: e.target.value })
                              }
                              className="flex-1 text-base font-bold bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-[#2655e8] transition-colors"
                              placeholder="Pergunta"
                              autoFocus
                            />

                            <select
                              value={field.type}
                              onChange={(e) =>
                                updateField(field.id, {
                                  type: e.target.value as FieldType,
                                  options: ["radio", "checkbox", "select"].includes(
                                    e.target.value
                                  )
                                    ? field.options?.length
                                      ? field.options
                                      : ["Opção 1"]
                                    : undefined,
                                })
                              }
                              className="bg-white border border-slate-200 text-slate-700 font-bold rounded-xl px-4 py-3 outline-none focus:border-[#2655e8] cursor-pointer"
                            >
                              {Object.entries(FIELD_LABELS).map(([k, v]) => (
                                <option key={k} value={k}>
                                  {v}
                                </option>
                              ))}
                            </select>
                          </div>

                          {["radio", "checkbox", "select"].includes(field.type) && (
                            <div className="space-y-2 pl-2">
                              {field.options?.map((opt, oIdx) => (
                                <div key={oIdx} className="flex items-center gap-3">
                                  {field.type === "radio" ? (
                                    <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
                                  ) : field.type === "checkbox" ? (
                                    <div className="w-4 h-4 rounded border-2 border-slate-300" />
                                  ) : (
                                    <span className="text-xs font-bold text-slate-400">
                                      {oIdx + 1}.
                                    </span>
                                  )}

                                  <input
                                    type="text"
                                    value={opt}
                                    onChange={(e) => {
                                      const newOpts = [...(field.options || [])];
                                      newOpts[oIdx] = e.target.value;
                                      updateField(field.id, { options: newOpts });
                                    }}
                                    className="flex-1 text-sm bg-transparent outline-none border-b border-transparent focus:border-slate-300 hover:border-slate-200 py-1"
                                  />

                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newOpts = field.options?.filter(
                                        (_, i) => i !== oIdx
                                      );
                                      updateField(field.id, { options: newOpts });
                                    }}
                                    className="text-slate-300 hover:text-red-500"
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}

                              <button
                                type="button"
                                onClick={() =>
                                  updateField(field.id, {
                                    options: [
                                      ...(field.options || []),
                                      `Opção ${(field.options?.length || 0) + 1}`,
                                    ],
                                  })
                                }
                                className="text-xs font-bold text-[#2655e8] hover:underline mt-2 inline-flex items-center gap-1"
                              >
                                <PlusCircle className="w-3.5 h-3.5" />
                                Adicionar opção
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-3 pointer-events-none">
                          <div className="flex justify-between items-start">
                            <label className="text-base font-bold text-slate-800 flex items-center gap-2">
                              {field.label}
                              {field.required && <span className="text-red-500">*</span>}
                            </label>
                            <Icon className="w-4 h-4 text-slate-400" />
                          </div>

                          {["text", "textarea", "number", "date", "file"].includes(
                            field.type
                          ) && (
                            <div className="w-1/2 border-b-2 border-slate-100 pb-2 text-slate-400 text-sm italic">
                              {FIELD_LABELS[field.type]}...
                            </div>
                          )}

                          {["radio", "checkbox"].includes(field.type) && (
                            <div className="space-y-2">
                              {field.options?.map((opt, i) => (
                                <div
                                  key={i}
                                  className="flex items-center gap-2 text-sm text-slate-600"
                                >
                                  {field.type === "radio" ? (
                                    <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300" />
                                  ) : (
                                    <div className="w-3.5 h-3.5 rounded border-2 border-slate-300" />
                                  )}
                                  {opt}
                                </div>
                              ))}
                            </div>
                          )}

                          {field.type === "select" && (
                            <div className="w-1/2 p-2 border border-slate-200 rounded-lg text-sm text-slate-400 flex justify-between">
                              Selecionar...
                              <ChevronDown className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {isActive && (
                      <div className="border-t border-slate-100 bg-slate-50/50 rounded-b-2xl p-4 flex justify-end items-center gap-4">
                        <button
                          type="button"
                          onClick={() => duplicateField(field)}
                          className="text-slate-400 hover:text-slate-700 transition-colors"
                          title="Duplicar"
                        >
                          <Copy className="w-5 h-5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => removeField(field.id)}
                          className="text-slate-400 hover:text-red-500 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>

                        <div className="w-px h-6 bg-slate-200 mx-2"></div>

                        <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-slate-600">
                          Obrigatória
                          <div
                            className={`w-10 h-5 rounded-full transition-colors flex items-center px-1 ${
                              field.required ? "bg-[#2655e8]" : "bg-slate-300"
                            }`}
                          >
                            <div
                              className={`w-3.5 h-3.5 bg-white rounded-full transition-transform ${
                                field.required ? "translate-x-4" : "translate-x-0"
                              }`}
                            ></div>
                          </div>
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={(e) =>
                              updateField(field.id, { required: e.target.checked })
                            }
                            className="hidden"
                          />
                        </label>
                      </div>
                    )}
                  </div>
                );
              })}

              {form.fields.length === 0 && (
                <div className="p-12 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 bg-white">
                  <ListOrdered className="w-10 h-10 mb-4 opacity-50" />
                  <p className="font-bold text-slate-600">Seu formulário está vazio.</p>
                  <p className="text-sm mt-1">
                    Use a paleta ao lado para adicionar campos de coleta.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="w-72 bg-white border-l border-slate-200 p-6 flex flex-col shrink-0 shadow-[-4px_0_24px_rgba(0,0,0,0.02)] z-10 relative">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">
              Adicionar Campos
            </h4>

            <div className="space-y-2">
              {(Object.keys(FIELD_LABELS) as FieldType[]).map((type) => {
                const Icon = FIELD_ICONS[type];

                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => addField(type)}
                    className="w-full flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl hover:border-[#2655e8] hover:bg-[#eef2ff] hover:text-[#2655e8] text-slate-600 font-bold text-sm transition-all text-left shadow-sm group"
                  >
                    <Icon className="w-4 h-4 text-slate-400 group-hover:text-[#2655e8]" />
                    {FIELD_LABELS[type]}
                    <Plus className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// COMPONENTE: VISUALIZADOR DE RESPOSTAS
// ──────────────────────────────────────────────────────────────────────────────

function ResponsesViewer({
  form,
  responses,
  onBack,
  onOpenRecord,
}: {
  form: FormTemplate;
  responses: FormResponse[];
  onBack: () => void;
  onOpenRecord: (response: FormResponse) => void;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ApprovalStatus | "Todos">("Todos");

  const filteredResponses = useMemo(() => {
    return responses.filter((resp) => {
      const matchesSearch =
        resp.id.toLowerCase().includes(search.toLowerCase()) ||
        resp.submittedBy.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "Todos" ? true : resp.approvalStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [responses, search, statusFilter]);

  const statusCards = [
    {
      title: "Enviados",
      subtitle: "Recebidos",
      count: countByStatus(responses, "Enviado"),
      status: "Enviado" as ApprovalStatus,
    },
    {
      title: "Em Verificação",
      subtitle: "Revisão",
      count: countByStatus(responses, "Em Verificação"),
      status: "Em Verificação" as ApprovalStatus,
    },
    {
      title: "Em Aprovação",
      subtitle: "Homologação",
      count: countByStatus(responses, "Em Aprovação"),
      status: "Em Aprovação" as ApprovalStatus,
    },
    {
      title: "Aprovados",
      subtitle: "Finalizados",
      count: countByStatus(responses, "Aprovado"),
      status: "Aprovado" as ApprovalStatus,
    },
    {
      title: "Ajustes",
      subtitle: "Pendentes",
      count: countByStatus(responses, "Ajuste Solicitado"),
      status: "Ajuste Solicitado" as ApprovalStatus,
    },
    {
      title: "Rejeitados",
      subtitle: "Devolvidos",
      count: countByStatus(responses, "Rejeitado"),
      status: "Rejeitado" as ApprovalStatus,
    },
  ];

  return (
    <div className="h-full bg-slate-50/50 p-8 flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-500 hover:text-[#2655e8] transition-all shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#2655e8] bg-[#eef2ff] px-2 py-1 rounded-md border border-[#e0e7ff]">
                Respostas e Tramitações
              </span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {form.id}
              </span>
            </div>
            <h1 className="text-3xl font-bold text-slate-900">{form.title}</h1>
            <p className="text-sm text-slate-500 mt-1 font-medium">
              Gestão das respostas e do fluxo de aprovação deste formulário.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold shadow-sm hover:bg-slate-50 flex items-center gap-2">
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-5 shrink-0">
        {statusCards.map((card) => {
          const meta = STATUS_META[card.status];
          const Icon = meta.icon;
          const isActive = statusFilter === card.status;

          return (
            <button
              key={card.status}
              type="button"
              onClick={() =>
                setStatusFilter((prev) => (prev === card.status ? "Todos" : card.status))
              }
              className={`bg-white border rounded-[2rem] p-5 text-left shadow-sm transition-all hover:shadow-md ${
                isActive ? "border-[#2655e8] ring-2 ring-[#2655e8]/15" : "border-slate-200"
              }`}
            >
              <div className="flex justify-between items-start mb-5">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center ${meta.bg} ${meta.border} border`}
                >
                  <Icon className={`w-5 h-5 ${meta.color}`} />
                </div>
                <span className="text-4xl font-black text-slate-900">{card.count}</span>
              </div>
              <p className="text-lg font-bold text-slate-900">{card.title}</p>
              <p className="text-xs text-slate-500 font-medium">{card.subtitle}</p>
            </button>
          );
        })}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex-1 flex flex-col">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-3 md:justify-between md:items-center shrink-0">
          <div className="flex gap-3 items-center flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                type="text"
                placeholder="Buscar ID ou preenchedor..."
                className="pl-10 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:border-[#2655e8] w-72 shadow-sm"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as ApprovalStatus | "Todos")
              }
              className="px-4 py-2 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:border-[#2655e8] shadow-sm cursor-pointer"
            >
              <option value="Todos">Todos os status</option>
              <option value="Enviado">Enviado</option>
              <option value="Em Verificação">Em Verificação</option>
              <option value="Em Aprovação">Em Aprovação</option>
              <option value="Aprovado">Aprovado</option>
              <option value="Ajuste Solicitado">Ajuste Solicitado</option>
              <option value="Rejeitado">Rejeitado</option>
              <option value="Excluído">Excluído</option>
            </select>
          </div>

          <button className="px-4 py-2 bg-white border border-slate-200 text-slate-500 rounded-xl text-xs font-bold hover:text-[#2655e8] shadow-sm flex items-center gap-2">
            <Filter className="w-3.5 h-3.5" />
            Filtros Avançados
          </button>
        </div>

        <div className="overflow-auto flex-1 custom-scrollbar">
          <table className="w-full text-sm text-left border-collapse whitespace-nowrap">
            <thead className="bg-white text-[10px] font-black uppercase text-slate-400 tracking-widest border-b sticky top-0 shadow-sm z-10">
              <tr>
                <th className="px-6 py-4 bg-white">Registro</th>
                <th className="px-6 py-4 bg-white">Data de Envio</th>
                <th className="px-6 py-4 bg-white">Preenchido por</th>
                <th className="px-6 py-4 bg-white">Status Workflow</th>
                <th className="px-6 py-4 bg-white border-r border-slate-100">
                  Dono Atual
                </th>

                {form.fields.map((col) => (
                  <th
                    key={col.id}
                    className="px-6 py-4 bg-slate-50/50 font-semibold max-w-[200px] truncate"
                    title={col.label}
                  >
                    {col.label}
                  </th>
                ))}

                <th className="px-6 py-4 bg-white text-right sticky right-0 shadow-[-4px_0_10px_rgba(0,0,0,0.05)]">
                  Ações
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredResponses.length === 0 ? (
                <tr>
                  <td colSpan={6 + form.fields.length} className="p-10 text-center text-slate-400">
                    Nenhum registro encontrado para este filtro.
                  </td>
                </tr>
              ) : (
                filteredResponses.map((resp) => {
                  const meta = STATUS_META[resp.approvalStatus];
                  const Icon = meta.icon;

                  return (
                    <tr key={resp.id} className="hover:bg-[#eef2ff]/30 transition-colors group">
                      <td className="px-6 py-4 font-mono font-bold text-[#2655e8] text-xs">
                        {resp.id}
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-medium">
                        {resp.submittedAt}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-700">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 border border-slate-200">
                            {getInitials(resp.submittedBy)}
                          </div>
                          <span>{resp.submittedBy}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider font-black border ${meta.bg} ${meta.border} ${meta.color}`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-medium border-r border-slate-100">
                        {resp.currentOwner}
                      </td>

                      {form.fields.map((col) => {
                        const val = resp.data[col.id];
                        const displayVal = Array.isArray(val) ? val.join(", ") : val;
                        return (
                          <td
                            key={col.id}
                            className="px-6 py-4 text-slate-600 max-w-[250px] truncate"
                            title={displayVal}
                          >
                            {displayVal || "-"}
                          </td>
                        );
                      })}

                      <td className="px-6 py-4 text-right sticky right-0 bg-white group-hover:bg-[#f5f7ff] shadow-[-4px_0_10px_rgba(0,0,0,0.02)]">
                        <button
                          type="button"
                          onClick={() => onOpenRecord(resp)}
                          className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold shadow-sm hover:text-[#2655e8] hover:border-[#e0e7ff] transition-all inline-flex items-center gap-2 ml-auto"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Abrir
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// COMPONENTE: DETALHE DO REGISTRO
// ──────────────────────────────────────────────────────────────────────────────

function RecordDetails({
  form,
  response,
  onBack,
  onUpdateResponse,
}: {
  form: FormTemplate;
  response: FormResponse;
  onBack: () => void;
  onUpdateResponse: (updated: FormResponse) => void;
}) {
  const [comment, setComment] = useState("");
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pendingProtectedAction, setPendingProtectedAction] =
    useState<ProtectedAction>(null);

  const meta = STATUS_META[response.approvalStatus];
  const StatusIcon = meta.icon;

  const fieldsMap = useMemo(() => {
    return Object.fromEntries(form.fields.map((f) => [f.id, f]));
  }, [form.fields]);

  const pushHistory = (
    status: ApprovalStatus,
    action: string,
    by: string,
    nextOwner: string,
    optionalComment?: string
  ) => {
    const updated: FormResponse = {
      ...response,
      approvalStatus: status,
      currentOwner: nextOwner,
      workflowHistory: [
        ...response.workflowHistory,
        {
          id: `wf_${Date.now()}`,
          status,
          action,
          by,
          at: nowFormatted(),
          comment: optionalComment,
        },
      ],
    };

    onUpdateResponse(updated);
    setComment("");
  };

  const handleSendToVerification = () => {
    pushHistory(
      "Em Verificação",
      "Encaminhado para verificação",
      "Sistema / Usuário",
      form.approvalConfig.reviewerRole || "Revisor",
      comment || "Registro enviado para análise inicial."
    );
  };

  const handleSendToApproval = () => {
    pushHistory(
      "Em Aprovação",
      "Encaminhado para aprovação final",
      form.approvalConfig.reviewerRole || "Revisor",
      form.approvalConfig.approverRole || "Aprovador Final",
      comment || "Registro verificado e encaminhado para aprovação."
    );
  };

  const approveWithoutPin = () => {
    pushHistory(
      "Aprovado",
      "Registro aprovado",
      form.approvalConfig.approverRole || "Aprovador Final",
      "Finalizado",
      comment || "Registro aprovado."
    );
  };

  const rejectWithoutPin = () => {
    pushHistory(
      "Rejeitado",
      "Registro rejeitado",
      form.approvalConfig.approverRole || "Aprovador Final",
      response.submittedBy,
      comment || "Registro rejeitado."
    );
  };

  const requestAdjustment = () => {
    pushHistory(
      "Ajuste Solicitado",
      "Ajuste solicitado",
      form.approvalConfig.reviewerRole || "Revisor",
      response.submittedBy,
      comment || "Necessário complementar ou corrigir informações."
    );
  };

  const handleDelete = () => {
    pushHistory(
      "Excluído",
      "Registro excluído",
      form.approvalConfig.approverRole || "Aprovador Final",
      "Lixeira",
      comment || "Registro movido para a lixeira."
    );
  };

  const requestProtectedAction = (action: ProtectedAction) => {
    if (!form.approvalConfig.requirePinForFinalAction) {
      if (action === "approve") approveWithoutPin();
      if (action === "reject") rejectWithoutPin();
      return;
    }

    setPendingProtectedAction(action);
    setIsPinModalOpen(true);
  };

  const handleProtectedActionConfirmed = () => {
    setIsPinModalOpen(false);

    if (pendingProtectedAction === "approve") approveWithoutPin();
    if (pendingProtectedAction === "reject") rejectWithoutPin();

    setPendingProtectedAction(null);
  };

  return (
    <>
      <div className="h-full bg-slate-50/50 p-8 flex flex-col gap-6 animate-in fade-in duration-500">
        <div className="flex justify-between items-end gap-4 shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-500 hover:text-[#2655e8] transition-all shadow-sm"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#2655e8] bg-[#eef2ff] px-2 py-1 rounded-md border border-[#e0e7ff]">
                  Registro em Tramitação
                </span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">
                  {response.id}
                </span>
              </div>
              <h1 className="text-3xl font-bold text-slate-900">{form.title}</h1>
              <p className="text-sm text-slate-500 mt-1 font-medium">
                Detalhes do preenchimento e fluxo de aprovação.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {form.approvalConfig.requirePinForFinalAction && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-bold bg-blue-50 border-blue-200 text-blue-700 shadow-sm">
                <Lock className="w-3.5 h-3.5" />
                Workflow Autenticado (PIN)
              </div>
            )}

            <div
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-bold shadow-sm ${meta.bg} ${meta.border} ${meta.color}`}
            >
              <StatusIcon className="w-4 h-4" />
              {meta.label}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 flex-1 min-h-0">
          <div className="xl:col-span-2 space-y-6 overflow-y-auto custom-scrollbar pr-1">
            <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <div>
                  <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-1">
                    ID Registro
                  </p>
                  <p className="text-sm font-bold text-slate-800 font-mono text-[#2655e8]">
                    {response.id}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-1">
                    Enviado em
                  </p>
                  <p className="text-sm font-bold text-slate-800">{response.submittedAt}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-1">
                    Preenchido por
                  </p>
                  <p className="text-sm font-bold text-slate-800">{response.submittedBy}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-1">
                    Dono Atual da Tarefa
                  </p>
                  <p className="text-sm font-bold text-slate-800">{response.currentOwner}</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-8">
              <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                <FileText className="w-6 h-6 text-[#2655e8]" />
                <h3 className="text-xl font-bold text-slate-900">Dados Preenchidos</h3>
              </div>

              <div className="space-y-6">
                {Object.entries(response.data).map(([fieldId, value]) => {
                  const field = fieldsMap[fieldId];
                  const displayValue = Array.isArray(value)
                    ? value.join(", ")
                    : String(value || "-");

                  return (
                    <div
                      key={fieldId}
                      className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5"
                    >
                      <p className="text-xs uppercase tracking-widest font-black text-slate-500 mb-2">
                        {field?.label || fieldId}
                      </p>
                      <p className="text-base font-medium text-slate-800 whitespace-pre-wrap">
                        {displayValue}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-8">
              <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                <MessageSquare className="w-6 h-6 text-[#2655e8]" />
                <h3 className="text-xl font-bold text-slate-900">Histórico do Workflow</h3>
              </div>

              <div className="space-y-4">
                {response.workflowHistory.map((event) => {
                  const eventMeta = STATUS_META[event.status];
                  const EventIcon = eventMeta.icon;

                  return (
                    <div
                      key={event.id}
                      className="rounded-2xl border border-slate-200 p-5 relative overflow-hidden"
                    >
                      <div
                        className={`absolute left-0 top-0 bottom-0 w-1 ${eventMeta.bg} border-l-4 ${eventMeta.border}`}
                      ></div>

                      <div className="flex justify-between items-start gap-4 mb-3 pl-3">
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center border ${eventMeta.bg} ${eventMeta.border}`}
                          >
                            <EventIcon className={`w-4 h-4 ${eventMeta.color}`} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{event.action}</p>
                            <p className="text-xs font-medium text-slate-500 mt-0.5">
                              {event.by} • {event.at}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider border ${eventMeta.bg} ${eventMeta.border} ${eventMeta.color}`}
                        >
                          {eventMeta.label}
                        </span>
                      </div>

                      {event.comment && (
                        <div className="ml-14 rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-700 italic">
                          "{event.comment}"
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-6 overflow-y-auto custom-scrollbar pr-1">
            <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 sticky top-0">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Painel de Aprovação</h3>

              {response.approvalStatus !== "Excluído" && (
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                  placeholder="Adicione um comentário, parecer ou justificativa..."
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#2655e8] resize-none mb-4 shadow-inner"
                />
              )}

              <div className="space-y-3">
                {response.approvalStatus === "Enviado" && (
                  <button
                    type="button"
                    onClick={handleSendToVerification}
                    className="w-full px-5 py-3.5 bg-amber-500 text-white rounded-xl text-sm font-bold shadow-md hover:bg-amber-600 transition-all flex items-center justify-center gap-2"
                  >
                    <Clock3 className="w-4 h-4" />
                    Assumir para Verificação
                  </button>
                )}

                {response.approvalStatus === "Em Verificação" && (
                  <>
                    <button
                      type="button"
                      onClick={handleSendToApproval}
                      className="w-full px-5 py-3.5 bg-violet-600 text-white rounded-xl text-sm font-bold shadow-md hover:bg-violet-700 transition-all flex items-center justify-center gap-2"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      Encaminhar para Aprovador
                    </button>
                    <button
                      type="button"
                      onClick={requestAdjustment}
                      className="w-full px-5 py-3.5 bg-white border-2 border-orange-500 text-orange-600 rounded-xl text-sm font-bold shadow-sm hover:bg-orange-50 transition-all flex items-center justify-center gap-2"
                    >
                      <AlertCircle className="w-4 h-4" />
                      Devolver para Ajustes
                    </button>
                  </>
                )}

                {response.approvalStatus === "Em Aprovação" && (
                  <>
                    <button
                      type="button"
                      onClick={() => requestProtectedAction("approve")}
                      className="w-full px-5 py-3.5 bg-emerald-600 text-white rounded-xl text-sm font-bold shadow-md hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                    >
                      {form.approvalConfig.requirePinForFinalAction ? (
                        <Lock className="w-4 h-4" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      Aprovar Registro
                    </button>
                    <button
                      type="button"
                      onClick={() => requestProtectedAction("reject")}
                      className="w-full px-5 py-3.5 bg-white border-2 border-red-500 text-red-600 rounded-xl text-sm font-bold shadow-sm hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                    >
                      {form.approvalConfig.requirePinForFinalAction ? (
                        <Lock className="w-4 h-4" />
                      ) : (
                        <XCircle className="w-4 h-4" />
                      )}
                      Rejeitar Registro
                    </button>
                  </>
                )}

                {response.approvalStatus === "Ajuste Solicitado" && (
                  <button
                    type="button"
                    onClick={handleSendToVerification}
                    className="w-full px-5 py-3.5 bg-[#2655e8] text-white rounded-xl text-sm font-bold shadow-md hover:bg-[#1e40af] transition-all flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Reenviar Formulário Corrigido
                  </button>
                )}

                {(response.approvalStatus === "Aprovado" ||
                  response.approvalStatus === "Rejeitado" ||
                  response.approvalStatus === "Excluído") && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
                    <FileCheck2 className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-700">Fluxo Encerrado</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Este registro já concluiu sua tramitação e não aceita novas ações.
                    </p>
                  </div>
                )}

                {response.approvalStatus !== "Excluído" && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="w-full px-5 py-3 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 mt-4"
                  >
                    <Trash2 className="w-4 h-4" />
                    Excluir Registro
                  </button>
                )}
              </div>
            </div>

            {response.approvalStatus !== "Excluído" && (
              <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6">
                <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-widest">
                  Regras deste modelo
                </h3>
                <div className="space-y-3 text-xs text-slate-700">
                  <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                    <p className="font-black text-slate-900 mb-1 uppercase tracking-widest text-[10px]">
                      Revisor Configurado
                    </p>
                    <p className="font-medium text-slate-600">
                      {form.approvalConfig.reviewerRole || "Não definido"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                    <p className="font-black text-slate-900 mb-1 uppercase tracking-widest text-[10px]">
                      Aprovador Final Configurado
                    </p>
                    <p className="font-medium text-slate-600">
                      {form.approvalConfig.approverRole || "Não definido"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                    <p className="font-black text-slate-900 mb-1 uppercase tracking-widest text-[10px]">
                      Exigência de PIN
                    </p>
                    <p className="font-medium text-slate-600">
                      {form.approvalConfig.requirePinForFinalAction
                        ? "Obrigatório para aprovar/rejeitar"
                        : "Ações finais não requerem senha"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <PinApprovalModal
        isOpen={isPinModalOpen}
        title="Assinatura Eletrônica"
        description={`Você está prestes a ${
          pendingProtectedAction === "approve" ? "APROVAR" : "REJEITAR"
        } este documento. Confirme sua identidade.`}
        onClose={() => {
          setIsPinModalOpen(false);
          setPendingProtectedAction(null);
        }}
        onConfirm={handleProtectedActionConfirmed}
        expectedPin={form.approvalConfig.approvalPin}
      />
    </>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// PÁGINA PRINCIPAL
// ──────────────────────────────────────────────────────────────────────────────

export default function GestaoRegistrosPage() {
  const [forms, setForms] = useState<FormTemplate[]>(MOCK_FORMS);
  const [responses, setResponses] = useState<FormResponse[]>(MOCK_RESPONSES);

  const [mainTab, setMainTab] = useState<MainTab>("modelos");
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  const [activeForm, setActiveForm] = useState<FormTemplate | null>(null);
  const [activeResponse, setActiveResponse] = useState<FormResponse | null>(null);
  const [search, setSearch] = useState("");

  const filteredForms = useMemo(() => {
    return forms.filter(
      (f) =>
        f.title.toLowerCase().includes(search.toLowerCase()) ||
        f.id.toLowerCase().includes(search.toLowerCase())
    );
  }, [forms, search]);

  const filteredGlobalResponses = useMemo(() => {
    return responses.filter((r) => {
      const formRef = forms.find((f) => f.id === r.formId);
      return (
        r.id.toLowerCase().includes(search.toLowerCase()) ||
        r.submittedBy.toLowerCase().includes(search.toLowerCase()) ||
        r.formId.toLowerCase().includes(search.toLowerCase()) ||
        formRef?.title.toLowerCase().includes(search.toLowerCase())
      );
    });
  }, [responses, forms, search]);

  const handleCreateNew = () => {
    setActiveForm(null);
    setViewMode("builder");
  };

  const handleSaveForm = (savedForm: FormTemplate) => {
    setForms((prev) => {
      const exists = prev.find((f) => f.id === savedForm.id);
      if (exists) return prev.map((f) => (f.id === savedForm.id ? savedForm : f));
      return [savedForm, ...prev];
    });
    setViewMode("list");
  };

  const handleSubmitNewResponse = (formId: string, data: Record<string, any>) => {
    const approvalConfig = forms.find((f) => f.id === formId)?.approvalConfig;

    const newResp: FormResponse = {
      id: `REG-${Math.floor(1000 + Math.random() * 9000)}`,
      formId,
      submittedAt: nowFormatted(),
      submittedBy: "Usuário Atual (Você)",
      approvalStatus: "Enviado",
      currentOwner: approvalConfig?.reviewerRole || "Aguardando Verificação",
      data,
      workflowHistory: [
        {
          id: `wf_${Date.now()}`,
          status: "Enviado",
          action: "Registro preenchido e enviado",
          by: "Usuário Atual (Você)",
          at: nowFormatted(),
        },
      ],
    };

    setResponses((prev) => [newResp, ...prev]);
    setViewMode("list");
    setMainTab("registros");
    setSearch(newResp.id);

    setTimeout(() => {
      alert("Registro enviado com sucesso para aprovação!");
    }, 300);
  };

  const handleOpenResponses = (form: FormTemplate) => {
    setActiveForm(form);
    setViewMode("responses");
  };

  const handleOpenRecord = (response: FormResponse) => {
    const parentForm = forms.find((f) => f.id === response.formId);
    if (parentForm) {
      setActiveForm(parentForm);
      setActiveResponse(response);
      setViewMode("record");
    }
  };

  const handleUpdateResponse = (updated: FormResponse) => {
    setResponses((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    setActiveResponse(updated);
  };

  const getResponseCount = (formId: string) =>
    responses.filter((r) => r.formId === formId && r.approvalStatus !== "Excluído")
      .length;

  if (viewMode === "builder") {
    return (
      <FormBuilder
        initialData={activeForm || undefined}
        onSave={handleSaveForm}
        onCancel={() => setViewMode("list")}
        onSubmitResponse={handleSubmitNewResponse}
      />
    );
  }

  if (viewMode === "responses" && activeForm) {
    return (
      <ResponsesViewer
        form={activeForm}
        responses={responses.filter((r) => r.formId === activeForm.id)}
        onBack={() => setViewMode("list")}
        onOpenRecord={handleOpenRecord}
      />
    );
  }

  if (viewMode === "record" && activeForm && activeResponse) {
    return (
      <RecordDetails
        form={activeForm}
        response={activeResponse}
        onBack={() => {
          if (mainTab === "registros") {
            setViewMode("list");
          } else {
            setViewMode("responses");
          }
        }}
        onUpdateResponse={handleUpdateResponse}
      />
    );
  }

  const globalAprovados = countByStatus(responses, "Aprovado");
  const globalEmVerificacao =
    countByStatus(responses, "Enviado") +
    countByStatus(responses, "Em Verificação") +
    countByStatus(responses, "Em Aprovação") +
    countByStatus(responses, "Ajuste Solicitado");
  const globalRejeitados = countByStatus(responses, "Rejeitado");
  const globalExcluidos = countByStatus(responses, "Excluído");

  return (
    <div className="h-full bg-slate-50/50 p-8 flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end gap-4 shrink-0 mb-2">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Gestão de Registros</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Crie formulários dinâmicos e gerencie os registros através de workflows
            de aprovação.
          </p>
        </div>

        <div className="flex gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={mainTab === "modelos" ? "Buscar modelo..." : "Buscar registro..."}
              className="pl-10 pr-4 py-2.5 text-sm font-medium bg-white border border-slate-200 rounded-xl outline-none focus:border-[#2655e8] w-72 shadow-sm transition-all"
            />
          </div>
          <button
            onClick={handleCreateNew}
            className="px-5 py-2.5 bg-[#2655e8] text-white rounded-xl text-sm font-bold shadow-md hover:bg-[#1e40af] transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Criar Formulário
          </button>
        </div>
      </div>

      <div className="border-b border-slate-200 flex gap-8 text-[13px] font-bold text-slate-500 shrink-0">
        <button
          onClick={() => setMainTab("modelos")}
          className={`pb-4 border-b-[3px] flex items-center gap-2 transition-all outline-none ${
            mainTab === "modelos"
              ? "border-[#2655e8] text-[#2655e8]"
              : "border-transparent hover:text-slate-800"
          }`}
        >
          <FileText className="w-4 h-4" />
          Modelos de Formulários
        </button>
        <button
          onClick={() => setMainTab("registros")}
          className={`pb-4 border-b-[3px] flex items-center gap-2 transition-all outline-none ${
            mainTab === "registros"
              ? "border-[#2655e8] text-[#2655e8]"
              : "border-transparent hover:text-slate-800"
          }`}
        >
          <Table2 className="w-4 h-4" />
          Base de Registros
        </button>
      </div>

      {mainTab === "modelos" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 overflow-y-auto pb-8 custom-scrollbar">
          <div
            onClick={handleCreateNew}
            className="bg-white border-2 border-dashed border-slate-200 rounded-[2rem] hover:border-[#2655e8] hover:bg-[#eef2ff]/30 transition-all cursor-pointer flex flex-col items-center justify-center text-slate-400 hover:text-[#2655e8] min-h-[260px] shadow-sm group"
          >
            <div className="w-14 h-14 bg-slate-50 group-hover:bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-transparent group-hover:border-[#e0e7ff]">
              <Plus className="w-6 h-6 text-slate-400 group-hover:text-[#2655e8]" />
            </div>
            <span className="text-base font-bold text-slate-600 group-hover:text-[#2655e8]">
              Criar Modelo em Branco
            </span>
            <span className="text-xs font-medium mt-1 opacity-70">
              Adicione campos e configure aprovações
            </span>
          </div>

          {filteredForms.map((form) => {
            const respCount = getResponseCount(form.id);

            return (
              <div
                key={form.id}
                className="bg-white border border-slate-200 rounded-[2rem] hover:border-[#2655e8]/50 hover:shadow-lg transition-all flex flex-col min-h-[320px] relative overflow-hidden group"
              >
                <div className="h-2 w-full bg-[#2655e8]"></div>

                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <span
                      className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border shadow-sm ${
                        form.status === "Publicado"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-slate-100 text-slate-500 border-slate-200"
                      }`}
                    >
                      {form.status}
                    </span>
                    <button className="text-slate-300 hover:text-slate-600">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="mb-2">
                    <span className="text-[10px] font-mono font-black text-[#2655e8] bg-[#eef2ff] px-2 py-0.5 rounded border border-[#e0e7ff] mb-2 inline-block">
                      {form.id}
                    </span>
                    <h4
                      className="text-xl font-bold text-slate-900 leading-tight line-clamp-2"
                      title={form.title}
                    >
                      {form.title}
                    </h4>
                  </div>

                  <p className="text-sm text-slate-500 font-medium mb-6 line-clamp-3 flex-1">
                    {form.description}
                  </p>

                  {form.approvalConfig.enabled && (
                    <div className="flex items-center gap-2 mb-6">
                      <div className="flex -space-x-2">
                        <div
                          className="w-6 h-6 rounded-full bg-amber-100 border border-white flex items-center justify-center text-amber-700"
                          title={`Revisor: ${form.approvalConfig.reviewerRole}`}
                        >
                          <Clock3 className="w-3 h-3" />
                        </div>
                        <div
                          className="w-6 h-6 rounded-full bg-violet-100 border border-white flex items-center justify-center text-violet-700"
                          title={`Aprovador: ${form.approvalConfig.approverRole}`}
                        >
                          <ShieldCheck className="w-3 h-3" />
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Workflow Ativo
                      </span>
                    </div>
                  )}

                  <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-5">
                    <div
                      className="flex items-center gap-3 cursor-pointer"
                      onClick={() => handleOpenResponses(form)}
                    >
                      <div className="p-2.5 bg-[#eef2ff] rounded-xl border border-[#e0e7ff]">
                        <Table2 className="w-5 h-5 text-[#2655e8]" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                          Registros Totais
                        </p>
                        <p className="text-lg font-black text-slate-800 leading-none">
                          {respCount}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setActiveForm(form);
                          setViewMode("builder");
                        }}
                        className="p-2.5 text-slate-400 hover:text-[#2655e8] hover:bg-[#eef2ff] rounded-xl transition-colors border border-transparent hover:border-[#e0e7ff]"
                        title="Editar"
                      >
                        <Edit3 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleOpenResponses(form)}
                        className="p-2.5 text-slate-400 hover:text-[#2655e8] hover:bg-[#eef2ff] rounded-xl transition-colors border border-transparent hover:border-[#e0e7ff]"
                        title="Ver respostas"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {mainTab === "registros" && (
        <div className="flex flex-col flex-1 min-h-0 gap-6 animate-in fade-in">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 shrink-0">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all cursor-default">
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-emerald-50 border border-emerald-100 text-emerald-600">
                  <FileCheck2 className="w-6 h-6" />
                </div>
                <span className="text-3xl font-black text-slate-900">{globalAprovados}</span>
              </div>
              <div className="mt-6">
                <h4 className="text-base font-bold text-slate-800">Registros Aprovados</h4>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black mt-1">
                  Finalizados
                </p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all cursor-default">
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-amber-50 border border-amber-100 text-amber-600">
                  <Clock3 className="w-6 h-6" />
                </div>
                <span className="text-3xl font-black text-slate-900">
                  {globalEmVerificacao}
                </span>
              </div>
              <div className="mt-6">
                <h4 className="text-base font-bold text-slate-800">
                  Registros em Verificação
                </h4>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black mt-1">
                  Pendentes de Ação
                </p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all cursor-default">
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-red-50 border border-red-100 text-red-600">
                  <XCircle className="w-6 h-6" />
                </div>
                <span className="text-3xl font-black text-slate-900">
                  {globalRejeitados}
                </span>
              </div>
              <div className="mt-6">
                <h4 className="text-base font-bold text-slate-800">
                  Registros Rejeitados
                </h4>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black mt-1">
                  Devolvidos/Cancelados
                </p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all cursor-default opacity-90">
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-slate-100 border border-slate-200 text-slate-500">
                  <ArchiveX className="w-6 h-6" />
                </div>
                <span className="text-3xl font-black text-slate-900">{globalExcluidos}</span>
              </div>
              <div className="mt-6">
                <h4 className="text-base font-bold text-slate-800">Registros Excluídos</h4>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black mt-1">
                  Lixeira
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex-1 flex flex-col">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-3 md:justify-between md:items-center shrink-0">
              <div className="flex gap-3 items-center">
                <button className="px-4 py-2 bg-white border border-slate-200 text-slate-500 rounded-xl text-xs font-bold hover:text-[#2655e8] shadow-sm flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5" />
                  Filtros Avançados
                </button>
              </div>
              <button className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold shadow-sm hover:bg-slate-50 flex items-center gap-2">
                <Download className="w-4 h-4" />
                Exportar CSV
              </button>
            </div>

            <div className="overflow-auto flex-1 custom-scrollbar">
              <table className="w-full text-sm text-left border-collapse whitespace-nowrap">
                <thead className="bg-white text-[10px] font-black uppercase text-slate-400 tracking-widest border-b sticky top-0 shadow-sm z-10">
                  <tr>
                    <th className="px-6 py-4 bg-white">Registro</th>
                    <th className="px-6 py-4 bg-white">Formulário Ref.</th>
                    <th className="px-6 py-4 bg-white">Data de Envio</th>
                    <th className="px-6 py-4 bg-white">Preenchido por</th>
                    <th className="px-6 py-4 bg-white">Status Workflow</th>
                    <th className="px-6 py-4 bg-white">Responsável Atual</th>
                    <th className="px-6 py-4 bg-white text-right sticky right-0 shadow-[-4px_0_10px_rgba(0,0,0,0.05)]">
                      Ações
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredGlobalResponses.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-10 text-center text-slate-400">
                        Nenhum registro encontrado.
                      </td>
                    </tr>
                  ) : (
                    filteredGlobalResponses.map((resp) => {
                      const meta = STATUS_META[resp.approvalStatus];
                      const Icon = meta.icon;
                      const form = forms.find((f) => f.id === resp.formId);

                      return (
                        <tr
                          key={resp.id}
                          className="hover:bg-[#eef2ff]/30 transition-colors group"
                        >
                          <td className="px-6 py-4 font-mono font-bold text-[#2655e8] text-xs">
                            {resp.id}
                          </td>
                          <td className="px-6 py-4 font-medium text-slate-700">
                            {form?.title || resp.formId}
                          </td>
                          <td className="px-6 py-4 text-slate-500 font-medium">
                            {resp.submittedAt}
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-700">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 border border-slate-200">
                                {getInitials(resp.submittedBy)}
                              </div>
                              <span>{resp.submittedBy}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider font-black border ${meta.bg} ${meta.border} ${meta.color}`}
                            >
                              <Icon className="w-3.5 h-3.5" />
                              {meta.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-600 font-medium">
                            {resp.currentOwner}
                          </td>
                          <td className="px-6 py-4 text-right sticky right-0 bg-white group-hover:bg-[#f5f7ff] shadow-[-4px_0_10px_rgba(0,0,0,0.02)]">
                            <button
                              type="button"
                              onClick={() => handleOpenRecord(resp)}
                              className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold shadow-sm hover:text-[#2655e8] hover:border-[#e0e7ff] transition-all inline-flex items-center gap-2 ml-auto"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Abrir
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}