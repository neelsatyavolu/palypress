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
