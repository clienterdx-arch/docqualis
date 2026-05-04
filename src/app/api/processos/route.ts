import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";

type WorkflowStatus =
  | "EM_ELABORACAO"
  | "EM_VERIFICACAO"
  | "REPOSITORIO"
  | "OBSOLETO";

type ProcessoItem = {
  id: string;
  code: string;
  name: string;
  owner: string;
  version: number;
  module: "SIPOC" | "BPMN";
  status: WorkflowStatus;
  updatedAt: string;
};

type ProcessoRow = Record<string, unknown>;

function readText(row: ProcessoRow, key: string, fallback = "") {
  const value = row[key];
  return typeof value === "string" ? value : fallback;
}

function normalizeWorkflowStatus(status: string): WorkflowStatus {
  const normalized = status
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, "_");

  if (normalized === "OBSOLETO" || normalized === "ARQUIVADO") return "OBSOLETO";
  if (normalized === "EM_VERIFICACAO" || normalized === "EM_REVISAO") return "EM_VERIFICACAO";
  if (normalized === "REPOSITORIO" || normalized === "APROVADO" || normalized === "ATIVO") return "REPOSITORIO";
  return "EM_ELABORACAO";
}

function normalizeModule(value: string): "SIPOC" | "BPMN" {
  return value.toUpperCase().includes("SIPOC") ? "SIPOC" : "BPMN";
}

function mapProcesso(row: ProcessoRow): ProcessoItem {
  const classificacao = readText(row, "classificacao", "BPMN");
  const updatedAt = readText(row, "updated_at", readText(row, "created_at", new Date().toISOString()));

  return {
    id: readText(row, "id"),
    code: readText(row, "codigo", "PROC"),
    name: readText(row, "nome", "Processo sem nome"),
    owner: readText(row, "dono", "Responsavel nao definido"),
    version: Number(row.versao ?? 1) || 1,
    module: normalizeModule(classificacao),
    status: normalizeWorkflowStatus(readText(row, "status")),
    updatedAt,
  };
}

async function resolveEmpresaId() {
  const supabase = await createSupabaseServer();
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;

  if (!session?.user?.id) return { supabase, empresaId: null };

  const userId = session.user.id;
  const userEmail = session.user.email ?? "";
  const lookups: Array<[string, string]> = [
    ["id", userId],
    ["user_id", userId],
    ["auth_user_id", userId],
    ["usuario_id", userId],
    ["auth_id", userId],
  ];
  if (userEmail) lookups.push(["email", userEmail]);

  for (const [column, value] of lookups) {
    const { data } = await supabase
      .from("perfis")
      .select("empresa_id")
      .eq(column, value)
      .not("empresa_id", "is", null)
      .limit(1);

    const empresaId = data?.[0]?.empresa_id;
    if (typeof empresaId === "string" && empresaId) {
      return { supabase, empresaId };
    }
  }

  return { supabase, empresaId: null };
}

export async function GET() {
  try {
    const { supabase, empresaId } = await resolveEmpresaId();

    if (!empresaId) {
      return NextResponse.json([], { status: 200 });
    }

    const { data, error } = await supabase
      .from("processos")
      .select("id,codigo,nome,dono,classificacao,status,updated_at,created_at")
      .eq("empresa_id", empresaId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("[GET /api/processos]", error);
      return NextResponse.json([], { status: 200 });
    }

    return NextResponse.json((data ?? []).map((row) => mapProcesso(row as ProcessoRow)), { status: 200 });
  } catch (error) {
    console.error("[GET /api/processos]", error);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, empresaId } = await resolveEmpresaId();
    if (!empresaId) {
      return NextResponse.json({ error: "Empresa nao identificada." }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const processModule: "SIPOC" | "BPMN" = body?.module === "SIPOC" ? "SIPOC" : "BPMN";
    const prefix = processModule === "BPMN" ? "FLX" : "SIPOC";
    const timestamp = Date.now();

    const { data, error } = await supabase
      .from("processos")
      .insert({
        empresa_id: empresaId,
        codigo: `${prefix}-${String(timestamp).slice(-6)}`,
        nome: processModule === "BPMN" ? `Nova Modelagem BPMN ${timestamp}` : `Novo SIPOC ${timestamp}`,
        dono: "Responsavel da area",
        classificacao: processModule,
        status: "EM_ELABORACAO",
      })
      .select("id,codigo,nome,dono,classificacao,status,updated_at,created_at")
      .single();

    if (error) {
      console.error("[POST /api/processos]", error);
      return NextResponse.json({ error: "Erro ao criar processo." }, { status: 500 });
    }

    return NextResponse.json(mapProcesso(data as ProcessoRow), { status: 201 });
  } catch (error) {
    console.error("[POST /api/processos]", error);
    return NextResponse.json({ error: "Erro ao criar processo." }, { status: 500 });
  }
}
