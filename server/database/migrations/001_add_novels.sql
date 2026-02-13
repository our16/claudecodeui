-- Novel Platform Database Migration
-- Adds tables for novel writing platform functionality
-- Run with: sqlite3 auth.db < server/database/migrations/001_add_novels.sql

PRAGMA foreign_keys = ON;

-- ===========================================================================
-- Novels table - 小说项目表
-- ===========================================================================
CREATE TABLE IF NOT EXISTS novels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    display_name TEXT,
    genre TEXT,
    description TEXT,
    project_path TEXT,
    settings TEXT,  -- JSON: {"targetDailyWordCount": 8000, ...}
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_novels_user_id ON novels(user_id);
CREATE INDEX IF NOT EXISTS idx_novels_active ON novels(is_active);

-- ===========================================================================
-- Chapters table - 章节表
-- ===========================================================================
CREATE TABLE IF NOT EXISTS chapters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    novel_id INTEGER NOT NULL,
    chapter_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    status TEXT DEFAULT 'pending',  -- pending, planning, writing, done, failed
    target_word_count INTEGER DEFAULT 3000,
    current_word_count INTEGER DEFAULT 0,
    outline TEXT,  -- 章节大纲
    content TEXT,  -- 章节正文内容
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_chapters_novel_id ON chapters(novel_id);
CREATE INDEX IF NOT EXISTS idx_chapters_status ON chapters(status);

-- ===========================================================================
-- State Files table - 状态文件表（角色、世界观等）
-- ===========================================================================
CREATE TABLE IF NOT EXISTS state_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    novel_id INTEGER NOT NULL,
    name TEXT NOT NULL,  -- e.g., 'characters.md', 'world_rules.md'
    type TEXT NOT NULL,  -- characters, timeline, world_rules, glossary, custom
    content TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE,
    UNIQUE(novel_id, name)
);

CREATE INDEX IF NOT EXISTS idx_state_files_novel_id ON state_files(novel_id);
CREATE INDEX IF NOT EXISTS idx_state_files_type ON state_files(type);

-- ===========================================================================
-- Chapter Messages table - 章节创作会话消息
-- ===========================================================================
CREATE TABLE IF NOT EXISTS chapter_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chapter_id INTEGER NOT NULL,
    role TEXT NOT NULL,  -- 'user' or 'assistant'
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_chapter_messages_chapter_id ON chapter_messages(chapter_id);
CREATE INDEX IF NOT EXISTS idx_chapter_messages_created_at ON chapter_messages(created_at);

-- ===========================================================================
-- Novel Runtime table - 小说运行时状态（游标等）
-- ===========================================================================
CREATE TABLE IF NOT EXISTS novel_runtime (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    novel_id INTEGER NOT NULL UNIQUE,
    cursor_state TEXT,  -- JSON: {"phase": "idle", "current_chapter": 5}
    session_id TEXT,  -- 当前活跃的 SDK 会话 ID
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_novel_runtime_novel_id ON novel_runtime(novel_id);

-- ===========================================================================
-- Triggers for automatic timestamp updates
-- ===========================================================================

-- Chapters updated_at trigger
CREATE TRIGGER IF NOT EXISTS update_chapters_timestamp
AFTER UPDATE ON chapters
BEGIN
    UPDATE chapters SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- State files updated_at trigger
CREATE TRIGGER IF NOT EXISTS update_state_files_timestamp
AFTER UPDATE ON state_files
BEGIN
    UPDATE state_files SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Novels updated_at trigger
CREATE TRIGGER IF NOT EXISTS update_novels_timestamp
AFTER UPDATE ON novels
BEGIN
    UPDATE novels SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- ===========================================================================
-- Default state files for new novels
-- ===========================================================================
-- This trigger creates default state files when a new novel is created
CREATE TRIGGER IF NOT EXISTS create_default_state_files
AFTER INSERT ON novels
BEGIN
    INSERT INTO state_files (novel_id, name, type, content)
    VALUES (
        NEW.id,
        'characters.md',
        'characters',
        '# 角色档案\n\n## 主角\n\n## 配角\n\n'
    );
    INSERT INTO state_files (novel_id, name, type, content)
    VALUES (
        NEW.id,
        'world_rules.md',
        'world_rules',
        '# 世界观设定\n\n## 力量体系\n\n## 地理环境\n\n'
    );
    INSERT INTO state_files (novel_id, name, type, content)
    VALUES (
        NEW.id,
        'timeline.md',
        'timeline',
        '# 时间线\n\n'
    );
END;

-- ===========================================================================
-- Progress Overview view - 章节进度统计视图
-- ===========================================================================
CREATE VIEW IF NOT EXISTS novel_progress_view AS
SELECT
    n.id as novel_id,
    n.name as novel_name,
    COUNT(c.id) as total_chapters,
    SUM(CASE WHEN c.status = 'done' THEN 1 ELSE 0 END) as completed_chapters,
    SUM(c.current_word_count) as total_word_count
FROM novels n
LEFT JOIN chapters c ON c.novel_id = n.id
WHERE n.is_active = 1
GROUP BY n.id;
