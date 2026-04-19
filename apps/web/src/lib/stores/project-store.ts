"use client";

import { create } from "zustand";
import type { ProjectItem } from "@/types/contracts";

type ProjectState = {
  projects: ProjectItem[];
  setProjects: (projects: ProjectItem[]) => void;
};

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  setProjects: (projects) => set({ projects }),
}));
