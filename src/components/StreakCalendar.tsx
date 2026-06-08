import React, { useMemo, useState } from "react";
import { View, Text, Pressable, Modal } from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOutDown,
} from "react-native-reanimated";
import { tapHaptic } from "@/lib/haptics";
import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react-native";
import { JournalEntry } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DayData {
  date: string; // YYYY-MM-DD
  dayNumber: number;
  count: number;
  isFuture: boolean;
  isToday: boolean;
  isEmpty: boolean; // padding day (before month starts or after month ends)
}

interface StreakCalendarProps {
  entries: JournalEntry[];
  primaryColor: string;
  currentStreak: number;
}

interface SelectedDayInfo {
  date: string;
  count: number;
  dayNumber: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const DAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const TIER_ALPHAS = { few: 0.35, several: 0.65, many: 0.95 };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return null;
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

function getCellColor(
  count: number,
  primaryColor: string,
  isFuture: boolean,
): string {
  if (isFuture || count === 0) return "transparent";
  const rgb = hexToRgb(primaryColor);
  if (!rgb) return "rgba(255,255,255,0.40)";
  const alpha =
    count <= 2
      ? TIER_ALPHAS.few
      : count <= 4
        ? TIER_ALPHAS.several
        : TIER_ALPHAS.many;
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
}

function legendColor(
  tier: "few" | "several" | "many",
  primaryColor: string,
): string {
  const rgb = hexToRgb(primaryColor);
  if (!rgb) return "rgba(255,255,255,0.40)";
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${TIER_ALPHAS[tier]})`;
}

function formatDateLabel(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
}

// Build the grid for a given year/month (Monday-start week)
function buildMonthGrid(
  year: number,
  month: number,
  entryMap: Record<string, number>,
  todayStr: string,
): DayData[][] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const totalDays = lastDay.getDate();

  // Day of week for first day (0=Sun..6=Sat), convert to Mon-start (0=Mon..6=Sun)
  let startDow = firstDay.getDay(); // 0=Sun
  startDow = startDow === 0 ? 6 : startDow - 1; // convert to Mon-start

  const rows: DayData[][] = [];
  let row: DayData[] = [];

  // Leading empty cells
  for (let i = 0; i < startDow; i++) {
    row.push({
      date: "",
      dayNumber: 0,
      count: 0,
      isFuture: false,
      isToday: false,
      isEmpty: true,
    });
  }

  for (let d = 1; d <= totalDays; d++) {
    const date = new Date(year, month, d);
    const dateStr = toDateStr(date);
    const isFuture = dateStr > todayStr;
    const isToday = dateStr === todayStr;
    const count = entryMap[dateStr] ?? 0;

    row.push({
      date: dateStr,
      dayNumber: d,
      count,
      isFuture,
      isToday,
      isEmpty: false,
    });

    if (row.length === 7) {
      rows.push(row);
      row = [];
    }
  }

  // Trailing empty cells to complete the last row
  if (row.length > 0) {
    while (row.length < 7) {
      row.push({
        date: "",
        dayNumber: 0,
        count: 0,
        isFuture: false,
        isToday: false,
        isEmpty: true,
      });
    }
    rows.push(row);
  }

  return rows;
}

// ─── Day Popup ────────────────────────────────────────────────────────────────

function DayPopup({
  info,
  primaryColor,
  onDismiss,
}: {
  info: SelectedDayInfo;
  primaryColor: string;
  onDismiss: () => void;
}) {
  const rgb = hexToRgb(primaryColor);
  const accentBg = rgb
    ? `rgba(${rgb.r},${rgb.g},${rgb.b},0.18)`
    : "rgba(255,255,255,0.12)";
  const accentBorder = rgb
    ? `rgba(${rgb.r},${rgb.g},${rgb.b},0.4)`
    : "rgba(255,255,255,0.25)";

  const label = formatDateLabel(info.date);
  const count = info.count;
  const entryText =
    count === 0 ? "No entries" : count === 1 ? "1 entry" : `${count} entries`;

  return (
    <Modal
      transparent
      visible
      animationType="none"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <Pressable
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        onPress={onDismiss}
      >
        <Animated.View
          entering={FadeInDown.duration(180).springify()}
          exiting={FadeOutDown.duration(140)}
          style={{
            backgroundColor: "rgba(20,20,28,0.92)",
            borderRadius: 18,
            paddingHorizontal: 28,
            paddingVertical: 20,
            alignItems: "center",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.12)",
            minWidth: 160,
          }}
        >
          {/* Date label */}
          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: 13,
              color: "rgba(255,255,255,0.5)",
              marginBottom: 10,
              letterSpacing: 0.2,
            }}
          >
            {label}
          </Text>

          {/* Entry count pill */}
          <View
            style={{
              backgroundColor: accentBg,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: accentBorder,
              paddingHorizontal: 18,
              paddingVertical: 8,
            }}
          >
            <Text
              style={{
                fontFamily: "Fraunces_700Bold",
                fontSize: 22,
                color: "#FFFFFF",
                textAlign: "center",
              }}
            >
              {count}
            </Text>
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 11,
                color: "rgba(255,255,255,0.5)",
                textAlign: "center",
                marginTop: 2,
              }}
            >
              {count === 1 ? "journal entry" : "journal entries"}
            </Text>
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function StreakCalendar({
  entries,
  primaryColor,
  currentStreak,
}: StreakCalendarProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = toDateStr(today);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<SelectedDayInfo | null>(null);

  // Build entry count map
  const entryMap = useMemo<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    entries.forEach((e) => {
      const day = toDateStr(new Date(e.createdAt));
      map[day] = (map[day] ?? 0) + 1;
    });
    return map;
  }, [entries]);

  // Stats across all time
  const { totalDaysJournaled, longestStreak, daysThisMonth } = useMemo(() => {
    const sorted = Object.keys(entryMap).sort();
    const total = sorted.length;
    let longest = 0;
    let run = 0;
    let prev: string | null = null;
    sorted.forEach((dateStr) => {
      if (prev) {
        const diff =
          (new Date(dateStr).getTime() - new Date(prev).getTime()) / 86400000;
        run = diff === 1 ? run + 1 : 1;
      } else {
        run = 1;
      }
      if (run > longest) longest = run;
      prev = dateStr;
    });

    // Count days with entries in the current calendar month
    const nowYear = today.getFullYear();
    const nowMonth = today.getMonth();
    const pad = (n: number) => String(n).padStart(2, "0");
    const monthPrefix = `${nowYear}-${pad(nowMonth + 1)}`;
    const thisMonth = sorted.filter((d) => d.startsWith(monthPrefix)).length;

    return { totalDaysJournaled: total, longestStreak: longest, daysThisMonth: thisMonth };
  }, [entryMap]);

  const grid = useMemo(
    () => buildMonthGrid(viewYear, viewMonth, entryMap, todayStr),
    [viewYear, viewMonth, entryMap, todayStr],
  );

  const canGoBack = viewYear > today.getFullYear() - 2;
  const isCurrentMonth =
    viewYear === today.getFullYear() && viewMonth === today.getMonth();

  const navigate = (dir: -1 | 1) => {
    tapHaptic();
    let m = viewMonth + dir;
    let y = viewYear;
    if (m < 0) {
      m = 11;
      y--;
    }
    if (m > 11) {
      m = 0;
      y++;
    }
    if (
      y > today.getFullYear() ||
      (y === today.getFullYear() && m > today.getMonth())
    )
      return;
    setViewMonth(m);
    setViewYear(y);
  };

  const handleDayPress = (day: DayData) => {
    if (day.isEmpty || day.isFuture) return;
    tapHaptic();
    setSelectedDay({
      date: day.date,
      count: day.count,
      dayNumber: day.dayNumber,
    });
  };

  return (
    <View style={{ marginBottom: 24 }}>
      {/* ── Month Navigation ── */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <Pressable
          onPress={() => navigate(-1)}
          style={({ pressed }) => ({
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: pressed
              ? "rgba(255,255,255,0.15)"
              : "rgba(255,255,255,0.08)",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.15)",
          })}
        >
          <ChevronLeft
            size={18}
            color="rgba(255,255,255,0.8)"
            strokeWidth={2}
          />
        </Pressable>

        <View style={{ alignItems: "center" }}>
          <Text
            style={{
              fontFamily: "Inter_700Bold",
              fontSize: 18,
              color: "#FFFFFF",
            }}
          >
            {MONTH_NAMES[viewMonth]}
          </Text>
          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: 12,
              color: "rgba(255,255,255,0.45)",
              marginTop: 1,
            }}
          >
            {viewYear}
          </Text>
        </View>

        <Pressable
          onPress={() => !isCurrentMonth && navigate(1)}
          style={({ pressed }) => ({
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: isCurrentMonth
              ? "rgba(255,255,255,0.03)"
              : pressed
                ? "rgba(255,255,255,0.15)"
                : "rgba(255,255,255,0.08)",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: isCurrentMonth
              ? "rgba(255,255,255,0.06)"
              : "rgba(255,255,255,0.15)",
          })}
        >
          <ChevronRight
            size={18}
            color={
              isCurrentMonth ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.8)"
            }
            strokeWidth={2}
          />
        </Pressable>
      </View>

      {/* ── Day Headers ── */}
      <View style={{ flexDirection: "row", marginBottom: 6 }}>
        {DAY_HEADERS.map((d) => (
          <View key={d} style={{ flex: 1, alignItems: "center" }}>
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 11,
                color: "rgba(255,255,255,0.35)",
                letterSpacing: 0.3,
              }}
            >
              {d}
            </Text>
          </View>
        ))}
      </View>

      {/* ── Calendar Grid ── */}
      <Animated.View entering={FadeIn.duration(200)}>
        {grid.map((week, wi) => (
          <View key={wi} style={{ flexDirection: "row", marginBottom: 5 }}>
            {week.map((day, di) => (
              <DayCell
                key={`${wi}-${di}`}
                day={day}
                primaryColor={primaryColor}
                onPress={handleDayPress}
              />
            ))}
          </View>
        ))}
      </Animated.View>

      {/* ── Legend ── */}
      <View
        style={{
          marginTop: 14,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 12,
        }}
      >
        <Text
          style={{
            fontFamily: "Inter_400Regular",
            fontSize: 10,
            color: "rgba(255,255,255,0.3)",
          }}
        >
          Less
        </Text>
        {(["few", "several", "many"] as const).map((tier) => (
          <View
            key={tier}
            style={{
              width: 14,
              height: 14,
              borderRadius: 4,
              backgroundColor: legendColor(tier, primaryColor),
            }}
          />
        ))}
        <Text
          style={{
            fontFamily: "Inter_400Regular",
            fontSize: 10,
            color: "rgba(255,255,255,0.3)",
          }}
        >
          More
        </Text>
      </View>

      {/* ── Stats Row — celebrates consistency, not perfection ── */}
      <View style={{ flexDirection: "row", marginTop: 14, gap: 10 }}>
        <StatPill
          label="This Month"
          value={String(daysThisMonth)}
          primaryColor={primaryColor}
          highlight={daysThisMonth > 0}
        />
        <StatPill
          label="Total Days"
          value={String(totalDaysJournaled)}
          primaryColor={primaryColor}
        />
        <StatPill
          label="Longest Run"
          value={`${longestStreak}d`}
          primaryColor={primaryColor}
        />
      </View>

      {/* ── Day Detail Popup ── */}
      {selectedDay !== null && (
        <DayPopup
          info={selectedDay}
          primaryColor={primaryColor}
          onDismiss={() => setSelectedDay(null)}
        />
      )}
    </View>
  );
}

// ─── DayCell ──────────────────────────────────────────────────────────────────

function DayCell({
  day,
  primaryColor,
  onPress,
}: {
  day: DayData;
  primaryColor: string;
  onPress: (day: DayData) => void;
}) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    if (day.isEmpty || day.isFuture) return;
    scale.value = withSpring(0.82, { damping: 8 }, () => {
      scale.value = withSpring(1, { damping: 10 });
    });
    onPress(day);
  };

  if (day.isEmpty) {
    return <View style={{ flex: 1, aspectRatio: 1 }} />;
  }

  const bg = getCellColor(day.count, primaryColor, day.isFuture);
  const hasBg = day.count > 0 && !day.isFuture;
  const rgb = hexToRgb(primaryColor);

  // Future days: not tappable, muted appearance
  const isTappable = !day.isFuture;

  return (
    <Pressable
      onPress={handlePress}
      style={{ flex: 1, aspectRatio: 1, padding: 2 }}
      disabled={!isTappable}
    >
      <Animated.View
        style={[
          animStyle,
          {
            flex: 1,
            borderRadius: 8,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: bg,
            borderWidth: day.isToday ? 1.5 : 1,
            borderColor: day.isToday
              ? "rgba(255,255,255,0.95)"
              : hasBg
                ? "rgba(255,255,255,0.35)"
                : day.isFuture
                  ? "rgba(255,255,255,0.07)"
                  : "rgba(255,255,255,0.2)",
          },
        ]}
      >
        <Text
          style={{
            fontFamily: day.isToday ? "Inter_700Bold" : "Inter_400Regular",
            fontSize: 13,
            color: hasBg
              ? "#FFFFFF"
              : day.isFuture
                ? "rgba(255,255,255,0.15)"
                : day.isToday
                  ? "#FFFFFF"
                  : "rgba(255,255,255,0.55)",
          }}
        >
          {day.dayNumber}
        </Text>
        {day.count > 0 && !day.isFuture && (
          <View
            style={{
              position: "absolute",
              bottom: 3,
              width: 4,
              height: 4,
              borderRadius: 2,
              backgroundColor: "rgba(255,255,255,0.7)",
            }}
          />
        )}
      </Animated.View>
    </Pressable>
  );
}

// ─── StatPill ─────────────────────────────────────────────────────────────────

function StatPill({
  label,
  value,
  primaryColor,
  highlight,
}: {
  label: string;
  value: string;
  primaryColor: string;
  highlight?: boolean;
}) {
  const rgb = hexToRgb(primaryColor);
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderRadius: 16,
        backgroundColor:
          highlight && rgb
            ? `rgba(${rgb.r},${rgb.g},${rgb.b},0.18)`
            : "rgba(255,255,255,0.07)",
        borderWidth: 1,
        borderColor:
          highlight && rgb
            ? `rgba(${rgb.r},${rgb.g},${rgb.b},0.35)`
            : "rgba(255,255,255,0.12)",
      }}
    >
      <Text
        style={{ fontFamily: "Inter_700Bold", fontSize: 18, color: "#FFFFFF" }}
      >
        {value}
      </Text>
      <Text
        style={{
          fontFamily: "Inter_400Regular",
          fontSize: 10,
          color: "rgba(255,255,255,0.5)",
          marginTop: 3,
          textAlign: "center",
        }}
      >
        {label}
      </Text>
    </View>
  );
}
