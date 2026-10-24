import { NextResponse } from "next/server";
import { z } from "zod";
import { isDemoMode } from "@/lib/demo-mode";
import { prisma } from "@/lib/prisma";
import { requireCoupleApi } from "@/lib/session";
import { saveImage } from "@/lib/storage";

export async function GET() {
  const authResult = await requireCoupleApi();
  if ("error" in authResult) return authResult.error;

  const user = await prisma.user.findUnique({
    where: { id: authResult.user.id },
    select: { id: true, displayName: true, email: true, avatarPath: true },
  });

  return NextResponse.json({ user });
}

const nameSchema = z.object({
  displayName: z.string().min(1).max(40),
});

export async function PATCH(req: Request) {
  const authResult = await requireCoupleApi();
  if ("error" in authResult) return authResult.error;

  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const displayNameRaw = String(form.get("displayName") || "").trim();
    const file = form.get("avatar");

    const data: { displayName?: string; avatarPath?: string } = {};
    if (displayNameRaw) {
      const parsed = nameSchema.safeParse({ displayName: displayNameRaw });
      if (!parsed.success) {
        return NextResponse.json({ error: "Имя 1–40 символов" }, { status: 400 });
      }
      data.displayName = parsed.data.displayName;
    }

    if (file instanceof File && file.size > 0) {
      if (!file.type.startsWith("image/")) {
        return NextResponse.json({ error: "Только изображения" }, { status: 400 });
      }
      if (file.size > 3 * 1024 * 1024) {
        return NextResponse.json({ error: "Максимум 3 МБ" }, { status: 400 });
      }
      try {
        data.avatarPath = await saveImage(file);
      } catch {
        if (isDemoMode()) {
          return NextResponse.json(
            { error: "В демо можно сменить имя; загрузка фото на хостинге ограничена" },
            { status: 400 },
          );
        }
        return NextResponse.json({ error: "Не удалось сохранить фото" }, { status: 500 });
      }
    }

    if (!Object.keys(data).length) {
      return NextResponse.json({ error: "Нечего обновлять" }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: authResult.user.id },
      data,
      select: { id: true, displayName: true, email: true, avatarPath: true },
    });

    return NextResponse.json({ user });
  }

  const parsed = nameSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Имя 1–40 символов" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: authResult.user.id },
    data: { displayName: parsed.data.displayName.trim() },
    select: { id: true, displayName: true, email: true, avatarPath: true },
  });

  return NextResponse.json({ user });
}
