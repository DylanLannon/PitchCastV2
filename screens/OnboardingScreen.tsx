import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect, useRef } from "react";
import { COLORS, FONTS } from "../constants/colors";
import { supabase } from "../services/supabase";
import { searchLocation, GeoResult } from "../services/weather";

const PRODUCT_TYPES = ["Bakery", "Hot Food", "Confectionery", "Drinks", "Produce", "Crafts", "Other"];
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

interface Props { onComplete: () => void; }

export default function OnboardingScreen({ onComplete }: Props) {
  const [step, setStep] = useState(1);
  const [businessName, setBusinessName] = useState("");
  const [marketName, setMarketName] = useState("");
  const [locationSearch, setLocationSearch] = useState("");
  const [searchResults, setSearchResults] = useState<GeoResult[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<GeoResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [productType, setProductType] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchTimeout = useRef<any>(null);

  useEffect(() => {
    if (!locationSearch.trim() || selectedLocation) {
      setSearchResults([]);
      return;
    }
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      handleLocationSearch();
    }, 500);
    return () => clearTimeout(searchTimeout.current);
  }, [locationSearch]);

  const toggleDay = (day: string) => {
    setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const handleLocationSearch = async () => {
    if (!locationSearch.trim()) return;
    setSearching(true);
    try {
      const results = await searchLocation(locationSearch);
      setSearchResults(results);
      if (results.length === 0) setError("No locations found — try a different search");
    } catch {
      setError("Could not search location, please try again");
    }
    setSearching(false);
  };

  const handleStep1 = async () => {
    if (!businessName.trim()) { setError("Please enter your business name"); return; }
    setLoading(true);
    await supabase.auth.updateUser({ data: { business_name: businessName } });
    setLoading(false);
    setError(null);
    setStep(2);
  };

  const handleComplete = async () => {
    if (!marketName || !selectedLocation || selectedDays.length === 0 || !productType) {
      setError("Please fill in all fields and select a location");
      return;
    }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("markets").insert({
      user_id: user?.id,
      name: marketName,
      location: `${selectedLocation.name}${selectedLocation.state ? ", " + selectedLocation.state : ""}, ${selectedLocation.country}`,
      lat: selectedLocation.lat,
      lon: selectedLocation.lon,
      trading_days: selectedDays,
      product_type: productType,
      pitch_prepaid: false,
    });
    if (error) { setError(error.message); }
    else { onComplete(); }
    setLoading(false);
  };

  if (step === 1) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
          <Text style={styles.logo}>⛅</Text>
          <Text style={styles.title}>Welcome to PitchCast</Text>
          <Text style={styles.subtitle}>Weather intelligence for outdoor traders. Let's get you set up in 2 minutes.</Text>
          <View style={styles.stepRow}>
            <View style={[styles.step, styles.stepActive]} />
            <View style={styles.step} />
          </View>
          <Text style={styles.stepTitle}>What's your business called?</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Butterfold Bakery"
            placeholderTextColor={COLORS.gray400}
            value={businessName}
            onChangeText={setBusinessName}
            autoFocus
          />
          {error && <Text style={styles.error}>{error}</Text>}
          <TouchableOpacity style={styles.btn} onPress={handleStep1} disabled={loading}>
            {loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.btnText}>Continue →</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.skipBtn} onPress={onComplete}>
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
        <Text style={styles.logo}>🏪</Text>
        <Text style={styles.title}>Add your first market</Text>
        <Text style={styles.subtitle}>We'll use this to send you personalised weather alerts and stock recommendations.</Text>
        <View style={styles.stepRow}>
          <View style={[styles.step, styles.stepDone]} />
          <View style={[styles.step, styles.stepActive]} />
        </View>

        <Text style={styles.fieldLabel}>Market name</Text>
        <TextInput style={styles.input} placeholder="e.g. Stokesley Farmers Market" placeholderTextColor={COLORS.gray400} value={marketName} onChangeText={setMarketName} />

        <Text style={styles.fieldLabel}>Search for your market location</Text>
        <Text style={styles.fieldHint}>Start typing your market town or postcode</Text>
        <View style={styles.searchRow}>
          <TextInput
            style={[styles.input, styles.searchInput]}
            placeholder="e.g. Stokesley, North Yorkshire"
            placeholderTextColor={COLORS.gray400}
            value={locationSearch}
            onChangeText={(text) => { setSelectedLocation(null); setLocationSearch(text); }}
          />
          {searching && <ActivityIndicator color={COLORS.primary} style={{ marginLeft: 8 }} />}
        </View>

        {searchResults.length > 0 && !selectedLocation && (
          <View style={styles.resultsBox}>
            {searchResults.map((result, i) => (
              <TouchableOpacity key={i} style={[styles.resultItem, i === searchResults.length - 1 && { borderBottomWidth: 0 }]} onPress={() => { setSelectedLocation(result); setSearchResults([]); }}>
                <Text style={styles.resultName}>{result.name}</Text>
                <Text style={styles.resultDetail}>{result.state ? `${result.state}, ` : ""}{result.country}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {selectedLocation && (
          <View style={styles.selectedLocation}>
            <Text style={styles.selectedLocationText}>📍 {selectedLocation.name}{selectedLocation.state ? `, ${selectedLocation.state}` : ""}, {selectedLocation.country}</Text>
            <TouchableOpacity onPress={() => { setSelectedLocation(null); setLocationSearch(""); }}>
              <Text style={styles.changeBtn}>Change</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.fieldLabel}>Trading days</Text>
        <View style={styles.chipRow}>
          {DAYS.map(day => (
            <TouchableOpacity key={day} style={[styles.chip, selectedDays.includes(day) && styles.chipActive]} onPress={() => toggleDay(day)}>
              <Text style={[styles.chipText, selectedDays.includes(day) && styles.chipTextActive]}>{day.slice(0, 3)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.fieldLabel}>Product type</Text>
        <View style={styles.chipRow}>
          {PRODUCT_TYPES.map(type => (
            <TouchableOpacity key={type} style={[styles.chip, productType === type && styles.chipActive]} onPress={() => setProductType(type)}>
              <Text style={[styles.chipText, productType === type && styles.chipTextActive]}>{type}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {error && <Text style={styles.error}>{error}</Text>}
        <TouchableOpacity style={styles.btn} onPress={handleComplete} disabled={loading}>
          {loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.btnText}>Get started 🚀</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.skipBtn} onPress={onComplete}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  inner: { padding: 24, alignItems: "stretch" },
  logo: { fontSize: 56, textAlign: "center", marginBottom: 12, marginTop: 20 },
  title: { fontSize: FONTS.size.xxl, fontWeight: "700", color: COLORS.text, textAlign: "center", marginBottom: 8 },
  subtitle: { fontSize: FONTS.size.md, color: COLORS.textMuted, textAlign: "center", lineHeight: 22, marginBottom: 24 },
  stepRow: { flexDirection: "row", gap: 8, justifyContent: "center", marginBottom: 32 },
  step: { width: 32, height: 4, borderRadius: 2, backgroundColor: COLORS.gray200 },
  stepActive: { backgroundColor: COLORS.primary },
  stepDone: { backgroundColor: COLORS.success },
  stepTitle: { fontSize: FONTS.size.lg, fontWeight: "600", color: COLORS.text, marginBottom: 12 },
  fieldLabel: { fontSize: FONTS.size.sm, fontWeight: "600", color: COLORS.text, marginBottom: 6, marginTop: 16 },
  fieldHint: { fontSize: FONTS.size.xs, color: COLORS.textMuted, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: COLORS.gray200, borderRadius: 12, padding: 14, fontSize: FONTS.size.md, color: COLORS.text, backgroundColor: COLORS.gray50, marginBottom: 4 },
  searchRow: { flexDirection: "row", alignItems: "center" },
  searchInput: { flex: 1 },
  resultsBox: { borderWidth: 1, borderColor: COLORS.gray200, borderRadius: 12, marginTop: 8, overflow: "hidden" },
  resultItem: { padding: 14, borderBottomWidth: 0.5, borderBottomColor: COLORS.gray200 },
  resultName: { fontSize: FONTS.size.md, fontWeight: "600", color: COLORS.text },
  resultDetail: { fontSize: FONTS.size.sm, color: COLORS.textMuted, marginTop: 2 },
  selectedLocation: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: COLORS.primaryBg, borderRadius: 12, padding: 14, marginTop: 4 },
  selectedLocationText: { fontSize: FONTS.size.sm, color: COLORS.text, flex: 1 },
  changeBtn: { fontSize: FONTS.size.sm, color: COLORS.primary, fontWeight: "600", marginLeft: 8 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORS.gray200, backgroundColor: COLORS.gray50 },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: FONTS.size.sm, color: COLORS.textMuted },
  chipTextActive: { color: COLORS.white, fontWeight: "600" },
  btn: { backgroundColor: COLORS.primary, borderRadius: 12, padding: 16, alignItems: "center", marginTop: 24 },
  btnText: { color: COLORS.white, fontSize: FONTS.size.md, fontWeight: "600" },
  skipBtn: { padding: 12, alignItems: "center", marginTop: 8 },
  skipText: { color: COLORS.textMuted, fontSize: FONTS.size.md },
  error: { fontSize: FONTS.size.sm, color: COLORS.danger, marginTop: 4 },
});