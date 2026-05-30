import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { COLORS, FONTS } from "../constants/colors";
import { supabase } from "../services/supabase";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email.trim()) { setError("Please enter your email"); return; }
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: Platform.OS === "web" ? window.location.origin : "pitchcast://",
      },
    });
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.inner}>
        <View style={styles.hero}>
          <Text style={styles.logo}>⛅</Text>
          <Text style={styles.title}>PitchCast</Text>
          <Text style={styles.subtitle}>Weather intelligence for outdoor traders</Text>
        </View>

        {sent ? (
          <View style={styles.sentBox}>
            <Text style={styles.sentEmoji}>📧</Text>
            <Text style={styles.sentTitle}>Check your email</Text>
            <Text style={styles.sentText}>We've sent a magic link to {email}. Click it to sign in — no password needed.</Text>
            <TouchableOpacity onPress={() => setSent(false)}>
              <Text style={styles.resend}>Send again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.form}>
            <Text style={styles.formLabel}>Enter your email to get started</Text>
            <TextInput
              style={styles.input}
              placeholder="your@email.com"
              placeholderTextColor={COLORS.gray400}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {error && <Text style={styles.error}>{error}</Text>}
            <TouchableOpacity style={styles.btn} onPress={handleLogin} disabled={loading}>
              {loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.btnText}>Send magic link →</Text>}
            </TouchableOpacity>
            <Text style={styles.hint}>No account needed — just enter your email and we'll send you a link</Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  inner: { flex: 1, padding: 24, justifyContent: "center" },
  hero: { alignItems: "center", marginBottom: 48 },
  logo: { fontSize: 64, marginBottom: 12 },
  title: { fontSize: 32, fontWeight: "700", color: COLORS.text, marginBottom: 8 },
  subtitle: { fontSize: FONTS.size.md, color: COLORS.textMuted, textAlign: "center" },
  form: { gap: 12 },
  formLabel: { fontSize: FONTS.size.md, fontWeight: "600", color: COLORS.text, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: COLORS.gray200, borderRadius: 12, padding: 16, fontSize: FONTS.size.md, color: COLORS.text, backgroundColor: COLORS.gray50 },
  error: { fontSize: FONTS.size.sm, color: COLORS.danger },
  btn: { backgroundColor: COLORS.primary, borderRadius: 12, padding: 16, alignItems: "center" },
  btnText: { color: COLORS.white, fontSize: FONTS.size.md, fontWeight: "600" },
  hint: { fontSize: FONTS.size.sm, color: COLORS.textMuted, textAlign: "center", lineHeight: 20 },
  sentBox: { alignItems: "center", gap: 12 },
  sentEmoji: { fontSize: 48 },
  sentTitle: { fontSize: FONTS.size.xl, fontWeight: "700", color: COLORS.text },
  sentText: { fontSize: FONTS.size.md, color: COLORS.textMuted, textAlign: "center", lineHeight: 22 },
  resend: { fontSize: FONTS.size.sm, color: COLORS.primary, fontWeight: "600" },
});