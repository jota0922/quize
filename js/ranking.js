// ============================================================
//  ランキング画面 ロジック（プロジェクター表示用）
// ============================================================

const medals = ["🥇", "🥈", "🥉"];

function fmtTime(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

async function render() {
  const listEl = document.querySelector("#rankList");
  let rows;
  try {
    rows = await Storage.leaderboard(100);
  } catch (e) {
    console.error(e);
    listEl.innerHTML = `<div class="empty">⚠ 取得に失敗しました。リロードしてください。</div>`;
    return;
  }

  document.querySelector("#count").textContent = `参加 ${rows.length} 名`;

  if (rows.length === 0) {
    listEl.innerHTML = `<div class="empty">まだ回答がありません。<br>みんなの送信を待っています… 📲</div>`;
    return;
  }

  listEl.innerHTML = rows
    .map((r, i) => {
      const rank = i + 1;
      const topClass = rank <= 3 ? `top${rank}` : "";
      const medal = rank <= 3 ? `<span class="medal">${medals[i]}</span>` : "";
      const pos = rank <= 3 ? "" : `<div class="pos">${rank}</div>`;
      return `
        <div class="rank-row ${topClass}" style="animation-delay:${Math.min(i * 0.04, 0.6)}s">
          ${medal || pos}
          <div class="who">${escapeHtml(r.name)}
            <div class="when">${fmtTime(r.created_at)} 回答</div>
          </div>
          <div class="pts">${r.score}<small> / ${r.total}</small></div>
        </div>`;
    })
    .join("");
}

window.addEventListener("DOMContentLoaded", () => {
  if (Storage.isDemo) document.querySelector("#demoBadge").classList.remove("hidden");
  render();
  // 新しい結果が来たら自動更新
  Storage.subscribe(render);
});
