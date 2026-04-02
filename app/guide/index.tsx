import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Linking,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';

interface GuideSection {
  id: string;
  title: string;
  emoji: string;
  color: string;
  items: GuideItem[];
}

interface GuideItem {
  title: string;
  content: string;
  link?: { url: string; label: string };
}

const GUIDE_DATA: GuideSection[] = [
  {
    id: 'preparation',
    title: '準備編',
    emoji: '🛂',
    color: '#3B82F6',

    items: [
      {
        title: 'パスポートの確認',
        content: '渡航先によって残存有効期間の要件が異なります。多くの国では6ヶ月以上の有効期限が必要です。事前に確認してから予約しましょう。',
      },
      {
        title: '渡航先の安全情報確認',
        content: '外務省の海外安全ホームページで、渡航先の最新の安全情報をチェックしましょう。',
        link: {
          url: 'https://www.anzen.mofa.go.jp/',
          label: '海外安全ホームページ',
        },
      },
      {
        title: 'たびレジへの登録',
        content: '日本在外公館から緊急情報を受け取ったり、トラブル時に連絡を受けたりするために、渡航予定をたびレジに登録することをお勧めします。',
        link: {
          url: 'https://www.ezairyu.mofa.go.jp/tabireg/index.html',
          label: 'たびレジ登録',
        },
      },
      {
        title: '現金・クレジットカード',
        content:
          '国によって使える通貨やカードが異なります。\n\n【地域別対応状況】\nアメリカ: VISA/Mastercard/AMEX広く使える。JCBはハワイ・グアム以外は厳しい\n\nヨーロッパ: VISA/Mastercardが主流。AMEXは使えない場所が多い\n\n韓国: VISA/Mastercard/JCB広く対応\n\n東南アジア: VISA/Mastercard推奨。現金も重要\n\n中国: UnionPay主流。VISA/Mastercardは大都市のみ。Alipay/WeChat Pay推奨\n\n目安として、1日1万円程度+緊急用の現金を用意しておくと安心です。',
      },
      {
        title: '海外旅行保険',
        content: 'クレジットカード付帯の保険でも対応できる場合がありますが、補償額・補償範囲を確認しましょう。心配な場合は専用の海外旅行保険への加入をお勧めします。',
      },
      {
        title: '常備薬・処方箋薬',
        content: '海外で医薬品を使用する場合、英文の処方箋や医師の証明書があると説明しやすくなります。重要な医薬品は事前に準備しておきましょう。',
      },
    ],
  },
  {
    id: 'booking',
    title: '予約編',
    emoji: '✈️',
    color: '#10B981',

    items: [
      {
        title: 'ツアーか個人手配か',
        content:
          '【パッケージツアーのメリット】\n高めですが、日本語サポートが充実。JTB・近畿日本ツーリスト・阪急交通社・HISなどの大手旅行代理店なら、トラブル時の対応が手厚い\n\n【個人手配のメリット】\nExpedia、Booking.com、Agodaなどの外資系OTAなら、ツアーより安い。ただしキャンセル手続きが複雑な場合もあり、トラブル対応は英語になることもあります。',
      },
      {
        title: '航空券の選び方',
        content:
          '【日系航空会社（ANA・JAL）】\n高いですが、日本語対応が完璧。サービス品質が高く、初心者向け\n\n【外資系航空会社】\n安めですが、サービスレベルや言語対応は会社による\n\n【LCC（格安航空会社）】\n格安ですが、荷物の別料金・座席指定別料金・遅延時の補償が薄いため注意が必要\n\n【中国系エアラインの注意点】\nトランジットで中国入国が必要な場合があります。また、モバイルバッテリーが没収されるリスクもあるため、事前に確認しましょう。',
      },
      {
        title: 'ホテル予約の注意点',
        content:
          '「返金不可」プランは避けることをお勧めします。初心者のうちは、キャンセル手数料がかかっても返金対応なプランを選びましょう。\n\n予約確認メールは必ずスクショ保存。口コミは最新のものを確認し、チェックイン時間・チェックアウト時間も事前に確認しておくと、当日焦りません。',
      },
    ],
  },
  {
    id: 'airport',
    title: '空港編',
    emoji: '🛫',
    color: '#8B5CF6',

    items: [
      {
        title: 'チェックイン',
        content: '国際線は出発時間の2～3時間前に空港到着をお勧めします。バゲージドロップ・パスポート確認・セキュリティチェックなどで時間がかかります。',
      },
      {
        title: '手荷物制限',
        content: '液体物は100ml以下の容器で、1人1枚のジップロック袋に収める必要があります。化粧水・乳液・ジェル・歯磨き粉なども液体扱いになるため注意が必要です。',
      },
      {
        title: '乗り継ぎ（トランジット）',
        content: '乗り継ぎ時間は最低3時間以上確保することをお勧めします。2時間では乗り遅れるリスクが高いです。特に初心者は、余裕をもった時間配分をしましょう。',
      },
      {
        title: '預け荷物の重量制限',
        content: '航空会社により異なります（一般的には20～23kg）。事前に航空会社のウェブサイトで確認し、超過料金がかかるのを避けましょう。',
      },
      {
        title: '免税範囲',
        content: '日本に帰国するときの免税範囲は決まっています。酒3本、タバコ紙巻200本、香水2oz、その他20万円までが免税です。超過分は関税がかかります。',
      },
    ],
  },
  {
    id: 'onsite',
    title: '現地編',
    emoji: '🌏',
    color: '#F97316',

    items: [
      {
        title: 'Wi-Fi・SIMカード',
        content: 'eSIMが便利です（airaloなど）。モバイルWi-Fiルーターレンタルも選択肢ですが、eSIMなら荷物を減らせます。事前にどちらにするか決めておくと、到着後スムーズです。',
      },
      {
        title: '交通手段',
        content: 'Uber・Grabなどのライドシェアサービスが、多くの国で安全で使いやすいです。タクシーのぼったくりを避けたい場合は、これらのアプリを活用しましょう。',
      },
      {
        title: 'チップ文化',
        content:
          'チップの習慣は国により異なります。\nアメリカ：15-20%\nヨーロッパ：5-10%\nアジア：基本的には不要\n\n事前に渡航先の習慣を調べておくと、トラブルを避けられます。',
      },
      {
        title: '飲料水',
        content: '東南アジア・インド・アフリカなど、水道水が飲めない地域は多いです。ミネラルウォーターを購入して飲むようにしましょう。',
      },
      {
        title: '貴重品管理',
        content: 'パスポートはホテルのセーフティボックスに預けるのが安全です。携帯するときはコピーを持ち歩き、原本は宿泊先に置いておくと、紛失時のリスクを減らせます。',
      },
    ],
  },
  {
    id: 'nightsafety',
    title: '夜間行動の安全ルール',
    emoji: '🌙',
    color: '#6D28D9',

    items: [
      {
        title: '📱 スマホのバッテリー',
        content: '外出前に充電を確認。モバイルバッテリーを携帯し、緊急時に連絡が取れる状態を保ちましょう。',
      },
      {
        title: '🍸 ドリンクから目を離さない',
        content: '席を立つときはドリンクを持っていくか、新しいものを注文する。知らない人からの飲み物は受け取らないのが鉄則です。',
      },
      {
        title: '💰 持ち歩く現金を最小限に',
        content: '必要最低限の現金とカード1枚で十分。パスポートはホテルの金庫に保管し、コピーを持ち歩きましょう。',
      },
      {
        title: '📍 ホテルの住所を控える',
        content: 'ホテルの名刺や住所のスクショを撮っておく。言葉が通じなくてもタクシーの運転手に見せられます。',
      },
      {
        title: '🚶 一人歩きを避ける',
        content: '特に深夜は複数人で行動。一人の場合は大通りを歩き、人気のない路地裏には入らないようにしましょう。',
      },
      {
        title: '🗺️ 事前にルートを確認',
        content: '行きたい場所への経路をオフラインマップでダウンロードしておく。迷ったらお店に入って道を聞くのが安全です。',
      },
      {
        title: '🚕 帰り方を先に決める',
        content: '出かける前に帰りの交通手段（終電・タクシー・配車アプリ）を調べておきましょう。Uber/Grabなどは事前インストール推奨。',
      },
      {
        title: '🏨 深夜の門限を確認',
        content: 'ゲストハウスや小規模ホテルは門限がある場合があります。フロントに確認してから夜の外出を。',
      },
    ],
  },
  {
    id: 'trouble',
    title: 'トラブル編',
    emoji: '🆘',
    color: '#EF4444',

    items: [
      {
        title: 'パスポート紛失',
        content: '渡航先でパスポートを失くしても、慌てずに最寄りの日本大使館・領事館に相談してください。仮パスポートや帰国のための証明書を発行してもらえます。',
      },
      {
        title: 'ロストバゲージ（荷物が来ない）',
        content: '到着空港のバゲージカウンターで、すぐに届け出をしましょう。詳細な情報（荷物の特徴・内容物）を記録しておくと、見つかりやすくなります。',
      },
      {
        title: '盗難',
        content: '盗難に遭った場合、現地警察で盗難届を出してください。その後、加入している海外旅行保険会社に連絡し、補償手続きを進めます。',
      },
      {
        title: '病気・怪我',
        content: '海外旅行保険の緊急連絡先に電話してください。保険会社から現地の医療機関が紹介されます。自己判断で医療機関を受診すると、後で補償されない場合もあるため注意が必要です。',
      },
      {
        title: 'フライト欠航・大幅遅延',
        content: '航空会社のカウンターで代替便の確保をしましょう。自力で別便を予約し、後で航空会社に請求することもできますが、必ず事前に相談してください。',
      },
    ],
  },
];

export default function GuideScreen() {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleOpenLink = (url: string) => {
    Linking.openURL(url).catch(() => {
      alert('ブラウザでリンクを開くことができませんでした');
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>旅の知恵袋</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.intro}>
        <Image
          source={require('../../assets/images/aero-cloud-mascot.png')}
          style={styles.mascot}
          resizeMode="contain"
        />
        <Text style={styles.introText}>
          旅の初心者向けに、知っておくと役立つ情報をまとめました。
        </Text>
        <Text style={styles.introSubtext}>
          カテゴリーをタップして詳細をご覧ください
        </Text>
      </View>

      <View style={styles.cardContainer}>
        {GUIDE_DATA.map(section => (
          <TouchableOpacity
            key={section.id}
            style={[styles.sectionCard, { borderLeftColor: section.color }]}
            onPress={() => toggleExpand(section.id)}
            activeOpacity={0.7}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionEmoji}>{section.emoji}</Text>
                <Text style={styles.sectionTitle}>{section.title}</Text>
              </View>
              <Text style={styles.toggleIcon}>
                {expandedId === section.id ? '▼' : '›'}
              </Text>
            </View>

            {expandedId === section.id && (
              <View style={styles.sectionContent}>
                {section.items.map((item, idx) => (
                  <View key={idx} style={styles.itemContainer}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    <Text style={styles.itemContent}>{item.content}</Text>
                    {item.link && (
                      <TouchableOpacity
                        style={styles.linkButton}
                        onPress={() => handleOpenLink(item.link!.url)}
                      >
                        <Text style={styles.linkText}>{item.link.label} ↗</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 16 : 12,
    paddingBottom: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: {
    fontSize: 28,
    color: '#0891B2',
    fontWeight: '300',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  intro: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    alignItems: 'center',
  },
  mascot: {
    width: 80,
    height: 80,
    marginBottom: 12,
  },
  introText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 4,
  },
  introSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  cardContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  sectionCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderLeftWidth: 4,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  sectionEmoji: {
    fontSize: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  toggleIcon: {
    fontSize: 16,
    color: '#9CA3AF',
    fontWeight: '300',
  },
  sectionContent: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  mascotRow: {
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionMascot: {
    width: 70,
    height: 70,
  },
  itemContainer: {
    marginBottom: 14,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 6,
  },
  itemContent: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 8,
  },
  linkButton: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  linkText: {
    fontSize: 12,
    color: '#0891B2',
    fontWeight: '600',
  },
});
