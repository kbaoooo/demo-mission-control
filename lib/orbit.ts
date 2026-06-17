import {
  degreesLat,
  degreesLong,
  degreesToRadians,
  ecfToLookAngles,
  eciToEcf,
  eciToGeodetic,
  gstime,
  propagate,
  radiansToDegrees,
  twoline2satrec,
} from "satellite.js";

import type { TleRecord } from "./satnogs";

const EARTH_RADIUS_KM = 6378.137;
const MAP_WIDTH = 1440;
const MAP_HEIGHT = 720;

export type GeoPoint = {
  time: string;
  lat: number;
  lon: number;
  altitudeKm: number;
  velocityKps: number;
  x: number;
  y: number;
};

export type FootprintPoint = {
  lat: number;
  lon: number;
  x: number;
  y: number;
};

export type LookPoint = {
  time: string;
  azimuthDeg: number;
  elevationDeg: number;
  rangeKm: number;
};

export type Observer = {
  name: string;
  latitude: number;
  longitude: number;
  altitudeMeters: number;
  minElevationDeg: number;
};

export type PassPrediction = {
  aos: string;
  los: string;
  durationMinutes: number;
  maxElevationDeg: number;
  maxElevationAt: string;
  aosAzimuthDeg: number;
  losAzimuthDeg: number;
  closestRangeKm: number;
};

export type MissionControlData = {
  generatedAt: string;
  tle: TleRecord;
  observer: Observer;
  current: GeoPoint;
  currentLook: LookPoint;
  groundTrack: GeoPoint[];
  prediction: GeoPoint[];
  footprint: FootprintPoint[];
  passes: PassPrediction[];
};

export const DEFAULT_OBSERVER: Observer = {
  name: "Hanoi Ground Station",
  latitude: 21.0278,
  longitude: 105.8342,
  altitudeMeters: 10,
  minElevationDeg: 10,
};

function normalizeLongitude(lon: number) {
  const normalized = ((((lon + 180) % 360) + 360) % 360) - 180;
  return normalized === -180 ? 180 : normalized;
}

function projectToMap(lat: number, lon: number) {
  return {
    x: ((normalizeLongitude(lon) + 180) / 360) * MAP_WIDTH,
    y: ((90 - lat) / 180) * MAP_HEIGHT,
  };
}

function velocityMagnitude(velocity: { x: number; y: number; z: number }) {
  return Math.sqrt(
    velocity.x * velocity.x + velocity.y * velocity.y + velocity.z * velocity.z
  );
}

function interpolateTime(
  before: { date: Date; elevationDeg: number },
  after: { date: Date; elevationDeg: number },
  targetElevationDeg: number
) {
  const span = after.elevationDeg - before.elevationDeg;
  const ratio =
    Math.abs(span) < 0.000001
      ? 0
      : (targetElevationDeg - before.elevationDeg) / span;
  const clampedRatio = Math.min(1, Math.max(0, ratio));

  return new Date(
    before.date.getTime() +
      (after.date.getTime() - before.date.getTime()) * clampedRatio
  );
}

function makeSatrec(tle: TleRecord) {
  return twoline2satrec(tle.line1, tle.line2);
}

export function calculatePosition(tle: TleRecord, date: Date): GeoPoint {
  const satrec = makeSatrec(tle);
  const positionAndVelocity = propagate(satrec, date);

  if (!positionAndVelocity?.position || !positionAndVelocity.velocity) {
    throw new Error(`SGP4 propagation failed with error ${satrec.error}`);
  }

  const gmst = gstime(date);
  const geodetic = eciToGeodetic(positionAndVelocity.position, gmst);
  const lat = degreesLat(geodetic.latitude);
  const lon = degreesLong(geodetic.longitude);
  const { x, y } = projectToMap(lat, lon);

  return {
    time: date.toISOString(),
    lat,
    lon,
    altitudeKm: geodetic.height,
    velocityKps: velocityMagnitude(positionAndVelocity.velocity),
    x,
    y,
  };
}

function calculateLookAngles(
  tle: TleRecord,
  observer: Observer,
  date: Date
): LookPoint {
  const satrec = makeSatrec(tle);
  const positionAndVelocity = propagate(satrec, date);

  if (!positionAndVelocity?.position) {
    throw new Error(`SGP4 propagation failed with error ${satrec.error}`);
  }

  const observerGd = {
    latitude: degreesToRadians(observer.latitude),
    longitude: degreesToRadians(observer.longitude),
    height: observer.altitudeMeters / 1000,
  };
  const gmst = gstime(date);
  const positionEcf = eciToEcf(positionAndVelocity.position, gmst);
  const lookAngles = ecfToLookAngles(observerGd, positionEcf);

  return {
    time: date.toISOString(),
    azimuthDeg: radiansToDegrees(lookAngles.azimuth),
    elevationDeg: radiansToDegrees(lookAngles.elevation),
    rangeKm: lookAngles.rangeSat,
  };
}

function rangeByMinutes(start: Date, end: Date, stepMinutes: number) {
  const points: Date[] = [];
  const stepMs = stepMinutes * 60 * 1000;

  for (let time = start.getTime(); time <= end.getTime(); time += stepMs) {
    points.push(new Date(time));
  }

  return points;
}

function calculateFootprint(
  center: GeoPoint,
  minElevationDeg = 0
): FootprintPoint[] {
  const lat1 = degreesToRadians(center.lat);
  const lon1 = degreesToRadians(center.lon);
  const elevation = degreesToRadians(minElevationDeg);
  const angularRadius =
    Math.acos(
      (EARTH_RADIUS_KM / (EARTH_RADIUS_KM + center.altitudeKm)) *
        Math.cos(elevation)
    ) - elevation;
  const points: FootprintPoint[] = [];

  for (let bearingDeg = 0; bearingDeg <= 360; bearingDeg += 5) {
    const bearing = degreesToRadians(bearingDeg);
    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(angularRadius) +
        Math.cos(lat1) * Math.sin(angularRadius) * Math.cos(bearing)
    );
    const lon2 =
      lon1 +
      Math.atan2(
        Math.sin(bearing) * Math.sin(angularRadius) * Math.cos(lat1),
        Math.cos(angularRadius) - Math.sin(lat1) * Math.sin(lat2)
      );
    const lat = radiansToDegrees(lat2);
    const lon = normalizeLongitude(radiansToDegrees(lon2));
    const { x, y } = projectToMap(lat, lon);

    points.push({ lat, lon, x, y });
  }

  return points;
}

function calculatePasses(
  tle: TleRecord,
  observer: Observer,
  start: Date,
  hours = 24
): PassPrediction[] {
  const end = new Date(start.getTime() + hours * 60 * 60 * 1000);
  const stepMs = 60 * 1000;
  const minElevation = observer.minElevationDeg;
  const passes: PassPrediction[] = [];
  let previousDate = start;
  let previousLook = calculateLookAngles(tle, observer, previousDate);
  let activePass:
    | {
        aos: Date;
        aosAzimuthDeg: number;
        maxLook: LookPoint;
      }
    | null =
    previousLook.elevationDeg >= minElevation
      ? {
          aos: previousDate,
          aosAzimuthDeg: previousLook.azimuthDeg,
          maxLook: previousLook,
        }
      : null;

  for (
    let time = start.getTime() + stepMs;
    time <= end.getTime() && passes.length < 6;
    time += stepMs
  ) {
    const date = new Date(time);
    const look = calculateLookAngles(tle, observer, date);

    if (!activePass && previousLook.elevationDeg < minElevation) {
      if (look.elevationDeg >= minElevation) {
        const aos = interpolateTime(
          { date: previousDate, elevationDeg: previousLook.elevationDeg },
          { date, elevationDeg: look.elevationDeg },
          minElevation
        );
        activePass = {
          aos,
          aosAzimuthDeg: look.azimuthDeg,
          maxLook: look,
        };
      }
    } else if (activePass) {
      if (look.elevationDeg > activePass.maxLook.elevationDeg) {
        activePass.maxLook = look;
      }

      if (look.elevationDeg < minElevation) {
        const los = interpolateTime(
          { date: previousDate, elevationDeg: previousLook.elevationDeg },
          { date, elevationDeg: look.elevationDeg },
          minElevation
        );

        passes.push({
          aos: activePass.aos.toISOString(),
          los: los.toISOString(),
          durationMinutes:
            (los.getTime() - activePass.aos.getTime()) / (60 * 1000),
          maxElevationDeg: activePass.maxLook.elevationDeg,
          maxElevationAt: activePass.maxLook.time,
          aosAzimuthDeg: activePass.aosAzimuthDeg,
          losAzimuthDeg: look.azimuthDeg,
          closestRangeKm: activePass.maxLook.rangeKm,
        });
        activePass = null;
      }
    }

    previousDate = date;
    previousLook = look;
  }

  return passes;
}

export function buildMissionControlData(
  tle: TleRecord,
  now = new Date()
): MissionControlData {
  const current = calculatePosition(tle, now);
  const groundTrack = rangeByMinutes(
    new Date(now.getTime() - 45 * 60 * 1000),
    new Date(now.getTime() + 90 * 60 * 1000),
    2
  ).map((date) => calculatePosition(tle, date));
  const prediction = rangeByMinutes(
    now,
    new Date(now.getTime() + 60 * 60 * 1000),
    5
  ).map((date) => calculatePosition(tle, date));

  return {
    generatedAt: now.toISOString(),
    tle,
    observer: DEFAULT_OBSERVER,
    current,
    currentLook: calculateLookAngles(tle, DEFAULT_OBSERVER, now),
    groundTrack,
    prediction,
    footprint: calculateFootprint(current),
    passes: calculatePasses(tle, DEFAULT_OBSERVER, now),
  };
}

export function mapPolyline(points: Array<{ x: number; y: number }>) {
  return points.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");
}

export function mapSegments(points: Array<{ x: number; y: number }>) {
  const segments: Array<Array<{ x: number; y: number }>> = [];
  let segment: Array<{ x: number; y: number }> = [];

  points.forEach((point, index) => {
    const previous = points[index - 1];

    if (previous && Math.abs(point.x - previous.x) > MAP_WIDTH / 2) {
      if (segment.length > 0) {
        segments.push(segment);
      }
      segment = [point];
      return;
    }

    segment.push(point);
  });

  if (segment.length > 0) {
    segments.push(segment);
  }

  return segments;
}

export function mapPoint(lat: number, lon: number) {
  return projectToMap(lat, lon);
}
