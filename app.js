// ===============================
// 📦 必要モジュール読み込み
// ===============================
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import session from "express-session";
import admin from "firebase-admin";
import fs from "fs";

// ===============================
// 📂 ルーター読み込み
// ===============================
import loginRouter from "./routes/login.js";
import logoutRouter from "./routes/logout.js";
import studentRouter from "./routes/student.js";
import teacherRouter from "./routes/teacher.js";
import adminRouter from "./routes/admin.js";

// ===============================
// 📁 パス設定
// ===============================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

// Render対応：環境変数PORTを優先
const PORT = process.env.PORT || 3001;

// ===============================
// 🔥 Firebase 初期化
// ===============================
const serviceAccountPath = path.join(__dirname, "serviceAccountKey.json");
if (fs.existsSync(serviceAccountPath)) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccountPath),
    });
    console.log("✅ Firebase Admin SDK 初期化完了");
  } catch (err) {
    console.error("❌ Firebase 初期化エラー:", err);
  }
} else {
  console.warn("⚠️ serviceAccountKey.json が見つかりません（スキップ）");
}

// ===============================
// ⚙️ ミドルウェア設定
// ===============================
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ✅ 静的ファイル配信（CSS / 画像 / マニュアル / PDFなど）
app.use(express.static(path.join(__dirname, "public")));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ✅ セッション管理
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

// ✅ セッション確認ログ
app.use((req, res, next) => {
  if (req.session?.user) console.log("👤 セッション中:", req.session.user);
  next();
});

// ===============================
// 🚏 ルーティング
// ===============================
app.use("/login", loginRouter);
app.use("/logout", logoutRouter);
app.use("/student", studentRouter);
app.use("/teacher", teacherRouter);
app.use("/admin", adminRouter);

// ✅ ルートアクセス時のリダイレクト
app.get("/", (req, res) => res.redirect("/login"));

// ===============================
// 📤 マニュアル配布ルート（Word / PDF 両対応）
// ===============================
app.get("/manual", (req, res) => {
  const docxPath = path.join(__dirname, "public", "doc", "manual_final.docx");
  const pdfPath = path.join(__dirname, "public", "doc", "manual_final.pdf");

  let filePath = null;
  let fileName = null;

  if (fs.existsSync(pdfPath)) {
    filePath = pdfPath;
    fileName = "使い方マニュアル.pdf";
  } else if (fs.existsSync(docxPath)) {
    filePath = docxPath;
    fileName = "使い方マニュアル.docx";
  }

  if (filePath) {
    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error("📄 マニュアル送信エラー:", err);
        res.status(500).send("ファイルの送信に失敗しました。");
      }
    });
  } else {
    res.status(404).send("マニュアルファイルが見つかりません。");
  }
});

// ===============================
// 🧹 ログアウト（直接アクセスにも対応）
// ===============================
app.get("/logout", (req, res) => {
  if (req.session) {
    req.session.destroy(() => console.log("👋 セッション破棄完了"));
  }
  res.redirect("/login");
});

// ===============================
// 🩺 ヘルスチェック（Render用）
// ===============================
app.get("/health", (req, res) => {
  res.send("✅ サーバーは正常に動作しています！（Render公開版）");
});

// ===============================
// 🚀 サーバー起動
// ===============================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 http://localhost:${PORT}`);
});
