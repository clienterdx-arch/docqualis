import type { IndicadorPolaridade, IndicadorStatus } from "@/types/indicadores";

export type ClassificarStatusInput = {
  valor: number | null | undefined;
  meta: number | null | undefined;
  metaMinima?: number | null;
  metaMaxima?: number | null;
  polaridade: IndicadorPolaridade;
  alertaPercentual?: number;
  diasSemDados?: number | null;
  limiteDesatualizadoDias?: number;
};

export function classificarStatusIndicador(input: ClassificarStatusInput): IndicadorStatus {
  if (input.valor == null || Number.isNaN(input.valor)) return "sem_dados";

  const staleLimit = input.limiteDesatualizadoDias ?? 30;
  if (input.diasSemDados != null && input.diasSemDados > staleLimit) return "desatualizado";

  const alerta = input.alertaPercentual ?? 0.9;
  const meta = input.meta;
  const min = input.metaMinima;
  const max = input.metaMaxima;
  const valor = input.valor;

  if (input.polaridade === "ALVO") {
    if (min != null && max != null && valor >= min && valor <= max) return "dentro_meta";
    if (meta == null || meta === 0) return "alerta";
    return Math.abs(valor - meta) <= Math.abs(meta) * (1 - alerta) ? "alerta" : "critico";
  }

  if (meta == null) return "sem_dados";

  if (input.polaridade === "MAIOR_MELHOR") {
    if (valor >= meta) return "dentro_meta";
    if (meta === 0) return valor >= 0 ? "dentro_meta" : "critico";
    return valor >= meta * alerta ? "alerta" : "critico";
  }

  if (valor <= meta) return "dentro_meta";
  if (meta === 0) return valor <= 0 ? "dentro_meta" : "critico";
  return valor <= meta / alerta ? "alerta" : "critico";
}

export function statusLabel(status: IndicadorStatus): string {
  const labels: Record<IndicadorStatus, string> = {
    dentro_meta: "Dentro da meta",
    alerta: "Em alerta",
    critico: "Critico",
    sem_dados: "Sem dados",
    desatualizado: "Desatualizado",
  };

  return labels[status];
}

