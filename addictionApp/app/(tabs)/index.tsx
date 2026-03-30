import { useEffect, useRef, useState } from "react";
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

const { width } = Dimensions.get("window");

const API_URL = "http://192.168.1.41:5000/predict";

// Sample feature data representing 3 timesteps of usage
const SAMPLE_FEATURES = [
  [120, 60, 30, 80, 20, 5],
  [130, 70, 20, 90, 25, 6],
  [150, 80, 40, 100, 30, 7],
];

const RISK_CONFIG = {
  0: {
    label: "Low Risk",
    shortLabel: "Low",
    color: "#1DB86A",
    dimColor: "#0e5a33",
    bgColor: "#071a10",
    meterWidth: "18%",
    tip: "Great job! Your usage looks healthy.",
  },
  1: {
    label: "Medium Risk",
    shortLabel: "Medium",
    color: "#F0A020",
    dimColor: "#7a5010",
    bgColor: "#1c1200",
    meterWidth: "58%",
    tip: "Try reducing social media time before bed.",
  },
  2: {
    label: "High Risk",
    shortLabel: "High",
    color: "#E04A4A",
    dimColor: "#7a2424",
    bgColor: "#1c0808",
    meterWidth: "90%",
    tip: "Consider a digital detox. Set app limits.",
  },
};

type RiskLevel = 0 | 1 | 2;

interface StatCardProps {
  icon: string;
  value: string;
  label: string;
  barWidth: string;
  barColor: string;
}

function StatCard({ icon, value, label, barWidth, barColor }: StatCardProps) {
  const barAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(barAnim, {
      toValue: 1,
      duration: 900,
      useNativeDriver: false,
    }).start();
  }, [value]);

  const animatedWidth = barAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", barWidth],
  });

  return (
    <View style={styles.statCard}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statTrack}>
        <Animated.View
          style={[
            styles.statFill,
            { width: animatedWidth, backgroundColor: barColor },
          ]}
        />
      </View>
    </View>
  );
}

interface AppBarProps {
  name: string;
  time: string;
  pct: number;
  color: string;
}

function AppBar({ name, time, pct, color }: AppBarProps) {
  const barAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(barAnim, {
      toValue: pct / 100,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [pct]);

  const animatedWidth = barAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", `${pct}%`],
  });

  return (
    <View style={styles.appBarRow}>
      <View style={[styles.appDot, { backgroundColor: color }]} />
      <View style={styles.appBarInfo}>
        <Text style={styles.appBarName}>{name}</Text>
        <View style={styles.appBarTrack}>
          <Animated.View
            style={[
              styles.appBarFill,
              { width: animatedWidth, backgroundColor: color },
            ]}
          />
        </View>
      </View>
      <Text style={styles.appBarTime}>{time}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const [risk, setRisk] = useState<RiskLevel>(1);
  const [confidence, setConfidence] = useState(68);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [hasResult, setHasResult] = useState(false);

  const meterAnim = useRef(new Animated.Value(0.58)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  const config = RISK_CONFIG[risk];

  const animateToRisk = (newRisk: RiskLevel, newConf: number) => {
    const targetMeter = newRisk === 0 ? 0.18 : newRisk === 1 ? 0.58 : 0.9;

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true }),
    ]).start(() => {
      setRisk(newRisk);
      setConfidence(newConf);
      Animated.parallel([
        Animated.timing(meterAnim, {
          toValue: targetMeter,
          duration: 800,
          useNativeDriver: false,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 5,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const predict = async () => {
    setLoading(true);
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ features: SAMPLE_FEATURES }),
      });
      const data = await res.json();
      console.log("RESPONSE:", JSON.stringify(data));

      const riskMap: Record<string, RiskLevel> = {
        Mild: 0,
        Moderate: 1,
        Severe: 2,
      };
      const riskLevel = riskMap[data.risk] ?? 1;
      animateToRisk(riskLevel, Math.round(data.confidence));
      setHasResult(true);
    } catch (err) {
      console.log("API ERROR:", err);
      // do nothing, keep current result
    } finally {
      setLoading(false);
    }
  };

  const meterPercent = meterAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const tabs = ["Today", "Week", "Month"];

  const statsData = [
    {
      icon: "⏱",
      value: risk === 0 ? "2h 05m" : risk === 1 ? "4h 12m" : "7h 48m",
      label: "Screen time",
      barWidth: risk === 0 ? "28%" : risk === 1 ? "70%" : "95%",
      barColor: config.color,
    },
    {
      icon: "📲",
      value: risk === 0 ? "34" : risk === 1 ? "87" : "134",
      label: "Unlocks",
      barWidth: risk === 0 ? "22%" : risk === 1 ? "58%" : "89%",
      barColor: "#8080d0",
    },
    {
      icon: "🌙",
      value: risk === 0 ? "8m" : risk === 1 ? "42m" : "95m",
      label: "Night usage",
      barWidth: risk === 0 ? "8%" : risk === 1 ? "42%" : "95%",
      barColor: "#5050a0",
    },
    {
      icon: "🎯",
      value: risk === 0 ? "4m" : risk === 1 ? "7m" : "12m",
      label: "Avg session",
      barWidth: risk === 0 ? "20%" : risk === 1 ? "35%" : "60%",
      barColor: "#1DB86A",
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a12" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appName}>MindWatch</Text>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>LSTM v1</Text>
          </View>
        </View>

        {/* Hero Risk Card */}
        {!hasResult ? (
          <View style={styles.heroCard}>
            <Text
              style={{
                color: "#404060",
                textAlign: "center",
                marginVertical: 40,
                fontSize: 13,
              }}
            >
              Tap Analyze Now to check your addiction risk
            </Text>
          </View>
        ) : (
          <Animated.View
            style={[
              styles.heroCard,
              {
                borderColor: config.dimColor,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <Animated.View
              style={[
                styles.heroGlow,
                { backgroundColor: config.color, opacity: glowOpacity },
              ]}
            />
            <Text style={styles.heroLabel}>Current Risk Level</Text>
            <Animated.View style={{ opacity: fadeAnim }}>
              <Text style={[styles.riskText, { color: config.color }]}>
                {config.shortLabel}
              </Text>
              <Text style={styles.confidenceText}>
                {confidence}% confidence · updated just now
              </Text>
            </Animated.View>
            <View style={styles.meterTrack}>
              <Animated.View
                style={[
                  styles.meterFill,
                  { width: meterPercent, backgroundColor: config.color },
                ]}
              />
            </View>
            <View style={styles.meterLabels}>
              <Text style={styles.meterLabel}>Low</Text>
              <Text style={styles.meterLabel}>Medium</Text>
              <Text style={styles.meterLabel}>High</Text>
            </View>
            <View
              style={[
                styles.tipBox,
                {
                  borderColor: config.dimColor,
                  backgroundColor: config.bgColor,
                },
              ]}
            >
              <Text style={[styles.tipText, { color: config.color }]}>
                {config.tip}
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Tabs */}
        <View style={styles.tabRow}>
          {tabs.map((t, i) => (
            <TouchableOpacity
              key={t}
              style={[styles.tab, activeTab === i && styles.tabActive]}
              onPress={() => setActiveTab(i)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === i && styles.tabTextActive,
                ]}
              >
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stats Grid */}
        <Text style={styles.sectionTitle}>Usage Snapshot</Text>
        <View style={styles.statsGrid}>
          {statsData.map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </View>

        {/* App Breakdown */}
        <Text style={styles.sectionTitle}>App Breakdown</Text>
        <View style={styles.breakdownCard}>
          <AppBar
            name="Social Media"
            time={risk === 0 ? "18m" : risk === 1 ? "72m" : "148m"}
            pct={risk === 0 ? 18 : risk === 1 ? 72 : 98}
            color="#E04A4A"
          />
          <AppBar
            name="Gaming"
            time={risk === 0 ? "10m" : risk === 1 ? "48m" : "92m"}
            pct={risk === 0 ? 10 : risk === 1 ? 48 : 92}
            color="#8080d0"
          />
          <AppBar
            name="Productivity"
            time={risk === 0 ? "55m" : risk === 1 ? "30m" : "12m"}
            pct={risk === 0 ? 55 : risk === 1 ? 30 : 12}
            color="#1DB86A"
          />
          <AppBar
            name="Other"
            time={risk === 0 ? "15m" : risk === 1 ? "22m" : "38m"}
            pct={risk === 0 ? 15 : risk === 1 ? 22 : 38}
            color="#404060"
          />
        </View>

        {/* Analyze Button */}
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

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a12",
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 56,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  appName: {
    fontSize: 13,
    color: "#5a5a7a",
    letterSpacing: 3,
    textTransform: "uppercase",
    fontWeight: "500",
  },
  headerBadge: {
    backgroundColor: "#1a1a2e",
    borderWidth: 0.5,
    borderColor: "#2a2a4a",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  headerBadgeText: {
    fontSize: 11,
    color: "#6060a0",
    fontFamily: "monospace",
  },
  heroCard: {
    backgroundColor: "#0f0f1e",
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20,
    overflow: "hidden",
    position: "relative",
  },
  heroGlow: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  heroLabel: {
    fontSize: 10,
    color: "#404060",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  riskText: {
    fontSize: 42,
    fontWeight: "700",
    letterSpacing: -1,
    marginBottom: 4,
  },
  confidenceText: {
    fontSize: 12,
    color: "#404060",
    fontFamily: "monospace",
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: "#1a1a2a",
  },
  meterTrack: {
    height: 4,
    backgroundColor: "#181828",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 6,
  },
  meterFill: {
    height: "100%",
    borderRadius: 4,
  },
  meterLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  meterLabel: {
    fontSize: 9,
    color: "#353550",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  tipBox: {
    borderWidth: 0.5,
    borderRadius: 12,
    padding: 10,
  },
  tipText: {
    fontSize: 12,
    fontWeight: "500",
  },
  tabRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: "transparent",
  },
  tabActive: {
    backgroundColor: "#1a1a3a",
    borderColor: "#3a3a6a",
  },
  tabText: {
    fontSize: 12,
    color: "#404060",
  },
  tabTextActive: {
    color: "#8080d0",
    fontWeight: "500",
  },
  sectionTitle: {
    fontSize: 10,
    color: "#404060",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    width: (width - 50) / 2,
    backgroundColor: "#0f0f1c",
    borderWidth: 0.5,
    borderColor: "#1e1e2e",
    borderRadius: 16,
    padding: 14,
  },
  statIcon: {
    fontSize: 16,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "600",
    color: "#c0c0e0",
    fontFamily: "monospace",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: "#404060",
    marginBottom: 8,
  },
  statTrack: {
    height: 2,
    backgroundColor: "#1a1a2a",
    borderRadius: 2,
    overflow: "hidden",
  },
  statFill: {
    height: "100%",
    borderRadius: 2,
  },
  breakdownCard: {
    backgroundColor: "#0f0f1c",
    borderWidth: 0.5,
    borderColor: "#1e1e2e",
    borderRadius: 20,
    padding: 16,
    gap: 14,
    marginBottom: 24,
  },
  appBarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  appDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  appBarInfo: {
    flex: 1,
  },
  appBarName: {
    fontSize: 12,
    color: "#a0a0c0",
    marginBottom: 4,
  },
  appBarTrack: {
    height: 3,
    backgroundColor: "#181828",
    borderRadius: 3,
    overflow: "hidden",
  },
  appBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  appBarTime: {
    fontSize: 11,
    color: "#505070",
    fontFamily: "monospace",
    width: 36,
    textAlign: "right",
  },
  analyzeBtn: {
    backgroundColor: "#1a1a3a",
    borderWidth: 0.5,
    borderColor: "#3a3a6a",
    borderRadius: 18,
    padding: 16,
    alignItems: "center",
  },
  analyzeBtnLoading: {
    borderColor: "#2a2a4a",
    backgroundColor: "#141428",
  },
  analyzeBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#8080d0",
    letterSpacing: 0.5,
  },
});
