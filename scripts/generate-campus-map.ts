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
  396279309: "gym", // large unnamed building adjacent to Small Gym + pool (Peery Center)
  28571251: "pool", // leisure=swimming_pool
  93493591: "office", // unnamed building=school between Library and English
};

// The quad has no OSM feature; it is the open space ringed by the Library,
// English and Language buildings. Hand-defined corners (lat, lng).
const QUAD_LATLNG: [number, number][] = [
  [37.437, -122.1568],
  [37.437, -122.156],
  [37.4365, -122.156],
  [37.4365, -122.1568],
];

type Kind =
  | "building"
  | "field"
  | "court"
  | "pool"
  | "track"
  | "garden"
  | "quad";

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
      const areaId = AREA_BY_OSM_ID[w.id] ?? null;
      // Mapped features take the app's display name so labels match the
      // tappable areas ("Gymnasium", not the raw OSM name or null).
      const areaName = CAMPUS_AREAS.find((a) => a.id === areaId)?.name;
      return {
        id: areaId,
        osmId: w.id,
        name: areaName ?? tags.name ?? null,
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
    console.error(
      "Missing area ids:",
      missing.map((a) => a.id),
    );
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
