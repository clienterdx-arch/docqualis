-- DocQualis indicadores foundation.
-- Tenant model adapted to the current application: empresa_id is the workspace key.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gin;

CREATE OR REPLACE FUNCTION public.dq_column_exists(target_table text, target_column text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, information_schema
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = target_table
      AND column_name = target_column
  );
$$;

CREATE OR REPLACE FUNCTION public.current_empresa_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  claims jsonb;
  claim_value text;
  authenticated_user uuid;
  resolved_empresa uuid;
  lookup_sql text;
BEGIN
  BEGIN
    claims := NULLIF(current_setting('request.jwt.claims', true), '')::jsonb;
  EXCEPTION WHEN others THEN
    claims := '{}'::jsonb;
  END;

  claim_value := COALESCE(
    claims->>'empresa_id',
    claims->'app_metadata'->>'empresa_id',
    claims->>'workspace_id',
    claims->'app_metadata'->>'workspace_id'
  );

  IF claim_value IS NOT NULL AND claim_value <> '' THEN
    RETURN claim_value::uuid;
  END IF;

  authenticated_user := auth.uid();
  IF authenticated_user IS NULL OR to_regclass('public.perfis') IS NULL THEN
    RETURN NULL;
  END IF;

  IF public.dq_column_exists('perfis', 'empresa_id') THEN
    IF public.dq_column_exists('perfis', 'user_id') THEN
      lookup_sql := 'SELECT empresa_id::uuid FROM public.perfis WHERE empresa_id IS NOT NULL AND user_id::text = $1::text ORDER BY created_at DESC NULLS LAST LIMIT 1';
      EXECUTE lookup_sql USING authenticated_user INTO resolved_empresa;
      IF resolved_empresa IS NOT NULL THEN RETURN resolved_empresa; END IF;
    END IF;

    IF public.dq_column_exists('perfis', 'auth_user_id') THEN
      lookup_sql := 'SELECT empresa_id::uuid FROM public.perfis WHERE empresa_id IS NOT NULL AND auth_user_id::text = $1::text ORDER BY created_at DESC NULLS LAST LIMIT 1';
      EXECUTE lookup_sql USING authenticated_user INTO resolved_empresa;
      IF resolved_empresa IS NOT NULL THEN RETURN resolved_empresa; END IF;
    END IF;

    IF public.dq_column_exists('perfis', 'usuario_id') THEN
      lookup_sql := 'SELECT empresa_id::uuid FROM public.perfis WHERE empresa_id IS NOT NULL AND usuario_id::text = $1::text ORDER BY created_at DESC NULLS LAST LIMIT 1';
      EXECUTE lookup_sql USING authenticated_user INTO resolved_empresa;
      IF resolved_empresa IS NOT NULL THEN RETURN resolved_empresa; END IF;
    END IF;

    IF public.dq_column_exists('perfis', 'auth_id') THEN
      lookup_sql := 'SELECT empresa_id::uuid FROM public.perfis WHERE empresa_id IS NOT NULL AND auth_id::text = $1::text ORDER BY created_at DESC NULLS LAST LIMIT 1';
      EXECUTE lookup_sql USING authenticated_user INTO resolved_empresa;
      IF resolved_empresa IS NOT NULL THEN RETURN resolved_empresa; END IF;
    END IF;

    IF public.dq_column_exists('perfis', 'id') THEN
      lookup_sql := 'SELECT empresa_id::uuid FROM public.perfis WHERE empresa_id IS NOT NULL AND id::text = $1::text ORDER BY created_at DESC NULLS LAST LIMIT 1';
      EXECUTE lookup_sql USING authenticated_user INTO resolved_empresa;
      IF resolved_empresa IS NOT NULL THEN RETURN resolved_empresa; END IF;
    END IF;
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.dq_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = COALESCE(auth.uid(), NEW.updated_by);
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cnpj text,
  timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  status text NOT NULL DEFAULT 'ATIVA',
  plano text NOT NULL DEFAULT 'padrao',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.perfis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE SET NULL,
  user_id uuid,
  auth_user_id uuid,
  usuario_id uuid,
  auth_id uuid,
  email text,
  nome text,
  cargo text,
  setor text,
  perfil_acesso text NOT NULL DEFAULT 'usuario',
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);

ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS empresa_id uuid;
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS auth_user_id uuid;
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS usuario_id uuid;
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS auth_id uuid;
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS perfil_acesso text DEFAULT 'usuario';
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS ativo boolean DEFAULT true;
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS updated_by uuid;
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE TABLE IF NOT EXISTS public.unidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  codigo text,
  status text NOT NULL DEFAULT 'ATIVA',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  UNIQUE (empresa_id, nome)
);

CREATE TABLE IF NOT EXISTS public.diretorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  unidade_id uuid REFERENCES public.unidades(id) ON DELETE SET NULL,
  nome text NOT NULL,
  codigo text,
  responsavel text,
  status text NOT NULL DEFAULT 'ATIVA',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  UNIQUE (empresa_id, nome)
);

CREATE TABLE IF NOT EXISTS public.setores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  unidade_id uuid REFERENCES public.unidades(id) ON DELETE SET NULL,
  nome text NOT NULL,
  codigo text,
  responsavel text,
  status text NOT NULL DEFAULT 'ATIVO',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  UNIQUE (empresa_id, nome)
);

CREATE TABLE IF NOT EXISTS public.setores_diretorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  setor_id uuid NOT NULL REFERENCES public.setores(id) ON DELETE CASCADE,
  diretoria_id uuid NOT NULL REFERENCES public.diretorias(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  UNIQUE (empresa_id, setor_id, diretoria_id)
);

CREATE TABLE IF NOT EXISTS public.processos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  setor_id uuid REFERENCES public.setores(id) ON DELETE SET NULL,
  nome text NOT NULL,
  codigo text,
  classificacao text NOT NULL DEFAULT 'OPERACIONAL',
  dono text,
  status text NOT NULL DEFAULT 'ATIVO',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  UNIQUE (empresa_id, nome)
);

CREATE TABLE IF NOT EXISTS public.subprocessos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  processo_id uuid NOT NULL REFERENCES public.processos(id) ON DELETE CASCADE,
  nome text NOT NULL,
  codigo text,
  responsavel text,
  status text NOT NULL DEFAULT 'ATIVO',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  UNIQUE (empresa_id, processo_id, nome)
);

CREATE TABLE IF NOT EXISTS public.indicadores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  setor_id uuid REFERENCES public.setores(id) ON DELETE SET NULL,
  processo_id uuid REFERENCES public.processos(id) ON DELETE SET NULL,
  subprocesso_id uuid REFERENCES public.subprocessos(id) ON DELETE SET NULL,
  codigo text,
  nome text NOT NULL,
  descricao text,
  setor text,
  responsavel text,
  perspectiva_bsc text,
  categoria_donabedian text NOT NULL DEFAULT 'PROCESSO',
  dimensao_qualidade text,
  tipo text DEFAULT 'absoluto',
  tipo_calculo text NOT NULL DEFAULT 'absoluto',
  unidade text,
  meta numeric,
  meta_minima numeric,
  meta_maxima numeric,
  polaridade text NOT NULL DEFAULT 'MAIOR_MELHOR',
  frequencia text NOT NULL DEFAULT 'mensal',
  status text NOT NULL DEFAULT 'sem_dados',
  formula text,
  meta_internacional_seguranca smallint CHECK (meta_internacional_seguranca BETWEEN 1 AND 6 OR meta_internacional_seguranca IS NULL),
  nucleo_seguranca_paciente boolean NOT NULL DEFAULT false,
  ona_secao smallint CHECK (ona_secao BETWEEN 1 AND 7 OR ona_secao IS NULL),
  ona_padrao text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);

ALTER TABLE public.indicadores ADD COLUMN IF NOT EXISTS empresa_id uuid;
ALTER TABLE public.indicadores ADD COLUMN IF NOT EXISTS setor_id uuid;
ALTER TABLE public.indicadores ADD COLUMN IF NOT EXISTS processo_id uuid;
ALTER TABLE public.indicadores ADD COLUMN IF NOT EXISTS subprocesso_id uuid;
ALTER TABLE public.indicadores ADD COLUMN IF NOT EXISTS codigo text;
ALTER TABLE public.indicadores ADD COLUMN IF NOT EXISTS descricao text;
ALTER TABLE public.indicadores ADD COLUMN IF NOT EXISTS categoria_donabedian text DEFAULT 'PROCESSO';
ALTER TABLE public.indicadores ADD COLUMN IF NOT EXISTS dimensao_qualidade text;
ALTER TABLE public.indicadores ADD COLUMN IF NOT EXISTS tipo_calculo text DEFAULT 'absoluto';
ALTER TABLE public.indicadores ADD COLUMN IF NOT EXISTS meta_internacional_seguranca smallint;
ALTER TABLE public.indicadores ADD COLUMN IF NOT EXISTS nucleo_seguranca_paciente boolean DEFAULT false;
ALTER TABLE public.indicadores ADD COLUMN IF NOT EXISTS ona_secao smallint;
ALTER TABLE public.indicadores ADD COLUMN IF NOT EXISTS ona_padrao text;
ALTER TABLE public.indicadores ADD COLUMN IF NOT EXISTS ativo boolean DEFAULT true;
ALTER TABLE public.indicadores ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.indicadores ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.indicadores ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.indicadores ADD COLUMN IF NOT EXISTS updated_by uuid;
ALTER TABLE public.indicadores ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE TABLE IF NOT EXISTS public.indicadores_ficha_tecnica (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  indicador_id uuid NOT NULL REFERENCES public.indicadores(id) ON DELETE CASCADE,
  versao_major integer NOT NULL DEFAULT 1,
  versao_minor integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'RASCUNHO',
  objetivo text,
  numerador_descricao text,
  denominador_descricao text,
  fonte_dados text,
  metodologia text,
  formula text,
  criterio_inclusao text,
  criterio_exclusao text,
  periodicidade_coleta text,
  periodicidade_analise text,
  responsavel_coleta text,
  responsavel_analise text,
  configuracao jsonb NOT NULL DEFAULT '{}'::jsonb,
  vigencia_inicio date,
  vigencia_fim date,
  aprovado_por uuid,
  aprovado_em timestamptz,
  publicado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  UNIQUE (empresa_id, indicador_id, versao_major, versao_minor)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_indicadores_ficha_publicada
ON public.indicadores_ficha_tecnica (empresa_id, indicador_id)
WHERE status = 'PUBLICADO' AND deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.indicadores_dados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  indicador_id uuid NOT NULL REFERENCES public.indicadores(id) ON DELETE CASCADE,
  ficha_tecnica_id uuid REFERENCES public.indicadores_ficha_tecnica(id) ON DELETE SET NULL,
  periodo date NOT NULL,
  periodo_label text,
  numerador numeric,
  denominador numeric,
  valor_manual numeric,
  resultado_calculado numeric,
  status text NOT NULL DEFAULT 'sem_dados',
  motivo_calculo text,
  origem text NOT NULL DEFAULT 'manual',
  observacao text,
  evidencias jsonb NOT NULL DEFAULT '[]'::jsonb,
  locked_at timestamptz,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  UNIQUE (empresa_id, indicador_id, periodo)
);

CREATE TABLE IF NOT EXISTS public.indicadores_analises_criticas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  indicador_id uuid NOT NULL REFERENCES public.indicadores(id) ON DELETE CASCADE,
  dado_id uuid REFERENCES public.indicadores_dados(id) ON DELETE SET NULL,
  periodo date,
  template jsonb NOT NULL DEFAULT '{}'::jsonb,
  narrativa text NOT NULL,
  causas_especiais text,
  decisao text,
  ai_generated boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'RASCUNHO',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.indicadores_planos_acao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  indicador_id uuid NOT NULL REFERENCES public.indicadores(id) ON DELETE CASCADE,
  analise_id uuid REFERENCES public.indicadores_analises_criticas(id) ON DELETE SET NULL,
  titulo text NOT NULL,
  causa_raiz text,
  what text,
  why text,
  where_text text,
  when_start date,
  when_due date,
  who text,
  how_text text,
  how_much numeric,
  status text NOT NULL DEFAULT 'ABERTO',
  evidencias jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.indicadores_graficos_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  indicador_id uuid NOT NULL REFERENCES public.indicadores(id) ON DELETE CASCADE,
  tipo_grafico text NOT NULL DEFAULT 'linha',
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  UNIQUE (empresa_id, indicador_id)
);

CREATE TABLE IF NOT EXISTS public.indicadores_faixas_limite (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  indicador_id uuid NOT NULL REFERENCES public.indicadores(id) ON DELETE CASCADE,
  nome text NOT NULL,
  valor_min numeric,
  valor_max numeric,
  cor text,
  vigencia_inicio date,
  vigencia_fim date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.indicadores_vinculos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  indicador_id uuid NOT NULL REFERENCES public.indicadores(id) ON DELETE CASCADE,
  tipo_entidade text NOT NULL,
  entidade_id uuid NOT NULL,
  titulo_snapshot text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  UNIQUE (empresa_id, indicador_id, tipo_entidade, entidade_id)
);

CREATE TABLE IF NOT EXISTS public.indicadores_anotacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  indicador_id uuid NOT NULL REFERENCES public.indicadores(id) ON DELETE CASCADE,
  dado_id uuid REFERENCES public.indicadores_dados(id) ON DELETE SET NULL,
  data_referencia date NOT NULL,
  texto text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.indicadores_aprovacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  indicador_id uuid NOT NULL REFERENCES public.indicadores(id) ON DELETE CASCADE,
  ficha_tecnica_id uuid REFERENCES public.indicadores_ficha_tecnica(id) ON DELETE CASCADE,
  etapa text NOT NULL,
  decisao text NOT NULL,
  parecer text,
  aprovado_por uuid,
  aprovado_em timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.indicadores_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  indicador_id uuid,
  entidade text NOT NULL,
  entidade_id uuid,
  operacao text NOT NULL,
  before_snapshot jsonb,
  after_snapshot jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  author_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  user_id uuid,
  recurso text NOT NULL,
  recurso_id uuid,
  acao text NOT NULL,
  ip inet,
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  indicador_id uuid REFERENCES public.indicadores(id) ON DELETE SET NULL,
  caso_uso text NOT NULL,
  prompt_version text NOT NULL,
  input_hash text NOT NULL,
  model text NOT NULL,
  tokens_input integer,
  tokens_output integer,
  latency_ms integer,
  estimated_cost numeric,
  feedback text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

-- Legacy compatibility tables used by the current client page.
CREATE TABLE IF NOT EXISTS public.indicadores_medicoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  indicador_id uuid NOT NULL,
  valor numeric,
  periodo text,
  data_medicao date,
  responsavel text,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.indicadores_analises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  indicador_id uuid NOT NULL,
  periodo text,
  valor_realizado numeric,
  meta numeric,
  narrativa text,
  plano_acao jsonb NOT NULL DEFAULT '[]'::jsonb,
  autor text,
  status text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_perfis_empresa ON public.perfis (empresa_id);
CREATE INDEX IF NOT EXISTS idx_perfis_user_id ON public.perfis (user_id);
CREATE INDEX IF NOT EXISTS idx_indicadores_empresa_status ON public.indicadores (empresa_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_indicadores_empresa_setor ON public.indicadores (empresa_id, setor_id, processo_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_indicadores_nome_trgm ON public.indicadores USING gin (nome gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_indicadores_dados_periodo ON public.indicadores_dados (empresa_id, indicador_id, periodo DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_indicadores_dados_status ON public.indicadores_dados (empresa_id, status, periodo DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_indicadores_historico_lookup ON public.indicadores_historico (empresa_id, indicador_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_access_log_lookup ON public.audit_access_log (empresa_id, recurso, created_at DESC);

CREATE OR REPLACE FUNCTION public.dq_indicadores_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  row_empresa uuid;
  row_indicador uuid;
  row_id uuid;
  before_row jsonb;
  after_row jsonb;
BEGIN
  before_row := CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END;
  after_row := CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END;
  row_empresa := COALESCE((after_row->>'empresa_id')::uuid, (before_row->>'empresa_id')::uuid);
  row_id := COALESCE((after_row->>'id')::uuid, (before_row->>'id')::uuid);
  row_indicador := COALESCE(
    (after_row->>'indicador_id')::uuid,
    (before_row->>'indicador_id')::uuid,
    CASE WHEN TG_TABLE_NAME = 'indicadores' THEN row_id ELSE NULL END
  );

  INSERT INTO public.indicadores_historico (
    empresa_id,
    indicador_id,
    entidade,
    entidade_id,
    operacao,
    before_snapshot,
    after_snapshot,
    author_id
  ) VALUES (
    row_empresa,
    row_indicador,
    TG_TABLE_NAME,
    row_id,
    TG_OP,
    before_row,
    after_row,
    auth.uid()
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.dq_prevent_append_only_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'append-only table cannot be changed';
END;
$$;

CREATE OR REPLACE VIEW public.vw_indicadores_central
WITH (security_invoker = true)
AS
SELECT
  i.id,
  i.empresa_id,
  i.codigo,
  i.nome,
  i.setor,
  i.responsavel,
  i.categoria_donabedian,
  i.dimensao_qualidade,
  i.tipo_calculo,
  i.unidade,
  i.meta,
  i.polaridade,
  i.frequencia,
  i.status,
  ultimo.periodo AS ultimo_periodo,
  ultimo.resultado_calculado AS ultimo_resultado,
  ultimo.updated_at AS ultima_atualizacao
FROM public.indicadores i
LEFT JOIN LATERAL (
  SELECT d.periodo, d.resultado_calculado, d.updated_at
  FROM public.indicadores_dados d
  WHERE d.empresa_id = i.empresa_id
    AND d.indicador_id = i.id
    AND d.deleted_at IS NULL
  ORDER BY d.periodo DESC
  LIMIT 1
) ultimo ON true
WHERE i.deleted_at IS NULL;

DO $$
DECLARE
  tenant_tables text[] := ARRAY[
    'empresas',
    'perfis',
    'unidades',
    'diretorias',
    'setores',
    'setores_diretorias',
    'processos',
    'subprocessos',
    'indicadores',
    'indicadores_ficha_tecnica',
    'indicadores_dados',
    'indicadores_analises_criticas',
    'indicadores_planos_acao',
    'indicadores_graficos_config',
    'indicadores_faixas_limite',
    'indicadores_vinculos',
    'indicadores_anotacoes',
    'indicadores_aprovacoes',
    'indicadores_historico',
    'audit_access_log',
    'ai_generations',
    'indicadores_medicoes',
    'indicadores_analises'
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

    IF table_name = 'empresas' THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (id = public.current_empresa_id())', table_name || '_tenant_select', table_name);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE USING (id = public.current_empresa_id()) WITH CHECK (id = public.current_empresa_id())', table_name || '_tenant_update', table_name);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (id = public.current_empresa_id() OR public.current_empresa_id() IS NULL)', table_name || '_tenant_insert', table_name);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE USING (id = public.current_empresa_id())', table_name || '_tenant_delete', table_name);
    ELSIF table_name = 'perfis' THEN
      EXECUTE format($policy$
        CREATE POLICY %I ON public.%I
        FOR SELECT USING (
          empresa_id = public.current_empresa_id()
          OR id::text = auth.uid()::text
          OR user_id::text = auth.uid()::text
          OR auth_user_id::text = auth.uid()::text
          OR usuario_id::text = auth.uid()::text
          OR auth_id::text = auth.uid()::text
          OR email = auth.jwt()->>'email'
        )
      $policy$, table_name || '_tenant_select', table_name);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (empresa_id = public.current_empresa_id())', table_name || '_tenant_insert', table_name);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE USING (empresa_id = public.current_empresa_id()) WITH CHECK (empresa_id = public.current_empresa_id())', table_name || '_tenant_update', table_name);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE USING (empresa_id = public.current_empresa_id())', table_name || '_tenant_delete', table_name);
    ELSE
      EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (empresa_id = public.current_empresa_id())', table_name || '_tenant_select', table_name);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (empresa_id = public.current_empresa_id())', table_name || '_tenant_insert', table_name);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE USING (empresa_id = public.current_empresa_id()) WITH CHECK (empresa_id = public.current_empresa_id())', table_name || '_tenant_update', table_name);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE USING (empresa_id = public.current_empresa_id())', table_name || '_tenant_delete', table_name);
    END IF;
  END LOOP;
END $$;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'empresas',
    'perfis',
    'unidades',
    'diretorias',
    'setores',
    'setores_diretorias',
    'processos',
    'subprocessos',
    'indicadores',
    'indicadores_ficha_tecnica',
    'indicadores_dados',
    'indicadores_analises_criticas',
    'indicadores_planos_acao',
    'indicadores_graficos_config',
    'indicadores_faixas_limite',
    'indicadores_vinculos',
    'indicadores_anotacoes',
    'indicadores_aprovacoes',
    'indicadores_medicoes',
    'indicadores_analises'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON public.%I', table_name, table_name);
    EXECUTE format('CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.dq_set_updated_at()', table_name, table_name);
  END LOOP;
END $$;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'indicadores',
    'indicadores_ficha_tecnica',
    'indicadores_dados',
    'indicadores_analises_criticas',
    'indicadores_planos_acao',
    'indicadores_graficos_config',
    'indicadores_faixas_limite',
    'indicadores_vinculos',
    'indicadores_anotacoes',
    'indicadores_aprovacoes'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_audit ON public.%I', table_name, table_name);
    EXECUTE format('CREATE TRIGGER trg_%I_audit AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.dq_indicadores_audit()', table_name, table_name);
  END LOOP;
END $$;

DROP TRIGGER IF EXISTS trg_indicadores_historico_append_only ON public.indicadores_historico;
CREATE TRIGGER trg_indicadores_historico_append_only
BEFORE UPDATE OR DELETE ON public.indicadores_historico
FOR EACH ROW EXECUTE FUNCTION public.dq_prevent_append_only_mutation();
