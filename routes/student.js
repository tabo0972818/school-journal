// routes/student.js
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

// =======================
// 🧑‍🎓 生徒ダッシュボード
// =======================
router.get("/", async (req, res) => {
  let db;
  try {
    db = await getDb();
    const studentId = req.query.user;
    const student = await db.get("SELECT * FROM users WHERE id = ?", [studentId]);
    if (!student) return res.render("error", { message: "生徒情報が見つかりません。" });

    const entries = await db.all(
      "SELECT * FROM entries WHERE student_id = ? ORDER BY date DESC",
      [studentId]
    );

    const chartData = entries.slice(0, 10).reverse().map((e) => ({
      date: e.date,
      condition: Number(e.condition) || 0,
      mental: Number(e.mental) || 0,
    }));

    res.render("student_dashboard", {
      title: "生徒ダッシュボード",
      student,
      entries,
      chartData,
      alertMessage: req.query.alert || "",
    });
  } catch (err) {
    console.error("⚠️ studentページエラー:", err);
    res.status(500).render("error", { message: "DBエラー", error: err });
  } finally {
    if (db) await db.close();
  }
});

// =======================
// 📝 提出・修正処理
// =======================
router.post("/", async (req, res) => {
  let db;
  try {
    db = await getDb();
    const { student_id, condition, mental, reflection, consultation } = req.body;
    const today = getTodayJST();

    const student = await db.get("SELECT * FROM users WHERE id = ?", [student_id]);
    if (!student) return res.redirect(`/student?user=${student_id}&alert=notfound`);

    const { class_name: className, grade } = student;

    const existing = await db.get(
      "SELECT * FROM entries WHERE student_id=? AND date=?",
      [student_id, today]
    );

    if (existing) {
      if (!existing.is_read) {
        await db.run(
          `UPDATE entries SET condition=?, mental=?, reflection=?, consultation=?,
           is_read=0, teacher_comment='', liked=0 WHERE id=?`,
          [condition, mental, reflection, consultation, existing.id]
        );

        await logAction(db, student_id, "student", "修正再提出", existing.id, "未既読状態で再提出");
        return res.redirect(`/student?user=${student_id}&alert=resubmit`);
      } else {
        return res.redirect(`/student?user=${student_id}&alert=locked`);
      }
    }

    await db.run(
      `INSERT INTO entries
         (student_id, grade, class_name, date, condition, mental, reflection, consultation, is_read)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [student_id, grade, className, today, condition, mental, reflection, consultation]
    );

    await logAction(db, student_id, "student", "提出", student_id, "初回提出");
    return res.redirect(`/student?user=${student_id}&alert=success`);
  } catch (err) {
    console.error("❌ student提出エラー:", err);
    res.redirect(`/student?user=${req.body.student_id}&alert=error`);
  } finally {
    if (db) await db.close();
  }
});

export default router;
