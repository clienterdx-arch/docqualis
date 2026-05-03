-- DocQualis Cadastros Foundation
-- Master data: diretorias, setores, categorias_documento, permissoes_usuario_modulo

-- ── DIRETORIAS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.diretorias (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id   uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  codigo       text NOT NULL,
  nome         text NOT NULL,
  descricao    text,
  responsavel  text,
  status       text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, codigo)
);

-- ── SETORES ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.setores (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id   uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  diretoria_id uuid REFERENCES public.diretorias(id) ON DELETE SET NULL,
  codigo       text NOT NULL,
  nome         text NOT NULL,
  descricao    text,
  responsavel  text,
  status       text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, codigo)
);

-- ── CATEGORIAS DE DOCUMENTO ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.categorias_documento (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome       text NOT NULL,
  sigla      text NOT NULL,
  descricao  text,
  cor        text NOT NULL DEFAULT '#2655e8',
  status     text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, sigla)
);

-- ── PERMISSÕES POR MÓDULO (por usuário) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.permissoes_usuario_modulo (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  perfil_id  uuid NOT NULL REFERENCES public.perfis(id) ON DELETE CASCADE,
  modulo     text NOT NULL,
  nivel      text NOT NULL DEFAULT 'sem_acesso'
             CHECK (nivel IN ('sem_acesso', 'visualizar', 'editar', 'aprovar', 'administrar')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (perfil_id, modulo)
);

-- ── ADICIONAR COLUNAS AO PERFIS ───────────────────────────────────────────────
DO $$
BEGIN
  IF NOT public.dq_column_exists('perfis', 'setor_id') THEN
    ALTER TABLE public.perfis ADD COLUMN setor_id uuid REFERENCES public.setores(id) ON DELETE SET NULL;
  END IF;
  IF NOT public.dq_column_exists('perfis', 'diretoria_id') THEN
    ALTER TABLE public.perfis ADD COLUMN diretoria_id uuid REFERENCES public.diretorias(id) ON DELETE SET NULL;
  END IF;
END$$;

-- ── ROW LEVEL SECURITY ───────────────────────────────────────────────────────
ALTER TABLE public.diretorias              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.setores                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias_documento    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissoes_usuario_modulo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_diretorias" ON public.diretorias
  USING (empresa_id = public.current_empresa_id());

CREATE POLICY "tenant_setores" ON public.setores
  USING (empresa_id = public.current_empresa_id());

CREATE POLICY "tenant_categorias_documento" ON public.categorias_documento
  USING (empresa_id = public.current_empresa_id());

CREATE POLICY "tenant_permissoes_modulo" ON public.permissoes_usuario_modulo
  USING (empresa_id = public.current_empresa_id());

-- ── TRIGGER updated_at ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_diretorias_updated_at
  BEFORE UPDATE ON public.diretorias
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_setores_updated_at
  BEFORE UPDATE ON public.setores
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_categorias_documento_updated_at
  BEFORE UPDATE ON public.categorias_documento
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_permissoes_modulo_updated_at
  BEFORE UPDATE ON public.permissoes_usuario_modulo
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── ÍNDICES ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_diretorias_empresa        ON public.diretorias(empresa_id);
CREATE INDEX IF NOT EXISTS idx_setores_empresa           ON public.setores(empresa_id);
CREATE INDEX IF NOT EXISTS idx_setores_diretoria         ON public.setores(diretoria_id);
CREATE INDEX IF NOT EXISTS idx_categorias_doc_empresa    ON public.categorias_documento(empresa_id);
CREATE INDEX IF NOT EXISTS idx_permissoes_modulo_perfil  ON public.permissoes_usuario_modulo(perfil_id);
