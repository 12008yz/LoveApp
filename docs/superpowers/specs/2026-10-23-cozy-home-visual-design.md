# LoveApp — Cozy Home visual design

**Date:** 2026-10-23  
**Status:** Reviewed (cross-checked against codebase)  
**Reference:** [Cozy Couples showcase](https://screensdesign.com/showcase/cozy-couples-relationship-app)  
**Builds on:** `2026-10-23-frontend-foundation.md`, `2026-10-22-loveapp-design.md`

## Goal

Make LoveApp feel like a **shared home for two**, not a feature dashboard. Landing, auth, onboarding/waiting, and Home should carry one illustrated cozy language. Existing product features and APIs stay; navigation metaphor and visuals change.

## Non-goals

- No virtual pet / plant / stars economy (Cozy Couples monetization loop).
- No purple SaaS gradients (e.g. Paired-like).
- No full rewrite of chat/diary/API or bottom-nav IA.
- No dark mode in this pass.
- No separate desktop information architecture — same shell, illustration scales.
- `/join/[code]` keeps current logic; only light visual alignment if time allows (not blocking).

## Brand feel

| Axis | Choice |
|------|--------|
| Mood | Warm, intimate, slightly playful — “our room”, not a clinic or a dating market |
| Metaphor | Illustrated shared room; objects open features |
| Voice | Short, soft (“для вас двоих”) — matches current landing copy |
| Motion | 2–3 calm motions: ambient light drift, soft object press, enter fade |

## Visual system

### Color (evolve current tokens, don’t scrap)

Keep ink / paper / rose family in `src/styles/tokens.css`; shift toward **illustrated cozy**:

- `--paper`: warm ivory wall (~`#FFF6EF`)
- `--paper-deep`: floor / shadow wash
- `--rose` / `--rose-deep`: soft lamp accent (not neon)
- `--ink` / `--ink-soft`: readable body
- Optional `--lamp` (amber glow) and `--wood` (furniture edge) for illustration UI only
- `themeColor` in `layout.tsx` / manifest stays rose-aligned after token tweak

Avoid cream+terracotta “AI brochure” stereotype: **lamp amber + dusty rose + soft teal plant accent** sparingly — not terracotta headlines on flat cream.

### Typography

- Display: Source Serif 4 (loaded as `--font-fraunces` in `layout.tsx`) — brand, room titles, landing hero
- Body: Manrope — UI, forms, nav
- Landing: brand **LoveApp** is hero-level; supporting line may use `h2` quieter than brand (current pattern OK)

### Shape & elevation

- Large soft radii on sheets/forms (`--radius-xl`)
- Prefer illustrated surfaces over card grids on Home/landing
- Cards allowed only for interactive lists (diary rows, wishlist items), not for hero/home metaphor

### Imagery style (generated assets)

- Flat-to-soft illustrated, consistent line weight, warm evening or late-afternoon light
- No photoreal faces; optional abstract couple silhouettes
- One art direction for all assets (same palette, same “lamp + wood + linen”)

## Information architecture (Home)

### Route inventory (must stay reachable)

All current app routes remain available via bottom nav and/or room and/or Ещё:

| Route | Primary access after redesign |
|-------|-------------------------------|
| `/home` | Bottom nav «Дом» + landing after auth |
| `/chat` | Bottom nav + room object |
| `/diary` | Bottom nav + room object |
| `/album` | Bottom nav + room object |
| `/pings` | Room object + Ещё |
| `/calendar` | Room object + Ещё |
| `/letters` | Room object + Ещё |
| `/map` | Room object + Ещё |
| `/timeline` | Room object + Ещё |
| `/games` | Room object + Ещё |
| `/wishlist` | Room object + Ещё |
| `/care` | Room object + Ещё |
| `/mood` | **Ещё only** (not a room hotspot — avoids 12 overlapping targets) |

Bottom nav unchanged: Дом, Чат, Дневник, Альбом, Ещё (`PRIMARY_NAV` / `MORE_NAV` in `src/lib/constants.ts`).

### Room hotspots (max clarity on phone)

Replace the 12-tile grid on `/home` with an interactive room. **At most ~8 large hotspots** on the plate; remaining features stay in Ещё only (already listed).

**Phase 1 — required hotspots (8):**

| Object | Route |
|--------|-------|
| Photo frame | `/album` |
| Notebook | `/diary` |
| Phone / chat bubble | `/chat` |
| Wall calendar | `/calendar` |
| Map on table | `/map` |
| Envelope stack | `/letters` |
| Mood lamp / candle | `/pings` |
| Polaroid string / lights | `/timeline` |

**Phase 1 — Ещё only (no hotspot yet):** `/games`, `/wishlist`, `/care`, `/mood`.

**Phase 2 (optional):** add game shelf, gift jar, corkboard if art stays readable at 390px width.

### Couple states (important)

- `/home` is only reachable for **active** couples (`requireCouple`). Art for home is always “together / lived-in”, never a waiting empty seat.
- `/waiting` is **outside** `(app)` shell (no bottom nav). Uses `waiting-seat` art (empty seat / unlit second lamp). When partner joins, client redirects to `/home` — no need to morph waiting art in place.

### Settings / invite code

Current `SettingsPanel` on `/home` (invite code + leave couple) **must remain reachable**. After redesign: compact control under room or gear in topbar — do not drop invite/leave into art-only discovery.

### Push prompt

`PushPrompt` on home stays functionally; restyle to match paper/cozy panel (no new push logic).

## Screens in scope

### 1. Landing `/`

- Full-bleed illustrated room as atmosphere
- Brand **LoveApp** hero-level
- One support line (keep meaning of current copy)
- CTA: Войти / Создать аккаунт (matches `src/app/page.tsx`)
- Logged-in users still `redirect("/home")`
- No stats / feature grid in first viewport

### 2. Login `/login` & Register `/register`

- Same world, calmer crop
- Form in soft paper panel over illustration
- Keep auth logic, `next` query safety, redirects (`/home` vs `/onboarding`)

### 3. Onboarding `/onboarding` & Waiting `/waiting`

- Ritual on illustrated backdrop
- Waiting: invite link/code prominent + empty-seat visual
- No change to invite/API / polling behavior

### 4. Home `/home`

- Client `HomeRoom`: background art + `%`-positioned `<Link>` hotspots
- Tap targets ≥44px; visible focus; `aria-label` (or visible captions)
- Optional first-visit tip (localStorage once)
- Settings/invite preserved (see above)

### 5. PWA icons

- Replace `public/icons/icon-192.png` and `icon-512.png` (paths already wired in `layout.tsx` + `manifest.webmanifest`)
- Same cozy mark language as landing

## Asset list

Store staging art under `public/art/`; **icons overwrite** `public/icons/` (not a second unused path).

| File | Use |
|------|-----|
| `public/art/landing-room.png` | Landing hero background |
| `public/art/auth-window.png` | Login/register backdrop |
| `public/art/home-room.png` | Active-couple interactive home (clear object silhouettes for 8 hotspots) |
| `public/art/waiting-seat.png` | Waiting / invite mood |
| `public/icons/icon-192.png` | PWA / metadata (overwrite) |
| `public/icons/icon-512.png` | PWA / metadata (overwrite) |

**Removed from earlier draft:** `home-room-together.png` as separate required asset — `/home` is always active couple; one home plate is enough for v1.  
**Removed:** `mark-*.png` under `art/` as the only icon source — use `public/icons/` directly to match existing app wiring.

Generation constraints: mobile-first (~3:4 or 9:16); landing leaves clear band for brand + CTAs; hotspot objects readable at ~390px width; consistent palette across all plates.

## Motion

1. Landing: slow ambient drift / light pulse (CSS)
2. Home hotspots: scale ~1.02 + soft glow on press
3. Auth: panel rise-in once on mount

Respect `prefers-reduced-motion`.

## Technical approach

- Static files in `public/art/` + `public/icons/`
- `HomeRoom` client component; hotspot map as data (`href`, `label`, `style: { left, top, width, height }` in %)
- Desktop: max-width stage centered inside `.app-main`
- Tokens in `tokens.css`; landing/auth/home styles in `globals.css` (or colocated CSS)
- UI kit buttons/fields kept; restyle via tokens
- Room object links: `prefetch={false}`; bottom `PRIMARY_NAV` may keep default prefetch
- Webpack remain default for `next dev` (Turbopack HMR loop risk — ops note, not visual)

## Accessibility

- Hotspots are real links with accessible names
- Scrim behind text/CTAs on illustration
- Keyboard tab order through hotspots; visible `:focus-visible`
- Decorative images: empty `alt` or meaningful short alt once; don’t duplicate every hotspot in alt text

## Success criteria

- Landing / auth / waiting / home feel like one illustrated product within ~10 seconds
- Home is not a generic 12-tile dashboard
- All previous feature routes still reachable (nav + Ещё + room)
- Invite code + leave couple still reachable without hunting
- Auth/couple/invite flows unchanged in behavior
- Mobile first viewport: brand + CTAs on landing; room usable with thumbs

## Implementation order

1. Generate art: landing, auth, home-room, waiting-seat, icons
2. Tokens + landing + auth restyle
3. `HomeRoom` (8 hotspots) + preserve SettingsPanel/PushPrompt chrome
4. Onboarding + waiting atmosphere
5. Motion + a11y pass

## Out of scope follow-ups

- Phase 2 extra hotspots (games, wishlist, care)
- Illustrated headers inside chat/diary/etc.
- Desktop alternate nav
- Lottie / layered object animations
- Full restyle of `/join/[code]` beyond shared auth backdrop if unused

## Review log (2026-10-23)

Checked against: `constants.ts` nav, `src/app/**/page.tsx` routes, `home/page.tsx` tiles/settings/push, `layout.tsx` icons/fonts, landing CTAs, waiting outside app shell, product design feature map.

| Issue found | Resolution in this doc |
|-------------|------------------------|
| 11 hotspots denser than Cozy Couples / hard on phone | Cap phase 1 at 8; games/wishlist/care/mood → Ещё |
| `/mood` dropped from room without saying how to open | Explicit: Ещё only |
| `home-room` described as empty-ish but `/home` requires active couple | Home art = lived-in; empty seat only on `/waiting` |
| `home-room-together.png` redundant | Dropped as required asset |
| `mark-192` under `art/` vs app using `public/icons/` | Icons overwrite `public/icons/` only |
| Settings/invite could vanish if only metaphor nav | Must keep SettingsPanel (or equivalent) |
| `/join/[code]` omitted | Non-blocking; light align optional |
| Landing CTA wording | Aligned with existing «Создать аккаунт» / «Войти» |
