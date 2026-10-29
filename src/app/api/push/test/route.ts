import { NextResponse } from "next/server";
import { requireUserApi } from "@/lib/session";
import { sendPushToUser } from "@/lib/push";

/** Send a test notification to the current user's saved subscriptions. */
export async function POST() {
  const authResult = await requireUserApi();
  if ("error" in authResult) return authResult.error;

  const result = await sendPushToUser(authResult.user.id, {
    title: "LoveApp — тест",
    body: "Если вы это видите, push работает.",
    url: "/settings",
  });

  if (result.reason === "not_configured") {
    return NextResponse.json(
      {
        ok: false,
        error:
          "VAPID не настроен на сервере. Заполните NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT в /opt/loveApp/.env и перезапустите loveapp.",
        ...result,
      },
      { status: 503 },
    );
  }

  if (result.reason === "no_subscriptions") {
    return NextResponse.json(
      {
        ok: false,
        error: "Нет подписки. Сначала нажмите «Включить уведомления» на этом устройстве.",
        ...result,
      },
      { status: 400 },
    );
  }

  if (result.sent < 1) {
    return NextResponse.json(
      {
        ok: false,
        error: result.lastError || "Не удалось отправить push (подписка устарела? переподключите).",
        ...result,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, ...result });
}
