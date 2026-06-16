# 💍 新郎新婦クイズ大会

結婚式の余興用クイズアプリ。ゲストが各自のスマホで夫婦クイズに回答 → 得点をサーバーに送信 → プロジェクター画面でリアルタイムにランキング表示。上位の人に景品を！🎁

## ファイル構成

```
quize/
├─ index.html          … ゲスト用クイズ（スマホで開く）
├─ admin.html          … クイズ作成・編集画面（問題をここで作る）
├─ ranking.html        … ランキング表示（プロジェクター/PC で開く）
├─ supabase_setup.sql  … DBテーブル作成SQL
├─ css/style.css       … 見た目（ポップ＆カラフル）
└─ js/
   ├─ config.js        … ★Supabase接続設定（ここを編集）
   ├─ quiz-data.js     … 既定（フォールバック）の問題
   ├─ storage.js       … 保存/取得（Supabase⇄デモ自動切替）
   ├─ quiz-loader.js   … 出題するクイズの決定（下書き→DB→既定）
   ├─ admin.js         … 作成・編集画面ロジック
   ├─ app.js           … クイズ進行ロジック
   └─ ranking.js       … ランキング描画ロジック
```

クイズの問題は **DB(quiz_config)に保存** され、作成画面で「保存」するとゲスト全員に反映されます。
DBに何も無い場合は `js/quiz-data.js` の内容が既定として使われます。

## まず動きを見る（設定不要・デモモード）

`index.html` をブラウザでダブルクリックで開くだけ。
- この状態は **デモモード**（送信結果・編集したクイズはその端末内のみに保存／集計はされない）。
- 画面上部に「デモモード（未接続）」と表示されます。
- 同じ端末で `ranking.html` を開くと自分の結果が見えます。

## 問題を作る・編集する（作成画面）

`admin.html` をブラウザで開くだけ。コードを触らずに作れます。
- 基本設定：ふたりの名前 / タイトル / サブタイトル / 制限時間
- 問題：絵文字・問題文・選択肢（2〜4個）・正解（○をクリック）・順番（↑↓）・追加/削除
- 編集中は自動で下書き保存。**「👀 プレビュー」** で実際の画面を即確認
- 完成したら **「💾 DBに保存（公開）」** でゲストに反映
- バックアップ用に JSON 書き出し／読み込みも可能
  （DBを使わずファイル方式にしたい人向けに「quiz-data.js書き出し」もあります）

## 本番（各自のスマホから集計）にする手順

各自のスマホから集計するには共有DBが必要です。Supabase（無料枠でOK）を使います。

1. **Supabase プロジェクト作成** … <https://supabase.com> でログイン → New project
2. **テーブル作成** … 左メニュー「SQL Editor」→ `supabase_setup.sql` の中身を貼り付け → RUN
3. **キーを取得** … 「Project Settings > API」から
   - `Project URL`
   - `anon public` キー
4. **`js/config.js` に貼り付け**
   ```js
   SUPABASE_URL: "https://xxxx.supabase.co",
   SUPABASE_ANON_KEY: "eyJhbGci....",
   ```
   → 自動で本番モードになります（上部のデモ表示が消えます）。
5. **公開する** … `quize` フォルダを丸ごと Cloudflare Pages / Netlify / GitHub Pages 等にアップ
   （静的サイトなのでフォルダを置くだけ。ビルド不要）
6. **当日** … 公開URLの **QRコード** を作って席札やスクリーンに掲示。ゲストは読み取って回答。
   司会用PCで `ranking.html` を開いておくと自動でランキングが伸びていきます。

## ランキングのルール

1. 得点が高い順
2. 同点なら回答が速かった順（`duration_ms`）
3. それも同じなら早く回答した順

## 当日の運用メモ

- **リハ後にリセット**：Supabase SQL Editor で `delete from quiz_results;`
- **同じ人が複数回**：送信のたびに1行増えます。1人1回にしたい場合は司会で案内を。
- **電波対策**：会場のWi-Fi/電波が弱い席があると送信に失敗することがあります（再送ボタンあり）。
- **終了後の片付け**：`drop table quiz_results;` でテーブルごと削除できます。

## 使用ライブラリ（すべてCDN・インストール不要）

- [canvas-confetti](https://github.com/catdad/canvas-confetti) … 正解時の紙吹雪
- [supabase-js](https://github.com/supabase/supabase-js) … DB接続
- Google Fonts（M PLUS Rounded 1c / Baloo 2）
