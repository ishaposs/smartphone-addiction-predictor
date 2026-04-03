import { useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Animated,
  Dimensions,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Slider from "@react-native-community/slider";

const { width } = Dimensions.get("window");

const API_URL = "http://10.23.220.26:5000/predict";
const STORAGE_KEY = "mindwatch_history";

// Feature definitions: label, unit, min, max, index in feature array
const FEATURES = [
  { label: "Screen time",   unit: "mins", min: 0,  max: 600, index: 0 },
  { label: "Social media",  unit: "mins", min: 0,  max: 300, index: 1 },
  { label: "Gaming",        unit: "mins", min: 0,  max: 200, index: 2 },
  { label: "Phone unlocks", unit: "",     min: 0,  max: 150, index: 3 },
  { label: "Night usage",   unit: "mins", min: 0,  max: 180, index: 4 },
  { label: "Avg session",   unit: "mins", min: 1,  max: 20,  index: 5 },
];

const DEFAULT_VALUES = [120, 60, 30, 80, 20, 5];

const RISK_CONFIG = {
  Mild: {
    color: "#1DB86A",
    dimColor: "#0e5a33",
    bgColor: "#071a10",
    meterWidth: 0.18,
    tip: "Great job! Your usage looks healthy.",
  },
  Moderate: {
    color: "#F0A020",
    dimColor: "#7a5010",
    bgColor: "#1c1200",
    meterWidth: 0.58,
    tip: "Try reducing social media time before bed.",
  },
  Severe: {
    color: "#E04A4A",
    dimColor: "#7a2424",
    bgColor: "#1c0808",
    meterWidth: 0.9,
    tip: "Consider a digital detox. Set app limits.",
  },
};

type RiskLabel = "Mild" | "Moderate" | "Severe";

// ─── Slider Row ───────────────────────────────────────────────────────────────
function SliderRow({
  label,
  unit,
  min,
  max,
  value,
  onChange,
}: {
  label: string;
  unit: string;
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <View style={styles.sliderRow}>
      <View style={styles.sliderMeta}>
        <Text style={styles.sliderLabel}>{label}</Text>
        <Text style={styles.sliderVal}>
          {Math.round(value)}
          {unit ? ` ${unit}` : ""}
        </Text>
      </View>
      <Slider
        style={{ width: "100%", height: 32 }}
        minimumValue={min}
        maximumValue={max}
        step={1}
        value={value}
        onValueChange={onChange}
        minimumTrackTintColor="#5050a0"
        maximumTrackTintColor="#1a1a2a"
        thumbTintColor="#8080d0"
      />
    </View>
  );
}

// ─── Day History Pill ─────────────────────────────────────────────────────────
function DayPill({ day, filled }: { day: number; filled: boolean }) {
  return (
    <View style={[styles.dayPill, filled && styles.dayPillFilled]}>
      <Text style={[styles.dayPillText, filled && styles.dayPillTextFilled]}>
        Day {day}
      </Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const [values, setValues] = useState<number[]>([...DEFAULT_VALUES]);
  const [history, setHistory] = useState<number[][]>([]);
  const [risk, setRisk] = useState<RiskLabel | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [probabilities, setProbabilities] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"log" | "result">("log");

  const meterAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Load saved history on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        const parsed: number[][] = JSON.parse(raw);
        setHistory(parsed);
      }
    });
  }, []);

  const config = risk ? RISK_CONFIG[risk] : null;
  const daysLogged = history.length;
  const canAnalyze = daysLogged >= 3;

  // ── Log today's data ────────────────────────────────────────────────────────
  const logToday = async () => {
    if (daysLogged >= 3) {
      // Already have 3 days — clear and start fresh
      await AsyncStorage.removeItem(STORAGE_KEY);
      setHistory([]);
      return;
    }
    const newHistory = [...history, values];
    setHistory(newHistory);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));

    // Reset sliders for next day's entry
    setValues([...DEFAULT_VALUES]);
  };

  // ── Predict ─────────────────────────────────────────────────────────────────
  const predict = async () => {
    if (!canAnalyze) return;
    setLoading(true);
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ features: history }),
      });
      const data = await res.json();

      const riskLabel = data.risk as RiskLabel;
      const conf: number = data.confidence;
      const probs: Record<string, number> = data.probabilities ?? {};

      // Animate meter
      const targetMeter = RISK_CONFIG[riskLabel]?.meterWidth ?? 0.5;
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true }),
      ]).start(() => {
        setRisk(riskLabel);
        setConfidence(conf);
        setProbabilities(probs);
        setActiveTab("result");
        Animated.parallel([
          Animated.timing(meterAnim, { toValue: targetMeter, duration: 900, useNativeDriver: false }),
          Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }),
        ]).start();
      });
    } catch (err) {
      console.log("API ERROR:", err);
    } finally {
      setLoading(false);
    }
  };

  const meterPercent = meterAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const updateValue = (index: number, v: number) => {
    setValues((prev) => {
      const next = [...prev];
      next[index] = v;
      return next;
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a12" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.appName}>MindWatch</Text>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>LSTM v2</Text>
        </View>
      </View>

      {/* Tab switcher */}
      <View style={styles.tabRow}>
        {(["log", "result"] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, activeTab === t && styles.tabActive]}
            onPress={() => setActiveTab(t)}
          >
            <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>
              {t === "log" ? "Log Usage" : "My Risk"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── LOG TAB ── */}
        {activeTab === "log" && (
          <>
            {/* Day progress pills */}
            <View style={styles.pillRow}>
              {[1, 2, 3].map((d) => (
                <DayPill key={d} day={d} filled={d <= daysLogged} />
              ))}
            </View>

            <Text style={styles.subHint}>
              {daysLogged < 3
                ? `Log ${3 - daysLogged} more day${3 - daysLogged > 1 ? "s" : ""} to unlock prediction`
                : "3 days logged — ready to analyze!"}
            </Text>

            {/* Sliders */}
            <View style={styles.sliderCard}>
              <Text style={styles.sectionTitle}>Today's Usage</Text>
              {FEATURES.map((f) => (
                <SliderRow
                  key={f.label}
                  label={f.label}
                  unit={f.unit}
                  min={f.min}
                  max={f.max}
                  value={values[f.index]}
                  onChange={(v) => updateValue(f.index, v)}
                />
              ))}
            </View>

            {/* Log button */}
            <TouchableOpacity
              style={[styles.actionBtn, daysLogged >= 3 && styles.resetBtn]}
              onPress={logToday}
              activeOpacity={0.8}
            >
              <Text style={styles.actionBtnText}>
                {daysLogged >= 3 ? "Reset & Start Over" : `Log Day ${daysLogged + 1}`}
              </Text>
            </TouchableOpacity>

            {/* Analyze button — only when 3 days done */}
            {canAnalyze && (
              <TouchableOpacity
                style={[styles.analyzeBtn, loading && styles.analyzeBtnLoading]}
                onPress={predict}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Text style={styles.analyzeBtnText}>
                  {loading ? "Analyzing..." : "Analyze Now"}
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* ── RESULT TAB ── */}
        {activeTab === "result" && (
          <>
            {risk === null ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>
                  Log 3 days of usage and tap Analyze Now to see your risk.
                </Text>
              </View>
            ) : (
              <Animated.View
                style={[
                  styles.heroCard,
                  { borderColor: config!.dimColor, transform: [{ scale: scaleAnim }] },
                ]}
              >
                <Text style={styles.heroLabel}>Current Risk Level</Text>
                <Animated.View style={{ opacity: fadeAnim }}>
                  <Text style={[styles.riskText, { color: config!.color }]}>{risk}</Text>
                  <Text style={styles.confidenceText}>
                    {confidence}% confidence · {daysLogged} days analyzed
                  </Text>
                </Animated.View>

                {/* Meter */}
                <View style={styles.meterTrack}>
                  <Animated.View
                    style={[styles.meterFill, { width: meterPercent, backgroundColor: config!.color }]}
                  />
                </View>
                <View style={styles.meterLabels}>
                  <Text style={styles.meterLabel}>Mild</Text>
                  <Text style={styles.meterLabel}>Moderate</Text>
                  <Text style={styles.meterLabel}>Severe</Text>
                </View>

                {/* Tip */}
                <View style={[styles.tipBox, { borderColor: config!.dimColor, backgroundColor: config!.bgColor }]}>
                  <Text style={[styles.tipText, { color: config!.color }]}>{config!.tip}</Text>
                </View>

                {/* Probability breakdown */}
                {Object.keys(probabilities).length > 0 && (
                  <View style={styles.probSection}>
                    <Text style={styles.sectionTitle}>Probability Breakdown</Text>
                    {(["Mild", "Moderate", "Severe"] as RiskLabel[]).map((r) => (
                      <View key={r} style={styles.probRow}>
                        <Text style={styles.probLabel}>{r}</Text>
                        <View style={styles.probTrack}>
                          <View
                            style={[
                              styles.probFill,
                              {
                                width: `${probabilities[r] ?? 0}%`,
                                backgroundColor: RISK_CONFIG[r].color,
                              },
                            ]}
                          />
                        </View>
                        <Text style={[styles.probVal, { color: RISK_CONFIG[r].color }]}>
                          {(probabilities[r] ?? 0).toFixed(1)}%
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </Animated.View>
            )}

            {canAnalyze && (
              <TouchableOpacity
                style={[styles.analyzeBtn, loading && styles.analyzeBtnLoading]}
                onPress={predict}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Text style={styles.analyzeBtnText}>
                  {loading ? "Analyzing..." : "Re-Analyze"}
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a12" },
  scroll: { paddingHorizontal: 20, paddingBottom: 20 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 12,
  },
  appName: {
    fontSize: 13, color: "#ffffff", letterSpacing: 3,
    textTransform: "uppercase", fontWeight: "500",
  },
  headerBadge: {
    backgroundColor: "#1a1a2e", borderWidth: 0.5,
    borderColor: "#2a2a4a", borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  headerBadgeText: { fontSize: 11, color: "#8080d0", fontFamily: "monospace" },
  tabRow: {
    flexDirection: "row", gap: 8,
    paddingHorizontal: 20, marginBottom: 16,
  },
  tab: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, borderWidth: 0.5, borderColor: "transparent",
  },
  tabActive: { backgroundColor: "#1a1a3a", borderColor: "#3a3a6a" },
  tabText: { fontSize: 13, color: "#505070" },
  tabTextActive: { color: "#8080d0", fontWeight: "500" },
  pillRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  dayPill: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, borderWidth: 0.5, borderColor: "#2a2a3a",
  },
  dayPillFilled: { backgroundColor: "#1a1a3a", borderColor: "#5050a0" },
  dayPillText: { fontSize: 12, color: "#404060" },
  dayPillTextFilled: { color: "#8080d0", fontWeight: "500" },
  subHint: { fontSize: 12, color: "#505070", marginBottom: 16 },
  sliderCard: {
    backgroundColor: "#0f0f1c", borderWidth: 0.5,
    borderColor: "#1e1e2e", borderRadius: 20,
    padding: 16, marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 10, color: "#505070", letterSpacing: 2,
    textTransform: "uppercase", marginBottom: 14,
  },
  sliderRow: { marginBottom: 14 },
  sliderMeta: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 2,
  },
  sliderLabel: { fontSize: 13, color: "#a0a0c0" },
  sliderVal: { fontSize: 13, color: "#ffffff", fontFamily: "monospace", fontWeight: "500" },
  actionBtn: {
    backgroundColor: "#1a1a3a", borderWidth: 0.5,
    borderColor: "#3a3a6a", borderRadius: 18,
    padding: 14, alignItems: "center", marginBottom: 10,
  },
  resetBtn: { borderColor: "#4a2a2a", backgroundColor: "#1c1010" },
  actionBtnText: { fontSize: 14, fontWeight: "600", color: "#8080d0" },
  analyzeBtn: {
    backgroundColor: "#5050a0", borderRadius: 18,
    padding: 16, alignItems: "center", marginBottom: 10,
  },
  analyzeBtnLoading: { backgroundColor: "#2a2a5a" },
  analyzeBtnText: { fontSize: 15, fontWeight: "600", color: "#ffffff", letterSpacing: 0.5 },
  emptyState: { paddingVertical: 60, alignItems: "center" },
  emptyText: { fontSize: 13, color: "#404060", textAlign: "center", lineHeight: 22 },
  heroCard: {
    backgroundColor: "#0f0f1e", borderRadius: 24,
    borderWidth: 1, padding: 20, marginBottom: 16, overflow: "hidden",
  },
  heroLabel: {
    fontSize: 10, color: "#505070", letterSpacing: 2,
    textTransform: "uppercase", marginBottom: 8,
  },
  riskText: { fontSize: 42, fontWeight: "700", letterSpacing: -1, marginBottom: 4 },
  confidenceText: {
    fontSize: 12, color: "#606080", fontFamily: "monospace",
    marginBottom: 16, paddingBottom: 16,
    borderBottomWidth: 0.5, borderBottomColor: "#1a1a2a",
  },
  meterTrack: {
    height: 4, backgroundColor: "#181828",
    borderRadius: 4, overflow: "hidden", marginBottom: 6,
  },
  meterFill: { height: "100%", borderRadius: 4 },
  meterLabels: {
    flexDirection: "row", justifyContent: "space-between", marginBottom: 16,
  },
  meterLabel: { fontSize: 9, color: "#404060", letterSpacing: 1, textTransform: "uppercase" },
  tipBox: { borderWidth: 0.5, borderRadius: 12, padding: 10, marginBottom: 16 },
  tipText: { fontSize: 12, fontWeight: "500" },
  probSection: { marginTop: 4 },
  probRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  probLabel: { fontSize: 12, color: "#a0a0c0", width: 70 },
  probTrack: {
    flex: 1, height: 3, backgroundColor: "#181828",
    borderRadius: 3, overflow: "hidden",
  },
  probFill: { height: "100%", borderRadius: 3 },
  probVal: { fontSize: 12, fontFamily: "monospace", width: 44, textAlign: "right" },
});
