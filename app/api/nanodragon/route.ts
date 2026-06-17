import { NextResponse } from "next/server";

import { buildMissionControlData } from "@/lib/orbit";
import { fetchNanoDragonTle } from "@/lib/satnogs";

export const dynamic = "force-dynamic";

export async function GET() {
  const tle = await fetchNanoDragonTle();
  const data = buildMissionControlData(tle);

  return NextResponse.json(data);
}
