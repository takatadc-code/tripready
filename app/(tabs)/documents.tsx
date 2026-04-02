import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SectionList, TouchableOpacity, Image, Modal, Alert, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import { getDeviceId } from '../../lib/ai-usage';
import { Trip, TripDocument, DOCUMENT_CATEGORIES } from '../../types';

const ICONS: Record<string, string> = { immigration: '🛂', flight: '✈️', event_ticket: '🎫', hotel: '🏨', other: '📎' };

export default function DocumentsScreen() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [docs, setDocs] = useState<Record<string, TripDocument[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const deviceId = await getDeviceId();
    const { data: t } = await supabase.from('trips').select('*').eq('device_id', deviceId).order('departure_date', { ascending: true });
    if (t) {
      setTrips(t);
      const { data: d } = await supabase.from('trip_documents').select('*').in('trip_id', t.map(x => x.id)).order('created_at', { ascending: false });
      const g: Record<string, TripDocument[]> = {};
      (d || []).forEach(doc => { if (!g[doc.trip_id]) g[doc.trip_id] = []; g[doc.trip_id].push(doc); });
      setDocs(g);
    }
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const addDoc = async (tripId: string, category: string) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('権限エラー', 'カメラロールへのアクセスを許可してください'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled) return;

    const { error } = await supabase.from('trip_documents').insert([{
      trip_id: tripId, category, title: DOCUMENT_CATEGORIES[category], file_url: result.assets[0].uri,
    }]);
    if (!error) { fetchData(); Alert.alert('完了', '書類を追加しました'); }
    else Alert.alert('エラー', '書類の追加に失敗しました');
    setShowPicker(false); setSelectedTripId(null);
  };

  const deleteDoc = (doc: TripDocument) => {
    Alert.alert('削除確認', `「${doc.title}」を削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: async () => { await supabase.from('trip_documents').delete().eq('id', doc.id); fetchData(); } },
    ]);
  };

  const sections = trips
    .filter(t => Math.ceil((new Date(t.departure_date).getTime() - Date.now()) / 86400000) >= -30)
    .map(t => ({ title: t.name, tripId: t.id, data: docs[t.id] || [] }));

  return (
    <View style={styles.container}>
      {!sections.length ? (
        <View style={styles.empty}>
          <Text style={{ fontSize: 64, marginBottom: 16 }}>📄</Text>
          <Text style={styles.emptyTitle}>書類はまだありません</Text>
          <Text style={styles.emptyText}>旅行を作成して{'\n'}書類やスクショを追加しましょう</Text>
        </View>
      ) : (
        <SectionList sections={sections} keyExtractor={i => i.id} contentContainerStyle={{ padding: 16 }}
          refreshing={loading} onRefresh={fetchData}
          renderSectionHeader={({ section }) => (
            <View style={styles.secHead}>
              <Text style={styles.secTitle}>{section.title}</Text>
              <TouchableOpacity style={styles.addBtn} onPress={() => { setSelectedTripId(section.tripId); setShowPicker(true); }}>
                <Text style={styles.addBtnText}>＋ 追加</Text>
              </TouchableOpacity>
            </View>
          )}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.docCard} onPress={() => item.file_url && setSelectedImage(item.file_url)} onLongPress={() => deleteDoc(item)}>
              {item.file_url ? <Image source={{ uri: item.file_url }} style={styles.thumb} /> : (
                <View style={[styles.thumb, { justifyContent: 'center', alignItems: 'center' }]}><Text style={{ fontSize: 24 }}>{ICONS[item.category] || '📎'}</Text></View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#1F2937' }}>{item.title}</Text>
                <View style={styles.catBadge}><Text style={{ fontSize: 12, color: '#6B7280' }}>{ICONS[item.category]} {DOCUMENT_CATEGORIES[item.category]}</Text></View>
              </View>
            </TouchableOpacity>
          )}
          renderSectionFooter={({ section }) => !section.data.length ? (
            <View style={styles.noDoc}><Text style={styles.noDocText}>「＋ 追加」から書類・スクリーンショットを{'\n'}アップロードできます</Text></View>
          ) : null}
        />
      )}

      <Modal animationType="slide" transparent visible={showPicker} onRequestClose={() => setShowPicker(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>カテゴリを選択</Text>
              <TouchableOpacity onPress={() => setShowPicker(false)}><Text style={{ fontSize: 20, color: '#9CA3AF' }}>✕</Text></TouchableOpacity>
            </View>
            {Object.entries(DOCUMENT_CATEGORIES).map(([k, v]) => (
              <TouchableOpacity key={k} style={styles.catOption} onPress={() => selectedTripId && addDoc(selectedTripId, k)}>
                <Text style={{ fontSize: 24, marginRight: 12 }}>{ICONS[k]}</Text>
                <Text style={{ fontSize: 17, color: '#1F2937' }}>{v}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      <Modal animationType="fade" transparent visible={!!selectedImage} onRequestClose={() => setSelectedImage(null)}>
        <TouchableOpacity style={styles.previewBg} activeOpacity={1} onPress={() => setSelectedImage(null)}>
          {selectedImage && <Image source={{ uri: selectedImage }} style={{ width: '90%', height: '80%' }} resizeMode="contain" />}
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  secHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 8 },
  secTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
  addBtn: { backgroundColor: '#0891B2', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  addBtnText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  docCard: { backgroundColor: '#FFF', borderRadius: 14, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  thumb: { width: 56, height: 56, borderRadius: 10, marginRight: 12, backgroundColor: '#F3F4F6' },
  catBadge: { marginTop: 4, backgroundColor: '#F3F4F6', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  noDoc: { backgroundColor: '#FFF', borderRadius: 14, padding: 20, marginBottom: 16, alignItems: 'center' },
  noDocText: { color: '#9CA3AF', fontSize: 14, textAlign: 'center', lineHeight: 22 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1F2937', marginBottom: 8 },
  emptyText: { fontSize: 15, color: '#6B7280', textAlign: 'center', lineHeight: 22 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 20 },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1F2937' },
  catOption: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  previewBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
});
