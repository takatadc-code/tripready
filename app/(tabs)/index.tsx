import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SectionList, TouchableOpacity,
  Modal, TextInput, ScrollView, Alert, Platform, KeyboardAvoidingView, Image, ImageBackground,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import { supabase } from '../../lib/supabase';
import { getDeviceId } from '../../lib/ai-usage';
import { Trip, COUNTRY_LIST } from '../../types';
import { getDangerLevel, DANGER_LEVEL_CONFIG, DangerLevel } from '../../lib/travel-safety';
import DatePickerInput from '../../components/DatePickerInput';

function formatDateInput(text: string, prev: string) {
  const clean = text.replace(/[^0-9-]/g, '');
  if (clean.length < prev.length) return clean;
  const digits = clean.replace(/-/g, '');
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

export default function HomeScreen() {
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [newTrip, setNewTrip] = useState({ name: '', destination: '', country_code: '', departure_date: '', return_date: '', is_secret: false });
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [secretUnlocked, setSecretUnlocked] = useState(false);
  const [countryDanger, setCountryDanger] = useState<DangerLevel | null>(null);

  const fetchTrips = useCallback(async () => {
    setLoading(true);
    const deviceId = await getDeviceId();
    const { data, error } = await supabase.from('trips').select('*').eq('device_id', deviceId).order('departure_date', { ascending: true });
    if (!error) setTrips(data || []);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { fetchTrips(); }, [fetchTrips]));

  const getDaysUntil = (dateStr: string) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return Math.ceil((new Date(dateStr).getTime() - today.getTime()) / 86400000);
  };

  const getFlag = (code: string) => COUNTRY_LIST.find(c => c.code === code)?.flag || '🌍';
  const getName = (code: string) => COUNTRY_LIST.find(c => c.code === code)?.name || code;

  const handleCreate = async () => {
    if (!newTrip.name || !newTrip.country_code || !newTrip.departure_date) {
      Alert.alert('入力エラー', '旅行名、渡航先、出発日は必須です'); return;
    }
    const deviceId = await getDeviceId();
    const { error } = await supabase.from('trips').insert([{
      name: newTrip.name, destination: newTrip.destination,
      country_code: newTrip.country_code, departure_date: newTrip.departure_date,
      return_date: newTrip.return_date || null, is_secret: newTrip.is_secret,
      device_id: deviceId,
    }]);
    if (error) Alert.alert('エラー', '旅行の作成に失敗しました');
    else { setModalVisible(false); setNewTrip({ name: '', destination: '', country_code: '', departure_date: '', return_date: '', is_secret: false }); fetchTrips(); }
  };

  // お忍びモードの解除
  const unlockSecret = async () => {
    if (secretUnlocked) {
      setSecretUnlocked(false);
      return;
    }
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (!hasHardware || !isEnrolled) {
      Alert.alert('認証不可', 'Face ID / Touch IDが設定されていません');
      return;
    }
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'お忍び旅行を表示',
      cancelLabel: 'キャンセル',
      fallbackLabel: 'パスコードを使用',
    });
    if (result.success) {
      setSecretUnlocked(true);
    }
  };

  // 通常の旅行（お忍びでない）
  const normalTrips = trips.filter(t => !t.is_secret);
  const secretTrips = trips.filter(t => t.is_secret);
  const hasSecretTrips = secretTrips.length > 0;

  const upcoming = normalTrips.filter(t => getDaysUntil(t.return_date || t.departure_date) >= 0);
  const past = normalTrips.filter(t => getDaysUntil(t.return_date || t.departure_date) < 0).reverse();

  const secretUpcoming = secretTrips.filter(t => getDaysUntil(t.return_date || t.departure_date) >= 0);
  const secretPast = secretTrips.filter(t => getDaysUntil(t.return_date || t.departure_date) < 0).reverse();

  const sections = [
    ...(upcoming.length > 0 ? [{ title: 'これからの旅行', data: upcoming, isSecret: false }] : []),
    ...(past.length > 0 ? [{ title: '過去の旅行', data: past, isSecret: false }] : []),
    ...(secretUnlocked && secretUpcoming.length > 0 ? [{ title: '🔓 お忍び旅行', data: secretUpcoming, isSecret: true }] : []),
    ...(secretUnlocked && secretPast.length > 0 ? [{ title: '🔓 過去のお忍び旅行', data: secretPast, isSecret: true }] : []),
  ];

  const renderTrip = ({ item, section }: { item: Trip; section: { title: string } }) => {
    const days = getDaysUntil(item.departure_date);
    const isPast = section.title.includes('過去');
    return (
      <TouchableOpacity
        style={[styles.card, isPast && { opacity: 0.6 }, item.is_secret && styles.secretCard]}
        onPress={() => router.push(`/trip/${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.cardRow}>
          <Text style={{ fontSize: 36, marginRight: 12 }}>{getFlag(item.country_code)}</Text>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              {item.is_secret && <Text style={{ marginLeft: 6, fontSize: 14 }}>🤫</Text>}
            </View>
            <Text style={styles.cardSub}>{item.destination || getName(item.country_code)}</Text>
          </View>
          {!isPast ? (
            <View style={[styles.badge, days <= 7 ? styles.badgeRed : styles.badgeGreen]}>
              <Text style={styles.badgeNum}>{days === 0 ? '今日' : `${days}`}</Text>
              {days !== 0 && <Text style={styles.badgeLabel}>日後</Text>}
            </View>
          ) : (
            <View style={[styles.badge, styles.badgeGray]}>
              <Text style={[styles.badgeNum, { color: '#9CA3AF', fontSize: 14 }]}>終了</Text>
            </View>
          )}
        </View>
        <View style={styles.cardDateRow}>
          <Text style={styles.cardDate}>{item.departure_date}{item.return_date ? ` → ${item.return_date}` : ''}</Text>
          <Text style={styles.cardArrow}>›</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ImageBackground
      source={require('../../assets/generated/bg_home.png')}
      style={styles.container}
      imageStyle={{ opacity: 0.08 }}
    >
      {trips.length === 0 && !loading ? (
        <View style={styles.empty}>
          <Image
            source={require('../../assets/generated/empty_state.png')}
            style={{ width: 200, height: 200, marginBottom: 8 }}
            resizeMode="contain"
          />
          <Image
            source={require('../../assets/images/aero-cloud-mascot.png')}
            style={{ width: 100, height: 100, marginBottom: 16 }}
            resizeMode="contain"
          />
          <Text style={styles.emptyTitle}>旅行を追加しましょう！</Text>
          <Text style={styles.emptyText}>下の「＋」ボタンから{'\n'}新しい旅行を作成できます</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={i => i.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshing={loading}
          onRefresh={fetchTrips}
          renderSectionHeader={({ section }) => (
            <Text style={[styles.sectionHeader, section.isSecret && { color: '#7C3AED' }]}>{section.title}</Text>
          )}
          renderItem={renderTrip}
          stickySectionHeadersEnabled={false}
          ListHeaderComponent={
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <Image
                source={require('../../assets/images/aero-cloud-mascot.png')}
                style={{ width: 60, height: 60 }}
                resizeMode="contain"
              />
              <TouchableOpacity
                style={styles.guideButton}
                onPress={() => router.push('/guide')}
                activeOpacity={0.7}
              >
                <Text style={styles.guideButtonIcon}>💡</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.guideButtonTitle}>旅の知恵袋</Text>
                  <Text style={styles.guideButtonText}>初心者向けガイド</Text>
                </View>
                <Text style={styles.guideButtonArrow}>›</Text>
              </TouchableOpacity>
            </View>
          }
          ListFooterComponent={
            hasSecretTrips || secretUnlocked ? (
              <TouchableOpacity
                style={[styles.secretBtn, { opacity: secretUnlocked ? 1 : 0.7 }]}
                onPress={unlockSecret}
                activeOpacity={0.5}
              >
                <Image
                  source={require('../../assets/images/aero-cloud-key.png')}
                  style={{ width: 56, height: 56, borderRadius: 28 }}
                  resizeMode="contain"
                />
                {secretUnlocked && (
                  <Text style={{ fontSize: 11, color: '#7C3AED', marginTop: 4 }}>閉じる</Text>
                )}
              </TouchableOpacity>
            ) : null
          }
        />
      )}
      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>

      <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>新しい旅行</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}><Text style={{ fontSize: 20, color: '#9CA3AF' }}>✕</Text></TouchableOpacity>
            </View>
            <ScrollView style={{ padding: 20 }}>
              <Text style={styles.label}>旅行名 *</Text>
              <TextInput style={styles.input} placeholder="例: ケルン出張2025" value={newTrip.name} onChangeText={t => setNewTrip({ ...newTrip, name: t })} />

              <Text style={styles.label}>渡航先（国）*</Text>
              <TouchableOpacity style={styles.input} onPress={() => setShowCountryPicker(!showCountryPicker)}>
                <Text style={newTrip.country_code ? { fontSize: 16, color: '#1F2937' } : { fontSize: 16, color: '#9CA3AF' }}>
                  {newTrip.country_code ? `${getFlag(newTrip.country_code)} ${getName(newTrip.country_code)}` : '国を選択してください'}
                </Text>
              </TouchableOpacity>
              {showCountryPicker && (
                <View style={{ borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 12, marginTop: 4, maxHeight: 200 }}>
                  <ScrollView nestedScrollEnabled>
                    {COUNTRY_LIST.map(c => (
                      <TouchableOpacity key={c.code} style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}
                        onPress={() => {
                          setNewTrip({ ...newTrip, country_code: c.code, destination: c.name });
                          setShowCountryPicker(false);
                          setCountryDanger(null);
                          getDangerLevel(c.code).then(d => setCountryDanger(d)).catch(() => {});
                        }}>
                        <Text style={{ fontSize: 16 }}>{c.flag} {c.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* 外務省 危険レベル警告 */}
              {countryDanger && countryDanger.level >= 2 && (() => {
                const cfg = DANGER_LEVEL_CONFIG[countryDanger.level];
                return (
                  <View style={{
                    backgroundColor: cfg.bgColor, borderWidth: countryDanger.level >= 3 ? 2 : 1,
                    borderColor: cfg.color, borderRadius: 12, padding: 12, marginTop: 8,
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{ fontSize: 18, marginRight: 6 }}>{cfg.icon}</Text>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: cfg.color, flex: 1 }}>
                        外務省: {cfg.label}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 12, color: cfg.color, marginTop: 4, lineHeight: 16 }}>
                      {cfg.description}
                    </Text>
                    {countryDanger.level >= 3 && (
                      <Text style={{ fontSize: 11, color: cfg.color, marginTop: 4, fontWeight: '600' }}>
                        この渡航先には外務省から{countryDanger.level === 4 ? '退避勧告' : '渡航中止勧告'}が出ています
                      </Text>
                    )}
                  </View>
                );
              })()}
              {countryDanger && countryDanger.level === 1 && (
                <Text style={{ fontSize: 12, color: '#F59E0B', marginTop: 4 }}>
                  ⚠️ 外務省: 十分注意してください
                </Text>
              )}

              <Text style={styles.label}>都市名（任意）</Text>
              <TextInput style={styles.input} placeholder="例: ケルン" value={newTrip.destination} onChangeText={t => setNewTrip({ ...newTrip, destination: t })} />
              <DatePickerInput
                label="出発日"
                required
                value={newTrip.departure_date}
                onChange={d => setNewTrip({ ...newTrip, departure_date: d })}
                placeholder="出発日を選択"
                minimumDate={new Date()}
              />
              <View style={{ height: 12 }} />
              <DatePickerInput
                label="帰国日"
                value={newTrip.return_date}
                onChange={d => setNewTrip({ ...newTrip, return_date: d })}
                placeholder="帰国日を選択"
                minimumDate={newTrip.departure_date ? new Date(newTrip.departure_date) : new Date()}
              />

              {/* お忍びモード — 鍵アイコンのみ表示 */}
              <View style={{ alignItems: 'flex-end', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB' }}>
                <TouchableOpacity
                  onPress={() => setNewTrip({ ...newTrip, is_secret: !newTrip.is_secret })}
                  activeOpacity={0.6}
                  style={{
                    width: 44, height: 44, borderRadius: 22,
                    backgroundColor: newTrip.is_secret ? '#7C3AED' : '#F3F4F6',
                    justifyContent: 'center', alignItems: 'center',
                  }}
                >
                  <Image
                    source={require('../../assets/images/aero-cloud-key.png')}
                    style={{ width: 28, height: 28, opacity: newTrip.is_secret ? 1 : 0.4 }}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              </View>
            </ScrollView>
            <TouchableOpacity style={[styles.submit, newTrip.is_secret && { backgroundColor: '#7C3AED' }]} onPress={handleCreate}>
              <Text style={styles.submitText}>旅行を作成</Text>
            </TouchableOpacity>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  sectionHeader: { fontSize: 14, fontWeight: '700', color: '#6B7280', marginTop: 16, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  secretCard: { borderWidth: 2, borderColor: '#7C3AED', borderStyle: 'dashed' },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#1F2937' },
  cardSub: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  badge: { alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, minWidth: 56 },
  badgeGreen: { backgroundColor: '#ECFDF5' }, badgeRed: { backgroundColor: '#FEF2F2' }, badgeGray: { backgroundColor: '#F3F4F6' },
  badgeNum: { fontSize: 18, fontWeight: '800', color: '#0891B2' },
  badgeLabel: { fontSize: 10, color: '#6B7280' },
  cardDateRow: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardDate: { fontSize: 13, color: '#9CA3AF' },
  cardArrow: { fontSize: 22, color: '#D1D5DB', fontWeight: '300' },
  secretBtn: { borderRadius: 24, padding: 10, alignItems: 'center', marginTop: 12, alignSelf: 'center' },
  guideButton: { flexDirection: 'row', alignItems: 'center', marginTop: 12, marginHorizontal: 16, backgroundColor: '#FFF', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  guideButtonIcon: { fontSize: 24, marginRight: 12 },
  guideButtonTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937', marginBottom: 2 },
  guideButtonText: { fontSize: 12, color: '#9CA3AF' },
  guideButtonArrow: { fontSize: 20, color: '#D1D5DB', marginLeft: 8, fontWeight: '300' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1F2937', marginBottom: 8 },
  emptyText: { fontSize: 15, color: '#6B7280', textAlign: 'center', lineHeight: 22 },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 60, height: 60, borderRadius: 30, backgroundColor: '#0891B2', justifyContent: 'center', alignItems: 'center', shadowColor: '#0891B2', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  fabText: { fontSize: 28, color: '#FFF', fontWeight: '300' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%', paddingBottom: Platform.OS === 'ios' ? 40 : 20 },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1F2937' },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 12, padding: 14, fontSize: 16, backgroundColor: '#F9FAFB' },
  submit: { marginHorizontal: 20, backgroundColor: '#0891B2', borderRadius: 14, padding: 16, alignItems: 'center' },
  submitText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
});
