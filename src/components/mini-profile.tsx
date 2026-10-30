"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { UserAvatar } from "@/components/user-avatar";

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

function streakLabel(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return "дней вместе";
  if (mod10 === 1) return "день вместе";
  if (mod10 >= 2 && mod10 <= 4) return "дня вместе";
  return "дней вместе";
}

function CredsBlock({
  person,
  roleLabel,
  sectionTitle,
  showPassword,
}: {
  person: Person;
  roleLabel: string;
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
        <div className="mini-profile__field">
          <span className="mini-profile__label">Роль</span>
          <span className="mini-profile__value">{roleLabel}</span>
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
  const [flameBusy, setFlameBusy] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [passwordDraft, setPasswordDraft] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState(false);
  const [editing, setEditing] = useState(false);

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
    void load();
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        if (editing) setEditing(false);
        else onClose();
      }
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, editing]);

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  if (!open || !portalReady) return null;

  const me = data?.me;
  const partner = data?.partner;
  const showPartnerFirst = Boolean(
    focusUserId && partner && focusUserId === partner.id,
  );
  const primary = showPartnerFirst ? partner : me;
  const secondary = showPartnerFirst ? me : partner;
  const flames = data?.flames;
  const primaryIsMe = Boolean(me && primary && primary.id === me.id);

  async function onSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!me) return;
    setBusy(true);
    setError("");
    try {
      const fd = new FormData(e.currentTarget);
      fd.set("displayName", nameDraft.trim());
      if (passwordDraft.trim()) fd.set("password", passwordDraft.trim());
      const res = await fetch("/api/profile", { method: "PATCH", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Не удалось сохранить");
      setPasswordDraft("");
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
        setAvatarPreview(null);
      }
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
    setError("");
    try {
      const res = await fetch("/api/flames/checkin", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Не удалось");
      setData((prev) => (prev ? { ...prev, flames: json.flames } : prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setFlameBusy(false);
    }
  }

  return createPortal(
    <div className="mini-profile" role="dialog" aria-modal="true" aria-label="Личный профиль">
      <button type="button" className="mini-profile__backdrop" aria-label="Закрыть" onClick={onClose} />
      <div className="mini-profile__sheet">
        <div className="mini-profile__top">
          <button type="button" className="mini-profile__back" aria-label="Назад" onClick={onClose}>
            ←
          </button>
          <h2 className="mini-profile__title">Личный профиль</h2>
          {me ? (
            <button
              type="button"
              className="mini-profile__edit-btn"
              aria-label={editing ? "Закрыть редактирование" : "Изменить мой профиль"}
              onClick={() => setEditing((v) => !v)}
            >
              {editing ? "×" : "✎"}
            </button>
          ) : null}
        </div>

        {error ? <p className="error-text">{error}</p> : null}

        {primary ? (
          <section className="mini-profile__identity">
            <UserAvatar name={primary.displayName} src={primary.avatarPath} size="xl" />
            <div className="mini-profile__identity-text">
              <h3>{primary.displayName}</h3>
              <p>{primaryIsMe ? "Это вы" : "Партнёр"}</p>
            </div>
          </section>
        ) : (
          <p className="muted">Загрузка…</p>
        )}

        {flames ? (
          <section className="mini-profile__flames">
            <div className="mini-profile__flame-main">
              <span className="mini-profile__flame-emoji" aria-hidden>
                🔥
              </span>
              <div>
                <p className="mini-profile__flame-count">{flames.streak}</p>
                <p className="mini-profile__flame-label">{streakLabel(flames.streak)}</p>
              </div>
            </div>
            <p className="mini-profile__flame-status">
              {flames.sharedToday
                ? "Сегодня оба зажгли — день засчитан"
                : flames.meChecked
                  ? "Ты уже зажёг(ла). Ждём партнёра"
                  : flames.partnerChecked
                    ? "Партнёр уже зажёг(ла). Твой ход"
                    : "Раз в день оба жмёте огонёк — день в серии"}
            </p>
            <div className="mini-profile__flame-sides">
              <span className={flames.meChecked ? "is-on" : ""}>
                Вы {flames.meChecked ? "✓" : "·"}
              </span>
              <span className={flames.partnerChecked ? "is-on" : ""}>
                Партнёр {flames.partnerChecked ? "✓" : "·"}
              </span>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              disabled={flameBusy || flames.meChecked}
              onClick={() => void checkInFlame()}
            >
              {flames.meChecked ? "Огонёк на сегодня есть" : flameBusy ? "…" : "Зажечь огонёк"}
            </button>
          </section>
        ) : null}

        {editing && me ? (
          <form className="mini-profile__edit" onSubmit={onSave}>
            <p className="mini-profile__section-title">Редактирование</p>
            <label className="chat-profile-sheet__avatar">
              <UserAvatar
                name={nameDraft || me.displayName}
                src={avatarPreview || me.avatarPath}
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
                roleLabel={primaryIsMe ? "Вы" : "Партнёр"}
                sectionTitle={primaryIsMe ? "Ваши данные" : "Данные партнёра"}
                showPassword={showPasswords}
              />
            ) : null}

            {secondary ? (
              <CredsBlock
                person={secondary}
                roleLabel={me && secondary.id === me.id ? "Вы" : "Партнёр"}
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
    </div>,
    document.body,
  );
}
