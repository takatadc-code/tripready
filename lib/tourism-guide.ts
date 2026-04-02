// lib/tourism-guide.ts
// 観光名所・食ガイドの静的データ + AI生成フォールバック + キャッシュ
import { supabase } from './supabase';
import { getDeviceId } from './ai-usage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AI_GUIDE_CACHE_PREFIX = 'ai_guide_cache_';

// ===== 型定義 =====
export interface TourismSpot {
  name: string;
  description: string;
  category: 'landmark' | 'nature' | 'culture' | 'shopping';
  tip?: string;
}

export interface FoodItem {
  name: string;
  description: string;
  category: 'must_eat' | 'street_food' | 'restaurant' | 'sweet';
  tip?: string;
}

export interface CityGuide {
  cityName: string;
  cityNameJa: string;
  tourism: TourismSpot[];
  food: FoodItem[];
}

// ===== 静的データ =====
const CITY_GUIDES: Record<string, CityGuide> = {
  // ===== カザフスタン =====
  'KZ:astana': {
    cityName: 'Astana', cityNameJa: 'アスタナ',
    tourism: [
      { name: 'バイテレク・タワー', description: '高さ97mのアスタナのシンボルタワー。展望台から市街を一望', category: 'landmark', tip: '夜のライトアップが美しい' },
      { name: 'ハズレット・スルタン・モスク', description: '中央アジア最大級のモスク。白と金の壮大な建築', category: 'culture' },
      { name: 'カーン・シャティール', description: '巨大テント型ショッピングモール。ビーチやミニゴルフも', category: 'shopping', tip: '冬でも屋内ビーチで泳げる' },
      { name: 'アスタナ・オペラ', description: 'イタリア建築家設計の美しいオペラハウス', category: 'culture' },
      { name: '大統領府 アコルダ', description: '白亜の大統領官邸。外観見学のみ', category: 'landmark' },
    ],
    food: [
      { name: 'ベシュバルマク', description: '茹でた馬肉や羊肉と平たい麺の国民食。「5本の指」の意味', category: 'must_eat', tip: 'カザフ料理レストランでは必ずメニューにある' },
      { name: 'クムス', description: '馬乳を発酵させた伝統飲料。独特の酸味', category: 'must_eat', tip: '好き嫌いが分かれるが一度は試す価値あり' },
      { name: 'マンティ', description: '大きな蒸し餃子。肉汁たっぷり', category: 'street_food' },
      { name: 'シャシリク', description: '中央アジア式の串焼き肉。ラム肉が定番', category: 'street_food' },
      { name: 'バウルサク', description: '揚げパン。お茶請けとしてどの家庭でも出される', category: 'sweet' },
    ],
  },
  'KZ:almaty': {
    cityName: 'Almaty', cityNameJa: 'アルマトイ',
    tourism: [
      { name: 'ゼンコフ正教会', description: '木造で世界最高の28m。釘を一本も使わない建築', category: 'culture' },
      { name: 'コクトベの丘', description: 'ロープウェイで登る展望スポット。市街とアラタウ山脈の絶景', category: 'nature' },
      { name: 'グリーンバザール', description: '活気あふれる巨大市場。スパイス、ドライフルーツ、肉', category: 'shopping', tip: '試食させてくれる店が多い' },
      { name: 'メデウ（高地スケートリンク）', description: '標高1,691mの世界一高い屋外スケートリンク', category: 'nature' },
    ],
    food: [
      { name: 'ラグマン', description: '中央アジア風うどん。トマトベースの炒め麺', category: 'must_eat' },
      { name: 'プロフ（パラフ）', description: '羊肉と人参の炊き込みご飯。中央アジアのピラフ', category: 'must_eat' },
      { name: 'カジ', description: '馬肉のソーセージ。薄切りでオードブルに', category: 'street_food' },
      { name: 'クルト', description: '乾燥させた塩味の発酵乳ボール。おつまみに最適', category: 'sweet' },
    ],
  },

  // ===== モンゴル =====
  'MN:ulaanbaatar': {
    cityName: 'Ulaanbaatar', cityNameJa: 'ウランバートル',
    tourism: [
      { name: 'チンギス・ハーン広場', description: '巨大なチンギス・ハーン像がある市の中心広場', category: 'landmark' },
      { name: 'ガンダン寺', description: 'モンゴル最大の仏教寺院。26mの観音像', category: 'culture' },
      { name: 'テレルジ国立公園', description: '市内から車で1時間の大草原。乗馬やゲル泊', category: 'nature', tip: '日帰りでも楽しめるが1泊がおすすめ' },
      { name: 'ザイサン・トルゴイ', description: '丘の上の展望台。市街を360度見渡せる', category: 'landmark' },
      { name: 'ボグドハーン宮殿博物館', description: '最後のモンゴル皇帝の冬の宮殿', category: 'culture' },
    ],
    food: [
      { name: 'ボーズ', description: '蒸し肉まん。モンゴルのソウルフード。旧正月には数百個作る', category: 'must_eat', tip: '手で持って底から肉汁を吸うのが通の食べ方' },
      { name: 'ホーショール', description: '揚げ肉まん。パリパリの皮がクセになる', category: 'street_food' },
      { name: 'ツォイバン', description: '肉と野菜の焼きうどん。モンゴルの家庭料理', category: 'must_eat' },
      { name: 'アイラグ', description: '馬乳酒。夏季限定の伝統的発酵飲料', category: 'must_eat', tip: 'お腹が弱い方は少量から試すのが安全' },
      { name: 'スーテーツァイ', description: '塩入りミルクティー。遊牧民のおもてなし', category: 'sweet' },
    ],
  },

  // ===== ドイツ =====
  'DE:berlin': {
    cityName: 'Berlin', cityNameJa: 'ベルリン',
    tourism: [
      { name: 'ブランデンブルク門', description: 'ドイツ統一の象徴。夜のライトアップが印象的', category: 'landmark' },
      { name: 'ベルリンの壁 イーストサイドギャラリー', description: '残存する壁にアーティストが描いた1.3kmのギャラリー', category: 'culture' },
      { name: '博物館島', description: '5つの世界遺産博物館が集まる島。ペルガモン博物館は必見', category: 'culture', tip: '1日パスが便利' },
      { name: 'テレビ塔', description: '高さ368m。回転レストランからの眺めは格別', category: 'landmark' },
    ],
    food: [
      { name: 'カリーヴルスト', description: 'カレーソースのかかったソーセージ。ベルリンのB級グルメ', category: 'must_eat', tip: 'Curry 36（クロイツベルク）が有名' },
      { name: 'ケバブ（デューネル）', description: 'ベルリンはヨーロッパのケバブ首都。本場トルコに匹敵', category: 'street_food', tip: 'Mustafa\'s Gemüse Kebabは行列必至' },
      { name: 'アイスバイン', description: '塩漬け豚すね肉の煮込み。ベルリン伝統料理', category: 'restaurant' },
      { name: 'ベルリーナー', description: 'ジャム入り揚げドーナツ。カーニバルの定番', category: 'sweet' },
    ],
  },
  'DE:munich': {
    cityName: 'Munich', cityNameJa: 'ミュンヘン',
    tourism: [
      { name: 'マリエン広場 & 新市庁舎', description: '仕掛け時計グロッケンシュピールは11時と12時に動く', category: 'landmark' },
      { name: 'ニンフェンブルク宮殿', description: 'バイエルン王家の夏の離宮。庭園が美しい', category: 'culture' },
      { name: 'イングリッシュガーデン', description: '都心の巨大公園。川サーフィンが名物', category: 'nature' },
      { name: 'BMW博物館', description: 'BMWの歴史と最新技術を体験', category: 'culture' },
    ],
    food: [
      { name: 'ヴァイスヴルスト', description: '白ソーセージ。甘いマスタードとプレッツェルで。午前中に食べるのが伝統', category: 'must_eat', tip: '正午前に食べるのがミュンヘン流' },
      { name: 'シュバイネハクセ', description: '豚すね肉のロースト。皮はパリパリ、中はジューシー', category: 'restaurant' },
      { name: 'ブレーツェル', description: '巨大プレッツェル。ビールの最高のお供', category: 'street_food' },
      { name: 'ビアガーデン', description: 'ホーフブロイハウスは世界一有名なビアホール', category: 'must_eat', tip: '1リットルジョッキ(マス)で注文するのが基本' },
    ],
  },

  // ===== 韓国 =====
  'KR:seoul': {
    cityName: 'Seoul', cityNameJa: 'ソウル',
    tourism: [
      { name: '景福宮（キョンボックン）', description: '朝鮮王朝の正宮。韓服レンタルで入場無料', category: 'culture', tip: '韓服を着ると入場無料になる' },
      { name: '明洞（ミョンドン）', description: 'ショッピングとコスメの聖地。日本語が通じる店も多い', category: 'shopping' },
      { name: 'Nソウルタワー', description: '南山の上にそびえる展望タワー。恋人の聖地', category: 'landmark' },
      { name: '北村韓屋村', description: '伝統的な韓屋が並ぶフォトジェニックなエリア', category: 'culture' },
      { name: '広蔵市場（クァンジャンシジャン）', description: 'ソウル最古の市場。屋台グルメの宝庫', category: 'shopping', tip: '麻薬キンパとビンデトッの屋台は必訪' },
    ],
    food: [
      { name: 'サムギョプサル', description: '厚切り豚バラ焼肉。サンチュとキムチで包んで食べる', category: 'must_eat' },
      { name: 'トッポギ', description: '甘辛ソースの餅炒め。屋台の定番', category: 'street_food' },
      { name: '参鶏湯（サムゲタン）', description: '鶏一羽にもち米と高麗人参を詰めた薬膳スープ', category: 'must_eat', tip: '土俗村（トソッチョン）が有名' },
      { name: 'チーズタッカルビ', description: 'とろけるチーズと甘辛チキンの鉄板焼き', category: 'restaurant' },
      { name: 'ホットク', description: '黒糖入りのもちもちパンケーキ。冬の屋台の定番', category: 'sweet' },
    ],
  },
  'KR:busan': {
    cityName: 'Busan', cityNameJa: '釜山',
    tourism: [
      { name: '海雲台ビーチ', description: '韓国を代表するビーチ。夏は海水浴客で賑わう', category: 'nature' },
      { name: '甘川文化村', description: 'カラフルな家々が階段状に並ぶ「韓国のマチュピチュ」', category: 'culture' },
      { name: '太宗台', description: '断崖絶壁から日本の対馬が見える絶景スポット', category: 'nature' },
      { name: 'BIFF広場', description: '映画祭の街。屋台のホットク（種ホットク）が名物', category: 'shopping' },
    ],
    food: [
      { name: 'ミルミョン', description: '釜山名物の冷麺。小麦粉ベースでさっぱり', category: 'must_eat' },
      { name: 'テジクッパ', description: '豚骨スープにご飯を入れた釜山のソウルフード', category: 'must_eat', tip: '西面（ソミョン）のテジクッパ通りが聖地' },
      { name: 'シアホットク', description: 'ナッツと蜂蜜入りの屋台パンケーキ。BIFF広場名物', category: 'sweet' },
      { name: 'チャガルチ市場の刺身', description: '新鮮な海産物をその場で刺身に', category: 'restaurant' },
    ],
  },

  // ===== 日本の人気都市（国内旅行向け） =====
  'JP:tokyo': {
    cityName: 'Tokyo', cityNameJa: '東京',
    tourism: [
      { name: '浅草寺・雷門', description: '東京最古の寺院。仲見世通りの食べ歩きも楽しい', category: 'culture' },
      { name: '東京スカイツリー', description: '高さ634m。展望デッキからの関東平野の眺望', category: 'landmark' },
      { name: '明治神宮', description: '都心のオアシス。初詣の参拝者数日本一', category: 'culture' },
      { name: '築地場外市場', description: '移転後も食べ歩きの聖地として健在', category: 'shopping' },
    ],
    food: [
      { name: '江戸前寿司', description: '本場の寿司。豊洲市場周辺に名店多数', category: 'must_eat' },
      { name: 'もんじゃ焼き', description: '月島が本場。自分で焼くのが楽しい', category: 'must_eat' },
      { name: 'ラーメン', description: '一蘭、ふうふう亭、様々なスタイルが集結', category: 'street_food' },
      { name: 'メロンパン', description: '浅草のジャンボメロンパンは食べ歩きの定番', category: 'sweet' },
    ],
  },

  // ===== タイ =====
  'TH:bangkok': {
    cityName: 'Bangkok', cityNameJa: 'バンコク',
    tourism: [
      { name: 'ワット・プラケオ（王宮）', description: '黄金に輝くエメラルド仏寺院。タイ最高峰の寺院', category: 'culture', tip: '露出の多い服装はNG。長ズボン必須' },
      { name: 'ワット・アルン', description: '暁の寺。チャオプラヤ川沿いに佇む美しい仏塔', category: 'culture' },
      { name: 'チャトゥチャック市場', description: '1万5千以上の店舗がひしめく世界最大級の週末市場', category: 'shopping', tip: '土日のみ開催。午前中が涼しくておすすめ' },
      { name: 'カオサン通り', description: 'バックパッカーの聖地。夜のナイトマーケットが賑やか', category: 'shopping' },
    ],
    food: [
      { name: 'パッタイ', description: 'タイ風焼きそば。甘酸っぱいソースがクセになる', category: 'must_eat' },
      { name: 'トムヤムクン', description: '世界三大スープの一つ。辛くて酸っぱいエビのスープ', category: 'must_eat' },
      { name: 'カオマンガイ', description: 'タイ式チキンライス。ピンクのカオマンガイ屋が有名', category: 'street_food', tip: 'プラトゥーナムの「ピンクのカオマンガイ」が行列店' },
      { name: 'マンゴースティッキーライス', description: '完熟マンゴーとココナッツミルクのもち米。最高のデザート', category: 'sweet' },
    ],
  },

  // ===== 台湾 =====
  'TW:taipei': {
    cityName: 'Taipei', cityNameJa: '台北',
    tourism: [
      { name: '台北101', description: '高さ509mのランドマーク。展望台から市街を一望', category: 'landmark' },
      { name: '九份（きゅうふん）', description: '「千と千尋の神隠し」の舞台と噂される幻想的な街', category: 'culture', tip: '夕暮れ時が最も美しい。平日がおすすめ' },
      { name: '龍山寺', description: '台北最古のパワースポット。おみくじは赤い三日月形', category: 'culture' },
      { name: '士林夜市', description: '台北最大の夜市。地下のフードコートが充実', category: 'shopping' },
    ],
    food: [
      { name: '小籠包', description: '鼎泰豊（ディンタイフォン）が世界的に有名。薄皮から溢れる肉汁', category: 'must_eat', tip: '本店は信義路。朝一番が空いている' },
      { name: '牛肉麺', description: '台湾の国民食。醤油ベースの紅焼と塩ベースの清燉', category: 'must_eat' },
      { name: '魯肉飯（ルーローファン）', description: '甘辛い豚そぼろご飯。屋台で50元前後', category: 'street_food' },
      { name: '豆花（トウファ）', description: '優しい甘さの豆腐デザート。トッピング自由', category: 'sweet' },
    ],
  },

  // ===== アメリカ =====
  'US:newyork': {
    cityName: 'New York', cityNameJa: 'ニューヨーク',
    tourism: [
      { name: '自由の女神', description: 'アメリカの象徴。フェリーで自由の島へ', category: 'landmark', tip: '王冠まで登るには事前予約必須' },
      { name: 'タイムズスクエア', description: '世界の交差点。ネオンが輝く不夜城', category: 'landmark' },
      { name: 'セントラルパーク', description: 'マンハッタンの巨大な緑のオアシス', category: 'nature' },
      { name: 'メトロポリタン美術館', description: '世界三大美術館の一つ。エジプト神殿もある', category: 'culture' },
    ],
    food: [
      { name: 'NYスタイルピザ', description: '薄くて大きな1スライス。折り畳んで食べるのがNY流', category: 'must_eat', tip: 'Joe\'s Pizza（グリニッジビレッジ）が定番' },
      { name: 'ベーグル', description: 'NYのベーグルは水が違う。クリームチーズ＆ロックスが王道', category: 'must_eat' },
      { name: 'ハラルガイズ', description: 'NYの屋台メシの王様。チキンオーバーライス', category: 'street_food' },
      { name: 'チーズケーキ', description: 'NY発祥の濃厚チーズケーキ。Junior\'sが元祖', category: 'sweet' },
    ],
  },

  // ===== ハワイ =====
  'US:honolulu': {
    cityName: 'Honolulu', cityNameJa: 'ホノルル',
    tourism: [
      { name: 'ワイキキビーチ', description: 'ハワイを代表するビーチ。ダイヤモンドヘッドを背景にサーフィンや日光浴', category: 'nature' },
      { name: 'ダイヤモンドヘッド', description: '往復1.5時間のハイキングコース。山頂からワイキキと太平洋の絶景', category: 'nature', tip: '朝6時の開門直後が涼しくて空いている。入場予約必須' },
      { name: 'パールハーバー（真珠湾）', description: 'USSアリゾナ記念館で歴史を学ぶ。無料チケットは朝早く取る', category: 'culture', tip: 'バッグ持込不可。ロッカーあり($5)' },
      { name: 'カイルア＆ラニカイビーチ', description: '地元民に愛される全米No.1ビーチ。エメラルドグリーンの海', category: 'nature' },
      { name: 'アラモアナセンター', description: '世界最大級のオープンエアモール。300以上の店舗', category: 'shopping' },
    ],
    food: [
      { name: 'ガーリックシュリンプ', description: 'ノースショアの名物。ニンニクバターで炒めたエビ', category: 'must_eat', tip: 'ジョバンニ（Giovanni\'s）のワゴンが元祖' },
      { name: 'ポケ丼', description: 'マグロやサーモンの漬け丼。ハワイのソウルフード', category: 'must_eat' },
      { name: 'ロコモコ', description: 'ご飯にハンバーグと目玉焼き、グレイビーソース', category: 'must_eat' },
      { name: 'アサイーボウル', description: 'フルーツたっぷりの朝食定番。Haleiwa Bowlsが人気', category: 'sweet' },
      { name: 'マラサダ', description: 'ポルトガル由来の揚げドーナツ。Leonard\'sが有名', category: 'sweet', tip: 'ココナッツやカスタード入りがおすすめ' },
    ],
  },
  'US:maui': {
    cityName: 'Maui', cityNameJa: 'マウイ',
    tourism: [
      { name: 'ハレアカラ山', description: '標高3,055mの火山。雲海の上でのサンライズは「人生で一度は見るべき」', category: 'nature', tip: '日の出観賞は予約必須。防寒着も必要' },
      { name: 'ハナへの道', description: '600以上のカーブと54の橋を超える絶景ドライブ。熱帯雨林と滝', category: 'nature' },
      { name: 'モロキニ島', description: '三日月形の無人島。シュノーケリングの聖地。透明度30m超', category: 'nature' },
    ],
    food: [
      { name: 'フィッシュタコス', description: '新鮮な魚のタコス。ビーチサイドの店が最高', category: 'must_eat' },
      { name: 'シェイブアイス', description: 'ハワイ式かき氷。マウイのUlu\'s Shave Iceが絶品', category: 'sweet' },
    ],
  },

  // ===== シンガポール =====
  'SG:singapore': {
    cityName: 'Singapore', cityNameJa: 'シンガポール',
    tourism: [
      { name: 'マリーナベイ・サンズ', description: '屋上インフィニティプールで有名な複合施設。展望デッキも一般公開', category: 'landmark' },
      { name: 'ガーデンズ・バイ・ザ・ベイ', description: '未来的なスーパーツリーと花のドーム。夜のライトショー必見', category: 'nature', tip: '毎晩19:45と20:45のライトショーは無料' },
      { name: 'セントーサ島', description: 'ユニバーサルスタジオ、水族館、ビーチのリゾートアイランド', category: 'nature' },
      { name: 'チャイナタウン', description: '仏牙寺やホーカーズ（屋台街）。Maxwell Food Centreが有名', category: 'culture' },
    ],
    food: [
      { name: 'チキンライス（海南鶏飯）', description: 'シンガポールの国民食。天天海南鶏飯がミシュラン掲載', category: 'must_eat' },
      { name: 'チリクラブ', description: '甘辛いチリソースの蟹。揚げパンですくって食べる', category: 'must_eat', tip: 'ジャンボシーフード（Jumbo）が定番' },
      { name: 'ラクサ', description: 'ココナッツミルクとスパイスの麺料理', category: 'must_eat' },
      { name: 'カヤトースト', description: 'ココナッツジャムのトースト。朝食の定番', category: 'sweet' },
    ],
  },

  // ===== ベトナム =====
  'VN:hanoi': {
    cityName: 'Hanoi', cityNameJa: 'ハノイ',
    tourism: [
      { name: 'ホアンキエム湖', description: '旧市街の中心にある湖。朝の太極拳風景が美しい', category: 'nature' },
      { name: 'ハロン湾', description: '世界遺産の奇岩群。クルーズツアーが人気', category: 'nature', tip: '日帰りより1泊クルーズがおすすめ' },
      { name: '旧市街36通り', description: '活気あふれる商店街。通りごとに扱う品が違う', category: 'shopping' },
    ],
    food: [
      { name: 'フォー', description: '牛骨スープの米麺。Pho Thinが地元民に人気', category: 'must_eat' },
      { name: 'ブンチャー', description: '炭火焼き肉とつけ麺。オバマ大統領も食べた', category: 'must_eat' },
      { name: 'エッグコーヒー', description: '卵黄とコンデンスミルクのコーヒー。Giang Cafeが元祖', category: 'sweet' },
    ],
  },
  'VN:hochiminh': {
    cityName: 'Ho Chi Minh', cityNameJa: 'ホーチミン',
    tourism: [
      { name: 'ベンタイン市場', description: '市内最大の市場。衣料品、雑貨、食品が揃う', category: 'shopping' },
      { name: '統一会堂', description: '旧南ベトナム大統領官邸。歴史的建造物', category: 'culture' },
    ],
    food: [
      { name: 'バインミー', description: 'ベトナム風サンドイッチ。屋台で50円程度', category: 'must_eat' },
      { name: 'コムタム', description: '砕き米に焼肉と目玉焼き。庶民の味', category: 'must_eat' },
    ],
  },
  // ===== トルコ =====
  'TR:istanbul': {
    cityName: 'Istanbul', cityNameJa: 'イスタンブール',
    tourism: [
      { name: 'アヤソフィア', description: 'ビザンツ建築の最高傑作。巨大ドームとモザイク画', category: 'landmark', tip: '朝一番の入場がおすすめ。混雑を避けられる' },
      { name: 'ブルーモスク（スルタンアフメト・モスク）', description: '6本のミナレットと美しい青いタイルが特徴', category: 'culture', tip: '礼拝時間は観光不可。スカーフが必要' },
      { name: 'グランドバザール', description: '4000店以上が並ぶ世界最大級の屋根付き市場', category: 'shopping', tip: '値切り交渉は文化の一部。最初の言い値の半額から交渉スタート' },
      { name: 'トプカプ宮殿', description: 'オスマン帝国のスルタンの居城。宝物館は必見', category: 'landmark', tip: 'ハレムは別料金だが見る価値あり' },
      { name: 'ボスポラス海峡クルーズ', description: 'アジアとヨーロッパの間を船で巡る。絶景の連続', category: 'nature', tip: '公営フェリーが安くておすすめ' },
    ],
    food: [
      { name: 'ケバブ', description: '炭火焼きの羊肉や鶏肉。ドネルケバブは回転焼き', category: 'must_eat', tip: 'ドネルケバブは屋台、イスケンデルケバブはレストランで' },
      { name: 'サバサンド（バルック・エクメック）', description: 'ガラタ橋で名物の焼きサバサンド', category: 'street_food', tip: 'エミノニュの船上レストランが有名' },
      { name: 'バクラヴァ', description: '薄いパイ生地にナッツとシロップの甘味菓子', category: 'sweet', tip: 'カラキョイ・ギュルオールが老舗名店' },
      { name: 'チャイ', description: 'トルコ式紅茶。チューリップ型グラスで提供', category: 'must_eat', tip: 'どのカフェでも注文可。1杯30円程度' },
      { name: 'メネメン', description: 'トマトと卵の炒め物。朝食の定番', category: 'restaurant' },
    ],
  },
  'TR:cappadocia': {
    cityName: 'Cappadocia', cityNameJa: 'カッパドキア',
    tourism: [
      { name: '気球ツアー', description: '奇岩群の上空を熱気球で遊覧。日の出フライトが絶景', category: 'nature', tip: '要事前予約。天候で中止あり。150〜250ドル程度' },
      { name: 'ギョレメ野外博物館', description: '岩窟教会群。フレスコ画が保存されたユネスコ世界遺産', category: 'culture', tip: '暗い教会（カランルク・キリセ）は別料金だが必見' },
      { name: 'デリンクユ地下都市', description: '地下8層に及ぶ古代の地下都市。数千人が暮らせた規模', category: 'landmark', tip: '閉所恐怖症の方は注意。涼しいので上着を' },
      { name: 'ウチヒサル城', description: '巨大な岩山を削って作られた要塞。頂上からの絶景', category: 'landmark', tip: '夕暮れ時がフォトスポットとして最高' },
      { name: 'ローズバレー・ハイキング', description: 'ピンクの岩壁が広がる渓谷。夕日が美しい', category: 'nature', tip: '約3km。スニーカー必須。水を持参' },
    ],
    food: [
      { name: 'テスティ・ケバブ（壺ケバブ）', description: '素焼きの壺で煮込んだ肉料理。壺を割って提供するパフォーマンスが名物', category: 'must_eat', tip: 'カッパドキア名物。どのレストランでもメニューにある' },
      { name: 'マントゥ', description: 'トルコ式小型ラビオリ。ヨーグルトソースで食べる', category: 'must_eat', tip: 'カイセリ名物だがカッパドキアでも定番' },
      { name: 'ギョズレメ', description: '薄い生地にチーズやほうれん草を包んだクレープ風', category: 'street_food', tip: '地元のおばちゃんが鉄板で焼く屋台が美味しい' },
      { name: 'トルコアイス（ドンドゥルマ）', description: '伸びるアイス。売り手のパフォーマンスも楽しい', category: 'sweet', tip: '受け取りのやり取りを楽しんで' },
      { name: 'アイラン', description: '塩味のヨーグルトドリンク。ケバブとの相性抜群', category: 'must_eat', tip: '暑い日のリフレッシュに最適' },
    ],
  },
  // ===== フランス =====
  'FR:paris': {
    cityName: 'Paris', cityNameJa: 'パリ',
    tourism: [
      { name: 'エッフェル塔', description: '高さ324mのパリのシンボル。夜の毎正時のシャンパンフラッシュは必見', category: 'landmark', tip: '事前にオンライン予約必須。2階のレストランも人気' },
      { name: 'ルーヴル美術館', description: '世界最大級の美術館。モナリザ、ミロのヴィーナスなど所蔵', category: 'culture', tip: '水・金の夜間開館は比較的空いている' },
      { name: 'ノートルダム大聖堂', description: 'ゴシック建築の傑作。2024年12月に修復後再オープン', category: 'landmark', tip: '外観見学は自由。内部入場は予約推奨' },
      { name: 'モンマルトルとサクレ・クール寺院', description: '丘の上の白亜の寺院。パリを一望できる階段が有名', category: 'culture', tip: 'テルトル広場の画家たちの似顔絵も楽しい' },
      { name: 'シャンゼリゼ通りと凱旋門', description: '世界で最も美しい大通り。凱旋門の屋上から360度のパノラマ', category: 'shopping', tip: '凱旋門は夜のライトアップ時がおすすめ' },
    ],
    food: [
      { name: 'クロワッサン', description: 'バターたっぷりのサクサク生地。パリのパン屋で焼きたてを', category: 'must_eat', tip: '地元のブーランジュリーで朝食に。1〜2ユーロ程度' },
      { name: 'ステーキ・フリット', description: '牛ステーキとフレンチフライのシンプルな定番ビストロ料理', category: 'restaurant', tip: 'Le Relais de l\'Entrecôteが有名。ソースが絶品' },
      { name: 'クレープ', description: 'モンパルナス周辺のクレープリーが本場。そば粉のガレットも', category: 'street_food', tip: '甘いクレープと食事系ガレットの両方を試して' },
      { name: 'マカロン', description: 'ラデュレやピエール・エルメの色とりどりのマカロン', category: 'sweet', tip: 'ラデュレのシャンゼリゼ店はお土産にも最適' },
      { name: 'オニオングラタンスープ', description: '飴色玉ねぎとグリュイエールチーズの濃厚スープ', category: 'must_eat', tip: '冬のパリで体が温まる一品' },
    ],
  },
  // ===== スペイン =====
  'ES:barcelona': {
    cityName: 'Barcelona', cityNameJa: 'バルセロナ',
    tourism: [
      { name: 'サグラダ・ファミリア', description: 'ガウディ未完の最高傑作。2026年完成予定の巨大聖堂', category: 'landmark', tip: '必ず事前オンライン予約。塔のエレベーターは別料金だが絶景' },
      { name: 'グエル公園', description: 'ガウディのモザイクタイルが美しい公園。バルセロナを一望', category: 'nature', tip: '有料エリアは時間指定予約制。朝一番が空いている' },
      { name: 'カサ・バトリョ', description: 'ガウディ設計の曲線美が光る邸宅。内部見学可能', category: 'culture', tip: 'ナイトツアーが幻想的でおすすめ' },
      { name: 'ランブラス通り', description: 'バルセロナの目抜き通り。大道芸やフラワーショップが並ぶ', category: 'shopping', tip: 'スリに注意。ボケリア市場も隣接' },
      { name: 'ゴシック地区（バリオ・ゴティコ）', description: '中世の街並みが残る旧市街。カテドラルや小さな広場が点在', category: 'culture', tip: '迷路のような路地を散策するのが楽しい' },
    ],
    food: [
      { name: 'パエリア', description: 'サフラン香る米料理。シーフードやミックスが定番', category: 'must_eat', tip: 'バルセロネータ海岸沿いのレストランがおすすめ' },
      { name: 'タパス', description: '小皿料理を数種類注文してシェア。パタタス・ブラバスが人気', category: 'must_eat', tip: 'バルをハシゴする"バル巡り"が地元流' },
      { name: 'ハモン・イベリコ', description: 'どんぐりで育った黒豚の生ハム。薄切りで提供', category: 'must_eat', tip: 'ボケリア市場で試食してから購入が賢い' },
      { name: 'チュロス・コン・チョコラテ', description: '揚げたてチュロスを濃厚ホットチョコレートにディップ', category: 'sweet', tip: '朝食やおやつに。地元チェーンも美味しい' },
      { name: 'ボンバ', description: 'バルセロナ名物のコロッケ。ジャガイモと肉のボール', category: 'street_food', tip: 'バルセロネータ地区の老舗バルで' },
    ],
  },
  'ES:madrid': {
    cityName: 'Madrid', cityNameJa: 'マドリード',
    tourism: [
      { name: 'プラド美術館', description: '世界三大美術館の一つ。ベラスケス、ゴヤの傑作を所蔵', category: 'culture', tip: '月〜土18:00以降は無料入館。日祝17:00以降無料' },
      { name: '王宮（パラシオ・レアル）', description: 'ヨーロッパ最大級の王宮。3,418室の壮大な宮殿', category: 'landmark', tip: '水曜はEU市民無料で混雑。午前中がおすすめ' },
      { name: 'レティーロ公園', description: '125ヘクタールの広大な公園。水晶宮やボートが人気', category: 'nature', tip: '日曜の散歩が地元流。バラ園は5-6月が見頃' },
      { name: 'ソフィア王妃芸術センター', description: 'ピカソのゲルニカを所蔵する近現代美術館', category: 'culture', tip: '月水〜土19:00以降無料' },
      { name: 'マヨール広場', description: '17世紀の歴史的広場。カフェやレストランに囲まれる', category: 'landmark' },
    ],
    food: [
      { name: 'コシード・マドリレーニョ', description: 'ひよこ豆と肉の煮込み。マドリードの冬の定番', category: 'must_eat', tip: '伝統的に3皿に分けて提供される' },
      { name: 'カラマリ・サンドイッチ', description: 'イカリングのサンドイッチ。マヨール広場の名物', category: 'street_food', tip: 'マヨール広場周辺のバルで3〜4ユーロ' },
      { name: 'トルティーヤ・エスパニョーラ', description: 'ジャガイモ入りスペインオムレツ。バルの定番タパス', category: 'must_eat' },
      { name: 'チョコラテ・コン・チュロス', description: 'Chocolatería San Ginésが聖地。24時間営業', category: 'sweet', tip: '深夜のチュロスは格別' },
      { name: 'ボカディージョ・デ・カラマレス', description: 'イカフライのサンドイッチ。マドリード名物B級グルメ', category: 'street_food' },
    ],
  },
  // ===== イギリス =====
  'GB:london': {
    cityName: 'London', cityNameJa: 'ロンドン',
    tourism: [
      { name: 'ビッグ・ベンと国会議事堂', description: 'テムズ川沿いに建つロンドンの象徴。夜のライトアップが美しい', category: 'landmark', tip: 'ウェストミンスター橋からの撮影がベスト' },
      { name: '大英博物館', description: '800万点以上のコレクション。ロゼッタストーン、エルギン・マーブルなど', category: 'culture', tip: '入場無料。金曜は20:30まで開館' },
      { name: 'バッキンガム宮殿', description: '英国王室の公邸。衛兵交代式は11:00から約45分', category: 'landmark', tip: '衛兵交代は月水金日に実施（要確認）。30分前に場所取り' },
      { name: 'タワー・ブリッジ', description: 'テムズ川に架かる跳ね橋。ガラスの歩道橋から絶景', category: 'landmark', tip: '橋が開く時間はウェブサイトで確認可能' },
      { name: 'ノッティングヒル', description: 'カラフルな家並みとポートベローマーケットが有名', category: 'shopping', tip: '土曜のアンティークマーケットが最も賑わう' },
    ],
    food: [
      { name: 'フィッシュ＆チップス', description: '白身魚のフライとチップス。モルトビネガーをかけて', category: 'must_eat', tip: 'Poppies Fish & ChipsやThe Golden Hindが有名' },
      { name: 'サンデーロースト', description: '日曜の伝統料理。ローストビーフにヨークシャープディング', category: 'must_eat', tip: '日曜にパブで注文するのが本場流' },
      { name: 'アフタヌーンティー', description: '紅茶とスコーン、サンドイッチ、ケーキの3段トレイ', category: 'restaurant', tip: '要予約。Fortnum & Masonが王道' },
      { name: 'パイ＆マッシュ', description: 'ミートパイとマッシュポテト。伝統的なイーストエンド料理', category: 'must_eat' },
      { name: 'フルイングリッシュブレックファスト', description: '卵、ベーコン、ソーセージ、豆、トースト等のフル朝食', category: 'must_eat', tip: 'B&Bやホテルの朝食で体験を' },
    ],
  },
  // ===== イタリア =====
  'IT:rome': {
    cityName: 'Rome', cityNameJa: 'ローマ',
    tourism: [
      { name: 'コロッセオ', description: '約2000年前の円形闘技場。古代ローマの象徴', category: 'landmark', tip: 'コロッセオ+フォロロマーノの共通チケットを事前購入' },
      { name: 'バチカン美術館とシスティーナ礼拝堂', description: 'ミケランジェロの天井画「天地創造」と「最後の審判」', category: 'culture', tip: '金曜夜間開館が穴場。オンライン予約必須' },
      { name: 'トレヴィの泉', description: 'コインを投げると再びローマに戻れるという伝説の噴水', category: 'landmark', tip: '早朝か夜が比較的空いている' },
      { name: 'パンテオン', description: '約1900年前の神殿。世界最大の無補強コンクリートドーム', category: 'culture', tip: '入場無料だが予約推奨。雨の日はドームの穴から雨が入る' },
      { name: 'スペイン広場と階段', description: '映画「ローマの休日」で有名な階段。周辺はブランド街', category: 'landmark', tip: '階段での飲食は罰金。座って記念撮影を' },
    ],
    food: [
      { name: 'カルボナーラ', description: 'グアンチャーレ、ペコリーノ、卵黄の濃厚パスタ。ローマ発祥', category: 'must_eat', tip: 'Roscioli, Da Enzo al 29が地元で人気' },
      { name: 'カチョエペペ', description: 'ペコリーノチーズと黒胡椒だけのシンプルパスタ', category: 'must_eat', tip: 'シンプルだからこそ店の実力がわかる' },
      { name: 'ジェラート', description: 'イタリアンアイスクリーム。Giolitti, Fatamorganaが名店', category: 'sweet', tip: '「artigianale（手作り）」の店を選ぶのがコツ' },
      { name: 'サルティンボッカ', description: '仔牛肉にプロシュートとセージを重ねた伝統料理', category: 'restaurant' },
      { name: 'スップリ', description: 'ローマ風ライスコロッケ。モッツァレラが伸びる', category: 'street_food', tip: '揚げたてが最高。ピッツェリアで前菜に' },
    ],
  },
  'IT:venice': {
    cityName: 'Venice', cityNameJa: 'ヴェネツィア',
    tourism: [
      { name: 'サン・マルコ広場と大聖堂', description: '「世界で最も美しい広場」。ビザンチン様式の大聖堂', category: 'landmark', tip: '朝8時前なら比較的空いている' },
      { name: 'ゴンドラクルーズ', description: '運河を手漕ぎ船で巡る。ヴェネツィアの象徴体験', category: 'nature', tip: '正規料金は80ユーロ（30分）。乗合で割安に' },
      { name: 'リアルト橋', description: '大運河に架かる最古の橋。周辺に市場やショップ', category: 'landmark' },
      { name: 'ドゥカーレ宮殿', description: '総督の居城。ため息の橋も隣接', category: 'culture', tip: 'シークレットツアーで通常非公開エリアも見学可能' },
      { name: 'ブラーノ島', description: 'カラフルな家が並ぶ離島。レース編みの島としても有名', category: 'nature', tip: '水上バスで約45分。半日のショートトリップに最適' },
    ],
    food: [
      { name: 'イカ墨パスタ', description: 'ヴェネツィア名物。真っ黒だが濃厚な海の旨味', category: 'must_eat', tip: 'リアルト橋周辺の地元レストランで' },
      { name: 'チケッティ', description: 'ヴェネツィア版タパス。バーカロ（居酒屋）でつまむ小皿料理', category: 'street_food', tip: 'Cantina Do Spadeが老舗。1皿1〜3ユーロ' },
      { name: 'フリット・ミスト', description: '新鮮な魚介のフリッター盛り合わせ', category: 'must_eat' },
      { name: 'ティラミス', description: 'ヴェネト地方発祥の定番デザート', category: 'sweet' },
      { name: 'スプリッツ', description: 'アペロール＋プロセッコのオレンジ色カクテル。夕暮れに最適', category: 'must_eat', tip: 'サン・マルコ広場のカフェは高額。路地裏のバルが地元価格' },
    ],
  },
  // ===== オランダ =====
  'NL:amsterdam': {
    cityName: 'Amsterdam', cityNameJa: 'アムステルダム',
    tourism: [
      { name: 'アンネ・フランクの家', description: '「アンネの日記」の隠れ家。戦争の記憶を伝える博物館', category: 'culture', tip: 'オンライン予約必須。6週間前から発売、即完売することも' },
      { name: 'ゴッホ美術館', description: '200点以上のゴッホ作品を所蔵。「ひまわり」「自画像」など', category: 'culture', tip: 'オンライン時間指定予約制。ミュージアムカードが便利' },
      { name: '運河クルーズ', description: 'ユネスコ世界遺産の環状運河を船で巡る。1時間程度', category: 'nature', tip: '夜のライトアップクルーズも幻想的' },
      { name: 'アムステルダム国立美術館', description: 'レンブラント「夜警」をはじめオランダ黄金時代の名画', category: 'culture', tip: '「I amsterdam」サインは撤去されたが建物自体が見事' },
      { name: 'ヨルダン地区', description: '運河沿いのおしゃれなエリア。カフェやギャラリーが点在', category: 'shopping', tip: '土曜のノールダーマルクト（蚤の市）が人気' },
    ],
    food: [
      { name: 'ストロープワッフル', description: '薄いワッフル2枚でキャラメルシロップを挟んだ焼き菓子', category: 'must_eat', tip: 'アルバート・カイプ市場の焼きたてが絶品' },
      { name: 'ハーリング（ニシン）', description: '生のニシンに玉ねぎとピクルスを添えて。屋台で立ち食い', category: 'street_food', tip: '魚屋台で「broodje haring（パン挟み）」が食べやすい' },
      { name: 'クロケット', description: 'クリーミーなミートコロッケ。自動販売機FEBOが名物', category: 'street_food', tip: 'FEBO（壁の自販機）で買うのがアムステルダム流' },
      { name: 'パンネクーケン', description: 'オランダ式パンケーキ。甘い系も食事系もあり', category: 'must_eat', tip: 'The Pancake Bakeryが観光客に人気' },
      { name: 'ビターバレン', description: '丸いミートコロッケ。ビールのお供に最適', category: 'must_eat', tip: 'マスタードをつけて。パブで注文するのが定番' },
    ],
  },
  // ===== ベルギー =====
  'BE:brussels': {
    cityName: 'Brussels', cityNameJa: 'ブリュッセル',
    tourism: [
      { name: 'グランプラス', description: '「世界で最も美しい広場」。ギルドハウスに囲まれた世界遺産', category: 'landmark', tip: '夜のライトアップが壮観。夏はフラワーカーペットも' },
      { name: '小便小僧', description: 'ブリュッセルの象徴。季節やイベントに合わせた衣装も', category: 'landmark', tip: 'グランプラスから徒歩3分。思ったより小さいので見逃し注意' },
      { name: 'ベルギー王立美術館', description: 'ブリューゲル、ルーベンス、マグリットの名画を所蔵', category: 'culture', tip: 'マグリット美術館は隣接の別館' },
      { name: 'アトミウム', description: '1958年万博のシンボル。巨大な原子模型の建造物', category: 'landmark', tip: '最上部の球体から市内を一望。隣のミニ・ヨーロッパも楽しい' },
      { name: 'ギャルリー・サンテュベール', description: 'ヨーロッパ最古のアーケード商店街。ガラスの天蓋が美しい', category: 'shopping', tip: 'ベルギーチョコの有名店が軒を連ねる' },
    ],
    food: [
      { name: 'ベルギーワッフル', description: 'ブリュッセル式（長方形、軽い）とリエージュ式（丸形、甘い）', category: 'must_eat', tip: 'Maison Dandoyが老舗。焼きたてを路上で' },
      { name: 'ムール貝のワイン蒸し（ムール・フリット）', description: '大鍋いっぱいのムール貝とフライドポテト', category: 'must_eat', tip: 'Chez Léonが観光客向け。地元ならAux Armes de Bruxelles' },
      { name: 'ベルギーチョコレート', description: 'Godiva、Pierre Marcolini、Neuhaus等の本場チョコ', category: 'sweet', tip: 'グランプラス周辺に直営店が集中。試食できる店も多い' },
      { name: 'フリッツ（ベルギーフライ）', description: '二度揚げでカリカリの本場フレンチフライ', category: 'street_food', tip: 'Maison Antoineが地元で最も有名なフリッツスタンド' },
      { name: 'カルボナード・フラマンド', description: 'ビール煮込みの牛肉シチュー。パンにつけて食べる', category: 'restaurant' },
    ],
  },
  // ===== フィンランド =====
  'FI:helsinki': {
    cityName: 'Helsinki', cityNameJa: 'ヘルシンキ',
    tourism: [
      { name: 'ヘルシンキ大聖堂', description: '白亜のネオクラシカル様式大聖堂。元老院広場のシンボル', category: 'landmark', tip: '入場無料。階段からの眺めが素晴らしい' },
      { name: 'テンペリアウキオ教会（岩の教会）', description: '巨大な岩盤をくり抜いて建てた独創的な教会', category: 'culture', tip: '音響が素晴らしくコンサートも開催' },
      { name: 'スオメンリンナ要塞', description: '世界遺産の海上要塞。フェリーで15分の日帰り観光地', category: 'landmark', tip: '夏季がベスト。ピクニックセットを持参で' },
      { name: 'マーケット広場', description: '港沿いの青空市場。地元の食材やお土産が並ぶ', category: 'shopping', tip: 'サーモンスープの屋台が絶品' },
      { name: 'サウナ体験', description: 'フィンランド文化の真髄。公衆サウナで地元民と交流', category: 'culture', tip: 'Löyly（ロウリュ）は海辺のモダンサウナで観光客にも人気' },
    ],
    food: [
      { name: 'サーモンスープ（ロヒケイット）', description: 'クリーミーなサーモンスープ。ディルがアクセント', category: 'must_eat', tip: 'マーケット広場の屋台で食べるのが定番' },
      { name: 'カルヤランピーラッカ', description: 'カレリア地方の米入りライ麦パイ。バター卵ペーストをのせて', category: 'must_eat', tip: 'カフェで朝食に' },
      { name: 'トナカイ肉', description: 'ラップランド名物。ステーキやシチューで提供', category: 'restaurant', tip: 'ヘルシンキでもレストランで食べられる' },
      { name: 'シナモンロール（コルヴァプースティ）', description: 'カルダモン香るフィンランド式シナモンロール', category: 'sweet', tip: 'カフェ文化が盛ん。コーヒーと一緒に' },
      { name: 'サルミアッキ', description: '塩味の黒リコリス飴。好き嫌いが極端に分かれる', category: 'sweet', tip: '話のネタに一度は試す価値あり' },
    ],
  },
  // ===== スイス =====
  'CH:zurich': {
    cityName: 'Zurich', cityNameJa: 'チューリッヒ',
    tourism: [
      { name: 'バーンホフ通り', description: '世界屈指の高級ショッピング通り。1.4kmの目抜き通り', category: 'shopping' },
      { name: 'チューリッヒ湖', description: 'アルプスを背景にした美しい湖。遊覧船やSUPが人気', category: 'nature', tip: '湖畔のBürkliplatz周辺でのんびりが最高' },
      { name: '旧市街（アルトシュタット）', description: '中世の面影が残る石畳の路地。リンデンホフの丘から絶景', category: 'culture' },
      { name: 'グロスミュンスター大聖堂', description: 'ロマネスク様式の双塔が象徴的な大聖堂', category: 'landmark', tip: '塔に登ると旧市街を一望できる' },
      { name: 'スイス国立博物館', description: 'スイスの歴史と文化を網羅する博物館', category: 'culture', tip: '中央駅すぐ隣。雨の日の観光に最適' },
    ],
    food: [
      { name: 'チーズフォンデュ', description: 'グリュイエールとエメンタールチーズをワインで溶かした定番', category: 'must_eat', tip: 'Swiss Chuchi（ホテル・アドラー内）が老舗' },
      { name: 'ラクレット', description: '溶かしたチーズをジャガイモやピクルスにかけて', category: 'must_eat', tip: '冬季が特におすすめ' },
      { name: 'レシュティ', description: 'スイス風ハッシュブラウン。カリカリに焼いたジャガイモ', category: 'must_eat' },
      { name: 'チョコレート', description: 'Sprüngli, Lindt等の本場スイスチョコ', category: 'sweet', tip: 'Confiserie Sprüngliのトリュフが絶品' },
      { name: 'ビルヒャーミューズリ', description: 'チューリッヒ発祥のオーツ麦朝食。ヨーグルトとフルーツ', category: 'must_eat', tip: '発祥地で本物を食べる贅沢' },
    ],
  },
  // ===== オーストリア =====
  'AT:vienna': {
    cityName: 'Vienna', cityNameJa: 'ウィーン',
    tourism: [
      { name: 'シェーンブルン宮殿', description: 'ハプスブルク家の夏の離宮。1,441室の豪華な宮殿と庭園', category: 'landmark', tip: 'グランドツアー（40室）がおすすめ。庭園は無料' },
      { name: 'シュテファン大聖堂', description: 'ウィーンの象徴。モザイク屋根と南塔からの眺望', category: 'landmark', tip: '南塔343段の階段を登ると市内を一望' },
      { name: 'ベルヴェデーレ宮殿', description: 'クリムトの「接吻」を所蔵するバロック様式の宮殿', category: 'culture', tip: '上宮の美術館がメイン。庭園は無料' },
      { name: 'ウィーン国立歌劇場', description: '世界最高峰のオペラハウス。ガイドツアーも可能', category: 'culture', tip: '立ち見席は当日4ユーロ。2時間前から並ぶ' },
      { name: 'ナッシュマルクト', description: '120以上の屋台が並ぶ食の市場。多国籍料理も充実', category: 'shopping', tip: '土曜の蚤の市が併設される' },
    ],
    food: [
      { name: 'ウィーナーシュニッツェル', description: '仔牛肉の薄切りカツレツ。レモンを絞って', category: 'must_eat', tip: 'Figlmüllerが有名。顔より大きいサイズ' },
      { name: 'ザッハトルテ', description: 'チョコレートケーキの王様。Hotel Sacherが元祖', category: 'sweet', tip: 'Café Sacherで本家を。Demelも美味しい' },
      { name: 'アプフェルシュトゥルーデル', description: 'リンゴのパイ包み。バニラソースやアイスを添えて', category: 'sweet', tip: 'カフェで温かいうちに食べるのが一番' },
      { name: 'ターフェルシュピッツ', description: '牛肉の煮込み。ホースラディッシュソースで', category: 'restaurant', tip: 'Plachuttaが専門店として有名' },
      { name: 'カフェ文化', description: 'ウィーンのカフェは世界遺産。メランジェ（カフェラテ）で一息', category: 'must_eat', tip: 'Café Centralは豪華な内装で人気' },
    ],
  },
  // ===== 香港 =====
  'HK:hongkong': {
    cityName: 'Hong Kong', cityNameJa: '香港',
    tourism: [
      { name: 'ヴィクトリア・ピーク', description: '標高552mから香港の夜景を一望。世界三大夜景の一つ', category: 'nature', tip: 'ピークトラム（ケーブルカー）で登るのが定番' },
      { name: 'シンフォニー・オブ・ライツ', description: '毎晩20:00からのビル群のライトショー', category: 'landmark', tip: 'チムサーチョイのプロムナードから鑑賞' },
      { name: '天壇大仏（ランタオ島）', description: '高さ34mの世界最大級の屋外青銅座仏', category: 'culture', tip: 'ゴンピン360ロープウェイで行くのがおすすめ' },
      { name: 'スターフェリー', description: '香港島〜九龍を結ぶレトロなフェリー。片道3HKD', category: 'landmark', tip: '夜の乗船で夜景を満喫。所要約10分' },
      { name: '女人街（旺角）', description: '衣類や雑貨の屋台が並ぶナイトマーケット', category: 'shopping', tip: '値切り交渉は必須。夕方から賑わう' },
    ],
    food: [
      { name: '飲茶（ヤムチャ）', description: '点心をワゴンから選ぶ広東式ブランチ文化', category: 'must_eat', tip: 'Tim Ho Wanはミシュラン星付き点心が安価で食べられる' },
      { name: 'ワンタン麺', description: '海老ワンタンと極細麺。澄んだスープが絶品', category: 'must_eat', tip: '沾仔記（Tsim Chai Kee）が有名' },
      { name: 'エッグタルト', description: 'サクサクパイ生地に濃厚カスタード', category: 'sweet', tip: '泰昌餅家（Tai Cheong Bakery）が名店' },
      { name: '叉焼飯（チャーシュー飯）', description: '蜜がけ焼豚にご飯。ミシュラン星の甘牌がある', category: 'must_eat', tip: '再興焼臘飯店が地元の名店' },
      { name: '菠蘿包（パイナップルパン）', description: 'メロンパンに似た香港のパン。バターを挟んで', category: 'street_food', tip: '金華冰廳の焼きたてが絶品' },
    ],
  },
  // ===== ドイツ追加都市 =====
  'DE:frankfurt': {
    cityName: 'Frankfurt', cityNameJa: 'フランクフルト',
    tourism: [
      { name: 'レーマー広場', description: '中世の面影が残る旧市街の中心。市庁舎の階段状ファサード', category: 'landmark', tip: 'クリスマスマーケットの時期は特に美しい' },
      { name: 'マイン川沿いの博物館群', description: '南岸に14の博物館が並ぶ。シュテーデル美術館が特に有名', category: 'culture', tip: 'ムゼウムスウーファーカードで割安入館' },
      { name: 'マインタワー展望台', description: '高さ200mの展望台から摩天楼「マインハッタン」を一望', category: 'landmark', tip: '晴れた日のサンセットがおすすめ' },
      { name: 'ザクセンハウゼン地区', description: 'リンゴ酒の居酒屋が軒を連ねる伝統的な地区', category: 'culture', tip: '金曜・土曜の夜が最も賑わう' },
      { name: 'パルメンガルテン', description: '22ヘクタールの植物園。温室や日本庭園もある', category: 'nature' },
    ],
    food: [
      { name: 'アップルワイン（エプラー）', description: 'フランクフルト名物のリンゴ酒。陶器のジョッキで提供', category: 'must_eat', tip: 'ザクセンハウゼンのDauth-Schneiderが老舗' },
      { name: 'フランクフルトソーセージ', description: '豚肉の燻製ソーセージ。マスタードとパンで', category: 'must_eat', tip: '市場やインビスで手軽に食べられる' },
      { name: 'グリューネゾーセ', description: '7種のハーブの冷たい緑のソース。卵やジャガイモと', category: 'must_eat', tip: 'フランクフルトの郷土料理。春〜夏が旬' },
      { name: 'ハンドケーゼ・ミット・ムジーク', description: '酢漬けチーズに玉ねぎ。「音楽付きチーズ」の意味', category: 'restaurant', tip: 'アップルワインとの相性抜群' },
      { name: 'ベッチェ', description: 'フランクフルト風ミートボール。パンに挟んで', category: 'street_food' },
    ],
  },
  // ===== UAE =====
  'AE:dubai': {
    cityName: 'Dubai', cityNameJa: 'ドバイ',
    tourism: [
      { name: 'ブルジュ・ハリファ', description: '世界一高いビル（828m）。展望台からの絶景', category: 'landmark', tip: '124階はオンライン予約で割安。148階のプレミアムは別格' },
      { name: 'ドバイ・モール', description: '世界最大級のショッピングモール。水族館やスケートリンクも', category: 'shopping', tip: 'ドバイファウンテン（噴水ショー）は毎晩18:00から30分毎' },
      { name: 'パーム・ジュメイラ', description: 'ヤシの木型の人工島。アトランティスホテルが目印', category: 'landmark', tip: 'モノレールで先端まで行ける' },
      { name: 'デザートサファリ', description: '砂漠でのSUVドライブ、ラクダ乗り、BBQディナー', category: 'nature', tip: '夕方出発のサンセットツアーが人気。300AED前後' },
      { name: '旧市街（バスタキヤ地区）', description: '伝統的なアラブ建築が残る地区。風の塔が特徴', category: 'culture', tip: 'アブラ（渡し船）でクリーク（水路）を渡るのも楽しい' },
    ],
    food: [
      { name: 'シャワルマ', description: '回転焼きの肉をピタパンに巻いた中東版ケバブ', category: 'street_food', tip: 'Al Mallahが地元に大人気。2〜3AEDと激安' },
      { name: 'マンディ', description: 'スパイスで味付けした鶏・羊のご飯。イエメン発祥', category: 'must_eat', tip: 'Al Ustad Special Kebabが有名' },
      { name: 'ラクダミルクチョコレート', description: 'Al Nassma社のラクダ乳使用チョコ。お土産に最適', category: 'sweet' },
      { name: 'ルカイマット', description: '蜂蜜をかけた甘い揚げ団子。伝統的なデザート', category: 'sweet' },
      { name: 'アラビックコーヒー（カフワ）', description: 'カルダモン入りの薄いコーヒー。デーツと一緒に', category: 'must_eat', tip: '地元のカフェで無料で振る舞われることも' },
    ],
  },

  // ===== 日本 =====
  'JP:osaka': {
    cityName: 'Osaka', cityNameJa: '大阪',
    tourism: [
      { name: '道頓堀', description: 'ネオン輝く大阪を代表する繁華街。食べ歩きとショッピングの中心地', category: 'shopping', tip: 'グリコの看板は写真スポット。夜間が最も華やか' },
      { name: '大阪城', description: '豊臣秀吉が築いた城。天守からの市街地の眺望が素晴らしい', category: 'landmark', tip: '春の桜の時期は特に美しい' },
      { name: 'ユニバーサル・スタジオ・ジャパン', description: 'ハリウッドの映画をテーマにしたテーマパーク。映画好きは必須', category: 'culture' },
      { name: '心斎橋', description: 'アメ村を含む大阪最大のファッション・ショッピング街', category: 'shopping', tip: '若者向けブランドから高級ブティックまで揃う' },
      { name: '造幣博物館', description: '日本の貨幣製造の歴史を学べる。見学無料で穴場的スポット', category: 'culture' },
    ],
    food: [
      { name: 'たこ焼き', description: 'ふわふわの衣に熱々のタコが詰まった大阪の代名詞。串カツとの食べ比べも楽しい', category: 'street_food', tip: 'ラジオ焼きとして新しいスタイルも登場' },
      { name: 'お好み焼き', description: '小麦粉、キャベツ、肉などを焼いた庶民の味。ソースの香りが食欲をそそる', category: 'must_eat', tip: 'ソースはたっぷり、マヨネーズは十字がけが大阪流' },
      { name: '串カツ', description: '野菜や肉を串に刺して揚げた料理。二度漬け禁止が暗黙のルール', category: 'must_eat' },
      { name: 'うどん', description: '大阪風の太くてコシのある麺。つゆは濃厚でコクがある', category: 'street_food', tip: 'かけうどんにきつねを乗せた「きつねうどん」が定番' },
      { name: 'どんぐりの木のお菓子', description: 'チーズケーキやモンブランなど洋風和風混在の焼き菓子。土産に人気', category: 'sweet' },
    ],
  },
  'JP:sapporo': {
    cityName: 'Sapporo', cityNameJa: '札幌',
    tourism: [
      { name: '時計台', description: '明治時代に建設された札幌の象徴。アメリカ製の古い時計機構が現役で稼働', category: 'landmark', tip: '夜間のライトアップも趣深い' },
      { name: '大通公園', description: '公園内には札幌テレビ塔。夏のビアガーデン、冬のイルミネーションが人気', category: 'nature' },
      { name: 'マルヤマクラス', description: '円山動物園も近い文化施設が集まるエリア。アート・ショッピングを融合', category: 'culture' },
      { name: 'スキー場（手稲山、藻岩山）', description: '市内から車で30分以内でスキーが楽しめる北海道の特権', category: 'nature', tip: '冬限定。初心者向けコースも充実' },
      { name: 'すすきの', description: '夜の繁華街として知られ、ラーメン横丁などグルメスポットが密集', category: 'shopping' },
    ],
    food: [
      { name: '味噌ラーメン', description: '札幌の代名詞。濃厚な味噌スープにコーンとバターが乗った一杯', category: 'must_eat', tip: 'ラーメン横丁には老舗店が数十軒並ぶ' },
      { name: 'ジンギスカン', description: '羊肉を焼いて食べる北海道の名物。独特の香りとやみつきになる旨さ', category: 'must_eat' },
      { name: 'スープカレー', description: '札幌発祥の新名物。野菜がゴロゴロ入ったカレースープ', category: 'must_eat', tip: '20年前に誕生したニューウェーブグルメ' },
      { name: 'トウモロコシ', description: '北海道産のトウモロコシは甘さが格別。夏場は露店でも購入できる', category: 'street_food' },
      { name: 'ロイズのチョコレート', description: '北海道が誇る有名チョコレートメーカーの生チョコ。お土産の定番', category: 'sweet' },
    ],
  },
  'JP:fukuoka': {
    cityName: 'Fukuoka', cityNameJa: '福岡',
    tourism: [
      { name: '太宰府天満宮', description: '学問の神を祀る全国2000社以上の天満宮の総本社。古い歴史を感じさせる参道', category: 'culture', tip: 'JR二日市駅からバスで約20分' },
      { name: 'キャナルシティ博多', description: '運河を中心に商業施設が広がる複合施設。映画館やレストランも充実', category: 'shopping' },
      { name: 'ヤフオクドーム', description: 'プロ野球の試合観戦ができるドーム。イベント会場としても利用', category: 'culture' },
      { name: '福岡城跡', description: '黒田長政が築城した城跡。春は400本以上の桜が咲き乱れる', category: 'landmark', tip: '現在は公園として開放。無料入園' },
      { name: 'キャナル&モール', description: '運河に沿って文化施設とショップが立ち並ぶ。ウォーターフロントを満喫', category: 'shopping' },
    ],
    food: [
      { name: '博多ラーメン', description: 'とんこつベースの白濁スープに細ストレートの麺。替え玉文化が独特', category: 'must_eat', tip: '「あっさり」か「こってり」を指定できる' },
      { name: 'もつ鍋', description: '牛もつをコクのあるスープで煮込んだ料理。福岡発祥のヘルシー鍋', category: 'must_eat', tip: '〆の卵入りご飯がたまらない' },
      { name: 'メンタイコ', description: 'すけとうだらの卵巣を塩漬けにした珍味。明太子のお土産は高級品', category: 'must_eat' },
      { name: '水炊き', description: '鶏肉を白濁のスープで煮込んだ鍋。福岡は水炊き発祥の地', category: 'must_eat' },
      { name: 'あまおう', description: '福岡発祥の高級いちご。甘い香りが特徴。スイーツやジャムが人気', category: 'sweet', tip: '冬から春の季節限定' },
    ],
  },
  'JP:okinawa': {
    cityName: 'Okinawa', cityNameJa: '沖縄',
    tourism: [
      { name: '首里城', description: '琉球王国の王城。朱塗りの城が沖縄のシンボル。2019年火災後、再建されている', category: 'landmark' },
      { name: '美ら海水族館', description: 'ジンベイザメの泳ぐ大水槽が有名。沖縄随一の観光スポット', category: 'nature', tip: 'モノレール「沖縄都市モノレール」で那覇からアクセス' },
      { name: 'ひめゆりの塔', description: '第二次世界大戦の悲劇を伝える戦跡。沖縄の歴史学習に重要な場所', category: 'culture' },
      { name: 'ビーチ（万座毛、砂辺）', description: 'エメラルドグリーンの海で透明度が高い。シュノーケリングやダイビングの聖地', category: 'nature' },
      { name: '国際通り', description: '那覇のメインストリート。沖縄の民工芸品やお土産がずらり', category: 'shopping', tip: 'アメリカ統治時代の面影も感じられる' },
    ],
    food: [
      { name: 'ソーキそば', description: '沖縄そばの上に豚のスペアリブを乗せた料理。独特のかまぼこも特徴', category: 'must_eat' },
      { name: 'サーターアンダギー', description: 'サトウキビ糖を使った揚げた菓子。沖縄の伝統お菓子。朝食代わりにも', category: 'sweet' },
      { name: 'ゴーヤチャンプルー', description: 'ゴーヤと豆腐、卵を炒めた家庭料理。独特の苦さが病みつき', category: 'must_eat', tip: 'ゴーヤの苦さが好みで分かれる' },
      { name: 'タコライス', description: 'タコスの具をご飯にのせた沖縄オリジナル料理。食べやすくて人気', category: 'must_eat' },
      { name: 'シークワーサージュース', description: 'シークワーサーは沖縄の柑橘類。酸っぱくてさっぱり。グラニタも人気', category: 'sweet' },
    ],
  },
  'JP:nagoya': {
    cityName: 'Nagoya', cityNameJa: '名古屋',
    tourism: [
      { name: '名古屋城', description: '徳川家康が築いた城。金の鯱が乗った天守が有名。2018年天守の内部工事中', category: 'landmark' },
      { name: '熱田神宮', description: '草薙剣を祀る全国2000以上の熱田神社の総社。歴史深い参道が魅力', category: 'culture' },
      { name: '名古屋テレビ塔', description: '高さ180m。展望台から名古屋市街を一望。スカイロードも利用できる', category: 'landmark' },
      { name: 'ナゴヤドーム', description: 'プロ野球・名古屋グランパスの本拠地。イベント開催も多い', category: 'culture' },
      { name: '栄', description: '繁華街として栄えるエリア。サカエチカという地下街ショッピングも充実', category: 'shopping', tip: '栄のテレビ塔前は待ち合わせスポット' },
    ],
    food: [
      { name: '味噌カツ', description: '豚カツに八丁味噌のタレをかけた名古屋のソウルフード。濃厚な味が特徴', category: 'must_eat', tip: '矢場とん」が名古屋発祥' },
      { name: 'ひつまぶし', description: 'ウナギをぶつ切りにして御飯に乗せた料理。タレの香りが食欲をそそる', category: 'must_eat' },
      { name: '天むす', description: '小ぶりな握り寿司に天ぷらを乗せた名古屋発祥の食べ物。携帯食として昔から人気', category: 'street_food' },
      { name: 'あんかけスパゲッティ', description: '名古屋発祥の洋食。スパゲッティに中華風のあんをかけた珍しい料理', category: 'street_food' },
      { name: '外郎（ういろう）', description: '米粉を使った伝統的な和菓子。さっぱりとした甘さが特徴。京都の外郎も有名', category: 'sweet' },
    ],
  },

  // ===== 韓国 =====
  'KR:jeju': {
    cityName: 'Jeju', cityNameJa: '済州島',
    tourism: [
      { name: '城山日出峰', description: '海の中から聳え立つ火山で日の出の景観が美しい。世界遺産で登山できる', category: 'nature' },
      { name: '万丈窟', description: 'アジア最大級の玄武岩製の溶岩洞窟。長さ13.4km。内部は涼しく夏も快適', category: 'nature' },
      { name: 'オルレ道', description: 'カテゴリ別にコース分けされた散歩道。海と山の景色を楽しめるトレッキング', category: 'nature', tip: '23コースあり初心者から上級者まで対応' },
      { name: '漢拏山（ハンラサン）', description: 'アイスランドで最高峰の山。ハイキングコースが整備されている', category: 'nature' },
      { name: '泰迪ベア博物館', description: 'テディベア専門の珍しい博物館。歴史的なテディベアから現代作品まで展示', category: 'culture' },
    ],
    food: [
      { name: '黒豚', description: '済州島産の黒豚は肉質が柔らかい。焼肉や煮込み料理で人気', category: 'must_eat', tip: 'グルメツアーで養豚場見学もできる' },
      { name: '海女の海鮮', description: 'アワビ、ウニ、トコブシなど海女が採った新鮮な海産物。刺身で食べるのが最高', category: 'must_eat' },
      { name: 'メンタイ（スケトウダラ）', description: '済州島の冬の味覚。スケトウダラの卵巣を塩漬けにした珍味。焼いても美味しい', category: 'street_food' },
      { name: '蕎麦', description: '済州産の蕎麦粉を使ったそば。そばがき、そば焼きなど様々な形で供される', category: 'street_food' },
      { name: 'ハルラボン', description: '済州産の柑橘類。甘くてジューシー。ゼリーやお菓子の素材にも使われる', category: 'sweet' },
    ],
  },

  // ===== タイ =====
  'TH:chiangmai': {
    cityName: 'Chiang Mai', cityNameJa: 'チェンマイ',
    tourism: [
      { name: 'ドイステープ寺院', description: '山頂に建つ黄金に輝く寺院。参道の長さ300段。バンコクより歴史が古い', category: 'culture', tip: 'ケーブルカーで上れば体力消費なし' },
      { name: 'ナイトバザール', description: '毎夜開催される市場。屋台グルメから工芸品まで何でも揃う。バンコクより規模小さい', category: 'shopping' },
      { name: '象キャンプ', description: 'エレファントライディングで象に乗って大自然を楽しむ。倫理的なキャンプを選ぼう', category: 'nature', tip: 'レスキュー象を支援するキャンプがおすすめ' },
      { name: 'オールドシティ（ターペー門周辺）', description: '城壁に囲まれた古い市街。寺院と雑貨屋が密集する趣ある散策エリア', category: 'culture' },
      { name: 'ボーサンロード（傘製作村）', description: '雨傘職人の町。手作りの美しい傘を購入できる。工房見学も可能', category: 'shopping' },
    ],
    food: [
      { name: 'カオソーイ', description: 'チェンマイの代表的なカレーヌードル。ターメリック風味でまろやかな辛さ', category: 'must_eat', tip: 'タイ北部の郷土料理として特に有名' },
      { name: 'サイオア（ソーセージ）', description: '北タイ風の塩辛いソーセージ。炭火で焼いて食べるのが定番', category: 'street_food' },
      { name: 'ラープ', description: 'ひき肉とハーブを混ぜた冷たい和え物。辛くてクセになる味わい', category: 'must_eat' },
      { name: 'サテ（串焼き肉）', description: 'マレーシア発祥だがタイでも愛される。ピーナッツソースで食べる', category: 'street_food' },
      { name: 'カスタードバナナ', description: 'バナナを揚げてカスタードをかけたデザート。温かいままで食べると最高', category: 'sweet' },
    ],
  },
  'TH:phuket': {
    cityName: 'Phuket', cityNameJa: 'プーケット',
    tourism: [
      { name: 'パトンビーチ', description: 'プーケット最大のビーチ。沿岸にレストランやバーが立ち並ぶ。昼間は穏やか', category: 'nature', tip: '波が高いので泳ぐ際は注意' },
      { name: 'ピピ島（ピピドン島）', description: 'エメラルド色の海に囲まれた美しい島。シュノーケリングの聖地。ツアーで訪問', category: 'nature', tip: 'スピードボートで1時間で到着' },
      { name: 'ビッグブッダ', description: '高さ45mの大仏。プーケット全体が見渡せる丘に建つ。装飾が豪華', category: 'landmark' },
      { name: 'オールドプーケットタウン', description: 'ポルトガル領時代の建築が残る歴史地区。色彩豊かな家が立ち並ぶ', category: 'culture', tip: '日曜の夜市が特に活気がある' },
      { name: 'プーケット・ファンタシア', description: 'タイの民俗文化を表現した大規模ショー。象のダンスなど壮観', category: 'culture' },
    ],
    food: [
      { name: 'パッタイ', description: '米麺を炒めた国民食。甘酸っぱい味わい。屋台でも高級レストランでも食べられる', category: 'must_eat', tip: '落花生粉とライムで味を調整できる' },
      { name: 'シーフードプレート', description: '新鮮な海の幸を炭火焼きで。エビ、イカ、貝など海の恵みが満載', category: 'must_eat' },
      { name: 'グリーンカレー', description: 'ココナッツベースの緑色のカレー。辛さが独特で後を引く', category: 'must_eat' },
      { name: 'サトウキビジュース', description: '屋台で絞った新鮮なサトウキビジュース。甘くてリフレッシング', category: 'street_food' },
      { name: 'マンゴースティッキーライス', description: 'プーケットの夕日を見ながら食べるデザート。完熟マンゴーが甘い', category: 'sweet' },
    ],
  },

  // ===== 台湾 =====
  'TW:kaohsiung': {
    cityName: 'Kaohsiung', cityNameJa: '高雄',
    tourism: [
      { name: '龍虎塔', description: '蓮池潭に建つ赤と緑の塔。鮮やかな色が印象的。龍の塔を上り虎の塔を下りる', category: 'landmark', tip: 'MRT蓮池潭駅から徒歩15分' },
      { name: '六合夜市', description: '高雄を代表する夜市。屋台グルメから衣類まで何でも揃う。夜間が活気', category: 'shopping', tip: '夜間19:00以降がおすすめ' },
      { name: '打狗領事官邸（イギリス領事館跡）', description: '赤レンガ造りの歴史的建築。港を見下ろす位置に建つ。台湾初の西洋建築', category: 'culture' },
      { name: 'フォーモサ荘園', description: 'オランダ要塞跡。城壁から眺める景観が美しい。歴史学習に最適', category: 'landmark' },
      { name: '美麗島駅', description: 'MRTの駅とは思えないほど豪華な駅舎。天井のドームアート「光のドーム」が有名', category: 'culture' },
    ],
    food: [
      { name: '海鮮', description: '高雄は海に面した港町。新鮮な海鮮が豊富。刺身や塩焼きで食べるのが最高', category: 'must_eat' },
      { name: '豆花（トウファ）', description: 'くず粉を使った優しい甘さのデザート。シロップをかけて食べる', category: 'sweet' },
      { name: 'チョウザメのフカヒレスープ', description: '高級食材。濃厚なスープ。レストランで食べるのが人気', category: 'restaurant' },
      { name: '胡椒餅（フーヂャオビン）', description: '揚げた小ぶりなパイ。黒コショウが香る。夜市の屋台が有名', category: 'street_food' },
      { name: 'マンゴーかき氷', description: '台湾産の甘いマンゴーをたっぷりかけたかき氷。夏の風物詩', category: 'sweet' },
    ],
  },

  // ===== ベトナム =====
  'VN:danang': {
    cityName: 'Da Nang', cityNameJa: 'ダナン',
    tourism: [
      { name: 'ミーケービーチ', description: 'ベトナムで最も美しいビーチと言われる。白い砂浜とエメラルド色の海', category: 'nature', tip: 'ホテルが多く、ここを拠点に観光するのが便利' },
      { name: 'バナヒルズ', description: 'ダナンから車で1時間の山上リゾート。フランス植民地時代の建築が残る', category: 'nature', tip: 'ロープウェイで上がる眺望が素晴らしい' },
      { name: 'ミー・クアン古代遺跡', description: 'チャンパ王国の古い塔や彫刻が点在。歴史とロマンが漂う遺跡地区', category: 'culture' },
      { name: 'ハン・マーケット', description: 'ダナン最大の市場。生鮮食品から工芸品まで。地元の雰囲気を感じられる', category: 'shopping' },
      { name: 'カオ・ヌイ山', description: '山頂からダナン市街を一望。道教のお堂も建つ。ハイキングスポット', category: 'nature' },
    ],
    food: [
      { name: 'ミークアン（中部麺）', description: 'ダナン周辺の郷土麺。厚めの卵麺とスープの組み合わせ。濃厚な味わい', category: 'must_eat' },
      { name: 'バイン・ホイ（イカ焼き）', description: 'イカを炭火で焼いたベトナムン版タコ焼き。市場の屋台で食べるのが本場', category: 'street_food' },
      { name: 'フー（米粉スープ）', description: 'ベトナムの朝食代わりの国民食。牛肉か鶏肉がトッピング', category: 'must_eat', tip: '朝5時には営業している朝食屋が多い' },
      { name: 'バインミー（サンドイッチ）', description: 'フランスパンに具を詰めたベトナム風サンドイッチ。安くて美味しい', category: 'street_food' },
      { name: 'チェー（デザートスープ）', description: '豆類をシロップで煮込んだデザート。温かいか冷たいか選べる', category: 'sweet' },
    ],
  },

  // ===== 中国 =====
  'CN:beijing': {
    cityName: 'Beijing', cityNameJa: '北京',
    tourism: [
      { name: '万里の長城', description: 'モンゴル騎馬民族の侵入を防ぐために建設された城壁。全長21000km。八達嶺が観光地化', category: 'landmark', tip: 'ロープウェイがあり、歩きやすい' },
      { name: '故宮', description: '明清時代の皇宮。宮殿の建築が豪華。内部に博物館がある。世界文化遺産', category: 'culture', tip: '事前予約で待ち時間を減らせる' },
      { name: '天壇', description: '皇帝が祭祀を行った建築物。丸い建築が独特。世界遺産の建築群', category: 'landmark' },
      { name: '北京ダック専門店', description: '北京の名産品を食べる場所。脂肪が少なくパリパリな食感が特徴', category: 'culture' },
      { name: '胡同（フートン）ツアー', description: '迷路のような路地裏の住宅地。古い北京の生活を感じられる。人力車で巡る', category: 'culture', tip: '北京の伝統文化を知るなら必須' },
    ],
    food: [
      { name: '北京ダック', description: '中国の最高級グルメ。パリパリの皮が特徴。薄いパンクレープに巻いて食べる', category: 'must_eat', tip: '有名店は事前予約が必須' },
      { name: '火鍋（ホットポット）', description: '食卓の真中の鍋にスープを入れて、肉や野菜を煮込みながら食べる中国式鍋', category: 'must_eat' },
      { name: '小籠包（ショウロンポー）', description: '肉汁たっぷりの小ぶりな蒸し餃子。スープが絶品。スプーンで食べるのが流儀', category: 'street_food', tip: '点心専門店で毎日手作りされている' },
      { name: '肉まん', description: '豚肉を小麦粉の皮に包んで蒸した軽食。朝食の定番', category: 'street_food' },
      { name: 'ごま団子', description: 'もち粉の団子の表面にごまをまぶして揚げたデザート。中はあんこ入り', category: 'sweet' },
    ],
  },
  'CN:shanghai': {
    cityName: 'Shanghai', cityNameJa: '上海',
    tourism: [
      { name: '外灘（ワイタン）', description: 'テムズ川沿いのようなモダンな街並み。対岸には未来都市ルジャジュイの高層ビル群', category: 'landmark', tip: 'プロムナード沿いは夜景が美しい' },
      { name: '豫園（ユーユアン）', description: '1500年代の庭園。池と石橋が美しい。中国古典庭園の傑作', category: 'culture' },
      { name: '旧租界地区', description: 'フランス租界時代の建築が残る地区。洋風のカフェやブティックが点在', category: 'culture' },
      { name: '東方明珠テレビ塔', description: '高さ468mの独特な形のテレビ塔。展望台からの眺望が素晴らしい', category: 'landmark' },
      { name: 'Creek&Mall（新天地）', description: 'シャンハイのトレンディーなショッピング・ダイニング地区。最先端のお店が集中', category: 'shopping' },
    ],
    food: [
      { name: '小籠包', description: '上海発祥のジューシーな蒸し餃子。有名店「鼎泰豊」が最高峰', category: 'must_eat', tip: 'スープが大量に入っているのが特徴' },
      { name: 'マルミニヨウパン', description: 'シーフードを具にした上海風焼き小籠包。揚げたバージョン', category: 'street_food' },
      { name: 'チキンスープ麺', description: '透明なスープに鶏肉を煮込んだもの。さっぱりで胃に優しい', category: 'must_eat' },
      { name: '蟹味噌入り肉まん', description: '上海産の蟹の味噌を豚肉に混ぜた高級肉まん。秋冬限定', category: 'street_food' },
      { name: 'ごま団子', description: '揚げたもち粉の団子。中はあんこ。デザートの定番', category: 'sweet' },
    ],
  },

  // ===== インドネシア =====
  'ID:bali': {
    cityName: 'Bali', cityNameJa: 'バリ',
    tourism: [
      { name: 'ウブド', description: '芸術と文化の中心地。ヨガスクールや瞑想スタジオが多い。棚田の景色が美しい', category: 'culture', tip: 'クタビーチより静かで文化的' },
      { name: 'タナロット寺院', description: '海の崖の上に建つ独特な寺院。夕焼けの時間が最も美しい。ヒンドゥー教の聖地', category: 'landmark' },
      { name: 'ウルワツ寺院', description: '崖の上の古い寺院。眼下にインド洋。ケチャックダンスの夜間公演が有名', category: 'culture' },
      { name: 'クタビーチ', description: 'バリで最も人気のビーチ。サーフィンスポット。リゾートホテルが建ち並ぶ', category: 'nature' },
      { name: 'モンキーフォレスト', description: 'ウブドの森に野生の猿が棲む。猿との触れ合い体験（リスク有り）', category: 'nature', tip: '猿に物を盗られないよう注意' },
    ],
    food: [
      { name: 'ナシゴレン', description: 'インドネシア版焼きご飯。スパイスが効いて旨味たっぷり。卵乗せが定番', category: 'must_eat', tip: '屋台でも高級レストランでも食べられる' },
      { name: 'ミーゴレン', description: 'インドネシア版焼きそば。ナシゴレンと並ぶ国民食。蒸し卵が添え物', category: 'must_eat' },
      { name: 'サテ', description: '串に刺した肉を炭火焼き。ピーナッツソースをかけて食べる。バリの定番', category: 'street_food' },
      { name: 'ガドガド', description: '野菜をピーナッツソースで和えたサラダ。ベジタリアンにも人気', category: 'street_food' },
      { name: 'ココナッツアイスクリーム', description: 'ココナッツの皮をカップに使った珍しいアイス。中身もココナッツ味', category: 'sweet' },
    ],
  },
  'ID:jakarta': {
    cityName: 'Jakarta', cityNameJa: 'ジャカルタ',
    tourism: [
      { name: 'モナス（独立記念塔）', description: 'ジャカルタのシンボル。高さ132m。展望台からの市街の眺望が素晴らしい', category: 'landmark' },
      { name: '旧市街（コタ）', description: 'オランダ統治時代の建築が残る歴史地区。運河沿いにカフェが点在', category: 'culture' },
      { name: 'インドネシア国立博物館', description: 'インドネシアの民族文化と歴史を学べる。展示品が豊富', category: 'culture' },
      { name: 'グランド・インドネシア・ショッピング・モール', description: 'ジャカルタ最大のショッピングモール。高級ブティックから地元ブランドまで', category: 'shopping' },
      { name: 'チリン寺院', description: '国内最大の中華寺院。装飾が豪華で金色に輝く。正月の儀式が見応えあり', category: 'culture' },
    ],
    food: [
      { name: 'サテ', description: '串焼き肉。ピーナッツソースをかけたジャカルタの街頭グルメ', category: 'street_food' },
      { name: 'ゴレンゴレン', description: '揚げたおかずの盛り合わせ。ご飯に乗せて食べる大衆食', category: 'street_food' },
      { name: 'ソト・アヤム', description: 'ターメリック風味の鶏スープ。朝食の定番。体が温まる', category: 'must_eat' },
      { name: 'マルタバック', description: 'インドネシアン・パンケーキ。肉かチョコレートを中に詰めて焼く', category: 'street_food' },
      { name: 'エス・チャチャン', description: 'かき氷にココナッツとキビダンゴを乗せたデザート。甘くてリフレッシング', category: 'sweet' },
    ],
  },

  // ===== マレーシア =====
  'MY:kualalumpur': {
    cityName: 'Kuala Lumpur', cityNameJa: 'クアラルンプール',
    tourism: [
      { name: 'ペトロナスツインタワー', description: 'クアラルンプールのシンボル。高さ452m。スカイブリッジが有名。眺望が美しい', category: 'landmark', tip: 'スカイデッキまでの並び時間に注意' },
      { name: 'バトゥ洞窟', description: 'ヒンドゥー教の聖地。洞窟内に寺院がある。272段の階段で上がる。タイプーサム祭が有名', category: 'culture' },
      { name: 'ムルデカスクエア', description: 'マレーシアの独立を記念する広場。モスク、火力発電所、博物館が周囲に', category: 'landmark' },
      { name: 'セントラル・マーケット', description: 'クアラルンプール最大の工芸品・グルメ市場。土産品の宝庫', category: 'shopping' },
      { name: 'スターヒル地区', description: '高級ショップ・レストランが集中する地区。カジュアルなカフェもある', category: 'shopping' },
    ],
    food: [
      { name: 'ナシレマッ', description: 'ココナッツミルク炊きご飯に卵焼き、イワシ、キュウリを添えたマレーシアの朝食', category: 'must_eat', tip: '朝5時から営業している食堂が多い' },
      { name: '肉骨茶（バクテー）', description: 'スペアリブをスパイスで煮込んだスープ。豚肉か鶏肉か選べる', category: 'must_eat', tip: 'ペナンやクアラルンプールで食べるのが本場' },
      { name: 'サテ', description: '串焼き肉。ピーナッツソースをかけたマレーシアン版。屋台の定番', category: 'street_food' },
      { name: 'ラクサ', description: 'ココナッツベースの辛いスープヌードル。魚とエビの出汁がコク', category: 'must_eat' },
      { name: 'チェンドール', description: 'シロップをかけたかき氷。ココナッツミルク、フレッシュフルーツをのせたデザート', category: 'sweet' },
    ],
  },

  // ===== フィリピン =====
  'PH:manila': {
    cityName: 'Manila', cityNameJa: 'マニラ',
    tourism: [
      { name: 'イントラムロス', description: 'スペイン統治時代の城塞都市。石造りの城壁が残る。サント・アゴスティン教会が必見', category: 'culture', tip: 'サンチャゴ砦を経由するのが便利' },
      { name: 'リサール公園', description: 'フィリピンの独立の父リサールを記念する公園。噴水と庭園が美しい', category: 'landmark' },
      { name: 'ファイナンシャルセンター地区', description: 'マニラのビジネス街。高層ビルが立ち並ぶ。ショッピングモールも充実', category: 'shopping' },
      { name: 'ナショナルミュージアム', description: 'フィリピンの美術品・考古学遺物を展示。所要時間は2-3時間', category: 'culture' },
      { name: 'クワーレナ・カナル地区', description: '最近再開発され、カフェやレストランが増えた。散策が楽しい地区', category: 'culture' },
    ],
    food: [
      { name: 'アドボ', description: 'フィリピンの国民食。肉を酢と醤油で煮込んだもの。ご飯がすすむ', category: 'must_eat', tip: '家庭料理として毎日食べられている' },
      { name: 'シニガン', description: '酸っぱいスープ料理。タマリンドの酸味が特徴。豚肉か海鮮か選べる', category: 'must_eat' },
      { name: 'レチョン（豚の丸焼き）', description: '子豚を丸ごと炭火で焼いた料理。パリパリの皮が最高。祝いの日の定番', category: 'must_eat' },
      { name: 'ブロアロ（串焼き）', description: 'フィリピン版焼き鳥。内臓や肉を串に刺して焼いたもの。屋台の人気メニュー', category: 'street_food' },
      { name: 'ハロハロ', description: '様々なトッピングを乗せた豪華なかき氷。色彩豊かで見た目も楽しい', category: 'sweet' },
    ],
  },
  'PH:cebu': {
    cityName: 'Cebu', cityNameJa: 'セブ',
    tourism: [
      { name: 'マクタン島', description: 'セブの近郊の島。ビーチリゾートが多い。ダイビングとシュノーケリングが人気', category: 'nature' },
      { name: 'オスロブ（ジンベイザメ体験）', description: 'セブから約2時間。ジンベイザメと一緒に泳ぐことができる。感動的な体験', category: 'nature', tip: '朝の時間帯（6時-11時）がジンベイザメが集まる時間' },
      { name: 'サント・ニーニョ教会', description: 'フィリピン最古の教会。マゼランが持ち込んだ聖像が安置されている', category: 'culture' },
      { name: 'カルボン・マーケット', description: 'セブ最大の市場。青果から衣類・工芸品まで。地元の雰囲気が濃厚', category: 'shopping' },
      { name: 'ロボック川クルーズ', description: 'エコツアー。川をボートで下りながら景色を楽しむ。バードウォッチングも', category: 'nature' },
    ],
    food: [
      { name: 'レチョン（豚の丸焼き）', description: 'セブ発祥の料理。パリパリの皮が最高。祭りの定番メニュー', category: 'must_eat' },
      { name: 'セブ・シニガン', description: '酸っぱいスープ料理。タマリンドで酸味を出したもの。豚と野菜が入る', category: 'must_eat' },
      { name: 'ランバーゴ', description: 'セブの郷土料理。豚肉を塩辛く味付けして煮詰めたもの。ご飯との相性抜群', category: 'street_food' },
      { name: 'イナサル（グリル）', description: 'マリネした鶏肉をグリルで焼いた料理。レモンをしぼって食べるのが通', category: 'street_food' },
      { name: 'マンゴーシェイク', description: 'セブ産の完熟マンゴーをシェイクしたもの。濃厚な甘さが特徴', category: 'sweet' },
    ],
  },

  // ===== カタール =====
  'QA:doha': {
    cityName: 'Doha', cityNameJa: 'ドーハ',
    tourism: [
      { name: 'イスラム美術館', description: 'イスラム文明の芸術品を集めた博物館。建築が印象的で美しい。所蔵品が豊富', category: 'culture', tip: '日曜営業（金土は休館）' },
      { name: 'スーク・ワキーフ', description: '伝統的なアラブ市場。金製品、香水、衣料品が所狭しと並ぶ。活気がある', category: 'shopping', tip: '夕方から夜間が活気付く' },
      { name: 'カタール・ミュージアム', description: 'カタール文化と歴史の博物館。石油採掘の歴史が学べる', category: 'culture' },
      { name: 'パールモニュメント', description: 'カタール独立を記念する象徴的なモニュメント。ドーハの地理的中心', category: 'landmark' },
      { name: 'コルニッシュ海岸', description: 'ドーハ湾沿いの遊歩道。夜景が美しく、現代建築が立ち並ぶ。散歩に最適', category: 'nature', tip: '夕暮れ時が最も美しい' },
    ],
    food: [
      { name: 'フムス', description: 'ひよこ豆のペースト。タヒニ（ゴマペースト）を混ぜたもの。中東版ディップ', category: 'street_food' },
      { name: 'ファラフェル', description: 'ひよこ豆を揚げたボール状の食べ物。ピタパンに挟んで食べる', category: 'street_food' },
      { name: 'シシュケバブ', description: 'インド式の香辛料をまぶした串焼き肉。ヨーグルトソースで食べる', category: 'must_eat' },
      { name: 'ザラク（クスクス）', description: '粗い小麦粉を蒸した料理。肉と野菜のシチューをかけて食べる', category: 'street_food' },
      { name: 'ルカイマット', description: '蜂蜜をかけた甘い揚げ団子。中東版ドーナツ。ラマダン中によく食べられる', category: 'sweet' },
    ],
  },

  // ===== ニュージーランド =====
  'NZ:auckland': {
    cityName: 'Auckland', cityNameJa: 'オークランド',
    tourism: [
      { name: 'スカイタワー', description: 'オークランドの象徴。高さ328m。展望台からの景色が360度で素晴らしい', category: 'landmark', tip: 'スカイジャンプも人気（有料）' },
      { name: 'ワイヘキ島', description: 'フェリーで40分。ワイナリー、アート美術館、美しいビーチがある小島', category: 'nature', tip: 'ワインテイスティングツアーが人気' },
      { name: 'ミッション・ベイ・ビーチ', description: 'オークランド市内から最も近いビーチ。カフェが立ち並ぶ。水が澄んでいる', category: 'nature' },
      { name: 'オークランド・アート・ギャラリー', description: 'ニュージーランドの美術品とヨーロッパの芸術作品を展示', category: 'culture' },
      { name: 'ポンソンビー地区', description: 'インディペンデント・ショップ、カフェ、バーが集中する地区。地元の雰囲気', category: 'shopping' },
    ],
    food: [
      { name: 'ラムステーキ', description: 'ニュージーランド産の肉が豊富。羊肉の低温調理が特に有名', category: 'must_eat', tip: 'ワイナリーでワインペアリングするのが最高' },
      { name: 'グリーンムール貝', description: 'ニュージーランド産の貝。白ワイン蒸しで食べるのが定番', category: 'must_eat' },
      { name: 'パイ（ミートパイ）', description: 'ニュージーランド国民食。牛肉をパイ皮で包んで焼いたもの。温かいまま食べる', category: 'street_food', tip: 'ベーカリーのショーケースに並んでいる' },
      { name: 'フィッシュ・アンド・チップス', description: 'イギリス発祥だがニュージーランドでも人気。パブで食べられる', category: 'street_food' },
      { name: 'パヴロバ', description: 'メレンゲケーキにクリームとフルーツをのせたデザート。ニュージーランド発祥', category: 'sweet' },
    ],
  },

  // ===== オーストラリア =====
  'AU:sydney': {
    cityName: 'Sydney', cityNameJa: 'シドニー',
    tourism: [
      { name: 'シドニー・オペラハウス', description: '世界遺産の建築物。帆を形どった屋根が特徴。内部ツアーで舞台を見学できる', category: 'landmark', tip: 'ライトアップされた夜間の撮影がおすすめ' },
      { name: 'ハーバーブリッジ', description: 'シドニー湾を渡るアイコニックな橋。橋の上を歩くツアーもある', category: 'landmark', tip: 'BridgeClimbは予約が必須' },
      { name: 'ボンダイビーチ', description: 'シドニア最高のビーチ。白い砂浜と紺碧の海。サーフスポットとして有名', category: 'nature' },
      { name: 'ルナパーク', description: 'シドニアのテーマパーク。観覧車から市街地の眺望が素晴らしい', category: 'culture' },
      { name: 'ブルー・マウンテンズ', description: 'シドニアから車で2時間。ユーカリの青い霧が美しい。ハイキングコースが充実', category: 'nature' },
    ],
    food: [
      { name: 'ミートパイ', description: 'オーストラリアンのファストフード。牛肉のグレイビーをパイで包んだもの', category: 'street_food', tip: 'パブやベーカリーで食べられる' },
      { name: 'バーベキュー', description: 'オーストラリアンビーフとラムを焼くことが大好き。パブでもビーチでも食べられる', category: 'must_eat' },
      { name: 'フィッシュ・アンド・チップス', description: 'イギリス発祥。新鮮なシーフードをフライにして食べるのがオーストラリア流', category: 'street_food' },
      { name: 'ウェジズ（揚げたジャガイモ）', description: 'スティック状に切った揚げたジャガイモ。塩やカレー粉をかける', category: 'street_food' },
      { name: 'パブロバ', description: 'メレンゲケーキの上にクリームとベリー類をのせたデザート。ニュージーランド・オーストラリアで人気', category: 'sweet' },
    ],
  },
  'AU:melbourne': {
    cityName: 'Melbourne', cityNameJa: 'メルボルン',
    tourism: [
      { name: 'フリンダースストリート駅', description: 'メルボルンのシンボル的な駅舎。ビザンチン様式の美しい建築。夜間のライトアップが素晴らしい', category: 'landmark' },
      { name: 'グレートオーシャンロード', description: 'メルボルン郊外の絶景ドライブコース。12人の使徒（岩の奇岩）が有名', category: 'nature', tip: 'レンタカーで4-5時間のドライブコース' },
      { name: 'ロイヤル植物園', description: 'オーストラリアの珍しい植物が展示。広大な庭園での散歩が楽しい', category: 'nature' },
      { name: 'アートセンター・ミュージアム', description: 'オーストラリアの美術品と文化遺産を展示。建築も見応えがある', category: 'culture' },
      { name: 'クイーンビクトリアマーケット', description: 'メルボルン最大の市場。青果から衣料品、グルメまで何でも揃う。活気がある', category: 'shopping', tip: '火-日営業。月曜日は休場' },
    ],
    food: [
      { name: 'フラットホワイトコーヒー', description: 'メルボルン発祥のコーヒー。濃厚なエスプレッソにスチームミルクを加えたもの', category: 'street_food', tip: 'メルボルンのカフェ文化の中心' },
      { name: 'ラム肉のグリル', description: 'オーストラリアンラム。低温で焼いた柔らかい肉。ワインペアリングが最高', category: 'must_eat' },
      { name: 'シーフード・プレート', description: 'タスマニア産のオイスターやシドニー産のムール貝。新鮮な海産物の盛り合わせ', category: 'must_eat' },
      { name: 'ナチョス（チップス・アンド・ディップ）', description: 'トルティーヤチップスにチーズソースやサルサをかけたメキシカン風スナック', category: 'street_food' },
      { name: 'テクノロジー・パンケーク', description: 'メルボルンのトレンディなカフェで食べられる。アボカドトーストパンケーキなど', category: 'sweet' },
    ],
  },
  // ===== ドイツ追加都市 =====
  'DE:cologne': {
    cityName: 'Cologne', cityNameJa: 'ケルン',
    tourism: [
      { name: 'ケルン大聖堂', description: 'ユネスコ世界遺産。800年以上の歴史を持つゴシック建築の傑作', category: 'landmark', tip: '朝8時開門。塔登頂は約533段の階段' },
      { name: 'ライン川クルーズ', description: 'ぶどう畑に囲まれた川沿いの風景を遊覧船で満喫', category: 'nature', tip: '春から秋が最高。1〜2時間コースがおすすめ' },
      { name: 'ケルン香水博物館', description: 'フレグランスの歴史と製造工程を学べる。オーデコロン発祥の地', category: 'culture' },
      { name: '旧市街（アルトシュタット）', description: '中世の建物が立ち並ぶ街並み。ケルシュビールのパブが点在', category: 'culture', tip: 'ナイトライフが充実' },
      { name: 'ホーエンツォレルン橋', description: '恋人たちが南京錠をかける橋。対岸からの大聖堂の眺めが最高', category: 'landmark', tip: 'サンセット時の撮影スポット' },
    ],
    food: [
      { name: 'ケルシュ', description: 'ケルン発祥の淡色ビール。0.2Lの小さなグラスで提供', category: 'must_eat', tip: '空になると自動でおかわりが来る文化' },
      { name: 'ヒメル・ウン・エート', description: 'りんごソースと血のソーセージ、マッシュポテト', category: 'must_eat' },
      { name: 'ハルヴァー・ハーン', description: 'ライ麦パンにゴーダチーズとマスタード。定番おつまみ', category: 'street_food' },
      { name: 'ライベクーヘン', description: 'ジャガイモのパンケーキ。りんごソース添え', category: 'street_food' },
      { name: 'ドミシュタイナー', description: 'ケルンのクラフトビール。地元醸造所で味わう', category: 'must_eat' },
    ],
  },
  'DE:dusseldorf': {
    cityName: 'Düsseldorf', cityNameJa: 'デュッセルドルフ',
    tourism: [
      { name: '旧市街（アルトシュタット）', description: '260以上のパブやレストランが密集。「世界一長いバーカウンター」の異名', category: 'culture', tip: '地ビール「アルト」を飲むなら旧市街で' },
      { name: 'ライン川プロムナード', description: '川沿いの美しい遊歩道。カフェやレストランが並ぶ', category: 'nature' },
      { name: '日本人街（インマーマン通り）', description: 'ドイツ最大の日本人コミュニティ。日本食レストランが密集', category: 'shopping', tip: 'ドイツにいながら日本食が楽しめる' },
      { name: 'ケーニヒスアレー', description: '通称「ケー」。高級ブランドショップが並ぶ運河沿いの目抜き通り', category: 'shopping' },
      { name: 'メディエンハーフェン', description: '旧港湾を再開発したモダン建築エリア。ゲーリー建築が見どころ', category: 'landmark' },
    ],
    food: [
      { name: 'アルトビール', description: 'デュッセルドルフの地ビール。濃い色と深い味わい', category: 'must_eat', tip: '旧市街のUerige醸造所が老舗中の老舗' },
      { name: 'ライニッシャー・ザウアーブラーテン', description: '酢漬け牛肉のロースト。レーズンソースで甘酸っぱい', category: 'must_eat' },
      { name: 'セントモスタード', description: 'デュッセルドルフ名物の辛子。ソーセージやプレッツェルと', category: 'street_food' },
      { name: 'フラムクーヘン', description: '薄焼きピザ風のアルザス料理。クリーム、ベーコン、玉ねぎ', category: 'restaurant' },
      { name: 'キルシュトルテ', description: 'さくらんぼのケーキ。ラインラント地方の定番デザート', category: 'sweet' },
    ],
  },
  'DE:hamburg': {
    cityName: 'Hamburg', cityNameJa: 'ハンブルク',
    tourism: [
      { name: 'ミニチュアワンダーランド', description: '世界最大級の鉄道模型テーマパーク。15kmのレール上に精密模型が走る', category: 'culture', tip: '事前予約推奨。2〜3時間は必要' },
      { name: 'エルプフィルハーモニー', description: '2017年完成の建築的傑作コンサートホール。テラスからの港の眺めは無料', category: 'landmark', tip: 'テラスは予約不要で入場可' },
      { name: 'シュパイヒャーシュタット（倉庫地区）', description: 'レンガ造りの歴史的倉庫群。ユネスコ世界遺産', category: 'culture' },
      { name: 'ハンブルク港クルーズ', description: '欧州最大級の港を遊覧船で巡る。巨大コンテナ船を間近に', category: 'nature', tip: '1時間ツアーが手軽' },
      { name: 'アルスター湖', description: '市の中心にある美しい湖。ボート遊びやジョギングに最適', category: 'nature' },
    ],
    food: [
      { name: 'フィッシュブレートヒェン', description: '魚のサンドイッチ。ハンブルク名物の港町グルメ', category: 'must_eat', tip: '港の屋台で焼きたてを' },
      { name: 'ラプスカウス', description: 'コンビーフ、ジャガイモ、ビーツの煮込み。港湾労働者の伝統料理', category: 'must_eat' },
      { name: 'フランツブレートヒェン', description: 'シナモンシュガーの菓子パン。ハンブルクの朝食定番', category: 'sweet', tip: 'パン屋で焼きたてが絶品' },
      { name: 'アールズッペ', description: 'うなぎのスープ。ハンブルクの伝統料理', category: 'restaurant' },
      { name: 'カリーヴルスト', description: 'カレーソースのかかったソーセージ。ドイツ定番ストリートフード', category: 'street_food' },
    ],
  },
  // ===== アメリカ追加都市 =====
  'US:losangeles': {
    cityName: 'Los Angeles', cityNameJa: 'ロサンゼルス',
    tourism: [
      { name: 'ハリウッドサイン＆グリフィス天文台', description: 'LAのシンボル。天文台からダウンタウンまで一望。夜景も美しい', category: 'landmark', tip: 'サンセット時の訪問がおすすめ。入場無料' },
      { name: 'サンタモニカビーチ＆ピア', description: 'カリフォルニアの象徴的ビーチ。観覧車のあるピアが目印', category: 'nature', tip: 'ルート66の終点でもある' },
      { name: 'ビバリーヒルズ＆ロデオドライブ', description: 'セレブの街。世界的ブランドショップが並ぶ', category: 'shopping' },
      { name: 'ゲッティ・センター', description: '大理石建築の美術館。ルネサンスから現代まで。入場無料', category: 'culture' },
      { name: 'ハリウッド・ウォーク・オブ・フェーム', description: '歩道に埋め込まれたセレブの星2,700以上', category: 'landmark', tip: '好きな俳優のスターを探す楽しみ' },
    ],
    food: [
      { name: 'In-N-Out バーガー', description: 'カリフォルニア発祥の伝説的チェーン。シンプルで美味しい', category: 'must_eat', tip: '秘密メニュー「アニマルスタイル」を注文' },
      { name: 'メキシカンタコス', description: 'LA名物のストリートタコス。自家製トルティーヤが特徴', category: 'street_food', tip: 'ダウンタウンのタコ屋台が最高' },
      { name: 'フレンチディップサンドイッチ', description: 'LA発祥。ローストビーフのサンドをジュースにディップ', category: 'must_eat', tip: 'Philippe\'sとCole\'sが発祥を争う名店' },
      { name: 'コリアンBBQ', description: 'コリアタウンの焼肉。本場韓国に負けない美味しさ', category: 'restaurant', tip: 'Kang Ho-dongが人気店' },
      { name: 'アサイーボウル', description: 'ヘルシーな朝食。ベリーとグラノーラのトッピング', category: 'sweet' },
    ],
  },
  'US:sanfrancisco': {
    cityName: 'San Francisco', cityNameJa: 'サンフランシスコ',
    tourism: [
      { name: 'ゴールデンゲートブリッジ', description: 'SFのアイコン。霧の中に浮かぶ赤い橋は壮大', category: 'landmark', tip: '自転車で渡るのがおすすめ。レンタル店が豊富' },
      { name: 'フィッシャーマンズワーフ', description: 'シーフードの中心地。ピア39のアシカが人気', category: 'nature', tip: 'クラブの季節（11〜6月）が特におすすめ' },
      { name: 'アルカトラズ島', description: '元連邦刑務所。オーディオガイド付きツアーが圧巻', category: 'culture', tip: '2〜3週間前の予約が必須' },
      { name: 'ケーブルカー', description: 'SF名物の坂道を登る乗り物。最古の動態保存路面電車', category: 'landmark', tip: '朝7時台が空いている。片道8ドル' },
      { name: 'ゴールデンゲートパーク', description: '東京ドーム86個分の巨大公園。日本庭園や科学館もある', category: 'nature' },
    ],
    food: [
      { name: 'クラムチャウダー・ブレッドボウル', description: 'サワードウのパンをくり抜いた器にクラムチャウダー', category: 'must_eat', tip: 'Boudin Bakeryが元祖' },
      { name: 'ミッションブリトー', description: 'SF名物の巨大ブリトー。La Taqueria等が有名', category: 'street_food', tip: 'ミッション地区で食べ歩き' },
      { name: 'ダンジネスクラブ', description: '旬のダンジネスクラブをガーリックバターで', category: 'restaurant', tip: 'フィッシャーマンズワーフの屋台で' },
      { name: 'サワードウブレッド', description: 'SF名物の酸味のあるパン。ゴールドラッシュ時代から続く', category: 'must_eat' },
      { name: 'ギラデリチョコレート', description: 'SF発祥の老舗チョコレート。サンデーが人気', category: 'sweet', tip: 'ギラデリスクエアの直営店で' },
    ],
  },
  'US:hawaii_island': {
    cityName: 'Hawaii Island', cityNameJa: 'ハワイ島',
    tourism: [
      { name: 'キラウエア火山国立公園', description: '世界最大級の活動火山。溶岩トンネルや火口を間近に観察', category: 'nature', tip: 'ガイド付きツアー推奨。夜の溶岩グローは必見' },
      { name: 'マウナケア山頂', description: '標高4,207m。世界最高レベルの星空観測地', category: 'nature', tip: '高山病に注意。ツアー参加が安全' },
      { name: 'ハプナビーチ', description: '全米ベストビーチ常連。白砂と透明な海が美しい', category: 'nature', tip: 'ウミガメとの遭遇率が高い' },
      { name: 'ワイピオ渓谷', description: '「王の谷」と呼ばれる神聖な渓谷。黒砂ビーチと滝', category: 'nature', tip: '4WDツアーで谷底まで下りられる' },
      { name: 'コナコーヒー農園', description: 'ハワイ産コーヒーの産地。農園見学と試飲が楽しめる', category: 'culture', tip: 'UCCハワイ直営農園は日本語ツアーあり' },
    ],
    food: [
      { name: 'ロコモコ', description: 'ハワイのソウルフード。ご飯にハンバーグ、卵、グレイビーソース', category: 'must_eat', tip: 'ヒロのCafé 100が発祥の地' },
      { name: 'ポケ', description: '新鮮なマグロの醤油漬け。スーパーでも買える', category: 'must_eat' },
      { name: 'カルアピッグ', description: '伝統的なハワイアン料理。地下オーブンで蒸し焼きにした豚', category: 'restaurant' },
      { name: 'シェーブアイス', description: 'ハワイ風かき氷。トロピカルシロップたっぷり', category: 'sweet', tip: 'ヒロの老舗屋台が有名' },
      { name: 'マカダミアナッツ', description: 'ハワイ島名産。チョコがけやアイスクリームで', category: 'sweet' },
    ],
  },
  'US:kauai': {
    cityName: 'Kauai', cityNameJa: 'カウアイ島',
    tourism: [
      { name: 'ナパリコースト', description: '断崖、滝、ビーチが織りなす絶景の海岸線', category: 'nature', tip: 'ヘリコプターツアーか船ツアーで。カラウラ・トレイルは上級者向け' },
      { name: 'ワイメア渓谷', description: '「太平洋のグランドキャニオン」。深さ900mの壮大な渓谷', category: 'nature', tip: 'サンセット時の眺めが特に美しい' },
      { name: 'キラウエア灯台', description: '北岬の灯台。冬季はザトウクジラも見える', category: 'landmark' },
      { name: 'シダの洞窟', description: 'ワイルア川をボートで遡り到着する神秘的な洞窟', category: 'nature', tip: 'ボートツアーで約1.5時間' },
      { name: 'ハナレイ湾', description: '三日月形の美しい湾。映画のロケ地としても有名', category: 'nature' },
    ],
    food: [
      { name: 'ポケボウル', description: '新鮮なマグロのポケをご飯にのせて。カウアイ産の野菜使用', category: 'must_eat', tip: 'Fish Expressが地元人気No.1' },
      { name: 'ガーリックシュリンプ', description: 'ニンニクバターで炒めた新鮮なエビ。ハワイの定番', category: 'must_eat' },
      { name: 'プレートランチ', description: 'カルアピッグ、マカロニサラダ、ご飯のセット', category: 'restaurant' },
      { name: 'タロイモチップス', description: 'カウアイ産タロイモの紫色のチップス', category: 'street_food' },
      { name: 'ハウピアパイ', description: 'ココナッツミルクの伝統的ハワイアンデザート', category: 'sweet' },
    ],
  },
};

// ===== 空港コード → 都市ガイドキーのマッピング =====
const AIRPORT_TO_GUIDE: Record<string, string> = {
  // カザフスタン
  'NQZ': 'KZ:astana', 'TSE': 'KZ:astana', 'ALA': 'KZ:almaty',
  // モンゴル
  'UBN': 'MN:ulaanbaatar', 'ULN': 'MN:ulaanbaatar',
  // ドイツ
  'BER': 'DE:berlin', 'SXF': 'DE:berlin', 'TXL': 'DE:berlin',
  'MUC': 'DE:munich',
  'FRA': 'DE:frankfurt', 'CGN': 'DE:cologne', 'DUS': 'DE:dusseldorf', 'HAM': 'DE:hamburg',
  // 韓国
  'ICN': 'KR:seoul', 'GMP': 'KR:seoul', 'PUS': 'KR:busan', 'CJU': 'KR:jeju',
  // 日本
  'NRT': 'JP:tokyo', 'HND': 'JP:tokyo', 'KIX': 'JP:osaka', 'ITM': 'JP:osaka',
  'NGO': 'JP:nagoya', 'CTS': 'JP:sapporo', 'FUK': 'JP:fukuoka', 'OKA': 'JP:okinawa',
  // タイ
  'BKK': 'TH:bangkok', 'DMK': 'TH:bangkok', 'CNX': 'TH:chiangmai', 'HKT': 'TH:phuket',
  // 台湾
  'TPE': 'TW:taipei', 'TSA': 'TW:taipei', 'KHH': 'TW:kaohsiung',
  // アメリカ
  'JFK': 'US:newyork', 'EWR': 'US:newyork', 'LGA': 'US:newyork',
  'HNL': 'US:honolulu', 'OGG': 'US:maui', 'KOA': 'US:hawaii_island', 'LIH': 'US:kauai',
  'LAX': 'US:losangeles', 'SFO': 'US:sanfrancisco',
  // シンガポール
  'SIN': 'SG:singapore',
  // ベトナム
  'HAN': 'VN:hanoi', 'SGN': 'VN:hochiminh', 'DAD': 'VN:danang',
  // 香港
  'HKG': 'HK:hongkong',
  // 中国
  'PEK': 'CN:beijing', 'PKX': 'CN:beijing', 'PVG': 'CN:shanghai', 'SHA': 'CN:shanghai',
  // ヨーロッパ
  'CDG': 'FR:paris', 'ORY': 'FR:paris',
  'LHR': 'GB:london', 'LGW': 'GB:london',
  'FCO': 'IT:rome', 'VCE': 'IT:venice',
  'BCN': 'ES:barcelona', 'MAD': 'ES:madrid',
  'HEL': 'FI:helsinki',
  'AMS': 'NL:amsterdam',
  'ZRH': 'CH:zurich',
  'VIE': 'AT:vienna',
  'IST': 'TR:istanbul', 'SAW': 'TR:istanbul',
  'ASR': 'TR:cappadocia', 'NAV': 'TR:cappadocia', 'NEV': 'TR:cappadocia',
  // 中東
  'DXB': 'AE:dubai', 'DOH': 'QA:doha',
  // オセアニア
  'SYD': 'AU:sydney', 'MEL': 'AU:melbourne', 'AKL': 'NZ:auckland',
  // インドネシア
  'DPS': 'ID:bali', 'CGK': 'ID:jakarta',
  // マレーシア
  'KUL': 'MY:kualalumpur',
  // フィリピン
  'MNL': 'PH:manila', 'CEB': 'PH:cebu',
};

// ===== ガイドキーから直接ガイドを取得 =====
export function getGuideByKey(key: string): CityGuide | null {
  return CITY_GUIDES[key] || null;
}

// ===== 空港コードから都市ガイドを取得 =====
export function getGuideByAirport(airportCode: string): CityGuide | null {
  const key = AIRPORT_TO_GUIDE[airportCode];
  if (!key) return null;
  return CITY_GUIDES[key] || null;
}

// ===== 空港コードから都市名を推定（ガイドがなくても） =====
export function getGuideRegionName(airportCode: string): string {
  const key = AIRPORT_TO_GUIDE[airportCode];
  if (key) {
    const guide = CITY_GUIDES[key];
    if (guide) return guide.cityNameJa;
    // ガイドデータはないがマッピングはある場合、キーから名前を生成
    return key.split(':')[1] || airportCode;
  }
  return airportCode;
}

// ===== 旅程のフライトから全訪問地のガイドリストを生成 =====
export interface DestinationGuide {
  airportCode: string;
  regionName: string;
  guide: CityGuide | null; // nullならAI生成が必要
}

export function findGuidesForTrip(
  flights: { arrival_airport: string | null; departure_time: string | null }[],
  homeAirports: string[] = ['NRT','HND','KIX','ITM','NGO','CTS','FUK','OKA','KOB','UKB'],
): DestinationGuide[] {
  // 到着空港を集めて重複除去（出発時刻順）
  const seen = new Set<string>();
  const destinations: DestinationGuide[] = [];

  // departure_timeでソート
  const sorted = [...flights]
    .filter(f => f.arrival_airport)
    .sort((a, b) => {
      if (!a.departure_time) return 1;
      if (!b.departure_time) return -1;
      return a.departure_time.localeCompare(b.departure_time);
    });

  for (const f of sorted) {
    const code = f.arrival_airport!.toUpperCase();
    // 日本国内空港（帰国便）はスキップ
    if (homeAirports.includes(code)) continue;
    // 同じガイドキーの重複防止
    const guideKey = AIRPORT_TO_GUIDE[code] || code;
    if (seen.has(guideKey)) continue;
    seen.add(guideKey);

    destinations.push({
      airportCode: code,
      regionName: getGuideRegionName(code),
      guide: getGuideByAirport(code),
    });
  }

  return destinations;
}

// ===== 国コードから都市を逆引き（フォールバック用） =====
export function getCitiesForCountry(countryCode: string): { key: string; guide: CityGuide }[] {
  const prefix = `${countryCode}:`;
  return Object.entries(CITY_GUIDES)
    .filter(([k]) => k.startsWith(prefix))
    .map(([key, guide]) => ({ key, guide }));
}

// ===== 都市名からガイドを検索（あいまい検索） =====
export function findCityGuide(countryCode: string, destination?: string): CityGuide | null {
  // 完全一致
  const cities = getCitiesForCountry(countryCode);
  if (cities.length === 0) return null;

  // destination指定なし → 最初の都市を返す
  if (!destination) return cities[0]?.guide || null;

  const dest = destination.toLowerCase();
  // 都市名で部分一致
  const match = cities.find(c =>
    c.guide.cityNameJa.includes(destination) ||
    c.guide.cityName.toLowerCase().includes(dest) ||
    dest.includes(c.guide.cityNameJa) ||
    dest.includes(c.guide.cityName.toLowerCase())
  );
  if (match) return match.guide;

  // 一致しなければ最初の都市
  return cities[0]?.guide || null;
}

// ===== AI生成キャッシュ管理 =====
export interface AIGuideItem {
  name: string;
  description: string;
  tip?: string;
  type: 'tourism' | 'food';
  category?: string;
}

export interface AIGuideCache {
  cityName: string;
  generatedAt: string;
  items: AIGuideItem[];
  rawText?: string; // フォールバック用の生テキスト
}

async function getCachedAIGuide(cacheKey: string): Promise<AIGuideCache | null> {
  try {
    const raw = await AsyncStorage.getItem(AI_GUIDE_CACHE_PREFIX + cacheKey);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

async function setCachedAIGuide(cacheKey: string, cache: AIGuideCache): Promise<void> {
  try {
    await AsyncStorage.setItem(AI_GUIDE_CACHE_PREFIX + cacheKey, JSON.stringify(cache));
  } catch { /* ignore */ }
}

/**
 * AI生テキストから構造化データをパースする
 */
function parseAIGuideText(text: string, cityName: string): AIGuideCache {
  const items: AIGuideItem[] = [];
  // 行ごとに解析: "■名前" や "- **名前**" や "【名前】" パターンを検出
  const lines = text.split('\n');
  let currentSection: 'tourism' | 'food' = 'tourism';
  let currentItem: Partial<AIGuideItem> | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // セクション切り替え検出
    if (/グルメ|食|料理|レストラン|フード/.test(trimmed) && /[■【★☆=\-]/.test(trimmed)) {
      currentSection = 'food';
      continue;
    }
    if (/観光|名所|スポット|見どころ/.test(trimmed) && /[■【★☆=\-]/.test(trimmed)) {
      currentSection = 'tourism';
      continue;
    }

    // アイテム名の検出パターン
    const nameMatch = trimmed.match(/^(?:[■●◆★☆\-\*\d]+[\.\)）\s]*)\s*(?:\*{0,2})(.+?)(?:\*{0,2})$/);
    const bracketMatch = trimmed.match(/^【(.+?)】/);
    const boldMatch = trimmed.match(/^\*\*(.+?)\*\*/);

    if (bracketMatch || (nameMatch && trimmed.length < 60 && !trimmed.includes('：') && !trimmed.includes('Tip'))) {
      // 前のアイテムを保存
      if (currentItem?.name) {
        items.push({
          name: currentItem.name,
          description: currentItem.description || '',
          tip: currentItem.tip,
          type: currentItem.type || currentSection,
          category: currentItem.type === 'food' ? 'must_eat' : 'landmark',
        });
      }
      currentItem = {
        name: (bracketMatch?.[1] || boldMatch?.[1] || nameMatch?.[1] || trimmed).replace(/\*+/g, '').trim(),
        type: currentSection,
        description: '',
      };
    } else if (currentItem) {
      // Tip行の検出
      if (/^(?:💡|Tip|tip|ヒント|コツ|ポイント)[：:]?\s*/.test(trimmed)) {
        currentItem.tip = trimmed.replace(/^(?:💡|Tip|tip|ヒント|コツ|ポイント)[：:]?\s*/, '');
      } else if (!currentItem.description) {
        currentItem.description = trimmed.replace(/^[\-\s]+/, '');
      } else if (trimmed.length < 80) {
        // 追加情報をdescriptionに追記
        currentItem.description += ' ' + trimmed.replace(/^[\-\s]+/, '');
      }
    }
  }
  // 最後のアイテム
  if (currentItem?.name) {
    items.push({
      name: currentItem.name,
      description: currentItem.description || '',
      tip: currentItem.tip,
      type: currentItem.type || currentSection,
      category: currentItem.type === 'food' ? 'must_eat' : 'landmark',
    });
  }

  return {
    cityName,
    generatedAt: new Date().toISOString(),
    items,
    rawText: text,
  };
}

// ===== AI生成フォールバック（キャッシュ付き） =====
export async function generateCityGuideAI(
  countryName: string,
  cityName: string,
  guideType: 'tourism' | 'food' | 'both',
): Promise<string> {
  // キャッシュ確認
  const cacheKey = `${cityName}_${guideType}`.toLowerCase().replace(/\s+/g, '_');
  const cached = await getCachedAIGuide(cacheKey);
  if (cached?.rawText) {
    return cached.rawText;
  }

  const typeLabel = guideType === 'tourism' ? '観光名所' : guideType === 'food' ? '食・グルメ' : '観光名所と食・グルメ';

  const prompt = `あなたは海外旅行の都市ガイド専門AIです。
以下の都市の${typeLabel}について、日本人旅行者向けに実用的な情報を日本語で提供してください。

【都市】${cityName}（${countryName}）

以下のルールで回答してください：
- ${guideType === 'food' || guideType === 'both' ? '必食グルメを5つ' : ''}${guideType === 'both' ? 'と' : ''}${guideType === 'tourism' || guideType === 'both' ? '観光名所を5つ' : ''}紹介
- 各項目は以下の形式で出力（パース可能にするため厳守）：
  ■ 名前
  説明（1-2文）
  💡 実用的なTip
- 観光名所セクションの前に「=== 観光名所 ===」、グルメセクションの前に「=== グルメ ===」のヘッダーを入れる
- 具体的な場所やアクセス方法があれば記載
- 料金目安がわかる場合は記載
- 「〜かもしれません」は避け、断定的に書く。確証がなければ「要確認」と明示`;

  const deviceId = await getDeviceId();
  const { data, error } = await supabase.functions.invoke('ai-proxy', {
    body: {
      model: 'gpt-4o-mini',
      max_tokens: 2048,
      device_id: deviceId,
      feature: 'city_guide',
      messages: [{ role: 'user', content: prompt }],
    },
  });

  if (error) throw new Error(`API error: ${error.message}`);
  const body = typeof data === 'string' ? JSON.parse(data) : data;
  const content = body?.content?.[0]?.text;
  if (!content) throw new Error('AIからの応答がありません');

  // キャッシュに保存（構造化データ + 生テキスト）
  const parsed = parseAIGuideText(content, cityName);
  await setCachedAIGuide(cacheKey, parsed);

  return content;
}

/**
 * キャッシュ済みのAIガイド構造化データを取得
 */
export async function getCachedGuideItems(cityName: string, guideType: 'tourism' | 'food' | 'both'): Promise<AIGuideCache | null> {
  const cacheKey = `${cityName}_${guideType}`.toLowerCase().replace(/\s+/g, '_');
  return getCachedAIGuide(cacheKey);
}

// ===== キーワード（都市名・国名）からガイドを検索 =====
// 日本語・英語の都市名/国名/エリア名で検索できるマッピング
const KEYWORD_TO_GUIDE: Record<string, string> = {
  // カザフスタン
  'アスタナ': 'KZ:astana', 'astana': 'KZ:astana',
  'アルマトイ': 'KZ:almaty', 'almaty': 'KZ:almaty',
  'カザフスタン': 'KZ:astana', 'kazakhstan': 'KZ:astana',
  // モンゴル
  'ウランバートル': 'MN:ulaanbaatar', 'ulaanbaatar': 'MN:ulaanbaatar',
  'モンゴル': 'MN:ulaanbaatar', 'mongolia': 'MN:ulaanbaatar',
  // ドイツ
  'ベルリン': 'DE:berlin', 'berlin': 'DE:berlin',
  'ミュンヘン': 'DE:munich', 'munich': 'DE:munich', 'münchen': 'DE:munich',
  'フランクフルト': 'DE:frankfurt', 'frankfurt': 'DE:frankfurt',
  'ケルン': 'DE:cologne', 'cologne': 'DE:cologne', 'köln': 'DE:cologne',
  'デュッセルドルフ': 'DE:dusseldorf', 'dusseldorf': 'DE:dusseldorf', 'düsseldorf': 'DE:dusseldorf',
  'ハンブルク': 'DE:hamburg', 'hamburg': 'DE:hamburg',
  'ドイツ': 'DE:berlin', 'germany': 'DE:berlin',
  // 韓国
  'ソウル': 'KR:seoul', 'seoul': 'KR:seoul',
  'プサン': 'KR:busan', '釜山': 'KR:busan', 'busan': 'KR:busan',
  'チェジュ': 'KR:jeju', '済州': 'KR:jeju', 'jeju': 'KR:jeju',
  '韓国': 'KR:seoul', 'korea': 'KR:seoul',
  // 日本
  '東京': 'JP:tokyo', 'tokyo': 'JP:tokyo',
  '大阪': 'JP:osaka', 'osaka': 'JP:osaka',
  '名古屋': 'JP:nagoya', 'nagoya': 'JP:nagoya',
  '札幌': 'JP:sapporo', 'sapporo': 'JP:sapporo',
  '福岡': 'JP:fukuoka', 'fukuoka': 'JP:fukuoka',
  '沖縄': 'JP:okinawa', 'okinawa': 'JP:okinawa',
  // タイ
  'バンコク': 'TH:bangkok', 'bangkok': 'TH:bangkok',
  'チェンマイ': 'TH:chiangmai', 'chiangmai': 'TH:chiangmai', 'chiang mai': 'TH:chiangmai',
  'プーケット': 'TH:phuket', 'phuket': 'TH:phuket',
  'タイ': 'TH:bangkok', 'thailand': 'TH:bangkok',
  // 台湾
  '台北': 'TW:taipei', 'taipei': 'TW:taipei',
  '高雄': 'TW:kaohsiung', 'kaohsiung': 'TW:kaohsiung',
  '台湾': 'TW:taipei', 'taiwan': 'TW:taipei',
  // アメリカ
  'ニューヨーク': 'US:newyork', 'new york': 'US:newyork', 'newyork': 'US:newyork',
  'ホノルル': 'US:honolulu', 'honolulu': 'US:honolulu',
  'ハワイ': 'US:honolulu', 'hawaii': 'US:honolulu',
  'マウイ': 'US:maui', 'maui': 'US:maui',
  'ロサンゼルス': 'US:losangeles', 'ロスアンジェルス': 'US:losangeles', 'los angeles': 'US:losangeles',
  'サンフランシスコ': 'US:sanfrancisco', 'san francisco': 'US:sanfrancisco',
  'アメリカ': 'US:newyork', 'america': 'US:newyork', 'usa': 'US:newyork',
  // シンガポール
  'シンガポール': 'SG:singapore', 'singapore': 'SG:singapore',
  // ベトナム
  'ハノイ': 'VN:hanoi', 'hanoi': 'VN:hanoi',
  'ホーチミン': 'VN:hochiminh', 'ho chi minh': 'VN:hochiminh', 'hochiminh': 'VN:hochiminh',
  'ダナン': 'VN:danang', 'da nang': 'VN:danang', 'danang': 'VN:danang',
  'ベトナム': 'VN:hanoi', 'vietnam': 'VN:hanoi',
  // 香港
  '香港': 'HK:hongkong', 'hong kong': 'HK:hongkong', 'hongkong': 'HK:hongkong',
  // 中国
  '北京': 'CN:beijing', 'beijing': 'CN:beijing',
  '上海': 'CN:shanghai', 'shanghai': 'CN:shanghai',
  '中国': 'CN:beijing', 'china': 'CN:beijing',
  // フランス
  'パリ': 'FR:paris', 'paris': 'FR:paris',
  'フランス': 'FR:paris', 'france': 'FR:paris',
  // イギリス
  'ロンドン': 'GB:london', 'london': 'GB:london',
  'イギリス': 'GB:london', 'england': 'GB:london', 'uk': 'GB:london',
  // イタリア
  'ローマ': 'IT:rome', 'rome': 'IT:rome', 'roma': 'IT:rome',
  'ベネチア': 'IT:venice', 'ベニス': 'IT:venice', 'venice': 'IT:venice',
  'イタリア': 'IT:rome', 'italy': 'IT:rome',
  // スペイン
  'バルセロナ': 'ES:barcelona', 'barcelona': 'ES:barcelona',
  'マドリード': 'ES:madrid', 'madrid': 'ES:madrid',
  'スペイン': 'ES:barcelona', 'spain': 'ES:barcelona',
  // フィンランド
  'ヘルシンキ': 'FI:helsinki', 'helsinki': 'FI:helsinki',
  'フィンランド': 'FI:helsinki', 'finland': 'FI:helsinki',
  // オランダ
  'アムステルダム': 'NL:amsterdam', 'amsterdam': 'NL:amsterdam',
  'オランダ': 'NL:amsterdam', 'netherlands': 'NL:amsterdam', 'holland': 'NL:amsterdam',
  // スイス
  'チューリッヒ': 'CH:zurich', 'zurich': 'CH:zurich', 'zürich': 'CH:zurich',
  'スイス': 'CH:zurich', 'switzerland': 'CH:zurich',
  // オーストリア
  'ウィーン': 'AT:vienna', 'vienna': 'AT:vienna', 'wien': 'AT:vienna',
  'オーストリア': 'AT:vienna', 'austria': 'AT:vienna',
  // トルコ
  'イスタンブール': 'TR:istanbul', 'istanbul': 'TR:istanbul',
  'カッパドキア': 'TR:cappadocia', 'cappadocia': 'TR:cappadocia', 'カパドキア': 'TR:cappadocia',
  'ギョレメ': 'TR:cappadocia', 'goreme': 'TR:cappadocia', 'göreme': 'TR:cappadocia',
  'トルコ': 'TR:istanbul', 'turkey': 'TR:istanbul',
  // UAE
  'ドバイ': 'AE:dubai', 'dubai': 'AE:dubai',
  // カタール
  'ドーハ': 'QA:doha', 'doha': 'QA:doha',
  // オーストラリア
  'シドニー': 'AU:sydney', 'sydney': 'AU:sydney',
  'メルボルン': 'AU:melbourne', 'melbourne': 'AU:melbourne',
  'オーストラリア': 'AU:sydney', 'australia': 'AU:sydney',
  // ニュージーランド
  'オークランド': 'NZ:auckland', 'auckland': 'NZ:auckland',
  'ニュージーランド': 'NZ:auckland', 'new zealand': 'NZ:auckland',
  // インドネシア
  'バリ': 'ID:bali', 'bali': 'ID:bali',
  'ジャカルタ': 'ID:jakarta', 'jakarta': 'ID:jakarta',
  'インドネシア': 'ID:bali', 'indonesia': 'ID:bali',
  // マレーシア
  'クアラルンプール': 'MY:kualalumpur', 'kuala lumpur': 'MY:kualalumpur',
  'マレーシア': 'MY:kualalumpur', 'malaysia': 'MY:kualalumpur',
  // フィリピン
  'マニラ': 'PH:manila', 'manila': 'PH:manila',
  'セブ': 'PH:cebu', 'cebu': 'PH:cebu',
  'フィリピン': 'PH:manila', 'philippines': 'PH:manila',
  // ベルギー
  'ブリュッセル': 'BE:brussels', 'brussels': 'BE:brussels', 'bruxelles': 'BE:brussels',
  'ベルギー': 'BE:brussels', 'belgium': 'BE:brussels',
};

/**
 * キーワード（都市名/国名/エリア名）でガイドを検索
 * 部分一致に対応
 */
export function findGuideByKeyword(keyword: string): { guide: CityGuide | null; regionName: string; guideKey: string } | null {
  if (!keyword || !keyword.trim()) return null;
  const kw = keyword.trim().toLowerCase();

  // 完全一致を優先
  if (KEYWORD_TO_GUIDE[kw]) {
    const key = KEYWORD_TO_GUIDE[kw];
    const guide = CITY_GUIDES[key] || null;
    const regionName = guide?.cityNameJa || key.split(':')[1] || keyword;
    return { guide, regionName, guideKey: key };
  }
  // 日本語の完全一致（元のケースで）
  if (KEYWORD_TO_GUIDE[keyword.trim()]) {
    const key = KEYWORD_TO_GUIDE[keyword.trim()];
    const guide = CITY_GUIDES[key] || null;
    const regionName = guide?.cityNameJa || key.split(':')[1] || keyword;
    return { guide, regionName, guideKey: key };
  }

  // 部分一致
  for (const [mapKey, guideKey] of Object.entries(KEYWORD_TO_GUIDE)) {
    if (kw.includes(mapKey.toLowerCase()) || mapKey.toLowerCase().includes(kw)) {
      const guide = CITY_GUIDES[guideKey] || null;
      const regionName = guide?.cityNameJa || guideKey.split(':')[1] || keyword;
      return { guide, regionName, guideKey };
    }
  }

  return null;
}

// カテゴリアイコン
export const TOURISM_CATEGORY_ICONS: Record<string, string> = {
  landmark: '🏛️',
  nature: '🌿',
  culture: '🎭',
  shopping: '🛍️',
};
export const FOOD_CATEGORY_ICONS: Record<string, string> = {
  must_eat: '⭐',
  street_food: '🍢',
  restaurant: '🍽️',
  sweet: '🍰',
};
