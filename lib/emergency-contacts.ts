/**
 * 緊急連絡先ライブラリ
 *
 * 渡航先の緊急通報番号・日本大使館/領事館情報を提供する。
 * オフライン対応: すべてアプリ内蔵データ（API不要）
 */

// ===== 型定義 =====

export interface EmergencyNumbers {
  police: string;
  ambulance: string;
  fire: string;
  universal?: string;  // 共通番号がある場合
}

export interface EmbassyInfo {
  name: string;
  address: string;
  phone: string;
  emergencyPhone?: string;  // 緊急時専用番号
  hours?: string;
  url?: string;
}

export interface CountryEmergencyInfo {
  countryCode: string;
  countryName: string;
  emergency: EmergencyNumbers;
  embassies: EmbassyInfo[];
  tips: string[];  // 現地での注意点
}

// ===== 緊急通報番号データベース =====

const EMERGENCY_DATA: Record<string, CountryEmergencyInfo> = {
  US: {
    countryCode: 'US',
    countryName: 'アメリカ合衆国',
    emergency: { police: '911', ambulance: '911', fire: '911', universal: '911' },
    embassies: [
      {
        name: '在米日本国大使館',
        address: '2520 Massachusetts Avenue NW, Washington, DC 20008',
        phone: '+1-202-238-6700',
        emergencyPhone: '+1-202-238-6700',
        hours: '月〜金 9:15-16:30',
        url: 'https://www.us.emb-japan.go.jp/',
      },
      {
        name: '在ニューヨーク日本国総領事館',
        address: '299 Park Avenue, 18th Floor, New York, NY 10171',
        phone: '+1-212-371-8222',
        emergencyPhone: '+1-212-371-8222',
      },
      {
        name: '在ロサンゼルス日本国総領事館',
        address: '350 South Grand Avenue, Suite 1700, Los Angeles, CA 90071',
        phone: '+1-213-617-6700',
        emergencyPhone: '+1-213-617-6700',
      },
    ],
    tips: [
      '医療費が非常に高額です。必ず海外旅行保険に加入してください。',
      'チップ文化があります（レストラン15-20%、タクシー15%）。',
      '州によって法律が異なります。大麻が合法の州でも連邦法では違法です。',
    ],
  },
  KR: {
    countryCode: 'KR',
    countryName: '韓国',
    emergency: { police: '112', ambulance: '119', fire: '119' },
    embassies: [
      {
        name: '在大韓民国日本国大使館',
        address: 'ソウル特別市鍾路区栗谷路6',
        phone: '+82-2-2170-5200',
        emergencyPhone: '+82-10-9767-1265',
        hours: '月〜金 9:00-12:00, 13:30-17:00',
        url: 'https://www.kr.emb-japan.go.jp/',
      },
      {
        name: '在釜山日本国総領事館',
        address: '釜山広域市東区古館路18',
        phone: '+82-51-465-5101',
        emergencyPhone: '+82-51-465-5101',
      },
    ],
    tips: [
      '日本語が通じるタクシーは少ないため、目的地を韓国語で見せると便利です。',
      '地下鉄は安くて便利。T-moneyカードを購入しましょう。',
      '深夜のタクシーは割増料金がかかります。',
    ],
  },
  TW: {
    countryCode: 'TW',
    countryName: '台湾',
    emergency: { police: '110', ambulance: '119', fire: '119' },
    embassies: [
      {
        name: '日本台湾交流協会 台北事務所',
        address: '台北市松山区慶城街28号',
        phone: '+886-2-2713-8000',
        emergencyPhone: '+886-2-2713-8000',
        hours: '月〜金 9:00-12:00, 13:30-17:00',
        url: 'https://www.koryu.or.jp/taipei/',
      },
      {
        name: '日本台湾交流協会 高雄事務所',
        address: '高雄市苓雅区和平一路87号',
        phone: '+886-7-771-4008',
        emergencyPhone: '+886-7-771-4008',
      },
    ],
    tips: [
      '日本語が通じる場所も多いですが、基本は中国語です。',
      '悠遊卡（Easy Card）で交通機関やコンビニが利用できます。',
      '水道水は飲めません。ペットボトルの水を購入しましょう。',
    ],
  },
  TH: {
    countryCode: 'TH',
    countryName: 'タイ',
    emergency: { police: '191', ambulance: '1669', fire: '199', universal: '1155' },
    embassies: [
      {
        name: '在タイ日本国大使館',
        address: '177 Witthayu Road, Lumphini, Pathum Wan, Bangkok 10330',
        phone: '+66-2-207-8500',
        emergencyPhone: '+66-81-846-8265',
        hours: '月〜金 8:30-12:00, 13:30-16:30',
        url: 'https://www.th.emb-japan.go.jp/',
      },
      {
        name: '在チェンマイ日本国総領事館',
        address: 'Airport Business Park, 90 Mahidol Road, Chiang Mai 50100',
        phone: '+66-52-012-500',
        emergencyPhone: '+66-81-846-8265',
      },
    ],
    tips: [
      'ツーリストポリス（1155番）は英語対応で旅行者の味方です。',
      '王室への不敬罪は厳罰です。王室に関する発言には注意してください。',
      '宝石詐欺やタクシーぼったくりに注意。メーターの使用を確認しましょう。',
    ],
  },
  SG: {
    countryCode: 'SG',
    countryName: 'シンガポール',
    emergency: { police: '999', ambulance: '995', fire: '995' },
    embassies: [
      {
        name: '在シンガポール日本国大使館',
        address: '16 Nassim Road, Singapore 258390',
        phone: '+65-6235-8855',
        emergencyPhone: '+65-6235-8855',
        hours: '月〜金 8:30-12:30, 13:30-17:15',
        url: 'https://www.sg.emb-japan.go.jp/',
      },
    ],
    tips: [
      'ガムの持ち込みは禁止されています。',
      'ゴミのポイ捨て、喫煙場所外での喫煙には高額罰金があります。',
      '公共交通はEZリンクカードが便利です。',
    ],
  },
  GB: {
    countryCode: 'GB',
    countryName: 'イギリス',
    emergency: { police: '999', ambulance: '999', fire: '999', universal: '999' },
    embassies: [
      {
        name: '在英国日本国大使館',
        address: '101-104 Piccadilly, London W1J 7JT',
        phone: '+44-20-7465-6500',
        emergencyPhone: '+44-20-7465-6500',
        hours: '月〜金 9:30-13:00, 14:00-16:30',
        url: 'https://www.uk.emb-japan.go.jp/',
      },
    ],
    tips: [
      '非緊急の警察相談は101番です。',
      'NHSの救急病院は無料で治療を受けられますが、待ち時間が長い場合があります。',
      '車は左側通行です（日本と同じ）。',
    ],
  },
  FR: {
    countryCode: 'FR',
    countryName: 'フランス',
    emergency: { police: '17', ambulance: '15', fire: '18', universal: '112' },
    embassies: [
      {
        name: '在フランス日本国大使館',
        address: '7 Avenue Hoche, 75008 Paris',
        phone: '+33-1-48-88-62-00',
        emergencyPhone: '+33-1-48-88-62-00',
        hours: '月〜金 9:30-13:00, 14:30-17:00',
        url: 'https://www.fr.emb-japan.go.jp/',
      },
    ],
    tips: [
      '112はEU共通の緊急番号です。どの国からでも使えます。',
      'スリが非常に多いです。特にメトロとエッフェル塔周辺は注意。',
      '薬局は緑の十字マークが目印です。',
    ],
  },
  DE: {
    countryCode: 'DE',
    countryName: 'ドイツ',
    emergency: { police: '110', ambulance: '112', fire: '112', universal: '112' },
    embassies: [
      {
        name: '在ドイツ日本国大使館',
        address: 'Hiroshimastraße 6, 10785 Berlin',
        phone: '+49-30-210-940',
        emergencyPhone: '+49-30-210-940',
        hours: '月〜金 9:00-12:15, 14:00-16:15',
        url: 'https://www.de.emb-japan.go.jp/',
      },
    ],
    tips: [
      '112はEU共通の緊急番号です。',
      '日曜日は法律でほとんどの店が休業します。',
      '現金社会の傾向があり、カードが使えない店舗もあります。',
    ],
  },
  IT: {
    countryCode: 'IT',
    countryName: 'イタリア',
    emergency: { police: '113', ambulance: '118', fire: '115', universal: '112' },
    embassies: [
      {
        name: '在イタリア日本国大使館',
        address: 'Via Quintino Sella 60, 00187 Roma',
        phone: '+39-06-487-991',
        emergencyPhone: '+39-06-487-991',
        hours: '月〜金 9:30-12:45, 14:15-16:30',
        url: 'https://www.it.emb-japan.go.jp/',
      },
    ],
    tips: [
      'スリやひったくりが多いです。特にローマ、ミラノ、ナポリでは注意。',
      'レストランでは席料（coperto）が加算されることがあります。',
      '美術館や教会では露出の多い服装は入場を断られることがあります。',
    ],
  },
  AU: {
    countryCode: 'AU',
    countryName: 'オーストラリア',
    emergency: { police: '000', ambulance: '000', fire: '000', universal: '000' },
    embassies: [
      {
        name: '在オーストラリア日本国大使館',
        address: '112 Empire Circuit, Yarralumla, ACT 2600',
        phone: '+61-2-6273-3244',
        emergencyPhone: '+61-2-6273-3244',
        hours: '月〜金 9:00-12:30, 14:00-17:00',
        url: 'https://www.au.emb-japan.go.jp/',
      },
      {
        name: '在シドニー日本国総領事館',
        address: 'Level 12, 1 O\'Connell Street, Sydney, NSW 2000',
        phone: '+61-2-9250-1000',
        emergencyPhone: '+61-2-9250-1000',
      },
    ],
    tips: [
      '食品や動植物の持ち込みは非常に厳しく、申告漏れには高額罰金があります。',
      '紫外線が非常に強いです。日焼け止めと帽子は必須。',
      '海では必ずパトロールされているビーチで泳ぎましょう。',
    ],
  },
  HK: {
    countryCode: 'HK',
    countryName: '香港',
    emergency: { police: '999', ambulance: '999', fire: '999', universal: '999' },
    embassies: [
      {
        name: '在香港日本国総領事館',
        address: '46/F, One Exchange Square, 8 Connaught Place, Central, Hong Kong',
        phone: '+852-2522-1184',
        emergencyPhone: '+852-2522-1184',
        hours: '月〜金 9:15-12:00, 13:30-16:45',
        url: 'https://www.hk.emb-japan.go.jp/',
      },
    ],
    tips: [
      'オクトパスカードで交通機関・コンビニ・スーパーが利用できます。',
      'タクシーは安くて便利。目的地を中国語で書いて見せるとスムーズです。',
      '飲料水は安全ですが、ミネラルウォーターを購入する旅行者が多いです。',
    ],
  },
  VN: {
    countryCode: 'VN',
    countryName: 'ベトナム',
    emergency: { police: '113', ambulance: '115', fire: '114' },
    embassies: [
      {
        name: '在ベトナム日本国大使館',
        address: '27 Lieu Giai, Ba Dinh, Hanoi',
        phone: '+84-24-3846-3000',
        emergencyPhone: '+84-24-3846-3000',
        hours: '月〜金 8:30-12:00, 13:30-17:15',
        url: 'https://www.vn.emb-japan.go.jp/',
      },
      {
        name: '在ホーチミン日本国総領事館',
        address: '261 Dien Bien Phu, Ward 7, District 3, Ho Chi Minh City',
        phone: '+84-28-3933-3510',
        emergencyPhone: '+84-28-3933-3510',
      },
    ],
    tips: [
      '交通マナーが日本とは大きく異なります。道路の横断には十分注意してください。',
      '値段交渉は一般的です。観光地では最初の提示額の50-70%を目安に。',
      'お腹を壊しやすいので、氷入りの飲み物や生野菜にはご注意ください。',
    ],
  },
  MY: {
    countryCode: 'MY',
    countryName: 'マレーシア',
    emergency: { police: '999', ambulance: '999', fire: '994' },
    embassies: [
      {
        name: '在マレーシア日本国大使館',
        address: '11, Persiaran Stonor, Off Jalan Tun Razak, 50450 Kuala Lumpur',
        phone: '+60-3-2177-2600',
        emergencyPhone: '+60-3-2177-2600',
        hours: '月〜金 8:30-12:30, 14:00-16:30',
        url: 'https://www.my.emb-japan.go.jp/',
      },
    ],
    tips: [
      'イスラム教の国です。モスク訪問時は肌の露出を控えてください。',
      'Touch \'n Goカードが交通機関・有料道路で使えて便利です。',
      'Grabタクシーが安全でおすすめです。',
    ],
  },
  ID: {
    countryCode: 'ID',
    countryName: 'インドネシア',
    emergency: { police: '110', ambulance: '118', fire: '113' },
    embassies: [
      {
        name: '在インドネシア日本国大使館',
        address: 'Jl. M.H. Thamrin No.24, Jakarta 10350',
        phone: '+62-21-3192-4308',
        emergencyPhone: '+62-21-3192-4308',
        hours: '月〜金 8:00-12:00, 13:30-16:00',
        url: 'https://www.id.emb-japan.go.jp/',
      },
      {
        name: '在デンパサール日本国総領事館',
        address: 'Jl. Raya Puputan No.170, Renon, Denpasar, Bali 80226',
        phone: '+62-361-227-628',
        emergencyPhone: '+62-361-227-628',
      },
    ],
    tips: [
      'バリ島は観光地ですが、スリや詐欺に注意してください。',
      '飲料水は必ずボトル入りの水を購入しましょう。',
      'イスラム教の国です（バリ島はヒンズー教）。寺院訪問時は服装に注意。',
    ],
  },
  CN: {
    countryCode: 'CN',
    countryName: '中国',
    emergency: { police: '110', ambulance: '120', fire: '119' },
    embassies: [
      {
        name: '在中国日本国大使館',
        address: '北京市朝陽区亮馬橋東街1号',
        phone: '+86-10-8531-9800',
        emergencyPhone: '+86-10-6532-5964',
        hours: '月〜金 9:00-12:00, 13:30-17:30',
        url: 'https://www.cn.emb-japan.go.jp/',
      },
      {
        name: '在上海日本国総領事館',
        address: '上海市万山路8号',
        phone: '+86-21-5257-4766',
        emergencyPhone: '+86-21-5257-4766',
      },
    ],
    tips: [
      'VPNがないとGoogle、LINE、Instagramなどが使えません。事前にVPNアプリを準備しましょう。',
      'キャッシュレス社会です。WeChat PayかAlipayが使えると便利です。',
      '水道水は飲めません。ボトル入りの水を購入してください。',
    ],
  },
  PH: {
    countryCode: 'PH',
    countryName: 'フィリピン',
    emergency: { police: '117', ambulance: '117', fire: '117', universal: '911' },
    embassies: [
      {
        name: '在フィリピン日本国大使館',
        address: '2627 Roxas Boulevard, Pasay City, Metro Manila',
        phone: '+63-2-8551-5710',
        emergencyPhone: '+63-2-8551-5710',
        hours: '月〜金 8:30-12:00, 13:30-17:15',
        url: 'https://www.ph.emb-japan.go.jp/',
      },
      {
        name: '在セブ日本国総領事館',
        address: '7th Floor, Keppel Center, Samar Loop, Cebu Business Park, Cebu City',
        phone: '+63-32-231-7321',
        emergencyPhone: '+63-32-231-7321',
      },
    ],
    tips: [
      '治安には十分注意してください。夜間の一人歩きは避けましょう。',
      'ジプニーは安いですがスリに注意。Grabタクシーがおすすめです。',
      '台風シーズン（6-12月）は天候に注意してください。',
    ],
  },
  ES: {
    countryCode: 'ES',
    countryName: 'スペイン',
    emergency: { police: '091', ambulance: '061', fire: '080', universal: '112' },
    embassies: [
      {
        name: '在スペイン日本国大使館',
        address: 'Calle Serrano 109, 28006 Madrid',
        phone: '+34-91-590-7600',
        emergencyPhone: '+34-91-590-7600',
        hours: '月〜金 9:30-13:30, 16:00-18:00',
        url: 'https://www.es.emb-japan.go.jp/',
      },
      {
        name: '在バルセロナ日本国総領事館',
        address: 'Avda. Diagonal 662-664, 08034 Barcelona',
        phone: '+34-93-280-3433',
        emergencyPhone: '+34-93-280-3433',
      },
    ],
    tips: [
      '112はEU共通の緊急番号です。',
      'バルセロナでのスリ被害が非常に多いです。特にランブラス通りは要注意。',
      '昼食は14時頃、夕食は21時以降が一般的です。',
    ],
  },
  NZ: {
    countryCode: 'NZ',
    countryName: 'ニュージーランド',
    emergency: { police: '111', ambulance: '111', fire: '111', universal: '111' },
    embassies: [
      {
        name: '在ニュージーランド日本国大使館',
        address: 'Level 18, The Majestic Centre, 100 Willis Street, Wellington 6011',
        phone: '+64-4-473-1540',
        emergencyPhone: '+64-4-473-1540',
        hours: '月〜金 9:00-12:30, 13:30-17:00',
        url: 'https://www.nz.emb-japan.go.jp/',
      },
    ],
    tips: [
      '食品や動植物の持ち込みに厳しい規制があります。必ず申告してください。',
      '紫外線が強いです。日焼け止め対策は必須。',
      '左側通行です（日本と同じ）。',
    ],
  },
  CA: {
    countryCode: 'CA',
    countryName: 'カナダ',
    emergency: { police: '911', ambulance: '911', fire: '911', universal: '911' },
    embassies: [
      {
        name: '在カナダ日本国大使館',
        address: '255 Sussex Drive, Ottawa, Ontario K1N 9E6',
        phone: '+1-613-241-8541',
        emergencyPhone: '+1-613-241-8541',
        hours: '月〜金 9:00-12:15, 13:30-17:15',
        url: 'https://www.ca.emb-japan.go.jp/',
      },
      {
        name: '在バンクーバー日本国総領事館',
        address: '900-1177 West Hastings Street, Vancouver, BC V6E 2K9',
        phone: '+1-604-684-5868',
        emergencyPhone: '+1-604-684-5868',
      },
      {
        name: '在トロント日本国総領事館',
        address: '77 King Street West, Suite 3300, Toronto, ON M5K 1A1',
        phone: '+1-416-363-7038',
        emergencyPhone: '+1-416-363-7038',
      },
    ],
    tips: [
      '医療費が高額です。海外旅行保険への加入を強くおすすめします。',
      'チップ文化があります（レストラン15-20%）。',
      '冬は非常に寒いです。防寒対策を万全に。',
    ],
  },
  AE: {
    countryCode: 'AE',
    countryName: 'アラブ首長国連邦',
    emergency: { police: '999', ambulance: '998', fire: '997' },
    embassies: [
      {
        name: '在アラブ首長国連邦日本国大使館',
        address: 'Plot No. 63, Sector W-43, Abu Dhabi',
        phone: '+971-2-443-5696',
        emergencyPhone: '+971-2-443-5696',
        hours: '日〜木 8:00-12:30, 13:30-16:30',
        url: 'https://www.ae.emb-japan.go.jp/',
      },
      {
        name: '在ドバイ日本国総領事館',
        address: '28th Floor, Al Moosa Tower I, Sheikh Zayed Road, Dubai',
        phone: '+971-4-331-9191',
        emergencyPhone: '+971-4-331-9191',
      },
    ],
    tips: [
      'イスラム教の国です。公共の場での露出の多い服装やPDAは避けてください。',
      'ラマダン期間中は日中の飲食を公共の場で行わないでください。',
      '週末は金曜・土曜です。金曜日は多くの施設が休業します。',
    ],
  },
  IN: {
    countryCode: 'IN',
    countryName: 'インド',
    emergency: { police: '100', ambulance: '108', fire: '101', universal: '112' },
    embassies: [
      {
        name: '在インド日本国大使館',
        address: '50-G, Shantipath, Chanakyapuri, New Delhi 110021',
        phone: '+91-11-4610-4610',
        emergencyPhone: '+91-11-4610-4610',
        hours: '月〜金 9:00-13:00, 14:00-17:30',
        url: 'https://www.in.emb-japan.go.jp/',
      },
    ],
    tips: [
      '水道水は飲めません。必ずボトル入りの水を購入してください。',
      '胃腸薬を持参することをおすすめします。',
      '詐欺やぼったくりに注意。特に駅周辺の「公式」旅行代理店には注意。',
    ],
  },
};

// ===== 共通緊急番号（外務省「たびレジ」） =====
export const COMMON_EMERGENCY_INFO = {
  // 外務省領事サービスセンター
  mofaPhone: '+81-3-3580-3311',
  mofaHours: '月〜金 9:00-12:30, 13:30-17:00（日本時間）',
  // 外務省 海外安全相談センター
  safetyPhone: '+81-3-3580-3311（内線2902・2903）',
  // たびレジURL
  tabiRegiUrl: 'https://www.ezairyu.mofa.go.jp/tabireg/',
  // ORRnet（在留届）
  orrnetUrl: 'https://www.ezairyu.mofa.go.jp/',
};

// ===== API関数 =====

/**
 * 国コードから緊急連絡先情報を取得
 * オフライン対応：すべてアプリ内蔵データ
 */
export function getEmergencyInfo(countryCode: string): CountryEmergencyInfo | null {
  return EMERGENCY_DATA[countryCode] || null;
}

/**
 * 緊急通報番号のみ取得
 */
export function getEmergencyNumbers(countryCode: string): EmergencyNumbers | null {
  const info = EMERGENCY_DATA[countryCode];
  return info ? info.emergency : null;
}

/**
 * 大使館情報のみ取得
 */
export function getEmbassyInfo(countryCode: string): EmbassyInfo[] {
  const info = EMERGENCY_DATA[countryCode];
  return info ? info.embassies : [];
}

/**
 * 利用可能な国コード一覧
 */
export function getAvailableCountries(): string[] {
  return Object.keys(EMERGENCY_DATA);
}

/**
 * 全データ取得（デバッグ用）
 */
export function getAllEmergencyData(): Record<string, CountryEmergencyInfo> {
  return EMERGENCY_DATA;
}
