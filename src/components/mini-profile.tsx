"use client";

import { FormEvent, useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { UserAvatar } from "@/components/user-avatar";
import { usePresence } from "@/hooks/use-presence";

type Person = {
  id: string;
  displayName: string;
  email: string;
  avatarPath: string | null;
  password: string | null;
};

type Flames = {
  today: string;
  streak: number;
  meChecked: boolean;
  partnerChecked: boolean;
  sharedToday: boolean;
};

type Payload = {
  me: Person | null;
  partner: Person | null;
  flames: Flames;
};

type FlameTone = "dim" | "lit" | "shared";

function streakLabel(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return "дней вместе";
  if (mod10 === 1) return "день вместе";
  if (mod10 >= 2 && mod10 <= 4) return "дня вместе";
  return "дней вместе";
}

function FlameIcon({ className }: { className?: string }) {
  const uid = useId().replace(/:/g, "");
  const coreId = `flame-core-${uid}`;
  const innerId = `flame-inner-${uid}`;
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      width="1em"
      height="1em"
      aria-hidden
      focusable="false"
    >
      <defs>
        <linearGradient id={coreId} x1="32" y1="8" x2="32" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="var(--flame-tip)" />
          <stop offset="45%" stopColor="var(--flame-mid)" />
          <stop offset="100%" stopColor="var(--flame-base)" />
        </linearGradient>
        <linearGradient id={innerId} x1="32" y1="28" x2="32" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="var(--flame-inner-tip)" />
          <stop offset="100%" stopColor="var(--flame-inner-base)" />
        </linearGradient>
      </defs>
      <path
        className="flame-icon__outer"
        d="M32 4c2.2 7.4-2.1 12.2-6.8 17.4C19.4 28.1 12 35.8 12 45.2 12 54.4 20.2 60 32 60s20-5.6 20-14.8c0-7.8-5.2-14.2-10.4-20.2C36.8 19.2 33.6 13.8 32 4Z"
        fill={`url(#${coreId})`}
      />
      <path
        className="flame-icon__inner"
        d="M32 28c1.2 4.2-1 7-3.6 9.8-3.1 3.3-6.9 7.1-6.9 12.1C21.5 55.2 26 58 32 58s10.5-2.8 10.5-8.1c0-4.2-2.9-7.6-5.8-10.8C34.2 36.2 32.6 33.4 32 28Z"
        fill={`url(#${innerId})`}
      />
    </svg>
  );
}

function BackChevron() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden focusable="false">
      <path
        d="M14.5 5.5 8 12l6.5 6.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden focusable="false">
      <path
        d="M4.5 16.5 15.2 5.8a1.8 1.8 0 0 1 2.5 0l.5.5a1.8 1.8 0 0 1 0 2.5L7.5 19.5 4 20.5l.5-3.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.2 7.8 16.2 10.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden focusable="false">
      <path
        d="M7 7l10 10M17 7 7 17"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CredsBlock({
  person,
  sectionTitle,
  showPassword,
}: {
  person: Person;
  sectionTitle: string;
  showPassword: boolean;
}) {
  return (
    <>
      <p className="mini-profile__section-title">{sectionTitle}</p>
      <section className="mini-profile__data">
        <div className="mini-profile__field">
          <span className="mini-profile__label">Имя</span>
          <span className="mini-profile__value">{person.displayName}</span>
        </div>
      </section>

      <p className="mini-profile__section-title">Доступ</p>
      <div className="mini-profile__contacts">
        <div className="mini-profile__contact">
          <span className="mini-profile__contact-icon" aria-hidden>
            @
          </span>
          <div className="mini-profile__contact-body">
            <span className="mini-profile__label">E-mail / логин</span>
            <span className="mini-profile__value">{person.email}</span>
          </div>
          <span className="mini-profile__badge">Ок</span>
        </div>
        <div className="mini-profile__contact">
          <span className="mini-profile__contact-icon" aria-hidden>
            ∗
          </span>
          <div className="mini-profile__contact-body">
            <span className="mini-profile__label">Пароль</span>
            <span className="mini-profile__value mini-profile__value--mono">
              {person.password ? (
                showPassword ? person.password : "••••••••"
              ) : (
                <span className="muted">Нужен повторный вход</span>
              )}
            </span>
          </div>
          <span className={`mini-profile__badge${person.password ? "" : " is-warn"}`}>
            {person.password ? "Ок" : "—"}
          </span>
        </div>
      </div>
    </>
  );
}

export function MiniProfile({
  open,
  onClose,
  focusUserId,
  onProfileUpdated,
}: {
  open: boolean;
  onClose: () => void;
  /** Prefer showing this member first (self or partner). */
  focusUserId?: string | null;
  onProfileUpdated?: (user: { id: string; displayName: string; avatarPath: string | null }) => void;
}) {
  const [portalReady, setPortalReady] = useState(false);
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [flameBusy, setFlameBusy] = useState(false);
  const [igniting, setIgniting] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [passwordDraft, setPasswordDraft] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState(false);
  const [editing, setEditing] = useState(false);
  const [photoViewer, setPhotoViewer] = useState<{ src: string; name: string } | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const igniteTimerRef = useRef<number | null>(null);
  const presence = usePresence(open && portalReady);
  const photoPresence = usePresence(Boolean(photoViewer));

  const load = useCallback(async () => {
    const res = await fetch("/api/mini-profile");
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Не удалось загрузить профиль");
      return;
    }
    setData(json as Payload);
    if (json.me?.displayName) setNameDraft(json.me.displayName);
  }, []);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setError("");
    setPasswordDraft("");
    setShowPasswords(false);
    setEditing(false);
    setIgniting(false);
    setAvatarBusy(false);
    setPhotoViewer(null);
    setAvatarPreview(null);
    if (igniteTimerRef.current != null) {
      window.clearTimeout(igniteTimerRef.current);
      igniteTimerRef.current = null;
    }
    void load();
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (photoViewer) {
        setPhotoViewer(null);
        return;
      }
      if (editing) setEditing(false);
      else onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, editing, photoViewer]);

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  useEffect(() => {
    return () => {
      if (igniteTimerRef.current != null) {
        window.clearTimeout(igniteTimerRef.current);
        igniteTimerRef.current = null;
      }
    };
  }, []);

  if (!presence.mounted) return null;

  const me = data?.me;
  const partner = data?.partner;
  const showPartnerFirst = Boolean(
    focusUserId && partner && focusUserId === partner.id,
  );
  const primary = showPartnerFirst ? partner : me;
  const secondary = showPartnerFirst ? me : partner;
  const flames = data?.flames;
  const primaryIsMe = Boolean(me && primary && primary.id === me.id);

  const mainTone: FlameTone = flames?.sharedToday
    ? "shared"
    : flames?.meChecked
      ? "lit"
      : "dim";

  async function onSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!me) return;
    setBusy(true);
    setError("");
    try {
      const fd = new FormData();
      fd.set("displayName", nameDraft.trim());
      if (passwordDraft.trim()) fd.set("password", passwordDraft.trim());
      const res = await fetch("/api/profile", { method: "PATCH", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Не удалось сохранить");
      setPasswordDraft("");
      onProfileUpdated?.(json.user);
      setEditing(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  async function checkInFlame() {
    if (flameBusy || flames?.meChecked) return;
    setFlameBusy(true);
    setIgniting(true);
    setError("");
    try {
      const res = await fetch("/api/flames/checkin", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Не удалось");
      setData((prev) => (prev ? { ...prev, flames: json.flames } : prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
      setIgniting(false);
    } finally {
      setFlameBusy(false);
      if (igniteTimerRef.current != null) window.clearTimeout(igniteTimerRef.current);
      igniteTimerRef.current = window.setTimeout(() => {
        setIgniting(false);
        igniteTimerRef.current = null;
      }, 700);
    }
  }

  async function uploadAvatarFile(file: File) {
    if (!me) return;
    setAvatarBusy(true);
    setError("");
    const localUrl = URL.createObjectURL(file);
    setAvatarPreview(localUrl);
    try {
      const fd = new FormData();
      fd.set("avatar", file);
      const res = await fetch("/api/profile", { method: "PATCH", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Не удалось обновить фото");
      onProfileUpdated?.(json.user);
      setData((prev) =>
        prev?.me
          ? {
              ...prev,
              me: {
                ...prev.me,
                avatarPath: json.user.avatarPath,
                displayName: json.user.displayName ?? prev.me.displayName,
              },
            }
          : prev,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setAvatarPreview(null);
      setAvatarBusy(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  }

  function onPrimaryAvatarClick() {
    if (!primary || avatarBusy) return;
    if (primaryIsMe) {
      avatarInputRef.current?.click();
      return;
    }
    if (primary.avatarPath) {
      setPhotoViewer({ src: primary.avatarPath, name: primary.displayName });
    }
  }

  const canClickPrimaryAvatar = primaryIsMe || Boolean(primary?.avatarPath);

  const primaryAvatarSrc =
    primaryIsMe && avatarPreview ? avatarPreview : primary?.avatarPath ?? null;

  return createPortal(
    <>
    <div
      className={presence.visible ? "mini-profile is-open" : "mini-profile"}
      role="dialog"
      aria-modal="true"
      aria-label="Личный профиль"
    >
      <button type="button" className="mini-profile__backdrop" aria-label="Закрыть" onClick={onClose} />
      <div className="mini-profile__sheet">
        <div className="mini-profile__top">
          <button type="button" className="mini-profile__back" aria-label="Назад" onClick={onClose}>
            <BackChevron />
          </button>
          <h2 className="mini-profile__title">Личный профиль</h2>
          {me ? (
            <button
              type="button"
              className="mini-profile__edit-btn"
              aria-label={editing ? "Закрыть редактирование" : "Изменить мой профиль"}
              onClick={() => setEditing((v) => !v)}
            >
              {editing ? <CloseIcon /> : <EditIcon />}
            </button>
          ) : null}
        </div>

        {error ? <p className="error-text">{error}</p> : null}

        <input
          ref={avatarInputRef}
          type="file"
          accept="image/*"
          className="mini-profile__file-input"
          aria-hidden
          tabIndex={-1}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void uploadAvatarFile(file);
          }}
        />

        {primary ? (
          <section className="mini-profile__identity">
            <div className="mini-profile__avatar-wrap">
              <UserAvatar
                name={primary.displayName}
                src={primaryAvatarSrc}
                size="xl"
                onClick={canClickPrimaryAvatar ? onPrimaryAvatarClick : undefined}
                ariaLabel={
                  primaryIsMe
                    ? "Заменить фото профиля"
                    : `Открыть фото: ${primary.displayName}`
                }
              />
              {primaryIsMe ? (
                <span className={`mini-profile__avatar-hint${avatarBusy ? " is-busy" : ""}`} aria-hidden>
                  {avatarBusy ? "…" : "✎"}
                </span>
              ) : primary.avatarPath ? (
                <span className="mini-profile__avatar-hint mini-profile__avatar-hint--view" aria-hidden>
                  ↗
                </span>
              ) : null}
            </div>
            <div className="mini-profile__identity-text">
              <h3>{primary.displayName}</h3>
              <p>
                {avatarBusy && primaryIsMe
                  ? "Сохраняем фото…"
                  : primaryIsMe
                    ? "Это вы"
                    : "Партнёр"}
              </p>
            </div>
          </section>
        ) : (
          <p className="muted">Загрузка…</p>
        )}

        {flames ? (
          <section className="mini-profile__flames">
            <div className="mini-profile__flame-head">
              <div>
                <p className="mini-profile__flame-count">{flames.streak}</p>
                <p className="mini-profile__flame-label">{streakLabel(flames.streak)}</p>
              </div>
              <p className="mini-profile__flame-status">
                {flames.sharedToday
                  ? "Сегодня оба зажгли — день засчитан"
                  : flames.meChecked
                    ? "Ты уже зажёг(ла). Ждём партнёра"
                    : flames.partnerChecked
                      ? "Партнёр уже зажёг(ла). Твой ход"
                      : "Нажми огонёк — раз в день оба зажигаете серию"}
              </p>
            </div>

            <button
              type="button"
              className={[
                "mini-profile__flame-btn",
                `is-${mainTone}`,
                igniting ? "is-igniting" : "",
                flames.meChecked ? "is-done" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              disabled={flameBusy || flames.meChecked}
              aria-label={
                flames.meChecked
                  ? "Огонёк на сегодня уже зажжён"
                  : flameBusy
                    ? "Зажигаем…"
                    : "Зажечь огонёк"
              }
              onClick={() => void checkInFlame()}
            >
              <FlameIcon className="mini-profile__flame-svg mini-profile__flame-svg--main" />
              <span className="mini-profile__flame-btn-hint">
                {flames.meChecked
                  ? flames.sharedToday
                    ? "Горит вместе"
                    : "Зажжено"
                  : flameBusy
                    ? "…"
                    : "Зажечь"}
              </span>
            </button>

            <div className="mini-profile__flame-sides" aria-label="Статус огоньков пары">
              <div className={`mini-profile__flame-side${flames.meChecked ? " is-on" : ""}`}>
                <FlameIcon className="mini-profile__flame-svg mini-profile__flame-svg--side" />
                <span>Вы</span>
              </div>
              <div className={`mini-profile__flame-side${flames.partnerChecked ? " is-on" : ""}`}>
                <FlameIcon className="mini-profile__flame-svg mini-profile__flame-svg--side" />
                <span>Партнёр</span>
              </div>
            </div>
          </section>
        ) : null}

        {editing && me ? (
          <form className="mini-profile__edit" onSubmit={onSave}>
            <p className="mini-profile__section-title">Редактирование</p>
            <p className="mini-profile__edit-hint muted">
              {primaryIsMe
                ? "Фото меняется по нажатию на аватар сверху"
                : "Своё фото можно сменить в своём профиле (аватар сверху — партнёр)"}
            </p>
            <div className="field">
              <label htmlFor="mini-name">Имя</label>
              <input
                id="mini-name"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                maxLength={40}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="mini-pass">Новый пароль (необязательно)</label>
              <input
                id="mini-pass"
                type="password"
                value={passwordDraft}
                onChange={(e) => setPasswordDraft(e.target.value)}
                minLength={6}
                autoComplete="new-password"
                placeholder="Минимум 6 символов"
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? "Сохраняем…" : "Сохранить"}
            </button>
          </form>
        ) : (
          <>
            {primary ? (
              <CredsBlock
                person={primary}
                sectionTitle={primaryIsMe ? "Ваши данные" : "Данные партнёра"}
                showPassword={showPasswords}
              />
            ) : null}

            {secondary ? (
              <CredsBlock
                person={secondary}
                sectionTitle={
                  me && secondary.id === me.id ? "Ваши данные" : "Данные партнёра"
                }
                showPassword={showPasswords}
              />
            ) : null}

            <button
              type="button"
              className="mini-profile__toggle-pass"
              onClick={() => setShowPasswords((v) => !v)}
            >
              {showPasswords ? "Скрыть пароли" : "Показать пароли"}
            </button>
          </>
        )}
      </div>
    </div>

    {photoPresence.mounted && photoViewer ? (
      <div
        className={photoPresence.visible ? "mini-profile-photo is-open" : "mini-profile-photo"}
        role="dialog"
        aria-modal="true"
        aria-label={`Фото: ${photoViewer.name}`}
      >
        <button
          type="button"
          className="mini-profile-photo__backdrop"
          aria-label="Закрыть фото"
          onClick={() => setPhotoViewer(null)}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="mini-profile-photo__img" src={photoViewer.src} alt={photoViewer.name} />
        <button
          type="button"
          className="mini-profile-photo__close"
          aria-label="Закрыть"
          onClick={() => setPhotoViewer(null)}
        >
          <CloseIcon />
        </button>
      </div>
    ) : null}
    </>,
    document.body,
  );
}
