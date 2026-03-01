"use client";

import { create } from "zustand";

export type ProjectItem = {
  id: string;
  institution_id: string;
  name: string;
  slug: string;
  environment: "test" | "production";
};

type ProjectState = {
  projects: ProjectItem[];
  setProjects: (projects: ProjectItem[]) => void;
};

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  setProjects: (projects) => set({ projects }),
}));
