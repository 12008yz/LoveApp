# Chat open without skeleton

Date: 2026-10-30  
Status: implemented

## Goal

Open chat without bubble skeleton. Header + composer immediately usable; message log appears smoothly after history loads, without visible scroll jump.

## Behavior

- Remove chat skeleton UI entirely.
- Shell (header, pin bar, search, composer) always visible; send works during history fetch.
- While history not yet revealed: empty or settling log, `aria-busy=true`, no placeholders.
- After history arrives: render rows at opacity 0 + `pointer-events: none`, scroll to bottom (instant, double-rAF), then fade log in (~280ms). Sticker panel must not cancel that settle.
- Empty history: reveal empty-state immediately (no scroll wait).
- No message cache across navigations.
- `prefers-reduced-motion: reduce`: skip fade; show after scroll settle.

## Out of scope

- List skeletons on other screens
- Offline/cache-first history
- Changing composer layout
