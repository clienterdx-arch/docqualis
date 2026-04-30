export type FrequenciaIndicador = "diaria" | "semanal" | "mensal" | "trimestral" | "semestral" | "anual";

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function periodoLabel(date: Date, frequencia: FrequenciaIndicador): string {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;

  if (frequencia === "diaria") return `${pad(date.getUTCDate())}/${pad(month)}/${year}`;
  if (frequencia === "semanal") return `Semana ${getIsoWeek(date)}/${year}`;
  if (frequencia === "trimestral") return `T${Math.ceil(month / 3)}/${year}`;
  if (frequencia === "semestral") return `S${month <= 6 ? 1 : 2}/${year}`;
  if (frequencia === "anual") return `${year}`;
  return `${pad(month)}/${year}`;
}

export function normalizarPeriodo(date: Date, frequencia: FrequenciaIndicador): string {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();

  if (frequencia === "diaria") return `${year}-${pad(month + 1)}-${pad(day)}`;
  if (frequencia === "semanal") return startOfUtcWeek(date).toISOString().slice(0, 10);
  if (frequencia === "trimestral") return new Date(Date.UTC(year, Math.floor(month / 3) * 3, 1)).toISOString().slice(0, 10);
  if (frequencia === "semestral") return new Date(Date.UTC(year, month < 6 ? 0 : 6, 1)).toISOString().slice(0, 10);
  if (frequencia === "anual") return new Date(Date.UTC(year, 0, 1)).toISOString().slice(0, 10);
  return new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
}

function startOfUtcWeek(date: Date): Date {
  const copy = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = copy.getUTCDay() || 7;
  copy.setUTCDate(copy.getUTCDate() - day + 1);
  return copy;
}

function getIsoWeek(date: Date): number {
  const copy = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = copy.getUTCDay() || 7;
  copy.setUTCDate(copy.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(copy.getUTCFullYear(), 0, 1));
  return Math.ceil((((copy.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

