export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Free Layero / demo mode — skip background cron
  if (
    process.env.DISABLE_CRON === "1" ||
    process.env.DEMO_MODE === "1" ||
    process.env.DEMO_MODE === "true"
  ) {
    return;
  }

  const base = process.env.AUTH_URL || "http://localhost:3000";
  const secret = process.env.CRON_SECRET;
  if (!secret) return;

  const tick = async () => {
    try {
      await fetch(`${base}/api/cron/reminders`, {
        headers: { Authorization: `Bearer ${secret}` },
        cache: "no-store",
      });
    } catch {
      /* server may still be booting */
    }
  };

  // Delay first tick so the HTTP server is up
  setTimeout(() => {
    void tick();
    setInterval(() => void tick(), 60_000);
  }, 15_000);
}
