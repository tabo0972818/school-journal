// ======================================
// 📘 School Journal System (ver.10)
// app.js（LAN / Render 両対応 完全版）
// ======================================

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import session from "express-session";
import admin from "firebase-admin";
import fs from "fs";
import os from "os";

// ルーター読み込み
import loginRouter from "./routes/login.js";
import logoutRouter from "./routes/logout.js";
import studentRouter from "./routes/student.js";
import teacherRouter from "./routes/teacher.js";
import adminRouter from "./routes/admin.js";

// --------------------------------------
// 📁 基本設定
// --------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 10000;

// --------------------------------------
// 🔥 Firebase Admin SDK 初期化
// --------------------------------------
const serviceAccountPath = path.join(__dirname, "serviceAccountKey.json");
if (fs.existsSync(serviceAccountPath)) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccountPath),
    });
    console.log("✅ Firebase Admin SDK 初期化完了");
  } catch (err) {
    console.error("⚠️ Firebase 初期化エラー:", err);
  }
} else {
  console.warn("⚠️ serviceAccountKey.json が見つかりません（Firebase機能スキップ）");
}

// --------------------------------------
// ⚙️ Express 設定
// --------------------------------------
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
  session({
    secret: "school-journal-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 2, // 2時間
    },
  })
);

// --------------------------------------
// 🚪 ルーティング設定
// --------------------------------------
app.use("/login", loginRouter);
app.use("/logout", logoutRouter);
app.use("/student", studentRouter);
app.use("/teacher", teacherRouter);
app.use("/admin", adminRouter);

// デフォルト（ルートアクセス時） → ログインページへ
app.get("/", (req, res) => res.redirect("/login"));

// --------------------------------------
// 🩺 ヘルスチェック
// --------------------------------------
app.get("/health", (req, res) => {
  res.send("✅ サーバーは正常に動作しています！（Render / Local 共通）");
});

// --------------------------------------
// ❌ エラーハンドリング
// --------------------------------------
app.use((req, res) => {
  res.status(404).render("error", {
    title: "404 Not Found",
    message: "ページが見つかりません。",
  });
});

app.use((err, req, res, next) => {
  console.error("❗ サーバーエラー:", err);
  res.status(500).render("error", {
    title: "サーバーエラー",
    message: "サーバー内部でエラーが発生しました。",
    error: err,
  });
});

// --------------------------------------
// 🚀 サーバー起動（LAN対応）
// --------------------------------------

// 🔍 LAN内IPアドレス自動取得
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name in interfaces) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "localhost";
}

const localIP = getLocalIP();

// ✅ LANデバイス（iPad含む）からアクセス可能
app.listen(PORT, "0.0.0.0", () => {
  console.log("=====================================");
  console.log(`✅ Firebase 管理: ${admin.apps.length > 0 ? "有効" : "未設定"}`);
  console.log(`🌐 Local Access (for iPad):  http://${localIP}:${PORT}/login`);
  console.log(`☁️ Render Access:            https://your-render-app-url.onrender.com`);
  console.log("=====================================");
});
