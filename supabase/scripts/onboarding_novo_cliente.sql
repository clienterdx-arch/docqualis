-- =============================================================================
-- SCRIPT: Onboarding de Novo Cliente DocQualis
-- Versão: 1.0
-- Uso: Executar no SQL Editor do Supabase (com role de service_role / postgres)
--
-- ATENÇÃO: Este script deve ser executado por um super admin DocQualis.
--          NÃO execute como usuário autenticado do cliente.
--
-- COMO USAR:
--   1. Substitua as variáveis no bloco DO $$ abaixo com os dados reais do cliente.
--   2. Execute o script completo no Supabase Studio > SQL Editor.
--   3. Verifique o resumo exibido ao final.
--
-- COMO REVERTER (em caso de erro):
--   DELETE FROM public.perfis             WHERE empresa_id = '<empresa_id>';
--   DELETE FROM public.permissoes_usuario_modulo WHERE empresa_id = '<empresa_id>';
--   DELETE FROM public.diretorias         WHERE empresa_id = '<empresa_id>';
--   DELETE FROM public.setores            WHERE empresa_id = '<empresa_id>';
--   DELETE FROM public.empresas           WHERE id = '<empresa_id>';
--   -- O usuário auth deve ser removido via Supabase Dashboard > Auth > Users
--   -- ou via: DELETE FROM auth.users WHERE id = '<user_id>';
-- =============================================================================

DO $$
DECLARE
    -- =========================================================================
    -- BLOCO DE VARIÁVEIS — SUBSTITUA OS VALORES ABAIXO ANTES DE EXECUTAR
    -- =========================================================================

    -- Dados da empresa
    v_empresa_nome      text        := 'Hospital Exemplo S/A';
    v_empresa_cnpj      text        := '00.000.000/0001-00';   -- Formato: XX.XXX.XXX/XXXX-XX
    v_empresa_plano     text        := 'trial';                 -- 'trial' | 'starter' | 'pro' | 'enterprise'
    v_trial_dias        integer     := 30;                      -- Dias de trial a partir de hoje

    -- Dados do administrador inicial do cliente
    -- IMPORTANTE: O usuário auth.users NÃO é criado por este script.
    -- Crie o usuário ANTES de rodar este script via:
    --   a) Supabase Dashboard > Authentication > Users > "Invite user"
    --   b) POST /auth/v1/admin/users via Management API (service_role key)
    -- Após criar, cole o UUID gerado em v_admin_user_id.
    v_admin_user_id     uuid        := '00000000-0000-0000-0000-000000000000'; -- << SUBSTITUIR
    v_admin_nome        text        := 'Dr. João Silva';
    v_admin_cargo       text        := 'Diretor de Qualidade';

    -- =========================================================================
    -- VARIÁVEIS INTERNAS (não editar)
    -- =========================================================================
    v_empresa_id        uuid;
    v_perfil_id         uuid;
    v_dir_assistencial  uuid;
    v_dir_administrativa uuid;
    v_dir_qualidade     uuid;
    v_modulos           text[];
    v_modulo            text;
BEGIN
    -- Valida que o user_id foi substituído
    IF v_admin_user_id = '00000000-0000-0000-0000-000000000000' THEN
        RAISE EXCEPTION
            'ERRO: v_admin_user_id não foi substituído. '
            'Crie o usuário no Dashboard e cole o UUID gerado na variável v_admin_user_id.';
    END IF;

    -- Valida que o usuário auth existe
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_admin_user_id) THEN
        RAISE EXCEPTION
            'ERRO: Usuário auth.users com id % não encontrado. '
            'Verifique se o usuário foi criado no Supabase antes de rodar este script.',
            v_admin_user_id;
    END IF;

    RAISE NOTICE '=== Iniciando onboarding: % ===', v_empresa_nome;

    -- =========================================================================
    -- PASSO 1: Criar o registro da empresa
    -- =========================================================================
    INSERT INTO public.empresas (nome, cnpj, plano, status, trial_ends_at)
    VALUES (
        v_empresa_nome,
        v_empresa_cnpj,
        v_empresa_plano,
        'ativo',
        CASE WHEN v_empresa_plano = 'trial'
             THEN now() + (v_trial_dias || ' days')::interval
             ELSE NULL
        END
    )
    RETURNING id INTO v_empresa_id;

    RAISE NOTICE 'Empresa criada: id=%', v_empresa_id;

    -- =========================================================================
    -- PASSO 2: Criar o perfil do administrador
    -- (O auth.users já deve existir — veja instrução acima)
    -- =========================================================================
    INSERT INTO public.perfis (user_id, empresa_id, nome, cargo, perfil_acesso, ativo)
    VALUES (
        v_admin_user_id,
        v_empresa_id,
        v_admin_nome,
        v_admin_cargo,
        'ADMIN',
        true
    )
    RETURNING id INTO v_perfil_id;

    RAISE NOTICE 'Perfil ADMIN criado: id=%', v_perfil_id;

    -- =========================================================================
    -- PASSO 3: Criar permissões de administrador para todos os módulos
    --
    -- Níveis disponíveis: 'visualizar' | 'editar' | 'administrar'
    -- O ADMIN recebe 'administrar' em todos os módulos.
    -- =========================================================================
    v_modulos := ARRAY[
        'indicadores',
        'processos',
        'riscos',
        'registros',
        'documentos',
        'auditorias',
        'planos_acao',
        'relatorios',
        'configuracoes',
        'usuarios',
        'integrações'
    ];

    FOREACH v_modulo IN ARRAY v_modulos LOOP
        INSERT INTO public.permissoes_usuario_modulo (empresa_id, perfil_id, modulo, nivel)
        VALUES (v_empresa_id, v_perfil_id, v_modulo, 'administrar');
    END LOOP;

    RAISE NOTICE 'Permissões criadas: % módulos com nível administrar', array_length(v_modulos, 1);

    -- =========================================================================
    -- PASSO 4: Criar estrutura organizacional padrão — Diretorias (hospital)
    --
    -- Estrutura típica de hospital de médio porte.
    -- Adapte conforme necessidade do cliente.
    -- =========================================================================

    -- Diretoria Assistencial
    INSERT INTO public.diretorias (empresa_id, nome)
    VALUES (v_empresa_id, 'Diretoria Assistencial')
    RETURNING id INTO v_dir_assistencial;

    -- Diretoria Administrativa e Financeira
    INSERT INTO public.diretorias (empresa_id, nome)
    VALUES (v_empresa_id, 'Diretoria Administrativa e Financeira')
    RETURNING id INTO v_dir_administrativa;

    -- Diretoria de Qualidade e Segurança do Paciente
    INSERT INTO public.diretorias (empresa_id, nome)
    VALUES (v_empresa_id, 'Diretoria de Qualidade e Segurança do Paciente')
    RETURNING id INTO v_dir_qualidade;

    RAISE NOTICE 'Diretorias criadas: 3';

    -- =========================================================================
    -- PASSO 5: Criar Setores padrão e vinculá-los às Diretorias
    --
    -- 8 setores distribuídos nas 3 diretorias.
    -- =========================================================================

    -- Setores da Diretoria Assistencial
    WITH s1 AS (
        INSERT INTO public.setores (empresa_id, nome)
        VALUES (v_empresa_id, 'UTI Adulto')
        RETURNING id
    )
    INSERT INTO public.setores_diretorias (empresa_id, setor_id, diretoria_id)
    SELECT v_empresa_id, s1.id, v_dir_assistencial FROM s1;

    WITH s2 AS (
        INSERT INTO public.setores (empresa_id, nome)
        VALUES (v_empresa_id, 'Pronto-Socorro')
        RETURNING id
    )
    INSERT INTO public.setores_diretorias (empresa_id, setor_id, diretoria_id)
    SELECT v_empresa_id, s2.id, v_dir_assistencial FROM s2;

    WITH s3 AS (
        INSERT INTO public.setores (empresa_id, nome)
        VALUES (v_empresa_id, 'Centro Cirúrgico')
        RETURNING id
    )
    INSERT INTO public.setores_diretorias (empresa_id, setor_id, diretoria_id)
    SELECT v_empresa_id, s3.id, v_dir_assistencial FROM s3;

    WITH s4 AS (
        INSERT INTO public.setores (empresa_id, nome)
        VALUES (v_empresa_id, 'Internação Clínica')
        RETURNING id
    )
    INSERT INTO public.setores_diretorias (empresa_id, setor_id, diretoria_id)
    SELECT v_empresa_id, s4.id, v_dir_assistencial FROM s4;

    -- Setores da Diretoria Administrativa
    WITH s5 AS (
        INSERT INTO public.setores (empresa_id, nome)
        VALUES (v_empresa_id, 'Recursos Humanos')
        RETURNING id
    )
    INSERT INTO public.setores_diretorias (empresa_id, setor_id, diretoria_id)
    SELECT v_empresa_id, s5.id, v_dir_administrativa FROM s5;

    WITH s6 AS (
        INSERT INTO public.setores (empresa_id, nome)
        VALUES (v_empresa_id, 'Faturamento e Financeiro')
        RETURNING id
    )
    INSERT INTO public.setores_diretorias (empresa_id, setor_id, diretoria_id)
    SELECT v_empresa_id, s6.id, v_dir_administrativa FROM s6;

    WITH s7 AS (
        INSERT INTO public.setores (empresa_id, nome)
        VALUES (v_empresa_id, 'Suprimentos e Almoxarifado')
        RETURNING id
    )
    INSERT INTO public.setores_diretorias (empresa_id, setor_id, diretoria_id)
    SELECT v_empresa_id, s7.id, v_dir_administrativa FROM s7;

    -- Setor da Diretoria de Qualidade
    WITH s8 AS (
        INSERT INTO public.setores (empresa_id, nome)
        VALUES (v_empresa_id, 'Qualidade e Segurança do Paciente')
        RETURNING id
    )
    INSERT INTO public.setores_diretorias (empresa_id, setor_id, diretoria_id)
    SELECT v_empresa_id, s8.id, v_dir_qualidade FROM s8;

    RAISE NOTICE 'Setores criados: 8 (com vínculos às diretorias)';

    RAISE NOTICE '=== Onboarding concluído com sucesso para empresa_id=% ===', v_empresa_id;

END $$;

-- =============================================================================
-- RESUMO DO QUE FOI CRIADO
-- Execute este SELECT após o DO $$ acima para confirmar os dados.
-- Substitua o CNPJ abaixo pelo CNPJ real do cliente.
-- =============================================================================

WITH empresa AS (
    SELECT id, nome, cnpj, plano, status, trial_ends_at, created_at
    FROM public.empresas
    WHERE cnpj = '00.000.000/0001-00'   -- << SUBSTITUIR pelo CNPJ real
    ORDER BY created_at DESC
    LIMIT 1
),
totais AS (
    SELECT
        e.id                                                    AS empresa_id,
        e.nome                                                  AS empresa_nome,
        e.cnpj,
        e.plano,
        e.status,
        e.trial_ends_at,
        e.created_at                                            AS empresa_criada_em,
        (SELECT count(*) FROM public.perfis p          WHERE p.empresa_id = e.id) AS qtd_perfis,
        (SELECT count(*) FROM public.permissoes_usuario_modulo pm WHERE pm.empresa_id = e.id) AS qtd_permissoes,
        (SELECT count(*) FROM public.diretorias d      WHERE d.empresa_id = e.id) AS qtd_diretorias,
        (SELECT count(*) FROM public.setores s         WHERE s.empresa_id = e.id) AS qtd_setores,
        (SELECT count(*) FROM public.setores_diretorias sd WHERE sd.empresa_id = e.id) AS qtd_vinculos_setor_diretoria
    FROM empresa e
)
SELECT
    empresa_id,
    empresa_nome,
    cnpj,
    plano,
    status,
    trial_ends_at,
    empresa_criada_em,
    qtd_perfis          AS "Perfis criados",
    qtd_permissoes      AS "Permissões criadas",
    qtd_diretorias      AS "Diretorias criadas",
    qtd_setores         AS "Setores criados",
    qtd_vinculos_setor_diretoria AS "Vínculos setor-diretoria"
FROM totais;

-- Detalhamento: perfis da empresa
SELECT
    p.id,
    p.nome,
    p.cargo,
    p.perfil_acesso,
    p.ativo,
    u.email
FROM public.perfis p
JOIN auth.users u ON u.id = p.user_id
WHERE p.empresa_id = (
    SELECT id FROM public.empresas WHERE cnpj = '00.000.000/0001-00' -- << SUBSTITUIR
    ORDER BY created_at DESC LIMIT 1
);

-- Detalhamento: estrutura organizacional
SELECT
    d.nome AS diretoria,
    s.nome AS setor
FROM public.setores_diretorias sd
JOIN public.diretorias d ON d.id = sd.diretoria_id
JOIN public.setores    s ON s.id = sd.setor_id
WHERE sd.empresa_id = (
    SELECT id FROM public.empresas WHERE cnpj = '00.000.000/0001-00' -- << SUBSTITUIR
    ORDER BY created_at DESC LIMIT 1
)
ORDER BY d.nome, s.nome;

-- =============================================================================
-- INSTRUCOES DE REVERSÃO (rollback manual)
-- =============================================================================
--
-- Se precisar desfazer o onboarding, substitua <empresa_id> pelo UUID gerado
-- e execute cada comando na ordem abaixo:
--
--   BEGIN;
--
--   DELETE FROM public.setores_diretorias      WHERE empresa_id = '<empresa_id>';
--   DELETE FROM public.setores                 WHERE empresa_id = '<empresa_id>';
--   DELETE FROM public.diretorias              WHERE empresa_id = '<empresa_id>';
--   DELETE FROM public.permissoes_usuario_modulo WHERE empresa_id = '<empresa_id>';
--   DELETE FROM public.perfis                  WHERE empresa_id = '<empresa_id>';
--   DELETE FROM public.empresas                WHERE id = '<empresa_id>';
--
--   -- Remover o usuário auth (fora de transação, pois auth é schema separado):
--   -- DELETE FROM auth.users WHERE id = '<admin_user_id>';
--   -- OU via Dashboard: Authentication > Users > selecionar > Delete
--
--   COMMIT;
--
-- =============================================================================
