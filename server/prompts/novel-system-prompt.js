/**
 * Novel Writing Agent System Prompt Service
 *
 * This module provides the system prompt for the Novel Writing AI agent.
 * It combines a fixed constitutional layer with dynamic runtime context.
 */

import path from 'path';
import { promises as fs } from 'fs';
import os from 'os';

// ============================================================================
// 固定系统提示词（宪法层）
// ============================================================================

/**
 * 完整版系统提示词 - 包含完整的协议和规则
 * 用于正式版本，严格控制 AI 行为
 */
export const FULL_SYSTEM_PROMPT = `你是严格遵循项目协议的小说工程 Agent。

━━━━━━━━━━━━━━━━━━━━━━━━━━
【最高优先级规则】
━━━━━━━━━━━━━━━━━━━━━━━━━━

1. ⛔ 一次只能写一章，完成后必须立即停止。
2. ⛔ 没有 outline 禁止写正文。
3. ⛔ 每次操作后必须更新相关 state 文件。
4. ⛔ 写作完成后必须将 cursor.phase 重置为 "idle"。
5. ⛔ 不得绕过状态检查直接执行任务。
6. ⛔ 不得自动继续下一章。
7. ⛔ 不得在完成后主动建议继续。
8. ✓ 大纲可以连续生成

━━━━━━━━━━━━━━━━━━━━━━━━━━
【核心真相源】
━━━━━━━━━━━━━━━━━━━━━━━━━━

唯一真相来自以下文件：
- project.yaml (项目配置)
- plan/structure.md (结构大纲)
- plan/world_building.md (世界观设定)
- plan/characters_guide.md (角色指南)
- volumes/**/chXX_outline.md (章节大纲)
- volumes/**/chXX.state (章节状态)
- runtime/cursor.state (写作游标)
- progress/overview.state (进度概览)
- state/*.state (状态文件)

━━━━━━━━━━━━━━━━━━━━━━━━━━
【强制决策流程】
━━━━━━━━━━━━━━━━━━━━━━━━━━

1. 若 project.yaml 不存在或 inited != true → 初始化项目
2. 若 plan/ 设计不完整 → 先完成设计
3. 若目标章节无 outline → 生成大纲
4. 若 cursor.phase == "writing" → 继续当前章节
5. 若 cursor.phase == "idle" → 等待合法写作指令

━━━━━━━━━━━━━━━━━━━━━━━━━━
【写作完成后的强制动作】
━━━━━━━━━━━━━━━━━━━━━━━━━━

1. 统计字数并更新 chXX.state.word_count
2. 更新 chXX.state.status = "done"
3. 更新 cursor.state.phase = "idle"
4. 更新 cursor.state.current_chapter 为下一章
5. 更新 progress/overview.state
6. 输出已更新文件清单
7. 立即停止，等待用户指令

━━━━━━━━━━━━━━━━━━━━━━━━━━
【输出协议】
━━━━━━━━━━━━━━━━━━━━━━━━━━

成功时必须输出：任务完成确认 + 已更新文件列表
失败时必须输出：无法执行原因 + 当前缺失项 + 下一步建议

违反以上规则必须拒绝执行。`;

/**
 * 精简版系统提示词 - 保留核心规则，减少 token 消耗
 * 用于快速迭代和测试
 */
export const SIMPLIFIED_SYSTEM_PROMPT = `你是专业的小说创作助手 AI。

核心原则：
1. 严格按照用户提供的大纲和设定进行创作
2. 每次只写一章，写完后立即停止
3. 保持角色性格、世界观设定的一致性
4. 参考状态文件：characters.md, timeline.md, world_rules.md

创作流程：
1. 检查是否有章节大纲，没有则先创建大纲
2. 按照大纲进行正文创作
3. 创作完成后更新章节状态
4. 等待用户确认后再继续

回复格式：
- 大纲创作：使用 Markdown 标题结构
- 正文创作：直接输出小说内容
- 状态更新：简洁确认即可`;

/**
 * 专注版系统提示词 - 强调创作质量和一致性
 * 用于追求高质量创作的用户
 */
export const FOCUSED_SYSTEM_PROMPT = `你是经验丰富的小说创作导师和助手。

你的专长：
- 情节构思和冲突设计
- 角色性格塑造和发展
- 世界观深度和一致性维护
- 文学修辞和语言优化

创作准则：
1. **一致性优先**：严格遵守已设定的角色性格、世界观规则
2. **质量优于速度**：宁可少写也要保证质量
3. **自然推进**：情节发展要有逻辑，不生硬转折
4. **用户主导**：你是助手，最终决策权在作者

每次创作前请：
1. 确认当前章节目标和冲突点
2. 检查相关角色设定
3. 参考时间线确保连贯性
4. 创作完成后等待用户反馈`;

// 提示词版本映射
export const PROMPT_VERSIONS = {
  full: FULL_SYSTEM_PROMPT,
  simplified: SIMPLIFIED_SYSTEM_PROMPT,
  focused: FOCUSED_SYSTEM_PROMPT
};

/**
 * 获取当前使用的系统提示词版本
 * @returns {string} 系统提示词
 */
export function getSystemPrompt() {
  const version = process.env.NOVEL_PROMPT_VERSION || 'simplified';
  return PROMPT_VERSIONS[version] || SIMPLIFIED_SYSTEM_PROMPT;
}

// ============================================================================
// 运行时上下文构建
// ============================================================================

/**
 * 构建运行时上下文层 - 动态读取项目状态
 * @param {string} projectPath - 小说项目路径
 * @returns {Promise<string>} 运行时上下文字符串
 */
export async function buildRuntimeContext(projectPath) {
  if (!projectPath) {
    return '';
  }

  try {
    const contextLines = [];

    // 读取 cursor.state
    const cursorFile = path.join(projectPath, 'runtime', 'cursor.state');
    try {
      const content = await fs.readFile(cursorFile, 'utf-8');
      for (const line of content.trim().split('\n')) {
        if (line.startsWith('phase=')) {
          contextLines.push(`cursor.phase = ${line.split('=')[1].trim()}`);
          break;
        }
      }
    } catch {
      contextLines.push('cursor.phase = unknown');
    }

    // 读取 progress/overview.state
    const progressFile = path.join(projectPath, 'progress', 'overview.state');
    try {
      const content = await fs.readFile(progressFile, 'utf-8');
      for (const line of content.trim().split('\n')) {
        if (line.startsWith('completed_chapters')) {
          contextLines.push(`已完成章节数 = ${line.split(':')[1].trim()}`);
          break;
        }
      }
    } catch {
      contextLines.push('已完成章节数 = 0');
    }

    if (contextLines.length === 0) {
      contextLines.push('项目状态：无法读取');
    }

    return [
      '━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '【当前项目状态】',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━',
      ...contextLines,
      ''
    ].join('\n');

  } catch (error) {
    console.warn('Failed to build runtime context:', error.message);
    return '';
  }
}

/**
 * 构建状态文件摘要 - 列出可用的状态文件
 * @param {string} projectPath - 小说项目路径
 * @returns {Promise<string>} 状态文件摘要字符串
 */
export async function buildStateFilesSummary(projectPath) {
  if (!projectPath) {
    return '';
  }

  const stateDir = path.join(projectPath, 'state');

  try {
    await fs.access(stateDir);
  } catch {
    return '\n【状态文件】暂无状态文件\n';
  }

  try {
    const files = await fs.readdir(stateDir);
    const stateFiles = files.filter(f => f.endsWith('.state') || f.endsWith('.md'));

    if (stateFiles.length === 0) {
      return '\n【状态文件】暂无状态文件\n';
    }

    const summaries = [];
    for (const file of stateFiles) {
      const filePath = path.join(stateDir, file);
      const stats = await fs.stat(filePath);
      summaries.push(`- ${file} (${Math.round(stats.size / 1024)}KB)`);
    }

    return [
      '\n━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '【可用状态文件】',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━',
      ...summaries,
      ''
    ].join('\n');

  } catch (error) {
    console.warn('Failed to build state files summary:', error.message);
    return '';
  }
}

// ============================================================================
// 完整提示词构建
// ============================================================================

/**
 * 为 Claude SDK 构建完整提示词配置
 * @param {object} options - 选项
 * @param {string} options.userMessage - 用户消息
 * @param {string} options.projectPath - 项目路径
 * @param {object} options.chapterInfo - 章节信息
 * @returns {Promise<object>} SDK 兼容的提示词配置
 */
export async function buildPromptForSDK(options) {
  const { userMessage, projectPath, chapterInfo = {} } = options;

  // 构建运行时上下文
  const runtimeContext = await buildRuntimeContext(projectPath);
  const stateFilesSummary = await buildStateFilesSummary(projectPath);

  // 组合系统提示词
  let systemPrompt = getSystemPrompt() + '\n\n' + runtimeContext + stateFilesSummary;

  // 清理多余换行符：连续超过2个换行符合并为2个
  systemPrompt = systemPrompt.replace(/\n{3,}/g, '\n\n').trim();

  // 如果有章节信息，添加章节上下文
  let chapterContext = '';
  if (chapterInfo && chapterInfo.title) {
    chapterContext = `
━━━━━━━━━━━━━━━━━━━━━━━━━━
【当前章节信息】
━━━━━━━━━━━━━━━━━━━━━━━━━━

章节标题: ${chapterInfo.title}
章节编号: 第 ${chapterInfo.number || '?'} 章
预计字数: ${chapterInfo.targetWordCount || '未设定'}
当前字数: ${chapterInfo.currentWordCount || 0}
章节状态: ${chapterInfo.status || 'pending'}

${chapterInfo.outline ? `
章节大纲:
${chapterInfo.outline}
` : '⚠️ 章节大纲缺失，请先创建大纲'}
    `;
  }

  return {
    systemPrompt: systemPrompt + chapterContext,
    userMessage: userMessage || '', // 保持用户原始输入，不做修改
    projectPath
  };
}

/**
 * 构建纯文本提示词（用于非 SDK 场景）
 * @param {object} options - 选项
 * @returns {Promise<object>} { systemPrompt, userPrompt }
 */
export async function buildPrompt(options) {
  const sdkConfig = await buildPromptForSDK(options);
  return {
    systemPrompt: sdkConfig.systemPrompt,
    userPrompt: sdkConfig.userMessage
  };
}
