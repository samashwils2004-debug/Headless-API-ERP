export default function WorkflowBuilderManualPage() {
  return (
    <>
      {/* Badge */}
      <div className="inline-flex items-center gap-2 rounded-full border border-purple-900/50 bg-purple-900/20 px-3 py-1 text-xs text-purple-400 mb-6 font-sans">
        Manual · Workflow Builder
      </div>

      <h1 className="text-4xl font-bold tracking-tight mb-4">Building Workflows</h1>
      <p className="text-lg text-gray-400 leading-relaxed mb-10">
        Orquestra workflows are deterministic state machines. Every application submission follows
        a strict path through states you define — no hidden logic, no runtime surprises. This guide
        walks through every part of the Workflow Canvas and explains what each feature does.
      </p>

      {/* ── What is a workflow ── */}
      <h2 className="text-2xl font-bold mt-12 mb-4">What is a Workflow?</h2>
      <p className="text-gray-300 mb-4">
        A workflow is a named, versioned JSON state machine that governs the lifecycle of an
        application. For example, an <em>Undergraduate Admissions</em> workflow might have states
        like <code>submitted → under_review → approved</code> or <code>submitted → under_review → rejected</code>.
      </p>
      <p className="text-gray-300 mb-4">
        Workflows in Orquestra are <strong>immutable once deployed</strong>. Any change to an
        existing workflow creates a new version. Active applications continue to run on the version
        they started on, so nothing breaks mid-flight.
      </p>

      <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] p-5 mb-8 text-sm font-mono text-gray-300">
        submitted → under_review → approved<br />
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;↘ rejected
      </div>

      {/* ── Accessing the canvas ── */}
      <h2 className="text-2xl font-bold mt-12 mb-4">Accessing the Canvas</h2>
      <p className="text-gray-300 mb-4">
        From the Console, go to <strong>Workflows</strong> in the left navigation. You will see two
        buttons at the top right:
      </p>
      <ul className="list-disc list-inside text-gray-400 space-y-2 mb-6">
        <li>
          <strong className="text-gray-200">Quick Create</strong> — A slide-in panel for fast AI generation
          or raw JSON entry. Good for simple workflows.
        </li>
        <li>
          <strong className="text-gray-200">Canvas Builder</strong> — The full visual editor described in
          this guide. Best for complex, multi-path workflows.
        </li>
      </ul>
      <p className="text-gray-300 mb-8">
        Click <strong>Canvas Builder</strong> to open the workflow canvas at{" "}
        <code>/console/workflows/new</code>.
      </p>

      {/* ── Canvas layout ── */}
      <h2 className="text-2xl font-bold mt-12 mb-4">Canvas Layout</h2>
      <p className="text-gray-300 mb-6">
        The canvas is divided into four areas:
      </p>

      <div className="space-y-4 mb-10">
        <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] p-5">
          <h3 className="font-bold text-white mb-1">Top Bar</h3>
          <p className="text-gray-400 text-sm">
            Contains the workflow name input (editable inline), the <strong>AI Generate</strong> button,
            a <strong>Save Draft</strong> button, and the primary <strong>Deploy &amp; Continue</strong> button.
            Saving a draft creates the workflow record without deploying it — it won&apos;t be available via
            the Runtime API yet. Deploying marks it active and redirects you to the Architect page.
          </p>
        </div>

        <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] p-5">
          <h3 className="font-bold text-white mb-1">Left Palette</h3>
          <p className="text-gray-400 text-sm">
            Three draggable state type tiles: <strong>Initial</strong>, <strong>State</strong>, and{" "}
            <strong>Terminal</strong>. Drag any tile onto the canvas to place a new state node. The state
            list below the tiles shows all current nodes and lets you click to select them.
          </p>
        </div>

        <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] p-5">
          <h3 className="font-bold text-white mb-1">Center Canvas</h3>
          <p className="text-gray-400 text-sm">
            The main editing area. Drag nodes to position them. Connect two nodes by dragging from
            the right-side handle of one node to the left-side handle of another — this creates a
            transition. Click a node to select it; click an edge (arrow) to open the transition editor.
            Press <code>Delete</code> or <code>Backspace</code> to remove a selected node or edge.
          </p>
        </div>

        <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] p-5">
          <h3 className="font-bold text-white mb-1">Right Detail Panel</h3>
          <p className="text-gray-400 text-sm">
            Context-sensitive. Shows the <strong>Node Editor</strong> when a state is selected, the{" "}
            <strong>Transition Editor</strong> when an edge is selected, or the <strong>Schema Fields Editor</strong>{" "}
            when nothing is selected. Each is explained in detail below.
          </p>
        </div>

        <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] p-5">
          <h3 className="font-bold text-white mb-1">Bottom Bar</h3>
          <p className="text-gray-400 text-sm">
            Automatically collects all <strong>emit events</strong> and <strong>roles</strong> from your
            canvas (including those added by AI generation). This gives you a live overview of the events
            your workflow will publish and the roles that will interact with it.
          </p>
        </div>
      </div>

      {/* ── State node types ── */}
      <h2 className="text-2xl font-bold mt-12 mb-4">State Node Types</h2>
      <p className="text-gray-300 mb-6">
        Every state in a workflow has one of three types. The type is both visual (color-coded) and
        semantic — the workflow engine uses it to determine routing behaviour.
      </p>

      <div className="space-y-4 mb-10">
        <div className="rounded-md border border-blue-900/40 bg-blue-950/20 p-5">
          <h3 className="font-bold text-blue-300 mb-1">Initial State <span className="text-xs font-normal text-blue-500 ml-2">(blue, pill-shaped)</span></h3>
          <p className="text-gray-400 text-sm">
            The entry point of the workflow. Every workflow must have exactly one initial state. When an
            application is submitted through the Runtime API, execution begins here. Typically named{" "}
            <code>submitted</code> or <code>received</code>.
          </p>
        </div>

        <div className="rounded-md border border-purple-900/40 bg-purple-950/20 p-5">
          <h3 className="font-bold text-purple-300 mb-1">State <span className="text-xs font-normal text-purple-500 ml-2">(purple, rounded rectangle)</span></h3>
          <p className="text-gray-400 text-sm">
            Intermediate processing states. The workflow engine evaluates outgoing transitions from each
            intermediate state one by one. The first transition whose condition evaluates to{" "}
            <code>true</code> is taken. If no transition matches, the application halts with status{" "}
            <code>waiting_manual_action</code> until a manual trigger moves it forward.
          </p>
        </div>

        <div className="rounded-md border border-zinc-700/40 bg-zinc-900/30 p-5">
          <h3 className="font-bold text-zinc-400 mb-1">Terminal State <span className="text-xs font-normal text-zinc-600 ml-2">(gray, double-bordered rectangle)</span></h3>
          <p className="text-gray-400 text-sm">
            End states with no outgoing transitions. Reaching a terminal state marks the application as{" "}
            <code>completed</code>. A workflow must have at least one terminal state — the Deploy button
            is disabled until one exists. Common names: <code>approved</code>, <code>rejected</code>,{" "}
            <code>withdrawn</code>, <code>archived</code>.
          </p>
        </div>
      </div>

      {/* ── Connecting nodes ── */}
      <h2 className="text-2xl font-bold mt-12 mb-4">Creating Transitions</h2>
      <p className="text-gray-300 mb-4">
        Transitions are the arrows between states. To create one, hover over a state node until the
        handles (small circles) appear on its edges, then drag from the <strong>right handle</strong> to
        the <strong>left handle</strong> of the destination node.
      </p>
      <p className="text-gray-300 mb-8">
        Once created, click the transition arrow to open the <strong>Transition Editor</strong> in the
        right panel. Here you set two things:
      </p>

      <div className="space-y-4 mb-10">
        <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] p-5">
          <h3 className="font-bold text-white mb-1">Condition</h3>
          <p className="text-gray-400 text-sm mb-3">
            A boolean expression evaluated against the application&apos;s submitted data. The workflow engine
            checks each outgoing transition in order and takes the first one whose condition is{" "}
            <code>true</code>. Leave blank for an unconditional (always-taken) transition.
          </p>
          <p className="text-xs text-gray-500 mb-2">Examples:</p>
          <div className="rounded bg-[#0f0f12] border border-[var(--border-default)] p-3 font-mono text-xs text-green-400 space-y-1">
            <div>score &gt;= 70</div>
            <div>score &lt; 70</div>
            <div>decision == &apos;approve&apos;</div>
            <div>gpa &gt;= 3.5</div>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Field names in conditions must match the field names defined in the Schema Fields editor.
            Do not prefix with <code>application_data.</code> — use bare field names only.
          </p>
        </div>

        <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] p-5">
          <h3 className="font-bold text-white mb-1">Emit Event</h3>
          <p className="text-gray-400 text-sm">
            The event published to the Orquestra event backbone whenever this transition fires. Events
            follow a <code>domain.action</code> naming convention. These are surfaced in the Console
            event stream and can trigger webhooks once your architecture is compiled.
          </p>
          <div className="rounded bg-[#0f0f12] border border-[var(--border-default)] p-3 font-mono text-xs text-gray-300 mt-3 space-y-1">
            <div>application.submitted</div>
            <div>application.approved</div>
            <div>application.rejected</div>
            <div>review.completed</div>
          </div>
        </div>
      </div>

      {/* ── Node editor ── */}
      <h2 className="text-2xl font-bold mt-12 mb-4">Editing a State Node</h2>
      <p className="text-gray-300 mb-6">
        Click any node on the canvas to open its editor in the right panel. Two fields are available:
      </p>
      <ul className="list-disc list-inside text-gray-400 space-y-3 mb-8">
        <li>
          <strong className="text-gray-200">State Name</strong> — The identifier used internally and in
          transition conditions. Use lowercase with underscores: <code>under_review</code>,{" "}
          <code>awaiting_documents</code>. The canvas slugifies your label automatically when converting
          to JSON.
        </li>
        <li>
          <strong className="text-gray-200">State Type</strong> — Change between Initial, State, and
          Terminal. Only one Initial state should exist in a valid workflow.
        </li>
        <li>
          <strong className="text-gray-200">Delete button</strong> — Removes the node and all its
          connected transitions from the canvas.
        </li>
      </ul>

      {/* ── Schema fields ── */}
      <h2 className="text-2xl font-bold mt-12 mb-4">Schema Fields</h2>
      <p className="text-gray-300 mb-4">
        Schema fields define what data an applicant must (or may) submit when creating an application
        through the Runtime API. When nothing is selected on the canvas, the right panel shows the
        Schema Fields editor.
      </p>
      <p className="text-gray-300 mb-6">
        Fields are validated by the workflow engine at execution time. If a required field is missing or
        fails its constraints, the application is rejected with a <code>422</code> error before the
        workflow even starts.
      </p>

      <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] p-5 mb-6">
        <h3 className="font-bold text-white mb-3">Field Properties</h3>
        <div className="space-y-3 text-sm text-gray-400">
          <div><strong className="text-gray-200">Name</strong> — Must match field names used in transition conditions exactly.</div>
          <div><strong className="text-gray-200">Type</strong> — <code>string</code>, <code>number</code>, or <code>boolean</code>.</div>
          <div><strong className="text-gray-200">Required</strong> — If checked, the field must be present in applicant data or the submission is rejected.</div>
          <div><strong className="text-gray-200">Min / Max</strong> — Only for <code>number</code> fields. Validates the submitted value is within range.</div>
        </div>
      </div>

      <div className="p-4 border-l-2 border-blue-500 bg-blue-500/10 text-blue-200 mb-10 rounded-r-md text-sm">
        <strong>Tip:</strong> When you use AI Generate, the schema fields are extracted automatically
        from the generated blueprint and pre-populated in the editor. You can add, remove, or adjust
        them before deploying.
      </div>

      {/* ── AI generation ── */}
      <h2 className="text-2xl font-bold mt-12 mb-4">AI Workflow Generation</h2>
      <p className="text-gray-300 mb-4">
        Click <strong>AI Generate</strong> in the top bar to open the prompt overlay. Describe the
        workflow you need in plain language. The AI uses a four-stage validation pipeline to ensure the
        generated blueprint is structurally sound before it is placed on the canvas.
      </p>

      <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] p-5 mb-6">
        <h3 className="font-bold text-white mb-3">What the AI Generates</h3>
        <ul className="list-disc list-inside text-gray-400 space-y-2 text-sm">
          <li>All state nodes with correct types (initial, intermediate, terminal)</li>
          <li>Transitions with conditions inferred from your description</li>
          <li>Emit event names following <code>domain.action</code> convention</li>
          <li>Schema fields with appropriate types, required flags, and validation rules</li>
          <li>Roles and compliance tags (visible in the bottom bar and used at Architect stage)</li>
        </ul>
      </div>

      <p className="text-gray-300 mb-4">
        After generation, the canvas is fully populated. You can edit any node, adjust transition
        conditions, rename states, or add/remove schema fields before deploying.
      </p>

      <div className="p-4 border-l-2 border-amber-500 bg-amber-500/10 text-amber-200 mb-10 rounded-r-md text-sm">
        <strong>Note:</strong> If no AI provider keys are configured, the system falls back to a
        deterministic mock blueprint. Connect a Gemini or Groq API key in Settings to enable live
        generation tailored to your specific description.
      </div>

      {/* ── AI provider cascade ── */}
      <h2 className="text-2xl font-bold mt-12 mb-4">AI Provider Cascade</h2>
      <p className="text-gray-300 mb-4">
        Orquestra tries providers in this order until one succeeds:
      </p>
      <ol className="list-decimal list-inside text-gray-400 space-y-2 mb-8 text-sm">
        <li><strong className="text-gray-200">Gemini 2.5 Flash</strong> — Primary provider. Fast, high quality JSON output.</li>
        <li><strong className="text-gray-200">Groq Llama 3.1</strong> — Fallback if Gemini is unavailable or over quota.</li>
        <li><strong className="text-gray-200">Mock Blueprint</strong> — Deterministic fallback when no API keys are set. Passes all four validation stages.</li>
      </ol>
      <p className="text-gray-300 mb-8">
        Blueprints are cached in Redis for 24 hours by prompt hash. Regenerating the same prompt within
        that window returns the cached result instantly.
      </p>

      {/* ── Four-stage validation ── */}
      <h2 className="text-2xl font-bold mt-12 mb-4">Four-Stage Validation</h2>
      <p className="text-gray-300 mb-6">
        Every generated blueprint passes through four automated checks before it can be deployed.
        The validation result is shown in the Quick Create slide-in panel&apos;s Validation tab.
      </p>
      <div className="space-y-3 mb-10">
        {[
          ["Stage 1 — Schema", "Validates the JSON structure of the blueprint matches the expected shape: workflow, roles, events, compliance_tags all present and correctly typed."],
          ["Stage 2 — Graph Integrity", "Ensures every transition target references a state that actually exists. Checks that an initial state is defined and at least one terminal state exists with no outgoing transitions."],
          ["Stage 3 — Permission Analysis", "Verifies that roles reference real permission strings and that at least one role has read and one has write-level access. Warns on overly broad wildcard permissions."],
          ["Stage 4 — Compliance", "Checks compliance tags are recognised identifiers (FERPA, GDPR, HIPAA, SOC2, etc.) and that the blueprint includes appropriate event coverage for the declared compliance regime."],
        ].map(([title, desc]) => (
          <div key={title} className="rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
            <h3 className="font-bold text-white text-sm mb-1">{title}</h3>
            <p className="text-gray-400 text-sm">{desc}</p>
          </div>
        ))}
      </div>

      {/* ── Saving and deploying ── */}
      <h2 className="text-2xl font-bold mt-12 mb-4">Saving and Deploying</h2>

      <div className="space-y-4 mb-10">
        <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] p-5">
          <h3 className="font-bold text-white mb-1">Save Draft</h3>
          <p className="text-gray-400 text-sm">
            Creates the workflow record in the database but leaves it in <code>draft</code> status. Draft
            workflows appear in the Workflows table, can be viewed, but are not accessible through the
            Runtime API. Use this to share a work-in-progress with a colleague before going live.
          </p>
        </div>

        <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] p-5">
          <h3 className="font-bold text-white mb-1">Deploy &amp; Continue</h3>
          <p className="text-gray-400 text-sm">
            Creates and immediately deploys the workflow. The button is disabled unless at least one
            terminal state exists. After successful deployment, you are automatically redirected to the{" "}
            <strong>Architect page</strong> — the next step where you compose these workflows into your
            full ERP domain structure.
          </p>
        </div>
      </div>

      <div className="p-4 border-l-2 border-green-500 bg-green-500/10 text-green-200 mb-10 rounded-r-md text-sm">
        <strong>What happens after deploy?</strong> The workflow is version-stamped, marked immutable,
        and stored. You are redirected to <strong>Architect</strong> where you link this workflow to an
        ERP domain and compile a versioned API key.
      </div>

      {/* ── Tips ── */}
      <h2 className="text-2xl font-bold mt-12 mb-4">Best Practices</h2>
      <ul className="list-disc list-inside text-gray-400 space-y-3 mb-8 text-sm">
        <li>Keep workflow names lowercase with underscores — they become the API identifier: <code>undergraduate_admissions</code>.</li>
        <li>Always define at least two terminal states: one for success (<code>approved</code>) and one for rejection (<code>rejected</code>). Many real processes also need <code>withdrawn</code> and <code>archived</code>.</li>
        <li>Make transition conditions mutually exclusive where possible. If two conditions are both true, only the first matching one fires.</li>
        <li>Use emit events consistently — <code>application.approved</code> not <code>app_approved</code>. These events drive webhooks and the real-time event stream.</li>
        <li>Define schema fields for every field referenced in a condition. Missing fields cause runtime validation failures.</li>
        <li>You can create multiple workflows per project — one for each distinct institutional process (admissions, financial aid, HR onboarding, etc.).</li>
      </ul>
    </>
  );
}
