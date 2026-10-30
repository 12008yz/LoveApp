# Chat open without skeleton — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove chat skeleton and reveal the message log only after initial bottom scroll, with a soft fade.

**Architecture:** Keep `chatReady` for fetch completion; add `chatRevealed` flipped after settle scroll (or immediately if empty). CSS: settling = opacity 0, ready = fade-in.

**Tech Stack:** React client component, existing `globals.css` chat motion tokens.

## Global Constraints

- Composer remains usable before history loads.
- No new caching layer.
- Honor `prefers-reduced-motion`.

---

### Task 1: Reveal state + remove skeleton in `chat-client.tsx`

**Files:** `src/app/(app)/chat/chat-client.tsx`

- [x] Add `chatRevealed` state (default false).
- [x] After `chatReady` and first scroll settle (or empty list), set `chatRevealed` true.
- [x] Delete skeleton JSX; gate empty-state / rows on `chatReady` as today.
- [x] Log classes: base; `--settling` when ready && !revealed; `--ready` when revealed.

### Task 2: CSS

**Files:** `src/app/globals.css`

- [x] Add `.chat-log--settling { opacity: 0; }`.
- [x] Fade `--ready` from 0→1 (not 0.4→1).
- [x] Remove unused `.chat-skeleton*` rules; keep reduced-motion override for `--ready`.

### Task 3: Verify

- [x] `tsc --noEmit` clean after changes.
- [ ] Open `/chat`: no skeleton; shell immediate; soft reveal after load (manual).
- [ ] Empty chat: empty copy appears without jump (manual).
- [ ] Send before history finishes still works after merge (manual).
