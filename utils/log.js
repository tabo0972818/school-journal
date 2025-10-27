// utils/log.js
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, "../db/data.db");

// =======================
// 📂 DB接続設定
// =======================
export async function getDb() {
  return open({ filename: dbPath, driver: sqlite3.Database });
}

// =======================
// 🕒 JST時刻取得
// =======================
export function getJSTTimestamp() {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().replace("T", " ").slice(0, 19);
}

// =======================
// 🧾 共通ログ追加関数
// =======================
export async function logAction(db, user, role, action, target_id = "", detail = "") {
  const time = getJSTTimestamp();
  await db.run(
    `INSERT INTO logs (user, role, action, target_id, detail, time)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [user, role, action, target_id, detail, time]
  );
  console.log(`🪵 LOG: [${role}] ${user} - ${action} (${target_id})`);
}
