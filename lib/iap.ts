/**
 * lib/iap.ts — アプリ内課金 (In-App Purchase) ヘルパー
 *
 * react-native-iap を使用したサブスクリプション管理
 * ※ Expo Go では動作しません。EAS Build が必要です。
 *
 * App Store Connect で作成する Product ID:
 *   - com.randomcorp.tripready.premium.monthly  (自動更新サブスクリプション ¥300/月)
 */

import { Platform, Alert } from 'react-native';
import { supabase } from './supabase';
import { getDeviceId } from './ai-usage';

// Product ID
export const PRODUCT_ID = 'com.randomcorp.tripready.premium.monthly';

// react-native-iap は EAS Build 時のみ利用可能
// Expo Go では graceful fallback
let IAP: typeof import('react-native-iap') | null = null;

async function loadIAP() {
  if (IAP) return IAP;
  try {
    IAP = require('react-native-iap');
    return IAP;
  } catch {
    console.log('[IAP] react-native-iap not available (Expo Go?)');
    return null;
  }
}

/**
 * IAP 初期化 — アプリ起動時に呼ぶ
 */
export async function initIAP(): Promise<boolean> {
  const iap = await loadIAP();
  if (!iap) return false;

  try {
    await iap.initConnection();
    console.log('[IAP] Connection initialized');

    // Pending purchases を処理（前回クラッシュ等で未完了のもの）
    if (Platform.OS === 'ios') {
      await iap.clearTransactionIOS();
    }
    return true;
  } catch (e) {
    console.error('[IAP] Init failed:', e);
    return false;
  }
}

/**
 * サブスクリプション商品情報を取得
 */
export async function getSubscriptionInfo(): Promise<{
  localizedPrice: string;
  productId: string;
  description: string;
} | null> {
  const iap = await loadIAP();
  if (!iap) return null;

  try {
    const subscriptions = await iap.getSubscriptions({ skus: [PRODUCT_ID] });
    if (subscriptions.length === 0) return null;

    const sub = subscriptions[0];
    return {
      localizedPrice: sub.localizedPrice || '¥300',
      productId: sub.productId,
      description: sub.description || 'プレミアムプラン（月額）',
    };
  } catch (e) {
    console.error('[IAP] getSubscriptions failed:', e);
    return null;
  }
}

/**
 * サブスクリプション購入
 */
export async function purchasePremium(): Promise<{
  success: boolean;
  error?: string;
}> {
  const iap = await loadIAP();
  if (!iap) {
    return {
      success: false,
      error: 'アプリ内課金はビルド版でのみ利用可能です。',
    };
  }

  try {
    await iap.requestSubscription({ sku: PRODUCT_ID });
    // 購入完了は purchaseUpdatedListener で処理
    return { success: true };
  } catch (e: any) {
    if (e.code === 'E_USER_CANCELLED') {
      return { success: false, error: 'キャンセルされました' };
    }
    console.error('[IAP] Purchase failed:', e);
    return { success: false, error: e.message || '購入に失敗しました' };
  }
}

/**
 * 購入完了後にサーバー側でレシート検証し、プランを更新
 */
export async function verifyAndActivate(receipt: string): Promise<boolean> {
  try {
    const deviceId = await getDeviceId();

    // Supabase Edge Function でレシート検証（将来実装）
    // 暫定: クライアント側でサブスクリプション登録
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    const { error } = await supabase
      .from('subscriptions')
      .upsert(
        {
          device_id: deviceId,
          plan: 'premium',
          expires_at: expiresAt.toISOString(),
          receipt_data: receipt,
          platform: Platform.OS,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'device_id' }
      );

    if (error) {
      console.error('[IAP] Activate failed:', error);
      return false;
    }

    console.log('[IAP] Premium activated until', expiresAt.toISOString());
    return true;
  } catch (e) {
    console.error('[IAP] verifyAndActivate error:', e);
    return false;
  }
}

/**
 * 購入リスナーをセットアップ（App 起動時に呼ぶ）
 */
export function setupPurchaseListener(
  onActivated: () => void,
  onError: (msg: string) => void
): (() => void) | null {
  let iapModule: typeof import('react-native-iap') | null = null;
  try {
    iapModule = require('react-native-iap');
  } catch {
    return null;
  }

  const purchaseUpdateSubscription = iapModule!.purchaseUpdatedListener(
    async (purchase: any) => {
      const receipt = purchase.transactionReceipt || purchase.transactionId;
      if (receipt) {
        const activated = await verifyAndActivate(receipt);
        if (activated) {
          // トランザクション完了を Apple に通知
          await iapModule!.finishTransaction({ purchase, isConsumable: false });
          onActivated();
        } else {
          onError('プランの有効化に失敗しました。サポートにお問い合わせください。');
        }
      }
    }
  );

  const purchaseErrorSubscription = iapModule!.purchaseErrorListener(
    (error: any) => {
      if (error.code !== 'E_USER_CANCELLED' && error.code !== 2) {
        onError(error.message || '購入中にエラーが発生しました');
      }
    }
  );

  // クリーンアップ関数を返す
  return () => {
    purchaseUpdateSubscription.remove();
    purchaseErrorSubscription.remove();
  };
}

/**
 * サブスクリプション管理画面を開く（iOS設定アプリ）
 */
export function openSubscriptionManagement() {
  if (Platform.OS === 'ios') {
    import('react-native').then(({ Linking }) => {
      Linking.openURL('https://apps.apple.com/account/subscriptions');
    });
  }
}

/**
 * 購入の復元（機種変更時など）
 */
export async function restorePurchases(): Promise<{
  restored: boolean;
  error?: string;
}> {
  const iap = await loadIAP();
  if (!iap) {
    return { restored: false, error: 'アプリ内課金が利用できません' };
  }

  try {
    const purchases = await iap.getAvailablePurchases();
    const premiumPurchase = purchases.find(
      (p) => p.productId === PRODUCT_ID
    );

    const receipt = (premiumPurchase as any)?.transactionReceipt || premiumPurchase?.transactionId;
    if (premiumPurchase && receipt) {
      const activated = await verifyAndActivate(receipt);
      if (activated) {
        return { restored: true };
      }
    }

    return { restored: false, error: '復元可能なサブスクリプションが見つかりませんでした' };
  } catch (e: any) {
    console.error('[IAP] Restore failed:', e);
    return { restored: false, error: e.message || '復元に失敗しました' };
  }
}
