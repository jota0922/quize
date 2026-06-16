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
  answers: [], // 各問の回答（後で答え合わせに使う）: { picked }
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
    state.answers = [];
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
// 正解/不正解はその場で出さない。回答だけ記録して次の問題へ進む。
function answer(picked) {
  if (state.locked) return;
  state.locked = true;
  clearInterval(state.timer);

  const q = ACTIVE_QUIZ.questions[state.index];
  const isRight = picked === q.answer;
  if (isRight) state.score++;

  // 後で答え合わせできるよう回答を保存
  state.answers[state.index] = { picked };

  // 選んだ選択肢だけ「選択済み」表示にする（正誤は伏せたまま）
  const buttons = [...$("#choices").querySelectorAll(".choice")];
  buttons.forEach((b, i) => {
    b.disabled = true;
    if (i === picked) b.classList.add("selected");
    else b.classList.add("dim");
  });

  setTimeout(next, 450);
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

  // 得点・正誤はこの場では伏せる（後で「回答を確認する」ボタンで答え合わせ）
  $("#resultMsg").textContent = "おつかれさま！回答を受け付けました 🎉";

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

// ---------- 答え合わせ（後から確認） ----------
function renderReview() {
  const area = $("#reviewArea");
  const letters = ["A", "B", "C", "D"];
  const total = ACTIVE_QUIZ.questions.length;

  const rows = ACTIVE_QUIZ.questions.map((q, qi) => {
    const picked = state.answers[qi] ? state.answers[qi].picked : -1;
    const isRight = picked === q.answer;

    const choices = q.choices
      .map((c, ci) => {
        const tags = [];
        if (ci === q.answer) tags.push("正解");
        if (ci === picked) tags.push("あなたの回答");
        const cls = [
          "review-choice",
          ci === q.answer ? "correct" : "",
          ci === picked && !isRight ? "wrong" : "",
        ]
          .filter(Boolean)
          .join(" ");
        const tagHtml = tags.length
          ? ` <span class="review-tag">${tags.join(" / ")}</span>`
          : "";
        return `<li class="${cls}"><span class="mark">${letters[ci]}</span><span>${escapeHtml(
          c
        )}</span>${tagHtml}</li>`;
      })
      .join("");

    const status =
      picked === -1
        ? '<span class="review-status ng">未回答</span>'
        : isRight
        ? '<span class="review-status ok">○ 正解</span>'
        : '<span class="review-status ng">✗ 不正解</span>';

    return `
      <div class="review-q">
        <div class="review-head">
          <span class="review-num">Q${qi + 1}</span>
          <span class="review-text">${q.emoji || "❓"} ${escapeHtml(q.question)}</span>
          ${status}
        </div>
        <ul class="review-list">${choices}</ul>
      </div>`;
  });

  const summary = `<p class="review-summary">スコア：${state.score} / ${total}</p>`;
  area.innerHTML = summary + rows.join("");
  area.classList.remove("hidden");
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

  const reviewBtn = $("#reviewBtn");
  if (reviewBtn) {
    reviewBtn.addEventListener("click", () => {
      const area = $("#reviewArea");
      if (area.classList.contains("hidden")) {
        renderReview();
        reviewBtn.textContent = "答え合わせを閉じる ✖";
      } else {
        area.classList.add("hidden");
        reviewBtn.textContent = "回答を確認する 👀";
      }
    });
  }

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
