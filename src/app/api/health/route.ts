import { NextResponse } from "next/server";
import { getSettings } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await getSettings();
    return NextResponse.json({
      status: "ok",
      phase: settings.phase,
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}
