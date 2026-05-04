/**
 * POST /api/admin/empresa
 *
 * Cria uma nova empresa (tenant) com seu usuário administrador.
 * Usa a SERVICE ROLE KEY do Supabase para contornar RLS e criar
 * registros em nome do sistema (não de um usuário autenticado).
 *
 * Adicione ao .env.local:
 *   SUPABASE_SERVICE_ROLE_KEY=<chave service_role do Supabase Dashboard>
 *
 * Obs.: Esta rota SÓ deve ser acessível por super admins DocQualis.
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Cliente com service role — bypass total de RLS
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados.");
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const MODULOS = [
  "Gestão de Documentos",
  "Gestão de Processos",
  "Gestão de Riscos",
  "Ocorrências & Eventos",
  "Gestão de Registros",
  "Gestão de Indicadores",
  "Planej. Estratégico",
  "Configurações",
] as const;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { empresa, adminUser } = body as {
      empresa: { nome: string; cnpj: string; plano: string; logoUrl?: string };
      adminUser: { email: string; nome: string; cargo: string };
    };

    if (!empresa?.nome || !adminUser?.email) {
      return NextResponse.json({ error: "Dados obrigatórios ausentes." }, { status: 400 });
    }

    const supabase = getAdminClient();

    // ── 1. Criar a empresa ──────────────────────────────────────────────────
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 30); // 30 dias de trial

    const { data: empresaData, error: empresaError } = await supabase
      .from("empresas")
      .insert({
        nome: empresa.nome,
        cnpj: empresa.cnpj || null,
        logo_url: empresa.logoUrl || null,
        plano: empresa.plano || "trial",
        status: "ativo",
        trial_ends_at: empresa.plano === "trial" ? trialEndsAt.toISOString() : null,
      })
      .select("id")
      .single();

    if (empresaError) {
      console.error("[onboarding] Erro ao criar empresa:", empresaError);
      return NextResponse.json({ error: empresaError.message }, { status: 500 });
    }

    const empresaId = empresaData.id;

    // ── 2. Convidar o usuário admin via Supabase Auth ────────────────────────
    const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
      adminUser.email,
      {
        data: {
          empresa_id: empresaId,
          nome: adminUser.nome,
          cargo: adminUser.cargo,
        },
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/login`,
      }
    );

    if (inviteError) {
      // Rollback: remover a empresa criada
      await supabase.from("empresas").delete().eq("id", empresaId);
      console.error("[onboarding] Erro ao convidar usuário:", inviteError);
      return NextResponse.json({ error: inviteError.message }, { status: 500 });
    }

    const userId = inviteData.user.id;

    // ── 3. Criar o perfil do admin ───────────────────────────────────────────
    const { data: perfilData, error: perfilError } = await supabase
      .from("perfis")
      .insert({
        user_id: userId,
        empresa_id: empresaId,
        nome: adminUser.nome,
        cargo: adminUser.cargo,
        perfil_acesso: "ADMIN",
        ativo: true,
      })
      .select("id")
      .single();

    if (perfilError) {
      console.error("[onboarding] Erro ao criar perfil:", perfilError);
      // Continua mesmo com erro no perfil (o usuário consegue logar depois)
    }

    // ── 4. Criar permissões de administrador em todos os módulos ─────────────
    if (perfilData?.id) {
      const permissoes = MODULOS.map((modulo) => ({
        empresa_id: empresaId,
        perfil_id: perfilData.id,
        modulo,
        nivel: "administrar",
      }));

      await supabase.from("permissoes_usuario_modulo").insert(permissoes);
    }

    // ── 5. Criar estrutura padrão (diretorias e setores base) ────────────────
    const { data: dirData } = await supabase
      .from("diretorias")
      .insert([
        { empresa_id: empresaId, codigo: "DIR", nome: "Diretoria", descricao: "Diretoria Geral", status: "ativo" },
        { empresa_id: empresaId, codigo: "QUA", nome: "Qualidade e Segurança", descricao: "Gestão da Qualidade", status: "ativo" },
        { empresa_id: empresaId, codigo: "OPE", nome: "Operacional", descricao: "Área Operacional", status: "ativo" },
      ])
      .select("id, codigo");

    if (dirData) {
      const qualDir = dirData.find((d) => d.codigo === "QUA");
      const opeDir = dirData.find((d) => d.codigo === "OPE");

      await supabase.from("setores").insert([
        { empresa_id: empresaId, diretoria_id: qualDir?.id, codigo: "GQS", nome: "Gestão da Qualidade", status: "ativo" },
        { empresa_id: empresaId, diretoria_id: opeDir?.id, codigo: "OPE1", nome: "Operações", status: "ativo" },
      ]);
    }

    // ── Resposta ─────────────────────────────────────────────────────────────
    return NextResponse.json({
      success: true,
      empresaId,
      userId,
      message: `Empresa "${empresa.nome}" criada. Convite enviado para ${adminUser.email}.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro interno";
    console.error("[onboarding] Erro geral:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
