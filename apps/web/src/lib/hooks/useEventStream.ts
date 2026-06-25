"use client";

// a react hook that keeps the console's live event feed updated in real time
// it does two things:
// 1. does a REST backfill: GET /api/events?limit=50
// 2. opens a WebSocket connection to /api/events/ws?institution_id=${institutionId}&project_id=${projectId}
//    and pushes events as they arrive
// if the WebSocket closes, it will try to reconnect with an exponential backoff
// it uses the same logic as console-api.ts

//events are pushed into Zustand's useEventStore, which all console pages subscribe to
// connects /api/events (REST) and /api/events/ws (WebSocket)

import { useEffect } from "react";

import { useEventStore } from "@/lib/stores/event-store";

export function useEventStream(institutionId: string, projectId: string) {
  const pushEvent = useEventStore((state) => state.pushEvent);

  useEffect(() => {
    if (!institutionId || !projectId) {
      return;
    }

    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
    const wsBase = process.env.NEXT_PUBLIC_WS_BASE_URL || apiBase.replace(/^http/, "ws");
    let ws: WebSocket | null = null;
    let reconnectTimer: number | null = null;

    const backfill = async () => {
      const response = await fetch(`/api/events?limit=50`, {
        headers: {
          "X-Institution-Id": institutionId,
          "X-Project-Id": projectId,
        },
      });
      if (!response.ok) {
        return;
      }
      const payload = await response.json();
      for (const event of payload.events ?? []) {
        pushEvent(event);
      }
    };

    const connect = () => {
      ws = new WebSocket(`${wsBase}/api/events/ws?institution_id=${institutionId}&project_id=${projectId}`);
      ws.onmessage = (message) => {
        try {
          const event = JSON.parse(message.data);
          pushEvent(event);
        } catch {
          // Ignore malformed events.
        }
      };
      ws.onclose = () => {
        reconnectTimer = window.setTimeout(async () => {
          await backfill();
          connect();
        }, 1500);
      };
    };

    connect();

    return () => {
      if (reconnectTimer) {
        window.clearTimeout(reconnectTimer);
      }
      if (ws) {
        ws.close();
      }
    };
  }, [institutionId, projectId, pushEvent]);
}
