/**
 * Novel Claude Integration - 小说平台的 Claude SDK 集成
 *
 * 扩展原有的 Claude SDK 功能，支持小说专用的系统提示词
 *
 * 伏笔追踪说明：
 * - AI 通过 Write 工具直接写入 state/plot_threads.md 文件
 * - contextService 在加载上下文时会解析该文件并同步到数据库
 */

import { getPromptService } from './promptService.js';
import path from 'path';
import { promises as fs } from 'fs';
import { db } from '../database/db.js';

/**
 * 验证小说的工作目录是否存在
 * 注意：只验证用户指定的路径，不自动创建默认目录
 *
 * @param {string} novelId - 小说 ID
 * @param {string} projectPath - 数据库中存储的项目路径
 * @returns {Promise<string>} 工作目录的绝对路径
 * @throws {Error} 如果路径不存在
 */
export async function ensureNovelWorkingDir(novelId, projectPath = null) {
  // 必须有项目路径
  if (!projectPath) {
    throw new Error(`Novel ${novelId} has no working directory configured. Please specify a projectPath.`);
  }

  // 验证路径存在性
  try {
    await fs.access(projectPath);
    return path.resolve(projectPath);
  } catch (error) {
    throw new Error(`Working directory does not exist for novel ${novelId}: ${projectPath}`);
  }
}

/**
 * 从数据库获取小说的项目路径
 * @param {string} novelId - 小说 ID
 * @returns {Promise<string|null>} 项目路径
 */
export async function getNovelProjectPath(novelId) {
  try {
    const novel = db.prepare(`
      SELECT project_path FROM novels WHERE id = ?
    `).get(novelId);
    return novel?.project_path || null;
  } catch (error) {
    console.error('[Novel Platform] Failed to get novel project path:', error);
    return null;
  }
}

/**
 * 为小说创作调用 Claude SDK
 *
 * @param {string} command - 用户输入的命令/提示
 * @param {object} options - SDK 选项
 * @param {object} ws - WebSocket 连接
 * @param {Function} originalQueryClaudeSDK - 原始的 queryClaudeSDK 函数
 * @returns {Promise<void>}
 */
export async function queryNovelClaudeSDK(command, options = {}, ws, originalQueryClaudeSDK) {
  const { novelId, chapterId, ...restOptions } = options;
      // 确保有工作目录
      let workingDir = restOptions.cwd;

      // 如果前端没有传递 cwd，从数据库获取并确保工作目录存在
      if (!workingDir) {
        const projectPath = await getNovelProjectPath(novelId);
        workingDir = await ensureNovelWorkingDir(novelId, projectPath);
      }

      console.log(`[Novel Platform] Using working directory: ${workingDir}`);

      const promptService = getPromptService();

      // 使用提示词服务构建配置
      const promptConfig = await promptService.buildPromptForClaudeSDK(command, {
        novelId,
        chapterId,
        cwd: workingDir
      });

      // 合并提示词配置到原始选项中
      const enhancedOptions = {
        ...restOptions,
        cwd: workingDir,  // 使用确保过的工作目录
        // 使用构建好的系统提示词（替换默认的 preset）
        systemPrompt: promptConfig.systemPrompt,
        // 其他配置保持不变
        permissionMode: restOptions.permissionMode,
        toolsSettings: restOptions.toolsSettings,
        images: restOptions.images,
        model: restOptions.model
      };
      console.log('[Novel Platform] Using custom system prompt for novel:',promptConfig.systemPrompt, novelId);

      // 直接调用原始的 queryClaudeSDK
      // 伏笔追踪：AI 通过 Write 工具直接写入 state/plot_threads.md 文件
      // contextService 在加载上下文时会自动解析并同步到数据库
      return originalQueryClaudeSDK(command, enhancedOptions, ws);
}

/**
 * 检查请求是否来自小说平台
 *
 * @param {object} options - SDK 选项
 * @returns {boolean} 是否是小说请求
 */
export function isNovelRequest(options) {
  return !!(options.novelId || options.chapterId);
}

/**
 * 从 SDK 响应中提取章节内容
 *
 * @param {object} sdkMessage - SDK 消息对象
 * @returns {object|null} 提取的章节信息
 */
export function extractChapterContent(sdkMessage) {
  if (sdkMessage.type !== 'content' && sdkMessage.type !== 'result') {
    return null;
  }

  // 检查消息内容是否包含小说正文
  const content = sdkMessage.content || sdkMessage.text || '';
  if (!content) return null;

  // 简单的启发式检测：是否像小说内容
  const novelIndicators = [
    content.length > 500,  // 足够长
    !content.includes('```'),  // 不包含代码块
    !content.startsWith('#'),  // 不是 Markdown 标题
    !content.startsWith('|')  // 不是表格
  ];

  const isNovelContent = novelIndicators.filter(Boolean).length >= 2;

  if (isNovelContent) {
    return {
      chapterContent: content,
      wordCount: content.length,
      extractedAt: new Date().toISOString()
    };
  }

  return null;
}

/**
 * 格式化小说专用的 SDK 选项
 *
 * @param {object} options - 原始选项
 * @returns {object} 格式化后的选项
 */
export function formatNovelSDKOptions(options) {
  const { novelId, chapterId, ...rest } = options;

  // 小说专用模型的默认配置
  return {
    ...rest,
    // 使用适合小说创作的模型配置
    model: rest.model || 'sonnet',  // 默认使用 Sonnet 模型
    // 小说创作通常需要更大的上下文窗口
    permissionMode: rest.permissionMode || 'default',
    // 工具设置：小说创作需要的工具
    toolsSettings: rest.toolsSettings || {
      allowedTools: ['Read', 'Write'],  // 主要需要读写文件
      disallowedTools: ['Bash'],  // 禁用 shell 命令
      skipPermissions: false
    }
  };
}

/**
 * 创建小说章节会话
 *
 * @param {string} novelId - 小说 ID
 * @param {string} chapterId - 章节 ID
 * @param {string} prompt - 创作提示
 * @param {object} options - 额外选项
 * @returns {object} 会话配置
 */
export function createNovelSession(novelId, chapterId, prompt, options = {}) {
  return {
    type: 'novel-writing-session',
    novelId,
    chapterId,
    prompt,
    options: {
      ...options,
      mode: 'writing',  // 写作模式
      autoSave: true,  // 自动保存
      trackProgress: true  // 追踪进度
    },
    createdAt: new Date().toISOString()
  };
}
