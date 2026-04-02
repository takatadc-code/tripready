// 空港データベース — 都市名（日本語/英語）＋空港名で検索可能
export interface Airport {
  code: string;       // IATAコード
  name: string;       // 空港名（日本語）
  nameEn: string;     // 空港名（英語）
  city: string;       // 都市名（日本語）
  cityEn: string;     // 都市名（英語）
  country: string;    // 国名（日本語）
}

export const AIRPORTS: Airport[] = [
  // ===== 日本 =====
  { code: 'NRT', name: '成田国際空港', nameEn: 'Narita International', city: '東京', cityEn: 'Tokyo', country: '日本' },
  { code: 'HND', name: '羽田空港', nameEn: 'Haneda', city: '東京', cityEn: 'Tokyo', country: '日本' },
  { code: 'KIX', name: '関西国際空港', nameEn: 'Kansai International', city: '大阪', cityEn: 'Osaka', country: '日本' },
  { code: 'ITM', name: '伊丹空港', nameEn: 'Itami / Osaka International', city: '大阪', cityEn: 'Osaka', country: '日本' },
  { code: 'UKB', name: '神戸空港', nameEn: 'Kobe', city: '神戸', cityEn: 'Kobe', country: '日本' },
  { code: 'NGO', name: '中部国際空港（セントレア）', nameEn: 'Chubu Centrair', city: '名古屋', cityEn: 'Nagoya', country: '日本' },
  { code: 'FUK', name: '福岡空港', nameEn: 'Fukuoka', city: '福岡', cityEn: 'Fukuoka', country: '日本' },
  { code: 'CTS', name: '新千歳空港', nameEn: 'New Chitose', city: '札幌', cityEn: 'Sapporo', country: '日本' },
  { code: 'OKA', name: '那覇空港', nameEn: 'Naha', city: '沖縄', cityEn: 'Okinawa', country: '日本' },
  { code: 'KOJ', name: '鹿児島空港', nameEn: 'Kagoshima', city: '鹿児島', cityEn: 'Kagoshima', country: '日本' },
  { code: 'HIJ', name: '広島空港', nameEn: 'Hiroshima', city: '広島', cityEn: 'Hiroshima', country: '日本' },
  { code: 'TAK', name: '高松空港', nameEn: 'Takamatsu', city: '高松', cityEn: 'Takamatsu', country: '日本' },
  { code: 'MYJ', name: '松山空港', nameEn: 'Matsuyama', city: '松山', cityEn: 'Matsuyama', country: '日本' },
  { code: 'SDJ', name: '仙台空港', nameEn: 'Sendai', city: '仙台', cityEn: 'Sendai', country: '日本' },
  { code: 'KMQ', name: '小松空港', nameEn: 'Komatsu', city: '小松', cityEn: 'Komatsu', country: '日本' },
  { code: 'NGS', name: '長崎空港', nameEn: 'Nagasaki', city: '長崎', cityEn: 'Nagasaki', country: '日本' },
  { code: 'KMI', name: '宮崎空港', nameEn: 'Miyazaki', city: '宮崎', cityEn: 'Miyazaki', country: '日本' },
  { code: 'OIT', name: '大分空港', nameEn: 'Oita', city: '大分', cityEn: 'Oita', country: '日本' },
  { code: 'KCZ', name: '高知龍馬空港', nameEn: 'Kochi Ryoma', city: '高知', cityEn: 'Kochi', country: '日本' },
  { code: 'TKS', name: '徳島空港', nameEn: 'Tokushima', city: '徳島', cityEn: 'Tokushima', country: '日本' },
  { code: 'AOJ', name: '青森空港', nameEn: 'Aomori', city: '青森', cityEn: 'Aomori', country: '日本' },
  { code: 'AKJ', name: '旭川空港', nameEn: 'Asahikawa', city: '旭川', cityEn: 'Asahikawa', country: '日本' },
  { code: 'KMJ', name: '熊本空港', nameEn: 'Kumamoto', city: '熊本', cityEn: 'Kumamoto', country: '日本' },
  { code: 'NKM', name: '名古屋飛行場（小牧）', nameEn: 'Nagoya Airfield (Komaki)', city: '名古屋', cityEn: 'Nagoya', country: '日本' },
  { code: 'ISG', name: '石垣空港', nameEn: 'Ishigaki', city: '石垣', cityEn: 'Ishigaki', country: '日本' },
  { code: 'MMY', name: '宮古空港', nameEn: 'Miyako', city: '宮古島', cityEn: 'Miyako', country: '日本' },

  // ===== 韓国 =====
  { code: 'ICN', name: '仁川国際空港', nameEn: 'Incheon International', city: 'ソウル', cityEn: 'Seoul', country: '韓国' },
  { code: 'GMP', name: '金浦空港', nameEn: 'Gimpo', city: 'ソウル', cityEn: 'Seoul', country: '韓国' },
  { code: 'PUS', name: '金海国際空港', nameEn: 'Gimhae International', city: '釜山', cityEn: 'Busan', country: '韓国' },
  { code: 'CJU', name: '済州空港', nameEn: 'Jeju', city: '済州', cityEn: 'Jeju', country: '韓国' },

  // ===== 中国 =====
  { code: 'PEK', name: '北京首都国際空港', nameEn: 'Beijing Capital', city: '北京', cityEn: 'Beijing', country: '中国' },
  { code: 'PKX', name: '北京大興国際空港', nameEn: 'Beijing Daxing', city: '北京', cityEn: 'Beijing', country: '中国' },
  { code: 'PVG', name: '上海浦東国際空港', nameEn: 'Shanghai Pudong', city: '上海', cityEn: 'Shanghai', country: '中国' },
  { code: 'SHA', name: '上海虹橋国際空港', nameEn: 'Shanghai Hongqiao', city: '上海', cityEn: 'Shanghai', country: '中国' },
  { code: 'CAN', name: '広州白雲国際空港', nameEn: 'Guangzhou Baiyun', city: '広州', cityEn: 'Guangzhou', country: '中国' },
  { code: 'SZX', name: '深圳宝安国際空港', nameEn: 'Shenzhen Baoan', city: '深圳', cityEn: 'Shenzhen', country: '中国' },
  { code: 'HKG', name: '香港国際空港', nameEn: 'Hong Kong International', city: '香港', cityEn: 'Hong Kong', country: '香港' },

  // ===== 台湾 =====
  { code: 'TPE', name: '桃園国際空港', nameEn: 'Taiwan Taoyuan', city: '台北', cityEn: 'Taipei', country: '台湾' },
  { code: 'TSA', name: '松山空港', nameEn: 'Taipei Songshan', city: '台北', cityEn: 'Taipei', country: '台湾' },
  { code: 'KHH', name: '高雄国際空港', nameEn: 'Kaohsiung', city: '高雄', cityEn: 'Kaohsiung', country: '台湾' },

  // ===== 東南アジア =====
  { code: 'SIN', name: 'チャンギ空港', nameEn: 'Changi', city: 'シンガポール', cityEn: 'Singapore', country: 'シンガポール' },
  { code: 'BKK', name: 'スワンナプーム空港', nameEn: 'Suvarnabhumi', city: 'バンコク', cityEn: 'Bangkok', country: 'タイ' },
  { code: 'DMK', name: 'ドンムアン空港', nameEn: 'Don Mueang', city: 'バンコク', cityEn: 'Bangkok', country: 'タイ' },
  { code: 'CNX', name: 'チェンマイ空港', nameEn: 'Chiang Mai', city: 'チェンマイ', cityEn: 'Chiang Mai', country: 'タイ' },
  { code: 'HKT', name: 'プーケット空港', nameEn: 'Phuket', city: 'プーケット', cityEn: 'Phuket', country: 'タイ' },
  { code: 'SGN', name: 'タンソンニャット空港', nameEn: 'Tan Son Nhat', city: 'ホーチミン', cityEn: 'Ho Chi Minh', country: 'ベトナム' },
  { code: 'HAN', name: 'ノイバイ空港', nameEn: 'Noi Bai', city: 'ハノイ', cityEn: 'Hanoi', country: 'ベトナム' },
  { code: 'DAD', name: 'ダナン空港', nameEn: 'Da Nang', city: 'ダナン', cityEn: 'Da Nang', country: 'ベトナム' },
  { code: 'MNL', name: 'ニノイ・アキノ空港', nameEn: 'Ninoy Aquino', city: 'マニラ', cityEn: 'Manila', country: 'フィリピン' },
  { code: 'CEB', name: 'マクタン・セブ空港', nameEn: 'Mactan-Cebu', city: 'セブ', cityEn: 'Cebu', country: 'フィリピン' },
  { code: 'KUL', name: 'クアラルンプール空港', nameEn: 'Kuala Lumpur International', city: 'クアラルンプール', cityEn: 'Kuala Lumpur', country: 'マレーシア' },
  { code: 'CGK', name: 'スカルノ・ハッタ空港', nameEn: 'Soekarno-Hatta', city: 'ジャカルタ', cityEn: 'Jakarta', country: 'インドネシア' },
  { code: 'DPS', name: 'ングラ・ライ空港', nameEn: 'Ngurah Rai', city: 'バリ', cityEn: 'Bali', country: 'インドネシア' },
  { code: 'REP', name: 'シェムリアップ空港', nameEn: 'Siem Reap', city: 'シェムリアップ', cityEn: 'Siem Reap', country: 'カンボジア' },
  { code: 'PNH', name: 'プノンペン空港', nameEn: 'Phnom Penh', city: 'プノンペン', cityEn: 'Phnom Penh', country: 'カンボジア' },
  { code: 'RGN', name: 'ヤンゴン空港', nameEn: 'Yangon', city: 'ヤンゴン', cityEn: 'Yangon', country: 'ミャンマー' },

  // ===== 南アジア =====
  { code: 'DEL', name: 'インディラ・ガンディー空港', nameEn: 'Indira Gandhi', city: 'デリー', cityEn: 'Delhi', country: 'インド' },
  { code: 'BOM', name: 'ムンバイ空港', nameEn: 'Chhatrapati Shivaji', city: 'ムンバイ', cityEn: 'Mumbai', country: 'インド' },
  { code: 'CMB', name: 'バンダラナイケ空港', nameEn: 'Bandaranaike', city: 'コロンボ', cityEn: 'Colombo', country: 'スリランカ' },
  { code: 'KTM', name: 'トリブバン空港', nameEn: 'Tribhuvan', city: 'カトマンズ', cityEn: 'Kathmandu', country: 'ネパール' },
  { code: 'MLE', name: 'ヴェラナ空港', nameEn: 'Velana', city: 'マレ', cityEn: 'Male', country: 'モルディブ' },

  // ===== オセアニア =====
  { code: 'SYD', name: 'シドニー空港', nameEn: 'Sydney Kingsford Smith', city: 'シドニー', cityEn: 'Sydney', country: 'オーストラリア' },
  { code: 'MEL', name: 'メルボルン空港', nameEn: 'Melbourne Tullamarine', city: 'メルボルン', cityEn: 'Melbourne', country: 'オーストラリア' },
  { code: 'BNE', name: 'ブリスベン空港', nameEn: 'Brisbane', city: 'ブリスベン', cityEn: 'Brisbane', country: 'オーストラリア' },
  { code: 'AKL', name: 'オークランド空港', nameEn: 'Auckland', city: 'オークランド', cityEn: 'Auckland', country: 'ニュージーランド' },
  { code: 'PPT', name: 'ファアア空港', nameEn: 'Faa\'a', city: 'タヒチ', cityEn: 'Tahiti', country: 'フランス領ポリネシア' },

  // ===== 北米 =====
  { code: 'LAX', name: 'ロサンゼルス空港', nameEn: 'Los Angeles International', city: 'ロサンゼルス', cityEn: 'Los Angeles', country: 'アメリカ' },
  { code: 'JFK', name: 'ジョン・F・ケネディ空港', nameEn: 'John F. Kennedy', city: 'ニューヨーク', cityEn: 'New York', country: 'アメリカ' },
  { code: 'EWR', name: 'ニューアーク空港', nameEn: 'Newark Liberty', city: 'ニューヨーク', cityEn: 'New York', country: 'アメリカ' },
  { code: 'SFO', name: 'サンフランシスコ空港', nameEn: 'San Francisco International', city: 'サンフランシスコ', cityEn: 'San Francisco', country: 'アメリカ' },
  { code: 'ORD', name: 'シカゴ・オヘア空港', nameEn: 'O\'Hare International', city: 'シカゴ', cityEn: 'Chicago', country: 'アメリカ' },
  { code: 'ATL', name: 'アトランタ空港', nameEn: 'Hartsfield-Jackson', city: 'アトランタ', cityEn: 'Atlanta', country: 'アメリカ' },
  { code: 'DFW', name: 'ダラス・フォートワース空港', nameEn: 'Dallas/Fort Worth', city: 'ダラス', cityEn: 'Dallas', country: 'アメリカ' },
  { code: 'SEA', name: 'シアトル・タコマ空港', nameEn: 'Seattle-Tacoma', city: 'シアトル', cityEn: 'Seattle', country: 'アメリカ' },
  { code: 'IAD', name: 'ワシントン・ダレス空港', nameEn: 'Washington Dulles', city: 'ワシントンDC', cityEn: 'Washington DC', country: 'アメリカ' },
  { code: 'HNL', name: 'ホノルル空港', nameEn: 'Daniel K. Inouye', city: 'ホノルル', cityEn: 'Honolulu', country: 'アメリカ' },
  { code: 'OGG', name: 'マウイ空港', nameEn: 'Kahului', city: 'マウイ', cityEn: 'Maui', country: 'アメリカ' },
  { code: 'LIH', name: 'リフエ空港', nameEn: 'Lihue', city: 'カウアイ', cityEn: 'Kauai', country: 'アメリカ' },
  { code: 'KOA', name: 'コナ空港', nameEn: 'Ellison Onizuka Kona', city: 'ハワイ島', cityEn: 'Big Island', country: 'アメリカ' },
  { code: 'GUM', name: 'グアム空港', nameEn: 'Antonio B. Won Pat', city: 'グアム', cityEn: 'Guam', country: 'グアム' },
  { code: 'SPN', name: 'サイパン空港', nameEn: 'Saipan International', city: 'サイパン', cityEn: 'Saipan', country: '北マリアナ諸島' },
  { code: 'YVR', name: 'バンクーバー空港', nameEn: 'Vancouver International', city: 'バンクーバー', cityEn: 'Vancouver', country: 'カナダ' },
  { code: 'YYZ', name: 'トロント・ピアソン空港', nameEn: 'Toronto Pearson', city: 'トロント', cityEn: 'Toronto', country: 'カナダ' },
  { code: 'MEX', name: 'メキシコ・シティ空港', nameEn: 'Mexico City International', city: 'メキシコシティ', cityEn: 'Mexico City', country: 'メキシコ' },
  { code: 'CUN', name: 'カンクン空港', nameEn: 'Cancun International', city: 'カンクン', cityEn: 'Cancun', country: 'メキシコ' },

  // ===== 中南米 =====
  { code: 'GRU', name: 'グアルーリョス空港', nameEn: 'Guarulhos', city: 'サンパウロ', cityEn: 'Sao Paulo', country: 'ブラジル' },
  { code: 'LIM', name: 'ホルヘ・チャベス空港', nameEn: 'Jorge Chavez', city: 'リマ', cityEn: 'Lima', country: 'ペルー' },

  // ===== ヨーロッパ =====
  { code: 'LHR', name: 'ロンドン・ヒースロー空港', nameEn: 'London Heathrow', city: 'ロンドン', cityEn: 'London', country: 'イギリス' },
  { code: 'LGW', name: 'ロンドン・ガトウィック空港', nameEn: 'London Gatwick', city: 'ロンドン', cityEn: 'London', country: 'イギリス' },
  { code: 'CDG', name: 'シャルル・ド・ゴール空港', nameEn: 'Charles de Gaulle', city: 'パリ', cityEn: 'Paris', country: 'フランス' },
  { code: 'ORY', name: 'パリ・オルリー空港', nameEn: 'Paris Orly', city: 'パリ', cityEn: 'Paris', country: 'フランス' },
  { code: 'FRA', name: 'フランクフルト空港', nameEn: 'Frankfurt', city: 'フランクフルト', cityEn: 'Frankfurt', country: 'ドイツ' },
  { code: 'MUC', name: 'ミュンヘン空港', nameEn: 'Munich', city: 'ミュンヘン', cityEn: 'Munich', country: 'ドイツ' },
  { code: 'CGN', name: 'ケルン・ボン空港', nameEn: 'Cologne Bonn', city: 'ケルン', cityEn: 'Cologne', country: 'ドイツ' },
  { code: 'DUS', name: 'デュッセルドルフ空港', nameEn: 'Dusseldorf', city: 'デュッセルドルフ', cityEn: 'Dusseldorf', country: 'ドイツ' },
  { code: 'BER', name: 'ベルリン・ブランデンブルク空港', nameEn: 'Berlin Brandenburg', city: 'ベルリン', cityEn: 'Berlin', country: 'ドイツ' },
  { code: 'HAM', name: 'ハンブルク空港', nameEn: 'Hamburg', city: 'ハンブルク', cityEn: 'Hamburg', country: 'ドイツ' },
  { code: 'FCO', name: 'ローマ・フィウミチーノ空港', nameEn: 'Rome Fiumicino', city: 'ローマ', cityEn: 'Rome', country: 'イタリア' },
  { code: 'MXP', name: 'ミラノ・マルペンサ空港', nameEn: 'Milan Malpensa', city: 'ミラノ', cityEn: 'Milan', country: 'イタリア' },
  { code: 'VCE', name: 'ヴェネツィア空港', nameEn: 'Venice Marco Polo', city: 'ヴェネツィア', cityEn: 'Venice', country: 'イタリア' },
  { code: 'MAD', name: 'マドリード・バラハス空港', nameEn: 'Madrid Barajas', city: 'マドリード', cityEn: 'Madrid', country: 'スペイン' },
  { code: 'BCN', name: 'バルセロナ空港', nameEn: 'Barcelona El Prat', city: 'バルセロナ', cityEn: 'Barcelona', country: 'スペイン' },
  { code: 'LIS', name: 'リスボン空港', nameEn: 'Lisbon Humberto Delgado', city: 'リスボン', cityEn: 'Lisbon', country: 'ポルトガル' },
  { code: 'AMS', name: 'スキポール空港', nameEn: 'Amsterdam Schiphol', city: 'アムステルダム', cityEn: 'Amsterdam', country: 'オランダ' },
  { code: 'ZRH', name: 'チューリッヒ空港', nameEn: 'Zurich', city: 'チューリッヒ', cityEn: 'Zurich', country: 'スイス' },
  { code: 'VIE', name: 'ウィーン空港', nameEn: 'Vienna International', city: 'ウィーン', cityEn: 'Vienna', country: 'オーストリア' },
  { code: 'ATH', name: 'アテネ空港', nameEn: 'Athens Eleftherios Venizelos', city: 'アテネ', cityEn: 'Athens', country: 'ギリシャ' },
  { code: 'IST', name: 'イスタンブール空港', nameEn: 'Istanbul', city: 'イスタンブール', cityEn: 'Istanbul', country: 'トルコ' },
  { code: 'PRG', name: 'プラハ空港', nameEn: 'Prague Vaclav Havel', city: 'プラハ', cityEn: 'Prague', country: 'チェコ' },
  { code: 'ZAG', name: 'ザグレブ空港', nameEn: 'Zagreb Franjo Tudjman', city: 'ザグレブ', cityEn: 'Zagreb', country: 'クロアチア' },
  { code: 'DBV', name: 'ドブロブニク空港', nameEn: 'Dubrovnik', city: 'ドブロブニク', cityEn: 'Dubrovnik', country: 'クロアチア' },
  { code: 'ARN', name: 'ストックホルム・アーランダ空港', nameEn: 'Stockholm Arlanda', city: 'ストックホルム', cityEn: 'Stockholm', country: 'スウェーデン' },
  { code: 'HEL', name: 'ヘルシンキ空港', nameEn: 'Helsinki-Vantaa', city: 'ヘルシンキ', cityEn: 'Helsinki', country: 'フィンランド' },
  { code: 'CPH', name: 'コペンハーゲン空港', nameEn: 'Copenhagen Kastrup', city: 'コペンハーゲン', cityEn: 'Copenhagen', country: 'デンマーク' },
  { code: 'OSL', name: 'オスロ空港', nameEn: 'Oslo Gardermoen', city: 'オスロ', cityEn: 'Oslo', country: 'ノルウェー' },
  { code: 'BUD', name: 'ブダペスト空港', nameEn: 'Budapest Ferenc Liszt', city: 'ブダペスト', cityEn: 'Budapest', country: 'ハンガリー' },
  { code: 'WAW', name: 'ワルシャワ・ショパン空港', nameEn: 'Warsaw Chopin', city: 'ワルシャワ', cityEn: 'Warsaw', country: 'ポーランド' },

  // ===== 中東 =====
  { code: 'DXB', name: 'ドバイ空港', nameEn: 'Dubai International', city: 'ドバイ', cityEn: 'Dubai', country: 'UAE' },
  { code: 'AUH', name: 'アブダビ空港', nameEn: 'Abu Dhabi International', city: 'アブダビ', cityEn: 'Abu Dhabi', country: 'UAE' },
  { code: 'DOH', name: 'ハマド空港', nameEn: 'Hamad International', city: 'ドーハ', cityEn: 'Doha', country: 'カタール' },

  // ===== アフリカ =====
  { code: 'CAI', name: 'カイロ空港', nameEn: 'Cairo International', city: 'カイロ', cityEn: 'Cairo', country: 'エジプト' },
  { code: 'CMN', name: 'ムハンマド5世空港', nameEn: 'Mohammed V', city: 'カサブランカ', cityEn: 'Casablanca', country: 'モロッコ' },
  { code: 'NBO', name: 'ジョモ・ケニヤッタ空港', nameEn: 'Jomo Kenyatta', city: 'ナイロビ', cityEn: 'Nairobi', country: 'ケニア' },
  { code: 'JNB', name: 'ヨハネスブルグ空港', nameEn: 'O.R. Tambo', city: 'ヨハネスブルグ', cityEn: 'Johannesburg', country: '南アフリカ' },
  { code: 'JRO', name: 'キリマンジャロ空港', nameEn: 'Kilimanjaro', city: 'キリマンジャロ', cityEn: 'Kilimanjaro', country: 'タンザニア' },
];

/**
 * 空港をキーワードで検索（日本語都市名・英語都市名・空港名・IATAコード対応）
 */
export function searchAirports(query: string): Airport[] {
  if (!query || query.trim().length === 0) return [];
  const q = query.trim().toLowerCase();

  // 完全一致（IATAコード）を優先
  const exactCode = AIRPORTS.filter(a => a.code.toLowerCase() === q);
  if (exactCode.length > 0) return exactCode;

  // 部分一致検索
  return AIRPORTS.filter(a =>
    a.code.toLowerCase().includes(q) ||
    a.city.includes(query.trim()) ||
    a.cityEn.toLowerCase().includes(q) ||
    a.name.includes(query.trim()) ||
    a.nameEn.toLowerCase().includes(q) ||
    a.country.includes(query.trim())
  ).slice(0, 10); // 最大10件
}
