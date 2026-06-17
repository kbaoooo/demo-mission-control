# Satellite Orbit & Position Prediction — Agent Implementation Guide

This document defines the **rules, workflow, formulas, and conventions** an agent must
follow to implement satellite orbit drawing, ground-track rendering, footprint
computation, and short-term position prediction from **third-party orbital data (TLE)**
using the standard **SGP4** propagation model.

> **Golden rule:** Do **not** fetch lat/lon manually or plug TLE numbers into a plain
> two-body Kepler formula. The only correct pipeline for real satellites is
> **TLE → SGP4 → TEME → ECEF → geodetic (WGS84) → map x/y**.

---

## 1. Required Input Data (from third-party)

The minimum required input is the satellite's **TLE** (Two-Line Element set).

A TLE encodes the following orbital parameters:

| Field                 | Purpose                                          |
| --------------------- | ------------------------------------------------ |
| `Epoch`               | Reference time at which the TLE is valid         |
| `Inclination`         | Orbit tilt relative to the equator               |
| `RAAN`                | Orientation of the orbital plane                 |
| `Eccentricity`        | Orbit ellipticity                                |
| `Argument of Perigee` | Direction of the closest point to Earth          |
| `Mean Anomaly`        | Satellite position at epoch                      |
| `Mean Motion`         | Revolutions per day                              |
| `B* drag term`        | Atmospheric-drag coefficient                     |
| `NORAD ID`            | Satellite identifier                             |

**The single most important input is the TLE.** Everything else (position, ground track,
footprint, passes) is computed from it.

### What to request / store from the provider

Required:

```
NORAD ID
Satellite name
TLE line 1
TLE line 2
TLE epoch
TLE last-updated time
```

Optional (use only as a convenience / cross-check, never as the sole source):

```
current lat / lon / altitude
current velocity
pass predictions
satellite metadata
```

### Provider data styles

- **Style A — provider returns lat/lon/altitude/velocity directly.** Fine for showing the
  *current* position quickly, but insufficient for ground tracks, predictions, and pass
  computation. Still fetch the TLE.
- **Style B — provider returns the TLE.** Preferred. The backend then propagates with SGP4
  to derive every other quantity.

---

## 2. Hard Rules (do not violate)

1. **SGP4 output is in the TEME frame** (True Equator, Mean Equinox) — *not* plain
   ECI/J2000. Name it TEME everywhere. For a tracking dashboard, treating it as
   quasi-inertial and rotating by GMST is accurate enough. Only do the full
   TEME → ITRF chain (precession, nutation, polar motion) when high precision is required.
2. **TLE is only valid with SGP4.** Never feed TLE parameters into a pure two-body Kepler
   model — the TLE already contains SGP4-specific terms and the result will be wrong.
3. **Spherical-Earth latitude is geocentric, not geodetic.** Maps use **geodetic** latitude
   (WGS84 ellipsoid). The difference reaches ~0.2° (tens of km at mid-latitudes). Use a
   WGS84 conversion for anything displayed on a map.
4. **Use UTC consistently** for all target times and the GMST calculation.
5. **Handle the antimeridian (±180° longitude) wrap** when drawing ground tracks and
   footprint polygons — split the polyline/polygon instead of drawing a line across the map.
6. **TLEs age.** Refresh per the cadence in §10. Don't predict long horizons from a stale TLE.

---

## 3. Recommended Libraries

Do **not** hand-roll SGP4 or the coordinate transforms. Use a maintained library:

- **JavaScript / TypeScript:** [`satellite.js`](https://github.com/shashwatak/satellite-js)
  — provides `twoline2satrec`, `propagate`/`sgp4`, `gstime`, `eciToGeodetic`,
  `eciToEcf`, `degreesLat`, `degreesLong`.
- **Python:** `sgp4` (Vallado-derived) + `astropy` / `skyfield` for frame conversions.

Hand-write only the *map projection* and *footprint polygon* math.

---

## 4. Core Workflow — Position at a Single Time

```
Input:
  - TLE (line1, line2)
  - targetTime (UTC)

Steps:
  1. Parse TLE                          → satrec
  2. SGP4 propagate to targetTime       → positionTEME, velocityTEME
  3. Compute GMST at targetTime
  4. Rotate TEME → ECEF about the z-axis by GMST
  5. Convert ECEF → geodetic lat/lon/altitude (WGS84)

Output:
  - latitude, longitude, altitude, velocity, timestamp
```

### Formulas

**SGP4 propagation:**

```
positionTEME, velocityTEME = SGP4(TLE, targetTime)
```

**TEME → ECEF (rotation by GMST):**

```
ECEF = rotate_around_z(TEME, GMST)
GMST = Greenwich Mean Sidereal Time at targetTime
```

**ECEF → longitude** (valid for both sphere and ellipsoid):

```
longitude = atan2(yECEF, xECEF)
```

**ECEF → latitude/altitude — spherical model (gives GEOCENTRIC latitude, simple/approximate):**

```
latitude  = atan2(zECEF, sqrt(xECEF² + yECEF²))
altitude  = sqrt(xECEF² + yECEF² + zECEF²) - EarthRadius
```

**ECEF → geodetic (WGS84) — REQUIRED for map display.** Use a library converter (closed-form
Bowring or iterative). Conceptually:

```
TEME → ECEF → geodetic latitude / longitude / altitude (WGS84)
```

WGS84 constants:

```
a (semi-major axis) = 6378.137 km
f (flattening)      = 1 / 298.257223563
```

> With `satellite.js`, `eciToGeodetic(positionEci, gmst)` returns geodetic lat/lon/height
> directly — prefer it over manual conversion.

---

## 5. Short-Term Position Prediction (e.g. every 5 minutes)

Prediction = running SGP4 repeatedly at multiple timestamps.

```
Input: latest TLE, startTime, endTime, step (e.g. 5 min)

for Ti in [startTime, startTime+step, …, endTime]:
    positionTEME = SGP4(TLE, Ti)
    lat/lon/alt  = convert(positionTEME, Ti)
    append { time: Ti, lat, lon, alt }
```

Example — next hour at 5-minute steps → `now, now+5m, …, now+60m`. Output is a table/array
of `{ time, lat, lon, altitude }`.

---

## 6. Ground Track

The ground track is the path of the sub-satellite point on the Earth's surface.

```
Input: TLE, time window, step

Suggested window: startTime = now - 45 min, endTime = now + 90 min, step = 1–2 min

for each timestamp:
    SGP4(TLE, t) → TEME → ECEF → geodetic lat/lon → map x/y
    append { time, lat, lon, x, y }

Connect the points into a polyline.
```

**Antimeridian handling:** when consecutive longitudes jump between +180° and −180°, split
the polyline into separate segments at the crossing — do not draw a horizontal line across
the whole map.

Output:

```
[ { time, lat, lon, x, y }, … ]
```

---

## 7. Lat/Lon → Map x/y (equirectangular)

### Default world map asset

Use this project asset as the canonical world map background:

```
/maps/world-contour-hires.bmp
```

Source file:

```
public/maps/world-contour-hires.bmp
```

This image is a 1440×720 equirectangular world contour map. Treat it as the selected
world map for orbit, ground-track, footprint, and marker rendering unless the user
explicitly replaces it.

For an equirectangular world map of width `W` and height `H`:

```
x = ((lon + 180) / 360) * W
y = ((90  - lat) / 180) * H
```

```
lon ∈ [-180, +180],  lat ∈ [+90, -90]
```

If the map is tiled 3× horizontally, render copies at:

```
x_left  = x - W
x_main  = x
x_right = x + W
```

---

## 8. Footprint (coverage area)

The footprint is the ground region the satellite can see / cover.

```
Input: sub-satellite lat/lon, satellite altitude h, Earth radius Re,
       optional minimum elevation angle ε
```

### 8.1 Angular radius

**Horizon case (ε = 0°):**

```
ψ = arccos( Re / (Re + h) )
```

**Minimum-elevation case (ε > 0°, more realistic for comms):**

```
ψ = arccos( (Re / (Re + h)) * cos(ε) ) - ε
```

`ψ` is the angular radius of the footprint. A higher required elevation `ε` yields a
**smaller** footprint. When `ε = 0`, the second formula reduces to the first.

### 8.2 Footprint polygon (great-circle ring)

From the footprint center (the sub-satellite point `lat1, lon1`), generate points around it
by sweeping `bearing` from 0° to 360° (e.g. every 5° or 10°):

```
lat2 = asin( sin(lat1)*cos(ψ) + cos(lat1)*sin(ψ)*cos(bearing) )

lon2 = lon1 + atan2( sin(bearing)*sin(ψ)*cos(lat1),
                     cos(ψ) - sin(lat1)*sin(lat2) )
```

Connect the resulting points into a polygon.

**Wrap handling:** apply the same antimeridian (±180°) split, and take care near the poles.

Output:

```
[ { lat, lon, x, y }, … ]
```

---

## 9. Responsibility Split

**Fetched from the third-party provider:**

```
NORAD ID, satellite name, TLE line 1, TLE line 2, TLE epoch, TLE updated time
(optionally: current lat/lon/alt, velocity, pass predictions, metadata)
```

**Computed by our system (from the TLE):**

```
current position, future positions, ground track, footprint,
map x/y, pass predictions, AOS/LOS, elevation/azimuth
```

> The UI should **not** receive raw third-party data. The backend normalizes the TLE,
> runs SGP4, and returns ready-to-render lat/lon and map points.

---

## 10. TLE Refresh Cadence

TLE accuracy degrades over time, especially for LEO satellites.

| Prediction horizon        | TLE policy                                            |
| ------------------------- | ----------------------------------------------------- |
| Minutes → a few hours     | A recent TLE is sufficient                            |
| Days → weeks              | Refresh periodically (LEO: ≥ daily, ideally hourly)   |
| ~1 year                   | Do **not** use a single TLE; use a TLE time series or precise ephemeris |

General rule: refresh LEO TLEs **at least daily**, more often if the provider supports it.

---

## 11. Summary Flow

```
Third-party TLE
  → SGP4(target time)
  → TEME position / velocity
  → ECEF (rotate by GMST)
  → geodetic lat/lon/altitude (WGS84)
  → map x/y
  → marker / ground track / footprint
```

Prediction loop:

```
Fetch latest TLE
Run SGP4 for now, now+5m, now+10m, …
Convert each point to lat/lon
Connect points for ground track / show as prediction table
```

**Key takeaway:** The critical input is the TLE from a third-party provider. From it, SGP4
gives the satellite's TEME position at any time within the short-term prediction window;
convert TEME → ECEF → geodetic lat/lon/altitude. The ground track is a time-ordered series
of those positions joined together; the footprint is derived from the sub-satellite point
and the satellite altitude.

---

## Appendix — Common Mistakes to Avoid

1. Calling SGP4 output "ECI/J2000" — it is **TEME**. Rotate by GMST for tracking; only do the
   full TEME → ITRF chain when high precision is needed.
2. Displaying **geocentric** latitude on a map — convert to **geodetic** (WGS84); the error
   reaches ~0.2°.
3. Footprint with only the horizon (ε = 0°) formula — include the ε > 0° formula when a ground
   station requires a minimum elevation.
4. Forgetting **antimeridian (±180°)** wrapping for ground tracks and footprint polygons.
5. Plugging TLE values into a plain two-body **Kepler** model — TLE is only valid with **SGP4**.
