/**
 * Context Service - 上下文管理服务
 *
 * 负责：
 * 1. 章节写作会话的上下文构建
 * 2. 长期记忆的加载和注入
 * 3. 最近章节摘要的生成
 * 4. 会话隔离管理
 */

import { promises as fs } from 'fs';
import path from 'path';
import { db } from '../database/db.js';

// ============================================================================
// 上下文类型定义
// ============================================================================

/**
 * @typedef {Object} ChapterContext
 * @property {Object} facts - 事实层（角色、世界观）
 * @property {Object} worldline - 世界线层（时间线、伏笔）
 * @property {Object} history - 任务历程
 * @property {Array} recentChapters - 最近章节摘要
 * @property {Object} currentChapter - 当前章节信息
 */

// ============================================================================
// 上下文服务类
// ============================================================================

export class ContextService {
  constructor() {
    this.db = db;
  }

  // =========================================================================
  // 公共 API
  // =========================================================================

  /**
   * 为章节写作构建完整上下文
   * @param {number} novelId - 小说ID
   * @param {number} chapterId - 章节ID
   * @returns {Promise<ChapterContext>}
   */
  async buildChapterContext(novelId, chapterId) {
    // 获取配置
    const config = await this.getContextConfig(novelId);

    // 获取小说信息
    const novel = await this.getNovel(novelId);
    if (!novel) {
      throw new Error(`Novel ${novelId} not found`);
    }

    // 获取章节信息
    const chapter = await this.getChapter(chapterId);
    if (!chapter) {
      throw new Error(`Chapter ${chapterId} not found`);
    }

    // 并行加载所有上下文层
    const [facts, worldline, history, recentChapters] = await Promise.all([
      this.loadFactsLayer(novelId, novel.project_path),
      this.loadWorldlineLayer(novelId, novel.project_path, config),
      this.loadHistoryLayer(novelId, config),
      this.loadRecentChaptersSummary(novelId, chapter.chapter_number, config)
    ]);

    return {
      facts,
      worldline,
      history,
      recentChapters,
      currentChapter: {
        number: chapter.chapter_number,
        title: chapter.title,
        status: chapter.status,
        targetWordCount: chapter.target_word_count,
        currentWordCount: chapter.current_word_count,
        outline: chapter.outline
      },
      config,
      builtAt: new Date().toISOString()
    };
  }

  /**
   * 创建新的章节写作会话
   * @param {number} chapterId - 章节ID
   * @param {string} sessionType - 会话类型
   * @returns {Promise<{sessionId: number, context: ChapterContext}>}
   */
  async createChapterSession(chapterId, sessionType = 'writing') {
    // 获取章节信息
    const chapter = await this.getChapter(chapterId);
    if (!chapter) {
      throw new Error(`Chapter ${chapterId} not found`);
    }

    // 构建上下文
    const context = await this.buildChapterContext(chapter.novel_id, chapterId);

    // 创建会话记录
    const result = this.db.prepare(`
      INSERT INTO chapter_sessions (chapter_id, session_type, context_snapshot, status)
      VALUES (?, ?, ?, 'active')
    `).run(chapterId, sessionType, JSON.stringify(context));

    return {
      sessionId: result.lastInsertRowid,
      context
    };
  }

  /**
   * 关闭章节写作会话
   * @param {number} sessionId - 会话ID
   */
  async closeChapterSession(sessionId) {
    this.db.prepare(`
      UPDATE chapter_sessions
      SET status = 'closed', closed_at = datetime('now')
      WHERE id = ?
    `).run(sessionId);
  }

  /**
   * 获取章节的活跃会话
   * @param {number} chapterId - 章节ID
   * @returns {Object|null}
   */
  async getActiveSession(chapterId) {
    return this.db.prepare(`
      SELECT * FROM chapter_sessions
      WHERE chapter_id = ? AND status = 'active'
      ORDER BY created_at DESC
      LIMIT 1
    `).get(chapterId);
  }

  /**
   * 更新章节摘要
   * @param {number} chapterId - 章节ID
   * @param {Object} summary - 摘要数据
   */
  async updateChapterSummary(chapterId, summary) {
    const { summaryText, keyEvents, characterChanges, plotProgress, wordCount } = summary;

    // 使用 upsert
    const existing = this.db.prepare(`
      SELECT id FROM chapter_summaries WHERE chapter_id = ?
    `).get(chapterId);

    if (existing) {
      this.db.prepare(`
        UPDATE chapter_summaries
        SET summary_text = ?, key_events = ?, character_changes = ?,
            plot_progress = ?, word_count = ?, updated_at = datetime('now')
        WHERE chapter_id = ?
      `).run(
        summaryText,
        JSON.stringify(keyEvents || []),
        JSON.stringify(characterChanges || []),
        JSON.stringify(plotProgress || {}),
        wordCount || 0,
        chapterId
      );
    } else {
      this.db.prepare(`
        INSERT INTO chapter_summaries
        (chapter_id, summary_text, key_events, character_changes, plot_progress, word_count)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        chapterId,
        summaryText,
        JSON.stringify(keyEvents || []),
        JSON.stringify(characterChanges || []),
        JSON.stringify(plotProgress || {}),
        wordCount || 0
      );
    }
  }

  // =========================================================================
  // 上下文层加载
  // =========================================================================

  /**
   * 加载事实层（角色、世界观）
   * @private
   */
  async loadFactsLayer(novelId, projectPath) {
    const facts = {
      characters: null,
      worldRules: null,
      glossary: null
    };

    // 从数据库加载
    const stateFiles = this.db.prepare(`
      SELECT name, type, content FROM state_files WHERE novel_id = ?
    `).all(novelId);

    for (const file of stateFiles) {
      if (file.name === 'characters.md' || file.type === 'characters') {
        facts.characters = file.content;
      } else if (file.name === 'world_rules.md' || file.type === 'world_rules') {
        facts.worldRules = file.content;
      } else if (file.type === 'glossary') {
        facts.glossary = file.content;
      }
    }

    // 尝试从文件系统加载（作为补充）
    if (projectPath) {
      const stateDir = path.join(projectPath, 'state');

      if (!facts.characters) {
        try {
          facts.characters = await fs.readFile(path.join(stateDir, 'characters.md'), 'utf-8');
        } catch {}
      }

      if (!facts.worldRules) {
        try {
          facts.worldRules = await fs.readFile(path.join(stateDir, 'world_rules.md'), 'utf-8');
        } catch {}
      }
    }

    return facts;
  }

  /**
   * 加载世界线层（时间线、伏笔）
   * @private
   */
  async loadWorldlineLayer(novelId, projectPath, config) {
    const worldline = {
      timeline: null,
      plotThreads: []
    };

    // 从数据库加载时间线
    const timelineFile = this.db.prepare(`
      SELECT content FROM state_files
      WHERE novel_id = ? AND (name = 'timeline.md' OR type = 'timeline')
    `).get(novelId);

    if (timelineFile) {
      worldline.timeline = timelineFile.content;
    } else if (projectPath) {
      // 尝试从文件系统加载
      try {
        worldline.timeline = await fs.readFile(
          path.join(projectPath, 'state', 'timeline.md'), 'utf-8'
        );
      } catch {}
    }

    // 加载伏笔追踪（如果配置启用）
    if (config.include_plot_threads) {
      worldline.plotThreads = this.db.prepare(`
        SELECT id, name, description, status, introduced_chapter, resolved_chapter, importance, notes
        FROM plot_threads
        WHERE novel_id = ? AND status = 'active'
        ORDER BY importance DESC, created_at ASC
      `).all(novelId);
    }

    return worldline;
  }

  /**
   * 加载任务历程层
   * @private
   */
  async loadHistoryLayer(novelId, config) {
    const history = {
      milestones: [],
      summary: null
    };

    if (!config.include_milestones) {
      return history;
    }

    // 加载里程碑
    history.milestones = this.db.prepare(`
      SELECT id, chapter_number, title, description, milestone_type, importance
      FROM milestones
      WHERE novel_id = ?
      ORDER BY chapter_number ASC, created_at ASC
      LIMIT 20
    `).all(novelId);

    // 生成摘要文本
    if (history.milestones.length > 0) {
      history.summary = history.milestones
        .map(m => `- ${m.title}${m.chapter_number ? ` (第${m.chapter_number}章)` : ''}`)
        .join('\n');
    }

    return history;
  }

  /**
   * 加载最近章节摘要
   * @private
   */
  async loadRecentChaptersSummary(novelId, currentChapterNumber, config) {
    const count = config.recent_chapters_count || 3;
    const startChapter = Math.max(1, currentChapterNumber - count);

    // 获取最近的章节
    const chapters = this.db.prepare(`
      SELECT
        c.id, c.chapter_number, c.title, c.status, c.current_word_count,
        cs.summary_text, cs.key_events, cs.character_changes, cs.plot_progress
      FROM chapters c
      LEFT JOIN chapter_summaries cs ON cs.chapter_id = c.id
      WHERE c.novel_id = ?
        AND c.chapter_number >= ?
        AND c.chapter_number < ?
        AND c.status = 'done'
      ORDER BY c.chapter_number DESC
    `).all(novelId, startChapter, currentChapterNumber);

    // 如果没有摘要，尝试生成简化摘要
    return chapters.map(ch => ({
      number: ch.chapter_number,
      title: ch.title,
      wordCount: ch.current_word_count,
      summary: ch.summary_text || `（第${ch.chapter_number}章：${ch.title}）`,
      keyEvents: ch.key_events ? JSON.parse(ch.key_events) : [],
      characterChanges: ch.character_changes ? JSON.parse(ch.character_changes) : []
    }));
  }

  // =========================================================================
  // 配置管理
  // =========================================================================

  /**
   * 获取上下文配置
   * @param {number} novelId
   * @returns {Object}
   */
  async getContextConfig(novelId) {
    let config = this.db.prepare(`
      SELECT * FROM context_config WHERE novel_id = ?
    `).get(novelId);

    if (!config) {
      // 创建默认配置
      this.db.prepare(`
        INSERT INTO context_config (novel_id) VALUES (?)
      `).run(novelId);

      config = {
        novel_id: novelId,
        recent_chapters_count: 3,
        include_plot_threads: 1,
        include_milestones: 1,
        include_character_changes: 1,
        max_context_tokens: 8000,
        auto_summarize: 1
      };
    }

    return {
      recentChaptersCount: config.recent_chapters_count || 3,
      includePlotThreads: !!config.include_plot_threads,
      includeMilestones: !!config.include_milestones,
      includeCharacterChanges: !!config.include_character_changes,
      maxContextTokens: config.max_context_tokens || 8000,
      autoSummarize: !!config.auto_summarize
    };
  }

  /**
   * 更新上下文配置
   * @param {number} novelId
   * @param {Object} updates
   */
  async updateContextConfig(novelId, updates) {
    const fields = [];
    const values = [];

    const mapping = {
      recentChaptersCount: 'recent_chapters_count',
      includePlotThreads: 'include_plot_threads',
      includeMilestones: 'include_milestones',
      includeCharacterChanges: 'include_character_changes',
      maxContextTokens: 'max_context_tokens',
      autoSummarize: 'auto_summarize'
    };

    for (const [key, value] of Object.entries(updates)) {
      if (mapping[key]) {
        fields.push(`${mapping[key]} = ?`);
        values.push(value);
      }
    }

    if (fields.length > 0) {
      values.push(novelId);
      this.db.prepare(`
        UPDATE context_config
        SET ${fields.join(', ')}, updated_at = datetime('now')
        WHERE novel_id = ?
      `).run(...values);
    }
  }

  // =========================================================================
  // 伏笔追踪管理
  // =========================================================================

  /**
   * 添加伏笔/支线
   */
  async addPlotThread(novelId, thread) {
    const { name, description, introducedChapter, importance, notes } = thread;

    return this.db.prepare(`
      INSERT INTO plot_threads
      (novel_id, name, description, introduced_chapter, importance, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(novelId, name, description, introducedChapter, importance || 1, notes);
  }

  /**
   * 更新伏笔状态
   */
  async updatePlotThread(threadId, updates) {
    const { status, resolvedChapter, notes } = updates;

    this.db.prepare(`
      UPDATE plot_threads
      SET status = COALESCE(?, status),
          resolved_chapter = COALESCE(?, resolved_chapter),
          notes = COALESCE(?, notes),
          updated_at = datetime('now')
      WHERE id = ?
    `).run(status, resolvedChapter, notes, threadId);
  }

  /**
   * 获取活跃的伏笔列表
   */
  async getActivePlotThreads(novelId) {
    return this.db.prepare(`
      SELECT * FROM plot_threads
      WHERE novel_id = ? AND status = 'active'
      ORDER BY importance DESC, created_at ASC
    `).all(novelId);
  }

  // =========================================================================
  // 里程碑管理
  // =========================================================================

  /**
   * 添加里程碑
   */
  async addMilestone(novelId, milestone) {
    const { chapterNumber, title, description, milestoneType, importance } = milestone;

    return this.db.prepare(`
      INSERT INTO milestones
      (novel_id, chapter_number, title, description, milestone_type, importance)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(novelId, chapterNumber, title, description, milestoneType || 'plot', importance || 1);
  }

  /**
   * 获取里程碑列表
   */
  async getMilestones(novelId, limit = 20) {
    return this.db.prepare(`
      SELECT * FROM milestones
      WHERE novel_id = ?
      ORDER BY chapter_number ASC, created_at ASC
      LIMIT ?
    `).all(novelId, limit);
  }

  // =========================================================================
  // 辅助方法
  // =========================================================================

  /**
   * 获取小说信息
   * @private
   */
  async getNovel(novelId) {
    return this.db.prepare(`SELECT * FROM novels WHERE id = ?`).get(novelId);
  }

  /**
   * 获取章节信息
   * @private
   */
  async getChapter(chapterId) {
    return this.db.prepare(`SELECT * FROM chapters WHERE id = ?`).get(chapterId);
  }

  /**
   * 将上下文格式化为系统提示词
   */
  formatContextForPrompt(context) {
    const sections = [];

    // 事实层
    if (context.facts) {
      if (context.facts.characters) {
        sections.push(`【角色档案】\n${context.facts.characters}`);
      }
      if (context.facts.worldRules) {
        sections.push(`【世界观设定】\n${context.facts.worldRules}`);
      }
    }

    // 世界线层
    if (context.worldline) {
      if (context.worldline.timeline) {
        sections.push(`【时间线】\n${context.worldline.timeline}`);
      }
      if (context.worldline.plotThreads && context.worldline.plotThreads.length > 0) {
        const threads = context.worldline.plotThreads
          .map(t => `- ${t.name}${t.description ? `: ${t.description}` : ''}`)
          .join('\n');
        sections.push(`【活跃伏笔/支线】\n${threads}`);
      }
    }

    // 任务历程
    if (context.history && context.history.summary) {
      sections.push(`【故事里程碑】\n${context.history.summary}`);
    }

    // 最近章节
    if (context.recentChapters && context.recentChapters.length > 0) {
      const recentSummary = context.recentChapters
        .map(ch => {
          let summary = `### 第${ch.number}章：${ch.title}`;
          if (ch.summary) {
            summary += `\n${ch.summary}`;
          }
          if (ch.keyEvents && ch.keyEvents.length > 0) {
            summary += `\n关键事件: ${ch.keyEvents.join(', ')}`;
          }
          return summary;
        })
        .join('\n\n');
      sections.push(`【最近章节回顾】\n${recentSummary}`);
    }

    // 当前章节
    if (context.currentChapter) {
      const ch = context.currentChapter;
      sections.push(`【当前章节】\n第${ch.number}章：${ch.title}\n状态: ${ch.status}\n目标字数: ${ch.targetWordCount}`);
      if (ch.outline) {
        sections.push(`【章节大纲】\n${ch.outline}`);
      }
    }

    return sections.join('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n');
  }
}

// ============================================================================
// 单例导出
// ============================================================================

let contextServiceInstance = null;

export function initContextService() {
  if (!contextServiceInstance) {
    contextServiceInstance = new ContextService();
  }
  return contextServiceInstance;
}

export function getContextService() {
  if (!contextServiceInstance) {
    throw new Error('ContextService not initialized. Call initContextService first.');
  }
  return contextServiceInstance;
}

export default ContextService;
