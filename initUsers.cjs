const path = require("path");

// ✅ スペースや日本語パスでも確実に解決
const db = require(path.join(__dirname, "db", "firebase.cjs"));


async function addInitialUsers() {
  const users = [
    {
      name: "管理者 太郎",
      email: "admin@example.com",
      role: "admin",
      grade: "",
      class: "",
      createdAt: new Date(),
    },
    {
      name: "担任 花子",
      email: "teacher@example.com",
      role: "teacher",
      grade: "1年",
      class: "A",
      createdAt: new Date(),
    },
    {
      name: "生徒 次郎",
      email: "student@example.com",
      role: "student",
      grade: "1年",
      class: "A",
      createdAt: new Date(),
    },
  ];

  try {
    for (const user of users) {
      // 同じメールが存在するかチェック
      const snapshot = await db.collection("users").where("email", "==", user.email).get();
      if (!snapshot.empty) {
        console.log(`⚠️ 既に登録済み: ${user.email}`);
        continue;
      }

      await db.collection("users").add(user);
      console.log(`✅ 登録完了: ${user.name} (${user.role})`);
    }
    console.log("🎉 初期ユーザー登録が完了しました！");
    process.exit(0);
  } catch (err) {
    console.error("❌ Firestore登録エラー:", err);
    process.exit(1);
  }
}

addInitialUsers();
