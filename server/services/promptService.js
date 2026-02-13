/**
 * Prompt Service - 系统提示词服务
 *
 * 负责为 Novel Platform 构建和拼接系统提示词
 */

import { buildPromptForSDK } from '../prompts/novel-system-prompt.js';

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
   * @param {string} userMessage - 用户输入的消息
   * @param {object} options - SDK 选项
   * @returns {Promise<object>} 包含 systemPrompt 的配置对象
   */
  async buildPromptForClaudeSDK(userMessage, options = {}) {
    const {
      sessionId,
      cwd: projectPath,
      novelId,
      chapterId
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

    // 构建章节信息对象
    const chapterInfoForPrompt = chapterInfo ? {
      number: chapterInfo.chapter_number,
      title: chapterInfo.title,
      status: chapterInfo.status,
      targetWordCount: chapterInfo.target_word_count,
      currentWordCount: chapterInfo.current_word_count,
      outline: chapterInfo.outline
    } : null;

    // 使用系统提示词模块构建
    const promptConfig = await buildPromptForSDK({
      userMessage,
      projectPath: projectPath || (novelInfo?.project_path),
      chapterInfo: chapterInfoForPrompt
    });

    // 返回适合 SDK 的配置
    return {
      ...promptConfig,
      // 额外的 SDK 选项
      options: {
        cwd: projectPath || (novelInfo?.project_path),
        systemPrompt: {
          type: 'preset',
          preset: 'claude_code'  // 使用 SDK 的 preset 模式
        },
        settingSources: ['project', 'user', 'local']
      }
    };
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
