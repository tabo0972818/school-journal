// ===== Chart.js グラフ（高さ固定・軽量化） =====
document.addEventListener("DOMContentLoaded", () => {
  const ctx = document.getElementById("statsChart");
  if (!ctx) return;

  // ✅ キャンバスサイズを固定（小さく軽量に）
  ctx.style.width = "100%";
  ctx.style.height = "180px";

  // 既存グラフがあれば破棄
  if (window.myChart) window.myChart.destroy();

  const rows = document.querySelectorAll("#entriesTable tbody tr");
  const labels = [];
  const cond = [];
  const ment = [];

  rows.forEach(r => {
    const cols = r.querySelectorAll("td");
    if (cols.length >= 4) {
      labels.push(cols[1].innerText);
      cond.push(Number(cols[2].innerText));
      ment.push(Number(cols[3].innerText));
    }
  });

  if (labels.length === 0) return;

  window.myChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "体調",
          data: cond,
          borderColor: "#0078d4",
          backgroundColor: "rgba(0,120,212,0.2)",
          fill: true,
          tension: 0.3,
          borderWidth: 2
        },
        {
          label: "メンタル",
          data: ment,
          borderColor: "#f28e2b",
          backgroundColor: "rgba(242,142,43,0.2)",
          fill: true,
          tension: 0.3,
          borderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false, // ✅ 軽量化
      scales: {
        y: { beginAtZero: true, max: 5, ticks: { stepSize: 1 } }
      },
      plugins: {
        legend: { position: "top" },
        title: { display: false }
      }
    }
  });
});

// ===== CSV出力 =====
window.exportTableToCSV = function (filename, tableId) {
  const rows = document.querySelectorAll(`#${tableId} tr`);
  let csv = "";
  rows.forEach(r => {
    const cols = r.querySelectorAll("td,th");
    const d = [...cols].map(c => `"${c.innerText}"`).join(",");
    csv += d + "\n";
  });
  const BOM = new Uint8Array([0xef, 0xbb, 0xbf]);
  const blob = new Blob([BOM, csv], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
};

// ===== PDF出力（出力日時付き） =====
window.exportPDF = async function (sectionId, filename) {
  const section = document.getElementById(sectionId);
  if (!section) return;

  const wrapper = document.createElement("div");
  const clone = section.cloneNode(true);
  clone.querySelectorAll(".pdf-ignore, .pdf-controls").forEach(el => el.remove());
  wrapper.appendChild(clone);

  const timestamp = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
  const timeEl = document.createElement("p");
  timeEl.style.textAlign = "right";
  timeEl.style.marginTop = "15px";
  timeEl.style.fontSize = "0.9em";
  timeEl.textContent = "出力日時：" + timestamp;
  wrapper.appendChild(timeEl);

  const opt = {
    margin: [15, 10, 20, 10],
    filename,
    image: { type: "jpeg", quality: 1 },
    html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    pagebreak: { mode: ["avoid-all", "css", "legacy"] },
  };
  await html2pdf().set(opt).from(wrapper).save();
};

// ===== ログアウト =====
window.logout = function () {
  if (confirm("ログアウトしますか？")) {
    sessionStorage.clear();
    location.href = "/logout";
  }
};
