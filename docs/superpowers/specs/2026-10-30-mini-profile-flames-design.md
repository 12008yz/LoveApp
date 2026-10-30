# Mini-profile + shared credentials + flames

Date: 2026-10-30  
Status: implementing

## Profile modal

Near-fullscreen sheet: avatar, displayName, email, password (couple can see each other's).
Own fields editable; partner read-only for credentials. Avatar upload for self.

## Shared password

`User.passwordEnc` — AES-GCM ciphertext via `AUTH_SECRET`. Refresh on register + successful login + password change. Hash remains for auth.

## Avatars

All author selects include `avatarPath`. Shared `UserAvatar` component. Album posts/comments show photo avatars.

## Flames

Calendar day `Europe/Moscow`. `FlameCheckIn` unique `(coupleId, userId, day)`.
Day counts toward streak only when **both** members checked in that day.
Streak = consecutive shared days ending today (if complete) else yesterday.
