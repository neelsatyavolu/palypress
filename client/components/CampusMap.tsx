import React, {
  forwardRef,
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
import Svg, {
  Circle,
  Ellipse,
  G,
  Path,
  Text as SvgText,
} from "react-native-svg";

import {
  CAMPUS_FEATURES,
  CAMPUS_OUTLINE,
  CampusFeature,
} from "@/assets/campus-buildings";
import { CampusLocation } from "@/hooks/useCampusLocation";
import { useTheme } from "@/hooks/useTheme";
import { MAP_HEIGHT, MAP_WIDTH, metersToMapUnits } from "@/lib/campusGeo";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Paly's campus sits ~25.5° off the map's vertical axis, so a plain north-up
// projection renders it as a diagonal slab. Rotating the whole scene straightens
// it into a clean top-down (bird's-eye) frame that fills the viewport.
const ROTATION_RAD = (-25.52 * Math.PI) / 180;
const FRAME_PADDING = 36;

type Pt = [number, number];

function rotateRaw([x, y]: Pt): Pt {
  const cx = MAP_WIDTH / 2;
  const cy = MAP_HEIGHT / 2;
  const cos = Math.cos(ROTATION_RAD);
  const sin = Math.sin(ROTATION_RAD);
  const dx = x - cx;
  const dy = y - cy;
  return [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos];
}

// Fit the rotated campus tightly to the frame, computed once from the outline.
const ROTATED_OUTLINE = CAMPUS_OUTLINE.map(rotateRaw);
const FRAME_MIN_X = Math.min(...ROTATED_OUTLINE.map((p) => p[0]));
const FRAME_MIN_Y = Math.min(...ROTATED_OUTLINE.map((p) => p[1]));
const FRAME_MAX_X = Math.max(...ROTATED_OUTLINE.map((p) => p[0]));
const FRAME_MAX_Y = Math.max(...ROTATED_OUTLINE.map((p) => p[1]));

const GROUND_WIDTH = FRAME_MAX_X - FRAME_MIN_X + FRAME_PADDING * 2;
const GROUND_HEIGHT = FRAME_MAX_Y - FRAME_MIN_Y + FRAME_PADDING * 2;

// Rotate a raw map point onto the flat, top-down ground plane.
function ground([x, y]: Pt): Pt {
  const [rx, ry] = rotateRaw([x, y]);
  return [rx - FRAME_MIN_X + FRAME_PADDING, ry - FRAME_MIN_Y + FRAME_PADDING];
}

// --- Isometric camera: pitch the ground plane down and extrude buildings up. ---
// SQUASH compresses the ground's depth axis; a point at height h rises on screen.
const SQUASH = 0.7;

function heightFor(feature: CampusFeature): number {
  if (feature.kind !== "building") return 0;
  const name = (feature.name ?? "").toLowerCase();
  if (name.includes("tower")) return 48;
  if (name.includes("gym")) return 34;
  if (name.includes("performing") || name.includes("theat")) return 30;
  if (name.includes("library")) return 26;
  if (
    name.includes("main building") ||
    name.includes("social science") ||
    name.includes("media")
  )
    return 24;
  return 15 + (feature.osmId % 4) * 3; // 15,18,21,24 for generic blocks
}

const MAX_HEIGHT = Math.max(0, ...CAMPUS_FEATURES.map(heightFor));
const HEADROOM = MAX_HEIGHT + 10;

const VIEW_WIDTH = GROUND_WIDTH;
const VIEW_HEIGHT = GROUND_HEIGHT * SQUASH + HEADROOM + FRAME_PADDING;

// Project a ground point (optionally raised by height h) into screen space.
function iso([gx, gy]: Pt, h: number): Pt {
  return [gx, HEADROOM + gy * SQUASH - h];
}

// Straight-edged closed polygon path (used for extruded walls and roofs).
function polyPath(points: Pt[]): string {
  return (
    points
      .map((p, i) => `${i ? "L" : "M"} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`)
      .join(" ") + " Z"
  );
}

// Build an SVG path for a polygon with softly rounded corners (flat ground shapes).
function roundedPath(points: Pt[], radius: number): string {
  const n = points.length;
  if (n < 3) return "";
  let d = "";
  for (let i = 0; i < n; i++) {
    const prev = points[(i - 1 + n) % n];
    const curr = points[i];
    const next = points[(i + 1) % n];
    const toPrev: Pt = [prev[0] - curr[0], prev[1] - curr[1]];
    const toNext: Pt = [next[0] - curr[0], next[1] - curr[1]];
    const lenPrev = Math.hypot(toPrev[0], toPrev[1]) || 1;
    const lenNext = Math.hypot(toNext[0], toNext[1]) || 1;
    const r = Math.min(radius, lenPrev / 2, lenNext / 2);
    const start: Pt = [
      curr[0] + (toPrev[0] / lenPrev) * r,
      curr[1] + (toPrev[1] / lenPrev) * r,
    ];
    const end: Pt = [
      curr[0] + (toNext[0] / lenNext) * r,
      curr[1] + (toNext[1] / lenNext) * r,
    ];
    d +=
      (i === 0 ? `M ${start[0]} ${start[1]}` : `L ${start[0]} ${start[1]}`) +
      ` Q ${curr[0]} ${curr[1]} ${end[0]} ${end[1]} `;
  }
  return `${d}Z`;
}

// Darken a hex color toward black by fraction f (for shaded building walls).
function darken(hex: string, f: number): string {
  const v = parseInt(hex.replace("#", ""), 16);
  const r = Math.round(((v >> 16) & 255) * (1 - f));
  const g = Math.round(((v >> 8) & 255) * (1 - f));
  const b = Math.round((v & 255) * (1 - f));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

// Map palette anchored to the app's cream/brown identity.
const PALETTE = {
  light: {
    canvas: "#E9E7E1",
    campus: "#F2F0EB",
    campusStroke: "rgba(0,0,0,0.05)",
    building: "#E0DCD4",
    buildingSelected: "#A9C4DD",
    quad: "#C6E1AE",
    field: "#C6E1AE",
    court: "#E7DEC9",
    pool: "#A9D9EA",
    track: "#E0C4B0",
    garden: "#CDE6BC",
    stroke: "rgba(0,0,0,0.05)",
    wallStroke: "rgba(0,0,0,0.06)",
    shadow: "rgba(0,0,0,0.09)",
    label: "#43434A",
    labelHalo: "rgba(255,255,255,0.92)",
    dot: "#2E7CF6",
    dotHalo: "rgba(46,124,246,0.18)",
  },
  dark: {
    canvas: "#26292E",
    campus: "#2E323A",
    campusStroke: "rgba(255,255,255,0.05)",
    building: "#474C55",
    buildingSelected: "#3C5876",
    quad: "#35452E",
    field: "#35452E",
    court: "#4A4636",
    pool: "#24485E",
    track: "#4A3B30",
    garden: "#35452E",
    stroke: "rgba(0,0,0,0.18)",
    wallStroke: "rgba(0,0,0,0.22)",
    shadow: "rgba(0,0,0,0.30)",
    label: "#EDEDF0",
    labelHalo: "rgba(18,20,24,0.82)",
    dot: "#4C93FF",
    dotHalo: "rgba(76,147,255,0.20)",
  },
} as const;

function fillFor(
  feature: CampusFeature,
  selected: boolean,
  colors: (typeof PALETTE)["light"] | (typeof PALETTE)["dark"],
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

// Corner radius scales with feature size so small ground shapes stay crisp.
function radiusFor(kind: CampusFeature["kind"]): number {
  return kind === "building" ? 7 : 9;
}

interface FlatShape {
  feature: CampusFeature;
  path: string;
  label: Pt | null;
}

interface WallFace {
  d: string;
  shade: number;
}

interface BuildingShape {
  feature: CampusFeature;
  height: number;
  shadow: string;
  walls: WallFace[];
  roof: string;
  label: Pt | null;
}

function labelFor(feature: CampusFeature, h: number): Pt | null {
  return feature.id && feature.name
    ? iso(ground(feature.centroid), h + 6)
    : null;
}

// The scene is static (fixed heights + camera), so build every path once.
const OUTLINE_PATH = roundedPath(
  CAMPUS_OUTLINE.map((p) => iso(ground(p), 0)),
  22,
);

const FLAT_SHAPES: FlatShape[] = CAMPUS_FEATURES.filter(
  (f) => heightFor(f) === 0,
).map((feature) => ({
  feature,
  path: roundedPath(
    feature.points.map((p) => iso(ground(p), 0)),
    radiusFor(feature.kind),
  ),
  label: labelFor(feature, 0),
}));

// Buildings sorted back-to-front (painter's algorithm) by ground depth.
const BUILDING_SHAPES: BuildingShape[] = CAMPUS_FEATURES.filter(
  (f) => heightFor(f) > 0,
)
  .sort((a, b) => ground(a.centroid)[1] - ground(b.centroid)[1])
  .map((feature) => {
    const h = heightFor(feature);
    const g = feature.points.map(ground);
    const base = g.map((p) => iso(p, 0));
    const top = g.map((p) => iso(p, h));
    const n = g.length;
    const walls: (WallFace & { midY: number })[] = [];
    for (let i = 0; i < n; i++) {
      const a = i;
      const b = (i + 1) % n;
      const dx = g[b][0] - g[a][0];
      const dy = g[b][1] - g[a][1];
      // Walls running along the depth axis face sideways (lighter); walls
      // running across it face the camera front/back (darker).
      const shade = Math.abs(dy) >= Math.abs(dx) ? 0.1 : 0.2;
      walls.push({
        d: polyPath([base[a], base[b], top[b], top[a]]),
        shade,
        midY: (g[a][1] + g[b][1]) / 2,
      });
    }
    walls.sort((w1, w2) => w1.midY - w2.midY); // draw back walls first
    return {
      feature,
      height: h,
      shadow: polyPath(g.map((p) => iso([p[0] + 3, p[1] + 3], 0))),
      walls: walls.map(({ d, shade }) => ({ d, shade })),
      roof: polyPath(top),
      label: labelFor(feature, h),
    };
  });

// --- Labels ---
const LABEL_FONT_SIZE = 13;
const LABEL_LINE_HEIGHT = LABEL_FONT_SIZE + 3;

interface PlacedLabel {
  feature: CampusFeature;
  x: number;
  y: number;
}

// Approximate rendered width of a bold label, for collision detection.
function labelWidth(text: string): number {
  return text.length * LABEL_FONT_SIZE * 0.56;
}

// Greedily de-conflict labels: sort top-to-bottom and nudge any that would
// collide downward, so clustered names (e.g. Main Office / Main Building /
// Media Arts Center) stack cleanly instead of overprinting each other.
const LABELS: PlacedLabel[] = (() => {
  const source = [...FLAT_SHAPES, ...BUILDING_SHAPES]
    .filter((s) => s.label)
    .map((s) => ({
      feature: s.feature,
      x: s.label![0],
      y: s.label![1],
      w: labelWidth(s.feature.name ?? ""),
    }))
    .sort((a, b) => a.y - b.y);

  const placed: { x: number; y: number; w: number }[] = [];
  const result: PlacedLabel[] = [];
  for (const item of source) {
    let y = item.y;
    for (let guard = 0; guard < 8; guard++) {
      const clash = placed.some(
        (p) =>
          Math.abs(p.x - item.x) < (p.w + item.w) / 2 &&
          Math.abs(p.y - y) < LABEL_LINE_HEIGHT,
      );
      if (!clash) break;
      y += LABEL_LINE_HEIGHT;
    }
    placed.push({ x: item.x, y, w: item.w });
    result.push({ feature: item.feature, x: item.x, y });
  }
  return result;
})();

const MAX_ZOOM_FACTOR = 6; // relative to fit-to-screen scale
// Zoom in past fit-to-width so the wide campus fills a portrait screen instead
// of sitting as a thin strip; the user can pinch out to see the whole property.
const INITIAL_FILL = 1.3;

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
      container.width > 0 && container.height > 0
        ? Math.min(container.width / VIEW_WIDTH, container.height / VIEW_HEIGHT)
        : 1;

    const scale = useSharedValue(1);
    const tx = useSharedValue(0);
    const ty = useSharedValue(0);
    const pulse = useSharedValue(0);
    const interacted = useSharedValue(false);

    // Fit-fill and center the campus. Re-runs if the first layout measurement
    // was partial/wrong, but backs off once the user pans or zooms.
    useEffect(() => {
      if (container.width === 0 || container.height === 0) return;
      if (interacted.value) return;
      const s = fitScale * INITIAL_FILL;
      scale.value = s;
      tx.value = (container.width - VIEW_WIDTH * s) / 2;
      ty.value = (container.height - VIEW_HEIGHT * s) / 2;
    }, [container, fitScale, interacted, scale, tx, ty]);

    useEffect(() => {
      pulse.value = withRepeat(withTiming(1, { duration: 1600 }), -1, false);
    }, [pulse]);

    const containerWidth = container.width;
    const containerHeight = container.height;

    const clampViewport = () => {
      "worklet";
      const w = VIEW_WIDTH * scale.value;
      const h = VIEW_HEIGHT * scale.value;
      // Keep at least 1/3 of the map on screen in each axis.
      const minTx = Math.min(containerWidth - w, containerWidth / 3 - w);
      const maxTx = Math.max(0, (containerWidth * 2) / 3);
      const minTy = Math.min(containerHeight - h, containerHeight / 3 - h);
      const maxTy = Math.max(0, (containerHeight * 2) / 3);
      if (tx.value < minTx) tx.value = withTiming(minTx);
      if (tx.value > maxTx) tx.value = withTiming(maxTx);
      if (ty.value < minTy) ty.value = withTiming(minTy);
      if (ty.value > maxTy) ty.value = withTiming(maxTy);
    };

    const pan = Gesture.Pan()
      .averageTouches(true)
      .onChange((e) => {
        interacted.value = true;
        tx.value += e.changeX;
        ty.value += e.changeY;
      })
      .onEnd(() => {
        clampViewport();
      });

    const pinch = Gesture.Pinch()
      .onChange((e) => {
        interacted.value = true;
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
      .onEnd(() => {
        clampViewport();
      });

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
        const [px, py] = iso(ground([x, y]), 0);
        const targetScale = Math.max(scale.value, fitScale * 2);
        scale.value = withTiming(targetScale);
        tx.value = withTiming(containerWidth / 2 - px * targetScale);
        ty.value = withTiming(containerHeight / 2 - py * targetScale);
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
    const dotPt = dot ? iso(ground([dot.x, dot.y]), 0) : null;
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
            style={[styles.map, { transformOrigin: "top left" }, mapStyle]}
          >
            <Svg
              width={VIEW_WIDTH}
              height={VIEW_HEIGHT}
              viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
            >
              <Path
                d={OUTLINE_PATH}
                fill={colors.campus}
                stroke={colors.campusStroke}
                strokeWidth={2}
              />
              {/* Flat ground features: fields, courts, pool, quad. */}
              <G>
                {FLAT_SHAPES.map(({ feature, path }) => (
                  <Path
                    key={`flat-${feature.osmId}-${feature.id ?? ""}`}
                    d={path}
                    fill={fillFor(
                      feature,
                      feature.id === selectedAreaId,
                      colors,
                    )}
                    stroke={colors.stroke}
                    strokeWidth={1}
                    strokeLinejoin="round"
                    onPress={
                      feature.id ? () => onSelectArea(feature.id) : undefined
                    }
                  />
                ))}
              </G>
              {/* Extruded buildings, back-to-front: shadow, walls, then roof. */}
              <G>
                {BUILDING_SHAPES.map(({ feature, shadow, walls, roof }) => {
                  const selected = feature.id === selectedAreaId;
                  const base = fillFor(feature, selected, colors);
                  return (
                    <G key={`bld-${feature.osmId}-${feature.id ?? ""}`}>
                      <Path d={shadow} fill={colors.shadow} />
                      {walls.map((w, i) => (
                        <Path
                          key={`w${i}`}
                          d={w.d}
                          fill={darken(base, w.shade)}
                        />
                      ))}
                      <Path
                        d={roof}
                        fill={base}
                        stroke={colors.wallStroke}
                        strokeWidth={1}
                        strokeLinejoin="round"
                        onPress={
                          feature.id
                            ? () => onSelectArea(feature.id)
                            : undefined
                        }
                      />
                    </G>
                  );
                })}
              </G>
              {/* Labels float above their roofs, de-conflicted vertically. */}
              <G>
                {LABELS.map(({ feature, x, y }) => (
                  <React.Fragment key={`label-${feature.osmId}-${feature.id}`}>
                    <SvgText
                      x={x}
                      y={y}
                      fontSize={LABEL_FONT_SIZE}
                      fontWeight="700"
                      fill={colors.labelHalo}
                      stroke={colors.labelHalo}
                      strokeWidth={3}
                      textAnchor="middle"
                    >
                      {feature.name}
                    </SvgText>
                    <SvgText
                      x={x}
                      y={y}
                      fontSize={LABEL_FONT_SIZE}
                      fontWeight="700"
                      fill={colors.label}
                      textAnchor="middle"
                    >
                      {feature.name}
                    </SvgText>
                  </React.Fragment>
                ))}
              </G>
              {dotPt ? (
                <G>
                  {haloRadius > 0 ? (
                    <Ellipse
                      cx={dotPt[0]}
                      cy={dotPt[1]}
                      rx={haloRadius}
                      ry={haloRadius * SQUASH}
                      fill={colors.dotHalo}
                    />
                  ) : null}
                  <AnimatedCircle
                    cx={dotPt[0]}
                    cy={dotPt[1]}
                    fill={colors.dot}
                    animatedProps={pulseProps}
                  />
                  <Circle
                    cx={dotPt[0]}
                    cy={dotPt[1]}
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
    width: VIEW_WIDTH,
    height: VIEW_HEIGHT,
  },
});

export default CampusMap;
