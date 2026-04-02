/**
 * オフラインキャッシュ管理ライブラリ
 *
 * 旅行中にネットワーク接続が不安定な場合でも、
 * 重要な情報にアクセスできるようデータをキャッシュする。
 *
 * キャッシュ対象:
 *   - 旅程データ（旅行、フライト、ホテル）
 *   - 安全情報（外務省危険レベル）
 *   - 緊急連絡先（アプリ内蔵なので常にオフライン対応）
 *   - 為替レート
 *   - 個人書類データ
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from './supabase';
import type { Trip, Flight, Hotel, PersonalDocument } from '../types';

// ===== 型定義 =====

export interface CacheEntry<T> {
  data: T;
  cachedAt: string;
  expiresAt: string;
}

export interface OfflineTripBundle {
  trip: Trip;
  flights: Flight[];
  hotels: Hotel[];
  cachedAt: string;
}

export interface CacheStatus {
  tripsCached: number;
  lastSynced: string | null;
  isOnline: boolean;
  totalCacheSize: string;
}

// ===== 定数 =====
const CACHE_PREFIX = 'tripready_offline_';
const TRIP_CACHE_KEY = `${CACHE_PREFIX}trips`;
const PERSONAL_DOCS_KEY = `${CACHE_PREFIX}personal_docs`;
const SAFETY_CACHE_KEY = `${CACHE_PREFIX}safety`;
const LAST_SYNC_KEY = `${CACHE_PREFIX}last_sync`;

// キャッシュ有効期限
const TRIP_CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000;     // 24時間
const SAFETY_CACHE_EXPIRY_MS = 6 * 60 * 60 * 1000;     // 6時間（既存と同じ）
const DOCS_CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;  // 7日間

// ===== ネットワーク状態 =====

/**
 * ネットワーク接続状態を確認
 * NetInfoがない場合はオンラインと仮定
 */
export async function isOnline(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    return state.isConnected === true;
  } catch {
    // NetInfoが利用できない場合（Expo Go等）はオンラインと仮定
    return true;
  }
}

// ===== 汎用キャッシュ関数 =====

async function setCache<T>(key: string, data: T, expiryMs: number): Promise<void> {
  const entry: CacheEntry<T> = {
    data,
    cachedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + expiryMs).toISOString(),
  };
  await AsyncStorage.setItem(key, JSON.stringify(entry));
}

async function getCache<T>(key: string): Promise<{ data: T; isExpired: boolean } | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    const isExpired = new Date(entry.expiresAt).getTime() < Date.now();
    return { data: entry.data, isExpired };
  } catch {
    return null;
  }
}

// ===== 旅程データのキャッシュ =====

/**
 * 旅程データをオフラインキャッシュに保存
 */
export async function cacheTripData(tripId: string, trip: Trip, flights: Flight[], hotels: Hotel[]): Promise<void> {
  const bundle: OfflineTripBundle = {
    trip,
    flights,
    hotels,
    cachedAt: new Date().toISOString(),
  };
  await setCache(`${TRIP_CACHE_KEY}_${tripId}`, bundle, TRIP_CACHE_EXPIRY_MS);

  // キャッシュされた旅程IDリストも更新
  const idList = await getCachedTripIds();
  if (!idList.includes(tripId)) {
    idList.push(tripId);
    await AsyncStorage.setItem(`${TRIP_CACHE_KEY}_ids`, JSON.stringify(idList));
  }
}

/**
 * キャッシュされた旅程データを取得
 */
export async function getCachedTrip(tripId: string): Promise<OfflineTripBundle | null> {
  const cached = await getCache<OfflineTripBundle>(`${TRIP_CACHE_KEY}_${tripId}`);
  if (!cached) return null;
  // 期限切れでも返す（オフライン時はデータがないより古いデータの方がマシ）
  return cached.data;
}

/**
 * キャッシュされた旅程IDリストを取得
 */
async function getCachedTripIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(`${TRIP_CACHE_KEY}_ids`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * すべてのキャッシュされた旅程を取得
 */
export async function getAllCachedTrips(): Promise<OfflineTripBundle[]> {
  const ids = await getCachedTripIds();
  const trips: OfflineTripBundle[] = [];
  for (const id of ids) {
    const trip = await getCachedTrip(id);
    if (trip) trips.push(trip);
  }
  return trips;
}

// ===== 個人書類のキャッシュ =====

/**
 * 個人書類データをキャッシュ
 */
export async function cachePersonalDocs(docs: PersonalDocument[]): Promise<void> {
  await setCache(PERSONAL_DOCS_KEY, docs, DOCS_CACHE_EXPIRY_MS);
}

/**
 * キャッシュされた個人書類を取得
 */
export async function getCachedPersonalDocs(): Promise<PersonalDocument[] | null> {
  const cached = await getCache<PersonalDocument[]>(PERSONAL_DOCS_KEY);
  return cached ? cached.data : null;
}

// ===== 安全情報のキャッシュ =====

/**
 * 安全情報をキャッシュ（travel-safety.tsと連携）
 */
export async function cacheSafetyData(countryCode: string, data: any): Promise<void> {
  await setCache(`${SAFETY_CACHE_KEY}_${countryCode}`, data, SAFETY_CACHE_EXPIRY_MS);
}

/**
 * キャッシュされた安全情報を取得
 */
export async function getCachedSafetyData(countryCode: string): Promise<any | null> {
  const cached = await getCache(`${SAFETY_CACHE_KEY}_${countryCode}`);
  return cached ? cached.data : null;
}

// ===== 同期管理 =====

/**
 * すべてのデータを一括同期（オンライン時に呼ぶ）
 * アプリ起動時やフォアグラウンド復帰時に実行
 */
export async function syncAllData(): Promise<{ success: boolean; message: string }> {
  const online = await isOnline();
  if (!online) {
    return { success: false, message: 'オフラインのため同期できません' };
  }

  try {
    // 1. 旅程データを同期
    const { data: trips } = await supabase
      .from('trips')
      .select('*')
      .order('departure_date', { ascending: true });

    if (trips) {
      for (const trip of trips) {
        // フライトを取得
        const { data: flights } = await supabase
          .from('flights')
          .select('*')
          .eq('trip_id', trip.id)
          .order('departure_time', { ascending: true });

        // ホテルを取得
        const { data: hotels } = await supabase
          .from('hotels')
          .select('*')
          .eq('trip_id', trip.id)
          .order('checkin_date', { ascending: true });

        await cacheTripData(trip.id, trip, flights || [], hotels || []);
      }
    }

    // 2. 個人書類を同期
    const { data: docs } = await supabase
      .from('personal_documents')
      .select('*')
      .order('created_at', { ascending: false });

    if (docs) {
      await cachePersonalDocs(docs);
    }

    // 最終同期時刻を記録
    await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());

    return { success: true, message: '同期が完了しました' };
  } catch (error: any) {
    return { success: false, message: `同期エラー: ${error.message}` };
  }
}

// ===== キャッシュ管理 =====

/**
 * キャッシュの状態を取得
 */
export async function getCacheStatus(): Promise<CacheStatus> {
  const ids = await getCachedTripIds();
  const lastSynced = await AsyncStorage.getItem(LAST_SYNC_KEY);
  const online = await isOnline();

  // 概算キャッシュサイズ
  let totalSize = 0;
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
    for (const key of cacheKeys) {
      const val = await AsyncStorage.getItem(key);
      if (val) totalSize += val.length;
    }
  } catch {
    // ignore
  }

  const sizeStr = totalSize < 1024
    ? `${totalSize} B`
    : totalSize < 1024 * 1024
    ? `${(totalSize / 1024).toFixed(1)} KB`
    : `${(totalSize / (1024 * 1024)).toFixed(1)} MB`;

  return {
    tripsCached: ids.length,
    lastSynced,
    isOnline: online,
    totalCacheSize: sizeStr,
  };
}

/**
 * すべてのキャッシュをクリア
 */
export async function clearAllCache(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const cacheKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
  await AsyncStorage.multiRemove(cacheKeys);
}

/**
 * 特定の旅程のキャッシュをクリア
 */
export async function clearTripCache(tripId: string): Promise<void> {
  await AsyncStorage.removeItem(`${TRIP_CACHE_KEY}_${tripId}`);
  const ids = await getCachedTripIds();
  const newIds = ids.filter(id => id !== tripId);
  await AsyncStorage.setItem(`${TRIP_CACHE_KEY}_ids`, JSON.stringify(newIds));
}
