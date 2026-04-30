export type ImrPoint = {
  index: number;
  value: number;
  movingRange: number | null;
};

export type ImrResult = {
  points: ImrPoint[];
  mean: number;
  movingRangeMean: number;
  ucl: number | null;
  lcl: number | null;
  hasEnoughPoints: boolean;
};

function average(values: number[]): number {
  return values.reduce((acc, value) => acc + value, 0) / values.length;
}

export function calculateImr(values: number[]): ImrResult {
  const clean = values.filter(Number.isFinite);
  const points: ImrPoint[] = clean.map((value, index) => ({
    index,
    value,
    movingRange: index === 0 ? null : Math.abs(value - clean[index - 1]!),
  }));

  const mean = clean.length ? average(clean) : 0;
  const movingRanges = points.map((point) => point.movingRange).filter((value): value is number => value != null);
  const movingRangeMean = movingRanges.length ? average(movingRanges) : 0;
  const hasEnoughPoints = clean.length >= 12;

  return {
    points,
    mean,
    movingRangeMean,
    ucl: hasEnoughPoints ? mean + 2.66 * movingRangeMean : null,
    lcl: hasEnoughPoints ? mean - 2.66 * movingRangeMean : null,
    hasEnoughPoints,
  };
}

