// ============================================================
//  実際に出題するクイズを決める
// ============================================================
//
//  優先順位:
//   1. ?preview=1 付きで開いた場合 … 作成画面の下書き（localStorage）
//   2. DB（quiz_config）に公開済みのクイズがあればそれ
//   3. どちらも無ければ quiz-data.js の既定クイズ
//
//  → ゲストは通常 2 を見る。作成画面の「プレビュー」だけ 1 を見る。
// ============================================================

const DRAFT_KEY = "wedding_quiz_draft"; // 作成画面の編集中データ

async function resolveActiveQuiz() {
  // 1. プレビュー（編集中の下書き）
  try {
    const params = new URLSearchParams(location.search);
    if (params.get("preview")) {
      const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
      if (draft && Array.isArray(draft.questions) && draft.questions.length) {
        return draft;
      }
    }
  } catch (e) {
    console.warn("下書きの読み込みに失敗", e);
  }

  // 2. DB の公開クイズ
  try {
    const published = await Storage.loadQuiz();
    if (published && Array.isArray(published.questions) && published.questions.length) {
      return published;
    }
  } catch (e) {
    console.warn("公開クイズの取得に失敗。既定クイズを使用します。", e);
  }

  // 3. 既定（quiz-data.js）
  return QUIZ;
}

window.resolveActiveQuiz = resolveActiveQuiz;
