import { NextResponse } from "next/server";

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

const MOCK_PROCESSOS: ProcessoItem[] = [
  {
    id: "1",
    code: "FLX-001",
    name: "Fluxo de Admissão",
    owner: "Qualidade",
    version: 1,
    module: "BPMN",
    status: "REPOSITORIO",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "2",
    code: "FLX-002",
    name: "Fluxo de Alta Hospitalar",
    owner: "Enfermagem",
    version: 1,
    module: "BPMN",
    status: "EM_ELABORACAO",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "3",
    code: "PRC-001",
    name: "SIPOC de Atendimento",
    owner: "NQSP",
    version: 1,
    module: "SIPOC",
    status: "EM_VERIFICACAO",
    updatedAt: new Date().toISOString(),
  },
];

export async function GET() {
  try {
    return NextResponse.json(MOCK_PROCESSOS, { status: 200 });
  } catch (error) {
    console.error("[GET /api/processos]", error);
    return NextResponse.json(
      { error: "Erro ao buscar processos." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    const module: "SIPOC" | "BPMN" =
      body?.module === "SIPOC" ? "SIPOC" : "BPMN";

    const prefix = module === "BPMN" ? "FLX" : "PRC";

    const novo: ProcessoItem = {
      id: String(Date.now()),
      code: `${prefix}-${Math.floor(100 + Math.random() * 900)}`,
      name: module === "BPMN" ? "Nova Modelagem BPMN" : "Novo SIPOC",
      owner: "Responsável da Área",
      version: 1,
      module,
      status: "EM_ELABORACAO",
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json(novo, { status: 201 });
  } catch (error) {
    console.error("[POST /api/processos]", error);
    return NextResponse.json(
      { error: "Erro ao criar processo." },
      { status: 500 }
    );
  }
}