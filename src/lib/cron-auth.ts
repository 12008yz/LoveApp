export function isCronAuthorized(req: Request, secret = process.env.CRON_SECRET) {
  if (!secret) return false;
  const header = req.headers.get("authorization") || "";
  return header === `Bearer ${secret}`;
}
