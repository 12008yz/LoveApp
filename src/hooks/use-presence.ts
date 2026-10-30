"use client";

import { useEffect, useState } from "react";

/** Keep overlay mounted through exit transition. `visible` drives `.is-open`. */
export function usePresence(open: boolean, durationMs = 340) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);

  // Mount on the same render as open so the portal isn't delayed a full effect tick.
  if (open && !mounted) {
    setMounted(true);
  }

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ms = reduce ? 0 : durationMs;

    if (open) {
      if (reduce) {
        setVisible(true);
        return;
      }
      // One frame at opacity 0, then open — enough for CSS transition, less hitch than double rAF.
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    }

    setVisible(false);
    const t = window.setTimeout(() => setMounted(false), ms);
    return () => window.clearTimeout(t);
  }, [open, durationMs]);

  return { mounted, visible };
}
