"use client";

import { Minus, Plus } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

type MapPoint = {
  x: number;
  y: number;
};

type MissionMapProps = {
  currentPoint: MapPoint;
  footprintSegments: MapPoint[][];
  groundTrackSegments: MapPoint[][];
  observerPoint: MapPoint;
};

function mapPolyline(points: MapPoint[]) {
  return points
    .map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`)
    .join(" ");
}

export function MissionMap({
  currentPoint,
  footprintSegments,
  groundTrackSegments,
  observerPoint,
}: MissionMapProps) {
  const [zoom, setZoom] = useState(1);
  const zoomLabel = useMemo(() => `${Math.round(zoom * 100)}%`, [zoom]);

  return (
    <div className="space-y-3">
      <div className="relative aspect-2/1 overflow-auto rounded-md border bg-muted">
        <div className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-lg border bg-background/90 p-1 shadow-sm backdrop-blur">
          <Button
            aria-label="Zoom out"
            disabled={zoom <= 1}
            onClick={() => setZoom((value) => Math.max(1, value - 0.25))}
            size="icon-sm"
            type="button"
            variant="outline"
          >
            <Minus className="size-4" />
          </Button>
          <div className="min-w-12 text-center font-mono text-xs tabular-nums">
            {zoomLabel}
          </div>
          <Button
            aria-label="Zoom in"
            disabled={zoom >= 3}
            onClick={() => setZoom((value) => Math.min(3, value + 0.25))}
            size="icon-sm"
            type="button"
            variant="outline"
          >
            <Plus className="size-4" />
          </Button>
        </div>

        <div
          className="relative"
          style={{
            height: `${zoom * 100}%`,
            width: `${zoom * 100}%`,
          }}
        >
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: "url('/maps/world-contour-hires.bmp')",
            }}
          />
          <svg
            aria-label="Satellite ground track and footprint"
            className="absolute inset-0 size-full"
            role="img"
            viewBox="0 0 1440 720"
          >
            {footprintSegments.map((segment, index) => (
              <polygon
                fill="rgba(34, 197, 94, 0.20)"
                key={`footprint-${index}`}
                points={mapPolyline(segment)}
                stroke="rgb(34, 197, 94)"
                strokeWidth="2"
              />
            ))}
            {groundTrackSegments.map((segment, index) => (
              <polyline
                fill="none"
                key={`track-${index}`}
                points={mapPolyline(segment)}
                stroke="rgb(56, 189, 248)"
                strokeDasharray="10 8"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="4"
              />
            ))}
            <circle
              cx={observerPoint.x}
              cy={observerPoint.y}
              fill="rgb(250, 204, 21)"
              r="7"
              stroke="rgb(24, 24, 27)"
              strokeWidth="3"
            />
            <circle
              cx={currentPoint.x}
              cy={currentPoint.y}
              fill="rgb(239, 68, 68)"
              r="9"
              stroke="white"
              strokeWidth="4"
            />
          </svg>
        </div>
      </div>
      <div className="grid gap-3 text-sm sm:grid-cols-3">
        <div className="flex items-center gap-2">
          <span className="size-3 rounded-full bg-red-500" />
          Satellite position
        </div>
        <div className="flex items-center gap-2">
          <span className="size-3 rounded-full bg-sky-400" />
          Ground track
        </div>
        <div className="flex items-center gap-2">
          <span className="size-3 rounded-full bg-green-500" />
          Footprint horizon
        </div>
      </div>
    </div>
  );
}
