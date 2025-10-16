import express from "express";
import sqlite3 from "sqlite3";
import { open } from "sqlite";

const router = express.Router();

async function getDb() {
  return open({ filename: "./db/data.db", driver: sqlite3.Database });
}

// =====================================
// 👨‍🏫 担任ダッシュボード
// =====================================
router.get("/", async (req, res) => {
  try {
    const teacherId = req.query.user || req.session?.user?.id;
    if (!teacherId) return res.status(400).send("教師IDが指定されていません。");

    const db = await getDb();

    // 教師情報取得
    const teacher = await db.get("SELECT * FROM users WHERE id = ?", [teacherId]);
    if (!teacher) {
      await db.close();
      return res.status(404).send("教師が見つかりません。");
    }

    // クラスの生徒一覧
    const students = await db.all(
      "SELECT id, name FROM users WHERE role='student' AND grade=? AND class_name=?",
      [teacher.grade, teacher.class_name]
    );

    const studentIds = students.map(s => s.id);
    const today = new Date().toISOString().split("T")[0];
    let unsubmitted = [];

    if (studentIds.length > 0) {
      // 今日提出した生徒ID取得
      const submitted = await db.all(
        "SELECT DISTINCT student_id FROM records WHERE date = ?",
        [today]
      );
      const submittedIds = submitted.map(s => s.student_id);
      unsubmitted = students.filter(s => !submittedIds.includes(s.id));
    }

    // 提出履歴取得
    const entries = studentIds.length
      ? await db.all(
          `SELECT * FROM records WHERE student_id IN (${studentIds.map(() => "?").join(",")})
           ORDER BY date DESC`,
          studentIds
        )
      : [];

    // 平均値算出
    let avgCondition = 0;
    let avgMental = 0;
    if (entries.length > 0) {
      avgCondition =
        entries.reduce((sum, e) => sum + (Number(e.condition) || 0), 0) / entries.length;
      avgMental =
        entries.reduce((sum, e) => sum + (Number(e.mental) || 0), 0) / entries.length;
    }

    // 日別平均
    const grouped = {};
    entries.forEach(e => {
      const d = e.date;
      if (!grouped[d]) grouped[d] = { condition: [], mental: [] };
      grouped[d].condition.push(Number(e.condition || 0));
      grouped[d].mental.push(Number(e.mental || 0));
    });

    const trendLabels = Object.keys(grouped).sort();
    const trendCondition = trendLabels.map(
      d => grouped[d].condition.reduce((a, b) => a + b, 0) / grouped[d].condition.length
    );
    const trendMental = trendLabels.map(
      d => grouped[d].mental.reduce((a, b) => a + b, 0) / grouped[d].mental.length
    );

    // 提出率
    const submissionRate =
      students.length === 0
        ? 0
        : Math.round(((students.length - unsubmitted.length) / students.length) * 100);

    await db.close();

    // ✅ 必ず unsubmitted を定義して渡す！
    res.render("teacher_dashboard", {
      title: `${teacher.grade}${teacher.class_name}組 担任ダッシュボード`,
      teacherName: teacher.name,
      entries,
      unsubmitted, // ← ここがないと EJS で undefined
      avgCondition: avgCondition.toFixed(1),
      avgMental: avgMental.toFixed(1),
      trendLabels,
      trendCondition,
      trendMental,
      submissionRate,
      alertMessage: "",
    });
  } catch (err) {
    console.error("❌ 教師ダッシュボードエラー:", err);
    res.status(500).render("error", {
      title: "エラー",
      message: "ダッシュボードの読み込みに失敗しました。",
      error: err,
    });
  }
});

// =====================================
// ✅ 既読処理＋コメント登録
// =====================================
router.post("/read/:id", async (req, res) => {
  try {
    const db = await getDb();
    const { comment } = req.body || {};
    await db.run(
      "UPDATE records SET is_read = 1, teacher_comment = ? WHERE id = ?",
      [comment || "", req.params.id]
    );
    await db.close();
    res.redirect("back");
  } catch (err) {
    console.error("❌ 既読処理エラー:", err);
    res.status(500).send("既読処理に失敗しました。");
  }
});

export default router;
