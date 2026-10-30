"use client";

import {
  FormEvent,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import { CHAT_REACTIONS, CHAT_STICKERS } from "@/lib/constants";
import { formatLastSeen, isOnline } from "@/lib/chat-presence";
import {
  CHAT_IMAGE_MAX_BYTES,
  CHAT_MEDIA_MAX_FILES,
  CHAT_VIDEO_MAX_BYTES,
  mediaPreviewLabel,
  type AggregatedReaction,
  type AttachmentDto,
  type MessageDto,
} from "@/lib/chat-messages";
import { MiniProfile } from "@/components/mini-profile";
import { UserAvatar } from "@/components/user-avatar";
import { usePresence } from "@/hooks/use-presence";

type PendingMedia = {
  id: string;
  file: File;
  kind: "image" | "video";
  url: string;
};

type MediaViewerState = {
  items: AttachmentDto[];
  index: number;
};

type Partner = {
  id: string;
  displayName: string;
  avatarPath: string | null;
  genderRole: string;
  lastSeenAt: string | null;
};

type Person = {
  id: string;
  displayName: string;
  avatarPath: string | null;
};

type MenuState = {
  messageId: string;
  mine: boolean;
  top: number;
  left: number;
  width: number;
  height: number;
  menuAbove: boolean;
} | null;

const GROUP_GAP_MS = 5 * 60_000;
const LONG_PRESS_MS = 420;
/** Gap between two short taps; must stay below LONG_PRESS_MS. */
const DOUBLE_TAP_MS = 320;
const DOUBLE_TAP_REACTION = CHAT_REACTIONS[0];
const FOCUS_MENU_ESTIMATE = 268;
const FOCUS_REACTIONS_H = 52;
/** fly 0.88s + last particle delay (~168ms) */
const REACT_BURST_MS = 1100;
const REACT_BURST_PARTICLES = 7;

type ReactBurst = {
  id: number;
  messageId: string;
  emoji: string;
};

function dayKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function formatDayLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startMsg = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((startToday.getTime() - startMsg.getTime()) / 86_400_000);
  if (diffDays === 0) return "Сегодня";
  if (diffDays === 1) return "Вчера";
  return d.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: d.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
}

function sameDay(a: string, b: string) {
  return dayKey(a) === dayKey(b);
}

function isStickerBody(body: string, attachments?: AttachmentDto[] | null) {
  if (attachments?.length) return false;
  return body.length <= 8 && /\p{Extended_Pictographic}/u.test(body) && !/\n/.test(body);
}

function replyPreviewText(m: MessageDto) {
  const trimmed = m.body.trim();
  if (trimmed) return trimmed;
  return mediaPreviewLabel(m.attachments) || "Сообщение";
}

function ChatSvgIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

function StickerIcon() {
  return (
    <ChatSvgIcon>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 10h.01M15.5 10h.01" />
      <path d="M8.2 14.5c1.1 1.4 2.5 2 3.8 2s2.7-.6 3.8-2" />
    </ChatSvgIcon>
  );
}

function SendIcon() {
  return (
    <ChatSvgIcon>
      <path d="M5 12h13" />
      <path d="m13 6 6 6-6 6" />
    </ChatSvgIcon>
  );
}

function AttachIcon() {
  return (
    <ChatSvgIcon>
      <path d="M21.4 11.6 12.1 20.9a5.5 5.5 0 0 1-7.8-7.8l9.9-9.9a3.5 3.5 0 0 1 5 5l-9.9 9.9a1.5 1.5 0 0 1-2.1-2.1l8.5-8.5" />
    </ChatSvgIcon>
  );
}

function ProfileIcon() {
  return (
    <ChatSvgIcon>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5.5 19.2c1.4-3 3.5-4.4 6.5-4.4s5.1 1.4 6.5 4.4" />
    </ChatSvgIcon>
  );
}

function CloseIcon() {
  return (
    <ChatSvgIcon>
      <path d="M7 7l10 10M17 7 7 17" />
    </ChatSvgIcon>
  );
}

function SearchIcon() {
  return (
    <ChatSvgIcon>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 3.5 3.5" />
    </ChatSvgIcon>
  );
}

function ReplyIcon() {
  return (
    <ChatSvgIcon>
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
    </ChatSvgIcon>
  );
}

function EditIcon() {
  return (
    <ChatSvgIcon>
      <path d="M12 20h9" />
      <path d="m16.5 3.5 4 4L8 20H4v-4L16.5 3.5z" />
    </ChatSvgIcon>
  );
}

function PinIcon() {
  return (
    <ChatSvgIcon>
      <path d="M12 17v5" />
      <path d="M9 2h6l1 7H8L9 2z" />
      <path d="M8 9h8l-1.2 4H9.2L8 9z" />
    </ChatSvgIcon>
  );
}

function CopyIcon() {
  return (
    <ChatSvgIcon>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M4 16V6a2 2 0 0 1 2-2h10" />
    </ChatSvgIcon>
  );
}

function TrashIcon() {
  return (
    <ChatSvgIcon>
      <path d="M4 7h16" />
      <path d="M9 7V5h6v2" />
      <path d="m6 7 1 13h10l1-13" />
    </ChatSvgIcon>
  );
}

function pinPreviewText(body: string) {
  return body.replace(/\s+/g, " ").trim();
}

function buildMenuState(messageId: string, mine: boolean): MenuState {
  const bubble = document
    .querySelector(`[data-message-id="${messageId}"] .chat-bubble`)
    ?.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const pad = 10;
  const width = bubble?.width ?? Math.min(240, vw - 32);
  const height = bubble?.height ?? 48;
  const left = bubble ? Math.min(Math.max(pad, bubble.left), vw - width - pad) : pad;
  const top = bubble ? Math.min(Math.max(pad, bubble.top), vh - height - pad) : pad + 80;
  const spaceBelow = vh - (top + height) - pad;
  const needBelow = FOCUS_MENU_ESTIMATE + 12;
  const menuAbove = spaceBelow < needBelow && top > needBelow + FOCUS_REACTIONS_H;
  return { messageId, mine, top, left, width, height, menuAbove };
}

type Row =
  | { kind: "day"; key: string; label: string }
  | {
      kind: "msg";
      key: string;
      message: MessageDto;
      mine: boolean;
      firstInGroup: boolean;
      lastInGroup: boolean;
    };

function buildRows(messages: MessageDto[], me: string | undefined): Row[] {
  const rows: Row[] = [];
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    const prev = messages[i - 1];
    const next = messages[i + 1];

    if (!prev || !sameDay(prev.createdAt, m.createdAt)) {
      rows.push({ kind: "day", key: `day-${dayKey(m.createdAt)}`, label: formatDayLabel(m.createdAt) });
    }

    const mine = m.authorId === me;
    const closePrev =
      prev &&
      prev.authorId === m.authorId &&
      sameDay(prev.createdAt, m.createdAt) &&
      new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() <= GROUP_GAP_MS;
    const closeNext =
      next &&
      next.authorId === m.authorId &&
      sameDay(next.createdAt, m.createdAt) &&
      new Date(next.createdAt).getTime() - new Date(m.createdAt).getTime() <= GROUP_GAP_MS;

    rows.push({
      kind: "msg",
      key: m.id,
      message: m,
      mine,
      firstInGroup: !closePrev,
      lastInGroup: !closeNext,
    });
  }
  return rows;
}

function mergeById(prev: MessageDto[], incoming: MessageDto[]) {
  const map = new Map(prev.map((m) => [m.id, m]));
  for (const m of incoming) map.set(m.id, m);
  return [...map.values()].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

export function ChatClient({ partner }: { partner: Partner | null }) {
  const { data, update } = useSession();
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [pinnedMessageId, setPinnedMessageId] = useState<string | null>(null);
  const [pinnedPreview, setPinnedPreview] = useState<{
    id: string;
    body: string;
    authorName: string;
  } | null>(null);
  const [text, setText] = useState("");
  const [profile, setProfile] = useState<Person | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [stickersOpen, setStickersOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [searchHits, setSearchHits] = useState<MessageDto[]>([]);
  const [searchNote, setSearchNote] = useState("");
  const [profileError, setProfileError] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<MessageDto | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [menu, setMenu] = useState<MenuState>(null);
  const [portalReady, setPortalReady] = useState(false);
  const [partnerSeen, setPartnerSeen] = useState<string | null>(partner?.lastSeenAt ?? null);
  const [partnerLive, setPartnerLive] = useState<{
    displayName: string;
    avatarPath: string | null;
  } | null>(null);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [reactBurst, setReactBurst] = useState<ReactBurst | null>(null);
  const [chatReady, setChatReady] = useState(false);
  const [chatRevealed, setChatRevealed] = useState(false);
  const [tick, setTick] = useState(0);
  const [pendingMedia, setPendingMedia] = useState<PendingMedia[]>([]);
  const [mediaViewer, setMediaViewer] = useState<MediaViewerState | null>(null);
  const [mediaViewerShown, setMediaViewerShown] = useState<MediaViewerState | null>(null);
  const [miniProfileOpen, setMiniProfileOpen] = useState(false);
  const [miniFocusId, setMiniFocusId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stickersPresence = usePresence(stickersOpen);
  const profilePresence = usePresence(profileOpen);
  const mediaPresence = usePresence(Boolean(mediaViewer));

  useEffect(() => {
    if (mediaViewer) setMediaViewerShown(mediaViewer);
  }, [mediaViewer]);

  const logRef = useRef<HTMLDivElement>(null);
  const reactBurstId = useRef(0);
  const reactBurstTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressStart = useRef<{ x: number; y: number } | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stickToBottom = useRef(true);
  const reactingIds = useRef(new Set<string>());
  const lastTap = useRef<{ id: string; at: number } | null>(null);

  function isNearBottom(el: HTMLElement, threshold = 100) {
    return el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
  }

  function scrollLogToBottom() {
    const el = logRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }

  const me = data?.user?.id || profile?.id;
  function openMiniProfile(userId?: string | null) {
    setMiniFocusId(userId ?? me ?? null);
    setMiniProfileOpen(true);
    setProfileOpen(false);
    setStickersOpen(false);
    setSearchOpen(false);
  }
  const rows = useMemo(() => buildRows(messages, me), [messages, me]);
  const pinnedFromList = pinnedMessageId
    ? messages.find((m) => m.id === pinnedMessageId)
    : null;
  const pinnedBar =
    pinnedFromList
      ? { id: pinnedFromList.id, body: pinPreviewText(replyPreviewText(pinnedFromList)) }
      : pinnedMessageId && pinnedPreview?.id === pinnedMessageId
        ? { id: pinnedPreview.id, body: pinPreviewText(pinnedPreview.body) }
        : null;

  const partnerView = partner
    ? {
        ...partner,
        displayName: partnerLive?.displayName ?? partner.displayName,
        avatarPath: partnerLive?.avatarPath ?? partner.avatarPath,
      }
    : null;

  const subtitle = useMemo(() => {
    if (!partnerView) return "";
    if (partnerTyping) return "печатает…";
    if (isOnline(partnerSeen)) return "в сети";
    return formatLastSeen(partnerSeen, partnerView.genderRole);
    // tick refreshes relative time
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerView, partnerSeen, partnerTyping, tick]);

  const scrollToMessage = useCallback((id: string) => {
    const el = logRef.current?.querySelector(`[data-message-id="${id}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightId(id);
      window.setTimeout(() => setHighlightId((cur) => (cur === id ? null : cur)), 1400);
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/messages");
        const json = await res.json();
        if (!cancelled) {
          setMessages(json.messages || []);
          setPinnedMessageId(json.pinnedMessageId ?? null);
          setPinnedPreview(json.pinnedPreview ?? null);
        }
      } catch {
        /* keep empty; still leave loading */
      } finally {
        if (!cancelled) setChatReady(true);
      }
    }
    async function loadProfile() {
      const res = await fetch("/api/profile");
      const json = await res.json();
      if (!cancelled && json.user) {
        setProfile(json.user);
        setNameDraft(json.user.displayName);
      }
    }
    void load();
    void loadProfile();

    const es = new EventSource("/api/messages/stream");
    es.onmessage = (ev) => {
      try {
        const payload = JSON.parse(ev.data);
        if (payload.type === "messages" && payload.messages?.length) {
          setMessages((prev) => mergeById(prev, payload.messages as MessageDto[]));
        }
        if (payload.type === "message_updated" && payload.messages?.length) {
          setMessages((prev) => mergeById(prev, payload.messages as MessageDto[]));
        }
        if (payload.type === "message_deleted" && payload.ids?.length) {
          const gone = new Set(payload.ids as string[]);
          setMessages((prev) =>
            prev
              .filter((m) => !gone.has(m.id))
              .map((m) =>
                m.replyTo && gone.has(m.replyTo.id)
                  ? { ...m, replyTo: null, quoteText: null }
                  : m,
              ),
          );
          setPinnedMessageId((cur) => (cur && gone.has(cur) ? null : cur));
          setPinnedPreview((cur) => (cur && gone.has(cur.id) ? null : cur));
        }
        if (payload.type === "reads" && payload.reads?.length) {
          const readMap = new Map(
            (payload.reads as { id: string; readAt: string }[]).map((r) => [r.id, r.readAt]),
          );
          setMessages((prev) =>
            prev.map((m) => {
              const readAt = readMap.get(m.id);
              return readAt && !m.readAt ? { ...m, readAt } : m;
            }),
          );
        }
        if (payload.type === "reaction" && payload.messageId) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === payload.messageId
                ? { ...m, reactions: payload.reactions as AggregatedReaction[] }
                : m,
            ),
          );
        }
        if (payload.type === "pin") {
          const id = (payload.messageId as string | null) ?? null;
          setPinnedMessageId(id);
          if (!id) setPinnedPreview(null);
        }
        if (payload.type === "presence" && partner && payload.userId === partner.id) {
          setPartnerSeen(payload.lastSeenAt ?? null);
        }
        if (payload.type === "typing" && partner) {
          setPartnerTyping(Boolean(payload.active));
        }
      } catch {
        /* ignore */
      }
    };
    return () => {
      cancelled = true;
      es.close();
    };
  }, [partner]);

  useEffect(() => {
    function beat() {
      if (document.visibilityState !== "visible") return;
      void fetch("/api/chat/presence", { method: "POST" });
    }
    beat();
    const id = window.setInterval(beat, 25_000);
    document.addEventListener("visibilitychange", beat);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", beat);
    };
  }, []);

  // First reveal: settle scroll while log is opacity 0, then fade in.
  // stickersOpen must NOT be a dep here — opening stickers during settle
  // would cancel the rAF chain and leave the log stuck hidden.
  useEffect(() => {
    if (!chatReady || chatRevealed) return;

    let cancelled = false;
    stickToBottom.current = true;
    if (messages.length === 0) {
      setChatRevealed(true);
      return;
    }
    requestAnimationFrame(() => {
      if (cancelled) return;
      scrollLogToBottom();
      requestAnimationFrame(() => {
        if (cancelled) return;
        scrollLogToBottom();
        setChatRevealed(true);
      });
    });
    return () => {
      cancelled = true;
    };
  }, [chatReady, chatRevealed, messages.length]);

  // Only when message count changes — not on every reaction/read patch
  // (that was fighting long-press and making reaction layout thrash).
  useEffect(() => {
    if (!chatRevealed) return;
    const el = logRef.current;
    if (!el || messages.length === 0) return;
    if (stickToBottom.current || stickersPresence.mounted) {
      requestAnimationFrame(scrollLogToBottom);
    }
  }, [chatRevealed, messages.length, stickersPresence.mounted]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 112)}px`;
  }, [text]);

  useEffect(() => {
    if (!profileOpen) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") closeProfile();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // closeProfile reads latest avatarPreview via state closure on each render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileOpen, avatarPreview]);

  function clearPendingMedia() {
    setPendingMedia((prev) => {
      for (const item of prev) URL.revokeObjectURL(item.url);
      return [];
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function clearComposerExtras() {
    if (editingId) setText("");
    setReplyTo(null);
    setEditingId(null);
  }

  function classifyLocalFile(file: File): "image" | "video" | null {
    const type = (file.type || "").toLowerCase();
    if (type.startsWith("image/")) return "image";
    if (type.startsWith("video/")) return "video";
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) return "image";
    if (["mp4", "webm", "mov"].includes(ext)) return "video";
    return null;
  }

  function onPickMedia(files: FileList | null) {
    if (!files?.length) return;
    const candidates: { file: File; kind: "image" | "video" }[] = [];
    let rejectMsg = "";
    for (const file of Array.from(files)) {
      const kind = classifyLocalFile(file);
      if (!kind) {
        rejectMsg = "Только фото или видео";
        continue;
      }
      if (kind === "image" && file.size > CHAT_IMAGE_MAX_BYTES) {
        rejectMsg = "Фото максимум 5 МБ";
        continue;
      }
      if (kind === "video" && file.size > CHAT_VIDEO_MAX_BYTES) {
        rejectMsg = "Видео максимум 25 МБ";
        continue;
      }
      candidates.push({ file, kind });
    }

    if (!candidates.length) {
      setError(rejectMsg || "Только фото или видео");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const room = Math.max(0, CHAT_MEDIA_MAX_FILES - pendingMedia.length);
    if (candidates.length > room) {
      rejectMsg = `Максимум ${CHAT_MEDIA_MAX_FILES} файлов`;
    }
    const take = candidates.slice(0, room).map(({ file, kind }) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
      file,
      kind,
      url: URL.createObjectURL(file),
    }));

    if (!take.length) {
      setError(rejectMsg || `Максимум ${CHAT_MEDIA_MAX_FILES} файлов`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setPendingMedia((prev) => [...prev, ...take].slice(0, CHAT_MEDIA_MAX_FILES));
    setError(rejectMsg || null);
    setEditingId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removePending(id: string) {
    setPendingMedia((prev) => {
      const victim = prev.find((p) => p.id === id);
      if (victim) URL.revokeObjectURL(victim.url);
      return prev.filter((p) => p.id !== id);
    });
  }

  function scheduleTyping() {
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      void fetch("/api/chat/typing", { method: "POST" });
    }, 1000);
  }

  async function sendBody(body: string) {
    const trimmed = body.trim();
    if (!trimmed || sending) return;
    if (pendingMedia.length) {
      await sendMedia(trimmed);
      return;
    }
    setSending(true);
    setError(null);
    try {
      if (editingId) {
        const res = await fetch(`/api/messages/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: trimmed }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Не удалось изменить");
        if (json.message) {
          setMessages((prev) => mergeById(prev, [json.message as MessageDto]));
        }
        clearComposerExtras();
        return;
      }

      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: trimmed,
          replyToId: replyTo?.id,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Не удалось отправить");
      if (json.message) {
        stickToBottom.current = true;
        setMessages((prev) => mergeById(prev, [json.message as MessageDto]));
      }
      setText("");
      clearComposerExtras();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setSending(false);
      setStickersOpen(false);
    }
  }

  async function sendMedia(caption = text) {
    if (!pendingMedia.length || sending || editingId) return;
    setSending(true);
    setError(null);
    try {
      const fd = new FormData();
      for (const item of pendingMedia) fd.append("files", item.file);
      const cap = caption.trim();
      if (cap) fd.set("caption", cap);
      if (replyTo?.id) fd.set("replyToId", replyTo.id);
      const res = await fetch("/api/messages/media", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Не удалось отправить");
      if (json.message) {
        stickToBottom.current = true;
        setMessages((prev) => mergeById(prev, [json.message as MessageDto]));
      }
      setText("");
      clearPendingMedia();
      clearComposerExtras();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setSending(false);
      setStickersOpen(false);
    }
  }

  async function send(e: FormEvent) {
    e.preventDefault();
    if (pendingMedia.length) {
      await sendMedia(text);
      return;
    }
    await sendBody(text);
  }

  function onComposerKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (pendingMedia.length) void sendMedia(text);
      else void sendBody(text);
    }
    if (e.key === "Escape" && (editingId || replyTo || pendingMedia.length)) {
      clearComposerExtras();
      clearPendingMedia();
    }
  }

  function closeProfile() {
    setProfileOpen(false);
    setProfileError("");
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
      setAvatarPreview(null);
    }
  }

  async function saveProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setProfileError("");
    const fd = new FormData(e.currentTarget);
    fd.set("displayName", nameDraft.trim());
    const res = await fetch("/api/profile", { method: "PATCH", body: fd });
    const json = await res.json();
    if (!res.ok) {
      setProfileError(json.error || "Не удалось сохранить");
      return;
    }
    setProfile(json.user);
    closeProfile();
    try {
      await update({ name: json.user.displayName });
    } catch {
      /* optional */
    }
  }

  function playReactBurst(messageId: string, emoji: string) {
    const id = ++reactBurstId.current;
    if (reactBurstTimer.current) clearTimeout(reactBurstTimer.current);
    setReactBurst({ id, messageId, emoji });
    reactBurstTimer.current = setTimeout(() => {
      setReactBurst((cur) => (cur?.id === id ? null : cur));
      reactBurstTimer.current = null;
    }, REACT_BURST_MS);
  }

  useEffect(() => {
    return () => {
      if (reactBurstTimer.current) clearTimeout(reactBurstTimer.current);
    };
  }, []);

  useEffect(() => {
    return () => {
      setPendingMedia((prev) => {
        for (const item of prev) URL.revokeObjectURL(item.url);
        return [];
      });
    };
  }, []);

  useEffect(() => {
    if (!mediaViewer) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setMediaViewer(null);
      if (e.key === "ArrowRight") {
        setMediaViewer((cur) =>
          cur
            ? { ...cur, index: Math.min(cur.items.length - 1, cur.index + 1) }
            : cur,
        );
      }
      if (e.key === "ArrowLeft") {
        setMediaViewer((cur) =>
          cur ? { ...cur, index: Math.max(0, cur.index - 1) } : cur,
        );
      }
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [mediaViewer]);

  async function toggleReaction(messageId: string, emoji: string) {
    setMenu(null);
    window.getSelection()?.removeAllRanges();
    // Lock absorbs ghost click after pointerdown so we don't add+remove in one tap.
    if (reactingIds.current.has(messageId)) return;
    reactingIds.current.add(messageId);
    const prevMsg = messages.find((m) => m.id === messageId);
    const wasMine = Boolean(prevMsg?.reactions?.some((r) => r.emoji === emoji && r.me));
    try {
      const res = await fetch(`/api/messages/${messageId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Реакция не сохранилась");
        return;
      }
      const next = (json.reactions as AggregatedReaction[]) || [];
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, reactions: next } : m)),
      );
      const nowMine = next.some((r) => r.emoji === emoji && r.me);
      if (!wasMine && nowMine) playReactBurst(messageId, emoji);
      // No scroll on reaction — padding alone shifts layout; scroll was thrashing long-press.
    } catch {
      setError("Реакция не сохранилась");
    } finally {
      window.setTimeout(() => reactingIds.current.delete(messageId), 320);
    }
  }

  /** Instant press for pointer; keyboard still uses click (detail === 0). */
  function onReactionPress(
    e: { button: number; detail?: number; preventDefault: () => void; stopPropagation: () => void },
    messageId: string,
    emoji: string,
    source: "pointer" | "click",
  ) {
    if (source === "pointer" && e.button !== 0) return;
    // Ignore synthetic mouse click after pointerdown — keyboard clicks have detail 0.
    if (source === "click" && (e.detail ?? 0) !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    void toggleReaction(messageId, emoji);
  }

  async function setPin(messageId: string | null) {
    setMenu(null);
    const log = logRef.current;
    const keepScroll = log?.scrollTop ?? null;
    const res = await fetch("/api/chat/pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Не удалось закрепить");
      return;
    }
    const id = (json.messageId as string | null) ?? null;
    setPinnedMessageId(id);
    if (!id) {
      setPinnedPreview(null);
    } else {
      const m = messages.find((x) => x.id === id);
      if (m) {
        setPinnedPreview({
          id: m.id,
          body: replyPreviewText(m),
          authorName: m.author.displayName,
        });
      }
    }
    // Keep the thread from jumping when the compact pin strip appears/disappears.
    requestAnimationFrame(() => {
      if (log && keepScroll != null) log.scrollTop = keepScroll;
    });
  }

  async function runSearch(q: string) {
    setSearchQ(q);
    setSearchNote("");
    if (!q.trim()) {
      setSearchHits([]);
      return;
    }
    const res = await fetch(`/api/messages/search?q=${encodeURIComponent(q.trim())}`);
    const json = await res.json();
    setSearchHits(json.messages || []);
  }

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!menu) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.getSelection()?.removeAllRanges();
    const onKey = (e: Event) => {
      if ((e as globalThis.KeyboardEvent).key === "Escape") setMenu(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  useEffect(() => {
    if (!stickersOpen) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setStickersOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stickersOpen]);

  function openMessageMenu(messageId: string, mine: boolean) {
    lastTap.current = null;
    window.getSelection()?.removeAllRanges();
    try {
      navigator.vibrate?.(12);
    } catch {
      /* ignore */
    }
    setMenu(buildMenuState(messageId, mine));
  }

  function openReply(m: MessageDto) {
    setMenu(null);
    setEditingId(null);
    setReplyTo(m);
    window.getSelection()?.removeAllRanges();
    textareaRef.current?.focus();
  }

  function openEdit(m: MessageDto) {
    setMenu(null);
    setReplyTo(null);
    clearPendingMedia();
    setEditingId(m.id);
    setText(m.body);
    textareaRef.current?.focus();
  }

  async function deleteMessage(m: MessageDto) {
    setMenu(null);
    const res = await fetch(`/api/messages/${m.id}`, { method: "DELETE" });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error || "Не удалось удалить");
      return;
    }
    setMessages((prev) =>
      prev
        .filter((x) => x.id !== m.id)
        .map((x) =>
          x.replyTo?.id === m.id ? { ...x, replyTo: null, quoteText: null } : x,
        ),
    );
    setPinnedMessageId((cur) => (cur === m.id ? null : cur));
    setPinnedPreview((cur) => (cur?.id === m.id ? null : cur));
    if (editingId === m.id || replyTo?.id === m.id) clearComposerExtras();
  }

  function startPress(messageId: string, mine: boolean, clientX: number, clientY: number) {
    pressStart.current = { x: clientX, y: clientY };
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = setTimeout(() => {
      lastTap.current = null;
      openMessageMenu(messageId, mine);
      pressTimer.current = null;
    }, LONG_PRESS_MS);
  }

  function movePress(clientX: number, clientY: number) {
    if (!pressStart.current || !pressTimer.current) return;
    const dx = Math.abs(clientX - pressStart.current.x);
    const dy = Math.abs(clientY - pressStart.current.y);
    if (dx > 14 || dy > 14) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
      lastTap.current = null;
    }
  }

  function endPress(messageId: string) {
    // Short press only — long-press already opened the menu (timer cleared).
    const wasShortPress = Boolean(pressTimer.current);
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    pressStart.current = null;
    if (!wasShortPress) return;

    const now = Date.now();
    if (lastTap.current?.id === messageId && now - lastTap.current.at <= DOUBLE_TAP_MS) {
      lastTap.current = null;
      void ensureHeartReaction(messageId);
      return;
    }
    lastTap.current = { id: messageId, at: now };
  }

  /** Double-tap adds ❤️; if already yours, just replay the burst (don't remove). */
  async function ensureHeartReaction(messageId: string) {
    const prevMsg = messages.find((m) => m.id === messageId);
    if (prevMsg?.reactions?.some((r) => r.emoji === DOUBLE_TAP_REACTION && r.me)) {
      playReactBurst(messageId, DOUBLE_TAP_REACTION);
      return;
    }
    await toggleReaction(messageId, DOUBLE_TAP_REACTION);
  }

  const menuMessage = menu ? messages.find((m) => m.id === menu.messageId) : null;
  const mediaShown = mediaViewer ?? (mediaPresence.mounted ? mediaViewerShown : null);

  return (
    <div className={stickersPresence.mounted ? "chat-page is-stickers-open" : "chat-page"}>
      {partnerView ? (
        <header className="chat-header">
          <UserAvatar
            name={partnerView.displayName}
            src={partnerView.avatarPath}
            size="md"
            onClick={() => openMiniProfile(partnerView.id)}
          />
          <button
            type="button"
            className="chat-header__meta chat-header__meta-btn"
            onClick={() => openMiniProfile(partnerView.id)}
          >
            <strong>{partnerView.displayName}</strong>
            <span className="chat-header__status">{subtitle}</span>
          </button>
          <button
            type="button"
            className={searchOpen ? "chat-icon-btn is-active" : "chat-icon-btn"}
            aria-label="Поиск"
            onClick={() => {
              setSearchOpen((v) => !v);
              setStickersOpen(false);
              if (profileOpen) closeProfile();
            }}
          >
            <SearchIcon />
          </button>
          <button
            type="button"
            className={miniProfileOpen ? "chat-icon-btn is-active" : "chat-icon-btn"}
            aria-label="Ваш профиль"
            onClick={() => openMiniProfile(me)}
          >
            <ProfileIcon />
          </button>
        </header>
      ) : null}

      {pinnedBar ? (
        <div className="chat-pin-bar">
          <button
            type="button"
            className="chat-pin-bar__body"
            onClick={() => {
              if (!scrollToMessage(pinnedBar.id)) {
                setError("Закреплённое сообщение вне загруженной истории");
              }
            }}
          >
            <span className="chat-pin-bar__label">Закреплено</span>
            <span className="chat-pin-bar__text">{pinnedBar.body}</span>
          </button>
          <button type="button" className="chat-icon-btn" aria-label="Открепить" onClick={() => void setPin(null)}>
            <CloseIcon />
          </button>
        </div>
      ) : null}

      {searchOpen ? (
        <div className="chat-search">
          <input
            className="chat-search__input"
            value={searchQ}
            onChange={(e) => void runSearch(e.target.value)}
            placeholder="Поиск по сообщениям…"
            autoFocus
          />
          {searchNote ? <p className="meta">{searchNote}</p> : null}
          <div className="chat-search__hits">
            {searchHits.map((m) => (
              <button
                key={m.id}
                type="button"
                className="chat-search__hit"
                onClick={() => {
                  if (!scrollToMessage(m.id)) {
                    setSearchNote("Сообщение вне загруженной истории");
                  } else {
                    setSearchNote("");
                    setSearchOpen(false);
                  }
                }}
              >
                <span className="meta">{m.author.displayName}</span>
                <span>{m.body}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div
        className={[
          "chat-log",
          chatReady && !chatRevealed ? "chat-log--settling" : "",
          chatRevealed ? "chat-log--ready" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        ref={logRef}
        aria-busy={!chatRevealed}
        onClick={() => setMenu(null)}
        onScroll={() => {
          const el = logRef.current;
          if (!el) return;
          stickToBottom.current = isNearBottom(el);
        }}
      >
        {chatReady && messages.length === 0 ? (
          <p className="chat-empty">Напишите первое сообщение любимому человеку.</p>
        ) : null}
        {chatReady
          ? rows.map((row) => {
          if (row.kind === "day") {
            return (
              <div key={row.key} className="chat-day">
                <span>{row.label}</span>
              </div>
            );
          }
          const { message: m, mine, firstInGroup, lastInGroup } = row;
          const attachments = m.attachments ?? [];
          const sticker = isStickerBody(m.body, attachments);
          const hasMedia = attachments.length > 0;
          return (
            <div
              key={row.key}
              data-message-id={m.id}
              className={[
                "chat-row",
                mine ? "chat-row--mine" : "chat-row--theirs",
                firstInGroup ? "chat-row--first" : "",
                lastInGroup ? "chat-row--last" : "chat-row--grouped",
                highlightId === m.id ? "chat-row--flash" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {!mine ? (
                <div className="chat-row__avatar">
                  {lastInGroup ? (
                    <UserAvatar
                      name={m.author.displayName}
                      src={m.author.avatarPath}
                      size="sm"
                      onClick={() => openMiniProfile(m.author.id)}
                    />
                  ) : null}
                </div>
              ) : null}
              <div
                className={
                  m.reactions?.length ? "chat-bubble-wrap chat-bubble-wrap--reacted" : "chat-bubble-wrap"
                }
              >
                <div
                  className={[
                    "chat-bubble",
                    mine ? "chat-bubble--mine" : "chat-bubble--theirs",
                    lastInGroup ? "chat-bubble--tail" : "",
                    sticker ? "chat-bubble--sticker" : "",
                    m.replyTo ? "chat-bubble--with-quote" : "",
                    hasMedia ? "chat-bubble--media" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    openMessageMenu(m.id, mine);
                  }}
                  onDoubleClick={(e) => {
                    // Native dblclick selects text; we handle heart via pointer taps instead.
                    e.preventDefault();
                  }}
                  onPointerDown={(e) => {
                    if (e.pointerType === "mouse" && e.button !== 0) return;
                    startPress(m.id, mine, e.clientX, e.clientY);
                  }}
                  onPointerMove={(e) => movePress(e.clientX, e.clientY)}
                  onPointerUp={() => endPress(m.id)}
                  onPointerCancel={() => {
                    if (pressTimer.current) {
                      clearTimeout(pressTimer.current);
                      pressTimer.current = null;
                    }
                    pressStart.current = null;
                    lastTap.current = null;
                  }}
                >
                  {m.replyTo ? (
                    <button
                      type="button"
                      className="chat-quote"
                      onClick={(e) => {
                        e.stopPropagation();
                        scrollToMessage(m.replyTo!.id);
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <strong className="chat-quote__author">{m.replyTo.author.displayName}</strong>
                      <span className="chat-quote__text">{m.quoteText || m.replyTo.body}</span>
                    </button>
                  ) : null}
                  {hasMedia ? (
                    <div
                      className={[
                        "chat-media",
                        attachments.length === 1
                          ? "chat-media--1"
                          : attachments.length === 2
                            ? "chat-media--2"
                            : attachments.length === 3
                              ? "chat-media--3"
                              : "chat-media--many",
                      ].join(" ")}
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      {attachments.map((att, idx) => (
                        <button
                          key={att.id}
                          type="button"
                          className="chat-media__item"
                          onClick={() => setMediaViewer({ items: attachments, index: idx })}
                          aria-label={att.kind === "video" ? "Открыть видео" : "Открыть фото"}
                        >
                          {att.kind === "video" ? (
                            <>
                              <video
                                className="chat-media__thumb"
                                src={att.filePath}
                                muted
                                playsInline
                                preload="metadata"
                              />
                              <span className="chat-media__play" aria-hidden>
                                ▶
                              </span>
                            </>
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              className="chat-media__thumb"
                              src={att.filePath}
                              alt=""
                            />
                          )}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  <div className="chat-bubble__main">
                    {m.body.trim() || !hasMedia ? (
                      <span className={sticker ? "chat-bubble__sticker" : "chat-bubble__text"}>
                        {m.body}
                      </span>
                    ) : null}
                    <span className="chat-bubble__meta">
                      {m.editedAt ? <span className="chat-edited">изм.</span> : null}
                      <time dateTime={m.createdAt}>
                        {new Date(m.createdAt).toLocaleTimeString("ru-RU", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </time>
                      {mine ? (
                        <span
                          className={
                            m.readAt ? "chat-read-dot chat-read-dot--read" : "chat-read-dot"
                          }
                          aria-label={m.readAt ? "Прочитано" : "Не прочитано"}
                          title={m.readAt ? "Прочитано" : "Не прочитано"}
                        />
                      ) : null}
                    </span>
                  </div>
                </div>
                {reactBurst?.messageId === m.id ? (
                  <div
                    className={`chat-react-burst${mine ? " chat-react-burst--mine" : ""}`}
                    aria-hidden
                  >
                    {Array.from({ length: REACT_BURST_PARTICLES }, (_, i) => (
                      <span
                        key={`${reactBurst.id}-${i}`}
                        className="chat-react-burst__p"
                        style={{ ["--i" as string]: i }}
                      >
                        {reactBurst.emoji}
                      </span>
                    ))}
                    <span className="chat-react-burst__ring" />
                    <span className="chat-react-burst__spark" />
                    <span className="chat-react-burst__spark chat-react-burst__spark--2" />
                  </div>
                ) : null}
                {m.reactions?.length ? (
                  <div className={`chat-reactions ${mine ? "chat-reactions--mine" : ""}`}>
                    {m.reactions.map((r) => (
                      <button
                        key={r.emoji}
                        type="button"
                        className={[
                          "chat-reactions__btn",
                          r.me ? "is-me" : "",
                          reactBurst?.messageId === m.id &&
                          reactBurst.emoji === r.emoji &&
                          r.me
                            ? "is-pop"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onPointerDown={(e) => onReactionPress(e, m.id, r.emoji, "pointer")}
                        onClick={(e) => onReactionPress(e, m.id, r.emoji, "click")}
                      >
                        {r.emoji}
                        <span>{r.count}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })
          : null}
      </div>

      {portalReady && menu && menuMessage
        ? createPortal(
            <div
              className={`chat-focus${menu.mine ? " chat-focus--mine" : " chat-focus--theirs"}`}
              role="dialog"
              aria-modal="true"
              aria-label="Действия с сообщением"
            >
              <button
                type="button"
                className="chat-focus__backdrop"
                aria-label="Закрыть"
                onClick={() => setMenu(null)}
              />
              <div
                className="chat-focus__bubble"
                style={{
                  top: menu.top,
                  left: menu.left,
                  width: menu.width,
                  minHeight: menu.height,
                }}
              >
                <div
                  className={[
                    "chat-bubble",
                    menu.mine ? "chat-bubble--mine" : "chat-bubble--theirs",
                    isStickerBody(menuMessage.body, menuMessage.attachments)
                      ? "chat-bubble--sticker"
                      : "",
                    menuMessage.attachments?.length ? "chat-bubble--media" : "",
                    "chat-bubble--focus",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {menuMessage.attachments?.length ? (
                    <div
                      className={[
                        "chat-media",
                        menuMessage.attachments.length === 1
                          ? "chat-media--1"
                          : menuMessage.attachments.length === 2
                            ? "chat-media--2"
                            : menuMessage.attachments.length === 3
                              ? "chat-media--3"
                              : "chat-media--many",
                      ].join(" ")}
                    >
                      {menuMessage.attachments.map((att) => (
                        <div key={att.id} className="chat-media__item">
                          {att.kind === "video" ? (
                            <>
                              <video
                                className="chat-media__thumb"
                                src={att.filePath}
                                muted
                                playsInline
                                preload="metadata"
                              />
                              <span className="chat-media__play" aria-hidden>
                                ▶
                              </span>
                            </>
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img className="chat-media__thumb" src={att.filePath} alt="" />
                          )}
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <div className="chat-bubble__main">
                    {menuMessage.body.trim() || !menuMessage.attachments?.length ? (
                      <span
                        className={
                          isStickerBody(menuMessage.body, menuMessage.attachments)
                            ? "chat-bubble__sticker"
                            : "chat-bubble__text"
                        }
                      >
                        {menuMessage.body}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div
                className="chat-focus__reactions"
                style={{
                  top: Math.max(8, menu.top - FOCUS_REACTIONS_H - 8),
                  left: menu.mine ? undefined : menu.left,
                  right: menu.mine
                    ? Math.max(8, window.innerWidth - menu.left - menu.width)
                    : undefined,
                }}
              >
                {CHAT_REACTIONS.map((emoji, i) => (
                  <button
                    key={emoji}
                    type="button"
                    style={
                      {
                        ["--i" as string]: i,
                        ["--wiggle" as string]: `${i % 2 === 0 ? -6 : 6}deg`,
                      } as CSSProperties
                    }
                    onPointerDown={(e) =>
                      onReactionPress(e, menuMessage.id, emoji, "pointer")
                    }
                    onClick={(e) => onReactionPress(e, menuMessage.id, emoji, "click")}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              <div
                className="chat-focus__menu"
                style={{
                  ...(menu.menuAbove
                    ? {
                        /* Above reactions, which sit above the bubble */
                        top: Math.max(
                          8,
                          menu.top - FOCUS_REACTIONS_H - 16 - FOCUS_MENU_ESTIMATE,
                        ),
                      }
                    : { top: menu.top + menu.height + 8 }),
                  left: menu.mine ? undefined : menu.left,
                  right: menu.mine
                    ? Math.max(8, window.innerWidth - menu.left - menu.width)
                    : undefined,
                }}
              >
                <button type="button" onClick={() => openReply(menuMessage)}>
                  <ReplyIcon />
                  <span>Ответить</span>
                </button>
                {menuMessage.authorId === me &&
                (menuMessage.body.trim() || !(menuMessage.attachments?.length)) ? (
                  <button type="button" onClick={() => openEdit(menuMessage)}>
                    <EditIcon />
                    <span>Изменить</span>
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => void setPin(pinnedMessageId === menuMessage.id ? null : menuMessage.id)}
                >
                  <PinIcon />
                  <span>{pinnedMessageId === menuMessage.id ? "Открепить" : "Закрепить"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard?.writeText(replyPreviewText(menuMessage));
                    setMenu(null);
                  }}
                >
                  <CopyIcon />
                  <span>Копировать</span>
                </button>
                {menuMessage.authorId === me ? (
                  <button
                    type="button"
                    className="chat-focus__action--danger"
                    onClick={() => void deleteMessage(menuMessage)}
                  >
                    <TrashIcon />
                    <span>Удалить</span>
                  </button>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}

      {stickersPresence.mounted ? (
        <>
          <button
            type="button"
            className={
              stickersPresence.visible
                ? "chat-stickers__scrim is-open"
                : "chat-stickers__scrim"
            }
            aria-label="Закрыть стикеры"
            onClick={() => setStickersOpen(false)}
          />
          <div
            className={stickersPresence.visible ? "chat-stickers is-open" : "chat-stickers"}
            role="dialog"
            aria-label="Стикеры"
            aria-modal="true"
          >
            <div className="chat-stickers__handle" aria-hidden />
            <div className="chat-stickers__top">
              <h3 className="chat-stickers__title">Стикеры</h3>
              <button
                type="button"
                className="chat-icon-btn"
                aria-label="Закрыть"
                onClick={() => setStickersOpen(false)}
              >
                <CloseIcon />
              </button>
            </div>
            <div className="chat-stickers__grid">
              {CHAT_STICKERS.map((sticker) => (
                <button
                  key={sticker}
                  type="button"
                  className="chat-stickers__btn"
                  onClick={() => void sendBody(sticker)}
                >
                  {sticker}
                </button>
              ))}
            </div>
          </div>
        </>
      ) : null}

      {(replyTo || editingId) && (
        <div className="chat-composer-bar">
          <div className="chat-composer-bar__text">
            <strong>{editingId ? "Редактирование" : `Ответ · ${replyTo?.author.displayName}`}</strong>
            <span>
              {editingId ? text.slice(0, 80) : replyTo ? replyPreviewText(replyTo) : ""}
            </span>
          </div>
          <button
            type="button"
            className="chat-icon-btn"
            aria-label="Отмена"
            onClick={() => {
              clearComposerExtras();
            }}
          >
            <CloseIcon />
          </button>
        </div>
      )}

      {pendingMedia.length ? (
        <div className="chat-attach-preview" aria-label="Вложения">
          {pendingMedia.map((item) => (
            <div key={item.id} className="chat-attach-preview__item">
              {item.kind === "video" ? (
                <video src={item.url} muted playsInline preload="metadata" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.url} alt="" />
              )}
              <button
                type="button"
                className="chat-attach-preview__remove"
                aria-label="Убрать"
                onClick={() => removePending(item.id)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {error ? <p className="chat-error">{error}</p> : null}

      <form className="chat-composer" onSubmit={send}>
        <div className="chat-composer__field">
          <button
            type="button"
            className={
              stickersOpen ? "chat-composer__embed-btn is-active" : "chat-composer__embed-btn"
            }
            aria-label="Стикеры"
            aria-pressed={stickersOpen}
            onClick={() => {
              setStickersOpen((v) => !v);
              setSearchOpen(false);
              if (profileOpen) closeProfile();
            }}
          >
            <StickerIcon />
          </button>
          <button
            type="button"
            className="chat-composer__embed-btn"
            aria-label="Фото или видео"
            disabled={Boolean(editingId)}
            onClick={() => {
              setStickersOpen(false);
              fileInputRef.current?.click();
            }}
          >
            <AttachIcon />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="sr-only"
            onChange={(e) => onPickMedia(e.target.files)}
          />
          <textarea
            ref={textareaRef}
            className="chat-composer__input"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (e.target.value.trim()) scheduleTyping();
            }}
            onKeyDown={onComposerKey}
            placeholder={
              editingId
                ? "Изменить сообщение…"
                : pendingMedia.length
                  ? "Подпись (необязательно)"
                  : "Сообщение"
            }
            maxLength={4000}
            rows={1}
            enterKeyHint="send"
            autoComplete="off"
          />
        </div>
        <button
          type="submit"
          className="chat-send"
          disabled={sending || (!text.trim() && !pendingMedia.length)}
          aria-label="Отправить"
        >
          <SendIcon />
        </button>
      </form>

      {portalReady && mediaShown
        ? createPortal(
            <div
              className={
                mediaPresence.visible ? "chat-media-viewer is-open" : "chat-media-viewer"
              }
              role="dialog"
              aria-modal="true"
              aria-label="Просмотр медиа"
            >
              <button
                type="button"
                className="chat-media-viewer__backdrop"
                aria-label="Закрыть"
                onClick={() => setMediaViewer(null)}
              />
              <button
                type="button"
                className="chat-media-viewer__close"
                aria-label="Закрыть"
                onClick={() => setMediaViewer(null)}
              >
                ×
              </button>
              {mediaShown.items.length > 1 ? (
                <>
                  <button
                    type="button"
                    className="chat-media-viewer__nav chat-media-viewer__nav--prev"
                    aria-label="Назад"
                    disabled={mediaShown.index <= 0}
                    onClick={() =>
                      setMediaViewer((cur) =>
                        cur ? { ...cur, index: Math.max(0, cur.index - 1) } : cur,
                      )
                    }
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className="chat-media-viewer__nav chat-media-viewer__nav--next"
                    aria-label="Дальше"
                    disabled={mediaShown.index >= mediaShown.items.length - 1}
                    onClick={() =>
                      setMediaViewer((cur) =>
                        cur
                          ? {
                              ...cur,
                              index: Math.min(cur.items.length - 1, cur.index + 1),
                            }
                          : cur,
                      )
                    }
                  >
                    ›
                  </button>
                </>
              ) : null}
              {(() => {
                const att = mediaShown.items[mediaShown.index];
                if (!att) return null;
                if (att.kind === "video") {
                  return (
                    <video
                      key={att.id}
                      className="chat-media-viewer__media"
                      src={att.filePath}
                      controls
                      playsInline
                      autoPlay
                    />
                  );
                }
                return (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    className="chat-media-viewer__media"
                    src={att.filePath}
                    alt=""
                  />
                );
              })()}
              {mediaShown.items.length > 1 ? (
                <p className="chat-media-viewer__count">
                  {mediaShown.index + 1} / {mediaShown.items.length}
                </p>
              ) : null}
            </div>,
            document.body,
          )
        : null}

      {profilePresence.mounted ? (
        <div
          className={
            profilePresence.visible ? "chat-profile-overlay is-open" : "chat-profile-overlay"
          }
          role="dialog"
          aria-modal="true"
          aria-label="Ваш профиль"
        >
          <button
            type="button"
            className="chat-profile-overlay__backdrop"
            aria-label="Закрыть"
            onClick={closeProfile}
          />
          <div className="chat-profile-sheet">
            <div className="chat-profile-sheet__top">
              <div>
                <h2 className="chat-profile-sheet__title">Ваш профиль</h2>
                <p className="chat-profile-sheet__hint">Имя и фото, как вас видят в чате</p>
              </div>
              <button type="button" className="chat-icon-btn" onClick={closeProfile} aria-label="Закрыть">
                <CloseIcon />
              </button>
            </div>

            <form onSubmit={saveProfile} className="chat-profile-sheet__form">
              {profileError ? <p className="error-text">{profileError}</p> : null}

              <label className="chat-profile-sheet__avatar">
                <UserAvatar
                  name={nameDraft || profile?.displayName || "Вы"}
                  src={avatarPreview || profile?.avatarPath}
                  size="xl"
                />
                <span className="chat-profile-sheet__avatar-badge" aria-hidden>
                  Фото
                </span>
                <input
                  name="avatar"
                  type="file"
                  accept="image/*"
                  className="chat-profile-sheet__file"
                  aria-label="Загрузить фото"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
                    setAvatarPreview(file ? URL.createObjectURL(file) : null);
                  }}
                />
              </label>

              <div className="field">
                <label htmlFor="displayName">Имя в чате</label>
                <input
                  id="displayName"
                  name="displayName"
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  maxLength={40}
                  required
                  autoComplete="nickname"
                  placeholder="Как вас зовут"
                />
              </div>

              <button type="submit" className="chat-profile-sheet__save">
                Сохранить
              </button>
            </form>
          </div>
        </div>
      ) : null}

      <MiniProfile
        open={miniProfileOpen}
        focusUserId={miniFocusId}
        onClose={() => {
          setMiniProfileOpen(false);
          void (async () => {
            try {
              const res = await fetch("/api/couple");
              const json = await res.json();
              const members = json.membership?.couple?.members as
                | {
                    userId: string;
                    user: {
                      id: string;
                      displayName: string;
                      avatarPath: string | null;
                    };
                  }[]
                | undefined;
              if (!members || !me) return;
              const mine = members.find((m) => m.userId === me)?.user;
              const theirs = members.find((m) => m.userId !== me)?.user;
              if (mine) {
                setProfile({
                  id: mine.id,
                  displayName: mine.displayName,
                  avatarPath: mine.avatarPath,
                });
                setNameDraft(mine.displayName);
              }
              if (theirs) {
                setPartnerLive({
                  displayName: theirs.displayName,
                  avatarPath: theirs.avatarPath,
                });
              }
            } catch {
              /* ignore */
            }
          })();
        }}
        onProfileUpdated={(user) => {
          setProfile(user);
          setNameDraft(user.displayName);
          setMessages((prev) =>
            prev.map((m) =>
              m.author.id === user.id
                ? {
                    ...m,
                    author: {
                      ...m.author,
                      displayName: user.displayName,
                      avatarPath: user.avatarPath,
                    },
                  }
                : m,
            ),
          );
        }}
      />
    </div>
  );
}
