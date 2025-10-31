// ============================================================
// 📘 teacher.js（2025-10-31 最終完全版）
// - JST日付判定
// - 提出/未提出自動更新
// - PDF/CSV出力ボタン完全対応
// - フィルター/既読/コメント/トースト通知
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ teacher.js loaded");

  // JST基準日付（YYYY-MM-DD）
  const jstToday = () =>
    new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split("T")[0];

  // ============================================================
  // 🧭 絞り込み
  // ============================================================
  const filterBtn = document.getElementById("btnFilter");
  const resetBtn = document.getElementById("btnReset");

  if (filterBtn) {
    filterBtn.addEventListener("click", () => {
      const from = document.getElementById("filterFrom").value;
      const to = document.getElementById("filterTo").value;
      document.querySelectorAll("#entryTable tbody tr").forEach((tr) => {
        const date = tr.dataset.date;
        const visible =
          (!from || date >= from) && (!to || date <= to);
        tr.style.display = visible ? "" : "none";
      });
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      document.getElementById("filterFrom").value = "";
      document.getElementById("filterTo").value = "";
      document
        .querySelectorAll("#entryTable tbody tr")
        .forEach((tr) => (tr.style.display = ""));
    });
  }

  // ============================================================
  // 📄 CSV出力
  // ============================================================
  function exportToCSV(tableId, filename) {
    const table = document.getElementById(tableId);
    if (!table) return alert("テーブルが見つかりません。");

    const rows = [...table.querySelectorAll("tr")].map((tr) =>
      [...tr.querySelectorAll("th,td")]
        .map((td) => `"${td.textContent.replace(/"/g, '""')}"`)
        .join(",")
    );
    const blob = new Blob(["\uFEFF" + rows.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${filename}_${jstToday()}.csv`;
    a.click();
    showToast("CSV出力が完了しました");
  }

  // ============================================================
  // 🖨️ PDF出力
  // ============================================================
  async function exportToPDF(tableId, filename, titleText) {
    const table = document.getElementById(tableId);
    if (!table) return alert("テーブルが見つかりません。");

    const wrap = document.createElement("div");
    wrap.innerHTML = `<h3 style='color:#0078d4;margin:10mm 0 5mm;'>${titleText}（${jstToday()}）</h3>`;
    const clone = table.cloneNode(true);
    clone.style.width = "95%";
    clone.style.margin = "0 auto";
    clone.style.borderCollapse = "collapse";
    wrap.appendChild(clone);
    document.body.appendChild(wrap);

    await html2pdf()
      .set({
        margin: [10, 10, 10, 10],
        filename: `${filename}_${jstToday()}.pdf`,
        image: { type: "jpeg", quality: 1 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#fff" },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      })
      .from(wrap)
      .save();

    wrap.remove();
    showToast("PDF出力が完了しました");
  }

  // ============================================================
  // 📌 出力ボタンのイベント設定
  // ============================================================
  const entryPDF = document.getElementById("btnEntryPDF");
  const entryCSV = document.getElementById("btnEntryCSV");
  const unPDF = document.getElementById("btnUnsubmittedPDF");
  const unCSV = document.getElementById("btnUnsubmittedCSV");

  if (entryPDF)
    entryPDF.addEventListener("click", () =>
      exportToPDF("entryTable", "提出一覧", "📋 提出一覧（相談欄含む）")
    );

  if (entryCSV)
    entryCSV.addEventListener("click", () =>
      exportToCSV("entryTable", "提出一覧")
    );

  if (unPDF)
    unPDF.addEventListener("click", () =>
      exportToPDF("unsubmittedTable", "未提出一覧", "📅 未提出者一覧")
    );

  if (unCSV)
    unCSV.addEventListener("click", () =>
      exportToCSV("unsubmittedTable", "未提出一覧")
    );

  // ============================================================
  // ✅ 既読＋🔥
  // ============================================================
  document.addEventListener("click", async (e) => {
    if (!e.target.classList.contains("btn-readlike")) return;
    const id = e.target.dataset.entry;
    const comment = document.getElementById("comment-" + id)?.value.trim() || "";

    try {
      const res = await fetch(`/teacher/readlike/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment }),
      });
      const data = await res.json();
      if (data.success) {
        document.querySelector(".cell-read-" + id).innerText = "✅";
        document.querySelector(".cell-comment-" + id).innerText =
          comment || "-";
        document.querySelector(".cell-action-" + id).innerHTML =
          "<span>🔥 済</span>";
        showToast("既読＋🔥を記録しました");
      } else showToast("保存に失敗しました");
    } catch {
      showToast("通信エラー");
    }
  });

  // ============================================================
  // 📊 グラフ
  // ============================================================
  async function loadGraph() {
    try {
      const res = await fetch("/teacher/records");
      const data = await res.json();
      const ctx = document.getElementById("submissionChart")?.getContext("2d");
      if (!ctx) return;

      if (window.submissionChart) window.submissionChart.destroy();

      window.submissionChart = new Chart(ctx, {
        type: "bar",
        data: {
          labels: data.map((d) => d.day),
          datasets: [
            {
              label: "提出数",
              data: data.map((d) => d.count),
              backgroundColor: "rgba(0, 120, 212, 0.6)",
              borderColor: "#0078d4",
              borderWidth: 1,
            },
          ],
        },
        options: { responsive: true, scales: { y: { beginAtZero: true } } },
      });

      console.log("✅ グラフ生成完了");
    } catch (err) {
      console.error("❌ グラフ生成エラー:", err);
    }
  }

  loadGraph();

  // ============================================================
  // 📢 トースト通知
  // ============================================================
  function showToast(msg) {
    const t = document.getElementById("toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 2000);
  }

  // ============================================================
  // 🚪 ログアウト
  // ============================================================
  window.logout = function () {
    if (confirm("ログアウトしますか？")) location.href = "/logout";
  };
});
