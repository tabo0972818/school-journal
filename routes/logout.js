import express from "express";
const router = express.Router();

router.get("/", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("❌ セッション削除エラー:", err);
      return res.status(500).send("ログアウトに失敗しました");
    }
    res.clearCookie("connect.sid");
    res.redirect("/login");
  });
});

export default router;
