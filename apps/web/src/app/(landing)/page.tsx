import Link from "next/link";
import { LandingFooter } from "@/components/landing/LandingFooter";
import {
  Terminal, Layers, Settings, Radio, GraduationCap, Rocket,
  Sparkles, Box, GitMerge, Database, Shield, Zap
} from "lucide-react";

const PRIMITIVES = [
  {
    title: "Architecture Designer",
    description: "AI-generated ERP models with domain graphs, workflow relationships, and integration boundaries.",
    icon: Layers,
    iconColor: "#3b82f6", // Blue
  },
  {
    title: "Workflow Engine",
    description: "Deterministic state machine execution with safe condition evaluation and versioned deployments.",
    icon: Settings,
    iconColor: "#a855f7", // Purple
  },
  {
    title: "Event Backbone",
    description: "Real-time streaming for all state transitions with WebSocket support and audit trails.",
    icon: Radio,
    iconColor: "#10b981", // Green
  }
];

const PLATFORM_FEATURES = [
  {
    title: "Iterative AI Prompting",
    description: "Refine your ERP architecture through conversational AI. Each iteration creates a new version.",
    icon: Sparkles,
    tag: "AI-Powered"
  },
  {
    title: "Versioned Infrastructure",
    description: "Every architecture, workflow, and schema is immutably versioned like Docker images.",
    icon: Box,
    tag: "Deterministic"
  },
  {
    title: "GitHub Sync",
    description: "Auto-commit generated infrastructure to your repo. Bidirectional sync with developer edits.",
    icon: GitMerge,
    tag: "Git Native",
    link: "https://github.com"
  },
  {
    title: "Infrastructure Compiler",
    description: "Compile ERP architectures into deployable runtime packages with validated APIs.",
    icon: Database,
    tag: "Type-Safe"
  },
  {
    title: "4-Stage Validation",
    description: "Schema, graph integrity, permissions, and compliance checks before deployment.",
    icon: Shield,
    tag: "Secure"
  },
  {
    title: "Real-Time Events",
    description: "Every state transition emits structured events to Redis Streams and WebSockets.",
    icon: Zap,
    tag: "Event-Native"
  }
];

export default function LandingPage() {
  return (
    <div className="bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans">
      <main className="mx-auto max-w-[1200px] px-4 pb-16 pt-32 sm:px-6">

        {/* HERO SECTION */}
        <section className="relative text-center py-20">
          <div
            className="pointer-events-none absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)",
              backgroundSize: "64px 64px",
            }}
          />
          <h1 className="text-5xl font-bold tracking-tight text-[var(--text-primary)] sm:text-7xl mb-6">
            AI-Native Institutional<br />
            <span className="text-gray-400">ERP Infrastructure</span>
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg text-[var(--text-secondary)] sm:text-xl leading-relaxed">
            Design your institutional ERP using AI, visualize architecture, version workflows,
            and deploy as programmable infrastructure — synced directly to your codebase.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/console"
              className="rounded-md bg-white px-6 py-3 text-sm font-semibold text-black hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              Launch Console <span>→</span>
            </Link>
            <Link
              href="/architecture"
              className="rounded-md border border-[var(--border-default)] bg-transparent px-6 py-3 text-sm font-medium text-white hover:bg-[var(--bg-secondary)] transition-colors"
            >
              View Architecture
            </Link>
          </div>

          <div className="mx-auto mt-16 max-w-2xl rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] px-6 py-4 flex items-center text-left font-mono text-sm text-[var(--text-secondary)] shadow-lg">
            <Terminal size={16} className="mr-3 text-blue-500" />
            <span className="text-gray-500 mr-2">$</span>
            <span className="text-blue-400">orquestra</span> <span className="text-white ml-2">generate "University admissions + finance ERP" --deploy</span>
          </div>
        </section>

        {/* INFRASTRUCTURE PRIMITIVES */}
        <section className="mt-32 text-center" id="primitives">
          <h2 className="text-4xl font-bold mb-4">Infrastructure Primitives</h2>
          <p className="text-[var(--text-secondary)] mb-12 text-lg">Build institutional systems with composable, versioned infrastructure blocks</p>

          <div className="grid gap-6 md:grid-cols-3 text-left">
            {PRIMITIVES.map((primitive) => (
              <div
                key={primitive.title}
                className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] hover:bg-[#1a1a1a] p-8 hover:-translate-y-1 transition-all duration-300"
              >
                <primitive.icon size={32} color={primitive.iconColor} className="mb-6" />
                <h3 className="text-xl font-bold text-white mb-3">{primitive.title}</h3>
                <p className="text-[var(--text-secondary)] leading-relaxed">{primitive.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* AI GENERATOR SECTION */}
        <section className="mt-40 grid gap-12 lg:grid-cols-2 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-900/50 bg-blue-900/20 px-3 py-1 text-xs text-blue-400 mb-6">
              <Sparkles size={14} /> AI Infrastructure Generator
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold leading-tight mb-6">
              From Natural Language<br />
              to Deployed Infrastructure<br />
              <span className="text-gray-400">in Minutes</span>
            </h2>
            <p className="text-[var(--text-secondary)] text-lg mb-8 leading-relaxed">
              Describe your institutional ERP in plain English. Our AI generates validated
              architecture models, compiles workflows, and deploys versioned
              infrastructure — automatically synced to GitHub.
            </p>

            <ul className="space-y-3 mb-10 text-[var(--text-secondary)]">
              {['Schema validation with type safety', 'Graph integrity and cycle detection', 'Permission analysis and RBAC checks', 'Compliance verification (FERPA, GDPR)'].map(item => (
                <li key={item} className="flex items-center gap-3">
                  <div className="rounded-full bg-green-500/20 p-1">
                    <svg className="w-3 h-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  {item}
                </li>
              ))}
            </ul>

            <Link href="/console/ai" className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
              Try AI Generator <span>→</span>
            </Link>
          </div>

          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] overflow-hidden shadow-2xl">
            <div className="border-b border-[var(--border-default)] bg-[#1a1a20] px-4 py-3 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
              <span className="ml-4 text-xs text-gray-400 font-mono">AI ERP Generator</span>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <p className="text-sm text-gray-400 mb-2">Describe your ERP:</p>
                <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] p-4 text-sm font-mono text-gray-300">
                  Create university ERP with admissions, finance, and academics domains... <span className="animate-pulse bg-blue-500 w-2 h-4 inline-block align-middle"></span>
                </div>
              </div>

              <div className="rounded-md border border-green-900/50 bg-green-900/10 p-4 border-l-2 border-l-green-500">
                <div className="flex items-center gap-2 text-green-500 mb-3 text-sm font-semibold">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Architecture Generated
                </div>
                <ul className="space-y-2 text-xs text-gray-400 font-mono">
                  <li>✓ Schema validation passed</li>
                  <li>✓ Graph integrity verified</li>
                  <li>✓ 3 domains, 7 workflows created</li>
                  <li>✓ Ready to deploy</li>
                </ul>
              </div>

              <button className="w-full rounded-md bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
                Deploy Architecture
              </button>
            </div>
          </div>
        </section>

        {/* BUILT FOR INSTITUTIONAL SYSTEMS */}
        <section className="mt-40 text-center">
          <h2 className="text-4xl font-bold mb-4">Built for Institutional Systems</h2>
          <p className="text-[var(--text-secondary)] mb-12 text-lg">From universities to EdTech startups, deploy production-ready infrastructure</p>

          <div className="grid md:grid-cols-2 gap-6 text-left">
            <div className="rounded-xl border border-blue-900/30 bg-[var(--bg-secondary)] p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 blur-[100px] rounded-full"></div>
              <div className="w-12 h-12 rounded-lg bg-blue-900/30 flex items-center justify-center text-blue-500 mb-6">
                <GraduationCap size={24} />
              </div>
              <h3 className="text-2xl font-bold mb-2">Universities</h3>
              <p className="text-gray-400 mb-6">Comprehensive Institutional Infrastructure</p>
              <ul className="space-y-2 text-sm text-gray-300 mb-10 list-disc list-inside">
                <li>Admissions & enrollment workflows</li>
                <li>Academic progress tracking</li>
                <li>Financial aid processing</li>
                <li>Multi-departmental coordination</li>
              </ul>
              <div>
                <div className="text-3xl font-bold text-white mb-1">50+ workflows</div>
                <div className="text-sm text-gray-500">Pre-built templates</div>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-8">
              <div className="w-12 h-12 rounded-lg bg-blue-900/20 flex items-center justify-center text-blue-400 mb-6">
                <Rocket size={20} />
              </div>
              <h3 className="text-2xl font-bold mb-2">EdTech Startups</h3>
              <p className="text-gray-400 mb-6">Rapid Institutional Logic Deployment</p>
              <ul className="space-y-2 text-sm text-gray-300 mb-10 list-disc list-inside">
                <li>Launch institutional products faster</li>
                <li>Focus on UI, not backend logic</li>
                <li>Scale from MVP to enterprise</li>
                <li>API-first integration</li>
              </ul>
              <div>
                <div className="text-3xl font-bold text-white mb-1">10x faster</div>
                <div className="text-sm text-gray-500">Time to market</div>
              </div>
            </div>
          </div>
        </section>

        {/* BUILT FOR DEVELOPERS */}
        <section className="mt-40 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-900/50 bg-blue-900/20 px-3 py-1 text-xs text-blue-400 mb-6">
            Developer-First Platform
          </div>
          <h2 className="text-4xl font-bold mb-4">Built for Developers,<br />Powered by AI</h2>
          <p className="text-[var(--text-secondary)] mb-12 text-lg">Infrastructure-as-code meets AI-native design. Version everything, deploy instantly.</p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
            {PLATFORM_FEATURES.map((feature) => (
              <div key={feature.title} className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-6 hover:border-[var(--border-strong)] transition-colors relative">
                <div className="absolute top-6 right-6 px-2 py-1 rounded bg-[var(--bg-primary)] border border-[var(--border-default)] text-[10px] text-gray-400 uppercase tracking-wider">
                  {feature.tag}
                </div>
                <feature.icon size={28} className="text-blue-500 mb-6" />
                <h3 className="text-lg font-bold mb-3">
                  {feature.link ? (
                    <a href={feature.link} target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors underline decoration-blue-500/30 underline-offset-4">
                      {feature.title}
                    </a>
                  ) : (
                    feature.title
                  )}
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* PRICING */}
        <section className="mt-40 text-center" id="pricing">
          <h2 className="text-4xl font-bold mb-4">Simple, Usage-Based Pricing</h2>
          <p className="text-[var(--text-secondary)] mb-12 text-lg">Start free, scale as you grow. No hidden fees.</p>

          <div className="grid md:grid-cols-3 gap-6 text-left">
            {/* Free */}
            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-8">
              <h3 className="text-xl font-bold mb-2">Free</h3>
              <div className="text-4xl font-bold mb-2">$0<span className="text-lg text-gray-500 font-normal">/month</span></div>
              <p className="text-sm text-gray-400 mb-6">For experimentation and learning</p>
              <ul className="space-y-3 text-sm text-gray-300 mb-8">
                <li className="flex items-center gap-2"><svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> 10K API calls/month</li>
                <li className="flex items-center gap-2"><svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> 3 workflows</li>
                <li className="flex items-center gap-2"><svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Community support</li>
                <li className="flex items-center gap-2"><svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Basic templates</li>
              </ul>
              <button className="w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] py-2 text-sm font-semibold hover:bg-[var(--bg-hover)] transition-colors">Get Started</button>
            </div>

            {/* Pro */}
            <div className="rounded-xl border border-blue-500 bg-[var(--bg-secondary)] p-8 relative transform md:-translate-y-4 shadow-xl shadow-blue-900/20">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full">Most Popular</div>
              <h3 className="text-xl font-bold mb-2">Pro</h3>
              <div className="text-4xl font-bold mb-2">$99<span className="text-lg text-gray-400 font-normal">/month</span></div>
              <p className="text-sm text-gray-400 mb-6">For production applications</p>
              <ul className="space-y-3 text-sm text-gray-300 mb-8">
                <li className="flex items-center gap-2"><svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> 500K API calls/month</li>
                <li className="flex items-center gap-2"><svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Unlimited workflows</li>
                <li className="flex items-center gap-2"><svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Priority support</li>
                <li className="flex items-center gap-2"><svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> All templates</li>
                <li className="flex items-center gap-2"><svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> GitHub sync</li>
                <li className="flex items-center gap-2"><svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Custom domains</li>
              </ul>
              <button className="w-full rounded-md bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">Start Free Trial</button>
            </div>

            {/* Enterprise */}
            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-8">
              <h3 className="text-xl font-bold mb-2">Enterprise</h3>
              <div className="text-4xl font-bold mb-2">Custom</div>
              <p className="text-sm text-gray-400 mb-6">For large institutions</p>
              <ul className="space-y-3 text-sm text-gray-300 mb-8">
                <li className="flex items-center gap-2"><svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Unlimited API calls</li>
                <li className="flex items-center gap-2"><svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Dedicated infrastructure</li>
                <li className="flex items-center gap-2"><svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> SLA guarantees</li>
                <li className="flex items-center gap-2"><svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Custom integrations</li>
                <li className="flex items-center gap-2"><svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Compliance support</li>
                <li className="flex items-center gap-2"><svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> On-premise option</li>
              </ul>
              <button className="w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] py-2 text-sm font-semibold hover:bg-[var(--bg-hover)] transition-colors">Contact Sales</button>
            </div>
          </div>

          <Link href="/pricing" className="mt-8 text-sm text-blue-500 flex justify-center items-center gap-2 cursor-pointer hover:underline">
            View detailed pricing and FAQ →
          </Link>
        </section>

      </main>

      <LandingFooter />
    </div>
  );
}
