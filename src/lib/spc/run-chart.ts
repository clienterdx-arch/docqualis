export type RunChartRule = "shift" | "trend" | "runs" | "astronomical";

export type RunChartViolation = {
  index: number;
  rule: RunChartRule;
  message: string;
};

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle] ?? 0;
  return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

function pushRange(violations: RunChartViolation[], start: number, end: number, rule: RunChartRule, message: string) {
  for (let index = start; index <= end; index += 1) {
    violations.push({ index, rule, message });
  }
}

export function detectRunChartRules(values: number[]): RunChartViolation[] {
  const clean = values.filter(Number.isFinite);
  if (clean.length < 5) return [];

  const center = median(clean);
  const violations: RunChartViolation[] = [];

  for (let i = 0; i <= clean.length - 6; i += 1) {
    const window = clean.slice(i, i + 6);
    if (window.every((value) => value > center) || window.every((value) => value < center)) {
      pushRange(violations, i, i + 5, "shift", "Seis ou mais pontos no mesmo lado da mediana.");
    }
  }

  for (let i = 0; i <= clean.length - 5; i += 1) {
    const window = clean.slice(i, i + 5);
    const increasing = window.every((value, index) => index === 0 || value > window[index - 1]!);
    const decreasing = window.every((value, index) => index === 0 || value < window[index - 1]!);
    if (increasing || decreasing) {
      pushRange(violations, i, i + 4, "trend", "Cinco pontos consecutivos subindo ou descendo.");
    }
  }

  const mean = clean.reduce((acc, value) => acc + value, 0) / clean.length;
  const variance = clean.reduce((acc, value) => acc + (value - mean) ** 2, 0) / clean.length;
  const sd = Math.sqrt(variance);

  clean.forEach((value, index) => {
    if (sd > 0 && Math.abs(value - mean) > 3 * sd) {
      violations.push({ index, rule: "astronomical", message: "Ponto astronomico detectado na serie." });
    }
  });

  const signs = clean.filter((value) => value !== center).map((value) => value > center ? 1 : -1);
  const runs = signs.reduce((count, sign, index) => index === 0 || sign === signs[index - 1] ? count : count + 1, signs.length > 0 ? 1 : 0);
  const expectedRuns = (2 * signs.filter((sign) => sign > 0).length * signs.filter((sign) => sign < 0).length) / Math.max(signs.length, 1) + 1;

  if (signs.length >= 10 && Math.abs(runs - expectedRuns) > 3) {
    clean.forEach((_, index) => violations.push({ index, rule: "runs", message: "Numero de runs fora do esperado." }));
  }

  return violations;
}

