import Link from "next/link";
import {
  Terminal, Layers, Settings, Radio, GraduationCap, Rocket,
  Sparkles, Box, GitMerge, Database, Shield, Zap,
  ArrowRight, CheckCircle2, Activity, Lock, GitBranch,
} from "lucide-react";
import { LandingFooter } from "@/components/landing/LandingFooter";

// ─── Static Data ─────────────────────────────────────────────────────────────

const STATS = [
  { value: "50+", label: "Workflow Templates" },
  { value: "4-stage", label: "AI Validation Pipeline" },
  { value: "100%", label: "Deterministic Runtime" },
  { value: "Zero", label: "Dynamic Code Execution" },
];

const PRIMITIVES = [
  {
    title: "Architecture Designer",
    description: "AI-generated ERP domain models with relationship graphs, integration boundaries, and compliance tagging — all version-controlled.",
    icon: Layers,
    iconColor: "#3b82f6",
    tag: "Mode B",
    tagColor: "#1e3a6e",
    tagText: "#60a5fa",
  },
  {
    title: "Workflow Engine",
    description: "Deterministic state-machine execution with safe condition evaluation, immutable versioning, and full audit trails.",
    icon: Settings,
    iconColor: "#a855f7",
    tag: "Runtime",
    tagColor: "#1e1030",
    tagText: "#c084fc",
  },
  {
    title: "Event Backbone",
    description: "Every state transition emits structured events to Redis Streams and WebSocket channels, scoped per tenant.",
    icon: Radio,
    iconColor: "#10b981",
    tag: "Real-Time",
    tagColor: "#0a2218",
    tagText: "#34d399",
  },
];

const PLATFORM_FEATURES = [
  {
    title: "Iterative AI Prompting",
    description: "Refine your ERP architecture through conversational AI. Each iteration creates a new immutable version.",
    icon: Sparkles,
    tag: "AI-Powered",
  },
  {
    title: "Versioned Infrastructure",
    description: "Every architecture, workflow, and schema is immutably versioned — like Docker images for institutional logic.",
    icon: Box,
    tag: "Deterministic",
  },
  {
    title: "GitHub Sync",
    description: "Auto-commit generated infrastructure to your repo. Bidirectional sync with full developer override.",
    icon: GitMerge,
    tag: "Git Native",
  },
  {
    title: "Infrastructure Compiler",
    description: "Compile ERP architectures into deployable runtime packages with fully typed, validated APIs.",
    icon: Database,
    tag: "Type-Safe",
  },
  {
    title: "4-Stage Validation",
    description: "Schema integrity, graph connectivity, permission analysis, and compliance checks before every deploy.",
    icon: Shield,
    tag: "Secure",
  },
  {
    title: "Real-Time Events",
    description: "Every state transition emits structured events to Redis Streams and WebSocket channels.",
    icon: Zap,
    tag: "Event-Native",
  },
];

const VALIDATION_STEPS = [
  { label: "Schema Validation", detail: "Type safety & field constraints", status: "pass" },
  { label: "Graph Integrity", detail: "Reachability & cycle detection", status: "pass" },
  { label: "Permission Analysis", detail: "RBAC role coverage", status: "warn" },
  { label: "Compliance Check", detail: "FERPA, GDPR tagging", status: "pass" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans">
      <main className="mx-auto max-w-[1200px] px-4 pb-24 pt-36 sm:px-6">

        {/* ── HERO ─────────────────────────────────────────────────────────── */}
        <section className="relative text-center py-20 sm:py-28">
          {/* Grid background */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), " +
                "linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
              maskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)",
            }}
          />
          {/* Blue glow */}
          <div
            className="pointer-events-none absolute inset-0 opacity-25"
            style={{
              background: "radial-gradient(ellipse 60% 40% at 50% 0%, #1d4ed8, transparent)",
            }}
          />

          {/* Badge */}
          <div className="relative inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs mb-8"
            style={{ borderColor: "#1e3a6e", background: "#0a1a36", color: "#60a5fa" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            Now with three AI modes — Workflow, Architect & Template
            <ArrowRight size={11} />
          </div>

          <h1
            className="relative text-5xl font-bold tracking-tight sm:text-7xl lg:text-8xl mb-6 leading-[1.05]"
            style={{ color: "#f4f4f5" }}
          >
            AI-Native<br />
            <span
              style={{
                background: "linear-gradient(135deg, #60a5fa 0%, #a78bfa 50%, #c084fc 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Institutional ERP
            </span>
            <br />
            Infrastructure
          </h1>

          <p className="relative mx-auto mt-6 max-w-2xl text-lg sm:text-xl leading-relaxed"
            style={{ color: "#a1a1aa" }}>
            Design institutional ERP systems with AI, version every workflow deterministically,
            and deploy as programmable infrastructure — synced to your codebase.
          </p>

          {/* CTA buttons */}
          <div className="relative mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/login"
              className="group inline-flex items-center gap-2 rounded-lg px-7 py-3.5 text-sm font-semibold transition-all duration-200"
              style={{ background: "#f4f4f5", color: "#0f0f12" }}
            >
              Launch Console
              <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/architecture"
              className="inline-flex items-center gap-2 rounded-lg border px-7 py-3.5 text-sm font-medium transition-colors"
              style={{ borderColor: "#25252b", color: "#a1a1aa" }}
            >
              View Architecture
            </Link>
          </div>

          {/* Terminal hero */}
          <div className="relative mx-auto mt-16 max-w-2xl rounded-xl overflow-hidden shadow-2xl"
            style={{ border: "1px solid #25252b" }}>
            {/* Window chrome */}
            <div className="flex items-center gap-2 px-4 py-3"
              style={{ background: "#141418", borderBottom: "1px solid #1e1e24" }}>
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ background: "#ff5f57" }} />
                <div className="w-3 h-3 rounded-full" style={{ background: "#ffbd2e" }} />
                <div className="w-3 h-3 rounded-full" style={{ background: "#28c840" }} />
              </div>
              <span className="ml-3 text-xs font-mono" style={{ color: "#52525b" }}>
                orquestra — terminal
              </span>
            </div>
            <div className="px-5 py-5 font-mono text-sm text-left space-y-2"
              style={{ background: "#0f0f12" }}>
              <div className="flex gap-2">
                <span style={{ color: "#52525b" }}>$</span>
                <span style={{ color: "#60a5fa" }}>orquestra</span>
                <span style={{ color: "#f4f4f5" }}> generate</span>
                <span style={{ color: "#a3e635" }}> &quot;University admissions + finance ERP&quot;</span>
                <span style={{ color: "#71717a" }}> --deploy</span>
              </div>
              <div style={{ color: "#52525b" }}>→ Connecting to AI provider cascade…</div>
              <div style={{ color: "#34d399" }}>✓ Blueprint generated (gemini-1.5-flash, 2.4s)</div>
              <div style={{ color: "#34d399" }}>✓ Schema validation passed</div>
              <div style={{ color: "#34d399" }}>✓ Graph integrity verified — 3 domains, 7 workflows</div>
              <div style={{ color: "#34d399" }}>✓ Permissions analysed — 4 roles mapped</div>
              <div style={{ color: "#fbbf24" }}>⚠ Compliance: FERPA tags added automatically</div>
              <div style={{ color: "#34d399" }}>✓ Deployed to runtime v1.0.0</div>
              <div className="flex gap-2 mt-1">
                <span style={{ color: "#52525b" }}>$</span>
                <span className="w-2 h-[1.1em] inline-block animate-pulse"
                  style={{ background: "#3b82f6", verticalAlign: "middle" }} />
              </div>
            </div>
          </div>
        </section>

        {/* ── STATS BAR ────────────────────────────────────────────────────── */}
        <section className="mt-20">
          <div
            className="rounded-xl grid grid-cols-2 md:grid-cols-4 gap-px overflow-hidden"
            style={{ border: "1px solid #25252b", background: "#25252b" }}
          >
            {STATS.map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col items-center justify-center py-8 px-6 text-center"
                style={{ background: "#141418" }}
              >
                <span className="text-3xl font-bold" style={{ color: "#f4f4f5" }}>
                  {stat.value}
                </span>
                <span className="text-xs mt-1.5" style={{ color: "#71717a" }}>
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ── INFRASTRUCTURE PRIMITIVES ────────────────────────────────────── */}
        <section className="mt-32 text-center" id="product">
          <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs mb-6"
            style={{ borderColor: "#25252b", color: "#71717a" }}>
            Core Primitives
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold mb-4" style={{ color: "#f4f4f5" }}>
            Three Layers.<br />One Runtime.
          </h2>
          <p className="text-[var(--text-secondary)] mb-14 text-lg max-w-2xl mx-auto">
            Composable, versioned infrastructure blocks that power any institutional system
            — from admissions to finance to academic tracking.
          </p>

          <div className="grid gap-5 md:grid-cols-3 text-left">
            {PRIMITIVES.map((primitive) => (
              <div
                key={primitive.title}
                className="group rounded-xl p-8 transition-all duration-300 hover:-translate-y-1"
                style={{ border: "1px solid #25252b", background: "#141418" }}
              >
                <div className="flex items-start justify-between mb-6">
                  <primitive.icon size={30} color={primitive.iconColor} />
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider"
                    style={{ background: primitive.tagColor, color: primitive.tagText }}
                  >
                    {primitive.tag}
                  </span>
                </div>
                <h3 className="text-lg font-bold mb-3" style={{ color: "#f4f4f5" }}>
                  {primitive.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "#71717a" }}>
                  {primitive.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── AI GENERATOR SPLIT ───────────────────────────────────────────── */}
        <section className="mt-40 grid gap-16 lg:grid-cols-2 items-start">
          {/* Left: copy */}
          <div className="lg:sticky lg:top-28">
            <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs mb-6"
              style={{ borderColor: "#312060", background: "#1e1030", color: "#a855f7" }}>
              <Sparkles size={12} /> AI Blueprint Generator
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold leading-tight mb-6" style={{ color: "#f4f4f5" }}>
              Natural Language<br />
              to Deployed<br />
              <span style={{ color: "#71717a" }}>Infrastructure</span>
            </h2>
            <p className="text-lg mb-8 leading-relaxed" style={{ color: "#a1a1aa" }}>
              Describe your institutional ERP in plain English. Orquestra generates
              validated architecture models, compiles workflows, and deploys versioned
              infrastructure — synced automatically to GitHub.
            </p>

            <ul className="space-y-3 mb-10">
              {[
                "Schema validation with full type safety",
                "Graph integrity and cycle detection",
                "Permission analysis and RBAC mapping",
                "Compliance tagging (FERPA, GDPR, DPDP)",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm" style={{ color: "#a1a1aa" }}>
                  <CheckCircle2 size={16} style={{ color: "#16a34a", flexShrink: 0 }} />
                  {item}
                </li>
              ))}
            </ul>

            <Link
              href="/console/ai"
              className="group inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold transition-colors"
              style={{ background: "#3b82f6", color: "#fff" }}
            >
              Try AI Generator
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          {/* Right: demo UI */}
          <div className="space-y-4">
            {/* Prompt input */}
            <div
              className="rounded-xl overflow-hidden"
              style={{ border: "1px solid #25252b" }}
            >
              <div className="flex items-center gap-2 px-4 py-3"
                style={{ background: "#141418", borderBottom: "1px solid #1e1e24" }}>
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#ff5f57" }} />
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#ffbd2e" }} />
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#28c840" }} />
                </div>
                <span className="ml-2 text-xs font-mono" style={{ color: "#52525b" }}>
                  AI ERP Generator — console/ai
                </span>
              </div>
              <div className="p-5 space-y-4" style={{ background: "#0f0f12" }}>
                <div>
                  <p className="text-xs mb-2" style={{ color: "#71717a" }}>Describe your ERP:</p>
                  <div
                    className="rounded-lg p-3.5 text-sm font-mono leading-relaxed"
                    style={{ border: "1px solid #25252b", background: "#141418", color: "#a1a1aa" }}
                  >
                    Create university ERP with admissions workflow, merit-based auto-accept above
                    90%, human review 75–90%, reject below 75%. FERPA compliance required.
                    <span
                      className="inline-block w-2 h-[1em] ml-0.5 animate-pulse align-middle"
                      style={{ background: "#3b82f6" }}
                    />
                  </div>
                </div>
                <button
                  className="w-full rounded-lg py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
                  style={{ background: "#1e1030", color: "#c084fc", border: "1px solid #312060" }}
                >
                  <Sparkles size={14} />
                  Generate Blueprint
                </button>
              </div>
            </div>

            {/* Validation results */}
            <div
              className="rounded-xl overflow-hidden"
              style={{ border: "1px solid #25252b" }}
            >
              <div className="px-5 py-4" style={{ background: "#141418", borderBottom: "1px solid #1e1e24" }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold" style={{ color: "#f4f4f5" }}>
                    Validation Pipeline
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded"
                    style={{ background: "#0a2218", color: "#34d399", border: "1px solid #134e2a" }}>
                    3 / 4 passed
                  </span>
                </div>
              </div>
              <div className="divide-y" style={{ background: "#0f0f12", borderColor: "#1e1e24" }}>
                {VALIDATION_STEPS.map((step) => (
                  <div key={step.label} className="flex items-center gap-3 px-5 py-3.5">
                    {step.status === "pass" ? (
                      <CheckCircle2 size={15} style={{ color: "#16a34a", flexShrink: 0 }} />
                    ) : (
                      <span
                        className="w-[15px] h-[15px] rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                        style={{ background: "#451a03", color: "#fbbf24", border: "1px solid #78350f" }}
                      >
                        !
                      </span>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium" style={{ color: "#f4f4f5" }}>
                        {step.label}
                      </p>
                      <p className="text-[11px] mt-0.5" style={{ color: "#52525b" }}>
                        {step.detail}
                      </p>
                    </div>
                    <span className="text-[11px]" style={{ color: step.status === "pass" ? "#16a34a" : "#f59e0b" }}>
                      {step.status === "pass" ? "Passed" : "Warning"}
                    </span>
                  </div>
                ))}
              </div>
              <div className="px-5 py-4" style={{ borderTop: "1px solid #1e1e24", background: "#141418" }}>
                <button
                  className="w-full rounded-lg py-2.5 text-sm font-semibold"
                  style={{ background: "#3b82f6", color: "#fff" }}
                >
                  Deploy Blueprint →
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
        <section className="mt-40 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs mb-6"
            style={{ borderColor: "#25252b", color: "#71717a" }}>
            How It Works
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold mb-4" style={{ color: "#f4f4f5" }}>
            From Prompt to<br />Production Runtime
          </h2>
          <p className="text-[var(--text-secondary)] mb-16 text-lg max-w-xl mx-auto">
            Four deterministic steps. Zero dynamic code execution. Full audit trail.
          </p>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 text-left">
            {[
              {
                step: "01",
                icon: Sparkles,
                iconColor: "#a855f7",
                title: "Describe in Natural Language",
                desc: "Write your institutional requirements in plain English. Orquestra handles the rest.",
              },
              {
                step: "02",
                icon: Shield,
                iconColor: "#3b82f6",
                title: "AI Validates Blueprint",
                desc: "4-stage pipeline: schema, graph integrity, RBAC permissions, compliance.",
              },
              {
                step: "03",
                icon: GitBranch,
                iconColor: "#10b981",
                title: "Version & Deploy",
                desc: "Immutable versioning. Deployed workflows cannot be edited — only superseded.",
              },
              {
                step: "04",
                icon: Activity,
                iconColor: "#f59e0b",
                title: "Real-Time Event Stream",
                desc: "Every state transition emits structured events. Full observability built-in.",
              },
            ].map((card) => (
              <div
                key={card.step}
                className="rounded-xl p-6 relative overflow-hidden"
                style={{ border: "1px solid #25252b", background: "#141418" }}
              >
                <span
                  className="absolute top-4 right-5 text-5xl font-black leading-none select-none"
                  style={{ color: "#1a1a20" }}
                >
                  {card.step}
                </span>
                <card.icon size={26} color={card.iconColor} className="mb-5 relative" />
                <h3 className="text-sm font-semibold mb-2 relative" style={{ color: "#f4f4f5" }}>
                  {card.title}
                </h3>
                <p className="text-sm leading-relaxed relative" style={{ color: "#71717a" }}>
                  {card.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── INSTITUTIONAL USE CASES ──────────────────────────────────────── */}
        <section className="mt-40 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs mb-6"
            style={{ borderColor: "#25252b", color: "#71717a" }}>
            Built For
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold mb-4" style={{ color: "#f4f4f5" }}>
            Institutional Systems<br />at Every Scale
          </h2>
          <p className="text-[var(--text-secondary)] mb-14 text-lg">
            From research universities to EdTech startups
          </p>

          <div className="grid md:grid-cols-2 gap-6 text-left">
            {/* Universities */}
            <div
              className="rounded-xl p-8 relative overflow-hidden"
              style={{ border: "1px solid #1e3a6e", background: "#141418" }}
            >
              <div
                className="pointer-events-none absolute top-0 right-0 w-72 h-72 rounded-full opacity-[0.07]"
                style={{ background: "radial-gradient(circle, #3b82f6, transparent)", transform: "translate(30%, -30%)" }}
              />
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-6"
                style={{ background: "#0a1a36", border: "1px solid #1e3a6e" }}
              >
                <GraduationCap size={22} style={{ color: "#60a5fa" }} />
              </div>
              <h3 className="text-2xl font-bold mb-1" style={{ color: "#f4f4f5" }}>Universities</h3>
              <p className="text-sm mb-6" style={{ color: "#71717a" }}>Comprehensive Institutional Infrastructure</p>
              <ul className="space-y-2.5 text-sm mb-10" style={{ color: "#a1a1aa" }}>
                {[
                  "Admissions & enrollment workflow automation",
                  "Academic progress & GPA-based routing",
                  "Financial aid processing pipelines",
                  "Multi-departmental event coordination",
                  "FERPA-compliant data handling",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "#3b82f6" }} />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="flex items-end gap-4">
                <div>
                  <div className="text-3xl font-bold" style={{ color: "#f4f4f5" }}>50+</div>
                  <div className="text-xs mt-0.5" style={{ color: "#52525b" }}>Pre-built templates</div>
                </div>
                <div className="h-10 w-px mx-2" style={{ background: "#25252b" }} />
                <div>
                  <div className="text-3xl font-bold" style={{ color: "#f4f4f5" }}>7</div>
                  <div className="text-xs mt-0.5" style={{ color: "#52525b" }}>Compliance standards</div>
                </div>
              </div>
            </div>

            {/* EdTech */}
            <div
              className="rounded-xl p-8 relative overflow-hidden"
              style={{ border: "1px solid #25252b", background: "#141418" }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-6"
                style={{ background: "#0a1a0a", border: "1px solid #1a3a1a" }}
              >
                <Rocket size={20} style={{ color: "#34d399" }} />
              </div>
              <h3 className="text-2xl font-bold mb-1" style={{ color: "#f4f4f5" }}>EdTech Startups</h3>
              <p className="text-sm mb-6" style={{ color: "#71717a" }}>Rapid Institutional Logic Deployment</p>
              <ul className="space-y-2.5 text-sm mb-10" style={{ color: "#a1a1aa" }}>
                {[
                  "Launch institutional products in hours",
                  "Focus on UX, not backend workflow logic",
                  "Scale from MVP to enterprise on same runtime",
                  "API-first integration with any frontend",
                  "Multi-tenant isolation out of the box",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "#10b981" }} />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="flex items-end gap-4">
                <div>
                  <div className="text-3xl font-bold" style={{ color: "#f4f4f5" }}>10×</div>
                  <div className="text-xs mt-0.5" style={{ color: "#52525b" }}>Faster time to market</div>
                </div>
                <div className="h-10 w-px mx-2" style={{ background: "#25252b" }} />
                <div>
                  <div className="text-3xl font-bold" style={{ color: "#f4f4f5" }}>100%</div>
                  <div className="text-xs mt-0.5" style={{ color: "#52525b" }}>API coverage</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── PLATFORM FEATURES ────────────────────────────────────────────── */}
        <section className="mt-40 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs mb-6"
            style={{ borderColor: "#25252b", color: "#71717a" }}>
            Developer-First Platform
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold mb-4" style={{ color: "#f4f4f5" }}>
            Built for Developers,<br />Powered by AI
          </h2>
          <p className="text-[var(--text-secondary)] mb-14 text-lg max-w-xl mx-auto">
            Infrastructure-as-code meets AI-native design. Version everything, deploy instantly.
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 text-left">
            {PLATFORM_FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl p-6 transition-colors relative group"
                style={{ border: "1px solid #25252b", background: "#141418" }}
              >
                <div
                  className="absolute top-5 right-5 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-medium"
                  style={{ background: "#0f0f12", border: "1px solid #25252b", color: "#52525b" }}
                >
                  {feature.tag}
                </div>
                <feature.icon size={26} className="mb-5" style={{ color: "#3b82f6" }} />
                <h3 className="text-sm font-semibold mb-2.5" style={{ color: "#f4f4f5" }}>
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "#71717a" }}>
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── SECURITY CALLOUT ─────────────────────────────────────────────── */}
        <section className="mt-40">
          <div
            className="rounded-2xl p-10 sm:p-14 relative overflow-hidden text-center"
            style={{ border: "1px solid #1e3a6e", background: "#0a1120" }}
          >
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background: "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(59,130,246,0.12), transparent)",
              }}
            />
            <div className="relative">
              <div
                className="inline-flex items-center justify-center w-14 h-14 rounded-xl mb-6"
                style={{ background: "#0a1a36", border: "1px solid #1e3a6e" }}
              >
                <Lock size={24} style={{ color: "#60a5fa" }} />
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: "#f4f4f5" }}>
                Security-First by Design
              </h2>
              <p className="text-lg max-w-xl mx-auto mb-10" style={{ color: "#71717a" }}>
                CSRF protection, JWT auth, multi-tenant isolation, row-level security,
                and zero dynamic code execution — hardened from the ground up.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                {[
                  "CSRF Double-Submit", "JWT + bcrypt", "RBAC Engine",
                  "Multi-Tenant RLS", "Rate Limiting", "No eval()",
                  "4-Stage AI Validation", "Audit Trail",
                ].map((badge) => (
                  <span
                    key={badge}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium"
                    style={{ background: "#0f1929", border: "1px solid #1e3a6e", color: "#60a5fa" }}
                  >
                    {badge}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── PRICING ──────────────────────────────────────────────────────── */}
        <section className="mt-40 text-center" id="pricing">
          <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs mb-6"
            style={{ borderColor: "#25252b", color: "#71717a" }}>
            Pricing
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold mb-4" style={{ color: "#f4f4f5" }}>
            Simple, Usage-Based
          </h2>
          <p className="text-[var(--text-secondary)] mb-14 text-lg">
            Start free. Scale as you grow. No hidden fees.
          </p>

          <div className="grid md:grid-cols-3 gap-5 text-left">
            {/* Free */}
            <div
              className="rounded-xl p-8"
              style={{ border: "1px solid #25252b", background: "#141418" }}
            >
              <h3 className="text-lg font-bold mb-1" style={{ color: "#f4f4f5" }}>Free</h3>
              <div className="text-4xl font-bold mt-3 mb-1" style={{ color: "#f4f4f5" }}>
                $0<span className="text-base font-normal" style={{ color: "#71717a" }}>/mo</span>
              </div>
              <p className="text-sm mb-6" style={{ color: "#71717a" }}>For experimentation</p>
              <ul className="space-y-3 text-sm mb-8" style={{ color: "#a1a1aa" }}>
                {["10K API calls/month", "3 workflows", "Community support", "Basic templates"].map((f) => (
                  <li key={f} className="flex items-center gap-2.5">
                    <CheckCircle2 size={14} style={{ color: "#3b82f6", flexShrink: 0 }} />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/login"
                className="block w-full rounded-lg py-2.5 text-sm font-semibold text-center transition-colors"
                style={{ border: "1px solid #25252b", background: "#0f0f12", color: "#f4f4f5" }}
              >
                Get Started
              </Link>
            </div>

            {/* Pro — featured */}
            <div
              className="rounded-xl p-8 relative"
              style={{ border: "1px solid #3b82f6", background: "#141418" }}
            >
              <div
                className="absolute -top-px left-1/2 -translate-x-1/2 px-4 py-1 rounded-b-lg text-xs font-bold"
                style={{ background: "#3b82f6", color: "#fff" }}
              >
                Most Popular
              </div>
              <h3 className="text-lg font-bold mb-1 mt-3" style={{ color: "#f4f4f5" }}>Pro</h3>
              <div className="text-4xl font-bold mt-3 mb-1" style={{ color: "#f4f4f5" }}>
                $99<span className="text-base font-normal" style={{ color: "#71717a" }}>/mo</span>
              </div>
              <p className="text-sm mb-6" style={{ color: "#71717a" }}>For production apps</p>
              <ul className="space-y-3 text-sm mb-8" style={{ color: "#a1a1aa" }}>
                {["500K API calls/month", "Unlimited workflows", "Priority support", "All templates", "GitHub sync", "Custom domains"].map((f) => (
                  <li key={f} className="flex items-center gap-2.5">
                    <CheckCircle2 size={14} style={{ color: "#3b82f6", flexShrink: 0 }} />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/login"
                className="block w-full rounded-lg py-2.5 text-sm font-semibold text-center transition-colors"
                style={{ background: "#3b82f6", color: "#fff" }}
              >
                Start Free Trial
              </Link>
            </div>

            {/* Enterprise */}
            <div
              className="rounded-xl p-8"
              style={{ border: "1px solid #25252b", background: "#141418" }}
            >
              <h3 className="text-lg font-bold mb-1" style={{ color: "#f4f4f5" }}>Enterprise</h3>
              <div className="text-4xl font-bold mt-3 mb-1" style={{ color: "#f4f4f5" }}>Custom</div>
              <p className="text-sm mb-6" style={{ color: "#71717a" }}>For large institutions</p>
              <ul className="space-y-3 text-sm mb-8" style={{ color: "#a1a1aa" }}>
                {["Unlimited API calls", "Dedicated infrastructure", "SLA guarantees", "Custom integrations", "Compliance support", "On-premise option"].map((f) => (
                  <li key={f} className="flex items-center gap-2.5">
                    <CheckCircle2 size={14} style={{ color: "#3b82f6", flexShrink: 0 }} />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/contact"
                className="block w-full rounded-lg py-2.5 text-sm font-semibold text-center transition-colors"
                style={{ border: "1px solid #25252b", background: "#0f0f12", color: "#f4f4f5" }}
              >
                Contact Sales
              </Link>
            </div>
          </div>

          <Link href="/pricing" className="mt-8 inline-flex items-center gap-1.5 text-sm hover:underline"
            style={{ color: "#3b82f6" }}>
            View detailed pricing and FAQ <ArrowRight size={13} />
          </Link>
        </section>

        {/* ── BOTTOM CTA ───────────────────────────────────────────────────── */}
        <section className="mt-40">
          <div
            className="rounded-2xl p-14 sm:p-20 text-center relative overflow-hidden"
            style={{ border: "1px solid #25252b", background: "#141418" }}
          >
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage:
                  "linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), " +
                  "linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)",
                backgroundSize: "40px 40px",
              }}
            />
            <div className="relative">
              <Terminal size={36} className="mx-auto mb-6" style={{ color: "#3b82f6" }} />
              <h2 className="text-4xl sm:text-5xl font-bold mb-5" style={{ color: "#f4f4f5" }}>
                Start Building Today
              </h2>
              <p className="text-lg max-w-lg mx-auto mb-10" style={{ color: "#71717a" }}>
                Launch the console, connect your institution, and deploy your first
                AI-generated workflow in under five minutes.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/login"
                  className="group inline-flex items-center gap-2 rounded-lg px-8 py-3.5 text-sm font-semibold transition-all"
                  style={{ background: "#f4f4f5", color: "#0f0f12" }}
                >
                  Launch Console
                  <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/docs/introduction"
                  className="inline-flex items-center gap-2 rounded-lg px-8 py-3.5 text-sm font-medium transition-colors"
                  style={{ border: "1px solid #25252b", color: "#a1a1aa" }}
                >
                  Read the Docs
                </Link>
              </div>
            </div>
          </div>
        </section>

      </main>

      <LandingFooter />
    </div>
  );
}
