import express from "express";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "path";
import { fileURLToPath } from "url";
import { requireAdmin } from "./_authz.js";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, "../db/data.db");

// =======================
// 🔹 DB接続ヘルパー
// =======================
async function getDb() {
  return open({ filename: dbPath, driver: sqlite3.Database });
}

// =======================
// 🔹 ログ追加ヘルパー
// =======================
async function addLog(user, action) {
  const db = await getDb();
  const time = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
  await db.run(`INSERT INTO logs (user, action, time) VALUES (?, ?, ?)`, [user, action, time]);
  await db.close();
}

// =======================
// 🧑‍💼 管理者ダッシュボード
// =======================
router.get("/", requireAdmin, async (req, res) => {
  try {
    const db = await getDb();

    // 👥 ユーザー一覧
    const users = await db.all(`SELECT * FROM users ORDER BY grade, class_name, role, id`);

    // 📝 提出データ（dateカラム使用）
    const entries = await db.all(`SELECT * FROM entries ORDER BY date DESC`);

    // 🕓 ログ
    const logs = await db.all(`SELECT * FROM logs ORDER BY time DESC LIMIT 100`);

    // 📊 集計
    const totalEntries = entries.length;
    const unreadCount = entries.filter(e => e.status === "未読").length;
    const readCount = entries.filter(e => e.status === "read" || e.status === "既読").length;
    const valid = entries.filter(e => e.condition && e.mental);
    const avgCondition = valid.length ? valid.reduce((s, e) => s + Number(e.condition), 0) / valid.length : 0;
    const avgMental = valid.length ? valid.reduce((s, e) => s + Number(e.mental), 0) / valid.length : 0;

    await db.close();

    res.render("admin_dashboard", {
      title: "管理者ダッシュボード",
      users,
      entries,
      logs,
      totalEntries,
      unreadCount,
      readCount,
      avgCondition: avgCondition.toFixed(2),
      avgMental: avgMental.toFixed(2)
    });
  } catch (err) {
    console.error("⚠️ 管理者ページエラー:", err);
    res.status(500).render("error", {
      title: "エラー",
      message: "データ取得エラー",
      error: err
    });
  }
});

// =======================
// 👥 ユーザー追加・更新
// =======================
router.post("/addUser", requireAdmin, async (req, res) => {
  const { id, name, role, password, grade, class_name } = req.body;

  try {
    const db = await getDb();
    const existing = await db.get("SELECT * FROM users WHERE id = ?", [id]);

    if (existing) {
      await db.run(
        "UPDATE users SET name=?, role=?, password=?, grade=?, class_name=? WHERE id=?",
        [name, role, password, grade, class_name, id]
      );
      await addLog(req.session.user.name, `ユーザー更新: ${id}`);
    } else {
      await db.run(
        "INSERT INTO users (id, name, role, password, grade, class_name) VALUES (?, ?, ?, ?, ?, ?)",
        [id, name, role, password, grade, class_name]
      );
      await addLog(req.session.user.name, `ユーザー追加: ${id}`);
    }

    await db.close();
    res.redirect("/admin");
  } catch (err) {
    console.error("⚠️ ユーザー追加エラー:", err);
    res.status(500).render("error", { title: "エラー", message: "ユーザー追加失敗", error: err });
  }
});

// =======================
// 🗑️ ユーザー削除
// =======================
router.post("/deleteUser/:id", requireAdmin, async (req, res) => {
  const userId = req.params.id;
  try {
    const db = await getDb();
    await db.run("DELETE FROM users WHERE id = ?", [userId]);
    await addLog(req.session.user.name, `ユーザー削除: ${userId}`);
    await db.close();
    res.redirect("/admin");
  } catch (err) {
    console.error("⚠️ ユーザー削除エラー:", err);
    res.status(500).render("error", { title: "エラー", message: "ユーザー削除失敗", error: err });
  }
});

// =======================
// ♻️ 提出データ初期化
// =======================
router.post("/reset", requireAdmin, async (req, res) => {
  try {
    const db = await getDb();
    await db.run(`DELETE FROM entries`);
    await addLog(req.session.user.name, "提出データ初期化");
    await db.close();
    res.redirect("/admin");
  } catch (err) {
    console.error("⚠️ 初期化エラー:", err);
    res.status(500).render("error", { title: "エラー", message: "初期化失敗", error: err });
  }
});

// =======================
// 🧹 ログ全削除
// =======================
router.post("/logs/clear", requireAdmin, async (req, res) => {
  try {
    const db = await getDb();
    await db.run(`DELETE FROM logs`);
    await addLog(req.session.user.name, "操作ログ全削除");
    await db.close();
    res.redirect("/admin");
  } catch (err) {
    console.error("⚠️ ログ削除エラー:", err);
    res.status(500).render("error", { title: "エラー", message: "ログ削除失敗", error: err });
  }
});

export default router;
