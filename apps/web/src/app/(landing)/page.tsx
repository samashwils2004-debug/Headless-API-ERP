import Link from "next/link";
import { LandingFooter } from "@/components/landing/LandingFooter";

const INFRA_PRIMITIVES = [
  {
    icon: "⬛",
    label: "Architecture Designer",
    description: "AI-generated ERP models with domain graphs, workflow relationships, and integration boundaries.",
    color: "#3b82f6",
  },
  {
    icon: "⚙️",
    label: "Workflow Engine",
    description: "Deterministic state machine execution with safe condition evaluation and versioned deployments.",
    color: "#a855f7",
  },
  {
    icon: "((o))",
    label: "Event Backbone",
    description: "Real-time streaming for all state transitions with WebSocket support and audit trails.",
    color: "#10b981",
  },
];

const DEVELOPER_FEATURES = [
  {
    tag: "AI-Powered",
    icon: "✦",
    title: "Iterative AI Prompting",
    description: "Refine your ERP architecture through conversational AI. Each iteration creates a new version.",
  },
  {
    tag: "Deterministic",
    icon: "⬡",
    title: "Versioned Infrastructure",
    description: "Every architecture, workflow, and schema is immutably versioned like Docker images.",
  },
  {
    tag: "Git Native",
    icon: "⌥",
    title: "GitHub Sync",
    description: "Auto-commit generated infrastructure to your repo. Bidirectional sync with developer edits.",
  },
  {
    tag: "Type-Safe",
    icon: "☰",
    title: "Infrastructure Compiler",
    description: "Compile ERP architectures into deployable runtime packages with validated APIs.",
  },
  {
    tag: "Secure",
    icon: "⬡",
    title: "4-Stage Validation",
    description: "Schema, graph integrity, permissions, and compliance checks before deployment.",
  },
  {
    tag: "Event-Native",
    icon: "⚡",
    title: "Real-Time Events",
    description: "Every state transition emits structured events to Redis Streams and WebSockets.",
  },
];

const INSTITUTION_TYPES = [
  {
    icon: "🎓",
    title: "Universities",
    subtitle: "Comprehensive Institutional Infrastructure",
    features: [
      "Admissions & enrollment workflows",
      "Academic progress tracking",
      "Financial aid processing",
      "Multi-departmental coordination",
    ],
    stat: "50+ workflows",
    statLabel: "Pre-built templates",
  },
  {
    icon: "🚀",
    title: "EdTech Startups",
    subtitle: "Rapid Institutional Logic Deployment",
    features: [
      "Launch institutional products faster",
      "Focus on UI, not backend logic",
      "Scale from MVP to enterprise",
      "API-first integration",
    ],
    stat: "10x faster",
    statLabel: "Time to market",
  },
];

const PRICING_TIERS = [
  {
    name: "Free",
    price: "$0",
    period: "/month",
    tagline: "For experimentation and learning",
    features: ["10K API calls/month", "3 workflows", "Community support", "Basic templates"],
    cta: "Get Started",
    ctaHref: "/auth/signup",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$99",
    period: "/month",
    tagline: "For production applications",
    features: [
      "500K API calls/month",
      "Unlimited workflows",
      "Priority support",
      "All templates",
      "GitHub sync",
      "Custom domains",
    ],
    cta: "Start Free Trial",
    ctaHref: "/auth/signup?plan=pro",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    tagline: "For large institutions",
    features: [
      "Unlimited API calls",
      "Dedicated infrastructure",
      "SLA guarantees",
      "Custom integrations",
      "Compliance support",
      "On-premise option",
    ],
    cta: "Contact Sales",
    ctaHref: "mailto:sales@orquestra.dev",
    highlighted: false,
  },
];

export default function LandingPage() {
  return (
    <div style={{ background: "#0f0f12", color: "#f4f4f5" }}>
      {/* Hero */}
      <section className="mx-auto max-w-[1200px] px-4 sm:px-6 pt-32 pb-20">
        <div className="text-center">
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm mb-8 border"
            style={{ borderColor: "#25252b", background: "#141418", color: "#a1a1aa" }}
          >
            <span style={{ color: "#3b82f6" }}>✦</span>
            AI Infrastructure Generator
          </div>

          <h1
            className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.05] mb-6"
            style={{ color: "#f4f4f5" }}
          >
            AI-Native Institutional
            <br />
            <span style={{ color: "#71717a" }}>ERP Infrastructure</span>
          </h1>

          <p className="mx-auto max-w-2xl text-lg sm:text-xl mb-10" style={{ color: "#a1a1aa" }}>
            Design your institutional ERP using AI, visualize architecture, version workflows, and deploy as programmable
            infrastructure — synced directly to your codebase.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 mb-12">
            <Link
              href="/console"
              className="inline-flex items-center gap-2 rounded px-6 py-3 text-base font-semibold"
              style={{ background: "#f4f4f5", color: "#0f0f12" }}
            >
              Launch Console →
            </Link>
            <Link
              href="/architecture"
              className="inline-flex items-center gap-2 rounded px-6 py-3 text-base border"
              style={{ borderColor: "#25252b", color: "#a1a1aa" }}
            >
              View Architecture
            </Link>
          </div>

          {/* CLI demo */}
          <div
            className="mx-auto max-w-2xl rounded px-5 py-3.5 text-left text-base border font-mono"
            style={{ background: "#141418", borderColor: "#25252b", color: "#a1a1aa" }}
          >
            <span style={{ color: "#a1a1aa" }}>&lt;/&gt; $ </span>
            <span style={{ color: "#3b82f6" }}>orquestra</span>
            <span style={{ color: "#f4f4f5" }}> generate </span>
            <span style={{ color: "#86efac" }}>"University admissions + finance ERP"</span>
            <span style={{ color: "#a1a1aa" }}> --deploy</span>
          </div>
        </div>
      </section>

      {/* Infrastructure Primitives */}
      <section id="product" className="mx-auto max-w-[1200px] px-4 sm:px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: "#f4f4f5" }}>
            Infrastructure Primitives
          </h2>
          <p className="text-lg" style={{ color: "#a1a1aa" }}>
            Build institutional systems with composable, versioned infrastructure blocks
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {INFRA_PRIMITIVES.map((p) => (
            <div
              key={p.label}
              className="rounded p-6 border"
              style={{ background: "#141418", borderColor: "#25252b" }}
            >
              <div
                className="w-10 h-10 rounded flex items-center justify-center text-lg mb-4"
                style={{ background: `${p.color}18`, color: p.color }}
              >
                {p.icon}
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: "#f4f4f5" }}>
                {p.label}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "#8a8a94" }}>
                {p.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Built for Developers */}
      <section className="mx-auto max-w-[1200px] px-4 sm:px-6 py-16">
        <div className="text-center mb-12">
          <div
            className="inline-block rounded-full px-4 py-1 text-sm mb-4 border"
            style={{ borderColor: "#3b82f620", background: "#3b82f610", color: "#60a5fa" }}
          >
            Developer-First Platform
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: "#f4f4f5" }}>
            Built for Developers,
            <br />
            Powered by AI
          </h2>
          <p className="text-lg" style={{ color: "#a1a1aa" }}>
            Infrastructure-as-code meets AI-native design. Version everything, deploy instantly.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {DEVELOPER_FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded p-5 border"
              style={{ background: "#141418", borderColor: "#25252b" }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xl" style={{ color: "#3b82f6" }}>
                  {f.icon}
                </span>
                <span
                  className="text-[11px] px-2 py-0.5 rounded-full border"
                  style={{ borderColor: "#25252b", color: "#8a8a94" }}
                >
                  {f.tag}
                </span>
              </div>
              <h3 className="text-base font-semibold mb-1.5" style={{ color: "#f4f4f5" }}>
                {f.title}
              </h3>
              <p className="text-sm" style={{ color: "#8a8a94" }}>
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Built for Institutional Systems */}
      <section className="mx-auto max-w-[1200px] px-4 sm:px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: "#f4f4f5" }}>
            Built for Institutional Systems
          </h2>
          <p className="text-lg" style={{ color: "#a1a1aa" }}>
            From universities to EdTech startups, deploy production-ready infrastructure
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {INSTITUTION_TYPES.map((inst) => (
            <div
              key={inst.title}
              className="rounded p-7 border"
              style={{ background: "#141418", borderColor: "#25252b" }}
            >
              <div
                className="w-12 h-12 rounded flex items-center justify-center text-2xl mb-4"
                style={{ background: "#1e1e24" }}
              >
                {inst.icon}
              </div>
              <h3 className="text-2xl font-bold mb-1" style={{ color: "#f4f4f5" }}>
                {inst.title}
              </h3>
              <p className="text-sm mb-5" style={{ color: "#8a8a94" }}>
                {inst.subtitle}
              </p>
              <ul className="space-y-2 mb-6">
                {inst.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm" style={{ color: "#a1a1aa" }}>
                    <span style={{ color: "#3b82f6", flexShrink: 0 }}>•</span>
                    {f}
                  </li>
                ))}
              </ul>
              <div className="border-t pt-4" style={{ borderColor: "#25252b" }}>
                <span className="text-2xl font-bold" style={{ color: "#f4f4f5" }}>
                  {inst.stat}
                </span>
                <span className="text-sm ml-2" style={{ color: "#8a8a94" }}>
                  {inst.statLabel}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-[1200px] px-4 sm:px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: "#f4f4f5" }}>
            Simple, Usage-Based Pricing
          </h2>
          <p className="text-lg" style={{ color: "#a1a1aa" }}>
            Start free, scale as you grow. No hidden fees.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {PRICING_TIERS.map((tier) => (
            <div
              key={tier.name}
              className="rounded p-6 border relative"
              style={{
                background: tier.highlighted ? "#141418" : "#141418",
                borderColor: tier.highlighted ? "#3b82f6" : "#25252b",
                boxShadow: tier.highlighted ? "0 0 0 1px #3b82f620" : "none",
              }}
            >
              {tier.highlighted && (
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs px-3 py-1 rounded-full font-semibold"
                  style={{ background: "#3b82f6", color: "#fff" }}
                >
                  Most Popular
                </div>
              )}
              <div className="mb-4">
                <h3 className="text-lg font-bold mb-1" style={{ color: "#f4f4f5" }}>
                  {tier.name}
                </h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold" style={{ color: "#f4f4f5" }}>
                    {tier.price}
                  </span>
                  {tier.period && (
                    <span className="text-sm" style={{ color: "#8a8a94" }}>
                      {tier.period}
                    </span>
                  )}
                </div>
                <p className="text-sm mt-1" style={{ color: "#8a8a94" }}>
                  {tier.tagline}
                </p>
              </div>
              <ul className="space-y-2 mb-6">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm" style={{ color: "#a1a1aa" }}>
                    <span style={{ color: "#3b82f6" }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={tier.ctaHref}
                className="block w-full text-center rounded py-2.5 text-sm font-semibold border transition-all"
                style={
                  tier.highlighted
                    ? { background: "#3b82f6", color: "#fff", borderColor: "#3b82f6" }
                    : { background: "transparent", color: "#f4f4f5", borderColor: "#25252b" }
                }
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>
        <p className="text-center text-sm mt-6" style={{ color: "#8a8a94" }}>
          <Link href="/#pricing" style={{ color: "#a1a1aa" }}>
            View detailed pricing and FAQ →
          </Link>
        </p>
      </section>

      <LandingFooter />
    </div>
  );
}
