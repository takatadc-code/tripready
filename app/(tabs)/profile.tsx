import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, Modal, Alert, TextInput, Platform, ScrollView, KeyboardAvoidingView,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import { scanPassport, scanCreditCard } from '../../lib/scan-ticket';
import { pickImageWithChoice } from '../../lib/pick-image';
import { registerAsOwner, getPlan, getDeviceId, Plan } from '../../lib/ai-usage';
import { PersonalDocument, PERSONAL_DOC_CATEGORIES, CATEGORY_FIELDS } from '../../types';

const CATEGORIES = Object.entries(PERSONAL_DOC_CATEGORIES);

export default function ProfileScreen() {
  const [docs, setDocs] = useState<PersonalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // フォーム
  const [formCategory, setFormCategory] = useState<string>('passport');
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formImageUri, setFormImageUri] = useState<string | null>(null);
  const [formExtra, setFormExtra] = useState<Record<string, string>>({});
  const [scanning, setScanning] = useState(false);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);

  // オーナー隠しコマンド
  const [showOwnerPrompt, setShowOwnerPrompt] = useState(false);
  const [ownerCode, setOwnerCode] = useState('');
  const [currentPlan, setCurrentPlan] = useState<Plan>('free');
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSecretTap = () => {
    tapCountRef.current += 1;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    if (tapCountRef.current >= 7) {
      tapCountRef.current = 0;
      setShowOwnerPrompt(true);
    } else {
      tapTimerRef.current = setTimeout(() => { tapCountRef.current = 0; }, 2000);
    }
  };

  const submitOwnerCode = async () => {
    const ok = await registerAsOwner(ownerCode.trim());
    if (ok) {
      Alert.alert('🎉', 'オーナー登録が完了しました。AI利用は無制限です。');
      setCurrentPlan('owner');
    } else {
      Alert.alert('エラー', 'コードが正しくありません');
    }
    setOwnerCode('');
    setShowOwnerPrompt(false);
  };

  // プラン取得
  useFocusEffect(useCallback(() => {
    getPlan().then(({ plan }) => setCurrentPlan(plan));
  }, []));

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    const deviceId = await getDeviceId();
    const { data } = await supabase
      .from('personal_documents')
      .select('*')
      .eq('device_id', deviceId)
      .order('category', { ascending: true });
    if (data) setDocs(data);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { fetchDocs(); }, [fetchDocs]));

  const pickImage = async () => {
    const picked = await pickImageWithChoice();
    if (picked) setFormImageUri(picked.uri);
  };

  const scanPassportImage = async () => {
    const picked = await pickImageWithChoice();
    if(!picked) return;
    setScanning(true);
    try {
      const data = await scanPassport(picked.uri);
      setFormTitle(data.full_name ? `パスポート（${data.full_name}）` : 'パスポート');
      setFormExtra({
        ...formExtra,
        passport_number: data.passport_number || '',
        nationality: data.nationality || '',
        expiry_date: data.expiry_date || '',
      });
      setFormImageUri(picked.uri);
      Alert.alert('読み取り完了','内容を確認して保存してください');
    } catch(e: any) {
      Alert.alert('読み取りエラー', e.message || 'パスポート情報を読み取れませんでした');
    } finally {
      setScanning(false);
    }
  };

  const scanCreditCardImage = async () => {
    const picked = await pickImageWithChoice();
    if(!picked) return;
    setScanning(true);
    try {
      const data = await scanCreditCard(picked.uri);
      setFormTitle(data.card_name || (data.card_brand ? `${data.card_brand}カード` : 'クレジットカード'));
      setFormExtra({
        ...formExtra,
        card_last4: data.card_last4 || '',
        card_brand: data.card_brand || '',
        expiry_date: data.expiry_date || '',
        card_name: data.card_name || '',
      });
      if (data.cardholder_name) {
        setFormDesc(`名義: ${data.cardholder_name}`);
      }
      setFormImageUri(picked.uri);
      Alert.alert('読み取り完了','内容を確認して保存してください');
    } catch(e: any) {
      Alert.alert('読み取りエラー', e.message || 'カード情報を読み取れませんでした');
    } finally {
      setScanning(false);
    }
  };

  const resetForm = () => {
    setFormCategory('passport');
    setFormTitle('');
    setFormDesc('');
    setFormImageUri(null);
    setFormExtra({});
    setShowAdd(false);
    setEditingDocId(null);
  };

  const saveDoc = async () => {
    if (!formTitle.trim()) {
      Alert.alert('入力エラー', 'タイトルを入力してください');
      return;
    }
    const cleanExtra: Record<string, string> = {};
    Object.entries(formExtra).forEach(([k, v]) => { if (v.trim()) cleanExtra[k] = v.trim(); });

    const docData = {
      category: formCategory,
      title: formTitle.trim(),
      description: formDesc.trim() || null,
      file_url: formImageUri,
      extra_data: Object.keys(cleanExtra).length > 0 ? cleanExtra : null,
    };

    const deviceId = await getDeviceId();
    if (editingDocId) {
      const { error } = await supabase.from('personal_documents').update(docData).eq('id', editingDocId);
      if (!error) { fetchDocs(); resetForm(); Alert.alert('完了', '書類を更新しました'); }
      else Alert.alert('エラー', '更新に失敗しました');
    } else {
      const { error } = await supabase.from('personal_documents').insert([{ ...docData, device_id: deviceId }]);
      if (!error) { fetchDocs(); resetForm(); Alert.alert('完了', '書類を登録しました'); }
      else Alert.alert('エラー', '保存に失敗しました');
    }
  };

  const showDocActions = (doc: PersonalDocument) => {
    Alert.alert(doc.title, 'この項目をどうしますか？', [
      {
        text: '編集',
        onPress: () => {
          setFormCategory(doc.category);
          setFormTitle(doc.title);
          setFormDesc(doc.description || '');
          setFormImageUri(doc.file_url || null);
          setFormExtra(doc.extra_data || {});
          setEditingDocId(doc.id);
          setShowAdd(true);
        },
      },
      {
        text: '削除', style: 'destructive',
        onPress: async () => {
          await supabase.from('personal_documents').delete().eq('id', doc.id);
          fetchDocs();
        },
      },
      { text: 'キャンセル', style: 'cancel' },
    ]);
  };

  // カテゴリ別にグループ化
  const grouped = CATEGORIES.map(([key, meta]) => ({
    category: key,
    label: meta.label,
    icon: meta.icon,
    items: docs.filter(d => d.category === key),
  })).filter(g => g.items.length > 0);

  // extra_dataからカテゴリ別の主要情報を取得
  const getExtraLabel = (item: PersonalDocument) => {
    const extra = item.extra_data;
    if (!extra) return null;
    switch (item.category) {
      case 'passport':
        return extra.passport_number ? `No. ${extra.passport_number}` : null;
      case 'mileage':
        return [extra.airline, extra.member_number].filter(Boolean).join(' ') || null;
      case 'credit_card':
        return [extra.card_brand, extra.card_last4 ? `**** ${extra.card_last4}` : null].filter(Boolean).join(' ') || null;
      case 'hotel_membership':
        return [extra.hotel_chain, extra.status].filter(Boolean).join(' ') || null;
      case 'insurance':
        return [extra.insurance_type, extra.company, extra.policy_number ? `No.${extra.policy_number}` : null].filter(Boolean).join(' / ') || null;
      case 'visa':
        return extra.country || null;
      default:
        return null;
    }
  };

  const getExpiryLabel = (item: PersonalDocument) => {
    const expiry = item.extra_data?.expiry_date;
    if (!expiry) return null;
    const days = Math.ceil((new Date(expiry).getTime() - Date.now()) / 86400000);
    if (days < 0) return { text: `期限切れ`, color: '#DC2626' };
    if (days <= 90) return { text: `残${days}日`, color: '#F59E0B' };
    return { text: `${expiry}まで`, color: '#6B7280' };
  };

  const renderDoc = (item: PersonalDocument) => {
    const cat = PERSONAL_DOC_CATEGORIES[item.category];
    const extraLabel = getExtraLabel(item);
    const expiry = getExpiryLabel(item);
    return (
      <TouchableOpacity
        key={item.id}
        style={styles.docCard}
        onPress={() => item.file_url && setSelectedImage(item.file_url)}
        onLongPress={() => showDocActions(item)}
      >
        {item.file_url ? (
          <Image source={{ uri: item.file_url }} style={styles.thumb} />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder]}>
            <Text style={{ fontSize: 28 }}>{cat?.icon || '📎'}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.docTitle}>{item.title}</Text>
          {extraLabel && (
            <Text style={styles.extraLabel}>{extraLabel}</Text>
          )}
          {item.description ? (
            <Text style={styles.docDesc} numberOfLines={1}>{item.description}</Text>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 }}>
            <View style={styles.catBadge}>
              <Text style={styles.catBadgeText}>{cat?.icon} {cat?.label}</Text>
            </View>
            {expiry && (
              <View style={[styles.catBadge, { backgroundColor: expiry.color + '15' }]}>
                <Text style={[styles.catBadgeText, { color: expiry.color }]}>{expiry.text}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {!docs.length && !loading ? (
        <View style={styles.empty}>
          <Text style={{ fontSize: 64, marginBottom: 16 }}>🛂</Text>
          <Text style={styles.emptyTitle}>個人書類はまだありません</Text>
          <Text style={styles.emptyText}>
            パスポートやマイレージ番号など{'\n'}旅行に必要な個人情報を管理しましょう
          </Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowAdd(true)}>
            <Text style={styles.emptyBtnText}>＋ 書類を追加</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={{ padding: 16 }} refreshControl={undefined}>
            {grouped.map(g => (
              <View key={g.category} style={{ marginBottom: 16 }}>
                <Text style={styles.sectionTitle}>{g.icon} {g.label}</Text>
                {g.items.map(renderDoc)}
              </View>
            ))}
            <Text style={styles.hint}>長押しで編集・削除できます</Text>

            {/* プランバッジ */}
            <View style={{ backgroundColor: currentPlan === 'owner' ? '#EDE9FE' : currentPlan === 'premium' ? '#ECFEFF' : '#F3F4F6', borderRadius: 12, padding: 12, marginTop: 12, flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 16, marginRight: 8 }}>{currentPlan === 'owner' ? '👑' : currentPlan === 'premium' ? '🌟' : '🆓'}</Text>
              <Text style={{ fontSize: 13, fontWeight: '600', color: currentPlan === 'owner' ? '#7C3AED' : currentPlan === 'premium' ? '#0891B2' : '#6B7280' }}>
                {currentPlan === 'owner' ? 'オーナー（AI無制限）' : currentPlan === 'premium' ? 'プレミアムプラン' : '無料プラン'}
              </Text>
            </View>

            <TouchableOpacity activeOpacity={1} onPress={handleSecretTap}>
              <View style={{backgroundColor:'#F0FDF4',borderRadius:12,padding:14,marginTop:12,flexDirection:'row',alignItems:'center'}}>
                <Text style={{fontSize:20,marginRight:10}}>🔒</Text>
                <View style={{flex:1}}>
                  <Text style={{fontSize:13,fontWeight:'600',color:'#166534'}}>プライバシー保護</Text>
                  <Text style={{fontSize:11,color:'#15803D',marginTop:2,lineHeight:16}}>パスポート・クレジットカード等の個人情報は端末内にのみ保存され、外部サーバーにアップロードされることはありません。</Text>
                </View>
              </View>
            </TouchableOpacity>
          </ScrollView>
          <TouchableOpacity style={styles.fab} onPress={() => setShowAdd(true)}>
            <Text style={styles.fabText}>＋</Text>
          </TouchableOpacity>
        </>
      )}

      {/* 追加モーダル */}
      <Modal animationType="slide" transparent visible={showAdd} onRequestClose={resetForm}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalBg}>
            <View style={styles.modal}>
              <View style={styles.modalHead}>
                <Text style={styles.modalTitle}>{editingDocId ? '個人書類を編集' : '個人書類を追加'}</Text>
                <TouchableOpacity onPress={resetForm}>
                  <Text style={{ fontSize: 20, color: '#9CA3AF' }}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={{ paddingHorizontal: 20 }}>
                {/* カテゴリ選択 */}
                <Text style={styles.inputLabel}>カテゴリ</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                  {CATEGORIES.map(([key, meta]) => (
                    <TouchableOpacity
                      key={key}
                      style={[styles.catChip, formCategory === key && styles.catChipActive]}
                      onPress={() => setFormCategory(key)}
                    >
                      <Text style={{ fontSize: 16 }}>{meta.icon}</Text>
                      <Text style={[styles.catChipText, formCategory === key && styles.catChipTextActive]}>
                        {meta.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* スキャンボタン */}
                {formCategory === 'passport' && (
                  <TouchableOpacity
                    style={[styles.scanBtn, scanning && {opacity:0.5}]}
                    onPress={scanPassportImage}
                    disabled={scanning}
                  >
                    <Text style={styles.scanBtnText}>{scanning ? '📡 読み取り中...' : '📷 パスポート写真から自動入力'}</Text>
                  </TouchableOpacity>
                )}
                {formCategory === 'credit_card' && (
                  <TouchableOpacity
                    style={[styles.scanBtn, scanning && {opacity:0.5}]}
                    onPress={scanCreditCardImage}
                    disabled={scanning}
                  >
                    <Text style={styles.scanBtnText}>{scanning ? '📡 読み取り中...' : '📷 カード写真から自動入力'}</Text>
                  </TouchableOpacity>
                )}

                {/* タイトル */}
                <Text style={styles.inputLabel}>タイトル</Text>
                <TextInput
                  style={styles.input}
                  value={formTitle}
                  onChangeText={setFormTitle}
                  placeholder="例: パスポート（高田光彦）"
                  placeholderTextColor="#9CA3AF"
                />

                {/* カテゴリ別専用フィールド */}
                {(CATEGORY_FIELDS[formCategory] || []).map(field => (
                  <View key={field.key}>
                    <Text style={styles.inputLabel}>{field.label}</Text>
                    <TextInput
                      style={styles.input}
                      value={formExtra[field.key] || ''}
                      onChangeText={t => setFormExtra({ ...formExtra, [field.key]: t })}
                      placeholder={field.placeholder}
                      placeholderTextColor="#9CA3AF"
                      keyboardType={field.keyboard === 'numeric' ? 'numeric' : 'default'}
                    />
                  </View>
                ))}

                {/* メモ */}
                <Text style={styles.inputLabel}>メモ（任意）</Text>
                <TextInput
                  style={[styles.input, { height: 72, textAlignVertical: 'top' }]}
                  value={formDesc}
                  onChangeText={setFormDesc}
                  placeholder="例: 有効期限 2030/12/15"
                  placeholderTextColor="#9CA3AF"
                  multiline
                />

                {/* 画像 */}
                <Text style={styles.inputLabel}>画像（任意）</Text>
                {formImageUri ? (
                  <TouchableOpacity onPress={pickImage}>
                    <Image source={{ uri: formImageUri }} style={styles.previewImg} />
                    <Text style={styles.changeImgText}>タップして変更</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.imgPicker} onPress={pickImage}>
                    <Text style={{ fontSize: 32, marginBottom: 4 }}>📷</Text>
                    <Text style={{ color: '#6B7280', fontSize: 14 }}>写真を選択</Text>
                  </TouchableOpacity>
                )}

                {/* 保存ボタン */}
                <TouchableOpacity style={styles.saveBtn} onPress={saveDoc}>
                  <Text style={styles.saveBtnText}>{editingDocId ? '更新' : '保存'}</Text>
                </TouchableOpacity>
                <View style={{ height: 40 }} />
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 画像プレビュー */}
      <Modal animationType="fade" transparent visible={!!selectedImage} onRequestClose={() => setSelectedImage(null)}>
        <TouchableOpacity style={styles.previewBg} activeOpacity={1} onPress={() => setSelectedImage(null)}>
          {selectedImage && (
            <Image source={{ uri: selectedImage }} style={{ width: '90%', height: '80%' }} resizeMode="contain" />
          )}
        </TouchableOpacity>
      </Modal>

      {/* オーナー登録隠しモーダル */}
      <Modal animationType="fade" transparent visible={showOwnerPrompt} onRequestClose={() => { setShowOwnerPrompt(false); setOwnerCode(''); }}>
        <View style={styles.modalBg}>
          <View style={[styles.modal, { paddingBottom: Platform.OS === 'ios' ? 40 : 20 }]}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>🔑 オーナー認証</Text>
              <TouchableOpacity onPress={() => { setShowOwnerPrompt(false); setOwnerCode(''); }}>
                <Text style={{ fontSize: 20, color: '#9CA3AF' }}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={{ padding: 20 }}>
              <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 12 }}>オーナーコードを入力してください</Text>
              <TextInput
                style={styles.input}
                value={ownerCode}
                onChangeText={setOwnerCode}
                placeholder="コードを入力"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                autoCapitalize="characters"
              />
              <TouchableOpacity style={[styles.saveBtn, !ownerCode.trim() && { opacity: 0.5 }]} onPress={submitOwnerCode} disabled={!ownerCode.trim()}>
                <Text style={styles.saveBtnText}>認証</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1F2937', marginBottom: 8 },
  docCard: {
    backgroundColor: '#FFF', borderRadius: 14, padding: 12, marginBottom: 8,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  thumb: { width: 60, height: 60, borderRadius: 10, marginRight: 12, backgroundColor: '#F3F4F6' },
  thumbPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  docTitle: { fontSize: 15, fontWeight: '600', color: '#1F2937' },
  extraLabel: { fontSize: 14, color: '#0891B2', fontWeight: '600', marginTop: 2 },
  docDesc: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  catBadge: { marginTop: 4, backgroundColor: '#F3F4F6', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  catBadgeText: { fontSize: 12, color: '#6B7280' },
  hint: { textAlign: 'center', color: '#9CA3AF', fontSize: 12, marginTop: 8, marginBottom: 24 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1F2937', marginBottom: 8 },
  emptyText: { fontSize: 15, color: '#6B7280', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  emptyBtn: { backgroundColor: '#0891B2', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14 },
  emptyBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  fab: {
    position: 'absolute', right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#0891B2', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6,
  },
  fabText: { fontSize: 28, color: '#FFF', marginTop: -2 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', paddingBottom: Platform.OS === 'ios' ? 40 : 20 },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1F2937' },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#F3F4F6', borderRadius: 12, padding: 14, fontSize: 16, color: '#1F2937', borderWidth: 1, borderColor: '#E5E7EB' },
  catChip: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, backgroundColor: '#F3F4F6', marginRight: 8, borderWidth: 1.5, borderColor: '#E5E7EB',
  },
  catChipActive: { backgroundColor: '#ECFEFF', borderColor: '#0891B2' },
  catChipText: { fontSize: 13, color: '#6B7280', marginLeft: 6 },
  catChipTextActive: { color: '#0891B2', fontWeight: '600' },
  imgPicker: {
    backgroundColor: '#F3F4F6', borderRadius: 14, padding: 24, alignItems: 'center',
    borderWidth: 2, borderColor: '#E5E7EB', borderStyle: 'dashed',
  },
  previewImg: { width: '100%', height: 180, borderRadius: 14, marginBottom: 4 },
  changeImgText: { textAlign: 'center', color: '#0891B2', fontSize: 13 },
  saveBtn: { backgroundColor: '#0891B2', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 20 },
  saveBtnText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  scanBtn: { backgroundColor: '#F0F9FF', borderWidth: 2, borderColor: '#0891B2', borderStyle: 'dashed', borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 8 },
  scanBtnText: { color: '#0891B2', fontSize: 15, fontWeight: '700' },
  previewBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
});
