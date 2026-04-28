"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState, Suspense } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  CheckCheck,
  CheckCircle2,
  Circle,
  Clock3,
  Copy,
  Diamond,
  Download,
  FileStack,
  FileText,
  GitBranch,
  Grip,
  Hand,
  Info,
  Keyboard,
  Layers,
  Maximize2,
  MousePointer2,
  Network,
  Plus,
  Redo,
  Save,
  Send,
  Sparkles,
  SplitSquareHorizontal,
  SplitSquareVertical,
  Square,
  Trash2,
  Type,
  Undo,
  Workflow,
  X,
  XCircle,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

/* ──────────────────────────────────────────────────────────────────────────────
 * TYPES
 * ────────────────────────────────────────────────────────────────────────────*/

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

type ConnectorType = "solid" | "dashed";

type WorkflowStatus =
  | "EM_ELABORACAO"
  | "EM_VERIFICACAO"
  | "REPOSITORIO"
  | "OBSOLETO";

type ResizeDirection =
  | "n"
  | "s"
  | "e"
  | "w"
  | "ne"
  | "nw"
  | "se"
  | "sw";

type Lane = {
  id: string;
  label: string;
};

type Phase = {
  id: string;
  label: string;
};

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
  type: ConnectorType;
  label?: string;
};

type ProcessRecord = {
  id?: string;
  code?: string;
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

type ToastType = "success" | "error" | "info" | "warning";
type ToastItem = {
  id: string;
  type: ToastType;
  message: string;
};

type InteractionMode =
  | "idle"
  | "drag"
  | "resize"
  | "connect"
  | "reconnect"
  | "select"
  | "pan";

type HistoryEntry = {
  nodes: BpmnNode[];
  edges: BpmnEdge[];
};

type SelectionRect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

type PanState = {
  x: number;
  y: number;
};

type TempLine = {
  path: string;
};

type InteractionRef = {
  mode: InteractionMode;
  dragIds: string[];
  dragStart: { x: number; y: number };
  dragInitial: Record<string, { x: number; y: number }>;
  resizeId: string;
  resizeDir: ResizeDirection;
  resizeStart: { x: number; y: number };
  resizeInitialNode: BpmnNode | null;
  connectFromId: string;
  reconnectEdgeId: string;
  reconnectEnd: "from" | "to";
  selectStart: { x: number; y: number };
  panStartClient: { x: number; y: number };
  panInitial: PanState;
  tempWorld: { x: number; y: number };
  pointerId: number | null;
  rafPending: boolean;
  moved: boolean;
};

/* ──────────────────────────────────────────────────────────────────────────────
 * HELPERS & CONFIGS
 * ────────────────────────────────────────────────────────────────────────────*/

const NODE_ICONS: Record<BpmnNodeType, React.ElementType> = {
  pool: Layers,
  start: Circle,
  end: Circle,
  task: Square,
  gateway: Diamond,
  timer: Clock3,
  document: FileText,
  data: FileStack,
  annotation: Type,
};

function cn(...items: Array<string | false | null | undefined>) {
  return items.filter(Boolean).join(" ");
}

function cloneNodes(nodes: BpmnNode[]) {
  return nodes.map((n) => ({
    ...n,
    lanes: n.lanes ? n.lanes.map((l) => ({ ...l })) : undefined,
    phases: n.phases ? n.phases.map((p) => ({ ...p })) : undefined,
  }));
}

function cloneEdges(edges: BpmnEdge[]) {
  return edges.map((e) => ({ ...e }));
}

function genId(prefix = "id") {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function snap(value: number, grid = 10) {
  return Math.round(value / grid) * grid;
}

function getBounds(node: BpmnNode) {
  return {
    left: node.x - node.w / 2,
    top: node.y - node.h / 2,
    right: node.x + node.w / 2,
    bottom: node.y + node.h / 2,
  };
}

function rectsIntersect(
  a: SelectionRect,
  b: { left: number; top: number; right: number; bottom: number }
) {
  return !(a.x + a.w < b.left || a.x > b.right || a.y + a.h < b.top || a.y > b.bottom);
}

function getAnchorPoint(node: BpmnNode, tx: number, ty: number) {
  const dx = tx - node.x;
  const dy = ty - node.y;
  
  if (Math.abs(dx) > Math.abs(dy)) {
    return {
      x: node.x + (dx > 0 ? node.w / 2 : -node.w / 2),
      y: node.y
    };
  } else {
    return {
      x: node.x,
      y: node.y + (dy > 0 ? node.h / 2 : -node.h / 2)
    };
  }
}

function orthogonalPath(start: { x: number; y: number }, end: { x: number; y: number }) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  
  if (Math.abs(dx) >= Math.abs(dy)) {
    const mx = start.x + dx / 2;
    return {
      path: `M ${start.x} ${start.y} L ${mx} ${start.y} L ${mx} ${end.y} L ${end.x} ${end.y}`,
      labelX: mx,
      labelY: start.y + dy / 2,
    };
  }

  const my = start.y + dy / 2;
  return {
    path: `M ${start.x} ${start.y} L ${start.x} ${my} L ${end.x} ${my} L ${end.x} ${end.y}`,
    labelX: start.x + dx / 2,
    labelY: my,
  };
}

function getEdgePath(edge: BpmnEdge, nodes: BpmnNode[]) {
  const from = nodes.find((n) => n.id === edge.from);
  const to = nodes.find((n) => n.id === edge.to);
  if (!from || !to) return null;

  const start = getAnchorPoint(from, to.x, to.y);
  const end = getAnchorPoint(to, from.x, from.y);
  return { ...orthogonalPath(start, end), start, end };
}

function statusLabel(status: WorkflowStatus) {
  const map: Record<WorkflowStatus, string> = {
    EM_ELABORACAO: "Em Elaboração",
    EM_VERIFICACAO: "Em Verificação",
    REPOSITORIO: "Repositório",
    OBSOLETO: "Obsoleto",
  };
  return map[status];
}

function statusClass(status: WorkflowStatus) {
  const map: Record<WorkflowStatus, string> = {
    EM_ELABORACAO: "bg-blue-50 text-blue-700 border-blue-200",
    EM_VERIFICACAO: "bg-amber-50 text-amber-700 border-amber-200",
    REPOSITORIO: "bg-emerald-50 text-emerald-700 border-emerald-200",
    OBSOLETO: "bg-slate-100 text-slate-600 border-slate-200",
  };
  return map[status];
}

function createNode(type: BpmnNodeType, x: number, y: number, zIndex: number): BpmnNode {
  const base = {
    id: genId("node"),
    x,
    y,
    zIndex,
  };

  switch (type) {
    case "pool":
      return {
        ...base,
        type: "pool",
        label: "Processo Principal",
        w: 1040,
        h: 420,
        lanes: [
          { id: genId("lane"), label: "Raia 1" },
          { id: genId("lane"), label: "Raia 2" },
        ],
        phases: [
          { id: genId("phase"), label: "Fase 1" },
          { id: genId("phase"), label: "Fase 2" },
        ],
      };
    case "start":
      return { ...base, type, label: "Início", w: 56, h: 56 };
    case "end":
      return { ...base, type, label: "Fim", w: 56, h: 56 };
    case "gateway":
      return { ...base, type, label: "Decisão", w: 82, h: 82 };
    case "timer":
      return { ...base, type, label: "Espera", w: 62, h: 62 };
    case "document":
      return { ...base, type, label: "Documento", w: 180, h: 84 };
    case "data":
      return { ...base, type, label: "Dados", w: 180, h: 74 };
    case "annotation":
      return { ...base, type, label: "Anotação", w: 240, h: 88 };
    case "task":
    default:
      return { ...base, type: "task", label: "Nova Atividade", w: 210, h: 78 };
  }
}

/* ──────────────────────────────────────────────────────────────────────────────
 * TOASTS
 * ────────────────────────────────────────────────────────────────────────────*/

function Toasts({
  items,
  remove,
}: {
  items: ToastItem[];
  remove: (id: string) => void;
}) {
  const iconMap: Record<ToastType, React.ReactNode> = {
    success: <CheckCheck className="w-4 h-4 text-emerald-600" />,
    error: <X className="w-4 h-4 text-red-600" />,
    info: <Info className="w-4 h-4 text-blue-600" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-600" />,
  };

  const bgMap: Record<ToastType, string> = {
    success: "bg-emerald-50 border-emerald-200 text-emerald-800",
    error: "bg-red-50 border-red-200 text-red-800",
    info: "bg-blue-50 border-blue-200 text-blue-800",
    warning: "bg-amber-50 border-amber-200 text-amber-800",
  };

  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
      {items.map((item) => (
        <div
          key={item.id}
          className={cn(
            "pointer-events-auto min-w-[280px] max-w-[360px] rounded-2xl border shadow-lg px-4 py-3 flex items-center gap-3",
            bgMap[item.type]
          )}
        >
          {iconMap[item.type]}
          <div className="text-sm font-bold flex-1">{item.message}</div>
          <button
            onClick={() => remove(item.id)}
            className="opacity-50 hover:opacity-100 transition-opacity"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────
 * MAIN COMPONENT
 * ────────────────────────────────────────────────────────────────────────────*/

function ProcessStudioContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const processId = searchParams.get("id");

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const worldRef = useRef<HTMLDivElement | null>(null);

  const [processData, setProcessData] = useState<ProcessRecord>({
    name: "Nova Modelagem BPMN",
    owner: "Responsável da Área",
    reviewer: "",
    approver: "",
    workflowComment: "",
    status: "EM_ELABORACAO",
    module: "BPMN",
    nodes: [],
    edges: [],
  });

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [copiedNodes, setCopiedNodes] = useState<BpmnNode[]>([]);
  const [connectorType, setConnectorType] = useState<ConnectorType>("solid");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<PanState>({ x: 120, y: 80 });
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(null);
  const [tempLine, setTempLine] = useState<TempLine | null>(null);
  const [promptIA, setPromptIA] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [spacePressed, setSpacePressed] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [historyPast, setHistoryPast] = useState<HistoryEntry[]>([]);
  const [historyFuture, setHistoryFuture] = useState<HistoryEntry[]>([]);

  const inter = useRef<InteractionRef>({
    mode: "idle",
    dragIds: [],
    dragStart: { x: 0, y: 0 },
    dragInitial: {},
    resizeId: "",
    resizeDir: "e",
    resizeStart: { x: 0, y: 0 },
    resizeInitialNode: null,
    connectFromId: "",
    reconnectEdgeId: "",
    reconnectEnd: "from",
    selectStart: { x: 0, y: 0 },
    panStartClient: { x: 0, y: 0 },
    panInitial: { x: 0, y: 0 },
    tempWorld: { x: 0, y: 0 },
    pointerId: null,
    rafPending: false,
    moved: false,
  });

  const nodes = processData.nodes;
  const edges = processData.edges;

  const selectedNodes = useMemo(
    () => nodes.filter((n) => selectedIds.includes(n.id)),
    [nodes, selectedIds]
  );

  const primaryNode = useMemo(
    () => selectedNodes[selectedNodes.length - 1] ?? null,
    [selectedNodes]
  );

  const sortedNodes = useMemo(
    () => [...nodes].sort((a, b) => a.zIndex - b.zIndex),
    [nodes]
  );

  const maxZ = useMemo(
    () => (nodes.length ? Math.max(...nodes.map((n) => n.zIndex)) : 0),
    [nodes]
  );

  const isReadOnly =
    processData.status === "EM_VERIFICACAO" ||
    processData.status === "REPOSITORIO";

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const pushHistory = useCallback((nextNodes: BpmnNode[], nextEdges: BpmnEdge[]) => {
    setHistoryPast((prev) => [
      ...prev.slice(-49),
      { nodes: cloneNodes(nextNodes), edges: cloneEdges(nextEdges) },
    ]);
    setHistoryFuture([]);
  }, []);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = genId("toast");
    setToasts((prev) => [...prev, { id, message, type }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const setNodes = useCallback((updater: (prev: BpmnNode[]) => BpmnNode[]) => {
    setProcessData((prev) => ({ ...prev, nodes: updater(prev.nodes) }));
  }, []);

  const setEdges = useCallback((updater: (prev: BpmnEdge[]) => BpmnEdge[]) => {
    setProcessData((prev) => ({ ...prev, edges: updater(prev.edges) }));
  }, []);

  const commitSnapshot = useCallback(
    (nextNodes: BpmnNode[], nextEdges: BpmnEdge[]) => {
      pushHistory(nodes, edges);
      setProcessData((prev) => ({
        ...prev,
        nodes: nextNodes,
        edges: nextEdges,
      }));
    },
    [nodes, edges, pushHistory]
  );

  const screenToWorld = useCallback(
    (clientX: number, clientY: number) => {
      const rect = viewportRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: (clientX - rect.left - pan.x) / zoom,
        y: (clientY - rect.top - pan.y) / zoom,
      };
    },
    [pan.x, pan.y, zoom]
  );

  const worldToScreen = useCallback(
    (x: number, y: number) => ({
      x: x * zoom + pan.x,
      y: y * zoom + pan.y,
    }),
    [zoom, pan.x, pan.y]
  );

  const focusAll = useCallback(() => {
    if (!nodes.length) {
      setZoom(1);
      setPan({ x: 120, y: 80 });
      return;
    }

    const padding = 120;
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return;

    const left = Math.min(...nodes.map((n) => getBounds(n).left)) - padding;
    const top = Math.min(...nodes.map((n) => getBounds(n).top)) - padding;
    const right = Math.max(...nodes.map((n) => getBounds(n).right)) + padding;
    const bottom = Math.max(...nodes.map((n) => getBounds(n).bottom)) + padding;

    const width = Math.max(300, right - left);
    const height = Math.max(200, bottom - top);

    const nextZoom = Math.max(
      0.35,
      Math.min(1.3, Math.min(rect.width / width, rect.height / height))
    );

    setZoom(nextZoom);
    setPan({
      x: rect.width / 2 - ((left + right) / 2) * nextZoom,
      y: rect.height / 2 - ((top + bottom) / 2) * nextZoom,
    });
  }, [nodes]);

  async function loadProcess() {
    if (!processId) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/processos/${processId}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Erro ao carregar processo.");

      const data = await res.json();

      setProcessData({
        id: data.id,
        code: data.code,
        name: data.name,
        owner: data.owner,
        reviewer: data.reviewer || "",
        approver: data.approver || "",
        workflowComment: data.workflowComment || "",
        status: data.status,
        module: "BPMN",
        nodes: Array.isArray(data.nodes) ? data.nodes : [],
        edges: Array.isArray(data.edges) ? data.edges : [],
      });

      setHistoryPast([]);
      setHistoryFuture([]);
    } catch (error) {
      console.error(error);
      toast("Erro ao carregar processo.", "error");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadProcess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processId]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if (e.code === "Space" && !typing) {
        e.preventDefault();
        setSpacePressed(true);
      }

      if (typing) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }

      if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "z")
      ) {
        e.preventDefault();
        handleRedo();
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
        e.preventDefault();
        setSelectedIds(nodes.map((n) => n.id));
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
        e.preventDefault();
        handleCopy();
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
        e.preventDefault();
        handlePaste();
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        handleDuplicate();
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveProcess();
      }

      if ((e.key === "Delete" || e.key === "Backspace") && selectedIds.length > 0) {
        e.preventDefault();
        handleDelete();
      }

      if (e.key === "Escape") {
        e.preventDefault();
        inter.current.mode = "idle";
        inter.current.pointerId = null;
        setSelectedIds([]);
        setSelectionRect(null);
        setTempLine(null);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") setSpacePressed(false);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [nodes, selectedIds, copiedNodes, historyPast, historyFuture]); // eslint-disable-line

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    function onWheel(e: WheelEvent) {
      const currentEl = viewportRef.current;
      if (!currentEl) return;

      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();

        const rect = currentEl.getBoundingClientRect();
        const cursorX = e.clientX - rect.left;
        const cursorY = e.clientY - rect.top;

        const worldX = (cursorX - pan.x) / zoom;
        const worldY = (cursorY - pan.y) / zoom;

        const nextZoom = Math.max(0.25, Math.min(2.2, zoom + (e.deltaY > 0 ? -0.08 : 0.08)));

        setZoom(nextZoom);
        setPan({
          x: cursorX - worldX * nextZoom,
          y: cursorY - worldY * nextZoom,
        });
        return;
      }

      if (spacePressed || e.shiftKey) {
        e.preventDefault();
        setPan((prev) => ({
          x: prev.x - e.deltaX,
          y: prev.y - e.deltaY,
        }));
      }
    }

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoom, pan, spacePressed]);

  const handleUndo = useCallback(() => {
    if (!historyPast.length) return;

    const last = historyPast[historyPast.length - 1];
    setHistoryPast((prev) => prev.slice(0, -1));
    setHistoryFuture((prev) => [{ nodes: cloneNodes(nodes), edges: cloneEdges(edges) }, ...prev]);
    setProcessData((prev) => ({
      ...prev,
      nodes: cloneNodes(last.nodes),
      edges: cloneEdges(last.edges),
    }));
    setSelectedIds([]);
    toast("Desfeito", "info");
  }, [historyPast, nodes, edges, toast]);

  const handleRedo = useCallback(() => {
    if (!historyFuture.length) return;

    const next = historyFuture[0];
    setHistoryFuture((prev) => prev.slice(1));
    setHistoryPast((prev) => [...prev, { nodes: cloneNodes(nodes), edges: cloneEdges(edges) }]);
    setProcessData((prev) => ({
      ...prev,
      nodes: cloneNodes(next.nodes),
      edges: cloneEdges(next.edges),
    }));
    setSelectedIds([]);
    toast("Refeito", "info");
  }, [historyFuture, nodes, edges, toast]);

  const addNodeToCanvas = useCallback(
    (type: BpmnNodeType, x?: number, y?: number) => {
      if (isReadOnly) return;

      const rect = viewportRef.current?.getBoundingClientRect();
      const centerWorld =
        rect && x === undefined && y === undefined
          ? screenToWorld(rect.left + rect.width / 2, rect.top + rect.height / 2)
          : { x: x ?? 320, y: y ?? 240 };

      const nextNode = createNode(type, snap(centerWorld.x), snap(centerWorld.y), maxZ + 1);
      const nextNodes = [...nodes, nextNode];
      commitSnapshot(nextNodes, edges);
      setSelectedIds([nextNode.id]);
    },
    [isReadOnly, screenToWorld, maxZ, nodes, edges, commitSnapshot]
  );

  const handleDelete = useCallback(() => {
    if (!selectedIds.length || isReadOnly) return;

    const nextNodes = nodes.filter((n) => !selectedSet.has(n.id));
    const nextEdges = edges.filter((e) => !selectedSet.has(e.from) && !selectedSet.has(e.to));
    commitSnapshot(nextNodes, nextEdges);
    setSelectedIds([]);
    toast("Elemento(s) excluído(s)", "info");
  }, [selectedIds, isReadOnly, nodes, edges, selectedSet, commitSnapshot, toast]);

  const handleCopy = useCallback(() => {
    if (!selectedNodes.length) return;
    setCopiedNodes(cloneNodes(selectedNodes));
    toast(`${selectedNodes.length} item(ns) copiado(s)`, "info");
  }, [selectedNodes, toast]);

  const handlePaste = useCallback(() => {
    if (!copiedNodes.length || isReadOnly) return;

    const newNodes = copiedNodes.map((node, index) => ({
      ...node,
      id: genId("node"),
      x: snap(node.x + 50 + index * 8),
      y: snap(node.y + 50 + index * 8),
      zIndex: maxZ + index + 1,
      lanes: node.lanes?.map((lane) => ({ ...lane, id: genId("lane") })),
      phases: node.phases?.map((phase) => ({ ...phase, id: genId("phase") })),
    }));

    const nextNodes = [...nodes, ...newNodes];
    commitSnapshot(nextNodes, edges);
    setSelectedIds(newNodes.map((n) => n.id));
    toast("Colado", "success");
  }, [copiedNodes, isReadOnly, maxZ, nodes, edges, commitSnapshot, toast]);

  const handleDuplicate = useCallback(() => {
    if (!selectedNodes.length || isReadOnly) return;

    const idMap = new Map<string, string>();

    const duplicatedNodes = selectedNodes.map((node, index) => {
      const id = genId("node");
      idMap.set(node.id, id);
      return {
        ...node,
        id,
        x: snap(node.x + 36 + index * 8),
        y: snap(node.y + 36 + index * 8),
        zIndex: maxZ + index + 1,
        lanes: node.lanes?.map((lane) => ({ ...lane, id: genId("lane") })),
        phases: node.phases?.map((phase) => ({ ...phase, id: genId("phase") })),
      };
    });

    const duplicatedEdges = edges
      .filter((edge) => selectedSet.has(edge.from) && selectedSet.has(edge.to))
      .map((edge) => ({
        ...edge,
        id: genId("edge"),
        from: idMap.get(edge.from)!,
        to: idMap.get(edge.to)!,
      }));

    commitSnapshot([...nodes, ...duplicatedNodes], [...edges, ...duplicatedEdges]);
    setSelectedIds(duplicatedNodes.map((n) => n.id));
    toast("Duplicado", "success");
  }, [selectedNodes, isReadOnly, maxZ, edges, selectedSet, nodes, commitSnapshot, toast]);

  const bringToFront = useCallback(() => {
    if (!selectedIds.length || isReadOnly) return;
    let z = maxZ + 1;
    const nextNodes = nodes.map((node) =>
      selectedSet.has(node.id) ? { ...node, zIndex: z++ } : node
    );
    commitSnapshot(nextNodes, edges);
  }, [selectedIds, isReadOnly, maxZ, nodes, selectedSet, commitSnapshot, edges]);

  const sendToBack = useCallback(() => {
    if (!selectedIds.length || isReadOnly) return;

    const front = nodes.filter((n) => selectedSet.has(n.id)).sort((a, b) => a.zIndex - b.zIndex);
    const others = nodes.filter((n) => !selectedSet.has(n.id)).sort((a, b) => a.zIndex - b.zIndex);

    const nextNodes = [...front, ...others].map((node, index) => ({
      ...node,
      zIndex: index + 1,
    }));

    commitSnapshot(nextNodes, edges);
  }, [selectedIds, isReadOnly, nodes, selectedSet, commitSnapshot, edges]);

  const addLane = useCallback(() => {
    if (!primaryNode || primaryNode.type !== "pool" || isReadOnly) return;
    const nextNodes = nodes.map((node) =>
      node.id === primaryNode.id
        ? {
            ...node,
            h: snap(node.h + 90),
            lanes: [...(node.lanes || []), { id: genId("lane"), label: `Raia ${(node.lanes?.length || 0) + 1}` }],
          }
        : node
    );
    commitSnapshot(nextNodes, edges);
  }, [primaryNode, isReadOnly, nodes, edges, commitSnapshot]);

  const removeLane = useCallback(() => {
    if (
      !primaryNode ||
      primaryNode.type !== "pool" ||
      isReadOnly ||
      (primaryNode.lanes?.length || 0) <= 1
    ) {
      return;
    }

    const nextNodes = nodes.map((node) =>
      node.id === primaryNode.id
        ? {
            ...node,
            h: snap(Math.max(200, node.h - 90)),
            lanes: (node.lanes || []).slice(0, -1),
          }
        : node
    );

    commitSnapshot(nextNodes, edges);
  }, [primaryNode, isReadOnly, nodes, edges, commitSnapshot]);

  const addPhase = useCallback(() => {
    if (!primaryNode || primaryNode.type !== "pool" || isReadOnly) return;
    const nextNodes = nodes.map((node) =>
      node.id === primaryNode.id
        ? {
            ...node,
            w: snap(node.w + 220),
            phases: [...(node.phases || []), { id: genId("phase"), label: `Fase ${(node.phases?.length || 0) + 1}` }],
          }
        : node
    );
    commitSnapshot(nextNodes, edges);
  }, [primaryNode, isReadOnly, nodes, edges, commitSnapshot]);

  const removePhase = useCallback(() => {
    if (
      !primaryNode ||
      primaryNode.type !== "pool" ||
      isReadOnly ||
      (primaryNode.phases?.length || 0) <= 1
    ) {
      return;
    }

    const nextNodes = nodes.map((node) =>
      node.id === primaryNode.id
        ? {
            ...node,
            w: snap(Math.max(360, node.w - 220)),
            phases: (node.phases || []).slice(0, -1),
          }
        : node
    );
    commitSnapshot(nextNodes, edges);
  }, [primaryNode, isReadOnly, nodes, edges, commitSnapshot]);

  const updatePrimaryLabel = useCallback(
    (value: string) => {
      if (!primaryNode || isReadOnly) return;
      setNodes((prev) =>
        prev.map((node) => (node.id === primaryNode.id ? { ...node, label: value } : node))
      );
    },
    [primaryNode, isReadOnly, setNodes]
  );

  const updatePrimarySize = useCallback(
    (field: "w" | "h", value: number) => {
      if (!primaryNode || isReadOnly || Number.isNaN(value)) return;
      setNodes((prev) =>
        prev.map((node) =>
          node.id === primaryNode.id
            ? { ...node, [field]: snap(Math.max(field === "w" ? 56 : 40, value)) }
            : node
        )
      );
    },
    [primaryNode, isReadOnly, setNodes]
  );

  const appendNodeFromSelection = useCallback(
    (type: BpmnNodeType) => {
      if (!primaryNode || isReadOnly) return;

      const newNode = createNode(
        type,
        snap(primaryNode.x + primaryNode.w / 2 + 200),
        snap(primaryNode.y),
        maxZ + 1
      );

      const newEdge: BpmnEdge = {
        id: genId("edge"),
        from: primaryNode.id,
        to: newNode.id,
        type: connectorType,
      };

      commitSnapshot([...nodes, newNode], [...edges, newEdge]);
      setSelectedIds([newNode.id]);
    },
    [primaryNode, isReadOnly, maxZ, connectorType, nodes, edges, commitSnapshot]
  );

  async function saveProcess() {
    if (!processId) {
      toast("Crie o processo antes de salvar.", "warning");
      return;
    }

    try {
      const res = await fetch(`/api/processos/${processId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          name: processData.name,
          owner: processData.owner,
          reviewer: processData.reviewer,
          approver: processData.approver,
          workflowComment: processData.workflowComment,
          nodes: processData.nodes,
          edges: processData.edges,
          status: processData.status,
        }),
      });

      if (!res.ok) throw new Error("Erro ao salvar");

      const data = await res.json();

      setProcessData((prev) => ({
        ...prev,
        ...data,
        nodes: Array.isArray(data.nodes) ? data.nodes : prev.nodes,
        edges: Array.isArray(data.edges) ? data.edges : prev.edges,
      }));

      toast("Fluxo salvo com sucesso.", "success");
    } catch (error) {
      console.error(error);
      toast("Erro ao salvar fluxo.", "error");
    }
  }

  async function workflowAction(action: "submit" | "approve" | "reject" | "archive" | "restore") {
    if (!processId) {
      toast("Esse fluxo ainda não está vinculado a um processo salvo.", "warning");
      return;
    }

    try {
      const res = await fetch(`/api/processos/${processId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          workflowComment: processData.workflowComment,
          reviewer: processData.reviewer,
          approver: processData.approver,
          nodes: processData.nodes,
          edges: processData.edges,
        }),
      });

      if (!res.ok) throw new Error("Erro no workflow");

      const data = await res.json();

      setProcessData((prev) => ({
        ...prev,
        ...data,
        nodes: Array.isArray(data.nodes) ? data.nodes : prev.nodes,
        edges: Array.isArray(data.edges) ? data.edges : prev.edges,
      }));

      toast("Workflow atualizado com sucesso.", "success");
    } catch (error) {
      console.error(error);
      toast("Erro ao atualizar workflow.", "error");
    }
  }

  function exportFlowToPrint() {
    const all = nodes;
    if (!all.length) {
      toast("Não há elementos para exportar.", "warning");
      return;
    }

    const left = Math.min(...all.map((n) => getBounds(n).left)) - 80;
    const top = Math.min(...all.map((n) => getBounds(n).top)) - 80;
    const right = Math.max(...all.map((n) => getBounds(n).right)) + 80;
    const bottom = Math.max(...all.map((n) => getBounds(n).bottom)) + 80;

    const width = Math.max(1400, right - left);
    const height = Math.max(900, bottom - top);

    const svgSource = document.getElementById("bpmn-export-svg")?.outerHTML || "";

    const html = `
      <html>
        <head>
          <title>${processData.name}</title>
          <style>
            * { box-sizing: border-box; }
            body { margin: 0; font-family: Arial, sans-serif; background: #fff; }
            .page { padding: 24px; }
            .header { margin-bottom: 18px; }
            .title { font-size: 22px; font-weight: 700; margin-bottom: 6px; color: #0f172a; }
            .meta { font-size: 12px; color: #475569; }
            .canvas {
              position: relative;
              width: ${width}px;
              height: ${height}px;
              overflow: hidden;
              border: 1px solid #e2e8f0;
              background-color: #f8fafc;
              background-image:
                linear-gradient(to right, rgba(148,163,184,0.12) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(148,163,184,0.12) 1px, transparent 1px);
              background-size: 24px 24px;
            }
            .node { position: absolute; }
            .task {
              background: white;
              border: 2px solid #2655e8;
              border-radius: 12px;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 8px 12px;
              font-weight: 700;
              color: #1e293b;
              text-align: center;
              box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            }
            .start {
              border-radius: 999px;
              border: 3px solid #10b981;
              background: #ecfdf5;
            }
            .end {
              border-radius: 999px;
              border: 3px solid #ef4444;
              background: #fef2f2;
            }
            .timer {
              border-radius: 999px;
              border: 3px solid #8b5cf6;
              background: #f5f3ff;
              display:flex; align-items:center; justify-content:center;
              font-weight:700; font-size:12px; color: #5b21b6;
            }
            .gateway {
              width: 100%;
              height: 100%;
              transform: rotate(45deg);
              border: 3px solid #f59e0b;
              background: #fffbeb;
              display:flex; align-items:center; justify-content:center;
            }
            .gateway-label {
              transform: rotate(-45deg);
              font-size: 10px;
              font-weight: 700;
              color: #92400e;
              text-align: center;
              max-width: 52px;
              line-height: 1.15;
            }
            .document {
              background: white;
              border: 2px solid #0ea5e9;
              border-radius: 8px;
              clip-path: polygon(0 0, 88% 0, 100% 22%, 100% 100%, 0 100%);
              display:flex; align-items:center; justify-content:center;
              padding: 8px 12px;
              text-align: center;
              font-weight:700; font-size:13px;
              color:#0f172a;
              box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            }
            .data {
              background: #ecfeff;
              border: 2px solid #0891b2;
              clip-path: polygon(10% 0, 100% 0, 90% 100%, 0 100%);
              display:flex; align-items:center; justify-content:center;
              padding: 8px 12px;
              text-align: center;
              font-weight:700; font-size:13px;
              color:#0f172a;
            }
            .annotation {
              background: #fefce8;
              border-left: 4px solid #eab308;
              border-radius: 0 8px 8px 0;
              display:flex; align-items:center;
              padding: 10px 12px;
              font-size: 12px;
              font-weight: 600;
              color:#0f172a;
            }
            .pool {
              background: white;
              border: 2px solid #cbd5e1;
              border-radius: 12px;
            }
            .pool-title {
              position:absolute; left:0; top:0; bottom:0; width:48px;
              background:#f8fafc; border-right:1px solid #cbd5e1;
              border-radius: 10px 0 0 10px;
              display:flex; align-items:center; justify-content:center;
            }
            .pool-title span {
              transform: rotate(-90deg);
              white-space: nowrap;
              font-weight: 700;
              color:#334155;
            }
            .phase-row {
              position:absolute; left:48px; right:0; top:0; height:36px;
              display:flex; background:#f8fafc; border-bottom:1px solid #cbd5e1;
              border-radius: 0 10px 0 0;
            }
            .phase-cell {
              flex:1; border-right:1px solid #cbd5e1;
              display:flex; align-items:center; justify-content:center;
              font-size:10px; font-weight:800; color:#64748b;
              text-transform:uppercase; letter-spacing:.08em;
            }
            .lane-wrap {
              position:absolute; left:48px; right:0; top:36px; bottom:0;
              display:flex; flex-direction:column;
            }
            .lane-row {
              flex:1; display:flex; border-bottom:1px solid #cbd5e1;
            }
            .lane-label {
              width:42px; background:#f8fafc; border-right:1px solid #e2e8f0;
              display:flex; align-items:center; justify-content:center;
            }
            .lane-label span {
              transform: rotate(-90deg);
              white-space: nowrap;
              font-size:10px; font-weight:800; color:#64748b;
              text-transform:uppercase; letter-spacing:.08em;
            }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="header">
              <div class="title">${processData.name}</div>
              <div class="meta">
                Responsável: ${processData.owner || "-"} |
                Status: ${statusLabel(processData.status)} |
                Código: ${processData.code || "-"}
              </div>
            </div>
            <div class="canvas">
              ${svgSource.replace("<svg", `<svg style="position:absolute;left:${-left}px;top:${-top}px;overflow:visible;"`)}
              ${nodes
                .slice()
                .sort((a, b) => a.zIndex - b.zIndex)
                .map((node) => {
                  const l = getBounds(node).left - left;
                  const t = getBounds(node).top - top;

                  if (node.type === "pool") {
                    const lanes = node.lanes || [];
                    const phases = node.phases || [];
                    return `
                      <div class="node pool" style="left:${l}px;top:${t}px;width:${node.w}px;height:${node.h}px;">
                        <div class="pool-title"><span>${node.label}</span></div>
                        ${
                          phases.length > 0
                            ? `<div class="phase-row">${phases
                                .map((p) => `<div class="phase-cell">${p.label}</div>`)
                                .join("")}</div>`
                            : ""
                        }
                        <div class="lane-wrap">
                          ${lanes
                            .map(
                              (lane) => `
                              <div class="lane-row">
                                <div class="lane-label"><span>${lane.label}</span></div>
                                <div style="flex:1"></div>
                              </div>`
                            )
                            .join("")}
                        </div>
                      </div>
                    `;
                  }

                  if (node.type === "gateway") {
                    return `
                      <div class="node" style="left:${l}px;top:${t}px;width:${node.w}px;height:${node.h}px;">
                        <div class="gateway"><div class="gateway-label">${node.label}</div></div>
                      </div>
                    `;
                  }

                  const classMap: Record<string, string> = {
                    task: "task",
                    start: "start",
                    end: "end",
                    timer: "timer",
                    document: "document",
                    data: "data",
                    annotation: "annotation",
                  };

                  return `
                    <div class="node ${classMap[node.type] || "task"}"
                      style="left:${l}px;top:${t}px;width:${node.w}px;height:${node.h}px;">
                      ${node.type === "start" || node.type === "end" ? "" : node.label}
                    </div>
                    ${
                      node.type === "start" || node.type === "end" || node.type === "timer"
                        ? `<div style="position:absolute;left:${l - 20}px;top:${t + node.h + 8}px;font-size:10px;font-weight:700;color:#475569;white-space:nowrap;">${node.label}</div>`
                        : ""
                    }
                  `;
                })
                .join("")}
            </div>
          </div>
          <script>window.onload = () => setTimeout(() => window.print(), 350)</script>
        </body>
      </html>
    `;

    const win = window.open("", "_blank", "width=1440,height=940");
    if (!win) return;
    win.document.write(html);
    win.document.close();
  }

  function generateByAI(e: React.FormEvent) {
    e.preventDefault();
    if (!promptIA.trim() || isReadOnly) return;

    setIsGenerating(true);

    window.setTimeout(() => {
      const baseZ = 1;
      const generatedNodes: BpmnNode[] = [
        { ...createNode("start", 180, 220, baseZ + 1), label: "Início" },
        { ...createNode("task", 420, 220, baseZ + 2), label: "Receber solicitação" },
        { ...createNode("gateway", 680, 220, baseZ + 3), label: "Atende critério?" },
        { ...createNode("task", 960, 120, baseZ + 4), label: "Encaminhar prioridade" },
        { ...createNode("task", 960, 320, baseZ + 5), label: "Seguir fluxo padrão" },
        { ...createNode("end", 1220, 120, baseZ + 6), label: "Fim" },
        { ...createNode("end", 1220, 320, baseZ + 7), label: "Fim" },
      ];

      const generatedEdges: BpmnEdge[] = [
        { id: genId("edge"), from: generatedNodes[0].id, to: generatedNodes[1].id, type: "solid" },
        { id: genId("edge"), from: generatedNodes[1].id, to: generatedNodes[2].id, type: "solid" },
        { id: genId("edge"), from: generatedNodes[2].id, to: generatedNodes[3].id, type: "solid", label: "Sim" },
        { id: genId("edge"), from: generatedNodes[2].id, to: generatedNodes[4].id, type: "dashed", label: "Não" },
        { id: genId("edge"), from: generatedNodes[3].id, to: generatedNodes[5].id, type: "solid" },
        { id: genId("edge"), from: generatedNodes[4].id, to: generatedNodes[6].id, type: "solid" },
      ];

      commitSnapshot(generatedNodes, generatedEdges);
      setSelectedIds([]);
      setPromptIA("");
      setIsGenerating(false);
      focusAll();
      toast("Fluxo gerado pela IA.", "success");
    }, 1300);
  }

  function finishInteraction() {
    inter.current.mode = "idle";
    inter.current.pointerId = null;
    inter.current.rafPending = false;
    setSelectionRect(null);
    setTempLine(null);
  }

  function updateTempConnectionPath(worldPoint: { x: number; y: number }) {
    const mode = inter.current.mode;

    if (mode === "connect") {
      const fromNode = nodes.find((n) => n.id === inter.current.connectFromId);
      if (!fromNode) {
        setTempLine(null);
        return;
      }

      const start = getAnchorPoint(fromNode, worldPoint.x, worldPoint.y);
      const { path } = orthogonalPath(start, worldPoint);
      setTempLine({ path });
      return;
    }

    if (mode === "reconnect") {
      const edge = edges.find((e) => e.id === inter.current.reconnectEdgeId);
      if (!edge) {
        setTempLine(null);
        return;
      }

      const fixedId = inter.current.reconnectEnd === "from" ? edge.to : edge.from;
      const fixedNode = nodes.find((n) => n.id === fixedId);
      if (!fixedNode) {
        setTempLine(null);
        return;
      }

      if (inter.current.reconnectEnd === "from") {
        const end = getAnchorPoint(fixedNode, worldPoint.x, worldPoint.y);
        const { path } = orthogonalPath(worldPoint, end);
        setTempLine({ path });
      } else {
        const start = getAnchorPoint(fixedNode, worldPoint.x, worldPoint.y);
        const { path } = orthogonalPath(start, worldPoint);
        setTempLine({ path });
      }
    }
  }

  function processMoveFrame() {
    inter.current.rafPending = false;
    const mode = inter.current.mode;
    const temp = inter.current.tempWorld;

    if (mode === "drag") {
      const dx = temp.x - inter.current.dragStart.x;
      const dy = temp.y - inter.current.dragStart.y;

      setNodes((prev) =>
        prev.map((node) => {
          if (!inter.current.dragIds.includes(node.id)) return node;
          const init = inter.current.dragInitial[node.id];
          return {
            ...node,
            x: snap(init.x + dx),
            y: snap(init.y + dy),
          };
        })
      );
      return;
    }

    if (mode === "resize") {
      const { resizeId, resizeDir, resizeInitialNode, resizeStart } = inter.current;
      if (!resizeInitialNode) return;

      const dx = temp.x - resizeStart.x;
      const dy = temp.y - resizeStart.y;

      setNodes((prev) =>
        prev.map((node) => {
          if (node.id !== resizeId) return node;

          let w = resizeInitialNode.w;
          let h = resizeInitialNode.h;
          let x = resizeInitialNode.x;
          let y = resizeInitialNode.y;

          if (resizeDir.includes("e")) {
            w = Math.max(56, snap(resizeInitialNode.w + dx));
            x = resizeInitialNode.x + (w - resizeInitialNode.w) / 2;
          }
          if (resizeDir.includes("s")) {
            h = Math.max(40, snap(resizeInitialNode.h + dy));
            y = resizeInitialNode.y + (h - resizeInitialNode.h) / 2;
          }
          if (resizeDir.includes("w")) {
            w = Math.max(56, snap(resizeInitialNode.w - dx));
            x = resizeInitialNode.x - (w - resizeInitialNode.w) / 2;
          }
          if (resizeDir.includes("n")) {
            h = Math.max(40, snap(resizeInitialNode.h - dy));
            y = resizeInitialNode.y - (h - resizeInitialNode.h) / 2;
          }

          return { ...node, w, h, x: snap(x), y: snap(y) };
        })
      );
      return;
    }

    if (mode === "select") {
      const x = Math.min(inter.current.selectStart.x, temp.x);
      const y = Math.min(inter.current.selectStart.y, temp.y);
      const w = Math.abs(temp.x - inter.current.selectStart.x);
      const h = Math.abs(temp.y - inter.current.selectStart.y);

      const rect = { x, y, w, h };
      setSelectionRect(rect);

      const inside = nodes
        .filter((node) => rectsIntersect(rect, getBounds(node)))
        .map((node) => node.id);

      setSelectedIds(inside);
      return;
    }

    if (mode === "connect" || mode === "reconnect") {
      updateTempConnectionPath(temp);
      return;
    }

    if (mode === "pan") {
      const nextPan = {
        x: inter.current.panInitial.x + (inter.current.tempWorld.x - inter.current.panStartClient.x),
        y: inter.current.panInitial.y + (inter.current.tempWorld.y - inter.current.panStartClient.y),
      };
      setPan(nextPan);
    }
  }

  function scheduleProcessMove() {
    if (inter.current.rafPending) return;
    inter.current.rafPending = true;
    requestAnimationFrame(processMoveFrame);
  }

  function onViewportPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest("[data-node]")) return;
    if ((e.target as HTMLElement).closest("[data-handle]")) return;
    if ((e.target as HTMLElement).closest("[data-edge-end]")) return;

    if (spacePressed || e.button === 1) {
      inter.current.mode = "pan";
      inter.current.pointerId = e.pointerId;
      inter.current.panStartClient = { x: e.clientX, y: e.clientY };
      inter.current.tempWorld = { x: e.clientX, y: e.clientY };
      inter.current.panInitial = pan;
      viewportRef.current?.setPointerCapture(e.pointerId);
      return;
    }

    if (isReadOnly) {
      setSelectedIds([]);
      return;
    }

    const p = screenToWorld(e.clientX, e.clientY);
    inter.current.mode = "select";
    inter.current.pointerId = e.pointerId;
    inter.current.selectStart = p;
    inter.current.tempWorld = p;
    inter.current.moved = false;
    setSelectedIds([]);
    setSelectionRect({ x: p.x, y: p.y, w: 0, h: 0 });
    viewportRef.current?.setPointerCapture(e.pointerId);
  }

  function onViewportPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (inter.current.mode === "idle") return;

    if (inter.current.mode === "pan") {
      inter.current.tempWorld = { x: e.clientX, y: e.clientY };
      inter.current.moved = true;
      scheduleProcessMove();
      return;
    }

    const world = screenToWorld(e.clientX, e.clientY);
    inter.current.tempWorld = world;
    inter.current.moved = true;
    scheduleProcessMove();
  }

  function onViewportPointerUp() {
    if (inter.current.mode === "drag" || inter.current.mode === "resize") {
      pushHistory(nodes, edges);
    }
    finishInteraction();
  }

  function onNodePointerDown(e: React.PointerEvent, node: BpmnNode) {
    e.stopPropagation();
    if (isReadOnly) return;

    if (spacePressed) return;

    if (inter.current.mode === "connect" || inter.current.mode === "reconnect") {
      finishConnect(node.id);
      return;
    }

    let nextIds = selectedIds;

    if (e.ctrlKey || e.metaKey) {
      nextIds = selectedSet.has(node.id)
        ? selectedIds.filter((id) => id !== node.id)
        : [...selectedIds, node.id];
      setSelectedIds(nextIds);
      return;
    }

    if (!selectedSet.has(node.id)) {
      nextIds = [node.id];
      setSelectedIds(nextIds);
    }

    inter.current.mode = "drag";
    inter.current.pointerId = e.pointerId;
    inter.current.dragIds = nextIds;
    inter.current.dragStart = screenToWorld(e.clientX, e.clientY);
    inter.current.tempWorld = inter.current.dragStart;
    inter.current.dragInitial = {};

    nodes
      .filter((n) => nextIds.includes(n.id))
      .forEach((n) => {
        inter.current.dragInitial[n.id] = { x: n.x, y: n.y };
      });

    viewportRef.current?.setPointerCapture(e.pointerId);
  }

  function onResizePointerDown(
    e: React.PointerEvent,
    node: BpmnNode,
    dir: ResizeDirection
  ) {
    e.stopPropagation();
    if (isReadOnly) return;

    inter.current.mode = "resize";
    inter.current.pointerId = e.pointerId;
    inter.current.resizeId = node.id;
    inter.current.resizeDir = dir;
    inter.current.resizeInitialNode = { ...node };
    inter.current.resizeStart = screenToWorld(e.clientX, e.clientY);
    inter.current.tempWorld = inter.current.resizeStart;

    setSelectedIds([node.id]);
    viewportRef.current?.setPointerCapture(e.pointerId);
  }

  function onConnectPointerDown(e: React.PointerEvent, nodeId: string) {
    e.stopPropagation();
    if (isReadOnly) return;

    inter.current.mode = "connect";
    inter.current.pointerId = e.pointerId;
    inter.current.connectFromId = nodeId;
    inter.current.tempWorld = screenToWorld(e.clientX, e.clientY);
    viewportRef.current?.setPointerCapture(e.pointerId);
    updateTempConnectionPath(inter.current.tempWorld);
  }

  function onEdgeEndpointPointerDown(
    e: React.PointerEvent,
    edgeId: string,
    end: "from" | "to"
  ) {
    e.stopPropagation();
    if (isReadOnly) return;

    inter.current.mode = "reconnect";
    inter.current.pointerId = e.pointerId;
    inter.current.reconnectEdgeId = edgeId;
    inter.current.reconnectEnd = end;
    inter.current.tempWorld = screenToWorld(e.clientX, e.clientY);
    viewportRef.current?.setPointerCapture(e.pointerId);
    updateTempConnectionPath(inter.current.tempWorld);
  }

  function finishConnect(targetNodeId: string) {
    if (isReadOnly) return;

    if (inter.current.mode === "connect") {
      const fromId = inter.current.connectFromId;
      if (fromId && fromId !== targetNodeId) {
        const nextEdges = [
          ...edges,
          {
            id: genId("edge"),
            from: fromId,
            to: targetNodeId,
            type: connectorType,
          } as BpmnEdge,
        ];
        commitSnapshot(nodes, nextEdges);
        toast("Conexão criada.", "success");
      }
    }

    if (inter.current.mode === "reconnect") {
      const edgeId = inter.current.reconnectEdgeId;
      const reconnectEnd = inter.current.reconnectEnd;
      if (edgeId && reconnectEnd) {
        const nextEdges = edges.map((edge) =>
          edge.id === edgeId ? { ...edge, [reconnectEnd]: targetNodeId } : edge
        );
        commitSnapshot(nodes, nextEdges);
        toast("Conexão ajustada.", "success");
      }
    }

    finishInteraction();
  }

  function handleToolbarDragStart(e: React.DragEvent, type: BpmnNodeType) {
    if (isReadOnly) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData("application/bpmn-node", type);
    e.dataTransfer.effectAllowed = "copy";
  }

  function onCanvasDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }

  function onCanvasDrop(e: React.DragEvent) {
    if (isReadOnly) return;
    e.preventDefault();
    const type = e.dataTransfer.getData("application/bpmn-node") as BpmnNodeType;
    if (!type) return;
    const p = screenToWorld(e.clientX, e.clientY);
    addNodeToCanvas(type, p.x, p.y);
  }

  const resizeHandles = (node: BpmnNode) => {
    if (isReadOnly || selectedIds.length !== 1 || primaryNode?.id !== node.id) return null;

    const handles: Array<{ dir: ResizeDirection; cls: string }> = [
      { dir: "nw", cls: "left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize" },
      { dir: "n", cls: "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize" },
      { dir: "ne", cls: "right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize" },
      { dir: "e", cls: "right-0 top-1/2 translate-x-1/2 -translate-y-1/2 cursor-ew-resize" },
      { dir: "se", cls: "right-0 bottom-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize" },
      { dir: "s", cls: "left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2 cursor-ns-resize" },
      { dir: "sw", cls: "left-0 bottom-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize" },
      { dir: "w", cls: "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize" },
    ];

    return handles.map((h) => (
      <div
        key={h.dir}
        data-handle="resize"
        onPointerDown={(e) => onResizePointerDown(e, node, h.dir)}
        className={cn(
          "absolute w-3.5 h-3.5 rounded-full border-2 border-white bg-[#2655e8] shadow-sm z-30 hover:scale-125 transition-transform",
          h.cls
        )}
      />
    ));
  };

  const renderNodeBody = (node: BpmnNode, isSelected: boolean) => {
    const ring = isSelected ? "ring-4 ring-[#2655e8]/20 border-[#2655e8]" : "border-slate-300";

    switch (node.type) {
      case "start":
        return (
          <div
            className={cn(
              "w-full h-full rounded-full border-2 bg-emerald-50 flex items-center justify-center shadow-sm",
              isSelected ? "ring-4 ring-[#2655e8]/20 border-emerald-500" : "border-emerald-400"
            )}
          >
            <div className="w-4 h-4 rounded-full bg-emerald-400 border border-emerald-500" />
          </div>
        );

      case "end":
        return (
          <div
            className={cn(
              "w-full h-full rounded-full border-[4px] bg-red-50 flex items-center justify-center shadow-sm",
              isSelected ? "ring-4 ring-[#2655e8]/20 border-red-600" : "border-red-500"
            )}
          >
            <div className="w-4 h-4 rounded-full bg-red-500 border border-red-600" />
          </div>
        );

      case "gateway":
        return (
          <div
            className={cn(
              "w-full h-full border-2 bg-amber-50 flex items-center justify-center rotate-45 shadow-sm",
              isSelected ? "ring-4 ring-[#2655e8]/20 border-amber-500" : "border-amber-400"
            )}
          >
            <GitBranch className="w-5 h-5 text-amber-500 -rotate-45" />
          </div>
        );

      case "timer":
        return (
          <div
            className={cn(
              "w-full h-full rounded-full border-2 bg-violet-50 flex items-center justify-center shadow-sm",
              isSelected ? "ring-4 ring-[#2655e8]/20 border-violet-500" : "border-violet-400"
            )}
          >
            <Clock3 className="w-5 h-5 text-violet-500" />
          </div>
        );

      case "document":
        return (
          <div
            className={cn(
              "w-full h-full bg-white border-2 shadow-sm relative overflow-hidden",
              isSelected ? "ring-4 ring-[#2655e8]/20 border-[#2655e8]" : "border-slate-300"
            )}
            style={{
              clipPath: "polygon(0 0, 88% 0, 100% 22%, 100% 100%, 0 100%)",
              borderRadius: 8,
            }}
          >
            <div className="absolute top-0 right-0 w-8 h-8 bg-slate-100 border-l border-b border-slate-300 rounded-bl-xl" />
            <div className="w-full h-full flex items-center justify-center gap-2 px-3">
              <FileText className="w-4 h-4 text-slate-500 shrink-0" />
              <span className="text-xs font-bold text-slate-800 text-center leading-tight">
                {node.label}
              </span>
            </div>
          </div>
        );

      case "data":
        return (
          <div
            className={cn(
              "w-full h-full border-2 bg-[#f8fafc] shadow-sm flex items-center justify-center",
              isSelected ? "ring-4 ring-[#2655e8]/20 border-[#2655e8]" : "border-slate-300"
            )}
            style={{
              clipPath: "polygon(10% 0, 100% 0, 90% 100%, 0 100%)",
            }}
          >
            <div className="flex items-center gap-2 px-3">
              <FileStack className="w-4 h-4 text-slate-500 shrink-0" />
              <span className="text-xs font-bold text-slate-800 text-center leading-tight">
                {node.label}
              </span>
            </div>
          </div>
        );

      case "annotation":
        return (
          <div
            className={cn(
              "w-full h-full bg-yellow-50 border-y border-r border-yellow-200 border-l-4 border-l-yellow-400 rounded-r-xl shadow-sm px-4 py-3 flex items-center",
              isSelected && "ring-4 ring-[#2655e8]/20"
            )}
          >
            <span className="text-xs font-medium text-slate-700 leading-tight">
              {node.label}
            </span>
          </div>
        );

      case "task":
      default:
        return (
          <div
            className={cn(
              "w-full h-full bg-white border-2 rounded-xl shadow-sm flex items-center justify-center px-4 py-3",
              ring
            )}
          >
            <span className="text-sm font-bold text-slate-800 text-center leading-tight">
              {node.label}
            </span>
          </div>
        );
    }
  };

  const gridSize = 24 * zoom;

  return (
    <div className="h-[calc(100vh-64px)] w-full bg-slate-50 text-slate-900 flex flex-col overflow-hidden relative font-sans">
      <Toasts items={toasts} remove={removeToast} />

      <header className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between shrink-0 z-40 shadow-sm">
        <div className="flex items-center gap-4 min-w-0">
          <button
            onClick={() => router.push("/processos")}
            className="p-2 rounded-xl text-slate-400 hover:text-[#2655e8] hover:bg-[#eef2ff] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="w-10 h-10 rounded-xl bg-[#eef2ff] border border-[#e0e7ff] flex items-center justify-center shadow-sm shrink-0">
            <Workflow className="w-5 h-5 text-[#2655e8]" />
          </div>

          <div className="min-w-0 flex flex-col justify-center">
            <div className="text-sm font-bold text-slate-900 truncate leading-tight">{processData.name}</div>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-slate-500 mt-0.5">
              <span className={cn("px-2 py-0.5 rounded-md border font-black shadow-sm bg-white", statusClass(processData.status))}>
                {statusLabel(processData.status)}
              </span>
              <span>{processData.code || "Novo Modelo"}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleUndo}
            className="p-2.5 rounded-xl text-slate-500 hover:text-[#2655e8] hover:bg-[#eef2ff] transition-colors disabled:opacity-40"
            disabled={!historyPast.length}
            title="Desfazer (Ctrl+Z)"
          >
            <Undo className="w-4 h-4" />
          </button>

          <button
            onClick={handleRedo}
            className="p-2.5 rounded-xl text-slate-500 hover:text-[#2655e8] hover:bg-[#eef2ff] transition-colors disabled:opacity-40"
            disabled={!historyFuture.length}
            title="Refazer (Ctrl+Y)"
          >
            <Redo className="w-4 h-4" />
          </button>

          <div className="mx-2 h-6 w-px bg-slate-200" />

          <button
            onClick={() => setZoom((z) => Math.max(0.25, +(z - 0.1).toFixed(2)))}
            className="p-2.5 rounded-xl text-slate-500 hover:text-[#2655e8] hover:bg-[#eef2ff] transition-colors"
            title="Diminuir zoom"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <div className="min-w-[50px] text-center text-xs font-bold text-slate-600 bg-slate-100 py-1 rounded-md">
            {Math.round(zoom * 100)}%
          </div>

          <button
            onClick={() => setZoom((z) => Math.min(2.2, +(z + 0.1).toFixed(2)))}
            className="p-2.5 rounded-xl text-slate-500 hover:text-[#2655e8] hover:bg-[#eef2ff] transition-colors"
            title="Aumentar zoom"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <button
            onClick={focusAll}
            className="p-2.5 rounded-xl text-slate-500 hover:text-[#2655e8] hover:bg-[#eef2ff] transition-colors"
            title="Enquadrar tudo"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          <div className="mx-2 h-6 w-px bg-slate-200" />

          <button
            onClick={exportFlowToPrint}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-[#2655e8] hover:border-[#2655e8]/30 transition-all text-xs font-bold flex items-center gap-2 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar
          </button>

          <button
            onClick={saveProcess}
            className="px-5 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 text-sm font-bold flex items-center gap-2 shadow-sm ml-2 transition-all"
          >
            <Save className="w-4 h-4 text-slate-500" />
            Salvar
          </button>

          <button
            onClick={() => workflowAction("submit")}
            className="px-5 py-2.5 rounded-xl bg-[#2655e8] hover:bg-[#1e40af] text-white text-sm font-bold flex items-center gap-2 shadow-md ml-2 transition-all"
          >
            <Send className="w-4 h-4" />
            Submeter Fluxo
          </button>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* TOOLBAR ESQUERDA */}
        <aside className="w-20 shrink-0 border-r border-slate-200 bg-white px-2 py-4 flex flex-col items-center gap-3 z-30 shadow-sm">
          <button
            onClick={() => setSelectedIds([])}
            className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
              !spacePressed ? "bg-[#eef2ff] text-[#2655e8] border border-[#e0e7ff]" : "text-slate-400 hover:bg-slate-50"
            )}
            title="Selecionar"
          >
            <MousePointer2 className="w-5 h-5" />
          </button>

          <button
            onClick={() => setSpacePressed((current) => !current)}
            className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
              spacePressed ? "bg-[#eef2ff] text-[#2655e8] border border-[#e0e7ff]" : "text-slate-400 hover:bg-slate-50"
            )}
            title="Mover Canvas (Segure Space)"
          >
            <Hand className="w-5 h-5" />
          </button>

          <div className="w-10 h-px bg-slate-200 my-1" />

          <button
            onClick={() => setConnectorType("solid")}
            className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
              connectorType === "solid"
                ? "bg-slate-800 text-white shadow-md"
                : "text-slate-500 hover:bg-slate-100"
            )}
            title="Conector Sólido"
          >
            <Workflow className="w-5 h-5" />
          </button>

          <button
            onClick={() => setConnectorType("dashed")}
            className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
              connectorType === "dashed"
                ? "bg-slate-800 text-white shadow-md"
                : "text-slate-500 hover:bg-slate-100"
            )}
            title="Conector Tracejado"
          >
            <Network className="w-5 h-5" />
          </button>

          <div className="w-10 h-px bg-slate-200 my-1" />

          {(
            [
              ["pool", <Layers className="w-5 h-5" />, "Piscina / Raias"],
              ["start", <Circle className="w-5 h-5" />, "Evento de Início"],
              ["task", <Square className="w-5 h-5" />, "Tarefa / Atividade"],
              ["gateway", <Diamond className="w-5 h-5" />, "Gateway / Decisão"],
              ["timer", <Clock3 className="w-5 h-5" />, "Timer / Espera"],
              ["document", <FileText className="w-5 h-5" />, "Documento"],
              ["data", <FileStack className="w-5 h-5" />, "Banco de Dados"],
              ["end", <Circle className="w-5 h-5" />, "Evento de Fim"],
              ["annotation", <Type className="w-5 h-5" />, "Anotação Livre"],
            ] as Array<[BpmnNodeType, React.ReactNode, string]>
          ).map(([type, icon, title]) => (
            <button
              key={type}
              draggable={!isReadOnly}
              onDragStart={(e) => handleToolbarDragStart(e, type)}
              onClick={() => addNodeToCanvas(type)}
              className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-sm border",
                isReadOnly
                  ? "text-slate-300 bg-slate-50 border-slate-100 cursor-not-allowed"
                  : "bg-white text-slate-600 border-slate-200 hover:border-[#2655e8] hover:text-[#2655e8] hover:bg-[#eef2ff]"
              )}
              title={title}
            >
              {icon}
            </button>
          ))}

          <div className="mt-auto flex flex-col gap-2 w-full pt-4 border-t border-slate-200">
            <button
              onClick={() => setShowShortcuts(true)}
              className="w-12 h-12 mx-auto rounded-2xl flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all"
              title="Atalhos do Teclado"
            >
              <Keyboard className="w-5 h-5" />
            </button>
          </div>
        </aside>

        {/* CANVAS CENTRAL */}
        <main className="flex-1 min-w-0 flex bg-[#f8fafc]">
          <div className="flex-1 min-w-0 relative">
            <div
              ref={viewportRef}
              onDragOver={onCanvasDragOver}
              onDrop={onCanvasDrop}
              onPointerDown={onViewportPointerDown}
              onPointerMove={onViewportPointerMove}
              onPointerUp={onViewportPointerUp}
              className="absolute inset-0 overflow-hidden cursor-default"
              style={{
                backgroundImage: `
                  linear-gradient(to right, #e2e8f0 1px, transparent 1px),
                  linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)
                `,
                backgroundSize: `${gridSize}px ${gridSize}px`,
                backgroundPosition: `${pan.x}px ${pan.y}px`,
              }}
            >
              <div
                ref={worldRef}
                className="absolute left-0 top-0"
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transformOrigin: "0 0",
                  width: 1,
                  height: 1,
                }}
              >
                <svg
                  id="bpmn-export-svg"
                  className="absolute pointer-events-none"
                  style={{
                    overflow: "visible",
                    left: 0,
                    top: 0,
                  }}
                >
                  <defs>
                    <marker
                      id="arrow-solid"
                      viewBox="0 0 10 10"
                      refX="9"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
                    </marker>

                    <marker
                      id="arrow-dashed"
                      viewBox="0 0 10 10"
                      refX="9"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
                    </marker>
                  </defs>

                  {edges.map((edge) => {
                    const edgePath = getEdgePath(edge, nodes);
                    if (!edgePath) return null;

                    return (
                      <g key={edge.id}>
                        <path
                          d={edgePath.path}
                          fill="none"
                          stroke={edge.type === "solid" ? "#64748b" : "#94a3b8"}
                          strokeWidth={2}
                          strokeDasharray={edge.type === "dashed" ? "6 6" : undefined}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          markerEnd={edge.type === "solid" ? "url(#arrow-solid)" : "url(#arrow-dashed)"}
                        />

                        {!isReadOnly && (
                          <>
                            <circle
                              data-edge-end="from"
                              cx={edgePath.start.x}
                              cy={edgePath.start.y}
                              r="5"
                              fill="#fff"
                              stroke="#64748b"
                              strokeWidth="2"
                              className="pointer-events-auto cursor-pointer hover:stroke-[#2655e8] hover:fill-[#eef2ff]"
                              onPointerDown={(e) => onEdgeEndpointPointerDown(e, edge.id, "from")}
                            />
                            <circle
                              data-edge-end="to"
                              cx={edgePath.end.x}
                              cy={edgePath.end.y}
                              r="5"
                              fill="#fff"
                              stroke="#64748b"
                              strokeWidth="2"
                              className="pointer-events-auto cursor-pointer hover:stroke-[#2655e8] hover:fill-[#eef2ff]"
                              onPointerDown={(e) => onEdgeEndpointPointerDown(e, edge.id, "to")}
                            />
                          </>
                        )}

                        {edge.label && (
                          <>
                            <rect
                              x={edgePath.labelX - 26}
                              y={edgePath.labelY - 11}
                              width="52"
                              height="22"
                              rx="4"
                              fill="#ffffff"
                              stroke="#e2e8f0"
                            />
                            <text
                              x={edgePath.labelX}
                              y={edgePath.labelY + 4}
                              fill="#475569"
                              fontSize="10"
                              fontWeight="700"
                              textAnchor="middle"
                            >
                              {edge.label}
                            </text>
                          </>
                        )}
                      </g>
                    );
                  })}

                  {tempLine && (
                    <path
                      d={tempLine.path}
                      fill="none"
                      stroke="#2655e8"
                      strokeWidth={2}
                      strokeDasharray="6 6"
                      markerEnd="url(#arrow-solid)"
                    />
                  )}
                </svg>

                {sortedNodes
                  .filter((n) => n.type === "pool")
                  .map((node) => {
                    const isSelected = selectedSet.has(node.id);
                    const lanes = node.lanes || [];
                    const phases = node.phases || [];
                    const phaseHeaderHeight = phases.length ? 40 : 0;
                    const laneHeight = lanes.length ? (node.h - phaseHeaderHeight) / lanes.length : node.h;

                    return (
                      <div
                        key={node.id}
                        data-node="true"
                        onPointerDown={(e) => onNodePointerDown(e, node)}
                        className={cn(
                          "absolute select-none border border-slate-300 bg-white shadow-sm",
                          !isReadOnly && "cursor-move",
                          isSelected && "ring-4 ring-[#2655e8]/20 border-[#2655e8]"
                        )}
                        style={{
                          left: node.x - node.w / 2,
                          top: node.y - node.h / 2,
                          width: node.w,
                          height: node.h,
                          zIndex: node.zIndex,
                          borderRadius: 16,
                          overflow: "hidden",
                        }}
                      >
                        <div className="absolute left-0 top-0 bottom-0 w-12 bg-slate-50 border-r border-slate-200 flex items-center justify-center">
                          <span className="transform -rotate-90 whitespace-nowrap text-sm font-bold text-slate-700">
                            {node.label}
                          </span>
                        </div>

                        <div className="absolute left-12 top-0 right-0 bottom-0 flex flex-col">
                          {phases.length > 0 && (
                            <div className="h-10 bg-slate-50 border-b border-slate-200 flex">
                              {phases.map((phase) => (
                                <div
                                  key={phase.id}
                                  className="flex-1 flex items-center justify-center border-r last:border-r-0 border-slate-200"
                                >
                                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                    {phase.label}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="flex-1 flex flex-col">
                            {lanes.map((lane) => (
                              <div
                                key={lane.id}
                                className="flex border-b last:border-b-0 border-slate-200"
                                style={{ height: laneHeight }}
                              >
                                <div className="w-10 bg-slate-50 border-r border-slate-200 flex items-center justify-center">
                                  <span className="transform -rotate-90 whitespace-nowrap text-[10px] font-black uppercase tracking-widest text-slate-500">
                                    {lane.label}
                                  </span>
                                </div>
                                <div className="flex-1" />
                              </div>
                            ))}
                          </div>
                        </div>

                        {!isReadOnly && (
                          <div
                            data-handle="connect"
                            onPointerDown={(e) => onConnectPointerDown(e, node.id)}
                            className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#2655e8] border-2 border-white shadow-md cursor-crosshair z-20"
                            title="Criar conexão"
                          />
                        )}

                        {isSelected && !isReadOnly && (
                          <div className="absolute -top-12 left-0 flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-md">
                            <button
                              onClick={(e) => { e.stopPropagation(); addLane(); }}
                              className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-[#2655e8]"
                              title="Adicionar raia"
                            >
                              <SplitSquareHorizontal className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); removeLane(); }}
                              className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-red-50 hover:text-red-500"
                              title="Remover raia"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <div className="w-px h-5 bg-slate-200 mx-1"></div>
                            <button
                              onClick={(e) => { e.stopPropagation(); addPhase(); }}
                              className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-[#2655e8]"
                              title="Adicionar fase"
                            >
                              <SplitSquareVertical className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); removePhase(); }}
                              className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-red-50 hover:text-red-500"
                              title="Remover fase"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}

                        {resizeHandles(node)}
                      </div>
                    );
                  })}

                {sortedNodes
                  .filter((n) => n.type !== "pool")
                  .map((node) => {
                    const isSelected = selectedSet.has(node.id);

                    return (
                      <div
                        key={node.id}
                        data-node="true"
                        onPointerDown={(e) => onNodePointerDown(e, node)}
                        className={cn("absolute select-none", !isReadOnly && "cursor-move")}
                        style={{
                          left: node.x - node.w / 2,
                          top: node.y - node.h / 2,
                          width: node.w,
                          height: node.h,
                          zIndex: node.zIndex,
                        }}
                      >
                        {renderNodeBody(node, isSelected)}

                        {(node.type === "start" || node.type === "end" || node.type === "timer") && (
                          <span className="absolute left-1/2 -translate-x-1/2 -bottom-6 text-[10px] font-bold text-slate-600 whitespace-nowrap bg-white/80 px-2 py-0.5 rounded shadow-sm border border-slate-200">
                            {node.label}
                          </span>
                        )}

                        {!isReadOnly && (
                          <div
                            data-handle="connect"
                            onPointerDown={(e) => onConnectPointerDown(e, node.id)}
                            className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#2655e8] border-2 border-white shadow-md cursor-crosshair z-20"
                            title="Criar conexão"
                          />
                        )}

                        {resizeHandles(node)}
                      </div>
                    );
                  })}
              </div>

              {selectionRect && (
                <div
                  className="absolute border border-[#2655e8] bg-[#2655e8]/10 pointer-events-none z-30"
                  style={{
                    left: selectionRect.x * zoom + pan.x,
                    top: selectionRect.y * zoom + pan.y,
                    width: selectionRect.w * zoom,
                    height: selectionRect.h * zoom,
                  }}
                />
              )}

              {!nodes.length && !isLoading && !isGenerating && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <div className="w-24 h-24 rounded-3xl bg-white border border-slate-200 shadow-sm flex items-center justify-center mb-6">
                    <Workflow className="w-10 h-10 text-slate-300" />
                  </div>
                  <div className="text-2xl font-black text-slate-800 mb-2">Comece sua modelagem</div>
                  <div className="text-sm font-medium text-slate-500 max-w-md text-center">
                    Arraste os elementos da paleta lateral para o canvas ou solicite à inteligência artificial para criar um rascunho automático.
                  </div>
                </div>
              )}

              {isLoading && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-40 flex items-center justify-center">
                  <div className="rounded-3xl border border-slate-200 bg-white shadow-xl px-10 py-8 text-center flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-[#eef2ff] flex items-center justify-center mb-4">
                        <Bot className="w-8 h-8 text-[#2655e8] animate-pulse" />
                    </div>
                    <div className="text-lg font-black text-slate-900">Carregando processo...</div>
                    <div className="text-sm font-medium text-slate-500 mt-1">Preparando a área de trabalho</div>
                  </div>
                </div>
              )}

              {isGenerating && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-40 flex items-center justify-center">
                  <div className="rounded-3xl border border-slate-200 bg-white shadow-xl px-10 py-8 text-center flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-violet-100 flex items-center justify-center mb-4">
                        <Sparkles className="w-8 h-8 text-violet-600 animate-pulse" />
                    </div>
                    <div className="text-lg font-black text-slate-900">A IA está desenhando o fluxo...</div>
                    <div className="text-sm font-medium text-slate-500 mt-1">Interpretando etapas, decisões e conexões de acordo com o padrão BPMN.</div>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* RIGHT PANEL - PROPERTIES */}
          <aside className="w-[360px] shrink-0 border-l border-slate-200 bg-white p-6 overflow-y-auto shadow-[-4px_0_24px_rgba(0,0,0,0.02)] z-20">
            
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 mb-6">
              <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-violet-600"/>
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">Assistente IA</h3>
              </div>
              <form onSubmit={generateByAI} className="space-y-3">
                <textarea
                  value={promptIA}
                  onChange={(e) => setPromptIA(e.target.value)}
                  placeholder="Ex.: Processo de admissão com triagem, validação de documentos, avaliação clínica e decisão de internação."
                  className="w-full h-28 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 resize-none shadow-sm"
                />
                <button
                  type="submit"
                  disabled={isReadOnly || !promptIA.trim() || isGenerating}
                  className="w-full h-11 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:bg-slate-300 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  Gerar Rascunho BPMN
                </button>
              </form>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 mb-6 shadow-sm">
              <div className="text-xs uppercase tracking-widest text-slate-400 font-black mb-4">
                Metadados do Processo
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1.5">Nome do Processo</label>
                  <input
                    value={processData.name}
                    onChange={(e) => setProcessData((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white px-4 text-sm font-bold text-slate-800 outline-none focus:border-[#2655e8] transition-colors"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1.5">Dono (Owner)</label>
                  <input
                    value={processData.owner}
                    onChange={(e) => setProcessData((prev) => ({ ...prev, owner: e.target.value }))}
                    className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white px-4 text-sm font-bold text-slate-800 outline-none focus:border-[#2655e8] transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1.5">Revisor</label>
                    <input
                        value={processData.reviewer || ""}
                        onChange={(e) => setProcessData((prev) => ({ ...prev, reviewer: e.target.value }))}
                        className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white px-4 text-sm font-bold text-slate-800 outline-none focus:border-[#2655e8] transition-colors"
                    />
                    </div>

                    <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1.5">Aprovador</label>
                    <input
                        value={processData.approver || ""}
                        onChange={(e) => setProcessData((prev) => ({ ...prev, approver: e.target.value }))}
                        className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white px-4 text-sm font-bold text-slate-800 outline-none focus:border-[#2655e8] transition-colors"
                    />
                    </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1.5">Comentário / Parecer</label>
                  <textarea
                    value={processData.workflowComment || ""}
                    onChange={(e) => setProcessData((prev) => ({ ...prev, workflowComment: e.target.value }))}
                    className="w-full h-20 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none focus:border-[#2655e8] resize-none transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-xs uppercase tracking-widest text-slate-400 font-black mb-4">
                Propriedades do Elemento
              </div>

              {!primaryNode ? (
                <div className="text-sm font-medium text-slate-500 bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                  Selecione um elemento no canvas para editar suas propriedades.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 bg-[#eef2ff] border border-[#e0e7ff] p-3 rounded-xl">
                      <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                          {(() => {
                              const Icon = NODE_ICONS[primaryNode.type as BpmnNodeType] || Square;
                              return <Icon className="w-4 h-4 text-[#2655e8]"/>
                          })()}
                      </div>
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-[#2655e8]">Tipo do Bloco</div>
                        <div className="text-sm font-bold text-slate-900 capitalize">{primaryNode.type}</div>
                      </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1.5">Rótulo / Título</label>
                    <input
                      value={primaryNode.label}
                      onChange={(e) => updatePrimaryLabel(e.target.value)}
                      className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white px-4 text-sm font-bold text-slate-800 outline-none focus:border-[#2655e8] transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1.5">Largura (px)</label>
                      <input
                        type="number"
                        value={primaryNode.w}
                        onChange={(e) => updatePrimarySize("w", Number(e.target.value))}
                        className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white px-4 text-sm font-bold text-slate-800 outline-none focus:border-[#2655e8] transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1.5">Altura (px)</label>
                      <input
                        type="number"
                        value={primaryNode.h}
                        onChange={(e) => updatePrimarySize("h", Number(e.target.value))}
                        className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white px-4 text-sm font-bold text-slate-800 outline-none focus:border-[#2655e8] transition-colors"
                      />
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-4 mt-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-3">Conexão Rápida</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => appendNodeFromSelection("task")}
                          className="h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-[#2655e8] hover:text-[#2655e8] text-xs font-bold text-slate-600 flex items-center justify-center gap-2 transition-all shadow-sm"
                        >
                          <Plus className="w-3.5 h-3.5" /> Tarefa
                        </button>
                        <button
                          onClick={() => appendNodeFromSelection("gateway")}
                          className="h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-[#2655e8] hover:text-[#2655e8] text-xs font-bold text-slate-600 flex items-center justify-center gap-2 transition-all shadow-sm"
                        >
                          <GitBranch className="w-3.5 h-3.5" /> Gateway
                        </button>
                      </div>
                  </div>

                  {primaryNode.type === "pool" && (
                    <div className="border-t border-slate-100 pt-4 mt-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-3">Estrutura da Piscina</label>
                        <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={addLane}
                            className="h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-[#2655e8] text-xs font-bold text-slate-600 flex items-center justify-center gap-2 transition-all shadow-sm"
                        >
                            <SplitSquareHorizontal className="w-3.5 h-3.5 text-[#2655e8]" /> Adic. Raia
                        </button>
                        <button
                            onClick={addPhase}
                            className="h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-[#2655e8] text-xs font-bold text-slate-600 flex items-center justify-center gap-2 transition-all shadow-sm"
                        >
                            <SplitSquareVertical className="w-3.5 h-3.5 text-[#2655e8]" /> Adic. Fase
                        </button>
                        </div>
                    </div>
                  )}

                  <div className="border-t border-slate-100 pt-4 mt-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-3">Camadas e Ações</label>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <button
                        onClick={bringToFront}
                        className="h-9 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors"
                        >
                        Trazer P/ Frente
                        </button>
                        <button
                        onClick={sendToBack}
                        className="h-9 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors"
                        >
                        Enviar P/ Fundo
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <button onClick={handleDuplicate} className="h-9 rounded-lg bg-white border border-slate-200 hover:border-[#2655e8] hover:text-[#2655e8] text-xs font-bold text-slate-600 transition-colors shadow-sm" title="Duplicar">Duplicar</button>
                        <button onClick={handleCopy} className="h-9 rounded-lg bg-white border border-slate-200 hover:border-[#2655e8] hover:text-[#2655e8] text-xs font-bold text-slate-600 transition-colors shadow-sm" title="Copiar">Copiar</button>
                        <button onClick={handleDelete} className="h-9 rounded-lg bg-red-50 border border-red-200 hover:bg-red-100 text-red-600 text-xs font-bold transition-colors shadow-sm" title="Excluir">Excluir</button>
                      </div>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </main>
      </div>

      {showShortcuts && (
        <div className="fixed inset-0 z-[9998] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-[2rem] border border-slate-200 bg-white shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                 <div className="text-xl font-black text-slate-900 flex items-center gap-3">
                     <Keyboard className="w-6 h-6 text-[#2655e8]"/>
                     Atalhos de Teclado
                 </div>
                 <p className="text-sm font-medium text-slate-500 mt-1">Acelere sua modelagem com estes atalhos rápidos.</p>
              </div>
              <button
                onClick={() => setShowShortcuts(false)}
                className="w-10 h-10 rounded-2xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 grid grid-cols-2 gap-4 text-sm">
              {[
                ["Space", "Movimentar Canvas (Pan)"],
                ["Ctrl/Cmd + Wheel", "Zoom no cursor"],
                ["Ctrl/Cmd + S", "Salvar Modelagem"],
                ["Ctrl/Cmd + Z", "Desfazer (Undo)"],
                ["Ctrl/Cmd + Y", "Refazer (Redo)"],
                ["Ctrl/Cmd + C", "Copiar Elementos"],
                ["Ctrl/Cmd + V", "Colar Elementos"],
                ["Ctrl/Cmd + D", "Duplicar Seleção"],
                ["Delete / Backspace", "Excluir Seleção"],
                ["Ctrl/Cmd + A", "Selecionar Tudo"],
                ["Esc", "Limpar Seleção / Cancelar"],
              ].map(([key, desc]) => (
                <div key={key} className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 flex flex-col justify-center">
                  <div className="text-[#2655e8] font-black font-mono text-xs bg-[#eef2ff] px-2 py-1 rounded w-fit mb-2 border border-[#e0e7ff]">{key}</div>
                  <div className="text-slate-700 font-bold">{desc}</div>
                </div>
              ))}
            </div>
            <div className="px-8 py-4 border-t border-slate-100 bg-slate-50 rounded-b-[2rem] text-center">
                <button onClick={() => setShowShortcuts(false)} className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl shadow-sm hover:bg-slate-100 transition-colors">Entendi, fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProcessStudioPage() {
  return (
    <Suspense fallback={
      <div className="h-[100vh] w-full flex flex-col items-center justify-center bg-slate-50 gap-4">
        <div className="w-16 h-16 bg-white border border-slate-200 rounded-2xl flex items-center justify-center shadow-sm">
           <Workflow className="w-8 h-8 text-[#2655e8] animate-pulse" />
        </div>
        <div className="text-sm font-bold text-slate-500">Preparando estúdio de modelagem...</div>
      </div>
    }>
      <ProcessStudioContent />
    </Suspense>
  );
}
