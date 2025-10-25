import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import session from "express-session";
import admin from "firebase-admin";
import fs from "fs";

// ====== ルーター読み込み ======
import loginRouter from "./routes/login.js";
import logoutRouter from "./routes/logout.js";
import studentRouter from "./routes/student.js";
import teacherRouter from "./routes/teacher.js";
import adminRouter from "./routes/admin.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3001;

// ===============================
// Firebase 初期化
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
// ミドルウェア設定
// ===============================
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

// セッション確認用ログ
app.use((req, res, next) => {
  if (req.session?.user) console.log("👤 セッション中:", req.session.user);
  next();
});

// ===============================
// ルーティング
// ===============================
app.use("/login", loginRouter);
app.use("/logout", logoutRouter);
app.use("/student", studentRouter);
app.use("/teacher", teacherRouter);
app.use("/admin", adminRouter);

// ルートアクセス時
app.get("/", (req, res) => res.redirect("/login"));

// ===============================
// ログアウト（直接アクセスにも対応）
// ===============================
app.get("/logout", (req, res) => {
  if (req.session) req.session.destroy(() => console.log("👋 セッション破棄完了"));
  res.redirect("/login");
});

// ===============================
// 動作確認
// ===============================
app.get("/health", (req, res) => {
  res.send("✅ サーバーは正常に動作しています！（Render公開版）");
});

app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
