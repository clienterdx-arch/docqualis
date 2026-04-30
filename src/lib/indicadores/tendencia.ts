export type TendenciaSerie = "alta" | "baixa" | "estavel" | "insuficiente";

export function calcularTendencia(values: Array<number | null | undefined>): TendenciaSerie {
  const clean = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (clean.length < 3) return "insuficiente";

  const first = clean.slice(0, Math.ceil(clean.length / 2));
  const second = clean.slice(Math.floor(clean.length / 2));
  const firstAvg = first.reduce((acc, value) => acc + value, 0) / first.length;
  const secondAvg = second.reduce((acc, value) => acc + value, 0) / second.length;
  const delta = secondAvg - firstAvg;
  const tolerance = Math.max(Math.abs(firstAvg) * 0.03, 0.01);

  if (delta > tolerance) return "alta";
  if (delta < -tolerance) return "baixa";
  return "estavel";
}

