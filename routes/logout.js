import express from "express";
const router = express.Router();

// 🔹 ログアウト処理
router.get("/", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

export default router;

