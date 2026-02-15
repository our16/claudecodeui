/**
 * Prompt Service - 系统提示词服务
 *
 * 负责为 Novel Platform 构建和拼接系统提示词
 * 集成上下文管理服务，支持章节写作会话隔离
 */

import { buildPromptForSDK } from '../prompts/novel-system-prompt.js';
import { getContextService } from './contextService.js';

/**
 * 小说项目状态读取器
 */
class NovelProjectReader {
  constructor(db) {
    this.db = db;
  }

  /**
   * 获取小说项目信息
   */
  async getNovel(novelId) {
    return this.db.prepare(`
      SELECT * FROM novels WHERE id = ?
    `).get(novelId);
  }

  /**
   * 获取章节信息
   */
  async getChapter(novelId, chapterId) {
    return this.db.prepare(`
      SELECT * FROM chapters
      WHERE novel_id = ? AND id = ?
    `).get(novelId, chapterId);
  }

  /**
   * 获取项目状态文件列表
   */
  async getStateFiles(novelId) {
    return this.db.prepare(`
      SELECT name, type, updated_at
      FROM state_files
      WHERE novel_id = ?
      ORDER BY type, name
    `).all(novelId);
  }

  /**
   * 获取写作游标状态
   */
  async getCursorState(novelId) {
    const novel = await this.getNovel(novelId);
    if (!novel) return null;

    // 从 runtime/cursor.state 读取，或从数据库获取缓存
    return this.db.prepare(`
      SELECT cursor_state FROM novel_runtime
      WHERE novel_id = ?
    `).get(novelId)?.cursor_state || null;
  }
}

/**
 * 提示词服务类
 */
export class PromptService {
  constructor(db) {
    this.reader = new NovelProjectReader(db);
  }

  /**
   * 为 Claude SDK 调用构建完整提示词
   * 这是主要入口点，被 claude-sdk.js 调用
   *
   * 支持两种模式：
   * 1. 日常会话模式：使用完整上下文，不隔离
   * 2. 章节写作模式：使用隔离的上下文，只注入必要信息
   *
   * @param {string} userMessage - 用户输入的消息
   * @param {object} options - SDK 选项
   * @returns {Promise<object>} 包含 systemPrompt 的配置对象
   */
  async buildPromptForClaudeSDK(userMessage, options = {}) {
    const {
      cwd: projectPath,
      novelId,
      chapterId,
      sessionMode = 'normal' // 'normal' | 'chapter_writing'
    } = options;

    // 获取小说和章节信息
    let novelInfo = null;
    let chapterInfo = null;

    if (novelId) {
      novelInfo = await this.reader.getNovel(novelId);
    }

    if (chapterId) {
      chapterInfo = await this.reader.getChapter(novelId, chapterId);
    }

    // 根据模式选择上下文构建策略
    let systemPrompt;
    let contextData = null;

    if (chapterId && (sessionMode === 'chapter_writing' || chapterInfo)) {
      // 章节写作模式：使用隔离的上下文
      try {
        const contextService = getContextService();
        contextData = await contextService.buildChapterContext(novelId, chapterId);
        systemPrompt = this.buildIsolatedSystemPrompt(contextData);
      } catch (error) {
        console.warn('Failed to build isolated context, falling back to normal mode:', error.message);
        // 降级到普通模式
        const promptConfig = await buildPromptForSDK({
          userMessage,
          projectPath: projectPath || (novelInfo?.project_path),
          chapterInfo: chapterInfo ? {
            number: chapterInfo.chapter_number,
            title: chapterInfo.title,
            status: chapterInfo.status,
            targetWordCount: chapterInfo.target_word_count,
            currentWordCount: chapterInfo.current_word_count,
            outline: chapterInfo.outline
          } : null
        });
        systemPrompt = promptConfig.systemPrompt;
      }
    } else {
      // 日常会话模式：使用完整上下文
      const promptConfig = await buildPromptForSDK({
        userMessage,
        projectPath: projectPath || (novelInfo?.project_path),
        chapterInfo: chapterInfo ? {
          number: chapterInfo.chapter_number,
          title: chapterInfo.title,
          status: chapterInfo.status,
          targetWordCount: chapterInfo.target_word_count,
          currentWordCount: chapterInfo.current_word_count,
          outline: chapterInfo.outline
        } : null
      });
      systemPrompt = promptConfig.systemPrompt;
    }

    // 返回适合 SDK 的配置
    return {
      systemPrompt,
      userMessage,
      projectPath: projectPath || (novelInfo?.project_path),
      contextData, // 包含上下文数据，供调试或扩展使用
      options: {
        cwd: projectPath || (novelInfo?.project_path),
        systemPrompt,
        settingSources: ['project', 'user', 'local']
      }
    };
  }

  /**
   * 构建隔离的系统提示词（章节写作专用）
   * @private
   */
  buildIsolatedSystemPrompt(contextData) {
    const contextService = getContextService();
    const contextText = contextService.formatContextForPrompt(contextData);

    // 章节写作专用的系统提示词
    const basePrompt = `你是专业的小说创作助手，正在协助用户进行章节写作。

━━━━━━━━━━━━━━━━━━━━━━━━━━
【核心规则】
━━━━━━━━━━━━━━━━━━━━━━━━━━

1. 严格基于提供的上下文进行创作
2. 保持角色性格、世界观设定的一致性
3. 参考最近章节的发展，确保情节连贯
4. 注意追踪的伏笔，适时埋设或呼应
5. 创作完成后等待用户确认

━━━━━━━━━━━━━━━━━━━━━━━━━━
【当前项目上下文】
━━━━━━━━━━━━━━━━━━━━━━━━━━

${contextText}

━━━━━━━━━━━━━━━━━━━━━━━━━━
【创作指南】
━━━━━━━━━━━━━━━━━━━━━━━━━━

基于以上上下文，请：
1. 确保新内容与已有设定一致
2. 情节发展自然流畅
3. 角色行为符合其性格设定
4. 注意与最近章节的衔接`;

    // 清理换行符
    return basePrompt.replace(/\n+/g, ' ').trim();
  }

  /**
   * 检查项目初始化状态
   * 用于确定是否需要引导用户完成项目设置
   */
  async checkProjectInitialization(novelId) {
    const novel = await this.reader.getNovel(novelId);
    if (!novel) {
      return { initialized: false, reason: 'Novel not found' };
    }

    const stateFiles = await this.reader.getStateFiles(novelId);

    // 检查必需的状态文件
    const requiredFiles = ['characters.md', 'world_rules.md'];
    const missingFiles = requiredFiles.filter(f =>
      !stateFiles.some(sf => sf.name === f)
    );

    return {
      initialized: missingFiles.length === 0,
      missingFiles,
      hasOutline: stateFiles.some(sf => sf.name === 'structure.md')
    };
  }

  /**
   * 构建项目初始化引导提示词
   * 当新项目创建时使用
   */
  async buildInitializationPrompt(novelInfo, userPreferences = {}) {
    const {
      name: novelName,
      genre = '未知',
      description = ''
    } = novelInfo || {};

    return {
      systemPrompt: `你是专业的小说创作顾问。

当前任务：帮助用户初始化小说项目《${novelName}》

项目信息：
- 类型：${genre}
- 简介：${description || '暂无'}

请引导用户完成以下步骤：
1. 角色设定 - 创建主要角色档案
2. 世界观设定 - 建立故事世界的规则
3. 结构规划 - 设计卷/章结构

每次只专注于一步，等待用户确认后再进行下一步。`,
      userMessage: `我正在创作一部${genre}类型的小说《${novelName}》。
${description ? `简介：${description}` : ''}
请帮我开始设定。`
    };
  }
}

// 单例模式导出
let promptServiceInstance = null;

export function initPromptService(db) {
  if (!promptServiceInstance) {
    promptServiceInstance = new PromptService(db);
  }
  return promptServiceInstance;
}

export function getPromptService() {
  if (!promptServiceInstance) {
    throw new Error('PromptService not initialized. Call initPromptService first.');
  }
  return promptServiceInstance;
}
