# Paly Campus Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the text-list MapScreen with an interactive, geo-referenced SVG campus map showing the user's live location.

**Architecture:** Building footprints are fetched once from OpenStreetMap by a committed script and baked into a generated TypeScript asset (projected to map x/y). A pure geo module owns the lat/lng→x/y transform used by both the asset generator and the live GPS dot, so they can never disagree. A `CampusMap` component renders the SVG with pan/zoom gestures; the rebuilt `MapScreen` adds search, building detail cards, and location status handling.

**Tech Stack:** Expo SDK 54, react-native-svg 15, react-native-gesture-handler 2.28, react-native-reanimated 4, expo-location (new), tsx + node:assert tests (no test framework in this repo).

**Spec:** `docs/superpowers/specs/2026-07-02-campus-map-design.md`

## Global Constraints

- `npm run check:types` must pass at the end of every task.
- No `console.log` in client production code (generation script under `scripts/` MAY log — it is a dev tool, not bundled).
- Immutable state updates only (spread, never mutate).
- Tests are plain `.test.ts` files using `node:assert/strict`, run directly: `npx tsx path/to/file.test.ts`. A silent exit (code 0) is a pass. Follow the style of `client/lib/passwordPolicy.test.ts`.
- Path alias `@/` maps to `client/` (existing convention).
- Commit messages: conventional commits (`feat:`, `test:`, `chore:`), no attribution footers.
- Location data never leaves the device — no analytics events, no server calls with coordinates.
- OSM data source facts (verified 2026-07-02 via Overpass): Paly campus boundary is OSM way **28571262**, bbox `minlat 37.43345, minlon -122.15960, maxlat 37.43817, maxlon -122.15194`. Named building ways exist for Media Arts Center (369801244), Tower Building (30721676), English Building (30721591), Science Building (30721624), Math and Social Studies Building (369801232), PAHS Library (572186352), Theater (30721702), Fine Arts Building (30721410), Language building (30721512), Shop Building (93483388), Small Gym (93483389), Woodshop (93493592), General Ed Building (93493593), swimming pool (28571251), Ray Field (369801734).

---

### Task 1: Geo transform module (`campusGeo`)

**Files:**
- Create: `client/lib/campusGeo.ts`
- Test: `client/lib/campusGeo.test.ts`

**Interfaces:**
- Consumes: nothing (pure module).
- Produces (used by Tasks 2, 4, 5):
  - `CAMPUS_BOUNDS: { latNorth: number; latSouth: number; lngWest: number; lngEast: number }`
  - `MAP_WIDTH: number` (1000), `MAP_HEIGHT: number` (~780, computed)
  - `interface MapPoint { x: number; y: number }`
  - `latLngToXY(lat: number, lng: number): MapPoint`
  - `isOnCampus(lat: number, lng: number, marginDeg?: number): boolean`
  - `metersToMapUnits(meters: number): number`

- [ ] **Step 1: Write the failing test**

Create `client/lib/campusGeo.test.ts`:

```ts
import assert from "node:assert/strict";

import {
  CAMPUS_BOUNDS,
  MAP_HEIGHT,
  MAP_WIDTH,
  isOnCampus,
  latLngToXY,
  metersToMapUnits,
} from "./campusGeo";

// Corners of the bounding box map to the corners of the canvas.
const nw = latLngToXY(CAMPUS_BOUNDS.latNorth, CAMPUS_BOUNDS.lngWest);
assert.equal(Math.round(nw.x), 0, "north-west corner should be x=0");
assert.equal(Math.round(nw.y), 0, "north-west corner should be y=0");

const se = latLngToXY(CAMPUS_BOUNDS.latSouth, CAMPUS_BOUNDS.lngEast);
assert.equal(Math.round(se.x), MAP_WIDTH, "south-east corner should be x=MAP_WIDTH");
assert.equal(Math.round(se.y), MAP_HEIGHT, "south-east corner should be y=MAP_HEIGHT");

// Aspect ratio: the canvas must not distort — height/width should equal the
// metric aspect of the bounding box (lat span vs lng span corrected by cos(lat)).
const midLatRad =
  ((CAMPUS_BOUNDS.latNorth + CAMPUS_BOUNDS.latSouth) / 2) * (Math.PI / 180);
const expectedAspect =
  (CAMPUS_BOUNDS.latNorth - CAMPUS_BOUNDS.latSouth) /
  ((CAMPUS_BOUNDS.lngEast - CAMPUS_BOUNDS.lngWest) * Math.cos(midLatRad));
assert.ok(
  Math.abs(MAP_HEIGHT / MAP_WIDTH - expectedAspect) < 0.01,
  "canvas aspect ratio should match metric campus aspect",
);

// North is up: a more northern latitude produces a smaller y.
const quad = latLngToXY(37.4371, -122.1561);
const pool = latLngToXY(37.43527, -122.1554);
assert.ok(quad.y < pool.y, "quad (north) should be above pool (south)");
assert.ok(quad.x < pool.x, "quad (west) should be left of pool (east)");

// On-campus checks: quad center is on campus, downtown Palo Alto is not.
assert.equal(isOnCampus(37.4371, -122.1561), true, "quad center is on campus");
assert.equal(isOnCampus(37.4443, -122.1607), false, "downtown PA is off campus");
assert.equal(isOnCampus(0, 0), false, "null island is off campus");

// Margin: a point just outside the box is accepted within the default margin.
assert.equal(
  isOnCampus(CAMPUS_BOUNDS.latNorth + 0.0003, -122.1561),
  true,
  "points within the margin band still count as on campus",
);
assert.equal(
  isOnCampus(CAMPUS_BOUNDS.latNorth + 0.001, -122.1561),
  false,
  "points beyond the margin band are off campus",
);

// metersToMapUnits: the campus is ~741 m wide and MAP_WIDTH units across,
// so 100 m should be roughly 135 map units (sanity range check).
const hundred = metersToMapUnits(100);
assert.ok(hundred > 120 && hundred < 150, `100m ≈ 135 units, got ${hundred}`);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx client/lib/campusGeo.test.ts`
Expected: FAIL — `Cannot find module './campusGeo'`

- [ ] **Step 3: Write the implementation**

Create `client/lib/campusGeo.ts`:

```ts
// Geo-referencing for the Paly campus map. The campus is small enough
// (~740 m x ~580 m) that a linear equirectangular projection is accurate
// to well under GPS error, so both the generated building polygons and
// the live GPS dot go through this same transform.

export const CAMPUS_BOUNDS = {
  latNorth: 37.4384,
  latSouth: 37.4332,
  lngWest: -122.16,
  lngEast: -122.1516,
} as const;

const LAT_SPAN = CAMPUS_BOUNDS.latNorth - CAMPUS_BOUNDS.latSouth;
const LNG_SPAN = CAMPUS_BOUNDS.lngEast - CAMPUS_BOUNDS.lngWest;
const MID_LAT_RAD =
  ((CAMPUS_BOUNDS.latNorth + CAMPUS_BOUNDS.latSouth) / 2) * (Math.PI / 180);

// Meters per degree (WGS-84 approximation, fine at this scale).
const METERS_PER_DEG_LAT = 111_320;
const METERS_PER_DEG_LNG = 111_320 * Math.cos(MID_LAT_RAD);

export const MAP_WIDTH = 1000;
export const MAP_HEIGHT = Math.round(
  (MAP_WIDTH * LAT_SPAN * METERS_PER_DEG_LAT) / (LNG_SPAN * METERS_PER_DEG_LNG),
);

export interface MapPoint {
  x: number;
  y: number;
}

export function latLngToXY(lat: number, lng: number): MapPoint {
  return {
    x: ((lng - CAMPUS_BOUNDS.lngWest) / LNG_SPAN) * MAP_WIDTH,
    y: ((CAMPUS_BOUNDS.latNorth - lat) / LAT_SPAN) * MAP_HEIGHT,
  };
}

// Default margin (~0.0004° ≈ 45 m) forgives GPS drift at the campus edge.
export function isOnCampus(
  lat: number,
  lng: number,
  marginDeg = 0.0004,
): boolean {
  return (
    lat >= CAMPUS_BOUNDS.latSouth - marginDeg &&
    lat <= CAMPUS_BOUNDS.latNorth + marginDeg &&
    lng >= CAMPUS_BOUNDS.lngWest - marginDeg &&
    lng <= CAMPUS_BOUNDS.lngEast + marginDeg
  );
}

export function metersToMapUnits(meters: number): number {
  const campusWidthMeters = LNG_SPAN * METERS_PER_DEG_LNG;
  return (meters / campusWidthMeters) * MAP_WIDTH;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx client/lib/campusGeo.test.ts`
Expected: PASS (silent exit, code 0)

- [ ] **Step 5: Typecheck and commit**

```bash
npm run check:types
git add client/lib/campusGeo.ts client/lib/campusGeo.test.ts
git commit -m "feat: add campus geo transform module for map"
```

---

### Task 2: Campus areas module + map data generation script + generated asset

**Files:**
- Create: `client/lib/campusAreas.ts` (data moved out of MapScreen)
- Create: `scripts/generate-campus-map.ts` (dev tool, not bundled)
- Create: `client/assets/campus-buildings.ts` (generated output, committed)
- Modify: `client/screens/MapScreen.tsx` (only the `CAMPUS_AREAS` import — full rebuild happens in Task 6)
- Test: `client/assets/campus-buildings.test.ts`

**Interfaces:**
- Consumes: `latLngToXY`, `MAP_WIDTH`, `MAP_HEIGHT` from `client/lib/campusGeo.ts` (Task 1).
- Produces:
  - `client/lib/campusAreas.ts`: `interface CampusArea { id: string; name: string; rooms: string[]; description: string }` and `CAMPUS_AREAS: CampusArea[]` (same 11 entries currently in MapScreen).
  - `client/assets/campus-buildings.ts` (generated, no imports, self-contained):
    - `type CampusFeatureKind = "building" | "field" | "court" | "pool" | "track" | "garden" | "quad"`
    - `interface CampusFeature { id: string | null; osmId: number; name: string | null; kind: CampusFeatureKind; points: [number, number][]; centroid: [number, number] }` — `id` is a `CampusArea` id when the feature is tappable, `null` for decorative features; `points`/`centroid` are already-projected map x/y.
    - `CAMPUS_OUTLINE: [number, number][]` — projected campus boundary polygon.
    - `CAMPUS_FEATURES: CampusFeature[]`

- [ ] **Step 1: Extract campus areas data**

Create `client/lib/campusAreas.ts` by moving the `CAMPUS_AREAS` array verbatim from `client/screens/MapScreen.tsx:17-85`, adding the type and exports:

```ts
export interface CampusArea {
  id: string;
  name: string;
  rooms: string[];
  description: string;
}

// Paly campus buildings/areas
export const CAMPUS_AREAS: CampusArea[] = [
  // ... the 11 entries copied verbatim from MapScreen.tsx (mac, pac, tower,
  // library, science, socialscience, main, gym, pool, quad, office)
];
```

In `client/screens/MapScreen.tsx`, delete the local `CAMPUS_AREAS` array and add:

```ts
import { CAMPUS_AREAS } from "@/lib/campusAreas";
```

Run: `npm run check:types` — Expected: PASS.

- [ ] **Step 2: Write the parity test (failing)**

Create `client/assets/campus-buildings.test.ts`:

```ts
import assert from "node:assert/strict";

import { MAP_HEIGHT, MAP_WIDTH } from "../lib/campusGeo";
import { CAMPUS_AREAS } from "../lib/campusAreas";
import { CAMPUS_FEATURES, CAMPUS_OUTLINE } from "./campus-buildings";

// Every tappable area in the app has a polygon on the map, and vice versa.
const featureIds = new Set(
  CAMPUS_FEATURES.filter((f) => f.id !== null).map((f) => f.id),
);
for (const area of CAMPUS_AREAS) {
  assert.ok(featureIds.has(area.id), `no map polygon for area "${area.id}"`);
}
for (const id of featureIds) {
  assert.ok(
    CAMPUS_AREAS.some((a) => a.id === id),
    `map polygon "${id}" has no CAMPUS_AREAS entry`,
  );
}

// All geometry sits inside the canvas.
const allPoints = [
  ...CAMPUS_OUTLINE,
  ...CAMPUS_FEATURES.flatMap((f) => f.points),
  ...CAMPUS_FEATURES.map((f) => f.centroid),
];
for (const [x, y] of allPoints) {
  assert.ok(x >= 0 && x <= MAP_WIDTH, `x out of bounds: ${x}`);
  assert.ok(y >= 0 && y <= MAP_HEIGHT, `y out of bounds: ${y}`);
}

// Polygons are real polygons.
for (const f of CAMPUS_FEATURES) {
  assert.ok(f.points.length >= 3, `feature ${f.osmId} has <3 points`);
}
assert.ok(CAMPUS_OUTLINE.length >= 4, "outline should be a real polygon");
assert.ok(CAMPUS_FEATURES.length >= 20, "expected substantial campus coverage");
```

Run: `npx tsx client/assets/campus-buildings.test.ts`
Expected: FAIL — `Cannot find module './campus-buildings'`

- [ ] **Step 3: Write the generation script**

Create `scripts/generate-campus-map.ts`. Complete code:

```ts
// One-time generator for client/assets/campus-buildings.ts.
// Fetches Paly building/field footprints from OpenStreetMap (Overpass API),
// projects them with the same transform the app uses for the GPS dot,
// and writes a self-contained TypeScript asset.
//
// Run: npx tsx scripts/generate-campus-map.ts

import { writeFileSync } from "node:fs";

import { CAMPUS_AREAS } from "../client/lib/campusAreas";
import { latLngToXY } from "../client/lib/campusGeo";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const USER_AGENT =
  "paly-journalism-app-map-generator/1.0 (school app; one-time build script)";
const PALY_BOUNDARY_WAY_ID = 28571262;
// Slightly padded campus bbox (from the boundary way's bounds).
const BBOX = "37.4330,-122.1600,37.4386,-122.1515";

// Verified OSM way id -> app CampusArea id. Ways not listed here render as
// decorative (non-tappable) shapes. If validation fails, the script prints
// every fetched feature with its name and center so this table can be fixed.
const AREA_BY_OSM_ID: Record<number, string> = {
  369801244: "mac", // "Media Arts Center"
  30721702: "pac", // "Theater"
  30721676: "tower", // "Tower Building"
  572186352: "library", // "PAHS Library"
  30721624: "science", // "Science Building"
  369801232: "socialscience", // "Math and Social Studies Building"
  30721591: "main", // "English Building"
  30721366: "gym", // large unnamed building=school west of Science
  28571251: "pool", // leisure=swimming_pool
  93493591: "office", // unnamed building=school between Library and English
};

// The quad has no OSM feature; it is the open space ringed by the Library,
// English and Language buildings. Hand-defined corners (lat, lng).
const QUAD_LATLNG: [number, number][] = [
  [37.4372, -122.15645],
  [37.4372, -122.15585],
  [37.437, -122.15585],
  [37.437, -122.15645],
];

type Kind = "building" | "field" | "court" | "pool" | "track" | "garden" | "quad";

interface OsmWay {
  type: string;
  id: number;
  tags?: Record<string, string>;
  geometry?: { lat: number; lon: number }[];
}

function kindFor(tags: Record<string, string>): Kind | null {
  if (tags.building === "roof") return null; // covered walkways — visual noise
  if (tags.building) return "building";
  switch (tags.leisure) {
    case "swimming_pool":
      return "pool";
    case "track":
      return "track";
    case "garden":
    case "park":
      return "garden";
    case "pitch":
    case "stadium":
      return ["tennis", "basketball"].includes(tags.sport ?? "")
        ? "court"
        : "field";
    default:
      return null;
  }
}

function centroidOf(points: [number, number][]): [number, number] {
  const sx = points.reduce((acc, p) => acc + p[0], 0);
  const sy = points.reduce((acc, p) => acc + p[1], 0);
  return [round(sx / points.length), round(sy / points.length)];
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

function project(geometry: { lat: number; lon: number }[]): [number, number][] {
  return geometry.map((g) => {
    const { x, y } = latLngToXY(g.lat, g.lon);
    return [round(x), round(y)] as [number, number];
  });
}

// Ray-casting point-in-polygon, used to keep only features inside the
// campus boundary (the bbox also catches neighboring houses and Stanford).
function insidePolygon(
  point: [number, number],
  polygon: [number, number][],
): boolean {
  const [px, py] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersects =
      yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

async function overpass(query: string): Promise<OsmWay[]> {
  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    body: "data=" + encodeURIComponent(query),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": USER_AGENT,
    },
  });
  if (!res.ok) {
    throw new Error(`Overpass request failed: HTTP ${res.status}`);
  }
  const json = (await res.json()) as { elements: OsmWay[] };
  return json.elements;
}

async function main() {
  const [boundary] = await overpass(
    `[out:json][timeout:60];way(${PALY_BOUNDARY_WAY_ID});out geom;`,
  );
  if (!boundary?.geometry) {
    throw new Error("Could not fetch Paly boundary way from OSM");
  }
  const outline = project(boundary.geometry);
  const outlineLatLng: [number, number][] = boundary.geometry.map((g) => [
    g.lat,
    g.lon,
  ]);

  const ways = await overpass(
    `[out:json][timeout:60];(way["building"](${BBOX});way["leisure"](${BBOX}););out geom;`,
  );

  const features = ways
    .filter((w) => w.geometry && w.tags)
    .map((w) => {
      const tags = w.tags as Record<string, string>;
      const kind = kindFor(tags);
      if (!kind) return null;
      const latLngCentroid: [number, number] = [
        w.geometry!.reduce((a, g) => a + g.lat, 0) / w.geometry!.length,
        w.geometry!.reduce((a, g) => a + g.lon, 0) / w.geometry!.length,
      ];
      if (!insidePolygon(latLngCentroid, outlineLatLng)) return null;
      const points = project(w.geometry!);
      return {
        id: AREA_BY_OSM_ID[w.id] ?? null,
        osmId: w.id,
        name: tags.name ?? null,
        kind,
        points,
        centroid: centroidOf(points),
      };
    })
    .filter((f): f is NonNullable<typeof f> => f !== null);

  const quadPoints = QUAD_LATLNG.map((p) => {
    const { x, y } = latLngToXY(p[0], p[1]);
    return [round(x), round(y)] as [number, number];
  });
  const allFeatures = [
    ...features,
    {
      id: "quad",
      osmId: 0,
      name: "Quad",
      kind: "quad" as Kind,
      points: quadPoints,
      centroid: centroidOf(quadPoints),
    },
  ];

  // Validate: every app area must have exactly one polygon.
  const mappedIds = allFeatures.filter((f) => f.id).map((f) => f.id);
  const missing = CAMPUS_AREAS.filter((a) => !mappedIds.includes(a.id));
  const dupes = mappedIds.filter((id, i) => mappedIds.indexOf(id) !== i);
  if (missing.length > 0 || dupes.length > 0) {
    console.error("VALIDATION FAILED");
    console.error("Missing area ids:", missing.map((a) => a.id));
    console.error("Duplicate area ids:", dupes);
    console.error("\nFetched features (fix AREA_BY_OSM_ID using this list):");
    for (const f of allFeatures) {
      console.error(
        `  osm=${f.osmId} kind=${f.kind} name=${JSON.stringify(f.name)} centroid=${JSON.stringify(f.centroid)}`,
      );
    }
    process.exit(1);
  }

  const header = `// AUTO-GENERATED by scripts/generate-campus-map.ts — do not edit by hand.
// Source: OpenStreetMap (ODbL), Paly campus = way ${PALY_BOUNDARY_WAY_ID}.
// Coordinates are map x/y projected via client/lib/campusGeo.ts.

export type CampusFeatureKind =
  | "building"
  | "field"
  | "court"
  | "pool"
  | "track"
  | "garden"
  | "quad";

export interface CampusFeature {
  /** CampusArea id when tappable, null for decorative shapes. */
  id: string | null;
  osmId: number;
  name: string | null;
  kind: CampusFeatureKind;
  points: [number, number][];
  centroid: [number, number];
}
`;
  const body =
    `export const CAMPUS_OUTLINE: [number, number][] = ${JSON.stringify(outline)};\n\n` +
    `export const CAMPUS_FEATURES: CampusFeature[] = ${JSON.stringify(allFeatures, null, 2)};\n`;
  writeFileSync("client/assets/campus-buildings.ts", header + "\n" + body);
  console.log(
    `Wrote ${allFeatures.length} features (+outline of ${outline.length} points)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 4: Run the generator**

Run: `npx tsx scripts/generate-campus-map.ts`
Expected: `Wrote N features (+outline of M points)` with N ≥ 20, and `client/assets/campus-buildings.ts` created.

If it prints `VALIDATION FAILED`: the two speculative entries in `AREA_BY_OSM_ID` are `gym: 30721366` and `office: 93493591` (unnamed in OSM). Use the printed feature list (names + centroids) to pick the correct osm ids — the gym complex is the large building near centroid lat 37.4362, lng -122.1567 (map x ≈ 393, y ≈ 511) and the main office sits between the Library and English Building (~lat 37.4375, lng -122.1563). Update `AREA_BY_OSM_ID` and re-run. Do NOT loosen the validation.

- [ ] **Step 5: Run parity test and prettier**

```bash
npx tsx client/assets/campus-buildings.test.ts
npx prettier --write client/assets/campus-buildings.ts scripts/generate-campus-map.ts client/lib/campusAreas.ts
npm run check:types
```
Expected: test passes, typecheck passes.

- [ ] **Step 6: Commit**

```bash
git add client/lib/campusAreas.ts scripts/generate-campus-map.ts client/assets/campus-buildings.ts client/assets/campus-buildings.test.ts client/screens/MapScreen.tsx
git commit -m "feat: generate geo-referenced Paly campus map data from OSM"
```

---

### Task 3: expo-location dependency + permissions config

**Files:**
- Modify: `package.json` (via `npx expo install`)
- Modify: `app.json` (plugins array)

**Interfaces:**
- Produces: `expo-location` importable; iOS/Android when-in-use location permission strings configured (used by Task 4).

- [ ] **Step 1: Install expo-location**

Run: `npx expo install expo-location`
Expected: adds `"expo-location": "~19.x"` (SDK-54-matched version) to package.json.

- [ ] **Step 2: Add the config plugin**

In `app.json`, inside the existing `"plugins"` array (after `"expo-web-browser"`), add:

```json
[
  "expo-location",
  {
    "locationWhenInUsePermission": "Your location is used only to show where you are on the Paly campus map. It never leaves your device.",
    "isAndroidBackgroundLocationEnabled": false
  }
]
```

- [ ] **Step 3: Verify and commit**

```bash
npm run check:types
git add package.json package-lock.json app.json
git commit -m "chore: add expo-location with when-in-use permission strings"
```

---

### Task 4: `useCampusLocation` hook

**Files:**
- Create: `client/hooks/useCampusLocation.ts`

**Interfaces:**
- Consumes: `expo-location` (Task 3); `isOnCampus`, `latLngToXY`, `MapPoint` from `@/lib/campusGeo` (Task 1).
- Produces (used by Tasks 5 and 6):

```ts
export type CampusLocationStatus =
  | "loading"      // permission being requested / first fix pending
  | "denied"       // permission denied
  | "unavailable"  // location services off or watch failed
  | "off-campus"   // fix received, outside campus bounds
  | "on-campus";   // fix received, inside campus bounds

export interface CampusLocation {
  status: CampusLocationStatus;
  point: MapPoint | null;          // map x/y — non-null only when on-campus
  accuracyMeters: number | null;   // non-null only when on-campus
}

export function useCampusLocation(): CampusLocation;
```

No unit test: the hook is a thin adapter over the native `expo-location` module, which cannot run under `tsx`; all decision logic (`isOnCampus`, `latLngToXY`) is already covered by Task 1's tests. Verified by typecheck here and manually in Task 7.

- [ ] **Step 1: Write the hook**

Create `client/hooks/useCampusLocation.ts`:

```ts
import { useEffect, useState } from "react";
import * as Location from "expo-location";

import { isOnCampus, latLngToXY, MapPoint } from "@/lib/campusGeo";

export type CampusLocationStatus =
  | "loading"
  | "denied"
  | "unavailable"
  | "off-campus"
  | "on-campus";

export interface CampusLocation {
  status: CampusLocationStatus;
  point: MapPoint | null;
  accuracyMeters: number | null;
}

const INITIAL: CampusLocation = {
  status: "loading",
  point: null,
  accuracyMeters: null,
};

function toCampusLocation(coords: {
  latitude: number;
  longitude: number;
  accuracy: number | null;
}): CampusLocation {
  if (!isOnCampus(coords.latitude, coords.longitude)) {
    return { status: "off-campus", point: null, accuracyMeters: null };
  }
  return {
    status: "on-campus",
    point: latLngToXY(coords.latitude, coords.longitude),
    accuracyMeters: coords.accuracy,
  };
}

// Watches the device position while the consuming screen is mounted.
// Foreground-only; the subscription is removed on unmount. Location data
// stays on-device — it is never sent to the server or analytics.
export function useCampusLocation(): CampusLocation {
  const [location, setLocation] = useState<CampusLocation>(INITIAL);

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    let cancelled = false;

    async function start() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        if (status !== Location.PermissionStatus.GRANTED) {
          setLocation({ status: "denied", point: null, accuracyMeters: null });
          return;
        }
        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 3000,
            distanceInterval: 3,
          },
          (position) => {
            setLocation(toCampusLocation(position.coords));
          },
        );
      } catch {
        if (!cancelled) {
          setLocation({
            status: "unavailable",
            point: null,
            accuracyMeters: null,
          });
        }
      }
    }

    start();
    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, []);

  return location;
}
```

- [ ] **Step 2: Typecheck and commit**

```bash
npm run check:types
git add client/hooks/useCampusLocation.ts
git commit -m "feat: add useCampusLocation hook for on-campus positioning"
```

---

### Task 5: `CampusMap` component (SVG render, pan/zoom, tap, location dot)

**Files:**
- Create: `client/components/CampusMap.tsx`

**Interfaces:**
- Consumes: `CAMPUS_FEATURES`, `CAMPUS_OUTLINE`, `CampusFeature` from `@/assets/campus-buildings` (Task 2); `MAP_WIDTH`, `MAP_HEIGHT`, `metersToMapUnits` from `@/lib/campusGeo` (Task 1); `CampusLocation` from `@/hooks/useCampusLocation` (Task 4).
- Produces (used by Task 6):

```ts
export interface CampusMapHandle {
  /** Animate the viewport to center on map coords (x, y). */
  centerOn(x: number, y: number): void;
}

interface CampusMapProps {
  selectedAreaId: string | null;
  onSelectArea: (id: string | null) => void;
  location: CampusLocation;
}

const CampusMap: React.ForwardRefExoticComponent<
  CampusMapProps & React.RefAttributes<CampusMapHandle>
>;
export default CampusMap;
```

- [ ] **Step 1: Write the component**

Create `client/components/CampusMap.tsx`:

```tsx
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import { StyleSheet, View, LayoutChangeEvent } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, G, Polygon, Text as SvgText } from "react-native-svg";

import {
  CAMPUS_FEATURES,
  CAMPUS_OUTLINE,
  CampusFeature,
} from "@/assets/campus-buildings";
import { CampusLocation } from "@/hooks/useCampusLocation";
import { MAP_HEIGHT, MAP_WIDTH, metersToMapUnits } from "@/lib/campusGeo";
import { useTheme } from "@/hooks/useTheme";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Map palette anchored to the app's cream/brown identity.
const PALETTE = {
  light: {
    canvas: "#F6F1F0",
    campus: "#EFE7E3",
    building: "#B1998A",
    buildingSelected: "#7C5F4E",
    quad: "#D9E4CF",
    field: "#B7CDA8",
    court: "#D4C4A4",
    pool: "#A6C8DC",
    track: "#D0A493",
    garden: "#C6D6B8",
    stroke: "rgba(0,0,0,0.12)",
    label: "#4A3F38",
    dot: "#2E7CF6",
    dotHalo: "rgba(46,124,246,0.18)",
  },
  dark: {
    canvas: "#1F2123",
    campus: "#26292B",
    building: "#8A7365",
    buildingSelected: "#C4A891",
    quad: "#33402E",
    field: "#2F3E2A",
    court: "#4A4030",
    pool: "#28414F",
    track: "#4A322A",
    garden: "#33402E",
    stroke: "rgba(255,255,255,0.10)",
    label: "#ECEDEE",
    dot: "#4C93FF",
    dotHalo: "rgba(76,147,255,0.20)",
  },
} as const;

function fillFor(
  feature: CampusFeature,
  selected: boolean,
  colors: (typeof PALETTE)["light"],
): string {
  if (selected) return colors.buildingSelected;
  switch (feature.kind) {
    case "building":
      return colors.building;
    case "quad":
      return colors.quad;
    case "field":
      return colors.field;
    case "court":
      return colors.court;
    case "pool":
      return colors.pool;
    case "track":
      return colors.track;
    case "garden":
      return colors.garden;
  }
}

function toSvgPoints(points: [number, number][]): string {
  return points.map(([x, y]) => `${x},${y}`).join(" ");
}

const MAX_ZOOM_FACTOR = 6; // relative to fit-to-screen scale

export interface CampusMapHandle {
  centerOn(x: number, y: number): void;
}

interface CampusMapProps {
  selectedAreaId: string | null;
  onSelectArea: (id: string | null) => void;
  location: CampusLocation;
}

const CampusMap = forwardRef<CampusMapHandle, CampusMapProps>(
  function CampusMap({ selectedAreaId, onSelectArea, location }, ref) {
    const { isDark } = useTheme();
    const colors = isDark ? PALETTE.dark : PALETTE.light;

    const [container, setContainer] = useState({ width: 0, height: 0 });
    const fitScale =
      container.width > 0
        ? Math.min(container.width / MAP_WIDTH, container.height / MAP_HEIGHT)
        : 1;

    const scale = useSharedValue(1);
    const tx = useSharedValue(0);
    const ty = useSharedValue(0);
    const pulse = useSharedValue(0);
    const initialized = useSharedValue(false);

    // Fit and center the campus once the container is measured.
    useEffect(() => {
      if (container.width === 0 || initialized.value) return;
      scale.value = fitScale;
      tx.value = (container.width - MAP_WIDTH * fitScale) / 2;
      ty.value = (container.height - MAP_HEIGHT * fitScale) / 2;
      initialized.value = true;
    }, [container, fitScale, initialized, scale, tx, ty]);

    useEffect(() => {
      pulse.value = withRepeat(withTiming(1, { duration: 1600 }), -1, false);
    }, [pulse]);

    const clampViewport = useCallback(() => {
      "worklet";
      const w = MAP_WIDTH * scale.value;
      const h = MAP_HEIGHT * scale.value;
      // Keep at least 1/3 of the map on screen in each axis.
      const minTx = Math.min(container.width - w, container.width / 3 - w);
      const maxTx = Math.max(0, (container.width * 2) / 3);
      const minTy = Math.min(container.height - h, container.height / 3 - h);
      const maxTy = Math.max(0, (container.height * 2) / 3);
      if (tx.value < minTx) tx.value = withTiming(minTx);
      if (tx.value > maxTx) tx.value = withTiming(maxTx);
      if (ty.value < minTy) ty.value = withTiming(minTy);
      if (ty.value > maxTy) ty.value = withTiming(maxTy);
    }, [container, scale, tx, ty]);

    const pan = Gesture.Pan()
      .averageTouches(true)
      .onChange((e) => {
        tx.value += e.changeX;
        ty.value += e.changeY;
      })
      .onEnd(clampViewport);

    const pinch = Gesture.Pinch()
      .onChange((e) => {
        const next = Math.min(
          Math.max(scale.value * e.scaleChange, fitScale * 0.8),
          fitScale * MAX_ZOOM_FACTOR,
        );
        const factor = next / scale.value;
        // Zoom around the pinch focal point.
        tx.value = e.focalX - factor * (e.focalX - tx.value);
        ty.value = e.focalY - factor * (e.focalY - ty.value);
        scale.value = next;
      })
      .onEnd(clampViewport);

    const composed = Gesture.Simultaneous(pan, pinch);

    const mapStyle = useAnimatedStyle(() => ({
      transform: [
        { translateX: tx.value },
        { translateY: ty.value },
        { scale: scale.value },
      ],
    }));

    useImperativeHandle(ref, () => ({
      centerOn(x: number, y: number) {
        const targetScale = Math.max(scale.value, fitScale * 2);
        scale.value = withTiming(targetScale);
        tx.value = withTiming(container.width / 2 - x * targetScale);
        ty.value = withTiming(container.height / 2 - y * targetScale);
      },
    }));

    const pulseProps = useAnimatedProps(() => ({
      r: 10 + pulse.value * 14,
      opacity: 0.5 * (1 - pulse.value),
    }));

    const onLayout = (e: LayoutChangeEvent) => {
      const { width, height } = e.nativeEvent.layout;
      setContainer({ width, height });
    };

    const dot = location.status === "on-campus" ? location.point : null;
    const haloRadius =
      location.accuracyMeters !== null
        ? Math.max(metersToMapUnits(location.accuracyMeters), 12)
        : 0;

    return (
      <View
        style={[styles.container, { backgroundColor: colors.canvas }]}
        onLayout={onLayout}
      >
        <GestureDetector gesture={composed}>
          <Animated.View
            style={[
              styles.map,
              { transformOrigin: "top left" },
              mapStyle,
            ]}
          >
            <Svg
              width={MAP_WIDTH}
              height={MAP_HEIGHT}
              viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
            >
              <Polygon
                points={toSvgPoints(CAMPUS_OUTLINE)}
                fill={colors.campus}
                stroke={colors.stroke}
                strokeWidth={2}
              />
              <G>
                {CAMPUS_FEATURES.map((feature) => (
                  <Polygon
                    key={feature.osmId || feature.id || undefined}
                    points={toSvgPoints(feature.points)}
                    fill={fillFor(feature, feature.id === selectedAreaId, colors)}
                    stroke={colors.stroke}
                    strokeWidth={1}
                    onPress={
                      feature.id
                        ? () => onSelectArea(feature.id)
                        : undefined
                    }
                  />
                ))}
              </G>
              <G>
                {CAMPUS_FEATURES.filter((f) => f.id && f.name).map((f) => (
                  <SvgText
                    key={`label-${f.osmId}-${f.id}`}
                    x={f.centroid[0]}
                    y={f.centroid[1]}
                    fontSize={15}
                    fontWeight="600"
                    fill={colors.label}
                    textAnchor="middle"
                  >
                    {f.name}
                  </SvgText>
                ))}
              </G>
              {dot ? (
                <G>
                  {haloRadius > 0 ? (
                    <Circle
                      cx={dot.x}
                      cy={dot.y}
                      r={haloRadius}
                      fill={colors.dotHalo}
                    />
                  ) : null}
                  <AnimatedCircle
                    cx={dot.x}
                    cy={dot.y}
                    fill={colors.dot}
                    animatedProps={pulseProps}
                  />
                  <Circle
                    cx={dot.x}
                    cy={dot.y}
                    r={8}
                    fill={colors.dot}
                    stroke="#FFFFFF"
                    strokeWidth={3}
                  />
                </G>
              ) : null}
            </Svg>
          </Animated.View>
        </GestureDetector>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
  },
  map: {
    position: "absolute",
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
  },
});

export default CampusMap;
```

Notes for the implementer:
- `transformOrigin: "top left"` is required — RN transforms default to the view center, which breaks the focal-point zoom math. It is supported on RN 0.81 (Expo 54, new architecture enabled in this app).
- Polygon `onPress` works in react-native-svg and coexists with the pan gesture (taps involve no movement, so the Pan gesture does not claim them).
- If `npm run check:types` complains that `clampViewport` (a worklet) is passed to `onEnd` with mismatched args, wrap it: `.onEnd(() => clampViewport())`.

- [ ] **Step 2: Typecheck, lint, commit**

```bash
npm run check:types
npm run lint
git add client/components/CampusMap.tsx
git commit -m "feat: add CampusMap SVG component with pan/zoom and location dot"
```

---

### Task 6: Rebuild `MapScreen`

**Files:**
- Rewrite: `client/screens/MapScreen.tsx`

**Interfaces:**
- Consumes: `CampusMap` + `CampusMapHandle` (Task 5), `useCampusLocation` (Task 4), `CAMPUS_AREAS` from `@/lib/campusAreas` (Task 2), `CAMPUS_FEATURES` (Task 2).
- Produces: default-exported screen component, drop-in for the existing navigator registrations (`MapStackNavigator`, `DashboardStackNavigator`) — no navigation changes.

- [ ] **Step 1: Rewrite the screen**

Replace the contents of `client/screens/MapScreen.tsx` with:

```tsx
import React, { useMemo, useRef, useState } from "react";
import {
  Linking,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";

import { CAMPUS_FEATURES } from "@/assets/campus-buildings";
import CampusMap, { CampusMapHandle } from "@/components/CampusMap";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { BorderRadius, Spacing } from "@/constants/theme";
import { useCampusLocation } from "@/hooks/useCampusLocation";
import { useTheme } from "@/hooks/useTheme";
import { CAMPUS_AREAS, CampusArea } from "@/lib/campusAreas";

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme, isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const mapRef = useRef<CampusMapHandle>(null);
  const location = useCampusLocation();

  const matches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length === 0) return [];
    return CAMPUS_AREAS.filter(
      (area) =>
        area.name.toLowerCase().includes(q) ||
        area.rooms.some((room) => room.toLowerCase().includes(q)) ||
        area.description.toLowerCase().includes(q),
    ).slice(0, 4);
  }, [searchQuery]);

  const selectedArea: CampusArea | null =
    CAMPUS_AREAS.find((a) => a.id === selectedAreaId) ?? null;

  const selectArea = (id: string | null) => {
    setSelectedAreaId(id);
    if (id === null) return;
    const feature = CAMPUS_FEATURES.find((f) => f.id === id);
    if (feature) {
      mapRef.current?.centerOn(feature.centroid[0], feature.centroid[1]);
    }
  };

  const onPickSearchResult = (area: CampusArea) => {
    setSearchQuery("");
    selectArea(area.id);
  };

  const onLocatePress = () => {
    if (location.status === "on-campus" && location.point) {
      mapRef.current?.centerOn(location.point.x, location.point.y);
    }
  };

  const statusPill = (() => {
    switch (location.status) {
      case "denied":
        return { text: "Location off — tap to enable", openSettings: true };
      case "off-campus":
        return { text: "You're not on campus", openSettings: false };
      case "unavailable":
        return { text: "Location unavailable", openSettings: false };
      default:
        return null;
    }
  })();

  return (
    <ThemedView style={styles.container}>
      <CampusMap
        ref={mapRef}
        selectedAreaId={selectedAreaId}
        onSelectArea={selectArea}
        location={location}
      />

      {/* Search overlay */}
      <View
        style={[
          styles.searchContainer,
          { paddingTop: headerHeight + Spacing.md },
        ]}
        pointerEvents="box-none"
      >
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: isDark
                ? "rgba(30,30,30,0.92)"
                : "rgba(255,255,255,0.92)",
            },
          ]}
        >
          <Feather name="search" size={18} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Find a building or room…"
            placeholderTextColor={theme.placeholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
          />
          {searchQuery.length > 0 ? (
            <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
              <Feather name="x" size={18} color={theme.textSecondary} />
            </Pressable>
          ) : null}
        </View>
        {matches.map((area) => (
          <Pressable
            key={area.id}
            onPress={() => onPickSearchResult(area)}
            style={[
              styles.searchResult,
              {
                backgroundColor: isDark
                  ? "rgba(30,30,30,0.92)"
                  : "rgba(255,255,255,0.92)",
              },
            ]}
          >
            <ThemedText type="defaultSemiBold">{area.name}</ThemedText>
            <ThemedText style={{ color: theme.textSecondary }} numberOfLines={1}>
              {area.description}
            </ThemedText>
          </Pressable>
        ))}
        {statusPill ? (
          <Pressable
            onPress={statusPill.openSettings ? Linking.openSettings : undefined}
            style={[
              styles.statusPill,
              {
                backgroundColor: isDark
                  ? "rgba(30,30,30,0.92)"
                  : "rgba(255,255,255,0.92)",
              },
            ]}
          >
            <Feather name="navigation" size={14} color={theme.textSecondary} />
            <ThemedText style={{ color: theme.textSecondary, fontSize: 13 }}>
              {statusPill.text}
            </ThemedText>
          </Pressable>
        ) : null}
      </View>

      {/* Locate-me button */}
      <Pressable
        onPress={onLocatePress}
        disabled={location.status !== "on-campus"}
        style={[
          styles.locateButton,
          {
            bottom:
              insets.bottom + (selectedArea ? 190 : Spacing.xl),
            backgroundColor: isDark
              ? "rgba(30,30,30,0.95)"
              : "rgba(255,255,255,0.95)",
            opacity: location.status === "on-campus" ? 1 : 0.4,
          },
        ]}
      >
        <Feather
          name="crosshair"
          size={22}
          color={location.status === "on-campus" ? theme.link : theme.textSecondary}
        />
      </Pressable>

      {/* Building detail card */}
      {selectedArea ? (
        <View
          style={[
            styles.detailCard,
            {
              paddingBottom: insets.bottom + Spacing.lg,
              backgroundColor: isDark
                ? "rgba(30,30,30,0.97)"
                : "rgba(255,255,255,0.97)",
            },
          ]}
        >
          <View style={styles.detailHeader}>
            <ThemedText type="subtitle">{selectedArea.name}</ThemedText>
            <Pressable onPress={() => setSelectedAreaId(null)} hitSlop={8}>
              <Feather name="x" size={20} color={theme.textSecondary} />
            </Pressable>
          </View>
          <ThemedText style={{ color: theme.textSecondary }}>
            {selectedArea.description}
          </ThemedText>
          {selectedArea.rooms.length > 0 ? (
            <View style={styles.roomsRow}>
              {selectedArea.rooms.map((room) => (
                <View
                  key={room}
                  style={[
                    styles.roomChip,
                    {
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.08)"
                        : "rgba(0,0,0,0.05)",
                    },
                  ]}
                >
                  <ThemedText style={{ fontSize: 13 }}>{room}</ThemedText>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Spacing.xs,
  },
  searchResult: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xl,
  },
  locateButton: {
    position: "absolute",
    right: Spacing.lg,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  detailCard: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    gap: Spacing.sm,
  },
  detailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  roomsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  roomChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
});
```

Adjustment notes for the implementer:
- Verify `ThemedText` supports `type="subtitle"` / `type="defaultSemiBold"` (check `client/components/ThemedText.tsx`); if the prop names differ, use the existing equivalents.
- Verify the keys used off `theme` (`text`, `textSecondary`, `placeholder`, `link`) exist — they are defined in `client/constants/theme.ts` `Colors`. If `useTheme()`'s `theme` object exposes different key names, match them.
- If `BorderRadius.xl` / `Spacing.xs` etc. don't exist, substitute the nearest defined constants from `client/constants/theme.ts` (read the file first).

- [ ] **Step 2: Typecheck, lint, run all tests**

```bash
npm run check:types
npm run lint
npx tsx client/lib/campusGeo.test.ts
npx tsx client/assets/campus-buildings.test.ts
npx tsx client/lib/passwordPolicy.test.ts
```
Expected: all PASS.

- [ ] **Step 3: Commit**

```bash
git add client/screens/MapScreen.tsx
git commit -m "feat: rebuild MapScreen around interactive campus map"
```

---

### Task 7: End-to-end verification

**Files:** none created — verification only.

- [ ] **Step 1: Full check suite**

```bash
npm run check:types
npm run lint
for f in client/lib/campusGeo.test.ts client/assets/campus-buildings.test.ts; do npx tsx "$f" || echo "FAILED: $f"; done
```
Expected: no failures.

- [ ] **Step 2: Manual on-device/simulator verification**

Run `npm run expo` and verify in Expo Go / dev client:

1. Map renders: cream campus with brown buildings, green fields, blue pool; labels legible.
2. Pinch-zoom and pan are smooth; map cannot be flung off-screen (rubber-bands back).
3. Tapping the Library polygon opens the detail card with rooms 549–551; tapping ✕ closes it.
4. Searching "170" surfaces Media Arts Center; picking it highlights + centers the MAC.
5. Location permission prompt appears on first open with the "only to show where you are on the Paly campus map" copy.
6. Deny permission → "Location off — tap to enable" pill; map still fully usable.
7. (Simulator) Set a custom location to `37.4371, -122.1561` (Features → Location → Custom) → pulsing dot appears on the quad; locate button centers on it.
8. Set location to San Francisco → "You're not on campus" pill, no dot.
9. Toggle dark mode → map re-themes without restart.

- [ ] **Step 3: Update the spec status and commit any fixes**

If manual verification exposed styling tweaks (label sizes, colors, quad position), apply and commit them:

```bash
git add -A client/ docs/
git commit -m "fix: campus map polish from on-device verification"
```
