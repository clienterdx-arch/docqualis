import type { IndicadorTipoCalculo } from "@/types/indicadores";

export type CalculoIndicadorInput = {
  tipo: IndicadorTipoCalculo;
  valorManual?: number | null;
  numerador?: number | null;
  denominador?: number | null;
  valores?: Array<number | null | undefined>;
  casasDecimais?: number;
  fator?: number;
};

export type CalculoIndicadorResult = {
  valor: number | null;
  motivo?: "denominador_zero" | "denominador_ausente" | "dados_ausentes" | "tipo_invalido";
};

function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function roundHalfEven(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  const scaled = value * factor;
  const floor = Math.floor(scaled);
  const diff = scaled - floor;

  if (diff > 0.5) return (floor + 1) / factor;
  if (diff < 0.5) return floor / factor;
  return (floor % 2 === 0 ? floor : floor + 1) / factor;
}

function cleanValues(values: Array<number | null | undefined> = []): number[] {
  return values.filter(isFiniteNumber);
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) {
    return sorted[middle] ?? null;
  }

  const left = sorted[middle - 1];
  const right = sorted[middle];
  return isFiniteNumber(left) && isFiniteNumber(right) ? (left + right) / 2 : null;
}

export function calcularIndicador(input: CalculoIndicadorInput): CalculoIndicadorResult {
  const decimals = input.casasDecimais ?? 2;
  const factor = input.fator ?? 1;
  const valores = cleanValues(input.valores);
  let resultado: number | null = null;

  switch (input.tipo) {
    case "absoluto":
      resultado = isFiniteNumber(input.valorManual) ? input.valorManual : input.numerador ?? null;
      break;
    case "percentual":
      if (!isFiniteNumber(input.denominador)) return { valor: null, motivo: "denominador_ausente" };
      if (input.denominador === 0) return { valor: null, motivo: "denominador_zero" };
      resultado = ((input.numerador ?? 0) / input.denominador) * 100;
      break;
    case "taxa":
    case "razao":
      if (!isFiniteNumber(input.denominador)) return { valor: null, motivo: "denominador_ausente" };
      if (input.denominador === 0) return { valor: null, motivo: "denominador_zero" };
      resultado = ((input.numerador ?? 0) / input.denominador) * factor;
      break;
    case "media":
      if (valores.length === 0) return { valor: null, motivo: "dados_ausentes" };
      resultado = valores.reduce((acc, value) => acc + value, 0) / valores.length;
      break;
    case "mediana":
      resultado = median(valores);
      if (resultado == null) return { valor: null, motivo: "dados_ausentes" };
      break;
    case "soma":
      if (valores.length === 0) return { valor: null, motivo: "dados_ausentes" };
      resultado = valores.reduce((acc, value) => acc + value, 0);
      break;
    case "contagem":
      resultado = valores.length;
      break;
    default:
      return { valor: null, motivo: "tipo_invalido" };
  }

  return isFiniteNumber(resultado)
    ? { valor: roundHalfEven(resultado, decimals) }
    : { valor: null, motivo: "dados_ausentes" };
}

export const indicadoresCalculoInternals = {
  roundHalfEven,
  median,
};

