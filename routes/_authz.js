/**
 * _authz.js
 * ログイン・権限チェック用ミドルウェア
 */

export function requireLogin(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.redirect("/login");
  }
  next();
}

/**
 * 特定のロール（student / teacher / admin）のみ許可する
 */
export function requireRole(role) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.redirect("/login");
    }
    if (req.session.user.role !== role) {
      return res
        .status(403)
        .render("error", {
          title: "権限エラー",
          message: `このページは${role}専用です。`,
          error: null
        });
    }
    next();
  };
}

/**
 * 管理者専用（上位互換）
 */
export function requireAdmin(req, res, next) {
  if (!req.session?.user || req.session.user.role !== "admin") {
    return res
      .status(403)
      .render("error", {
        title: "権限エラー",
        message: "管理者権限が必要です。",
        error: null
      });
  }
  next();
}
