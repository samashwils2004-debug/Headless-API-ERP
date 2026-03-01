"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { Activity, ArrowUpRight, Cpu, Key, LayoutTemplate, Zap } from "lucide-react";

import { listEvents, listWorkflows } from "@/lib/console-api";
import { useEventStream } from "@/lib/hooks/useEventStream";
import { useEventStore } from "@/lib/stores/event-store";
import { useProjectContextStore } from "@/lib/stores/project-context-store";
import { useWorkflowStore } from "@/lib/stores/workflow-store";

function TrendBadge({ value, suffix = "%" }: { value: number; suffix?: string }) {
  const positive = value >= 0;
  return (
    <span
      className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs font-medium"
      style={{
        background: positive ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
        color: positive ? "#4ade80" : "#f87171",
      }}
    >
      <ArrowUpRight size={10} style={{ transform: positive ? "none" : "rotate(90deg)" }} />
      {positive ? "+" : ""}
      {value}
      {suffix}
    </span>
  );
}

function StatCard({
  label,
  value,
  trend,
  trendSuffix,
  sub,
}: {
  label: string;
  value: string;
  trend?: number;
  trendSuffix?: string;
  sub?: string;
}) {
  return (
    <div
      className="rounded-lg border p-5 flex flex-col gap-3"
      style={{ background: "#141418", borderColor: "#1c1c22" }}
    >
      <p className="text-xs uppercase tracking-widest" style={{ color: "#71717a" }}>
        {label}
      </p>
      <div className="flex items-end gap-3">
        <p className="text-3xl font-light" style={{ color: "#f4f4f5" }}>
          {value}
        </p>
        {trend !== undefined && <TrendBadge value={trend} suffix={trendSuffix} />}
      </div>
      {sub && <p className="text-xs" style={{ color: "#52525b" }}>{sub}</p>}
    </div>
  );
}

const QUICK_ACTIONS = [
  {
    label: "Deploy Template",
    description: "Start from a pre-built institutional workflow",
    href: "/console/templates",
    icon: LayoutTemplate,
  },
  {
    label: "Generate with AI",
    description: "Compile a blueprint from natural language",
    href: "/console/ai",
    icon: Cpu,
  },
  {
    label: "Create API Key",
    description: "Issue a scoped key for external integrations",
    href: "/console/api-keys",
    icon: Key,
  },
];

export default function ConsoleDashboardPage() {
  const context = useProjectContextStore((state) => state.context);
  const workflows = useWorkflowStore((state) => state.workflows);
  const setWorkflows = useWorkflowStore((state) => state.setWorkflows);
  const events = useEventStore((state) => state.events);
  const setEvents = useEventStore((state) => state.setEvents);

  useEventStream(context.institutionId, context.projectId);

  useEffect(() => {
    if (!context.institutionId || !context.projectId) return;
    const run = async () => {
      const [workflowPayload, eventPayload] = await Promise.all([
        listWorkflows({ institutionId: context.institutionId, projectId: context.projectId }),
        listEvents({ institutionId: context.institutionId, projectId: context.projectId }, 200),
      ]);
      setWorkflows(workflowPayload.workflows);
      setEvents(eventPayload.events);
    };
    run();
  }, [context.institutionId, context.projectId, setEvents, setWorkflows]);

  const activeWorkflows = workflows.filter((w) => w.deployed).length;
  const totalEvents = events.length;

  const recentEvents = useMemo(() => events.slice(0, 8), [events]);

  const noProject = !context.institutionId || !context.projectId;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-light" style={{ color: "#f4f4f5" }}>
          Dashboard
        </h2>
        <p className="mt-1 text-sm" style={{ color: "#71717a" }}>
          {noProject
            ? "Select a project to view runtime metrics."
            : `Runtime metrics for ${context.projectId}`}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="API Calls"
          value={noProject ? "—" : "1.23M"}
          trend={noProject ? undefined : 15}
          sub="Last 30 days"
        />
        <StatCard
          label="Active Workflows"
          value={noProject ? "—" : String(activeWorkflows)}
          trend={noProject ? undefined : 2}
          trendSuffix=""
          sub={`${workflows.length} total`}
        />
        <StatCard
          label="Events Emitted"
          value={noProject ? "—" : totalEvents > 999 ? `${(totalEvents / 1000).toFixed(1)}K` : String(totalEvents)}
          trend={noProject ? undefined : 22}
          sub="Real-time stream"
        />
        <StatCard
          label="Applications"
          value={noProject ? "—" : "324"}
          trend={noProject ? undefined : 47}
          sub="Across all workflows"
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="mb-3 text-sm font-medium uppercase tracking-widest" style={{ color: "#52525b" }}>
          Quick Actions
        </h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {QUICK_ACTIONS.map(({ label, description, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-start gap-3 rounded-lg border p-4 transition-colors"
              style={{ background: "#141418", borderColor: "#1c1c22" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "#25252b";
                (e.currentTarget as HTMLElement).style.background = "#1b1b24";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "#1c1c22";
                (e.currentTarget as HTMLElement).style.background = "#141418";
              }}
            >
              <div
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded"
                style={{ background: "#1b1b24", color: "#3b82f6" }}
              >
                <Icon size={15} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: "#e4e4e7" }}>
                  {label}
                </p>
                <p className="mt-0.5 text-xs" style={{ color: "#52525b" }}>
                  {description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Events */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium uppercase tracking-widest" style={{ color: "#52525b" }}>
              Recent Activity
            </h3>
            <Link href="/console/events" className="text-xs transition-colors" style={{ color: "#3b82f6" }}>
              View all →
            </Link>
          </div>
          <div
            className="rounded-lg border divide-y"
            style={{ background: "#141418", borderColor: "#1c1c22", divideColor: "#1c1c22" }}
          >
            {noProject ? (
              <div className="px-4 py-8 text-center text-sm" style={{ color: "#52525b" }}>
                Select a project to see events.
              </div>
            ) : recentEvents.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm" style={{ color: "#52525b" }}>
                No events yet. Deploy a workflow to get started.
              </div>
            ) : (
              recentEvents.map((event) => (
                <div key={event.id} className="flex items-start gap-3 px-4 py-3">
                  <div
                    className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                    style={{ background: "rgba(59,130,246,0.12)", color: "#3b82f6" }}
                  >
                    <Activity size={11} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm" style={{ color: "#e4e4e7" }}>
                      {event.type}
                    </p>
                    <p className="mt-0.5 text-xs" style={{ color: "#52525b" }}>
                      {new Date(event.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Workflow Status */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium uppercase tracking-widest" style={{ color: "#52525b" }}>
              Workflow Status
            </h3>
            <Link href="/console/workflows" className="text-xs transition-colors" style={{ color: "#3b82f6" }}>
              Manage →
            </Link>
          </div>
          <div
            className="rounded-lg border divide-y"
            style={{ background: "#141418", borderColor: "#1c1c22" }}
          >
            {noProject ? (
              <div className="px-4 py-8 text-center text-sm" style={{ color: "#52525b" }}>
                Select a project to see workflows.
              </div>
            ) : workflows.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm" style={{ color: "#52525b" }}>
                No workflows found.{" "}
                <Link href="/console/templates" style={{ color: "#3b82f6" }}>
                  Deploy a template →
                </Link>
              </div>
            ) : (
              workflows.slice(0, 6).map((wf) => (
                <div key={wf.id} className="flex items-center gap-3 px-4 py-3">
                  <div
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: wf.deployed ? "#4ade80" : "#52525b" }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm" style={{ color: "#e4e4e7" }}>
                      {wf.name}
                    </p>
                    <p className="mt-0.5 text-xs" style={{ color: "#52525b" }}>
                      v{wf.version} · {wf.deployed ? "deployed" : "draft"}
                      {wf.is_ai_generated ? " · AI-generated" : ""}
                    </p>
                  </div>
                  <div
                    className="shrink-0 rounded px-2 py-0.5 text-xs"
                    style={{
                      background: wf.deployed ? "rgba(74,222,128,0.1)" : "rgba(82,82,91,0.3)",
                      color: wf.deployed ? "#4ade80" : "#71717a",
                    }}
                  >
                    {wf.deployed ? "live" : "draft"}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Infrastructure Status */}
      <div
        className="rounded-lg border p-5"
        style={{ background: "#141418", borderColor: "#1c1c22" }}
      >
        <h3 className="mb-4 text-sm font-medium uppercase tracking-widest" style={{ color: "#52525b" }}>
          Infrastructure Invariants
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Workflow Immutability", desc: "Deployed workflows are locked" },
            { label: "Event Emission", desc: "Every transition emits an event" },
            { label: "4-Stage Validation", desc: "All AI blueprints pre-validated" },
            { label: "Tenant Isolation", desc: "institution_id scoped on all queries" },
          ].map(({ label, desc }) => (
            <div key={label} className="flex items-start gap-2.5">
              <Zap size={13} className="mt-0.5 shrink-0" style={{ color: "#3b82f6" }} />
              <div>
                <p className="text-xs font-medium" style={{ color: "#b4b4bb" }}>
                  {label}
                </p>
                <p className="mt-0.5 text-xs" style={{ color: "#52525b" }}>
                  {desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
