"use client";

import { create } from "zustand";

export type AuthUser = {
  id: string;
  institution_id: string;
  email: string;
  name: string;
  role: string;
};

type AuthState = {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));
