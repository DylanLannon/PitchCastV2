import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useCallback, useEffect, useRef } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { COLORS, FONTS } from "../constants/colors";
import { supabase } from "../services/supabase";
import { searchLocation, GeoResult } from "../services/weather";

interface Market {
  id: string;
  name: string;
  location: string;
  lat: number;
  lon: number;
  trading_days: string[];
  product_type: string;
}

const PRODUCT_TYPES = ["Bakery", "Hot Food", "Confectionery", "Drinks", "Produce", "Crafts", "Other"];
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function MarketsScreen() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [marketName, setMarketName] = useState("");
  const [locationSearch, setLocationSearch] = useState("");
  const [searchResults, setSearchResults] = useState<GeoResult[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<GeoResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [productType, setProductType] = useState("");
  const [saving, setSaving] = useState(false);
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

  useFocusEffect(
    useCallback(() => {
      loadMarkets();
    }, [])
  );

  const loadMarkets = async () => {
    setLoading(true);
    const { data } = await supabase.from("markets").select("*").order("created_at", { ascending: true });
    if (data) setMarkets(data);
    setLoading(false);
  };

  const toggleDay = (day: string) => {
    setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const handleLocationSearch = async () => {
    if (!locationSearch.trim()) return;
    setSearching(true);
    setError(null);
    try {
      const results = await searchLocation(locationSearch);
      if (results.length === 0) setError("No locations found — try a different search");
      setSearchResults(results);
    } catch {
      setError("Could not search location, please try again");
    }
    setSearching(false);
  };

  const handleSave = async () => {
    if (!marketName || !selectedLocation || selectedDays.length === 0 || !productType) {
      setError("Please fill in all fields and select a location");
      return;
    }
    setSaving(true);
    setError(null);
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
    if (error) {
      setError(error.message);
    } else {
      resetForm();
      loadMarkets();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (Platform.OS === "web") {
      if (!window.confirm(`Delete ${name}?`)) return;
      await supabase.from("markets").delete().eq("id", id);
      loadMarkets();
    } else {
      Alert.alert("Delete market", `Are you sure you want to delete ${name}?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: async () => { await supabase.from("markets").delete().eq("id", id); loadMarkets(); } },
      ]);
    }
  };

  const resetForm = () => {
    setMarketName("");
    setLocationSearch("");
    setSelectedLocation(null);
    setSearchResults([]);
    setSelectedDays([]);
    setProductType("");
    setError(null);
    setShowForm(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Your Markets</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => showForm ? resetForm() : setShowForm(true)}>
            <Text style={styles.addBtnText}>{showForm ? "Cancel" : "+ Add Market"}</Text>
          </TouchableOpacity>
        </View>

        {showForm && (
          <View style={styles.form}>
            <Text style={styles.formTitle}>Add a market</Text>

            <Text style={styles.fieldLabel}>Market name</Text>
            <TextInput style={styles.input} placeholder="e.g. Stokesley Farmers Market" placeholderTextColor={COLORS.gray400} value={marketName} onChangeText={setMarketName} />

            <Text style={styles.fieldLabel}>Search for location</Text>
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
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.saveBtnText}>Save market</Text>}
            </TouchableOpacity>
          </View>
        )}

        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : markets.length === 0 && !showForm ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🏪</Text>
            <Text style={styles.emptyTitle}>No markets yet</Text>
            <Text style={styles.emptyDesc}>Add your first market to get weather alerts and stock recommendations</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowForm(true)}>
              <Text style={styles.saveBtnText}>Add your first market</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.marketsList}>
            {markets.map(market => (
              <View key={market.id} style={styles.marketCard}>
                <View style={styles.marketCardTop}>
                  <View style={styles.marketInfo}>
                    <Text style={styles.marketName}>{market.name}</Text>
                    <Text style={styles.marketLocation}>📍 {market.location}</Text>
                    <Text style={styles.marketMeta}>{market.trading_days.join(", ")}</Text>
                    <View style={styles.marketTags}>
                      <View style={styles.tag}><Text style={styles.tagText}>{market.product_type}</Text></View>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(market.id, market.name)}>
                    <Text style={styles.deleteBtnText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray50 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, backgroundColor: COLORS.white, marginBottom: 8 },
  title: { fontSize: FONTS.size.xxl, fontWeight: "700", color: COLORS.text },
  addBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  addBtnText: { color: COLORS.white, fontWeight: "600", fontSize: FONTS.size.sm },
  form: { backgroundColor: COLORS.white, marginHorizontal: 16, marginBottom: 8, borderRadius: 16, padding: 16 },
  formTitle: { fontSize: FONTS.size.lg, fontWeight: "600", color: COLORS.text, marginBottom: 16 },
  fieldLabel: { fontSize: FONTS.size.sm, fontWeight: "600", color: COLORS.text, marginBottom: 6, marginTop: 12 },
  fieldHint: { fontSize: FONTS.size.xs, color: COLORS.textMuted, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: COLORS.gray200, borderRadius: 12, padding: 14, fontSize: FONTS.size.md, color: COLORS.text, backgroundColor: COLORS.gray50 },
  searchRow: { flexDirection: "row", alignItems: "center" },
  searchInput: { flex: 1 },
  resultsBox: { borderWidth: 1, borderColor: COLORS.gray200, borderRadius: 12, marginTop: 8, overflow: "hidden" },
  resultItem: { padding: 14, borderBottomWidth: 0.5, borderBottomColor: COLORS.gray200 },
  resultName: { fontSize: FONTS.size.md, fontWeight: "600", color: COLORS.text },
  resultDetail: { fontSize: FONTS.size.sm, color: COLORS.textMuted, marginTop: 2 },
  selectedLocation: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: COLORS.primaryBg, borderRadius: 12, padding: 14, marginTop: 8 },
  selectedLocationText: { fontSize: FONTS.size.sm, color: COLORS.text, flex: 1 },
  changeBtn: { fontSize: FONTS.size.sm, color: COLORS.primary, fontWeight: "600", marginLeft: 8 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORS.gray200, backgroundColor: COLORS.gray50 },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: FONTS.size.sm, color: COLORS.textMuted },
  chipTextActive: { color: COLORS.white, fontWeight: "600" },
  error: { fontSize: FONTS.size.sm, color: COLORS.danger, marginTop: 8 },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: 12, padding: 14, alignItems: "center", marginTop: 16 },
  saveBtnText: { color: COLORS.white, fontWeight: "600", fontSize: FONTS.size.md },
  emptyBtn: { backgroundColor: COLORS.primary, borderRadius: 12, padding: 14, alignItems: "center", marginTop: 16, paddingHorizontal: 24 },
  empty: { alignItems: "center", padding: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: FONTS.size.xl, fontWeight: "700", color: COLORS.text, marginBottom: 8 },
  emptyDesc: { fontSize: FONTS.size.md, color: COLORS.textMuted, textAlign: "center", lineHeight: 22 },
  marketsList: { paddingHorizontal: 16, paddingBottom: 16 },
  marketCard: { backgroundColor: COLORS.white, borderRadius: 16, padding: 16, marginBottom: 8 },
  marketCardTop: { flexDirection: "row", justifyContent: "space-between" },
  marketInfo: { flex: 1 },
  marketName: { fontSize: FONTS.size.lg, fontWeight: "700", color: COLORS.text },
  marketLocation: { fontSize: FONTS.size.sm, color: COLORS.textMuted, marginTop: 4 },
  marketMeta: { fontSize: FONTS.size.sm, color: COLORS.textMuted, marginTop: 2 },
  marketTags: { flexDirection: "row", gap: 6, marginTop: 8 },
  tag: { backgroundColor: COLORS.primaryLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  tagText: { fontSize: FONTS.size.xs, color: COLORS.primary, fontWeight: "600" },
  deleteBtn: { padding: 8 },
  deleteBtnText: { fontSize: FONTS.size.sm, color: COLORS.danger, fontWeight: "600" },
});