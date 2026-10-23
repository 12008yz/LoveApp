import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCoupleApi } from "@/lib/session";
import { guessLetter, playTic, publicWordsState, type TicState, type WordsState } from "@/lib/games";

const schema = z.object({
  index: z.number().int().min(0).max(8).optional(),
  letter: z.string().min(1).max(2).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireCoupleApi();
  if ("error" in authResult) return authResult.error;
  const { id } = await params;

  const session = await prisma.gameSession.findFirst({
    where: { id, coupleId: authResult.couple.id },
  });
  if (!session) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  if (session.status !== "active") {
    return NextResponse.json({ error: "Игра окончена" }, { status: 400 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Ход" }, { status: 400 });
  }

  let state = JSON.parse(session.stateJson);
  let winnerId: string | null = session.winnerId;
  let status = session.status;

  if (session.type === "tictactoe") {
    const role = authResult.membership.genderRole;
    const mark = role === "boy" ? "X" : "O";
    const tic = state as TicState;
    if (tic.turn !== mark) {
      return NextResponse.json({ error: "Сейчас ход партнёра" }, { status: 400 });
    }
    if (parsed.data.index === undefined) {
      return NextResponse.json({ error: "Нужна клетка" }, { status: 400 });
    }
    state = playTic(tic, parsed.data.index);
    if (state.winner === "X") {
      winnerId = session.boyUserId;
      status = "finished";
    } else if (state.winner === "O") {
      winnerId = session.girlUserId;
      status = "finished";
    } else if (state.winner === "draw") {
      status = "finished";
    }
  } else {
    const words = state as WordsState;
    // Guesser is the partner of host
    if (words.hostId === authResult.user.id) {
      return NextResponse.json({ error: "Загадал слово — ходит партнёр" }, { status: 400 });
    }
    if (!parsed.data.letter) {
      return NextResponse.json({ error: "Нужна буква" }, { status: 400 });
    }
    state = guessLetter(words, parsed.data.letter);
    if (state.status === "won") {
      winnerId = authResult.user.id;
      status = "finished";
    } else if (state.status === "lost") {
      winnerId = words.hostId;
      status = "finished";
    }
  }

  const updated = await prisma.gameSession.update({
    where: { id },
    data: {
      stateJson: JSON.stringify(state),
      status,
      winnerId,
    },
  });

  return NextResponse.json({
    session: {
      ...updated,
      state: session.type === "words" ? publicWordsState(state) : state,
    },
  });
}
