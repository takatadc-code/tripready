import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, Alert, TextInput, Platform, ScrollView, KeyboardAvoidingView, Image,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { getDeviceId } from '../../lib/ai-usage';
import { Traveler, TravelerMileage, AIRLINE_CHECKIN_RULES } from '../../types';
import { scanPassport } from '../../lib/scan-ticket';
import { pickImageWithChoice } from '../../lib/pick-image';
import DatePickerInput from '../../components/DatePickerInput';

const RELATIONSHIPS = ['本人', '配偶者', '子供', 'その他'];
const AIRLINES = Object.entries(AIRLINE_CHECKIN_RULES).map(([code, info]) => ({ code, name: info.name }));

export default function FamilyScreen() {
  const [travelers, setTravelers] = useState<Traveler[]>([]);
  const [loading, setLoading] = useState(true);

  // モーダル
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // フォーム
  const [form, setForm] = useState({
    full_name: '', full_name_jp: '', relationship: '本人',
    passport_number: '', passport_expiry: '', birth_date: '', notes: '',
  });
  const [mileageList, setMileageList] = useState<{ airline: string; member_number: string; status: string }[]>([]);
  const [showAirlinePicker, setShowAirlinePicker] = useState(false);
  const [editingMileageIdx, setEditingMileageIdx] = useState<number | null>(null);
  const [scanning, setScanning] = useState(false);
  const [passportImageUri, setPassportImageUri] = useState<string | null>(null);

  const fetchTravelers = useCallback(async () => {
    setLoading(true);
    const deviceId = await getDeviceId();
    const { data } = await supabase
      .from('travelers')
      .select('*')
      .eq('device_id', deviceId)
      .order('relationship', { ascending: true });
    if (data) {
      // マイレージも取得
      const ids = data.map(t => t.id);
      const { data: mileageData } = await supabase
        .from('traveler_mileage')
        .select('*')
        .in('traveler_id', ids.length > 0 ? ids : ['__none__']);
      const withMileage = data.map(t => ({
        ...t,
        mileage: (mileageData || []).filter(m => m.traveler_id === t.id),
      }));
      setTravelers(withMileage);
    }
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { fetchTravelers(); }, [fetchTravelers]));

  const resetForm = () => {
    setForm({ full_name: '', full_name_jp: '', relationship: '本人', passport_number: '', passport_expiry: '', birth_date: '', notes: '' });
    setMileageList([]);
    setEditingId(null);
    setShowForm(false);
    setPassportImageUri(null);
  };

  // パスポートスキャン → フォーム自動入力 + 写真保存
  const handleScanPassport = async () => {
    const picked = await pickImageWithChoice();
    if (!picked) return;
    setScanning(true);
    try {
      const data = await scanPassport(picked.uri);
      setForm(prev => ({
        ...prev,
        full_name: data.full_name || prev.full_name,
        passport_number: data.passport_number || prev.passport_number,
        passport_expiry: data.expiry_date || prev.passport_expiry,
        birth_date: data.birth_date || prev.birth_date,
      }));
      setPassportImageUri(picked.uri);
      Alert.alert('読み取り完了', 'パスポート情報を自動入力しました。内容を確認して保存してください。');
    } catch (e: any) {
      Alert.alert('読み取りエラー', e.message || 'パスポート情報を読み取れませんでした');
    } finally {
      setScanning(false);
    }
  };

  const openEdit = (t: Traveler) => {
    setForm({
      full_name: t.full_name,
      full_name_jp: t.full_name_jp || '',
      relationship: t.relationship,
      passport_number: t.passport_number || '',
      passport_expiry: t.passport_expiry || '',
      birth_date: t.birth_date || '',
      notes: t.notes || '',
    });
    setMileageList((t.mileage || []).map(m => ({
      airline: m.airline, member_number: m.member_number, status: m.status || '',
    })));
    setEditingId(t.id);
    setShowForm(true);
  };

  const save = async () => {
    if (!form.full_name.trim()) { Alert.alert('入力エラー', '氏名（ローマ字）は必須です'); return; }
    const travelerData = {
      full_name: form.full_name.trim(),
      full_name_jp: form.full_name_jp.trim() || null,
      relationship: form.relationship,
      passport_number: form.passport_number.trim() || null,
      passport_expiry: form.passport_expiry.trim() || null,
      birth_date: form.birth_date.trim() || null,
      notes: form.notes.trim() || null,
    };

    const deviceId = await getDeviceId();
    let travelerId = editingId;
    if (editingId) {
      const { error } = await supabase.from('travelers').update(travelerData).eq('id', editingId);
      if (error) { Alert.alert('エラー', '更新に失敗しました'); return; }
      // 既存マイレージを全削除→再作成
      await supabase.from('traveler_mileage').delete().eq('traveler_id', editingId);
    } else {
      const { data, error } = await supabase.from('travelers').insert([{ ...travelerData, device_id: deviceId }]).select().single();
      if (error || !data) { Alert.alert('エラー', '保存に失敗しました'); return; }
      travelerId = data.id;
    }

    // マイレージ登録
    const validMileage = mileageList.filter(m => m.airline && m.member_number);
    if (validMileage.length > 0 && travelerId) {
      await supabase.from('traveler_mileage').insert(
        validMileage.map(m => ({
          traveler_id: travelerId,
          airline: m.airline,
          member_number: m.member_number,
          status: m.status || null,
        }))
      );
    }

    Alert.alert('完了', editingId ? 'メンバー情報を更新しました' : 'メンバーを登録しました');
    resetForm();
    fetchTravelers();
  };

  const deleteTraveler = (t: Traveler) => {
    Alert.alert('削除', `「${t.full_name_jp || t.full_name}」を削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除', style: 'destructive',
        onPress: async () => {
          await supabase.from('traveler_mileage').delete().eq('traveler_id', t.id);
          await supabase.from('flight_passengers').delete().eq('traveler_id', t.id);
          await supabase.from('travelers').delete().eq('id', t.id);
          fetchTravelers();
        },
      },
    ]);
  };

  const addMileage = () => setMileageList([...mileageList, { airline: '', member_number: '', status: '' }]);
  const removeMileage = (i: number) => setMileageList(mileageList.filter((_, idx) => idx !== i));
  const updateMileage = (i: number, key: string, val: string) => {
    const list = [...mileageList];
    (list[i] as any)[key] = val;
    setMileageList(list);
  };

  const getRelIcon = (rel: string) => {
    if (rel === '本人') return '👤';
    if (rel === '配偶者') return '👫';
    if (rel === '子供') return '👶';
    return '🧑';
  };

  const getAirlineName = (code: string) => AIRLINE_CHECKIN_RULES[code]?.name || code;

  const renderTraveler = ({ item: t }: { item: Traveler }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => openEdit(t)}
      onLongPress={() => deleteTraveler(t)}
      activeOpacity={0.7}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <Text style={{ fontSize: 28, marginRight: 10 }}>{getRelIcon(t.relationship)}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardName}>{t.full_name_jp || t.full_name}</Text>
          <Text style={styles.cardSub}>{t.full_name}{t.relationship !== '本人' ? ` ・ ${t.relationship}` : ''}</Text>
        </View>
        <Text style={{ fontSize: 14, color: '#D1D5DB' }}>›</Text>
      </View>

      {/* パスポート情報 */}
      {t.passport_number && (
        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>🛂</Text>
          <Text style={styles.infoText}>{t.passport_number}</Text>
          {t.passport_expiry && <Text style={styles.infoExpiry}>期限: {t.passport_expiry}</Text>}
        </View>
      )}

      {/* マイレージ一覧 */}
      {(t.mileage || []).map((m, i) => (
        <View key={i} style={styles.infoRow}>
          <Text style={styles.infoIcon}>✈️</Text>
          <Text style={styles.infoText}>{getAirlineName(m.airline)}: {m.member_number}</Text>
          {m.status && <Text style={styles.mileageStatus}>{m.status}</Text>}
        </View>
      ))}

      <Text style={{ fontSize: 11, color: '#D1D5DB', textAlign: 'right', marginTop: 4 }}>タップで編集 ・ 長押しで削除</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={travelers}
        renderItem={renderTraveler}
        keyExtractor={t => t.id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingVertical: 60 }}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>👨‍👩‍👧‍👦</Text>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#374151', marginBottom: 6 }}>家族メンバーを登録</Text>
            <Text style={{ fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 20 }}>
              旅行に同行する家族のパスポート情報や{'\n'}マイレージ番号をまとめて管理できます
            </Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowForm(true)}>
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>

      {/* ===== 登録・編集モーダル ===== */}
      <Modal animationType="slide" transparent visible={showForm} onRequestClose={resetForm}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalBg}>
            <View style={styles.modal}>
              <View style={styles.modalHead}>
                <Text style={styles.modalTitle}>{editingId ? '👤 メンバー編集' : '👤 メンバー追加'}</Text>
                <TouchableOpacity onPress={resetForm}><Text style={{ fontSize: 20, color: '#9CA3AF' }}>✕</Text></TouchableOpacity>
              </View>
              <ScrollView style={{ paddingHorizontal: 20 }} keyboardShouldPersistTaps="handled">

                <Text style={styles.label}>氏名（ローマ字）*</Text>
                <TextInput style={styles.input} placeholder="TAKATA MITSUHIKO"
                  value={form.full_name} onChangeText={v => setForm({ ...form, full_name: v })} autoCapitalize="characters" />

                <Text style={styles.label}>氏名（日本語）</Text>
                <TextInput style={styles.input} placeholder="高田 光彦"
                  value={form.full_name_jp} onChangeText={v => setForm({ ...form, full_name_jp: v })} />

                <Text style={styles.label}>続柄</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                  {RELATIONSHIPS.map(r => (
                    <TouchableOpacity key={r}
                      style={[styles.relBtn, form.relationship === r && styles.relBtnActive]}
                      onPress={() => setForm({ ...form, relationship: r })}
                    >
                      <Text style={[styles.relBtnText, form.relationship === r && styles.relBtnTextActive]}>{r}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* パスポートスキャンボタン */}
                <TouchableOpacity
                  onPress={handleScanPassport}
                  disabled={scanning}
                  style={{
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                    backgroundColor: scanning ? '#D1D5DB' : '#0891B2', borderRadius: 10,
                    paddingVertical: 12, marginBottom: 16,
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFF' }}>
                    {scanning ? '🔄 読み取り中...' : '🛂 パスポートをスキャン'}
                  </Text>
                </TouchableOpacity>
                {scanning && (
                  <Text style={{ fontSize: 12, color: '#6B7280', textAlign: 'center', marginBottom: 12 }}>
                    AI が画像を解析しています。少々お待ちください...
                  </Text>
                )}

                {/* スキャン写真プレビュー */}
                {passportImageUri && (
                  <View style={{ alignItems: 'center', marginBottom: 12 }}>
                    <Image source={{ uri: passportImageUri }} style={{ width: '100%', height: 160, borderRadius: 8 }} resizeMode="contain" />
                    <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>スキャンしたパスポート画像</Text>
                  </View>
                )}

                <Text style={styles.label}>パスポート番号</Text>
                <TextInput style={styles.input} placeholder="TK1234567"
                  value={form.passport_number} onChangeText={v => setForm({ ...form, passport_number: v })} autoCapitalize="characters" />

                <DatePickerInput
                  label="パスポート有効期限"
                  value={form.passport_expiry}
                  onChange={d => setForm({ ...form, passport_expiry: d })}
                  placeholder="有効期限を選択"
                  minimumDate={new Date()}
                />
                <View style={{ height: 8 }} />
                <DatePickerInput
                  label="生年月日"
                  value={form.birth_date}
                  onChange={d => setForm({ ...form, birth_date: d })}
                  placeholder="生年月日を選択"
                  maximumDate={new Date()}
                />

                {/* ===== マイレージ ===== */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 8 }}>
                  <Text style={[styles.label, { marginTop: 0, marginBottom: 0 }]}>✈️ マイレージ</Text>
                  <TouchableOpacity onPress={addMileage} style={styles.addMileageBtn}>
                    <Text style={{ color: '#0891B2', fontWeight: '700', fontSize: 13 }}>＋ 追加</Text>
                  </TouchableOpacity>
                </View>
                {mileageList.map((m, i) => (
                  <View key={i} style={styles.mileageCard}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: '#6B7280' }}>マイレージ {i + 1}</Text>
                      <TouchableOpacity onPress={() => removeMileage(i)}>
                        <Text style={{ fontSize: 12, color: '#EF4444' }}>削除</Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.miniLabel}>航空会社</Text>
                    <TouchableOpacity
                      style={styles.input}
                      onPress={() => { setEditingMileageIdx(i); setShowAirlinePicker(true); }}
                    >
                      <Text style={{ color: m.airline ? '#1F2937' : '#9CA3AF', fontSize: 16 }}>
                        {m.airline ? `${getAirlineName(m.airline)} (${m.airline})` : '選択してください'}
                      </Text>
                    </TouchableOpacity>

                    <Text style={styles.miniLabel}>会員番号</Text>
                    <TextInput style={styles.input} placeholder="1234567890"
                      value={m.member_number} onChangeText={v => updateMileage(i, 'member_number', v)} keyboardType="number-pad" />

                    <Text style={styles.miniLabel}>ステータス</Text>
                    <TextInput style={styles.input} placeholder="SFC / JGC / Gold / Platinum"
                      value={m.status} onChangeText={v => updateMileage(i, 'status', v)} />
                  </View>
                ))}

                <Text style={styles.label}>メモ</Text>
                <TextInput style={[styles.input, { minHeight: 60 }]} placeholder="アレルギー情報、特別食リクエストなど"
                  value={form.notes} onChangeText={v => setForm({ ...form, notes: v })} multiline />

                <View style={{ marginTop: 8, marginBottom: 40 }}>
                  <TouchableOpacity style={styles.saveBtn} onPress={save}>
                    <Text style={styles.saveBtnText}>{editingId ? '更新' : '登録'}</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ===== 航空会社選択モーダル ===== */}
      <Modal animationType="fade" transparent visible={showAirlinePicker} onRequestClose={() => setShowAirlinePicker(false)}>
        <View style={styles.modalBg}>
          <View style={[styles.modal, { maxHeight: '70%' }]}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>航空会社を選択</Text>
              <TouchableOpacity onPress={() => setShowAirlinePicker(false)}><Text style={{ fontSize: 20, color: '#9CA3AF' }}>✕</Text></TouchableOpacity>
            </View>
            <FlatList
              data={AIRLINES}
              keyExtractor={a => a.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={{ paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}
                  onPress={() => {
                    if (editingMileageIdx !== null) updateMileage(editingMileageIdx, 'airline', item.code);
                    setShowAirlinePicker(false);
                  }}
                >
                  <Text style={{ fontSize: 16, color: '#1F2937' }}>{item.name} ({item.code})</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardName: { fontSize: 17, fontWeight: '700', color: '#1F2937' },
  cardSub: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingLeft: 38 },
  infoIcon: { fontSize: 14, marginRight: 8 },
  infoText: { fontSize: 13, color: '#374151', flex: 1 },
  infoExpiry: { fontSize: 12, color: '#9CA3AF' },
  mileageStatus: { fontSize: 11, color: '#0891B2', fontWeight: '600', backgroundColor: '#ECFEFF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 60, height: 60, borderRadius: 30, backgroundColor: '#0891B2', justifyContent: 'center', alignItems: 'center', shadowColor: '#0891B2', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  fabText: { fontSize: 28, color: '#FFF', fontWeight: '300' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', paddingBottom: Platform.OS === 'ios' ? 40 : 20 },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1F2937' },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  miniLabel: { fontSize: 12, fontWeight: '600', color: '#6B7280', marginBottom: 4, marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 12, padding: 14, fontSize: 16, backgroundColor: '#F9FAFB' },
  relBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  relBtnActive: { backgroundColor: '#0891B2', borderColor: '#0891B2' },
  relBtnText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  relBtnTextActive: { color: '#FFF' },
  addMileageBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#ECFEFF', borderWidth: 1, borderColor: '#0891B2' },
  mileageCard: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  saveBtn: { backgroundColor: '#0891B2', borderRadius: 14, padding: 16, alignItems: 'center' },
  saveBtnText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
});
