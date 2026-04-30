export type NelsonViolation = {
  index: number;
  rule: number;
  message: string;
};

function mean(values: number[]): number {
  return values.reduce((acc, value) => acc + value, 0) / values.length;
}

function standardDeviation(values: number[], avg: number): number {
  if (values.length < 2) return 0;
  const variance = values.reduce((acc, value) => acc + (value - avg) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function sameSide(value: number, center: number): "above" | "below" | "center" {
  if (value > center) return "above";
  if (value < center) return "below";
  return "center";
}

function pushRange(violations: NelsonViolation[], start: number, end: number, rule: number, message: string) {
  for (let index = start; index <= end; index += 1) {
    violations.push({ index, rule, message });
  }
}

export function detectNelsonRules(values: number[]): NelsonViolation[] {
  const clean = values.filter(Number.isFinite);
  if (clean.length < 3) return [];

  const avg = mean(clean);
  const sd = standardDeviation(clean, avg);
  if (sd === 0) return [];

  const violations: NelsonViolation[] = [];

  clean.forEach((value, index) => {
    if (Math.abs(value - avg) > 3 * sd) {
      violations.push({ index, rule: 1, message: "Um ponto alem de 3 sigma." });
    }
  });

  for (let i = 0; i <= clean.length - 9; i += 1) {
    const window = clean.slice(i, i + 9).map((value) => sameSide(value, avg));
    if (window.every((side) => side === "above") || window.every((side) => side === "below")) {
      pushRange(violations, i, i + 8, 2, "Nove pontos consecutivos no mesmo lado da media.");
    }
  }

  for (let i = 0; i <= clean.length - 6; i += 1) {
    const window = clean.slice(i, i + 6);
    const increasing = window.every((value, index) => index === 0 || value > window[index - 1]!);
    const decreasing = window.every((value, index) => index === 0 || value < window[index - 1]!);
    if (increasing || decreasing) {
      pushRange(violations, i, i + 5, 3, "Seis pontos consecutivos subindo ou descendo.");
    }
  }

  for (let i = 0; i <= clean.length - 14; i += 1) {
    const window = clean.slice(i, i + 14);
    const alternating = window.every((value, index) => {
      if (index < 2) return true;
      const previous = window[index - 1]!;
      const beforePrevious = window[index - 2]!;
      return (value > previous && previous < beforePrevious) || (value < previous && previous > beforePrevious);
    });
    if (alternating) {
      pushRange(violations, i, i + 13, 4, "Quatorze pontos alternando para cima e para baixo.");
    }
  }

  for (let i = 0; i <= clean.length - 3; i += 1) {
    const window = clean.slice(i, i + 3);
    const above = window.filter((value) => value > avg + 2 * sd).length;
    const below = window.filter((value) => value < avg - 2 * sd).length;
    if (above >= 2 || below >= 2) {
      pushRange(violations, i, i + 2, 5, "Dois de tres pontos alem de 2 sigma no mesmo lado.");
    }
  }

  for (let i = 0; i <= clean.length - 5; i += 1) {
    const window = clean.slice(i, i + 5);
    const above = window.filter((value) => value > avg + sd).length;
    const below = window.filter((value) => value < avg - sd).length;
    if (above >= 4 || below >= 4) {
      pushRange(violations, i, i + 4, 6, "Quatro de cinco pontos alem de 1 sigma no mesmo lado.");
    }
  }

  for (let i = 0; i <= clean.length - 15; i += 1) {
    const window = clean.slice(i, i + 15);
    if (window.every((value) => Math.abs(value - avg) < sd)) {
      pushRange(violations, i, i + 14, 7, "Quinze pontos consecutivos dentro de 1 sigma.");
    }
  }

  for (let i = 0; i <= clean.length - 8; i += 1) {
    const window = clean.slice(i, i + 8);
    const outside = window.every((value) => Math.abs(value - avg) > sd);
    const hasBothSides = window.some((value) => value > avg) && window.some((value) => value < avg);
    if (outside && hasBothSides) {
      pushRange(violations, i, i + 7, 8, "Oito pontos fora de 1 sigma com ambos os lados da media.");
    }
  }

  return violations;
}

