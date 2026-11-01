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
assert.equal(
  Math.round(se.x),
  MAP_WIDTH,
  "south-east corner should be x=MAP_WIDTH",
);
assert.equal(
  Math.round(se.y),
  MAP_HEIGHT,
  "south-east corner should be y=MAP_HEIGHT",
);

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
assert.equal(
  isOnCampus(37.4443, -122.1607),
  false,
  "downtown PA is off campus",
);
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
