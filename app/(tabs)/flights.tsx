import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SectionList, TouchableOpacity,
  Modal, TextInput, ScrollView, Alert, Platform, KeyboardAvoidingView,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { getDeviceId } from '../../lib/ai-usage';
import { Trip, Flight, Hotel, AIRLINE_CHECKIN_RULES, COUNTRY_LIST } from '../../types';
import DatePickerInput from '../../components/DatePickerInput';

const AIRLINES = Object.entries(AIRLINE_CHECKIN_RULES).map(([code, info]) => ({
  code, name: info.name,
}));

const AIRLINE_ALIASES: Record<string, string[]> = {
  'NH': ['ANA', '全日空', '全日本空輸', 'All Nippon'],
  'JL': ['JAL', '日本航空', 'Japan Airlines'],
  'MM': ['Peach', 'ピーチ'],
  'GK': ['Jetstar', 'ジェットスター'],
  'ZG': ['ZIPAIR', 'ジップエア'],
  'KE': ['Korean Air', '大韓航空'],
  'OZ': ['Asiana', 'アシアナ'],
  'SQ': ['Singapore Airlines', 'シンガポール航空'],
  'TG': ['Thai Airways', 'タイ航空', 'タイ国際航空'],
  'CX': ['Cathay Pacific', 'キャセイ'],
  'EK': ['Emirates', 'エミレーツ'],
  'QR': ['Qatar', 'カタール'],
  'LH': ['Lufthansa', 'ルフトハンザ'],
  'BA': ['British Airways', 'ブリティッシュ'],
  'AF': ['Air France', 'エールフランス'],
  'UA': ['United', 'ユナイテッド'],
  'AA': ['American', 'アメリカン'],
  'DL': ['Delta', 'デルタ'],
  'HA': ['Hawaiian', 'ハワイアン'],
  'QF': ['Qantas', 'カンタス'],
  'AY': ['Finnair', 'フィンエアー'],
  'TR': ['Scoot', 'スクート'],
  'AK': ['AirAsia', 'エアアジア'],
  'CA': ['Air China', '中国国際航空'],
  'MU': ['China Eastern', '中国東方航空'],
  'VN': ['Vietnam Airlines', 'ベトナム航空'],
  'GA': ['Garuda', 'ガルーダ'],
  'MH': ['Malaysia Airlines', 'マレーシア航空'],
};

function filterAirlines(query: string) {
  if (!query) return AIRLINES;
  const q = query.toLowerCase();
  return AIRLINES.filter(a => {
    if (a.code.toLowerCase().includes(q)) return true;
    if (a.name.toLowerCase().includes(q)) return true;
    const aliases = AIRLINE_ALIASES[a.code] || [];
    return aliases.some(alias => alias.toLowerCase().includes(q));
  });
}

function formatDateInput(text: string, prev: string) {
  const clean = text.replace(/[^0-9-]/g, '');
  if (clean.length < prev.length) return clean;
  const digits = clean.replace(/-/g, '');
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

function formatTimeInput(text: string, prev: string) {
  const clean = text.replace(/[^0-9:]/g, '');
  if (clean.length < prev.length) return clean;
  const digits = clean.replace(/:/g, '');
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function getNights(checkin: string, checkout: string) {
  const ms = new Date(checkout).getTime() - new Date(checkin).getTime();
  return Math.round(ms / 86400000);
}

function getCheckinStatus(flight: Flight) {
  if (!flight.departure_time) return { label: '日時未設定', color: '#9CA3AF' };
  const now = Date.now();
  const dep = new Date(flight.departure_time).getTime();
  const openAt = dep - flight.checkin_open_minutes * 60 * 1000;
  const closeAt = dep - flight.checkin_close_minutes * 60 * 1000;
  if (now < openAt) {
    const diffH = Math.floor((openAt - now) / 3600000);
    if (diffH >= 24) return { label: `チェックイン開始まで ${Math.floor(diffH / 24)}日`, color: '#6B7280' };
    const diffM = Math.floor(((openAt - now) % 3600000) / 60000);
    return { label: `チェックイン開始まで ${diffH}時間${diffM}分`, color: '#6B7280' };
  }
  if (now < closeAt) {
    const diffH = Math.floor((closeAt - now) / 3600000);
    const diffM = Math.floor(((closeAt - now) % 3600000) / 60000);
    return { label: `チェックイン可能！ 締切まで ${diffH}時間${diffM}分`, color: '#059669' };
  }
  if (now < dep) return { label: 'チェックイン締切済み', color: '#DC2626' };
  return { label: '出発済み', color: '#9CA3AF' };
}

// 統合アイテム型
type ItineraryItem = { type: 'flight'; data: Flight } | { type: 'hotel'; data: Hotel };

export default function ItineraryScreen() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [flights, setFlights] = useState<Record<string, Flight[]>>({});
  const [hotels, setHotels] = useState<Record<string, Hotel[]>>({});
  const [loading, setLoading] = useState(true);

  // モーダル制御
  const [addType, setAddType] = useState<'flight' | 'hotel' | null>(null);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showAirlinePicker, setShowAirlinePicker] = useState(false);
  const [airlineSearch, setAirlineSearch] = useState('');
  const [manualAirlineMode, setManualAirlineMode] = useState(false);
  const [manualAirlineName, setManualAirlineName] = useState('');

  // フライトフォーム
  const [flightForm, setFlightForm] = useState({
    airline: '', flight_number: '', departure_airport: '', arrival_airport: '',
    departure_date: '', departure_time_str: '', arrival_date: '', arrival_time_str: '',
    booking_reference: '', seat: '', notes: '',
  });

  // ホテルフォーム
  const [hotelForm, setHotelForm] = useState({
    name: '', checkin_date: '', checkout_date: '', address: '',
    booking_reference: '', room_type: '', notes: '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const deviceId = await getDeviceId();
    const { data: t } = await supabase.from('trips').select('*').eq('device_id', deviceId).order('departure_date', { ascending: true });
    if (t) {
      setTrips(t);
      const ids = t.map(x => x.id);

      const { data: f } = await supabase.from('flights').select('*').in('trip_id', ids).order('departure_time', { ascending: true });
      const fg: Record<string, Flight[]> = {};
      (f || []).forEach(fl => { if (!fg[fl.trip_id]) fg[fl.trip_id] = []; fg[fl.trip_id].push(fl); });
      setFlights(fg);

      const { data: h } = await supabase.from('hotels').select('*').in('trip_id', ids).order('checkin_date', { ascending: true });
      const hg: Record<string, Hotel[]> = {};
      (h || []).forEach(ht => { if (!hg[ht.trip_id]) hg[ht.trip_id] = []; hg[ht.trip_id].push(ht); });
      setHotels(hg);
    }
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const resetAll = () => {
    setAddType(null);
    setSelectedTripId(null);
    setShowTypePicker(false);
    setShowAirlinePicker(false);
    setAirlineSearch('');
    setManualAirlineMode(false);
    setManualAirlineName('');
    setFlightForm({ airline: '', flight_number: '', departure_airport: '', arrival_airport: '', departure_date: '', departure_time_str: '', arrival_date: '', arrival_time_str: '', booking_reference: '', seat: '', notes: '' });
    setHotelForm({ name: '', checkin_date: '', checkout_date: '', address: '', booking_reference: '', room_type: '', notes: '' });
  };

  const saveFlight = async () => {
    if (!selectedTripId) {
      Alert.alert('入力エラー', '旅行を選択してください'); return;
    }
    const depISO = `${flightForm.departure_date}T${flightForm.departure_time_str}:00`;
    const arrISO = flightForm.arrival_date && flightForm.arrival_time_str ? `${flightForm.arrival_date}T${flightForm.arrival_time_str}:00` : null;
    const code = flightForm.airline.toUpperCase();
    const rule = AIRLINE_CHECKIN_RULES[code];
    const { error } = await supabase.from('flights').insert([{
      trip_id: selectedTripId, airline: code, flight_number: flightForm.flight_number.toUpperCase(),
      departure_airport: flightForm.departure_airport.toUpperCase(), arrival_airport: flightForm.arrival_airport.toUpperCase(),
      departure_time: depISO, arrival_time: arrISO, booking_reference: flightForm.booking_reference || null,
      seat: flightForm.seat || null, checkin_open_minutes: rule?.open || 1440, checkin_close_minutes: rule?.close || 60,
      notes: flightForm.notes || null,
    }]);
    if (!error) { fetchData(); resetAll(); Alert.alert('完了', 'フライトを登録しました'); }
    else Alert.alert('エラー', '保存に失敗しました');
  };

  const saveHotel = async () => {
    if (!selectedTripId || !hotelForm.name || !hotelForm.checkin_date || !hotelForm.checkout_date) {
      Alert.alert('入力エラー', 'ホテル名、チェックイン日、チェックアウト日は必須です'); return;
    }
    const { error } = await supabase.from('hotels').insert([{
      trip_id: selectedTripId, name: hotelForm.name.trim(),
      checkin_date: hotelForm.checkin_date, checkout_date: hotelForm.checkout_date,
      address: hotelForm.address || null, booking_reference: hotelForm.booking_reference || null,
      room_type: hotelForm.room_type || null, notes: hotelForm.notes || null,
    }]);
    if (!error) { fetchData(); resetAll(); Alert.alert('完了', 'ホテルを登録しました'); }
    else Alert.alert('エラー', '保存に失敗しました');
  };

  const deleteItem = (type: 'flight' | 'hotel', item: any) => {
    const label = type === 'flight' ? `${AIRLINE_CHECKIN_RULES[item.airline]?.name || item.airline} ${item.flight_number}` : item.name;
    Alert.alert('削除確認', `「${label}」を削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: async () => {
        await supabase.from(type === 'flight' ? 'flights' : 'hotels').delete().eq('id', item.id);
        fetchData();
      }},
    ]);
  };

  const getFlag = (code: string) => COUNTRY_LIST.find(c => c.code === code)?.flag || '🌍';

  // セクションデータ（フライトとホテルを統合、時系列順）
  const sections = trips
    .filter(t => Math.ceil((new Date(t.departure_date).getTime() - Date.now()) / 86400000) >= -30)
    .map(t => {
      const items: ItineraryItem[] = [
        ...(flights[t.id] || []).map(f => ({ type: 'flight' as const, data: f })),
        ...(hotels[t.id] || []).map(h => ({ type: 'hotel' as const, data: h })),
      ].sort((a, b) => {
        const dateA = a.type === 'flight' ? new Date(a.data.departure_time||0).getTime() : new Date(a.data.checkin_date).getTime();
        const dateB = b.type === 'flight' ? new Date(b.data.departure_time||0).getTime() : new Date(b.data.checkin_date).getTime();
        return dateA - dateB;
      });
      return { title: `${getFlag(t.country_code)} ${t.name}`, tripId: t.id, data: items };
    });

  const openAddMenu = (tripId: string) => {
    setSelectedTripId(tripId);
    setShowTypePicker(true);
  };

  const renderItem = ({ item }: { item: ItineraryItem }) => {
    if (item.type === 'flight') return renderFlight(item.data);
    return renderHotel(item.data);
  };

  const renderFlight = (fl: Flight) => {
    const rule = fl.airline ? AIRLINE_CHECKIN_RULES[fl.airline] : null;
    const checkin = getCheckinStatus(fl);
    return (
      <TouchableOpacity style={styles.card} onLongPress={() => deleteItem('flight', fl)}>
        <View style={styles.cardTypeRow}>
          <Text style={styles.cardTypeIcon}>✈️</Text>
          <Text style={styles.cardTypeLabel}>フライト</Text>
        </View>
        <View style={styles.flightHeader}>
          <Text style={styles.flightTitle}>{rule?.name || fl.airline || '未設定'} {fl.flight_number || ''}</Text>
          {fl.booking_reference && <Text style={styles.refBadge}>予約: {fl.booking_reference}</Text>}
        </View>
        <View style={styles.routeRow}>
          <View style={{ alignItems: 'center', flex: 1 }}>
            <Text style={styles.airportCode}>{fl.departure_airport || '---'}</Text>
            {fl.departure_time ? <Text style={styles.timeText}>{formatDateTime(fl.departure_time)}</Text> : <Text style={styles.timeText}>日時未定</Text>}
          </View>
          <View style={{ alignItems: 'center', paddingHorizontal: 8 }}>
            <View style={styles.routeLine} />
          </View>
          <View style={{ alignItems: 'center', flex: 1 }}>
            <Text style={styles.airportCode}>{fl.arrival_airport || '---'}</Text>
            {fl.arrival_time && <Text style={styles.timeText}>{formatDateTime(fl.arrival_time)}</Text>}
          </View>
        </View>
        {fl.seat && <Text style={styles.detailText}>座席: {fl.seat}</Text>}
        <View style={[styles.statusBadge, { backgroundColor: checkin.color + '18' }]}>
          <Text style={[styles.statusText, { color: checkin.color }]}>{checkin.label}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHotel = (ht: Hotel) => {
    const nights = getNights(ht.checkin_date, ht.checkout_date);
    return (
      <TouchableOpacity style={styles.card} onLongPress={() => deleteItem('hotel', ht)}>
        <View style={styles.cardTypeRow}>
          <Text style={styles.cardTypeIcon}>🏨</Text>
          <Text style={styles.cardTypeLabel}>ホテル</Text>
        </View>
        <Text style={styles.hotelName}>{ht.name}</Text>
        <View style={styles.hotelDateRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.hotelDateLabel}>チェックイン</Text>
            <Text style={styles.hotelDate}>{formatDate(ht.checkin_date)}</Text>
          </View>
          <View style={styles.nightsBadge}>
            <Text style={styles.nightsNum}>{nights}</Text>
            <Text style={styles.nightsLabel}>泊</Text>
          </View>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Text style={styles.hotelDateLabel}>チェックアウト</Text>
            <Text style={styles.hotelDate}>{formatDate(ht.checkout_date)}</Text>
          </View>
        </View>
        {ht.room_type && <Text style={styles.detailText}>部屋: {ht.room_type}</Text>}
        {ht.address && <Text style={styles.detailText}>📍 {ht.address}</Text>}
        {ht.booking_reference && <Text style={styles.detailText}>予約: {ht.booking_reference}</Text>}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {!sections.length ? (
        <View style={styles.empty}>
          <Text style={{ fontSize: 64, marginBottom: 16 }}>🗓️</Text>
          <Text style={styles.emptyTitle}>旅程はまだありません</Text>
          <Text style={styles.emptyText}>旅行を作成してから{'\n'}フライトやホテルを追加しましょう</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.data.id}
          contentContainerStyle={{ padding: 16 }}
          refreshing={loading}
          onRefresh={fetchData}
          renderSectionHeader={({ section }) => (
            <View style={styles.secHead}>
              <Text style={styles.secTitle}>{section.title}</Text>
              <TouchableOpacity style={styles.addBtn} onPress={() => openAddMenu(section.tripId)}>
                <Text style={styles.addBtnText}>＋ 追加</Text>
              </TouchableOpacity>
            </View>
          )}
          renderItem={renderItem}
          renderSectionFooter={({ section }) => !section.data.length ? (
            <View style={styles.emptySection}>
              <Text style={styles.emptySectionText}>「＋ 追加」からフライト・ホテルを登録できます</Text>
            </View>
          ) : null}
        />
      )}

      {/* 追加タイプ選択モーダル */}
      <Modal animationType="fade" transparent visible={showTypePicker} onRequestClose={() => setShowTypePicker(false)}>
        <View style={styles.modalBg}>
          <View style={[styles.modal, { maxHeight: 260 }]}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>追加する項目</Text>
              <TouchableOpacity onPress={() => setShowTypePicker(false)}>
                <Text style={{ fontSize: 20, color: '#9CA3AF' }}>✕</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.typeOption} onPress={() => { setShowTypePicker(false); setAddType('flight'); }}>
              <Text style={{ fontSize: 28, marginRight: 14 }}>✈️</Text>
              <View>
                <Text style={styles.typeOptionTitle}>フライト</Text>
                <Text style={styles.typeOptionDesc}>航空便の情報を追加</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.typeOption} onPress={() => { setShowTypePicker(false); setAddType('hotel'); }}>
              <Text style={{ fontSize: 28, marginRight: 14 }}>🏨</Text>
              <View>
                <Text style={styles.typeOptionTitle}>ホテル</Text>
                <Text style={styles.typeOptionDesc}>宿泊先の情報を追加</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* フライト追加モーダル */}
      <Modal animationType="slide" transparent visible={addType === 'flight'} onRequestClose={resetAll}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalBg}>
            <View style={styles.modal}>
              <View style={styles.modalHead}>
                <Text style={styles.modalTitle}>✈️ フライトを追加</Text>
                <TouchableOpacity onPress={resetAll}><Text style={{ fontSize: 20, color: '#9CA3AF' }}>✕</Text></TouchableOpacity>
              </View>
              <ScrollView style={{ paddingHorizontal: 20 }}>
                <Text style={styles.inputLabel}>航空会社</Text>
                {!manualAirlineMode ? (
                  <>
                    <TouchableOpacity style={styles.input} onPress={() => setShowAirlinePicker(!showAirlinePicker)}>
                      <Text style={flightForm.airline ? { fontSize: 16, color: '#1F2937' } : { fontSize: 16, color: '#9CA3AF' }}>
                        {flightForm.airline ? `${flightForm.airline} - ${AIRLINE_CHECKIN_RULES[flightForm.airline]?.name || manualAirlineName || flightForm.airline}` : '航空会社を検索・選択'}
                      </Text>
                    </TouchableOpacity>
                    {showAirlinePicker && (
                      <View style={{ borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 12, marginTop: 4, maxHeight: 280 }}>
                        <TextInput
                          style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', fontSize: 16, backgroundColor: '#FAFAFA' }}
                          placeholder="ANA, NH, 全日空 などで検索"
                          placeholderTextColor="#9CA3AF"
                          value={airlineSearch}
                          onChangeText={setAirlineSearch}
                          autoFocus
                        />
                        <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={{ maxHeight: 200 }}>
                          {filterAirlines(airlineSearch).map(a => (
                            <TouchableOpacity key={a.code} style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}
                              onPress={() => { setFlightForm({ ...flightForm, airline: a.code }); setShowAirlinePicker(false); setAirlineSearch(''); }}>
                              <Text style={{ fontSize: 16 }}><Text style={{ fontWeight: '700' }}>{a.code}</Text> - {a.name}</Text>
                            </TouchableOpacity>
                          ))}
                          {filterAirlines(airlineSearch).length === 0 && (
                            <Text style={{ padding: 16, color: '#9CA3AF', textAlign: 'center', fontSize: 14 }}>該当する航空会社がありません</Text>
                          )}
                        </ScrollView>
                      </View>
                    )}
                    <TouchableOpacity onPress={() => { setManualAirlineMode(true); setShowAirlinePicker(false); }} style={{ marginTop: 6 }}>
                      <Text style={{ fontSize: 13, color: '#0891B2' }}>リストにない航空会社を入力 →</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <View style={{ flex: 1 }}>
                        <TextInput style={styles.input} placeholder="コード (例: OM)" value={flightForm.airline}
                          onChangeText={t => setFlightForm({ ...flightForm, airline: t.toUpperCase() })} autoCapitalize="characters" maxLength={3} />
                      </View>
                      <View style={{ flex: 2 }}>
                        <TextInput style={styles.input} placeholder="航空会社名 (例: モンゴル航空)" value={manualAirlineName}
                          onChangeText={setManualAirlineName} />
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => { setManualAirlineMode(false); }} style={{ marginTop: 6 }}>
                      <Text style={{ fontSize: 13, color: '#0891B2' }}>← リストから選択</Text>
                    </TouchableOpacity>
                  </>
                )}
                <Text style={styles.inputLabel}>便名</Text>
                <TextInput style={styles.input} value={flightForm.flight_number} onChangeText={t => setFlightForm({ ...flightForm, flight_number: t })} placeholder="例: 408" autoCapitalize="characters" />
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>出発空港</Text>
                    <TextInput style={styles.input} value={flightForm.departure_airport} onChangeText={t => setFlightForm({ ...flightForm, departure_airport: t })} placeholder="NRT" autoCapitalize="characters" maxLength={4} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>到着空港</Text>
                    <TextInput style={styles.input} value={flightForm.arrival_airport} onChangeText={t => setFlightForm({ ...flightForm, arrival_airport: t })} placeholder="CGN" autoCapitalize="characters" maxLength={4} />
                  </View>
                </View>
                <DatePickerInput
                  label="出発日"
                  value={flightForm.departure_date}
                  onChange={d => setFlightForm({ ...flightForm, departure_date: d })}
                  placeholder="出発日を選択"
                />
                <Text style={styles.inputLabel}>出発時刻</Text>
                <TextInput style={styles.input} value={flightForm.departure_time_str} keyboardType="number-pad" maxLength={5}
                  onChangeText={t => setFlightForm({ ...flightForm, departure_time_str: formatTimeInput(t, flightForm.departure_time_str) })} placeholder="HH:MM" />
                <DatePickerInput
                  label="到着日"
                  value={flightForm.arrival_date}
                  onChange={d => setFlightForm({ ...flightForm, arrival_date: d })}
                  placeholder="到着日を選択"
                  minimumDate={flightForm.departure_date ? new Date(flightForm.departure_date) : undefined}
                />
                <Text style={styles.inputLabel}>到着時刻</Text>
                <TextInput style={styles.input} value={flightForm.arrival_time_str} keyboardType="number-pad" maxLength={5}
                  onChangeText={t => setFlightForm({ ...flightForm, arrival_time_str: formatTimeInput(t, flightForm.arrival_time_str) })} placeholder="HH:MM" />
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>予約番号</Text>
                    <TextInput style={styles.input} value={flightForm.booking_reference} onChangeText={t => setFlightForm({ ...flightForm, booking_reference: t })} placeholder="ABCDEF" autoCapitalize="characters" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>座席</Text>
                    <TextInput style={styles.input} value={flightForm.seat} onChangeText={t => setFlightForm({ ...flightForm, seat: t })} placeholder="12A" autoCapitalize="characters" />
                  </View>
                </View>
                {flightForm.airline && AIRLINE_CHECKIN_RULES[flightForm.airline] && (
                  <View style={styles.ruleBox}>
                    <Text style={styles.ruleTitle}>📋 {AIRLINE_CHECKIN_RULES[flightForm.airline].name} のチェックイン</Text>
                    <Text style={styles.ruleText}>開始: 出発の{AIRLINE_CHECKIN_RULES[flightForm.airline].open / 60}時間前 ／ 締切: {AIRLINE_CHECKIN_RULES[flightForm.airline].close}分前</Text>
                  </View>
                )}
                <TouchableOpacity style={styles.saveBtn} onPress={saveFlight}><Text style={styles.saveBtnText}>保存</Text></TouchableOpacity>
                <View style={{ height: 40 }} />
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ホテル追加モーダル */}
      <Modal animationType="slide" transparent visible={addType === 'hotel'} onRequestClose={resetAll}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalBg}>
            <View style={styles.modal}>
              <View style={styles.modalHead}>
                <Text style={styles.modalTitle}>🏨 ホテルを追加</Text>
                <TouchableOpacity onPress={resetAll}><Text style={{ fontSize: 20, color: '#9CA3AF' }}>✕</Text></TouchableOpacity>
              </View>
              <ScrollView style={{ paddingHorizontal: 20 }}>
                <Text style={styles.inputLabel}>ホテル名 *</Text>
                <TextInput style={styles.input} value={hotelForm.name} onChangeText={t => setHotelForm({ ...hotelForm, name: t })} placeholder="例: Marriott Cologne" />

                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <DatePickerInput
                      label="チェックイン"
                      required
                      value={hotelForm.checkin_date}
                      onChange={d => setHotelForm({ ...hotelForm, checkin_date: d })}
                      placeholder="チェックイン日"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <DatePickerInput
                      label="チェックアウト"
                      required
                      value={hotelForm.checkout_date}
                      onChange={d => setHotelForm({ ...hotelForm, checkout_date: d })}
                      placeholder="チェックアウト日"
                      minimumDate={hotelForm.checkin_date ? new Date(hotelForm.checkin_date) : undefined}
                    />
                  </View>
                </View>

                <Text style={styles.inputLabel}>住所（任意）</Text>
                <TextInput style={styles.input} value={hotelForm.address} onChangeText={t => setHotelForm({ ...hotelForm, address: t })} placeholder="例: Helenenstraße 14, Köln" />

                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>予約番号</Text>
                    <TextInput style={styles.input} value={hotelForm.booking_reference} onChangeText={t => setHotelForm({ ...hotelForm, booking_reference: t })} placeholder="ABC123" autoCapitalize="characters" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>部屋タイプ</Text>
                    <TextInput style={styles.input} value={hotelForm.room_type} onChangeText={t => setHotelForm({ ...hotelForm, room_type: t })} placeholder="デラックスツイン" />
                  </View>
                </View>

                <Text style={styles.inputLabel}>メモ（任意）</Text>
                <TextInput style={[styles.input, { height: 60, textAlignVertical: 'top' }]} value={hotelForm.notes}
                  onChangeText={t => setHotelForm({ ...hotelForm, notes: t })} placeholder="追加情報" multiline />

                <TouchableOpacity style={styles.saveBtn} onPress={saveHotel}><Text style={styles.saveBtnText}>保存</Text></TouchableOpacity>
                <View style={{ height: 40 }} />
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
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
  card: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  cardTypeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  cardTypeIcon: { fontSize: 14, marginRight: 6 },
  cardTypeLabel: { fontSize: 12, color: '#9CA3AF', fontWeight: '600' },
  flightHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  flightTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  refBadge: { fontSize: 11, color: '#6B7280', backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  routeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  airportCode: { fontSize: 22, fontWeight: '800', color: '#0891B2' },
  timeText: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  routeLine: { width: 50, height: 2, backgroundColor: '#E5E7EB' },
  detailText: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  statusBadge: { borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, marginTop: 6, alignItems: 'center' },
  statusText: { fontSize: 13, fontWeight: '600' },
  hotelName: { fontSize: 17, fontWeight: '700', color: '#1F2937', marginBottom: 10 },
  hotelDateRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  hotelDateLabel: { fontSize: 11, color: '#9CA3AF' },
  hotelDate: { fontSize: 18, fontWeight: '700', color: '#1F2937', marginTop: 2 },
  nightsBadge: { backgroundColor: '#ECFEFF', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, alignItems: 'center', marginHorizontal: 12 },
  nightsNum: { fontSize: 20, fontWeight: '800', color: '#0891B2' },
  nightsLabel: { fontSize: 11, color: '#0891B2' },
  emptySection: { backgroundColor: '#FFF', borderRadius: 14, padding: 20, marginBottom: 16, alignItems: 'center' },
  emptySectionText: { color: '#9CA3AF', fontSize: 14, textAlign: 'center' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1F2937', marginBottom: 8 },
  emptyText: { fontSize: 15, color: '#6B7280', textAlign: 'center', lineHeight: 22 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%', paddingBottom: Platform.OS === 'ios' ? 40 : 20 },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1F2937' },
  typeOption: { flexDirection: 'row', alignItems: 'center', padding: 18, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  typeOptionTitle: { fontSize: 17, fontWeight: '600', color: '#1F2937' },
  typeOptionDesc: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#F3F4F6', borderRadius: 12, padding: 14, fontSize: 16, color: '#1F2937', borderWidth: 1, borderColor: '#E5E7EB' },
  ruleBox: { backgroundColor: '#ECFEFF', borderRadius: 12, padding: 14, marginTop: 16, borderWidth: 1, borderColor: '#A5F3FC' },
  ruleTitle: { fontSize: 14, fontWeight: '700', color: '#0891B2', marginBottom: 4 },
  ruleText: { fontSize: 13, color: '#1F2937' },
  saveBtn: { backgroundColor: '#0891B2', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 20 },
  saveBtnText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
});
