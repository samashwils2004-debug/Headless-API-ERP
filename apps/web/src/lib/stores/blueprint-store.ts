"use client";

import { create } from "zustand";

import type { InstitutionalBlueprint, ValidationResult, WorkflowBlueprint } from "@/types/contracts";

type BlueprintState = {
  proposal: (InstitutionalBlueprint | WorkflowBlueprint) | null;
  validationResult: ValidationResult | null;
  setProposal: (
    proposal: (InstitutionalBlueprint | WorkflowBlueprint) | null,
    validationResult: ValidationResult | null
  ) => void;
  clear: () => void;
};

export const useBlueprintStore = create<BlueprintState>((set) => ({
  proposal: null,
  validationResult: null,
  setProposal: (proposal, validationResult) => set({ proposal, validationResult }),
  clear: () => set({ proposal: null, validationResult: null }),
}));
