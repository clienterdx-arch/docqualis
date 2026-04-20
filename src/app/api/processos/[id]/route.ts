import { NextResponse } from "next/server";

type WorkflowStatus =
  | "EM_ELABORACAO"
  | "EM_VERIFICACAO"
  | "REPOSITORIO"
  | "OBSOLETO";

type Lane = {
  id: string;
  label: string;
};

type Phase = {
  id: string;
  label: string;
};

type BpmnNodeType =
  | "pool"
  | "start"
  | "end"
  | "task"
  | "gateway"
  | "timer"
  | "document"
  | "data"
  | "annotation";

type BpmnNode = {
  id: string;
  type: BpmnNodeType;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  zIndex: number;
  lanes?: Lane[];
  phases?: Phase[];
};

type BpmnEdge = {
  id: string;
  from: string;
  to: string;
  type: "solid" | "dashed";
  label?: string;
};

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
  nodes: BpmnNode[];
  edges: BpmnEdge[];
};

const MOCK_PROCESS: ProcessRecord = {
  id: "1",
  code: "FLX-001",
  name: "Fluxo de Admissão",
  owner: "Qualidade",
  reviewer: "Supervisor",
  approver: "Gestor",
  workflowComment: "",
  status: "EM_ELABORACAO",
  module: "BPMN",
  nodes: [],
  edges: [],
};

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: Params) {
  try {
    const { id } = await params;

    return NextResponse.json(
      {
        ...MOCK_PROCESS,
        id,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[GET /api/processos/[id]]", error);
    return NextResponse.json(
      { error: "Erro ao buscar processo." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

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

    return NextResponse.json(
      {
        id,
        code: body?.code || "FLX-001",
        name: body?.name || "Fluxo de Admissão",
        owner: body?.owner || "Qualidade",
        reviewer: body?.reviewer || "",
        approver: body?.approver || "",
        workflowComment: body?.workflowComment || "",
        status,
        module: "BPMN",
        nodes: Array.isArray(body?.nodes) ? body.nodes : [],
        edges: Array.isArray(body?.edges) ? body.edges : [],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[PATCH /api/processos/[id]]", error);
    return NextResponse.json(
      { error: "Erro ao atualizar processo." },
      { status: 500 }
    );
  }
}