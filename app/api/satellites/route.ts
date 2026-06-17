import { NextResponse, type NextRequest } from "next/server";

import { buildMissionControlData } from "@/lib/orbit";
import { DEFAULT_SATELLITE_ID, fetchSatelliteTle } from "@/lib/satnogs";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const satId = request.nextUrl.searchParams.get("satId") ?? DEFAULT_SATELLITE_ID;
  const tle = await fetchSatelliteTle(satId);
  const data = buildMissionControlData(tle);

  return NextResponse.json(data);
}
