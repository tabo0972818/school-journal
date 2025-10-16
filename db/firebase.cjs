// db/firebase.cjs
/**
 * Firestore接続設定（CommonJS対応）
 * --------------------------------------------
 * - serviceAccountKey.json をプロジェクト直下に置く
 * - .gitignore に serviceAccountKey.json を追加済みであること
 */

const admin = require("firebase-admin");
const path = require("path");

// ✅ serviceAccountKey.json の絶対パスを指定（OneDriveなどの空白対策）
const serviceAccountPath = path.resolve(__dirname, "../serviceAccountKey.json");
console.log("🔑 Firebaseサービスキー:", serviceAccountPath);

// JSONファイルを読み込む
const serviceAccount = require(serviceAccountPath);

// Firebase初期化（重複防止）
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log("✅ Firebase Admin SDK 初期化完了");
}

const db = admin.firestore();

module.exports = db;
