-- ===========================
-- 既存テーブル削除
-- ===========================
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS entries;
DROP TABLE IF EXISTS logs;

-- ===========================
-- ユーザーテーブル
-- ===========================
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT,
  role TEXT,
  password TEXT
);

-- ===========================
-- 提出データテーブル
-- ===========================
CREATE TABLE entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT,
  date TEXT,
  condition INTEGER,
  mental INTEGER,
  reflection TEXT,
  status TEXT
);

-- ===========================
-- 初期ユーザー
-- ===========================
INSERT INTO users (id, name, role, password) VALUES
('student', '生徒A', 'student', '1234'),
('teacher', '担任B', 'teacher', '1234'),
('admin', '管理者', 'admin', '1234');

-- ===========================
-- ログテーブル
-- ===========================
CREATE TABLE logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user TEXT NOT NULL,
  action TEXT NOT NULL,
  time TEXT NOT NULL
);
