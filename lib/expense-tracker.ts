/**
 * 旅費トラッカーライブラリ
 *
 * - カテゴリ別の支出記録
 * - 通貨換算と連携してJPYでの総額自動計算
 * - 日別・カテゴリ別の集計
 * - AsyncStorage でローカル保存
 * - 予算設定と残額表示
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ===== 型定義 =====

export type ExpenseCategory =
  | 'food'
  | 'transport'
  | 'hotel'
  | 'shopping'
  | 'activity'
  | 'ticket'
  | 'communication'
  | 'insurance'
  | 'other';

export interface Expense {
  id: string;
  tripId: string;
  date: string;              // YYYY-MM-DD
  category: ExpenseCategory;
  title: string;             // "ランチ@Shake Shack" など
  amount: number;            // 現地通貨での金額
  currency: string;          // 通貨コード（USD, EUR, etc.）
  amountJpy: number;         // 日本円換算額
  note?: string;
  paymentMethod?: 'cash' | 'card' | 'other';
  createdAt: string;         // ISO 8601
}

export interface TripBudget {
  tripId: string;
  totalBudgetJpy: number;    // 総予算（日本円）
  budgetPerCategory?: Partial<Record<ExpenseCategory, number>>;
}

export interface ExpenseSummary {
  totalJpy: number;
  totalByCategory: Record<ExpenseCategory, number>;
  totalByDate: Record<string, number>;
  totalByCurrency: Record<string, number>;
  count: number;
  dailyAverage: number;
  budgetRemaining: number | null;  // null = 予算未設定
}

// ===== カテゴリ設定 =====

export const EXPENSE_CATEGORIES: Record<ExpenseCategory, {
  emoji: string;
  label: string;
  color: string;
}> = {
  food:          { emoji: '🍽️', label: '食事', color: '#F59E0B' },
  transport:     { emoji: '🚕', label: '交通', color: '#3B82F6' },
  hotel:         { emoji: '🏨', label: '宿泊', color: '#8B5CF6' },
  shopping:      { emoji: '🛍️', label: '買い物', color: '#EC4899' },
  activity:      { emoji: '🎯', label: 'アクティビティ', color: '#10B981' },
  ticket:        { emoji: '🎫', label: '入場料', color: '#0891B2' },
  communication: { emoji: '📡', label: '通信', color: '#6366F1' },
  insurance:     { emoji: '🏥', label: '保険', color: '#EF4444' },
  other:         { emoji: '📦', label: 'その他', color: '#6B7280' },
};

// ===== ストレージ =====

const EXPENSE_PREFIX = 'tripready_expenses_';
const BUDGET_PREFIX = 'tripready_budget_';

/**
 * 支出一覧を保存
 */
export async function saveExpenses(tripId: string, expenses: Expense[]): Promise<void> {
  await AsyncStorage.setItem(`${EXPENSE_PREFIX}${tripId}`, JSON.stringify(expenses));
}

/**
 * 支出一覧を読み込み
 */
export async function loadExpenses(tripId: string): Promise<Expense[]> {
  const raw = await AsyncStorage.getItem(`${EXPENSE_PREFIX}${tripId}`);
  return raw ? JSON.parse(raw) : [];
}

/**
 * 予算を保存
 */
export async function saveBudget(tripId: string, budget: TripBudget): Promise<void> {
  await AsyncStorage.setItem(`${BUDGET_PREFIX}${tripId}`, JSON.stringify(budget));
}

/**
 * 予算を読み込み
 */
export async function loadBudget(tripId: string): Promise<TripBudget | null> {
  const raw = await AsyncStorage.getItem(`${BUDGET_PREFIX}${tripId}`);
  return raw ? JSON.parse(raw) : null;
}

// ===== 支出の作成・管理 =====

/**
 * 新しい支出を作成
 */
export function createExpense(
  tripId: string,
  date: string,
  category: ExpenseCategory,
  title: string,
  amount: number,
  currency: string,
  exchangeRates: Record<string, number>,
  options?: {
    note?: string;
    paymentMethod?: 'cash' | 'card' | 'other';
  },
): Expense {
  // JPY換算
  const amountJpy = convertToJpy(amount, currency, exchangeRates);

  return {
    id: `exp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    tripId,
    date,
    category,
    title,
    amount,
    currency,
    amountJpy,
    note: options?.note,
    paymentMethod: options?.paymentMethod,
    createdAt: new Date().toISOString(),
  };
}

/**
 * 現地通貨 → JPY変換
 */
export function convertToJpy(amount: number, currency: string, rates: Record<string, number>): number {
  if (currency === 'JPY') return amount;
  const fromRate = rates[currency];
  const jpyRate = rates['JPY'];
  if (!fromRate || !jpyRate) return amount; // レートなければそのまま返す
  return Math.round((amount / fromRate) * jpyRate);
}

// ===== 集計 =====

/**
 * 支出のサマリーを計算
 */
export function calculateSummary(
  expenses: Expense[],
  budget: TripBudget | null,
  durationDays: number,
): ExpenseSummary {
  const totalJpy = expenses.reduce((sum, e) => sum + e.amountJpy, 0);

  const totalByCategory = {} as Record<ExpenseCategory, number>;
  for (const cat of Object.keys(EXPENSE_CATEGORIES) as ExpenseCategory[]) {
    totalByCategory[cat] = expenses
      .filter(e => e.category === cat)
      .reduce((sum, e) => sum + e.amountJpy, 0);
  }

  const totalByDate: Record<string, number> = {};
  for (const e of expenses) {
    totalByDate[e.date] = (totalByDate[e.date] || 0) + e.amountJpy;
  }

  const totalByCurrency: Record<string, number> = {};
  for (const e of expenses) {
    totalByCurrency[e.currency] = (totalByCurrency[e.currency] || 0) + e.amount;
  }

  const days = Math.max(1, durationDays);
  const dailyAverage = Math.round(totalJpy / days);

  return {
    totalJpy,
    totalByCategory,
    totalByDate,
    totalByCurrency,
    count: expenses.length,
    dailyAverage,
    budgetRemaining: budget ? budget.totalBudgetJpy - totalJpy : null,
  };
}

/**
 * カテゴリ別の割合を計算（円グラフ用）
 */
export function getCategoryPercentages(summary: ExpenseSummary): Array<{
  category: ExpenseCategory;
  label: string;
  emoji: string;
  color: string;
  amount: number;
  percent: number;
}> {
  if (summary.totalJpy === 0) return [];

  return (Object.keys(EXPENSE_CATEGORIES) as ExpenseCategory[])
    .filter(cat => summary.totalByCategory[cat] > 0)
    .map(cat => ({
      category: cat,
      label: EXPENSE_CATEGORIES[cat].label,
      emoji: EXPENSE_CATEGORIES[cat].emoji,
      color: EXPENSE_CATEGORIES[cat].color,
      amount: summary.totalByCategory[cat],
      percent: Math.round((summary.totalByCategory[cat] / summary.totalJpy) * 100),
    }))
    .sort((a, b) => b.amount - a.amount);
}

/**
 * 金額を日本円フォーマットで表示
 */
export function formatJpy(amount: number): string {
  return `¥${amount.toLocaleString('ja-JP')}`;
}

/**
 * 支払い方法のラベル
 */
export function getPaymentMethodLabel(method?: 'cash' | 'card' | 'other'): string {
  switch (method) {
    case 'cash': return '💴 現金';
    case 'card': return '💳 カード';
    case 'other': return '📱 その他';
    default: return '';
  }
}
