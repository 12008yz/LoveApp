import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { isDemoMode } from "@/lib/demo-mode";
import { encryptPassword } from "@/lib/password-share";
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

const passwordSchema = z.object({
  password: z.string().min(6).max(100),
});

export async function PATCH(req: Request) {
  const authResult = await requireCoupleApi();
  if ("error" in authResult) return authResult.error;

  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const displayNameRaw = String(form.get("displayName") || "").trim();
    const passwordRaw = String(form.get("password") || "");
    const file = form.get("avatar");

    const data: {
      displayName?: string;
      avatarPath?: string;
      passwordHash?: string;
      passwordEnc?: string;
    } = {};

    if (displayNameRaw) {
      const parsed = nameSchema.safeParse({ displayName: displayNameRaw });
      if (!parsed.success) {
        return NextResponse.json({ error: "Имя 1–40 символов" }, { status: 400 });
      }
      data.displayName = parsed.data.displayName;
    }

    if (passwordRaw) {
      const parsed = passwordSchema.safeParse({ password: passwordRaw });
      if (!parsed.success) {
        return NextResponse.json({ error: "Пароль минимум 6 символов" }, { status: 400 });
      }
      data.passwordHash = await bcrypt.hash(parsed.data.password, 10);
      data.passwordEnc = encryptPassword(parsed.data.password);
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

  const json = await req.json().catch(() => null);
  if (json && typeof json === "object" && "password" in json && !("displayName" in json)) {
    const parsed = passwordSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Пароль минимум 6 символов" }, { status: 400 });
    }
    const user = await prisma.user.update({
      where: { id: authResult.user.id },
      data: {
        passwordHash: await bcrypt.hash(parsed.data.password, 10),
        passwordEnc: encryptPassword(parsed.data.password),
      },
      select: { id: true, displayName: true, email: true, avatarPath: true },
    });
    return NextResponse.json({ user });
  }

  const parsed = nameSchema.safeParse(json);
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
