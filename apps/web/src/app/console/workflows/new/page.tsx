"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
  Panel,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import {
  Sparkles,
  Plus,
  X,
  ChevronRight,
  Loader2,
  GitBranch,
  AlertCircle,
  CheckCircle2,
  Trash2,
} from "lucide-react";

import {
  compileBlueprint,
  deployBlueprint,
  createWorkflow,
  deployWorkflow,
  listWorkflows,
  type CompileBlueprintResponse,
} from "@/lib/console-api";
import { useProjectContextStore } from "@/lib/stores/project-context-store";
import { useWorkflowStore } from "@/lib/stores/workflow-store";
import { COMPLIANCE_OPTIONS } from "@/lib/constants";
import type {
  InstitutionalBlueprint,
  SchemaField as WorkflowSchemaField,
  StateType,
  WorkflowBlueprint,
  WorkflowDefinition,
} from "@/types/contracts";

// ── Types ──────────────────────────────────────────────────────────────────

// StateType is imported from @/types/contracts — do not redefine here.

type StateNodeData = {
  label: string;
  stateType: StateType;
};

type SchemaField = {
  id: string;
  name: string;
  type: "string" | "number" | "boolean";
  required: boolean;
  min?: number;
  max?: number;
  enumValues?: string;
};

type EdgeData = {
  condition?: string;
  emit_event?: string;
};

type WorkflowNode = Node<StateNodeData>;
type WorkflowEdge = Edge<EdgeData>;
type GeneratedBlueprint = InstitutionalBlueprint | WorkflowBlueprint;

// ── Custom Nodes ───────────────────────────────────────────────────────────

function InitialStateNode({ data, selected }: NodeProps<WorkflowNode>) {
  const d = data;
  return (
    <div
      style={{
        background: selected ? "#1e3a5f" : "#172040",
        border: `2px solid ${selected ? "#3b82f6" : "#2563eb"}`,
        borderRadius: 24,
        padding: "8px 20px",
        minWidth: 120,
        textAlign: "center",
        boxShadow: selected ? "0 0 0 2px #3b82f620" : "none",
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: "#2563eb", width: 8, height: 8 }} />
      <div style={{ fontSize: 11, color: "#93c5fd", marginBottom: 2, fontWeight: 600, letterSpacing: "0.05em" }}>
        INITIAL
      </div>
      <div style={{ fontSize: 13, color: "#f4f4f5", fontWeight: 500 }}>{d.label}</div>
      <Handle type="source" position={Position.Right} style={{ background: "#2563eb", width: 8, height: 8 }} />
    </div>
  );
}

function IntermediateStateNode({ data, selected }: NodeProps<WorkflowNode>) {
  const d = data;
  return (
    <div
      style={{
        background: selected ? "#2d1b4e" : "#1e1130",
        border: `2px solid ${selected ? "#a855f7" : "#7c3aed"}`,
        borderRadius: 10,
        padding: "8px 20px",
        minWidth: 130,
        textAlign: "center",
        boxShadow: selected ? "0 0 0 2px #a855f720" : "none",
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: "#7c3aed", width: 8, height: 8 }} />
      <div style={{ fontSize: 11, color: "#c4b5fd", marginBottom: 2, fontWeight: 600, letterSpacing: "0.05em" }}>
        STATE
      </div>
      <div style={{ fontSize: 13, color: "#f4f4f5", fontWeight: 500 }}>{d.label}</div>
      <Handle type="source" position={Position.Right} style={{ background: "#7c3aed", width: 8, height: 8 }} />
    </div>
  );
}

function TerminalStateNode({ data, selected }: NodeProps<WorkflowNode>) {
  const d = data;
  return (
    <div
      style={{
        background: selected ? "#1c1c26" : "#141418",
        border: `2px solid ${selected ? "#71717a" : "#3f3f46"}`,
        borderRadius: 6,
        padding: "8px 20px",
        minWidth: 120,
        textAlign: "center",
        outline: `3px solid ${selected ? "#52525b" : "#27272a"}`,
        outlineOffset: 2,
        boxShadow: selected ? "0 0 0 2px #71717a20" : "none",
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: "#52525b", width: 8, height: 8 }} />
      <div style={{ fontSize: 11, color: "#71717a", marginBottom: 2, fontWeight: 600, letterSpacing: "0.05em" }}>
        TERMINAL
      </div>
      <div style={{ fontSize: 13, color: "#a1a1aa", fontWeight: 500 }}>{d.label}</div>
    </div>
  );
}

const NODE_TYPES = {
  initial: InitialStateNode,
  intermediate: IntermediateStateNode,
  terminal: TerminalStateNode,
};

// ── Helpers ────────────────────────────────────────────────────────────────

let nodeIdCounter = 0;
function newNodeId() {
  return `state_${Date.now()}_${nodeIdCounter++}`;
}

function slugify(label: string) {
  return label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
}

function canvasToDefinition(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  name: string,
  schemaFields: SchemaField[]
): WorkflowDefinition {
  const states: WorkflowDefinition["states"] = {};

  let initialState = "";
  for (const node of nodes) {
    const d = node.data;
    const stateName = slugify(d.label) || node.id;
    if (d.stateType === "initial" && !initialState) initialState = stateName;

    const outEdges = edges.filter((e) => e.source === node.id);
    const transitions = outEdges.map((e) => {
      const ed = e.data || {};
      const targetNode = nodes.find((n) => n.id === e.target);
      const targetName = targetNode ? slugify(targetNode.data.label) || e.target : e.target;
      return {
        to: targetName,
        condition: ed.condition || null,
        emit_event: ed.emit_event || null,
      };
    });

    states[stateName] = {
      type: d.stateType,
      transitions,
    };
  }

  const definition: WorkflowDefinition = {
    name,
    initial_state: initialState,
    states,
  };

  if (schemaFields.length > 0) {
    definition.schema = {
      fields: schemaFields.map((f) => {
        const field: WorkflowSchemaField = {
          name: f.name,
          type: f.type,
          required: f.required,
        };
        if (f.type === "number") {
          if (f.min !== undefined) field.min = f.min;
          if (f.max !== undefined) field.max = f.max;
        }
        if (f.enumValues?.trim()) {
          field.enum = f.enumValues.split(",").map((s) => s.trim()).filter(Boolean);
        }
        return field;
      }),
    };
  }

  return definition;
}

function blueprintToCanvas(blueprint: GeneratedBlueprint) {
  const wf = "workflow" in blueprint ? blueprint.workflow : blueprint.workflows.main;
  if (!wf || !wf.states) return { nodes: [], edges: [] };

  const statesMap = wf.states;
  const initialState = wf.initial_state;

  const stateNames = Object.keys(statesMap);
  const nodes: WorkflowNode[] = [];
  const edges: WorkflowEdge[] = [];

  // Layout: grid placement
  const cols = Math.ceil(Math.sqrt(stateNames.length + 1));
  stateNames.forEach((stateName, i) => {
    const stateDef = statesMap[stateName];
    let stateType: StateType = "intermediate";
    if (stateName === initialState || stateDef?.type === "initial") stateType = "initial";
    else if (!stateDef?.transitions.length || stateDef?.type === "terminal") stateType = "terminal";

    const col = i % cols;
    const row = Math.floor(i / cols);

    nodes.push({
      id: stateName,
      type: stateType,
      position: { x: col * 200 + 60, y: row * 140 + 60 },
      data: { label: stateName, stateType },
    });

    const transitions = stateDef?.transitions || [];
    for (const t of transitions) {
      const toState = t.to;
      if (!toState) continue;
      const edgeId = `${stateName}-${toState}-${Math.random().toString(36).slice(2, 6)}`;
      edges.push({
        id: edgeId,
        source: stateName,
        target: toState,
        type: "smoothstep",
        animated: stateType === "initial",
        markerEnd: { type: MarkerType.ArrowClosed, color: "#52525b" },
        style: { stroke: "#3f3f46", strokeWidth: 1.5 },
        label: t.condition ? String(t.condition) : undefined,
        labelStyle: { fill: "#a1a1aa", fontSize: 10 },
        labelBgStyle: { fill: "#1b1b24" },
        data: { condition: t.condition || "", emit_event: t.emit_event || "" },
      });
    }
  });

  return { nodes, edges };
}

function collectEventsAndRoles(edges: WorkflowEdge[], blueprint?: CompileBlueprintResponse | null) {
  const events = new Set<string>();
  const roles = new Set<string>();

  for (const e of edges) {
    const ed = e.data || {};
    if (ed.emit_event) events.add(ed.emit_event);
  }

  if (blueprint?.blueprint) {
    const bpEvents = blueprint.blueprint.events ?? [];
    for (const ev of bpEvents) {
      if (ev.type) events.add(ev.type);
    }
    const bpRoles = blueprint.blueprint.roles ?? [];
    for (const role of bpRoles) {
      if (role.name) roles.add(role.name);
    }
  }

  return { events: Array.from(events), roles: Array.from(roles) };
}

// ── Main Page (wrapped in provider) ───────────────────────────────────────

export default function NewWorkflowPage() {
  return (
    <ReactFlowProvider>
      <WorkflowCanvas />
    </ReactFlowProvider>
  );
}

function WorkflowCanvas() {
  const router = useRouter();
  const context = useProjectContextStore((s) => s.context);
  const setWorkflows = useWorkflowStore((s) => s.setWorkflows);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const rfInstance = useReactFlow();

  const tenant = { institutionId: context.institutionId, projectId: context.projectId };
  const noProject = !context.institutionId || !context.projectId;

  const [nodes, setNodes, onNodesChange] = useNodesState<WorkflowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<WorkflowEdge>([]);

  const [workflowName, setWorkflowName] = useState("New Workflow");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  // Schema fields
  const [schemaFields, setSchemaFields] = useState<SchemaField[]>([]);

  // AI panel
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [blueprint, setBlueprint] = useState<CompileBlueprintResponse | null>(null);
  const [complianceTags, setComplianceTags] = useState<string[]>([]);

  // Save / deploy
  const [saving, setSaving] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);


  // Edge label editor
  const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null);
  const [edgeCondition, setEdgeCondition] = useState("");
  const [edgeEvent, setEdgeEvent] = useState("");

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;
  const selectedEdge = edges.find((e) => e.id === selectedEdgeId) || null;
  const { events, roles } = collectEventsAndRoles(edges, blueprint);

  // ── Connections ──────────────────────────────────────────────────────────

  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge: WorkflowEdge = {
        ...params,
        id: `${params.source}-${params.target}-${Date.now()}`,
        type: "smoothstep",
        markerEnd: { type: MarkerType.ArrowClosed, color: "#52525b" },
        style: { stroke: "#3f3f46", strokeWidth: 1.5 },
        labelStyle: { fill: "#a1a1aa", fontSize: 10 },
        labelBgStyle: { fill: "#1b1b24" },
        data: { condition: "", emit_event: "" },
      };
      setEdges((eds: WorkflowEdge[]) => addEdge(newEdge, eds));
    },
    [setEdges]
  );

  // ── Drag-and-drop from palette ────────────────────────────────────────────

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      if (!reactFlowWrapper.current) return;

      const stateType = event.dataTransfer.getData("application/reactflow-type") as StateType;
      if (!stateType) return;

      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = rfInstance.screenToFlowPosition({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });

      const label = stateType === "initial" ? "start" : stateType === "terminal" ? "end" : "state";
      const id = newNodeId();

      const newNode: WorkflowNode = {
        id,
        type: stateType,
        position,
        data: { label, stateType },
      };
      setNodes((nds: WorkflowNode[]) => nds.concat(newNode));
    },
    [rfInstance, setNodes]
  );

  // ── Node label editing ────────────────────────────────────────────────────

  function updateNodeLabel(id: string, label: string) {
    setNodes((nds: WorkflowNode[]) =>
      nds.map((n: WorkflowNode) =>
        n.id === id ? { ...n, data: { ...n.data, label } } : n
      )
    );
  }

  function updateNodeType(id: string, stateType: StateType) {
    setNodes((nds: WorkflowNode[]) =>
      nds.map((n: WorkflowNode) =>
        n.id === id ? { ...n, type: stateType, data: { ...n.data, stateType } } : n
      )
    );
  }

  function deleteNode(id: string) {
    setNodes((nds: WorkflowNode[]) => nds.filter((n: WorkflowNode) => n.id !== id));
    setEdges((eds: WorkflowEdge[]) => eds.filter((e: WorkflowEdge) => e.source !== id && e.target !== id));
    setSelectedNodeId(null);
  }

  // ── Edge editing ──────────────────────────────────────────────────────────

  function openEdgeEditor(edgeId: string) {
    const edge = edges.find((e) => e.id === edgeId);
    if (!edge) return;
    const ed = edge.data || {};
    setEdgeCondition(ed.condition || "");
    setEdgeEvent(ed.emit_event || "");
    setEditingEdgeId(edgeId);
  }

  function saveEdgeLabel() {
    if (!editingEdgeId) return;
    setEdges((eds: WorkflowEdge[]) =>
      eds.map((e: WorkflowEdge) =>
        e.id === editingEdgeId
          ? {
              ...e,
              label: edgeCondition || undefined,
              data: { condition: edgeCondition, emit_event: edgeEvent },
            }
          : e
      )
    );
    setEditingEdgeId(null);
  }

  function deleteEdge(id: string) {
    setEdges((eds: WorkflowEdge[]) => eds.filter((e: WorkflowEdge) => e.id !== id));
    setSelectedEdgeId(null);
    setEditingEdgeId(null);
  }

  // ── Schema fields ─────────────────────────────────────────────────────────

  function addSchemaField() {
    setSchemaFields((f) => [
      ...f,
      { id: `f_${Date.now()}`, name: "", type: "string", required: false },
    ]);
  }

  function updateField(id: string, patch: Partial<SchemaField>) {
    setSchemaFields((fs) => fs.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }

  function removeField(id: string) {
    setSchemaFields((fs) => fs.filter((f) => f.id !== id));
  }

  // ── AI generation ─────────────────────────────────────────────────────────

  async function handleAiGenerate() {
    if (!aiPrompt.trim()) return;
    setAiGenerating(true);
    setAiError(null);
    try {
      const result = await compileBlueprint(tenant, {
        prompt: aiPrompt,
        institution_context: { compliance_tags: complianceTags },
      });
      setBlueprint(result);

      // Populate canvas from blueprint
      const generatedBlueprint = result.blueprint;
      const { nodes: bpNodes, edges: bpEdges } = blueprintToCanvas(generatedBlueprint);
      setNodes(bpNodes);
      setEdges(bpEdges);

      // Extract workflow name
      const workflowDefinition =
        "workflow" in generatedBlueprint ? generatedBlueprint.workflow : generatedBlueprint.workflows.main;
      if (workflowDefinition.name) {
        setWorkflowName(workflowDefinition.name.replace(/_/g, " "));
      }

      // Extract schema fields
      setSchemaFields(
        (workflowDefinition.schema?.fields ?? []).map((field) => ({
          id: `f_${field.name}_${Date.now()}`,
          name: field.name,
          type: field.type,
          required: Boolean(field.required),
          min: field.min ?? undefined,
          max: field.max ?? undefined,
          enumValues: field.enum?.join(", ") || "",
        }))
      );

      setAiOpen(false);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setAiGenerating(false);
    }
  }

  // ── Save & Deploy ─────────────────────────────────────────────────────────

  async function handleSave() {
    if (!workflowName.trim() || nodes.length === 0) return;
    setSaving(true);
    setSaveError(null);
    try {
      const definition = canvasToDefinition(nodes, edges, slugify(workflowName), schemaFields);
      await createWorkflow(tenant, {
        name: slugify(workflowName),
        definition,
        is_ai_generated: Boolean(blueprint),
      });
      const d = await listWorkflows(tenant);
      setWorkflows(d.workflows);
      router.push("/console/workflows");
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeploy() {
    if (!workflowName.trim() || nodes.length === 0) return;
    setDeploying(true);
    setSaveError(null);
    try {
      if (blueprint?.id) {
        // Deploy the AI blueprint proposal directly
        await deployBlueprint(tenant, blueprint.id);
      } else {
        // Create and deploy from canvas
        const definition = canvasToDefinition(nodes, edges, slugify(workflowName), schemaFields);
        const wf = await createWorkflow(tenant, {
          name: slugify(workflowName),
          definition,
          is_ai_generated: false,
        });
        await deployWorkflow(tenant, wf.id);
      }
      const d = await listWorkflows(tenant);
      setWorkflows(d.workflows);
      // Navigate to architect page — the next step in the flow
      router.push("/console/architect");
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Deploy failed");
    } finally {
      setDeploying(false);
    }
  }

  const canDeploy = nodes.length > 0 && workflowName.trim().length > 0;
  const hasTerminal = nodes.some((n) => n.type === "terminal");

  if (noProject) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4" style={{ background: "#0f0f12" }}>
        <div className="rounded-xl border px-8 py-6 max-w-md text-center space-y-3" style={{ background: "#141418", borderColor: "#3a2500" }}>
          <AlertCircle size={28} style={{ color: "#fbbf24", margin: "0 auto" }} />
          <h2 className="text-lg font-semibold" style={{ color: "#f4f4f5" }}>
            {context.institutionId ? "No project selected" : "No project created"}
          </h2>
          <p className="text-sm" style={{ color: "#71717a" }}>
            {context.institutionId
              ? "Select a project from the Projects page before building a workflow."
              : "Create an institution and project first, then come back to build workflows."}
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <a href="/console/projects" className="px-4 py-2 rounded text-sm font-medium" style={{ background: "#3b82f6", color: "#fff" }}>
              Go to Projects
            </a>
            <button onClick={() => router.back()} className="px-4 py-2 rounded text-sm" style={{ background: "#1b1b24", border: "1px solid #25252b", color: "#a1a1aa" }}>
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col"
      style={{ height: "calc(100vh - 56px)", background: "#0f0f12", overflow: "hidden" }}
    >
      {/* ── Top Bar ── */}
      <div
        className="flex items-center gap-3 px-4 py-2.5 flex-none"
        style={{ background: "#141418", borderBottom: "1px solid #1c1c22" }}
      >
        <button
          onClick={() => router.push("/console/workflows")}
          className="text-sm"
          style={{ color: "#71717a" }}
        >
          ← Workflows
        </button>
        <div style={{ width: 1, height: 16, background: "#25252b" }} />
        <input
          className="text-sm font-medium outline-none bg-transparent"
          style={{ color: "#f4f4f5", minWidth: 160, maxWidth: 280 }}
          value={workflowName}
          onChange={(e) => setWorkflowName(e.target.value)}
          placeholder="Workflow name"
        />
        <div className="flex-1" />
        <button
          onClick={() => setAiOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm"
          style={{ background: "#1b1b24", border: "1px solid #25252b", color: "#a855f7" }}
        >
          <Sparkles size={13} /> AI Generate
        </button>
        {saveError && (
          <span className="text-xs" style={{ color: "#fca5a5" }}>
            {saveError}
          </span>
        )}
        <button
          onClick={handleSave}
          disabled={saving || nodes.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm disabled:opacity-40"
          style={{ background: "#1b1b24", border: "1px solid #25252b", color: "#a1a1aa" }}
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : null}
          Save Draft
        </button>
        <button
          onClick={handleDeploy}
          disabled={deploying || !canDeploy || !hasTerminal}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded text-sm font-medium disabled:opacity-40"
          style={{ background: "#3b82f6", color: "#fff" }}
          title={!hasTerminal ? "Add at least one terminal state" : ""}
        >
          {deploying ? <Loader2 size={13} className="animate-spin" /> : <ChevronRight size={13} />}
          Deploy & Continue
        </button>
      </div>

      {/* ── Main Canvas Area ── */}
      <div className="flex flex-1 min-h-0">
        {/* Left Palette */}
        <div
          className="flex-none w-44 flex flex-col gap-2 p-3"
          style={{ background: "#141418", borderRight: "1px solid #1c1c22" }}
        >
          <div className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: "#52525b" }}>
            State Types
          </div>
          <PaletteItem type="initial" label="Initial State" color="#2563eb" bg="#172040" />
          <PaletteItem type="intermediate" label="State" color="#7c3aed" bg="#1e1130" />
          <PaletteItem type="terminal" label="Terminal State" color="#3f3f46" bg="#141418" />

          <div className="mt-4 text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: "#52525b" }}>
            Canvas
          </div>
          <button
            className="w-full text-left rounded px-2 py-1.5 text-xs"
            style={{ background: "#1b1b24", border: "1px solid #25252b", color: "#71717a" }}
            onClick={() => {
              setNodes([]);
              setEdges([]);
              setBlueprint(null);
            }}
          >
            Clear Canvas
          </button>

          {nodes.length > 0 && (
            <div className="mt-3 space-y-1">
              <div className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: "#52525b" }}>
                States ({nodes.length})
              </div>
              {nodes.map((n) => (
                <div
                  key={n.id}
                  className="text-xs px-2 py-1 rounded cursor-pointer truncate"
                  style={{
                    background: selectedNodeId === n.id ? "#1b1b24" : "transparent",
                    color: n.type === "initial" ? "#60a5fa" : n.type === "terminal" ? "#52525b" : "#c4b5fd",
                    border: selectedNodeId === n.id ? "1px solid #25252b" : "1px solid transparent",
                  }}
                  onClick={() => setSelectedNodeId(n.id)}
                >
                  {n.data.label}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Canvas */}
        <div ref={reactFlowWrapper} className="flex-1 relative" onDrop={onDrop} onDragOver={onDragOver}>
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
            }}
            onEdgeClick={(_: React.MouseEvent, edge: WorkflowEdge) => {
              setSelectedEdgeId(edge.id);
              setSelectedNodeId(null);
              openEdgeEditor(edge.id);
            }}
            onPaneClick={() => {
              setSelectedNodeId(null);
              setSelectedEdgeId(null);
            }}
            deleteKeyCode="Delete"
            fitView
            style={{ background: "#0f0f12" }}
          >
            <Background color="#1c1c22" variant={BackgroundVariant.Dots} gap={20} size={1} />
            <Controls
              style={{ background: "#1b1b24", border: "1px solid #25252b" }}
              showInteractive={false}
            />
            {nodes.length === 0 && (
              <Panel position="top-center">
                <div
                  className="flex flex-col items-center gap-2 mt-20 select-none pointer-events-none"
                  style={{ color: "#3f3f46" }}
                >
                  <GitBranch size={32} />
                  <p className="text-sm">Drag state types from the palette, or use AI Generate</p>
                </div>
              </Panel>
            )}
          </ReactFlow>
        </div>

        {/* Right Detail Panel */}
        <div
          className="flex-none w-64 flex flex-col"
          style={{ background: "#141418", borderLeft: "1px solid #1c1c22" }}
        >
          {selectedNode ? (
            <NodeDetailPanel
              node={selectedNode}
              onLabelChange={(l) => updateNodeLabel(selectedNode.id, l)}
              onTypeChange={(t) => updateNodeType(selectedNode.id, t)}
              onDelete={() => deleteNode(selectedNode.id)}
            />
          ) : editingEdgeId && selectedEdge ? (
            <EdgeDetailPanel
              condition={edgeCondition}
              emitEvent={edgeEvent}
              onConditionChange={setEdgeCondition}
              onEmitEventChange={setEdgeEvent}
              onSave={saveEdgeLabel}
              onDelete={() => deleteEdge(selectedEdge.id)}
              onCancel={() => setEditingEdgeId(null)}
            />
          ) : (
            <SchemaPanel
              fields={schemaFields}
              onAdd={addSchemaField}
              onUpdate={updateField}
              onRemove={removeField}
            />
          )}
        </div>
      </div>

      {/* ── Bottom Bar — Events & Roles ── */}
      {(events.length > 0 || roles.length > 0) && (
        <div
          className="flex-none flex items-center gap-4 px-4 py-2 overflow-x-auto"
          style={{ background: "#141418", borderTop: "1px solid #1c1c22" }}
        >
          {events.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-widest" style={{ color: "#52525b" }}>
                Events
              </span>
              {events.map((ev) => (
                <span
                  key={ev}
                  className="text-[11px] px-2 py-0.5 rounded"
                  style={{ background: "#0a150a", color: "#86efac", border: "1px solid #14340a" }}
                >
                  {ev}
                </span>
              ))}
            </div>
          )}
          {events.length > 0 && roles.length > 0 && (
            <div style={{ width: 1, height: 16, background: "#25252b" }} />
          )}
          {roles.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-widest" style={{ color: "#52525b" }}>
                Roles
              </span>
              {roles.map((r) => (
                <span
                  key={r}
                  className="text-[11px] px-2 py-0.5 rounded"
                  style={{ background: "#0a0a1a", color: "#a5b4fc", border: "1px solid #0a0a2e" }}
                >
                  {r}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── AI Prompt Overlay ── */}
      {aiOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setAiOpen(false); }}
        >
          <div
            className="rounded-xl flex flex-col gap-4 p-6"
            style={{ background: "#141418", border: "1px solid #25252b", width: 480, maxWidth: "90vw" }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={16} style={{ color: "#a855f7" }} />
                <span className="text-sm font-semibold" style={{ color: "#f4f4f5" }}>
                  AI Workflow Generation
                </span>
              </div>
              <button onClick={() => setAiOpen(false)} style={{ color: "#71717a" }}>
                <X size={16} />
              </button>
            </div>
            <p className="text-xs" style={{ color: "#71717a" }}>
              Describe the workflow you need. The AI will generate states, transitions, schema fields, and compliance rules.
            </p>
            {/* Compliance tags */}
            <div>
              <label className="text-xs block mb-2" style={{ color: "#71717a" }}>Compliance Requirements</label>
              <div className="flex flex-wrap gap-1.5">
                {COMPLIANCE_OPTIONS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setComplianceTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])}
                    className="px-2 py-0.5 rounded text-[11px] border transition-colors"
                    style={
                      complianceTags.includes(tag)
                        ? { background: "#1e3a5f", borderColor: "#3b82f6", color: "#60a5fa" }
                        : { background: "transparent", borderColor: "#25252b", color: "#52525b" }
                    }
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              className="w-full rounded px-3 py-2.5 text-sm outline-none resize-none font-mono"
              style={{
                background: "#0f0f12",
                border: "1px solid #25252b",
                color: "#f4f4f5",
                minHeight: 100,
                lineHeight: 1.6,
              }}
              placeholder="e.g. Undergraduate admissions workflow with document review, interview, and scholarship assessment stages..."
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && e.metaKey) handleAiGenerate(); }}
              autoFocus
            />
            {aiError && (
              <div
                className="flex items-center gap-2 rounded px-3 py-2 text-sm"
                style={{ background: "#1a0a0a", color: "#fca5a5", border: "1px solid #3a1a1a" }}
              >
                <AlertCircle size={14} /> {aiError}
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-[11px]" style={{ color: "#52525b" }}>
                ⌘ + Enter to generate
              </span>
              <button
                onClick={handleAiGenerate}
                disabled={!aiPrompt.trim() || aiGenerating}
                className="flex items-center gap-2 px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
                style={{ background: "#3b82f6", color: "#fff" }}
              >
                {aiGenerating ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Sparkles size={13} />
                )}
                Generate Blueprint
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function PaletteItem({ type, label, color, bg }: { type: StateType; label: string; color: string; bg: string }) {
  return (
    <div
      draggable
      onDragStart={(e) => e.dataTransfer.setData("application/reactflow-type", type)}
      className="rounded px-3 py-2.5 cursor-grab active:cursor-grabbing select-none text-xs font-medium"
      style={{ background: bg, border: `1px solid ${color}40`, color: color }}
    >
      <div className="text-[10px] mb-0.5 opacity-60 uppercase tracking-wider">
        {type}
      </div>
      {label}
    </div>
  );
}

function NodeDetailPanel({
  node,
  onLabelChange,
  onTypeChange,
  onDelete,
}: {
  node: WorkflowNode;
  onLabelChange: (label: string) => void;
  onTypeChange: (type: StateType) => void;
  onDelete: () => void;
}) {
  const d = node.data;
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid #1c1c22" }}>
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#52525b" }}>
          Node
        </span>
        <button onClick={onDelete} className="text-xs flex items-center gap-1" style={{ color: "#ef4444" }}>
          <Trash2 size={12} /> Delete
        </button>
      </div>
      <div className="p-4 space-y-4">
        <div>
          <label className="text-[11px] uppercase tracking-wider block mb-1.5" style={{ color: "#52525b" }}>
            State Name
          </label>
          <input
            className="w-full rounded px-3 py-2 text-sm outline-none"
            style={{ background: "#0f0f12", border: "1px solid #25252b", color: "#f4f4f5" }}
            value={d.label}
            onChange={(e) => onLabelChange(e.target.value)}
          />
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-wider block mb-1.5" style={{ color: "#52525b" }}>
            State Type
          </label>
          <div className="flex flex-col gap-1.5">
            {(["initial", "intermediate", "terminal"] as StateType[]).map((t) => (
              <button
                key={t}
                onClick={() => onTypeChange(t)}
                className="px-3 py-1.5 rounded text-xs text-left"
                style={{
                  background: d.stateType === t ? "#1b1b24" : "transparent",
                  border: d.stateType === t ? "1px solid #25252b" : "1px solid transparent",
                  color: t === "initial" ? "#60a5fa" : t === "terminal" ? "#71717a" : "#c4b5fd",
                }}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
                {d.stateType === t && <CheckCircle2 size={10} className="inline ml-2" />}
              </button>
            ))}
          </div>
        </div>
        <div className="rounded p-3" style={{ background: "#0f0f12", border: "1px solid #1c1c22" }}>
          <div className="text-[11px]" style={{ color: "#52525b" }}>
            <strong style={{ color: "#3f3f46" }}>Tip:</strong> Click an edge to set transition conditions and emit events. Connect nodes by dragging from the right handle to another node&apos;s left handle.
          </div>
        </div>
      </div>
    </div>
  );
}

function EdgeDetailPanel({
  condition,
  emitEvent,
  onConditionChange,
  onEmitEventChange,
  onSave,
  onDelete,
  onCancel,
}: {
  condition: string;
  emitEvent: string;
  onConditionChange: (v: string) => void;
  onEmitEventChange: (v: string) => void;
  onSave: () => void;
  onDelete: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid #1c1c22" }}>
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#52525b" }}>
          Transition
        </span>
        <button onClick={onDelete} className="text-xs flex items-center gap-1" style={{ color: "#ef4444" }}>
          <Trash2 size={12} /> Delete
        </button>
      </div>
      <div className="p-4 space-y-4">
        <div>
          <label className="text-[11px] uppercase tracking-wider block mb-1.5" style={{ color: "#52525b" }}>
            Condition
          </label>
          <input
            className="w-full rounded px-3 py-2 text-sm outline-none font-mono"
            style={{ background: "#0f0f12", border: "1px solid #25252b", color: "#86efac" }}
            value={condition}
            onChange={(e) => onConditionChange(e.target.value)}
            placeholder="e.g. score >= 70"
          />
          <p className="text-[10px] mt-1" style={{ color: "#3f3f46" }}>
            Leave empty for unconditional transition
          </p>
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-wider block mb-1.5" style={{ color: "#52525b" }}>
            Emit Event
          </label>
          <input
            className="w-full rounded px-3 py-2 text-sm outline-none"
            style={{ background: "#0f0f12", border: "1px solid #25252b", color: "#f4f4f5" }}
            value={emitEvent}
            onChange={(e) => onEmitEventChange(e.target.value)}
            placeholder="e.g. application.approved"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded text-xs"
            style={{ background: "#1b1b24", border: "1px solid #25252b", color: "#71717a" }}
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="flex-1 py-2 rounded text-xs font-medium"
            style={{ background: "#3b82f6", color: "#fff" }}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

function SchemaPanel({
  fields,
  onAdd,
  onUpdate,
  onRemove,
}: {
  fields: SchemaField[];
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<SchemaField>) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid #1c1c22" }}>
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#52525b" }}>
          Schema Fields
        </span>
        <button
          onClick={onAdd}
          className="flex items-center gap-1 text-xs"
          style={{ color: "#3b82f6" }}
        >
          <Plus size={12} /> Add
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {fields.length === 0 && (
          <p className="text-xs text-center py-6" style={{ color: "#3f3f46" }}>
            No schema fields. Add fields to validate applicant data.
          </p>
        )}
        {fields.map((f) => (
          <div
            key={f.id}
            className="rounded p-2.5 space-y-2"
            style={{ background: "#0f0f12", border: "1px solid #1c1c22" }}
          >
            <div className="flex items-center gap-2">
              <input
                className="flex-1 rounded px-2 py-1 text-xs outline-none"
                style={{ background: "#141418", border: "1px solid #25252b", color: "#f4f4f5" }}
                value={f.name}
                onChange={(e) => onUpdate(f.id, { name: e.target.value })}
                placeholder="field_name"
              />
              <button onClick={() => onRemove(f.id)} style={{ color: "#52525b" }}>
                <X size={12} />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <select
                className="flex-1 rounded px-2 py-1 text-xs outline-none"
                style={{ background: "#141418", border: "1px solid #25252b", color: "#a1a1aa" }}
                value={f.type}
                onChange={(e) => onUpdate(f.id, { type: e.target.value as "string" | "number" | "boolean" })}
              >
                <option value="string">string</option>
                <option value="number">number</option>
                <option value="boolean">boolean</option>
              </select>
              <label className="flex items-center gap-1 text-[10px] cursor-pointer" style={{ color: "#71717a" }}>
                <input
                  type="checkbox"
                  checked={f.required}
                  onChange={(e) => onUpdate(f.id, { required: e.target.checked })}
                  className="rounded"
                />
                req
              </label>
            </div>
            {f.type === "number" && (
              <div className="flex gap-1.5">
                <input
                  className="flex-1 rounded px-2 py-1 text-[10px] outline-none"
                  style={{ background: "#141418", border: "1px solid #25252b", color: "#a1a1aa" }}
                  type="number"
                  placeholder="min"
                  value={f.min ?? ""}
                  onChange={(e) => onUpdate(f.id, { min: e.target.value ? Number(e.target.value) : undefined })}
                />
                <input
                  className="flex-1 rounded px-2 py-1 text-[10px] outline-none"
                  style={{ background: "#141418", border: "1px solid #25252b", color: "#a1a1aa" }}
                  type="number"
                  placeholder="max"
                  value={f.max ?? ""}
                  onChange={(e) => onUpdate(f.id, { max: e.target.value ? Number(e.target.value) : undefined })}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
