import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoupleApi } from "@/lib/session";
import { saveImage } from "@/lib/storage";

const COMMENT_INCLUDE = {
  orderBy: { createdAt: "asc" as const },
  take: 50,
  include: {
    author: { select: { id: true, displayName: true } },
  },
};

function withCommentCount<T extends { comments: unknown[] }>(item: T) {
  return {
    ...item,
    commentCount: item.comments.length,
  };
}

export async function GET() {
  const authResult = await requireCoupleApi();
  if ("error" in authResult) return authResult.error;

  const items = await prisma.mediaItem.findMany({
    where: { coupleId: authResult.couple.id },
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { id: true, displayName: true } },
      place: true,
      comments: COMMENT_INCLUDE,
    },
  });

  return NextResponse.json({ items: items.map(withCommentCount) });
}

export async function POST(req: Request) {
  const authResult = await requireCoupleApi();
  if ("error" in authResult) return authResult.error;

  const form = await req.formData();
  const file = form.get("file");
  const caption = String(form.get("caption") || "").trim().slice(0, 300);
  const placeId = String(form.get("placeId") || "") || null;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Нужен файл" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Только изображения" }, { status: 400 });
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "Максимум 5 МБ" }, { status: 400 });
  }
  if (!caption) {
    return NextResponse.json({ error: "Добавьте подпись к фото" }, { status: 400 });
  }

  if (placeId) {
    const place = await prisma.place.findFirst({
      where: { id: placeId, coupleId: authResult.couple.id },
    });
    if (!place) {
      return NextResponse.json({ error: "Место не найдено" }, { status: 400 });
    }
  }

  const filePath = await saveImage(file);

  const item = await prisma.mediaItem.create({
    data: {
      coupleId: authResult.couple.id,
      authorId: authResult.user.id,
      caption,
      filePath,
      placeId,
    },
    include: {
      author: { select: { id: true, displayName: true } },
      place: true,
      comments: COMMENT_INCLUDE,
    },
  });

  return NextResponse.json({ item: withCommentCount(item) }, { status: 201 });
}
