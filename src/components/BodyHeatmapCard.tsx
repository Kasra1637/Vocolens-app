/**
 * BodyHeatmapCard
 *
 * Interactive body heat map — shows which regions accumulate emotional
 * sensations from the "Where do you feel it?" body scan step.
 *
 * Fixes vs v1:
 *  - Pressable wrapping SVG children is INVALID — replaced with <G onPress>
 *  - Anatomy redrawn: left/right arms, left/right hands are separate shapes
 *  - Time-range selector: 7D / 14D / 30D (matching ValenceArousalChart)
 *  - Layout simplified to full-width vertical stack (no side-by-side)
 *  - Silhouette always visible; heat zones overlay it
 */

import React, { useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Svg, { Ellipse, Rect, G, Circle, Line } from "react-native-svg";
import Animated, { FadeIn } from "react-native-reanimated";
import {
  JournalEntry,
  BodyRegion,
  BODY_REGION_LABELS,
  BODY_REGION_EMOJIS,
} from "@/lib/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha.toFixed(2)})`;
}

function heatFill(heat: number, primary: string): string {
  // Minimum 0.10 opacity so even heat=0 (selected but no intensity) is visible
  return hexToRgba(primary, 0.10 + Math.max(heat, 0.05) * 0.75);
}

function heatStroke(heat: number, primary: string): string {
  return hexToRgba(primary, 0.25 + Math.max(heat, 0.05) * 0.6);
}

function filterByDays(entries: JournalEntry[], days: number): JournalEntry[] {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return entries.filter((e) => new Date(e.createdAt).getTime() >= cutoff);
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface RegionStat {
  count: number;
  avgIntensity: number;
  heat: number; // 0–1
}
type RegionStats = Partial<Record<BodyRegion, RegionStat>>;
type TimeRange = "7D" | "14D" | "30D";

// ── SVG Anatomy ───────────────────────────────────────────────────────────────
// Viewport: 160 wide × 320 tall
// Centre X = 80
// Anatomically correct front-facing silhouette

const VW = 160;
const VH = 320;
const CX = 80; // body centre X

// Region hit-boxes (used for both silhouette and heat overlay)
type Shape =
  | { type: "ellipse"; cx: number; cy: number; rx: number; ry: number }
  | { type: "rect"; x: number; y: number; w: number; h: number; r: number };

const SHAPES: Record<BodyRegion, Shape[]> = {
  head:    [{ type: "ellipse", cx: CX, cy: 22, rx: 20, ry: 22 }],
  face:    [{ type: "ellipse", cx: CX, cy: 50, rx: 14, ry: 12 }],
  neck:    [{ type: "rect",    x: CX - 8, y: 64, w: 16, h: 14, r: 6 }],
  chest:   [{ type: "ellipse", cx: CX, cy: 105, rx: 28, ry: 22 }],
  stomach: [{ type: "ellipse", cx: CX, cy: 148, rx: 22, ry: 18 }],
  arms:    [
    { type: "rect", x: 8,  y: 82,  w: 20, h: 70, r: 10 }, // left arm
    { type: "rect", x: 132, y: 82, w: 20, h: 70, r: 10 }, // right arm
  ],
  hands:   [
    { type: "ellipse", cx: 18,  cy: 168, rx: 12, ry: 9 }, // left hand
    { type: "ellipse", cx: 142, cy: 168, rx: 12, ry: 9 }, // right hand
  ],
  legs:    [
    { type: "rect", x: 52, y: 175, w: 24, h: 90, r: 12 }, // left leg
    { type: "rect", x: 84, y: 175, w: 24, h: 90, r: 12 }, // right leg
  ],
};

// Region tap centre (for label position)
const TAP_CENTER: Record<BodyRegion, { x: number; y: number }> = {
  head:    { x: CX, y: 22 },
  face:    { x: CX, y: 50 },
  neck:    { x: CX, y: 71 },
  chest:   { x: CX, y: 105 },
  stomach: { x: CX, y: 148 },
  arms:    { x: CX, y: 117 },
  hands:   { x: CX, y: 168 },
  legs:    { x: CX, y: 220 },
};

// ── Sub-component: render one region's shapes ─────────────────────────────────

function RegionShapes({
  region,
  stat,
  primaryColor,
  isActive,
  onPress,
}: {
  region: BodyRegion;
  stat?: RegionStat;
  primaryColor: string;
  isActive: boolean;
  onPress: () => void;
}) {
  const shapes = SHAPES[region];
  const fill = stat ? heatFill(stat.heat, primaryColor) : "rgba(255,255,255,0.04)";
  const stroke = isActive
    ? "#FFFFFF"
    : stat
    ? heatStroke(stat.heat, primaryColor)
    : "rgba(255,255,255,0.18)";
  const strokeW = isActive ? 1.8 : 1;

  return (
    <G onPress={onPress}>
      {shapes.map((s, i) =>
        s.type === "ellipse" ? (
          <Ellipse
            key={i}
            cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry}
            fill={fill} stroke={stroke} strokeWidth={strokeW}
          />
        ) : (
          <Rect
            key={i}
            x={s.x} y={s.y} width={s.w} height={s.h} rx={s.r}
            fill={fill} stroke={stroke} strokeWidth={strokeW}
          />
        )
      )}
    </G>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  entries: JournalEntry[];
  primaryColor: string;
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function BodyHeatmapCard({ entries, primaryColor }: Props) {
  const [range, setRange] = useState<TimeRange>("30D");
  const [selected, setSelected] = useState<BodyRegion | null>(null);

  const days = range === "7D" ? 7 : range === "14D" ? 14 : 30;
  const filtered = useMemo(() => filterByDays(entries, days), [entries, days]);

  // Aggregate per-region — intensity 0 is valid (region selected, no intensity set)
  const stats: RegionStats = useMemo(() => {
    const raw: Record<string, { count: number; total: number }> = {};
    filtered.forEach((e) => {
      // Include entries where bodyRegions exist (any region selected counts)
      (e.bodyRegions ?? []).forEach((br) => {
        if (!raw[br.region]) raw[br.region] = { count: 0, total: 0 };
        raw[br.region].count++;
        // intensity may be 0 if user selected the region without setting intensity
        raw[br.region].total += br.intensity ?? 0;
      });
    });
    const maxCount = Math.max(1, ...Object.values(raw).map((v) => v.count));
    const result: RegionStats = {};
    (Object.keys(raw) as BodyRegion[]).forEach((region) => {
      const { count, total } = raw[region];
      result[region] = {
        count,
        avgIntensity: parseFloat((total / count).toFixed(1)),
        heat: count / maxCount,
      };
    });
    return result;
  }, [filtered]);

  // hasData: any entry that has at least one body region selected (intensity optional)
  const hasData = Object.keys(stats).length > 0;
  const totalScans = filtered.filter((e) => (e.bodyRegions ?? []).length > 0).length;
  const selectedStat = selected ? stats[selected] : null;

  const REGIONS: BodyRegion[] = ["head", "face", "neck", "chest", "stomach", "arms", "hands", "legs"];

  const handleRegionPress = (region: BodyRegion) => {
    setSelected((prev) => (prev === region ? null : region));
  };

  return (
    <View style={s.card}>
      {/* ── Header ── */}
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Body Sensation Map</Text>
          <Text style={s.subtitle}>
            {hasData
              ? `${totalScans} body scan${totalScans !== 1 ? "s" : ""} · tap a region to explore`
              : "Complete body scans during journaling to see patterns here"}
          </Text>
        </View>
      </View>

      {/* ── Time range selector ── */}
      <View style={s.rangeRow}>
        {(["7D", "14D", "30D"] as TimeRange[]).map((r) => (
          <Pressable
            key={r}
            onPress={() => { setRange(r); setSelected(null); }}
            style={[s.rangeBtn, range === r && { backgroundColor: hexToRgba(primaryColor, 0.25), borderColor: hexToRgba(primaryColor, 0.6) }]}
          >
            <Text style={[s.rangeTxt, range === r && { color: "#FFFFFF" }]}>{r}</Text>
          </Pressable>
        ))}
      </View>

      {!hasData ? (
        <View style={s.empty}>
          <Text style={{ fontSize: 36 }}>🧘</Text>
          <Text style={s.emptyTxt}>
            Use the body scan during journaling and your sensation patterns will appear here.
          </Text>
        </View>
      ) : (
        <>
          {/* ── Body SVG ── */}
          <View style={s.svgWrap}>
            <Svg width={VW} height={VH} viewBox={`0 0 ${VW} ${VH}`}>
              {/* Silhouette — always visible at low opacity */}
              <G opacity={0.22} stroke="white" strokeWidth={1} fill="none">
                <Ellipse cx={CX} cy={22} rx={20} ry={22} />
                <Rect x={CX - 8} y={64} width={16} height={14} rx={6} />
                <Rect x={CX - 28} y={78} width={56} height={85} rx={14} />
                <Rect x={8}   y={82} width={20} height={70} rx={10} />
                <Rect x={132} y={82} width={20} height={70} rx={10} />
                <Ellipse cx={18}  cy={168} rx={12} ry={9} />
                <Ellipse cx={142} cy={168} rx={12} ry={9} />
                <Rect x={52} y={175} width={24} height={90} rx={12} />
                <Rect x={84} y={175} width={24} height={90} rx={12} />
              </G>

              {/* Heat zones */}
              {REGIONS.map((region) => (
                <RegionShapes
                  key={region}
                  region={region}
                  stat={stats[region]}
                  primaryColor={primaryColor}
                  isActive={selected === region}
                  onPress={() => handleRegionPress(region)}
                />
              ))}

              {/* Active region indicator dot */}
              {selected && (
                <Circle
                  cx={TAP_CENTER[selected].x}
                  cy={TAP_CENTER[selected].y}
                  r={4}
                  fill="#FFFFFF"
                  opacity={0.9}
                />
              )}
            </Svg>
          </View>

          {/* ── Tooltip for selected region ── */}
          {selected && selectedStat && (
            <Animated.View
              entering={FadeIn.duration(250)}
              style={[s.tooltip, { borderColor: heatStroke(selectedStat.heat, primaryColor) }]}
            >
              <View style={s.tooltipHeader}>
                <Text style={s.tooltipEmoji}>{BODY_REGION_EMOJIS[selected]}</Text>
                <Text style={s.tooltipName}>{BODY_REGION_LABELS[selected]}</Text>
                <Pressable onPress={() => setSelected(null)} style={s.clearBtn}>
                  <Text style={s.clearTxt}>✕</Text>
                </Pressable>
              </View>
              <View style={s.tooltipStats}>
                <View style={s.statBox}>
                  <Text style={s.statVal}>{selectedStat.count}</Text>
                  <Text style={s.statLbl}>Sessions</Text>
                </View>
                <View style={s.statDivider} />
                <View style={s.statBox}>
                  <Text style={s.statVal}>{selectedStat.avgIntensity}/5</Text>
                  <Text style={s.statLbl}>Avg intensity</Text>
                </View>
                <View style={s.statDivider} />
                <View style={s.statBox}>
                  <Text style={s.statVal}>{Math.round(selectedStat.heat * 100)}%</Text>
                  <Text style={s.statLbl}>Relative heat</Text>
                </View>
              </View>
              {/* Intensity bar */}
              <View style={s.intBg}>
                <View style={[s.intFill, {
                  width: `${(selectedStat.avgIntensity / 5) * 100}%` as any,
                  backgroundColor: heatFill(selectedStat.heat, primaryColor),
                }]} />
              </View>
            </Animated.View>
          )}

          {/* ── Region list ── */}
          <View style={s.listWrap}>
            {(Object.entries(stats) as [BodyRegion, RegionStat][])
              .sort((a, b) => b[1].count - a[1].count)
              .map(([region, stat]) => (
                <Pressable
                  key={region}
                  onPress={() => handleRegionPress(region)}
                  style={[s.listRow, selected === region && { backgroundColor: hexToRgba(primaryColor, 0.12) }]}
                >
                  <Text style={s.listEmoji}>{BODY_REGION_EMOJIS[region]}</Text>
                  <Text style={s.listLabel}>{BODY_REGION_LABELS[region]}</Text>
                  {/* Mini heat bar */}
                  <View style={s.miniBarBg}>
                    <View style={[s.miniBarFill, {
                      width: `${stat.heat * 100}%` as any,
                      backgroundColor: heatFill(stat.heat, primaryColor),
                    }]} />
                  </View>
                  <Text style={s.listCount}>{stat.count}×</Text>
                </Pressable>
              ))}
          </View>

          {/* ── Legend ── */}
          <View style={s.legend}>
            <Text style={s.legendLbl}>Low</Text>
            <View style={s.legendBar}>
              {[0.15, 0.35, 0.55, 0.75, 0.95].map((h, i) => (
                <View key={i} style={[s.legendSeg, { backgroundColor: heatFill(h, primaryColor) }]} />
              ))}
            </View>
            <Text style={s.legendLbl}>High</Text>
          </View>
        </>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.20)",
    padding: 20,
    marginBottom: 24,
  },
  header: { marginBottom: 12 },
  title: { fontFamily: "Inter_700Bold", color: "#FFFFFF", fontSize: 15 },
  subtitle: { fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.50)", fontSize: 12, marginTop: 3, lineHeight: 17 },
  rangeRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  rangeBtn: {
    paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.20)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  rangeTxt: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: "rgba(255,255,255,0.50)" },
  empty: { alignItems: "center", gap: 12, paddingVertical: 28 },
  emptyTxt: { fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.50)", fontSize: 13, textAlign: "center", lineHeight: 20 },
  svgWrap: { alignItems: "center", marginBottom: 16 },
  tooltip: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 16, borderWidth: 1,
    padding: 14, marginBottom: 14,
  },
  tooltipHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 8 },
  tooltipEmoji: { fontSize: 20 },
  tooltipName: { fontFamily: "Inter_700Bold", color: "#FFFFFF", fontSize: 14, flex: 1 },
  clearBtn: { padding: 4 },
  clearTxt: { color: "rgba(255,255,255,0.40)", fontSize: 13 },
  tooltipStats: { flexDirection: "row", justifyContent: "space-around", marginBottom: 10 },
  statBox: { alignItems: "center", flex: 1 },
  statVal: { fontFamily: "Inter_700Bold", color: "#FFFFFF", fontSize: 16 },
  statLbl: { fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.45)", fontSize: 10, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.12)", marginVertical: 2 },
  intBg: { height: 5, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.10)", overflow: "hidden" },
  intFill: { height: "100%", borderRadius: 3 },
  listWrap: { gap: 2, marginBottom: 14 },
  listRow: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 6, paddingHorizontal: 8, borderRadius: 10, gap: 8,
  },
  listEmoji: { fontSize: 14, width: 20, textAlign: "center" },
  listLabel: { fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.75)", fontSize: 12, flex: 1 },
  miniBarBg: { width: 60, height: 5, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.10)", overflow: "hidden" },
  miniBarFill: { height: "100%", borderRadius: 3 },
  listCount: { fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.45)", fontSize: 11, width: 24, textAlign: "right" },
  legend: { flexDirection: "row", alignItems: "center", gap: 8 },
  legendLbl: { fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.30)", fontSize: 10 },
  legendBar: { flex: 1, flexDirection: "row", height: 5, borderRadius: 3, overflow: "hidden" },
  legendSeg: { flex: 1, height: "100%" },
});
