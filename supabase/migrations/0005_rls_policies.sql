-- =============================================================================
-- MIGRATION 0005: Row Level Security Policies
-- Projeto: DocQualis
-- Descrição: Isolamento de dados por empresa (multi-tenant) via RLS
-- =============================================================================

-- =============================================================================
-- SECAO 1: ESTRUTURA DE SUPORTE (super_admins, colunas extras em empresas)
-- =============================================================================

-- Tabela de super administradores DocQualis (bypass de RLS)
CREATE TABLE IF NOT EXISTS public.super_admins (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    criado_em  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.super_admins IS
    'Usuários com acesso irrestrito à plataforma (equipe DocQualis). '
    'Entries aqui concedem bypass de RLS em todas as tabelas.';

-- Colunas opcionais na tabela empresas (idempotente via IF NOT EXISTS)
ALTER TABLE public.empresas
    ADD COLUMN IF NOT EXISTS status        text        NOT NULL DEFAULT 'ativo',
    ADD COLUMN IF NOT EXISTS plano         text        NOT NULL DEFAULT 'trial',
    ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;

-- =============================================================================
-- SECAO 2: HELPER FUNCTIONS
-- =============================================================================

-- Verifica se o usuário autenticado atual é um super admin DocQualis
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.super_admins
        WHERE user_id = auth.uid()
    );
$$;

COMMENT ON FUNCTION public.is_super_admin() IS
    'Retorna true se auth.uid() consta na tabela super_admins. '
    'Usada nas políticas RLS para conceder bypass ao time DocQualis.';

-- =============================================================================
-- SECAO 3: RLS — TABELA empresas
-- =============================================================================

ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "empresas_select" ON public.empresas;
DROP POLICY IF EXISTS "empresas_insert" ON public.empresas;
DROP POLICY IF EXISTS "empresas_update" ON public.empresas;
DROP POLICY IF EXISTS "empresas_delete" ON public.empresas;

-- Usuário comum vê apenas a empresa à qual pertence; super_admin vê todas
CREATE POLICY "empresas_select" ON public.empresas
    FOR SELECT
    USING (
        id = public.current_empresa_id()
        OR public.is_super_admin()
    );

-- Apenas super_admin pode inserir novas empresas diretamente via SQL
CREATE POLICY "empresas_insert" ON public.empresas
    FOR INSERT
    WITH CHECK (public.is_super_admin());

-- Empresa pode editar seus próprios dados; super_admin pode editar qualquer uma
CREATE POLICY "empresas_update" ON public.empresas
    FOR UPDATE
    USING (
        id = public.current_empresa_id()
        OR public.is_super_admin()
    )
    WITH CHECK (
        id = public.current_empresa_id()
        OR public.is_super_admin()
    );

-- Apenas super_admin pode excluir empresas
CREATE POLICY "empresas_delete" ON public.empresas
    FOR DELETE
    USING (public.is_super_admin());

-- =============================================================================
-- SECAO 4: RLS — TABELA super_admins
-- =============================================================================

ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "super_admins_select" ON public.super_admins;
DROP POLICY IF EXISTS "super_admins_insert" ON public.super_admins;
DROP POLICY IF EXISTS "super_admins_update" ON public.super_admins;
DROP POLICY IF EXISTS "super_admins_delete" ON public.super_admins;

-- Somente super_admins podem consultar/gerenciar outros super_admins
CREATE POLICY "super_admins_select" ON public.super_admins
    FOR SELECT
    USING (public.is_super_admin());

CREATE POLICY "super_admins_insert" ON public.super_admins
    FOR INSERT
    WITH CHECK (public.is_super_admin());

CREATE POLICY "super_admins_update" ON public.super_admins
    FOR UPDATE
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

CREATE POLICY "super_admins_delete" ON public.super_admins
    FOR DELETE
    USING (public.is_super_admin());

-- =============================================================================
-- SECAO 5: MACRO — helper para gerar as 4 policies padrão por tabela
-- (As policies abaixo foram geradas seguindo o padrão empresa_id = current_empresa_id())
-- =============================================================================

-- =============================================================================
-- SECAO 6: RLS — TABELA perfis
-- =============================================================================

ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "perfis_select" ON public.perfis;
DROP POLICY IF EXISTS "perfis_insert" ON public.perfis;
DROP POLICY IF EXISTS "perfis_update" ON public.perfis;
DROP POLICY IF EXISTS "perfis_delete" ON public.perfis;

CREATE POLICY "perfis_select" ON public.perfis
    FOR SELECT USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());

CREATE POLICY "perfis_insert" ON public.perfis
    FOR INSERT WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());

CREATE POLICY "perfis_update" ON public.perfis
    FOR UPDATE
    USING (empresa_id = public.current_empresa_id() OR public.is_super_admin())
    WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());

CREATE POLICY "perfis_delete" ON public.perfis
    FOR DELETE USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());

-- =============================================================================
-- SECAO 7: RLS — TABELA diretorias
-- =============================================================================

ALTER TABLE public.diretorias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "diretorias_select" ON public.diretorias;
DROP POLICY IF EXISTS "diretorias_insert" ON public.diretorias;
DROP POLICY IF EXISTS "diretorias_update" ON public.diretorias;
DROP POLICY IF EXISTS "diretorias_delete" ON public.diretorias;

CREATE POLICY "diretorias_select" ON public.diretorias
    FOR SELECT USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());

CREATE POLICY "diretorias_insert" ON public.diretorias
    FOR INSERT WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());

CREATE POLICY "diretorias_update" ON public.diretorias
    FOR UPDATE
    USING (empresa_id = public.current_empresa_id() OR public.is_super_admin())
    WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());

CREATE POLICY "diretorias_delete" ON public.diretorias
    FOR DELETE USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());

-- =============================================================================
-- SECAO 8: RLS — TABELA setores
-- =============================================================================

ALTER TABLE public.setores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "setores_select" ON public.setores;
DROP POLICY IF EXISTS "setores_insert" ON public.setores;
DROP POLICY IF EXISTS "setores_update" ON public.setores;
DROP POLICY IF EXISTS "setores_delete" ON public.setores;

CREATE POLICY "setores_select" ON public.setores
    FOR SELECT USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());

CREATE POLICY "setores_insert" ON public.setores
    FOR INSERT WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());

CREATE POLICY "setores_update" ON public.setores
    FOR UPDATE
    USING (empresa_id = public.current_empresa_id() OR public.is_super_admin())
    WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());

CREATE POLICY "setores_delete" ON public.setores
    FOR DELETE USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());

-- =============================================================================
-- SECAO 9: RLS — TABELA setores_diretorias
-- =============================================================================

ALTER TABLE public.setores_diretorias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "setores_diretorias_select" ON public.setores_diretorias;
DROP POLICY IF EXISTS "setores_diretorias_insert" ON public.setores_diretorias;
DROP POLICY IF EXISTS "setores_diretorias_update" ON public.setores_diretorias;
DROP POLICY IF EXISTS "setores_diretorias_delete" ON public.setores_diretorias;

CREATE POLICY "setores_diretorias_select" ON public.setores_diretorias
    FOR SELECT USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());

CREATE POLICY "setores_diretorias_insert" ON public.setores_diretorias
    FOR INSERT WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());

CREATE POLICY "setores_diretorias_update" ON public.setores_diretorias
    FOR UPDATE
    USING (empresa_id = public.current_empresa_id() OR public.is_super_admin())
    WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());

CREATE POLICY "setores_diretorias_delete" ON public.setores_diretorias
    FOR DELETE USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());

-- =============================================================================
-- SECAO 10: RLS — TABELA unidades
-- =============================================================================

ALTER TABLE public.unidades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "unidades_select" ON public.unidades;
DROP POLICY IF EXISTS "unidades_insert" ON public.unidades;
DROP POLICY IF EXISTS "unidades_update" ON public.unidades;
DROP POLICY IF EXISTS "unidades_delete" ON public.unidades;

CREATE POLICY "unidades_select" ON public.unidades
    FOR SELECT USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());

CREATE POLICY "unidades_insert" ON public.unidades
    FOR INSERT WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());

CREATE POLICY "unidades_update" ON public.unidades
    FOR UPDATE
    USING (empresa_id = public.current_empresa_id() OR public.is_super_admin())
    WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());

CREATE POLICY "unidades_delete" ON public.unidades
    FOR DELETE USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());

-- =============================================================================
-- SECAO 11: RLS — TABELA categorias_documento
-- =============================================================================

ALTER TABLE public.categorias_documento ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "categorias_documento_select" ON public.categorias_documento;
DROP POLICY IF EXISTS "categorias_documento_insert" ON public.categorias_documento;
DROP POLICY IF EXISTS "categorias_documento_update" ON public.categorias_documento;
DROP POLICY IF EXISTS "categorias_documento_delete" ON public.categorias_documento;

CREATE POLICY "categorias_documento_select" ON public.categorias_documento
    FOR SELECT USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());

CREATE POLICY "categorias_documento_insert" ON public.categorias_documento
    FOR INSERT WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());

CREATE POLICY "categorias_documento_update" ON public.categorias_documento
    FOR UPDATE
    USING (empresa_id = public.current_empresa_id() OR public.is_super_admin())
    WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());

CREATE POLICY "categorias_documento_delete" ON public.categorias_documento
    FOR DELETE USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());

-- =============================================================================
-- SECAO 12: RLS — TABELA permissoes_usuario_modulo
-- =============================================================================

ALTER TABLE public.permissoes_usuario_modulo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "permissoes_usuario_modulo_select" ON public.permissoes_usuario_modulo;
DROP POLICY IF EXISTS "permissoes_usuario_modulo_insert" ON public.permissoes_usuario_modulo;
DROP POLICY IF EXISTS "permissoes_usuario_modulo_update" ON public.permissoes_usuario_modulo;
DROP POLICY IF EXISTS "permissoes_usuario_modulo_delete" ON public.permissoes_usuario_modulo;

CREATE POLICY "permissoes_usuario_modulo_select" ON public.permissoes_usuario_modulo
    FOR SELECT USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());

CREATE POLICY "permissoes_usuario_modulo_insert" ON public.permissoes_usuario_modulo
    FOR INSERT WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());

CREATE POLICY "permissoes_usuario_modulo_update" ON public.permissoes_usuario_modulo
    FOR UPDATE
    USING (empresa_id = public.current_empresa_id() OR public.is_super_admin())
    WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());

CREATE POLICY "permissoes_usuario_modulo_delete" ON public.permissoes_usuario_modulo
    FOR DELETE USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());

-- =============================================================================
-- SECAO 13: RLS — TABELAS de indicadores
-- =============================================================================

-- indicadores
ALTER TABLE public.indicadores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "indicadores_select" ON public.indicadores;
DROP POLICY IF EXISTS "indicadores_insert" ON public.indicadores;
DROP POLICY IF EXISTS "indicadores_update" ON public.indicadores;
DROP POLICY IF EXISTS "indicadores_delete" ON public.indicadores;
CREATE POLICY "indicadores_select" ON public.indicadores
    FOR SELECT USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "indicadores_insert" ON public.indicadores
    FOR INSERT WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "indicadores_update" ON public.indicadores
    FOR UPDATE
    USING (empresa_id = public.current_empresa_id() OR public.is_super_admin())
    WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "indicadores_delete" ON public.indicadores
    FOR DELETE USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());

-- indicadores_dados
ALTER TABLE public.indicadores_dados ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "indicadores_dados_select" ON public.indicadores_dados;
DROP POLICY IF EXISTS "indicadores_dados_insert" ON public.indicadores_dados;
DROP POLICY IF EXISTS "indicadores_dados_update" ON public.indicadores_dados;
DROP POLICY IF EXISTS "indicadores_dados_delete" ON public.indicadores_dados;
CREATE POLICY "indicadores_dados_select" ON public.indicadores_dados
    FOR SELECT USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "indicadores_dados_insert" ON public.indicadores_dados
    FOR INSERT WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "indicadores_dados_update" ON public.indicadores_dados
    FOR UPDATE
    USING (empresa_id = public.current_empresa_id() OR public.is_super_admin())
    WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "indicadores_dados_delete" ON public.indicadores_dados
    FOR DELETE USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());

-- indicadores_medicoes
ALTER TABLE public.indicadores_medicoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "indicadores_medicoes_select" ON public.indicadores_medicoes;
DROP POLICY IF EXISTS "indicadores_medicoes_insert" ON public.indicadores_medicoes;
DROP POLICY IF EXISTS "indicadores_medicoes_update" ON public.indicadores_medicoes;
DROP POLICY IF EXISTS "indicadores_medicoes_delete" ON public.indicadores_medicoes;
CREATE POLICY "indicadores_medicoes_select" ON public.indicadores_medicoes
    FOR SELECT USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "indicadores_medicoes_insert" ON public.indicadores_medicoes
    FOR INSERT WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "indicadores_medicoes_update" ON public.indicadores_medicoes
    FOR UPDATE
    USING (empresa_id = public.current_empresa_id() OR public.is_super_admin())
    WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "indicadores_medicoes_delete" ON public.indicadores_medicoes
    FOR DELETE USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());

-- indicadores_faixas_limite
ALTER TABLE public.indicadores_faixas_limite ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "indicadores_faixas_limite_select" ON public.indicadores_faixas_limite;
DROP POLICY IF EXISTS "indicadores_faixas_limite_insert" ON public.indicadores_faixas_limite;
DROP POLICY IF EXISTS "indicadores_faixas_limite_update" ON public.indicadores_faixas_limite;
DROP POLICY IF EXISTS "indicadores_faixas_limite_delete" ON public.indicadores_faixas_limite;
CREATE POLICY "indicadores_faixas_limite_select" ON public.indicadores_faixas_limite
    FOR SELECT USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "indicadores_faixas_limite_insert" ON public.indicadores_faixas_limite
    FOR INSERT WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "indicadores_faixas_limite_update" ON public.indicadores_faixas_limite
    FOR UPDATE
    USING (empresa_id = public.current_empresa_id() OR public.is_super_admin())
    WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "indicadores_faixas_limite_delete" ON public.indicadores_faixas_limite
    FOR DELETE USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());

-- indicadores_planos_acao
ALTER TABLE public.indicadores_planos_acao ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "indicadores_planos_acao_select" ON public.indicadores_planos_acao;
DROP POLICY IF EXISTS "indicadores_planos_acao_insert" ON public.indicadores_planos_acao;
DROP POLICY IF EXISTS "indicadores_planos_acao_update" ON public.indicadores_planos_acao;
DROP POLICY IF EXISTS "indicadores_planos_acao_delete" ON public.indicadores_planos_acao;
CREATE POLICY "indicadores_planos_acao_select" ON public.indicadores_planos_acao
    FOR SELECT USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "indicadores_planos_acao_insert" ON public.indicadores_planos_acao
    FOR INSERT WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "indicadores_planos_acao_update" ON public.indicadores_planos_acao
    FOR UPDATE
    USING (empresa_id = public.current_empresa_id() OR public.is_super_admin())
    WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "indicadores_planos_acao_delete" ON public.indicadores_planos_acao
    FOR DELETE USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());

-- indicadores_aprovacoes
ALTER TABLE public.indicadores_aprovacoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "indicadores_aprovacoes_select" ON public.indicadores_aprovacoes;
DROP POLICY IF EXISTS "indicadores_aprovacoes_insert" ON public.indicadores_aprovacoes;
DROP POLICY IF EXISTS "indicadores_aprovacoes_update" ON public.indicadores_aprovacoes;
DROP POLICY IF EXISTS "indicadores_aprovacoes_delete" ON public.indicadores_aprovacoes;
CREATE POLICY "indicadores_aprovacoes_select" ON public.indicadores_aprovacoes
    FOR SELECT USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "indicadores_aprovacoes_insert" ON public.indicadores_aprovacoes
    FOR INSERT WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "indicadores_aprovacoes_update" ON public.indicadores_aprovacoes
    FOR UPDATE
    USING (empresa_id = public.current_empresa_id() OR public.is_super_admin())
    WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "indicadores_aprovacoes_delete" ON public.indicadores_aprovacoes
    FOR DELETE USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());

-- indicadores_anotacoes
ALTER TABLE public.indicadores_anotacoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "indicadores_anotacoes_select" ON public.indicadores_anotacoes;
DROP POLICY IF EXISTS "indicadores_anotacoes_insert" ON public.indicadores_anotacoes;
DROP POLICY IF EXISTS "indicadores_anotacoes_update" ON public.indicadores_anotacoes;
DROP POLICY IF EXISTS "indicadores_anotacoes_delete" ON public.indicadores_anotacoes;
CREATE POLICY "indicadores_anotacoes_select" ON public.indicadores_anotacoes
    FOR SELECT USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "indicadores_anotacoes_insert" ON public.indicadores_anotacoes
    FOR INSERT WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "indicadores_anotacoes_update" ON public.indicadores_anotacoes
    FOR UPDATE
    USING (empresa_id = public.current_empresa_id() OR public.is_super_admin())
    WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "indicadores_anotacoes_delete" ON public.indicadores_anotacoes
    FOR DELETE USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());

-- indicadores_analises
ALTER TABLE public.indicadores_analises ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "indicadores_analises_select" ON public.indicadores_analises;
DROP POLICY IF EXISTS "indicadores_analises_insert" ON public.indicadores_analises;
DROP POLICY IF EXISTS "indicadores_analises_update" ON public.indicadores_analises;
DROP POLICY IF EXISTS "indicadores_analises_delete" ON public.indicadores_analises;
CREATE POLICY "indicadores_analises_select" ON public.indicadores_analises
    FOR SELECT USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "indicadores_analises_insert" ON public.indicadores_analises
    FOR INSERT WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "indicadores_analises_update" ON public.indicadores_analises
    FOR UPDATE
    USING (empresa_id = public.current_empresa_id() OR public.is_super_admin())
    WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "indicadores_analises_delete" ON public.indicadores_analises
    FOR DELETE USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());

-- indicadores_analises_criticas
ALTER TABLE public.indicadores_analises_criticas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "indicadores_analises_criticas_select" ON public.indicadores_analises_criticas;
DROP POLICY IF EXISTS "indicadores_analises_criticas_insert" ON public.indicadores_analises_criticas;
DROP POLICY IF EXISTS "indicadores_analises_criticas_update" ON public.indicadores_analises_criticas;
DROP POLICY IF EXISTS "indicadores_analises_criticas_delete" ON public.indicadores_analises_criticas;
CREATE POLICY "indicadores_analises_criticas_select" ON public.indicadores_analises_criticas
    FOR SELECT USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "indicadores_analises_criticas_insert" ON public.indicadores_analises_criticas
    FOR INSERT WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "indicadores_analises_criticas_update" ON public.indicadores_analises_criticas
    FOR UPDATE
    USING (empresa_id = public.current_empresa_id() OR public.is_super_admin())
    WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "indicadores_analises_criticas_delete" ON public.indicadores_analises_criticas
    FOR DELETE USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());

-- indicadores_historico
ALTER TABLE public.indicadores_historico ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "indicadores_historico_select" ON public.indicadores_historico;
DROP POLICY IF EXISTS "indicadores_historico_insert" ON public.indicadores_historico;
DROP POLICY IF EXISTS "indicadores_historico_update" ON public.indicadores_historico;
DROP POLICY IF EXISTS "indicadores_historico_delete" ON public.indicadores_historico;
CREATE POLICY "indicadores_historico_select" ON public.indicadores_historico
    FOR SELECT USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "indicadores_historico_insert" ON public.indicadores_historico
    FOR INSERT WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "indicadores_historico_update" ON public.indicadores_historico
    FOR UPDATE
    USING (empresa_id = public.current_empresa_id() OR public.is_super_admin())
    WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "indicadores_historico_delete" ON public.indicadores_historico
    FOR DELETE USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());

-- indicadores_vinculos
ALTER TABLE public.indicadores_vinculos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "indicadores_vinculos_select" ON public.indicadores_vinculos;
DROP POLICY IF EXISTS "indicadores_vinculos_insert" ON public.indicadores_vinculos;
DROP POLICY IF EXISTS "indicadores_vinculos_update" ON public.indicadores_vinculos;
DROP POLICY IF EXISTS "indicadores_vinculos_delete" ON public.indicadores_vinculos;
CREATE POLICY "indicadores_vinculos_select" ON public.indicadores_vinculos
    FOR SELECT USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "indicadores_vinculos_insert" ON public.indicadores_vinculos
    FOR INSERT WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "indicadores_vinculos_update" ON public.indicadores_vinculos
    FOR UPDATE
    USING (empresa_id = public.current_empresa_id() OR public.is_super_admin())
    WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "indicadores_vinculos_delete" ON public.indicadores_vinculos
    FOR DELETE USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());

-- indicadores_ficha_tecnica
ALTER TABLE public.indicadores_ficha_tecnica ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "indicadores_ficha_tecnica_select" ON public.indicadores_ficha_tecnica;
DROP POLICY IF EXISTS "indicadores_ficha_tecnica_insert" ON public.indicadores_ficha_tecnica;
DROP POLICY IF EXISTS "indicadores_ficha_tecnica_update" ON public.indicadores_ficha_tecnica;
DROP POLICY IF EXISTS "indicadores_ficha_tecnica_delete" ON public.indicadores_ficha_tecnica;
CREATE POLICY "indicadores_ficha_tecnica_select" ON public.indicadores_ficha_tecnica
    FOR SELECT USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "indicadores_ficha_tecnica_insert" ON public.indicadores_ficha_tecnica
    FOR INSERT WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "indicadores_ficha_tecnica_update" ON public.indicadores_ficha_tecnica
    FOR UPDATE
    USING (empresa_id = public.current_empresa_id() OR public.is_super_admin())
    WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "indicadores_ficha_tecnica_delete" ON public.indicadores_ficha_tecnica
    FOR DELETE USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());

-- indicadores_graficos_config
ALTER TABLE public.indicadores_graficos_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "indicadores_graficos_config_select" ON public.indicadores_graficos_config;
DROP POLICY IF EXISTS "indicadores_graficos_config_insert" ON public.indicadores_graficos_config;
DROP POLICY IF EXISTS "indicadores_graficos_config_update" ON public.indicadores_graficos_config;
DROP POLICY IF EXISTS "indicadores_graficos_config_delete" ON public.indicadores_graficos_config;
CREATE POLICY "indicadores_graficos_config_select" ON public.indicadores_graficos_config
    FOR SELECT USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "indicadores_graficos_config_insert" ON public.indicadores_graficos_config
    FOR INSERT WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "indicadores_graficos_config_update" ON public.indicadores_graficos_config
    FOR UPDATE
    USING (empresa_id = public.current_empresa_id() OR public.is_super_admin())
    WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "indicadores_graficos_config_delete" ON public.indicadores_graficos_config
    FOR DELETE USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());

-- =============================================================================
-- SECAO 14: RLS — TABELAS de processos e riscos
-- =============================================================================

-- processos
ALTER TABLE public.processos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "processos_select" ON public.processos;
DROP POLICY IF EXISTS "processos_insert" ON public.processos;
DROP POLICY IF EXISTS "processos_update" ON public.processos;
DROP POLICY IF EXISTS "processos_delete" ON public.processos;
CREATE POLICY "processos_select" ON public.processos
    FOR SELECT USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "processos_insert" ON public.processos
    FOR INSERT WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "processos_update" ON public.processos
    FOR UPDATE
    USING (empresa_id = public.current_empresa_id() OR public.is_super_admin())
    WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "processos_delete" ON public.processos
    FOR DELETE USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());

-- subprocessos
ALTER TABLE public.subprocessos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subprocessos_select" ON public.subprocessos;
DROP POLICY IF EXISTS "subprocessos_insert" ON public.subprocessos;
DROP POLICY IF EXISTS "subprocessos_update" ON public.subprocessos;
DROP POLICY IF EXISTS "subprocessos_delete" ON public.subprocessos;
CREATE POLICY "subprocessos_select" ON public.subprocessos
    FOR SELECT USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "subprocessos_insert" ON public.subprocessos
    FOR INSERT WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "subprocessos_update" ON public.subprocessos
    FOR UPDATE
    USING (empresa_id = public.current_empresa_id() OR public.is_super_admin())
    WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "subprocessos_delete" ON public.subprocessos
    FOR DELETE USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());

-- riscos
ALTER TABLE public.riscos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "riscos_select" ON public.riscos;
DROP POLICY IF EXISTS "riscos_insert" ON public.riscos;
DROP POLICY IF EXISTS "riscos_update" ON public.riscos;
DROP POLICY IF EXISTS "riscos_delete" ON public.riscos;
CREATE POLICY "riscos_select" ON public.riscos
    FOR SELECT USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "riscos_insert" ON public.riscos
    FOR INSERT WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "riscos_update" ON public.riscos
    FOR UPDATE
    USING (empresa_id = public.current_empresa_id() OR public.is_super_admin())
    WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "riscos_delete" ON public.riscos
    FOR DELETE USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());

-- riscos_apetite
ALTER TABLE public.riscos_apetite ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "riscos_apetite_select" ON public.riscos_apetite;
DROP POLICY IF EXISTS "riscos_apetite_insert" ON public.riscos_apetite;
DROP POLICY IF EXISTS "riscos_apetite_update" ON public.riscos_apetite;
DROP POLICY IF EXISTS "riscos_apetite_delete" ON public.riscos_apetite;
CREATE POLICY "riscos_apetite_select" ON public.riscos_apetite
    FOR SELECT USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "riscos_apetite_insert" ON public.riscos_apetite
    FOR INSERT WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "riscos_apetite_update" ON public.riscos_apetite
    FOR UPDATE
    USING (empresa_id = public.current_empresa_id() OR public.is_super_admin())
    WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "riscos_apetite_delete" ON public.riscos_apetite
    FOR DELETE USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());

-- riscos_arestas
ALTER TABLE public.riscos_arestas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "riscos_arestas_select" ON public.riscos_arestas;
DROP POLICY IF EXISTS "riscos_arestas_insert" ON public.riscos_arestas;
DROP POLICY IF EXISTS "riscos_arestas_update" ON public.riscos_arestas;
DROP POLICY IF EXISTS "riscos_arestas_delete" ON public.riscos_arestas;
CREATE POLICY "riscos_arestas_select" ON public.riscos_arestas
    FOR SELECT USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "riscos_arestas_insert" ON public.riscos_arestas
    FOR INSERT WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "riscos_arestas_update" ON public.riscos_arestas
    FOR UPDATE
    USING (empresa_id = public.current_empresa_id() OR public.is_super_admin())
    WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "riscos_arestas_delete" ON public.riscos_arestas
    FOR DELETE USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());

-- riscos_cenarios
ALTER TABLE public.riscos_cenarios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "riscos_cenarios_select" ON public.riscos_cenarios;
DROP POLICY IF EXISTS "riscos_cenarios_insert" ON public.riscos_cenarios;
DROP POLICY IF EXISTS "riscos_cenarios_update" ON public.riscos_cenarios;
DROP POLICY IF EXISTS "riscos_cenarios_delete" ON public.riscos_cenarios;
CREATE POLICY "riscos_cenarios_select" ON public.riscos_cenarios
    FOR SELECT USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "riscos_cenarios_insert" ON public.riscos_cenarios
    FOR INSERT WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "riscos_cenarios_update" ON public.riscos_cenarios
    FOR UPDATE
    USING (empresa_id = public.current_empresa_id() OR public.is_super_admin())
    WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "riscos_cenarios_delete" ON public.riscos_cenarios
    FOR DELETE USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());

-- riscos_controles
ALTER TABLE public.riscos_controles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "riscos_controles_select" ON public.riscos_controles;
DROP POLICY IF EXISTS "riscos_controles_insert" ON public.riscos_controles;
DROP POLICY IF EXISTS "riscos_controles_update" ON public.riscos_controles;
DROP POLICY IF EXISTS "riscos_controles_delete" ON public.riscos_controles;
CREATE POLICY "riscos_controles_select" ON public.riscos_controles
    FOR SELECT USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "riscos_controles_insert" ON public.riscos_controles
    FOR INSERT WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "riscos_controles_update" ON public.riscos_controles
    FOR UPDATE
    USING (empresa_id = public.current_empresa_id() OR public.is_super_admin())
    WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "riscos_controles_delete" ON public.riscos_controles
    FOR DELETE USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());

-- riscos_eventos
ALTER TABLE public.riscos_eventos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "riscos_eventos_select" ON public.riscos_eventos;
DROP POLICY IF EXISTS "riscos_eventos_insert" ON public.riscos_eventos;
DROP POLICY IF EXISTS "riscos_eventos_update" ON public.riscos_eventos;
DROP POLICY IF EXISTS "riscos_eventos_delete" ON public.riscos_eventos;
CREATE POLICY "riscos_eventos_select" ON public.riscos_eventos
    FOR SELECT USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "riscos_eventos_insert" ON public.riscos_eventos
    FOR INSERT WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "riscos_eventos_update" ON public.riscos_eventos
    FOR UPDATE
    USING (empresa_id = public.current_empresa_id() OR public.is_super_admin())
    WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "riscos_eventos_delete" ON public.riscos_eventos
    FOR DELETE USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());

-- riscos_kri
ALTER TABLE public.riscos_kri ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "riscos_kri_select" ON public.riscos_kri;
DROP POLICY IF EXISTS "riscos_kri_insert" ON public.riscos_kri;
DROP POLICY IF EXISTS "riscos_kri_update" ON public.riscos_kri;
DROP POLICY IF EXISTS "riscos_kri_delete" ON public.riscos_kri;
CREATE POLICY "riscos_kri_select" ON public.riscos_kri
    FOR SELECT USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "riscos_kri_insert" ON public.riscos_kri
    FOR INSERT WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "riscos_kri_update" ON public.riscos_kri
    FOR UPDATE
    USING (empresa_id = public.current_empresa_id() OR public.is_super_admin())
    WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "riscos_kri_delete" ON public.riscos_kri
    FOR DELETE USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());

-- riscos_nos
ALTER TABLE public.riscos_nos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "riscos_nos_select" ON public.riscos_nos;
DROP POLICY IF EXISTS "riscos_nos_insert" ON public.riscos_nos;
DROP POLICY IF EXISTS "riscos_nos_update" ON public.riscos_nos;
DROP POLICY IF EXISTS "riscos_nos_delete" ON public.riscos_nos;
CREATE POLICY "riscos_nos_select" ON public.riscos_nos
    FOR SELECT USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "riscos_nos_insert" ON public.riscos_nos
    FOR INSERT WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "riscos_nos_update" ON public.riscos_nos
    FOR UPDATE
    USING (empresa_id = public.current_empresa_id() OR public.is_super_admin())
    WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "riscos_nos_delete" ON public.riscos_nos
    FOR DELETE USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());

-- =============================================================================
-- SECAO 15: RLS — TABELAS de registros
-- =============================================================================

-- registros_templates
ALTER TABLE public.registros_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "registros_templates_select" ON public.registros_templates;
DROP POLICY IF EXISTS "registros_templates_insert" ON public.registros_templates;
DROP POLICY IF EXISTS "registros_templates_update" ON public.registros_templates;
DROP POLICY IF EXISTS "registros_templates_delete" ON public.registros_templates;
CREATE POLICY "registros_templates_select" ON public.registros_templates
    FOR SELECT USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "registros_templates_insert" ON public.registros_templates
    FOR INSERT WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "registros_templates_update" ON public.registros_templates
    FOR UPDATE
    USING (empresa_id = public.current_empresa_id() OR public.is_super_admin())
    WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "registros_templates_delete" ON public.registros_templates
    FOR DELETE USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());

-- registros_preenchidos
ALTER TABLE public.registros_preenchidos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "registros_preenchidos_select" ON public.registros_preenchidos;
DROP POLICY IF EXISTS "registros_preenchidos_insert" ON public.registros_preenchidos;
DROP POLICY IF EXISTS "registros_preenchidos_update" ON public.registros_preenchidos;
DROP POLICY IF EXISTS "registros_preenchidos_delete" ON public.registros_preenchidos;
CREATE POLICY "registros_preenchidos_select" ON public.registros_preenchidos
    FOR SELECT USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "registros_preenchidos_insert" ON public.registros_preenchidos
    FOR INSERT WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "registros_preenchidos_update" ON public.registros_preenchidos
    FOR UPDATE
    USING (empresa_id = public.current_empresa_id() OR public.is_super_admin())
    WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "registros_preenchidos_delete" ON public.registros_preenchidos
    FOR DELETE USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());

-- registros_comentarios
ALTER TABLE public.registros_comentarios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "registros_comentarios_select" ON public.registros_comentarios;
DROP POLICY IF EXISTS "registros_comentarios_insert" ON public.registros_comentarios;
DROP POLICY IF EXISTS "registros_comentarios_update" ON public.registros_comentarios;
DROP POLICY IF EXISTS "registros_comentarios_delete" ON public.registros_comentarios;
CREATE POLICY "registros_comentarios_select" ON public.registros_comentarios
    FOR SELECT USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "registros_comentarios_insert" ON public.registros_comentarios
    FOR INSERT WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "registros_comentarios_update" ON public.registros_comentarios
    FOR UPDATE
    USING (empresa_id = public.current_empresa_id() OR public.is_super_admin())
    WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "registros_comentarios_delete" ON public.registros_comentarios
    FOR DELETE USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());

-- registros_anexos
ALTER TABLE public.registros_anexos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "registros_anexos_select" ON public.registros_anexos;
DROP POLICY IF EXISTS "registros_anexos_insert" ON public.registros_anexos;
DROP POLICY IF EXISTS "registros_anexos_update" ON public.registros_anexos;
DROP POLICY IF EXISTS "registros_anexos_delete" ON public.registros_anexos;
CREATE POLICY "registros_anexos_select" ON public.registros_anexos
    FOR SELECT USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "registros_anexos_insert" ON public.registros_anexos
    FOR INSERT WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "registros_anexos_update" ON public.registros_anexos
    FOR UPDATE
    USING (empresa_id = public.current_empresa_id() OR public.is_super_admin())
    WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "registros_anexos_delete" ON public.registros_anexos
    FOR DELETE USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());

-- registros_eventos
ALTER TABLE public.registros_eventos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "registros_eventos_select" ON public.registros_eventos;
DROP POLICY IF EXISTS "registros_eventos_insert" ON public.registros_eventos;
DROP POLICY IF EXISTS "registros_eventos_update" ON public.registros_eventos;
DROP POLICY IF EXISTS "registros_eventos_delete" ON public.registros_eventos;
CREATE POLICY "registros_eventos_select" ON public.registros_eventos
    FOR SELECT USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "registros_eventos_insert" ON public.registros_eventos
    FOR INSERT WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "registros_eventos_update" ON public.registros_eventos
    FOR UPDATE
    USING (empresa_id = public.current_empresa_id() OR public.is_super_admin())
    WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "registros_eventos_delete" ON public.registros_eventos
    FOR DELETE USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());

-- registros_workflow_tasks
ALTER TABLE public.registros_workflow_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "registros_workflow_tasks_select" ON public.registros_workflow_tasks;
DROP POLICY IF EXISTS "registros_workflow_tasks_insert" ON public.registros_workflow_tasks;
DROP POLICY IF EXISTS "registros_workflow_tasks_update" ON public.registros_workflow_tasks;
DROP POLICY IF EXISTS "registros_workflow_tasks_delete" ON public.registros_workflow_tasks;
CREATE POLICY "registros_workflow_tasks_select" ON public.registros_workflow_tasks
    FOR SELECT USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "registros_workflow_tasks_insert" ON public.registros_workflow_tasks
    FOR INSERT WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "registros_workflow_tasks_update" ON public.registros_workflow_tasks
    FOR UPDATE
    USING (empresa_id = public.current_empresa_id() OR public.is_super_admin())
    WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "registros_workflow_tasks_delete" ON public.registros_workflow_tasks
    FOR DELETE USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());

-- registros_webhooks
ALTER TABLE public.registros_webhooks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "registros_webhooks_select" ON public.registros_webhooks;
DROP POLICY IF EXISTS "registros_webhooks_insert" ON public.registros_webhooks;
DROP POLICY IF EXISTS "registros_webhooks_update" ON public.registros_webhooks;
DROP POLICY IF EXISTS "registros_webhooks_delete" ON public.registros_webhooks;
CREATE POLICY "registros_webhooks_select" ON public.registros_webhooks
    FOR SELECT USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "registros_webhooks_insert" ON public.registros_webhooks
    FOR INSERT WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "registros_webhooks_update" ON public.registros_webhooks
    FOR UPDATE
    USING (empresa_id = public.current_empresa_id() OR public.is_super_admin())
    WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "registros_webhooks_delete" ON public.registros_webhooks
    FOR DELETE USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());

-- =============================================================================
-- SECAO 16: RLS — TABELAS auxiliares (ai_generations, audit_access_log)
-- =============================================================================

-- ai_generations
ALTER TABLE public.ai_generations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ai_generations_select" ON public.ai_generations;
DROP POLICY IF EXISTS "ai_generations_insert" ON public.ai_generations;
DROP POLICY IF EXISTS "ai_generations_update" ON public.ai_generations;
DROP POLICY IF EXISTS "ai_generations_delete" ON public.ai_generations;
CREATE POLICY "ai_generations_select" ON public.ai_generations
    FOR SELECT USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "ai_generations_insert" ON public.ai_generations
    FOR INSERT WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "ai_generations_update" ON public.ai_generations
    FOR UPDATE
    USING (empresa_id = public.current_empresa_id() OR public.is_super_admin())
    WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());
CREATE POLICY "ai_generations_delete" ON public.ai_generations
    FOR DELETE USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());

-- audit_access_log
-- Nota: usuários comuns podem inserir (registro de auditoria própria) mas não apagar
ALTER TABLE public.audit_access_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_access_log_select" ON public.audit_access_log;
DROP POLICY IF EXISTS "audit_access_log_insert" ON public.audit_access_log;
DROP POLICY IF EXISTS "audit_access_log_update" ON public.audit_access_log;
DROP POLICY IF EXISTS "audit_access_log_delete" ON public.audit_access_log;
CREATE POLICY "audit_access_log_select" ON public.audit_access_log
    FOR SELECT USING (empresa_id = public.current_empresa_id() OR public.is_super_admin());
-- INSERT liberado para a própria empresa (logs gerados pela aplicação)
CREATE POLICY "audit_access_log_insert" ON public.audit_access_log
    FOR INSERT WITH CHECK (empresa_id = public.current_empresa_id() OR public.is_super_admin());
-- UPDATE bloqueado para todos (log é imutável); super_admin pode fazer se necessário
CREATE POLICY "audit_access_log_update" ON public.audit_access_log
    FOR UPDATE
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());
-- DELETE bloqueado para usuários comuns; apenas super_admin pode purgar
CREATE POLICY "audit_access_log_delete" ON public.audit_access_log
    FOR DELETE USING (public.is_super_admin());

-- =============================================================================
-- FIM DA MIGRATION 0005
-- =============================================================================
