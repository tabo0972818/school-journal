// ==========================
// 既読処理
// ==========================
async function markChecked(id) {
  await fetch(`/teacher/check/${id}`, { method: "POST" });
  loadToday();
  loadAll();
  loadGraph();
}

// ==========================
// 提出データ読み込み（今日）
// ==========================
async function loadToday() {
  const res = await fetch("/teacher/today");
  const data = await res.json();
  const todayBody = document.querySelector("#todayTable tbody");
  todayBody.innerHTML = data.map(r => `
    <tr>
      <td>${r.student_name || "不明"}</td>
      <td>${r.condition || "-"}</td>
      <td>${r.mental || "-"}</td>
      <td>${r.is_checked ? "✅" : `<button onclick="markChecked(${r.id})">確認</button>`}</td>
    </tr>
  `).join("");
}

// ==========================
// 提出データ読み込み（全履歴）
// ==========================
async function loadAll() {
  const res = await fetch("/teacher/records");
  const data = await res.json();
  const allBody = document.querySelector("#allTable tbody");
  allBody.innerHTML = data.map(r => `
    <tr>
      <td>${r.date}</td>
      <td>${r.student_name || "不明"}</td>
      <td>${r.condition}</td>
      <td>${r.mental}</td>
      <td>${r.reflection}</td>
      <td>${r.is_checked ? "✅" : `<button onclick="markChecked(${r.id})">確認</button>`}</td>
    </tr>
  `).join("");
}

// ==========================
// グラフ表示
// ==========================
async function loadGraph() {
  try {
    const res = await fetch("/teacher/records");
    const data = await res.json();
    console.log("📊 データ:", data);

    if (!data || data.length === 0) {
      console.warn("⚠️ 提出データなし");
      return;
    }

    const stats = {};
    data.forEach(r => {
      if (!r.date) return;
      stats[r.date] = (stats[r.date] || 0) + 1;
    });

    const labels = Object.keys(stats);
    const values = Object.values(stats);

    const ctx = document.getElementById("submitChart").getContext("2d");
    new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [{
          label: "提出数",
          data: values,
          backgroundColor: "rgba(255, 99, 132, 0.6)",
          borderColor: "rgba(255, 99, 132, 1)",
          borderWidth: 1,
          borderRadius: 5
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } }
      }
    });

  } catch (err) {
    console.error("❌ グラフ生成エラー:", err);
  }
}

// ==========================
// ページロード時実行（最後に！）
// ==========================
document.addEventListener("DOMContentLoaded", () => {
  loadToday();
  loadAll();
  loadGraph();
});
