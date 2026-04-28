import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type PerfilRecord = Record<string, any>;

async function buscarEmpresaPadrao() {
  const tabelas = ["empresas", "empresa"];

  for (const tabela of tabelas) {
    const { data, error } = await supabase
      .from(tabela)
      .select("id, nome, cnpj, logo_url")
      .limit(2);

    if (!error && data?.length === 1) return data[0];
  }

  return null;
}

async function aplicarEmpresaFallback<T extends PerfilRecord>(perfil: T | null): Promise<T | null> {
  if (perfil?.empresa_id) return perfil;

  const empresa = await buscarEmpresaPadrao();
  if (!empresa?.id) return perfil;

  return {
    ...(perfil ?? {}),
    empresa_id: empresa.id,
    empresa: perfil?.empresa ?? {
      nome: empresa.nome ?? "Empresa",
      cnpj: empresa.cnpj ?? "",
      logo_url: empresa.logo_url ?? null,
    },
  } as unknown as T;
}

export async function carregarPerfilUsuario<T extends PerfilRecord = PerfilRecord>(
  session: Session,
  select = "empresa_id, nome"
): Promise<T | null> {
  const lookupValues: Array<[string, string | undefined]> = [
    ["id", session.user.id],
    ["user_id", session.user.id],
    ["auth_user_id", session.user.id],
    ["email", session.user.email ?? undefined],
  ];

  for (const [column, value] of lookupValues) {
    if (!value) continue;

    const { data, error } = await supabase
      .from("perfis")
      .select(select)
      .eq(column, value)
      .limit(1);

    if (!error && data?.[0]) {
      return aplicarEmpresaFallback(data[0] as unknown as T);
    }
  }

  const { data, error } = await supabase
    .from("perfis")
    .select(select)
    .limit(2);

  if (!error && data?.length === 1) {
    return aplicarEmpresaFallback(data[0] as unknown as T);
  }

  return aplicarEmpresaFallback<T>(null);
}
