// ============================================================
//  ゲスト用クイズ ロジック
// ============================================================

const $ = (sel) => document.querySelector(sel);

const state = {
  name: "",
  index: 0,
  score: 0,
  startedAt: 0,
  locked: false,
  timer: null,
  timeLeft: 0,
};

// 画面の出し分け
function show(screenId) {
  ["screen-start", "screen-quiz", "screen-result"].forEach((id) => {
    $("#" + id).classList.toggle("hidden", id !== screenId);
  });
}

// ---------- スタート ----------
function initStart() {
  $("#couple").textContent = ACTIVE_QUIZ.coupleNames;
  $("#title").textContent = ACTIVE_QUIZ.title;
  $("#subtitle").textContent = ACTIVE_QUIZ.subtitle;

  const nameInput = $("#name");
  const startBtn = $("#startBtn");

  const sync = () => (startBtn.disabled = nameInput.value.trim().length === 0);
  nameInput.addEventListener("input", sync);
  sync();

  startBtn.addEventListener("click", () => {
    state.name = nameInput.value.trim();
    state.index = 0;
    state.score = 0;
    state.startedAt = Date.now();
    show("screen-quiz");
    renderQuestion();
  });

  nameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !startBtn.disabled) startBtn.click();
  });
}

// ---------- 問題表示 ----------
function renderQuestion() {
  state.locked = false;
  const q = ACTIVE_QUIZ.questions[state.index];
  const total = ACTIVE_QUIZ.questions.length;

  $("#qcount").textContent = `Q${state.index + 1} / ${total}`;
  $("#progressBar").style.width = `${(state.index / total) * 100}%`;
  $("#qEmoji").textContent = q.emoji || "❓";
  $("#qText").textContent = q.question;
  $("#verdict").textContent = "";
  $("#verdict").className = "verdict";

  const wrap = $("#choices");
  wrap.innerHTML = "";
  const letters = ["A", "B", "C", "D"];
  q.choices.forEach((choice, i) => {
    const btn = document.createElement("button");
    btn.className = "choice";
    btn.innerHTML = `<span class="mark">${letters[i]}</span><span>${escapeHtml(choice)}</span>`;
    btn.addEventListener("click", () => answer(i));
    wrap.appendChild(btn);
  });

  startTimer();
}

// ---------- タイマー ----------
function startTimer() {
  const el = $("#timer");
  clearInterval(state.timer);
  if (!ACTIVE_QUIZ.timeLimitSec || ACTIVE_QUIZ.timeLimitSec <= 0) {
    el.textContent = "";
    return;
  }
  state.timeLeft = ACTIVE_QUIZ.timeLimitSec;
  const tick = () => {
    el.textContent = `⏱ ${state.timeLeft}`;
    el.classList.toggle("warn", state.timeLeft <= 5);
    if (state.timeLeft <= 0) {
      clearInterval(state.timer);
      answer(-1); // 時間切れ（不正解扱い）
      return;
    }
    state.timeLeft--;
  };
  tick();
  state.timer = setInterval(tick, 1000);
}

// ---------- 回答 ----------
function answer(picked) {
  if (state.locked) return;
  state.locked = true;
  clearInterval(state.timer);

  const q = ACTIVE_QUIZ.questions[state.index];
  const correct = q.answer;
  const isRight = picked === correct;
  if (isRight) state.score++;

  const buttons = [...$("#choices").querySelectorAll(".choice")];
  buttons.forEach((b, i) => {
    b.disabled = true;
    if (i === correct) b.classList.add("correct");
    else if (i === picked) b.classList.add("wrong");
    else b.classList.add("dim");
  });

  const v = $("#verdict");
  if (isRight) {
    v.textContent = "正解！ 🎉";
    v.className = "verdict ok";
    if (window.confetti) confetti({ particleCount: 60, spread: 70, origin: { y: 0.7 } });
  } else if (picked === -1) {
    v.textContent = "時間切れ… ⏳";
    v.className = "verdict ng";
  } else {
    v.textContent = "ざんねん… 😢";
    v.className = "verdict ng";
  }

  setTimeout(next, 1300);
}

function next() {
  state.index++;
  if (state.index >= ACTIVE_QUIZ.questions.length) {
    finish();
  } else {
    renderQuestion();
  }
}

// ---------- 結果 ----------
async function finish() {
  const total = ACTIVE_QUIZ.questions.length;
  const duration = Date.now() - state.startedAt;
  $("#progressBar").style.width = "100%";
  show("screen-result");

  // スコアリング演出
  const pct = Math.round((state.score / total) * 100);
  $("#scoreRing").style.setProperty("--deg", `${(state.score / total) * 360}deg`);
  $("#scoreNum").textContent = state.score;
  $("#scoreDen").textContent = `/ ${total}`;

  let msg = "ナイスチャレンジ！";
  if (pct === 100) msg = "全問正解！ふたりの親友認定 👑";
  else if (pct >= 70) msg = "すごい！ふたりのことよく知ってる 💕";
  else if (pct >= 40) msg = "なかなか！ここから仲を深めよう 🤝";
  $("#resultMsg").textContent = msg;

  if (window.confetti && pct >= 70) {
    confetti({ particleCount: 160, spread: 100, origin: { y: 0.6 } });
  }

  // 送信
  const status = $("#submitStatus");
  try {
    status.textContent = "結果を送信中…";
    await Storage.submit({
      name: state.name,
      score: state.score,
      total,
      duration_ms: duration,
    });
    status.textContent = Storage.isDemo
      ? "保存しました（デモモード：この端末内のみ）"
      : "結果を送信しました！ランキングに反映されます 🎯";
  } catch (e) {
    console.error(e);
    status.textContent = "⚠ 送信に失敗しました。電波の良い場所で再度お試しください。";
    $("#retrySubmit").classList.remove("hidden");
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

// スタート画面の「全○問・1問○秒」を埋める
function fillStartNote() {
  const note = document.querySelector("#startNote");
  if (!note) return;
  note.innerHTML = `全${ACTIVE_QUIZ.questions.length}問・1問${ACTIVE_QUIZ.timeLimitSec || "∞"}秒。<br>得点が高い人から景品ゲット！🎁`;
}

// ---------- 起動 ----------
window.addEventListener("DOMContentLoaded", async () => {
  if (Storage.isDemo) $("#demoBadge").classList.remove("hidden");
  $("#retrySubmit").addEventListener("click", () => {
    $("#retrySubmit").classList.add("hidden");
    finish();
  });

  // 出題するクイズを決定（DB→既定。プレビュー時は下書き）
  try {
    window.ACTIVE_QUIZ = await resolveActiveQuiz();
  } catch (e) {
    console.error(e);
    window.ACTIVE_QUIZ = QUIZ;
  }

  initStart();
  fillStartNote();
  show("screen-start");
});
