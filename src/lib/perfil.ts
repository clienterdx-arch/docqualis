import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type PerfilRecord = Record<string, any>;

export async function carregarPerfilUsuario<T extends PerfilRecord = PerfilRecord>(
  session: Session | null,
  select = "id, empresa_id, nome, cargo, setor, perfil_acesso, ativo"
): Promise<T | null> {
  if (!session?.user?.id) return null;

  const userId = session.user.id;
  const userEmail = session.user.email ?? "";

  const { data, error } = await supabase
    .from("perfis")
    .select(select)
    .eq("id", userId)
    .eq("ativo", true)
    .maybeSingle();

  if (!error && data) {
    return data as T;
  }

  if (userEmail) {
    const { data: perfilPorEmail, error: erroEmail } = await supabase
      .from("perfis")
      .select(select)
      .eq("email", userEmail)
      .eq("ativo", true)
      .maybeSingle();

    if (!erroEmail && perfilPorEmail) {
      return perfilPorEmail as T;
    }
  }

  return null;
}