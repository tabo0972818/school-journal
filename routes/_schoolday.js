/**
 * _schoolday.js
 * 「前登校日」提出制限のための日付判定ロジック
 * Luxonを使用してJSTで算出
 */
import { DateTime } from "luxon";

/**
 * 📅 現在時刻(JST)から前登校日を取得
 * 土日を除外したい場合はここで調整可
 */
export function getPrevSchooldayJST(base = DateTime.now().setZone("Asia/Tokyo")) {
  let prev = base.minus({ days: 1 });
  // 例：土日をスキップしたい場合
  // while (prev.weekday === 6 || prev.weekday === 7) {
  //   prev = prev.minus({ days: 1 });
  // }
  return prev.toFormat("yyyy-LL-dd");
}

/**
 * 🛑 提出日が「前登校日」と一致しているかをチェック
 */
export function enforcePrevSchoolday(req, res, next) {
  try {
    const todayJST = DateTime.now().setZone("Asia/Tokyo");
    const prev = getPrevSchooldayJST(todayJST);
    const { yyyymmdd } = req.body;

    if (yyyymmdd !== prev) {
      return res
        .status(400)
        .render("error", {
          title: "提出日エラー",
          message: `提出できるのは ${prev} 分のみです。`,
          error: null
        });
    }

    next();
  } catch (err) {
    console.error("enforcePrevSchoolday error:", err);
    res
      .status(500)
      .render("error", {
        title: "サーバーエラー",
        message: "提出日チェック中にエラーが発生しました。",
        error: err
      });
  }
}
