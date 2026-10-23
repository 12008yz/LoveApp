# LoveApp — design spec

## Goal

Multi-couple web app: each couple is an isolated “home” for exactly two people (boy + girl) with chat, diary, rituals, memories, light games, and care tools.

## Core rules

- Auth required for all app routes except landing/login/register.
- A user belongs to at most one couple.
- Couple has at most two members; `genderRole` `boy`/`girl` unique per couple.
- Content is scoped by `coupleId`; APIs reject outsiders.
- Invite code fills the second seat, then couple becomes `active`.

## Architecture

- Next.js App Router (UI + Route Handlers)
- Prisma models in `prisma/schema.prisma`
- Auth.js JWT sessions (credentials)
- Chat updates via SSE (`/api/messages/stream`) with short polling fallback semantics
- Client feature pages fetch their own APIs after mount

## Feature map

| Area | Routes | Notes |
|------|--------|-------|
| Pairing | `/onboarding`, `/waiting` | create/join + wait loop |
| Chat | `/chat` | text + read receipts |
| Diary | `/diary` | shared entries |
| Pings | `/pings` | quick mood signals |
| Calendar | `/calendar` | dated events |
| Letters | `/letters` | time-locked; author can always read own |
| Album/Map/Timeline | `/album`, `/map`, `/timeline` | media + places + milestones |
| Games | `/games` | tictactoe, words |
| Wishlist/Care/Mood | `/wishlist`, `/care`, `/mood` | gifts, private/shared notes, weekly scores |

## Out of scope

Quizzes, streaks/challenges, video calls, social feed, store, AI advisor, push notifications (optional later).
