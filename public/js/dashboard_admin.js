<<<<<<< HEAD
// ============================================================
// 📘 dashboard_admin.js（最終完全版 + フィルター修復）
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ dashboard_admin.js loaded");

  // ===============================
  // 🧾 ユーザー一覧フィルター
  // ===============================
  const filterGrade = document.getElementById("filterGrade");
  const filterClass = document.getElementById("filterClass");
  const filterRole = document.getElementById("filterRole");
  const filterKeyword = document.getElementById("filterKeyword");
  const usersClearBtn = document.getElementById("usersClearBtn");
  const userTbody = document.getElementById("userTbody");

  function applyUserFilters() {
    if (!userTbody) return;
    const g = filterGrade?.value.trim() || "";
    const c = filterClass?.value.trim() || "";
    const r = filterRole?.value.trim() || "";
    const k = filterKeyword?.value.trim().toLowerCase() || "";

    [...userTbody.querySelectorAll("tr")].forEach((tr) => {
      const tg = tr.dataset.grade || "";
      const tc = tr.dataset.class || tr.dataset.class_name || "";
      const trl = tr.dataset.role || "";
      const tid = (tr.dataset.id || "").toLowerCase();
      const tname = (tr.dataset.name || "").toLowerCase();

      const okG = !g || tg === g;
      const okC = !c || tc === c;
      const okR = !r || trl === r;
      const okK = !k || tid.includes(k) || tname.includes(k);

      tr.style.display = okG && okC && okR && okK ? "" : "none";
    });
  }

  [filterGrade, filterClass, filterRole, filterKeyword].forEach((el) => {
    if (el) el.addEventListener("input", applyUserFilters);
  });
  if (usersClearBtn) {
    usersClearBtn.addEventListener("click", () => {
      if (filterGrade) filterGrade.value = "";
      if (filterClass) filterClass.value = "";
      if (filterRole) filterRole.value = "";
      if (filterKeyword) filterKeyword.value = "";
      applyUserFilters();
    });
  }

  applyUserFilters();

  // ===============================
  // 📄 CSV出力（UTF-8 BOM付き・iOS対応）
  // ===============================
  function exportToCSV(areaId, filename) {
    const table = document.querySelector(`#${areaId} table`);
    if (!table) {
      alert("テーブルが見つかりません。");
      return;
    }

    let csvRows = [];
    const rows = table.querySelectorAll("tr");

    rows.forEach((row) => {
      const cols = row.querySelectorAll("th, td");
      let rowData = [];
      cols.forEach((cell, index) => {
        // ✅ 最後の列（削除ボタン）をスキップ
        if (index === cols.length - 1) return;
        let text = cell.innerText.replace(/"/g, '""');
        rowData.push(`"${text}"`);
      });
      csvRows.push(rowData.join(","));
    });

    // ✅ Excel・Safari対応：BOM付きUTF-8
    const csvContent = "\uFEFF" + csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // ===============================
  // 🧾 PDF出力（削除列を非表示）
  // ===============================
  async function exportToServerPDF(areaId, filename) {
    const area = document.getElementById(areaId);
    if (!area) {
      alert("対象が見つかりません。");
      return;
    }

    const html = `
      <html><head>
        <meta charset="UTF-8">
        <style>
          body{font-family:"Noto Sans JP",sans-serif;padding:20px;}
          h1{color:#0078d4;margin-bottom:10px;}
          table{width:100%;border-collapse:collapse;margin-top:10px;}
          th,td{border:1px solid #ccc;padding:8px;text-align:center;}
          th{background:#0078d4;color:#fff;}
          tr:nth-child(even){background:#f8f8f8;}
          /* ✅ PDF出力時に「削除」列を非表示 */
          th:nth-last-child(1), td:nth-last-child(1) {
            display: none;
          }
        </style>
      </head><body>
        <h1>${filename}</h1>
        ${area.outerHTML}
      </body></html>
    `;

    try {
      const response = await fetch("/admin/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html, filename }),
      });

      if (!response.ok) throw new Error("PDF生成エラー");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}.pdf`;
      a.target = "_blank";
      a.click();

      setTimeout(() => {
        alert('📄 PDFが生成されました。「ファイルに保存」で保存してください。');
      }, 300);

      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("❌ PDF生成失敗:", err);
      alert("PDF生成中にエラーが発生しました。");
    }
  }

  // ===============================
  // 🔘 ボタンイベント登録
  // ===============================
  const usersCsvBtn = document.getElementById("usersCsvBtn");
  const logsCsvBtn = document.getElementById("logsCsvBtn");
  const usersPdfBtn = document.getElementById("usersPdfBtn");
  const logsPdfBtn = document.getElementById("logsPdfBtn");

  if (usersCsvBtn)
    usersCsvBtn.addEventListener("click", () =>
      exportToCSV("userTableArea", "users_list")
    );

  if (logsCsvBtn)
    logsCsvBtn.addEventListener("click", () =>
      exportToCSV("logTableArea", "operation_logs")
    );

  if (usersPdfBtn)
    usersPdfBtn.addEventListener("click", () =>
      exportToServerPDF("userTableArea", "users_list")
    );

  if (logsPdfBtn)
    logsPdfBtn.addEventListener("click", () =>
      exportToServerPDF("logTableArea", "operation_logs")
    );

  // ===============================
  // 📊 Chart.js グラフ描画
  // ===============================
  const submissionsChartCtx = document.getElementById("submissionsChart");
  const avgChartCtx = document.getElementById("avgChart");
  const entries = window.__ENTRIES__ || [];

  const dateMap = {};
  entries.forEach((e) => {
    const date = e.date || e.submitted_at?.split("T")[0];
    if (!date) return;
    if (!dateMap[date]) {
      dateMap[date] = { count: 0, condSum: 0, mentSum: 0 };
    }
    dateMap[date].count++;
    dateMap[date].condSum += e.condition || 0;
    dateMap[date].mentSum += e.mental || 0;
  });

  const labels = Object.keys(dateMap).sort();
  const counts = labels.map((d) => dateMap[d].count);
  const avgCond = labels.map(
    (d) => (dateMap[d].condSum / dateMap[d].count).toFixed(2)
  );
  const avgMent = labels.map(
    (d) => (dateMap[d].mentSum / dateMap[d].count).toFixed(2)
  );

  if (submissionsChartCtx) {
    new Chart(submissionsChartCtx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "提出件数",
            data: counts,
            borderWidth: 1,
            backgroundColor: "#0078d4aa",
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
        },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 } },
        },
      },
    });
  }

  if (avgChartCtx) {
    new Chart(avgChartCtx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "平均体調",
            data: avgCond,
            borderColor: "#00b050",
            borderWidth: 2,
            tension: 0.3,
          },
          {
            label: "平均メンタル",
            data: avgMent,
            borderColor: "#ff6f00",
            borderWidth: 2,
            borderDash: [5, 5],
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: "bottom" },
        },
        scales: {
          y: { beginAtZero: true, max: 5 },
        },
      },
    });
  }

  console.log("✅ dashboard_admin.js ready");
});
=======
// public/js/dashboard_admin.js

(function () {
  // ===== ユーザー一覧 フィルター =====
  const $grade = document.getElementById("filterGrade");
  const $clazz = document.getElementById("filterClass");
  const $role  = document.getElementById("filterRole");
  const $kw    = document.getElementById("filterKeyword");
  const $userTbody = document.getElementById("userTbody");

  function filterUsers(){
    if(!$userTbody) return;
    const g = ($grade?.value || "").trim();
    const c = ($clazz?.value || "").trim();
    const r = ($role?.value  || "").trim();
    const k = ($kw?.value    || "").trim().toLowerCase();

    [...$userTbody.querySelectorAll("tr")].forEach(tr=>{
      const tg = (tr.dataset.grade || "");
      const tc = (tr.dataset.class || "");
      const trRole = (tr.dataset.role || "");
      const tid = (tr.dataset.id || "").toLowerCase();
      const tname = (tr.dataset.name || "").toLowerCase();

      let ok = true;
      if (g && tg !== g) ok = false;
      if (c && tc !== c) ok = false;
      if (r && trRole !== r) ok = false;
      if (k && !(tid.includes(k) || tname.includes(k))) ok = false;

      tr.style.display = ok ? "" : "none";
    });
  }

  if ($grade) $grade.addEventListener("change", filterUsers);
  if ($clazz) $clazz.addEventListener("change", filterUsers);
  if ($role)  $role.addEventListener("change", filterUsers);
  if ($kw)    $kw.addEventListener("input", filterUsers);

  window.clearUserFilters = function(){
    if ($grade) $grade.value = "";
    if ($clazz) $clazz.value = "";
    if ($role)  $role.value  = "";
    if ($kw)    $kw.value    = "";
    filterUsers();
  };

  // ===== 操作ログ フィルター =====
  const $logUser = document.getElementById("logFilterUser");
  const $logAction = document.getElementById("logFilterAction");
  const $logFrom = document.getElementById("logFilterDateFrom");
  const $logTo   = document.getElementById("logFilterDateTo");
  const $logTbody= document.getElementById("logTbody");

  function toDateOnly(str){
    if(!str) return null;
    const d = new Date(str);
    if (isNaN(d)) {
      const replaced = str.replaceAll(".", "/").replaceAll("-", "/");
      const dd = new Date(replaced);
      return isNaN(dd) ? null : new Date(dd.getFullYear(), dd.getMonth(), dd.getDate());
    }
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function filterLogs(){
    if(!$logTbody) return;
    const kwUser = ($logUser?.value || "").trim().toLowerCase();
    const kwAct  = ($logAction?.value || "").trim().toLowerCase();
    const from   = toDateOnly($logFrom?.value || "");
    const to     = toDateOnly($logTo?.value || "");

    [...$logTbody.querySelectorAll("tr")].forEach(tr=>{
      const u = (tr.dataset.user || "").toLowerCase();
      const a = (tr.dataset.action || "").toLowerCase();
      const tStr = tr.dataset.time || "";
      const t = toDateOnly(tStr);

      let ok = true;
      if (kwUser && !u.includes(kwUser)) ok = false;
      if (kwAct  && !a.includes(kwAct))  ok = false;
      if (from && t && (t < from)) ok = false;
      if (to && t && (t > to)) ok = false;

      tr.style.display = ok ? "" : "none";
    });
  }

  if ($logUser)   $logUser.addEventListener("input", filterLogs);
  if ($logAction) $logAction.addEventListener("input", filterLogs);
  if ($logFrom)   $logFrom.addEventListener("change", filterLogs);
  if ($logTo)     $logTo.addEventListener("change", filterLogs);

  window.clearLogFilters = function(){
    if ($logUser)   $logUser.value   = "";
    if ($logAction) $logAction.value = "";
    if ($logFrom)   $logFrom.value   = "";
    if ($logTo)     $logTo.value     = "";
    filterLogs();
  };

  // 初期適用
  filterUsers();
  filterLogs();
})();
>>>>>>> 3b21faffccbe69e730aa5d48f06bd53d7b891b37
