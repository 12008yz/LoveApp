"use client";

import type { CSSProperties } from "react";

/** Cap stagger delay so long lists don't take forever to appear. */
export const LIST_STAGGER_CAP = 8;

export function listEnterStyle(index: number): CSSProperties {
  return { ["--i" as string]: Math.min(index, LIST_STAGGER_CAP) };
}

/** Soft placeholder rows while a list is fetching. */
export function ListSkeleton({
  rows = 4,
  tall = false,
}: {
  rows?: number;
  tall?: boolean;
}) {
  return (
    <div
      className={tall ? "list-skeleton list-skeleton--tall" : "list-skeleton"}
      aria-busy="true"
      aria-hidden
    >
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="list-skeleton__item"
          style={{ ["--i" as string]: i }}
        />
      ))}
    </div>
  );
}
