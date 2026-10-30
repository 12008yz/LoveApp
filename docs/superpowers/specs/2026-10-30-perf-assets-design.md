# Perf: assets + chat (2026-10-30)

## Goal
Faster first paint and revisits: smaller art, WebP, SW cache for `/art/`. Then targeted chat jank fixes.

## Phase A (approved)
1. Re-encode used `public/art/*` (smaller px + JPEG quality) and add sibling `.webp`.
2. CSS `image-set(webp, jpeg)`; `<picture>` for landing/home.
3. SW `loveapp-v5`: cache-first `/art/*`, precache chat/diary/home tiles + icons.
4. Bump chat tile `?v=6`.

## Phase B (after A)
Chat: avoid scroll/layout thrash on reactions (already largely done); keep double-tap/reaction path lean.

## Out of scope
Full AVIF pipeline, rewriting all routes to `next/image`, offline-first HTML.
