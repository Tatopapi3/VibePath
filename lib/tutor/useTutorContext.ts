"use client";

import { useEffect } from "react";
import { useTutorStore, type TutorContext } from "./store";

/**
 * Publish what's on screen to the tutor widget. Call from a page/component
 * with the current context; it resets to generic on unmount.
 */
export function useTutorContext(kind: TutorContext["kind"], title?: string, detail?: string) {
  const setContext = useTutorStore((s) => s.setContext);
  useEffect(() => {
    setContext({ kind, title, detail });
    return () => setContext({ kind: "generic" });
  }, [setContext, kind, title, detail]);
}
