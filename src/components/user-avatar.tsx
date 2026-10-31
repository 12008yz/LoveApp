"use client";

type Size = "sm" | "md" | "lg" | "xl";

export function UserAvatar({
  name,
  src,
  size = "md",
  className = "",
  onClick,
  ariaLabel,
}: {
  name: string;
  src?: string | null;
  size?: Size;
  className?: string;
  onClick?: () => void;
  ariaLabel?: string;
}) {
  const cls = ["chat-avatar", `chat-avatar--${size}`, className].filter(Boolean).join(" ");
  const inner = src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img className={cls} src={src} alt="" />
  ) : (
    <span className={`${cls} chat-avatar--fallback`} aria-hidden>
      {(name || "?").slice(0, 1).toUpperCase()}
    </span>
  );

  if (!onClick) return inner;

  return (
    <button
      type="button"
      className="user-avatar-btn"
      onClick={onClick}
      aria-label={ariaLabel || `Профиль: ${name}`}
    >
      {inner}
    </button>
  );
}
