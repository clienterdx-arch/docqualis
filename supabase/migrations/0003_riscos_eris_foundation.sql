-- DocQualis ERIS Risk OS foundation.
-- Tenant model: empresa_id is the isolation boundary.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.riscos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,
  codigo text,
  titulo text NOT NULL,
  descricao text,
  causa text,
  consequencia text,
  categoria text NOT NULL DEFAULT 'Operacional',
  processo_vinculado text,
  setor text,
  responsavel text,
  origem text,
  probabilidade numeric NOT NULL DEFAULT 1,
  impacto numeric NOT NULL DEFAULT 1,
  velocidade numeric NOT NULL DEFAULT 1,
  nivel_risco numeric,
  classificacao text NOT NULL DEFAULT 'BAIXO',
  status text NOT NULL DEFAULT 'IDENTIFICADO',
  estrategia text NOT NULL DEFAULT 'Mitigar',
  plano_tratamento text,
  controles_existentes text,
  praticas_controle text,
  barreiras_preventivas text,
  barreiras_detectivas text,
  barreiras_corretivas text,
  risco_residual_probabilidade numeric DEFAULT 1,
  risco_residual_impacto numeric DEFAULT 1,
  risco_residual_velocidade numeric DEFAULT 1,
  residual_score numeric,
  apetite_status text DEFAULT 'DENTRO',
  distribuicao text DEFAULT 'PERT',
  perda_minima numeric,
  perda_mais_provavel numeric,
  perda_maxima numeric,
  var_p95 numeric,
  cvar_p95 numeric,
  confidence_level numeric DEFAULT 0.95,
  bowtie jsonb NOT NULL DEFAULT '{}'::jsonb,
  rca jsonb NOT NULL DEFAULT '{}'::jsonb,
  opportunity jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_summary text,
  monitoramento text,
  kpi_relacionado text,
  prazo_tratamento date,
  data_avaliacao date DEFAULT CURRENT_DATE,
  data_revisao date,
  next_review_at date,
  accepted_by uuid,
  accepted_at timestamptz,
  acceptance_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);

ALTER TABLE public.riscos ADD COLUMN IF NOT EXISTS empresa_id uuid;
ALTER TABLE public.riscos ADD COLUMN IF NOT EXISTS velocidade numeric DEFAULT 1;
ALTER TABLE public.riscos ADD COLUMN IF NOT EXISTS risco_residual_velocidade numeric DEFAULT 1;
ALTER TABLE public.riscos ADD COLUMN IF NOT EXISTS residual_score numeric;
ALTER TABLE public.riscos ADD COLUMN IF NOT EXISTS apetite_status text DEFAULT 'DENTRO';
ALTER TABLE public.riscos ADD COLUMN IF NOT EXISTS distribuicao text DEFAULT 'PERT';
ALTER TABLE public.riscos ADD COLUMN IF NOT EXISTS perda_minima numeric;
ALTER TABLE public.riscos ADD COLUMN IF NOT EXISTS perda_mais_provavel numeric;
ALTER TABLE public.riscos ADD COLUMN IF NOT EXISTS perda_maxima numeric;
ALTER TABLE public.riscos ADD COLUMN IF NOT EXISTS var_p95 numeric;
ALTER TABLE public.riscos ADD COLUMN IF NOT EXISTS cvar_p95 numeric;
ALTER TABLE public.riscos ADD COLUMN IF NOT EXISTS confidence_level numeric DEFAULT 0.95;
ALTER TABLE public.riscos ADD COLUMN IF NOT EXISTS bowtie jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.riscos ADD COLUMN IF NOT EXISTS rca jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.riscos ADD COLUMN IF NOT EXISTS opportunity jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.riscos ADD COLUMN IF NOT EXISTS ai_summary text;
ALTER TABLE public.riscos ADD COLUMN IF NOT EXISTS next_review_at date;
ALTER TABLE public.riscos ADD COLUMN IF NOT EXISTS accepted_by uuid;
ALTER TABLE public.riscos ADD COLUMN IF NOT EXISTS accepted_at timestamptz;
ALTER TABLE public.riscos ADD COLUMN IF NOT EXISTS acceptance_reason text;
ALTER TABLE public.riscos ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.riscos ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.riscos ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.riscos ADD COLUMN IF NOT EXISTS updated_by uuid;
ALTER TABLE public.riscos ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE TABLE IF NOT EXISTS public.riscos_nos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  risco_id uuid REFERENCES public.riscos(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  titulo text NOT NULL,
  descricao text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  embedding jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.riscos_arestas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES public.riscos_nos(id) ON DELETE CASCADE,
  target_id uuid NOT NULL REFERENCES public.riscos_nos(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  peso numeric NOT NULL DEFAULT 1,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.riscos_controles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  risco_id uuid REFERENCES public.riscos(id) ON DELETE CASCADE,
  codigo text,
  titulo text NOT NULL,
  tipo text NOT NULL DEFAULT 'Preventivo',
  natureza text NOT NULL DEFAULT 'Manual',
  framework text DEFAULT 'COSO',
  frequencia text DEFAULT 'Mensal',
  design_effectiveness integer DEFAULT 3,
  operating_effectiveness integer DEFAULT 3,
  ultima_testagem date,
  proxima_testagem date,
  evidencias jsonb NOT NULL DEFAULT '[]'::jsonb,
  deficiencias jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'ATIVO',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.riscos_kri (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  risco_id uuid REFERENCES public.riscos(id) ON DELETE CASCADE,
  nome text NOT NULL,
  fonte text NOT NULL DEFAULT 'Manual',
  unidade text,
  valor_atual numeric,
  limite_verde numeric,
  limite_amarelo numeric,
  limite_vermelho numeric,
  direcao text NOT NULL DEFAULT 'MAIOR_PIOR',
  status text NOT NULL DEFAULT 'SEM_DADOS',
  forecast_30d numeric,
  anomaly_score numeric,
  ultima_leitura timestamptz,
  serie jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.riscos_cenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text,
  tipo text NOT NULL DEFAULT 'WHAT_IF',
  variaveis jsonb NOT NULL DEFAULT '{}'::jsonb,
  resultado jsonb NOT NULL DEFAULT '{}'::jsonb,
  var_p95 numeric,
  cvar_p95 numeric,
  status text NOT NULL DEFAULT 'RASCUNHO',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.riscos_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  risco_id uuid,
  event_type text NOT NULL,
  before_snapshot jsonb,
  after_snapshot jsonb,
  actor_id uuid,
  actor_name text,
  ip inet,
  device_fingerprint text,
  hash_sha256 text NOT NULL,
  previous_hash text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.riscos_apetite (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  categoria text NOT NULL,
  limite_residual numeric NOT NULL DEFAULT 10,
  hard_limit numeric NOT NULL DEFAULT 16,
  statement text,
  versao integer NOT NULL DEFAULT 1,
  aprovado_por uuid,
  aprovado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  UNIQUE (empresa_id, categoria, versao)
);

CREATE INDEX IF NOT EXISTS idx_riscos_empresa_status ON public.riscos (empresa_id, status, updated_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_riscos_empresa_score ON public.riscos (empresa_id, classificacao, nivel_risco DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_riscos_titulo_trgm ON public.riscos USING gin (titulo gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_riscos_nos_tipo ON public.riscos_nos (empresa_id, tipo) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_riscos_arestas_source ON public.riscos_arestas (empresa_id, source_id, tipo) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_riscos_controles_risco ON public.riscos_controles (empresa_id, risco_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_riscos_kri_status ON public.riscos_kri (empresa_id, status, ultima_leitura DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_riscos_eventos_lookup ON public.riscos_eventos (empresa_id, risco_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.dq_riscos_event_append()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  before_row jsonb;
  after_row jsonb;
  row_empresa uuid;
  row_risco uuid;
  previous_hash text;
  event_hash text;
BEGIN
  before_row := CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END;
  after_row := CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END;
  row_empresa := COALESCE((after_row->>'empresa_id')::uuid, (before_row->>'empresa_id')::uuid);
  row_risco := COALESCE((after_row->>'risco_id')::uuid, (before_row->>'risco_id')::uuid);

  IF TG_TABLE_NAME = 'riscos' THEN
    row_risco := COALESCE((after_row->>'id')::uuid, (before_row->>'id')::uuid);
  END IF;

  SELECT hash_sha256 INTO previous_hash
  FROM public.riscos_eventos
  WHERE empresa_id = row_empresa
    AND risco_id = row_risco
  ORDER BY created_at DESC
  LIMIT 1;

  event_hash := encode(
    digest(
      COALESCE(row_empresa::text, '') ||
      COALESCE(row_risco::text, '') ||
      TG_TABLE_NAME ||
      TG_OP ||
      COALESCE(before_row::text, '') ||
      COALESCE(after_row::text, '') ||
      COALESCE(previous_hash, '') ||
      now()::text,
      'sha256'
    ),
    'hex'
  );

  INSERT INTO public.riscos_eventos (
    empresa_id,
    risco_id,
    event_type,
    before_snapshot,
    after_snapshot,
    actor_id,
    hash_sha256,
    previous_hash,
    metadata
  ) VALUES (
    row_empresa,
    row_risco,
    TG_TABLE_NAME || '.' || lower(TG_OP),
    before_row,
    after_row,
    auth.uid(),
    event_hash,
    previous_hash,
    jsonb_build_object('source_table', TG_TABLE_NAME)
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'riscos',
    'riscos_nos',
    'riscos_arestas',
    'riscos_controles',
    'riscos_kri',
    'riscos_cenarios',
    'riscos_apetite'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON public.%I', table_name, table_name);
    EXECUTE format('CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.dq_set_updated_at()', table_name, table_name);
  END LOOP;
END $$;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['riscos', 'riscos_nos', 'riscos_arestas', 'riscos_controles', 'riscos_kri', 'riscos_cenarios'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_event ON public.%I', table_name, table_name);
    EXECUTE format('CREATE TRIGGER trg_%I_event AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.dq_riscos_event_append()', table_name, table_name);
  END LOOP;
END $$;

DROP TRIGGER IF EXISTS trg_riscos_eventos_append_only ON public.riscos_eventos;
CREATE TRIGGER trg_riscos_eventos_append_only
BEFORE UPDATE OR DELETE ON public.riscos_eventos
FOR EACH ROW EXECUTE FUNCTION public.dq_prevent_append_only_mutation();

DO $$
DECLARE
  tenant_tables text[] := ARRAY[
    'riscos',
    'riscos_nos',
    'riscos_arestas',
    'riscos_controles',
    'riscos_kri',
    'riscos_cenarios',
    'riscos_eventos',
    'riscos_apetite'
  ];
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY tenant_tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', table_name);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_tenant_select', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_tenant_insert', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_tenant_update', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_tenant_delete', table_name);

    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (empresa_id = public.current_empresa_id())', table_name || '_tenant_select', table_name);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (empresa_id = public.current_empresa_id())', table_name || '_tenant_insert', table_name);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE USING (empresa_id = public.current_empresa_id()) WITH CHECK (empresa_id = public.current_empresa_id())', table_name || '_tenant_update', table_name);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE USING (empresa_id = public.current_empresa_id())', table_name || '_tenant_delete', table_name);
  END LOOP;
END $$;

CREATE OR REPLACE VIEW public.vw_riscos_eris
WITH (security_invoker = true)
AS
SELECT
  r.id,
  r.empresa_id,
  r.codigo,
  r.titulo,
  r.categoria,
  r.setor,
  r.responsavel,
  r.status,
  r.classificacao,
  r.nivel_risco,
  r.residual_score,
  r.apetite_status,
  r.var_p95,
  r.cvar_p95,
  COUNT(DISTINCT c.id) AS total_controles,
  COUNT(DISTINCT k.id) AS total_kri,
  COUNT(DISTINCT e.id) AS total_eventos
FROM public.riscos r
LEFT JOIN public.riscos_controles c ON c.risco_id = r.id AND c.empresa_id = r.empresa_id AND c.deleted_at IS NULL
LEFT JOIN public.riscos_kri k ON k.risco_id = r.id AND k.empresa_id = r.empresa_id AND k.deleted_at IS NULL
LEFT JOIN public.riscos_eventos e ON e.risco_id = r.id AND e.empresa_id = r.empresa_id
WHERE r.deleted_at IS NULL
GROUP BY r.id;
