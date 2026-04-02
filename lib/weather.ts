/**
 * 天気予報ライブラリ
 *
 * - Open-Meteo API（完全無料、APIキー不要）
 * - 渡航先の滞在期間中の天気予報を取得
 * - 7日先まで対応（それ以上は過去の気候データで補完）
 * - オフラインキャッシュ付き
 *
 * API: https://open-meteo.com/en/docs
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ===== 型定義 =====

export interface DailyWeather {
  date: string;                // YYYY-MM-DD
  weatherCode: number;         // WMO Weather code
  tempMax: number;             // 最高気温 (°C)
  tempMin: number;             // 最低気温 (°C)
  precipitationProb: number;   // 降水確率 (%)
  precipitationSum: number;    // 降水量 (mm)
  windSpeedMax: number;        // 最大風速 (km/h)
  uvIndexMax: number;          // UV指数
  humidity: number;            // 平均湿度 (%)
}

export interface WeatherForecast {
  location: string;            // 都市名
  countryCode: string;
  latitude: number;
  longitude: number;
  timezone: string;
  daily: DailyWeather[];
  fetchedAt: string;           // ISO 8601
}

// ===== 主要都市の座標 =====
// 渡航先の国コードから代表都市の座標を取得

const CITY_COORDINATES: Record<string, { name: string; lat: number; lon: number }> = {
  US: { name: 'ニューヨーク', lat: 40.7128, lon: -74.0060 },
  KR: { name: 'ソウル', lat: 37.5665, lon: 126.9780 },
  TW: { name: '台北', lat: 25.0330, lon: 121.5654 },
  TH: { name: 'バンコク', lat: 13.7563, lon: 100.5018 },
  SG: { name: 'シンガポール', lat: 1.3521, lon: 103.8198 },
  GB: { name: 'ロンドン', lat: 51.5074, lon: -0.1278 },
  FR: { name: 'パリ', lat: 48.8566, lon: 2.3522 },
  DE: { name: 'ベルリン', lat: 52.5200, lon: 13.4050 },
  IT: { name: 'ローマ', lat: 41.9028, lon: 12.4964 },
  ES: { name: 'マドリード', lat: 40.4168, lon: -3.7038 },
  AU: { name: 'シドニー', lat: -33.8688, lon: 151.2093 },
  HK: { name: '香港', lat: 22.3193, lon: 114.1694 },
  VN: { name: 'ハノイ', lat: 21.0278, lon: 105.8342 },
  MY: { name: 'クアラルンプール', lat: 3.1390, lon: 101.6869 },
  ID: { name: 'ジャカルタ', lat: -6.2088, lon: 106.8456 },
  CN: { name: '北京', lat: 39.9042, lon: 116.4074 },
  PH: { name: 'マニラ', lat: 14.5995, lon: 120.9842 },
  NZ: { name: 'オークランド', lat: -36.8485, lon: 174.7633 },
  CA: { name: 'バンクーバー', lat: 49.2827, lon: -123.1207 },
  AE: { name: 'ドバイ', lat: 25.2048, lon: 55.2708 },
  IN: { name: 'デリー', lat: 28.6139, lon: 77.2090 },
  TR: { name: 'イスタンブール', lat: 41.0082, lon: 28.9784 },
  NL: { name: 'アムステルダム', lat: 52.3676, lon: 4.9041 },
  CH: { name: 'チューリッヒ', lat: 47.3769, lon: 8.5417 },
  PT: { name: 'リスボン', lat: 38.7223, lon: -9.1393 },
  GR: { name: 'アテネ', lat: 37.9838, lon: 23.7275 },
  SE: { name: 'ストックホルム', lat: 59.3293, lon: 18.0686 },
  FI: { name: 'ヘルシンキ', lat: 60.1699, lon: 24.9384 },
  DK: { name: 'コペンハーゲン', lat: 55.6761, lon: 12.5683 },
  NO: { name: 'オスロ', lat: 59.9139, lon: 10.7522 },
  MX: { name: 'メキシコシティ', lat: 19.4326, lon: -99.1332 },
  BR: { name: 'サンパウロ', lat: -23.5505, lon: -46.6333 },
  EG: { name: 'カイロ', lat: 30.0444, lon: 31.2357 },
  ZA: { name: 'ケープタウン', lat: -33.9249, lon: 18.4241 },
  KE: { name: 'ナイロビ', lat: -1.2921, lon: 36.8219 },
  KH: { name: 'プノンペン', lat: 11.5564, lon: 104.9282 },
  MM: { name: 'ヤンゴン', lat: 16.8661, lon: 96.1951 },
  LK: { name: 'コロンボ', lat: 6.9271, lon: 79.8612 },
  NP: { name: 'カトマンズ', lat: 27.7172, lon: 85.3240 },
  MV: { name: 'マレ', lat: 4.1755, lon: 73.5093 },
  HU: { name: 'ブダペスト', lat: 47.4979, lon: 19.0402 },
  HR: { name: 'ザグレブ', lat: 45.8150, lon: 15.9819 },
  CZ: { name: 'プラハ', lat: 50.0755, lon: 14.4378 },
  AT: { name: 'ウィーン', lat: 48.2082, lon: 16.3738 },
  QA: { name: 'ドーハ', lat: 25.2854, lon: 51.5310 },
  PE: { name: 'リマ', lat: -12.0464, lon: -77.0428 },
  MA: { name: 'マラケシュ', lat: 31.6295, lon: -7.9811 },
  TZ: { name: 'ダルエスサラーム', lat: -6.7924, lon: 39.2083 },
};

// ===== WMO天気コード → 表示 =====

export function getWeatherDisplay(code: number): { emoji: string; label: string } {
  if (code === 0) return { emoji: '☀️', label: '快晴' };
  if (code <= 3) return { emoji: '⛅', label: '晴れ時々曇り' };
  if (code <= 49) return { emoji: '🌫️', label: '霧' };
  if (code <= 59) return { emoji: '🌦️', label: '小雨' };
  if (code <= 69) return { emoji: '🌧️', label: '雨' };
  if (code <= 79) return { emoji: '🌨️', label: '雪' };
  if (code <= 84) return { emoji: '🌧️', label: '強い雨' };
  if (code <= 89) return { emoji: '🌨️', label: '強い雪' };
  if (code <= 99) return { emoji: '⛈️', label: '雷雨' };
  return { emoji: '🌤️', label: '不明' };
}

/**
 * 国コードから座標を取得
 */
export function getCoordinates(countryCode: string): { name: string; lat: number; lon: number } | null {
  return CITY_COORDINATES[countryCode] || null;
}

// ===== API呼び出し =====

const WEATHER_CACHE_PREFIX = 'tripready_weather_';
const CACHE_DURATION_MS = 3 * 60 * 60 * 1000; // 3時間キャッシュ

/**
 * Open-Meteo API で天気予報を取得（最大16日先まで）
 */
export async function fetchWeatherForecast(
  countryCode: string,
): Promise<WeatherForecast | null> {
  const coords = getCoordinates(countryCode);
  if (!coords) return null;

  // キャッシュ確認
  const cacheKey = `${WEATHER_CACHE_PREFIX}${countryCode}`;
  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached) as WeatherForecast;
      if (Date.now() - new Date(parsed.fetchedAt).getTime() < CACHE_DURATION_MS) {
        return parsed;
      }
    }
  } catch {}

  // API呼び出し
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,uv_index_max,relative_humidity_2m_mean&timezone=auto&forecast_days=16`;

    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    if (!data.daily) return null;

    const daily: DailyWeather[] = data.daily.time.map((date: string, i: number) => ({
      date,
      weatherCode: data.daily.weather_code[i],
      tempMax: Math.round(data.daily.temperature_2m_max[i]),
      tempMin: Math.round(data.daily.temperature_2m_min[i]),
      precipitationProb: data.daily.precipitation_probability_max?.[i] ?? 0,
      precipitationSum: data.daily.precipitation_sum?.[i] ?? 0,
      windSpeedMax: Math.round(data.daily.wind_speed_10m_max?.[i] ?? 0),
      uvIndexMax: Math.round(data.daily.uv_index_max?.[i] ?? 0),
      humidity: Math.round(data.daily.relative_humidity_2m_mean?.[i] ?? 0),
    }));

    const forecast: WeatherForecast = {
      location: coords.name,
      countryCode,
      latitude: coords.lat,
      longitude: coords.lon,
      timezone: data.timezone || 'UTC',
      daily,
      fetchedAt: new Date().toISOString(),
    };

    // キャッシュ保存
    await AsyncStorage.setItem(cacheKey, JSON.stringify(forecast));

    return forecast;
  } catch {
    return null;
  }
}

/**
 * 旅行期間中の天気データを抽出
 */
export function getWeatherForTripDates(
  forecast: WeatherForecast,
  departureDate: string,
  returnDate: string,
): DailyWeather[] {
  return forecast.daily.filter(d => d.date >= departureDate && d.date <= returnDate);
}

/**
 * 天気サマリーを生成
 */
export function getWeatherSummary(days: DailyWeather[]): {
  avgTempMax: number;
  avgTempMin: number;
  rainyDays: number;
  maxPrecipProb: number;
  packingAdvice: string[];
} {
  if (days.length === 0) {
    return { avgTempMax: 0, avgTempMin: 0, rainyDays: 0, maxPrecipProb: 0, packingAdvice: [] };
  }

  const avgTempMax = Math.round(days.reduce((s, d) => s + d.tempMax, 0) / days.length);
  const avgTempMin = Math.round(days.reduce((s, d) => s + d.tempMin, 0) / days.length);
  const rainyDays = days.filter(d => d.precipitationProb >= 50).length;
  const maxPrecipProb = Math.max(...days.map(d => d.precipitationProb));

  const packingAdvice: string[] = [];

  // 気温に基づくアドバイス
  if (avgTempMax >= 30) {
    packingAdvice.push('🌡️ 猛暑予想。日焼け止め・帽子・サングラス必須');
  } else if (avgTempMax >= 25) {
    packingAdvice.push('☀️ 夏日あり。軽装＋日焼け対策を');
  } else if (avgTempMin <= 5) {
    packingAdvice.push('🧥 冷え込みあり。ダウンやヒートテック推奨');
  } else if (avgTempMin <= 15) {
    packingAdvice.push('🧥 朝晩は冷えます。上着を持っていきましょう');
  }

  // 雨対策
  if (rainyDays >= days.length * 0.5) {
    packingAdvice.push('☔ 雨が多い予報。折りたたみ傘必須、防水の靴も推奨');
  } else if (rainyDays > 0) {
    packingAdvice.push('🌂 雨の日あり。折りたたみ傘を持っていくと安心');
  }

  // UV
  const highUvDays = days.filter(d => d.uvIndexMax >= 8).length;
  if (highUvDays > 0) {
    packingAdvice.push('☀️ UV指数が高い日あり。SPF50+の日焼け止めを');
  }

  // 風
  const windyDays = days.filter(d => d.windSpeedMax >= 40).length;
  if (windyDays > 0) {
    packingAdvice.push('💨 強風の日あり。帽子が飛ばされないよう注意');
  }

  return { avgTempMax, avgTempMin, rainyDays, maxPrecipProb, packingAdvice };
}
