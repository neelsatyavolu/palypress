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
