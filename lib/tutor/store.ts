import { create } from "zustand";

export interface TutorContext {
  kind: "build" | "lesson" | "learn" | "practice" | "journey" | "generic";
  title?: string;
  detail?: string;
}

interface TutorState {
  open: boolean;
  setOpen: (open: boolean) => void;
  context: TutorContext;
  /** Pages call this from an effect to tell the tutor what's on screen. */
  setContext: (context: TutorContext) => void;
}

export const useTutorStore = create<TutorState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  context: { kind: "generic" },
  setContext: (context) => set({ context }),
}));
