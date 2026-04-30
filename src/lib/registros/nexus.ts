import type {
  RegistryAnalytics,
  RegistryField,
  RegistryRecord,
  RegistryTemplate,
  RegistryWorkflowStep,
} from "@/types/registros";

export function createRegistryId(totalRecords: number, date = new Date()): string {
  const year = date.getFullYear();
  return `REG-${year}-${String(totalRecords + 1).padStart(6, "0")}`;
}

export function createField(type: RegistryField["type"], index: number): RegistryField {
  const labels: Record<RegistryField["type"], string> = {
    text: "Resposta curta",
    textarea: "Descricao detalhada",
    number: "Valor numerico",
    date: "Data",
    time: "Horario",
    currency: "Valor financeiro",
    percent: "Percentual",
    select: "Selecao unica",
    multi_select: "Selecao multipla",
    likert: "Escala de avaliacao",
    matrix: "Matriz de verificacao",
    file: "Anexo",
    photo: "Foto com camera",
    signature: "Assinatura digital",
    geo: "Geolocalizacao",
    qr: "QR ou codigo de barras",
    audio: "Audio com transcricao",
    ocr: "OCR de documento",
  };

  return {
    id: `field_${Date.now()}_${index}`,
    type,
    label: labels[type],
    required: ["signature", "photo", "geo"].includes(type),
    options: ["select", "multi_select", "likert", "matrix"].includes(type)
      ? ["Conforme", "Nao conforme", "Nao aplicavel"]
      : undefined,
    piiCategory: ["signature", "photo", "audio", "ocr"].includes(type) ? "sensitive" : "none",
    riskWeight: ["signature", "photo", "geo"].includes(type) ? 12 : 4,
  };
}

export function createSchemaFromPrompt(prompt: string): RegistryField[] {
  const normalized = prompt.toLowerCase();
  const fields: RegistryField[] = [
    { ...createField("date", 1), label: "Data do registro", required: true },
    { ...createField("text", 2), label: "Local / setor", required: true },
    { ...createField("textarea", 3), label: "Descricao operacional", required: true },
  ];

  if (normalized.includes("epi") || normalized.includes("checklist")) {
    fields.push({
      ...createField("matrix", fields.length + 1),
      label: "Checklist de conformidade",
      required: true,
      options: ["Conforme", "Nao conforme", "Nao aplicavel"],
      riskWeight: 20,
    });
  }

  if (normalized.includes("foto") || normalized.includes("evidencia")) {
    fields.push({ ...createField("photo", fields.length + 1), label: "Evidencia fotografica", required: true });
  }

  if (normalized.includes("assinatura")) {
    fields.push({ ...createField("signature", fields.length + 1), label: "Assinatura do responsavel", required: true });
  }

  if (normalized.includes("geo") || normalized.includes("localizacao") || normalized.includes("obra")) {
    fields.push({ ...createField("geo", fields.length + 1), label: "Geolocalizacao com geofence", required: true });
  }

  if (normalized.includes("qr") || normalized.includes("barcode") || normalized.includes("codigo")) {
    fields.push({ ...createField("qr", fields.length + 1), label: "Leitura de QR/Barcode", required: false });
  }

  return fields;
}

export function defaultWorkflow(): RegistryWorkflowStep[] {
  return [
    { id: "start", type: "task", label: "Triagem operacional", owner: "Supervisor", slaHours: 1, escalation: "Gestor da area" },
    { id: "risk", type: "exclusive_gateway", label: "Classificar risco", owner: "Qualidade", slaHours: 4, escalation: "Coordenacao" },
    { id: "approval", type: "task", label: "Aprovacao final", owner: "Aprovador", slaHours: 24, escalation: "Diretoria" },
  ];
}

export function calculateRiskScore(fields: RegistryField[]): number {
  const score = fields.reduce((total, field) => total + (field.required ? 6 : 0) + (field.riskWeight ?? 0), 0);
  return Math.min(100, score);
}

export function summarizeAnalytics(templates: RegistryTemplate[], records: RegistryRecord[]): RegistryAnalytics {
  const approvedRecords = records.filter((record) => record.status === "APROVADO").length;
  const pendingRecords = records.filter((record) => ["ENVIADO", "EM_VERIFICACAO", "EM_APROVACAO", "AJUSTE_SOLICITADO"].includes(record.status)).length;
  const highRiskRecords = records.filter((record) => record.risk_score >= 70 || record.flag_revisao_humana).length;
  const forensicRecords = records.filter((record) => Boolean(record.hash_sha256) || record.total_eventos > 0).length;

  return {
    totalTemplates: templates.length,
    publishedTemplates: templates.filter((template) => template.status === "PUBLICADO").length,
    totalRecords: records.length,
    approvedRecords,
    pendingRecords,
    highRiskRecords,
    forensicCoverage: records.length === 0 ? 0 : Math.round((forensicRecords / records.length) * 100),
  };
}

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;

  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`).join(",")}}`;
}

export async function sha256Hex(value: unknown): Promise<string> {
  const input = stableStringify(value);
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

