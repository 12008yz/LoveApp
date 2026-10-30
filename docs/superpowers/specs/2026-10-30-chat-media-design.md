# Chat photo/video media

Date: 2026-10-30  
Status: implementing (user approved approach + API; UI locked to Telegram-like)

## Goal

Send 1–10 photos/videos per message in couple chat, optional caption, reply/quote/reactions unchanged.

## Decisions

- Model: `Message` + `MessageAttachment[]`
- Limits: image 5 MB, video 25 MB, max 10 files
- Types: jpeg/png/webp/gif, mp4/webm/quicktime
- `POST /api/messages/media` multipart
- body may be empty when attachments present
- Out of scope: voice, docs, transcoding, delete message

## UI

- Composer attach control → multi-file picker → preview strip → send
- Bubble: media grid + caption; tap → fullscreen image/video viewer
