/**
 * WorkflowGraphSVG
 *
 * Renders a deterministic SVG state-machine diagram from a workflow definition.
 * Extracted from: console/workflows/page.tsx and console/templates/page.tsx
 * where the same component was copy-pasted with minor drift.
 *
 * WHY it lives here: any page that needs to visualise a workflow definition
 * imports this single component. Changes to layout, colours, or BFS logic
 * are made once and affect every surface.
 */

import type {
  InstitutionalBlueprint,
  WorkflowBlueprint,
  WorkflowDefinition,
  WorkflowState,
} from "@/types/contracts";

type TransitionEdge = {
  from: string;
  to: string;
  condition?: string;
};

type WorkflowGraphDefinition = WorkflowDefinition | WorkflowBlueprint | InstitutionalBlueprint;

type WorkflowGraphInput = {
  /** Accepts workflow blueprint, institutional blueprint, or raw workflow definition. */
  definition: WorkflowGraphDefinition;
  /** Max height of the SVG element. Defaults to 280. */
  maxHeight?: number;
};

// ── Layout constants ─────────────────────────────────────────────────────────

const NODE_W   = 108;
const NODE_H   = 32;
const H_GAP    = 52;
const V_GAP    = 18;
const PADDING  = 16;

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Resolves the canonical workflow definition regardless of which wrapper shape
 * the page passes in.
 */
function resolveWorkflow(definition: WorkflowGraphDefinition): {
  stateMap: Record<string, WorkflowState>;
  transitions: TransitionEdge[];
  initialState: string;
} | null {
  const workflow =
    "workflow" in definition
      ? definition.workflow
      : "workflows" in definition
        ? definition.workflows.main
        : definition;

  const stateMap = workflow.states ?? {};
  if (Object.keys(stateMap).length === 0) return null;

  const transitions: TransitionEdge[] = Object.entries(stateMap).flatMap(([from, state]) =>
    (state.transitions ?? []).map((transition) => ({
      from,
      to: transition.to,
      condition: transition.condition ?? undefined,
    }))
  );

  // Resolve initial state from the explicit field, or fall back to the first initial-like state.
  const initialState =
    workflow.initial_state ??
    Object.entries(stateMap).find(
      ([, state]) => state.type === "initial"
    )?.[0] ??
    Object.keys(stateMap)[0];

  return { stateMap, transitions, initialState };
}

/**
 * Assigns a BFS layer index to every state so the graph flows left → right.
 * States unreachable from the initial state are placed in a final overflow layer.
 */
function assignLayers(
  stateNames: string[],
  initialState: string,
  transitions: TransitionEdge[]
): Record<string, number> {
  const layerOf: Record<string, number> = { [initialState]: 0 };
  const queue = [initialState];
  let head = 0;

  while (head < queue.length) {
    const curr = queue[head++];
    for (const t of transitions) {
      if (t.from === curr && !(t.to in layerOf)) {
        layerOf[t.to] = layerOf[curr] + 1;
        queue.push(t.to);
      }
    }
  }

  // Place any unreachable states after the deepest layer
  const maxLayer = Math.max(0, ...Object.values(layerOf));
  for (const s of stateNames) {
    if (!(s in layerOf)) layerOf[s] = maxLayer + 1;
  }

  return layerOf;
}

/**
 * Converts layer assignments into x,y pixel coordinates.
 */
function buildPositions(
  stateNames: string[],
  layerOf: Record<string, number>
): Record<string, { x: number; y: number }> {
  const byLayer: Record<number, string[]> = {};
  for (const [s, l] of Object.entries(layerOf)) {
    if (!byLayer[l]) byLayer[l] = [];
    byLayer[l].push(s);
  }

  const layers = Object.keys(byLayer).map(Number).sort((a, b) => a - b);
  const maxRows = Math.max(...layers.map((l) => byLayer[l].length));
  const totalH =
    PADDING * 2 + maxRows * NODE_H + (maxRows - 1) * V_GAP;

  const pos: Record<string, { x: number; y: number }> = {};

  layers.forEach((layer, li) => {
    const states = byLayer[layer];
    const blockH = states.length * NODE_H + (states.length - 1) * V_GAP;
    const startY = PADDING + (totalH - PADDING * 2 - blockH) / 2;
    states.forEach((state, si) => {
      pos[state] = {
        x: PADDING + li * (NODE_W + H_GAP),
        y: startY + si * (NODE_H + V_GAP),
      };
    });
  });

  return pos;
}

// ── Component ────────────────────────────────────────────────────────────────

export function WorkflowGraphSVG({
  definition,
  maxHeight = 280,
}: WorkflowGraphInput) {
  const resolved = resolveWorkflow(definition);

  if (!resolved) {
    return (
      <p className="text-center text-sm py-8" style={{ color: "#52525b" }}>
        No graph data
      </p>
    );
  }

  const { stateMap, transitions, initialState } = resolved;
  const stateNames = Object.keys(stateMap);

  if (stateNames.length === 0) {
    return (
      <p className="text-center text-sm py-8" style={{ color: "#52525b" }}>
        No states defined
      </p>
    );
  }

  const layerOf   = assignLayers(stateNames, initialState, transitions);
  const pos        = buildPositions(stateNames, layerOf);
  const layers     = [...new Set(Object.values(layerOf))].sort((a, b) => a - b);
  const maxRows    = Math.max(...layers.map((l) =>
    Object.values(layerOf).filter((v) => v === l).length
  ));

  const totalH = PADDING * 2 + maxRows * NODE_H + (maxRows - 1) * V_GAP;
  const totalW = PADDING * 2 + layers.length * NODE_W + (layers.length - 1) * H_GAP;

  // Terminal states: no outgoing transitions
  const terminalSet = new Set(
    stateNames.filter((stateName) => {
      const state = stateMap[stateName];
      return state?.type === "terminal" || (state?.transitions?.length ?? 0) === 0;
    })
  );

  return (
    <svg
      viewBox={`0 0 ${totalW} ${totalH}`}
      className="w-full"
      style={{ maxHeight, minHeight: 100 }}
      aria-label="Workflow state machine diagram"
      role="img"
    >
      {/* Arrow marker definition */}
      <defs>
        <marker
          id="wf-arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto"
        >
          <path d="M0 1 L10 5 L0 9z" fill="#3f3f46" />
        </marker>
      </defs>

      {/* Transition edges */}
      {transitions.map((t, i) => {
        const f  = pos[t.from];
        const to = pos[t.to];
        if (!f || !to) return null;

        const x1 = f.x + NODE_W;
        const y1 = f.y + NODE_H / 2;
        const x2 = to.x;
        const y2 = to.y + NODE_H / 2;
        const mx = (x1 + x2) / 2;

        const d =
          Math.abs(y1 - y2) < 4
            ? `M${x1} ${y1} L${x2} ${y2}`
            : `M${x1} ${y1} C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}`;

        return (
          <g key={`edge-${i}`}>
            <path
              d={d}
              fill="none"
              stroke="#3f3f46"
              strokeWidth="1.5"
              markerEnd="url(#wf-arrow)"
            />
            {t.condition && (
              <text
                x={(x1 + x2) / 2}
                y={Math.min(y1, y2) - 5}
                textAnchor="middle"
                fontSize="8"
                fill="#52525b"
              >
                {t.condition.length > 22
                  ? `${t.condition.slice(0, 21)}…`
                  : t.condition}
              </text>
            )}
          </g>
        );
      })}

      {/* State nodes */}
      {stateNames.map((name) => {
        const p = pos[name];
        if (!p) return null;

        const isInit = name === initialState;
        const isTerm = terminalSet.has(name);

        const fill   = isInit ? "#172554" : isTerm ? "#141418" : "#1b1b24";
        const stroke = isInit ? "#3b82f6" : isTerm ? "#52525b"  : "#3f3f46";
        const color  = isInit ? "#93c5fd" : isTerm ? "#52525b"  : "#d4d4d8";

        const displayName =
          name.length > 13 ? `${name.slice(0, 12)}…` : name;

        return (
          <g key={`node-${name}`}>
            <rect
              x={p.x}
              y={p.y}
              width={NODE_W}
              height={NODE_H}
              rx={4}
              fill={fill}
              stroke={stroke}
              strokeWidth={1.5}
            />
            <text
              x={p.x + NODE_W / 2}
              y={p.y + NODE_H / 2 + 4}
              textAnchor="middle"
              fontSize="10"
              fill={color}
            >
              {displayName}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
