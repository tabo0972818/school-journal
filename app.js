import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import session from "express-session";
import admin from "firebase-admin";
import fs from "fs";

// ===============================
// 📁 ファイルパス設定（ESM対応）
// ===============================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===============================
// 🔥 Expressアプリ初期化
// ===============================
const app = express();

// ✅ RenderではPORTが自動設定されるのでこれでOK
const PORT = process.env.PORT || 3000;

// ===============================
// 🔥 Firebase 初期化（任意）
// ===============================
const serviceAccountPath = path.join(__dirname, "serviceAccountKey.json");
if (fs.existsSync(serviceAccountPath)) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountPath),
  });
  console.log("✅ Firebase Admin SDK 初期化完了");
} else {
  console.warn("⚠️ serviceAccountKey.json が見つかりません（スキップ）");
}

// ===============================
// ⚙️ ミドルウェア設定
// ===============================
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views")); // ✅ フォルダ名は「views」
app.use(express.static(path.join(__dirname, "public"))); // ✅ フォルダ名は「public」
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

// ===============================
// 🧩 ルーター読み込み
// ===============================
import loginRouter from "./routes/login.js";
import logoutRouter from "./routes/logout.js";
import studentRouter from "./routes/student.js";
import teacherRouter from "./routes/teacher.js";
import adminRouter from "./routes/admin.js";

// ===============================
// 🚏 ルーティング設定
// ===============================
app.use("/login", loginRouter);
app.use("/logout", logoutRouter);
app.use("/student", studentRouter);
app.use("/teacher", teacherRouter);
app.use("/admin", adminRouter);

// ✅ トップページはログインへリダイレクト
app.get("/", (req, res) => res.redirect("/login"));

// ✅ 健康チェック（Render用）
app.get("/health", (req, res) => {
  res.status(200).send("✅ Server is running properly on Render!");
});

// ✅ サーバー起動
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
