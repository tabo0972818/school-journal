import admin from "firebase-admin";
import schedule from "node-schedule";
import sqlite3 from "sqlite3";
import { open } from "sqlite";

// Firebase初期化
admin.initializeApp({
  credential: admin.credential.cert("./serviceAccountKey.json")
});

// DB接続
async function getDb() {
  return open({ filename: "./db/data.db", driver: sqlite3.Database });
}

// 🔔 毎朝8:00に未提出者へ通知
schedule.scheduleJob("0 8 * * *", async () => {
  const db = await getDb();
  const today = new Date().toISOString().split("T")[0];
  const students = await db.all(`
    SELECT s.name, s.fcmToken FROM students s
    LEFT JOIN entries e ON s.id = e.student_id AND e.date = ?
    WHERE e.id IS NULL
  `, [today]);

  for (const student of students) {
    if (!student.fcmToken) continue;
    await admin.messaging().send({
      token: student.fcmToken,
      notification: {
        title: "提出リマインド",
        body: `${student.name}さん、今日の連絡帳を提出してください。`
      }
    });
  }
  console.log("✅ 提出リマインド通知送信完了");
});
