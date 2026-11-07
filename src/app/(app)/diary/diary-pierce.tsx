"use client";

import { useEffect, useRef } from "react";

/**
 * Fixed heart + diagonal arrow scene. Arrow travels bottom-left → top-right
 * through the heart as the page scrolls (`--pierce` 0..1).
 */
export function DiaryPierce() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0;

    const update = () => {
      raf = 0;
      if (reduce.matches) {
        root.style.setProperty("--pierce", "0.5");
        return;
      }
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      if (scrollable <= 8) {
        // Short page: hold the mid “pierced” pose so the scene still reads.
        root.style.setProperty("--pierce", "0.48");
        return;
      }
      const max = Math.max(scrollable, window.innerHeight * 0.7);
      const p = Math.min(1, Math.max(0, window.scrollY / max));
      root.style.setProperty("--pierce", p.toFixed(4));
    };

    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    reduce.addEventListener("change", update);
    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      reduce.removeEventListener("change", update);
    };
  }, []);

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
