const TZ = "Europe/Moscow";

/** Calendar day key YYYY-MM-DD in Europe/Moscow. */
export function moscowDayKey(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Previous calendar day key (YYYY-MM-DD) in Europe/Moscow. */
export function prevMoscowDayKey(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  // Noon UTC avoids DST edge when shifting calendar days for Moscow.
  const utc = Date.UTC(y, m - 1, d, 12, 0, 0);
  const prev = new Date(utc - 24 * 60 * 60 * 1000);
  return moscowDayKey(prev);
}

/**
 * Shared days = days where both partners checked in.
 * Streak counts consecutive shared days ending at `today` if shared, else yesterday.
 */
export function computeFlameStreak(sharedDaysDesc: string[], today: string): number {
  const set = new Set(sharedDaysDesc);
  let cursor = set.has(today) ? today : prevMoscowDayKey(today);
  let streak = 0;
  while (set.has(cursor)) {
    streak += 1;
    cursor = prevMoscowDayKey(cursor);
  }
  return streak;
}

/** Build flames payload from raw check-ins (couple must have ≥2 members for a shared day). */
export function buildFlamesStatus(args: {
  checkIns: { userId: string; day: string }[];
  memberIds: string[];
  meId: string;
  today?: string;
  /** After a successful self check-in, force meChecked true. */
  forceMeChecked?: boolean;
}) {
  const today = args.today ?? moscowDayKey();
  const byDay = new Map<string, Set<string>>();
  for (const row of args.checkIns) {
    const set = byDay.get(row.day) ?? new Set<string>();
    set.add(row.userId);
    byDay.set(row.day, set);
  }

  const needBoth = args.memberIds.length >= 2;
  const sharedDays = [...byDay.entries()]
    .filter(([, users]) => needBoth && args.memberIds.every((id) => users.has(id)))
    .map(([day]) => day)
    .sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));

  const todayUsers = byDay.get(today) ?? new Set<string>();
  const partnerId = args.memberIds.find((id) => id !== args.meId);

  return {
    today,
    streak: computeFlameStreak(sharedDays, today),
    meChecked: Boolean(args.forceMeChecked) || todayUsers.has(args.meId),
    partnerChecked: partnerId ? todayUsers.has(partnerId) : false,
    sharedToday:
      Boolean(partnerId) &&
      needBoth &&
      args.memberIds.every((id) => todayUsers.has(id)),
  };
}
