// ============================================================
//  クイズ作成・編集画面 ロジック
// ============================================================
//  ・編集中の内容は localStorage(DRAFT_KEY) に自動保存（プレビュー元）
//  ・「DBに保存（公開）」でゲスト全員に反映
// ============================================================

const $ = (s) => document.querySelector(s);
const LETTERS = ["A", "B", "C", "D"];
const MAX_CHOICES = 4;
const MIN_CHOICES = 2;

let model = null;

// ---------- 雛形 ----------
function blankQuestion() {
  return { emoji: "❓", question: "", choices: ["", ""], answer: 0 };
}
function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// ---------- 読み込み ----------
async function boot() {
  if (Storage.isDemo) $("#demoBadge").classList.remove("hidden");

  // 1. 編集中の下書きがあれば復元
  let draft = null;
  try {
    draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
  } catch {}

  if (draft && Array.isArray(draft.questions)) {
    model = draft;
    setStatus("編集中の下書きを復元しました", "ok");
  } else {
    // 2. DB の公開クイズ → 3. 既定（quiz-data.js）
    try {
      const published = await Storage.loadQuiz();
      model = published && published.questions ? published : clone(QUIZ);
      setStatus(published ? "公開中のクイズを読み込みました" : "既定のサンプルを読み込みました", "ok");
    } catch (e) {
      console.error(e);
      model = clone(QUIZ);
      setStatus("読み込みに失敗したため既定を表示しています", "ng");
    }
  }
  renderAll();
}

// ---------- 自動保存 ----------
let saveTimer = null;
function autosave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(model));
    flashSaved();
  }, 250);
}
function flashSaved() {
  const el = $("#savedTag");
  el.classList.add("show");
  clearTimeout(flashSaved._t);
  flashSaved._t = setTimeout(() => el.classList.remove("show"), 1200);
}

// ---------- 描画 ----------
function renderAll() {
  renderSettings();
  renderQuestions();
}

function renderSettings() {
  $("#f-couple").value = model.coupleNames || "";
  $("#f-title").value = model.title || "";
  $("#f-subtitle").value = model.subtitle || "";
  $("#f-time").value = model.timeLimitSec ?? 0;
}

function bindSettings() {
  $("#f-couple").addEventListener("input", (e) => { model.coupleNames = e.target.value; autosave(); });
  $("#f-title").addEventListener("input", (e) => { model.title = e.target.value; autosave(); });
  $("#f-subtitle").addEventListener("input", (e) => { model.subtitle = e.target.value; autosave(); });
  $("#f-time").addEventListener("input", (e) => { model.timeLimitSec = Math.max(0, parseInt(e.target.value || "0", 10)); autosave(); });
}

function renderQuestions() {
  const wrap = $("#questions");
  wrap.innerHTML = "";
  model.questions.forEach((q, qi) => wrap.appendChild(questionCard(q, qi)));
  $("#qTotal").textContent = `${model.questions.length} 問`;
}

function questionCard(q, qi) {
  const card = document.createElement("div");
  card.className = "q-card";

  // ヘッダー
  const head = document.createElement("div");
  head.className = "q-head";
  head.innerHTML = `<span class="q-no">問 ${qi + 1}</span>`;
  const tools = document.createElement("div");
  tools.className = "q-tools";
  tools.append(
    iconBtn("↑", "上へ", () => move(qi, -1), qi === 0),
    iconBtn("↓", "下へ", () => move(qi, 1), qi === model.questions.length - 1),
    iconBtn("🗑", "削除", () => removeQuestion(qi), false, "danger")
  );
  head.appendChild(tools);
  card.appendChild(head);

  // 絵文字＋問題文
  const row = document.createElement("div");
  row.className = "q-row";
  const emoji = inputEl("text", q.emoji, "絵文字", (v) => { q.emoji = v; autosave(); });
  emoji.classList.add("emoji-input");
  emoji.maxLength = 4;
  const qtext = document.createElement("textarea");
  qtext.className = "input q-text-input";
  qtext.rows = 2;
  qtext.placeholder = "問題文を入力";
  qtext.value = q.question;
  qtext.addEventListener("input", (e) => { q.question = e.target.value; autosave(); });
  row.append(emoji, qtext);
  card.appendChild(row);

  // 選択肢
  const choices = document.createElement("div");
  choices.className = "choices-edit";
  q.choices.forEach((c, ci) => choices.appendChild(choiceRow(q, qi, ci)));
  card.appendChild(choices);

  // 選択肢追加
  if (q.choices.length < MAX_CHOICES) {
    const add = document.createElement("button");
    add.className = "add-choice";
    add.textContent = "＋ 選択肢を追加";
    add.addEventListener("click", () => { q.choices.push(""); autosave(); renderQuestions(); });
    card.appendChild(add);
  }

  const hint = document.createElement("p");
  hint.className = "q-hint";
  hint.textContent = "○ をクリックして正解を選んでください";
  card.appendChild(hint);

  return card;
}

function choiceRow(q, qi, ci) {
  const row = document.createElement("div");
  row.className = "choice-edit";

  // 正解ラジオ
  const radio = document.createElement("input");
  radio.type = "radio";
  radio.name = `ans-${qi}`;
  radio.checked = q.answer === ci;
  radio.title = "これを正解にする";
  radio.addEventListener("change", () => { q.answer = ci; autosave(); });

  const tag = document.createElement("span");
  tag.className = "choice-letter";
  tag.textContent = LETTERS[ci];

  const input = inputEl("text", q.choices[ci], `選択肢 ${LETTERS[ci]}`, (v) => {
    q.choices[ci] = v;
    autosave();
  });

  row.append(radio, tag, input);

  if (q.choices.length > MIN_CHOICES) {
    row.appendChild(
      iconBtn("✕", "この選択肢を削除", () => removeChoice(q, ci), false, "danger small")
    );
  }
  return row;
}

// ---------- 部品 ----------
function inputEl(type, value, placeholder, onInput) {
  const el = document.createElement("input");
  el.type = type;
  el.className = "input";
  el.value = value ?? "";
  el.placeholder = placeholder || "";
  el.addEventListener("input", (e) => onInput(e.target.value));
  return el;
}
function iconBtn(label, title, onClick, disabled = false, extra = "") {
  const b = document.createElement("button");
  b.className = `icon-btn ${extra}`.trim();
  b.textContent = label;
  b.title = title;
  b.disabled = disabled;
  b.addEventListener("click", onClick);
  return b;
}

// ---------- 操作 ----------
function move(qi, dir) {
  const ni = qi + dir;
  if (ni < 0 || ni >= model.questions.length) return;
  const arr = model.questions;
  [arr[qi], arr[ni]] = [arr[ni], arr[qi]];
  autosave();
  renderQuestions();
}
function removeQuestion(qi) {
  if (!confirm(`問 ${qi + 1} を削除しますか？`)) return;
  model.questions.splice(qi, 1);
  if (model.questions.length === 0) model.questions.push(blankQuestion());
  autosave();
  renderQuestions();
}
function removeChoice(q, ci) {
  q.choices.splice(ci, 1);
  if (q.answer > ci) q.answer -= 1;           // 正解が削除位置より後ろなら詰める
  if (q.answer >= q.choices.length) q.answer = 0; // はみ出したら先頭へ
  autosave();
  renderQuestions();
}
function addQuestion() {
  model.questions.push(blankQuestion());
  autosave();
  renderQuestions();
  // 追加した問題までスクロール
  const cards = document.querySelectorAll(".q-card");
  cards[cards.length - 1]?.scrollIntoView({ behavior: "smooth", block: "center" });
}

// ---------- 検証 ----------
function validate() {
  const errs = [];
  if (!model.questions.length) errs.push("問題が1問もありません。");
  model.questions.forEach((q, i) => {
    const n = i + 1;
    if (!q.question.trim()) errs.push(`問${n}: 問題文が空です。`);
    const filled = q.choices.filter((c) => c.trim());
    if (filled.length < MIN_CHOICES) errs.push(`問${n}: 選択肢は2つ以上必要です。`);
    if (!q.choices[q.answer] || !q.choices[q.answer].trim()) errs.push(`問${n}: 正解の選択肢が空、または未選択です。`);
  });
  return errs;
}

// 保存用にクリーンな形へ（空の選択肢を除去し answer を補正）
function buildClean() {
  return {
    coupleNames: (model.coupleNames || "").trim() || "ふたり",
    title: (model.title || "").trim() || "新郎新婦クイズ",
    subtitle: (model.subtitle || "").trim(),
    timeLimitSec: Math.max(0, parseInt(model.timeLimitSec || 0, 10)),
    questions: model.questions.map((q) => {
      const answerText = q.choices[q.answer];
      const choices = q.choices.map((c) => c.trim()).filter((c) => c);
      const answer = Math.max(0, choices.indexOf((answerText || "").trim()));
      return {
        emoji: (q.emoji || "❓").trim() || "❓",
        question: q.question.trim(),
        choices,
        answer,
      };
    }),
  };
}

// ---------- 保存・書き出し ----------
async function publish() {
  const errs = validate();
  if (errs.length) {
    alert("⚠ 保存できません:\n\n" + errs.join("\n"));
    return;
  }
  const clean = buildClean();
  const btn = $("#publishBtn");
  btn.disabled = true;
  setStatus("保存中…", "");
  try {
    await Storage.saveQuiz(clean);
    localStorage.setItem(DRAFT_KEY, JSON.stringify(model));
    setStatus(
      Storage.isDemo
        ? "保存しました（デモモード：この端末のみ）"
        : "公開しました！ゲストの画面に反映されます 🎉",
      "ok"
    );
  } catch (e) {
    console.error(e);
    setStatus("保存に失敗しました: " + (e.message || e), "ng");
  } finally {
    btn.disabled = false;
  }
}

function preview() {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(model));
  window.open("quiz.html?preview=1", "_blank");
}

function exportJson() {
  download("wedding-quiz.json", JSON.stringify(buildClean(), null, 2));
}

function exportJsFile() {
  const text =
    "// 作成画面から書き出したクイズデータ\n" +
    "// （DBを使わない場合はこのファイルを js/quiz-data.js に置き替えてデプロイ）\n" +
    "const QUIZ = " + JSON.stringify(buildClean(), null, 2) + ";\n";
  download("quiz-data.js", text);
}

function importJson(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const obj = JSON.parse(reader.result);
      if (!obj.questions || !Array.isArray(obj.questions)) throw new Error("questions がありません");
      model = obj;
      autosave();
      renderAll();
      setStatus("ファイルを読み込みました", "ok");
    } catch (e) {
      alert("読み込めませんでした: " + e.message);
    }
  };
  reader.readAsText(file);
}

async function reloadFromDb() {
  if (!confirm("編集中の内容を破棄して、公開中（DB）の内容を読み込み直しますか？")) return;
  try {
    const published = await Storage.loadQuiz();
    model = published && published.questions ? published : clone(QUIZ);
    autosave();
    renderAll();
    setStatus(published ? "DBの内容を読み込みました" : "DBは空でした。既定を表示しています", "ok");
  } catch (e) {
    setStatus("読み込みに失敗: " + (e.message || e), "ng");
  }
}

function download(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function setStatus(msg, kind) {
  const el = $("#statusMsg");
  el.textContent = msg;
  el.className = "status-msg " + (kind || "");
}

// ---------- 起動 ----------
async function init() {
  bindSettings();
  $("#addQuestionBtn").addEventListener("click", addQuestion);
  $("#publishBtn").addEventListener("click", publish);
  $("#previewBtn").addEventListener("click", preview);
  $("#exportJsonBtn").addEventListener("click", exportJson);
  $("#exportJsBtn").addEventListener("click", exportJsFile);
  $("#reloadDbBtn").addEventListener("click", reloadFromDb);
  $("#importInput").addEventListener("change", (e) => {
    if (e.target.files[0]) importJson(e.target.files[0]);
    e.target.value = "";
  });
  await boot();
}

// admin.js は合言葉ロック解除後に動的読み込みされるため、
// すでに DOMContentLoaded が発火済みのことが多い。
// その場合は即実行し、まだ読み込み中なら従来どおりイベントを待つ。
if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
