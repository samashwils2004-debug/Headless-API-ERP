"use client";

import {
  ReactFlow,
  Background,
  Controls,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
  type Connection,
  MarkerType,
  BackgroundVariant,
  ReactFlowProvider,
} from "@xyflow/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Plus,
  X,
  ChevronRight,
  GitBranch,
  CheckCircle2,
  Network,
  XCircle,
  AlertCircle,
  Loader2,
  Trash2,
  Eye,
} from "lucide-react";

import {
  compileBlueprint,
  createWorkflow,
  deleteWorkflow,
  deployBlueprint,
  deployWorkflow,
  listWorkflows,
  undeployWorkflow,
  type CompileBlueprintResponse,
} from "@/lib/console-api";
import { useProjectContextStore } from "@/lib/stores/project-context-store";
import { useWorkflowStore } from "@/lib/stores/workflow-store";
import { COMPLIANCE_OPTIONS } from "@/lib/constants";
import { toast } from "sonner";
import { WorkflowDiagramModal } from "@/components/console/WorkflowDiagramModal";
import type { WorkflowItem } from "@/lib/console-api";
import type {
  InstitutionalBlueprint,
  StateType,
  WorkflowBlueprint,
  WorkflowDefinition,
} from "@/types/contracts";

// ── Canvas types (shared with builder) ────────────────────────────────────

type StateNodeData = { label: string; stateType: StateType };
type EdgeData = { condition?: string; emit_event?: string };
type WorkflowNode = Node<StateNodeData>;
type WorkflowEdge = Edge<EdgeData>;
type GeneratedBlueprint = InstitutionalBlueprint | WorkflowBlueprint;

// ── Node components ────────────────────────────────────────────────────────

function InitialStateNode({ data, selected }: NodeProps<WorkflowNode>) {
  return (
    <div style={{ background: selected ? "#1e3a5f" : "#172040", border: `2px solid ${selected ? "#3b82f6" : "#2563eb"}`, borderRadius: 24, padding: "8px 20px", minWidth: 120, textAlign: "center", boxShadow: selected ? "0 0 0 2px #3b82f620" : "none" }}>
      <Handle type="target" position={Position.Left} style={{ background: "#2563eb", width: 8, height: 8 }} />
      <div style={{ fontSize: 11, color: "#93c5fd", fontWeight: 600, letterSpacing: "0.05em", marginBottom: 2 }}>INITIAL</div>
      <div style={{ fontSize: 13, color: "#f4f4f5", fontWeight: 500 }}>{data.label}</div>
      <Handle type="source" position={Position.Right} style={{ background: "#2563eb", width: 8, height: 8 }} />
    </div>
  );
}

function IntermediateStateNode({ data, selected }: NodeProps<WorkflowNode>) {
  return (
    <div style={{ background: selected ? "#2d1b4e" : "#1e1130", border: `2px solid ${selected ? "#a855f7" : "#7c3aed"}`, borderRadius: 10, padding: "8px 20px", minWidth: 130, textAlign: "center", boxShadow: selected ? "0 0 0 2px #a855f720" : "none" }}>
      <Handle type="target" position={Position.Left} style={{ background: "#7c3aed", width: 8, height: 8 }} />
      <div style={{ fontSize: 11, color: "#c4b5fd", fontWeight: 600, letterSpacing: "0.05em", marginBottom: 2 }}>STATE</div>
      <div style={{ fontSize: 13, color: "#f4f4f5", fontWeight: 500 }}>{data.label}</div>
      <Handle type="source" position={Position.Right} style={{ background: "#7c3aed", width: 8, height: 8 }} />
    </div>
  );
}

function TerminalStateNode({ data, selected }: NodeProps<WorkflowNode>) {
  return (
    <div style={{ background: selected ? "#1c1c26" : "#141418", border: `2px solid ${selected ? "#71717a" : "#3f3f46"}`, borderRadius: 6, padding: "8px 20px", minWidth: 120, textAlign: "center", outline: `3px solid ${selected ? "#52525b" : "#27272a"}`, outlineOffset: 2, boxShadow: selected ? "0 0 0 2px #71717a20" : "none" }}>
      <Handle type="target" position={Position.Left} style={{ background: "#52525b", width: 8, height: 8 }} />
      <div style={{ fontSize: 11, color: "#71717a", fontWeight: 600, letterSpacing: "0.05em", marginBottom: 2 }}>TERMINAL</div>
      <div style={{ fontSize: 13, color: "#a1a1aa", fontWeight: 500 }}>{data.label}</div>
    </div>
  );
}

const NODE_TYPES = {
  initial: InitialStateNode,
  intermediate: IntermediateStateNode,
  terminal: TerminalStateNode,
};

// ── Helpers ────────────────────────────────────────────────────────────────

let _nc = 0;
function newNodeId() { return `s_${Date.now()}_${_nc++}`; }
function slugify(s: string) { return s.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""); }

function canvasToDefinition(nodes: WorkflowNode[], edges: WorkflowEdge[], name: string): WorkflowDefinition {
  const states: WorkflowDefinition["states"] = {};
  let initialState = "";
  for (const node of nodes) {
    const sName = slugify(node.data.label) || node.id;
    if (node.data.stateType === "initial" && !initialState) initialState = sName;
    const outEdges = edges.filter((e) => e.source === node.id);
    states[sName] = {
      type: node.data.stateType,
      transitions: outEdges.map((e) => {
        const t = nodes.find((n) => n.id === e.target);
        return { to: slugify(t?.data.label || e.target) || e.target, condition: e.data?.condition || null, emit_event: e.data?.emit_event || null };
      }),
    };
  }
  return { name, initial_state: initialState, states };
}

function blueprintToCanvas(bp: GeneratedBlueprint) {
  const wf = "workflow" in bp ? bp.workflow : bp.workflows.main;
  if (!wf?.states) return { nodes: [] as WorkflowNode[], edges: [] as WorkflowEdge[], name: "workflow" };
  const stateNames = Object.keys(wf.states);
  const cols = Math.ceil(Math.sqrt(stateNames.length + 1));
  const nodes: WorkflowNode[] = stateNames.map((sn, i) => {
    const sd = wf.states[sn];
    let stateType: StateType = "intermediate";
    if (sn === wf.initial_state || sd?.type === "initial") stateType = "initial";
    else if (!sd?.transitions?.length || sd?.type === "terminal") stateType = "terminal";
    return { id: sn, type: stateType, position: { x: (i % cols) * 200 + 60, y: Math.floor(i / cols) * 140 + 60 }, data: { label: sn, stateType } };
  });
  const edges: WorkflowEdge[] = [];
  for (const [sn, sd] of Object.entries(wf.states)) {
    for (const t of sd.transitions || []) {
      edges.push({ id: `${sn}-${t.to}-${Math.random().toString(36).slice(2, 5)}`, source: sn, target: t.to, type: "smoothstep", markerEnd: { type: MarkerType.ArrowClosed, color: "#52525b" }, style: { stroke: "#3f3f46", strokeWidth: 1.5 }, label: t.condition || undefined, labelStyle: { fill: "#a1a1aa", fontSize: 10 }, labelBgStyle: { fill: "#1b1b24" }, data: { condition: t.condition || "", emit_event: t.emit_event || "" } });
    }
  }
  return { nodes, edges, name: wf.name || "workflow" };
}

// ── Palette chip ──────────────────────────────────────────────────────────

function PaletteChip({ type, label, color, bg }: { type: StateType; label: string; color: string; bg: string }) {
  return (
    <div draggable onDragStart={(e) => e.dataTransfer.setData("application/reactflow-type", type)} className="rounded px-2 py-1.5 cursor-grab active:cursor-grabbing select-none text-[11px] font-medium" style={{ background: bg, border: `1px solid ${color}40`, color }}>
      {label}
    </div>
  );
}

// ── Full-screen canvas review modal (after AI generation) ─────────────────

type CanvasReviewProps = {
  initialNodes: WorkflowNode[];
  initialEdges: WorkflowEdge[];
  workflowName: string;
  onDeploy: (nodes: WorkflowNode[], edges: WorkflowEdge[], name: string) => Promise<void>;
  onBack: () => void;
  deploying: boolean;
};

function CanvasReviewInner({ initialNodes, initialEdges, workflowName, onDeploy, onBack, deploying }: CanvasReviewProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const rfInstance = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState<WorkflowNode>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<WorkflowEdge>(initialEdges);
  const [name, setName] = useState(workflowName);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editCondition, setEditCondition] = useState("");
  const [editEmitEvent, setEditEmitEvent] = useState("");
  const [deployError, setDeployError] = useState<string | null>(null);

  const onConnect = useCallback((params: Connection) => {
    setEdges((eds: WorkflowEdge[]) => addEdge({ ...params, id: `${params.source}-${params.target}-${Date.now()}`, type: "smoothstep", markerEnd: { type: MarkerType.ArrowClosed, color: "#52525b" }, style: { stroke: "#3f3f46", strokeWidth: 1.5 }, labelStyle: { fill: "#a1a1aa", fontSize: 10 }, labelBgStyle: { fill: "#1b1b24" }, data: { condition: "", emit_event: "" } }, eds));
  }, [setEdges]);

  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!wrapperRef.current) return;
    const stateType = e.dataTransfer.getData("application/reactflow-type") as StateType;
    if (!stateType) return;
    const bounds = wrapperRef.current.getBoundingClientRect();
    const position = rfInstance.screenToFlowPosition({ x: e.clientX - bounds.left, y: e.clientY - bounds.top });
    const id = newNodeId();
    setNodes((nds: WorkflowNode[]) => nds.concat({ id, type: stateType, position, data: { label: stateType === "initial" ? "start" : stateType === "terminal" ? "end" : "state", stateType } }));
  }, [rfInstance, setNodes]);

  function deleteNode(id: string) {
    setNodes((nds: WorkflowNode[]) => nds.filter((n: WorkflowNode) => n.id !== id));
    setEdges((eds: WorkflowEdge[]) => eds.filter((e: WorkflowEdge) => e.source !== id && e.target !== id));
    setSelectedNodeId(null);
  }

  function deleteEdge(id: string) {
    setEdges((eds: WorkflowEdge[]) => eds.filter((e: WorkflowEdge) => e.id !== id));
    setSelectedEdgeId(null);
  }

  function saveNodeLabel() {
    if (!selectedNodeId) return;
    setNodes((nds: WorkflowNode[]) => nds.map((n: WorkflowNode) => n.id === selectedNodeId ? { ...n, data: { ...n.data, label: editLabel } } : n));
  }

  function saveEdge() {
    if (!selectedEdgeId) return;
    setEdges((eds: WorkflowEdge[]) => eds.map((e: WorkflowEdge) => e.id === selectedEdgeId ? { ...e, label: editCondition || undefined, data: { condition: editCondition, emit_event: editEmitEvent } } : e));
    setSelectedEdgeId(null);
  }

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const selectedEdge = edges.find((e) => e.id === selectedEdgeId);
  const hasTerminal = nodes.some((n) => n.type === "terminal");

  async function handleDeploy() {
    if (!name.trim()) { setDeployError("Workflow name required"); return; }
    if (!hasTerminal) { setDeployError("Add at least one terminal state"); return; }
    setDeployError(null);
    await onDeploy(nodes, edges, name);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "#0f0f12" }}>
      {/* Header */}
      <div className="flex-none flex items-center justify-between px-6 py-3" style={{ borderBottom: "1px solid #25252b", background: "#141418" }}>
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-sm transition-colors hover:opacity-80" style={{ color: "#71717a" }}>← Back</button>
          <span style={{ color: "#25252b" }}>|</span>
          <span className="text-sm font-medium" style={{ color: "#f4f4f5" }}>Review & Edit Workflow</span>
        </div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded px-3 py-1.5 text-sm outline-none w-64 text-center"
          style={{ background: "#1b1b24", border: "1px solid #25252b", color: "#f4f4f5" }}
          placeholder="Workflow name"
        />
        <div className="flex items-center gap-2">
          {deployError && <span className="text-xs" style={{ color: "#fca5a5" }}>{deployError}</span>}
          <button
            onClick={handleDeploy}
            disabled={deploying || !hasTerminal || !name.trim()}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded text-sm font-medium disabled:opacity-50"
            style={{ background: "#3b82f6", color: "#fff" }}
            title={!hasTerminal ? "Add a terminal state first" : ""}
          >
            {deploying ? <Loader2 size={13} className="animate-spin" /> : <ChevronRight size={13} />}
            {deploying ? "Deploying…" : "Deploy Workflow"}
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Left: palette */}
        <div className="flex-none w-44 flex flex-col gap-2 p-3 border-r" style={{ borderColor: "#25252b", background: "#141418" }}>
          <p className="text-[10px] uppercase tracking-wider font-semibold mb-1" style={{ color: "#52525b" }}>Palette</p>
          <PaletteChip type="initial" label="⬤ Initial" color="#2563eb" bg="#172040" />
          <PaletteChip type="intermediate" label="▪ State" color="#7c3aed" bg="#1e1130" />
          <PaletteChip type="terminal" label="■ Terminal" color="#3f3f46" bg="#141418" />
          <hr style={{ borderColor: "#25252b", marginTop: 4 }} />
          <button onClick={() => { setNodes([]); setEdges([]); setSelectedNodeId(null); setSelectedEdgeId(null); }} className="text-[11px] px-2 py-1 rounded border text-left transition-colors hover:opacity-80" style={{ borderColor: "#25252b", color: "#71717a" }}>
            Clear canvas
          </button>
          <div className="mt-auto">
            <p className="text-[10px] mb-1" style={{ color: "#52525b" }}>Nodes: {nodes.length}</p>
            <p className="text-[10px]" style={{ color: "#52525b" }}>Edges: {edges.length}</p>
            {!hasTerminal && nodes.length > 0 && (
              <p className="text-[10px] mt-2" style={{ color: "#f59e0b" }}>⚠ Add a terminal state</p>
            )}
          </div>
        </div>

        {/* Center: canvas */}
        <div ref={wrapperRef} className="flex-1 min-w-0" onDrop={onDrop} onDragOver={onDragOver}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={NODE_TYPES}
            onNodeClick={(_: React.MouseEvent, node: WorkflowNode) => {
              setSelectedNodeId(node.id);
              setSelectedEdgeId(null);
              setEditLabel(node.data.label);
            }}
            onEdgeClick={(_: React.MouseEvent, edge: WorkflowEdge) => {
              setSelectedEdgeId(edge.id);
              setSelectedNodeId(null);
              setEditCondition(edge.data?.condition || "");
              setEditEmitEvent(edge.data?.emit_event || "");
            }}
            onPaneClick={() => { setSelectedNodeId(null); setSelectedEdgeId(null); }}
            deleteKeyCode="Delete"
            fitView
            style={{ background: "#0f0f12" }}
          >
            <Background color="#1c1c22" variant={BackgroundVariant.Dots} gap={24} size={1} />
            <Controls style={{ background: "#1b1b24", border: "1px solid #25252b" }} showInteractive={false} />
          </ReactFlow>
        </div>

        {/* Right: detail panel */}
        <div className="flex-none w-72 flex flex-col border-l" style={{ borderColor: "#25252b", background: "#141418" }}>
          {selectedNode ? (
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "#52525b" }}>Node</span>
                <button onClick={() => deleteNode(selectedNode.id)} className="flex items-center gap-1 text-xs" style={{ color: "#ef4444" }}>
                  <Trash2 size={11} /> Delete
                </button>
              </div>
              <div>
                <label className="text-xs block mb-1" style={{ color: "#71717a" }}>Label</label>
                <input
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  onBlur={saveNodeLabel}
                  onKeyDown={(e) => { if (e.key === "Enter") saveNodeLabel(); }}
                  className="w-full rounded px-3 py-1.5 text-sm outline-none"
                  style={{ background: "#0f0f12", border: "1px solid #25252b", color: "#f4f4f5" }}
                />
              </div>
              <div>
                <label className="text-xs block mb-1.5" style={{ color: "#71717a" }}>Type</label>
                <div className="space-y-1">
                  {(["initial", "intermediate", "terminal"] as StateType[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setNodes((nds: WorkflowNode[]) => nds.map((n: WorkflowNode) => n.id === selectedNode.id ? { ...n, type: t, data: { ...n.data, stateType: t } } : n))}
                      className="w-full text-left flex items-center gap-2 px-3 py-1.5 rounded text-xs transition-colors"
                      style={{
                        background: selectedNode.data.stateType === t ? "#1b1b24" : "transparent",
                        border: selectedNode.data.stateType === t ? "1px solid #25252b" : "1px solid transparent",
                        color: t === "initial" ? "#60a5fa" : t === "terminal" ? "#71717a" : "#c4b5fd",
                      }}
                    >
                      {t === "initial" ? "⬤ Initial" : t === "terminal" ? "■ Terminal" : "▪ State"}
                      {selectedNode.data.stateType === t && <CheckCircle2 size={10} className="ml-auto" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : selectedEdge ? (
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "#52525b" }}>Transition</span>
                <button onClick={() => deleteEdge(selectedEdge.id)} className="flex items-center gap-1 text-xs" style={{ color: "#ef4444" }}>
                  <Trash2 size={11} /> Delete
                </button>
              </div>
              <div>
                <label className="text-xs block mb-1" style={{ color: "#71717a" }}>Condition</label>
                <input
                  value={editCondition}
                  onChange={(e) => setEditCondition(e.target.value)}
                  className="w-full rounded px-3 py-1.5 text-xs font-mono outline-none"
                  style={{ background: "#0f0f12", border: "1px solid #25252b", color: "#86efac" }}
                  placeholder="e.g. score >= 70"
                />
              </div>
              <div>
                <label className="text-xs block mb-1" style={{ color: "#71717a" }}>Emit Event</label>
                <input
                  value={editEmitEvent}
                  onChange={(e) => setEditEmitEvent(e.target.value)}
                  className="w-full rounded px-3 py-1.5 text-xs outline-none"
                  style={{ background: "#0f0f12", border: "1px solid #25252b", color: "#f4f4f5" }}
                  placeholder="e.g. application.approved"
                />
              </div>
              <button onClick={saveEdge} className="w-full rounded py-1.5 text-xs font-medium" style={{ background: "#3b82f6", color: "#fff" }}>
                Apply
              </button>
              <div className="pt-2 space-y-1" style={{ borderTop: "1px solid #1c1c22" }}>
                <p className="text-[10px]" style={{ color: "#52525b" }}>From: <span style={{ color: "#a1a1aa" }}>{selectedEdge.source}</span></p>
                <p className="text-[10px]" style={{ color: "#52525b" }}>To: <span style={{ color: "#a1a1aa" }}>{selectedEdge.target}</span></p>
              </div>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "#52525b" }}>Instructions</p>
              <div className="space-y-2 text-xs" style={{ color: "#71717a" }}>
                <p>• Drag nodes from palette to canvas</p>
                <p>• Connect nodes by dragging from one handle to another</p>
                <p>• Click a node or edge to edit it</p>
                <p>• Press Delete or use the delete button to remove elements</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CanvasReviewModal(props: CanvasReviewProps) {
  return (
    <ReactFlowProvider>
      <CanvasReviewInner {...props} />
    </ReactFlowProvider>
  );
}

// ── Validation badge ───────────────────────────────────────────────────────

function ValidationBadge({ label, passed, errors }: { label: string; passed: boolean; errors: string[] }) {
  return (
    <div className="rounded p-3" style={{ background: passed ? "#0a1a0a" : "#1a0a0a", border: `1px solid ${passed ? "#1a3a1a" : "#3a1a1a"}` }}>
      <div className="flex items-center gap-2 mb-1">
        {passed ? <CheckCircle2 size={14} style={{ color: "#16a34a" }} /> : <XCircle size={14} style={{ color: "#ef4444" }} />}
        <span className="text-xs font-medium" style={{ color: passed ? "#86efac" : "#fca5a5" }}>{label}</span>
      </div>
      {!passed && (errors ?? []).slice(0, 3).map((e, i) => (
        <p key={i} className="text-[11px] mt-0.5" style={{ color: "#ef4444" }}>• {e}</p>
      ))}
    </div>
  );
}

const INSTITUTION_TYPES = ["University", "Community College", "K-12 School District", "Healthcare System", "Government Agency", "Non-profit"];
const DEPARTMENTS = ["Admissions", "Financial Aid", "Human Resources", "Finance & Accounting", "Student Affairs", "Research & Grants", "IT & Operations"];

// ── Main Page ──────────────────────────────────────────────────────────────

export default function WorkflowsPage() {
  const router = useRouter();
  const context = useProjectContextStore((s) => s.context);
  const workflows = useWorkflowStore((s) => s.workflows);
  const setWorkflows = useWorkflowStore((s) => s.setWorkflows);

  const [panelOpen, setPanelOpen] = useState(false);

  // AI generation
  const [institutionType, setInstitutionType] = useState("");
  const [department, setDepartment] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  // Canvas review modal (after AI generation)
  const [canvasOpen, setCanvasOpen] = useState(false);
  const [canvasInitialNodes, setCanvasInitialNodes] = useState<WorkflowNode[]>([]);
  const [canvasInitialEdges, setCanvasInitialEdges] = useState<WorkflowEdge[]>([]);
  const [canvasWorkflowName, setCanvasWorkflowName] = useState("New Workflow");
  const [deploying, setDeploying] = useState(false);

  // Diagram viewer
  const [diagramWorkflow, setDiagramWorkflow] = useState<WorkflowItem | null>(null);

  // Table actions
  const [actingWorkflowId, setActingWorkflowId] = useState<string | null>(null);

  const tenant = { institutionId: context.institutionId, projectId: context.projectId };
  const noProject = !context.institutionId || !context.projectId;

  useEffect(() => {
    if (!context.institutionId || !context.projectId) return;
    listWorkflows({ institutionId: context.institutionId, projectId: context.projectId })
      .then((d) => setWorkflows(d.workflows))
      .catch(() => {});
  }, [context.institutionId, context.projectId, setWorkflows]);

  const refreshWorkflows = async () => {
    const d = await listWorkflows(tenant);
    setWorkflows(d.workflows);
  };

  // ── Table actions ────────────────────────────────────────────────────────

  const handleDeploy = async (id: string) => {
    setActingWorkflowId(id);
    try {
      await deployWorkflow(tenant, id);
      await refreshWorkflows();
      toast.success("Workflow deployed");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Deploy failed");
    } finally {
      setActingWorkflowId(null);
    }
  };

  const handleUndeploy = async (id: string) => {
    if (!confirm("Undeploy this workflow?")) return;
    setActingWorkflowId(id);
    try {
      await undeployWorkflow(tenant, id);
      await refreshWorkflows();
      toast.success("Workflow undeployed");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Undeploy failed");
    } finally {
      setActingWorkflowId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this draft workflow?")) return;
    setActingWorkflowId(id);
    try {
      await deleteWorkflow(tenant, id);
      await refreshWorkflows();
      toast.success("Workflow deleted");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setActingWorkflowId(null);
    }
  };

  // ── AI generation ─────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setGenError(null);
    try {
      const r = await compileBlueprint(tenant, {
        prompt,
        institution_context: { institution_type: institutionType, department, compliance_tags: tags },
      });
      const { nodes, edges, name } = blueprintToCanvas(r.blueprint);
      setCanvasInitialNodes(nodes);
      setCanvasInitialEdges(edges);
      setCanvasWorkflowName(name.replace(/_/g, " "));
      setPanelOpen(false);
      setCanvasOpen(true);
    } catch (e: unknown) {
      setGenError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  // ── Canvas deploy ─────────────────────────────────────────────────────────

  const handleCanvasDeploy = async (nodes: WorkflowNode[], edges: WorkflowEdge[], name: string) => {
    setDeploying(true);
    try {
      const def = canvasToDefinition(nodes, edges, slugify(name));
      const wf = await createWorkflow(tenant, { name: slugify(name), definition: def, is_ai_generated: true });
      await deployWorkflow(tenant, wf.id);
      await refreshWorkflows();
      setCanvasOpen(false);
      toast.success("Workflow deployed");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Deploy failed");
    } finally {
      setDeploying(false);
    }
  };

  const toggleTag = (t: string) => setTags((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));

  return (
    <div className="space-y-5">
      {/* Canvas review modal (full-screen) */}
      {canvasOpen && (
        <CanvasReviewModal
          initialNodes={canvasInitialNodes}
          initialEdges={canvasInitialEdges}
          workflowName={canvasWorkflowName}
          onDeploy={handleCanvasDeploy}
          onBack={() => { setCanvasOpen(false); setPanelOpen(true); }}
          deploying={deploying}
        />
      )}

      {/* Diagram viewer (full-screen read-only) */}
      <WorkflowDiagramModal
        workflow={diagramWorkflow ? { name: diagramWorkflow.name, version: diagramWorkflow.version, definition: diagramWorkflow.definition } : null}
        onClose={() => setDiagramWorkflow(null)}
      />

      {/* Project guard */}
      {noProject && (
        <div className="rounded-lg border px-5 py-4 flex items-start gap-3" style={{ background: "#1a0f00", borderColor: "#3a2500", color: "#fbbf24" }}>
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium">{context.projectId ? "Project not found" : "No project selected"}</p>
            <p className="text-xs mt-0.5" style={{ color: "#a16207" }}>
              {context.projectId ? "The selected project no longer exists." : "Go to Projects and select or create a project before building workflows."}
            </p>
            <a href="/console/projects" className="text-xs mt-1 inline-block underline" style={{ color: "#fbbf24" }}>Go to Projects →</a>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold" style={{ color: "#f4f4f5" }}>Workflows</h2>
          <p className="text-sm mt-0.5" style={{ color: "#71717a" }}>State-machine definitions powering your processes</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setPanelOpen(true); setGenError(null); }} disabled={noProject} className={`flex items-center gap-2 px-3 py-2 rounded text-sm${noProject ? " opacity-40 cursor-not-allowed" : ""}`} style={{ background: "#1b1b24", border: "1px solid #25252b", color: "#a1a1aa" }}>
            <Plus size={14} /> Quick Create
          </button>
          <button onClick={() => router.push("/console/workflows/new")} disabled={noProject} className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-medium${noProject ? " opacity-40 cursor-not-allowed" : ""}`} style={{ background: "#3b82f6", color: "#fff" }}>
            <Network size={14} /> Canvas Builder
          </button>
        </div>
      </div>

      {/* Workflow table */}
      <div className="rounded-lg overflow-x-auto" style={{ border: "1px solid #25252b" }}>
        <table className="w-full text-left text-sm min-w-[560px]">
          <thead style={{ background: "#141418" }}>
            <tr>
              {["Name", "Version", "Source", "Status", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3 text-xs font-medium uppercase tracking-wider" style={{ color: "#71717a" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {workflows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm" style={{ color: "#52525b" }}>
                  No workflows yet — click <strong style={{ color: "#a1a1aa" }}>Quick Create</strong> or <strong style={{ color: "#a1a1aa" }}>Canvas Builder</strong> to create one.
                </td>
              </tr>
            )}
            {workflows.map((wf) => (
              <tr key={wf.id} style={{ borderTop: "1px solid #1c1c22" }}>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setDiagramWorkflow(wf)}
                    className="flex items-center gap-2 font-medium transition-colors hover:opacity-70 text-left"
                    style={{ color: "#f4f4f5" }}
                    title="View workflow diagram"
                  >
                    <GitBranch size={13} style={{ color: "#52525b" }} />
                    {wf.name}
                    <Eye size={11} style={{ color: "#52525b" }} />
                  </button>
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: "#a1a1aa" }}>v{wf.version}</td>
                <td className="px-4 py-3">
                  {wf.is_ai_generated
                    ? <span className="text-[11px] px-1.5 py-0.5 rounded font-medium" style={{ background: "#1e1030", color: "#c084fc", border: "1px solid #2f1f40" }}>AI</span>
                    : <span className="text-[11px] px-1.5 py-0.5 rounded" style={{ background: "#141418", color: "#71717a", border: "1px solid #25252b" }}>Manual</span>}
                </td>
                <td className="px-4 py-3">
                  <span className="text-[11px] px-1.5 py-0.5 rounded" style={{ background: wf.deployed ? "#0a1a0a" : "#141418", color: wf.deployed ? "#86efac" : "#71717a", border: `1px solid ${wf.deployed ? "#1a3a1a" : "#25252b"}` }}>
                    {wf.deployed ? "Deployed" : "Draft"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {!wf.deployed && (
                      <>
                        <button onClick={() => router.push(`/console/workflows/${wf.id}/edit`)} disabled={actingWorkflowId === wf.id} className="text-xs hover:underline disabled:opacity-50" style={{ color: "#60a5fa" }}>Edit</button>
                        <button onClick={() => handleDeploy(wf.id)} disabled={actingWorkflowId === wf.id} className="text-xs hover:underline disabled:opacity-50" style={{ color: "#86efac" }}>Deploy</button>
                        <button onClick={() => handleDelete(wf.id)} disabled={actingWorkflowId === wf.id} className="text-xs hover:underline flex items-center gap-1 disabled:opacity-50" style={{ color: "#f87171" }}>
                          <Trash2 size={11} /> Delete
                        </button>
                      </>
                    )}
                    {wf.deployed && (
                      <>
                        <button onClick={() => handleUndeploy(wf.id)} disabled={actingWorkflowId === wf.id} className="text-xs hover:underline disabled:opacity-50" style={{ color: "#fbbf24" }}>Undeploy</button>
                        <a href="/console/architect" className="text-xs hover:underline flex items-center gap-1" style={{ color: "#60a5fa" }}>→ Architect</a>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Quick Create slide-in panel */}
      {panelOpen && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.6)" }} onClick={() => setPanelOpen(false)} />
          <div className="relative z-10 w-full max-w-[520px] flex flex-col overflow-hidden" style={{ background: "#141418", borderLeft: "1px solid #25252b" }}>
            {/* Panel header */}
            <div className="flex-none flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid #25252b" }}>
              <div>
                <h3 className="text-base font-semibold" style={{ color: "#f4f4f5" }}>Generate Workflow</h3>
                <p className="text-xs mt-0.5" style={{ color: "#52525b" }}>Describe a workflow to generate it with AI, then review and edit before deploying</p>
              </div>
              <button onClick={() => setPanelOpen(false)} style={{ color: "#71717a" }}><X size={18} /></button>
            </div>

            {/* Form */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium" style={{ color: "#a1a1aa" }}>Institution Type</label>
                <select className="w-full rounded px-3 py-2 text-sm outline-none" style={{ background: "#1b1b24", border: "1px solid #25252b", color: "#f4f4f5" }} value={institutionType} onChange={(e) => setInstitutionType(e.target.value)}>
                  <option value="">Select type…</option>
                  {INSTITUTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium" style={{ color: "#a1a1aa" }}>Department</label>
                <select className="w-full rounded px-3 py-2 text-sm outline-none" style={{ background: "#1b1b24", border: "1px solid #25252b", color: "#f4f4f5" }} value={department} onChange={(e) => setDepartment(e.target.value)}>
                  <option value="">Select department…</option>
                  {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium" style={{ color: "#a1a1aa" }}>Compliance Tags</label>
                <div className="flex flex-wrap gap-1.5">
                  {COMPLIANCE_OPTIONS.map((t) => (
                    <button key={t} onClick={() => toggleTag(t)} className="text-[11px] px-2 py-0.5 rounded transition-colors" style={tags.includes(t) ? { background: "#1e3a5f", color: "#93c5fd", border: "1px solid #1d4ed8" } : { background: "#1b1b24", color: "#71717a", border: "1px solid #25252b" }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium" style={{ color: "#a1a1aa" }}>Describe the workflow</label>
                <textarea
                  className="w-full rounded px-3 py-2.5 text-sm outline-none resize-none"
                  style={{ background: "#1b1b24", border: "1px solid #25252b", color: "#f4f4f5", minHeight: 120 }}
                  maxLength={2000}
                  placeholder="e.g., Multi-stage admissions with document verification, faculty review, and financial aid integration…"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && e.metaKey) handleGenerate(); }}
                />
                <div className="text-right text-[10px]" style={{ color: "#52525b" }}>{prompt.length}/2000</div>
              </div>
              {genError && (
                <div className="flex items-center gap-2 rounded px-3 py-2 text-sm" style={{ background: "#1a0a0a", color: "#fca5a5", border: "1px solid #3a1a1a" }}>
                  <AlertCircle size={14} />{genError}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex-none flex items-center justify-between px-5 py-4" style={{ borderTop: "1px solid #25252b" }}>
              <button onClick={() => setPanelOpen(false)} className="text-sm" style={{ color: "#71717a" }}>Cancel</button>
              <button
                onClick={handleGenerate}
                disabled={!prompt.trim() || generating}
                className="flex items-center gap-1.5 px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
                style={{ background: "#3b82f6", color: "#fff" }}
              >
                {generating ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                {generating ? "Generating…" : "Generate & Review"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
