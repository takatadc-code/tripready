/**
 * TripReady パッチスクリプト
 * 1. カレンダー6行固定
 * 2. フライト追加の必須項目を任意に
 * 3. 航空会社を検索+選択+手動入力の3段構え
 */
const fs = require('fs');

// === 1. カレンダー6行固定 ===
console.log('1. Patching calendar...');
let cal = fs.readFileSync('components/DatePickerInput.tsx', 'utf8');
if (!cal.includes('while (cells.length < 42)')) {
  // 古い可変行コードを探して置換
  cal = cal.replace(
    /const cells: \(number \| null\)\[\] = \[\];\n\s*for \(let i = 0; i < firstDay; i\+\+\) cells\.push\(null\);\n\s*for \(let d = 1; d <= daysInMonth; d\+\+\) cells\.push\(d\);\n\s*const rows: \(number \| null\)\[\]\[\] = \[\];\n\s*for \(let i = 0; i < cells\.length; i \+= 7\) \{\n\s*rows\.push\(cells\.slice\(i, i \+ 7\)\);\n\s*\}\n\s*const lastRow = rows\[rows\.length - 1\];\n\s*while \(lastRow\.length < 7\) lastRow\.push\(null\);/,
    `const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length < 42) cells.push(null);

  const rows: (number | null)[][] = [];
  for (let i = 0; i < 42; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }`
  );
  fs.writeFileSync('components/DatePickerInput.tsx', cal);
  console.log('   -> Fixed to 6 rows');
} else {
  console.log('   -> Already fixed');
}

// === 2 & 3. フライト画面の修正 ===
console.log('2. Patching flights...');
let fl = fs.readFileSync('app/(tabs)/flights.tsx', 'utf8');

// 2a. バリデーションを緩和
fl = fl.replace(
  "if (!selectedTripId || !flightForm.airline || !flightForm.flight_number || !flightForm.departure_airport || !flightForm.departure_date || !flightForm.departure_time_str) {",
  "if (!selectedTripId) {"
);
fl = fl.replace(
  "Alert.alert('入力エラー', '航空会社、便名、出発空港、出発日時は必須です'); return;",
  "Alert.alert('入力エラー', '旅行を選択してください'); return;"
);

// 2b. 必須マーク(*) を除去
fl = fl.replace(/>航空会社 \*/g, '>航空会社');
fl = fl.replace(/>便名 \*/g, '>便名');
fl = fl.replace(/>出発空港 \*/g, '>出発空港');
fl = fl.replace(/>出発時刻 \*/g, '>出発時刻');

// DatePickerInputの出発日 required を除去
fl = fl.replace(
  `label="出発日"\n                  required`,
  `label="出発日"`
);

// 2c. airlineSearch state を追加
fl = fl.replace(
  "const [showAirlinePicker, setShowAirlinePicker] = useState(false);",
  "const [showAirlinePicker, setShowAirlinePicker] = useState(false);\n  const [airlineSearch, setAirlineSearch] = useState('');\n  const [manualAirlineMode, setManualAirlineMode] = useState(false);\n  const [manualAirlineName, setManualAirlineName] = useState('');"
);

// 2d. AIRLINES定数の後にエイリアスと検索関数を追加
fl = fl.replace(
  `const AIRLINES = Object.entries(AIRLINE_CHECKIN_RULES).map(([code, info]) => ({
  code, name: info.name,
}));`,
  `const AIRLINES = Object.entries(AIRLINE_CHECKIN_RULES).map(([code, info]) => ({
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
}`
);

// 2e. resetAll に airlineSearch リセットを追加
fl = fl.replace(
  `setShowAirlinePicker(false);
    setFlightForm`,
  `setShowAirlinePicker(false);
    setAirlineSearch('');
    setManualAirlineMode(false);
    setManualAirlineName('');
    setFlightForm`
);

// 2f. 航空会社セレクターUI を検索+選択+手動入力に変更
// 既存の航空会社選択部分を丸ごと置換
fl = fl.replace(
  `<Text style={styles.inputLabel}>航空会社</Text>
                <TouchableOpacity style={styles.input} onPress={() => setShowAirlinePicker(!showAirlinePicker)}>
                  <Text style={flightForm.airline ? { fontSize: 16, color: '#1F2937' } : { fontSize: 16, color: '#9CA3AF' }}>
                    {flightForm.airline ? \`\${flightForm.airline} - \${AIRLINE_CHECKIN_RULES[flightForm.airline]?.name || flightForm.airline}\` : '航空会社を選択'}
                  </Text>
                </TouchableOpacity>
                {showAirlinePicker && (
                <View style={{ borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 12, marginTop: 4, maxHeight: 160 }}>
                  <ScrollView nestedScrollEnabled>
                    {AIRLINES.map(a => (
                      <TouchableOpacity key={a.code} style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}
                        onPress={() => { setFlightForm({ ...flightForm, airline: a.code }); setShowAirlinePicker(false); }}>
                        <Text style={{ fontSize: 16 }}>{a.code} - {a.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
                )}`,
  `<Text style={styles.inputLabel}>航空会社</Text>
                {!manualAirlineMode ? (
                  <>
                    <TouchableOpacity style={styles.input} onPress={() => setShowAirlinePicker(!showAirlinePicker)}>
                      <Text style={flightForm.airline ? { fontSize: 16, color: '#1F2937' } : { fontSize: 16, color: '#9CA3AF' }}>
                        {flightForm.airline ? \`\${flightForm.airline} - \${AIRLINE_CHECKIN_RULES[flightForm.airline]?.name || manualAirlineName || flightForm.airline}\` : '航空会社を検索・選択'}
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
                )}`
);

fs.writeFileSync('app/(tabs)/flights.tsx', fl);
console.log('   -> Validation relaxed + airline search/manual input added');

console.log('\nAll patches applied!');
