import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from './supabase';
import { getDeviceId } from './ai-usage';

// ===== 型定義 =====
export interface ScannedFlight {
  airline: string;
  flight_number: string;
  dep_airport: string;
  arr_airport: string;
  dep_date: string;
  dep_time: string;
  arr_date: string;
  arr_time: string;
  booking_ref: string;
  seat: string;
}

export interface ScannedHotel {
  name: string;
  checkin_date: string;
  checkout_date: string;
  checkin_time: string;
  checkout_time: string;
  address: string;
  booking_ref: string;
  room_type: string;
  notes: string;
}

export interface ScannedPassport {
  passport_number: string;
  full_name: string;
  nationality: string;
  expiry_date: string;
  birth_date: string;
}

export interface ScannedInsurance {
  company: string;
  policy_number: string;
  phone: string;
  coverage: string;
  notes: string;
}

export interface ScannedCreditCard {
  card_name: string;
  card_brand: string;
  card_last4: string;
  expiry_date: string;
  cardholder_name: string;
}

// ===== プロンプト定義 =====
const PROMPTS: Record<string, string> = {
  flight: `この航空券・E-ticketの画像からフライト情報を読み取ってください。

重要: 1枚のE-ticketに往路と復路（または乗り継ぎ便）など複数のフライトが記載されている場合があります。
その場合は日付・便名・出発地・到着地を手がかりに、すべてのフライトを個別に抽出してください。

以下のJSON配列形式のみで返してください。フライトが1つでも配列で返してください。
余計なテキストは不要です。値が読み取れない場合は空文字""にしてください。
日付の早い順に並べてください。

[
  {
    "airline": "航空会社の2文字IATAコード（例: NH, JL, LH, BA, UA, DL, KE, OZ, SQ, TG, CX, AA, EK, QR, TR, MM, 7C, TW）",
    "flight_number": "便名の数字部分のみ（例: 408）",
    "dep_airport": "出発空港の3文字IATAコード（例: NRT, HND, KIX）",
    "arr_airport": "到着空港の3文字IATAコード（例: CGN, LAX, ICN）",
    "dep_date": "出発日 YYYY-MM-DD形式",
    "dep_time": "出発時刻 HH:MM形式（24時間制）",
    "arr_date": "到着日 YYYY-MM-DD形式",
    "arr_time": "到着時刻 HH:MM形式（24時間制）",
    "booking_ref": "予約番号・確認番号",
    "seat": "座席番号（例: 12A）"
  }
]`,

  hotel: `このホテル予約確認画面・メールの画像からホテル情報を読み取ってください。
Expedia, Booking.com, Hotels.com, Marriott, Hilton, IHG, Agoda等の予約確認画面に対応しています。
以下のJSON形式のみで返してください。余計なテキストは不要です。
値が読み取れない場合は空文字""にしてください。

{
  "name": "ホテル名（正式名称）",
  "checkin_date": "チェックイン日 YYYY-MM-DD形式",
  "checkout_date": "チェックアウト日 YYYY-MM-DD形式",
  "checkin_time": "チェックイン時刻 HH:MM形式（例: 15:00）",
  "checkout_time": "チェックアウト時刻 HH:MM形式（例: 12:00、正午なら12:00）",
  "address": "ホテルの住所",
  "booking_ref": "予約番号・確認番号（複数ある場合はカンマ区切り）",
  "room_type": "部屋タイプ（例: ファミリースタジオ、デラックスツイン）",
  "notes": "宿泊人数・朝食付き等の追加情報"
}`,

  passport: `このパスポートの画像からパスポート情報を読み取ってください。
以下のJSON形式のみで返してください。余計なテキストは不要です。
値が読み取れない場合は空文字""にしてください。

{
  "passport_number": "パスポート番号（例: TK1234567）",
  "full_name": "氏名（パスポート記載のローマ字表記）",
  "nationality": "国籍（日本語で。例: 日本）",
  "expiry_date": "有効期限 YYYY-MM-DD形式",
  "birth_date": "生年月日 YYYY-MM-DD形式"
}`,

  insurance: `この海外旅行保険の証書・証券・加入証明書の画像から保険情報を読み取ってください。
クレジットカード付帯保険の明細、損保ジャパン、東京海上日動、AIG、エイチ・エス損保、ソニー損保等の保険証券に対応しています。
以下のJSON形式のみで返してください。余計なテキストは不要です。
値が読み取れない場合は空文字""にしてください。

{
  "company": "保険会社名（例: 損保ジャパン、東京海上日動、AIG損害保険）",
  "policy_number": "証券番号・証書番号",
  "phone": "緊急連絡先の電話番号（海外からの番号がベスト。例: +81-3-xxxx-xxxx）",
  "coverage": "補償内容の要約（例: 治療費用3000万円・救援者費用2000万円・携行品損害30万円）",
  "notes": "保険期間、被保険者名、クレジットカード付帯の場合はカード名称など、その他重要情報"
}`,

  credit_card: `このクレジットカードの画像からカード情報を読み取ってください。
セキュリティのため、カード番号は下4桁のみ抽出してください。
以下のJSON形式のみで返してください。余計なテキストは不要です。
値が読み取れない場合は空文字""にしてください。

{
  "card_name": "カード名称（例: ANAアメリカン・エキスプレス・プレミアム・カード、楽天プレミアムカード）",
  "card_brand": "国際ブランド。次のいずれか: VISA, Mastercard, AMEX, JCB, Diners",
  "card_last4": "カード番号の下4桁のみ（例: 1234）。絶対にフル番号を返さないこと",
  "expiry_date": "有効期限 MM/YY形式（例: 03/28）",
  "cardholder_name": "カード名義人のローマ字表記"
}`,
};

// ===== HEIF→JPEG変換 + Base64変換 =====
async function convertAndEncode(uri: string): Promise<string> {
  // 1) expo-image-manipulator で JPEG に変換（HEIF/HEIC対応）
  const manipulated = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1600 } }],            // 長辺1600pxにリサイズ（API制限対策）
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
  );

  // 2) 変換後のJPEGファイルをfetch → blob → base64
  const response = await fetch(manipulated.uri);
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1];
      if (base64) resolve(base64);
      else reject(new Error('Base64変換に失敗しました'));
    };
    reader.onerror = () => reject(new Error('画像の読み込みに失敗しました'));
    reader.readAsDataURL(blob);
  });
}

// ===== 共通スキャン関数（複数画像対応） =====
async function callVisionAPI(imageUris: string | string[], prompt: string): Promise<string> {
  const uris = Array.isArray(imageUris) ? imageUris : [imageUris];
  const base64List = await Promise.all(uris.map(uri => convertAndEncode(uri)));

  const mediaType = 'image/jpeg';
  const content: any[] = [
    ...base64List.map((b64, i) => ({
      type: 'image',
      source: { type: 'base64', media_type: mediaType, data: b64 },
    })),
    { type: 'text', text: uris.length > 1
      ? `以下の${uris.length}枚の画像はすべて同じ予約・チケットの情報です。すべての画像を統合して1つのJSONにまとめてください。\n\n${prompt}`
      : prompt },
  ];

  const deviceId = await getDeviceId();
  const { data, error } = await supabase.functions.invoke('ai-proxy', {
    body: {
      model: 'gpt-4o-mini',
      max_tokens: 1024,
      messages: [{ role: 'user', content }],
      device_id: deviceId,
      feature: 'vision_scan',
    },
  });

  if (error) throw new Error(`API error: ${error.message}`);
  if (data?.error) throw new Error(`API error: ${JSON.stringify(data.error)}`);

  const text = data.content?.[0]?.text || '';
  // 配列 [...] またはオブジェクト {...} のJSONを抽出
  const jsonMatch = text.match(/\[[\s\S]*\]/) || text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('情報を読み取れませんでした');
  return jsonMatch[0];
}

// ===== 各タイプの公開関数（複数画像対応） =====
export async function scanETicket(imageUris: string | string[]): Promise<ScannedFlight[]> {
  const json = await callVisionAPI(imageUris, PROMPTS.flight);
  const parsed = JSON.parse(json);
  // 配列で返ってきた場合はそのまま、オブジェクトの場合は配列に包む
  if (Array.isArray(parsed)) return parsed as ScannedFlight[];
  return [parsed] as ScannedFlight[];
}

export async function scanHotel(imageUris: string | string[]): Promise<ScannedHotel> {
  const json = await callVisionAPI(imageUris, PROMPTS.hotel);
  return JSON.parse(json) as ScannedHotel;
}

export async function scanPassport(imageUri: string): Promise<ScannedPassport> {
  const json = await callVisionAPI(imageUri, PROMPTS.passport);
  return JSON.parse(json) as ScannedPassport;
}

export async function scanInsuranceCert(imageUris: string | string[]): Promise<ScannedInsurance> {
  const json = await callVisionAPI(imageUris, PROMPTS.insurance);
  return JSON.parse(json) as ScannedInsurance;
}

// ===== 保険約款AI相談（複数画像対応） =====
export const TROUBLE_CATEGORIES = [
  { key: 'injury', label: '🏥 怪我・病気', prompt: '海外旅行中に怪我や病気になった場合' },
  { key: 'theft', label: '🔓 盗難・紛失', prompt: '荷物やパスポート、貴重品が盗まれた・紛失した場合' },
  { key: 'flight_delay', label: '✈️ 欠航・遅延', prompt: 'フライトが欠航・大幅遅延になった場合' },
  { key: 'luggage', label: '🧳 手荷物トラブル', prompt: '預け荷物が届かない（ロストバゲージ）・破損した場合' },
  { key: 'accident', label: '🚗 交通事故', prompt: '海外で交通事故に遭った場合（加害・被害）' },
  { key: 'liability', label: '⚠️ 賠償責任', prompt: 'ホテルの備品を壊した、他人に怪我をさせたなど賠償責任が生じた場合' },
  { key: 'cancel', label: '🚫 旅行キャンセル', prompt: '出発前に旅行をキャンセルせざるを得なくなった場合' },
  { key: 'other', label: '💬 その他', prompt: '' },
];

export async function consultInsurance(
  policyImageUris: string[],
  troubleType: string,
  freeText?: string,
): Promise<string> {
  // 全ページを並列でbase64変換
  const base64List = await Promise.all(policyImageUris.map(uri => convertAndEncode(uri)));

  const category = TROUBLE_CATEGORIES.find(c => c.key === troubleType);
  const troubleDesc = category?.prompt || '';
  const userQuestion = freeText?.trim() || '';

  const systemPrompt = `あなたは海外旅行保険の専門アドバイザーです。
ユーザーが提供した保険証券（約款）の画像を読み取り、以下のトラブルについて具体的にアドバイスしてください。

【トラブル内容】
${troubleDesc}
${userQuestion ? `\n【ユーザーの追加説明】\n${userQuestion}` : ''}

以下の形式で回答してください：

📋 対象となる補償
（この保険で適用される補償項目と補償限度額）

📞 まずやること（ステップ形式）
1. ...
2. ...
3. ...

📝 必要な書類
（保険金請求に必要な書類リスト）

⚠️ 注意点
（期限、免責事項、よくある落とし穴）

💡 アドバイス
（現地で役立つ実践的なヒント）

保険証券の内容に基づいて回答し、約款に記載がない場合はその旨を明記してください。
一般的な海外旅行保険の知識も交えて実用的にアドバイスしてください。`;

  // 画像コンテンツを構築
  const imageContents = base64List.map(b64 => ({
    type: 'image' as const,
    source: { type: 'base64' as const, media_type: 'image/jpeg' as const, data: b64 },
  }));

  const deviceId2 = await getDeviceId();
  const { data, error } = await supabase.functions.invoke('ai-proxy', {
    body: {
      model: 'gpt-4o-mini',
      max_tokens: 4096,
      device_id: deviceId2,
      feature: 'insurance_consult',
      messages: [{
        role: 'user',
        content: [
          ...imageContents,
          { type: 'text', text: systemPrompt },
        ],
      }],
    },
  });

  if (error) throw new Error(`API error: ${error.message}`);
  if (data?.error) throw new Error(`API error: ${JSON.stringify(data.error)}`);

  return data.content?.[0]?.text || '回答を取得できませんでした';
}

// ===== 保険テキストベース相談（画像なし） =====
export async function consultInsuranceText(
  insuranceInfo: { company: string; policy_number?: string; coverage_type?: string; phone?: string; notes?: string },
  troubleType: string,
  freeText?: string,
): Promise<string> {
  const category = TROUBLE_CATEGORIES.find(c => c.key === troubleType);
  const troubleDesc = category?.prompt || '';
  const userQuestion = freeText?.trim() || '';

  const prompt = `あなたは海外旅行保険の専門アドバイザーです。
ユーザーは保険証券の画像を持っていませんが、以下の保険情報を登録しています。
この情報と、あなたの海外旅行保険に関する一般的な知識をもとに、できる限り具体的にアドバイスしてください。

【登録されている保険情報】
保険会社: ${insuranceInfo.company}
${insuranceInfo.policy_number ? `証券番号: ${insuranceInfo.policy_number}` : ''}
${insuranceInfo.coverage_type ? `補償内容: ${insuranceInfo.coverage_type}` : ''}
${insuranceInfo.phone ? `緊急連絡先: ${insuranceInfo.phone}` : ''}
${insuranceInfo.notes ? `メモ: ${insuranceInfo.notes}` : ''}

【トラブル内容】
${troubleDesc}
${userQuestion ? `\n【ユーザーの追加説明】\n${userQuestion}` : ''}

以下の形式で回答してください：

📋 対象となりそうな補償
（${insuranceInfo.company}の一般的な海外旅行保険で適用される補償項目。クレジットカード付帯保険の場合はその一般的な補償内容も考慮）

📞 まずやること（ステップ形式）
1. ...
2. ...
3. ...

📝 必要になりそうな書類
（保険金請求に一般的に必要な書類リスト）

⚠️ 注意点
（期限、免責事項、よくある落とし穴）

💡 アドバイス
（現地で役立つ実践的なヒント）

重要: 保険証券の原本を確認できていないため、一般的な情報に基づくアドバイスであることを冒頭で明記してください。
正確な補償内容は保険証券や約款をご確認いただくよう案内してください。
${insuranceInfo.phone ? `緊急時の連絡先として${insuranceInfo.phone}への電話を案内してください。` : `${insuranceInfo.company}の海外旅行保険デスクへの電話を案内してください。`}`;

  const deviceId3 = await getDeviceId();
  const { data, error } = await supabase.functions.invoke('ai-proxy', {
    body: {
      model: 'gpt-4o-mini',
      max_tokens: 4096,
      device_id: deviceId3,
      feature: 'insurance_consult_text',
      messages: [{
        role: 'user',
        content: [{ type: 'text', text: prompt }],
      }],
    },
  });

  if (error) throw new Error(`API error: ${error.message}`);
  if (data?.error) throw new Error(`API error: ${JSON.stringify(data.error)}`);

  return data.content?.[0]?.text || '回答を取得できませんでした';
}

// ===== 空港AIガイド =====
export const AIRPORT_GUIDE_TOPICS = [
  { key: 'tax_refund', label: '💰 Tax Refund', prompt: 'Tax Refund（税金還付）の手続き場所、手順、必要書類、最低購入金額、注意点' },
  { key: 'duty_free_pickup', label: '🛍️ 免税品受取', prompt: '免税品（市中で購入した免税品）の受け取り場所と手順、受取カウンターの場所' },
  { key: 'duty_free_shop', label: '🏪 免税店', prompt: '空港内の免税品ショップ（Duty Free Shop）の場所、おすすめ店舗、制限エリア内外の情報' },
  { key: 'transport', label: '🚕 市内への交通', prompt: 'タクシー・Uber/Grab等ライドシェアの乗り場、電車・バスなど公共交通機関での市内へのアクセス方法、料金目安、所要時間' },
  { key: 'lounge', label: '🛋️ ラウンジ', prompt: '空港ラウンジ（プライオリティパス対応含む）の場所、利用条件、プライオリティパスで使えるラウンジ一覧' },
  { key: 'wifi_sim', label: '📶 Wi-Fi・SIM', prompt: '空港内の無料Wi-Fi接続方法、SIMカード・eSIM購入場所と料金目安、モバイルWi-Fiレンタル情報' },
  { key: 'currency', label: '💱 両替・ATM', prompt: '両替所の場所と営業時間、ATMの場所、おすすめの両替方法（空港 vs 市内）' },
  { key: 'transit', label: '🔄 乗り継ぎ', prompt: 'トランジット（乗り継ぎ）の手順、ターミナル間移動方法、最低乗継時間（MCT）、トランジットホテル情報' },
];

export async function askAirportGuide(
  airportCode: string,
  airportName: string,
  topicKey: string,
  airlineCode?: string,
  terminal?: string,
): Promise<string> {
  const topic = AIRPORT_GUIDE_TOPICS.find(t => t.key === topicKey);
  // トピックキーが見つからない場合は、自由テキスト質問として扱う
  const questionText = topic ? topic.prompt : topicKey;

  const prompt = `あなたは海外旅行の空港ガイド専門AIです。
以下の空港について、日本人旅行者向けに実用的な情報を日本語で提供してください。

【空港】${airportName}（${airportCode}）
${airlineCode ? `【利用航空会社】${airlineCode}` : ''}
${terminal ? `【ターミナル】${terminal}` : ''}

【知りたい情報】
${questionText}

以下のルールで回答してください：
- 具体的な場所（○階、○ゲート付近、制限エリア内/外）を示す
- 営業時間や料金がわかる場合は記載
- 2025年時点で最新の情報を提供
- 実体験に基づくような実用的なアドバイスを含める
- 短すぎず長すぎず、スマホで読みやすい分量で
- 「〜かもしれません」のような曖昧な表現は避け、断定的に書く。ただし確証がない場合は「要確認」と明示`;

  const deviceId4 = await getDeviceId();
  const { data, error } = await supabase.functions.invoke('ai-proxy', {
    body: {
      model: 'gpt-4o-mini',
      max_tokens: 2048,
      device_id: deviceId4,
      feature: 'airport_guide',
      messages: [{ role: 'user', content: prompt }],
    },
  });

  if (error) throw new Error(`API error: ${error.message}`);
  if (data?.error) throw new Error(`API error: ${JSON.stringify(data.error)}`);

  return data.content?.[0]?.text || '情報を取得できませんでした';
}

export async function scanCreditCard(imageUri: string): Promise<ScannedCreditCard> {
  const json = await callVisionAPI(imageUri, PROMPTS.credit_card);
  const result = JSON.parse(json) as ScannedCreditCard;
  // 万一フル番号が返ってきた場合も下4桁のみに制限
  if (result.card_last4 && result.card_last4.length > 4) {
    result.card_last4 = result.card_last4.slice(-4);
  }
  return result;
}

/**
 * 夜間安全ガイドAI — 渡航先の夜間行動に関するアドバイスを取得
 */
export async function askNightSafetyGuide(
  countryName: string,
  cityOrArea: string,
  topicKey: string,
  topicPrompt: string,
  freeText?: string,
): Promise<string> {
  const question = freeText?.trim() || topicPrompt;

  const prompt = `あなたは海外旅行の夜間安全ガイド専門AIです。
日本人旅行者向けに、夜間の安全行動に関する実用的なアドバイスを日本語で提供してください。

【渡航先】${countryName}${cityOrArea ? `（${cityOrArea}）` : ''}

【質問】
${question}

以下のルールで回答してください：
- 具体的なエリア名・通り名を含めて回答する
- 危険な場所だけでなく、安全に楽しめる場所も提案する
- 現地の文化やマナーに関する注意点を含める
- 料金やチップの相場がわかる場合は記載する
- 交通手段（タクシー、配車アプリ、公共交通）の具体的な利用方法を含める
- 2025年時点で最新の情報を提供する
- 旅行者の安全を最優先としたアドバイスをする
- スマホで読みやすい分量で、箇条書きと説明を織り交ぜる
- 違法行為を勧めない。現地の法律・規制に基づいたアドバイスをする`;

  const deviceId5 = await getDeviceId();
  const { data, error } = await supabase.functions.invoke('ai-proxy', {
    body: {
      model: 'gpt-4o-mini',
      max_tokens: 2048,
      device_id: deviceId5,
      feature: 'night_safety_guide',
      messages: [{ role: 'user', content: prompt }],
    },
  });

  if (error) throw new Error(`API error: ${error.message}`);
  if (data?.error) throw new Error(`API error: ${JSON.stringify(data.error)}`);

  return data.content?.[0]?.text || '情報を取得できませんでした';
}
