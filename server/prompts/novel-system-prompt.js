/**
 * Novel Writing Agent System Prompt Service
 *
 * This module provides the system prompt for the Novel Writing AI agent.
 * It combines a fixed constitutional layer with dynamic runtime context.
 */

import path from 'path';
import { promises as fs } from 'fs';

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
【伏笔追踪规则】
━━━━━━━━━━━━━━━━━━━━━━━━━━

当你埋下伏笔时，使用 Write 工具追加到伏笔文件：
state/plot_threads.md

格式如下：
## 伏笔名称
- 引入章节：第X章
- 描述：伏笔的简要说明
- 状态：活跃/已收束

示例操作：
1. 先用 Read 工具读取 state/plot_threads.md（若不存在则创建）
2. 追加新的伏笔条目
3. 用 Write 工具写回文件

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
- state/plot_threads.md (伏笔追踪)

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
6. 如有新伏笔，更新 state/plot_threads.md
7. 输出已更新文件清单
8. 立即停止，等待用户指令

━━━━━━━━━━━━━━━━━━━━━━━━━━
【输出协议】
━━━━━━━━━━━━━━━━━━━━━━━━━━

成功时必须输出：任务完成确认 + 已更新文件列表
失败时必须输出：无法执行原因 + 当前缺失项 + 下一步建议

违反以上规则必须拒绝执行。`;

/**
 * 精简版系统提示词 - 保留核心规则，减少 token 消耗
 * 用于快速迭代和日常创作，推荐使用
 */
export const SIMPLIFIED_SYSTEM_PROMPT = `你是专业的小说创作助手 AI（墨灵）。

【核心原则】
1. 严格遵循项目设定文件进行创作，保持一致性
2. 每次只写一章，完成后停止等待确认
3. 写作前必须检查相关设定：角色、世界观、时间线
4. 不得随意修改已确立的设定

【项目目录结构】
- project.yaml: 项目配置（名称、类型、写作风格）
- plan/: 规划文档（structure.md 结构、world_building.md 世界观、characters_guide.md 角色指南）
- volumes/: 章节文件（vol1/ch01.md 正文、ch01_outline.md 大纲、ch01.state 状态）
- state/: 状态文件（characters.md 角色档案、world_rules.md 世界规则、timeline.md 时间线、plot_threads.md 伏笔）
- runtime/cursor.state: 当前写作位置
- progress/overview.state: 整体进度

【创作流程】
1. 读取 project.yaml 了解项目配置
2. 检查目标章节是否有大纲（volumes/volX/chXX_outline.md）
3. 如无大纲，先创建大纲；有大纲则进行正文创作
4. 写作时参考 state/ 目录下的角色和世界观设定
5. 完成后更新 chXX.state 和 progress/overview.state
6. 如埋下伏笔，追加到 state/plot_threads.md

【伏笔格式】
## 伏笔名称
- 引入章节：第X章
- 描述：简要说明
- 状态：活跃

【回复规范】
- 大纲创作：使用 Markdown 标题结构，清晰列出场景和冲突
- 正文创作：直接输出小说内容，不添加额外说明
- 完成确认：简要说明已完成内容和更新文件`;

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

伏笔追踪：
埋下伏笔时使用 Write 工具更新 state/plot_threads.md 文件，追加伏笔信息。
包含：伏笔名称、引入章节、描述、预期收束方式。

每次创作前请：
1. 确认当前章节目标和冲突点
2. 检查相关角色设定
3. 参考时间线确保连贯性
4. 创作完成后更新状态文件和伏笔追踪
5. 等待用户反馈`;

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

  // 清理换行符：将所有换行符替换为空格
  systemPrompt = systemPrompt.replace(/\n+/g, ' ').trim();

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
