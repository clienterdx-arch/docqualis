/**
 * Layout da área de administração DocQualis.
 * Usa o AppShell padrão — o acesso deve ser protegido
 * verificando perfil_acesso === "SUPER_ADMIN" no servidor.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

import type { ReactNode } from "react";
