// routes/teacher.js
import express from "express";
import { getDb, logAction, getJSTTimestamp } from "../utils/log.js";

const router = express.Router();

// =======================
// 🕒 JST日付取得
// =======================
function getTodayJST() {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}

// ==============================
// 👨‍🏫 担任ダッシュボード
// ==============================
router.get("/", async (req, res) => {
  let db;
  try {
    db = await getDb();

    const teacherId = req.query.user || req.session?.user?.id;
    const teacher = await db.get("SELECT * FROM users WHERE id = ?", [teacherId]);
    if (!teacher) {
      return res.render("error", { title: "エラー", message: "担任情報が見つかりません。" });
    }

    const { grade, class_name: className } = teacher;
    const todayJST = getTodayJST();
    const todayUTC = new Date().toISOString().slice(0, 10);

    const entries = await db.all(
      `SELECT e.*, u.name AS student_name
       FROM entries e
       JOIN users u ON e.student_id = u.id
       WHERE u.grade = ? AND u.class_name = ?
       ORDER BY e.date DESC, e.id DESC`,
      [grade, className]
    );

    const allStudents = await db.all(
      "SELECT id, name FROM users WHERE role='student' AND grade=? AND class_name=?",
      [grade, className]
    );

    const submittedToday = await db.all(
      `SELECT DISTINCT e.student_id
       FROM entries e
       JOIN users u ON e.student_id = u.id
       WHERE u.grade=? AND u.class_name=? 
       AND (
         e.date LIKE ? OR e.date LIKE ? OR e.date LIKE ? || '%' OR e.date LIKE ? || '%'
       )`,
      [grade, className, todayJST, todayUTC, todayJST, todayUTC]
    );

    const submittedSet = new Set(submittedToday.map(r => String(r.student_id)));
    const unsubmitted = allStudents.filter(s => !submittedSet.has(String(s.id)));

    const submissionRate = allStudents.length
      ? Math.round((submittedSet.size / allStudents.length) * 100)
      : 0;

    const avgCondition = entries.length
      ? (entries.reduce((sum, e) => sum + (Number(e.condition) || 0), 0) / entries.length).toFixed(1)
      : 0;

    const avgMental = entries.length
      ? (entries.reduce((sum, e) => sum + (Number(e.mental) || 0), 0) / entries.length).toFixed(1)
      : 0;

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

    const rateTrend = await db.all(
      `SELECT date,
              ROUND(COUNT(DISTINCT student_id) * 100.0 /
                (SELECT COUNT(*) FROM users WHERE role='student' AND grade=? AND class_name=?),1) AS rate
       FROM entries
       WHERE grade=? AND class_name=?
       GROUP BY date
       ORDER BY date ASC`,
      [grade, className, grade, className]
    );

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
      rateValues: rateTrend.map(t => t.rate),
    });
  } catch (err) {
    console.error("❌ teacher_dashboard 表示エラー:", err);
    res.status(500).render("error", {
      title: "サーバーエラー",
      message: "担任ダッシュボード表示中にエラーが発生しました。",
      error: err,
    });
  } finally {
    if (db) await db.close();
  }
});

// ==============================
// ✅ 既読＋🔥＋コメント記録
// ==============================
router.post("/readlike/:id", async (req, res) => {
  let db;
  try {
    db = await getDb();
    const entryId = req.params.id;
    const comment = req.body.comment || "";
    const teacherId = req.session.user?.id || "unknown";

    await db.run(
      "UPDATE entries SET is_read=1, teacher_comment=?, liked=1 WHERE id=?",
      [comment, entryId]
    );

    await logAction(db, teacherId, "teacher", "既読＋🔥", entryId, `担任コメント: ${comment}`);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ readlike エラー:", err);
    res.json({ success: false, error: err.message });
  } finally {
    if (db) await db.close();
  }
});

// ==============================
// 📊 全データ取得（デバッグ）
// ==============================
router.get("/records", async (req, res) => {
  let db;
  try {
    db = await getDb();
    const data = await db.all("SELECT * FROM entries ORDER BY date ASC");
    res.json(data);
  } catch (err) {
    console.error("❌ records エラー:", err);
    res.status(500).json({ error: "データ取得失敗" });
  } finally {
    if (db) await db.close();
  }
});

export default router;
