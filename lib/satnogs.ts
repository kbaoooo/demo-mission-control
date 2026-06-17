export type SatelliteConfig = {
  satId: string;
  name: string;
  country?: string;
  fallbackTle?: {
    line1: string;
    line2: string;
    source: string;
    noradCatId: number | null;
    updatedAt: string;
  };
};

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

export const SATELLITE_CATALOG: SatelliteConfig[] = [
  {
    satId: "ABEW-7076-2438-2471-3995",
    name: "Vietnam Satellite 1",
    country: "Vietnam",
    fallbackTle: {
      line1:
        "1 49398U 21102D   26168.05377890  .00009402  00000-0  31989-3 0  9999",
      line2:
        "2 49398  97.3189 210.2672 0008635 193.2732 166.8284 15.30608614254001",
      source: "Space-Track.org via SatNOGS fallback",
      noradCatId: 99515,
      updatedAt: "2026-06-17T09:29:54.955778+0000",
    },
  },
];

export const DEFAULT_SATELLITE_ID = SATELLITE_CATALOG[0].satId;

export function getSatnogsTleUrl(satId: string) {
  return `https://db.satnogs.org/api/tle/?sat_id=${encodeURIComponent(satId)}`;
}

export function getSatelliteConfig(satId = DEFAULT_SATELLITE_ID) {
  return (
    SATELLITE_CATALOG.find((satellite) => satellite.satId === satId) ??
    SATELLITE_CATALOG[0]
  );
}

export async function fetchSatelliteTle(
  satId = DEFAULT_SATELLITE_ID
): Promise<TleRecord> {
  const satellite = getSatelliteConfig(satId);

  try {
    const response = await fetch(getSatnogsTleUrl(satellite.satId), {
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
      name: satellite.name || tle.tle0?.replace(/^0\s+/, "").trim() || tle.sat_id || "Satellite",
      line1: tle.tle1,
      line2: tle.tle2,
      source: tle.tle_source || "SatNOGS",
      satId: tle.sat_id || satellite.satId,
      noradCatId: tle.norad_cat_id ?? null,
      updatedAt: tle.updated || new Date().toISOString(),
      isFallback: false,
    };
  } catch {
    if (!satellite.fallbackTle) {
      throw new Error(`Unable to fetch TLE for satellite ${satellite.satId}`);
    }

    return {
      name: satellite.name,
      line1: satellite.fallbackTle.line1,
      line2: satellite.fallbackTle.line2,
      source: satellite.fallbackTle.source,
      satId: satellite.satId,
      noradCatId: satellite.fallbackTle.noradCatId,
      updatedAt: satellite.fallbackTle.updatedAt,
      isFallback: true,
    };
  }
}
