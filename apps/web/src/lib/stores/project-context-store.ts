"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ProjectContext = {
  institutionId: string;
  projectId: string;
  projectName: string;
  environment: "test" | "production";
};

type ProjectContextState = {
  context: ProjectContext;
  setContext: (ctx: ProjectContext) => void;
};

const defaultContext: ProjectContext = {
  institutionId: "",
  projectId: "",
  projectName: "",
  environment: "test",
};

export const useProjectContextStore = create<ProjectContextState>()(
  persist(
    (set) => ({
      context: defaultContext,
      setContext: (context) => set({ context }),
    }),
    { name: "admitflow-project-context" }
  )
);
