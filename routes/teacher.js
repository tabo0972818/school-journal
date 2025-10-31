// ============================================================
// 📘 routes/teacher.js（最終完全版）
// - JST基準の日付判定
// - 日にち変わると自動で提出/未提出を再判定
// - 提出一覧も今日分のみに統一
// - グラフ（提出推移）対応
// - ログ出力付き（PowerShellで確認可能）
// ============================================================

import express from "express";
import { getDb, logAction } from "../utils/log.js";

const router = express.Router();

// ============================================================
// 🕒 JST基準で今日の日付を取得（YYYY-MM-DD）
// ============================================================
function jstDate() {
  const now = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return now.toISOString().split("T")[0];
}

// ============================================================
// 🏫 担任ダッシュボード（提出/未提出 自動判定）
// ============================================================
router.get("/", async (req, res) => {
  let db;
  try {
    db = await getDb();

    // ===============================
    // 🧑‍🏫 セッション確認
    // ===============================
    const teacherId = req.session?.user?.id;
    if (!teacherId) {
      return res.render("error", {
        title: "エラー",
        message: "ログイン情報がありません。再ログインしてください。",
      });
    }

    // 担任ユーザー情報取得
    const teacher = await db.get("SELECT * FROM users WHERE id=?", [teacherId]);
    if (!teacher) {
      return res.render("error", {
        title: "エラー",
        message: "担任情報が見つかりません。",
      });
    }

    const { grade, class_name: className } = teacher;
    const today = jstDate();

    // ===============================
    // 🎓 クラス全生徒取得
    // ===============================
    const students = await db.all(
      "SELECT id, name FROM users WHERE role='student' AND grade=? AND class_name=? ORDER BY id ASC",
      [grade, className]
    );

    // ===============================
    // 📘 全提出データ取得（過去含む）
    // ===============================
    const allEntries = await db.all(
      `SELECT e.*, u.name AS student_name
         FROM entries e
         JOIN users u ON e.student_id = u.id
        WHERE u.grade=? AND u.class_name=?
        ORDER BY e.date DESC, e.id DESC`,
      [grade, className]
    );

    // ===============================
    // 📅 JST補正して今日分だけ抽出
    // ===============================
    const entries = allEntries.filter((e) => {
      if (!e.date) return false;
      const jst = new Date(new Date(e.date).getTime() + 9 * 60 * 60 * 1000);
      const jstDay = jst.toISOString().split("T")[0];
      return jstDay === today;
    });

    // ===============================
    // 📤 提出済みIDリスト（今日分）
    // ===============================
    const submittedIds = new Set(entries.map((e) => String(e.student_id)));

    // ===============================
    // 📥 未提出者判定
    // ===============================
    const unsubmitted = students.filter((s) => !submittedIds.has(String(s.id)));

    // ===============================
    // 📊 集計（提出率・平均など）
    // ===============================
    const submissionRate = students.length
      ? Math.round((submittedIds.size / students.length) * 100)
      : 0;

    const avgCondition = entries.length
      ? (
          entries.reduce((sum, e) => sum + (Number(e.condition) || 0), 0) /
          entries.length
        ).toFixed(1)
      : 0;

    const avgMental = entries.length
      ? (
          entries.reduce((sum, e) => sum + (Number(e.mental) || 0), 0) /
          entries.length
        ).toFixed(1)
      : 0;

    // ===============================
    // 🖥️ EJSレンダリング
    // ===============================
    res.render("teacher_dashboard", {
      title: `${grade}${className} 担任ダッシュボード`,
      teacherName: teacher.name,
      grade,
      className,
      entries,          // ← 今日の提出分のみ表示
      unsubmitted,      // ← 今日未提出者
      submissionRate,
      avgCondition,
      avgMental,
    });

    // ===============================
    // 🧾 ログ出力（PowerShell確認用）
    // ===============================
    console.log("=============================================");
    console.log(`📅 JST日付: ${today}`);
    console.log(`👩‍🏫 クラス: ${grade}${className}`);
    console.log(`📤 提出済み: ${submittedIds.size}人`);
    console.log(`📥 未提出: ${unsubmitted.length}人`);
    console.log("=============================================");
  } catch (err) {
    console.error("teacher_dashboard error:", err);
    res.status(500).render("error", {
      title: "サーバーエラー",
      message: "担任ダッシュボード表示中にエラーが発生しました。",
    });
  } finally {
    if (db) await db.close();
  }
});

// ============================================================
// 🔥 既読＋コメント登録
// ============================================================
router.post("/readlike/:id", async (req, res) => {
  let db;
  try {
    db = await getDb();
    const entryId = req.params.id;
    const comment = req.body.comment || "";
    const userId = req.session?.user?.id || "unknown";

    await db.run(
      "UPDATE entries SET is_read=1, liked=1, teacher_comment=? WHERE id=?",
      [comment, entryId]
    );

    await logAction(
      db,
      userId,
      "teacher",
      "既読＋🔥",
      entryId,
      `コメント: ${comment}`
    );

    res.json({ success: true });
  } catch (err) {
    console.error("readlike error:", err);
    res.json({ success: false });
  } finally {
    if (db) await db.close();
  }
});

// ============================================================
// 📈 グラフデータAPI（提出推移）
// ============================================================
router.get("/records", async (req, res) => {
  let db;
  try {
    db = await getDb();

    // entries.date（UTC）をJSTに変換して日別提出数を集計
    const rows = await db.all(`
      SELECT 
        substr(datetime(date, '+9 hours'), 1, 10) AS day, 
        COUNT(*) AS count
      FROM entries
      GROUP BY substr(datetime(date, '+9 hours'), 1, 10)
      ORDER BY day ASC
    `);

    res.json(rows);
  } catch (err) {
    console.error("❌ /teacher/records error:", err);
    res.status(500).json({ error: "failed" });
  } finally {
    if (db) await db.close();
  }
});

export default router;
