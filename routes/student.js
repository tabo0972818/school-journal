// routes/student.js
import express from "express";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "path";
import { fileURLToPath } from "url";

const router = express.Router();

// =======================
// 📂 DB接続設定
// =======================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, "../db/data.db");

async function getDb() {
  return open({ filename: dbPath, driver: sqlite3.Database });
}

// =======================
// 🧑‍🎓 生徒ページ表示
// =======================
router.get("/", async (req, res) => {
  try {
    const db = await getDb();
    const studentId = req.query.user; // 例: /student?user=s3C10

    // 🧠 生徒情報取得
    const student = await db.get("SELECT * FROM users WHERE id = ?", [studentId]);
    if (!student) {
      await db.close();
      return res.render("error", { message: "生徒情報が見つかりません。" });
    }

    // 📋 提出履歴取得
    const entries = await db.all(
      "SELECT * FROM entries WHERE student_id = ? ORDER BY date DESC",
      [studentId]
    );

    // 📈 グラフ用データ（5段階スケール対応）
    const chartData = entries.slice(0, 10).reverse().map((e) => ({
      date: e.date,
      condition: Number(e.condition) || 0,
      mental: Number(e.mental) || 0,
    }));

    await db.close();

    // URLクエリからalertメッセージを取得
    const alertMessage = req.query.alert || "";

    res.render("student_dashboard", {
      title: "生徒ダッシュボード",
      student,
      entries,
      chartData,
      alertMessage,
    });
  } catch (err) {
    console.error("⚠️ 生徒ページエラー:", err);
    res.status(500).render("error", { message: "DBエラー", error: err });
  }
});

// =======================
// 📝 提出処理
// =======================
router.post("/", async (req, res) => {
  try {
    const db = await getDb();
    const { student_id, condition, mental, reflection, consultation } = req.body;
    const today = new Date().toISOString().split("T")[0];

    // 🧩 1日1回制限
    const existing = await db.get(
      "SELECT id FROM entries WHERE student_id = ? AND date = ?",
      [student_id, today]
    );

    if (existing) {
      await db.close();
      return res.redirect(`/student?user=${student_id}&alert=already`);
    }

    // 🎓 クラス名取得
    const student = await db.get("SELECT * FROM users WHERE id = ?", [student_id]);
    const className = student?.class_name || "";

    // 💾 データ登録（相談欄含む）
    await db.run(
      `INSERT INTO entries 
       (student_id, class_name, date, condition, mental, reflection, consultation, is_read)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
      [student_id, className, today, condition, mental, reflection, consultation]
    );

    await db.close();
    console.log(`✅ 提出完了: ${student_id}`);
    return res.redirect(`/student?user=${student_id}&alert=success`);
  } catch (err) {
    console.error("❌ 提出エラー:", err);
    return res.redirect(`/student?user=${req.body.student_id}&alert=error`);
  }
});

export default router;
