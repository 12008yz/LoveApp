"use client";

import { useEffect } from "react";

/** Registers the service worker in production only. */
export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      void navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((reg) => void reg.unregister());
      });
      return;
    }

    void navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  return null;
}
