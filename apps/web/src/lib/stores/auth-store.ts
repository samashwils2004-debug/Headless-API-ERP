"use client";

import { create } from "zustand";

import type { AuthUser } from "@/types/contracts";

// Re-export so existing imports from this module continue to work.
export type { AuthUser };

type AuthState = {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));
