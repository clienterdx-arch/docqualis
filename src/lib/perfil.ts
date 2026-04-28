import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type PerfilRecord = Record<string, any>;

export async function carregarPerfilUsuario<T extends PerfilRecord = PerfilRecord>(
  session: Session,
  select = "empresa_id, nome"
): Promise<T | null> {
  const lookupValues: Array<[string, string | undefined]> = [
    ["id", session.user.id],
    ["user_id", session.user.id],
    ["auth_user_id", session.user.id],
    ["usuario_id", session.user.id],
    ["auth_id", session.user.id],
    ["email", session.user.email ?? undefined],
  ];

  for (const [column, value] of lookupValues) {
    if (!value) continue;

    const { data: perfilComEmpresa, error: erroPerfilComEmpresa } = await supabase
      .from("perfis")
      .select(select)
      .eq(column, value)
      .not("empresa_id", "is", null)
      .limit(1);

    if (!erroPerfilComEmpresa && perfilComEmpresa?.[0]) {
      return perfilComEmpresa[0] as unknown as T;
    }

    const { data, error } = await supabase
      .from("perfis")
      .select(select)
      .eq(column, value)
      .limit(1);

    if (!error && data?.[0]) {
      return data[0] as unknown as T;
    }
  }

  return null;
}
