import express from "express";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "path";
import { fileURLToPath } from "url";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, "../db/data.db");

async function getDb() {
  return open({ filename: dbPath, driver: sqlite3.Database });
}

// =======================
// ログイン画面
// =======================
router.get("/", (req, res) => {
  if (req.session?.user) {
    const role = req.session.user.role;
    if (role === "admin") return res.redirect("/admin");
    if (role === "teacher") return res.redirect("/teacher");
    if (role === "student") return res.redirect(`/student?user=${req.session.user.id}`);
  }
  res.render("login", { title: "ログイン", error: null });
});

// =======================
// ログイン処理
// =======================
router.post("/", async (req, res) => {
  const { id, password } = req.body;
  console.log("🧩 受信 body:", req.body);

  try {
    const db = await getDb();
    const user = await db.get("SELECT * FROM users WHERE id = ? AND password = ?", [id, password]);
    await db.close();

    if (!user) {
      console.log("❌ ログイン失敗");
      return res.render("login", { title: "ログイン", error: "IDまたはパスワードが違います" });
    }

    console.log(`✅ ${user.role} ログイン成功`);

    req.session.regenerate((err) => {
      if (err) {
        console.error("⚠️ セッション再生成エラー:", err);
        return res.render("error", { title: "エラー", message: "セッションの生成に失敗しました。" });
      }

      req.session.user = {
        id: user.id,
        name: user.name,
        role: user.role?.toLowerCase(),
        grade: String(user.grade || "").replace("年", "").trim(),
        class_name: user.class || user.class_name || "",
      };

      console.log("💾 セッション設定:", req.session.user);

      if (user.role === "admin") return res.redirect("/admin");
      if (user.role === "teacher") return res.redirect(`/teacher?user=${user.id}`);
      if (user.role === "student") return res.redirect(`/student?user=${user.id}`);

      return res.render("error", { title: "エラー", message: "不明なユーザー種別です。" });
    });
  } catch (err) {
    console.error("⚠️ ログイン処理中エラー:", err);
    res.status(500).render("error", { title: "サーバーエラー", message: "ログインに失敗しました。", error: err });
  }
});

export default router;
