# Interactive Paly Campus Map — Design Spec

**Date:** 2026-07-02
**Status:** Approved

## Purpose

Upgrade the existing `MapScreen` (currently a searchable text list of campus buildings) into a visually polished, interactive campus map that shows the user's live location. Goals: wayfinding for students and a premium-feeling visual feature. Scope for v1: pan/zoom, tappable buildings, live location dot. No routing/directions, no room-level indoor positioning.

## Architecture Overview

Three new units plus a rebuilt screen:

| Unit | Responsibility |
|------|----------------|
| `client/assets/campus-buildings.ts` | Generated building polygon data (from OpenStreetMap footprints) with ids matching `CAMPUS_AREAS` |
| `client/lib/campusGeo.ts` | Campus bounding box constants + lat/lng → map x/y linear transform; on-campus bounds check |
| `client/components/CampusMap.tsx` | SVG map rendering, pan/zoom gestures, building tap handling, location dot |
| `client/screens/MapScreen.tsx` | Rebuilt: hosts CampusMap, search bar, building detail card, locate-me button |

## 1. Map Asset — SVG from Real Building Footprints

- Paly's buildings are traced in OpenStreetMap. A one-time build script extracts the polygons; output is committed as `client/assets/campus-buildings.ts` (typed array of `{ id, name, points }`). The script is not shipped in the app bundle.
- Rendered with `react-native-svg` (already a dependency) in the app's theme palette: cream background, warm brown buildings, green quad/fields, text labels.
- Vector rendering means dark mode theming comes free via the existing `useTheme` hook.
- Polygon ids map to the existing `CAMPUS_AREAS` data in `MapScreen.tsx` (name, rooms, description).
- Expect a styling iteration pass after the first render: raw OSM footprints are accurate but plain (rounded corners, shadows, label placement to tune).

## 2. Geo-Referencing

- Campus (~30 acres) is small enough that a linear equirectangular transform is accurate to well under GPS error:
  - `x = (lng − LNG_WEST) × SCALE_X`
  - `y = (LAT_NORTH − lat) × SCALE_Y`
- One constants module (`campusGeo.ts`) holds the campus bounding box. Building polygons and the GPS dot go through the same transform, so they can never disagree.
- `isOnCampus(lat, lng)` bounds check (bounding box with small margin) decides whether to show the dot.

## 3. Live Location Dot

- New dependency: `expo-location` (Expo SDK 54 compatible). Requires `NSLocationWhenInUseUsageDescription` (iOS) and `ACCESS_FINE_LOCATION` (Android) strings in `app.json`.
- Foreground-only `watchPositionAsync` subscribed while MapScreen is focused; unsubscribed on blur/unmount. No background location.
- Pulsing dot animated with Reanimated (already installed), plus a translucent accuracy halo sized from the reported accuracy.
- Degraded states (map remains fully usable in all of them):
  - Permission denied → no dot; subtle pill offering to enable in Settings.
  - Off campus → no dot; subtle "you're not on campus" pill.
  - Location unavailable/stale → dot hidden after timeout.
- Privacy: location is consumed on-device only; never sent to the server or analytics.

## 4. Interaction

- Pinch-zoom and pan via `react-native-gesture-handler` + Reanimated shared values (transform applied to the SVG group). Clamped zoom range and pan bounds so the campus can't be lost off-screen.
- Tap a building → bottom card slides up with name, rooms, description (reusing `CAMPUS_AREAS`); tapped building gets a highlight fill.
- Existing search bar retained: matching a query (e.g., "170") highlights and centers the matching building on the map instead of filtering a text list.
- "Locate me" button recenters/zooms on the user's dot (disabled in degraded states).

## 5. Error Handling

- Location permission and availability failures are expected states, not errors (see §3).
- Gesture/transform math is pure and clamped — no runtime failure modes beyond bad data, which is caught at build time since polygon data is generated and committed.
- If polygon data fails validation at build time, the generation script fails loudly; the app never ships with partial map data.

## 6. Testing

- Unit tests for `campusGeo.ts`: known lat/lng ↔ x/y pairs (e.g., MAC corner, quad center), on-campus bounds check edge cases. Pure functions, run with the existing tsx + node:assert pattern.
- Unit test that every `CAMPUS_AREAS` id has a matching polygon in the generated asset (and vice versa).
- Manual verification: on-device check that the dot appears in the correct spot at known campus locations, and gesture feel (pan/zoom/tap).

## Known Limitations (accepted)

- GPS accuracy is 3–10 m outdoors and worse indoors: the dot shows which building/area you're near, not which room you're in.
- Off-campus users get a static (still attractive, still interactive) map.

## Alternative Considered

Hand-drawn static image map (Figma/Illustrator): prettier ceiling, but manual geo-referencing guesswork, a second asset for dark mode, and harder to keep accurate. Rejected in favor of SVG-from-OSM with hand-tuned styling.
