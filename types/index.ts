export interface Trip {
  id: string;
  name: string;
  destination: string;
  country_code: string;
  departure_date: string;
  return_date: string;
  is_secret: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface EntryRequirement {
  id: string;
  trip_id: string;
  type: string;
  label: string;
  status: 'not_applied' | 'applied' | 'approved';
  apply_url?: string;
  notes?: string;
  deadline?: string;
  created_at: string;
  updated_at: string;
}

export interface TripDocument {
  id: string;
  trip_id: string;
  category: 'immigration' | 'flight' | 'event_ticket' | 'hotel' | 'other';
  title: string;
  file_url?: string;
  file_path?: string;
  thumbnail_url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export const REQUIREMENT_TYPES: Record<string, { label: string; countries: string[] }> = {
  ESTA: { label: 'ESTA (米国)', countries: ['US'] },
  ETIAS: { label: 'ETIAS (EU)', countries: ['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'GR', 'PT', 'FI', 'SE', 'DK', 'IE', 'CZ', 'PL', 'HU', 'HR', 'SK', 'SI', 'EE', 'LV', 'LT', 'BG', 'RO', 'CY', 'MT', 'LU'] },
  'K-ETA': { label: 'K-ETA (韓国)', countries: ['KR'] },
  SG_ARRIVAL_CARD: { label: 'SGアライバルカード', countries: ['SG'] },
};

export const DOCUMENT_CATEGORIES: Record<string, string> = {
  immigration: '入国審査承認',
  flight: '航空券',
  event_ticket: 'イベント入場券QR',
  hotel: 'ホテル',
  other: 'その他',
};

// 個人常備書類
export interface PersonalDocument {
  id: string;
  category: 'passport' | 'mileage' | 'credit_card' | 'hotel_membership' | 'insurance' | 'visa' | 'other';
  title: string;
  description?: string;
  file_url?: string;
  file_path?: string;
  extra_data?: Record<string, string>;
  created_at: string;
  updated_at: string;
}

// カテゴリ別の専用フィールド定義
export const CATEGORY_FIELDS: Record<string, { key: string; label: string; placeholder: string; keyboard?: string }[]> = {
  passport: [
    { key: 'passport_number', label: 'パスポート番号', placeholder: 'TK1234567' },
    { key: 'expiry_date', label: '有効期限', placeholder: 'YYYY-MM-DD' },
    { key: 'nationality', label: '国籍', placeholder: '日本' },
  ],
  mileage: [
    { key: 'airline', label: '航空会社', placeholder: 'ANA / JAL / UA など' },
    { key: 'member_number', label: '会員番号', placeholder: '1234567890' },
    { key: 'status', label: 'ステータス', placeholder: 'SFC / JGC / Gold など' },
  ],
  credit_card: [
    { key: 'card_last4', label: 'カード下4桁', placeholder: '1234', keyboard: 'numeric' },
    { key: 'card_brand', label: 'ブランド', placeholder: 'VISA / Mastercard / AMEX' },
    { key: 'expiry_date', label: '有効期限', placeholder: 'MM/YY' },
    { key: 'card_name', label: 'カード名称', placeholder: 'ANA VISA プラチナ' },
  ],
  hotel_membership: [
    { key: 'hotel_chain', label: 'ホテルチェーン', placeholder: 'Marriott / Hilton / IHG / Hyatt' },
    { key: 'member_number', label: '会員番号', placeholder: '1234567890' },
    { key: 'status', label: 'ステータス', placeholder: 'Platinum / Gold / Diamond など' },
  ],
  insurance: [
    { key: 'insurance_type', label: '保険種類', placeholder: 'カード付帯 / 年間包括 / 企業包括' },
    { key: 'company', label: '保険会社', placeholder: 'AIG / 損保ジャパン / 東京海上' },
    { key: 'policy_number', label: '証券番号', placeholder: '1234567890' },
    { key: 'phone', label: '緊急連絡先', placeholder: '+81-3-XXXX-XXXX' },
    { key: 'coverage', label: '補償内容', placeholder: '傷害・疾病・携行品・賠償責任' },
    { key: 'expiry_date', label: '有効期限', placeholder: 'YYYY-MM-DD' },
  ],
  visa: [
    { key: 'visa_number', label: 'ビザ番号', placeholder: 'V12345678' },
    { key: 'country', label: '対象国', placeholder: 'アメリカ' },
    { key: 'expiry_date', label: '有効期限', placeholder: 'YYYY-MM-DD' },
  ],
  other: [],
};

export const PERSONAL_DOC_CATEGORIES: Record<string, { label: string; icon: string }> = {
  passport: { label: 'パスポート', icon: '🛂' },
  mileage: { label: 'マイレージ', icon: '✈️' },
  credit_card: { label: 'クレジットカード', icon: '💳' },
  hotel_membership: { label: 'ホテル会員', icon: '🏨' },
  insurance: { label: '保険証券', icon: '🛡️' },
  visa: { label: 'ビザ', icon: '📋' },
  other: { label: 'その他', icon: '📎' },
};

// フライト情報
export interface Flight {
  id: string;
  trip_id: string;
  airline: string | null;
  flight_number: string | null;
  departure_airport: string | null;
  arrival_airport: string | null;
  departure_time: string | null;
  arrival_time?: string | null;
  booking_reference?: string | null;
  seat?: string | null;
  checkin_open_minutes: number;
  checkin_close_minutes: number;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

// ホテル情報
export interface Hotel {
  id: string;
  trip_id: string;
  name: string;
  checkin_date: string;
  checkout_date: string;
  checkin_time?: string;
  checkout_time?: string;
  address?: string;
  booking_reference?: string;
  room_type?: string;
  notes?: string;
  loyalty_program?: string;
  created_at: string;
  updated_at: string;
}

// 家族メンバー（トラベラー）
export interface Traveler {
  id: string;
  full_name: string;
  full_name_jp?: string;
  relationship: string;         // 本人 / 配偶者 / 子供 / その他
  passport_number?: string;
  passport_expiry?: string;
  birth_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  mileage?: TravelerMileage[];  // クライアント側のみ（join用）
}

// マイレージ情報
export interface TravelerMileage {
  id: string;
  traveler_id: string;
  airline: string;
  member_number: string;
  status?: string;
  created_at: string;
}

// フライト搭乗者
export interface FlightPassenger {
  id: string;
  flight_id: string;
  traveler_id: string;
  seat?: string;
  mileage_number?: string;
  notes?: string;
  traveler?: Traveler;  // join用
}

// 旅行保険（旅程ごと）
export interface TripInsurance {
  id: string;
  trip_id: string;
  company: string;
  policy_number?: string;
  phone?: string;
  coverage_type?: string;
  file_url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// ===== 空港ターミナル情報 =====
// key: "空港コード:航空会社コード" → ターミナル名
export const AIRPORT_TERMINALS: Record<string, string> = {
  // 成田空港 (NRT)
  'NRT:JL': 'T2', 'NRT:NU': 'T2',
  'NRT:NH': 'T1 南', 'NRT:UA': 'T1 南', 'NRT:LH': 'T1 南', 'NRT:SQ': 'T1 南',
  'NRT:TG': 'T1 南', 'NRT:OS': 'T1 南', 'NRT:LX': 'T1 南', 'NRT:CA': 'T1 南',
  'NRT:MU': 'T1 南', 'NRT:AY': 'T1 南', 'NRT:SK': 'T1 南', 'NRT:NZ': 'T1 南',
  'NRT:BA': 'T1 北', 'NRT:AF': 'T1 北', 'NRT:KL': 'T1 北', 'NRT:DL': 'T1 北',
  'NRT:KE': 'T1 北', 'NRT:CX': 'T1 北', 'NRT:QF': 'T1 北', 'NRT:MH': 'T1 北',
  'NRT:VN': 'T1 北', 'NRT:GA': 'T1 北', 'NRT:PR': 'T1 北', 'NRT:EK': 'T1 北',
  'NRT:QR': 'T1 北', 'NRT:TK': 'T1 北', 'NRT:EY': 'T1 北', 'NRT:AA': 'T1 北',
  'NRT:OZ': 'T1 北', 'NRT:BI': 'T1 北',
  'NRT:MM': 'T3', 'NRT:GK': 'T3', 'NRT:TR': 'T3', 'NRT:7C': 'T3',
  'NRT:TW': 'T3', 'NRT:BX': 'T3', 'NRT:ZE': 'T3',
  'NRT:ZG': 'T1 北',
  'NRT:9C': 'T3', 'NRT:D7': 'T3',
  // 羽田空港 (HND)
  'HND:JL': 'T3', 'HND:NH': 'T3', 'HND:AA': 'T3', 'HND:BA': 'T3',
  'HND:DL': 'T3', 'HND:UA': 'T3', 'HND:AF': 'T3', 'HND:LH': 'T3',
  'HND:KE': 'T3', 'HND:OZ': 'T3', 'HND:CX': 'T3', 'HND:SQ': 'T3',
  'HND:TG': 'T3', 'HND:EK': 'T3', 'HND:QR': 'T3', 'HND:TK': 'T3',
  'HND:QF': 'T3', 'HND:AY': 'T3', 'HND:MH': 'T3', 'HND:VN': 'T3',
  'HND:GA': 'T3', 'HND:EY': 'T3',
  // 関西国際空港 (KIX)
  'KIX:JL': 'T1', 'KIX:NH': 'T1', 'KIX:KE': 'T1', 'KIX:OZ': 'T1',
  'KIX:CX': 'T1', 'KIX:SQ': 'T1', 'KIX:TG': 'T1', 'KIX:EK': 'T1',
  'KIX:QR': 'T1', 'KIX:TK': 'T1', 'KIX:LH': 'T1', 'KIX:BA': 'T1',
  'KIX:AF': 'T1', 'KIX:KL': 'T1', 'KIX:VN': 'T1', 'KIX:GA': 'T1',
  'KIX:MH': 'T1', 'KIX:PR': 'T1', 'KIX:CA': 'T1', 'KIX:MU': 'T1',
  'KIX:CZ': 'T1', 'KIX:HO': 'T1',
  'KIX:MM': 'T2', 'KIX:GK': 'T2', 'KIX:7C': 'T2',
  'KIX:TW': 'T2', 'KIX:BX': 'T2', 'KIX:ZE': 'T2',
  // 中部国際空港 (NGO)
  'NGO:JL': 'T1', 'NGO:NH': 'T1', 'NGO:KE': 'T1', 'NGO:OZ': 'T1',
  'NGO:SQ': 'T1', 'NGO:TG': 'T1', 'NGO:CX': 'T1', 'NGO:MU': 'T1',
  'NGO:MM': 'T2', 'NGO:GK': 'T2', 'NGO:7C': 'T2', 'NGO:TW': 'T2',
  // 福岡空港 (FUK)
  'FUK:JL': '国際線T', 'FUK:NH': '国際線T', 'FUK:KE': '国際線T',
  'FUK:OZ': '国際線T', 'FUK:7C': '国際線T', 'FUK:TW': '国際線T',
  // 新千歳空港 (CTS)
  'CTS:JL': '国際線T', 'CTS:NH': '国際線T', 'CTS:KE': '国際線T',
  'CTS:TG': '国際線T', 'CTS:MM': '国際線T',
  // ===== 主要海外空港 =====
  // 仁川 (ICN)
  'ICN:KE': 'T2', 'ICN:DL': 'T2', 'ICN:AF': 'T2', 'ICN:KL': 'T2',
  'ICN:OZ': 'T1', 'ICN:JL': 'T1', 'ICN:NH': 'T1', 'ICN:SQ': 'T1',
  'ICN:TG': 'T1', 'ICN:CX': 'T1', 'ICN:UA': 'T1', 'ICN:AA': 'T1',
  'ICN:LJ': 'T1', 'ICN:7C': 'T1', 'ICN:TW': 'T1', 'ICN:BX': 'T1',
  // 桃園 (TPE)
  'TPE:JL': 'T2', 'TPE:NH': 'T1', 'TPE:SQ': 'T2', 'TPE:KE': 'T1',
  'TPE:EK': 'T2', 'TPE:TK': 'T1', 'TPE:MM': 'T1', 'TPE:GK': 'T1',
  // バンコク スワンナプーム (BKK)
  'BKK:TG': '主要T', 'BKK:JL': '主要T', 'BKK:NH': '主要T', 'BKK:SQ': '主要T',
  'BKK:EK': '主要T', 'BKK:QR': '主要T', 'BKK:CX': '主要T',
  // シンガポール チャンギ (SIN)
  'SIN:SQ': 'T3', 'SIN:JL': 'T1', 'SIN:NH': 'T1', 'SIN:KE': 'T2',
  'SIN:CX': 'T4', 'SIN:EK': 'T1', 'SIN:QR': 'T1', 'SIN:TR': 'T1',
  // ロンドン ヒースロー (LHR)
  'LHR:BA': 'T5', 'LHR:JL': 'T3', 'LHR:NH': 'T2', 'LHR:UA': 'T2',
  'LHR:LH': 'T2', 'LHR:SQ': 'T2', 'LHR:AA': 'T3', 'LHR:QF': 'T3',
  'LHR:CX': 'T3', 'LHR:EK': 'T3', 'LHR:TK': 'T2', 'LHR:DL': 'T3',
  // パリ CDG (CDG)
  'CDG:AF': 'T2', 'CDG:JL': 'T2', 'CDG:DL': 'T2', 'CDG:KE': 'T2',
  'CDG:NH': 'T1', 'CDG:LH': 'T1', 'CDG:UA': 'T1', 'CDG:SQ': 'T1',
  'CDG:BA': 'T2', 'CDG:EK': 'T2', 'CDG:QR': 'T1', 'CDG:TK': 'T1',
  // フランクフルト (FRA)
  'FRA:LH': 'T1', 'FRA:NH': 'T1', 'FRA:JL': 'T2', 'FRA:SQ': 'T2',
  'FRA:UA': 'T1', 'FRA:AA': 'T2', 'FRA:DL': 'T1', 'FRA:BA': 'T1',
  'FRA:EK': 'T2', 'FRA:TK': 'T1', 'FRA:KE': 'T2', 'FRA:CX': 'T2',
  // JFK (JFK)
  'JFK:JL': 'T1', 'JFK:DL': 'T4', 'JFK:AA': 'T8', 'JFK:BA': 'T7',
  'JFK:EK': 'T4', 'JFK:KE': 'T1', 'JFK:QR': 'T8', 'JFK:TK': 'T1',
  'JFK:UA': 'T7', 'JFK:SQ': 'T4',
  // LAX (LAX)
  'LAX:JL': 'TBIT', 'LAX:NH': 'TBIT', 'LAX:SQ': 'TBIT', 'LAX:KE': 'TBIT',
  'LAX:UA': 'T7/8', 'LAX:DL': 'T2/3', 'LAX:AA': 'T4/5', 'LAX:BA': 'TBIT',
  'LAX:EK': 'TBIT', 'LAX:QF': 'TBIT', 'LAX:CX': 'TBIT', 'LAX:TK': 'TBIT',
  // ドバイ (DXB)
  'DXB:EK': 'T3', 'DXB:QR': 'T1', 'DXB:JL': 'T1', 'DXB:NH': 'T1',
  'DXB:BA': 'T1', 'DXB:LH': 'T1', 'DXB:SQ': 'T1', 'DXB:TG': 'T1',
  // 香港 (HKG)
  'HKG:CX': 'T1', 'HKG:JL': 'T1', 'HKG:NH': 'T1', 'HKG:BA': 'T1',
  'HKG:EK': 'T1', 'HKG:SQ': 'T1', 'HKG:AA': 'T1', 'HKG:UA': 'T1',
};

// 空港公式マップURL
export const AIRPORT_MAP_URLS: Record<string, { name: string; url: string }> = {
  NRT: { name: '成田空港', url: 'https://www.narita-airport.jp/jp/map/' },
  HND: { name: '羽田空港', url: 'https://tokyo-haneda.com/access/floormap/index.html' },
  KIX: { name: '関西国際空港', url: 'https://www.kansai-airport.or.jp/map' },
  NGO: { name: '中部国際空港', url: 'https://www.centrair.jp/airport/floor-map/' },
  FUK: { name: '福岡空港', url: 'https://www.fukuoka-airport.jp/flight/international/floor.html' },
  CTS: { name: '新千歳空港', url: 'https://www.new-chitose-airport.jp/ja/airport/floor/' },
  OKA: { name: '那覇空港', url: 'https://www.naha-airport.co.jp/terminal/' },
  ITM: { name: '伊丹空港', url: 'https://www.osaka-airport.co.jp/map' },
  ICN: { name: '仁川空港', url: 'https://www.airport.kr/ap/en/map/mapInfo.do' },
  GMP: { name: '金浦空港', url: 'https://www.airport.co.kr/gimpo/cms/frCon/index.do?MENU_ID=1250' },
  TPE: { name: '桃園空港', url: 'https://www.taoyuan-airport.com/main_en/facilities-map.aspx' },
  HKG: { name: '香港国際空港', url: 'https://www.hongkongairport.com/en/map/terminal/' },
  SIN: { name: 'チャンギ空港', url: 'https://www.changiairport.com/en/airport-guide/terminal-guides.html' },
  BKK: { name: 'スワンナプーム空港', url: 'https://www.suvarnabhumiairport.com/en/passenger-guide' },
  MNL: { name: 'ニノイ・アキノ空港', url: 'https://www.miaa.gov.ph/miaa/terminal' },
  CGK: { name: 'スカルノ・ハッタ空港', url: 'https://angkasapura2.co.id/en/business_area/our-airport/5' },
  DXB: { name: 'ドバイ空港', url: 'https://www.dubaiairports.ae/at-the-airport/terminal-maps' },
  DOH: { name: 'ハマド空港', url: 'https://dohahamadairport.com/airport-guide/at-the-airport/terminal-map' },
  IST: { name: 'イスタンブール空港', url: 'https://www.istairport.com/en/passenger/airport-guide/maps' },
  LHR: { name: 'ヒースロー空港', url: 'https://www.heathrow.com/at-the-airport/terminal-facilities' },
  CDG: { name: 'シャルル・ド・ゴール空港', url: 'https://www.parisaeroport.fr/en/passengers/access/paris-charles-de-gaulle/terminal-maps' },
  FRA: { name: 'フランクフルト空港', url: 'https://www.frankfurt-airport.com/en/airport-guide/terminal-maps.html' },
  MUC: { name: 'ミュンヘン空港', url: 'https://www.munich-airport.de/terminal-overview-260322' },
  AMS: { name: 'スキポール空港', url: 'https://www.schiphol.nl/en/at-schiphol/map' },
  FCO: { name: 'フィウミチーノ空港', url: 'https://www.adr.it/web/aeroporti-di-roma-en/pax-fco-airport-maps' },
  BCN: { name: 'バルセロナ空港', url: 'https://www.aena.es/en/barcelona-airport/airport-map.html' },
  JFK: { name: 'JFK空港', url: 'https://www.jfkairport.com/at-airport/airport-maps' },
  LAX: { name: 'ロサンゼルス空港', url: 'https://www.flylax.com/terminals-background' },
  SFO: { name: 'サンフランシスコ空港', url: 'https://www.flysfo.com/passengers/maps' },
  ORD: { name: 'シカゴ空港', url: 'https://www.flychicago.com/ohare/map/pages/default.aspx' },
  YVR: { name: 'バンクーバー空港', url: 'https://www.yvr.ca/en/passengers/navigate-yvr/terminal-maps' },
  SYD: { name: 'シドニー空港', url: 'https://www.sydneyairport.com.au/airport-guide/terminal-maps' },
};

// ターミナル検索ヘルパー
export function getTerminal(airportCode: string, airlineCode: string): string | null {
  return AIRPORT_TERMINALS[`${airportCode}:${airlineCode}`] || null;
}

// 航空会社別チェックインルール（国際線） open=オンラインチェックイン開始(分前), close=カウンター締切(分前)
export const AIRLINE_CHECKIN_RULES: Record<string, { name: string; open: number; close: number }> = {
  // ===== 日本の航空会社 =====
  'JL': { name: 'JAL', open: 1440, close: 60 },
  'NH': { name: 'ANA', open: 1440, close: 60 },
  'MM': { name: 'ピーチ', open: 1440, close: 50 },
  'GK': { name: 'ジェットスター・ジャパン', open: 1440, close: 45 },
  'ZG': { name: 'ZIPAIR', open: 1440, close: 60 },
  'IJ': { name: 'スプリング・ジャパン', open: 1440, close: 45 },
  '7G': { name: 'スターフライヤー', open: 1440, close: 60 },
  'BC': { name: 'スカイマーク', open: 1440, close: 20 },
  // ===== 韓国の航空会社 =====
  'KE': { name: '大韓航空', open: 1440, close: 60 },
  'OZ': { name: 'アシアナ航空', open: 1440, close: 60 },
  'LJ': { name: 'ジンエアー', open: 1440, close: 40 },
  'TW': { name: 'ティーウェイ航空', open: 1440, close: 50 },
  '7C': { name: 'チェジュ航空', open: 1440, close: 50 },
  'BX': { name: 'エアプサン', open: 1440, close: 50 },
  'ZE': { name: 'イースター航空', open: 1440, close: 50 },
  'RS': { name: 'エアソウル', open: 1440, close: 50 },
  // ===== 中国の航空会社 =====
  'CA': { name: '中国国際航空', open: 2160, close: 60 },
  'MU': { name: '中国東方航空', open: 2880, close: 60 },
  'CZ': { name: '中国南方航空', open: 2160, close: 60 },
  '9C': { name: '春秋航空', open: 1440, close: 60 },
  'HO': { name: '吉祥航空', open: 1440, close: 60 },
  // ===== 東南アジアの航空会社 =====
  'SQ': { name: 'シンガポール航空', open: 2880, close: 70 },
  'TG': { name: 'タイ国際航空', open: 1440, close: 60 },
  'VN': { name: 'ベトナム航空', open: 2400, close: 60 },
  'CX': { name: 'キャセイパシフィック', open: 2880, close: 60 },
  'PR': { name: 'フィリピン航空', open: 1440, close: 60 },
  'GA': { name: 'ガルーダ・インドネシア', open: 1440, close: 120 },
  'AK': { name: 'エアアジア', open: 1440, close: 60 },
  'D7': { name: 'エアアジアX', open: 1440, close: 60 },
  '5J': { name: 'セブパシフィック', open: 1440, close: 60 },
  'PG': { name: 'バンコクエアウェイズ', open: 1440, close: 60 },
  'TR': { name: 'スクート', open: 240, close: 65 },
  'BI': { name: 'ロイヤルブルネイ', open: 1440, close: 60 },
  'MH': { name: 'マレーシア航空', open: 2880, close: 60 },
  // ===== 中東の航空会社 =====
  'EK': { name: 'エミレーツ', open: 2880, close: 90 },
  'QR': { name: 'カタール航空', open: 2880, close: 60 },
  'EY': { name: 'エティハド航空', open: 2880, close: 60 },
  'TK': { name: 'ターキッシュエアラインズ', open: 1440, close: 60 },
  'WY': { name: 'オマーン・エア', open: 2880, close: 60 },
  'SV': { name: 'サウディア', open: 1440, close: 60 },
  // ===== ヨーロッパの航空会社 =====
  'LH': { name: 'ルフトハンザ', open: 1800, close: 60 },
  'BA': { name: 'ブリティッシュ・エアウェイズ', open: 1440, close: 60 },
  'AF': { name: 'エールフランス', open: 1800, close: 60 },
  'KL': { name: 'KLM', open: 1800, close: 60 },
  'AY': { name: 'フィンエアー', open: 2160, close: 60 },
  'LX': { name: 'スイスインターナショナル', open: 1440, close: 60 },
  'OS': { name: 'オーストリア航空', open: 2820, close: 60 },
  'SK': { name: 'スカンジナビア航空', open: 1800, close: 60 },
  'LO': { name: 'LOTポーランド', open: 2160, close: 45 },
  'AZ': { name: 'ITA エアウェイズ', open: 1440, close: 60 },
  'IB': { name: 'イベリア航空', open: 1440, close: 60 },
  'TP': { name: 'TAPポルトガル', open: 2160, close: 60 },
  'FR': { name: 'ライアンエアー', open: 2880, close: 40 },
  'U2': { name: 'イージージェット', open: 1800, close: 40 },
  // ===== 北米の航空会社 =====
  'UA': { name: 'ユナイテッド航空', open: 1440, close: 60 },
  'AA': { name: 'アメリカン航空', open: 1440, close: 60 },
  'DL': { name: 'デルタ航空', open: 1440, close: 60 },
  'AC': { name: 'エア・カナダ', open: 1440, close: 60 },
  'HA': { name: 'ハワイアン航空', open: 1440, close: 60 },
  'WN': { name: 'サウスウエスト航空', open: 1440, close: 45 },
  // ===== オセアニアの航空会社 =====
  'QF': { name: 'カンタス航空', open: 1440, close: 90 },
  'JQ': { name: 'ジェットスター', open: 1440, close: 60 },
  'NZ': { name: 'ニュージーランド航空', open: 1440, close: 60 },
  'FJ': { name: 'フィジーエアウェイズ', open: 1440, close: 60 },
};

// 渡航注意情報データベース（日本国籍者向け）
export interface RequiredApp {
  name: string;          // アプリ/サービス名
  purpose: string;       // 用途
  timing: string;        // いつまでに
  url: string;           // 公式URL
  isApp: boolean;        // モバイルアプリか（false=ウェブサイト）
}

export interface TravelAdvisory {
  visaFree: boolean;
  stayDays: number;
  singleParentRisk: 'HIGH' | 'MODERATE' | 'LOW';
  singleParentDocs: string[];
  soloFemaleSafety: 'SAFE' | 'MODERATE' | 'CAUTION';
  alerts: string[];
  tips: string[];
  requiredApps?: RequiredApp[];
  plugType?: string;
  voltage?: string;
}

export const TRAVEL_ADVISORIES: Record<string, TravelAdvisory> = {
  US: {
    visaFree: true, stayDays: 90,
    singleParentRisk: 'HIGH',
    singleParentDocs: ['同意書（英文・公証済）', '出生証明書', '親権証明書（該当する場合）'],
    soloFemaleSafety: 'MODERATE',
    alerts: ['ESTA必須（渡航72時間前まで）', 'CBPは片親+子供の入国に厳しい審査あり'],
    tips: ['同行しない親の同意書を必ず英文で用意', '姓が異なる場合は親子関係証明が必要', 'ハーグ条約加盟国 - 親権書類を推奨'],
    plugType: 'A, B',
    voltage: '120V / 60Hz',
    requiredApps: [
      { name: 'ESTA', purpose: '電子渡航認証（ビザ免除プログラム）', timing: '渡航72時間前まで', url: 'https://esta.cbp.dhs.gov/', isApp: false },
      { name: 'CBP One', purpose: '税関申告（到着前にオンライン申告可能）', timing: '到着前', url: 'https://www.cbp.gov/about/mobile-apps-directory/cbpone', isApp: true },
    ],
  },
  CA: {
    visaFree: true, stayDays: 90,
    singleParentRisk: 'HIGH',
    singleParentDocs: ['同意書（英文・公証済・必須）', '出生証明書', '親権証明書', '後見人指定書'],
    soloFemaleSafety: 'SAFE',
    alerts: ['片親+子供の入国審査が北米で最も厳しい'],
    tips: ['カナダ政府指定フォーマットの同意書推奨', 'ハーグ条約加盟国'],
    plugType: 'A, B',
    voltage: '120V / 60Hz',
    requiredApps: [
      { name: 'eTA (Electronic Travel Authorization)', purpose: '電子渡航認証', timing: '渡航前', url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/eta.html', isApp: false },
      { name: 'ArriveCAN', purpose: '入国情報の事前登録', timing: '到着72時間前', url: 'https://www.canada.ca/en/public-health/services/diseases/coronavirus-disease-covid-19/arrivecan.html', isApp: true },
    ],
  },
  GB: {
    visaFree: true, stayDays: 90,
    singleParentRisk: 'MODERATE',
    singleParentDocs: ['出生証明書', '親権証明書（該当する場合）', '同意書推奨'],
    soloFemaleSafety: 'SAFE',
    alerts: ['2026年よりETA（電子渡航認証）が必要'],
    tips: ['片親旅行でも書類があればスムーズ'],
    plugType: 'BF (G)',
    voltage: '230V / 50Hz',
    requiredApps: [
      { name: 'UK ETA', purpose: '英国電子渡航認証（2025年4月〜日本国籍者も必要）', timing: '渡航前', url: 'https://www.gov.uk/guidance/apply-for-an-electronic-travel-authorisation-eta', isApp: true },
    ],
  },
  DE: {
    visaFree: true, stayDays: 90,
    singleParentRisk: 'LOW',
    singleParentDocs: ['同意書（英文）推奨', '出生証明書'],
    soloFemaleSafety: 'SAFE',
    alerts: ['ETIAS 2026年後半より義務化予定', 'シェンゲン圏90日ルール（180日中90日）'],
    tips: ['パスポート残存期間3ヶ月以上必要', 'ハーグ条約加盟国'],
    plugType: 'C, SE (F)',
    voltage: '230V / 50Hz',
    requiredApps: [
      { name: 'ETIAS', purpose: 'EU電子渡航情報認証システム（2026年後半〜義務化予定）', timing: '渡航前（義務化後）', url: 'https://travel-europe.europa.eu/etias_en', isApp: false },
    ],
  },
  FR: {
    visaFree: true, stayDays: 90,
    singleParentRisk: 'LOW',
    singleParentDocs: ['同意書（英文/仏文）推奨', '出生証明書'],
    soloFemaleSafety: 'MODERATE',
    alerts: ['ETIAS 2026年後半より義務化予定', 'シェンゲン圏90日ルール'],
    tips: ['パリ市内はスリに注意', 'ハーグ条約加盟国'],
    plugType: 'C, SE (E)',
    voltage: '230V / 50Hz',
    requiredApps: [
      { name: 'ETIAS', purpose: 'EU電子渡航情報認証システム（2026年後半〜義務化予定）', timing: '渡航前（義務化後）', url: 'https://travel-europe.europa.eu/etias_en', isApp: false },
    ],
  },
  IT: {
    visaFree: true, stayDays: 90,
    singleParentRisk: 'LOW',
    singleParentDocs: ['同意書推奨', '出生証明書'],
    soloFemaleSafety: 'MODERATE',
    alerts: ['ETIAS 2026年後半より義務化予定', 'シェンゲン圏90日ルール'],
    tips: ['観光地でのスリ・ぼったくりに注意'],
    plugType: 'C, L',
    voltage: '230V / 50Hz',
    requiredApps: [
      { name: 'ETIAS', purpose: 'EU電子渡航情報認証システム（2026年後半〜義務化予定）', timing: '渡航前（義務化後）', url: 'https://travel-europe.europa.eu/etias_en', isApp: false },
    ],
  },
  ES: {
    visaFree: true, stayDays: 90,
    singleParentRisk: 'LOW',
    singleParentDocs: ['同意書推奨', '出生証明書'],
    soloFemaleSafety: 'MODERATE',
    alerts: ['ETIAS 2026年後半より義務化予定', 'シェンゲン圏90日ルール'],
    tips: ['バルセロナなど観光地でのスリに注意'],
    plugType: 'C, SE (F)',
    voltage: '230V / 50Hz',
    requiredApps: [
      { name: 'ETIAS', purpose: 'EU電子渡航情報認証システム（2026年後半〜義務化予定）', timing: '渡航前（義務化後）', url: 'https://travel-europe.europa.eu/etias_en', isApp: false },
    ],
  },
  KR: {
    visaFree: true, stayDays: 90,
    singleParentRisk: 'LOW',
    singleParentDocs: ['特別な書類不要（推奨：戸籍謄本の英訳）'],
    soloFemaleSafety: 'SAFE',
    alerts: ['K-ETA 免除中（変更の可能性あり）'],
    tips: ['片親+子供でも特に問題なし'],
    plugType: 'C, SE (F)',
    voltage: '220V / 60Hz',
    requiredApps: [
      { name: 'K-ETA', purpose: '韓国電子渡航認証（現在日本国籍者は免除中だが再開の可能性あり）', timing: '渡航前（必要時）', url: 'https://www.k-eta.go.kr/', isApp: false },
      { name: 'Q-CODE', purpose: '韓国検疫情報事前入力システム', timing: '到着前', url: 'https://cov19ent.kdca.go.kr/', isApp: false },
    ],
  },
  SG: {
    visaFree: true, stayDays: 90,
    singleParentRisk: 'LOW',
    singleParentDocs: ['SGアライバルカード必須', '同意書は不要だが推奨'],
    soloFemaleSafety: 'SAFE',
    alerts: ['SGアライバルカード（電子）が必須'],
    tips: ['世界でもトップクラスの治安'],
    plugType: 'BF (G)',
    voltage: '230V / 50Hz',
    requiredApps: [
      { name: 'SG Arrival Card', purpose: 'シンガポール入国カード（電子版・到着3日前から提出可能）', timing: '到着3日前〜', url: 'https://eservices.ica.gov.sg/sgarrivalcard/', isApp: true },
    ],
  },
  TH: {
    visaFree: true, stayDays: 60,
    singleParentRisk: 'LOW',
    singleParentDocs: ['特別な書類不要'],
    soloFemaleSafety: 'MODERATE',
    alerts: ['2025年11月〜ビザなし入国は年2回まで', '30日延長可能（1,900バーツ）'],
    tips: ['頻繁な入国者への審査が強化', '最大滞在90日（延長含む）'],
    plugType: 'A, B, C',
    voltage: '220V / 50Hz',
    requiredApps: [
      { name: 'Thailand Digital Arrival Card', purpose: 'タイ入国カード（電子版・TM6廃止に伴う新システム）', timing: '到着前', url: 'https://tdac.immigration.go.th/', isApp: false },
    ],
  },
  TW: {
    visaFree: true, stayDays: 90,
    singleParentRisk: 'LOW',
    singleParentDocs: ['特別な書類不要'],
    soloFemaleSafety: 'SAFE',
    alerts: [],
    tips: ['治安が良く女性の一人旅も安心'],
    plugType: 'A, B',
    voltage: '110V / 60Hz',
    requiredApps: [
      { name: '入境検疫システム', purpose: '台湾入境検疫オンライン申告', timing: '到着前', url: 'https://hdhq.mohw.gov.tw/', isApp: false },
    ],
  },
  HK: {
    visaFree: true, stayDays: 90,
    singleParentRisk: 'LOW',
    singleParentDocs: ['特別な書類不要'],
    soloFemaleSafety: 'SAFE',
    alerts: [],
    tips: ['治安は概ね良好'],
    plugType: 'BF (G)',
    voltage: '220V / 50Hz',
  },
  AU: {
    visaFree: true, stayDays: 90,
    singleParentRisk: 'MODERATE',
    singleParentDocs: ['同意書（英文）推奨', '出生証明書', '親権証明書'],
    soloFemaleSafety: 'SAFE',
    alerts: ['ETA（電子渡航許可）が必要'],
    tips: ['ハーグ条約加盟国 - 片親旅行は書類準備推奨'],
    plugType: 'I (O)',
    voltage: '230V / 50Hz',
    requiredApps: [
      { name: 'Australian ETA', purpose: 'オーストラリア電子渡航許可（ETA subclass 601）', timing: '渡航前', url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/electronic-travel-authority-601', isApp: true },
      { name: 'Australian Travel Declaration', purpose: '入国申告（Digital Passenger Declaration）', timing: '到着前', url: 'https://www.abf.gov.au/entering-and-leaving-australia/crossing-the-border/passenger-cards', isApp: false },
    ],
  },
  VN: {
    visaFree: true, stayDays: 45,
    singleParentRisk: 'MODERATE',
    singleParentDocs: ['同意書推奨', '出生証明書'],
    soloFemaleSafety: 'MODERATE',
    alerts: ['ビザなし45日間'],
    tips: ['タクシーぼったくりに注意、Grabアプリ推奨'],
    plugType: 'A, C',
    voltage: '220V / 50Hz',
    requiredApps: [
      { name: 'e-Visa Vietnam', purpose: 'ベトナム電子ビザ（45日超の滞在時）', timing: '渡航前（45日超の場合）', url: 'https://evisa.xuatnhapcanh.gov.vn/', isApp: false },
    ],
  },
  PH: {
    visaFree: true, stayDays: 30,
    singleParentRisk: 'HIGH',
    singleParentDocs: ['WEG（入国免除書類）が15歳未満の子供に必須', '同意書（公証済）', '出生証明書'],
    soloFemaleSafety: 'CAUTION',
    alerts: ['15歳未満の子供はWEG申請が必要（フィリピン大使館）', 'ビザなし30日間'],
    tips: ['WEGの事前申請を忘れずに', '一部地域に渡航中止勧告あり'],
    plugType: 'A, B, C',
    voltage: '220V / 60Hz',
    requiredApps: [
      { name: 'eTravel', purpose: 'フィリピン電子入国カード（旧One Health Pass）', timing: '到着72時間前〜', url: 'https://etravel.gov.ph/', isApp: false },
    ],
  },
  // ===== 大阪万博2025 追加国 =====
  ID: {
    visaFree: true, stayDays: 30,
    singleParentRisk: 'LOW',
    singleParentDocs: ['特別な書類不要'],
    soloFemaleSafety: 'MODERATE',
    alerts: ['VOA（到着ビザ）50万ルピア（約¥4,500）が必要', '30日延長可能'],
    tips: ['バリ島は比較的安全', 'ジャカルタは交通渋滞に注意', 'Grabアプリ推奨'],
    plugType: 'C, SE (F)',
    voltage: '230V / 50Hz',
    requiredApps: [
      { name: 'All Indonesia (e-CD)', purpose: 'インドネシア電子税関申告書（入国時の税関申告をアプリで事前提出）', timing: '到着前', url: 'https://ecd.beacukai.go.id/', isApp: true },
    ],
  },
  TR: {
    visaFree: true, stayDays: 90,
    singleParentRisk: 'LOW',
    singleParentDocs: ['同意書推奨'],
    soloFemaleSafety: 'MODERATE',
    alerts: ['e-Visa取得推奨（事前にオンライン申請）', '東部国境地域は渡航中止勧告あり'],
    tips: ['イスタンブール旧市街はスリに注意', '地方部は保守的な服装推奨'],
    plugType: 'C, SE (F)',
    voltage: '230V / 50Hz',
    requiredApps: [
      { name: 'Turkey e-Visa', purpose: 'トルコ電子ビザ（オンライン申請）', timing: '渡航前', url: 'https://www.evisa.gov.tr/', isApp: false },
    ],
  },
  AE: {
    visaFree: true, stayDays: 30,
    singleParentRisk: 'LOW',
    singleParentDocs: ['特別な書類不要（推奨：出生証明書英訳）'],
    soloFemaleSafety: 'SAFE',
    alerts: ['ビザなし30日間', 'ラマダン期間中は公共の場での飲食に注意'],
    tips: ['ドバイ・アブダビは治安良好', '服装は肌の露出を控えめに'],
    plugType: 'BF (G), C',
    voltage: '220V / 50Hz',
  },
  EG: {
    visaFree: false, stayDays: 30,
    singleParentRisk: 'MODERATE',
    singleParentDocs: ['同意書推奨', '出生証明書'],
    soloFemaleSafety: 'CAUTION',
    alerts: ['e-Visa事前取得が必要（$25）', 'シナイ半島北部は渡航中止勧告'],
    tips: ['カイロ・ルクソールは観光客狙いのぼったくりに注意', '女性は肌の露出を控えめに'],
    plugType: 'C',
    voltage: '220V / 50Hz',
    requiredApps: [
      { name: 'Egypt e-Visa', purpose: 'エジプト電子ビザ', timing: '渡航前', url: 'https://www.visa2egypt.gov.eg/', isApp: false },
    ],
  },
  IN: {
    visaFree: false, stayDays: 30,
    singleParentRisk: 'LOW',
    singleParentDocs: ['特別な書類不要'],
    soloFemaleSafety: 'CAUTION',
    alerts: ['e-Visa事前取得が必要', '到着後30日間有効'],
    tips: ['生水・生野菜に注意', '女性の一人旅は都市部でも十分注意', 'Uberまたはolaアプリ推奨'],
    plugType: 'C, D, M',
    voltage: '230V / 50Hz',
    requiredApps: [
      { name: 'India e-Visa', purpose: 'インド電子ビザ（e-Tourist Visa）', timing: '渡航4日前まで', url: 'https://indianvisaonline.gov.in/', isApp: false },
      { name: 'Air Suvidha', purpose: 'インド入国健康申告', timing: '到着前', url: 'https://www.newdelhiairport.in/', isApp: false },
    ],
  },
  MY: {
    visaFree: true, stayDays: 90,
    singleParentRisk: 'LOW',
    singleParentDocs: ['特別な書類不要'],
    soloFemaleSafety: 'SAFE',
    alerts: ['ビザなし90日間'],
    tips: ['クアラルンプールは治安良好', 'Grabアプリ推奨'],
    plugType: 'BF (G)',
    voltage: '240V / 50Hz',
    requiredApps: [
      { name: 'MDAC (Malaysia Digital Arrival Card)', purpose: 'マレーシア電子入国カード', timing: '到着3日前〜', url: 'https://imigresen-online.imi.gov.my/mdac/main', isApp: false },
    ],
  },
  KH: {
    visaFree: false, stayDays: 30,
    singleParentRisk: 'LOW',
    singleParentDocs: ['特別な書類不要'],
    soloFemaleSafety: 'MODERATE',
    alerts: ['e-Visa事前取得（$36）またはVOA（$30）が必要'],
    tips: ['シェムリアップ（アンコールワット）は比較的安全', 'トゥクトゥク料金は事前交渉'],
    plugType: 'A, C',
    voltage: '230V / 50Hz',
    requiredApps: [
      { name: 'Cambodia e-Visa', purpose: 'カンボジア電子ビザ', timing: '渡航前', url: 'https://www.evisa.gov.kh/', isApp: false },
    ],
  },
  LA: {
    visaFree: true, stayDays: 15,
    singleParentRisk: 'LOW',
    singleParentDocs: ['特別な書類不要'],
    soloFemaleSafety: 'MODERATE',
    alerts: ['ビザなし15日間', '15日超はVOA取得（$40）'],
    tips: ['ビエンチャン・ルアンパバーンは穏やかで安全'],
    plugType: 'A, C',
    voltage: '220V / 50Hz',
  },
  MN: {
    visaFree: true, stayDays: 30,
    singleParentRisk: 'LOW',
    singleParentDocs: ['特別な書類不要'],
    soloFemaleSafety: 'MODERATE',
    alerts: ['ビザなし30日間'],
    tips: ['ウランバートル市内はスリに注意', '地方はインフラが未整備'],
    plugType: 'C, SE (F)',
    voltage: '230V / 50Hz',
  },
  LK: {
    visaFree: false, stayDays: 30,
    singleParentRisk: 'LOW',
    singleParentDocs: ['特別な書類不要'],
    soloFemaleSafety: 'MODERATE',
    alerts: ['ETA（電子渡航認証）事前取得が必要（$50）'],
    tips: ['南西海岸のリゾート地域は安全', 'トゥクトゥクは事前交渉'],
    plugType: 'D, G',
    voltage: '230V / 50Hz',
    requiredApps: [
      { name: 'Sri Lanka ETA', purpose: 'スリランカ電子渡航認証', timing: '渡航前', url: 'https://www.eta.gov.lk/', isApp: false },
    ],
  },
  MV: {
    visaFree: true, stayDays: 30,
    singleParentRisk: 'LOW',
    singleParentDocs: ['特別な書類不要'],
    soloFemaleSafety: 'SAFE',
    alerts: ['到着時に無料ビザ発給（30日間）', 'リゾート島とローカル島で規則が異なる'],
    tips: ['リゾート島は非常に安全', 'ローカル島ではイスラム法に配慮した服装を'],
    plugType: 'BF (G)',
    voltage: '230V / 50Hz',
  },
  BR: {
    visaFree: false, stayDays: 90,
    singleParentRisk: 'HIGH',
    singleParentDocs: ['同意書（公証済・ポルトガル語翻訳）必須', '出生証明書', '親権証明書'],
    soloFemaleSafety: 'CAUTION',
    alerts: ['e-Visa事前取得が必要', '90日間有効'],
    tips: ['リオ・サンパウロは治安に十分注意', '高額品の携帯を避ける', 'ハーグ条約加盟国'],
    plugType: 'C, N',
    voltage: '127-220V / 60Hz',
    requiredApps: [
      { name: 'Brazil e-Visa', purpose: 'ブラジル電子ビザ', timing: '渡航前', url: 'https://portal.mre.gov.br/', isApp: false },
    ],
  },
  MX: {
    visaFree: true, stayDays: 180,
    singleParentRisk: 'MODERATE',
    singleParentDocs: ['同意書（スペイン語・公証済）推奨', '出生証明書'],
    soloFemaleSafety: 'MODERATE',
    alerts: ['ビザなし180日間', '一部の州に渡航中止勧告あり'],
    tips: ['カンクン・メキシコシティ観光地は比較的安全', '夜間の外出は避ける'],
    plugType: 'A, B',
    voltage: '127V / 60Hz',
  },
  PE: {
    visaFree: true, stayDays: 183,
    singleParentRisk: 'MODERATE',
    singleParentDocs: ['同意書（スペイン語）推奨'],
    soloFemaleSafety: 'MODERATE',
    alerts: ['ビザなし183日間'],
    tips: ['マチュピチュ地域は安全', 'リマ市内は地区により治安が異なる'],
    plugType: 'A, B, C',
    voltage: '220V / 60Hz',
  },
  AT: {
    visaFree: true, stayDays: 90,
    singleParentRisk: 'LOW',
    singleParentDocs: ['同意書推奨'],
    soloFemaleSafety: 'SAFE',
    alerts: ['ETIAS 2026年後半より義務化予定', 'シェンゲン圏90日ルール'],
    tips: ['ウィーンは世界でもトップクラスの治安'],
    plugType: 'C, SE (F)',
    voltage: '230V / 50Hz',
    requiredApps: [
      { name: 'ETIAS', purpose: 'EU電子渡航情報認証システム（2026年後半〜義務化予定）', timing: '渡航前（義務化後）', url: 'https://travel-europe.europa.eu/etias_en', isApp: false },
    ],
  },
  BE: {
    visaFree: true, stayDays: 90,
    singleParentRisk: 'LOW',
    singleParentDocs: ['同意書推奨'],
    soloFemaleSafety: 'MODERATE',
    alerts: ['ETIAS 2026年後半より義務化予定', 'シェンゲン圏90日ルール'],
    tips: ['ブリュッセル中心部は夜間注意', '地方都市は安全'],
    plugType: 'C, SE (E)',
    voltage: '230V / 50Hz',
    requiredApps: [
      { name: 'ETIAS', purpose: 'EU電子渡航情報認証システム（2026年後半〜義務化予定）', timing: '渡航前（義務化後）', url: 'https://travel-europe.europa.eu/etias_en', isApp: false },
    ],
  },
  DK: {
    visaFree: true, stayDays: 90,
    singleParentRisk: 'LOW',
    singleParentDocs: ['同意書推奨'],
    soloFemaleSafety: 'SAFE',
    alerts: ['ETIAS 2026年後半より義務化予定', 'シェンゲン圏90日ルール'],
    tips: ['コペンハーゲンは安全だが自転車に注意'],
    plugType: 'C, SE (E)',
    voltage: '230V / 50Hz',
    requiredApps: [
      { name: 'ETIAS', purpose: 'EU電子渡航情報認証システム（2026年後半〜義務化予定）', timing: '渡航前（義務化後）', url: 'https://travel-europe.europa.eu/etias_en', isApp: false },
    ],
  },
  HU: {
    visaFree: true, stayDays: 90,
    singleParentRisk: 'LOW',
    singleParentDocs: ['同意書推奨'],
    soloFemaleSafety: 'SAFE',
    alerts: ['ETIAS 2026年後半より義務化予定', 'シェンゲン圏90日ルール'],
    tips: ['ブダペストは観光地としてコスパが良い'],
    plugType: 'C, SE (F)',
    voltage: '230V / 50Hz',
    requiredApps: [
      { name: 'ETIAS', purpose: 'EU電子渡航情報認証システム（2026年後半〜義務化予定）', timing: '渡航前（義務化後）', url: 'https://travel-europe.europa.eu/etias_en', isApp: false },
    ],
  },
  PL: {
    visaFree: true, stayDays: 90,
    singleParentRisk: 'LOW',
    singleParentDocs: ['同意書推奨'],
    soloFemaleSafety: 'SAFE',
    alerts: ['ETIAS 2026年後半より義務化予定', 'シェンゲン圏90日ルール'],
    tips: ['ワルシャワ・クラクフは安全で物価も手頃'],
    plugType: 'C, SE (E)',
    voltage: '230V / 50Hz',
    requiredApps: [
      { name: 'ETIAS', purpose: 'EU電子渡航情報認証システム（2026年後半〜義務化予定）', timing: '渡航前（義務化後）', url: 'https://travel-europe.europa.eu/etias_en', isApp: false },
    ],
  },
  IS: {
    visaFree: true, stayDays: 90,
    singleParentRisk: 'LOW',
    singleParentDocs: ['同意書推奨'],
    soloFemaleSafety: 'SAFE',
    alerts: ['ETIAS 2026年後半より義務化予定', 'シェンゲン圏90日ルール'],
    tips: ['世界で最も安全な国の一つ', '天候変化が激しいため防寒具必須'],
    plugType: 'C, SE (E)',
    voltage: '230V / 50Hz',
    requiredApps: [
      { name: 'ETIAS', purpose: 'EU電子渡航情報認証システム（2026年後半〜義務化予定）', timing: '渡航前（義務化後）', url: 'https://travel-europe.europa.eu/etias_en', isApp: false },
    ],
  },
  IE: {
    visaFree: true, stayDays: 90,
    singleParentRisk: 'LOW',
    singleParentDocs: ['同意書推奨'],
    soloFemaleSafety: 'SAFE',
    alerts: ['シェンゲン圏外だがビザなし90日間'],
    tips: ['ダブリンは概ね安全', '天候が変わりやすいので雨具必須'],
    plugType: 'BF (G)',
    voltage: '230V / 50Hz',
  },
  SA: {
    visaFree: false, stayDays: 90,
    singleParentRisk: 'MODERATE',
    singleParentDocs: ['同意書推奨'],
    soloFemaleSafety: 'MODERATE',
    alerts: ['e-Visa事前取得が必要', '2019年より観光ビザ解禁'],
    tips: ['服装はアバヤ不要だが肌の露出は控えめに', '礼拝時間は店舗が閉まる'],
    plugType: 'BF (G)',
    voltage: '220V / 60Hz',
    requiredApps: [
      { name: 'Saudi e-Visa', purpose: 'サウジアラビア電子ビザ', timing: '渡航前', url: 'https://visa.visitsaudi.com/', isApp: false },
    ],
  },
  QA: {
    visaFree: true, stayDays: 30,
    singleParentRisk: 'LOW',
    singleParentDocs: ['特別な書類不要'],
    soloFemaleSafety: 'SAFE',
    alerts: ['ビザなし30日間', 'Hayya Cardが不要に'],
    tips: ['ドーハは治安良好', '服装は控えめに'],
    plugType: 'BF (G)',
    voltage: '220V / 50Hz',
  },
  MA: {
    visaFree: true, stayDays: 90,
    singleParentRisk: 'LOW',
    singleParentDocs: ['特別な書類不要'],
    soloFemaleSafety: 'MODERATE',
    alerts: ['ビザなし90日間'],
    tips: ['マラケシュ旧市街はぼったくり・客引きに注意', '女性は控えめな服装推奨'],
    plugType: 'C, SE (E)',
    voltage: '230V / 50Hz',
  },
  NL: {
    visaFree: true, stayDays: 90,
    singleParentRisk: 'LOW',
    singleParentDocs: ['同意書推奨'],
    soloFemaleSafety: 'SAFE',
    alerts: ['ETIAS 2026年後半より義務化予定', 'シェンゲン圏90日ルール'],
    tips: ['アムステルダムは安全で観光資源も豊富'],
    plugType: 'C, SE (F)',
    voltage: '230V / 50Hz',
    requiredApps: [
      { name: 'ETIAS', purpose: 'EU電子渡航情報認証システム（2026年後半〜義務化予定）', timing: '渡航前（義務化後）', url: 'https://travel-europe.europa.eu/etias_en', isApp: false },
    ],
  },
  CH: {
    visaFree: true, stayDays: 90,
    singleParentRisk: 'LOW',
    singleParentDocs: ['同意書推奨'],
    soloFemaleSafety: 'SAFE',
    alerts: ['シェンゲン圏内だが非EU加盟国', '90日ルールはシェンゲン全体で適用'],
    tips: ['チューリッヒ・ベルン・ジュネーブは非常に安全'],
    plugType: 'C, J',
    voltage: '230V / 50Hz',
  },
};

// 大阪万博2025出展国を中心に網羅（カタカナ50音順）
export const COUNTRY_LIST = [
  // ア行
  { code: 'IS', name: 'アイスランド', flag: '🇮🇸' },
  { code: 'IE', name: 'アイルランド', flag: '🇮🇪' },
  { code: 'AZ', name: 'アゼルバイジャン', flag: '🇦🇿' },
  { code: 'AE', name: 'アラブ首長国連邦', flag: '🇦🇪' },
  { code: 'DZ', name: 'アルジェリア', flag: '🇩🇿' },
  { code: 'US', name: 'アメリカ', flag: '🇺🇸' },
  { code: 'AO', name: 'アンゴラ', flag: '🇦🇴' },
  { code: 'GB', name: 'イギリス', flag: '🇬🇧' },
  { code: 'IL', name: 'イスラエル', flag: '🇮🇱' },
  { code: 'IT', name: 'イタリア', flag: '🇮🇹' },
  { code: 'IQ', name: 'イラク', flag: '🇮🇶' },
  { code: 'IR', name: 'イラン', flag: '🇮🇷' },
  { code: 'IN', name: 'インド', flag: '🇮🇳' },
  { code: 'ID', name: 'インドネシア', flag: '🇮🇩' },
  { code: 'UG', name: 'ウガンダ', flag: '🇺🇬' },
  { code: 'UA', name: 'ウクライナ', flag: '🇺🇦' },
  { code: 'UZ', name: 'ウズベキスタン', flag: '🇺🇿' },
  { code: 'UY', name: 'ウルグアイ', flag: '🇺🇾' },
  { code: 'EG', name: 'エジプト', flag: '🇪🇬' },
  { code: 'ET', name: 'エチオピア', flag: '🇪🇹' },
  { code: 'AU', name: 'オーストラリア', flag: '🇦🇺' },
  { code: 'AT', name: 'オーストリア', flag: '🇦🇹' },
  { code: 'OM', name: 'オマーン', flag: '🇴🇲' },
  { code: 'NL', name: 'オランダ', flag: '🇳🇱' },
  // カ行
  { code: 'GH', name: 'ガーナ', flag: '🇬🇭' },
  { code: 'KZ', name: 'カザフスタン', flag: '🇰🇿' },
  { code: 'QA', name: 'カタール', flag: '🇶🇦' },
  { code: 'CA', name: 'カナダ', flag: '🇨🇦' },
  { code: 'CM', name: 'カメルーン', flag: '🇨🇲' },
  { code: 'KH', name: 'カンボジア', flag: '🇰🇭' },
  { code: 'GR', name: 'ギリシャ', flag: '🇬🇷' },
  { code: 'CU', name: 'キューバ', flag: '🇨🇺' },
  { code: 'KW', name: 'クウェート', flag: '🇰🇼' },
  { code: 'HR', name: 'クロアチア', flag: '🇭🇷' },
  { code: 'KE', name: 'ケニア', flag: '🇰🇪' },
  { code: 'CR', name: 'コスタリカ', flag: '🇨🇷' },
  { code: 'CO', name: 'コロンビア', flag: '🇨🇴' },
  // サ行
  { code: 'SA', name: 'サウジアラビア', flag: '🇸🇦' },
  { code: 'JM', name: 'ジャマイカ', flag: '🇯🇲' },
  { code: 'SG', name: 'シンガポール', flag: '🇸🇬' },
  { code: 'CH', name: 'スイス', flag: '🇨🇭' },
  { code: 'SE', name: 'スウェーデン', flag: '🇸🇪' },
  { code: 'ES', name: 'スペイン', flag: '🇪🇸' },
  { code: 'LK', name: 'スリランカ', flag: '🇱🇰' },
  { code: 'SK', name: 'スロバキア', flag: '🇸🇰' },
  { code: 'SI', name: 'スロベニア', flag: '🇸🇮' },
  { code: 'SN', name: 'セネガル', flag: '🇸🇳' },
  { code: 'RS', name: 'セルビア', flag: '🇷🇸' },
  // タ行
  { code: 'TH', name: 'タイ', flag: '🇹🇭' },
  { code: 'TW', name: '台湾', flag: '🇹🇼' },
  { code: 'TZ', name: 'タンザニア', flag: '🇹🇿' },
  { code: 'CZ', name: 'チェコ', flag: '🇨🇿' },
  { code: 'TN', name: 'チュニジア', flag: '🇹🇳' },
  { code: 'CL', name: 'チリ', flag: '🇨🇱' },
  { code: 'DK', name: 'デンマーク', flag: '🇩🇰' },
  { code: 'DE', name: 'ドイツ', flag: '🇩🇪' },
  { code: 'DO', name: 'ドミニカ共和国', flag: '🇩🇴' },
  { code: 'TR', name: 'トルコ', flag: '🇹🇷' },
  { code: 'TM', name: 'トルクメニスタン', flag: '🇹🇲' },
  // ナ行
  { code: 'NG', name: 'ナイジェリア', flag: '🇳🇬' },
  { code: 'NZ', name: 'ニュージーランド', flag: '🇳🇿' },
  { code: 'NP', name: 'ネパール', flag: '🇳🇵' },
  { code: 'NO', name: 'ノルウェー', flag: '🇳🇴' },
  // ハ行
  { code: 'BH', name: 'バーレーン', flag: '🇧🇭' },
  { code: 'PK', name: 'パキスタン', flag: '🇵🇰' },
  { code: 'VA', name: 'バチカン', flag: '🇻🇦' },
  { code: 'PA', name: 'パナマ', flag: '🇵🇦' },
  { code: 'HU', name: 'ハンガリー', flag: '🇭🇺' },
  { code: 'PH', name: 'フィリピン', flag: '🇵🇭' },
  { code: 'FI', name: 'フィンランド', flag: '🇫🇮' },
  { code: 'BR', name: 'ブラジル', flag: '🇧🇷' },
  { code: 'FR', name: 'フランス', flag: '🇫🇷' },
  { code: 'BG', name: 'ブルガリア', flag: '🇧🇬' },
  { code: 'BN', name: 'ブルネイ', flag: '🇧🇳' },
  { code: 'VN', name: 'ベトナム', flag: '🇻🇳' },
  { code: 'BE', name: 'ベルギー', flag: '🇧🇪' },
  { code: 'PE', name: 'ペルー', flag: '🇵🇪' },
  { code: 'PL', name: 'ポーランド', flag: '🇵🇱' },
  { code: 'BA', name: 'ボスニア・ヘルツェゴビナ', flag: '🇧🇦' },
  { code: 'PT', name: 'ポルトガル', flag: '🇵🇹' },
  { code: 'HK', name: '香港', flag: '🇭🇰' },
  // マ行
  { code: 'MT', name: 'マルタ', flag: '🇲🇹' },
  { code: 'MY', name: 'マレーシア', flag: '🇲🇾' },
  { code: 'MX', name: 'メキシコ', flag: '🇲🇽' },
  { code: 'MZ', name: 'モザンビーク', flag: '🇲🇿' },
  { code: 'MC', name: 'モナコ', flag: '🇲🇨' },
  { code: 'MV', name: 'モルディブ', flag: '🇲🇻' },
  { code: 'MA', name: 'モロッコ', flag: '🇲🇦' },
  { code: 'MN', name: 'モンゴル', flag: '🇲🇳' },
  // ヤ行
  { code: 'JO', name: 'ヨルダン', flag: '🇯🇴' },
  // ラ行
  { code: 'LA', name: 'ラオス', flag: '🇱🇦' },
  { code: 'LV', name: 'ラトビア', flag: '🇱🇻' },
  { code: 'LT', name: 'リトアニア', flag: '🇱🇹' },
  { code: 'RO', name: 'ルーマニア', flag: '🇷🇴' },
  { code: 'LU', name: 'ルクセンブルク', flag: '🇱🇺' },
  { code: 'RW', name: 'ルワンダ', flag: '🇷🇼' },
  // ワ行
  { code: 'KR', name: '韓国', flag: '🇰🇷' },
];
