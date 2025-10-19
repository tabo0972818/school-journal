// routes/teacher.js
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

// ==============================
// 👨‍🏫 担任ダッシュボード表示
// ==============================
router.get("/", async (req, res) => {
  try {
    const db = await getDb();

    // 担任の情報取得
    const teacherId = req.query.user || req.session?.user?.id;
    const teacher = await db.get("SELECT * FROM users WHERE id = ?", [teacherId]);
    if (!teacher) {
      await db.close();
      return res.render("error", {
        title: "エラー",
        message: "担任情報が見つかりません。"
      });
    }

    const { grade, class_name: className } = teacher;
    const today = new Date().toISOString().split("T")[0];

    // 🔹 クラス全員の提出履歴
    const entries = await db.all(
      `SELECT e.*, u.name AS student_name
       FROM entries e
       JOIN users u ON e.student_id = u.id
       WHERE u.grade = ? AND u.class_name = ?
       ORDER BY e.date DESC, e.id DESC`,
      [grade, className]
    );

    // 🔹 クラス全員の生徒
    const allStudents = await db.all(
      `SELECT id, name FROM users 
        WHERE role='student' AND grade=? AND class_name=? 
        ORDER BY id ASC`,
      [grade, className]
    );

    // 🔹 今日提出済み
    const submittedToday = await db.all(
      `SELECT DISTINCT student_id FROM entries 
        WHERE grade=? AND class_name=? AND date=?`,
      [grade, className, today]
    );
    const submittedTodaySet = new Set(submittedToday.map(r => r.student_id));

    // 🔹 未提出者
    const unsubmitted = allStudents.filter(s => !submittedTodaySet.has(s.id));

    // 🔹 提出率
    const submissionRate = allStudents.length
      ? Math.round((submittedTodaySet.size / allStudents.length) * 100)
      : 0;

    // 🔹 平均体調・メンタル
    const avgCondition = entries.length
      ? (entries.reduce((a, b) => a + (Number(b.condition) || 0), 0) / entries.length).toFixed(1)
      : 0;
    const avgMental = entries.length
      ? (entries.reduce((a, b) => a + (Number(b.mental) || 0), 0) / entries.length).toFixed(1)
      : 0;

    // 🔹 日別体調・メンタル平均
    const trendData = await db.all(
      `SELECT date,
              ROUND(AVG(condition),1) AS avg_condition,
              ROUND(AVG(mental),1) AS avg_mental
         FROM entries
        WHERE grade=? AND class_name=?
        GROUP BY date
        ORDER BY date ASC`,
      [grade, className]
    );

    // 🔹 日別提出率（グラフ用）
    const rateTrend = await db.all(`
      SELECT date,
             COUNT(DISTINCT student_id) * 100.0 / (
               SELECT COUNT(*) FROM users 
                WHERE role='student' AND grade=? AND class_name=?
             ) AS rate
        FROM entries
       WHERE grade=? AND class_name=?
       GROUP BY date
       ORDER BY date ASC
    `, [grade, className, grade, className]);

    await db.close();

    // ✅ テンプレートにデータを渡す
    res.render("teacher_dashboard", {
      title: `${grade}${className} 担任ダッシュボード`,
      teacherName: teacher.name,
      grade,
      className,
      entries,
      unsubmitted,
      submissionRate,
      avgCondition,
      avgMental,
      trendLabels: trendData.map(t => t.date),
      trendCondition: trendData.map(t => t.avg_condition),
      trendMental: trendData.map(t => t.avg_mental),
      rateLabels: rateTrend.map(t => t.date),
      rateValues: rateTrend.map(t => t.rate)
    });
  } catch (err) {
    console.error("❌ teacher_dashboard 表示エラー:", err);
    res.status(500).render("error", {
      title: "サーバーエラー",
      message: "担任ダッシュボード表示中にエラーが発生しました。",
      error: err
    });
  }
});

// ==============================
// ✅ 既読＋🔥スタンプ処理
// ==============================
router.post("/readlike/:id", async (req, res) => {
  try {
    const db = await getDb();
    const entryId = req.params.id;
    const comment = req.body.comment || "";

    await db.run(
      "UPDATE entries SET is_read=1, teacher_comment=?, liked=1 WHERE id=?",
      [comment, entryId]
    );

    const timestamp = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
    await db.run(
      "INSERT INTO logs (action, target_id, detail, time) VALUES (?, ?, ?, ?)",
      ["既読＋🔥", entryId, comment, timestamp]
    );

    await db.close();
    res.json({ success: true });
  } catch (err) {
    console.error("❌ readlike エラー:", err);
    res.json({ success: false, error: err.message });
  }
});

// ==============================
// 📊 全データ取得（デバッグ用）
// ==============================
router.get("/records", async (req, res) => {
  try {
    const db = await getDb();
    const data = await db.all("SELECT * FROM entries ORDER BY date ASC");
    await db.close();
    res.json(data);
  } catch (err) {
    console.error("❌ records エラー:", err);
    res.status(500).json({ error: "データ取得失敗" });
  }
});

export default router;
