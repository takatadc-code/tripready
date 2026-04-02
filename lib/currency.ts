/**
 * 通貨換算ライブラリ
 *
 * 為替レートを取得し、リアルタイムの通貨換算機能を提供する。
 * オフライン対応: AsyncStorage にキャッシュ（1時間有効）
 *
 * API: exchangerate-api.com (無料枠: 1,500リクエスト/月)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ===== 型定義 =====

export interface ExchangeRate {
  base: string;
  target: string;
  rate: number;
  updatedAt: string;
}

export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  flag: string;
}

// ===== 通貨データベース =====
// 日本人旅行者がよく使う通貨を網羅

export const CURRENCIES: CurrencyInfo[] = [
  { code: 'JPY', name: '日本円', symbol: '¥', flag: '🇯🇵' },
  { code: 'USD', name: '米ドル', symbol: '$', flag: '🇺🇸' },
  { code: 'EUR', name: 'ユーロ', symbol: '€', flag: '🇪🇺' },
  { code: 'GBP', name: '英ポンド', symbol: '£', flag: '🇬🇧' },
  { code: 'KRW', name: '韓国ウォン', symbol: '₩', flag: '🇰🇷' },
  { code: 'TWD', name: '台湾ドル', symbol: 'NT$', flag: '🇹🇼' },
  { code: 'CNY', name: '中国元', symbol: '¥', flag: '🇨🇳' },
  { code: 'HKD', name: '香港ドル', symbol: 'HK$', flag: '🇭🇰' },
  { code: 'THB', name: 'タイバーツ', symbol: '฿', flag: '🇹🇭' },
  { code: 'SGD', name: 'シンガポールドル', symbol: 'S$', flag: '🇸🇬' },
  { code: 'MYR', name: 'マレーシアリンギット', symbol: 'RM', flag: '🇲🇾' },
  { code: 'IDR', name: 'インドネシアルピア', symbol: 'Rp', flag: '🇮🇩' },
  { code: 'VND', name: 'ベトナムドン', symbol: '₫', flag: '🇻🇳' },
  { code: 'PHP', name: 'フィリピンペソ', symbol: '₱', flag: '🇵🇭' },
  { code: 'AUD', name: '豪ドル', symbol: 'A$', flag: '🇦🇺' },
  { code: 'NZD', name: 'NZドル', symbol: 'NZ$', flag: '🇳🇿' },
  { code: 'CAD', name: 'カナダドル', symbol: 'C$', flag: '🇨🇦' },
  { code: 'CHF', name: 'スイスフラン', symbol: 'CHF', flag: '🇨🇭' },
  { code: 'AED', name: 'UAE ディルハム', symbol: 'AED', flag: '🇦🇪' },
  { code: 'INR', name: 'インドルピー', symbol: '₹', flag: '🇮🇳' },
  { code: 'MXN', name: 'メキシコペソ', symbol: 'Mex$', flag: '🇲🇽' },
  { code: 'TRY', name: 'トルコリラ', symbol: '₺', flag: '🇹🇷' },
  { code: 'ZAR', name: '南アフリカランド', symbol: 'R', flag: '🇿🇦' },
  { code: 'SEK', name: 'スウェーデンクローナ', symbol: 'kr', flag: '🇸🇪' },
  { code: 'DKK', name: 'デンマーククローネ', symbol: 'kr', flag: '🇩🇰' },
  { code: 'NOK', name: 'ノルウェークローネ', symbol: 'kr', flag: '🇳🇴' },
  { code: 'CZK', name: 'チェココルナ', symbol: 'Kč', flag: '🇨🇿' },
  { code: 'HUF', name: 'ハンガリーフォリント', symbol: 'Ft', flag: '🇭🇺' },
  { code: 'PLN', name: 'ポーランドズロチ', symbol: 'zł', flag: '🇵🇱' },
  { code: 'BRL', name: 'ブラジルレアル', symbol: 'R$', flag: '🇧🇷' },
];

// 国コード → 通貨コード のマッピング
export const COUNTRY_CURRENCY: Record<string, string> = {
  US: 'USD', GB: 'GBP', KR: 'KRW', TW: 'TWD', CN: 'CNY', HK: 'HKD',
  TH: 'THB', SG: 'SGD', MY: 'MYR', ID: 'IDR', VN: 'VND', PH: 'PHP',
  AU: 'AUD', NZ: 'NZD', CA: 'CAD', CH: 'CHF', AE: 'AED', IN: 'INR',
  MX: 'MXN', TR: 'TRY', ZA: 'ZAR', SE: 'SEK', DK: 'DKK', NO: 'NOK',
  CZ: 'CZK', HU: 'HUF', PL: 'PLN', BR: 'BRL',
  // ユーロ圏
  DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR', BE: 'EUR',
  AT: 'EUR', GR: 'EUR', PT: 'EUR', FI: 'EUR', IE: 'EUR', HR: 'EUR',
  SK: 'EUR', SI: 'EUR', EE: 'EUR', LV: 'EUR', LT: 'EUR', CY: 'EUR',
  MT: 'EUR', LU: 'EUR',
};

// ===== キャッシュ設定 =====
const CACHE_KEY = 'tripready_exchange_rates';
const CACHE_EXPIRY_MS = 60 * 60 * 1000; // 1時間

// ===== ハードコードフォールバックレート（2026年3月時点の概算） =====
const FALLBACK_RATES: Record<string, number> = {
  USD: 150.5,   EUR: 163.2,   GBP: 190.8,   KRW: 0.104,
  TWD: 4.65,    CNY: 20.7,    HKD: 19.3,    THB: 4.18,
  SGD: 112.3,   MYR: 33.8,    IDR: 0.0093,  VND: 0.0059,
  PHP: 2.62,    AUD: 97.2,    NZD: 88.5,    CAD: 109.3,
  CHF: 170.1,   AED: 41.0,    INR: 1.78,    MXN: 8.65,
  TRY: 4.12,    ZAR: 8.15,    SEK: 14.8,    DKK: 21.9,
  NOK: 14.2,    CZK: 6.52,    HUF: 0.40,    PLN: 37.5,
  BRL: 26.2,
};

interface CachedRates {
  rates: Record<string, number>;  // 通貨コード → 対JPYレート
  fetchedAt: string;
}

// ===== API関数 =====

/**
 * 為替レート取得（キャッシュ優先・オフライン対応）
 */
export async function fetchExchangeRates(): Promise<Record<string, number>> {
  // 1. キャッシュを確認
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed: CachedRates = JSON.parse(cached);
      const age = Date.now() - new Date(parsed.fetchedAt).getTime();
      if (age < CACHE_EXPIRY_MS) {
        return parsed.rates;
      }
    }
  } catch {
    // キャッシュ読み取りエラーは無視
  }

  // 2. APIから取得
  try {
    const res = await fetch(
      'https://open.er-api.com/v6/latest/JPY',
      { headers: { 'Accept': 'application/json' } }
    );

    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();

    if (data.result !== 'success') throw new Error('API returned error');

    // JPY基準のレートを反転（1外貨 = ?円 に変換）
    const rates: Record<string, number> = {};
    for (const currency of CURRENCIES) {
      if (currency.code === 'JPY') continue;
      const jpyToForeign = data.rates[currency.code];
      if (jpyToForeign && jpyToForeign > 0) {
        rates[currency.code] = 1 / jpyToForeign;
      }
    }

    // キャッシュに保存
    const cacheData: CachedRates = {
      rates,
      fetchedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));

    return rates;
  } catch {
    // 3. オフライン時はキャッシュ（期限切れ含む）を使用
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        return JSON.parse(cached).rates;
      }
    } catch {
      // ignore
    }

    // 4. 最終フォールバック: ハードコードレート
    return { ...FALLBACK_RATES };
  }
}

/**
 * 通貨換算
 * @param amount 金額
 * @param fromCurrency 変換元通貨コード
 * @param toCurrency 変換先通貨コード
 * @param rates 為替レート（fetchExchangeRatesで取得）
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: Record<string, number>
): number {
  if (fromCurrency === toCurrency) return amount;

  // すべてJPY経由で換算
  let jpyAmount: number;
  if (fromCurrency === 'JPY') {
    jpyAmount = amount;
  } else {
    const fromRate = rates[fromCurrency];
    if (!fromRate) return 0;
    jpyAmount = amount * fromRate;
  }

  if (toCurrency === 'JPY') {
    return jpyAmount;
  }

  const toRate = rates[toCurrency];
  if (!toRate) return 0;
  return jpyAmount / toRate;
}

/**
 * 金額のフォーマット
 */
export function formatCurrency(amount: number, currencyCode: string): string {
  const info = CURRENCIES.find(c => c.code === currencyCode);
  if (!info) return `${amount.toFixed(2)} ${currencyCode}`;

  // 小数点以下の桁数を通貨に応じて調整
  const noDecimalCurrencies = ['JPY', 'KRW', 'VND', 'IDR', 'HUF'];
  const decimals = noDecimalCurrencies.includes(currencyCode) ? 0 : 2;

  const formatted = amount.toLocaleString('ja-JP', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return `${info.symbol}${formatted}`;
}

/**
 * 渡航先の通貨コードを取得
 */
export function getCurrencyForCountry(countryCode: string): string | undefined {
  return COUNTRY_CURRENCY[countryCode];
}

/**
 * 為替レートの最終更新時刻を取得
 */
export async function getRatesLastUpdated(): Promise<string | null> {
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed: CachedRates = JSON.parse(cached);
      return parsed.fetchedAt;
    }
  } catch {
    // ignore
  }
  return null;
}
