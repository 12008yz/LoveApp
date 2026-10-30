"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { MORE_NAV, PRIMARY_NAV } from "@/lib/constants";
import { NavIcon } from "@/components/nav-icons";

export function AppShell({
  children,
  coupleLabel,
}: {
  children: React.ReactNode;
  coupleLabel: string;
}) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const [letterUnread, setLetterUnread] = useState(0);

  const moreActive = MORE_NAV.some(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;
    async function loadUnread() {
      try {
        const res = await fetch("/api/letters");
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) setLetterUnread(Number(json.unreadCount) || 0);
      } catch {
        /* ignore */
      }
    }
    void loadUnread();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoreOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moreOpen]);

  const showTopbar = pathname === "/home";

  return (
    <div className={showTopbar ? "app-shell" : "app-shell app-shell--no-topbar"}>
      {showTopbar ? (
        <header className="app-topbar">
          <div>
            <p className="brand-mark">{coupleLabel}</p>
            <p className="couple-label">Ваш домик</p>
          </div>
        </header>
      ) : null}

      <main className="app-main">{children}</main>

      <nav className="bottom-nav" aria-label="Основное меню">
        {PRIMARY_NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              scroll={false}
              className={active ? "bottom-nav__item is-active" : "bottom-nav__item"}
            >
              <NavIcon name={item.icon} />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          className={moreActive || moreOpen ? "bottom-nav__item is-active" : "bottom-nav__item"}
          onClick={() => setMoreOpen(true)}
          aria-expanded={moreOpen}
        >
          <NavIcon name="more" />
          <span>Ещё</span>
        </button>
      </nav>

      {moreOpen ? (
        <div className="more-sheet" role="dialog" aria-modal="true" aria-label="Ещё">
          <button
            type="button"
            className="more-sheet__backdrop"
            aria-label="Закрыть"
            onClick={() => setMoreOpen(false)}
          />
          <div className="more-sheet__panel">
            <div className="more-sheet__handle" />
            <h2 className="more-sheet__title">Ещё</h2>
            <div className="more-sheet__grid">
              {MORE_NAV.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const showDot = item.href === "/letters" && letterUnread > 0;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={false}
                    scroll={false}
                    className={active ? "more-sheet__link is-active" : "more-sheet__link"}
                    onClick={() => setMoreOpen(false)}
                  >
                    {item.label}
                    {showDot ? <span className="nav-dot" aria-label="Есть непрочитанные письма" /> : null}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
