import { CONFIG } from "../constants/config";

export interface WeatherData {
  temp: number;
  windSpeed: number;
  windDeg: number;
  description: string;
  icon: string;
  rainChance: number;
  humidity: number;
  cloudCover: number;
}

export interface ForecastDay {
  date: string;
  day: string;
  temp: number;
  windSpeed: number;
  rainChance: number;
  description: string;
  icon: string;
}

export interface GeoResult {
  name: string;
  lat: number;
  lon: number;
  country: string;
  state?: string;
}

export type RiskLevel = "low" | "moderate" | "high";

export interface RiskAssessment {
  level: RiskLevel;
  emoji: string;
  color: string;
  message: string;
}

export async function searchLocation(query: string): Promise<GeoResult[]> {
  const res = await fetch(
    `${CONFIG.OPENWEATHER_GEO_URL}/direct?q=${encodeURIComponent(query)},GB&limit=5&appid=${CONFIG.OPENWEATHER_API_KEY}`
  );
  const data = await res.json();
  return data.map((item: any) => ({
    name: item.name,
    lat: item.lat,
    lon: item.lon,
    country: item.country,
    state: item.state,
  }));
}

export async function getCurrentWeather(lat: number, lon: number): Promise<WeatherData> {
  const res = await fetch(
    `${CONFIG.OPENWEATHER_BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${CONFIG.OPENWEATHER_API_KEY}&units=metric`
  );
  const data = await res.json();
  return {
    temp: Math.round(data.main.temp),
    windSpeed: Math.round(data.wind.speed * 2.237),
    windDeg: data.wind.deg,
    description: data.weather[0].description,
    icon: data.weather[0].icon,
    rainChance: data.rain ? Math.round((data.rain["1h"] ?? 0) * 100) : 0,
    humidity: data.main.humidity,
    cloudCover: data.clouds?.all ?? 0,
  };
}

export async function getForecast(lat: number, lon: number): Promise<ForecastDay[]> {
  const res = await fetch(
    `${CONFIG.OPENWEATHER_BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${CONFIG.OPENWEATHER_API_KEY}&units=metric`
  );
  const data = await res.json();
  const days: { [key: string]: any[] } = {};
  data.list.forEach((item: any) => {
    const date = item.dt_txt.split(" ")[0];
    if (!days[date]) days[date] = [];
    days[date].push(item);
  });
  return Object.entries(days).slice(0, 5).map(([date, items]) => {
    const midday = items[Math.floor(items.length / 2)];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const d = new Date(date);
    return {
      date,
      day: dayNames[d.getDay()],
      temp: Math.round(midday.main.temp),
      windSpeed: Math.round(midday.wind.speed * 2.237),
      rainChance: Math.round((midday.pop ?? 0) * 100),
      description: midday.weather[0].description,
      icon: midday.weather[0].icon,
    };
  });
}

export function getProductSensitivity(productType?: string): number {
  if (!productType) return 1.0;
  const type = productType.toLowerCase();
  if (type === "bakery" || type === "hot food" || type === "produce") return 1.3;
  if (type === "confectionery" || type === "drinks") return 0.8;
  if (type === "crafts") return 0.6;
  return 1.0;
}

export function getStockRecommendation(weather: WeatherData, productType?: string): { percentage: number; reason: string } {
  let percentage = 100;
  const reasons: string[] = [];
  const sensitivity = getProductSensitivity(productType);

  if (weather.windSpeed > 25) {
    percentage -= Math.round(40 * sensitivity);
    reasons.push("very high winds");
  } else if (weather.windSpeed > 15) {
    percentage -= Math.round(20 * sensitivity);
    reasons.push("strong winds");
  }

  if (weather.rainChance > 80) {
    percentage -= Math.round(30 * sensitivity);
    reasons.push("heavy rain expected");
  } else if (weather.rainChance > 50) {
    percentage -= Math.round(15 * sensitivity);
    reasons.push("rain likely");
  }

  if (weather.temp < 5) {
    percentage -= Math.round(10 * sensitivity);
    reasons.push("very cold temperatures");
  } else if (weather.temp > 20) {
    percentage += Math.round(10 * sensitivity);
    reasons.push("warm sunny weather");
  }

  const day = new Date().getDate();
  if (day >= 1 && day <= 7) percentage += 10;
  else if (day >= 25) percentage -= 15;

  percentage = Math.max(20, Math.min(120, percentage));
  const reason = reasons.length > 0 ? `Due to ${reasons.join(" and ")}` : "Conditions look great today";
  return { percentage, reason };
}

export function assessRisk(weather: WeatherData): RiskAssessment {
  if (weather.windSpeed > 25 || weather.rainChance > 80) {
    return { level: "high", emoji: "🔴", color: "#EF4444", message: "Poor conditions expected. Consider reducing stock levels significantly." };
  }
  if (weather.windSpeed > 15 || weather.rainChance > 50) {
    return { level: "moderate", emoji: "⚠️", color: "#F59E0B", message: "Mixed conditions. Prepare for reduced footfall and adjust stock accordingly." };
  }
  return { level: "low", emoji: "✅", color: "#22C55E", message: "Great conditions. High footfall expected — make sure you have enough stock!" };
}

export const UK_BANK_HOLIDAYS_2026 = [
  "2026-01-01", "2026-04-03", "2026-04-06", "2026-05-04",
  "2026-05-25", "2026-08-31", "2026-12-25", "2026-12-28",
];

export function isBankHoliday(dateStr: string): boolean {
  return UK_BANK_HOLIDAYS_2026.includes(dateStr);
}