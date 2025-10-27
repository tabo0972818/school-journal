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
