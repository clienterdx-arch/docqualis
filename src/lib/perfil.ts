import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type PerfilRecord = Record<string, any>;

export async function carregarPerfilUsuario<T extends PerfilRecord = PerfilRecord>(
  session: Session | null,
  select = "id, empresa_id, nome, cargo, setor, perfil_acesso, ativo"
): Promise<T | null> {
  if (!session?.user?.id) return null;

  const userId = session.user.id;
  const userEmail = session.user.email ?? undefined;
  let primeiroPerfilDoUsuario: T | null = null;

  const lookupValues: Array<[string, string | undefined]> = [
    ["id", userId],
    ["user_id", userId],
    ["auth_user_id", userId],
    ["usuario_id", userId],
    ["auth_id", userId],
    ["email", userEmail],
  ];

  for (const [column, value] of lookupValues) {
    if (!value) continue;

    const { data: perfisComEmpresa, error: erroComEmpresa } = await supabase
      .from("perfis")
      .select(select)
      .eq(column, value)
      .not("empresa_id", "is", null)
      .limit(1);

    if (!erroComEmpresa && perfisComEmpresa?.[0]) {
      return perfisComEmpresa[0] as unknown as T;
    }

    const { data: perfisDoUsuario, error: erroPerfil } = await supabase
      .from("perfis")
      .select(select)
      .eq(column, value)
      .limit(1);

    if (!erroPerfil && perfisDoUsuario?.[0] && !primeiroPerfilDoUsuario) {
      primeiroPerfilDoUsuario = perfisDoUsuario[0] as unknown as T;
    }
  }

  return primeiroPerfilDoUsuario;
}
