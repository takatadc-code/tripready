// supabase/functions/ai-proxy/index.ts
// Supabase Edge Function: ハイブリッドAI プロキシ
// - テキストのみ → OpenAI GPT-4o-mini（高速・低コスト）
// - 画像OCR → Anthropic Claude（高精度ドキュメント読み取り）
// ★ サーバー側でAI使用回数を強制チェック（アプリ側突破対策）

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// 画像OCRを含むfeatureはAnthropicを使う（パスポート・クレカ・チケット・保険証券など）
// テキストのみのfeatureはOpenAI GPT-4o-mini（高速・低コスト）
const ANTHROPIC_FEATURES = ['insurance_consult', 'vision_scan'];

// プラン別の上限
const PLAN_LIMITS: Record<string, { total: number | null; monthly: number | null }> = {
  free:    { total: 10,   monthly: null },   // トータル10回
  premium: { total: null,  monthly: 50 },    // 月50回
  owner:   { total: null,  monthly: null },   // 無制限
};

// グローバルRate Limit: 1デバイスあたり1分に最大5回
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-device-id',
};

/**
 * デバイスのプランと使用状況をチェック
 */
async function checkUsage(deviceId: string): Promise<{
  allowed: boolean;
  plan: string;
  reason?: string;
}> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // プラン取得
  const { data: subData } = await supabase
    .from('subscriptions')
    .select('plan, expires_at')
    .eq('device_id', deviceId)
    .single();

  let plan = 'free';
  if (subData) {
    if (subData.plan === 'owner') {
      plan = 'owner';
    } else if (subData.plan === 'premium') {
      // 有効期限チェック
      if (subData.expires_at && new Date(subData.expires_at) > new Date()) {
        plan = 'premium';
      } else {
        plan = 'free'; // 期限切れ → 無料に戻す
      }
    }
  }

  const limits = PLAN_LIMITS[plan];
  if (!limits) return { allowed: true, plan };

  // 無制限プラン
  if (limits.total === null && limits.monthly === null) {
    return { allowed: true, plan };
  }

  // 使用回数を取得
  const { count: totalCount } = await supabase
    .from('ai_usage')
    .select('*', { count: 'exact', head: true })
    .eq('device_id', deviceId);

  // トータル制限チェック（無料プラン）
  if (limits.total !== null && (totalCount || 0) >= limits.total) {
    return {
      allowed: false,
      plan,
      reason: `無料プランのAI利用上限（${limits.total}回）に達しました。プレミアムプランにアップグレードしてください。`,
    };
  }

  // 月間制限チェック（プレミアムプラン）
  if (limits.monthly !== null) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const { count: monthlyCount } = await supabase
      .from('ai_usage')
      .select('*', { count: 'exact', head: true })
      .eq('device_id', deviceId)
      .gte('created_at', monthStart);

    if ((monthlyCount || 0) >= limits.monthly) {
      return {
        allowed: false,
        plan,
        reason: `今月のAI利用上限（${limits.monthly}回/月）に達しました。来月にリセットされます。`,
      };
    }
  }

  return { allowed: true, plan };
}

/**
 * Rate Limitチェック（インメモリ、1分あたり5回）
 */
function checkRateLimit(deviceId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(deviceId);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(deviceId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count += 1;
  return true;
}

/**
 * 使用記録を保存
 */
async function recordUsage(deviceId: string, feature: string) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  await supabase.from('ai_usage').insert({
    device_id: deviceId,
    feature: feature || 'ai_proxy',
  });
}

// ===== Anthropic → OpenAI メッセージフォーマット変換 =====

interface AnthropicContentBlock {
  type: string;
  text?: string;
  source?: { type: string; media_type: string; data: string };
}

/**
 * Anthropic形式のメッセージをOpenAI形式に変換
 * - テキストのみ: { role, content: string } → そのまま
 * - マルチモーダル: Anthropic image block → OpenAI image_url block
 */
function convertMessages(messages: any[], imageDetail: string = 'auto'): any[] {
  return messages.map((msg: any) => {
    // content が文字列の場合はそのまま
    if (typeof msg.content === 'string') {
      return { role: msg.role || 'user', content: msg.content };
    }

    // content が配列の場合（マルチモーダル）
    if (Array.isArray(msg.content)) {
      const openaiContent = msg.content.map((block: AnthropicContentBlock) => {
        if (block.type === 'text') {
          return { type: 'text', text: block.text };
        }
        if (block.type === 'image' && block.source) {
          // Anthropic: { type: 'image', source: { type: 'base64', media_type, data } }
          // OpenAI:    { type: 'image_url', image_url: { url: 'data:<media_type>;base64,<data>' } }
          return {
            type: 'image_url',
            image_url: {
              url: `data:${block.source.media_type};base64,${block.source.data}`,
              detail: imageDetail,
            },
          };
        }
        // 不明なブロックはテキストとして扱う
        return { type: 'text', text: JSON.stringify(block) };
      });
      return { role: msg.role || 'user', content: openaiContent };
    }

    // その他の場合
    return { role: msg.role || 'user', content: String(msg.content) };
  });
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { messages, max_tokens, model, device_id, feature } = body;

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'messages is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ===== デバイスID必須チェック =====
    const deviceId = device_id || req.headers.get('x-device-id') || '';
    if (!deviceId) {
      return new Response(
        JSON.stringify({ error: 'device_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ===== Rate Limit チェック =====
    if (!checkRateLimit(deviceId)) {
      return new Response(
        JSON.stringify({ error: 'リクエストが多すぎます。1分後にお試しください。' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ===== AI使用回数チェック（サーバー側で強制） =====
    const usage = await checkUsage(deviceId);
    console.log(`[ai-proxy] Usage check: allowed=${usage.allowed}, plan=${usage.plan}, reason=${usage.reason || 'none'}`);
    if (!usage.allowed) {
      return new Response(
        JSON.stringify({
          error: 'usage_limit_exceeded',
          plan: usage.plan,
          reason: usage.reason,
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ===== max_tokens の上限制限（コスト対策） =====
    const safeMaxTokens = Math.min(max_tokens || 1024, 4096);

    // ===== ハイブリッドルーティング =====
    const useAnthropic = ANTHROPIC_FEATURES.includes(feature || '');
    let responseData: any;

    console.log(`[ai-proxy] feature=${feature}, useAnthropic=${useAnthropic}, deviceId=${deviceId}`);

    if (useAnthropic) {
      // ===== Anthropic Claude（画像OCR用） =====
      console.log(`[ai-proxy] Calling Anthropic API, model=claude-sonnet-4-20250514, max_tokens=${safeMaxTokens}, messages=${messages.length}`);
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: safeMaxTokens,
          messages,
        }),
      });

      responseData = await response.json();
      console.log(`[ai-proxy] Anthropic response status=${response.status}`);

      if (!response.ok) {
        console.error(`[ai-proxy] Anthropic ERROR:`, JSON.stringify(responseData));
        return new Response(
          JSON.stringify({ error: responseData }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      // Anthropicのレスポンスはそのまま返す（元々この形式）
    } else {
      // ===== OpenAI GPT-4o-mini（テキストAI用） =====
      const openaiMessages = convertMessages(messages);

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          max_tokens: safeMaxTokens,
          messages: openaiMessages,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return new Response(
          JSON.stringify({ error: data }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // OpenAIレスポンス → Anthropicフォーマットに変換
      responseData = {
        content: [{
          type: 'text',
          text: data.choices?.[0]?.message?.content || '',
        }],
        model: data.model,
        usage: data.usage,
      };
    }

    // ===== 成功時: 使用回数を記録 =====
    await recordUsage(deviceId, feature || 'ai_proxy');

    return new Response(
      JSON.stringify(responseData),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
