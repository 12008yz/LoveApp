# Cozy Home Visual Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Cozy Home visual language — illustrated landing/auth/waiting/home with 8 room hotspots — per `docs/superpowers/specs/2026-10-23-cozy-home-visual-design.md`.

**Architecture:** Static art in `public/art/` + icons in `public/icons/`; CSS tokens evolve in place; `HomeRoom` client overlay of `%`-positioned links on one room plate; auth/landing get illustrated backdrops with paper panels; no API changes.

**Tech Stack:** Next.js App Router, existing UI kit, CSS tokens, generated PNG art.

## Global Constraints

- No pet/plant/stars economy; no purple SaaS look; no auth/API rewrites.
- Phase-1 room: exactly 8 hotspots; `/mood`,`/games`,`/wishlist`,`/care` via Ещё only.
- Keep `SettingsPanel` + `PushPrompt` on home.
- `/home` art = lived-in couple; empty seat only on `/waiting`.
- Icons overwrite `public/icons/icon-192.png` and `icon-512.png`.
- Prefer `prefetch={false}` on room links; keep bottom nav prefetch.
- Mobile-first; `prefers-reduced-motion` respected.

## File map

| File | Role |
|------|------|
| `public/art/*.png` | Landing, auth, home-room, waiting-seat |
| `public/icons/icon-*.png` | PWA marks |
| `src/styles/tokens.css` | Color/token tweak |
| `src/app/globals.css` | Landing/auth/home-room/waiting styles |
| `src/app/page.tsx` | Landing markup |
| `src/app/(auth)/login/page.tsx` | Auth shell class |
| `src/app/(auth)/register/page.tsx` | Auth shell class |
| `src/components/home-room.tsx` | Interactive room |
| `src/lib/home-hotspots.ts` | Hotspot data |
| `src/app/(app)/home/page.tsx` | Use HomeRoom |
| `src/app/waiting/waiting-client.tsx` | Waiting art |
| `src/app/onboarding/onboarding-client.tsx` | Onboarding atmosphere |

---

### Task 1: Generate and place art assets

**Files:**
- Create: `public/art/landing-room.png`, `public/art/auth-window.png`, `public/art/home-room.png`, `public/art/waiting-seat.png`
- Modify: `public/icons/icon-192.png`, `public/icons/icon-512.png`

- [x] **Step 1:** Generate four scene plates + two icons (soft illustrated cozy, lamp amber + dusty rose + wood, no text in images, no photoreal faces)
- [x] **Step 2:** Copy outputs into `public/art/` and `public/icons/`
- [x] **Step 3:** Verify files exist and are valid PNGs (`file` / byte header)

---

### Task 2: Tokens + landing

**Files:**
- Modify: `src/styles/tokens.css`
- Modify: `src/app/globals.css`
- Modify: `src/app/page.tsx`

- [x] **Step 1:** Add `--lamp`, `--wood`; nudge `--paper` toward `#FFF6EF`
- [x] **Step 2:** Restyle `.landing` to use `landing-room.jpg` full-bleed + scrim; keep brand hero + CTAs
- [x] **Step 3:** Manual check `/` — brand dominant, CTAs readable

---

### Task 3: Auth shells

**Files:**
- Modify: `src/app/globals.css` (`.auth-shell`)
- Modify: `src/app/(auth)/login/page.tsx`
- Modify: `src/app/(auth)/register/page.tsx`

- [x] **Step 1:** Auth background `auth-window.jpg` + paper panel over scrim
- [x] **Step 2:** Keep form logic; only chrome/classes
- [x] **Step 3:** Check `/login` and `/register`

---

### Task 4: HomeRoom

**Files:**
- Create: `src/lib/home-hotspots.ts`
- Create: `src/components/home-room.tsx`
- Modify: `src/app/(app)/home/page.tsx`
- Modify: `src/app/globals.css`

**Produces:**
- `HOME_HOTSPOTS: { href, label, left, top, width, height }[]` (percent strings)
- `<HomeRoom />` client component

- [x] **Step 1:** Define 8 hotspots matching spec routes
- [x] **Step 2:** Implement `HomeRoom` with img + links (`prefetch={false}`, `scroll={false}`)
- [x] **Step 3:** Replace tile grid; keep hero greeting, PushPrompt, SettingsPanel
- [x] **Step 4:** Check `/home` taps + keyboard focus

---

### Task 5: Waiting + onboarding atmosphere

**Files:**
- Modify: `src/app/waiting/waiting-client.tsx`
- Modify: `src/app/onboarding/onboarding-client.tsx`
- Modify: `src/app/globals.css`

- [x] **Step 1:** Waiting uses `waiting-seat.jpg` backdrop; keep copy/invite actions
- [x] **Step 2:** Onboarding soft illustrated backdrop (auth or waiting crop)
- [x] **Step 3:** Check `/waiting` and `/onboarding` still function

---

### Task 6: Motion + a11y smoke

- [x] **Step 1:** Ambient drift on landing; hotspot press; auth rise; reduced-motion off
- [x] **Step 2:** Scrims for text contrast; focus-visible on hotspots
- [x] **Step 3:** Quick pass: landing → register chrome → login chrome → (if session) home room

---

## Spec coverage

| Spec item | Task |
|-----------|------|
| Art assets + icons | 1 |
| Tokens / landing | 2 |
| Auth | 3 |
| Home 8 hotspots + settings/push | 4 |
| Waiting / onboarding | 5 |
| Motion / a11y | 6 |
| No API changes | all |
