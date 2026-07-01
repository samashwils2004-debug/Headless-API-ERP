"use client";

import {
  ReactFlow,
  Background,
  Controls,
  MarkerType,
  BackgroundVariant,
  ReactFlowProvider,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
} from "@xyflow/react";
import { X, GitBranch } from "lucide-react";
import type { StateType, WorkflowDefinition } from "@/types/contracts";

// ── Node types (read-only, same visual as Canvas Builder) ─────────────────

type StateNodeData = { label: string; stateType: StateType };
type DiagramNode = Node<StateNodeData>;
type DiagramEdge = Edge<{ condition?: string; emit_event?: string }>;

function InitialNode({ data, selected }: NodeProps<DiagramNode>) {
  return (
    <div style={{ background: selected ? "#1e3a5f" : "#172040", border: `2px solid ${selected ? "#3b82f6" : "#2563eb"}`, borderRadius: 24, padding: "8px 20px", minWidth: 120, textAlign: "center", boxShadow: selected ? "0 0 0 2px #3b82f620" : "none" }}>
      <Handle type="target" position={Position.Left} style={{ background: "#2563eb", width: 8, height: 8 }} />
      <div style={{ fontSize: 11, color: "#93c5fd", fontWeight: 600, letterSpacing: "0.05em", marginBottom: 2 }}>INITIAL</div>
      <div style={{ fontSize: 13, color: "#f4f4f5", fontWeight: 500 }}>{data.label}</div>
      <Handle type="source" position={Position.Right} style={{ background: "#2563eb", width: 8, height: 8 }} />
    </div>
  );
}

function IntermNode({ data, selected }: NodeProps<DiagramNode>) {
  return (
    <div style={{ background: selected ? "#2d1b4e" : "#1e1130", border: `2px solid ${selected ? "#a855f7" : "#7c3aed"}`, borderRadius: 10, padding: "8px 20px", minWidth: 130, textAlign: "center", boxShadow: selected ? "0 0 0 2px #a855f720" : "none" }}>
      <Handle type="target" position={Position.Left} style={{ background: "#7c3aed", width: 8, height: 8 }} />
      <div style={{ fontSize: 11, color: "#c4b5fd", fontWeight: 600, letterSpacing: "0.05em", marginBottom: 2 }}>STATE</div>
      <div style={{ fontSize: 13, color: "#f4f4f5", fontWeight: 500 }}>{data.label}</div>
      <Handle type="source" position={Position.Right} style={{ background: "#7c3aed", width: 8, height: 8 }} />
    </div>
  );
}

function TerminalNode({ data, selected }: NodeProps<DiagramNode>) {
  return (
    <div style={{ background: selected ? "#1c1c26" : "#141418", border: `2px solid ${selected ? "#71717a" : "#3f3f46"}`, borderRadius: 6, padding: "8px 20px", minWidth: 120, textAlign: "center", outline: `3px solid ${selected ? "#52525b" : "#27272a"}`, outlineOffset: 2 }}>
      <Handle type="target" position={Position.Left} style={{ background: "#52525b", width: 8, height: 8 }} />
      <div style={{ fontSize: 11, color: "#71717a", fontWeight: 600, letterSpacing: "0.05em", marginBottom: 2 }}>TERMINAL</div>
      <div style={{ fontSize: 13, color: "#a1a1aa", fontWeight: 500 }}>{data.label}</div>
    </div>
  );
}

const DIAGRAM_NODE_TYPES = {
  initial: InitialNode,
  intermediate: IntermNode,
  terminal: TerminalNode,
};

// ── Convert WorkflowDefinition to ReactFlow nodes/edges ───────────────────

export function definitionToCanvas(definition: WorkflowDefinition): { nodes: DiagramNode[]; edges: DiagramEdge[] } {
  const statesMap = definition.states || {};
  const initialState = definition.initial_state;
  const stateNames = Object.keys(statesMap);

  if (stateNames.length === 0) return { nodes: [], edges: [] };

  // Topological-ish layout: BFS from initial state
  const positions: Record<string, { x: number; y: number }> = {};
  const visited = new Set<string>();
  const queue: Array<{ name: string; col: number; row: number }> = [];
  const rowCounters: Record<number, number> = {};

  const startState = initialState || stateNames[0];
  queue.push({ name: startState, col: 0, row: 0 });
  visited.add(startState);

  while (queue.length > 0) {
    const { name, col, row } = queue.shift()!;
    rowCounters[col] = (rowCounters[col] || 0);
    const actualRow = rowCounters[col];
    rowCounters[col]++;
    positions[name] = { x: col * 220 + 60, y: actualRow * 140 + 60 };

    const state = statesMap[name];
    if (!state) continue;
    for (const t of state.transitions || []) {
      if (t.to && !visited.has(t.to)) {
        visited.add(t.to);
        queue.push({ name: t.to, col: col + 1, row: actualRow });
      }
    }
  }

  // Place any unreachable states
  const unreachable = stateNames.filter((n) => !visited.has(n));
  const maxCol = Object.keys(rowCounters).length;
  unreachable.forEach((name, i) => {
    positions[name] = { x: (maxCol + 1) * 220 + 60, y: i * 140 + 60 };
  });

  const nodes: DiagramNode[] = stateNames.map((name) => {
    const sd = statesMap[name];
    let stateType: StateType = "intermediate";
    if (name === initialState || sd?.type === "initial") stateType = "initial";
    else if (!sd?.transitions?.length || sd?.type === "terminal") stateType = "terminal";
    return {
      id: name,
      type: stateType,
      position: positions[name] || { x: 60, y: 60 },
      data: { label: name, stateType },
    };
  });

  const edges: DiagramEdge[] = [];
  for (const [sName, sd] of Object.entries(statesMap)) {
    for (const t of sd.transitions || []) {
      if (!t.to) continue;
      edges.push({
        id: `${sName}-${t.to}-${Math.random().toString(36).slice(2, 6)}`,
        source: sName,
        target: t.to,
        type: "smoothstep",
        markerEnd: { type: MarkerType.ArrowClosed, color: "#52525b" },
        style: { stroke: "#3f3f46", strokeWidth: 1.5 },
        label: t.condition || undefined,
        labelStyle: { fill: "#a1a1aa", fontSize: 10 },
        labelBgStyle: { fill: "#1b1b24" },
        data: { condition: t.condition || "", emit_event: t.emit_event || "" },
      });
    }
  }

  return { nodes, edges };
}

// ── Modal ─────────────────────────────────────────────────────────────────

export type WorkflowForDiagram = {
  name: string;
  version?: number;
  definition: WorkflowDefinition;
};

function DiagramContent({ workflow, onClose }: { workflow: WorkflowForDiagram; onClose: () => void }) {
  const { nodes, edges } = definitionToCanvas(workflow.definition);

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "#0f0f12" }}>
      {/* Header */}
      <div className="flex-none flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid #25252b", background: "#141418" }}>
        <div className="flex items-center gap-3">
          <GitBranch size={16} style={{ color: "#3b82f6" }} />
          <div>
            <h2 className="text-sm font-semibold" style={{ color: "#f4f4f5" }}>{workflow.name}</h2>
            <p className="text-xs mt-0.5" style={{ color: "#71717a" }}>
              {workflow.version != null ? `v${workflow.version} · ` : ""}
              {Object.keys(workflow.definition.states || {}).length} states
              {workflow.definition.initial_state ? ` · starts at "${workflow.definition.initial_state}"` : ""}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 rounded px-3 py-1.5 text-sm transition-colors hover:bg-[#1b1b24]"
          style={{ color: "#a1a1aa", border: "1px solid #25252b" }}
        >
          <X size={14} /> Close
        </button>
      </div>

      {/* Legend */}
      <div className="flex-none flex items-center gap-4 px-6 py-2.5" style={{ borderBottom: "1px solid #1c1c22", background: "#141418" }}>
        {[
          { type: "initial", color: "#2563eb", label: "Initial" },
          { type: "intermediate", color: "#7c3aed", label: "State" },
          { type: "terminal", color: "#3f3f46", label: "Terminal" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5 text-xs" style={{ color: "#71717a" }}>
            <div className="w-2 h-2 rounded-sm" style={{ background: color }} />
            {label}
          </div>
        ))}
        <span className="text-xs ml-auto" style={{ color: "#52525b" }}>Read-only view</span>
      </div>

      {/* Canvas */}
      <div className="flex-1 min-h-0">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={DIAGRAM_NODE_TYPES}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={true}
          style={{ background: "#0f0f12" }}
        >
          <Background color="#1c1c22" variant={BackgroundVariant.Dots} gap={24} size={1} />
          <Controls style={{ background: "#1b1b24", border: "1px solid #25252b" }} showInteractive={false} />
        </ReactFlow>
      </div>
    </div>
  );
}

export function WorkflowDiagramModal({ workflow, onClose }: { workflow: WorkflowForDiagram | null; onClose: () => void }) {
  if (!workflow) return null;
  return (
    <ReactFlowProvider>
      <DiagramContent workflow={workflow} onClose={onClose} />
    </ReactFlowProvider>
  );
}
