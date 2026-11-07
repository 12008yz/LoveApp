"use client";

import { useEffect, useRef } from "react";

/**
 * Small fixed miniature above the bottom nav.
 * Heart on the right; arrow travels horizontally left → right through it
 * as the page scrolls (`--pierce` 0..1).
 * When `snapBack` is set (empty diary), scroll springs back to top after
 * scrolling settles (not on every UI click).
 */
export function DiaryPierce({ snapBack = false }: { snapBack?: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0;
    let snapTimer = 0;
    let pointersDown = 0;
    let scrolledAway = false;

    const scrollTop = () =>
      window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;

    const scrollMax = () => {
      const doc = document.documentElement;
      const body = document.body;
      const height = Math.max(doc.scrollHeight, body.scrollHeight);
      return Math.max(1, height - window.innerHeight);
    };

    const update = () => {
      raf = 0;
      if (reduce.matches) {
        root.style.setProperty("--pierce", "0.5");
        return;
      }
      const top = scrollTop();
      if (top > 1) scrolledAway = true;
      if (top <= 1) scrolledAway = false;
      const p = Math.min(1, Math.max(0, top / scrollMax()));
      root.style.setProperty("--pierce", p.toFixed(4));
    };

    const snapToTop = () => {
      if (!snapBack) return;
      if (pointersDown > 0) return;
      if (!scrolledAway || scrollTop() <= 1) return;
      window.scrollTo({
        top: 0,
        behavior: reduce.matches ? "auto" : "smooth",
      });
    };

    const scheduleSnap = (delayMs: number) => {
      if (!snapBack) return;
      window.clearTimeout(snapTimer);
      snapTimer = window.setTimeout(snapToTop, delayMs);
    };

    const onScroll = () => {
      if (!raf) raf = window.requestAnimationFrame(update);
      if (snapBack && pointersDown === 0 && scrollTop() > 1) scheduleSnap(600);
    };

    const onPointerDown = () => {
      if (!snapBack) return;
      pointersDown += 1;
      window.clearTimeout(snapTimer);
    };

    const onPointerUp = () => {
      if (!snapBack) return;
      pointersDown = Math.max(0, pointersDown - 1);
      if (pointersDown === 0 && scrolledAway) scheduleSnap(220);
    };

    const onScrollEnd = () => {
      if (snapBack && pointersDown === 0 && scrolledAway) snapToTop();
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("resize", onScroll);
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("pointerup", onPointerUp, { passive: true });
    window.addEventListener("pointercancel", onPointerUp, { passive: true });
    window.addEventListener("scrollend", onScrollEnd as EventListener);
    reduce.addEventListener("change", update);

    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      window.clearTimeout(snapTimer);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      window.removeEventListener("scrollend", onScrollEnd as EventListener);
      reduce.removeEventListener("change", update);
    };
  }, [snapBack]);

  return (
    <div ref={rootRef} className="diary-pierce" aria-hidden>
      <div className="diary-pierce__glow" />
      <picture className="diary-pierce__heart">
        <source srcSet="/art/diary-heart.webp?v=2" type="image/webp" />
        <img
          src="/art/diary-heart.png?v=2"
          alt=""
          width={440}
          height={351}
          draggable={false}
          decoding="async"
        />
      </picture>
      <picture className="diary-pierce__arrow">
        <source srcSet="/art/diary-arrow.webp?v=2" type="image/webp" />
        <img
          src="/art/diary-arrow.png?v=2"
          alt=""
          width={432}
          height={440}
          draggable={false}
          decoding="async"
        />
      </picture>
    </div>
  );
}
