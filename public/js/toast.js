// public/js/toast.js
/**
 * toast.js
 * 📢 シンプルなトースト通知ユーティリティ
 * 使用例:
 * showToast("✅ 提出が完了しました", "success");
 * showToast("❌ エラーが発生しました", "error");
 */

export function showToast(message, type = "success", duration = 3000) {
  // 既にtoastが存在する場合は削除
  let existing = document.getElementById("toast");
  if (existing) existing.remove();

  // トースト要素を生成
  const toast = document.createElement("div");
  toast.id = "toast";
  toast.className = `toast ${type}`;
  toast.textContent = message;

  // CSSを追加
  toast.style.position = "fixed";
  toast.style.top = "20px";
  toast.style.right = "20px";
  toast.style.padding = "12px 18px";
  toast.style.color = "#fff";
  toast.style.borderRadius = "8px";
  toast.style.fontSize = "15px";
  toast.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
  toast.style.zIndex = "1000";
  toast.style.opacity = "0";
  toast.style.transition = "opacity 0.3s, transform 0.3s";
  toast.style.transform = "translateY(-20px)";

  // 種類別カラー
  if (type === "success") toast.style.background = "#007a33";
  if (type === "error") toast.style.background = "#c40000";
  if (type === "info") toast.style.background = "#0078d4";

  // bodyに追加
  document.body.appendChild(toast);

  // 表示アニメーション
  setTimeout(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";
  }, 50);

  // 指定時間後にフェードアウト
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-20px)";
    setTimeout(() => toast.remove(), 400);
  }, duration);
}
