// ============================================================
// 📘 dashboard_admin.js  完全版
// - PDF/CSV出力（iOS Safari対応）
// - ユーザー絞り込み検索
// - ログフィルター（日付・種別・名前）
// - Chart.jsグラフ（提出件数／平均体調・メンタル）
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ dashboard_admin.js loaded");

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  // ===============================
  // 🚪 ログアウト
  // ===============================
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      if (confirm("ログアウトしますか？")) location.href = "/logout";
    });
  }

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
    const g = filterGrade.value.trim();
    const c = filterClass.value.trim();
    const r = filterRole.value.trim();
    const k = filterKeyword.value.trim().toLowerCase();

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
      filterGrade.value = "";
      filterClass.value = "";
      filterRole.value = "";
      filterKeyword.value = "";
      applyUserFilters();
    });
  }
  applyUserFilters();

  // ===============================
  // 🧾 ログ絞り込み
  // ===============================
  const logFilterUser = document.getElementById("logFilterUser");
  const logFilterAction = document.getElementById("logFilterAction");
  const logFilterDateFrom = document.getElementById("logFilterDateFrom");
  const logFilterDateTo = document.getElementById("logFilterDateTo");
  const logsClearBtn = document.getElementById("logsClearBtn");
  const logTbody = document.getElementById("logTbody");

  function applyLogFilters() {
    if (!logTbody) return;
    const u = logFilterUser.value.trim().toLowerCase();
    const a = logFilterAction.value.trim().toLowerCase();
    const dFrom = logFilterDateFrom.value;
    const dTo = logFilterDateTo.value;
    const fromTs = dFrom ? new Date(dFrom + "T00:00:00").getTime() : null;
    const toTs = dTo ? new Date(dTo + "T23:59:59").getTime() : null;

    [...logTbody.querySelectorAll("tr")].forEach((tr) => {
      const tu = (tr.dataset.user || "").toLowerCase();
      const ta = (tr.dataset.action || "").toLowerCase();
      const tt = tr.dataset.time || "";
      const tTs = tt ? new Date(tt).getTime() : null;

      const okU = !u || tu.includes(u);
      const okA = !a || ta.includes(a);
      let okD = true;
      if (fromTs && (tTs === null || tTs < fromTs)) okD = false;
      if (toTs && (tTs === null || tTs > toTs)) okD = false;

      tr.style.display = okU && okA && okD ? "" : "none";
    });
  }

  [logFilterUser, logFilterAction, logFilterDateFrom, logFilterDateTo].forEach((el) => {
    if (el) el.addEventListener("input", applyLogFilters);
  });
  if (logsClearBtn) {
    logsClearBtn.addEventListener("click", () => {
      logFilterUser.value = "";
      logFilterAction.value = "";
      logFilterDateFrom.value = "";
      logFilterDateTo.value = "";
      applyLogFilters();
    });
  }
  applyLogFilters();

  // ===============================
  // 📄 CSV出力（iOS対応）
  // ===============================
  function exportToCSV(tableId, filename) {
    const table = document.getElementById(tableId);
    if (!table) return alert("対象が見つかりません");
    const rows = [...table.querySelectorAll("tr")];
    const csv = rows
      .map((r) =>
        [...r.children]
          .slice(0, -1) // 最後の操作列除外
          .map((c) =>
            `"${(c.innerText || "")
              .replace(/\r?\n/g, " ")
              .replace(/"/g, '""')}"`
          )
          .join(",")
      )
      .join("\r\n");
    const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
    const blob = new Blob([bom, csv], { type: "text/csv;charset=utf-8;" });
    if (isIOS) {
      const reader = new FileReader();
      reader.onload = (e) => window.open(e.target.result, "_blank");
      reader.readAsDataURL(blob);
    } else {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename + ".csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }

// ===== PDF出力（iOS対応版） =====
function exportToPDF(elementId, filename) {
  const element = document.getElementById(elementId);
  if (!element) return alert("対象が見つかりません");

  // Safari(iOS)対策：レンダリングが完了するまで少し待機
  const userAgent = window.navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(userAgent);

  // 最後の「操作」列を一時的に非表示
  const actionCols = element.querySelectorAll("th:last-child, td:last-child");
  actionCols.forEach(el => (el.style.display = "none"));

  const generate = () => {
    const opt = {
      margin: [10, 10, 10, 10],
      filename: filename + ".pdf",
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        scrollY: 0, // iOSでのずれ防止
      },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["avoid-all", "css", "legacy"] },
    };

    html2pdf()
      .set(opt)
      .from(element)
      .save()
      .then(() => {
        actionCols.forEach(el => (el.style.display = ""));
      })
      .catch(() => {
        actionCols.forEach(el => (el.style.display = ""));
      });
  };

  // iOSは描画が遅いので0.8秒遅らせてから実行
  if (isIOS) {
    console.log("📱 iOS Safari検出: PDF生成を遅延します…");
    setTimeout(generate, 800);
  } else {
    generate();
  }
}

  // ===============================
  // 🧾 ボタンイベント登録
  // ===============================
  const usersPdfBtn = document.getElementById("usersPdfBtn");
  const usersCsvBtn = document.getElementById("usersCsvBtn");
  const logsPdfBtn = document.getElementById("logsPdfBtn");
  const logsCsvBtn = document.getElementById("logsCsvBtn");

  if (usersPdfBtn)
    usersPdfBtn.addEventListener("click", () =>
      exportToPDF("userTableArea", "users_list")
    );
  if (usersCsvBtn)
    usersCsvBtn.addEventListener("click", () =>
      exportToCSV("userTable", "users_list")
    );
  if (logsPdfBtn)
    logsPdfBtn.addEventListener("click", () =>
      exportToPDF("logTableArea", "operation_logs")
    );
  if (logsCsvBtn)
    logsCsvBtn.addEventListener("click", () =>
      exportToCSV("logTable", "operation_logs")
    );

  // ===============================
  // 📊 Chart.js グラフ生成
  // ===============================
  const entries = window.__ENTRIES__ || [];
  const byDate = {};

  function toYMD(d) {
    const date = new Date(d);
    if (isNaN(date)) return "";
    return date.toISOString().split("T")[0];
  }

  entries.forEach((e) => {
    const d = toYMD(e.date);
    if (!d) return;
    if (!byDate[d]) byDate[d] = { count: 0, sumC: 0, sumM: 0, n: 0 };
    byDate[d].count++;
    const c = Number(e.condition);
    const m = Number(e.mental);
    if (!isNaN(c) && !isNaN(m)) {
      byDate[d].sumC += c;
      byDate[d].sumM += m;
      byDate[d].n++;
    }
  });

  const labels = Object.keys(byDate).sort();
  const counts = labels.map((d) => byDate[d].count);
  const avgC = labels.map((d) =>
    byDate[d].n ? +(byDate[d].sumC / byDate[d].n).toFixed(2) : 0
  );
  const avgM = labels.map((d) =>
    byDate[d].n ? +(byDate[d].sumM / byDate[d].n).toFixed(2) : 0
  );

  const subChart = document.getElementById("submissionsChart");
  const avgChart = document.getElementById("avgChart");

  if (subChart) {
    new Chart(subChart, {
      type: "bar",
      data: {
        labels,
        datasets: [{ label: "提出件数", data: counts, backgroundColor: "#0078d4" }],
      },
      options: {
        responsive: true,
        scales: { y: { beginAtZero: true } },
        plugins: { legend: { display: false } },
      },
    });
  }

  if (avgChart) {
    new Chart(avgChart, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "平均 体調",
            data: avgC,
            borderColor: "#0078d4",
            tension: 0.3,
          },
          {
            label: "平均 メンタル",
            data: avgM,
            borderColor: "#ff6b6b",
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        scales: { y: { min: 0, max: 5 } },
      },
    });
  }

  console.log("✅ dashboard_admin ready");
});
