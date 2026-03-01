"use client";

import { useEffect, useMemo } from "react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

import { listEvents, listWorkflows } from "@/lib/console-api";
import { useEventStream } from "@/lib/hooks/useEventStream";
import { useEventStore } from "@/lib/stores/event-store";
import { useProjectContextStore } from "@/lib/stores/project-context-store";
import { useWorkflowStore } from "@/lib/stores/workflow-store";

export default function ConsoleDashboardPage() {
  const context = useProjectContextStore((state) => state.context);
  const workflows = useWorkflowStore((state) => state.workflows);
  const setWorkflows = useWorkflowStore((state) => state.setWorkflows);
  const events = useEventStore((state) => state.events);
  const setEvents = useEventStore((state) => state.setEvents);

  useEventStream(context.institutionId, context.projectId);

  useEffect(() => {
    if (!context.institutionId || !context.projectId) {
      return;
    }
    const run = async () => {
      const [workflowPayload, eventPayload] = await Promise.all([
        listWorkflows({ institutionId: context.institutionId, projectId: context.projectId }),
        listEvents({ institutionId: context.institutionId, projectId: context.projectId }, 60),
      ]);
      setWorkflows(workflowPayload.workflows);
      setEvents(eventPayload.events);
    };
    run();
  }, [context.institutionId, context.projectId, setEvents, setWorkflows]);

  const metricRows = useMemo(() => {
    const bucket = new Map<string, number>();
    for (const event of events) {
      const key = new Date(event.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      bucket.set(key, (bucket.get(key) || 0) + 1);
    }
    return Array.from(bucket.entries())
      .map(([time, count]) => ({ time, count }))
      .slice(-12);
  }, [events]);

  const avgExecution = useMemo(() => {
    const slow = events.filter((event) => event.type === "workflow.execution.slow");
    if (slow.length === 0) {
      return "<50ms";
    }
    const avg =
      slow.reduce((sum, event) => sum + Number((event.data.execution_ms as number | undefined) || 0), 0) /
      slow.length;
    return `${avg.toFixed(1)}ms`;
  }, [events]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Dashboard</h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Deterministic runtime metrics and scoped activity for the active project.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Total Workflows</p>
          <p className="mt-2 text-2xl font-semibold">{workflows.length}</p>
        </div>
        <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Active Workflows</p>
          <p className="mt-2 text-2xl font-semibold">{workflows.filter((w) => w.deployed).length}</p>
        </div>
        <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Event Volume</p>
          <p className="mt-2 text-2xl font-semibold">{events.length}</p>
        </div>
        <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Avg Execution</p>
          <p className="mt-2 text-2xl font-semibold">{avgExecution}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
            API/Event Metrics
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metricRows}>
                <XAxis dataKey="time" tick={{ fontSize: 11, fill: "#a1a1aa" }} />
                <YAxis tick={{ fontSize: 11, fill: "#a1a1aa" }} />
                <Bar dataKey="count" fill="#e4e4e7" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
            Recent Events
          </h3>
          <div className="space-y-2">
            {events.slice(0, 10).map((event) => (
              <div key={event.id} className="rounded-md border border-[var(--border-default)] bg-[var(--bg-tertiary)] p-3">
                <div className="flex items-center justify-between text-sm">
                  <p className="font-medium">{event.type}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{new Date(event.timestamp).toLocaleString()}</p>
                </div>
              </div>
            ))}
            {events.length === 0 && <p className="text-sm text-[var(--text-secondary)]">No events yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
