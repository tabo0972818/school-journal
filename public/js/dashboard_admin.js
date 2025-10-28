// ============================================================
// 📘 dashboard_admin.js  完全版（ver.10.5）
// - iOS Safari 白画面対策（html2canvas + jsPDF 軽量構成）
// - PDF出力時は「操作」列（ヘッダ含む）を自動で非表示
// - CSV出力（BOM付 / 操作列除外）
// - ユーザー一覧フィルター（学年/クラス/役割/キーワード）
// - ログフィルター（ユーザー/操作/日付範囲）
// - Chart.jsグラフ（提出件数 / 平均 体調・メンタル）
// - ログアウトボタン動作
// - null安全ガード付き（エラー停止防止）
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ dashboard_admin.js loaded");

  // -------------------------------
  // 🚪 ログアウト
  // -------------------------------
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      if (confirm("ログアウトしますか？")) location.href = "/logout";
    });
  }

  // =========================================================
  // 🧰 共通ユーティリティ
  // =========================================================
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  function toDateOnly(str) {
    if (!str) return null;
    const d1 = new Date(str);
    if (!isNaN(d1)) return new Date(d1.getFullYear(), d1.getMonth(), d1.getDate());
    const replaced = str.replaceAll(".", "/").replaceAll("-", "/");
    const d2 = new Date(replaced);
    if (!isNaN(d2)) return new Date(d2.getFullYear(), d2.getMonth(), d2.getDate());
    return null;
  }

  // =========================================================
  // 🔎 ユーザー一覧 フィルター
  // =========================================================
  const $grade = $("#filterGrade");
  const $clazz = $("#filterClass");
  const $role  = $("#filterRole");
  const $kw    = $("#filterKeyword");
  const $userTbody = $("#userTbody");

  function filterUsers() {
    if (!$userTbody) return;
    const g = ($grade?.value || "").trim();
    const c = ($clazz?.value || "").trim();
    const r = ($role?.value  || "").trim();
    const k = ($kw?.value    || "").trim().toLowerCase();

    $$("#userTbody tr").forEach(tr => {
      const tg = tr.dataset.grade || "";
      const tc = tr.dataset.class || "";
      const trRole = tr.dataset.role || "";
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
  $grade?.addEventListener("change", filterUsers);
  $clazz?.addEventListener("change", filterUsers);
  $role?.addEventListener("change", filterUsers);
  $kw?.addEventListener("input", filterUsers);
  $("#usersClearBtn")?.addEventListener("click", () => {
    if ($grade) $grade.value = "";
    if ($clazz) $clazz.value = "";
    if ($role)  $role.value  = "";
    if ($kw)    $kw.value    = "";
    filterUsers();
  });

  // =========================================================
  // 🧾 ログ フィルター
  // =========================================================
  const $logUser = $("#logFilterUser");
  const $logAction = $("#logFilterAction");
  const $logFrom = $("#logFilterDateFrom");
  const $logTo   = $("#logFilterDateTo");
  const $logTbody= $("#logTbody");

  function filterLogs() {
    if (!$logTbody) return;
    const kwUser = ($logUser?.value || "").trim().toLowerCase();
    const kwAct  = ($logAction?.value || "").trim().toLowerCase();
    const from   = toDateOnly($logFrom?.value || "");
    const to     = toDateOnly($logTo?.value || "");

    $$("#logTbody tr").forEach(tr => {
      const u = (tr.dataset.user || "").toLowerCase();
      const a = (tr.dataset.action || "").toLowerCase();
      const tStr = tr.dataset.time || "";
      const t = toDateOnly(tStr);

      let ok = true;
      if (kwUser && !u.includes(kwUser)) ok = false;
      if (kwAct  && !a.includes(kwAct))  ok = false;
      if (from && t && (t < from)) ok = false;
      if (to   && t && (t > to))   ok = false;

      tr.style.display = ok ? "" : "none";
    });
  }
  $logUser?.addEventListener("input", filterLogs);
  $logAction?.addEventListener("input", filterLogs);
  $logFrom?.addEventListener("change", filterLogs);
  $logTo?.addEventListener("change", filterLogs);
  $("#logsClearBtn")?.addEventListener("click", () => {
    if ($logUser)   $logUser.value = "";
    if ($logAction) $logAction.value = "";
    if ($logFrom)   $logFrom.value = "";
    if ($logTo)     $logTo.value = "";
    filterLogs();
  });

  // 初期適用
  filterUsers();
  filterLogs();

  // =========================================================
  // 🧮 CSV 出力（操作列を除外 / BOM付）
  // =========================================================
  function exportCSV(tableId, filename) {
    const table = document.getElementById(tableId);
    if (!table) return alert("表が見つかりません。");

    const rows = [...table.rows].map((r, idx) => {
      const cells = [...r.cells];
      // 「操作」見出しや「削除」ボタン列を除外
      const filtered = cells.filter((c, i) => {
        const header = table.tHead?.rows[0]?.cells[i];
        const isOpsHeader = header?.classList?.contains("ops") || /操作/.test(header?.innerText || "");
        const isOpsCell   = c.classList?.contains("ops");
        const isDeleteBtn = c.innerText.trim() === "削除" || c.querySelector("button.danger");
        return !(isOpsHeader || isOpsCell || isDeleteBtn);
      });
      return filtered.map(c => `"${(c.innerText || "").replaceAll('"','""')}"`).join(",");
    });

    const blob = new Blob(["\uFEFF" + rows.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  $("#usersCsvBtn")?.addEventListener("click", () => exportCSV("userTable", "users_list"));
  $("#logsCsvBtn")?.addEventListener("click", () => exportCSV("logTable", "logs_list"));

  // =========================================================
  // 🖨️ PDF 出力（html2canvas + jsPDF / iOS安定 / 操作列非表示）
  // =========================================================
  // ===============================
// 🖨️ PDF 出力（iOS Safari 白画面防止: 分割キャプチャ対応）
// ===============================
async function exportPDF(areaId, filename) {
  try {
    const area = document.getElementById(areaId);
    if (!area) return alert("出力エリアが見つかりません。");

    // Safariで高さが大きい場合 → 分割キャプチャ
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();

    // 一時的に操作列を隠す
    area.classList.add("hide-ops-col");

    // ---- iOS Safari用: 分割処理 ----
    if (isSafari && area.scrollHeight > 3500) {
      const totalHeight = area.scrollHeight;
      const viewportHeight = 1200; // キャプチャ1回あたりの高さ
      let position = 0;
      let pageIndex = 0;

      while (position < totalHeight) {
        // スクロール位置を変更して部分キャプチャ
        window.scrollTo(0, position);
        await new Promise(r => setTimeout(r, 200)); // レンダリング待機

        const canvas = await html2canvas(area, {
          scale: 1.5,
          useCORS: true,
          backgroundColor: "#ffffff",
          height: viewportHeight,
          y: position,
          windowHeight: viewportHeight
        });

        const imgData = canvas.toDataURL("image/jpeg", 0.95);
        const imgH = canvas.height * (pageW / canvas.width);

        if (pageIndex > 0) pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, 0, pageW, imgH);
        position += viewportHeight;
        pageIndex++;
      }
    } else {
      // ---- 通常ブラウザ用 ----
      const canvas = await html2canvas(area, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff"
      });
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const imgH = canvas.height * (pageW / canvas.width);
      let pos = 0;
      let heightLeft = imgH;

      pdf.addImage(imgData, "JPEG", 0, pos, pageW, imgH);
      heightLeft -= pageH;
      while (heightLeft > 0) {
        pos = heightLeft - imgH;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, pos, pageW, imgH);
        heightLeft -= pageH;
      }
    }

    pdf.save(`${filename}.pdf`);
  } catch (e) {
    console.error(e);
    alert("PDF出力に失敗しました（Safari制限やメモリ不足の可能性があります）");
  } finally {
    document.getElementById(areaId)?.classList.remove("hide-ops-col");
    window.scrollTo(0, 0);
  }
}

  $("#usersPdfBtn")?.addEventListener("click", () => exportPDF("userTableArea", "ユーザー一覧"));
  $("#logsPdfBtn")?.addEventListener("click", () => exportPDF("logTableArea", "操作ログ"));

  // =========================================================
  // 📈 グラフ描画
  // =========================================================
  try {
    const entries = Array.isArray(window.__ENTRIES__) ? window.__ENTRIES__ : [];
    // 件数集計
    const dailyCount = {};
    const dailyCondition = {};
    const dailyMental = {};
    const dailyNum = {};

    entries.forEach(e => {
      const d = e.date || e.created_at || e.time?.slice(0,10);
      if (!d) return;
      dailyCount[d] = (dailyCount[d] || 0) + 1;

      // 体調・メンタル平均（数値が入っていれば）
      const cond = Number(e.condition);
      const ment = Number(e.mental);
      if (!isNaN(cond) || !isNaN(ment)) {
        dailyNum[d] = (dailyNum[d] || 0) + 1;
        dailyCondition[d] = (dailyCondition[d] || 0) + (isNaN(cond) ? 0 : cond);
        dailyMental[d]    = (dailyMental[d]    || 0) + (isNaN(ment) ? 0 : ment);
      }
    });

    const labels = Object.keys(dailyCount).sort();
    const counts = labels.map(k => dailyCount[k]);

    const avgCond = labels.map(k => dailyNum[k] ? +(dailyCondition[k] / dailyNum[k]).toFixed(2) : 0);
    const avgMent = labels.map(k => dailyNum[k] ? +(dailyMental[k]    / dailyNum[k]).toFixed(2) : 0);

    const ctx1 = document.getElementById("submissionsChart");
    if (ctx1) {
      new Chart(ctx1, {
        type: "line",
        data: { labels, datasets: [{ label: "提出件数", data: counts, borderColor: "#0078d4", tension: .25 }] },
        options: { responsive: true, plugins: { legend: { display: true } } }
      });
    }
    const ctx2 = document.getElementById("avgChart");
    if (ctx2) {
      new Chart(ctx2, {
        type: "line",
        data: {
          labels,
          datasets: [
            { label: "平均 体調", data: avgCond, borderColor: "#2aa84a", tension: .25 },
            { label: "平均 メンタル", data: avgMent, borderColor: "#f39c12", tension: .25 }
          ]
        },
        options: { responsive: true, plugins: { legend: { display: true } } }
      });
    }
  } catch (err) {
    console.warn("グラフ描画をスキップ:", err);
  }

});
