/**
 * 外務省 海外安全情報 ライブラリ
 *
 * Supabase の mofa_danger_levels テーブルから危険レベルを取得し、
 * アプリ内ハードコードデータとマージして提供する。
 *
 * ハイブリッド方式:
 *   1. Supabase にデータがあれば最新情報として使用
 *   2. なければアプリ内蔵の TRAVEL_ADVISORIES をフォールバック
 *   3. AsyncStorage でキャッシュ（オフライン対応）
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { TRAVEL_ADVISORIES } from '../types';

// ===== 型定義 =====

export interface DangerLevel {
  countryCode: string;
  countryName: string;
  level: number;          // 0-4
  levelText: string;
  regionInfo: { region: string; level: number; text: string }[];
  alerts: string[];
  spotInfo: string;
  sourceUrl: string;
  fetchedAt: string;
}

export interface DangerLevelDisplay {
  level: number;
  label: string;
  color: string;
  bgColor: string;
  icon: string;
  description: string;
}

// ===== 定数 =====

const CACHE_KEY = 'tripready_mofa_danger_cache';
const CACHE_EXPIRY_MS = 6 * 60 * 60 * 1000; // 6時間

export const DANGER_LEVEL_CONFIG: Record<number, DangerLevelDisplay> = {
  0: {
    level: 0, label: '情報なし', color: '#6B7280', bgColor: '#F3F4F6',
    icon: '✅', description: '外務省の危険情報は発出されていません',
  },
  1: {
    level: 1, label: '十分注意', color: '#F59E0B', bgColor: '#FFFBEB',
    icon: '⚠️', description: '十分注意してください',
  },
  2: {
    level: 2, label: '不要不急の渡航中止', color: '#F97316', bgColor: '#FFF7ED',
    icon: '🟠', description: '不要不急の渡航は止めてください',
  },
  3: {
    level: 3, label: '渡航中止勧告', color: '#DC2626', bgColor: '#FEF2F2',
    icon: '🔴', description: '渡航は止めてください（渡航中止勧告）',
  },
  4: {
    level: 4, label: '退避勧告', color: '#7F1D1D', bgColor: '#FEE2E2',
    icon: '🚨', description: '退避してください。渡航は止めてください。',
  },
};

// ===== キャッシュ管理 =====

interface CacheData {
  timestamp: number;
  data: Record<string, DangerLevel>;
}

async function getCache(): Promise<Record<string, DangerLevel> | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cache: CacheData = JSON.parse(raw);
    if (Date.now() - cache.timestamp > CACHE_EXPIRY_MS) return null;
    return cache.data;
  } catch {
    return null;
  }
}

async function setCache(data: Record<string, DangerLevel>): Promise<void> {
  try {
    const cache: CacheData = { timestamp: Date.now(), data };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // キャッシュ保存失敗は無視
  }
}

// ===== データ取得 =====

/**
 * 全対象国の危険レベルを一括取得（キャッシュ優先）
 */
export async function fetchAllDangerLevels(): Promise<Record<string, DangerLevel>> {
  // キャッシュチェック
  const cached = await getCache();
  if (cached) return cached;

  try {
    const { data, error } = await supabase
      .from('mofa_danger_levels')
      .select('*')
      .order('danger_level', { ascending: false });

    if (error || !data || data.length === 0) {
      // Supabase取得失敗 → キャッシュが古くても返す
      const staleCache = await getStaleCache();
      return staleCache || {};
    }

    const result: Record<string, DangerLevel> = {};
    for (const row of data) {
      result[row.country_code] = {
        countryCode: row.country_code,
        countryName: row.country_name_ja,
        level: row.danger_level,
        levelText: row.danger_level_text || '',
        regionInfo: row.region_info || [],
        alerts: row.alerts || [],
        spotInfo: row.spot_info || '',
        sourceUrl: row.source_url || '',
        fetchedAt: row.fetched_at,
      };
    }

    await setCache(result);
    return result;
  } catch {
    const staleCache = await getStaleCache();
    return staleCache || {};
  }
}

async function getStaleCache(): Promise<Record<string, DangerLevel> | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw).data;
  } catch {
    return null;
  }
}

/**
 * 特定の国の危険レベルを取得
 */
export async function getDangerLevel(countryCode: string): Promise<DangerLevel | null> {
  const all = await fetchAllDangerLevels();
  return all[countryCode] || null;
}

/**
 * 国コードから危険レベルの表示情報を取得
 * Supabase にデータがない場合は TRAVEL_ADVISORIES のフォールバックを確認
 */
export async function getDangerDisplay(countryCode: string): Promise<DangerLevelDisplay> {
  const dangerData = await getDangerLevel(countryCode);

  if (dangerData) {
    return DANGER_LEVEL_CONFIG[dangerData.level] || DANGER_LEVEL_CONFIG[0];
  }

  // フォールバック: アプリ内蔵データに危険情報のヒントがあるか
  const advisory = TRAVEL_ADVISORIES[countryCode];
  if (advisory) {
    // alerts 内のテキストからレベルを推定
    const alertText = (advisory.alerts || []).join(' ');
    if (alertText.includes('退避') || alertText.includes('レベル4')) return DANGER_LEVEL_CONFIG[4];
    if (alertText.includes('渡航中止勧告') || alertText.includes('レベル3')) return DANGER_LEVEL_CONFIG[3];
    if (alertText.includes('不要不急') || alertText.includes('レベル2')) return DANGER_LEVEL_CONFIG[2];
  }

  return DANGER_LEVEL_CONFIG[0];
}

/**
 * 入国要件のオーバーライドデータを取得
 */
export async function getRequirementOverrides(countryCode: string): Promise<{
  visaFree?: boolean;
  stayDays?: number;
  requiredApps?: any[];
  alerts?: string[];
  tips?: string[];
} | null> {
  try {
    const { data, error } = await supabase
      .from('travel_requirement_overrides')
      .select('*')
      .eq('country_code', countryCode)
      .eq('is_active', true)
      .single();

    if (error || !data) return null;

    return {
      visaFree: data.visa_free,
      stayDays: data.stay_days,
      requiredApps: data.required_apps,
      alerts: data.alerts,
      tips: data.tips,
    };
  } catch {
    return null;
  }
}
