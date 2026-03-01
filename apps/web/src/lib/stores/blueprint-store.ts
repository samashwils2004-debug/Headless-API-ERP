"use client";

import { create } from "zustand";

import type { InstitutionalBlueprint, ValidationResult } from "@/types/contracts";

type BlueprintState = {
  proposal: (InstitutionalBlueprint | Record<string, unknown>) | null;
  validationResult: ValidationResult | null;
  setProposal: (
    proposal: (InstitutionalBlueprint | Record<string, unknown>) | null,
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
