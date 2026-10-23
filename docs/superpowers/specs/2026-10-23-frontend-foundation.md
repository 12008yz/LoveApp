# Frontend foundation + mobile first

## Goal

Reusable UI layer and mobile-first shell for LoveApp.

## Decisions

- **Mobile first** — phone layout is the default; desktop enhances.
- Tokens in `src/styles/tokens.css`
- UI kit in `src/components/ui/`
- Dev gallery `/dev/ui` (dev only)

## Shell

- Sticky top bar (brand + couple names)
- Fixed **bottom nav**: Дом, Чат, Дневник, Альбом, Ещё
- «Ещё» = bottom sheet with secondary routes + logout
- Safe-area padding for notched phones

## Visual direction

Warm rose / ink / paper. Source Serif 4 + Manrope. No purple glow theme.

## Next

Migrate remaining feature screens onto UI kit; polish landing/auth for mobile.
