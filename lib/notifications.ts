import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// 通知の表示設定
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** 通知許可をリクエスト */
export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/** 指定日時にローカル通知をスケジュール */
async function scheduleAt(date: Date, title: string, body: string, id: string) {
  const now = new Date();
  if (date <= now) return; // 過去の日付はスキップ

  await Notifications.scheduleNotificationAsync({
    content: { title, body, data: { id } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
    identifier: id,
  });
}

/** 特定IDのスケジュール済み通知をキャンセル */
async function cancelById(prefix: string) {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of all) {
    if (n.identifier.startsWith(prefix)) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }
}

/**
 * パスポート有効期限の6ヶ月前通知をスケジュール
 */
export async function schedulePassportAlert(docId: string, expiryDate: string, holderName?: string) {
  const prefix = `passport-${docId}`;
  await cancelById(prefix);

  const expiry = new Date(expiryDate);
  const sixMonthsBefore = new Date(expiry);
  sixMonthsBefore.setMonth(sixMonthsBefore.getMonth() - 6);

  const name = holderName || 'パスポート';
  await scheduleAt(
    sixMonthsBefore,
    '🛂 パスポート更新のお知らせ',
    `${name}の有効期限が6ヶ月後（${expiryDate}）に迫っています。多くの国では残存有効期間6ヶ月以上が必要です。`,
    `${prefix}-6m`
  );
}

/**
 * 旅程の出発2週間前 & 3日前の通知をスケジュール
 */
export async function scheduleTripAlerts(tripId: string, tripName: string, departureDate: string) {
  const prefix = `trip-${tripId}`;
  await cancelById(prefix);

  const dep = new Date(departureDate);

  // 2週間前
  const twoWeeks = new Date(dep);
  twoWeeks.setDate(twoWeeks.getDate() - 14);
  await scheduleAt(
    twoWeeks,
    '✈️ 旅行まであと2週間！',
    `「${tripName}」の出発まで2週間です。持ち物の準備やビザの確認をしましょう。`,
    `${prefix}-14d`
  );

  // 3日前
  const threeDays = new Date(dep);
  threeDays.setDate(threeDays.getDate() - 3);
  await scheduleAt(
    threeDays,
    '✈️ もうすぐ出発！',
    `「${tripName}」の出発まであと3日です。最終確認をお忘れなく！`,
    `${prefix}-3d`
  );
}

/**
 * 全旅程・全パスポートの通知を一括再スケジュール
 * アプリ起動時に呼び出す
 */
export async function rescheduleAllAlerts() {
  const granted = await requestNotificationPermission();
  if (!granted) return;

  // 旅程通知
  const { data: trips } = await supabase
    .from('trips')
    .select('id, name, departure_date')
    .gte('departure_date', new Date().toISOString().slice(0, 10));

  if (trips) {
    for (const t of trips) {
      await scheduleTripAlerts(t.id, t.name, t.departure_date);
    }
  }

  // パスポート通知
  const { data: docs } = await supabase
    .from('personal_documents')
    .select('id, doc_number, holder_name, expiry_date')
    .eq('doc_type', 'passport')
    .not('expiry_date', 'is', null);

  if (docs) {
    for (const d of docs) {
      if (d.expiry_date) {
        await schedulePassportAlert(d.id, d.expiry_date, d.holder_name);
      }
    }
  }
}
