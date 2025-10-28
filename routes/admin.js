import express from "express";
import fs from "fs";
import path from "path";
import pdf from "html-pdf-node"; // ← これを使ってPDF生成
import { getDb, logAction } from "../utils/log.js";
import { requireAdmin } from "./_authz.js";

const router = express.Router();

// =======================
// 🧑‍💼 管理者ダッシュボード
// =======================
router.get("/", requireAdmin, async (req, res) => {
  let db;
  try {
    db = await getDb();

    // 🔹 全データ取得
    const users = await db.all(`SELECT * FROM users ORDER BY grade, class_name, role, id`);
    const entries = await db.all(`SELECT * FROM entries ORDER BY date DESC`);
    const logs = await db.all(`SELECT * FROM logs ORDER BY time DESC LIMIT 100`);

    // 🔹 統計値
    const totalEntries = entries.length;
    const unreadCount = entries.filter(e => !e.is_read).length;
    const readCount = entries.filter(e => e.is_read).length;
    const valid = entries.filter(e => e.condition != null && e.mental != null);
    const avgCondition = valid.length ? valid.reduce((s, e) => s + Number(e.condition), 0) / valid.length : 0;
    const avgMental = valid.length ? valid.reduce((s, e) => s + Number(e.mental), 0) / valid.length : 0;

    res.render("admin_dashboard", {
      title: "管理者ダッシュボード",
      users,
      entries,
      logs,
      totalEntries,
      unreadCount,
      readCount,
      avgCondition: avgCondition.toFixed(2),
      avgMental: avgMental.toFixed(2),
    });
  } catch (err) {
    console.error("⚠️ 管理者ページエラー:", err);
    res.status(500).render("error", { title: "エラー", message: "データ取得エラー", error: err });
  } finally {
    if (db) await db.close();
  }
});

// =======================
// ➕ 追加 / 更新
// =======================
router.post("/addUser", requireAdmin, async (req, res) => {
  const { id, name, role, password, grade, class_name } = req.body;
  let db;
  try {
    db = await getDb();
    const existing = await db.get("SELECT * FROM users WHERE id = ?", [id]);

    if (existing) {
      await db.run(
        "UPDATE users SET name=?, role=?, password=?, grade=?, class_name=? WHERE id=?",
        [name, role, password, grade, class_name, id]
      );
      await logAction(db, req.session.user?.name || "admin", "admin", "ユーザー更新", id, `${name}`);
    } else {
      await db.run(
        "INSERT INTO users (id, name, role, password, grade, class_name) VALUES (?, ?, ?, ?, ?, ?)",
        [id, name, role, password, grade, class_name]
      );
      await logAction(db, req.session.user?.name || "admin", "admin", "ユーザー追加", id, `${name}`);
    }

    res.redirect("/admin");
  } catch (err) {
    console.error("⚠️ ユーザー追加/更新エラー:", err);
    res.status(500).render("error", { title: "エラー", message: "ユーザー追加/更新失敗", error: err });
  } finally {
    if (db) await db.close();
  }
});

// =======================
// 🗑️ 削除
// =======================
router.post("/deleteUser/:id", requireAdmin, async (req, res) => {
  const userId = req.params.id;
  let db;
  try {
    db = await getDb();
    await db.run("DELETE FROM users WHERE id = ?", [userId]);
    await logAction(db, req.session.user?.name || "admin", "admin", "ユーザー削除", userId);
    res.redirect("/admin");
  } catch (err) {
    console.error("⚠️ ユーザー削除エラー:", err);
    res.status(500).render("error", { title: "エラー", message: "ユーザー削除失敗", error: err });
  } finally {
    if (db) await db.close();
  }
});

// =======================
// 🧹 entries 初期化
// =======================
router.post("/reset", requireAdmin, async (req, res) => {
  let db;
  try {
    db = await getDb();
    await db.run(`DELETE FROM entries`);
    await logAction(db, req.session.user?.name || "admin", "admin", "提出データ初期化", "all");
    res.redirect("/admin");
  } catch (err) {
    console.error("⚠️ 初期化エラー:", err);
    res.status(500).render("error", { title: "エラー", message: "初期化失敗", error: err });
  } finally {
    if (db) await db.close();
  }
});

// =======================
// 🧹 logs 全削除
// =======================
router.post("/logs/clear", requireAdmin, async (req, res) => {
  let db;
  try {
    db = await getDb();
    await db.run(`DELETE FROM logs`);
    await logAction(db, req.session.user?.name || "admin", "admin", "操作ログ全削除");
    res.redirect("/admin");
  } catch (err) {
    console.error("⚠️ ログ削除エラー:", err);
    res.status(500).render("error", { title: "エラー", message: "ログ削除失敗", error: err });
  } finally {
    if (db) await db.close();
  }
});

// =======================
// 📄 PDF生成（サーバー側）
// =======================
router.post("/generate-pdf", requireAdmin, async (req, res) => {
  try {
    const { html, filename } = req.body;
    if (!html) {
      return res.status(400).json({ error: "HTMLデータがありません" });
    }

    const options = { format: "A4", printBackground: true };
    const file = { content: html };

    const pdfBuffer = await pdf.generatePdf(file, options);

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}.pdf"`,
    });
    res.send(pdfBuffer);
  } catch (error) {
    console.error("❌ PDF生成エラー:", error);
    res.status(500).json({ error: "PDF生成に失敗しました" });
  }
});

export default router;
