import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// ===== デバイスID（端末固有、初回起動時に生成） =====
let cachedDeviceId: string | null = null;

export async function getDeviceId(): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId;
  let id = await AsyncStorage.getItem('tripready_device_id');
  if (!id) {
    id = `${Platform.OS}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    await AsyncStorage.setItem('tripready_device_id', id);
  }
  cachedDeviceId = id;
  return id;
}

// ===== プラン定義 =====
export type Plan = 'free' | 'premium' | 'owner';

export const PLAN_LIMITS: Record<Plan, { total: number | null; monthly: number | null; label: string }> = {
  free:    { total: 10,   monthly: null, label: '無料プラン' },
  premium: { total: null, monthly: 50,   label: 'プレミアム（¥300/月）' },
  owner:   { total: null, monthly: null, label: 'オーナー（無制限）' },
};

// ===== プラン取得 =====
export async function getPlan(): Promise<{ plan: Plan; expiresAt: string | null }> {
  const deviceId = await getDeviceId();
  const { data } = await supabase
    .from('subscriptions')
    .select('plan, expires_at')
    .eq('device_id', deviceId)
    .single();

  if (!data) return { plan: 'free', expiresAt: null };

  // premium の期限切れチェック
  if (data.plan === 'premium' && data.expires_at) {
    if (new Date(data.expires_at) < new Date()) {
      return { plan: 'free', expiresAt: data.expires_at };
    }
  }

  return { plan: data.plan as Plan, expiresAt: data.expires_at };
}

// ===== 使用回数取得 =====
export async function getUsageCount(): Promise<{ total: number; thisMonth: number }> {
  const deviceId = await getDeviceId();

  // 全期間
  const { count: total } = await supabase
    .from('ai_usage')
    .select('*', { count: 'exact', head: true })
    .eq('device_id', deviceId);

  // 今月
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const { count: thisMonth } = await supabase
    .from('ai_usage')
    .select('*', { count: 'exact', head: true })
    .eq('device_id', deviceId)
    .gte('created_at', monthStart);

  return { total: total || 0, thisMonth: thisMonth || 0 };
}

// ===== AI使用可否チェック =====
export interface UsageCheckResult {
  allowed: boolean;
  plan: Plan;
  remaining: number | null;  // null = 無制限
  reason?: string;
}

export async function checkAiUsage(): Promise<UsageCheckResult> {
  const { plan } = await getPlan();
  const { total, thisMonth } = await getUsageCount();
  const limits = PLAN_LIMITS[plan];

  // オーナー: 無制限
  if (plan === 'owner') {
    return { allowed: true, plan, remaining: null };
  }

  // 無料プラン: トータル10回
  if (plan === 'free') {
    const remaining = (limits.total || 10) - total;
    if (remaining <= 0) {
      return {
        allowed: false,
        plan,
        remaining: 0,
        reason: `無料プランのAI利用上限（${limits.total}回）に達しました`,
      };
    }
    return { allowed: true, plan, remaining };
  }

  // プレミアム: 月50回
  if (plan === 'premium') {
    const remaining = (limits.monthly || 50) - thisMonth;
    if (remaining <= 0) {
      return {
        allowed: false,
        plan,
        remaining: 0,
        reason: `今月のAI利用上限（${limits.monthly}回/月）に達しました`,
      };
    }
    return { allowed: true, plan, remaining };
  }

  return { allowed: true, plan, remaining: null };
}

// ===== AI使用を記録 =====
export async function recordAiUsage(feature: string): Promise<void> {
  const deviceId = await getDeviceId();
  await supabase.from('ai_usage').insert([{ device_id: deviceId, feature }]);
}

// ===== オーナー登録（先生専用） =====
// アプリ内の隠しコマンドで呼び出す想定
export async function registerAsOwner(secretCode: string): Promise<boolean> {
  if (secretCode !== 'TAKATADC2026') return false;
  const deviceId = await getDeviceId();
  const { error } = await supabase
    .from('subscriptions')
    .upsert({ device_id: deviceId, plan: 'owner', expires_at: null }, { onConflict: 'device_id' });
  return !error;
}
