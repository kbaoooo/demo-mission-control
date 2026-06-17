export type TleRecord = {
  name: string;
  line1: string;
  line2: string;
  source: string;
  satId: string;
  noradCatId: number | null;
  updatedAt: string;
  isFallback: boolean;
};

type SatnogsTleResponse = {
  tle0?: string;
  tle1?: string;
  tle2?: string;
  tle_source?: string;
  sat_id?: string;
  norad_cat_id?: number;
  updated?: string;
};

export const NANODRAGON_SAT_ID = "ABEW-7076-2438-2471-3995";
export const SATNOGS_TLE_URL = `https://db.satnogs.org/api/tle/?sat_id=${NANODRAGON_SAT_ID}`;

const FALLBACK_TLE: TleRecord = {
  name: "NanoDragon",
  line1:
    "1 49398U 21102D   26168.05377890  .00009402  00000-0  31989-3 0  9999",
  line2:
    "2 49398  97.3189 210.2672 0008635 193.2732 166.8284 15.30608614254001",
  source: "Space-Track.org via SatNOGS fallback",
  satId: NANODRAGON_SAT_ID,
  noradCatId: 99515,
  updatedAt: "2026-06-17T09:29:54.955778+0000",
  isFallback: true,
};

export async function fetchNanoDragonTle(): Promise<TleRecord> {
  try {
    const response = await fetch(SATNOGS_TLE_URL, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`SatNOGS returned ${response.status}`);
    }

    const data = (await response.json()) as SatnogsTleResponse[];
    const tle = data[0];

    if (!tle?.tle1 || !tle?.tle2) {
      throw new Error("SatNOGS returned no TLE lines");
    }

    return {
      name: "NanoDragon",
      line1: tle.tle1,
      line2: tle.tle2,
      source: tle.tle_source || "SatNOGS",
      satId: tle.sat_id || NANODRAGON_SAT_ID,
      noradCatId: tle.norad_cat_id ?? null,
      updatedAt: tle.updated || new Date().toISOString(),
      isFallback: false,
    };
  } catch {
    return FALLBACK_TLE;
  }
}
