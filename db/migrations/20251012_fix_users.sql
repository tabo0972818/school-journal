BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS users_new (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('student','teacher','admin')),
  grade TEXT NOT NULL,
  class_name TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);

INSERT INTO users_new (id,name,role,grade,class_name,created_at)
SELECT 
  id,
  COALESCE(name, id),
  role,
  COALESCE(grade, '1年'),
  COALESCE(class_name, 'A'),
  COALESCE(created_at, datetime('now','localtime'))
FROM users;

DROP TABLE users;
ALTER TABLE users_new RENAME TO users;

CREATE TABLE IF NOT EXISTS entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id TEXT NOT NULL,
  yyyymmdd TEXT NOT NULL,
  condition TEXT NOT NULL,
  mental TEXT NOT NULL,
  reflection TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted',
  read_by TEXT,
  read_at TEXT,
  created_at TEXT DEFAULT (datetime('now','localtime')),
  UNIQUE(student_id, yyyymmdd)
);

CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  target_id TEXT,
  meta TEXT,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE INDEX IF NOT EXISTS idx_entries_student_day ON entries(student_id, yyyymmdd);
CREATE INDEX IF NOT EXISTS idx_users_role_class ON users(role, grade, class_name);

COMMIT;
