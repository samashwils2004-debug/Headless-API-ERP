"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { WorkflowItem } from "@/lib/console-api";

type WorkflowState = {
  workflows: WorkflowItem[];
  selectedWorkflowId: string | null;
  setWorkflows: (workflows: WorkflowItem[]) => void;
  selectWorkflow: (id: string | null) => void;
};

export const useWorkflowStore = create<WorkflowState>()(
  persist(
    (set) => ({
      workflows: [],
      selectedWorkflowId: null,
      setWorkflows: (workflows) => set({ workflows }),
      selectWorkflow: (id) => set({ selectedWorkflowId: id }),
    }),
    { name: "orquestra-workflows" }
  )
);
