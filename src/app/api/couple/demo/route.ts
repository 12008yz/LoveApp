import { NextResponse } from "next/server";

/** Demo couple entry is disabled. */
export async function POST() {
  return NextResponse.json({ error: "Демо отключено" }, { status: 404 });
}
