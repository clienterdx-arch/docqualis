export type PChartInputPoint = {
  numerator: number;
  denominator: number;
};

export type PChartPoint = PChartInputPoint & {
  index: number;
  proportion: number | null;
  ucl: number | null;
  lcl: number | null;
};

export type PChartResult = {
  points: PChartPoint[];
  meanProportion: number;
  hasEnoughPoints: boolean;
};

export function calculatePChart(input: PChartInputPoint[]): PChartResult {
  const valid = input.filter((point) => Number.isFinite(point.numerator) && Number.isFinite(point.denominator) && point.denominator > 0);
  const totalNumerator = valid.reduce((acc, point) => acc + point.numerator, 0);
  const totalDenominator = valid.reduce((acc, point) => acc + point.denominator, 0);
  const meanProportion = totalDenominator > 0 ? totalNumerator / totalDenominator : 0;
  const hasEnoughPoints = valid.length >= 12;

  const points = input.map((point, index) => {
    const proportion = point.denominator > 0 ? point.numerator / point.denominator : null;
    const sigma = point.denominator > 0
      ? Math.sqrt((meanProportion * (1 - meanProportion)) / point.denominator)
      : null;

    return {
      ...point,
      index,
      proportion,
      ucl: hasEnoughPoints && sigma != null ? Math.min(1, meanProportion + 3 * sigma) : null,
      lcl: hasEnoughPoints && sigma != null ? Math.max(0, meanProportion - 3 * sigma) : null,
    };
  });

  return { points, meanProportion, hasEnoughPoints };
}

