export type IndicadorCategoriaDonabedian =
  | "ESTRUTURA"
  | "PROCESSO"
  | "RESULTADO"
  | "ESTRATEGICO";

export type IndicadorDimensaoQualidade =
  | "SEGURANCA"
  | "EFETIVIDADE"
  | "CENTRALIDADE_PACIENTE"
  | "OPORTUNIDADE"
  | "EFICIENCIA"
  | "EQUIDADE";

export type IndicadorTipoCalculo =
  | "absoluto"
  | "percentual"
  | "taxa"
  | "razao"
  | "media"
  | "mediana"
  | "soma"
  | "contagem";

export type IndicadorPolaridade = "MAIOR_MELHOR" | "MENOR_MELHOR" | "ALVO";

export type IndicadorStatus =
  | "dentro_meta"
  | "alerta"
  | "critico"
  | "sem_dados"
  | "desatualizado";

export type FichaTecnicaStatus =
  | "RASCUNHO"
  | "REVISAO"
  | "APROVADO"
  | "PUBLICADO"
  | "OBSOLETO";

export type PlanoAcaoStatus =
  | "ABERTO"
  | "EM_ANDAMENTO"
  | "CONCLUIDO"
  | "ATRASADO"
  | "CANCELADO";

export type MetaInternacionalSeguranca = 1 | 2 | 3 | 4 | 5 | 6;

export interface IndicadorResumo {
  id: string;
  empresa_id: string;
  codigo: string | null;
  nome: string;
  setor: string | null;
  responsavel: string | null;
  categoria_donabedian: IndicadorCategoriaDonabedian;
  dimensao_qualidade: IndicadorDimensaoQualidade | null;
  tipo_calculo: IndicadorTipoCalculo;
  unidade: string | null;
  meta: number | null;
  polaridade: IndicadorPolaridade;
  frequencia: string;
  status: IndicadorStatus;
  ultimo_periodo?: string | null;
  ultimo_resultado?: number | null;
  ultima_atualizacao?: string | null;
}

export interface IndicadorFichaTecnica {
  id: string;
  empresa_id: string;
  indicador_id: string;
  versao_major: number;
  versao_minor: number;
  status: FichaTecnicaStatus;
  objetivo: string | null;
  numerador_descricao: string | null;
  denominador_descricao: string | null;
  fonte_dados: string | null;
  metodologia: string | null;
  formula: string | null;
  periodicidade_coleta: string | null;
  periodicidade_analise: string | null;
  responsavel_coleta: string | null;
  responsavel_analise: string | null;
  configuracao: Record<string, unknown>;
  vigencia_inicio: string | null;
  vigencia_fim: string | null;
}

export interface IndicadorDado {
  id: string;
  empresa_id: string;
  indicador_id: string;
  ficha_tecnica_id: string | null;
  periodo: string;
  periodo_label: string | null;
  numerador: number | null;
  denominador: number | null;
  valor_manual: number | null;
  resultado_calculado: number | null;
  status: IndicadorStatus;
  motivo_calculo: string | null;
  origem: "manual" | "importacao" | "importacao_historica" | "integracao";
  observacao: string | null;
  version: number;
}

export interface SerieIndicadorPonto {
  periodo: string;
  valor: number | null;
  numerador?: number | null;
  denominador?: number | null;
  meta?: number | null;
}

