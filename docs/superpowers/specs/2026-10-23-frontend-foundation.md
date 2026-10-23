# Frontend foundation

## Goal

Prepare a reusable UI layer for LoveApp redesign without rewriting all feature pages yet.

## Stack choices

- CSS variables as source of truth (tokens)
- Small React primitives in `src/components/ui/`
- Existing page CSS kept for compatibility; new work prefers UI kit
- Dev gallery at `/dev/ui` (404 in production)

## Visual direction

Warm “home for two”: rose / ink / paper. Display: Source Serif 4. Body: Manrope.  
Avoid: purple glow themes, cream+terracotta cliché, generic Inter/system stacks.

## Components (v1)

Button, Input, Textarea, Select, Field, Panel, EmptyState, Badge, ErrorText, Stack

## Next after foundation

Redesign landing → shell → chat using the kit.
