/**
 * パッキングリスト（持ち物チェック）ライブラリ
 *
 * - 渡航先・期間・季節に応じたスマート持ち物リスト
 * - カテゴリ別管理
 * - AsyncStorage でチェック状態をローカル保存
 * - AI で渡航先に応じた追加アイテム提案（将来）
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ===== 型定義 =====

export interface PackingItem {
  id: string;
  name: string;
  emoji: string;
  essential: boolean;     // 必須アイテムかどうか
  quantity: number;        // 推奨数量
  note?: string;           // 補足メモ
}

export interface PackingCategory {
  id: string;
  title: string;
  emoji: string;
  color: string;
  items: PackingItem[];
}

export interface PackingCheckState {
  [itemId: string]: boolean;
}

export interface PackingListConfig {
  tripId: string;
  destination: string;       // 国コード
  durationDays: number;
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  purpose: 'leisure' | 'business' | 'family';
}

// ===== デフォルトカテゴリ =====

const ESSENTIALS: PackingCategory = {
  id: 'essentials',
  title: '貴重品・必需品',
  emoji: '🛂',
  color: '#EF4444',
  items: [
    { id: 'e01', name: 'パスポート', emoji: '🛂', essential: true, quantity: 1, note: '残存有効期間を確認' },
    { id: 'e02', name: 'パスポートのコピー', emoji: '📄', essential: true, quantity: 2, note: '写真ページを2部' },
    { id: 'e03', name: '航空券（eチケット控え）', emoji: '✈️', essential: true, quantity: 1, note: 'スマホ＋紙の両方推奨' },
    { id: 'e04', name: 'ホテル予約確認書', emoji: '🏨', essential: true, quantity: 1 },
    { id: 'e05', name: '海外旅行保険証', emoji: '🏥', essential: true, quantity: 1, note: '連絡先メモも' },
    { id: 'e06', name: 'クレジットカード', emoji: '💳', essential: true, quantity: 2, note: 'VISA/Mastercard推奨。2枚以上' },
    { id: 'e07', name: '現金（日本円）', emoji: '💴', essential: true, quantity: 1, note: '帰国時の交通費分' },
    { id: 'e08', name: '現金（現地通貨）', emoji: '💰', essential: false, quantity: 1, note: '到着後の両替でもOK' },
    { id: 'e09', name: '運転免許証', emoji: '🪪', essential: false, quantity: 1, note: '身分証明として' },
    { id: 'e10', name: '国際運転免許証', emoji: '🚗', essential: false, quantity: 1, note: 'レンタカー予定なら必須' },
    { id: 'e11', name: 'ビザ・ESTA等', emoji: '📋', essential: false, quantity: 1, note: '渡航先の要件を確認' },
  ],
};

const ELECTRONICS: PackingCategory = {
  id: 'electronics',
  title: '電子機器',
  emoji: '📱',
  color: '#3B82F6',
  items: [
    { id: 'el01', name: 'スマートフォン', emoji: '📱', essential: true, quantity: 1 },
    { id: 'el02', name: '充電器（スマホ）', emoji: '🔌', essential: true, quantity: 1 },
    { id: 'el03', name: 'モバイルバッテリー', emoji: '🔋', essential: true, quantity: 1, note: '10000mAh以上推奨' },
    { id: 'el04', name: 'USB充電ケーブル', emoji: '🔌', essential: true, quantity: 2, note: '予備も含めて' },
    { id: 'el05', name: '変換プラグ', emoji: '🔌', essential: false, quantity: 1, note: '渡航先のコンセント形状を確認' },
    { id: 'el06', name: 'イヤホン', emoji: '🎧', essential: false, quantity: 1, note: '機内で必要' },
    { id: 'el07', name: 'カメラ', emoji: '📷', essential: false, quantity: 1 },
    { id: 'el08', name: 'カメラ充電器・SDカード', emoji: '💾', essential: false, quantity: 1 },
    { id: 'el09', name: 'eSIM / Wi-Fiルーター', emoji: '📡', essential: false, quantity: 1, note: '事前に設定しておく' },
  ],
};

const CLOTHING: PackingCategory = {
  id: 'clothing',
  title: '衣類',
  emoji: '👕',
  color: '#10B981',
  items: [
    { id: 'c01', name: '下着', emoji: '🩲', essential: true, quantity: 0, note: '泊数＋1枚' },
    { id: 'c02', name: '靴下', emoji: '🧦', essential: true, quantity: 0, note: '泊数＋1足' },
    { id: 'c03', name: 'トップス（Tシャツ等）', emoji: '👕', essential: true, quantity: 0, note: '泊数分' },
    { id: 'c04', name: 'ボトムス', emoji: '👖', essential: true, quantity: 2 },
    { id: 'c05', name: 'パジャマ・部屋着', emoji: '🛌', essential: false, quantity: 1 },
    { id: 'c06', name: '歩きやすい靴', emoji: '👟', essential: true, quantity: 1 },
    { id: 'c07', name: 'サンダル', emoji: '🩴', essential: false, quantity: 1, note: 'ホテル内・ビーチ用' },
    { id: 'c08', name: '上着・羽織もの', emoji: '🧥', essential: false, quantity: 1, note: '機内は冷えることが多い' },
    { id: 'c09', name: '水着', emoji: '🩱', essential: false, quantity: 1, note: 'プール・ビーチ予定なら' },
    { id: 'c10', name: '帽子', emoji: '🧢', essential: false, quantity: 1 },
    { id: 'c11', name: 'サングラス', emoji: '🕶️', essential: false, quantity: 1 },
    { id: 'c12', name: '折りたたみ傘', emoji: '☂️', essential: false, quantity: 1 },
  ],
};

const TOILETRIES: PackingCategory = {
  id: 'toiletries',
  title: '洗面用具・衛生用品',
  emoji: '🧴',
  color: '#F97316',
  items: [
    { id: 't01', name: '歯ブラシ・歯磨き粉', emoji: '🪥', essential: true, quantity: 1, note: '100ml以下の容器で' },
    { id: 't02', name: 'シャンプー・リンス', emoji: '🧴', essential: false, quantity: 1, note: 'ホテルにある場合は不要' },
    { id: 't03', name: '洗顔料', emoji: '🧼', essential: false, quantity: 1 },
    { id: 't04', name: '日焼け止め', emoji: '🧴', essential: false, quantity: 1 },
    { id: 't05', name: '常備薬', emoji: '💊', essential: true, quantity: 1, note: '頭痛薬・胃腸薬・酔い止めなど' },
    { id: 't06', name: '処方箋薬', emoji: '💊', essential: false, quantity: 1, note: '英文の処方箋も持参推奨' },
    { id: 't07', name: 'マスク', emoji: '😷', essential: false, quantity: 3, note: '機内・乾燥対策' },
    { id: 't08', name: 'ウェットティッシュ', emoji: '🧻', essential: false, quantity: 1 },
    { id: 't09', name: 'ティッシュ', emoji: '🧻', essential: true, quantity: 2 },
    { id: 't10', name: 'リップクリーム', emoji: '💄', essential: false, quantity: 1, note: '機内は乾燥する' },
    { id: 't11', name: '虫よけスプレー', emoji: '🦟', essential: false, quantity: 1, note: '東南アジア等' },
  ],
};

const BAGS_MISC: PackingCategory = {
  id: 'bags_misc',
  title: 'バッグ・その他',
  emoji: '🎒',
  color: '#8B5CF6',
  items: [
    { id: 'b01', name: 'スーツケース', emoji: '🧳', essential: true, quantity: 1 },
    { id: 'b02', name: 'デイバッグ・リュック', emoji: '🎒', essential: true, quantity: 1, note: '観光時の手荷物用' },
    { id: 'b03', name: 'エコバッグ', emoji: '🛍️', essential: false, quantity: 1, note: 'お土産・買い物時に便利' },
    { id: 'b04', name: 'ジップロック袋', emoji: '🔒', essential: true, quantity: 3, note: '液体物の機内持込み用' },
    { id: 'b05', name: '圧縮袋', emoji: '📦', essential: false, quantity: 2, note: '衣類の圧縮用' },
    { id: 'b06', name: 'ネックピロー', emoji: '🛏️', essential: false, quantity: 1, note: '長距離フライト向け' },
    { id: 'b07', name: 'アイマスク', emoji: '😴', essential: false, quantity: 1 },
    { id: 'b08', name: 'スリッパ', emoji: '🩴', essential: false, quantity: 1, note: '機内用' },
    { id: 'b09', name: 'ボールペン', emoji: '🖊️', essential: true, quantity: 1, note: '入国カード記入用' },
    { id: 'b10', name: 'ガイドブック', emoji: '📖', essential: false, quantity: 1 },
    { id: 'b11', name: 'セキュリティポーチ', emoji: '👝', essential: false, quantity: 1, note: '貴重品を体に近く持てる' },
    { id: 'b12', name: 'TSAロック', emoji: '🔐', essential: false, quantity: 1, note: 'アメリカ渡航時はTSA対応を' },
  ],
};

// ===== 全カテゴリ =====
export const DEFAULT_CATEGORIES: PackingCategory[] = [
  ESSENTIALS,
  ELECTRONICS,
  CLOTHING,
  TOILETRIES,
  BAGS_MISC,
];

// ===== 季節・地域別の追加アイテム =====

interface ConditionalItems {
  condition: string;         // 表示条件の説明
  check: (config: PackingListConfig) => boolean;
  items: PackingItem[];
}

const CONDITIONAL_ITEMS: ConditionalItems[] = [
  {
    condition: '冬の渡航',
    check: (c) => c.season === 'winter',
    items: [
      { id: 'w01', name: 'ダウンジャケット', emoji: '🧥', essential: true, quantity: 1 },
      { id: 'w02', name: 'マフラー', emoji: '🧣', essential: false, quantity: 1 },
      { id: 'w03', name: '手袋', emoji: '🧤', essential: false, quantity: 1 },
      { id: 'w04', name: 'ヒートテック等', emoji: '🌡️', essential: false, quantity: 2 },
      { id: 'w05', name: 'カイロ', emoji: '🔥', essential: false, quantity: 3 },
    ],
  },
  {
    condition: '夏・ビーチリゾート',
    check: (c) => c.season === 'summer' || ['TH', 'SG', 'ID', 'PH', 'VN', 'MY', 'MV', 'HK'].includes(c.destination),
    items: [
      { id: 's01', name: '水着', emoji: '🩱', essential: false, quantity: 1 },
      { id: 's02', name: 'ラッシュガード', emoji: '🏊', essential: false, quantity: 1 },
      { id: 's03', name: '日焼け止め（高SPF）', emoji: '☀️', essential: true, quantity: 1 },
      { id: 's04', name: 'サングラス', emoji: '🕶️', essential: true, quantity: 1 },
    ],
  },
  {
    condition: 'アメリカ渡航',
    check: (c) => c.destination === 'US',
    items: [
      { id: 'us01', name: 'ESTA承認控え', emoji: '📋', essential: true, quantity: 1 },
      { id: 'us02', name: 'TSAロック', emoji: '🔐', essential: true, quantity: 1 },
    ],
  },
  {
    condition: 'ヨーロッパ渡航',
    check: (c) => ['FR', 'DE', 'IT', 'ES', 'GB', 'NL', 'CH', 'AT', 'BE', 'PT'].includes(c.destination),
    items: [
      { id: 'eu01', name: 'C型変換プラグ', emoji: '🔌', essential: true, quantity: 1, note: 'EU主要国はC型' },
      { id: 'eu02', name: 'ETIAS（2025年～）', emoji: '📋', essential: false, quantity: 1, note: '要件を確認' },
    ],
  },
  {
    condition: 'イギリス渡航',
    check: (c) => c.destination === 'GB',
    items: [
      { id: 'gb01', name: 'BF型変換プラグ', emoji: '🔌', essential: true, quantity: 1, note: 'イギリスは独自規格' },
    ],
  },
  {
    condition: '東南アジア渡航',
    check: (c) => ['TH', 'VN', 'KH', 'LA', 'MM', 'ID', 'PH', 'MY'].includes(c.destination),
    items: [
      { id: 'sea01', name: '虫よけスプレー', emoji: '🦟', essential: true, quantity: 1 },
      { id: 'sea02', name: '整腸薬', emoji: '💊', essential: true, quantity: 1, note: 'お腹を壊しやすい' },
      { id: 'sea03', name: '携帯ウォシュレット', emoji: '🚿', essential: false, quantity: 1 },
    ],
  },
  {
    condition: '長期旅行（7泊以上）',
    check: (c) => c.durationDays >= 7,
    items: [
      { id: 'long01', name: '洗濯洗剤（小分け）', emoji: '🧺', essential: false, quantity: 1, note: 'ホテルで手洗い用' },
      { id: 'long02', name: '洗濯ネット', emoji: '🧺', essential: false, quantity: 1 },
      { id: 'long03', name: '予備の折りたたみバッグ', emoji: '🛍️', essential: false, quantity: 1, note: 'お土産が増えた時用' },
    ],
  },
  {
    condition: 'ビジネス渡航',
    check: (c) => c.purpose === 'business',
    items: [
      { id: 'biz01', name: 'スーツ・ジャケット', emoji: '🤵', essential: true, quantity: 1 },
      { id: 'biz02', name: 'ネクタイ', emoji: '👔', essential: false, quantity: 1 },
      { id: 'biz03', name: '革靴', emoji: '👞', essential: true, quantity: 1 },
      { id: 'biz04', name: '名刺', emoji: '📇', essential: true, quantity: 1, note: '英語版も用意' },
      { id: 'biz05', name: 'ノートPC', emoji: '💻', essential: true, quantity: 1 },
    ],
  },
  {
    condition: '子連れ旅行',
    check: (c) => c.purpose === 'family',
    items: [
      { id: 'fam01', name: 'お子様のパスポート', emoji: '🛂', essential: true, quantity: 1 },
      { id: 'fam02', name: 'おむつ・おしりふき', emoji: '🍼', essential: false, quantity: 1, note: '必要な場合' },
      { id: 'fam03', name: 'お菓子・おもちゃ', emoji: '🧸', essential: false, quantity: 1, note: '機内で退屈しない用' },
      { id: 'fam04', name: '子供用の薬', emoji: '💊', essential: false, quantity: 1 },
      { id: 'fam05', name: '母子手帳のコピー', emoji: '📖', essential: false, quantity: 1 },
    ],
  },
];

// ===== メイン関数 =====

/**
 * 旅行条件に応じたパッキングリストを生成
 */
export function generatePackingList(config: PackingListConfig): PackingCategory[] {
  const categories = DEFAULT_CATEGORIES.map(cat => ({
    ...cat,
    items: cat.items.map(item => ({
      ...item,
      // 衣類の数量を泊数に応じて自動調整
      quantity: item.quantity === 0 ? config.durationDays + 1 : item.quantity,
    })),
  }));

  // 条件に合う追加アイテムを収集
  const extraItems: PackingItem[] = [];
  for (const cond of CONDITIONAL_ITEMS) {
    if (cond.check(config)) {
      extraItems.push(...cond.items);
    }
  }

  // 追加アイテムがあれば、新カテゴリとして追加
  if (extraItems.length > 0) {
    // 重複排除（ID ベース。既存アイテムと被るものは除外）
    const existingIds = new Set(categories.flatMap(c => c.items.map(i => i.id)));
    const uniqueExtras = extraItems.filter(i => !existingIds.has(i.id));

    if (uniqueExtras.length > 0) {
      categories.push({
        id: 'extras',
        title: 'おすすめ追加アイテム',
        emoji: '✨',
        color: '#EC4899',
        items: uniqueExtras,
      });
    }
  }

  return categories;
}

/**
 * 渡航先の季節を推定（北半球前提、簡易版）
 */
export function estimateSeason(departureDate: string, countryCode: string): 'spring' | 'summer' | 'autumn' | 'winter' {
  const month = new Date(departureDate).getMonth() + 1; // 1-12

  // 南半球の国は季節を反転
  const southernHemisphere = ['AU', 'NZ', 'AR', 'BR', 'CL', 'ZA'];
  const isSouthern = southernHemisphere.includes(countryCode);

  // 熱帯の国は常に夏
  const tropical = ['TH', 'SG', 'MY', 'ID', 'PH', 'VN', 'KH', 'LA', 'MM', 'MV', 'HK'];
  if (tropical.includes(countryCode)) return 'summer';

  let m = month;
  if (isSouthern) {
    m = ((month + 5) % 12) + 1; // 6ヶ月シフト
  }

  if (m >= 3 && m <= 5) return 'spring';
  if (m >= 6 && m <= 8) return 'summer';
  if (m >= 9 && m <= 11) return 'autumn';
  return 'winter';
}

// ===== AsyncStorage でチェック状態を保存 =====

const PACKING_STORAGE_PREFIX = 'tripready_packing_';

/**
 * チェック状態を保存
 */
export async function savePackingChecks(tripId: string, checks: PackingCheckState): Promise<void> {
  await AsyncStorage.setItem(`${PACKING_STORAGE_PREFIX}${tripId}`, JSON.stringify(checks));
}

/**
 * チェック状態を読み込み
 */
export async function loadPackingChecks(tripId: string): Promise<PackingCheckState> {
  const raw = await AsyncStorage.getItem(`${PACKING_STORAGE_PREFIX}${tripId}`);
  return raw ? JSON.parse(raw) : {};
}

/**
 * カスタムアイテムを追加保存
 */
export async function saveCustomItems(tripId: string, items: PackingItem[]): Promise<void> {
  await AsyncStorage.setItem(`${PACKING_STORAGE_PREFIX}custom_${tripId}`, JSON.stringify(items));
}

/**
 * カスタムアイテムを読み込み
 */
export async function loadCustomItems(tripId: string): Promise<PackingItem[]> {
  const raw = await AsyncStorage.getItem(`${PACKING_STORAGE_PREFIX}custom_${tripId}`);
  return raw ? JSON.parse(raw) : [];
}

/**
 * パッキング進捗を計算
 */
export function getPackingProgress(categories: PackingCategory[], checks: PackingCheckState): {
  total: number;
  checked: number;
  percent: number;
  essentialTotal: number;
  essentialChecked: number;
} {
  let total = 0;
  let checked = 0;
  let essentialTotal = 0;
  let essentialChecked = 0;

  for (const cat of categories) {
    for (const item of cat.items) {
      total++;
      if (checks[item.id]) checked++;
      if (item.essential) {
        essentialTotal++;
        if (checks[item.id]) essentialChecked++;
      }
    }
  }

  return {
    total,
    checked,
    percent: total > 0 ? Math.round((checked / total) * 100) : 0,
    essentialTotal,
    essentialChecked,
  };
}
