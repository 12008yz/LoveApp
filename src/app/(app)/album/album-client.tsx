"use client";

import { FormEvent, useEffect, useState } from "react";
import { ListSkeleton, listEnterStyle } from "@/components/list-motion";

type Author = { id: string; displayName: string };

type Comment = {
  id: string;
  body: string;
  createdAt: string;
  authorId: string;
  author: Author;
};

type Item = {
  id: string;
  caption: string | null;
  filePath: string;
  createdAt: string;
  author: Author;
  comments: Comment[];
  commentCount: number;
};

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AlbumClient({ meId }: { meId: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busyComment, setBusyComment] = useState<string | null>(null);

  function normalizeItem(raw: Partial<Item> & { id: string }): Item {
    const comments = Array.isArray(raw.comments) ? raw.comments : [];
    return {
      id: raw.id,
      caption: raw.caption ?? null,
      filePath: String(raw.filePath || ""),
      createdAt: String(raw.createdAt || new Date().toISOString()),
      author: raw.author || { id: "", displayName: "?" },
      comments,
      commentCount:
        typeof raw.commentCount === "number" ? raw.commentCount : comments.length,
    };
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const mediaRes = await fetch("/api/media");
        const media = await mediaRes.json();
        if (cancelled) return;
        const list = Array.isArray(media.items) ? media.items : [];
        setItems(list.map(normalizeItem));
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setUploading(true);
    const form = e.currentTarget;
    const fd = new FormData(form);
    try {
      const res = await fetch("/api/media", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Ошибка загрузки");
        return;
      }
      form.reset();
      if (preview) URL.revokeObjectURL(preview);
      setPreview(null);
      setItems((prev) => [normalizeItem(json.item), ...prev]);
    } finally {
      setUploading(false);
    }
  }

  async function sendComment(itemId: string) {
    const body = (drafts[itemId] || "").trim();
    if (!body || busyComment) return;
    setError("");
    setBusyComment(itemId);
    try {
      const res = await fetch(`/api/media/${itemId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Не удалось отправить");
        return;
      }
      const comment = json.comment as Comment;
      setDrafts((prev) => ({ ...prev, [itemId]: "" }));
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                comments: [...item.comments, comment],
                commentCount: item.commentCount + 1,
              }
            : item,
        ),
      );
      setExpanded((prev) => ({ ...prev, [itemId]: true }));
    } finally {
      setBusyComment(null);
    }
  }

  async function deleteComment(itemId: string, commentId: string) {
    setError("");
    const res = await fetch(`/api/media/${itemId}/comments/${commentId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error || "Не удалось удалить");
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              comments: item.comments.filter((c) => c.id !== commentId),
              commentCount: Math.max(0, item.commentCount - 1),
            }
          : item,
      ),
    );
  }

  return (
    <div className="album">
      {error ? <p className="error-text">{error}</p> : null}
      <form className="album-upload" onSubmit={onSubmit}>
        <div className="album-upload__row">
          <label className="album-upload__pick" htmlFor="file">
            {preview ? "Другое фото" : "Добавить фото"}
          </label>
          <input
            id="file"
            name="file"
            type="file"
            accept="image/*"
            required
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (preview) URL.revokeObjectURL(preview);
              if (!file) {
                setPreview(null);
                return;
              }
              setPreview(URL.createObjectURL(file));
            }}
          />
        </div>
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="album-upload__preview" src={preview} alt="" />
        ) : null}
        <div className="field">
          <label htmlFor="caption" className="sr-only">
            Подпись
          </label>
          <textarea
            id="caption"
            name="caption"
            required
            maxLength={300}
            placeholder="Подпись к моменту…"
            rows={2}
          />
        </div>
        <button className="btn btn-primary" type="submit" disabled={uploading}>
          {uploading ? "Загрузка…" : "В ленту"}
        </button>
      </form>

      <div className="album-feed">
        {!ready ? <ListSkeleton rows={2} tall /> : null}
        {ready && items.length === 0 ? (
          <p className="muted">Лента пуста — добавьте первое совместное фото.</p>
        ) : null}
        {ready
          ? items.map((item, i) => {
              const open = Boolean(expanded[item.id]);
              const last = item.comments[item.comments.length - 1];
              const visible = open ? item.comments : last ? [last] : [];
              return (
                <article
                  key={item.id}
                  className="album-post list-enter"
                  style={listEnterStyle(i)}
                >
                  <header className="album-post__head">
                    <span className="album-post__author">{item.author.displayName}</span>
                    <span className="album-post__meta">{formatWhen(item.createdAt)}</span>
                  </header>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className="album-post__shot"
                    src={item.filePath}
                    alt={item.caption || "Фото"}
                  />
                  <div className="album-post__body">
                    {item.caption ? (
                      <p className="album-post__caption">
                        <strong>{item.author.displayName}</strong> {item.caption}
                      </p>
                    ) : null}

                    {item.commentCount > 1 && !open ? (
                      <button
                        type="button"
                        className="album-post__more"
                        onClick={() =>
                          setExpanded((prev) => ({ ...prev, [item.id]: true }))
                        }
                      >
                        Посмотреть все комментарии ({item.commentCount})
                      </button>
                    ) : null}

                    {open && item.commentCount > 1 ? (
                      <button
                        type="button"
                        className="album-post__more"
                        onClick={() =>
                          setExpanded((prev) => ({ ...prev, [item.id]: false }))
                        }
                      >
                        Свернуть
                      </button>
                    ) : null}

                    <ul className="album-comments">
                      {visible.map((c) => (
                        <li key={c.id} className="album-comments__item">
                          <p>
                            <strong>{c.author.displayName}</strong> {c.body}
                          </p>
                          {c.authorId === meId || c.author.id === meId ? (
                            <button
                              type="button"
                              className="album-comments__del"
                              aria-label="Удалить комментарий"
                              onClick={() => void deleteComment(item.id, c.id)}
                            >
                              ×
                            </button>
                          ) : null}
                        </li>
                      ))}
                    </ul>

                    <div className="album-comment-form">
                      <input
                        type="text"
                        maxLength={500}
                        placeholder="Написать комментарий…"
                        value={drafts[item.id] || ""}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [item.id]: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void sendComment(item.id);
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-primary album-comment-form__send"
                        disabled={
                          busyComment === item.id || !(drafts[item.id] || "").trim()
                        }
                        onClick={() => void sendComment(item.id)}
                      >
                        →
                      </button>
                    </div>
                  </div>
                </article>
              );
            })
          : null}
      </div>
    </div>
  );
}
