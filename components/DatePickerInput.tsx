/**
 * 日付ピッカー付きの入力コンポーネント（Pure JS版 — Expo Go対応）
 *
 * タップするとカレンダーUIがモーダルで表示される。
 * ネイティブモジュール不要で Expo Go でも確実に動作する。
 */

import React, { useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView,
} from 'react-native';

interface DatePickerInputProps {
  label?: string;
  value: string;             // "YYYY-MM-DD" 形式
  onChange: (date: string) => void;
  placeholder?: string;
  required?: boolean;
  minimumDate?: Date;
  maximumDate?: Date;
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

function formatToYMD(date: Date): string {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDisplay(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}（${WEEKDAYS[d.getDay()]}）`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// カレンダーグリッドコンポーネント
function CalendarGrid({
  year, month, selectedDate, minimumDate, maximumDate, onSelect,
}: {
  year: number; month: number; selectedDate: Date | null;
  minimumDate?: Date; maximumDate?: Date;
  onSelect: (date: Date) => void;
}) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);

  // 常に6行（42セル）表示で高さを固定
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length < 42) cells.push(null);

  const rows: (number | null)[][] = [];
  for (let i = 0; i < 42; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }

  const today = new Date();

  return (
    <View>
      {/* 曜日ヘッダー */}
      <View style={cs.weekRow}>
        {WEEKDAYS.map((w, i) => (
          <Text key={i} style={[cs.weekLabel, i === 0 && { color: '#EF4444' }, i === 6 && { color: '#3B82F6' }]}>{w}</Text>
        ))}
      </View>
      {/* 日付グリッド */}
      {rows.map((row, ri) => (
        <View key={ri} style={cs.weekRow}>
          {row.map((day, ci) => {
            if (day === null) return <View key={ci} style={cs.dayCell} />;
            const date = new Date(year, month, day);
            const isSelected = selectedDate && isSameDay(date, selectedDate);
            const isToday = isSameDay(date, today);
            const dayOfWeek = date.getDay();

            // 範囲外チェック
            let disabled = false;
            if (minimumDate) {
              const min = new Date(minimumDate.getFullYear(), minimumDate.getMonth(), minimumDate.getDate());
              if (date < min) disabled = true;
            }
            if (maximumDate) {
              const max = new Date(maximumDate.getFullYear(), maximumDate.getMonth(), maximumDate.getDate());
              if (date > max) disabled = true;
            }

            return (
              <TouchableOpacity
                key={ci}
                style={[cs.dayCell, isSelected && cs.selectedCell]}
                onPress={() => !disabled && onSelect(date)}
                disabled={disabled}
                activeOpacity={0.6}
              >
                <Text style={[
                  cs.dayText,
                  dayOfWeek === 0 && { color: '#EF4444' },
                  dayOfWeek === 6 && { color: '#3B82F6' },
                  isToday && cs.todayText,
                  isSelected && cs.selectedText,
                  disabled && cs.disabledText,
                ]}>
                  {day}
                </Text>
                {isToday && !isSelected && <View style={cs.todayDot} />}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

export default function DatePickerInput({
  label,
  value,
  onChange,
  placeholder = '日付を選択',
  required = false,
  minimumDate,
  maximumDate,
}: DatePickerInputProps) {
  const [show, setShow] = useState(false);

  // カレンダーの表示年月（ナビゲーション用）
  const initialDate = value ? new Date(value + 'T00:00:00') : new Date();
  const safeInitial = isNaN(initialDate.getTime()) ? new Date() : initialDate;
  const [viewYear, setViewYear] = useState(safeInitial.getFullYear());
  const [viewMonth, setViewMonth] = useState(safeInitial.getMonth());

  const selectedDate = useMemo(() => {
    if (!value) return null;
    const d = new Date(value + 'T00:00:00');
    return isNaN(d.getTime()) ? null : d;
  }, [value]);

  const handleOpen = () => {
    // 開くときに現在の値の年月に合わせる（値がなければminimumDateの月を表示）
    const d = value ? new Date(value + 'T00:00:00') : (minimumDate || new Date());
    const safe = isNaN(d.getTime()) ? new Date() : d;
    setViewYear(safe.getFullYear());
    setViewMonth(safe.getMonth());
    setShow(true);
  };

  const handleSelect = (date: Date) => {
    onChange(formatToYMD(date));
    setShow(false);
  };

  const goPrevMonth = () => {
    if (viewMonth === 0) { setViewYear(viewYear - 1); setViewMonth(11); }
    else setViewMonth(viewMonth - 1);
  };

  const goNextMonth = () => {
    if (viewMonth === 11) { setViewYear(viewYear + 1); setViewMonth(0); }
    else setViewMonth(viewMonth + 1);
  };

  const goToday = () => {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
  };

  return (
    <View>
      {label && (
        <Text style={styles.label}>
          {label}{required ? ' *' : ''}
        </Text>
      )}
      <TouchableOpacity style={styles.input} onPress={handleOpen} activeOpacity={0.7}>
        <Text style={[styles.inputText, !value && styles.placeholder]}>
          {value ? formatDisplay(value) : placeholder}
        </Text>
        <Text style={styles.calendarIcon}>📅</Text>
      </TouchableOpacity>

      <Modal visible={show} transparent animationType="slide" onRequestClose={() => setShow(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* ヘッダー */}
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShow(false)}>
                <Text style={styles.cancelBtn}>キャンセル</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{label || '日付を選択'}</Text>
              <TouchableOpacity onPress={goToday}>
                <Text style={styles.todayBtn}>今日</Text>
              </TouchableOpacity>
            </View>

            {/* 月ナビゲーション */}
            <View style={styles.navRow}>
              <TouchableOpacity onPress={goPrevMonth} style={styles.navBtn}>
                <Text style={styles.navBtnText}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.navTitle}>{viewYear}年{viewMonth + 1}月</Text>
              <TouchableOpacity onPress={goNextMonth} style={styles.navBtn}>
                <Text style={styles.navBtnText}>›</Text>
              </TouchableOpacity>
            </View>

            {/* カレンダー */}
            <CalendarGrid
              year={viewYear}
              month={viewMonth}
              selectedDate={selectedDate}
              minimumDate={minimumDate}
              maximumDate={maximumDate}
              onSelect={handleSelect}
            />

            {/* 選択中の日付表示 */}
            {value && (
              <View style={styles.selectedRow}>
                <Text style={styles.selectedLabel}>選択中: </Text>
                <Text style={styles.selectedValue}>{formatDisplay(value)}</Text>
              </View>
            )}

            {/* クリアボタン */}
            {value && !required && (
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={() => { onChange(''); setShow(false); }}
              >
                <Text style={styles.clearBtnText}>日付をクリア</Text>
              </TouchableOpacity>
            )}

            <View style={{ height: 20 }} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FFF',
  },
  inputText: {
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '500',
  },
  placeholder: {
    color: '#9CA3AF',
    fontWeight: '400',
  },
  calendarIcon: {
    fontSize: 18,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  cancelBtn: {
    fontSize: 15,
    color: '#6B7280',
  },
  todayBtn: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0891B2',
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnText: {
    fontSize: 22,
    color: '#374151',
    fontWeight: '600',
  },
  navTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
  },
  selectedRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  selectedLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  selectedValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0891B2',
  },
  clearBtn: {
    alignSelf: 'center',
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
  },
  clearBtnText: {
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '600',
  },
});

// カレンダーグリッド用スタイル
const cs = StyleSheet.create({
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  weekLabel: {
    width: 44,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    paddingVertical: 8,
  },
  dayCell: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  dayText: {
    fontSize: 16,
    color: '#1F2937',
  },
  selectedCell: {
    backgroundColor: '#0891B2',
  },
  selectedText: {
    color: '#FFF',
    fontWeight: '700',
  },
  todayText: {
    fontWeight: '700',
    color: '#0891B2',
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#0891B2',
    marginTop: 2,
  },
  disabledText: {
    color: '#D1D5DB',
  },
});
