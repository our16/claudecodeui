-- Context Management Migration
-- Adds tables for chapter session isolation and context injection
-- Run with: sqlite3 auth.db < server/database/migrations/002_add_context_management.sql

PRAGMA foreign_keys = ON;

-- ===========================================================================
-- Chapter Sessions Table - 章节写作会话表（隔离机制）
-- ===========================================================================
-- 每个章节可以有多个写作会话，每个会话有独立的上下文
CREATE TABLE IF NOT EXISTS chapter_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chapter_id INTEGER NOT NULL,
    session_type TEXT DEFAULT 'writing',  -- 'writing', 'planning', 'review', 'discussion'
    context_snapshot TEXT,  -- JSON: 会话开始时的上下文快照（用于恢复/调试）
    status TEXT DEFAULT 'active',  -- 'active', 'closed', 'archived'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    closed_at DATETIME,
    FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_chapter_sessions_chapter_id ON chapter_sessions(chapter_id);
CREATE INDEX IF NOT EXISTS idx_chapter_sessions_status ON chapter_sessions(status);
CREATE INDEX IF NOT EXISTS idx_chapter_sessions_created_at ON chapter_sessions(created_at);

-- ===========================================================================
-- Context Config Table - 上下文注入配置
-- ===========================================================================
-- 每个小说项目可以有独立的上下文配置
CREATE TABLE IF NOT EXISTS context_config (
    novel_id INTEGER PRIMARY KEY,
    recent_chapters_count INTEGER DEFAULT 3,  -- 注入最近N章摘要
    include_plot_threads BOOLEAN DEFAULT 1,  -- 是否包含伏笔追踪
    include_milestones BOOLEAN DEFAULT 1,    -- 是否包含任务历程
    include_character_changes BOOLEAN DEFAULT 1,  -- 是否包含角色变化
    max_context_tokens INTEGER DEFAULT 8000, -- 最大上下文 token 数
    auto_summarize BOOLEAN DEFAULT 1,        -- 自动生成章节摘要
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
);

-- ===========================================================================
-- Chapter Summaries Table - 章节摘要缓存
-- ===========================================================================
-- 存储章节的结构化摘要，用于上下文注入
CREATE TABLE IF NOT EXISTS chapter_summaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chapter_id INTEGER NOT NULL UNIQUE,
    summary_text TEXT,           -- 章节摘要文本
    key_events TEXT,             -- JSON: 关键事件列表
    character_changes TEXT,      -- JSON: 角色变化
    plot_progress TEXT,          -- JSON: 情节进展
    word_count INTEGER DEFAULT 0,
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_chapter_summaries_chapter_id ON chapter_summaries(chapter_id);

-- ===========================================================================
-- Plot Threads Table - 伏笔/支线追踪
-- ===========================================================================
CREATE TABLE IF NOT EXISTS plot_threads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    novel_id INTEGER NOT NULL,
    name TEXT NOT NULL,          -- 伏笔/支线名称
    description TEXT,            -- 描述
    status TEXT DEFAULT 'active', -- 'active', 'resolved', 'abandoned'
    introduced_chapter INTEGER,  -- 引入的章节号
    resolved_chapter INTEGER,    -- 解决的章节号
    importance INTEGER DEFAULT 1, -- 重要性 1-5
    notes TEXT,                  -- 备注
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_plot_threads_novel_id ON plot_threads(novel_id);
CREATE INDEX IF NOT EXISTS idx_plot_threads_status ON plot_threads(status);

-- ===========================================================================
-- Milestones Table - 任务发展历程
-- ===========================================================================
CREATE TABLE IF NOT EXISTS milestones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    novel_id INTEGER NOT NULL,
    chapter_number INTEGER,      -- 关联章节（可选）
    title TEXT NOT NULL,         -- 里程碑标题
    description TEXT,            -- 描述
    milestone_type TEXT DEFAULT 'plot', -- 'plot', 'character', 'world', 'meta'
    importance INTEGER DEFAULT 1, -- 重要性 1-5
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_milestones_novel_id ON milestones(novel_id);
CREATE INDEX IF NOT EXISTS idx_milestones_chapter ON milestones(chapter_number);

-- ===========================================================================
-- Default context config trigger
-- ===========================================================================
CREATE TRIGGER IF NOT EXISTS create_default_context_config
AFTER INSERT ON novels
BEGIN
    INSERT INTO context_config (novel_id)
    VALUES (NEW.id);
END;

-- ===========================================================================
-- Update timestamp triggers
-- ===========================================================================
CREATE TRIGGER IF NOT EXISTS update_context_config_timestamp
AFTER UPDATE ON context_config
BEGIN
    UPDATE context_config SET updated_at = CURRENT_TIMESTAMP WHERE novel_id = NEW.novel_id;
END;

CREATE TRIGGER IF NOT EXISTS update_chapter_summaries_timestamp
AFTER UPDATE ON chapter_summaries
BEGIN
    UPDATE chapter_summaries SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_plot_threads_timestamp
AFTER UPDATE ON plot_threads
BEGIN
    UPDATE plot_threads SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
