export const CONFIG = {
    OPENWEATHER_API_KEY: process.env.EXPO_PUBLIC_OPENWEATHER_KEY ?? "",
    OPENWEATHER_BASE_URL: "https://api.openweathermap.org/data/2.5",
    OPENWEATHER_GEO_URL: "https://api.openweathermap.org/geo/1.0",
    SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
    SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
  };