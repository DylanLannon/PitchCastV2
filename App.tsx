import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Text, ActivityIndicator, View, StyleSheet } from "react-native";
import { useEffect, useState } from "react";
import { Session } from "@supabase/supabase-js";
import { COLORS } from "./constants/colors";
import { supabase } from "./services/supabase";
import LoginScreen from "./screens/LoginScreen";
import OnboardingScreen from "./screens/OnboardingScreen";
import HomeScreen from "./screens/HomeScreen";
import ForecastScreen from "./screens/ForecastScreen";
import MarketsScreen from "./screens/MarketsScreen";
import AlertsScreen from "./screens/AlertsScreen";
import SalesScreen from "./screens/SalesScreen";
import SettingsScreen from "./screens/SettingsScreen";

const Tab = createBottomTabNavigator();

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) checkIfNewUser(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setSession(session);
      if (session) checkIfNewUser(session);
      else setIsNewUser(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkIfNewUser = async (session: Session) => {
    const hasBusinessName = session.user.user_metadata?.business_name;
    if (!hasBusinessName) setIsNewUser(true);
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!session) {
    return (
      <SafeAreaProvider>
        <LoginScreen />
      </SafeAreaProvider>
    );
  }

  if (isNewUser) {
    return (
      <SafeAreaProvider>
        <OnboardingScreen onComplete={() => setIsNewUser(false)} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: COLORS.primary,
            tabBarInactiveTintColor: COLORS.gray400,
            tabBarStyle: {
              backgroundColor: COLORS.white,
              borderTopColor: COLORS.gray200,
              borderTopWidth: 0.5,
              paddingBottom: 8,
              paddingTop: 8,
              height: 60,
            },
          }}
        >
          <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>🏠</Text> }} />
          <Tab.Screen name="Forecast" component={ForecastScreen} options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>📅</Text> }} />
          <Tab.Screen name="Markets" component={MarketsScreen} options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>🏪</Text> }} />
          <Tab.Screen name="Alerts" component={AlertsScreen} options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>🔔</Text> }} />
          <Tab.Screen name="Sales" component={SalesScreen} options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>💷</Text> }} />
          <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>⚙️</Text> }} />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.white },
});