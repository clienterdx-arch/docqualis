import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";

type WorkflowStatus =
  | "EM_ELABORACAO"
  | "EM_VERIFICACAO"
  | "REPOSITORIO"
  | "OBSOLETO";

type ProcessRecord = {
  id: string;
  code: string;
  name: string;
  owner: string;
  reviewer?: string | null;
  approver?: string | null;
  workflowComment?: string | null;
  status: WorkflowStatus;
  module: "BPMN";
  nodes: unknown[];
  edges: unknown[];
};

type Params = {
  params: Promise<{ id: string }>;
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

function mapProcess(row: ProcessoRow): ProcessRecord {
  return {
    id: readText(row, "id"),
    code: readText(row, "codigo", "PROC"),
    name: readText(row, "nome", "Processo sem nome"),
    owner: readText(row, "dono", "Responsavel nao definido"),
    reviewer: readText(row, "revisor") || null,
    approver: readText(row, "aprovador") || null,
    workflowComment: readText(row, "comentario_fluxo") || null,
    status: normalizeWorkflowStatus(readText(row, "status")),
    module: "BPMN",
    nodes: [],
    edges: [],
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

export async function GET(_: Request, { params }: Params) {
  try {
    const { id } = await params;
    const { supabase, empresaId } = await resolveEmpresaId();

    if (!empresaId) {
      return NextResponse.json({ error: "Empresa nao identificada." }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("processos")
      .select("*")
      .eq("empresa_id", empresaId)
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Processo nao encontrado." }, { status: 404 });
    }

    return NextResponse.json(mapProcess(data as ProcessoRow), { status: 200 });
  } catch (error) {
    console.error("[GET /api/processos/[id]]", error);
    return NextResponse.json({ error: "Erro ao buscar processo." }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { supabase, empresaId } = await resolveEmpresaId();

    if (!empresaId) {
      return NextResponse.json({ error: "Empresa nao identificada." }, { status: 403 });
    }

    let status: WorkflowStatus = "EM_ELABORACAO";

    if (body?.action === "submit") status = "EM_VERIFICACAO";
    if (body?.action === "approve") status = "REPOSITORIO";
    if (body?.action === "reject") status = "EM_ELABORACAO";
    if (body?.action === "archive") status = "OBSOLETO";
    if (body?.action === "restore") status = "REPOSITORIO";
    if (body?.action === "save") {
      status =
        body?.status === "EM_VERIFICACAO" ||
        body?.status === "REPOSITORIO" ||
        body?.status === "OBSOLETO"
          ? body.status
          : "EM_ELABORACAO";
    }

    const { data, error } = await supabase
      .from("processos")
      .update({
        codigo: typeof body?.code === "string" ? body.code : undefined,
        nome: typeof body?.name === "string" ? body.name : undefined,
        dono: typeof body?.owner === "string" ? body.owner : undefined,
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("empresa_id", empresaId)
      .eq("id", id)
      .select("*")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Processo nao encontrado." }, { status: 404 });
    }

    return NextResponse.json(mapProcess(data as ProcessoRow), { status: 200 });
  } catch (error) {
    console.error("[PATCH /api/processos/[id]]", error);
    return NextResponse.json({ error: "Erro ao atualizar processo." }, { status: 500 });
  }
}
