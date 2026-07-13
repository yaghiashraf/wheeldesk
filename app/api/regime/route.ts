import { NextResponse } from "next/server";
import { getVixRegime } from "@/lib/providers/cboe";

export const maxDuration = 15;

export async function GET() {
  try {
    return NextResponse.json(await getVixRegime());
  } catch {
    return NextResponse.json({ error: "VIX is temporarily unavailable" }, { status: 503 });
  }
}
