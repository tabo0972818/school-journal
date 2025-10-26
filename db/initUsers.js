import sqlite3 from "sqlite3";
import { open } from "sqlite";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, "data.db");

(async () => {
  try {
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath); // 再生成
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    const initSQL = fs.readFileSync(path.join(__dirname, "init.sql"), "utf-8");
    await db.exec(initSQL);
    console.log("✅ データベース初期化完了 (data.db)");
    await db.close();
  } catch (err) {
    console.error("⚠️ 初期化エラー:", err);
  }
})();
