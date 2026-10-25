"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { HOME_HOTSPOTS } from "@/lib/home-hotspots";

export function HomeRoom() {
  const [tip, setTip] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem("loveapp-home-tip")) {
        setTip(true);
        localStorage.setItem("loveapp-home-tip", "1");
      }
    } catch {
      /* private mode */
    }
  }, []);

  return (
    <div className="home-room">
      {tip ? (
        <p className="home-room__tip" role="status">
          Нажми на предмет в комнате — откроется раздел.
          <button type="button" className="home-room__tip-dismiss" onClick={() => setTip(false)}>
            Понятно
          </button>
        </p>
      ) : null}
      <div className="home-room__stage">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="home-room__art"
          src="/art/home-room.jpg"
          alt=""
          width={768}
          height={1024}
          decoding="async"
        />
        {HOME_HOTSPOTS.map((spot) => (
          <Link
            key={spot.href}
            href={spot.href}
            prefetch
            scroll={false}
            className="home-room__hotspot"
            style={{
              left: `${spot.left}%`,
              top: `${spot.top}%`,
              width: `${spot.width}%`,
              height: `${spot.height}%`,
            }}
            aria-label={spot.label}
          >
            <span className="home-room__hotspot-label">{spot.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
