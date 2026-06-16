// ============================================================
//  データの保存・取得（Supabase ⇄ デモモードを自動で切替）
// ============================================================

const Storage = (() => {
  let sb = null;

  // Supabase クライアントを用意（CDN の supabase-js が必要）
  function client() {
    if (sb) return sb;
    if (CONFIG.useSupabase && window.supabase) {
      sb = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
    }
    return sb;
  }

  const DEMO_KEY = "wedding_quiz_results_demo";

  function demoLoad() {
    try {
      return JSON.parse(localStorage.getItem(DEMO_KEY) || "[]");
    } catch {
      return [];
    }
  }
  function demoSave(list) {
    localStorage.setItem(DEMO_KEY, JSON.stringify(list));
  }

  // 結果を1件登録する
  async function submit(result) {
    // result = { name, score, total, duration_ms }
    if (CONFIG.useSupabase) {
      const { error } = await client().from(CONFIG.TABLE).insert([result]);
      if (error) throw error;
      return;
    }
    // --- デモモード ---
    const list = demoLoad();
    list.push({ ...result, id: crypto.randomUUID(), created_at: new Date().toISOString() });
    demoSave(list);
  }

  // ランキング取得（得点が高い順 → 速い順 → 早く回答した順）
  async function leaderboard(limit = 100) {
    if (CONFIG.useSupabase) {
      const { data, error } = await client()
        .from(CONFIG.TABLE)
        .select("*")
        .order("score", { ascending: false })
        .order("duration_ms", { ascending: true })
        .order("created_at", { ascending: true })
        .limit(limit);
      if (error) throw error;
      return data || [];
    }
    // --- デモモード ---
    return demoLoad().sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.duration_ms !== b.duration_ms) return a.duration_ms - b.duration_ms;
      return new Date(a.created_at) - new Date(b.created_at);
    });
  }

  // ランキングの変化を監視（Supabase は realtime、デモはポーリング）
  function subscribe(callback) {
    if (CONFIG.useSupabase) {
      const ch = client()
        .channel("quiz-results")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: CONFIG.TABLE }, () => {
          callback();
        })
        .subscribe();
      // 念のため定期更新も併用
      const t = setInterval(callback, 5000);
      return () => {
        clearInterval(t);
        client().removeChannel(ch);
      };
    }
    // --- デモモード ---
    const onStorage = (e) => {
      if (e.key === DEMO_KEY) callback();
    };
    window.addEventListener("storage", onStorage);
    const t = setInterval(callback, 2000);
    return () => {
      window.removeEventListener("storage", onStorage);
      clearInterval(t);
    };
  }

  // ---------- クイズの問題（quiz_config テーブル / 1行で全体を保持） ----------
  const PUBLISHED_KEY = "wedding_quiz_published_demo";

  // 公開中のクイズを取得（なければ null）
  async function loadQuiz() {
    if (CONFIG.useSupabase) {
      const { data, error } = await client()
        .from(CONFIG.CONFIG_TABLE)
        .select("data")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return data ? data.data : null;
    }
    // --- デモモード ---
    try {
      return JSON.parse(localStorage.getItem(PUBLISHED_KEY) || "null");
    } catch {
      return null;
    }
  }

  // クイズを保存（公開）。id=1 の1行を上書き。
  async function saveQuiz(quiz) {
    if (CONFIG.useSupabase) {
      const { error } = await client()
        .from(CONFIG.CONFIG_TABLE)
        .upsert({ id: 1, data: quiz, updated_at: new Date().toISOString() });
      if (error) throw error;
      return;
    }
    // --- デモモード ---
    localStorage.setItem(PUBLISHED_KEY, JSON.stringify(quiz));
  }

  return { submit, leaderboard, subscribe, loadQuiz, saveQuiz, isDemo: !CONFIG.useSupabase };
})();
