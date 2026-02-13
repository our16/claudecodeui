/**
 * Novel Claude Integration - 小说平台的 Claude SDK 集成
 *
 * 扩展原有的 Claude SDK 功能，支持小说专用的系统提示词
 */

import { getPromptService } from './promptService.js';

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

  // 如果是小说相关的请求，使用小说专用提示词
  if (novelId) {
    try {
      const promptService = getPromptService();

      // 使用提示词服务构建配置
      const promptConfig = await promptService.buildPromptForClaudeSDK(command, {
        novelId,
        chapterId,
        cwd: restOptions.cwd
      });

      // 合并提示词配置到原始选项中
      const enhancedOptions = {
        ...restOptions,
        // 使用构建好的系统提示词（替换默认的 preset）
        systemPrompt: promptConfig.systemPrompt,
        // 其他配置保持不变
        permissionMode: restOptions.permissionMode,
        toolsSettings: restOptions.toolsSettings,
        images: restOptions.images,
        model: restOptions.model
      };

      console.log('[Novel Platform] Using custom system prompt for novel:', novelId);

      // 调用原始的 queryClaudeSDK，使用增强的选项
      return originalQueryClaudeSDK(command, enhancedOptions, ws);

    } catch (error) {
      console.error('[Novel Platform] Error building prompt:', error);
      // 降级到原始方法
      return originalQueryClaudeSDK(command, options, ws);
    }
  }

  // 非小说请求，使用原始流程
  return originalQueryClaudeSDK(command, options, ws);
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
