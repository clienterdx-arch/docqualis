-- DocQualis NEXUS Registry OS foundation.
-- Adapted to the current tenant model: empresa_id is the workspace boundary.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.registros_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  descricao text,
  codigo text,
  status text NOT NULL DEFAULT 'RASCUNHO',
  categoria text NOT NULL DEFAULT 'Qualidade',
  setor text,
  versao_major integer NOT NULL DEFAULT 1,
  versao_minor integer NOT NULL DEFAULT 0,
  versao_patch integer NOT NULL DEFAULT 0,
  campos jsonb NOT NULL DEFAULT '[]'::jsonb,
  schema_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  workflow jsonb NOT NULL DEFAULT '{}'::jsonb,
  dmn_rules jsonb NOT NULL DEFAULT '[]'::jsonb,
  conditional_logic jsonb NOT NULL DEFAULT '[]'::jsonb,
  analytics_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  pii_policy jsonb NOT NULL DEFAULT '{}'::jsonb,
  retention_policy jsonb NOT NULL DEFAULT '{}'::jsonb,
  marketplace_scope text NOT NULL DEFAULT 'privado',
  responsavel text,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);

ALTER TABLE public.registros_templates ADD COLUMN IF NOT EXISTS empresa_id uuid;
ALTER TABLE public.registros_templates ADD COLUMN IF NOT EXISTS codigo text;
ALTER TABLE public.registros_templates ADD COLUMN IF NOT EXISTS categoria text DEFAULT 'Qualidade';
ALTER TABLE public.registros_templates ADD COLUMN IF NOT EXISTS setor text;
ALTER TABLE public.registros_templates ADD COLUMN IF NOT EXISTS versao_major integer DEFAULT 1;
ALTER TABLE public.registros_templates ADD COLUMN IF NOT EXISTS versao_minor integer DEFAULT 0;
ALTER TABLE public.registros_templates ADD COLUMN IF NOT EXISTS versao_patch integer DEFAULT 0;
ALTER TABLE public.registros_templates ADD COLUMN IF NOT EXISTS schema_json jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.registros_templates ADD COLUMN IF NOT EXISTS workflow jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.registros_templates ADD COLUMN IF NOT EXISTS dmn_rules jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.registros_templates ADD COLUMN IF NOT EXISTS conditional_logic jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.registros_templates ADD COLUMN IF NOT EXISTS analytics_config jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.registros_templates ADD COLUMN IF NOT EXISTS pii_policy jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.registros_templates ADD COLUMN IF NOT EXISTS retention_policy jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.registros_templates ADD COLUMN IF NOT EXISTS marketplace_scope text DEFAULT 'privado';
ALTER TABLE public.registros_templates ADD COLUMN IF NOT EXISTS responsavel text;
ALTER TABLE public.registros_templates ADD COLUMN IF NOT EXISTS published_at timestamptz;
ALTER TABLE public.registros_templates ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.registros_templates ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.registros_templates ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.registros_templates ADD COLUMN IF NOT EXISTS updated_by uuid;
ALTER TABLE public.registros_templates ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE TABLE IF NOT EXISTS public.registros_preenchidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.registros_templates(id) ON DELETE SET NULL,
  numero text NOT NULL,
  preenchido_por text,
  data_preenchimento date DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'ENVIADO',
  dados jsonb NOT NULL DEFAULT '{}'::jsonb,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  historico jsonb NOT NULL DEFAULT '[]'::jsonb,
  assinaturas jsonb NOT NULL DEFAULT '[]'::jsonb,
  current_owner text,
  hash_sha256 text,
  hash_anterior text,
  risk_score integer NOT NULL DEFAULT 0,
  flag_revisao_humana boolean NOT NULL DEFAULT false,
  geo jsonb,
  device_fingerprint text,
  offline_sync_id text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  rejected_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);

ALTER TABLE public.registros_preenchidos ADD COLUMN IF NOT EXISTS empresa_id uuid;
ALTER TABLE public.registros_preenchidos ADD COLUMN IF NOT EXISTS template_id uuid;
ALTER TABLE public.registros_preenchidos ADD COLUMN IF NOT EXISTS numero text;
ALTER TABLE public.registros_preenchidos ADD COLUMN IF NOT EXISTS preenchido_por text;
ALTER TABLE public.registros_preenchidos ADD COLUMN IF NOT EXISTS data_preenchimento date DEFAULT CURRENT_DATE;
ALTER TABLE public.registros_preenchidos ADD COLUMN IF NOT EXISTS status text DEFAULT 'ENVIADO';
ALTER TABLE public.registros_preenchidos ADD COLUMN IF NOT EXISTS dados jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.registros_preenchidos ADD COLUMN IF NOT EXISTS snapshot jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.registros_preenchidos ADD COLUMN IF NOT EXISTS historico jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.registros_preenchidos ADD COLUMN IF NOT EXISTS assinaturas jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.registros_preenchidos ADD COLUMN IF NOT EXISTS current_owner text;
ALTER TABLE public.registros_preenchidos ADD COLUMN IF NOT EXISTS hash_sha256 text;
ALTER TABLE public.registros_preenchidos ADD COLUMN IF NOT EXISTS hash_anterior text;
ALTER TABLE public.registros_preenchidos ADD COLUMN IF NOT EXISTS risk_score integer DEFAULT 0;
ALTER TABLE public.registros_preenchidos ADD COLUMN IF NOT EXISTS flag_revisao_humana boolean DEFAULT false;
ALTER TABLE public.registros_preenchidos ADD COLUMN IF NOT EXISTS geo jsonb;
ALTER TABLE public.registros_preenchidos ADD COLUMN IF NOT EXISTS device_fingerprint text;
ALTER TABLE public.registros_preenchidos ADD COLUMN IF NOT EXISTS offline_sync_id text;
ALTER TABLE public.registros_preenchidos ADD COLUMN IF NOT EXISTS submitted_at timestamptz DEFAULT now();
ALTER TABLE public.registros_preenchidos ADD COLUMN IF NOT EXISTS approved_at timestamptz;
ALTER TABLE public.registros_preenchidos ADD COLUMN IF NOT EXISTS rejected_at timestamptz;
ALTER TABLE public.registros_preenchidos ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.registros_preenchidos ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.registros_preenchidos ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.registros_preenchidos ADD COLUMN IF NOT EXISTS updated_by uuid;
ALTER TABLE public.registros_preenchidos ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE TABLE IF NOT EXISTS public.registros_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  registro_id uuid,
  template_id uuid,
  event_type text NOT NULL,
  aggregate_version integer NOT NULL DEFAULT 1,
  before_snapshot jsonb,
  after_snapshot jsonb,
  actor_id uuid,
  actor_name text,
  ip inet,
  geo jsonb,
  device_fingerprint text,
  hash_sha256 text,
  previous_hash text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.registros_workflow_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  registro_id uuid REFERENCES public.registros_preenchidos(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.registros_templates(id) ON DELETE SET NULL,
  etapa text NOT NULL,
  tipo text NOT NULL DEFAULT 'TAREFA',
  status text NOT NULL DEFAULT 'PENDENTE',
  responsavel text,
  grupo_responsavel text,
  sla_due_at timestamptz,
  escalation_level integer NOT NULL DEFAULT 0,
  decision_rule jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.registros_comentarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  registro_id uuid NOT NULL REFERENCES public.registros_preenchidos(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.registros_comentarios(id) ON DELETE CASCADE,
  comentario text NOT NULL,
  mentions jsonb NOT NULL DEFAULT '[]'::jsonb,
  reactions jsonb NOT NULL DEFAULT '{}'::jsonb,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.registros_anexos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  registro_id uuid REFERENCES public.registros_preenchidos(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.registros_templates(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  filename text NOT NULL,
  mime_type text,
  size_bytes bigint,
  ocr_text text,
  classification text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  hash_sha256 text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.registros_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  endpoint_url text NOT NULL,
  secret_ref text,
  eventos text[] NOT NULL DEFAULT ARRAY['registro.criado'],
  ativo boolean NOT NULL DEFAULT true,
  retry_policy jsonb NOT NULL DEFAULT '{"max_attempts": 5}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_registros_templates_empresa_status ON public.registros_templates (empresa_id, status, updated_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_registros_templates_titulo_trgm ON public.registros_templates USING gin (titulo gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_registros_preenchidos_empresa_status ON public.registros_preenchidos (empresa_id, status, submitted_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_registros_preenchidos_template ON public.registros_preenchidos (empresa_id, template_id, submitted_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_registros_eventos_lookup ON public.registros_eventos (empresa_id, registro_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_registros_workflow_sla ON public.registros_workflow_tasks (empresa_id, status, sla_due_at) WHERE deleted_at IS NULL;

CREATE OR REPLACE FUNCTION public.dq_registros_event_append()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  before_row jsonb;
  after_row jsonb;
  row_empresa uuid;
  row_registro uuid;
  row_template uuid;
  previous_hash text;
  event_hash text;
BEGIN
  before_row := CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END;
  after_row := CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END;
  row_empresa := COALESCE((after_row->>'empresa_id')::uuid, (before_row->>'empresa_id')::uuid);
  row_registro := CASE WHEN TG_TABLE_NAME = 'registros_preenchidos' THEN COALESCE((after_row->>'id')::uuid, (before_row->>'id')::uuid) ELSE NULL END;
  row_template := COALESCE((after_row->>'template_id')::uuid, (before_row->>'template_id')::uuid);

  IF TG_TABLE_NAME = 'registros_templates' THEN
    row_template := COALESCE((after_row->>'id')::uuid, (before_row->>'id')::uuid);
  END IF;

  SELECT hash_sha256 INTO previous_hash
  FROM public.registros_eventos
  WHERE empresa_id = row_empresa
    AND (registro_id = row_registro OR (registro_id IS NULL AND row_registro IS NULL AND template_id = row_template))
  ORDER BY created_at DESC
  LIMIT 1;

  event_hash := encode(
    digest(
      COALESCE(row_empresa::text, '') ||
      COALESCE(row_registro::text, '') ||
      COALESCE(row_template::text, '') ||
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

  INSERT INTO public.registros_eventos (
    empresa_id,
    registro_id,
    template_id,
    event_type,
    before_snapshot,
    after_snapshot,
    actor_id,
    hash_sha256,
    previous_hash,
    metadata
  ) VALUES (
    row_empresa,
    row_registro,
    row_template,
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
    'registros_templates',
    'registros_preenchidos',
    'registros_workflow_tasks',
    'registros_comentarios',
    'registros_anexos',
    'registros_webhooks'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON public.%I', table_name, table_name);
    EXECUTE format('CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.dq_set_updated_at()', table_name, table_name);
  END LOOP;
END $$;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['registros_templates', 'registros_preenchidos', 'registros_workflow_tasks', 'registros_comentarios', 'registros_anexos'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_event ON public.%I', table_name, table_name);
    EXECUTE format('CREATE TRIGGER trg_%I_event AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.dq_registros_event_append()', table_name, table_name);
  END LOOP;
END $$;

DROP TRIGGER IF EXISTS trg_registros_eventos_append_only ON public.registros_eventos;
CREATE TRIGGER trg_registros_eventos_append_only
BEFORE UPDATE OR DELETE ON public.registros_eventos
FOR EACH ROW EXECUTE FUNCTION public.dq_prevent_append_only_mutation();

DO $$
DECLARE
  tenant_tables text[] := ARRAY[
    'registros_templates',
    'registros_preenchidos',
    'registros_eventos',
    'registros_workflow_tasks',
    'registros_comentarios',
    'registros_anexos',
    'registros_webhooks'
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

CREATE OR REPLACE VIEW public.vw_registros_registry_os
WITH (security_invoker = true)
AS
SELECT
  r.id,
  r.empresa_id,
  r.template_id,
  t.titulo AS template_titulo,
  r.numero,
  r.status,
  r.preenchido_por,
  r.submitted_at,
  r.current_owner,
  r.risk_score,
  r.flag_revisao_humana,
  r.hash_sha256,
  COUNT(e.id) AS total_eventos
FROM public.registros_preenchidos r
LEFT JOIN public.registros_templates t ON t.id = r.template_id AND t.empresa_id = r.empresa_id
LEFT JOIN public.registros_eventos e ON e.registro_id = r.id AND e.empresa_id = r.empresa_id
WHERE r.deleted_at IS NULL
GROUP BY r.id, t.titulo;

