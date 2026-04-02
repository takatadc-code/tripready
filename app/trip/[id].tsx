import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, Alert, Platform, KeyboardAvoidingView, Image, ImageBackground, Linking, Dimensions, FlatList, Keyboard, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useNavigation, useRouter, useFocusEffect } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import * as ImagePicker from 'expo-image-picker';
import { File, Directory, Paths } from 'expo-file-system/next';
import { supabase } from '../../lib/supabase';
import { scanETicket, scanHotel as scanHotelImage, scanInsuranceCert, consultInsurance, consultInsuranceText, TROUBLE_CATEGORIES, askAirportGuide, AIRPORT_GUIDE_TOPICS } from '../../lib/scan-ticket';
import { pickImageWithChoice, pickMultiImagesWithChoice } from '../../lib/pick-image';
import { pickDocument } from '../../lib/pick-document';
import { searchAirports, Airport } from '../../lib/airports';
import { checkAiUsage, recordAiUsage, getPlan, getDeviceId } from '../../lib/ai-usage';
import { purchasePremium, restorePurchases, initIAP, setupPurchaseListener } from '../../lib/iap';
import { getDangerLevel, DANGER_LEVEL_CONFIG, DangerLevel } from '../../lib/travel-safety';
import { fetchExchangeRates, convertCurrency, formatCurrency, getCurrencyForCountry, CURRENCIES, CurrencyInfo } from '../../lib/currency';
import { getEmergencyInfo, COMMON_EMERGENCY_INFO, CountryEmergencyInfo } from '../../lib/emergency-contacts';
import { cacheTripData, syncAllData } from '../../lib/offline-cache';
import { getNightSafetyInfo, getSafetyLabel, NIGHTLIFE_TOPICS, UNIVERSAL_NIGHT_RULES, NightSafetyInfo } from '../../lib/nightlife-safety';
import { askNightSafetyGuide } from '../../lib/scan-ticket';
import { findCityGuide, findGuidesForTrip, generateCityGuideAI, getCachedGuideItems, findGuideByKeyword, getGuideByKey, CityGuide, DestinationGuide, AIGuideCache, AIGuideItem, TOURISM_CATEGORY_ICONS, FOOD_CATEGORY_ICONS } from '../../lib/tourism-guide';
import {
  generatePackingList, estimateSeason, savePackingChecks, loadPackingChecks,
  getPackingProgress, PackingCategory, PackingCheckState,
} from '../../lib/packing-list';
import {
  generateFlightEvents, generateHotelEvents, buildDaySchedules, loadCustomEvents, saveCustomEvents,
  createCustomEvent, formatDateJa, EVENT_TYPE_CONFIG, TimelineEvent, DaySchedule, TimelineEventType,
} from '../../lib/itinerary-timeline';
import {
  loadExpenses, saveExpenses, loadBudget, saveBudget, createExpense, calculateSummary,
  getCategoryPercentages, formatJpy, EXPENSE_CATEGORIES, Expense, ExpenseCategory, TripBudget,
} from '../../lib/expense-tracker';
import {
  fetchWeatherForecast, getWeatherForTripDates, getWeatherSummary, getWeatherDisplay,
  getCoordinates, WeatherForecast, DailyWeather,
} from '../../lib/weather';
import {
  Trip, Flight, Hotel, EntryRequirement, TripDocument, TripInsurance, Traveler, FlightPassenger,
  AIRLINE_CHECKIN_RULES, COUNTRY_LIST, DOCUMENT_CATEGORIES, REQUIREMENT_TYPES, TRAVEL_ADVISORIES,
  getTerminal, AIRPORT_MAP_URLS,
} from '../../types';
import DatePickerInput from '../../components/DatePickerInput';

const AIRLINES = Object.entries(AIRLINE_CHECKIN_RULES).map(([code, info]) => ({ code, name: info.name }));

const AIRLINE_ALIASES: Record<string, string[]> = {
  'NH': ['ANA', '全日空', '全日本空輸'], 'JL': ['JAL', '日本航空'],
  'MM': ['Peach', 'ピーチ'], 'GK': ['Jetstar', 'ジェットスター'],
  'ZG': ['ZIPAIR', 'ジップエア'], 'KE': ['Korean Air', '大韓航空'],
  'OZ': ['Asiana', 'アシアナ'], 'SQ': ['Singapore Airlines', 'シンガポール航空'],
  'TG': ['Thai Airways', 'タイ航空'], 'CX': ['Cathay Pacific', 'キャセイ'],
  'EK': ['Emirates', 'エミレーツ'], 'QR': ['Qatar', 'カタール'],
  'LH': ['Lufthansa', 'ルフトハンザ'], 'BA': ['British Airways', 'ブリティッシュ'],
  'AF': ['Air France', 'エールフランス'], 'UA': ['United', 'ユナイテッド'],
  'AA': ['American', 'アメリカン'], 'DL': ['Delta', 'デルタ'],
  'HA': ['Hawaiian', 'ハワイアン'], 'QF': ['Qantas', 'カンタス'],
  'AY': ['Finnair', 'フィンエアー'], 'TR': ['Scoot', 'スクート'],
  'AK': ['AirAsia', 'エアアジア'], 'CA': ['Air China', '中国国際航空'],
  'MU': ['China Eastern', '中国東方航空'], 'VN': ['Vietnam Airlines', 'ベトナム航空'],
};
function filterAirlines(query: string) {
  if (!query) return AIRLINES;
  const q = query.toLowerCase();
  return AIRLINES.filter(a => {
    if (a.code.toLowerCase().includes(q) || a.name.toLowerCase().includes(q)) return true;
    return (AIRLINE_ALIASES[a.code] || []).some(alias => alias.toLowerCase().includes(q));
  });
}

const DOC_ICONS: Record<string, string> = { immigration: '🛂', flight: '✈️', event_ticket: '🎫', hotel: '🏨', other: '📎' };

// マスコット画像
const MASCOT = {
  main: require('../../assets/images/aero-cloud-mascot.png'),
  key: require('../../assets/images/aero-cloud-key.png'),
  sad: require('../../assets/images/emotions/sad.png'),
  happy: require('../../assets/images/emotions/happy.png'),
  excited: require('../../assets/images/emotions/excited.png'),
  running: require('../../assets/images/emotions/running.png'),
  wink: require('../../assets/images/emotions/wink.png'),
};

// 国別ヘッダー画像（40カ国対応）
// 国別ヘッダー画像（40カ国）未登録の国は DEFAULT_HEADER にフォールバック
const COUNTRY_HEADERS: Record<string, any> = {
  JP: require('../../assets/generated/country_japan.png'),
  US: require('../../assets/generated/country_usa.png'),
  FR: require('../../assets/generated/country_france.png'),
  SG: require('../../assets/generated/country_singapore.png'),
  ID: require('../../assets/generated/country_indonesia.png'),
  KR: require('../../assets/generated/country_korea.png'),
  TH: require('../../assets/generated/country_thailand.png'),
  AU: require('../../assets/generated/country_australia.png'),
  GB: require('../../assets/generated/country_uk.png'),
  IT: require('../../assets/generated/country_italy.png'),
  DE: require('../../assets/generated/country_germany.png'),
  ES: require('../../assets/generated/country_spain.png'),
  PT: require('../../assets/generated/country_portugal.png'),
  NL: require('../../assets/generated/country_netherlands.png'),
  CH: require('../../assets/generated/country_switzerland.png'),
  AT: require('../../assets/generated/country_austria.png'),
  GR: require('../../assets/generated/country_greece.png'),
  TR: require('../../assets/generated/country_turkey.png'),
  CZ: require('../../assets/generated/country_czech.png'),
  HR: require('../../assets/generated/country_croatia.png'),
  SE: require('../../assets/generated/country_sweden.png'),
  FI: require('../../assets/generated/country_finland.png'),
  DK: require('../../assets/generated/country_denmark.png'),
  NO: require('../../assets/generated/country_norway.png'),
  TW: require('../../assets/generated/country_taiwan.png'),
  HK: require('../../assets/generated/country_hongkong.png'),
  CN: require('../../assets/generated/country_china.png'),
  VN: require('../../assets/generated/country_vietnam.png'),
  PH: require('../../assets/generated/country_philippines.png'),
  MY: require('../../assets/generated/country_malaysia.png'),
  KH: require('../../assets/generated/country_cambodia.png'),
  MM: require('../../assets/generated/country_myanmar.png'),
  IN: require('../../assets/generated/country_india.png'),
  LK: require('../../assets/generated/country_srilanka.png'),
  NP: require('../../assets/generated/country_nepal.png'),
  MV: require('../../assets/generated/country_maldives.png'),
  CA: require('../../assets/generated/country_canada.png'),
  MX: require('../../assets/generated/country_mexico.png'),
  BR: require('../../assets/generated/country_brazil.png'),
  PE: require('../../assets/generated/country_peru.png'),
  EG: require('../../assets/generated/country_egypt.png'),
  MA: require('../../assets/generated/country_morocco.png'),
  KE: require('../../assets/generated/country_kenya.png'),
  ZA: require('../../assets/generated/country_southafrica.png'),
  TZ: require('../../assets/generated/country_tanzania.png'),
  NZ: require('../../assets/generated/country_newzealand.png'),
  AE: require('../../assets/generated/country_uae.png'),
  QA: require('../../assets/generated/country_qatar.png'),
  HU: require('../../assets/generated/country_hungary.png'),
};
const DEFAULT_HEADER = require('../../assets/generated/bg_trip_header.png');

function fmtDate(s: string) { const d = new Date(s); return `${d.getMonth()+1}/${d.getDate()}`; }
function fmtDateTime(s: string) { const d = new Date(s); return `${d.getMonth()+1}/${d.getDate()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`; }
function fmtDateInput(text: string, prev: string) {
  const c = text.replace(/[^0-9-]/g,''); if (c.length < prev.length) return c;
  const d = c.replace(/-/g,'');
  if (d.length<=4) return d; if (d.length<=6) return `${d.slice(0,4)}-${d.slice(4)}`;
  return `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}`;
}
function fmtTimeInput(text: string, prev: string) {
  const c = text.replace(/[^0-9:]/g,''); if (c.length < prev.length) return c;
  const d = c.replace(/:/g,''); if (d.length<=2) return d; return `${d.slice(0,2)}:${d.slice(2,4)}`;
}
function getNights(ci: string, co: string) { return Math.round((new Date(co).getTime()-new Date(ci).getTime())/86400000); }

// 空港名辞書（主要空港）
const AIRPORT_NAMES: Record<string, string> = {
  // 日本国内
  NRT:'成田空港', HND:'羽田空港', KIX:'関西国際空港', NGO:'中部国際空港(セントレア)', CTS:'新千歳空港',
  FUK:'福岡空港', OKA:'那覇空港', ITM:'伊丹空港(大阪国際)', UKB:'神戸空港',
  KOJ:'鹿児島空港', KMJ:'熊本空港', HIJ:'広島空港', TAK:'高松空港', MYJ:'松山空港',
  KCZ:'高知空港', TKS:'徳島空港', SDJ:'仙台空港', AOJ:'青森空港',
  MMJ:'松本空港', KMI:'宮崎空港', NGS:'長崎空港', OIT:'大分空港', GAJ:'山形空港',
  AKJ:'旭川空港', MMB:'女満別空港', ISG:'石垣空港',
  // 韓国
  ICN:'仁川空港', GMP:'金浦空港', PUS:'金海空港(釜山)',
  // 台湾
  TPE:'桃園空港', TSA:'台北松山空港', KHH:'高雄空港',
  // 中国・香港
  HKG:'香港国際空港', PEK:'北京首都空港', PVG:'上海浦東空港', CAN:'広州白雲空港', PKX:'北京大興空港',
  // 東南アジア
  SIN:'チャンギ空港(シンガポール)', BKK:'スワンナプーム空港(バンコク)', DMK:'ドンムアン空港(バンコク)',
  MNL:'ニノイ・アキノ空港(マニラ)', SGN:'タンソンニャット空港(ホーチミン)', HAN:'ノイバイ空港(ハノイ)',
  KUL:'クアラルンプール空港', DPS:'ングラライ空港(バリ)', CGK:'スカルノ・ハッタ空港(ジャカルタ)',
  RGN:'ヤンゴン空港', PNH:'プノンペン空港', REP:'シェムリアップ空港',
  // 南アジア
  DEL:'デリー空港', BOM:'ムンバイ空港', CMB:'コロンボ空港',
  // オセアニア
  SYD:'シドニー空港', MEL:'メルボルン空港', AKL:'オークランド空港', BNE:'ブリスベン空港',
  // 北米
  LAX:'ロサンゼルス空港', SFO:'サンフランシスコ空港', JFK:'JFK空港(ニューヨーク)', ORD:'シカゴ空港',
  SEA:'シアトル空港', YVR:'バンクーバー空港', YYZ:'トロント空港', EWR:'ニューアーク空港',
  HNL:'ホノルル空港(ハワイ)', GUM:'グアム空港',
  // 欧州
  LHR:'ヒースロー空港(ロンドン)', CDG:'シャルル・ド・ゴール空港(パリ)', FRA:'フランクフルト空港',
  MUC:'ミュンヘン空港', CGN:'ケルン/ボン空港', AMS:'スキポール空港',
  FCO:'フィウミチーノ空港(ローマ)', BCN:'バルセロナ空港', MAD:'マドリード空港',
  HEL:'ヘルシンキ空港', ZRH:'チューリッヒ空港', VIE:'ウィーン空港',
  // 中東
  DXB:'ドバイ空港', DOH:'ハマド空港(ドーハ)', IST:'イスタンブール空港',
};

function getCheckinTimes(fl: Flight) {
  if(!fl.departure_time) return null;
  const dep = new Date(fl.departure_time).getTime();
  const openTime = new Date(dep - fl.checkin_open_minutes * 60000);
  const closeTime = new Date(dep - fl.checkin_close_minutes * 60000);
  const fmt = (d: Date) => `${d.getMonth()+1}/${d.getDate()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
  return { open: fmt(openTime), close: fmt(closeTime) };
}

function openGoogleMaps(airportCode: string) {
  const name = AIRPORT_NAMES[airportCode] || `${airportCode} airport`;
  const url = Platform.select({
    ios: `comgooglemaps://?daddr=${encodeURIComponent(name)}&directionsmode=transit`,
    default: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(name)}&travelmode=transit`,
  });
  const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(name)}&travelmode=transit`;
  Linking.canOpenURL(url!).then(ok => Linking.openURL(ok ? url! : webUrl)).catch(() => Linking.openURL(webUrl));
}
function getCheckinStatus(fl: Flight) {
  if(!fl.departure_time) return{l:'日時未設定',c:'#9CA3AF'};
  const now=Date.now(), dep=new Date(fl.departure_time).getTime();
  const open=dep-fl.checkin_open_minutes*60000, close=dep-fl.checkin_close_minutes*60000;
  if(now<open){const h=Math.floor((open-now)/3600000);return h>=24?{l:`開始まで${Math.floor(h/24)}日`,c:'#6B7280'}:{l:`開始まで${h}h`,c:'#6B7280'};}
  if(now<close){const h=Math.floor((close-now)/3600000),m=Math.floor(((close-now)%3600000)/60000);return{l:`チェックイン可能！残${h}h${m}m`,c:'#059669'};}
  if(now<dep)return{l:'締切済み',c:'#DC2626'};return{l:'出発済み',c:'#9CA3AF'};
}

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const router = useRouter();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [reqs, setReqs] = useState<EntryRequirement[]>([]);
  const [docs, setDocs] = useState<TripDocument[]>([]);
  const [insurances, setInsurances] = useState<TripInsurance[]>([]);
  const [loading, setLoading] = useState(true);

  const [scanning, setScanning] = useState(false);
  // スキャン画像URI保持
  const [scannedTicketUris, setScannedTicketUris] = useState<string[]>([]);
  const [scannedHotelUris, setScannedHotelUris] = useState<string[]>([]);
  const [scannedInsuranceUris, setScannedInsuranceUris] = useState<string[]>([]);

  // 搭乗者管理
  const [allTravelers, setAllTravelers] = useState<Traveler[]>([]);
  const [flightPassengers, setFlightPassengers] = useState<Record<string, FlightPassenger[]>>({});
  const [showPassengerModal, setShowPassengerModal] = useState<string | null>(null); // flight_id
  const [passengerSelections, setPassengerSelections] = useState<Record<string, { selected: boolean; seat: string; mileage: string }>>({});

  // モーダル
  const [addType, setAddType] = useState<'flight'|'hotel'|'doc'|'insurance'|null>(null);
  const [showAirlinePicker, setShowAirlinePicker] = useState(false);
  const [airlineSearch, setAirlineSearch] = useState('');
  const [manualAirlineMode, setManualAirlineMode] = useState(false);
  const [manualAirlineName, setManualAirlineName] = useState('');
  const [showDocCat, setShowDocCat] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string|null>(null);

  // 思い出写真
  const [memories, setMemories] = useState<string[]>([]);

  // フライトフォーム
  const [ff, setFf] = useState({ airline:'',flight_number:'',dep_airport:'',arr_airport:'',dep_date:'',dep_time:'',arr_date:'',arr_time:'',ref:'',seat:'' });
  const [editingFlightId, setEditingFlightId] = useState<string|null>(null);
  // 空港検索
  const [airportQuery, setAirportQuery] = useState('');
  const [airportResults, setAirportResults] = useState<Airport[]>([]);
  const [airportTarget, setAirportTarget] = useState<'dep'|'arr'|null>(null);
  const [depAirportLabel, setDepAirportLabel] = useState('');
  const [arrAirportLabel, setArrAirportLabel] = useState('');
  // ホテルフォーム
  const [hf, setHf] = useState({ name:'',checkin:'',checkout:'',checkin_time:'',checkout_time:'',address:'',ref:'',room:'',notes:'',loyalty:'' });
  const [editingHotelId, setEditingHotelId] = useState<string|null>(null);
  // 保険フォーム
  const [insf, setInsf] = useState({ company:'',policy_number:'',phone:'',coverage:'',notes:'' });
  const [editingInsuranceId, setEditingInsuranceId] = useState<string|null>(null);
  // 保険相談
  const [showConsult, setShowConsult] = useState(false);
  const [policyImages, setPolicyImages] = useState<string[]>([]);
  const [consultTrouble, setConsultTrouble] = useState('');
  const [consultFreeText, setConsultFreeText] = useState('');
  const [consultResult, setConsultResult] = useState('');
  const [consulting, setConsulting] = useState(false);
  // 空港ガイド
  const [showAirportGuide, setShowAirportGuide] = useState(false);
  const [guideAirport, setGuideAirport] = useState<{code:string,name:string,airline?:string,terminal?:string}|null>(null);
  const [guideTopic, setGuideTopic] = useState('');
  const [guideFreeText, setGuideFreeText] = useState('');
  const [guideResult, setGuideResult] = useState('');
  const [guideLoading, setGuideLoading] = useState(false);
  // 観光・食ガイド
  const [showCityGuide, setShowCityGuide] = useState(false);
  const [cityGuideTab, setCityGuideTab] = useState<'tourism'|'food'>('tourism');
  const [cityGuideData, setCityGuideData] = useState<CityGuide|null>(null);
  const [cityGuideAIResult, setCityGuideAIResult] = useState('');
  const [cityGuideAIItems, setCityGuideAIItems] = useState<AIGuideItem[]>([]);
  const [cityGuideAILoading, setCityGuideAILoading] = useState(false);
  const [cityGuideDestinations, setCityGuideDestinations] = useState<DestinationGuide[]>([]);
  const [cityGuideSelectedIdx, setCityGuideSelectedIdx] = useState(0);
  // アップグレード導線
  const [showUpgrade, setShowUpgrade] = useState(false);
  // 外務省危険レベル
  const [dangerInfo, setDangerInfo] = useState<DangerLevel | null>(null);
  // 通貨換算
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});
  const [currencyAmount, setCurrencyAmount] = useState('1000');
  const [fromCurrency, setFromCurrency] = useState('JPY');
  const [toCurrency, setToCurrency] = useState('USD');
  const [showCurrencyPicker, setShowCurrencyPicker] = useState<'from'|'to'|null>(null);
  // 緊急連絡先
  const [emergencyInfo, setEmergencyInfo] = useState<CountryEmergencyInfo | null>(null);
  const [showEmergencyDetail, setShowEmergencyDetail] = useState(false);
  // 夜間安全ガイド
  const [nightSafetyInfo, setNightSafetyInfo] = useState<NightSafetyInfo | null>(null);
  const [showNightGuide, setShowNightGuide] = useState(false);
  const [nightTopic, setNightTopic] = useState('');
  const [nightFreeText, setNightFreeText] = useState('');
  const [nightResult, setNightResult] = useState('');
  const [nightLoading, setNightLoading] = useState(false);
  const [showNightRules, setShowNightRules] = useState(false);
  // パッキングリスト
  const [packingCategories, setPackingCategories] = useState<PackingCategory[]>([]);
  const [packingChecks, setPackingChecks] = useState<PackingCheckState>({});
  const [showPackingDetail, setShowPackingDetail] = useState(false);
  const [expandedPackingCat, setExpandedPackingCat] = useState<string | null>(null);
  // 旅程タイムライン
  const [daySchedules, setDaySchedules] = useState<DaySchedule[]>([]);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [showAddEvent, setShowAddEvent] = useState(false);
  // 旅行日程編集
  const [showEditDates, setShowEditDates] = useState(false);
  const [editDepDate, setEditDepDate] = useState('');
  const [editRetDate, setEditRetDate] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventTime, setNewEventTime] = useState('');
  const [newEventType, setNewEventType] = useState<TimelineEventType>('sightseeing');
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventLocation, setNewEventLocation] = useState('');
  const [newEventNote, setNewEventNote] = useState('');
  // 日程内ガイド表示用
  const [dayGuideCity, setDayGuideCity] = useState('');
  const [dayGuideData, setDayGuideData] = useState<CityGuide | null>(null);
  const [dayGuideTab, setDayGuideTab] = useState<'tourism' | 'food'>('tourism');
  const [dayGuideAIResult, setDayGuideAIResult] = useState('');
  const [dayGuideAILoading, setDayGuideAILoading] = useState(false);
  // 旅費トラッカー
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [tripBudget, setTripBudget] = useState<TripBudget | null>(null);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showExpenseDetail, setShowExpenseDetail] = useState(false);
  const [expDate, setExpDate] = useState('');
  const [expCategory, setExpCategory] = useState<ExpenseCategory>('food');
  const [expTitle, setExpTitle] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expCurrency, setExpCurrency] = useState('USD');
  const [expPayment, setExpPayment] = useState<'cash'|'card'|'other'>('card');
  // 天気予報
  const [weatherForecast, setWeatherForecast] = useState<WeatherForecast | null>(null);
  const [tripWeather, setTripWeather] = useState<DailyWeather[]>([]);

  // 旅行日程の更新
  const saveTripDates = async () => {
    if (!trip || !editDepDate) { Alert.alert('エラー', '出発日は必須です'); return; }
    const { error } = await supabase.from('trips').update({
      departure_date: editDepDate,
      return_date: editRetDate || null,
    }).eq('id', trip.id);
    if (error) { Alert.alert('エラー', error.message); return; }
    setShowEditDates(false);
    fetchAll();
  };

  const fetchAll = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const deviceId = await getDeviceId();
    const [t,f,h,r,d,ins,tv] = await Promise.all([
      supabase.from('trips').select('*').eq('id',id).single(),
      supabase.from('flights').select('*').eq('trip_id',id).order('departure_time',{ascending:true}),
      supabase.from('hotels').select('*').eq('trip_id',id).order('checkin_date',{ascending:true}),
      supabase.from('entry_requirements').select('*').eq('trip_id',id).order('created_at',{ascending:true}),
      supabase.from('trip_documents').select('*').eq('trip_id',id).order('created_at',{ascending:false}),
      supabase.from('trip_insurances').select('*').eq('trip_id',id).order('created_at',{ascending:true}),
      supabase.from('travelers').select('*').eq('device_id', deviceId).order('relationship',{ascending:true}),
    ]);
    if(t.data){ setTrip(t.data); navigation.setOptions({ title: t.data.name }); }
    setFlights(f.data||[]); setHotels(h.data||[]); setReqs(r.data||[]); setDocs(d.data||[]);
    setInsurances(ins.data||[]); setAllTravelers(tv.data||[]);
    // フライト搭乗者取得
    const flightIds = (f.data||[]).map((fl: Flight) => fl.id);
    if (flightIds.length > 0) {
      const { data: pData } = await supabase.from('flight_passengers').select('*').in('flight_id', flightIds);
      const grouped: Record<string, FlightPassenger[]> = {};
      (pData || []).forEach((p: FlightPassenger) => {
        if (!grouped[p.flight_id]) grouped[p.flight_id] = [];
        grouped[p.flight_id].push(p);
      });
      setFlightPassengers(grouped);
    }
    // 外務省 危険レベル取得
    if (t.data?.country_code) {
      getDangerLevel(t.data.country_code).then(d => setDangerInfo(d)).catch(() => {});
      // 緊急連絡先
      const eInfo = getEmergencyInfo(t.data.country_code);
      setEmergencyInfo(eInfo);
      // 渡航先通貨を自動設定
      const destCurrency = getCurrencyForCountry(t.data.country_code);
      if (destCurrency) setToCurrency(destCurrency);
      // 夜間安全情報
      const nightInfo = getNightSafetyInfo(t.data.country_code);
      setNightSafetyInfo(nightInfo);
    }
    // 為替レート取得
    fetchExchangeRates().then(rates => setExchangeRates(rates)).catch(() => {});
    // オフラインキャッシュに保存
    if (t.data) {
      cacheTripData(t.data.id, t.data, f.data || [], h.data || []).catch(() => {});
    }
    // パッキングリスト生成
    if (t.data) {
      const durationDays = Math.max(1, Math.round((new Date(t.data.return_date).getTime() - new Date(t.data.departure_date).getTime()) / 86400000));
      const season = estimateSeason(t.data.departure_date, t.data.country_code);
      const categories = generatePackingList({
        tripId: t.data.id,
        destination: t.data.country_code,
        durationDays,
        season,
        purpose: 'leisure',
      });
      setPackingCategories(categories);
      const checks = await loadPackingChecks(t.data.id);
      setPackingChecks(checks);
    }
    // 旅程タイムライン生成
    if (t.data) {
      const autoFlightEvents = generateFlightEvents(t.data.id, f.data || []);
      const autoHotelEvents = generateHotelEvents(t.data.id, h.data || []);
      const customEvents = await loadCustomEvents(t.data.id);
      const schedules = buildDaySchedules(t.data.departure_date, t.data.return_date, [...autoFlightEvents, ...autoHotelEvents], customEvents);
      setDaySchedules(schedules);
    }
    // 旅費データ読み込み
    if (t.data) {
      const exps = await loadExpenses(t.data.id);
      setExpenses(exps);
      const budget = await loadBudget(t.data.id);
      setTripBudget(budget);
      // 通貨デフォルトを渡航先に合わせる
      const destCur = getCurrencyForCountry(t.data.country_code);
      if (destCur) setExpCurrency(destCur);
    }
    // 天気予報取得
    if (t.data) {
      fetchWeatherForecast(t.data.country_code).then(fc => {
        if (fc) {
          setWeatherForecast(fc);
          const tripDays = getWeatherForTripDates(fc, t.data!.departure_date, t.data!.return_date);
          setTripWeather(tripDays);
        }
      }).catch(() => {});
    }
    // 思い出写真をローカルから読み込み
    await loadMemories();
    setLoading(false);
  }, [id]);

  const memoriesDirectory = new Directory(Paths.document, `memories/${id}`);

  const loadMemories = async () => {
    try {
      if (!memoriesDirectory.exists) return;
      const entries = memoriesDirectory.list();
      const uris = entries
        .filter(e => e instanceof File)
        .map(e => (e as File).uri)
        .sort()
        .reverse();
      setMemories(uris);
    } catch {}
  };

  const addMemory = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (result.canceled || !result.assets) return;
    if (!memoriesDirectory.exists) {
      memoriesDirectory.create();
    }
    for (const asset of result.assets) {
      const ext = asset.uri.split('.').pop() || 'jpg';
      const name = `${Date.now()}_${Math.random().toString(36).slice(2,6)}.${ext}`;
      const src = new File(asset.uri);
      src.copy(new File(memoriesDirectory, name));
    }
    await loadMemories();
  };

  useFocusEffect(useCallback(()=>{fetchAll();},[fetchAll]));

  // ===== 入国要件 =====
  const generateReqs = async () => {
    if(!trip) return;
    const existing = reqs.map(r=>r.type);
    const toCreate: {type:string;label:string;apply_url?:string}[] = [];
    Object.entries(REQUIREMENT_TYPES).forEach(([type,info])=>{
      if(info.countries.includes(trip.country_code) && !existing.includes(type)){
        const urls: Record<string,string> = {
          ESTA:'https://esta.cbp.dhs.gov/',ETIAS:'https://travel-europe.europa.eu/etias_en',
          'K-ETA':'https://www.k-eta.go.kr/','SG_ARRIVAL_CARD':'https://eservices.ica.gov.sg/sgarrivalcard/',
        };
        toCreate.push({type,label:info.label,apply_url:urls[type]});
      }
    });
    if(!toCreate.length){Alert.alert('情報','この渡航先に必要な入国要件はありません');return;}
    await supabase.from('entry_requirements').insert(toCreate.map(r=>({trip_id:id,...r,status:'not_applied'})));
    fetchAll();
  };

  const cycleReqStatus = async (req: EntryRequirement) => {
    const next = req.status==='not_applied'?'applied':req.status==='applied'?'approved':'not_applied';
    await supabase.from('entry_requirements').update({status:next}).eq('id',req.id);
    fetchAll();
  };

  // ===== E-ticketスキャン =====
  const scanTicket = async () => {
    const picked = await pickMultiImagesWithChoice(5);
    if(!picked) return;
    setScanning(true);
    try {
      const flights = await scanETicket(picked.uris);
      if (flights.length === 0) throw new Error('フライト情報を読み取れませんでした');

      // 最初のフライトをフォームに入れる
      const first = flights[0];
      setFf({
        airline: first.airline || '',
        flight_number: first.flight_number || '',
        dep_airport: first.dep_airport || '',
        arr_airport: first.arr_airport || '',
        dep_date: first.dep_date || '',
        dep_time: first.dep_time || '',
        arr_date: first.arr_date || '',
        arr_time: first.arr_time || '',
        ref: first.booking_ref || '',
        seat: first.seat || '',
      });
      setScannedTicketUris(picked.uris);

      // 2便以上ある場合（往路+復路など）は残りを自動保存
      if (flights.length > 1) {
        let autoSaved = 0;
        for (let i = 1; i < flights.length; i++) {
          const f = flights[i];
          const code = f.airline ? f.airline.toUpperCase() : '';
          const rule = code ? AIRLINE_CHECKIN_RULES[code] : null;
          const dep = f.dep_date && f.dep_time ? `${f.dep_date}T${f.dep_time}:00` : null;
          const arr = f.arr_date && f.arr_time ? `${f.arr_date}T${f.arr_time}:00` : null;
          const flightData: Record<string, any> = {
            trip_id: id,
            checkin_open_minutes: rule?.open || 1440,
            checkin_close_minutes: rule?.close || 60,
          };
          if (code) flightData.airline = code;
          if (f.flight_number) flightData.flight_number = f.flight_number.toUpperCase();
          if (f.dep_airport) flightData.departure_airport = f.dep_airport.toUpperCase();
          if (f.arr_airport) flightData.arrival_airport = f.arr_airport.toUpperCase();
          if (dep) flightData.departure_time = dep;
          if (arr) flightData.arrival_time = arr;
          if (f.booking_ref) flightData.booking_reference = f.booking_ref;
          if (f.seat) flightData.seat = f.seat;
          const { error: saveErr } = await supabase.from('flights').insert([flightData]);
          if (!saveErr) autoSaved++;
        }
        fetchAll();
        Alert.alert('読み取り完了', `${flights.length}便を検出しました。\n1便目をフォームに表示中（確認して保存してください）。\n残り${autoSaved}便は自動登録しました。`);
      } else {
        Alert.alert('読み取り完了', `${picked.uris.length}枚の画像から情報を読み取りました。内容を確認して保存してください`);
      }
    } catch(e: any) {
      Alert.alert('読み取りエラー', e.message || 'スクショを読み取れませんでした');
    } finally {
      setScanning(false);
    }
  };

  // ===== フライト =====
  const resetFlight = () => { setFf({airline:'',flight_number:'',dep_airport:'',arr_airport:'',dep_date:'',dep_time:'',arr_date:'',arr_time:'',ref:'',seat:''}); setAddType(null); setShowAirlinePicker(false); setAirlineSearch(''); setManualAirlineMode(false); setManualAirlineName(''); setEditingFlightId(null); setDepAirportLabel(''); setArrAirportLabel(''); };

  const openAirportSearch = (target: 'dep' | 'arr') => {
    const current = target === 'dep' ? ff.dep_airport : ff.arr_airport;
    setAirportQuery(current);
    setAirportResults(current ? searchAirports(current) : []);
    setAirportTarget(target);
  };

  const selectAirport = (a: Airport) => {
    if (airportTarget === 'dep') {
      setFf({ ...ff, dep_airport: a.code });
      setDepAirportLabel(`${a.city} ${a.name}`);
    } else {
      setFf({ ...ff, arr_airport: a.code });
      setArrAirportLabel(`${a.city} ${a.name}`);
    }
    setAirportTarget(null);
    setAirportQuery('');
    setAirportResults([]);
    Keyboard.dismiss();
  };

  const handleAirportInput = (text: string) => {
    setAirportQuery(text);
    setAirportResults(searchAirports(text));
  };
  const saveFlight = async () => {
    // すべて任意入力（旅行選択のみ必須）
    const code=ff.airline?ff.airline.toUpperCase():''; const rule=code?AIRLINE_CHECKIN_RULES[code]:null;
    const dep=ff.dep_date&&ff.dep_time?`${ff.dep_date}T${ff.dep_time}:00`:null; const arr=ff.arr_date&&ff.arr_time?`${ff.arr_date}T${ff.arr_time}:00`:null;
    const flightData: Record<string,any> = {
      checkin_open_minutes:rule?.open||1440,checkin_close_minutes:rule?.close||60};
    if(code) flightData.airline=code;
    if(ff.flight_number) flightData.flight_number=ff.flight_number.toUpperCase();
    if(ff.dep_airport) flightData.departure_airport=ff.dep_airport.toUpperCase();
    if(ff.arr_airport) flightData.arrival_airport=ff.arr_airport.toUpperCase();
    if(dep) flightData.departure_time=dep;
    if(arr) flightData.arrival_time=arr;
    if(ff.ref) flightData.booking_reference=ff.ref;
    if(ff.seat) flightData.seat=ff.seat;
    if(editingFlightId){
      const{error}=await supabase.from('flights').update(flightData).eq('id',editingFlightId);
      if(!error){fetchAll();resetFlight();Alert.alert('完了','フライト情報を更新しました');}else Alert.alert('エラー','更新失敗');
    }else{
      const{error}=await supabase.from('flights').insert([{trip_id:id,...flightData}]);
      if(!error){
        // スキャン画像をドキュメントとして保存
        if(scannedTicketUris.length>0){
          const docs=scannedTicketUris.map((uri,i)=>({trip_id:id,category:'other' as const,title:`E-Ticket（${ff.airline} ${ff.flight_number}）${scannedTicketUris.length>1?` ${i+1}/${scannedTicketUris.length}`:''}`,file_url:uri}));
          await supabase.from('trip_documents').insert(docs);
          setScannedTicketUris([]);
        }
        fetchAll();resetFlight();Alert.alert('完了','フライトを登録しました');
      }else{ console.error('Flight save error:',JSON.stringify(error)); Alert.alert('エラー',`保存失敗: ${error.message||JSON.stringify(error)}`); }
    }
  };

  // ===== 搭乗者管理 =====
  const openPassengerModal = (flightId: string) => {
    const existing = flightPassengers[flightId] || [];
    const selections: Record<string, { selected: boolean; seat: string; mileage: string }> = {};
    allTravelers.forEach(t => {
      const p = existing.find(e => e.traveler_id === t.id);
      selections[t.id] = {
        selected: !!p,
        seat: p?.seat || '',
        mileage: p?.mileage_number || '',
      };
    });
    setPassengerSelections(selections);
    setShowPassengerModal(flightId);
  };

  const savePassengers = async () => {
    if (!showPassengerModal) return;
    const flightId = showPassengerModal;
    // 既存を全削除→再作成
    await supabase.from('flight_passengers').delete().eq('flight_id', flightId);
    const rows = Object.entries(passengerSelections)
      .filter(([_, v]) => v.selected)
      .map(([travelerId, v]) => ({
        flight_id: flightId,
        traveler_id: travelerId,
        seat: v.seat || null,
        mileage_number: v.mileage || null,
      }));
    if (rows.length > 0) {
      await supabase.from('flight_passengers').insert(rows);
    }
    setShowPassengerModal(null);
    fetchAll();
  };

  const getPassengerNames = (flightId: string) => {
    const pList = flightPassengers[flightId] || [];
    return pList.map(p => {
      const t = allTravelers.find(tv => tv.id === p.traveler_id);
      const name = t?.full_name_jp || t?.full_name || '?';
      return p.seat ? `${name}(${p.seat})` : name;
    }).join(', ');
  };

  // ===== ホテル予約スキャン =====
  const scanHotelBooking = async () => {
    const picked = await pickMultiImagesWithChoice(5);
    if(!picked) return;
    setScanning(true);
    try {
      const data = await scanHotelImage(picked.uris);
      setHf({
        name: data.name || '',
        checkin: data.checkin_date || '',
        checkout: data.checkout_date || '',
        checkin_time: data.checkin_time || '',
        checkout_time: data.checkout_time || '',
        address: data.address || '',
        ref: data.booking_ref || '',
        room: data.room_type || '',
        notes: data.notes || '',
        loyalty: '',
      });
      setScannedHotelUris(picked.uris);
      Alert.alert('読み取り完了',`${picked.uris.length}枚の画像から情報を読み取りました。内容を確認して保存してください`);
    } catch(e: any) {
      Alert.alert('読み取りエラー', e.message || '予約情報を読み取れませんでした');
    } finally {
      setScanning(false);
    }
  };

  // ===== ホテル =====
  const resetHotel = () => { setHf({name:'',checkin:'',checkout:'',checkin_time:'',checkout_time:'',address:'',ref:'',room:'',notes:'',loyalty:''}); setAddType(null); setEditingHotelId(null); };
  const saveHotel = async () => {
    if(!hf.name||!hf.checkin||!hf.checkout){Alert.alert('入力エラー','ホテル名・チェックイン/アウト日は必須');return;}
    const hotelData = {name:hf.name.trim(),checkin_date:hf.checkin,checkout_date:hf.checkout,
      checkin_time:hf.checkin_time||null,checkout_time:hf.checkout_time||null,
      address:hf.address||null,booking_reference:hf.ref||null,room_type:hf.room||null,
      notes:hf.notes||null,loyalty_program:hf.loyalty||null};
    if(editingHotelId){
      const{error}=await supabase.from('hotels').update(hotelData).eq('id',editingHotelId);
      if(!error){fetchAll();resetHotel();Alert.alert('完了','ホテル情報を更新しました');}else Alert.alert('エラー','更新失敗');
    }else{
      const{error}=await supabase.from('hotels').insert([{trip_id:id,...hotelData}]);
      if(!error){
        if(scannedHotelUris.length>0){
          const docs=scannedHotelUris.map((uri,i)=>({trip_id:id,category:'other' as const,title:`ホテル予約（${hf.name}）${scannedHotelUris.length>1?` ${i+1}/${scannedHotelUris.length}`:''}`,file_url:uri}));
          await supabase.from('trip_documents').insert(docs);
          setScannedHotelUris([]);
        }
        fetchAll();resetHotel();Alert.alert('完了','ホテルを登録しました');
      }else Alert.alert('エラー','保存失敗');
    }
  };

  // ===== 保険 =====
  const resetInsurance = () => { setInsf({company:'',policy_number:'',phone:'',coverage:'',notes:''}); setAddType(null); setEditingInsuranceId(null); };
  const saveInsurance = async () => {
    if(!insf.company){Alert.alert('入力エラー','保険会社名は必須');return;}
    const insuranceData = {company:insf.company.trim(),policy_number:insf.policy_number||null,phone:insf.phone||null,
      coverage_type:insf.coverage||null,notes:insf.notes||null};
    if(editingInsuranceId){
      const{error}=await supabase.from('trip_insurances').update(insuranceData).eq('id',editingInsuranceId);
      if(!error){fetchAll();resetInsurance();Alert.alert('完了','保険情報を更新しました');}else Alert.alert('エラー','更新失敗');
    }else{
      const{error}=await supabase.from('trip_insurances').insert([{trip_id:id,...insuranceData}]);
      if(!error){
        if(scannedInsuranceUris.length>0){
          const docs=scannedInsuranceUris.map((uri,i)=>({trip_id:id,category:'other' as const,title:`保険証書（${insf.company}）${scannedInsuranceUris.length>1?` ${i+1}/${scannedInsuranceUris.length}`:''}`,file_url:uri}));
          await supabase.from('trip_documents').insert(docs);
          setScannedInsuranceUris([]);
        }
        fetchAll();resetInsurance();Alert.alert('完了','保険情報を登録しました');
      }else Alert.alert('エラー','保存失敗');
    }
  };

  // 保険証書スキャン
  const [scanningInsurance, setScanningInsurance] = useState(false);
  const scanInsurance = async () => {
    const picked = await pickMultiImagesWithChoice(5);
    if(!picked) return;
    setScanningInsurance(true);
    try {
      const result = await scanInsuranceCert(picked.uris);
      setInsf({
        company: result.company || insf.company,
        policy_number: result.policy_number || insf.policy_number,
        phone: result.phone || insf.phone,
        coverage: result.coverage || insf.coverage,
        notes: result.notes || insf.notes,
      });
      setScannedInsuranceUris(picked.uris);
      Alert.alert('読み取り完了','保険証書の情報を入力しました。内容をご確認ください。');
    } catch(e: any) {
      Alert.alert('読み取りエラー', e.message || '保険証書を読み取れませんでした');
    } finally {
      setScanningInsurance(false);
    }
  };

  // 保険約款アップロード
  const pickPolicyImages = async () => {
    const remaining = 20 - policyImages.length;
    if(remaining<=0){Alert.alert('上限','画像は最大20枚までです');return;}
    const picked = await pickMultiImagesWithChoice(remaining);
    if(!picked) return;
    setPolicyImages(prev=>[...prev,...picked.uris]);
  };
  const removePolicyImage = (idx: number) => {
    setPolicyImages(prev=>prev.filter((_,i)=>i!==idx));
  };
  const resetConsult = () => {
    setShowConsult(false);
    setPolicyImages([]);
    setConsultTrouble('');
    setConsultFreeText('');
    setConsultResult('');
    setConsulting(false);
  };
  const submitConsult = async () => {
    if(!consultTrouble){Alert.alert('エラー','トラブルの種類を選んでください');return;}
    // AI使用回数チェック
    const usage = await checkAiUsage();
    if(!usage.allowed) {
      Alert.alert('AI利用上限', usage.reason || '上限に達しました', [
        { text: '閉じる', style: 'cancel' },
        { text: 'プレミアムにアップグレード', onPress: () => setShowUpgrade(true) },
      ]);
      return;
    }
    setConsulting(true);
    setConsultResult('');
    try {
      let answer: string;
      if(policyImages.length > 0) {
        // 画像ありモード（従来通り）
        answer = await consultInsurance(policyImages, consultTrouble, consultFreeText);
      } else if(insurances.length > 0) {
        // テキストベースモード（登録済み保険情報から）
        const ins = insurances[0]; // 最初の保険を使用
        answer = await consultInsuranceText(
          { company: ins.company, policy_number: ins.policy_number, coverage_type: ins.coverage_type, phone: ins.phone, notes: ins.notes },
          consultTrouble, consultFreeText
        );
      } else {
        Alert.alert('エラー','保険証券の画像を追加するか、先に保険情報を登録してください');
        setConsulting(false);
        return;
      }
      setConsultResult(answer);
      await recordAiUsage('insurance_consult');
    } catch(e:any) {
      Alert.alert('エラー', e.message || '回答を取得できませんでした');
    } finally {
      setConsulting(false);
    }
  };

  // ===== 空港ガイド =====
  const openAirportGuide = (airportCode: string, airlineCode: string) => {
    const name = AIRPORT_NAMES[airportCode] || airportCode;
    const terminal = getTerminal(airportCode, airlineCode) || undefined;
    setGuideAirport({ code: airportCode, name, airline: airlineCode, terminal });
    setGuideTopic('');
    setGuideFreeText('');
    setGuideResult('');
    setShowAirportGuide(true);
  };
  const submitGuide = async () => {
    if(!guideAirport) return;
    const question = guideFreeText.trim() || guideTopic;
    if(!question) { Alert.alert('入力エラー', 'カテゴリを選択するか、質問を入力してください'); return; }
    // AI使用回数チェック
    const usage = await checkAiUsage();
    if(!usage.allowed) {
      Alert.alert('AI利用上限', usage.reason || '上限に達しました', [
        { text: '閉じる', style: 'cancel' },
        { text: 'プレミアムにアップグレード', onPress: () => setShowUpgrade(true) },
      ]);
      return;
    }
    setGuideLoading(true);
    setGuideResult('');
    try {
      const answer = await askAirportGuide(guideAirport.code, guideAirport.name, question, guideAirport.airline, guideAirport.terminal);
      setGuideResult(answer);
      await recordAiUsage('airport_guide');
    } catch(e:any) {
      Alert.alert('エラー', e.message || '情報を取得できませんでした');
    } finally {
      setGuideLoading(false);
    }
  };

  // ===== 観光・食ガイド =====
  const openCityGuide = () => {
    if (!trip) return;
    // 到着空港ベースで訪問地を特定
    const dests = findGuidesForTrip(flights);
    setCityGuideDestinations(dests);
    setCityGuideSelectedIdx(0);
    setCityGuideAIResult('');
    setCityGuideAIItems([]);
    setCityGuideAILoading(false);
    setCityGuideTab('tourism');
    if (dests.length > 0) {
      setCityGuideData(dests[0].guide);
      setShowCityGuide(true);
      if (!dests[0].guide) loadCityGuideAIFor(dests[0].regionName);
    } else {
      // フライト未登録 → 国コードからフォールバック
      const guide = findCityGuide(trip.country_code, trip.destination);
      setCityGuideData(guide);
      setShowCityGuide(true);
      if (!guide) loadCityGuideAIFor(trip.destination || trip.name);
    }
  };
  const selectCityGuideDestination = (idx: number) => {
    const dest = cityGuideDestinations[idx];
    if (!dest) return;
    setCityGuideSelectedIdx(idx);
    setCityGuideData(dest.guide);
    setCityGuideAIResult('');
    setCityGuideAIItems([]);
    setCityGuideAILoading(false);
    setCityGuideTab('tourism');
    if (!dest.guide) loadCityGuideAIFor(dest.regionName);
  };
  const loadCityGuideAIFor = async (regionName: string) => {
    setCityGuideAILoading(true);
    setCityGuideAIResult('');
    setCityGuideAIItems([]);
    try {
      // まずキャッシュ確認
      const cached = await getCachedGuideItems(regionName, 'both');
      if (cached?.rawText) {
        setCityGuideAIResult(cached.rawText);
        setCityGuideAIItems(cached.items || []);
        setCityGuideAILoading(false);
        return;
      }
      const result = await generateCityGuideAI(regionName, regionName, 'both');
      setCityGuideAIResult(result);
      // キャッシュから構造化データを取得
      const newCached = await getCachedGuideItems(regionName, 'both');
      if (newCached?.items) setCityGuideAIItems(newCached.items);
    } catch (e: any) {
      // AI生成失敗時は静的なフォールバックメッセージ
      setCityGuideAIResult(`⚠️ ${regionName} のAIガイド生成に失敗しました。\n\nインターネット接続を確認してください。\nGoogleマップで「${regionName} 観光」「${regionName} グルメ」で検索すると現地情報が見つかります。`);
    } finally {
      setCityGuideAILoading(false);
    }
  };
  const loadCityGuideAI = async (type: 'tourism'|'food'|'both') => {
    const dest = cityGuideDestinations[cityGuideSelectedIdx];
    const name = dest?.regionName || trip?.destination || trip?.name || '';
    setCityGuideAILoading(true);
    setCityGuideAIResult('');
    setCityGuideAIItems([]);
    try {
      const cached = await getCachedGuideItems(name, type);
      if (cached?.rawText) {
        setCityGuideAIResult(cached.rawText);
        setCityGuideAIItems(cached.items || []);
        setCityGuideAILoading(false);
        return;
      }
      const result = await generateCityGuideAI(name, name, type);
      setCityGuideAIResult(result);
      const newCached = await getCachedGuideItems(name, type);
      if (newCached?.items) setCityGuideAIItems(newCached.items);
    } catch (e: any) {
      setCityGuideAIResult(`⚠️ ${name} のAIガイド生成に失敗しました。\n\nインターネット接続を確認してください。\nGoogleマップで「${name} 観光」「${name} グルメ」で検索すると現地情報が見つかります。`);
    } finally {
      setCityGuideAILoading(false);
    }
  };

  // ===== ガイドキーから観光ガイドモーダルを開く =====
  const openGuideByKey = async (guideKey: string, cityName?: string) => {
    const guide = getGuideByKey(guideKey);
    const regionName = guide?.cityNameJa || cityName || guideKey.split(':')[1] || '';
    setCityGuideDestinations([{ airportCode: '', regionName, guide }]);
    setCityGuideSelectedIdx(0);
    setCityGuideData(guide);
    setCityGuideTab('tourism');
    setShowCityGuide(true);

    if (guide) {
      // 静的データあり → AIは不要
      setCityGuideAIResult('');
      setCityGuideAIItems([]);
      setCityGuideAILoading(false);
    } else {
      // 静的データなし → まずキャッシュ確認、なければAI生成
      const cached = await getCachedGuideItems(regionName, 'both');
      if (cached?.rawText) {
        setCityGuideAIResult(cached.rawText);
        setCityGuideAIItems(cached.items || []);
        setCityGuideAILoading(false);
      } else {
        setCityGuideAIResult('');
        setCityGuideAIItems([]);
        loadCityGuideAIFor(regionName);
      }
    }
  };

  // ===== 書類 =====
  const addDoc = async (category: string) => {
    setShowDocCat(false);
    const picked = await pickImageWithChoice();
    if(!picked) return;
    await supabase.from('trip_documents').insert([{trip_id:id,category,title:DOCUMENT_CATEGORIES[category],file_url:picked.uri}]);
    fetchAll(); Alert.alert('完了','書類を追加しました');
  };

  const addDocPDF = async (category: string) => {
    setShowDocCat(false);
    const picked = await pickDocument();
    if(!picked) return;
    try {
      // Supabase Storageにアップロード
      const fileName = `${Date.now()}_${picked.name}`;
      const filePath = `${id}/${fileName}`;

      // ファイルをURIから読み込む
      const fileData = await fetch(picked.uri).then(r => r.blob());

      const { error: uploadError } = await supabase.storage
        .from('trip_documents')
        .upload(filePath, fileData, {
          contentType: picked.mimeType,
          upsert: false,
        });

      if (uploadError) {
        Alert.alert('エラー', 'ファイルのアップロードに失敗しました: ' + uploadError.message);
        return;
      }

      // 公開URLを取得
      const { data: urlData } = supabase.storage
        .from('trip_documents')
        .getPublicUrl(filePath);

      // trip_documentsテーブルに記録
      await supabase.from('trip_documents').insert([{
        trip_id: id,
        category,
        title: picked.name,
        file_url: urlData.publicUrl,
      }]);

      fetchAll();
      Alert.alert('完了', 'PDFを追加しました');
    } catch (error) {
      console.error('PDF upload error:', error);
      Alert.alert('エラー', 'PDFのアップロードに失敗しました');
    }
  };

  // ===== 削除/編集アクション =====
  const showItemActions = (table: string, itemId: string, label: string, editCallback: () => void) => {
    Alert.alert(label, 'この項目をどうしますか？', [
      { text: '編集', onPress: editCallback },
      { text: '削除', style: 'destructive', onPress: async () => { await supabase.from(table).delete().eq('id', itemId); fetchAll(); } },
      { text: 'キャンセル', style: 'cancel' },
    ]);
  };

  // ===== 旅程削除 =====
  const deleteTrip = () => {
    Alert.alert(
      '旅程を削除',
      `「${trip?.name}」を完全に削除しますか？\nフライト・ホテル・書類など関連データもすべて削除されます。`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除する', style: 'destructive',
          onPress: async () => {
            // 関連データを先に削除
            await supabase.from('flights').delete().eq('trip_id', id);
            await supabase.from('hotels').delete().eq('trip_id', id);
            await supabase.from('trip_documents').delete().eq('trip_id', id);
            await supabase.from('trip_insurances').delete().eq('trip_id', id);
            await supabase.from('entry_requirements').delete().eq('trip_id', id);
            await supabase.from('trips').delete().eq('id', id);
            router.back();
          },
        },
      ]
    );
  };

  // ===== お忍び旅行の切り替え =====
  const toggleSecret = async () => {
    if (!trip) return;
    if (!trip.is_secret) {
      // 通常 → お忍び：Face IDで認証してから切り替え
      const auth = await LocalAuthentication.authenticateAsync({ promptMessage: 'お忍び旅行に変更します' });
      if (!auth.success) return;
      const { error } = await supabase.from('trips').update({ is_secret: true }).eq('id', id);
      if (!error) { setTrip({ ...trip, is_secret: true }); Alert.alert('🔒', 'お忍び旅行に変更しました'); }
    } else {
      // お忍び → 通常に戻す
      const auth = await LocalAuthentication.authenticateAsync({ promptMessage: 'お忍び旅行を解除します' });
      if (!auth.success) return;
      const { error } = await supabase.from('trips').update({ is_secret: false }).eq('id', id);
      if (!error) { setTrip({ ...trip, is_secret: false }); Alert.alert('🔓', 'お忍び旅行を解除しました'); }
    }
  };

  // ===== 旅程アクションメニュー =====
  const showTripActions = () => {
    const secretLabel = trip?.is_secret ? '🔓 お忍び旅行を解除' : '🔒 お忍び旅行に変更';
    Alert.alert('旅程の管理', undefined, [
      { text: secretLabel, onPress: toggleSecret },
      { text: '🗑️ この旅程を削除', style: 'destructive', onPress: deleteTrip },
      { text: 'キャンセル', style: 'cancel' },
    ]);
  };

  const getFlag = () => COUNTRY_LIST.find(c=>c.code===trip?.country_code)?.flag||'🌍';

  if(!trip) return <View style={[s.container,{justifyContent:'center',alignItems:'center'}]}><Image source={MASCOT.running} style={{width:80,height:80,marginBottom:12}} resizeMode="contain"/><Text style={{color:'#9CA3AF',fontSize:14}}>読み込み中...</Text></View>;

  const headerImg = COUNTRY_HEADERS[trip?.country_code] || DEFAULT_HEADER;

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={{paddingBottom:40}}>
        {/* 国別ヘッダー画像 */}
        <View style={{marginHorizontal:16,marginTop:12,borderRadius:16,overflow:'hidden'}}>
          <ImageBackground
            source={headerImg}
            style={{width:'100%',aspectRatio:1.8,justifyContent:'flex-end',padding:14}}
            imageStyle={{resizeMode:'cover'}}
          >
            {/* 旅程管理メニューボタン */}
            <TouchableOpacity
              onPress={showTripActions}
              style={{position:'absolute',top:10,right:10,backgroundColor:'rgba(0,0,0,0.45)',borderRadius:16,width:32,height:32,justifyContent:'center',alignItems:'center',zIndex:10}}
            >
              <Text style={{color:'#FFF',fontSize:18,fontWeight:'700',lineHeight:20}}>⋯</Text>
            </TouchableOpacity>
            {trip.is_secret && (
              <View style={{position:'absolute',top:10,left:10,backgroundColor:'rgba(124,58,237,0.85)',borderRadius:12,paddingHorizontal:8,paddingVertical:4,flexDirection:'row',alignItems:'center'}}>
                <Image source={MASCOT.key} style={{width:16,height:16,marginRight:4}} resizeMode="contain"/>
                <Text style={{color:'#FFF',fontSize:11,fontWeight:'600'}}>お忍び</Text>
              </View>
            )}
            <View style={{backgroundColor:'rgba(0,0,0,0.45)',borderRadius:12,padding:12,flexDirection:'row',alignItems:'center'}}>
              <Text style={{fontSize:36}}>{getFlag()}</Text>
              <View style={{marginLeft:10,flex:1}}>
                <Text style={{fontSize:18,fontWeight:'800',color:'#FFF'}}>{trip.name}</Text>
                <View style={{flexDirection:'row',alignItems:'center',marginTop:2}}>
                  <Text style={{fontSize:12,color:'#E5E7EB'}}>{trip.destination} ・ {trip.departure_date}{trip.return_date?` → ${trip.return_date}`:''}</Text>
                  <TouchableOpacity
                    onPress={() => { setEditDepDate(trip.departure_date); setEditRetDate(trip.return_date || ''); setShowEditDates(true); }}
                    style={{marginLeft:8,backgroundColor:'rgba(255,255,255,0.25)',borderRadius:10,paddingHorizontal:6,paddingVertical:2}}
                  ><Text style={{fontSize:11,color:'#FFF'}}>✏️ 変更</Text></TouchableOpacity>
                </View>
              </View>
            </View>
          </ImageBackground>
        </View>

        {/* ===== 外務省 危険レベル警告バナー ===== */}
        {dangerInfo && dangerInfo.level >= 1 && (() => {
          const cfg = DANGER_LEVEL_CONFIG[dangerInfo.level] || DANGER_LEVEL_CONFIG[0];
          return (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                if (dangerInfo.sourceUrl) Linking.openURL(dangerInfo.sourceUrl);
              }}
              style={{
                marginHorizontal: 16, marginTop: 8, borderRadius: 12, padding: 14,
                backgroundColor: cfg.bgColor,
                borderWidth: dangerInfo.level >= 3 ? 2 : 1,
                borderColor: cfg.color,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ fontSize: 20, marginRight: 8 }}>{cfg.icon}</Text>
                <Text style={{ fontSize: 15, fontWeight: '800', color: cfg.color, flex: 1 }}>
                  外務省 危険情報: {cfg.label}
                </Text>
              </View>
              <Text style={{ fontSize: 13, color: cfg.color, lineHeight: 18 }}>
                {cfg.description}
              </Text>
              {dangerInfo.alerts && dangerInfo.alerts.length > 0 && (
                <Text style={{ fontSize: 12, color: cfg.color, marginTop: 6, opacity: 0.85 }} numberOfLines={2}>
                  {dangerInfo.alerts[0]}
                </Text>
              )}
              {dangerInfo.regionInfo && dangerInfo.regionInfo.length > 0 && (
                <View style={{ marginTop: 8, borderTopWidth: 1, borderTopColor: cfg.color + '30', paddingTop: 6 }}>
                  {dangerInfo.regionInfo.slice(0, 3).map((r, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                      <Text style={{ fontSize: 11, color: cfg.color, opacity: 0.7, width: 16 }}>
                        {DANGER_LEVEL_CONFIG[r.level]?.icon || '•'}
                      </Text>
                      <Text style={{ fontSize: 11, color: cfg.color, flex: 1 }}>
                        {r.region}: {DANGER_LEVEL_CONFIG[r.level]?.label || `Lv${r.level}`}
                      </Text>
                    </View>
                  ))}
                  {dangerInfo.regionInfo.length > 3 && (
                    <Text style={{ fontSize: 11, color: cfg.color, opacity: 0.6, marginTop: 2 }}>
                      ...他{dangerInfo.regionInfo.length - 3}地域
                    </Text>
                  )}
                </View>
              )}
              <Text style={{ fontSize: 10, color: cfg.color, opacity: 0.5, marginTop: 6, textAlign: 'right' }}>
                タップで外務省サイトを確認 →
              </Text>
            </TouchableOpacity>
          );
        })()}

        <View style={{paddingHorizontal:16,paddingTop:12}}>

        {/* ===== 観光・食ガイドボタン ===== */}
        <TouchableOpacity
          style={{backgroundColor:'#FFF7ED',borderRadius:16,padding:16,marginBottom:16,borderWidth:1,borderColor:'#FB923C',flexDirection:'row',alignItems:'center'}}
          onPress={openCityGuide}
          activeOpacity={0.7}
        >
          <Text style={{fontSize:28,marginRight:12}}>🗺️</Text>
          <View style={{flex:1}}>
            <Text style={{fontSize:16,fontWeight:'700',color:'#9A3412'}}>観光・食ガイド</Text>
            <Text style={{fontSize:12,color:'#C2410C',marginTop:2}}>{trip?.destination||trip?.name||''} の観光名所とグルメ情報</Text>
          </View>
          <Text style={{fontSize:18,color:'#FB923C'}}>›</Text>
        </TouchableOpacity>

        {/* ===== フライト ===== */}
        <View style={s.section}>
          <View style={s.secHead}>
            <Text style={s.secTitle}>✈️ フライト</Text>
            <TouchableOpacity style={s.addBtn} onPress={()=>setAddType('flight')}><Text style={s.addBtnText}>＋</Text></TouchableOpacity>
          </View>
          {flights.length===0 ? <View style={{alignItems:'center',paddingVertical:8}}><Image source={MASCOT.happy} style={{width:48,height:48,marginBottom:4}} resizeMode="contain"/><Text style={s.emptyText}>フライト情報を追加しましょう</Text></View> :
            flights.map(fl=>{
              const ci=getCheckinStatus(fl);
              const rule=fl.airline?AIRLINE_CHECKIN_RULES[fl.airline]:null;
              const ciTimes=getCheckinTimes(fl);
              const depTerminal=fl.departure_airport&&fl.airline?getTerminal(fl.departure_airport,fl.airline):null;
              const arrTerminal=fl.arrival_airport&&fl.airline?getTerminal(fl.arrival_airport,fl.airline):null;
              const depMap=fl.departure_airport?AIRPORT_MAP_URLS[fl.departure_airport]:null;
              const arrMap=fl.arrival_airport?AIRPORT_MAP_URLS[fl.arrival_airport]:null;
              return(
              <TouchableOpacity key={fl.id} style={s.card} onLongPress={()=>showItemActions('flights',fl.id,`${rule?.name||fl.airline||''} ${fl.flight_number||''}`,()=>{const depDt=fl.departure_time?new Date(fl.departure_time):null;const arrDt=fl.arrival_time?new Date(fl.arrival_time):null;setFf({airline:fl.airline||'',flight_number:fl.flight_number||'',dep_airport:fl.departure_airport||'',arr_airport:fl.arrival_airport||'',dep_date:fl.departure_time?fl.departure_time.split('T')[0]:'',dep_time:depDt?`${depDt.getHours().toString().padStart(2,'0')}:${depDt.getMinutes().toString().padStart(2,'0')}`:'',arr_date:arrDt&&fl.arrival_time?fl.arrival_time.split('T')[0]:'',arr_time:arrDt?`${arrDt.getHours().toString().padStart(2,'0')}:${arrDt.getMinutes().toString().padStart(2,'0')}`:'',ref:fl.booking_reference||'',seat:fl.seat||'',});setEditingFlightId(fl.id);setAddType('flight');})} activeOpacity={0.8}>
                <View style={{flexDirection:'row',justifyContent:'space-between',marginBottom:8}}>
                  <Text style={s.cardTitle}>{rule?.name||fl.airline||'未設定'} {fl.flight_number||''}</Text>
                  {fl.booking_reference?<Text style={s.refBadge}>予約:{fl.booking_reference}</Text>:null}
                </View>
                <View style={{flexDirection:'row',alignItems:'center',justifyContent:'center',marginBottom:6}}>
                  <View style={{alignItems:'center',flex:1}}>
                    <Text style={s.code}>{fl.departure_airport||'---'}</Text>
                    <Text style={{fontSize:12,color:'#374151',fontWeight:'600'}}>{fl.departure_airport?(AIRPORT_NAMES[fl.departure_airport]||fl.departure_airport):'未設定'}</Text>
                    {depTerminal&&<View style={{backgroundColor:'#DBEAFE',paddingHorizontal:6,paddingVertical:2,borderRadius:6,marginTop:2}}><Text style={{fontSize:11,fontWeight:'700',color:'#1D4ED8'}}>{depTerminal}</Text></View>}
                    {fl.departure_time?<Text style={s.sub}>{fmtDateTime(fl.departure_time)}</Text>:<Text style={s.sub}>日時未定</Text>}
                  </View>
                  <View style={s.line}/>
                  <View style={{alignItems:'center',flex:1}}>
                    <Text style={s.code}>{fl.arrival_airport||'---'}</Text>
                    <Text style={{fontSize:12,color:'#374151',fontWeight:'600'}}>{fl.arrival_airport?(AIRPORT_NAMES[fl.arrival_airport]||fl.arrival_airport):'未設定'}</Text>
                    {arrTerminal&&<View style={{backgroundColor:'#DBEAFE',paddingHorizontal:6,paddingVertical:2,borderRadius:6,marginTop:2}}><Text style={{fontSize:11,fontWeight:'700',color:'#1D4ED8'}}>{arrTerminal}</Text></View>}
                    {fl.arrival_time&&<Text style={s.sub}>{fmtDateTime(fl.arrival_time)}</Text>}
                  </View>
                </View>
                {fl.seat&&<Text style={s.detail}>座席: {fl.seat}</Text>}
                {/* 搭乗者 */}
                <TouchableOpacity
                  style={{backgroundColor:'#F0F9FF',borderRadius:10,padding:10,marginTop:6,flexDirection:'row',alignItems:'center'}}
                  onPress={()=>openPassengerModal(fl.id)}
                >
                  <Text style={{fontSize:14,marginRight:8}}>👥</Text>
                  <View style={{flex:1}}>
                    {(flightPassengers[fl.id]||[]).length > 0 ? (
                      <Text style={{fontSize:13,color:'#1F2937'}}>{getPassengerNames(fl.id)}</Text>
                    ) : (
                      <Text style={{fontSize:13,color:'#9CA3AF'}}>搭乗者を設定</Text>
                    )}
                  </View>
                  <Text style={{fontSize:12,color:'#0891B2',fontWeight:'600'}}>
                    {(flightPassengers[fl.id]||[]).length > 0 ? '編集' : '追加'}
                  </Text>
                </TouchableOpacity>
                {/* チェックインステータス */}
                <View style={[s.statusBadge,{backgroundColor:ci.c+'18'}]}><Text style={[s.statusText,{color:ci.c}]}>{ci.l}</Text></View>
                {/* チェックイン日時詳細 */}
                {ciTimes&&<View style={{backgroundColor:'#F8FAFC',borderRadius:10,padding:10,marginTop:6}}>
                  <Text style={{fontSize:12,fontWeight:'600',color:'#374151',marginBottom:4}}>🕐 チェックイン</Text>
                  <View style={{flexDirection:'row',justifyContent:'space-between'}}>
                    <Text style={{fontSize:12,color:'#059669'}}>開始: {ciTimes.open}</Text>
                    <Text style={{fontSize:12,color:'#DC2626'}}>締切: {ciTimes.close}</Text>
                  </View>
                </View>}
                <Text style={{fontSize:10,color:'#9CA3AF',marginTop:4,textAlign:'center'}}>※時刻やターミナルは変更される場合があります。最新情報は航空会社の公式サイト・アプリでご確認ください</Text>
                {/* 空港への経路 & マップ */}
                {fl.departure_airport&&<View style={{flexDirection:'row',gap:6,marginTop:6}}>
                  <TouchableOpacity
                    style={{flex:1,backgroundColor:'#EFF6FF',borderRadius:10,padding:10,flexDirection:'row',alignItems:'center',justifyContent:'center'}}
                    onPress={()=>openGoogleMaps(fl.departure_airport!)}
                  >
                    <Text style={{fontSize:13}}>🗺️</Text>
                    <Text style={{fontSize:12,color:'#2563EB',fontWeight:'600',marginLeft:4}}>
                      {AIRPORT_NAMES[fl.departure_airport!]||fl.departure_airport}への経路
                    </Text>
                  </TouchableOpacity>
                  {depMap&&(
                    <TouchableOpacity
                      style={{backgroundColor:'#F5F3FF',borderRadius:10,padding:10,flexDirection:'row',alignItems:'center',justifyContent:'center'}}
                      onPress={()=>Linking.openURL(depMap.url)}
                    >
                      <Text style={{fontSize:13}}>🏢</Text>
                      <Text style={{fontSize:12,color:'#7C3AED',fontWeight:'600',marginLeft:4}}>空港MAP</Text>
                    </TouchableOpacity>
                  )}
                </View>}
                {/* 到着空港マップ（あれば） */}
                {arrMap&&(
                  <TouchableOpacity
                    style={{backgroundColor:'#F5F3FF',borderRadius:10,padding:8,marginTop:4,flexDirection:'row',alignItems:'center',justifyContent:'center'}}
                    onPress={()=>Linking.openURL(arrMap.url)}
                  >
                    <Text style={{fontSize:12}}>🏢</Text>
                    <Text style={{fontSize:11,color:'#7C3AED',fontWeight:'600',marginLeft:4}}>
                      到着: {AIRPORT_NAMES[fl.arrival_airport!]||fl.arrival_airport} MAP
                    </Text>
                  </TouchableOpacity>
                )}
                {/* 空港AIガイドボタン */}
                {fl.departure_airport&&<View style={{flexDirection:'row',gap:6,marginTop:6}}>
                  <TouchableOpacity
                    style={{flex:1,backgroundColor:'#FEF3C7',borderRadius:10,padding:10,flexDirection:'row',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'#F59E0B'}}
                    onPress={()=>openAirportGuide(fl.departure_airport!, fl.airline||'')}
                  >
                    <Text style={{fontSize:13}}>🤖</Text>
                    <Text style={{fontSize:12,color:'#92400E',fontWeight:'600',marginLeft:4}}>
                      {AIRPORT_NAMES[fl.departure_airport!]||fl.departure_airport} ガイド
                    </Text>
                  </TouchableOpacity>
                  {fl.arrival_airport&&(
                    <TouchableOpacity
                      style={{flex:1,backgroundColor:'#FEF3C7',borderRadius:10,padding:10,flexDirection:'row',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'#F59E0B'}}
                      onPress={()=>openAirportGuide(fl.arrival_airport!, fl.airline||'')}
                    >
                      <Text style={{fontSize:13}}>🤖</Text>
                      <Text style={{fontSize:12,color:'#92400E',fontWeight:'600',marginLeft:4}}>
                        {AIRPORT_NAMES[fl.arrival_airport]||fl.arrival_airport} ガイド
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>}
              </TouchableOpacity>
            );})
          }
        </View>

        {/* ===== ホテル ===== */}
        <View style={s.section}>
          <View style={s.secHead}>
            <Text style={s.secTitle}>🏨 ホテル</Text>
            <TouchableOpacity style={s.addBtn} onPress={()=>setAddType('hotel')}><Text style={s.addBtnText}>＋</Text></TouchableOpacity>
          </View>
          {hotels.length===0 ? <View style={{alignItems:'center',paddingVertical:8}}><Image source={MASCOT.wink} style={{width:48,height:48,marginBottom:4}} resizeMode="contain"/><Text style={s.emptyText}>ホテル情報を追加しましょう</Text></View> :
            hotels.map(ht=>(
              <TouchableOpacity key={ht.id} style={s.card} onLongPress={()=>showItemActions('hotels',ht.id,ht.name,()=>{setHf({name:ht.name,checkin:ht.checkin_date,checkout:ht.checkout_date,checkin_time:ht.checkin_time||'',checkout_time:ht.checkout_time||'',address:ht.address||'',ref:ht.booking_reference||'',room:ht.room_type||'',notes:ht.notes||'',loyalty:ht.loyalty_program||''});setEditingHotelId(ht.id);setAddType('hotel');})}>
                <Text style={s.cardTitle}>{ht.name}</Text>
                <View style={{flexDirection:'row',alignItems:'center',marginTop:8,marginBottom:6}}>
                  <View style={{flex:1}}><Text style={s.sub}>チェックイン</Text><Text style={s.dateVal}>{fmtDate(ht.checkin_date)}</Text>{ht.checkin_time&&<Text style={{fontSize:12,color:'#059669',marginTop:1}}>🕐 {ht.checkin_time}</Text>}</View>
                  <View style={s.nightBadge}><Text style={s.nightNum}>{getNights(ht.checkin_date,ht.checkout_date)}</Text><Text style={s.nightLabel}>泊</Text></View>
                  <View style={{flex:1,alignItems:'flex-end'}}><Text style={s.sub}>チェックアウト</Text><Text style={s.dateVal}>{fmtDate(ht.checkout_date)}</Text>{ht.checkout_time&&<Text style={{fontSize:12,color:'#DC2626',marginTop:1}}>🕐 {ht.checkout_time}</Text>}</View>
                </View>
                {ht.room_type&&<Text style={s.detail}>部屋: {ht.room_type}</Text>}
                {ht.address&&<Text style={s.detail}>📍 {ht.address}</Text>}
                {ht.booking_reference&&<Text style={s.detail}>予約: {ht.booking_reference}</Text>}
                {ht.loyalty_program&&<Text style={s.detail}>🏷️ 会員: {ht.loyalty_program}</Text>}
              </TouchableOpacity>
            ))
          }
        </View>

        {/* ===== 入国要件 ===== */}
        <View style={s.section}>
          <View style={s.secHead}>
            <Text style={s.secTitle}>📋 入国要件</Text>
            <TouchableOpacity style={s.addBtn} onPress={generateReqs}><Text style={s.addBtnText}>自動生成</Text></TouchableOpacity>
          </View>
          {reqs.length===0 ? <Text style={s.emptyText}>「自動生成」で入国要件を確認</Text> :
            reqs.map(r=>{
              const colors={not_applied:'#EF4444',applied:'#F59E0B',approved:'#10B981'};
              const labels={not_applied:'未申請',applied:'申請済',approved:'承認済'};
              return(
                <TouchableOpacity key={r.id} style={s.card} onPress={()=>cycleReqStatus(r)}
                  onLongPress={()=>showItemActions('entry_requirements',r.id,r.label,()=>{})}>
                  <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
                    <Text style={s.cardTitle}>{r.label}</Text>
                    <View style={[s.reqBadge,{backgroundColor:colors[r.status]+'20'}]}>
                      <View style={[s.reqDot,{backgroundColor:colors[r.status]}]}/>
                      <Text style={[s.reqLabel,{color:colors[r.status]}]}>{labels[r.status]}</Text>
                    </View>
                  </View>
                  <Text style={[s.sub,{marginTop:4}]}>タップでステータス変更</Text>
                </TouchableOpacity>
              );
            })
          }
        </View>

        {/* ===== 旅行保険 ===== */}
        <View style={s.section}>
          <View style={s.secHead}>
            <Text style={s.secTitle}>🛡️ 旅行保険</Text>
            <TouchableOpacity style={s.addBtn} onPress={()=>setAddType('insurance')}><Text style={s.addBtnText}>＋</Text></TouchableOpacity>
          </View>
          {insurances.length===0 ? <View style={{alignItems:'center',paddingVertical:8}}><Image source={MASCOT.sad} style={{width:48,height:48,marginBottom:4}} resizeMode="contain"/><Text style={s.emptyText}>旅行保険情報を追加しましょう</Text></View> :
            insurances.map(ins=>(
              <TouchableOpacity key={ins.id} style={s.card} onLongPress={()=>showItemActions('trip_insurances',ins.id,ins.company,()=>{setInsf({company:ins.company,policy_number:ins.policy_number||'',phone:ins.phone||'',coverage:ins.coverage_type||'',notes:ins.notes||''});setEditingInsuranceId(ins.id);setAddType('insurance');})}>
                <Text style={s.cardTitle}>{ins.company}</Text>
                {ins.policy_number&&<Text style={s.detail}>証券番号: {ins.policy_number}</Text>}
                {ins.phone&&<Text style={s.detail}>緊急連絡先: {ins.phone}</Text>}
                {ins.coverage_type&&<Text style={s.detail}>補償: {ins.coverage_type}</Text>}
                {ins.notes&&<Text style={[s.detail,{marginTop:4}]}>{ins.notes}</Text>}
              </TouchableOpacity>
            ))
          }
          {/* 保険AI相談ボタン */}
          <TouchableOpacity
            style={{backgroundColor:'#FEF3C7',borderRadius:14,padding:14,marginTop:8,flexDirection:'row',alignItems:'center',justifyContent:'center',borderWidth:1.5,borderColor:'#F59E0B'}}
            onPress={()=>setShowConsult(true)}
          >
            <Text style={{fontSize:16}}>🤖</Text>
            <Text style={{fontSize:14,color:'#92400E',fontWeight:'700',marginLeft:8}}>トラブル発生？AIに相談</Text>
          </TouchableOpacity>
        </View>

        {/* ===== 書類 ===== */}
        <View style={s.section}>
          <View style={s.secHead}>
            <Text style={s.secTitle}>📄 書類・スクリーンショット</Text>
            <TouchableOpacity style={s.addBtn} onPress={()=>setShowDocCat(true)}><Text style={s.addBtnText}>＋</Text></TouchableOpacity>
          </View>
          {docs.length===0 ? <View style={{alignItems:'center',paddingVertical:8}}><Image source={MASCOT.excited} style={{width:48,height:48,marginBottom:4}} resizeMode="contain"/><Text style={s.emptyText}>書類やスクリーンショットを追加</Text></View> :
            docs.map(d=>{
              const isPDF = d.file_url?.toLowerCase().endsWith('.pdf') || d.file_url?.includes('application/pdf');
              return (
                <TouchableOpacity key={d.id} style={[s.card,{flexDirection:'row',alignItems:'center'}]}
                  onPress={()=>{
                    if(isPDF && d.file_url) {
                      Linking.openURL(d.file_url).catch(err => Alert.alert('エラー','PDFを開けませんでした'));
                    } else if(d.file_url) {
                      setSelectedImage(d.file_url);
                    }
                  }}
                  onLongPress={()=>showItemActions('trip_documents',d.id,d.title,()=>{})}>
                  {!isPDF && d.file_url && !d.file_url.includes('storage.googleapis.com/trip')?
                    <Image source={{uri:d.file_url}} style={s.thumb}/>:
                    <View style={[s.thumb,{justifyContent:'center',alignItems:'center',backgroundColor:isPDF?'#F3F4F6':'transparent'}]}>
                      <Text style={{fontSize:24}}>{isPDF?'📎':DOC_ICONS[d.category]||'📎'}</Text>
                    </View>
                  }
                  <View style={{flex:1}}>
                    <Text style={{fontSize:15,fontWeight:'600',color:'#1F2937'}}>{d.title}</Text>
                    <Text style={{fontSize:12,color:'#9CA3AF',marginTop:2}}>{isPDF?'📎 PDF':DOC_ICONS[d.category]+' '+DOCUMENT_CATEGORIES[d.category]}</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          }
        </View>

        {/* ===== 旅の思い出 ===== */}
        <View style={s.section}>
          <View style={s.secHead}>
            <Text style={s.secTitle}>📸 旅の思い出</Text>
            <TouchableOpacity style={s.addBtn} onPress={addMemory}><Text style={s.addBtnText}>＋</Text></TouchableOpacity>
          </View>
          {memories.length===0 ? (
            <View style={{alignItems:'center',paddingVertical:8}}>
              <Image source={MASCOT.wink} style={{width:48,height:48,marginBottom:4}} resizeMode="contain"/>
              <Text style={s.emptyText}>写真や動画を追加しましょう</Text>
              <Text style={{fontSize:11,color:'#9CA3AF',marginTop:4}}>🔒 端末内にのみ保存されます</Text>
            </View>
          ) : (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginTop:4}}>
                {memories.map((uri,i) => (
                  <TouchableOpacity key={i} onPress={()=>setSelectedImage(uri)}
                    onLongPress={()=>Alert.alert('削除','この写真を削除しますか？',[{text:'キャンセル',style:'cancel'},{text:'削除',style:'destructive',onPress:async()=>{const f=new File(uri);if(f.exists)f.delete();loadMemories();}}])}>
                    <Image source={{uri}} style={{width:80,height:80,borderRadius:10,marginRight:8}} resizeMode="cover"/>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={{fontSize:11,color:'#9CA3AF',marginTop:6}}>🔒 端末内にのみ保存（{memories.length}枚）</Text>
            </>
          )}
        </View>

        {/* ===== パッキングリスト ===== */}
        {packingCategories.length > 0 && (
          <View style={s.section}>
            <View style={s.secHead}>
              <Text style={s.secTitle}>🧳 パッキングリスト</Text>
              <TouchableOpacity onPress={() => setShowPackingDetail(!showPackingDetail)}>
                <Text style={{fontSize:13,color:'#0891B2',fontWeight:'600'}}>{showPackingDetail ? '閉じる' : '詳細'}</Text>
              </TouchableOpacity>
            </View>
            {/* プログレスバー */}
            {(() => {
              const progress = getPackingProgress(packingCategories, packingChecks);
              return (
                <View style={[s.card, {backgroundColor:'#F0FDF4',borderWidth:1,borderColor:'#BBF7D0'}]}>
                  <View style={{flexDirection:'row',justifyContent:'space-between',marginBottom:8}}>
                    <Text style={{fontSize:14,fontWeight:'700',color:'#166534'}}>準備状況</Text>
                    <Text style={{fontSize:14,fontWeight:'700',color:'#166534'}}>{progress.checked}/{progress.total}（{progress.percent}%）</Text>
                  </View>
                  <View style={{height:10,backgroundColor:'#DCFCE7',borderRadius:5,overflow:'hidden'}}>
                    <View style={{height:10,backgroundColor:'#22C55E',borderRadius:5,width:`${progress.percent}%` as any}}/>
                  </View>
                  {progress.essentialTotal > 0 && (
                    <Text style={{fontSize:11,color:'#166534',marginTop:6}}>
                      必須アイテム: {progress.essentialChecked}/{progress.essentialTotal}
                      {progress.essentialChecked === progress.essentialTotal ? ' ✅ 完了！' : ''}
                    </Text>
                  )}
                </View>
              );
            })()}
            {/* カテゴリ別アイテム（詳細展開時） */}
            {showPackingDetail && packingCategories.map(cat => (
              <View key={cat.id} style={[s.card,{marginTop:8}]}>
                <TouchableOpacity onPress={() => setExpandedPackingCat(expandedPackingCat === cat.id ? null : cat.id)} style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>
                  <Text style={{fontSize:14,fontWeight:'700',color:'#1F2937'}}>{cat.emoji} {cat.title}</Text>
                  <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
                    <Text style={{fontSize:12,color:'#6B7280'}}>
                      {cat.items.filter(i => packingChecks[i.id]).length}/{cat.items.length}
                    </Text>
                    <Text style={{fontSize:14,color:'#9CA3AF'}}>{expandedPackingCat === cat.id ? '▼' : '›'}</Text>
                  </View>
                </TouchableOpacity>
                {expandedPackingCat === cat.id && (
                  <View style={{marginTop:10}}>
                    {cat.items.map(item => (
                      <TouchableOpacity
                        key={item.id}
                        onPress={async () => {
                          const newChecks = {...packingChecks, [item.id]: !packingChecks[item.id]};
                          setPackingChecks(newChecks);
                          if (trip) await savePackingChecks(trip.id, newChecks);
                        }}
                        style={{flexDirection:'row',alignItems:'center',paddingVertical:8,borderBottomWidth:1,borderBottomColor:'#F3F4F6'}}
                      >
                        <Text style={{fontSize:18,marginRight:10}}>{packingChecks[item.id] ? '☑️' : '⬜'}</Text>
                        <View style={{flex:1}}>
                          <Text style={{fontSize:13,color: packingChecks[item.id] ? '#9CA3AF' : '#1F2937',textDecorationLine: packingChecks[item.id] ? 'line-through' : 'none',fontWeight: item.essential ? '700' : '400'}}>
                            {item.emoji} {item.name}{item.essential ? ' *' : ''}{item.quantity > 1 ? ` ×${item.quantity}` : ''}
                          </Text>
                          {item.note && <Text style={{fontSize:11,color:'#9CA3AF',marginTop:2}}>{item.note}</Text>}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* ===== 旅程タイムライン ===== */}
        {trip?.departure_date && (
          <View style={s.section}>
            <View style={s.secHead}>
              <Text style={s.secTitle}>📅 旅程タイムライン</Text>
              <TouchableOpacity style={s.addBtn} onPress={() => {
                // 展開中の日があればその日付、なければ出発日
                if (expandedDay !== null && daySchedules[expandedDay]) {
                  setNewEventDate(daySchedules[expandedDay].date);
                } else if (trip) {
                  setNewEventDate(trip.departure_date);
                }
                setNewEventTime('10:00');
                setNewEventType('sightseeing');
                setNewEventTitle('');
                setNewEventLocation('');
                setNewEventNote('');
                setDayGuideCity('');
                setDayGuideData(null);
                setDayGuideAIResult('');
                setShowAddEvent(true);
              }}><Text style={s.addBtnText}>＋</Text></TouchableOpacity>
            </View>
            {/* 日別スケジュール */}
            {daySchedules.map((day, idx) => (
              <TouchableOpacity
                key={day.date}
                style={[s.card, {marginTop: idx > 0 ? 8 : 0, borderLeftWidth: 3, borderLeftColor: day.events.length > 0 ? '#0891B2' : '#E5E7EB'}]}
                onPress={() => setExpandedDay(expandedDay === idx ? null : idx)}
                activeOpacity={0.7}
              >
                <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>
                  <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
                    <Text style={{fontSize:14,fontWeight:'700',color:'#0891B2'}}>{day.dayLabel}</Text>
                    <Text style={{fontSize:13,color:'#6B7280'}}>{formatDateJa(day.date)}</Text>
                  </View>
                  <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
                    {day.events.length > 0 && (
                      <Text style={{fontSize:12,color:'#6B7280'}}>{day.events.length}件</Text>
                    )}
                    <Text style={{fontSize:14,color:'#9CA3AF'}}>{expandedDay === idx ? '▼' : '›'}</Text>
                  </View>
                </View>
                {/* イベント概要（折りたたみ時） */}
                {expandedDay !== idx && day.events.length > 0 && (
                  <View style={{flexDirection:'row',flexWrap:'wrap',marginTop:6,gap:4}}>
                    {day.events.slice(0, 4).map(ev => (
                      <Text key={ev.id} style={{fontSize:11,color:'#6B7280'}}>{EVENT_TYPE_CONFIG[ev.type].emoji} {ev.title.slice(0, 10)}</Text>
                    ))}
                    {day.events.length > 4 && <Text style={{fontSize:11,color:'#9CA3AF'}}>+{day.events.length - 4}</Text>}
                  </View>
                )}
                {/* 展開時のタイムライン */}
                {expandedDay === idx && (
                  <View style={{marginTop:12}}>
                    {day.events.length === 0 ? (
                      <Text style={{fontSize:12,color:'#9CA3AF',textAlign:'center',paddingVertical:8}}>予定なし</Text>
                    ) : (
                      day.events.map((ev, evIdx) => {
                        const config = EVENT_TYPE_CONFIG[ev.type];
                        return (
                          <View key={ev.id} style={{flexDirection:'row',marginBottom: evIdx < day.events.length - 1 ? 12 : 0}}>
                            {/* 時刻 */}
                            <View style={{width:50,alignItems:'flex-end',marginRight:10}}>
                              <Text style={{fontSize:13,fontWeight:'700',color:'#374151'}}>{ev.time}</Text>
                            </View>
                            {/* タイムラインドット */}
                            <View style={{alignItems:'center',width:16}}>
                              <View style={{width:10,height:10,borderRadius:5,backgroundColor:config.color}}/>
                              {evIdx < day.events.length - 1 && (
                                <View style={{width:2,flex:1,backgroundColor:'#E5E7EB',marginTop:2}}/>
                              )}
                            </View>
                            {/* イベント内容 */}
                            <TouchableOpacity
                              style={{flex:1,marginLeft:8,backgroundColor:config.bgColor,borderRadius:8,padding:8,borderWidth:1,borderColor:config.color+'30'}}
                              onPress={async () => {
                                // guideKeyがあればそれで、なければタイトル・場所名からガイドを検索
                                if (ev.guideKey) {
                                  openGuideByKey(ev.guideKey, ev.location || ev.title);
                                  return;
                                }
                                // タイトルや場所名でガイド検索を試みる
                                const searchTerms = [ev.title, ev.location].filter(Boolean) as string[];
                                for (const term of searchTerms) {
                                  const result = findGuideByKeyword(term);
                                  if (result) {
                                    openGuideByKey(result.guideKey, result.regionName);
                                    return;
                                  }
                                }
                                // ガイドが見つからない場合 → キャッシュ確認 → AI生成で開く
                                if (!ev.isAutoGenerated) {
                                  const cityName = ev.location || ev.title;
                                  setCityGuideDestinations([{ airportCode: '', regionName: cityName, guide: null }]);
                                  setCityGuideSelectedIdx(0);
                                  setCityGuideData(null);
                                  setCityGuideTab('tourism');
                                  setShowCityGuide(true);
                                  // キャッシュ確認してから表示
                                  const cached = await getCachedGuideItems(cityName, 'both');
                                  if (cached?.rawText) {
                                    setCityGuideAIResult(cached.rawText);
                                    setCityGuideAIItems(cached.items || []);
                                    setCityGuideAILoading(false);
                                  } else {
                                    setCityGuideAIResult('');
                                    setCityGuideAIItems([]);
                                    loadCityGuideAIFor(cityName);
                                  }
                                }
                              }}
                              onLongPress={() => {
                                if (!ev.isAutoGenerated && trip) {
                                  Alert.alert('削除', `「${ev.title}」を削除しますか？`, [
                                    { text: 'キャンセル', style: 'cancel' },
                                    { text: '削除', style: 'destructive', onPress: async () => {
                                      const customEvts = await loadCustomEvents(trip.id);
                                      const filtered = customEvts.filter(e => e.id !== ev.id);
                                      await saveCustomEvents(trip.id, filtered);
                                      fetchAll();
                                    }},
                                  ]);
                                }
                              }}
                            >
                              <View style={{flexDirection:'row',alignItems:'center',gap:4}}>
                                <Text style={{fontSize:14}}>{config.emoji}</Text>
                                <Text style={{fontSize:13,fontWeight:'700',color:config.color,flex:1}}>{ev.title}</Text>
                                {/* ガイドがある場合のアイコン表示 */}
                                {!ev.isAutoGenerated && <Text style={{fontSize:12}}>🗺️</Text>}
                              </View>
                              {ev.subtitle && <Text style={{fontSize:11,color:'#6B7280',marginTop:2}}>{ev.subtitle}</Text>}
                              {ev.location && <Text style={{fontSize:11,color:'#6B7280',marginTop:1}}>📍 {ev.location}</Text>}
                              {ev.note && <Text style={{fontSize:11,color:'#9CA3AF',marginTop:1}}>{ev.note}</Text>}
                              {ev.isAutoGenerated && <Text style={{fontSize:10,color:'#D1D5DB',marginTop:2}}>自動追加</Text>}
                              {!ev.isAutoGenerated && (
                                <Text style={{fontSize:10,color:'#0891B2',marginTop:3}}>タップで観光・食ガイドを見る</Text>
                              )}
                            </TouchableOpacity>
                          </View>
                        );
                      })
                    )}
                    {/* この日に予定を追加ボタン */}
                    <TouchableOpacity
                      onPress={() => {
                        setNewEventDate(day.date);
                        setNewEventTime('10:00');
                        setNewEventType('sightseeing');
                        setNewEventTitle('');
                        setNewEventLocation('');
                        setNewEventNote('');
                        setDayGuideCity('');
                        setDayGuideData(null);
                        setDayGuideAIResult('');
                        setShowAddEvent(true);
                      }}
                      style={{marginTop:10,flexDirection:'row',alignItems:'center',justifyContent:'center',paddingVertical:8,borderRadius:8,borderWidth:1,borderColor:'#0891B2',borderStyle:'dashed',backgroundColor:'#F0FDFA'}}
                    >
                      <Text style={{fontSize:13,color:'#0891B2',fontWeight:'600'}}>＋ この日に予定を追加</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ===== 天気予報 ===== */}
        {(tripWeather.length > 0 || weatherForecast) && (
          <View style={s.section}>
            <View style={s.secHead}>
              <Text style={s.secTitle}>🌤️ 渡航先の天気予報</Text>
              {weatherForecast && <Text style={{fontSize:11,color:'#9CA3AF'}}>{weatherForecast.location}</Text>}
            </View>
            {tripWeather.length > 0 ? (
              <>
                {/* サマリー */}
                {(() => {
                  const ws = getWeatherSummary(tripWeather);
                  return (
                    <View style={[s.card,{backgroundColor:'#EFF6FF',borderWidth:1,borderColor:'#BFDBFE'}]}>
                      <View style={{flexDirection:'row',justifyContent:'space-around',marginBottom:8}}>
                        <View style={{alignItems:'center'}}>
                          <Text style={{fontSize:11,color:'#6B7280'}}>平均最高</Text>
                          <Text style={{fontSize:18,fontWeight:'700',color:'#DC2626'}}>{ws.avgTempMax}°</Text>
                        </View>
                        <View style={{alignItems:'center'}}>
                          <Text style={{fontSize:11,color:'#6B7280'}}>平均最低</Text>
                          <Text style={{fontSize:18,fontWeight:'700',color:'#2563EB'}}>{ws.avgTempMin}°</Text>
                        </View>
                        <View style={{alignItems:'center'}}>
                          <Text style={{fontSize:11,color:'#6B7280'}}>雨の日</Text>
                          <Text style={{fontSize:18,fontWeight:'700',color:'#6B7280'}}>{ws.rainyDays}日</Text>
                        </View>
                      </View>
                      {ws.packingAdvice.map((advice, i) => (
                        <Text key={i} style={{fontSize:12,color:'#1E40AF',marginTop:4}}>{advice}</Text>
                      ))}
                    </View>
                  );
                })()}
                {/* 日別天気 */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginTop:8}}>
                  {tripWeather.map(day => {
                    const w = getWeatherDisplay(day.weatherCode);
                    return (
                      <View key={day.date} style={{alignItems:'center',marginRight:12,paddingVertical:8,paddingHorizontal:6,backgroundColor:'#FFF',borderRadius:12,minWidth:60,borderWidth:1,borderColor:'#E5E7EB'}}>
                        <Text style={{fontSize:11,color:'#6B7280'}}>{day.date.slice(5)}</Text>
                        <Text style={{fontSize:24,marginVertical:4}}>{w.emoji}</Text>
                        <Text style={{fontSize:13,fontWeight:'700',color:'#DC2626'}}>{day.tempMax}°</Text>
                        <Text style={{fontSize:12,color:'#2563EB'}}>{day.tempMin}°</Text>
                        {day.precipitationProb > 0 && (
                          <Text style={{fontSize:10,color:'#6B7280',marginTop:2}}>☔{day.precipitationProb}%</Text>
                        )}
                      </View>
                    );
                  })}
                </ScrollView>
              </>
            ) : (
              <View style={s.card}>
                <Text style={{fontSize:12,color:'#9CA3AF',textAlign:'center'}}>滞在期間の天気データは出発が近づくと表示されます（最大16日先まで）</Text>
              </View>
            )}
          </View>
        )}

        {/* ===== 旅費トラッカー ===== */}
        <View style={s.section}>
          <View style={s.secHead}>
            <Text style={s.secTitle}>💰 旅費トラッカー</Text>
            <TouchableOpacity style={s.addBtn} onPress={() => {
              setExpDate(new Date().toISOString().slice(0,10));
              setExpCategory('food');
              setExpTitle('');
              setExpAmount('');
              setExpPayment('card');
              setShowExpenseForm(true);
            }}><Text style={s.addBtnText}>＋</Text></TouchableOpacity>
          </View>
          {/* サマリー */}
          {(() => {
            const durationDays = trip ? Math.max(1, Math.round((new Date(trip.return_date).getTime() - new Date(trip.departure_date).getTime()) / 86400000)) : 1;
            const summary = calculateSummary(expenses, tripBudget, durationDays);
            const catPcts = getCategoryPercentages(summary);
            return (
              <>
                <View style={[s.card,{backgroundColor:'#FFFBEB',borderWidth:1,borderColor:'#FDE68A'}]}>
                  <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'baseline'}}>
                    <Text style={{fontSize:13,fontWeight:'700',color:'#92400E'}}>合計支出</Text>
                    <Text style={{fontSize:22,fontWeight:'800',color:'#1F2937'}}>{formatJpy(summary.totalJpy)}</Text>
                  </View>
                  <View style={{flexDirection:'row',justifyContent:'space-between',marginTop:8}}>
                    <Text style={{fontSize:12,color:'#6B7280'}}>1日平均: {formatJpy(summary.dailyAverage)}</Text>
                    <Text style={{fontSize:12,color:'#6B7280'}}>{summary.count}件</Text>
                  </View>
                  {summary.budgetRemaining !== null && (
                    <View style={{marginTop:8,paddingTop:8,borderTopWidth:1,borderTopColor:'#FDE68A'}}>
                      <View style={{flexDirection:'row',justifyContent:'space-between'}}>
                        <Text style={{fontSize:12,color:'#6B7280'}}>予算残り</Text>
                        <Text style={{fontSize:14,fontWeight:'700',color:summary.budgetRemaining>=0?'#059669':'#DC2626'}}>
                          {formatJpy(summary.budgetRemaining)}
                        </Text>
                      </View>
                      <View style={{height:6,backgroundColor:'#FEF3C7',borderRadius:3,marginTop:6,overflow:'hidden'}}>
                        <View style={{height:6,backgroundColor:summary.budgetRemaining>=0?'#F59E0B':'#DC2626',borderRadius:3,width:`${Math.min(100,Math.round((summary.totalJpy/(tripBudget?.totalBudgetJpy||1))*100))}%` as any}}/>
                      </View>
                    </View>
                  )}
                </View>
                {/* カテゴリ内訳 */}
                {catPcts.length > 0 && (
                  <View style={[s.card,{marginTop:8}]}>
                    <Text style={{fontSize:13,fontWeight:'700',color:'#1F2937',marginBottom:8}}>カテゴリ内訳</Text>
                    {catPcts.map(cp => (
                      <View key={cp.category} style={{flexDirection:'row',alignItems:'center',marginBottom:6}}>
                        <Text style={{width:24,fontSize:14}}>{cp.emoji}</Text>
                        <Text style={{flex:1,fontSize:12,color:'#4B5563'}}>{cp.label}</Text>
                        <Text style={{fontSize:12,color:'#6B7280',marginRight:8}}>{cp.percent}%</Text>
                        <Text style={{fontSize:13,fontWeight:'600',color:'#1F2937',width:80,textAlign:'right'}}>{formatJpy(cp.amount)}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {/* 直近の支出 */}
                {expenses.length > 0 && (
                  <TouchableOpacity onPress={() => setShowExpenseDetail(!showExpenseDetail)} style={{marginTop:8}}>
                    <Text style={{fontSize:13,color:'#0891B2',fontWeight:'600',textAlign:'center'}}>{showExpenseDetail ? '▲ 閉じる' : `▼ 支出履歴を表示（${expenses.length}件）`}</Text>
                  </TouchableOpacity>
                )}
                {showExpenseDetail && expenses.slice().reverse().map(exp => (
                  <TouchableOpacity
                    key={exp.id}
                    style={[s.card,{marginTop:6,flexDirection:'row',alignItems:'center'}]}
                    onLongPress={() => {
                      Alert.alert('削除', `「${exp.title}」を削除しますか？`, [
                        { text: 'キャンセル', style: 'cancel' },
                        { text: '削除', style: 'destructive', onPress: async () => {
                          const newExps = expenses.filter(e => e.id !== exp.id);
                          setExpenses(newExps);
                          if (trip) await saveExpenses(trip.id, newExps);
                        }},
                      ]);
                    }}
                  >
                    <Text style={{fontSize:20,marginRight:8}}>{EXPENSE_CATEGORIES[exp.category].emoji}</Text>
                    <View style={{flex:1}}>
                      <Text style={{fontSize:13,fontWeight:'600',color:'#1F2937'}}>{exp.title}</Text>
                      <Text style={{fontSize:11,color:'#9CA3AF'}}>{exp.date} {exp.paymentMethod === 'cash' ? '💴' : '💳'}</Text>
                    </View>
                    <View style={{alignItems:'flex-end'}}>
                      <Text style={{fontSize:14,fontWeight:'700',color:'#1F2937'}}>{formatJpy(exp.amountJpy)}</Text>
                      {exp.currency !== 'JPY' && <Text style={{fontSize:11,color:'#9CA3AF'}}>{exp.amount.toLocaleString()} {exp.currency}</Text>}
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            );
          })()}
        </View>

        {/* ===== 通貨換算 ===== */}
        {Object.keys(exchangeRates).length > 0 && (
          <View style={s.section}>
            <View style={s.secHead}>
              <Text style={s.secTitle}>💱 通貨換算</Text>
            </View>
            {/* 換算結果 */}
            <View style={[s.card, {backgroundColor:'#FFFBEB',borderWidth:1,borderColor:'#FDE68A'}]}>
              <View style={{flexDirection:'row',alignItems:'center',marginBottom:12}}>
                <TextInput
                  style={{flex:1,fontSize:24,fontWeight:'700',color:'#1F2937',borderBottomWidth:2,borderBottomColor:'#F59E0B',paddingBottom:4,textAlign:'right'}}
                  value={currencyAmount}
                  onChangeText={setCurrencyAmount}
                  keyboardType="numeric"
                  placeholder="1000"
                />
              </View>
              {/* FROM通貨 */}
              <TouchableOpacity
                style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',backgroundColor:'#FEF3C7',borderRadius:10,padding:12,marginBottom:8}}
                onPress={()=>setShowCurrencyPicker('from')}
              >
                <Text style={{fontSize:16,fontWeight:'600',color:'#92400E'}}>
                  {(CURRENCIES.find(c=>c.code===fromCurrency)?.flag||'')} {fromCurrency}
                </Text>
                <Text style={{fontSize:14,color:'#B45309'}}>
                  {formatCurrency(parseFloat(currencyAmount)||0, fromCurrency)}
                </Text>
              </TouchableOpacity>
              {/* 矢印 */}
              <TouchableOpacity
                style={{alignSelf:'center',marginVertical:4}}
                onPress={()=>{setFromCurrency(toCurrency);setToCurrency(fromCurrency);}}
              >
                <Text style={{fontSize:22}}>⇅</Text>
              </TouchableOpacity>
              {/* TO通貨 */}
              <TouchableOpacity
                style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',backgroundColor:'#ECFDF5',borderRadius:10,padding:12,marginTop:8}}
                onPress={()=>setShowCurrencyPicker('to')}
              >
                <Text style={{fontSize:16,fontWeight:'600',color:'#065F46'}}>
                  {(CURRENCIES.find(c=>c.code===toCurrency)?.flag||'')} {toCurrency}
                </Text>
                <Text style={{fontSize:18,fontWeight:'700',color:'#059669'}}>
                  {formatCurrency(convertCurrency(parseFloat(currencyAmount)||0, fromCurrency, toCurrency, exchangeRates), toCurrency)}
                </Text>
              </TouchableOpacity>
              {/* レート表示 */}
              <Text style={{fontSize:11,color:'#9CA3AF',textAlign:'center',marginTop:10}}>
                1 {fromCurrency} ≈ {formatCurrency(convertCurrency(1, fromCurrency, toCurrency, exchangeRates), toCurrency)}
              </Text>
            </View>
            {/* 通貨ピッカー */}
            {showCurrencyPicker && (
              <View style={{backgroundColor:'#fff',borderWidth:1,borderColor:'#E5E7EB',borderRadius:12,marginTop:8,maxHeight:200}}>
                <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
                  {CURRENCIES.map(c => (
                    <TouchableOpacity
                      key={c.code}
                      style={{flexDirection:'row',alignItems:'center',padding:12,borderBottomWidth:1,borderBottomColor:'#F3F4F6',
                        backgroundColor: (showCurrencyPicker==='from'?fromCurrency:toCurrency)===c.code?'#FEF3C7':'#fff'}}
                      onPress={()=>{
                        if(showCurrencyPicker==='from')setFromCurrency(c.code);
                        else setToCurrency(c.code);
                        setShowCurrencyPicker(null);
                      }}
                    >
                      <Text style={{fontSize:20,marginRight:10}}>{c.flag}</Text>
                      <Text style={{fontSize:15,fontWeight:'600',color:'#1F2937',width:50}}>{c.code}</Text>
                      <Text style={{fontSize:14,color:'#6B7280'}}>{c.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        )}

        {/* ===== 緊急連絡先 ===== */}
        {emergencyInfo && (
          <View style={s.section}>
            <View style={s.secHead}>
              <Text style={s.secTitle}>🆘 緊急連絡先</Text>
              <TouchableOpacity style={s.addBtn} onPress={()=>setShowEmergencyDetail(!showEmergencyDetail)}>
                <Text style={s.addBtnText}>{showEmergencyDetail?'▲':'▼'}</Text>
              </TouchableOpacity>
            </View>
            {/* 緊急通報番号（常に表示） */}
            <View style={[s.card,{backgroundColor:'#FEF2F2',borderWidth:1.5,borderColor:'#FECACA'}]}>
              <Text style={{fontSize:14,fontWeight:'700',color:'#991B1B',marginBottom:8}}>🚨 {emergencyInfo.countryName}の緊急番号</Text>
              <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
                {emergencyInfo.emergency.universal ? (
                  <TouchableOpacity
                    style={{backgroundColor:'#DC2626',borderRadius:10,paddingHorizontal:16,paddingVertical:10,flexDirection:'row',alignItems:'center'}}
                    onPress={()=>Linking.openURL(`tel:${emergencyInfo!.emergency.universal}`)}
                  >
                    <Text style={{fontSize:16,fontWeight:'800',color:'#fff'}}>📞 {emergencyInfo.emergency.universal}</Text>
                    <Text style={{fontSize:12,color:'#FCA5A5',marginLeft:6}}>（共通）</Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    <TouchableOpacity
                      style={{backgroundColor:'#DC2626',borderRadius:10,paddingHorizontal:14,paddingVertical:8}}
                      onPress={()=>Linking.openURL(`tel:${emergencyInfo!.emergency.police}`)}
                    >
                      <Text style={{fontSize:12,color:'#FCA5A5'}}>🚔 警察</Text>
                      <Text style={{fontSize:16,fontWeight:'800',color:'#fff'}}>{emergencyInfo.emergency.police}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{backgroundColor:'#DC2626',borderRadius:10,paddingHorizontal:14,paddingVertical:8}}
                      onPress={()=>Linking.openURL(`tel:${emergencyInfo!.emergency.ambulance}`)}
                    >
                      <Text style={{fontSize:12,color:'#FCA5A5'}}>🚑 救急</Text>
                      <Text style={{fontSize:16,fontWeight:'800',color:'#fff'}}>{emergencyInfo.emergency.ambulance}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{backgroundColor:'#DC2626',borderRadius:10,paddingHorizontal:14,paddingVertical:8}}
                      onPress={()=>Linking.openURL(`tel:${emergencyInfo!.emergency.fire}`)}
                    >
                      <Text style={{fontSize:12,color:'#FCA5A5'}}>🚒 消防</Text>
                      <Text style={{fontSize:16,fontWeight:'800',color:'#fff'}}>{emergencyInfo.emergency.fire}</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
              <Text style={{fontSize:11,color:'#9CA3AF',marginTop:8}}>タップで発信できます</Text>
            </View>

            {showEmergencyDetail && (
              <>
                {/* 日本大使館・領事館 */}
                <View style={[s.card,{backgroundColor:'#EFF6FF',borderWidth:1,borderColor:'#BFDBFE'}]}>
                  <Text style={{fontSize:14,fontWeight:'700',color:'#1D4ED8',marginBottom:8}}>🏛️ 日本大使館・領事館</Text>
                  {emergencyInfo.embassies.map((emb, i) => (
                    <View key={i} style={{marginTop:i>0?12:0,paddingTop:i>0?12:0,borderTopWidth:i>0?1:0,borderTopColor:'#DBEAFE'}}>
                      <Text style={{fontSize:14,fontWeight:'700',color:'#1F2937'}}>{emb.name}</Text>
                      <Text style={{fontSize:12,color:'#4B5563',marginTop:4}}>📍 {emb.address}</Text>
                      <TouchableOpacity onPress={()=>Linking.openURL(`tel:${emb.phone.replace(/[^+0-9]/g, '')}`)}>
                        <Text style={{fontSize:13,color:'#2563EB',marginTop:4,fontWeight:'600'}}>📞 {emb.phone}</Text>
                      </TouchableOpacity>
                      {emb.hours && <Text style={{fontSize:12,color:'#6B7280',marginTop:2}}>🕐 {emb.hours}</Text>}
                      {emb.url && (
                        <TouchableOpacity onPress={()=>Linking.openURL(emb.url!)}>
                          <Text style={{fontSize:12,color:'#2563EB',marginTop:2}}>🌐 ウェブサイトを開く →</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>

                {/* 現地の注意点 */}
                {emergencyInfo.tips.length > 0 && (
                  <View style={[s.card,{backgroundColor:'#FFF7ED',borderWidth:1,borderColor:'#FED7AA'}]}>
                    <Text style={{fontSize:14,fontWeight:'700',color:'#C2410C',marginBottom:6}}>💡 現地の注意点</Text>
                    {emergencyInfo.tips.map((tip, i) => (
                      <Text key={i} style={{fontSize:13,color:'#9A3412',marginTop:4}}>• {tip}</Text>
                    ))}
                  </View>
                )}

                {/* 外務省共通情報 */}
                <View style={[s.card,{backgroundColor:'#F5F3FF',borderWidth:1,borderColor:'#DDD6FE'}]}>
                  <Text style={{fontSize:14,fontWeight:'700',color:'#6D28D9',marginBottom:6}}>📋 外務省サービス</Text>
                  <TouchableOpacity onPress={()=>Linking.openURL(`tel:${COMMON_EMERGENCY_INFO.mofaPhone.replace(/[^+0-9]/g, '')}`)}>
                    <Text style={{fontSize:13,color:'#5B21B6',marginTop:4}}>📞 領事サービスセンター: {COMMON_EMERGENCY_INFO.mofaPhone}</Text>
                  </TouchableOpacity>
                  <Text style={{fontSize:11,color:'#7C3AED',marginTop:2}}>　{COMMON_EMERGENCY_INFO.mofaHours}</Text>
                  <TouchableOpacity onPress={()=>Linking.openURL(COMMON_EMERGENCY_INFO.tabiRegiUrl)}>
                    <Text style={{fontSize:13,color:'#5B21B6',marginTop:8}}>📝 たびレジに登録する →</Text>
                    <Text style={{fontSize:11,color:'#7C3AED',marginTop:2}}>　渡航先の安全情報をメールで受け取れます</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
            <Text style={{fontSize:11,color:'#9CA3AF',textAlign:'center',marginTop:4}}>📶 オフラインでも利用可能</Text>
          </View>
        )}

        {/* ===== 🌙 夜間安全ガイド ===== */}
        {trip.country_code && (
          <View style={s.section}>
            <View style={s.secHead}>
              <Text style={s.secTitle}>🌙 夜間安全ガイド</Text>
              <TouchableOpacity style={s.addBtn} onPress={()=>setShowNightGuide(!showNightGuide)}>
                <Text style={s.addBtnText}>{showNightGuide?'▲':'▼'}</Text>
              </TouchableOpacity>
            </View>

            {/* 安全度バッジ */}
            {nightSafetyInfo && (() => {
              const badge = getSafetyLabel(nightSafetyInfo.generalSafety);
              return (
                <View style={[s.card,{backgroundColor:badge.bg,borderWidth:1,borderColor:badge.color+'40'}]}>
                  <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>
                    <Text style={{fontSize:14,fontWeight:'700',color:badge.color}}>🌙 夜間の安全度: {badge.text}</Text>
                    <Text style={{fontSize:12,color:'#6B7280'}}>日没 {nightSafetyInfo.sunsetTime}</Text>
                  </View>
                  {nightSafetyInfo.dangerousAreas.length > 0 && (
                    <View style={{marginTop:8}}>
                      <Text style={{fontSize:12,fontWeight:'700',color:'#DC2626',marginBottom:4}}>⚠️ 夜間注意エリア</Text>
                      {nightSafetyInfo.dangerousAreas.slice(0,3).map((area, i) => (
                        <Text key={i} style={{fontSize:12,color:'#991B1B',marginTop:2}}>• {area}</Text>
                      ))}
                    </View>
                  )}
                  {nightSafetyInfo.safeAreas.length > 0 && (
                    <View style={{marginTop:8}}>
                      <Text style={{fontSize:12,fontWeight:'700',color:'#059669',marginBottom:4}}>✅ 比較的安全なエリア</Text>
                      {nightSafetyInfo.safeAreas.slice(0,3).map((area, i) => (
                        <Text key={i} style={{fontSize:12,color:'#065F46',marginTop:2}}>• {area}</Text>
                      ))}
                    </View>
                  )}
                </View>
              );
            })()}

            {showNightGuide && (
              <>
                {/* 夜間の基本ルール */}
                <TouchableOpacity
                  style={[s.card,{backgroundColor:'#1E1B4B',borderWidth:0}]}
                  onPress={()=>setShowNightRules(!showNightRules)}
                >
                  <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>
                    <Text style={{fontSize:14,fontWeight:'700',color:'#E0E7FF'}}>📋 夜間行動の基本ルール</Text>
                    <Text style={{color:'#A5B4FC'}}>{showNightRules?'▲':'▼'}</Text>
                  </View>
                </TouchableOpacity>
                {showNightRules && (
                  <View style={[s.card,{backgroundColor:'#EEF2FF',borderWidth:1,borderColor:'#C7D2FE'}]}>
                    {UNIVERSAL_NIGHT_RULES.map((rule, i) => (
                      <View key={i} style={{flexDirection:'row',marginTop:i>0?10:0}}>
                        <Text style={{fontSize:18,marginRight:8}}>{rule.icon}</Text>
                        <View style={{flex:1}}>
                          <Text style={{fontSize:13,fontWeight:'700',color:'#312E81'}}>{rule.title}</Text>
                          <Text style={{fontSize:12,color:'#4338CA',marginTop:2,lineHeight:18}}>{rule.text}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* 国別の詳細情報 */}
                {nightSafetyInfo && (
                  <>
                    {nightSafetyInfo.transportTips.length > 0 && (
                      <View style={[s.card,{backgroundColor:'#FFF7ED',borderWidth:1,borderColor:'#FED7AA'}]}>
                        <Text style={{fontSize:13,fontWeight:'700',color:'#C2410C',marginBottom:6}}>🚕 夜間の交通手段</Text>
                        {nightSafetyInfo.transportTips.map((tip, i) => (
                          <Text key={i} style={{fontSize:12,color:'#9A3412',marginTop:3}}>• {tip}</Text>
                        ))}
                      </View>
                    )}
                    {nightSafetyInfo.drinkingTips.length > 0 && (
                      <View style={[s.card,{backgroundColor:'#FFFBEB',borderWidth:1,borderColor:'#FDE68A'}]}>
                        <Text style={{fontSize:13,fontWeight:'700',color:'#92400E',marginBottom:6}}>🍺 飲食の注意点</Text>
                        {nightSafetyInfo.drinkingTips.map((tip, i) => (
                          <Text key={i} style={{fontSize:12,color:'#78350F',marginTop:3}}>• {tip}</Text>
                        ))}
                      </View>
                    )}
                    {nightSafetyInfo.scamWarnings.length > 0 && (
                      <View style={[s.card,{backgroundColor:'#FEF2F2',borderWidth:1,borderColor:'#FECACA'}]}>
                        <Text style={{fontSize:13,fontWeight:'700',color:'#DC2626',marginBottom:6}}>⚠️ 詐欺・ぼったくり情報</Text>
                        {nightSafetyInfo.scamWarnings.map((w, i) => (
                          <Text key={i} style={{fontSize:12,color:'#991B1B',marginTop:3}}>• {w}</Text>
                        ))}
                      </View>
                    )}
                  </>
                )}

                {/* AIナイトガイド */}
                <View style={[s.card,{backgroundColor:'#1E1B4B',borderWidth:0}]}>
                  <Text style={{fontSize:14,fontWeight:'700',color:'#E0E7FF',marginBottom:10}}>🤖 AIに夜の過ごし方を相談</Text>
                  <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>
                    {NIGHTLIFE_TOPICS.map(topic => (
                      <TouchableOpacity
                        key={topic.key}
                        style={{paddingHorizontal:12,paddingVertical:8,borderRadius:20,
                          backgroundColor:nightTopic===topic.key?'#7C3AED':'#312E81',
                          borderWidth:1,borderColor:nightTopic===topic.key?'#A78BFA':'#4338CA'}}
                        onPress={()=>setNightTopic(nightTopic===topic.key?'':topic.key)}
                      >
                        <Text style={{fontSize:12,color:nightTopic===topic.key?'#fff':'#C4B5FD',fontWeight:nightTopic===topic.key?'700':'400'}}>
                          {topic.icon} {topic.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TextInput
                    style={{backgroundColor:'#312E81',borderRadius:12,padding:12,marginTop:10,color:'#E0E7FF',fontSize:14}}
                    placeholder="自由に質問もできます..."
                    placeholderTextColor="#6366F1"
                    value={nightFreeText}
                    onChangeText={setNightFreeText}
                    onSubmitEditing={Keyboard.dismiss}
                  />
                  <TouchableOpacity
                    style={{backgroundColor:'#7C3AED',borderRadius:14,padding:14,alignItems:'center',marginTop:10,
                      opacity:nightLoading||(!nightTopic&&!nightFreeText.trim())?0.5:1}}
                    onPress={async()=>{
                      if(nightLoading)return;
                      const topic = NIGHTLIFE_TOPICS.find(t=>t.key===nightTopic);
                      const question = nightFreeText.trim() || topic?.prompt || '';
                      if(!question)return;
                      try{
                        const usage=await checkAiUsage();
                        if(!usage.allowed){setShowUpgrade(true);return;}
                        setNightLoading(true);setNightResult('');
                        const countryName = COUNTRY_LIST.find(c=>c.code===trip.country_code)?.name || trip.destination;
                        const answer = await askNightSafetyGuide(countryName, trip.destination, nightTopic, question);
                        setNightResult(answer);
                        await recordAiUsage('night_safety_guide');
                      }catch(e:any){Alert.alert('エラー',e.message);}
                      finally{setNightLoading(false);}
                    }}
                    disabled={nightLoading||(!nightTopic&&!nightFreeText.trim())}
                  >
                    <Text style={{fontSize:15,fontWeight:'700',color:'#fff'}}>
                      {nightLoading?'🤖 AIが調べています...':'🌙 AIに聞く'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {nightResult ? (
                  <View style={[s.card,{backgroundColor:'#F5F3FF',borderWidth:1,borderColor:'#DDD6FE'}]}>
                    <Text style={{fontSize:14,color:'#1F2937',lineHeight:22}}>{nightResult}</Text>
                    <Text style={{fontSize:10,color:'#9CA3AF',marginTop:8}}>⚠️ AIの情報は参考です。現地の最新状況をご確認ください。</Text>
                  </View>
                ):null}
              </>
            )}
          </View>
        )}

        {/* ===== 渡航情報 ===== */}
        {trip.country_code && TRAVEL_ADVISORIES[trip.country_code] && (() => {
          const adv = TRAVEL_ADVISORIES[trip.country_code];
          const riskColors = { HIGH: '#DC2626', MODERATE: '#F59E0B', LOW: '#10B981' };
          const riskLabels = { HIGH: '要注意', MODERATE: '注意', LOW: '問題なし' };
          const safetyColors = { SAFE: '#10B981', MODERATE: '#F59E0B', CAUTION: '#DC2626' };
          const safetyLabels = { SAFE: '安全', MODERATE: '注意', CAUTION: '要警戒' };
          return (
            <View style={s.section}>
              <View style={s.secHead}>
                <Text style={s.secTitle}>⚠️ 渡航情報</Text>
              </View>

              {/* ビザ・滞在情報 */}
              <View style={s.card}>
                <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                  <Text style={s.cardTitle}>🛂 入国・ビザ</Text>
                  <View style={[s.statusBadge,{backgroundColor: adv.visaFree ? '#10B98118' : '#DC262618', marginTop:0}]}>
                    <Text style={[s.statusText,{color: adv.visaFree ? '#10B981' : '#DC2626'}]}>{adv.visaFree ? `ビザ不要 ${adv.stayDays}日` : 'ビザ要'}</Text>
                  </View>
                </View>
              </View>

              {/* 片親+子供リスク */}
              <View style={s.card}>
                <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                  <Text style={s.cardTitle}>👨‍👧 片親+子供の入国</Text>
                  <View style={[s.reqBadge,{backgroundColor: riskColors[adv.singleParentRisk]+'20'}]}>
                    <View style={[s.reqDot,{backgroundColor: riskColors[adv.singleParentRisk]}]}/>
                    <Text style={[s.reqLabel,{color: riskColors[adv.singleParentRisk]}]}>{riskLabels[adv.singleParentRisk]}</Text>
                  </View>
                </View>
                {adv.singleParentDocs.map((doc, i) => (
                  <Text key={i} style={{fontSize:13,color:'#4B5563',marginTop:3}}>• {doc}</Text>
                ))}
              </View>

              {/* 女性一人旅 */}
              <View style={s.card}>
                <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>
                  <Text style={s.cardTitle}>👩 女性一人旅</Text>
                  <View style={[s.reqBadge,{backgroundColor: safetyColors[adv.soloFemaleSafety]+'20'}]}>
                    <View style={[s.reqDot,{backgroundColor: safetyColors[adv.soloFemaleSafety]}]}/>
                    <Text style={[s.reqLabel,{color: safetyColors[adv.soloFemaleSafety]}]}>{safetyLabels[adv.soloFemaleSafety]}</Text>
                  </View>
                </View>
              </View>

              {/* アラート */}
              {adv.alerts.length > 0 && (
                <View style={[s.card,{backgroundColor:'#FEF2F2',borderWidth:1,borderColor:'#FECACA'}]}>
                  <Text style={[s.cardTitle,{color:'#DC2626',marginBottom:6}]}>🚨 注意事項</Text>
                  {adv.alerts.map((alert, i) => (
                    <Text key={i} style={{fontSize:13,color:'#991B1B',marginTop:3}}>• {alert}</Text>
                  ))}
                </View>
              )}

              {/* 役立つ情報 */}
              {adv.tips.length > 0 && (
                <View style={[s.card,{backgroundColor:'#ECFEFF',borderWidth:1,borderColor:'#A5F3FC'}]}>
                  <Text style={[s.cardTitle,{color:'#0891B2',marginBottom:6}]}>💡 Tips</Text>
                  {adv.tips.map((tip, i) => (
                    <Text key={i} style={{fontSize:13,color:'#155E75',marginTop:3}}>• {tip}</Text>
                  ))}
                </View>
              )}

              {/* 電気プラグ・電圧情報 */}
              {adv && (adv.plugType || adv.voltage) && (
                <View style={[s.card,{backgroundColor:'#FFF7ED',borderWidth:1,borderColor:'#FED7AA'}]}>
                  <Text style={[s.cardTitle,{color:'#C2410C',marginBottom:8}]}>🔌 電源・プラグ情報</Text>
                  {adv.plugType && (
                    <View style={{flexDirection:'row',marginBottom:6}}>
                      <Text style={{fontSize:13,fontWeight:'600',color:'#1F2937',width:80}}>プラグ</Text>
                      <Text style={{fontSize:13,color:'#4B5563',flex:1}}>{adv.plugType}タイプ</Text>
                    </View>
                  )}
                  {adv.voltage && (
                    <View style={{flexDirection:'row',marginBottom:6}}>
                      <Text style={{fontSize:13,fontWeight:'600',color:'#1F2937',width:80}}>電圧</Text>
                      <Text style={{fontSize:13,color:'#4B5563',flex:1}}>{adv.voltage}</Text>
                    </View>
                  )}
                  <Text style={{fontSize:11,color:'#9CA3AF',marginTop:4}}>※日本は100V / Aタイプです。変圧器や変換プラグが必要か確認しましょう</Text>
                </View>
              )}

              {/* 必要なアプリ・事前手続き */}
              {adv.requiredApps && adv.requiredApps.length > 0 && (
                <View style={[s.card,{backgroundColor:'#F0FDF4',borderWidth:1,borderColor:'#BBF7D0'}]}>
                  <Text style={[s.cardTitle,{color:'#15803D',marginBottom:8}]}>📱 必要なアプリ・事前手続き</Text>
                  {adv.requiredApps.map((app, i) => (
                    <TouchableOpacity
                      key={i}
                      style={{flexDirection:'row',alignItems:'flex-start',marginTop:i>0?10:0,backgroundColor:'#fff',borderRadius:8,padding:10,borderWidth:1,borderColor:'#D1FAE5'}}
                      onPress={() => Linking.openURL(app.url)}
                    >
                      <Text style={{fontSize:20,marginRight:8}}>{app.isApp ? '📲' : '🌐'}</Text>
                      <View style={{flex:1}}>
                        <Text style={{fontSize:14,fontWeight:'700',color:'#1F2937'}}>{app.name}</Text>
                        <Text style={{fontSize:12,color:'#4B5563',marginTop:2}}>{app.purpose}</Text>
                        <View style={{flexDirection:'row',alignItems:'center',marginTop:4}}>
                          <Text style={{fontSize:11,color:'#059669',fontWeight:'600'}}>⏰ {app.timing}</Text>
                          <Text style={{fontSize:11,color:'#2563EB',marginLeft:12}}>タップして開く →</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          );
        })()}

        <Text style={{textAlign:'center',color:'#9CA3AF',fontSize:12,marginTop:16}}>長押しで項目を削除できます</Text>
        </View>{/* paddingHorizontal wrapper end */}
      </ScrollView>

      {/* ===== フライト追加モーダル ===== */}
      <Modal animationType="slide" transparent visible={addType==='flight'} onRequestClose={resetFlight}>
        <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
        <View style={s.modalBg}><View style={s.modal}>
          <View style={s.modalHead}><Text style={s.modalTitle}>{editingFlightId?'✈️ フライト編集':'✈️ フライト追加'}</Text><TouchableOpacity onPress={resetFlight}><Text style={{fontSize:20,color:'#9CA3AF'}}>✕</Text></TouchableOpacity></View>
          <ScrollView style={{paddingHorizontal:20}} keyboardShouldPersistTaps="handled">
            {/* スキャンボタン */}
            <TouchableOpacity
              style={[s.scanBtn, scanning && {opacity:0.5}]}
              onPress={scanTicket}
              disabled={scanning}
            >
              <Text style={s.scanBtnText}>{scanning ? '📡 読み取り中...' : '📷 スクショから自動入力（複数枚OK）'}</Text>
            </TouchableOpacity>
            {scannedTicketUris.length>0&&(
              <View style={{marginBottom:12}}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginTop:8}}>
                  {scannedTicketUris.map((uri,i)=><Image key={i} source={{uri}} style={{width:100,height:70,borderRadius:6,marginRight:6}} resizeMode="cover"/>)}
                </ScrollView>
                <Text style={{fontSize:11,color:'#9CA3AF',marginTop:4}}>📎 保存時にドキュメントとして自動登録されます</Text>
              </View>
            )}

            <Text style={s.lbl}>航空会社</Text>
            {!manualAirlineMode ? (<>
              <TouchableOpacity style={s.inp} onPress={()=>setShowAirlinePicker(!showAirlinePicker)}>
                <Text style={ff.airline?{fontSize:16,color:'#1F2937'}:{fontSize:16,color:'#9CA3AF'}}>{ff.airline?`${ff.airline} - ${AIRLINE_CHECKIN_RULES[ff.airline]?.name||manualAirlineName||ff.airline}`:'航空会社を検索・選択'}</Text>
              </TouchableOpacity>
              {showAirlinePicker&&<View style={{borderWidth:1,borderColor:'#D1D5DB',borderRadius:12,marginTop:4,maxHeight:280}}>
                <TextInput style={{padding:12,borderBottomWidth:1,borderBottomColor:'#E5E7EB',fontSize:16,backgroundColor:'#FAFAFA'}} placeholder="ANA, NH, 全日空 などで検索" placeholderTextColor="#9CA3AF" value={airlineSearch} onChangeText={setAirlineSearch} autoFocus/>
                <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={{maxHeight:200}}>
                  {filterAirlines(airlineSearch).map(a=><TouchableOpacity key={a.code} style={{padding:12,borderBottomWidth:1,borderBottomColor:'#F3F4F6'}} onPress={()=>{setFf({...ff,airline:a.code});setShowAirlinePicker(false);setAirlineSearch('');}}><Text style={{fontSize:16}}><Text style={{fontWeight:'700'}}>{a.code}</Text> - {a.name}</Text></TouchableOpacity>)}
                  {filterAirlines(airlineSearch).length===0&&<Text style={{padding:16,color:'#9CA3AF',textAlign:'center',fontSize:14}}>該当する航空会社がありません</Text>}
                </ScrollView>
              </View>}
              <TouchableOpacity onPress={()=>{setManualAirlineMode(true);setShowAirlinePicker(false);}} style={{marginTop:6}}><Text style={{fontSize:13,color:'#0891B2'}}>リストにない航空会社を入力 →</Text></TouchableOpacity>
            </>) : (<>
              <View style={{flexDirection:'row',gap:8}}>
                <View style={{flex:1}}><TextInput style={s.inp} placeholder="コード (例: OM)" value={ff.airline} onChangeText={t=>setFf({...ff,airline:t.toUpperCase()})} autoCapitalize="characters" maxLength={3}/></View>
                <View style={{flex:2}}><TextInput style={s.inp} placeholder="航空会社名 (例: モンゴル航空)" value={manualAirlineName} onChangeText={setManualAirlineName}/></View>
              </View>
              <TouchableOpacity onPress={()=>setManualAirlineMode(false)} style={{marginTop:6}}><Text style={{fontSize:13,color:'#0891B2'}}>← リストから選択</Text></TouchableOpacity>
            </>)}
            <Text style={s.lbl}>便名</Text>
            <TextInput style={s.inp} value={ff.flight_number} onChangeText={t=>setFf({...ff,flight_number:t})} placeholder="408" autoCapitalize="characters"/>
            <Text style={s.lbl}>出発空港</Text>
            <TextInput
              style={s.inp}
              value={airportTarget==='dep' ? airportQuery : (ff.dep_airport ? `${ff.dep_airport}${depAirportLabel?' - '+depAirportLabel:''}` : '')}
              placeholder="都市名・空港名・コードで検索（例: 大阪, パリ）"
              onFocus={() => { setAirportTarget('dep'); setAirportQuery(ff.dep_airport); setAirportResults(ff.dep_airport ? searchAirports(ff.dep_airport) : []); }}
              onChangeText={handleAirportInput}
            />
            {airportTarget==='dep' && airportResults.length>0 && (
              <View style={{borderWidth:1,borderColor:'#D1D5DB',borderRadius:12,marginTop:4,maxHeight:160,backgroundColor:'#FFF'}}>
                <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
                  {airportResults.map(a=>(
                    <TouchableOpacity key={a.code} style={{padding:12,borderBottomWidth:1,borderBottomColor:'#F3F4F6',flexDirection:'row',alignItems:'center'}} onPress={()=>selectAirport(a)}>
                      <View style={{backgroundColor:'#0891B2',borderRadius:6,paddingHorizontal:6,paddingVertical:2,marginRight:8}}><Text style={{color:'#FFF',fontWeight:'800',fontSize:13}}>{a.code}</Text></View>
                      <View style={{flex:1}}><Text style={{fontSize:14,color:'#1F2937'}}>{a.city} — {a.name}</Text><Text style={{fontSize:11,color:'#9CA3AF'}}>{a.country}</Text></View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <Text style={s.lbl}>到着空港</Text>
            <TextInput
              style={s.inp}
              value={airportTarget==='arr' ? airportQuery : (ff.arr_airport ? `${ff.arr_airport}${arrAirportLabel?' - '+arrAirportLabel:''}` : '')}
              placeholder="都市名・空港名・コードで検索"
              onFocus={() => { setAirportTarget('arr'); setAirportQuery(ff.arr_airport); setAirportResults(ff.arr_airport ? searchAirports(ff.arr_airport) : []); }}
              onChangeText={handleAirportInput}
            />
            {airportTarget==='arr' && airportResults.length>0 && (
              <View style={{borderWidth:1,borderColor:'#D1D5DB',borderRadius:12,marginTop:4,maxHeight:160,backgroundColor:'#FFF'}}>
                <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
                  {airportResults.map(a=>(
                    <TouchableOpacity key={a.code} style={{padding:12,borderBottomWidth:1,borderBottomColor:'#F3F4F6',flexDirection:'row',alignItems:'center'}} onPress={()=>selectAirport(a)}>
                      <View style={{backgroundColor:'#0891B2',borderRadius:6,paddingHorizontal:6,paddingVertical:2,marginRight:8}}><Text style={{color:'#FFF',fontWeight:'800',fontSize:13}}>{a.code}</Text></View>
                      <View style={{flex:1}}><Text style={{fontSize:14,color:'#1F2937'}}>{a.city} — {a.name}</Text><Text style={{fontSize:11,color:'#9CA3AF'}}>{a.country}</Text></View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
            <View style={{flexDirection:'row',gap:12}}>
              <View style={{flex:1}}><DatePickerInput label="出発日" value={ff.dep_date} onChange={d=>setFf({...ff,dep_date:d})} placeholder="出発日を選択"/></View>
              <View style={{flex:1}}><Text style={s.lbl}>出発時刻</Text><TextInput style={s.inp} value={ff.dep_time} keyboardType="number-pad" maxLength={5} onChangeText={t=>setFf({...ff,dep_time:fmtTimeInput(t,ff.dep_time)})} placeholder="HH:MM"/></View>
            </View>
            <View style={{flexDirection:'row',gap:12}}>
              <View style={{flex:1}}><DatePickerInput label="到着日" value={ff.arr_date} onChange={d=>setFf({...ff,arr_date:d})} placeholder="到着日を選択" minimumDate={ff.dep_date ? new Date(ff.dep_date) : undefined}/></View>
              <View style={{flex:1}}><Text style={s.lbl}>到着時刻</Text><TextInput style={s.inp} value={ff.arr_time} keyboardType="number-pad" maxLength={5} onChangeText={t=>setFf({...ff,arr_time:fmtTimeInput(t,ff.arr_time)})} placeholder="HH:MM"/></View>
            </View>
            <View style={{flexDirection:'row',gap:12}}>
              <View style={{flex:1}}><Text style={s.lbl}>予約番号</Text><TextInput style={s.inp} value={ff.ref} onChangeText={t=>setFf({...ff,ref:t})} placeholder="ABCDEF" autoCapitalize="characters"/></View>
              <View style={{flex:1}}><Text style={s.lbl}>座席</Text><TextInput style={s.inp} value={ff.seat} onChangeText={t=>setFf({...ff,seat:t})} placeholder="12A" autoCapitalize="characters"/></View>
            </View>
            {ff.airline&&AIRLINE_CHECKIN_RULES[ff.airline]&&<View style={s.ruleBox}><Text style={s.ruleTitle}>📋 {AIRLINE_CHECKIN_RULES[ff.airline].name}</Text><Text style={s.ruleText}>開始:{AIRLINE_CHECKIN_RULES[ff.airline].open/60}h前 / 締切:{AIRLINE_CHECKIN_RULES[ff.airline].close}分前</Text></View>}
            <TouchableOpacity style={s.saveBtn} onPress={saveFlight}><Text style={s.saveBtnText}>{editingFlightId?'更新':'保存'}</Text></TouchableOpacity>
            <View style={{height:40}}/>
          </ScrollView>
        </View></View></KeyboardAvoidingView>
      </Modal>

      {/* ===== ホテル追加モーダル ===== */}
      <Modal animationType="slide" transparent visible={addType==='hotel'} onRequestClose={resetHotel}>
        <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
        <View style={s.modalBg}><View style={s.modal}>
          <View style={s.modalHead}><Text style={s.modalTitle}>{editingHotelId?'🏨 ホテル編集':'🏨 ホテル追加'}</Text><TouchableOpacity onPress={resetHotel}><Text style={{fontSize:20,color:'#9CA3AF'}}>✕</Text></TouchableOpacity></View>
          <ScrollView style={{paddingHorizontal:20}}>
            <TouchableOpacity
              style={[s.scanBtn, scanning && {opacity:0.5}]}
              onPress={scanHotelBooking}
              disabled={scanning}
            >
              <Text style={s.scanBtnText}>{scanning ? '📡 読み取り中...' : '📷 予約確認画面から自動入力（複数枚OK）'}</Text>
            </TouchableOpacity>
            {scannedHotelUris.length>0&&(
              <View style={{marginBottom:12}}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginTop:8}}>
                  {scannedHotelUris.map((uri,i)=><Image key={i} source={{uri}} style={{width:100,height:70,borderRadius:6,marginRight:6}} resizeMode="cover"/>)}
                </ScrollView>
                <Text style={{fontSize:11,color:'#9CA3AF',marginTop:4}}>📎 保存時にドキュメントとして自動登録されます</Text>
              </View>
            )}
            <Text style={s.lbl}>ホテル名 *</Text>
            <TextInput style={s.inp} value={hf.name} onChangeText={t=>setHf({...hf,name:t})} placeholder="Marriott Cologne"/>
            <View style={{flexDirection:'row',gap:12}}>
              <View style={{flex:1}}><DatePickerInput label="チェックイン" required value={hf.checkin} onChange={d=>setHf({...hf,checkin:d})} placeholder="チェックイン日"/></View>
              <View style={{flex:1}}><DatePickerInput label="チェックアウト" required value={hf.checkout} onChange={d=>setHf({...hf,checkout:d})} placeholder="チェックアウト日" minimumDate={hf.checkin ? new Date(hf.checkin) : undefined}/></View>
            </View>
            <View style={{flexDirection:'row',gap:12}}>
              <View style={{flex:1}}><Text style={s.lbl}>🕐 IN時刻</Text><TextInput style={s.inp} value={hf.checkin_time} onChangeText={t=>setHf({...hf,checkin_time:t})} placeholder="15:00" maxLength={5}/></View>
              <View style={{flex:1}}><Text style={s.lbl}>🕐 OUT時刻</Text><TextInput style={s.inp} value={hf.checkout_time} onChangeText={t=>setHf({...hf,checkout_time:t})} placeholder="12:00" maxLength={5}/></View>
            </View>
            <Text style={s.lbl}>住所</Text><TextInput style={s.inp} value={hf.address} onChangeText={t=>setHf({...hf,address:t})} placeholder="Helenenstr. 14, Köln"/>
            <View style={{flexDirection:'row',gap:12}}>
              <View style={{flex:1}}><Text style={s.lbl}>予約番号</Text><TextInput style={s.inp} value={hf.ref} onChangeText={t=>setHf({...hf,ref:t})} placeholder="ABC123" autoCapitalize="characters"/></View>
              <View style={{flex:1}}><Text style={s.lbl}>部屋タイプ</Text><TextInput style={s.inp} value={hf.room} onChangeText={t=>setHf({...hf,room:t})} placeholder="デラックスツイン"/></View>
            </View>
            <Text style={s.lbl}>会員番号（マリオット・IHG・ヒルトン等）</Text>
            <TextInput style={s.inp} value={hf.loyalty} onChangeText={t=>setHf({...hf,loyalty:t})} placeholder="例: Marriott Bonvoy 123456789"/>
            <Text style={s.lbl}>メモ</Text><TextInput style={[s.inp,{height:60,textAlignVertical:'top'}]} value={hf.notes} onChangeText={t=>setHf({...hf,notes:t})} placeholder="追加情報" multiline/>
            <TouchableOpacity style={s.saveBtn} onPress={saveHotel}><Text style={s.saveBtnText}>{editingHotelId?'更新':'保存'}</Text></TouchableOpacity>
            <View style={{height:40}}/>
          </ScrollView>
        </View></View></KeyboardAvoidingView>
      </Modal>

      {/* ===== 書類カテゴリ選択 ===== */}
      <Modal animationType="slide" transparent visible={showDocCat} onRequestClose={()=>setShowDocCat(false)}>
        <View style={s.modalBg}><View style={[s.modal,{maxHeight:420}]}>
          <View style={s.modalHead}><Text style={s.modalTitle}>書類を追加</Text><TouchableOpacity onPress={()=>setShowDocCat(false)}><Text style={{fontSize:20,color:'#9CA3AF'}}>✕</Text></TouchableOpacity></View>
          <ScrollView>
            {/* 画像追加メニュー */}
            <View style={{paddingVertical:8}}>
              <Text style={{fontSize:12,color:'#6B7280',fontWeight:'600',paddingHorizontal:16,paddingVertical:8}}>画像</Text>
              {Object.entries(DOCUMENT_CATEGORIES).map(([k,v])=>
                <TouchableOpacity key={k} style={{flexDirection:'row',alignItems:'center',padding:16,borderBottomWidth:1,borderBottomColor:'#F3F4F6'}} onPress={()=>addDoc(k)}>
                  <Text style={{fontSize:24,marginRight:12}}>{DOC_ICONS[k]}</Text><Text style={{fontSize:17,color:'#1F2937'}}>{v}</Text>
                  <Text style={{fontSize:11,color:'#9CA3AF',marginLeft:'auto'}}>📷</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* PDF追加メニュー */}
            <View style={{paddingVertical:8,borderTopWidth:1,borderTopColor:'#E5E7EB'}}>
              <Text style={{fontSize:12,color:'#6B7280',fontWeight:'600',paddingHorizontal:16,paddingVertical:8}}>PDF</Text>
              {Object.entries(DOCUMENT_CATEGORIES).map(([k,v])=>
                <TouchableOpacity key={`pdf_${k}`} style={{flexDirection:'row',alignItems:'center',padding:16,borderBottomWidth:1,borderBottomColor:'#F3F4F6'}} onPress={()=>addDocPDF(k)}>
                  <Text style={{fontSize:24,marginRight:12}}>{DOC_ICONS[k]}</Text><Text style={{fontSize:17,color:'#1F2937'}}>{v}</Text>
                  <Text style={{fontSize:11,color:'#9CA3AF',marginLeft:'auto'}}>📎</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View></View>
      </Modal>

      {/* ===== 保険追加モーダル ===== */}
      <Modal animationType="slide" transparent visible={addType==='insurance'} onRequestClose={resetInsurance}>
        <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
        <View style={s.modalBg}><View style={s.modal}>
          <View style={s.modalHead}><Text style={s.modalTitle}>{editingInsuranceId?'🛡️ 旅行保険編集':'🛡️ 旅行保険追加'}</Text><TouchableOpacity onPress={resetInsurance}><Text style={{fontSize:20,color:'#9CA3AF'}}>✕</Text></TouchableOpacity></View>
          <ScrollView style={{paddingHorizontal:20}}>
            {/* 証書スキャンボタン */}
            <TouchableOpacity
              style={{backgroundColor:'#FEF3C7',borderRadius:14,padding:14,marginTop:12,marginBottom:8,flexDirection:'row',alignItems:'center',justifyContent:'center',borderWidth:1.5,borderColor:'#F59E0B',opacity:scanningInsurance?0.5:1}}
              onPress={scanInsurance}
              disabled={scanningInsurance}
            >
              <Text style={{fontSize:16,marginRight:8}}>📷</Text>
              <Text style={{fontSize:15,fontWeight:'700',color:'#92400E'}}>
                {scanningInsurance ? '🤖 証書を読み取り中...' : '保険証書をスキャンして自動入力'}
              </Text>
            </TouchableOpacity>
            <Text style={{fontSize:11,color:'#9CA3AF',textAlign:'center',marginBottom:12}}>保険証券・加入証明書・カード付帯保険の明細を撮影またはスクショで読み取れます</Text>
            {scannedInsuranceUris.length>0&&(
              <View style={{marginBottom:12}}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {scannedInsuranceUris.map((uri,i)=><Image key={i} source={{uri}} style={{width:100,height:70,borderRadius:6,marginRight:6}} resizeMode="cover"/>)}
                </ScrollView>
                <Text style={{fontSize:11,color:'#9CA3AF',marginTop:4}}>📎 保存時にドキュメントとして自動登録されます</Text>
              </View>
            )}
            <Text style={s.lbl}>保険会社 *</Text>
            <TextInput style={s.inp} value={insf.company} onChangeText={t=>setInsf({...insf,company:t})} placeholder="損保ジャパン / 東京海上日動"/>
            <Text style={s.lbl}>証券番号</Text>
            <TextInput style={s.inp} value={insf.policy_number} onChangeText={t=>setInsf({...insf,policy_number:t})} placeholder="1234567890"/>
            <Text style={s.lbl}>緊急連絡先（電話番号）</Text>
            <TextInput style={s.inp} value={insf.phone} onChangeText={t=>setInsf({...insf,phone:t})} placeholder="+81-3-xxxx-xxxx" keyboardType="phone-pad"/>
            <Text style={s.lbl}>補償内容</Text>
            <TextInput style={s.inp} value={insf.coverage} onChangeText={t=>setInsf({...insf,coverage:t})} placeholder="治療費用・救援者費用・携行品損害"/>
            <Text style={s.lbl}>メモ</Text>
            <TextInput style={[s.inp,{height:60,textAlignVertical:'top'}]} value={insf.notes} onChangeText={t=>setInsf({...insf,notes:t})} placeholder="クレジットカード付帯保険、保険証番号など" multiline/>
            <TouchableOpacity style={s.saveBtn} onPress={saveInsurance}><Text style={s.saveBtnText}>{editingInsuranceId?'更新':'保存'}</Text></TouchableOpacity>
            <View style={{height:40}}/>
          </ScrollView>
        </View></View></KeyboardAvoidingView>
      </Modal>

      {/* ===== 空港AIガイドモーダル ===== */}
      {/* ===== 観光・食ガイドモーダル ===== */}
      <Modal animationType="slide" visible={showCityGuide} onRequestClose={()=>setShowCityGuide(false)}>
        <View style={{flex:1,backgroundColor:'#FFF'}}>
          <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',padding:20,paddingTop:Platform.OS==='ios'?60:20,borderBottomWidth:1,borderBottomColor:'#E5E7EB'}}>
            <Text style={{fontSize:18,fontWeight:'700',color:'#1F2937'}}>🗺️ 観光・食ガイド</Text>
            <TouchableOpacity onPress={()=>setShowCityGuide(false)}><Text style={{fontSize:20,color:'#9CA3AF'}}>✕</Text></TouchableOpacity>
          </View>
          {/* 訪問地セレクター（複数地域ある場合） */}
          {cityGuideDestinations.length>1&&(
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{paddingVertical:12,paddingHorizontal:16,borderBottomWidth:1,borderBottomColor:'#F3F4F6'}} contentContainerStyle={{gap:8}}>
              {cityGuideDestinations.map((d,i)=>(
                <TouchableOpacity key={i}
                  style={{paddingHorizontal:16,paddingVertical:8,borderRadius:20,backgroundColor:cityGuideSelectedIdx===i?'#0891B2':'#F3F4F6'}}
                  onPress={()=>selectCityGuideDestination(i)}
                >
                  <Text style={{fontSize:13,fontWeight:'600',color:cityGuideSelectedIdx===i?'#FFF':'#374151'}}>
                    📍 {d.regionName}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
          {/* 地域名ヘッダー */}
          <View style={{paddingHorizontal:20,paddingTop:12,paddingBottom:4}}>
            <Text style={{fontSize:16,fontWeight:'700',color:'#1F2937'}}>
              {cityGuideData?.cityNameJa || cityGuideDestinations[cityGuideSelectedIdx]?.regionName || trip?.destination || trip?.name || ''}
            </Text>
          </View>
          {cityGuideData ? (
            <>
              {/* タブ切り替え */}
              <View style={{flexDirection:'row',marginHorizontal:20,marginBottom:12,backgroundColor:'#F3F4F6',borderRadius:12,padding:3}}>
                <TouchableOpacity
                  style={{flex:1,paddingVertical:10,borderRadius:10,alignItems:'center',backgroundColor:cityGuideTab==='tourism'?'#FFF':'transparent'}}
                  onPress={()=>setCityGuideTab('tourism')}
                >
                  <Text style={{fontSize:14,fontWeight:cityGuideTab==='tourism'?'700':'400',color:cityGuideTab==='tourism'?'#9A3412':'#6B7280'}}>🏛️ 観光名所</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{flex:1,paddingVertical:10,borderRadius:10,alignItems:'center',backgroundColor:cityGuideTab==='food'?'#FFF':'transparent'}}
                  onPress={()=>setCityGuideTab('food')}
                >
                  <Text style={{fontSize:14,fontWeight:cityGuideTab==='food'?'700':'400',color:cityGuideTab==='food'?'#9A3412':'#6B7280'}}>🍽️ 食・グルメ</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={{paddingHorizontal:20,flex:1}}>
                {cityGuideTab==='tourism' ? (
                  cityGuideData.tourism.map((spot,i)=>(
                    <View key={i} style={{backgroundColor:'#FFFBEB',borderRadius:12,padding:14,marginBottom:10,borderLeftWidth:4,borderLeftColor:'#F59E0B'}}>
                      <View style={{flexDirection:'row',alignItems:'center',marginBottom:4}}>
                        <Text style={{fontSize:16,marginRight:6}}>{TOURISM_CATEGORY_ICONS[spot.category]||'📍'}</Text>
                        <Text style={{fontSize:15,fontWeight:'700',color:'#92400E',flex:1}}>{spot.name}</Text>
                      </View>
                      <Text style={{fontSize:13,color:'#78350F',lineHeight:20}}>{spot.description}</Text>
                      {spot.tip&&<View style={{backgroundColor:'#FEF3C7',borderRadius:8,padding:8,marginTop:6}}>
                        <Text style={{fontSize:12,color:'#92400E'}}>💡 {spot.tip}</Text>
                      </View>}
                      <TouchableOpacity
                        style={{backgroundColor:'#DBEAFE',borderRadius:8,padding:10,marginTop:8,flexDirection:'row',alignItems:'center',justifyContent:'center'}}
                        onPress={()=>{const q=encodeURIComponent(`${spot.name} ${cityGuideData.cityNameJa}`);const url=Platform.select({ios:`comgooglemaps://?daddr=${q}&directionsmode=transit`,default:`https://www.google.com/maps/dir/?api=1&destination=${q}&travelmode=transit`});const web=`https://www.google.com/maps/dir/?api=1&destination=${q}&travelmode=transit`;Linking.canOpenURL(url!).then(ok=>Linking.openURL(ok?url!:web)).catch(()=>Linking.openURL(web));}}
                      >
                        <Text style={{fontSize:14,marginRight:4}}>🗺️</Text>
                        <Text style={{fontSize:12,fontWeight:'600',color:'#1D4ED8'}}>Googleマップで経路を見る</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                ) : (
                  cityGuideData.food.map((item,i)=>(
                    <View key={i} style={{backgroundColor:'#FFF1F2',borderRadius:12,padding:14,marginBottom:10,borderLeftWidth:4,borderLeftColor:'#FB7185'}}>
                      <View style={{flexDirection:'row',alignItems:'center',marginBottom:4}}>
                        <Text style={{fontSize:16,marginRight:6}}>{FOOD_CATEGORY_ICONS[item.category]||'🍴'}</Text>
                        <Text style={{fontSize:15,fontWeight:'700',color:'#9F1239',flex:1}}>{item.name}</Text>
                      </View>
                      <Text style={{fontSize:13,color:'#881337',lineHeight:20}}>{item.description}</Text>
                      {item.tip&&<View style={{backgroundColor:'#FFE4E6',borderRadius:8,padding:8,marginTop:6}}>
                        <Text style={{fontSize:12,color:'#9F1239'}}>💡 {item.tip}</Text>
                      </View>}
                      <View style={{flexDirection:'row',gap:8,marginTop:8}}>
                        <TouchableOpacity
                          style={{flex:1,backgroundColor:'#FCE7F3',borderRadius:8,padding:10,flexDirection:'row',alignItems:'center',justifyContent:'center'}}
                          onPress={()=>Linking.openURL(`https://www.google.com/search?q=${encodeURIComponent(item.name+' '+cityGuideData.cityNameJa)}&tbm=isch`)}
                        >
                          <Text style={{fontSize:14,marginRight:4}}>📷</Text>
                          <Text style={{fontSize:12,fontWeight:'600',color:'#BE185D'}}>写真を見る</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={{flex:1,backgroundColor:'#DBEAFE',borderRadius:8,padding:10,flexDirection:'row',alignItems:'center',justifyContent:'center'}}
                          onPress={()=>{const q=encodeURIComponent(`${item.name} ${cityGuideData.cityNameJa} レストラン`);const url=Platform.select({ios:`comgooglemaps://?q=${q}`,default:`https://www.google.com/maps/search/${q}`});const web=`https://www.google.com/maps/search/${q}`;Linking.canOpenURL(url!).then(ok=>Linking.openURL(ok?url!:web)).catch(()=>Linking.openURL(web));}}
                        >
                          <Text style={{fontSize:14,marginRight:4}}>🗺️</Text>
                          <Text style={{fontSize:12,fontWeight:'600',color:'#1D4ED8'}}>お店を探す</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
                {/* AI追加情報ボタン */}
                <TouchableOpacity
                  style={{backgroundColor:'#0891B2',borderRadius:12,padding:14,marginVertical:12,alignItems:'center',opacity:cityGuideAILoading?0.6:1}}
                  onPress={()=>loadCityGuideAI(cityGuideTab)}
                  disabled={cityGuideAILoading}
                >
                  <Text style={{fontSize:14,fontWeight:'700',color:'#FFF'}}>{cityGuideAILoading?'🤖 AIが情報を生成中...':'🤖 AIでもっと詳しく見る'}</Text>
                </TouchableOpacity>
                {cityGuideAIResult ? (
                  <View style={{marginBottom:20}}>
                    <Text style={{fontSize:14,fontWeight:'700',color:'#0C4A6E',marginBottom:8}}>🤖 AIおすすめ情報</Text>
                    {cityGuideAIItems.length > 0 ? (
                      cityGuideAIItems.map((aiItem, ai) => {
                        const cityN = cityGuideData?.cityNameJa || cityGuideDestinations[cityGuideSelectedIdx]?.regionName || '';
                        const isTourism = aiItem.type === 'tourism';
                        return (
                          <View key={ai} style={{backgroundColor:isTourism?'#FFFBEB':'#FFF1F2',borderRadius:12,padding:12,marginBottom:8,borderLeftWidth:3,borderLeftColor:isTourism?'#F59E0B':'#FB7185'}}>
                            <Text style={{fontSize:14,fontWeight:'700',color:isTourism?'#92400E':'#9F1239'}}>{isTourism?'📍':'🍽️'} {aiItem.name}</Text>
                            <Text style={{fontSize:12,color:'#374151',marginTop:2,lineHeight:18}}>{aiItem.description}</Text>
                            {aiItem.tip && <Text style={{fontSize:11,color:'#6B7280',marginTop:2}}>💡 {aiItem.tip}</Text>}
                            <View style={{flexDirection:'row',gap:6,marginTop:6}}>
                              <TouchableOpacity
                                style={{flex:1,backgroundColor:'#DBEAFE',borderRadius:6,paddingVertical:6,alignItems:'center',flexDirection:'row',justifyContent:'center'}}
                                onPress={()=>{const q=encodeURIComponent(`${aiItem.name} ${cityN}`);const url=Platform.select({ios:`comgooglemaps://?q=${q}`,default:`https://www.google.com/maps/search/?api=1&query=${q}`});const web=`https://www.google.com/maps/search/?api=1&query=${q}`;Linking.canOpenURL(url!).then(ok=>Linking.openURL(ok?url!:web)).catch(()=>Linking.openURL(web));}}
                              >
                                <Text style={{fontSize:11,color:'#1D4ED8',fontWeight:'600'}}>🗺️ 地図</Text>
                              </TouchableOpacity>
                              {!isTourism && (
                                <TouchableOpacity
                                  style={{flex:1,backgroundColor:'#FCE7F3',borderRadius:6,paddingVertical:6,alignItems:'center',flexDirection:'row',justifyContent:'center'}}
                                  onPress={()=>Linking.openURL(`https://www.google.com/search?q=${encodeURIComponent(aiItem.name+' '+cityN)}&tbm=isch`)}
                                >
                                  <Text style={{fontSize:11,color:'#BE185D',fontWeight:'600'}}>📷 写真</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>
                        );
                      })
                    ) : (
                      <View style={{backgroundColor:'#F0F9FF',borderRadius:12,padding:14}}>
                        <Text style={{fontSize:13,color:'#0C4A6E',lineHeight:22}}>{cityGuideAIResult}</Text>
                      </View>
                    )}
                  </View>
                ) : null}
              </ScrollView>
            </>
          ) : (
            /* 静的データがない都市 → AI生成のみ */
            <ScrollView style={{paddingHorizontal:20,flex:1}}>
              {cityGuideAILoading&&(
                <View style={{alignItems:'center',paddingVertical:30}}>
                  <Text style={{fontSize:48,marginBottom:12}}>🤖</Text>
                  <ActivityIndicator size="large" color="#0891B2"/>
                  <Text style={{fontSize:13,color:'#6B7280',marginTop:8}}>
                    {cityGuideDestinations[cityGuideSelectedIdx]?.regionName||'この都市'}のガイドを生成中...
                  </Text>
                </View>
              )}
              {cityGuideAIResult && !cityGuideAILoading ? (
                <View style={{paddingTop:12}}>
                  <Text style={{fontSize:16,fontWeight:'700',color:'#1F2937',marginBottom:12}}>
                    🤖 {cityGuideDestinations[cityGuideSelectedIdx]?.regionName||''} AIガイド
                  </Text>
                  {/* 構造化データがあればカード表示 */}
                  {cityGuideAIItems.length > 0 ? (
                    <>
                      {/* 観光セクション */}
                      {cityGuideAIItems.filter(it=>it.type==='tourism').length>0 && (
                        <Text style={{fontSize:14,fontWeight:'700',color:'#059669',marginBottom:8,marginTop:4}}>📸 観光名所</Text>
                      )}
                      {cityGuideAIItems.filter(it=>it.type==='tourism').map((aiItem, ai) => {
                        const cityN = cityGuideDestinations[cityGuideSelectedIdx]?.regionName || '';
                        return (
                          <View key={`t${ai}`} style={{backgroundColor:'#FFFBEB',borderRadius:12,padding:14,marginBottom:10,borderLeftWidth:4,borderLeftColor:'#F59E0B'}}>
                            <View style={{flexDirection:'row',alignItems:'center',marginBottom:4}}>
                              <Text style={{fontSize:16,marginRight:6}}>📍</Text>
                              <Text style={{fontSize:15,fontWeight:'700',color:'#92400E',flex:1}}>{aiItem.name}</Text>
                            </View>
                            <Text style={{fontSize:13,color:'#78350F',lineHeight:20}}>{aiItem.description}</Text>
                            {aiItem.tip&&<View style={{backgroundColor:'#FEF3C7',borderRadius:8,padding:8,marginTop:6}}>
                              <Text style={{fontSize:12,color:'#92400E'}}>💡 {aiItem.tip}</Text>
                            </View>}
                            <TouchableOpacity
                              style={{backgroundColor:'#DBEAFE',borderRadius:8,padding:10,marginTop:8,flexDirection:'row',alignItems:'center',justifyContent:'center'}}
                              onPress={()=>{const q=encodeURIComponent(`${aiItem.name} ${cityN}`);const url=Platform.select({ios:`comgooglemaps://?daddr=${q}&directionsmode=transit`,default:`https://www.google.com/maps/dir/?api=1&destination=${q}&travelmode=transit`});const web=`https://www.google.com/maps/dir/?api=1&destination=${q}&travelmode=transit`;Linking.canOpenURL(url!).then(ok=>Linking.openURL(ok?url!:web)).catch(()=>Linking.openURL(web));}}
                            >
                              <Text style={{fontSize:14,marginRight:4}}>🗺️</Text>
                              <Text style={{fontSize:12,fontWeight:'600',color:'#1D4ED8'}}>Googleマップで経路を見る</Text>
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                      {/* グルメセクション */}
                      {cityGuideAIItems.filter(it=>it.type==='food').length>0 && (
                        <Text style={{fontSize:14,fontWeight:'700',color:'#D97706',marginBottom:8,marginTop:12}}>🍽️ 食・グルメ</Text>
                      )}
                      {cityGuideAIItems.filter(it=>it.type==='food').map((aiItem, ai) => {
                        const cityN = cityGuideDestinations[cityGuideSelectedIdx]?.regionName || '';
                        return (
                          <View key={`f${ai}`} style={{backgroundColor:'#FFF1F2',borderRadius:12,padding:14,marginBottom:10,borderLeftWidth:4,borderLeftColor:'#FB7185'}}>
                            <View style={{flexDirection:'row',alignItems:'center',marginBottom:4}}>
                              <Text style={{fontSize:16,marginRight:6}}>🍽️</Text>
                              <Text style={{fontSize:15,fontWeight:'700',color:'#9F1239',flex:1}}>{aiItem.name}</Text>
                            </View>
                            <Text style={{fontSize:13,color:'#881337',lineHeight:20}}>{aiItem.description}</Text>
                            {aiItem.tip&&<View style={{backgroundColor:'#FFE4E6',borderRadius:8,padding:8,marginTop:6}}>
                              <Text style={{fontSize:12,color:'#9F1239'}}>💡 {aiItem.tip}</Text>
                            </View>}
                            <View style={{flexDirection:'row',gap:8,marginTop:8}}>
                              <TouchableOpacity
                                style={{flex:1,backgroundColor:'#FCE7F3',borderRadius:8,padding:10,flexDirection:'row',alignItems:'center',justifyContent:'center'}}
                                onPress={()=>Linking.openURL(`https://www.google.com/search?q=${encodeURIComponent(aiItem.name+' '+cityN)}&tbm=isch`)}
                              >
                                <Text style={{fontSize:14,marginRight:4}}>📷</Text>
                                <Text style={{fontSize:12,fontWeight:'600',color:'#BE185D'}}>写真を見る</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={{flex:1,backgroundColor:'#DBEAFE',borderRadius:8,padding:10,flexDirection:'row',alignItems:'center',justifyContent:'center'}}
                                onPress={()=>{const q=encodeURIComponent(`${aiItem.name} ${cityN} レストラン`);const url=Platform.select({ios:`comgooglemaps://?q=${q}`,default:`https://www.google.com/maps/search/${q}`});const web=`https://www.google.com/maps/search/${q}`;Linking.canOpenURL(url!).then(ok=>Linking.openURL(ok?url!:web)).catch(()=>Linking.openURL(web));}}
                              >
                                <Text style={{fontSize:14,marginRight:4}}>🗺️</Text>
                                <Text style={{fontSize:12,fontWeight:'600',color:'#1D4ED8'}}>お店を探す</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        );
                      })}
                    </>
                  ) : (
                    /* 構造化できなかった場合はテキスト表示 */
                    <View style={{backgroundColor:'#F0F9FF',borderRadius:12,padding:14,marginBottom:20}}>
                      <Text style={{fontSize:13,color:'#0C4A6E',lineHeight:22}}>{cityGuideAIResult}</Text>
                    </View>
                  )}
                  <View style={{height:40}}/>
                </View>
              ) : null}
              {!cityGuideAILoading&&!cityGuideAIResult&&(
                <View style={{alignItems:'center',paddingVertical:30}}>
                  <Text style={{fontSize:48,marginBottom:12}}>🤖</Text>
                  <Text style={{fontSize:15,color:'#374151',textAlign:'center',marginBottom:16}}>
                    {cityGuideDestinations[cityGuideSelectedIdx]?.regionName||'この都市'}のガイドを{'\n'}AIが生成します
                  </Text>
                  <TouchableOpacity
                    style={{backgroundColor:'#0891B2',borderRadius:12,padding:14,paddingHorizontal:24,alignItems:'center'}}
                    onPress={()=>loadCityGuideAI('both')}
                  >
                    <Text style={{fontSize:14,fontWeight:'700',color:'#FFF'}}>🤖 AIガイドを生成する</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </Modal>

      <Modal animationType="slide" transparent visible={showAirportGuide} onRequestClose={()=>setShowAirportGuide(false)}>
        <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
        <View style={s.modalBg}><View style={[s.modal,{maxHeight:'95%'}]}>
          <View style={s.modalHead}>
            <Text style={s.modalTitle}>🤖 {guideAirport?.name||'空港'}ガイド</Text>
            <TouchableOpacity onPress={()=>{setShowAirportGuide(false);setGuideResult('');}}><Text style={{fontSize:20,color:'#9CA3AF'}}>✕</Text></TouchableOpacity>
          </View>
          <ScrollView style={{paddingHorizontal:20}}>
            {guideAirport?.terminal&&(
              <View style={{backgroundColor:'#DBEAFE',borderRadius:10,padding:10,marginTop:8,marginBottom:4}}>
                <Text style={{fontSize:13,color:'#1D4ED8',fontWeight:'600'}}>ターミナル: {guideAirport.terminal}</Text>
              </View>
            )}

            <Text style={{fontSize:15,fontWeight:'700',color:'#1F2937',marginTop:12,marginBottom:8}}>カテゴリから選択</Text>
            <View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:12}}>
              {AIRPORT_GUIDE_TOPICS.map(topic=>(
                <TouchableOpacity
                  key={topic.key}
                  style={{paddingHorizontal:14,paddingVertical:10,borderRadius:12,
                    backgroundColor:guideTopic===topic.key?'#FEF3C7':'#F3F4F6',
                    borderWidth:1.5,borderColor:guideTopic===topic.key?'#F59E0B':'#E5E7EB'}}
                  onPress={()=>{setGuideTopic(topic.key);setGuideFreeText('');setGuideResult('');}}
                >
                  <Text style={{fontSize:13,color:guideTopic===topic.key?'#92400E':'#6B7280',fontWeight:guideTopic===topic.key?'700':'400'}}>{topic.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={{fontSize:15,fontWeight:'700',color:'#1F2937',marginTop:4,marginBottom:8}}>または自由に質問</Text>
            <TextInput
              style={[s.inp,{minHeight:50,textAlignVertical:'top'}]}
              placeholder="例: プライオリティパスで使えるラウンジは？ / 子連れにおすすめの待ち時間の過ごし方は？"
              value={guideFreeText}
              onChangeText={t=>{setGuideFreeText(t);if(t.trim())setGuideTopic('');}}
              multiline
            />

            <TouchableOpacity
              style={{backgroundColor:'#F59E0B',borderRadius:14,padding:16,alignItems:'center',marginTop:12,opacity:guideLoading||(!guideTopic&&!guideFreeText.trim())?0.5:1}}
              onPress={submitGuide}
              disabled={guideLoading||(!guideTopic&&!guideFreeText.trim())}
            >
              <Text style={{color:'#FFF',fontSize:16,fontWeight:'700'}}>
                {guideLoading?'🤖 AIが調べています...':'🤖 AIに聞く'}
              </Text>
            </TouchableOpacity>

            {guideResult ? (
              <View style={{backgroundColor:'#FFFBEB',borderRadius:14,padding:16,marginTop:16,borderWidth:1,borderColor:'#FDE68A'}}>
                <Text style={{fontSize:14,color:'#1F2937',lineHeight:22}}>{guideResult}</Text>
              </View>
            ) : null}
            {/* 免責注意書き */}
            <View style={{backgroundColor:'#F3F4F6',borderRadius:10,padding:10,marginTop:12}}>
              <Text style={{fontSize:10,color:'#6B7280',lineHeight:16}}>⚠️ AIによる情報は最新でない場合があります。営業時間・料金・場所等は変更されることがあるため、空港公式サイトや航空会社HPで最新情報をご確認ください。</Text>
            </View>
            <View style={{height:40}}/>
          </ScrollView>
        </View></View></KeyboardAvoidingView>
      </Modal>

      {/* ===== 保険AI相談モーダル ===== */}
      <Modal animationType="slide" transparent visible={showConsult} onRequestClose={resetConsult}>
        <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
        <View style={s.modalBg}><View style={[s.modal,{maxHeight:'95%'}]}>
          <View style={s.modalHead}>
            <Text style={s.modalTitle}>🤖 保険AI相談</Text>
            <TouchableOpacity onPress={resetConsult}><Text style={{fontSize:20,color:'#9CA3AF'}}>✕</Text></TouchableOpacity>
          </View>
          <ScrollView style={{paddingHorizontal:20}}>
            {/* 登録済み保険情報の表示 */}
            {insurances.length > 0 && policyImages.length === 0 && (
              <View style={{backgroundColor:'#EFF6FF',borderRadius:12,padding:12,marginTop:12,marginBottom:8,borderWidth:1,borderColor:'#BFDBFE'}}>
                <Text style={{fontSize:13,fontWeight:'700',color:'#1D4ED8',marginBottom:4}}>💡 登録済みの保険情報で相談できます</Text>
                <Text style={{fontSize:12,color:'#1E40AF'}}>{insurances[0].company}{insurances[0].policy_number ? ` (${insurances[0].policy_number})` : ''}</Text>
                <Text style={{fontSize:11,color:'#6B7280',marginTop:4}}>より正確なアドバイスが必要な場合は、下の「＋」から保険証券の画像を追加してください</Text>
              </View>
            )}
            {/* ステップ1: 保険証券アップロード */}
            <Text style={{fontSize:15,fontWeight:'700',color:'#1F2937',marginTop:12,marginBottom:8}}>① 保険証券の画像を追加{insurances.length > 0 ? '（任意）' : ''}</Text>
            <Text style={{fontSize:12,color:'#6B7280',marginBottom:8}}>{insurances.length > 0 ? '画像がなくても登録済みの保険情報からアドバイスを受けられます' : '約款の全ページをスクショまたは写真で取り込んでください（最大20枚）'}</Text>
            <View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:8}}>
              {policyImages.map((uri,idx)=>(
                <TouchableOpacity key={idx} onPress={()=>removePolicyImage(idx)}>
                  <Image source={{uri}} style={{width:72,height:72,borderRadius:8}}/>
                  <View style={{position:'absolute',top:-4,right:-4,backgroundColor:'#DC2626',borderRadius:10,width:20,height:20,alignItems:'center',justifyContent:'center'}}>
                    <Text style={{color:'#FFF',fontSize:12,fontWeight:'700'}}>✕</Text>
                  </View>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={{width:72,height:72,borderRadius:8,borderWidth:2,borderColor:'#D1D5DB',borderStyle:'dashed',alignItems:'center',justifyContent:'center',backgroundColor:'#F9FAFB'}}
                onPress={pickPolicyImages}
              >
                <Text style={{fontSize:24,color:'#9CA3AF'}}>＋</Text>
                <Text style={{fontSize:10,color:'#9CA3AF'}}>{policyImages.length}/20</Text>
              </TouchableOpacity>
            </View>

            {/* ステップ2: トラブル選択 */}
            <Text style={{fontSize:15,fontWeight:'700',color:'#1F2937',marginTop:12,marginBottom:8}}>② トラブルの種類を選択</Text>
            <View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:12}}>
              {TROUBLE_CATEGORIES.map(cat=>(
                <TouchableOpacity
                  key={cat.key}
                  style={{paddingHorizontal:14,paddingVertical:8,borderRadius:20,
                    backgroundColor:consultTrouble===cat.key?'#FEF3C7':'#F3F4F6',
                    borderWidth:1.5,borderColor:consultTrouble===cat.key?'#F59E0B':'#E5E7EB'}}
                  onPress={()=>setConsultTrouble(cat.key)}
                >
                  <Text style={{fontSize:13,color:consultTrouble===cat.key?'#92400E':'#6B7280',fontWeight:consultTrouble===cat.key?'700':'400'}}>{cat.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* ステップ3: 自由記述 */}
            <Text style={{fontSize:15,fontWeight:'700',color:'#1F2937',marginBottom:8}}>③ 状況を詳しく（任意）</Text>
            <TextInput
              style={[s.inp,{height:80,textAlignVertical:'top'}]}
              value={consultFreeText}
              onChangeText={setConsultFreeText}
              placeholder="例: ホテルでスーツケースが盗まれた。警察には届け出済み。盗難届の番号は○○。"
              multiline
            />

            {/* 相談ボタン */}
            <TouchableOpacity
              style={{backgroundColor:'#F59E0B',borderRadius:14,padding:16,alignItems:'center',marginTop:16,opacity:consulting?0.5:1}}
              onPress={submitConsult}
              disabled={consulting}
            >
              <Text style={{color:'#FFF',fontSize:17,fontWeight:'700'}}>
                {consulting ? '🤖 AIが分析中...' : policyImages.length > 0 ? '🤖 証券画像からAIに相談' : insurances.length > 0 ? '🤖 登録情報からAIに相談' : '🤖 保険の使い方をAIに相談'}
              </Text>
            </TouchableOpacity>

            {/* 回答表示 */}
            {consultResult ? (
              <View style={{backgroundColor:'#FFFBEB',borderRadius:14,padding:16,marginTop:16,borderWidth:1,borderColor:'#FDE68A'}}>
                <Text style={{fontSize:15,fontWeight:'700',color:'#92400E',marginBottom:8}}>🤖 AIアドバイス</Text>
                <Text style={{fontSize:14,color:'#1F2937',lineHeight:22}}>{consultResult}</Text>
              </View>
            ) : null}
            {/* 免責注意書き */}
            <View style={{backgroundColor:'#FEF2F2',borderRadius:10,padding:12,marginTop:12,borderWidth:1,borderColor:'#FECACA'}}>
              <Text style={{fontSize:11,color:'#991B1B',lineHeight:18}}>⚠️ AIによるアドバイスは一般的な情報に基づくものであり、実際の補償内容・条件は保険証券・約款の記載が優先されます。正確な情報は保険会社へ直接ご確認ください。本アドバイスに基づく判断や行動について、当アプリは責任を負いかねます。</Text>
            </View>
            <View style={{height:40}}/>
          </ScrollView>
        </View></View></KeyboardAvoidingView>
      </Modal>

      {/* ===== 画像プレビュー ===== */}
      <Modal animationType="fade" transparent visible={!!selectedImage} onRequestClose={()=>setSelectedImage(null)}>
        <TouchableOpacity style={{flex:1,backgroundColor:'rgba(0,0,0,0.9)',justifyContent:'center',alignItems:'center'}} activeOpacity={1} onPress={()=>setSelectedImage(null)}>
          {selectedImage&&<Image source={{uri:selectedImage}} style={{width:'90%',height:'80%'}} resizeMode="contain"/>}
        </TouchableOpacity>
      </Modal>

      {/* ===== 搭乗者設定モーダル ===== */}
      <Modal animationType="slide" transparent visible={!!showPassengerModal} onRequestClose={() => setShowPassengerModal(null)}>
        <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
        <View style={s.modalBg}><View style={s.modal}>
          <View style={s.modalHead}>
            <Text style={s.modalTitle}>👥 搭乗者設定</Text>
            <TouchableOpacity onPress={() => setShowPassengerModal(null)}><Text style={{fontSize:20,color:'#9CA3AF'}}>✕</Text></TouchableOpacity>
          </View>
          <ScrollView style={{paddingHorizontal:20}} keyboardShouldPersistTaps="handled">
            {allTravelers.length === 0 ? (
              <View style={{alignItems:'center',paddingVertical:30}}>
                <Text style={{fontSize:15,color:'#9CA3AF',textAlign:'center'}}>
                  家族メンバーが未登録です{'\n'}「家族」タブから登録してください
                </Text>
              </View>
            ) : (
              allTravelers.map(t => {
                const sel = passengerSelections[t.id] || { selected: false, seat: '', mileage: '' };
                return (
                  <View key={t.id} style={{borderBottomWidth:1,borderBottomColor:'#F3F4F6',paddingVertical:12}}>
                    <TouchableOpacity
                      style={{flexDirection:'row',alignItems:'center'}}
                      onPress={() => setPassengerSelections({
                        ...passengerSelections,
                        [t.id]: { ...sel, selected: !sel.selected },
                      })}
                    >
                      <View style={{
                        width:24,height:24,borderRadius:6,borderWidth:2,marginRight:12,
                        borderColor:sel.selected?'#0891B2':'#D1D5DB',
                        backgroundColor:sel.selected?'#0891B2':'#FFF',
                        justifyContent:'center',alignItems:'center',
                      }}>
                        {sel.selected && <Text style={{color:'#FFF',fontSize:14,fontWeight:'700'}}>✓</Text>}
                      </View>
                      <View style={{flex:1}}>
                        <Text style={{fontSize:15,fontWeight:'600',color:'#1F2937'}}>{t.full_name_jp || t.full_name}</Text>
                        <Text style={{fontSize:12,color:'#9CA3AF'}}>{t.relationship} ・ {t.full_name}</Text>
                      </View>
                    </TouchableOpacity>
                    {sel.selected && (
                      <View style={{marginLeft:36,marginTop:8,gap:6}}>
                        <View style={{flexDirection:'row',gap:8}}>
                          <View style={{flex:1}}>
                            <Text style={{fontSize:11,color:'#6B7280',marginBottom:2}}>座席番号</Text>
                            <TextInput
                              style={{borderWidth:1,borderColor:'#E5E7EB',borderRadius:8,padding:8,fontSize:14,backgroundColor:'#F9FAFB'}}
                              placeholder="12A"
                              value={sel.seat}
                              onChangeText={v => setPassengerSelections({...passengerSelections,[t.id]:{...sel,seat:v}})}
                              autoCapitalize="characters"
                            />
                          </View>
                          <View style={{flex:2}}>
                            <Text style={{fontSize:11,color:'#6B7280',marginBottom:2}}>マイレージ番号</Text>
                            <TextInput
                              style={{borderWidth:1,borderColor:'#E5E7EB',borderRadius:8,padding:8,fontSize:14,backgroundColor:'#F9FAFB'}}
                              placeholder="1234567890"
                              value={sel.mileage}
                              onChangeText={v => setPassengerSelections({...passengerSelections,[t.id]:{...sel,mileage:v}})}
                              keyboardType="number-pad"
                            />
                          </View>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })
            )}
            <View style={{marginTop:16,marginBottom:40}}>
              <TouchableOpacity style={s.saveBtn} onPress={savePassengers}>
                <Text style={s.saveBtnText}>保存</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View></View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ===== アップグレード導線モーダル ===== */}
      <Modal visible={showUpgrade} transparent animationType="slide" onRequestClose={() => setShowUpgrade(false)}>
        <View style={s.modalBg}>
          <View style={[s.modal, { paddingBottom: Platform.OS === 'ios' ? 50 : 30 }]}>
            <View style={s.modalHead}>
              <Text style={s.modalTitle}>✨ プレミアムプラン</Text>
              <TouchableOpacity onPress={() => setShowUpgrade(false)}><Text style={{ fontSize: 28, color: '#9CA3AF' }}>×</Text></TouchableOpacity>
            </View>
            <ScrollView style={{ padding: 20 }}>
              {/* マスコット */}
              <View style={{ alignItems: 'center', marginBottom: 16 }}>
                <Image source={MASCOT.excited} style={{ width: 80, height: 80 }} resizeMode="contain" />
              </View>

              {/* プラン比較 */}
              <View style={{ backgroundColor: '#F0F9FF', borderRadius: 16, padding: 16, marginBottom: 16 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#0891B2', marginBottom: 12 }}>無料プランとの比較</Text>

                <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                  <View style={{ flex: 1, backgroundColor: '#FFF', borderRadius: 12, padding: 12, marginRight: 6, borderWidth: 1, borderColor: '#E5E7EB' }}>
                    <Text style={{ fontSize: 12, color: '#9CA3AF', fontWeight: '600' }}>無料プラン</Text>
                    <Text style={{ fontSize: 22, fontWeight: '800', color: '#6B7280', marginTop: 4 }}>¥0</Text>
                    <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>AI利用: 10回まで</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: '#FFF', borderRadius: 12, padding: 12, marginLeft: 6, borderWidth: 2, borderColor: '#0891B2' }}>
                    <Text style={{ fontSize: 12, color: '#0891B2', fontWeight: '600' }}>プレミアム 🌟</Text>
                    <Text style={{ fontSize: 22, fontWeight: '800', color: '#0891B2', marginTop: 4 }}>¥300<Text style={{ fontSize: 12, fontWeight: '500' }}>/月</Text></Text>
                    <Text style={{ fontSize: 11, color: '#0891B2', marginTop: 2 }}>AI利用: 50回/月</Text>
                  </View>
                </View>
              </View>

              {/* 特典一覧 */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#1F2937', marginBottom: 10 }}>プレミアム特典</Text>
                {[
                  { icon: '🤖', text: 'AIアシスタント 月50回利用可能' },
                  { icon: '🏥', text: '海外保険のAI相談が使い放題' },
                  { icon: '✈️', text: '空港ガイドAIで旅をもっと快適に' },
                  { icon: '📸', text: 'eチケット・ホテル予約のAIスキャン' },
                  { icon: '🔄', text: '毎月リセット — 使い切っても安心' },
                ].map((item, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: i < 4 ? 1 : 0, borderBottomColor: '#F3F4F6' }}>
                    <Text style={{ fontSize: 20, marginRight: 12 }}>{item.icon}</Text>
                    <Text style={{ fontSize: 14, color: '#374151', flex: 1 }}>{item.text}</Text>
                  </View>
                ))}
              </View>

              {/* 購入ボタン */}
              <TouchableOpacity
                style={{ backgroundColor: '#0891B2', borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 8 }}
                onPress={async () => {
                  const result = await purchasePremium();
                  if (result.error) {
                    Alert.alert('お知らせ', result.error);
                  }
                  // 購入成功時は purchaseListener が処理
                }}
              >
                <Text style={{ color: '#FFF', fontSize: 17, fontWeight: '700' }}>プレミアムに登録する — ¥300/月</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ padding: 10, alignItems: 'center', marginBottom: 4 }}
                onPress={async () => {
                  const result = await restorePurchases();
                  if (result.restored) {
                    Alert.alert('復元完了', 'プレミアムプランが復元されました！');
                    setShowUpgrade(false);
                  } else {
                    Alert.alert('復元', result.error || '復元可能なサブスクリプションが見つかりませんでした');
                  }
                }}
              >
                <Text style={{ fontSize: 13, color: '#0891B2' }}>以前購入した方はこちら（購入の復元）</Text>
              </TouchableOpacity>

              <Text style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginBottom: 20 }}>
                いつでもキャンセル可能 • App Store経由でのお支払い
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
      {/* ===== 支出追加モーダル ===== */}
      <Modal visible={showExpenseForm} transparent animationType="slide" onRequestClose={() => setShowExpenseForm(false)}>
        <View style={{flex:1,justifyContent:'flex-end',backgroundColor:'rgba(0,0,0,0.5)'}}>
          <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':undefined}>
            <View style={{backgroundColor:'#FFF',borderTopLeftRadius:24,borderTopRightRadius:24,padding:20,maxHeight:'85%'}}>
              <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                <Text style={{fontSize:18,fontWeight:'700',color:'#1F2937'}}>💰 支出を記録</Text>
                <TouchableOpacity onPress={() => setShowExpenseForm(false)}><Text style={{fontSize:20,color:'#9CA3AF'}}>✕</Text></TouchableOpacity>
              </View>
              {/* 日付 */}
              <DatePickerInput label="日付" value={expDate} onChange={d => setExpDate(d)} placeholder="日付を選択"/>
              <View style={{height:6}}/>
              {/* カテゴリ */}
              <Text style={{fontSize:12,fontWeight:'600',color:'#6B7280',marginBottom:4}}>カテゴリ</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:10}}>
                {(Object.keys(EXPENSE_CATEGORIES) as ExpenseCategory[]).map(cat => {
                  const cfg = EXPENSE_CATEGORIES[cat];
                  const sel = expCategory === cat;
                  return (
                    <TouchableOpacity key={cat} onPress={() => setExpCategory(cat)} style={{paddingHorizontal:12,paddingVertical:8,borderRadius:16,marginRight:6,backgroundColor:sel?cfg.color+'20':'#F3F4F6',borderWidth:sel?1:0,borderColor:cfg.color}}>
                      <Text style={{fontSize:12,color:sel?cfg.color:'#6B7280'}}>{cfg.emoji} {cfg.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              {/* タイトル */}
              <Text style={{fontSize:12,fontWeight:'600',color:'#6B7280',marginBottom:4}}>内容</Text>
              <TextInput style={{borderWidth:1,borderColor:'#D1D5DB',borderRadius:8,padding:10,fontSize:14,marginBottom:10}} placeholder="例: ランチ@レストラン" value={expTitle} onChangeText={setExpTitle}/>
              {/* 金額と通貨 */}
              <Text style={{fontSize:12,fontWeight:'600',color:'#6B7280',marginBottom:4}}>金額</Text>
              <View style={{flexDirection:'row',gap:8,marginBottom:10}}>
                <TextInput style={{flex:1,borderWidth:1,borderColor:'#D1D5DB',borderRadius:8,padding:10,fontSize:18,fontWeight:'700',textAlign:'right'}} placeholder="0" value={expAmount} onChangeText={setExpAmount} keyboardType="numeric"/>
                <TouchableOpacity onPress={() => setShowCurrencyPicker('from')} style={{borderWidth:1,borderColor:'#D1D5DB',borderRadius:8,paddingHorizontal:12,justifyContent:'center'}}>
                  <Text style={{fontSize:14,fontWeight:'600',color:'#1F2937'}}>{expCurrency}</Text>
                </TouchableOpacity>
              </View>
              {/* 支払い方法 */}
              <Text style={{fontSize:12,fontWeight:'600',color:'#6B7280',marginBottom:4}}>支払い方法</Text>
              <View style={{flexDirection:'row',gap:8,marginBottom:16}}>
                {([['card','💳 カード'],['cash','💴 現金'],['other','📱 その他']] as const).map(([val,lbl]) => (
                  <TouchableOpacity key={val} onPress={() => setExpPayment(val)} style={{flex:1,paddingVertical:10,borderRadius:10,alignItems:'center',backgroundColor:expPayment===val?'#0891B2':'#F3F4F6'}}>
                    <Text style={{fontSize:13,fontWeight:'600',color:expPayment===val?'#FFF':'#6B7280'}}>{lbl}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {/* 追加ボタン */}
              <TouchableOpacity
                onPress={async () => {
                  if (!trip || !expTitle.trim() || !expAmount || !expDate) {
                    Alert.alert('入力エラー', '日付・内容・金額は必須です');
                    return;
                  }
                  const newExp = createExpense(trip.id, expDate, expCategory, expTitle.trim(), parseFloat(expAmount), expCurrency, exchangeRates, { paymentMethod: expPayment });
                  const newExps = [...expenses, newExp];
                  setExpenses(newExps);
                  await saveExpenses(trip.id, newExps);
                  setShowExpenseForm(false);
                  Keyboard.dismiss();
                }}
                style={{backgroundColor:'#F59E0B',borderRadius:12,paddingVertical:14,alignItems:'center'}}
              >
                <Text style={{fontSize:16,fontWeight:'700',color:'#FFF'}}>記録する</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
      {/* ===== イベント追加モーダル ===== */}
      <Modal visible={showAddEvent} animationType="slide" onRequestClose={() => setShowAddEvent(false)}>
        <View style={{flex:1,backgroundColor:'#FFF'}}>
          <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:20,paddingTop:Platform.OS==='ios'?56:20,paddingBottom:12,borderBottomWidth:1,borderBottomColor:'#E5E7EB'}}>
            <Text style={{fontSize:18,fontWeight:'700',color:'#1F2937'}}>📅 予定を追加</Text>
            <TouchableOpacity onPress={() => { setShowAddEvent(false); setDayGuideData(null); setDayGuideCity(''); setDayGuideAIResult(''); }}><Text style={{fontSize:20,color:'#9CA3AF'}}>✕</Text></TouchableOpacity>
          </View>
          <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
            <ScrollView style={{flex:1,padding:20}} keyboardShouldPersistTaps="handled">
              {/* 日付 */}
              <DatePickerInput label="日付" value={newEventDate} onChange={d => setNewEventDate(d)} placeholder="日付を選択"/>
              <View style={{height:6}}/>
              {/* 時刻 */}
              <Text style={{fontSize:12,fontWeight:'600',color:'#6B7280',marginBottom:4}}>時刻</Text>
              <TextInput style={{borderWidth:1,borderColor:'#D1D5DB',borderRadius:8,padding:10,fontSize:14,marginBottom:12}} placeholder="HH:MM" value={newEventTime} onChangeText={t => setNewEventTime(fmtTimeInput(t, newEventTime))}/>
              {/* 種類 */}
              <Text style={{fontSize:12,fontWeight:'600',color:'#6B7280',marginBottom:4}}>種類</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:12}}>
                {(['sightseeing','restaurant','shopping','activity','transport','free_time','custom'] as TimelineEventType[]).map(type => {
                  const cfg = EVENT_TYPE_CONFIG[type];
                  const selected = newEventType === type;
                  return (
                    <TouchableOpacity key={type} onPress={() => setNewEventType(type)} style={{paddingHorizontal:12,paddingVertical:8,borderRadius:16,marginRight:8,backgroundColor:selected?cfg.color+'20':'#F3F4F6',borderWidth:selected?1:0,borderColor:cfg.color}}>
                      <Text style={{fontSize:13,color:selected?cfg.color:'#6B7280'}}>{cfg.emoji} {cfg.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              {/* タイトル */}
              <Text style={{fontSize:12,fontWeight:'600',color:'#6B7280',marginBottom:4}}>タイトル</Text>
              <TextInput style={{borderWidth:1,borderColor:'#D1D5DB',borderRadius:8,padding:10,fontSize:14,marginBottom:12}} placeholder="例: 浅草寺を観光" value={newEventTitle} onChangeText={setNewEventTitle}/>
              {/* 場所・都市名（ガイド連携） */}
              <Text style={{fontSize:12,fontWeight:'600',color:'#6B7280',marginBottom:4}}>場所（任意）</Text>
              <TextInput style={{borderWidth:1,borderColor:'#D1D5DB',borderRadius:8,padding:10,fontSize:14,marginBottom:4}} placeholder="例: 浅草寺" value={newEventLocation} onChangeText={setNewEventLocation}/>
              {/* 都市名・国名でガイド検索 */}
              <Text style={{fontSize:12,fontWeight:'600',color:'#6B7280',marginBottom:4,marginTop:8}}>都市名・国名で観光ガイドを表示（任意）</Text>
              <View style={{flexDirection:'row',alignItems:'center',marginBottom:8}}>
                <TextInput
                  style={{flex:1,borderWidth:1,borderColor:'#D1D5DB',borderRadius:8,padding:10,fontSize:14}}
                  placeholder="例: フランクフルト、ベルギー、パリ"
                  value={dayGuideCity}
                  onChangeText={setDayGuideCity}
                />
                <TouchableOpacity
                  onPress={() => {
                    if (!dayGuideCity.trim()) return;
                    const result = findGuideByKeyword(dayGuideCity.trim());
                    if (result && result.guide) {
                      setDayGuideData(result.guide);
                      setDayGuideAIResult('');
                    } else if (result && !result.guide) {
                      // キーワードは認識したがガイドデータなし → フルガイドモーダルでAI生成
                      setDayGuideData(null);
                      setDayGuideAIResult(`「${result.regionName}」のガイドデータを準備中です。「フルガイドを見る」で詳細をAI生成できます。`);
                    } else {
                      setDayGuideData(null);
                      setDayGuideAIResult('');
                      // AI生成フォールバック
                      setDayGuideAILoading(true);
                      generateCityGuideAI(dayGuideCity.trim(), dayGuideCity.trim(), 'both')
                        .then(res => { setDayGuideAIResult(res); setDayGuideAILoading(false); })
                        .catch(() => { setDayGuideAIResult(`⚠️ AI生成に失敗しました。\n「追加する」を押した後、タイムライン上のイベントをタップしてもガイドを検索できます。`); setDayGuideAILoading(false); });
                    }
                  }}
                  style={{marginLeft:8,backgroundColor:'#F59E0B',borderRadius:8,paddingHorizontal:14,paddingVertical:10}}
                >
                  <Text style={{fontSize:13,fontWeight:'700',color:'#FFF'}}>🔍 検索</Text>
                </TouchableOpacity>
              </View>
              {/* ガイド結果表示 */}
              {(dayGuideData || dayGuideAIResult || dayGuideAILoading) && (
                <View style={{backgroundColor:'#FFFBEB',borderRadius:12,padding:12,marginBottom:12,borderWidth:1,borderColor:'#FDE68A'}}>
                  {dayGuideData ? (
                    <>
                      <Text style={{fontSize:15,fontWeight:'700',color:'#92400E',marginBottom:6}}>🗺️ {dayGuideData.cityNameJa}（{dayGuideData.cityName}）</Text>
                      <Text style={{fontSize:12,color:'#78350F',marginBottom:8}}>
                        観光: {dayGuideData.tourism.length}件 ・ グルメ: {dayGuideData.food.length}件
                      </Text>
                      {/* プレビュー: 観光名所トップ3 */}
                      {dayGuideData.tourism.slice(0, 3).map((spot, i) => (
                        <View key={i} style={{flexDirection:'row',alignItems:'center',marginBottom:4}}>
                          <Text style={{fontSize:12,color:'#059669'}}>{TOURISM_CATEGORY_ICONS[spot.category]||'📍'} {spot.name}</Text>
                        </View>
                      ))}
                      {dayGuideData.tourism.length > 3 && (
                        <Text style={{fontSize:11,color:'#9CA3AF',marginBottom:4}}>他 {dayGuideData.tourism.length - 3}件...</Text>
                      )}
                      {/* フルガイドを開くボタン */}
                      <TouchableOpacity
                        onPress={() => {
                          const result = findGuideByKeyword(dayGuideCity.trim());
                          if (result) {
                            setShowAddEvent(false);
                            setTimeout(() => openGuideByKey(result.guideKey, dayGuideData?.cityNameJa), 300);
                          }
                        }}
                        style={{marginTop:8,backgroundColor:'#F59E0B',borderRadius:8,paddingVertical:10,alignItems:'center'}}
                      >
                        <Text style={{fontSize:13,fontWeight:'700',color:'#FFF'}}>🗺️ フルガイドを見る（地図・写真付き）</Text>
                      </TouchableOpacity>
                    </>
                  ) : dayGuideAILoading ? (
                    <View style={{alignItems:'center',paddingVertical:16}}>
                      <ActivityIndicator size="small" color="#F59E0B"/>
                      <Text style={{fontSize:12,color:'#6B7280',marginTop:4}}>AIがガイドを生成中...</Text>
                    </View>
                  ) : dayGuideAIResult ? (
                    <>
                      <Text style={{fontSize:14,fontWeight:'700',color:'#92400E',marginBottom:6}}>🤖 AI観光ガイド: {dayGuideCity}</Text>
                      <Text style={{fontSize:12,color:'#374151',lineHeight:18}}>{dayGuideAIResult}</Text>
                    </>
                  ) : null}
                </View>
              )}
              {/* メモ */}
              <Text style={{fontSize:12,fontWeight:'600',color:'#6B7280',marginBottom:4}}>メモ（任意）</Text>
              <TextInput
                style={{borderWidth:1,borderColor:'#D1D5DB',borderRadius:8,padding:10,fontSize:14,marginBottom:16,minHeight:60,textAlignVertical:'top'}}
                placeholder="補足メモ"
                value={newEventNote}
                onChangeText={setNewEventNote}
                multiline
              />
              {/* 追加ボタン */}
              <TouchableOpacity
                onPress={async () => {
                  if (!trip || !newEventTitle.trim() || !newEventDate || !newEventTime) {
                    Alert.alert('入力エラー', '日付・時刻・タイトルは必須です');
                    return;
                  }
                  // dayGuideCityからguideKeyを取得
                  let savedGuideKey: string | undefined;
                  if (dayGuideCity.trim()) {
                    const gResult = findGuideByKeyword(dayGuideCity.trim());
                    if (gResult) savedGuideKey = gResult.guideKey;
                  }
                  const newEv = createCustomEvent(trip.id, newEventDate, newEventTime, newEventType, newEventTitle.trim(), {
                    location: newEventLocation.trim() || undefined,
                    note: newEventNote.trim() || undefined,
                    guideKey: savedGuideKey,
                  });
                  const existing = await loadCustomEvents(trip.id);
                  await saveCustomEvents(trip.id, [...existing, newEv]);
                  setShowAddEvent(false);
                  setDayGuideData(null);
                  setDayGuideCity('');
                  setDayGuideAIResult('');
                  Keyboard.dismiss();
                  fetchAll();
                }}
                style={{backgroundColor:'#0891B2',borderRadius:12,paddingVertical:14,alignItems:'center',marginBottom:40}}
              >
                <Text style={{fontSize:16,fontWeight:'700',color:'#FFF'}}>追加する</Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ===== 旅行日程変更モーダル ===== */}
      <Modal visible={showEditDates} transparent animationType="slide" onRequestClose={() => setShowEditDates(false)}>
        <View style={{flex:1,justifyContent:'flex-end',backgroundColor:'rgba(0,0,0,0.4)'}}>
          <View style={{backgroundColor:'#FFF',borderTopLeftRadius:20,borderTopRightRadius:20,padding:20,paddingBottom:40}}>
            <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <Text style={{fontSize:18,fontWeight:'700',color:'#1F2937'}}>📅 旅行日程を変更</Text>
              <TouchableOpacity onPress={() => setShowEditDates(false)}><Text style={{fontSize:20,color:'#9CA3AF'}}>✕</Text></TouchableOpacity>
            </View>
            <DatePickerInput
              label="出発日"
              required
              value={editDepDate}
              onChange={d => setEditDepDate(d)}
              placeholder="出発日を選択"
            />
            <View style={{height:16}}/>
            <DatePickerInput
              label="帰国日"
              value={editRetDate}
              onChange={d => setEditRetDate(d)}
              placeholder="帰国日を選択"
              minimumDate={editDepDate ? new Date(editDepDate + 'T00:00:00') : undefined}
            />
            <View style={{height:24}}/>
            <TouchableOpacity
              onPress={saveTripDates}
              style={{backgroundColor:'#0891B2',borderRadius:12,paddingVertical:14,alignItems:'center'}}
            >
              <Text style={{fontSize:16,fontWeight:'700',color:'#FFF'}}>保存する</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container:{flex:1,backgroundColor:'#F3F4F6'},
  header:{flexDirection:'row',alignItems:'center',backgroundColor:'#FFF',borderRadius:20,padding:20,marginBottom:20,shadowColor:'#000',shadowOffset:{width:0,height:2},shadowOpacity:0.08,shadowRadius:8,elevation:3},
  headerTitle:{fontSize:22,fontWeight:'800',color:'#1F2937'},
  headerSub:{fontSize:14,color:'#6B7280',marginTop:4},
  section:{marginBottom:20},
  secHead:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:10},
  secTitle:{fontSize:17,fontWeight:'700',color:'#1F2937'},
  addBtn:{backgroundColor:'#0891B2',paddingHorizontal:14,paddingVertical:7,borderRadius:10},
  addBtnText:{color:'#FFF',fontSize:13,fontWeight:'600'},
  card:{backgroundColor:'#FFF',borderRadius:14,padding:14,marginBottom:8,shadowColor:'#000',shadowOffset:{width:0,height:1},shadowOpacity:0.05,shadowRadius:4,elevation:2},
  cardTitle:{fontSize:16,fontWeight:'700',color:'#1F2937'},
  refBadge:{fontSize:11,color:'#6B7280',backgroundColor:'#F3F4F6',paddingHorizontal:8,paddingVertical:3,borderRadius:6},
  code:{fontSize:20,fontWeight:'800',color:'#0891B2'},
  sub:{fontSize:12,color:'#9CA3AF'},
  line:{width:40,height:2,backgroundColor:'#E5E7EB',marginHorizontal:8},
  detail:{fontSize:13,color:'#6B7280',marginTop:2},
  statusBadge:{borderRadius:8,paddingVertical:6,paddingHorizontal:10,marginTop:6,alignItems:'center'},
  statusText:{fontSize:13,fontWeight:'600'},
  dateVal:{fontSize:18,fontWeight:'700',color:'#1F2937',marginTop:2},
  nightBadge:{backgroundColor:'#ECFEFF',paddingHorizontal:14,paddingVertical:6,borderRadius:10,alignItems:'center',marginHorizontal:10},
  nightNum:{fontSize:18,fontWeight:'800',color:'#0891B2'},
  nightLabel:{fontSize:10,color:'#0891B2'},
  reqBadge:{flexDirection:'row',alignItems:'center',paddingHorizontal:10,paddingVertical:5,borderRadius:8},
  reqDot:{width:8,height:8,borderRadius:4,marginRight:6},
  reqLabel:{fontSize:13,fontWeight:'600'},
  thumb:{width:52,height:52,borderRadius:10,marginRight:12,backgroundColor:'#F3F4F6'},
  emptyWrap:{alignItems:'center',paddingVertical:16},
  emptyImg:{width:64,height:64,marginBottom:8},
  emptyText:{color:'#9CA3AF',fontSize:14,textAlign:'center'},
  modalBg:{flex:1,backgroundColor:'rgba(0,0,0,0.5)',justifyContent:'flex-end'},
  modal:{backgroundColor:'#FFF',borderTopLeftRadius:24,borderTopRightRadius:24,maxHeight:'92%',paddingBottom:Platform.OS==='ios'?40:20},
  modalHead:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',padding:20,borderBottomWidth:1,borderBottomColor:'#E5E7EB'},
  modalTitle:{fontSize:20,fontWeight:'700',color:'#1F2937'},
  lbl:{fontSize:14,fontWeight:'600',color:'#374151',marginBottom:6,marginTop:12},
  inp:{backgroundColor:'#F3F4F6',borderRadius:12,padding:14,fontSize:16,color:'#1F2937',borderWidth:1,borderColor:'#E5E7EB'},
  ruleBox:{backgroundColor:'#ECFEFF',borderRadius:12,padding:14,marginTop:16,borderWidth:1,borderColor:'#A5F3FC'},
  ruleTitle:{fontSize:14,fontWeight:'700',color:'#0891B2',marginBottom:4},
  ruleText:{fontSize:13,color:'#1F2937'},
  saveBtn:{backgroundColor:'#0891B2',borderRadius:14,padding:16,alignItems:'center',marginTop:20},
  saveBtnText:{color:'#FFF',fontSize:17,fontWeight:'700'},
  scanBtn:{backgroundColor:'#F0F9FF',borderWidth:2,borderColor:'#0891B2',borderStyle:'dashed',borderRadius:14,padding:14,alignItems:'center',marginTop:12},
  scanBtnText:{color:'#0891B2',fontSize:15,fontWeight:'700'},
});
