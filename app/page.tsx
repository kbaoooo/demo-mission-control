import { Activity, Clock3, MapPin, RadioTower, Satellite } from "lucide-react";
import Link from "next/link";

import { MissionMap } from "@/components/mission-map";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  buildMissionControlData,
  mapPoint,
  mapSegments,
} from "@/lib/orbit";
import {
  fetchSatelliteTle,
  getSatelliteConfig,
  getSatnogsTleUrl,
  SATELLITE_CATALOG,
} from "@/lib/satnogs";

export const dynamic = "force-dynamic";

type HomeProps = {
  searchParams: Promise<{
    satId?: string | string[];
  }>;
};

function formatNumber(value: number, digits = 2) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "UTC",
  }).format(new Date(value));
}

function firstSearchValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const selectedSatellite = getSatelliteConfig(firstSearchValue(params.satId));
  const tle = await fetchSatelliteTle(selectedSatellite.satId);
  const data = buildMissionControlData(tle);
  const groundTrackSegments = mapSegments(data.groundTrack);
  const footprintSegments = mapSegments(data.footprint);
  const observerPoint = mapPoint(
    data.observer.latitude,
    data.observer.longitude
  );

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Satellite catalog</Badge>
              {selectedSatellite.country ? (
                <Badge variant="outline">{selectedSatellite.country}</Badge>
              ) : null}
              <Badge variant={data.tle.isFallback ? "destructive" : "outline"}>
                {data.tle.isFallback ? "Fallback TLE" : "Live SatNOGS TLE"}
              </Badge>
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-normal sm:text-4xl">
                Satellite Mission Control
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                TLE from SatNOGS, propagated with SGP4 into current position,
                ground track, footprint, and pass predictions for the selected
                satellite.
              </p>
            </div>
          </div>
          <div className="text-sm text-muted-foreground lg:text-right">
            <div>Generated UTC</div>
            <div className="font-mono text-foreground">
              {formatDateTime(data.generatedAt)}
            </div>
          </div>
        </div>

        {data.tle.isFallback ? (
          <Alert variant="destructive">
            <Activity className="size-4" />
            <AlertTitle>SatNOGS live fetch failed</AlertTitle>
            <AlertDescription>
              The dashboard is using the last verified fallback TLE for{" "}
              {data.tle.name}.
            </AlertDescription>
          </Alert>
        ) : null}

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Configured Satellites</CardTitle>
            <CardDescription>
              Select any configured SatNOGS satellite ID without changing the
              orbit pipeline.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {SATELLITE_CATALOG.map((satellite) => {
              const selected = satellite.satId === selectedSatellite.satId;

              return (
                <Link
                  key={satellite.satId}
                  className="rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  href={`/?satId=${encodeURIComponent(satellite.satId)}`}
                >
                  <Badge variant={selected ? "default" : "outline"}>
                    {satellite.name}
                  </Badge>
                </Link>
              );
            })}
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Card className="rounded-lg">
            <CardHeader className="border-b">
              <div>
                <CardTitle>World Track</CardTitle>
                <CardDescription>
                  Canonical equirectangular map asset with SGP4-derived overlays
                </CardDescription>
              </div>
              <CardAction>
                <Badge variant="outline">/maps/world-contour-hires.bmp</Badge>
              </CardAction>
            </CardHeader>
            <CardContent className="pt-4">
              <MissionMap
                currentPoint={data.current}
                footprintSegments={footprintSegments}
                groundTrackSegments={groundTrackSegments}
                observerPoint={observerPoint}
              />
            </CardContent>
          </Card>

          <div className="grid gap-4">
            <Card className="rounded-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Satellite className="size-4" />
                  Current Position
                </CardTitle>
                <CardDescription>{formatTime(data.current.time)} UTC</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm">
                <Metric label="Latitude" value={`${formatNumber(data.current.lat)}°`} />
                <Metric label="Longitude" value={`${formatNumber(data.current.lon)}°`} />
                <Metric
                  label="Altitude"
                  value={`${formatNumber(data.current.altitudeKm, 1)} km`}
                />
                <Metric
                  label="Velocity"
                  value={`${formatNumber(data.current.velocityKps, 2)} km/s`}
                />
              </CardContent>
            </Card>

            <Card className="rounded-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RadioTower className="size-4" />
                  Hanoi Look Angle
                </CardTitle>
                <CardDescription>
                  Minimum pass elevation {data.observer.minElevationDeg}°
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm">
                <Metric
                  label="Elevation"
                  value={`${formatNumber(data.currentLook.elevationDeg)}°`}
                />
                <Metric
                  label="Azimuth"
                  value={`${formatNumber(data.currentLook.azimuthDeg)}°`}
                />
                <Metric
                  label="Range"
                  value={`${formatNumber(data.currentLook.rangeKm, 0)} km`}
                />
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock3 className="size-4" />
                Next Hour Positions
              </CardTitle>
              <CardDescription>5-minute SGP4 prediction steps</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>UTC</TableHead>
                    <TableHead className="text-right">Lat</TableHead>
                    <TableHead className="text-right">Lon</TableHead>
                    <TableHead className="text-right">Alt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.prediction.map((point) => (
                    <TableRow key={point.time}>
                      <TableCell className="font-mono">{formatTime(point.time)}</TableCell>
                      <TableCell className="text-right">
                        {formatNumber(point.lat)}°
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(point.lon)}°
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(point.altitudeKm, 0)} km
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="size-4" />
                Hanoi Pass Predictions
              </CardTitle>
              <CardDescription>
                AOS/LOS for {data.observer.name}, next 24 hours
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.passes.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>AOS</TableHead>
                      <TableHead>LOS</TableHead>
                      <TableHead className="text-right">Max El</TableHead>
                      <TableHead className="text-right">Range</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.passes.map((pass) => (
                      <TableRow key={`${pass.aos}-${pass.los}`}>
                        <TableCell className="font-mono">{formatTime(pass.aos)}</TableCell>
                        <TableCell className="font-mono">{formatTime(pass.los)}</TableCell>
                        <TableCell className="text-right">
                          {formatNumber(pass.maxElevationDeg)}°
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(pass.closestRangeKm, 0)} km
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="rounded-md border bg-muted/40 p-4 text-sm text-muted-foreground">
                  No pass above {data.observer.minElevationDeg}° in the next 24
                  hours for Hanoi.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>TLE Source</CardTitle>
            <CardDescription>
              Latest orbital data for the selected satellite from SatNOGS DB
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 text-sm md:grid-cols-4">
              <Metric label="Satellite" value={data.tle.name} />
              <Metric label="SatNOGS ID" value={data.tle.satId} />
              <Metric
                label="NORAD field"
                value={data.tle.noradCatId?.toString() ?? "N/A"}
              />
              <Metric label="Updated" value={formatDateTime(data.tle.updatedAt)} />
            </div>
            <Separator />
            <pre className="overflow-x-auto rounded-md bg-muted p-4 text-xs leading-6">
              {`0 ${data.tle.name}\n${data.tle.line1}\n${data.tle.line2}`}
            </pre>
            <a
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
              href={getSatnogsTleUrl(data.tle.satId)}
              target="_blank"
              rel="noreferrer"
            >
              Open SatNOGS TLE API
            </a>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-xs uppercase tracking-normal text-muted-foreground">
        {label}
      </div>
      <div className="truncate font-mono text-sm font-medium">{value}</div>
    </div>
  );
}
