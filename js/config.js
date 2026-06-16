// ============================================================
//  設定ファイル（ここだけ編集すれば本番接続できます）
// ============================================================
//
//  ▼ Supabase を使う場合（各自のスマホから集計したい本番モード）
//     1. https://supabase.com でプロジェクトを作成
//     2. プロジェクトの「Settings > API」から下記2つをコピー
//        - Project URL          → SUPABASE_URL
//        - Project API keys の「anon public」キー → SUPABASE_ANON_KEY
//     3. supabase_setup.sql の中身を SQL Editor で実行（テーブル作成）
//
//  ▼ まだ設定していない場合
//     下を空のままにしておくと「デモモード」で動きます。
//     （送信結果はそのスマホの中だけに保存され、本番集計はされません）
//
// ============================================================

const CONFIG = {
  // ↓↓↓ ここに Supabase の値を貼り付けてください ↓↓↓
  SUPABASE_URL: "",
  SUPABASE_ANON_KEY: "",
  // ↑↑↑ 空なら自動でデモモードになります ↑↑↑

  // テーブル名（supabase_setup.sql と合わせる。通常は変更不要）
  TABLE: "quiz_results",         // 回答結果（得点）
  CONFIG_TABLE: "quiz_config",   // クイズの問題そのもの
};

// Supabase が設定済みかどうか
CONFIG.useSupabase = Boolean(CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY);
