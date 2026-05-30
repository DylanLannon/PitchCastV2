import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { COLORS, FONTS } from "../constants/colors";
import { supabase } from "../services/supabase";
import { getCurrentWeather, assessRisk, getStockRecommendation, isBankHoliday, WeatherData } from "../services/weather";

interface Market {
  id: string;
  name: string;
  location: string;
  lat: number;
  lon: number;
  trading_days: string[];
  product_type: string;
  pitch_prepaid: boolean;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getWeatherEmoji(description: string) {
  const d = description.toLowerCase();
  if (d.includes("clear")) return "☀️";
  if (d.includes("cloud")) return "⛅";
  if (d.includes("rain") || d.includes("drizzle")) return "🌧️";
  if (d.includes("storm")) return "⛈️";
  if (d.includes("snow")) return "❄️";
  if (d.includes("fog") || d.includes("mist")) return "🌫️";
  return "⛅";
}

export default function HomeScreen() {
  const [businessName, setBusinessName] = useState("");
  const [primaryMarket, setPrimaryMarket] = useState<Market | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [today] = useState(new Date().toISOString().split("T")[0]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setBusinessName(user?.user_metadata?.business_name ?? "Your Business");
      const { data: markets } = await supabase.from("markets").select("*").order("created_at", { ascending: true }).limit(1);
      if (markets && markets.length > 0) {
        setPrimaryMarket(markets[0]);
        const weatherData = await getCurrentWeather(markets[0].lat, markets[0].lon);
        setWeather(weatherData);
      }
    } catch (e) {
      console.log("Error loading home data:", e);
    }
    setLoading(false);
  };

  const risk = weather ? assessRisk(weather) : null;
  const stock = weather && primaryMarket ? getStockRecommendation(weather, primaryMarket.product_type) : null;
  const isTradeDay = primaryMarket ? primaryMarket.trading_days.includes(new Date().toLocaleDateString("en-GB", { weekday: "long" })) : false;
  const bankHoliday = isBankHoliday(today);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()} 👋</Text>
            <Text style={styles.businessName}>{businessName}</Text>
          </View>
          {weather && <Text style={styles.weatherEmoji}>{getWeatherEmoji(weather.description)}</Text>}
        </View>

        {bankHoliday && (
          <View style={styles.bankHolidayBanner}>
            <Text style={styles.bankHolidayText}>🎉 Bank Holiday today — expect higher footfall!</Text>
          </View>
        )}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading your forecast...</Text>
          </View>
        ) : !primaryMarket ? (
          <View style={styles.noMarketCard}>
            <Text style={styles.noMarketEmoji}>🏪</Text>
            <Text style={styles.noMarketTitle}>Add your first market</Text>
            <Text style={styles.noMarketText}>Go to the Markets tab to add your first market and start getting personalised weather recommendations.</Text>
          </View>
        ) : (
          <>
            <View style={styles.weatherCard}>
              <View style={styles.weatherHeader}>
                <Text style={styles.weatherTitle}>Today's Forecast</Text>
                <Text style={styles.marketName}>📍 {primaryMarket.name}</Text>
              </View>
              {risk && (
                <View style={[styles.riskBadge, { backgroundColor: risk.color }]}>
                  <Text style={styles.riskEmoji}>{risk.emoji}</Text>
                  <Text style={styles.riskText}>{risk.level === "low" ? "Low Risk" : risk.level === "moderate" ? "Moderate Risk" : "High Risk"}</Text>
                </View>
              )}
              {risk && <Text style={styles.riskMessage}>{risk.message}</Text>}
              {weather && (
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{weather.temp}°C</Text>
                    <Text style={styles.statLabel}>Temp</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{weather.windSpeed}mph</Text>
                    <Text style={styles.statLabel}>Wind</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{weather.humidity}%</Text>
                    <Text style={styles.statLabel}>Humidity</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{weather.rainChance}%</Text>
                    <Text style={styles.statLabel}>Rain</Text>
                  </View>
                </View>
              )}
            </View>

            {stock && (
              <View style={styles.stockCard}>
                <Text style={styles.stockTitle}>📦 Stock Recommendation</Text>
                {primaryMarket.product_type && (
                  <View style={styles.productTag}>
                    <Text style={styles.productTagText}>{primaryMarket.product_type}</Text>
                  </View>
                )}
                <View style={styles.stockRow}>
                  <Text style={[styles.stockPercentage, { color: stock.percentage >= 90 ? COLORS.success : stock.percentage >= 60 ? COLORS.warning : COLORS.danger }]}>
                    {stock.percentage}%
                  </Text>
                  <Text style={styles.stockLabel}>of usual stock</Text>
                </View>
                <View style={styles.barBg}>
                  <View style={[styles.barFill, {
                    width: `${Math.min(stock.percentage, 100)}%` as any,
                    backgroundColor: stock.percentage >= 90 ? COLORS.success : stock.percentage >= 60 ? COLORS.warning : COLORS.danger
                  }]} />
                </View>
                <Text style={styles.stockReason}>{stock.reason}</Text>
              </View>
            )}

            {weather && (
              <View style={styles.conditionsCard}>
                <Text style={styles.conditionsTitle}>Conditions</Text>
                <Text style={styles.conditionsText}>
                  {weather.description.charAt(0).toUpperCase() + weather.description.slice(1)}
                </Text>
              </View>
            )}

            {!isTradeDay && (
              <View style={styles.noTradeDayCard}>
                <Text style={styles.noTradeDayText}>📅 Not a trading day for {primaryMarket.name}</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray50 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, backgroundColor: COLORS.white, marginBottom: 8 },
  greeting: { fontSize: FONTS.size.md, color: COLORS.textMuted },
  businessName: { fontSize: FONTS.size.xxl, fontWeight: "700", color: COLORS.text, marginTop: 2 },
  weatherEmoji: { fontSize: 40 },
  bankHolidayBanner: { backgroundColor: "#FEF3C7", marginHorizontal: 16, marginBottom: 8, borderRadius: 12, padding: 12 },
  bankHolidayText: { fontSize: FONTS.size.sm, color: "#92400E", fontWeight: "600" },
  loadingContainer: { alignItems: "center", justifyContent: "center", padding: 60, gap: 12 },
  loadingText: { fontSize: FONTS.size.md, color: COLORS.textMuted },
  noMarketCard: { margin: 16, backgroundColor: COLORS.white, borderRadius: 16, padding: 24, alignItems: "center" },
  noMarketEmoji: { fontSize: 48, marginBottom: 12 },
  noMarketTitle: { fontSize: FONTS.size.xl, fontWeight: "700", color: COLORS.text, marginBottom: 8 },
  noMarketText: { fontSize: FONTS.size.md, color: COLORS.textMuted, textAlign: "center", lineHeight: 22 },
  weatherCard: { backgroundColor: COLORS.white, marginHorizontal: 16, marginBottom: 8, borderRadius: 16, padding: 16 },
  weatherHeader: { marginBottom: 12 },
  weatherTitle: { fontSize: FONTS.size.sm, fontWeight: "600", color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.8 },
  marketName: { fontSize: FONTS.size.md, fontWeight: "600", color: COLORS.text, marginTop: 4 },
  riskBadge: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 8 },
  riskEmoji: { fontSize: 16 },
  riskText: { color: COLORS.white, fontWeight: "700", fontSize: FONTS.size.sm },
  riskMessage: { fontSize: FONTS.size.sm, color: COLORS.textMuted, lineHeight: 20, marginBottom: 16 },
  statsRow: { flexDirection: "row", justifyContent: "space-between" },
  statItem: { alignItems: "center" },
  statValue: { fontSize: FONTS.size.lg, fontWeight: "700", color: COLORS.text },
  statLabel: { fontSize: FONTS.size.xs, color: COLORS.textMuted, marginTop: 2 },
  stockCard: { backgroundColor: COLORS.white, marginHorizontal: 16, marginBottom: 8, borderRadius: 16, padding: 16 },
  stockTitle: { fontSize: FONTS.size.sm, fontWeight: "600", color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 },
  productTag: { backgroundColor: COLORS.primaryLight, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 10 },
  productTagText: { fontSize: FONTS.size.xs, color: COLORS.primary, fontWeight: "600" },
  stockRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginBottom: 10 },
  stockPercentage: { fontSize: FONTS.size.xxxl, fontWeight: "700" },
  stockLabel: { fontSize: FONTS.size.sm, color: COLORS.textMuted, marginBottom: 8 },
  barBg: { height: 8, backgroundColor: COLORS.gray200, borderRadius: 4, marginBottom: 10 },
  barFill: { height: 8, borderRadius: 4 },
  stockReason: { fontSize: FONTS.size.sm, color: COLORS.textMuted },
  conditionsCard: { backgroundColor: COLORS.white, marginHorizontal: 16, marginBottom: 8, borderRadius: 16, padding: 16 },
  conditionsTitle: { fontSize: FONTS.size.sm, fontWeight: "600", color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 },
  conditionsText: { fontSize: FONTS.size.md, color: COLORS.text },
  noTradeDayCard: { backgroundColor: COLORS.gray100, marginHorizontal: 16, marginBottom: 8, borderRadius: 12, padding: 14 },
  noTradeDayText: { fontSize: FONTS.size.sm, color: COLORS.textMuted, textAlign: "center" },
});