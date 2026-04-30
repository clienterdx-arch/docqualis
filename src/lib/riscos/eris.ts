import type {
  ErisAnalytics,
  ErisRisk,
  ErisRiskEdge,
  ErisRiskNode,
  RiskClassification,
} from "@/types/riscos";

export function calculateInherentScore(probability: number, impact: number, velocity = 1): number {
  return Math.round(Number(probability || 0) * Number(impact || 0) * Math.max(1, Number(velocity || 1) * 0.35));
}

export function classifyRisk(score: number): RiskClassification {
  if (score >= 18) return "CRITICO";
  if (score >= 12) return "ALTO";
  if (score >= 6) return "MODERADO";
  return "BAIXO";
}

export function calculateResidualScore(probability: number, impact: number, controlsEffectiveness: number): number {
  const raw = Number(probability || 0) * Number(impact || 0);
  const reduction = Math.min(0.85, Math.max(0, controlsEffectiveness / 100));
  return Math.max(1, Math.round(raw * (1 - reduction)));
}

export function createRiskCode(total: number): string {
  return `RIS-${String(total + 1).padStart(4, "0")}`;
}

export function estimateMonteCarlo(min: number, likely: number, max: number, iterations = 12000) {
  const low = Math.max(0, min);
  const mode = Math.max(low, likely);
  const high = Math.max(mode, max);
  const values: number[] = [];

  for (let index = 0; index < iterations; index += 1) {
    const left = Math.random();
    const right = Math.random();
    const triangular = (left + right + Math.random()) / 3;
    const pert = (low + 4 * mode + high) / 6;
    const simulated = low + (high - low) * triangular * 0.55 + pert * 0.45;
    values.push(simulated);
  }

  values.sort((a, b) => a - b);
  const p50 = percentile(values, 0.5);
  const p90 = percentile(values, 0.9);
  const p95 = percentile(values, 0.95);
  const p99 = percentile(values, 0.99);
  const tail = values.filter((value) => value >= p95);
  const cvar95 = tail.length ? tail.reduce((sum, value) => sum + value, 0) / tail.length : p95;

  return {
    p50,
    p90,
    p95,
    p99,
    cvar95,
    iterations,
  };
}

export function buildGraphFromRisks(risks: ErisRisk[]): { nodes: ErisRiskNode[]; edges: ErisRiskEdge[] } {
  const nodes: ErisRiskNode[] = [];
  const edges: ErisRiskEdge[] = [];

  risks.forEach((risk) => {
    const riskNodeId = `risk-${risk.id}`;
    const causeId = `cause-${risk.id}`;
    const consequenceId = `consequence-${risk.id}`;
    const controlId = `control-${risk.id}`;
    const processId = `process-${risk.processo_vinculado || risk.setor || risk.id}`;

    nodes.push(
      { id: riskNodeId, type: "RISCO", title: risk.titulo, riskId: risk.id, weight: risk.nivel_risco },
      { id: causeId, type: "CAUSA", title: risk.causa || "Causa nao definida", riskId: risk.id, weight: 4 },
      { id: consequenceId, type: "CONSEQUENCIA", title: risk.consequencia || "Consequencia nao definida", riskId: risk.id, weight: risk.impacto },
      { id: controlId, type: "CONTROLE", title: `${risk.controles} controle(s)`, riskId: risk.id, weight: risk.controles },
      { id: processId, type: "PROCESSO", title: risk.processo_vinculado || risk.setor || "Processo", riskId: risk.id, weight: 6 }
    );

    edges.push(
      { id: `e1-${risk.id}`, source: causeId, target: riskNodeId, type: "causa_risco", weight: risk.probabilidade },
      { id: `e2-${risk.id}`, source: riskNodeId, target: consequenceId, type: "risco_consequencia", weight: risk.impacto },
      { id: `e3-${risk.id}`, source: controlId, target: riskNodeId, type: "mitiga", weight: Math.max(1, 10 - risk.residual_score) },
      { id: `e4-${risk.id}`, source: processId, target: riskNodeId, type: "exposto_a", weight: risk.nivel_risco }
    );
  });

  return { nodes: uniqueNodes(nodes), edges };
}

export function summarizeRisks(risks: ErisRisk[]): ErisAnalytics {
  return {
    total: risks.length,
    criticos: risks.filter((risk) => risk.classificacao === "CRITICO").length,
    altos: risks.filter((risk) => risk.classificacao === "ALTO").length,
    tratamento: risks.filter((risk) => risk.status === "EM_TRATAMENTO").length,
    controles: risks.reduce((sum, risk) => sum + risk.controles, 0),
    kriVermelho: risks.filter((risk) => risk.kri > 0 && risk.classificacao === "CRITICO").length,
    varP95: risks.reduce((sum, risk) => sum + risk.var_p95, 0),
    cvarP95: risks.reduce((sum, risk) => sum + risk.cvar_p95, 0),
    appetiteBreaches: risks.filter((risk) => risk.residual_score >= 16).length,
  };
}

function percentile(values: number[], percentileValue: number): number {
  if (values.length === 0) return 0;
  const index = Math.min(values.length - 1, Math.max(0, Math.floor(values.length * percentileValue)));
  return Math.round(values[index] ?? 0);
}

function uniqueNodes(nodes: ErisRiskNode[]): ErisRiskNode[] {
  const map = new Map<string, ErisRiskNode>();
  nodes.forEach((node) => {
    if (!map.has(node.id)) map.set(node.id, node);
  });
  return Array.from(map.values());
}

