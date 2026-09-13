import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * Server Components / Route Handlers から公開データへアクセスするためのクライアント。
 * ユーザー認証・セッション管理は含まない。アクセス範囲はDB側のRLSで制御する。
 */
export function createSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !publishableKey) {
    throw new Error(
      "Supabase接続にはNEXT_PUBLIC_SUPABASE_URLとNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEYの設定が必要です。",
    );
  }

  return createClient(url, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
