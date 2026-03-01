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
  pushEvent: (event) => set((state) => ({ events: [event, ...state.events].slice(0, 400) })),
  setEvents: (events) => set({ events }),
  clear: () => set({ events: [] }),
}));
