"use client";

import { useEffect, useMemo, useState } from "react";

import { listEvents } from "@/lib/console-api";
import { useEventStream } from "@/lib/hooks/useEventStream";
import { useEventStore } from "@/lib/stores/event-store";
import { useProjectContextStore } from "@/lib/stores/project-context-store";

export default function EventStreamPage() {
  const context = useProjectContextStore((state) => state.context);
  const events = useEventStore((state) => state.events);
  const setEvents = useEventStore((state) => state.setEvents);

  const [eventType, setEventType] = useState("all");
  const [timeRange, setTimeRange] = useState("24h");

  useEventStream(context.institutionId, context.projectId);

  useEffect(() => {
    if (!context.institutionId || !context.projectId) {
      return;
    }
    listEvents({ institutionId: context.institutionId, projectId: context.projectId }, 250).then((payload) =>
      setEvents(payload.events)
    );
  }, [context.institutionId, context.projectId, setEvents]);

  const filtered = useMemo(() => {
    const now = Date.now();
    const ms = timeRange === "1h" ? 3600000 : timeRange === "6h" ? 21600000 : 86400000;
    return events.filter((event) => {
      if (eventType !== "all" && event.type !== eventType) {
        return false;
      }
      return now - new Date(event.timestamp).getTime() <= ms;
    });
  }, [events, eventType, timeRange]);

  const eventTypes = Array.from(new Set(events.map((event) => event.type)));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">Event Stream</h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Real-time scoped stream: institution + project filtered with WebSocket updates.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3">
        <select
          className="rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] px-2 py-1"
          value={eventType}
          onChange={(e) => setEventType(e.target.value)}
        >
          <option value="all">All event types</option>
          {eventTypes.map((entry) => (
            <option key={entry} value={entry}>{entry}</option>
          ))}
        </select>
        <select
          className="rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] px-2 py-1"
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
        >
          <option value="1h">Last 1h</option>
          <option value="6h">Last 6h</option>
          <option value="24h">Last 24h</option>
        </select>
        <span className="text-sm text-[var(--text-secondary)]">Project: {context.projectName || "N/A"}</span>
      </div>

      <div className="space-y-2">
        {filtered.map((event) => (
          <div key={event.id} className="rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3">
            <div className="flex items-center justify-between text-sm">
              <strong>{event.type}</strong>
              <span className="text-[var(--text-secondary)]">{new Date(event.timestamp).toLocaleString()}</span>
            </div>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              Institution: {event.institution_id} | Project: {event.project_id}
            </p>
            <details className="mt-2 text-xs">
              <summary className="cursor-pointer text-[var(--text-secondary)]">Expand JSON</summary>
              <pre className="mt-2 overflow-auto rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] p-2">
                {JSON.stringify(event.data, null, 2)}
              </pre>
            </details>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-sm text-[var(--text-secondary)]">No events for selected filters.</p>}
      </div>
    </div>
  );
}
