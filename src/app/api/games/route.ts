import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCoupleApi } from "@/lib/session";
import { newTicState, newWordsState, publicWordsState } from "@/lib/games";

export async function GET() {
  const authResult = await requireCoupleApi();
  if ("error" in authResult) return authResult.error;

  const sessions = await prisma.gameSession.findMany({
    where: { coupleId: authResult.couple.id },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });

  const mapped = sessions.map((s) => {
    const state = JSON.parse(s.stateJson);
    return {
      ...s,
      state: s.type === "words" ? publicWordsState(state) : state,
    };
  });

  return NextResponse.json({ sessions: mapped });
}

const schema = z.object({
  type: z.enum(["tictactoe", "words"]),
});

export async function POST(req: Request) {
  const authResult = await requireCoupleApi();
  if ("error" in authResult) return authResult.error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Тип игры" }, { status: 400 });
  }

  const boy = authResult.couple.members.find((m) => m.genderRole === "boy");
  const girl = authResult.couple.members.find((m) => m.genderRole === "girl");

  const state =
    parsed.data.type === "tictactoe"
      ? newTicState()
      : newWordsState(authResult.user.id);

  const session = await prisma.gameSession.create({
    data: {
      coupleId: authResult.couple.id,
      type: parsed.data.type,
      stateJson: JSON.stringify(state),
      boyUserId: boy?.userId,
      girlUserId: girl?.userId,
      status: "active",
    },
  });

  const publicState =
    parsed.data.type === "words"
      ? publicWordsState(state as ReturnType<typeof newWordsState>)
      : state;

  return NextResponse.json(
    {
      session: {
        ...session,
        state: publicState,
      },
    },
    { status: 201 },
  );
}
