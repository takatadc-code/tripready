import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SectionList, TouchableOpacity, Alert, Linking } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { getDeviceId } from '../../lib/ai-usage';
import { Trip, EntryRequirement, REQUIREMENT_TYPES } from '../../types';

const STATUS = {
  not_applied: { label: '未申請', color: '#EF4444', bg: '#FEF2F2', icon: '○' },
  applied: { label: '申請済', color: '#F59E0B', bg: '#FFFBEB', icon: '◎' },
  approved: { label: '承認済', color: '#10B981', bg: '#ECFDF5', icon: '●' },
} as const;

const URLS: Record<string, string> = {
  ESTA: 'https://esta.cbp.dhs.gov/',
  ETIAS: 'https://travel-europe.europa.eu/etias_en',
  'K-ETA': 'https://www.k-eta.go.kr/',
  SG_ARRIVAL_CARD: 'https://eservices.ica.gov.sg/sgarrivalcard/',
};

export default function RequirementsScreen() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [reqs, setReqs] = useState<Record<string, EntryRequirement[]>>({});
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const deviceId = await getDeviceId();
    const { data: t } = await supabase.from('trips').select('*').eq('device_id', deviceId).order('departure_date', { ascending: true });
    if (t) {
      setTrips(t);
      const { data: r } = await supabase.from('entry_requirements').select('*').in('trip_id', t.map(x => x.id));
      const g: Record<string, EntryRequirement[]> = {};
      (r || []).forEach(req => { if (!g[req.trip_id]) g[req.trip_id] = []; g[req.trip_id].push(req); });
      setReqs(g);
    }
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const autoGen = async (trip: Trip) => {
    const applicable = Object.entries(REQUIREMENT_TYPES).filter(([_, c]) => c.countries.includes(trip.country_code));
    if (!applicable.length) { Alert.alert('情報', `${trip.name}に必要な入国申請はありません`); return; }
    const rows = applicable.map(([type, c]) => ({ trip_id: trip.id, type, label: c.label, status: 'not_applied', apply_url: URLS[type] || null }));
    const { error } = await supabase.from('entry_requirements').insert(rows);
    if (error) Alert.alert('エラー', '自動生成に失敗しました');
    else fetchData();
  };

  const cycleStatus = async (req: EntryRequirement) => {
    const order: Array<'not_applied' | 'applied' | 'approved'> = ['not_applied', 'applied', 'approved'];
    const next = order[(order.indexOf(req.status) + 1) % 3];
    await supabase.from('entry_requirements').update({ status: next }).eq('id', req.id);
    fetchData();
  };

  const sections = trips
    .filter(t => Math.ceil((new Date(t.departure_date).getTime() - Date.now()) / 86400000) >= -7)
    .map(t => ({ title: t.name, trip: t, data: reqs[t.id] || [] }));

  return (
    <View style={styles.container}>
      {!sections.length ? (
        <View style={styles.empty}>
          <Text style={{ fontSize: 64, marginBottom: 16 }}>📋</Text>
          <Text style={styles.emptyTitle}>入国要件はまだありません</Text>
          <Text style={styles.emptyText}>旅行を作成すると{'\n'}入国要件が表示されます</Text>
        </View>
      ) : (
        <SectionList sections={sections} keyExtractor={i => i.id} contentContainerStyle={{ padding: 16 }}
          refreshing={loading} onRefresh={fetchData}
          renderSectionHeader={({ section }) => (
            <View style={styles.secHead}>
              <Text style={styles.secTitle}>{section.title}</Text>
              {!section.data.length && <TouchableOpacity style={styles.genBtn} onPress={() => autoGen(section.trip)}><Text style={styles.genBtnText}>自動チェック</Text></TouchableOpacity>}
            </View>
          )}
          renderItem={({ item }) => {
            const s = STATUS[item.status];
            return (
              <View style={styles.reqCard}>
                <TouchableOpacity style={[styles.statusBadge, { backgroundColor: s.bg }]} onPress={() => cycleStatus(item)}>
                  <Text style={{ fontSize: 20, fontWeight: '700', color: s.color }}>{s.icon}</Text>
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#1F2937' }}>{item.label}</Text>
                  <Text style={{ fontSize: 13, color: s.color, marginTop: 2 }}>{s.label}</Text>
                </View>
                {item.apply_url && <TouchableOpacity style={styles.linkBtn} onPress={() => Linking.openURL(item.apply_url!)}><Text style={styles.linkBtnText}>申請</Text></TouchableOpacity>}
              </View>
            );
          }}
          renderSectionFooter={({ section }) => !section.data.length ? (
            <View style={styles.noReq}><Text style={styles.noReqText}>「自動チェック」をタップすると{'\n'}必要な入国申請を自動で検出します</Text></View>
          ) : null}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  secHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 8 },
  secTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
  genBtn: { backgroundColor: '#0891B2', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  genBtnText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  reqCard: { backgroundColor: '#FFF', borderRadius: 14, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  statusBadge: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  linkBtn: { backgroundColor: '#E0F2FE', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  linkBtnText: { color: '#0891B2', fontSize: 13, fontWeight: '600' },
  noReq: { backgroundColor: '#FFF', borderRadius: 14, padding: 20, marginBottom: 16, alignItems: 'center' },
  noReqText: { color: '#9CA3AF', fontSize: 14, textAlign: 'center', lineHeight: 22 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1F2937', marginBottom: 8 },
  emptyText: { fontSize: 15, color: '#6B7280', textAlign: 'center', lineHeight: 22 },
});
