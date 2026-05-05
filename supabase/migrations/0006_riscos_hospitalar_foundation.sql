-- DocQualis hospital risk management foundation.
-- Keeps public.riscos as the canonical risk register and adds operational
-- tables for actions, controls, reviews, timeline, attachments, matrix config
-- and the institutional risk library.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.riscos ADD COLUMN IF NOT EXISTS code text;
ALTER TABLE public.riscos ADD COLUMN IF NOT EXISTS sector_id uuid;
ALTER TABLE public.riscos ADD COLUMN IF NOT EXISTS process_id uuid;
ALTER TABLE public.riscos ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.riscos ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.riscos ADD COLUMN IF NOT EXISTS cause text;
ALTER TABLE public.riscos ADD COLUMN IF NOT EXISTS consequence text;
ALTER TABLE public.riscos ADD COLUMN IF NOT EXISTS origin text;
ALTER TABLE public.riscos ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.riscos ADD COLUMN IF NOT EXISTS impact_type text;
ALTER TABLE public.riscos ADD COLUMN IF NOT EXISTS affected_area text;
ALTER TABLE public.riscos ADD COLUMN IF NOT EXISTS decision text;
ALTER TABLE public.riscos ADD COLUMN IF NOT EXISTS decision_justification text;
ALTER TABLE public.riscos ADD COLUMN IF NOT EXISTS impact_score numeric;
ALTER TABLE public.riscos ADD COLUMN IF NOT EXISTS probability_score numeric;
ALTER TABLE public.riscos ADD COLUMN IF NOT EXISTS risk_score numeric;
ALTER TABLE public.riscos ADD COLUMN IF NOT EXISTS risk_level text;
ALTER TABLE public.riscos ADD COLUMN IF NOT EXISTS inherent_impact_score numeric;
ALTER TABLE public.riscos ADD COLUMN IF NOT EXISTS inherent_probability_score numeric;
ALTER TABLE public.riscos ADD COLUMN IF NOT EXISTS inherent_score numeric;
ALTER TABLE public.riscos ADD COLUMN IF NOT EXISTS inherent_level text;
ALTER TABLE public.riscos ADD COLUMN IF NOT EXISTS residual_impact_score numeric;
ALTER TABLE public.riscos ADD COLUMN IF NOT EXISTS residual_probability_score numeric;
ALTER TABLE public.riscos ADD COLUMN IF NOT EXISTS residual_level text;
ALTER TABLE public.riscos ADD COLUMN IF NOT EXISTS inclusion_date date;
ALTER TABLE public.riscos ADD COLUMN IF NOT EXISTS last_review_date date;
ALTER TABLE public.riscos ADD COLUMN IF NOT EXISTS next_review_date date;
ALTER TABLE public.riscos ADD COLUMN IF NOT EXISTS responsible_id uuid;
ALTER TABLE public.riscos ADD COLUMN IF NOT EXISTS observation text;

CREATE TABLE IF NOT EXISTS public.risk_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  risk_id uuid NOT NULL REFERENCES public.riscos(id) ON DELETE CASCADE,
  description text NOT NULL,
  action_type text NOT NULL DEFAULT 'Mitigacao',
  responsible_id uuid,
  responsible_name text,
  sector_id uuid REFERENCES public.setores(id) ON DELETE SET NULL,
  sector_name text,
  due_date date,
  priority text NOT NULL DEFAULT 'Media',
  status text NOT NULL DEFAULT 'Nao iniciada',
  evidence_url text,
  completed_at timestamptz,
  effectiveness_validation text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.risk_controls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  risk_id uuid NOT NULL REFERENCES public.riscos(id) ON DELETE CASCADE,
  description text NOT NULL,
  control_type text NOT NULL DEFAULT 'Administrativa',
  effectiveness text NOT NULL DEFAULT 'Moderada',
  document_id uuid,
  indicator_id uuid REFERENCES public.indicadores(id) ON DELETE SET NULL,
  evidence_url text,
  responsible_id uuid,
  responsible_name text,
  last_verified_at date,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.risk_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  risk_id uuid NOT NULL REFERENCES public.riscos(id) ON DELETE CASCADE,
  previous_score numeric,
  previous_level text,
  new_score numeric,
  new_level text,
  justification text NOT NULL,
  reviewed_by uuid,
  reviewed_by_name text,
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  approved_by uuid,
  approved_by_name text,
  approved_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.risk_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  risk_id uuid NOT NULL REFERENCES public.riscos(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  description text NOT NULL,
  user_id uuid,
  user_name text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.risk_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  risk_id uuid NOT NULL REFERENCES public.riscos(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  file_size bigint,
  uploaded_by uuid,
  uploaded_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.risk_matrix_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,
  impact_score integer NOT NULL CHECK (impact_score BETWEEN 1 AND 5),
  probability_score integer NOT NULL CHECK (probability_score BETWEEN 1 AND 5),
  score integer NOT NULL,
  level text NOT NULL,
  color text NOT NULL,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.risk_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'Operacional',
  consequence text,
  suggested_controls text,
  suggested_contingency text,
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_risk_actions_empresa_risk ON public.risk_actions (empresa_id, risk_id, status, due_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_risk_actions_due ON public.risk_actions (empresa_id, due_date, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_risk_controls_empresa_risk ON public.risk_controls (empresa_id, risk_id, effectiveness) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_risk_reviews_empresa_risk ON public.risk_reviews (empresa_id, risk_id, reviewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_risk_timeline_empresa_risk ON public.risk_timeline (empresa_id, risk_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_risk_attachments_empresa_risk ON public.risk_attachments (empresa_id, risk_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_risk_library_lookup ON public.risk_library (empresa_id, active, category, title);
CREATE INDEX IF NOT EXISTS idx_riscos_hospitalar_filters ON public.riscos (empresa_id, setor, categoria, classificacao, status, next_review_at) WHERE deleted_at IS NULL;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'risk_actions',
    'risk_controls',
    'risk_matrix_config',
    'risk_library'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON public.%I', table_name, table_name);
    EXECUTE format('CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.dq_set_updated_at()', table_name, table_name);
  END LOOP;
END $$;

DROP TRIGGER IF EXISTS trg_risk_timeline_append_only ON public.risk_timeline;
CREATE TRIGGER trg_risk_timeline_append_only
BEFORE UPDATE OR DELETE ON public.risk_timeline
FOR EACH ROW EXECUTE FUNCTION public.dq_prevent_append_only_mutation();

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'risk_actions',
    'risk_controls',
    'risk_reviews',
    'risk_timeline',
    'risk_attachments'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', table_name);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_tenant_select', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_tenant_insert', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_tenant_update', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_tenant_delete', table_name);

    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (empresa_id = public.current_empresa_id() OR public.is_super_admin())', table_name || '_tenant_select', table_name);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin())', table_name || '_tenant_insert', table_name);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE USING (empresa_id = public.current_empresa_id() OR public.is_super_admin()) WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin())', table_name || '_tenant_update', table_name);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE USING (empresa_id = public.current_empresa_id() OR public.is_super_admin())', table_name || '_tenant_delete', table_name);
  END LOOP;
END $$;

ALTER TABLE public.risk_matrix_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_matrix_config FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS risk_matrix_config_select ON public.risk_matrix_config;
DROP POLICY IF EXISTS risk_matrix_config_insert ON public.risk_matrix_config;
DROP POLICY IF EXISTS risk_matrix_config_update ON public.risk_matrix_config;
DROP POLICY IF EXISTS risk_matrix_config_delete ON public.risk_matrix_config;
CREATE POLICY risk_matrix_config_select ON public.risk_matrix_config
  FOR SELECT USING (empresa_id IS NULL OR empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY risk_matrix_config_insert ON public.risk_matrix_config
  FOR INSERT WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY risk_matrix_config_update ON public.risk_matrix_config
  FOR UPDATE USING (empresa_id = public.current_empresa_id() OR public.is_super_admin())
  WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY risk_matrix_config_delete ON public.risk_matrix_config
  FOR DELETE USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());

ALTER TABLE public.risk_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_library FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS risk_library_select ON public.risk_library;
DROP POLICY IF EXISTS risk_library_insert ON public.risk_library;
DROP POLICY IF EXISTS risk_library_update ON public.risk_library;
DROP POLICY IF EXISTS risk_library_delete ON public.risk_library;
CREATE POLICY risk_library_select ON public.risk_library
  FOR SELECT USING ((active = true AND empresa_id IS NULL) OR empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY risk_library_insert ON public.risk_library
  FOR INSERT WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY risk_library_update ON public.risk_library
  FOR UPDATE USING (empresa_id = public.current_empresa_id() OR public.is_super_admin())
  WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY risk_library_delete ON public.risk_library
  FOR DELETE USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());

INSERT INTO public.risk_matrix_config (impact_score, probability_score, score, level, color)
SELECT impact_score, probability_score, impact_score * probability_score,
       CASE
         WHEN impact_score * probability_score <= 4 THEN 'Baixo'
         WHEN impact_score * probability_score <= 9 THEN 'Moderado'
         WHEN impact_score * probability_score <= 15 THEN 'Alto'
         ELSE 'Critico'
       END,
       CASE
         WHEN impact_score * probability_score <= 4 THEN '#16a34a'
         WHEN impact_score * probability_score <= 9 THEN '#eab308'
         WHEN impact_score * probability_score <= 15 THEN '#f97316'
         ELSE '#dc2626'
       END
FROM generate_series(1, 5) AS impact_score
CROSS JOIN generate_series(1, 5) AS probability_score
WHERE NOT EXISTS (
  SELECT 1
  FROM public.risk_matrix_config
  WHERE empresa_id IS NULL
);

INSERT INTO public.risk_library (id, title, description, category, consequence, suggested_controls, suggested_contingency, active)
VALUES
  ('00000000-0000-4000-9000-000000000101', 'Queda de paciente', 'Risco de queda durante atendimento, transporte ou permanencia na unidade.', 'Assistencial', 'Dano ao paciente, aumento de permanencia, evento adverso e impacto reputacional.', 'Escala de risco de queda, pulseira de identificacao, orientacao e ronda assistencial.', 'Acionar equipe assistencial, registrar ocorrencia, avaliar dano e comunicar responsaveis.', true),
  ('00000000-0000-4000-9000-000000000102', 'Erro de medicacao', 'Falha na prescricao, dispensacao, preparo ou administracao de medicamento.', 'Assistencial', 'Evento adverso medicamentoso, dano clinico e notificacao obrigatoria.', 'Dupla checagem, identificacao segura, protocolo de medicamentos de alta vigilancia.', 'Interromper administracao, comunicar medico, monitorar paciente e abrir ocorrencia.', true),
  ('00000000-0000-4000-9000-000000000103', 'Falha na identificacao do paciente', 'Paciente sem identificacao correta ou com dados divergentes.', 'Assistencial', 'Procedimento, medicamento ou exame aplicado ao paciente incorreto.', 'Pulseira padronizada, dois identificadores e auditoria de beira leito.', 'Bloquear atendimento ate correcao, comunicar lideranca e registrar evento.', true),
  ('00000000-0000-4000-9000-000000000104', 'Falha no prontuario', 'Registro incompleto, ilegivel, divergente ou indisponivel.', 'Operacional', 'Perda de continuidade assistencial, glosa e fragilidade juridica.', 'Checklist de prontuario, auditoria interna e padrao minimo de registro.', 'Corrigir registro, acionar responsavel e anexar evidencia.', true),
  ('00000000-0000-4000-9000-000000000105', 'Infeccao relacionada a assistencia', 'Risco de IRAS por falhas de processo, ambiente ou tecnica assistencial.', 'Assistencial', 'Agravo ao paciente, aumento de permanencia e impacto regulatorio.', 'Higiene de maos, bundles assistenciais e vigilancia epidemiologica.', 'Acionar CCIH, isolar quando aplicavel, investigar causa e notificar.', true),
  ('00000000-0000-4000-9000-000000000106', 'Falha na esterilizacao', 'Material processado sem garantia de esterilidade ou rastreabilidade.', 'Assistencial', 'Infeccao, cancelamento de procedimento e evento sentinela.', 'Indicadores quimicos/biologicos, rastreabilidade por lote e manutencao preventiva.', 'Recolher material, bloquear lote, investigar carga e comunicar centro cirurgico.', true),
  ('00000000-0000-4000-9000-000000000107', 'Falha de equipamento critico', 'Indisponibilidade ou mau funcionamento de equipamento essencial.', 'Operacional', 'Interrupcao assistencial, atraso de atendimento e dano ao paciente.', 'Plano de manutencao preventiva, backup e teste operacional.', 'Acionar engenharia clinica, usar contingencia e registrar indisponibilidade.', true),
  ('00000000-0000-4000-9000-000000000108', 'Desabastecimento de insumos', 'Falta de insumos criticos para assistencia ou operacao.', 'Operacional', 'Interrupcao de processo, risco assistencial e compra emergencial.', 'Estoque minimo, ponto de reposicao e fornecedor alternativo.', 'Acionar compras, priorizar distribuicao e comunicar areas afetadas.', true),
  ('00000000-0000-4000-9000-000000000109', 'Glosa hospitalar', 'Perda financeira por falha documental, autorizacao ou divergencia de cobranca.', 'Financeiro', 'Reducao de receita, retrabalho e impacto no caixa.', 'Auditoria de contas, checklist documental e protocolo de autorizacao.', 'Revisar conta, acionar faturamento e registrar causa da glosa.', true),
  ('00000000-0000-4000-9000-000000000110', 'Perda de documentos', 'Extravio, obsolescencia indevida ou ausencia de documento controlado.', 'Operacional', 'Uso de versao incorreta, falha de rastreabilidade e nao conformidade.', 'Controle documental, copias controladas e trilha de revisao.', 'Bloquear copia, republicar documento vigente e comunicar usuarios.', true),
  ('00000000-0000-4000-9000-000000000111', 'Vazamento de dados', 'Exposicao indevida de dados pessoais, assistenciais ou corporativos.', 'Juridico', 'Incidente LGPD, dano reputacional e sancoes legais.', 'Controle de acesso, MFA, logs e treinamento de privacidade.', 'Acionar DPO, conter exposicao, preservar evidencias e avaliar notificacao.', true),
  ('00000000-0000-4000-9000-000000000112', 'Falha de comunicacao entre equipes', 'Informacao critica nao transmitida, incompleta ou recebida fora do prazo.', 'Operacional', 'Atraso assistencial, erro de conduta e evento adverso.', 'Passagem de plantao estruturada, SBAR e registros obrigatorios.', 'Escalar lideranca, registrar falha e alinhar comunicacao imediata.', true)
ON CONFLICT (id) DO NOTHING;
