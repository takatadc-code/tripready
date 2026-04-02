/**
 * Supabase Edge Function: fetch-mofa-safety
 *
 * 外務省 海外安全情報オープンデータ（XML）を取得し、
 * mofa_danger_levels テーブルに保存する。
 *
 * エンドポイント:
 *   - 国別情報: https://www.ezairyu.mofa.go.jp/opendata/country/{mofa_code}A.xml
 *   - "A" = 全量版（Full）、コードなし = 通常版、"L" = 軽量版
 *
 * 呼び出し方法:
 *   - POST /fetch-mofa-safety — 全対象国を一括更新
 *   - POST /fetch-mofa-safety?country=KR — 特定の国だけ更新
 *
 * Supabase の cron (pg_cron) や外部 cron で1日1回実行推奨
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// 外務省の国コード → ISO 3166-1 alpha-2 マッピング
// 参照: https://www.ezairyu.mofa.go.jp/html/opendata/support/country.pdf
const MOFA_COUNTRY_MAP: Record<string, { iso: string; name: string }> = {
  // ===== アジア =====
  '0082': { iso: 'KR', name: '韓国' },
  '0086': { iso: 'CN', name: '中国' },
  '0886': { iso: 'TW', name: '台湾' },
  '0852': { iso: 'HK', name: '香港' },
  '0066': { iso: 'TH', name: 'タイ' },
  '0065': { iso: 'SG', name: 'シンガポール' },
  '0060': { iso: 'MY', name: 'マレーシア' },
  '0062': { iso: 'ID', name: 'インドネシア' },
  '0063': { iso: 'PH', name: 'フィリピン' },
  '0084': { iso: 'VN', name: 'ベトナム' },
  '0855': { iso: 'KH', name: 'カンボジア' },
  '0856': { iso: 'LA', name: 'ラオス' },
  '0095': { iso: 'MM', name: 'ミャンマー' },
  '0091': { iso: 'IN', name: 'インド' },
  '0094': { iso: 'LK', name: 'スリランカ' },
  '0977': { iso: 'NP', name: 'ネパール' },
  '0960': { iso: 'MV', name: 'モルディブ' },
  '0976': { iso: 'MN', name: 'モンゴル' },
  // ===== 中東 =====
  '0098': { iso: 'IR', name: 'イラン' },
  '0090': { iso: 'TR', name: 'トルコ' },
  '0971': { iso: 'AE', name: 'アラブ首長国連邦' },
  '0966': { iso: 'SA', name: 'サウジアラビア' },
  '0974': { iso: 'QA', name: 'カタール' },
  '0972': { iso: 'IL', name: 'イスラエル' },
  // ===== 北米 =====
  '0001': { iso: 'US', name: 'アメリカ' },
  '0001CA': { iso: 'CA', name: 'カナダ' },
  // ===== 中南米 =====
  '0052': { iso: 'MX', name: 'メキシコ' },
  '0055': { iso: 'BR', name: 'ブラジル' },
  '0051': { iso: 'PE', name: 'ペルー' },
  // ===== ヨーロッパ =====
  '0044': { iso: 'GB', name: 'イギリス' },
  '0033': { iso: 'FR', name: 'フランス' },
  '0049': { iso: 'DE', name: 'ドイツ' },
  '0039': { iso: 'IT', name: 'イタリア' },
  '0034': { iso: 'ES', name: 'スペイン' },
  '0351': { iso: 'PT', name: 'ポルトガル' },
  '0031': { iso: 'NL', name: 'オランダ' },
  '0041': { iso: 'CH', name: 'スイス' },
  '0043': { iso: 'AT', name: 'オーストリア' },
  '0030': { iso: 'GR', name: 'ギリシャ' },
  '0420': { iso: 'CZ', name: 'チェコ' },
  '0385': { iso: 'HR', name: 'クロアチア' },
  '0046': { iso: 'SE', name: 'スウェーデン' },
  '0358': { iso: 'FI', name: 'フィンランド' },
  '0045': { iso: 'DK', name: 'デンマーク' },
  '0047': { iso: 'NO', name: 'ノルウェー' },
  '0353': { iso: 'IE', name: 'アイルランド' },
  '0007': { iso: 'RU', name: 'ロシア' },
  '0380': { iso: 'UA', name: 'ウクライナ' },
  // ===== オセアニア =====
  '0061': { iso: 'AU', name: 'オーストラリア' },
  '0064': { iso: 'NZ', name: 'ニュージーランド' },
  // ===== アフリカ =====
  '0020': { iso: 'EG', name: 'エジプト' },
  '0212': { iso: 'MA', name: 'モロッコ' },
};

// ISO → 外務省コードの逆引き
const ISO_TO_MOFA: Record<string, string> = {};
for (const [mofa, info] of Object.entries(MOFA_COUNTRY_MAP)) {
  ISO_TO_MOFA[info.iso] = mofa;
}

/**
 * 外務省XMLを取得し、危険レベルを解析する
 */
async function fetchMofaData(mofaCode: string): Promise<{
  dangerLevel: number;
  dangerLevelText: string;
  regionInfo: { region: string; level: number; text: string }[];
  alerts: string[];
  spotInfo: string;
  sourceUrl: string;
} | null> {
  const url = `https://www.ezairyu.mofa.go.jp/opendata/country/${mofaCode}A.xml`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'TripReady/1.0 (travel-app)' },
    });
    if (!res.ok) return null;

    const xml = await res.text();

    // XMLパース（Denoの簡易パース）
    // 危険レベルを抽出: <danger_level_cd>4</danger_level_cd> or similar
    // 外務省XMLの構造は以下のパターン:
    //   <result> → <spot_info> / <hazard_info> → danger info

    // 最大危険レベルを抽出
    const levelMatches = xml.match(/<kiken_level[^>]*>(\d+)<\/kiken_level>/gi)
      || xml.match(/<danger[_\-]?level[^>]*>(\d+)<\/danger[_\-]?level[^>]*>/gi)
      || xml.match(/<level[^>]*>(\d+)<\/level>/gi);

    let maxLevel = 0;
    const regionInfo: { region: string; level: number; text: string }[] = [];

    if (levelMatches) {
      for (const match of levelMatches) {
        const numMatch = match.match(/>(\d+)</);
        if (numMatch) {
          const lv = parseInt(numMatch[1], 10);
          if (lv > maxLevel) maxLevel = lv;
        }
      }
    }

    // 地域別情報を抽出（各 area/region ブロック）
    const areaBlocks = xml.match(/<area[^>]*>[\s\S]*?<\/area>/gi)
      || xml.match(/<region[^>]*>[\s\S]*?<\/region>/gi)
      || [];

    for (const block of areaBlocks) {
      const nameMatch = block.match(/<area_name[^>]*>([^<]+)</)
        || block.match(/<region_name[^>]*>([^<]+)</);
      const lvMatch = block.match(/<kiken_level[^>]*>(\d+)</)
        || block.match(/<danger[_\-]?level[^>]*>(\d+)</)
        || block.match(/<level[^>]*>(\d+)</);
      const textMatch = block.match(/<kiken_level_text[^>]*>([^<]+)</)
        || block.match(/<level_text[^>]*>([^<]+)</);

      if (nameMatch && lvMatch) {
        regionInfo.push({
          region: nameMatch[1].trim(),
          level: parseInt(lvMatch[1], 10),
          text: textMatch ? textMatch[1].trim() : '',
        });
      }
    }

    // もし地域別解析でレベルが取れなかった場合、テキストから推定
    if (maxLevel === 0) {
      if (xml.includes('レベル４') || xml.includes('レベル4') || xml.includes('退避')) maxLevel = 4;
      else if (xml.includes('レベル３') || xml.includes('レベル3') || xml.includes('渡航中止勧告')) maxLevel = 3;
      else if (xml.includes('レベル２') || xml.includes('レベル2') || xml.includes('不要不急')) maxLevel = 2;
      else if (xml.includes('レベル１') || xml.includes('レベル1') || xml.includes('十分注意')) maxLevel = 1;
    }

    // 危険レベルテキスト
    const LEVEL_TEXT: Record<number, string> = {
      0: '情報なし',
      1: 'レベル1：十分注意してください',
      2: 'レベル2：不要不急の渡航は止めてください',
      3: 'レベル3：渡航は止めてください（渡航中止勧告）',
      4: 'レベル4：退避してください（退避勧告）',
    };

    // スポット情報・注意喚起テキストの抽出
    const alerts: string[] = [];
    const spotMatches = xml.match(/<spot_info[^>]*>[\s\S]*?<\/spot_info>/gi) || [];
    let spotInfo = '';

    for (const spot of spotMatches) {
      const titleMatch = spot.match(/<title[^>]*>([^<]+)</);
      if (titleMatch) {
        alerts.push(titleMatch[1].trim());
        if (!spotInfo) spotInfo = titleMatch[1].trim();
      }
    }

    // 広域情報からの注意喚起
    const wideMatches = xml.match(/<wide_info[^>]*>[\s\S]*?<\/wide_info>/gi) || [];
    for (const wide of wideMatches) {
      const titleMatch = wide.match(/<title[^>]*>([^<]+)</);
      if (titleMatch) alerts.push(titleMatch[1].trim());
    }

    return {
      dangerLevel: maxLevel,
      dangerLevelText: LEVEL_TEXT[maxLevel] || `レベル${maxLevel}`,
      regionInfo,
      alerts: alerts.slice(0, 5), // 最新5件
      spotInfo,
      sourceUrl: `https://www.anzen.mofa.go.jp/info/pcinfectionspothazardinfo_${mofaCode}.html`,
    };
  } catch (e) {
    console.error(`Failed to fetch MOFA data for ${mofaCode}:`, e);
    return null;
  }
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const url = new URL(req.url);
    const targetCountry = url.searchParams.get('country'); // ISO code e.g. "KR"

    // 対象国の絞り込み
    let targets: [string, { iso: string; name: string }][];
    if (targetCountry) {
      const mofaCode = ISO_TO_MOFA[targetCountry.toUpperCase()];
      if (!mofaCode) {
        return new Response(JSON.stringify({ error: `Unknown country: ${targetCountry}` }), {
          status: 400, headers: { 'Content-Type': 'application/json' },
        });
      }
      targets = [[mofaCode, MOFA_COUNTRY_MAP[mofaCode]]];
    } else {
      targets = Object.entries(MOFA_COUNTRY_MAP);
    }

    const results: { country: string; level: number; status: string }[] = [];

    for (const [mofaCode, { iso, name }] of targets) {
      const data = await fetchMofaData(mofaCode);

      if (data) {
        // UPSERT: country_code をキーにして更新または挿入
        const { error } = await supabase
          .from('mofa_danger_levels')
          .upsert({
            country_code: iso,
            mofa_country_code: mofaCode,
            country_name_ja: name,
            danger_level: data.dangerLevel,
            danger_level_text: data.dangerLevelText,
            region_info: data.regionInfo,
            alerts: data.alerts,
            spot_info: data.spotInfo,
            source_url: data.sourceUrl,
            fetched_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'country_code' });

        if (error) {
          results.push({ country: `${name}(${iso})`, level: data.dangerLevel, status: `error: ${error.message}` });
        } else {
          results.push({ country: `${name}(${iso})`, level: data.dangerLevel, status: 'ok' });
        }
      } else {
        results.push({ country: `${name}(${iso})`, level: -1, status: 'fetch_failed' });
      }

      // レートリミット対策: 100ms待機
      await new Promise(r => setTimeout(r, 100));
    }

    return new Response(JSON.stringify({
      success: true,
      updated: results.filter(r => r.status === 'ok').length,
      failed: results.filter(r => r.status !== 'ok').length,
      results,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
