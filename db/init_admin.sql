DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS entries;
DROP TABLE IF EXISTS logs;

-- 👥 ユーザーテーブル（学年・クラス対応）
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT,
  role TEXT,
  password TEXT,
  grade TEXT,
  class_name TEXT
);

-- 📝 提出データテーブル
CREATE TABLE entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT,
  date TEXT,
  condition INTEGER,
  mental INTEGER,
  reflection TEXT,
  status TEXT
);

-- 🕓 操作ログ
CREATE TABLE logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  action TEXT,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);

-- 初期ユーザー
INSERT INTO users (id, name, role, password, grade, class_name) VALUES
('student', '生徒A', 'student', '1234', '1年', 'A'),
('teacher', '担任B', 'teacher', '1234', '1年', 'A'),
('admin', '管理者', 'admin', '1234', '', '');
