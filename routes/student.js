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

// =========================================
// 🧑‍🎓 生徒ダッシュボード表示
// =========================================
router.get("/", async (req, res) => {
  try {
    const student = req.session?.user;
    if (!student) return res.redirect("/login");

    const db = await getDb();
    const entries = await db.all(
      `SELECT id, date, condition, mental, reflection,
              COALESCE(is_read, 0) AS is_read,
              COALESCE(teacher_comment, '') AS teacher_comment
       FROM records
       WHERE student_id = ?
       ORDER BY date DESC`,
      [student.id]
    );

    const chartData = await db.all(
      "SELECT date, condition, mental FROM records WHERE student_id = ? ORDER BY date ASC",
      [student.id]
    );

    // 今日の提出があるか確認して、フォーム制御
    const today = new Date().toISOString().split("T")[0];
    const submittedToday = await db.get(
      "SELECT id FROM records WHERE student_id = ? AND date = ?",
      [student.id, today]
    );

    await db.close();

    res.render("student_dashboard", {
      title: "生徒ページ",
      studentName: student.name,
      entries,
      chartData,
      alreadySubmitted: !!submittedToday,
      alertMessage: req.query.alert || "",
    });
  } catch (err) {
    console.error("❌ student_dashboard エラー:", err);
    res.status(500).render("error", {
      title: "エラー",
      message: "生徒ページの読み込みに失敗しました。",
      error: err,
    });
  }
});

// =========================================
// 📝 提出処理（1日1回制限）
// =========================================
router.post("/submit", async (req, res) => {
  try {
    const { condition, mental, reflection } = req.body;
    const student = req.session?.user;
    if (!student) return res.status(401).send("ログインが必要です。");

    const db = await getDb();
    const today = new Date().toISOString().split("T")[0];

    // 🔹 すでに今日の提出があるか確認
    const existing = await db.get(
      "SELECT id FROM records WHERE student_id = ? AND date = ? LIMIT 1",
      [student.id, today]
    );

    if (existing) {
      await db.close();
      return res.redirect("/student?alert=" + encodeURIComponent("本日はすでに提出済みです。"));
    }

    // 🔹 新規提出
    await db.run(
      `INSERT INTO records (student_id, date, condition, mental, reflection, is_read)
       VALUES (?, ?, ?, ?, ?, 0)`,
      [student.id, today, condition, mental, reflection]
    );

    await db.close();
    res.redirect("/student?alert=" + encodeURIComponent("提出が完了しました。"));
  } catch (err) {
    console.error("❌ 提出エラー:", err);
    res.status(500).send("サーバーエラー");
  }
});

export default router;
