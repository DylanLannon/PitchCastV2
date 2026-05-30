import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { COLORS, FONTS } from "../constants/colors";
import { supabase } from "../services/supabase";
import { getForecast, ForecastDay, assessRisk, getStockRecommendation, isBankHoliday } from "../services/weather";

interface Market {
  id: string;
  name: string;
  location: string;
  lat: number;
  lon: number;
  trading_days: string[];
  product_type: string;
}

export default function ForecastScreen() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadMarkets();
    }, [])
  );

  const loadMarkets = async () => {
    setLoading(true);
    const { data } = await supabase.from("markets").select("*").order("created_at", { ascending: true });
    if (data && data.length > 0) {
      setMarkets(data);
      setSelectedMarket(data[0]);
      await loadForecast(data[0]);
    }
    setLoading(false);
  };

  const loadForecast = async (market: Market) => {
    setLoading(true);
    try {
      const data = await getForecast(market.lat, market.lon);
      setForecast(data);
    } catch {
      setForecast([]);
    }
    setLoading(false);
  };

  const selectMarket = async (market: Market) => {
    setSelectedMarket(market);
    await loadForecast(market);
  };

  const getBarColor = (percentage: number) => {
    if (percentage >= 90) return COLORS.success;
    if (percentage >= 60) return COLORS.warning;
    return COLORS.danger;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>5 Day Forecast</Text>
          {selectedMarket && <Text style={styles.subtitle}>📍 {selectedMarket.name}</Text>}
        </View>

        {markets.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.marketPicker} contentContainerStyle={styles.marketPickerContent}>
            {markets.map(market => (
              <TouchableOpacity
                key={market.id}
                style={[styles.chip, selectedMarket?.id === market.id && styles.chipActive]}
                onPress={() => selectMarket(market)}
              >
                <Text style={[styles.chipText, selectedMarket?.id === market.id && styles.chipTextActive]}>{market.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading forecast...</Text>
          </View>
        ) : markets.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📅</Text>
            <Text style={styles.emptyTitle}>No markets yet</Text>
            <Text style={styles.emptyDesc}>Add a market to see your 5 day forecast</Text>
          </View>
        ) : (
          forecast.map((day, i) => {
            const mockWeather = {
              temp: day.temp,
              windSpeed: day.windSpeed,
              windDeg: 0,
              description: day.description,
              icon: day.icon,
              rainChance: day.rainChance,
              humidity: 0,
              cloudCover: 0,
            };
            const risk = assessRisk(mockWeather);
            const stock = getStockRecommendation(mockWeather, selectedMarket?.product_type);
            const barColor = getBarColor(stock.percentage);
            const isTradeDay = selectedMarket?.trading_days.includes(new Date(day.date + "T12:00:00").toLocaleDateString("en-GB", { weekday: "long" }));
            const bankHoliday = isBankHoliday(day.date);

            return (
              <View key={i} style={[styles.card, !isTradeDay && styles.cardMuted]}>
                <View style={styles.cardHeader}>
                  <View>
                    <View style={styles.dayRow}>
                      <Text style={styles.dayName}>{day.day}</Text>
                      {!isTradeDay && <Text style={styles.noTradeTag}>Not trading</Text>}
                      {bankHoliday && <Text style={styles.bankHolidayTag}>🎉 Bank Holiday</Text>}
                    </View>
                    <Text style={styles.description}>{day.description.charAt(0).toUpperCase() + day.description.slice(1)}</Text>
                  </View>
                  <View style={[styles.riskBadge, { backgroundColor: risk.color }]}>
                    <Text style={styles.riskText}>{risk.emoji} {risk.level === "low" ? "Good" : risk.level === "moderate" ? "Moderate" : "High Risk"}</Text>
                  </View>
                </View>

                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{day.temp}°C</Text>
                    <Text style={styles.statLabel}>Temp</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{day.windSpeed}mph</Text>
                    <Text style={styles.statLabel}>Wind</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{day.rainChance}%</Text>
                    <Text style={styles.statLabel}>Rain</Text>
                  </View>
                </View>

                <View style={styles.stockRow}>
                  <Text style={styles.stockLabel}>📦 Stock: </Text>
                  <Text style={[styles.stockValue, { color: barColor }]}>{stock.percentage}%</Text>
                  <View style={styles.barBg}>
                    <View style={[styles.barFill, { width: `${Math.min(stock.percentage, 100)}%` as any, backgroundColor: barColor }]} />
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray50 },
  header: { padding: 20, backgroundColor: COLORS.white, marginBottom: 8 },
  title: { fontSize: FONTS.size.xxl, fontWeight: "700", color: COLORS.text },
  subtitle: { fontSize: FONTS.size.sm, color: COLORS.textMuted, marginTop: 4 },
  marketPicker: { marginBottom: 8 },
  marketPickerContent: { paddingHorizontal: 16, gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORS.gray200, backgroundColor: COLORS.white },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: FONTS.size.sm, color: COLORS.textMuted },
  chipTextActive: { color: COLORS.white, fontWeight: "600" },
  loadingContainer: { alignItems: "center", justifyContent: "center", padding: 60, gap: 12 },
  loadingText: { fontSize: FONTS.size.md, color: COLORS.textMuted },
  empty: { alignItems: "center", padding: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: FONTS.size.xl, fontWeight: "700", color: COLORS.text, marginBottom: 8 },
  emptyDesc: { fontSize: FONTS.size.md, color: COLORS.textMuted, textAlign: "center" },
  card: { backgroundColor: COLORS.white, marginHorizontal: 16, marginBottom: 8, borderRadius: 16, padding: 16 },
  cardMuted: { opacity: 0.6 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  dayRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dayName: { fontSize: FONTS.size.lg, fontWeight: "700", color: COLORS.text },
  noTradeTag: { fontSize: FONTS.size.xs, color: COLORS.textMuted, backgroundColor: COLORS.gray100, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  bankHolidayTag: { fontSize: FONTS.size.xs, color: "#92400E", backgroundColor: "#FEF3C7", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  description: { fontSize: FONTS.size.sm, color: COLORS.textMuted, marginTop: 2 },
  riskBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  riskText: { color: COLORS.white, fontSize: FONTS.size.xs, fontWeight: "700" },
  statsRow: { flexDirection: "row", gap: 24, marginBottom: 12 },
  statItem: { alignItems: "center" },
  statValue: { fontSize: FONTS.size.md, fontWeight: "700", color: COLORS.text },
  statLabel: { fontSize: FONTS.size.xs, color: COLORS.textMuted, marginTop: 2 },
  stockRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  stockLabel: { fontSize: FONTS.size.sm, color: COLORS.textMuted },
  stockValue: { fontSize: FONTS.size.sm, fontWeight: "700", minWidth: 40 },
  barBg: { flex: 1, height: 6, backgroundColor: COLORS.gray200, borderRadius: 3 },
  barFill: { height: 6, borderRadius: 3 },
});