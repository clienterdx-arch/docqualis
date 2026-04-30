export type WesternElectricViolation = {
  index: number;
  rule: number;
  message: string;
};

function average(values: number[]): number {
  return values.reduce((acc, value) => acc + value, 0) / values.length;
}

function sd(values: number[], mean: number): number {
  if (values.length < 2) return 0;
  return Math.sqrt(values.reduce((acc, value) => acc + (value - mean) ** 2, 0) / (values.length - 1));
}

function push(violations: WesternElectricViolation[], start: number, end: number, rule: number, message: string) {
  for (let index = start; index <= end; index += 1) {
    violations.push({ index, rule, message });
  }
}

export function detectWesternElectricRules(values: number[]): WesternElectricViolation[] {
  const clean = values.filter(Number.isFinite);
  if (clean.length < 3) return [];

  const center = average(clean);
  const sigma = sd(clean, center);
  if (sigma === 0) return [];

  const violations: WesternElectricViolation[] = [];

  clean.forEach((value, index) => {
    if (Math.abs(value - center) > 3 * sigma) {
      violations.push({ index, rule: 1, message: "Um ponto alem do limite de controle de 3 sigma." });
    }
  });

  for (let i = 0; i <= clean.length - 3; i += 1) {
    const window = clean.slice(i, i + 3);
    if (window.filter((value) => value > center + 2 * sigma).length >= 2 || window.filter((value) => value < center - 2 * sigma).length >= 2) {
      push(violations, i, i + 2, 2, "Dois de tres pontos consecutivos alem de 2 sigma no mesmo lado.");
    }
  }

  for (let i = 0; i <= clean.length - 5; i += 1) {
    const window = clean.slice(i, i + 5);
    if (window.filter((value) => value > center + sigma).length >= 4 || window.filter((value) => value < center - sigma).length >= 4) {
      push(violations, i, i + 4, 3, "Quatro de cinco pontos consecutivos alem de 1 sigma no mesmo lado.");
    }
  }

  for (let i = 0; i <= clean.length - 8; i += 1) {
    const window = clean.slice(i, i + 8);
    if (window.every((value) => value > center) || window.every((value) => value < center)) {
      push(violations, i, i + 7, 4, "Oito pontos consecutivos no mesmo lado da media.");
    }
  }

  return violations;
}

