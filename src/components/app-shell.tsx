"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { NAV_ITEMS } from "@/lib/constants";

export function AppShell({
  children,
  coupleLabel,
}: {
  children: React.ReactNode;
  coupleLabel: string;
}) {
  const pathname = usePathname();

  return (
    <div className="app-frame">
      <aside className="side-nav">
        <div className="brand-block">
          <Link href="/home" className="brand-mark">
            LoveApp
          </Link>
          <p className="couple-label">{coupleLabel}</p>
        </div>
        <nav className="nav-list">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? "nav-link active" : "nav-link"}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <button type="button" className="ghost-btn" onClick={() => signOut({ callbackUrl: "/" })}>
          Выйти
        </button>
      </aside>
      <main className="main-pane">{children}</main>
    </div>
  );
}
