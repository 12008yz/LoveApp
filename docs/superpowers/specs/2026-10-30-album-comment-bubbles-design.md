# Album comment bubbles

Date: 2026-10-30  
Status: approved (implementing)

## Goal

Make album comments visually distinct from the photo caption so they read clearly as comments.

## Locked decisions

- Style: chat-like — initial avatar + bubble
- Alignment: all comments left (Instagram-under-photo), not mirrored own/partner
- Avatars: initials only (no `avatarPath` in comment API)
- Composer and delete behavior unchanged
- Scope: UI only (`album-client.tsx` + `globals.css`)

## UI

Under each post, after caption / expand controls:

- Row: circular initial (reuse `chat-avatar--sm` + fallback) + soft bubble
- Bubble: author name bold, then body text
- Slightly more gap from caption; soft rose/paper bubble background
- Delete × stays on own comments

## Out of scope

- Photo avatars in comments
- Left/right messenger alignment
- API / schema changes
