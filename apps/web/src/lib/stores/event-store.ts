"use client";

import { create } from "zustand";

import type { EventItem } from "@/lib/console-api";

type EventState = {
  events: EventItem[];
  pushEvent: (event: EventItem) => void;
  setEvents: (events: EventItem[]) => void;
  clear: () => void;
};

export const useEventStore = create<EventState>((set) => ({
  events: [],
  pushEvent: (event) => set((state) => {
    if (state.events.some((e) => e.id === event.id)) return state;
    return { events: [event, ...state.events].slice(0, 400) };
  }),
  setEvents: (events) => set({
    events: [...new Map(events.map((e) => [e.id, e])).values()],
  }),
  clear: () => set({ events: [] }),
}));
