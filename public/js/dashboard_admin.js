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

  // ===== CSV出力（Excel互換 / 操作列除外） =====
  window.exportToCSV = function (tableId, filename) {
    const table = document.getElementById(tableId);
    if (!table) return alert("対象が見つかりません");
    const rows = [...table.querySelectorAll("tr")];
    const csv = rows.map(r => {
      const cells = [...r.children];
      const filtered = r.closest("table").id === "userTable"
        ? cells.slice(0, -1)
        : cells;
      return filtered.map(c => `"${(c.innerText || "").replace(/\r?\n/g, " ").replace(/"/g, '""')}"`).join(",");
    }).join("\r\n");
    const bom = new Uint8Array([0xEF,0xBB,0xBF]);
    const blob = new Blob([bom, csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename + ".csv";
    link.click();
  };

  // ===== PDF出力（真っ白防止完全対応版） =====
  window.exportToPDF = function (elementId, filename) {
    const element = document.getElementById(elementId);
    if (!element) return alert("対象が見つかりません");

    // スクロールをトップへ
    window.scrollTo(0, 0);

    // 操作列を非表示（削除ボタン列）
    const actionCols = element.querySelectorAll("th:last-child, td:last-child");
    actionCols.forEach(el => (el.style.display = "none"));

    // 背景白、文字黒、オーバーフロー解除
    element.style.backgroundColor = "#ffffff";
    element.style.color = "#000000";
    element.style.overflow = "visible";

    // レンダリング安定化待機（0.5秒）
    setTimeout(() => {
      const opt = {
        margin: [10, 10, 10, 10],
        filename: filename + ".pdf",
        image: { type: "jpeg", quality: 1 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          scrollX: 0,
          scrollY: 0,
          windowWidth: document.documentElement.offsetWidth,
          windowHeight: document.documentElement.scrollHeight
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] }
      };

      html2pdf()
        .set(opt)
        .from(element)
        .save()
        .then(() => {
          // 非表示列復元
          actionCols.forEach(el => (el.style.display = ""));
        })
        .catch(err => {
          console.error("PDF出力エラー:", err);
          alert("PDF出力中にエラーが発生しました。");
          actionCols.forEach(el => (el.style.display = ""));
        });
    }, 500);
  };

  // ===== ログアウト =====
  window.logout = function(){
    if (confirm("ログアウトしますか？")) location.href = "/logout";
  };

})();
