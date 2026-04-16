import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Linking, ActivityIndicator } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import * as iap from '../lib/iap';

export default function PremiumScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [subInfo, setSubInfo] = useState<any>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const ok = await iap.initIAP();
        if (!ok) {
          setInitError('アプリ内課金の初期化に失敗しました。App Storeへの接続を確認してください。');
          setLoading(false);
          return;
        }
        const info = await iap.getSubscriptionInfo();
        setSubInfo(info);
      } catch (e: any) {
        setInitError(e?.message || '課金システムの準備中にエラーが発生しました');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handlePurchase = async () => {
    if (processing) return;
    setProcessing(true);
    try {
      const result = await iap.purchasePremium();
      if (result?.success) {
        Alert.alert('完了', 'プレミアムプランにアップグレードしました！', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else if (result?.error) {
        Alert.alert('お知らせ', result.error);
      }
    } catch (e: any) {
      Alert.alert('エラー', e?.message || '購入処理中にエラーが発生しました');
    } finally {
      setProcessing(false);
    }
  };

  const handleRestore = async () => {
    if (processing) return;
    setProcessing(true);
    try {
      const result = await iap.restorePurchases();
      if (result?.restored) {
        Alert.alert('完了', '購入履歴を復元しました', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else if (result?.error) {
        Alert.alert('お知らせ', result.error);
      } else {
        Alert.alert('お知らせ', '復元可能な購入がありません');
      }
    } catch (e: any) {
      Alert.alert('エラー', e?.message || '復元処理中にエラーが発生しました');
    } finally {
      setProcessing(false);
    }
  };

  const openEULA = () => {
    Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/');
  };

  const openPrivacy = () => {
    Linking.openURL('https://takatadc-code.github.io/tripready/privacy-policy.html');
  };

  return (
    <>
      <Stack.Screen options={{ title: 'プレミアムプラン', headerBackTitle: '戻る' }} />
      <ScrollView style={s.container} contentContainerStyle={s.content}>
      <TouchableOpacity style={s.closeBtn} onPress={() => router.back()}>
        <Text style={s.closeText}>✕</Text>
      </TouchableOpacity>

      <Text style={s.title}>✨ TripReady プレミアム</Text>
      <Text style={s.subtitle}>AI機能が無制限で使い放題</Text>

      <View style={s.priceBox}>
        <Text style={s.priceLabel}>月額</Text>
        <Text style={s.priceValue}>¥300</Text>
        <Text style={s.periodText}>1ヶ月（自動更新）</Text>
      </View>

      <View style={s.featureBox}>
        <Text style={s.featureTitle}>プレミアム機能</Text>
        <View style={s.featureRow}><Text style={s.checkIcon}>✓</Text><Text style={s.featureText}>AI保険証券分析 無制限</Text></View>
        <View style={s.featureRow}><Text style={s.checkIcon}>✓</Text><Text style={s.featureText}>AI空港ガイド 無制限</Text></View>
        <View style={s.featureRow}><Text style={s.checkIcon}>✓</Text><Text style={s.featureText}>AI観光・グルメ提案 無制限</Text></View>
        <View style={s.featureRow}><Text style={s.checkIcon}>✓</Text><Text style={s.featureText}>夜間安全AI相談 無制限</Text></View>
      </View>

      {loading ? (
        <View style={s.loadingBox}><ActivityIndicator color="#FFA500" /><Text style={s.loadingText}>購入情報を読み込み中...</Text></View>
      ) : initError ? (
        <View style={s.errorBox}><Text style={s.errorText}>{initError}</Text></View>
      ) : (
        <>
          <TouchableOpacity style={[s.buyBtn, processing && s.btnDisabled]} onPress={handlePurchase} disabled={processing}>
            {processing ? <ActivityIndicator color="white" /> : <Text style={s.buyBtnText}>プレミアムを購入（¥300/月）</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={s.restoreBtn} onPress={handleRestore} disabled={processing}>
            <Text style={s.restoreBtnText}>購入を復元する</Text>
          </TouchableOpacity>
        </>
      )}

      <View style={s.noticeBox}>
        <Text style={s.noticeTitle}>ご注意</Text>
        <Text style={s.noticeText}>・サブスクリプションは1ヶ月ごとに自動更新されます。</Text>
        <Text style={s.noticeText}>・支払いはApple IDに請求されます。</Text>
        <Text style={s.noticeText}>・有効期間終了の24時間前までに解約しない限り自動的に更新されます。</Text>
        <Text style={s.noticeText}>・iPhoneの「設定」→「Apple ID」→「サブスクリプション」からいつでも解約可能です。</Text>
      </View>

      <View style={s.linksBox}>
        <TouchableOpacity onPress={openEULA}><Text style={s.linkText}>利用規約（EULA）</Text></TouchableOpacity>
        <Text style={s.separator}>|</Text>
        <TouchableOpacity onPress={openPrivacy}><Text style={s.linkText}>プライバシーポリシー</Text></TouchableOpacity>
      </View>
    </ScrollView>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  content: { padding: 20, paddingBottom: 60 },
  closeBtn: { alignSelf: 'flex-end', padding: 8, marginBottom: 8 },
  closeText: { fontSize: 24, color: '#666' },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'center', color: '#FFA500', marginBottom: 8 },
  subtitle: { fontSize: 16, textAlign: 'center', color: '#666', marginBottom: 24 },
  priceBox: { backgroundColor: 'white', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 20 },
  priceLabel: { fontSize: 14, color: '#666' },
  priceValue: { fontSize: 48, fontWeight: '700', color: '#0891B2', marginVertical: 4 },
  periodText: { fontSize: 14, color: '#666' },
  featureBox: { backgroundColor: 'white', borderRadius: 16, padding: 20, marginBottom: 20 },
  featureTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12, color: '#333' },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  checkIcon: { color: '#10b981', fontSize: 18, marginRight: 10, fontWeight: '700' },
  featureText: { fontSize: 15, color: '#333' },
  loadingBox: { padding: 20, alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#666' },
  errorBox: { backgroundColor: '#FEE2E2', padding: 16, borderRadius: 12, marginBottom: 16 },
  errorText: { color: '#991B1B', fontSize: 14, textAlign: 'center' },
  buyBtn: { backgroundColor: '#FFA500', borderRadius: 14, padding: 18, alignItems: 'center', marginBottom: 12 },
  btnDisabled: { opacity: 0.6 },
  buyBtnText: { color: 'white', fontSize: 17, fontWeight: '700' },
  restoreBtn: { padding: 12, alignItems: 'center', marginBottom: 20 },
  restoreBtnText: { color: '#0891B2', fontSize: 14 },
  noticeBox: { backgroundColor: '#FEF3C7', padding: 16, borderRadius: 12, marginBottom: 16 },
  noticeTitle: { fontSize: 13, fontWeight: '700', color: '#92400E', marginBottom: 8 },
  noticeText: { fontSize: 12, color: '#78350F', lineHeight: 18, marginBottom: 4 },
  linksBox: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  linkText: { color: '#0891B2', fontSize: 13, textDecorationLine: 'underline' },
  separator: { color: '#999', marginHorizontal: 12 },
});
