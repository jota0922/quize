-- ============================================================
--  結婚式クイズ用テーブル作成 SQL
--  Supabase の「SQL Editor」に貼り付けて RUN するだけ
-- ============================================================

-- 1) 結果テーブル
create table if not exists public.quiz_results (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  score       int  not null,
  total       int  not null,
  duration_ms int  not null default 0,   -- 回答にかかった時間（同点時に速い人が上位）
  created_at  timestamptz not null default now()
);

-- 並び替え高速化用インデックス
create index if not exists quiz_results_rank_idx
  on public.quiz_results (score desc, duration_ms asc, created_at asc);

-- 2) Row Level Security を有効化
alter table public.quiz_results enable row level security;

-- 3) 匿名ユーザー（anon key）からの「登録」と「閲覧」を許可
--    ※ 余興用の一時テーブルなので緩めの設定。式が終わったらテーブルごと削除推奨。
drop policy if exists "allow insert for all" on public.quiz_results;
create policy "allow insert for all"
  on public.quiz_results for insert
  to anon, authenticated
  with check (true);

drop policy if exists "allow select for all" on public.quiz_results;
create policy "allow select for all"
  on public.quiz_results for select
  to anon, authenticated
  using (true);

-- 4) リアルタイム更新を有効化（ランキング画面の自動反映用）
alter publication supabase_realtime add table public.quiz_results;


-- ============================================================
--  5) クイズの問題テーブル（作成画面が読み書きする。1行で全体を保持）
-- ============================================================
create table if not exists public.quiz_config (
  id         int primary key default 1,
  data       jsonb not null,           -- { coupleNames, title, subtitle, timeLimitSec, questions[] }
  updated_at timestamptz not null default now(),
  constraint quiz_config_single_row check (id = 1)
);

alter table public.quiz_config enable row level security;

-- 余興用なので緩めに：誰でも閲覧・作成・更新OK
drop policy if exists "config select all" on public.quiz_config;
create policy "config select all"
  on public.quiz_config for select to anon, authenticated using (true);

drop policy if exists "config insert all" on public.quiz_config;
create policy "config insert all"
  on public.quiz_config for insert to anon, authenticated with check (true);

drop policy if exists "config update all" on public.quiz_config;
create policy "config update all"
  on public.quiz_config for update to anon, authenticated using (true) with check (true);

-- ============================================================
--  ▼ 当日リセットしたいとき（全データ消去）
--    delete from public.quiz_results;
--
--  ▼ 式が終わって片付けるとき
--    drop table public.quiz_results;
-- ============================================================
