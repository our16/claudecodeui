/**
 * Novel API Routes
 *
 * 小说项目管理 API 端点
 */

import express from 'express';
import { getPromptService } from '../services/promptService.js';
import { db } from '../database/db.js';

const router = express.Router();

/**
 * 获取所有小说项目
 * GET /api/novels
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;

    const novels = db.prepare(`
      SELECT
        n.id,
        n.name,
        n.display_name as displayName,
        n.description,
        n.genre,
        n.project_path as projectPath,
        n.created_at as createdAt,
        n.updated_at as updatedAt,
        n.settings,
        COUNT(DISTINCT c.id) as totalChapters,
        SUM(CASE WHEN c.status = 'done' THEN 1 ELSE 0 END) as completedChapters,
        SUM(c.current_word_count) as totalWordCount
      FROM novels n
      LEFT JOIN chapters c ON c.novel_id = n.id
      WHERE n.user_id = ?
      GROUP BY n.id
      ORDER BY n.updated_at DESC
    `).all(userId);

    // 为每个小说项目添加路径信息，与普通项目保持一致
    const novelsWithPath = novels.map(novel => {
      const projectPath = novel.projectPath || `novel:${novel.id}`;
      // Encode the project path for use with sessions API (replace : / and \ with -)
      // Matches the .claude directory structure: F:/workspace-test → F--workspace-test
      const encodedName = projectPath.replace(/[\/\\:]/g, '-');

      // Debug logging
      console.log('Novel encoding debug:', {
        id: novel.id,
        name: novel.name,
        displayName: novel.displayName,
        projectPath: novel.projectPath,
        effectivePath: projectPath,
        encodedName: encodedName
      });

      return {
        id: novel.id,
        name: encodedName,                // 用于sessions API的编码路径 (must be first to override spread)
        displayName: novel.displayName || novel.name,  // 显示名称
        description: novel.description,
        genre: novel.genre,
        projectPath: novel.projectPath,
        path: projectPath,                // 项目标识路径
        fullPath: novel.projectPath,      // 实际文件系统路径
        createdAt: novel.createdAt,
        updatedAt: novel.updatedAt,
        settings: novel.settings,
        totalChapters: novel.totalChapters,
        completedChapters: novel.completedChapters,
        totalWordCount: novel.totalWordCount,
        type: 'novel'                     // 标识为小说项目类型
      };
    });

    res.json({ novels: novelsWithPath });
  } catch (error) {
    console.error('Error fetching novels:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 创建新小说项目
 * POST /api/novels
 *
 * Body: { name, displayName?, genre?, description?, projectPath }
 *
 * 注意：projectPath 为必填项，不自动创建默认目录
 */
router.post('/', async (req, res) => {
  try {
    const userId = req.user.id;

    const {
      name,
      displayName = name,
      genre = '',
      description = '',
      projectPath
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Novel name is required' });
    }

    // 工作目录为必填项
    if (!projectPath || !projectPath.trim()) {
      return res.status(400).json({ error: 'Working directory (projectPath) is required' });
    }

    // 检查是否已存在同名小说
    const existing = db.prepare(`
      SELECT id FROM novels WHERE user_id = ? AND name = ?
    `).get(userId, name);

    if (existing) {
      return res.status(409).json({ error: 'Novel with this name already exists' });
    }

    // 验证工作目录存在（不自动创建）
    const fs = (await import('fs')).promises;
    try {
      await fs.access(projectPath);
    } catch {
      return res.status(400).json({ error: `Working directory does not exist: ${projectPath}` });
    }

    // 创建小说项目
    const novelId = db.prepare(`
      INSERT INTO novels (
        user_id, name, display_name, genre,
        description, project_path, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(userId, name, displayName, genre, description, projectPath).lastInsertRowid;

    // 创建默认状态文件
    const defaultStateFiles = [
      { name: 'characters.md', type: 'characters', content: '# 角色档案\n\n## 主角\n\n## 配角\n\n' },
      { name: 'world_rules.md', type: 'world_rules', content: '# 世界观设定\n\n## 力量体系\n\n## 地理环境\n\n' },
      { name: 'timeline.md', type: 'timeline', content: '# 时间线\n\n' }
    ];

    const insertStateFile = db.prepare(`
      INSERT OR IGNORE INTO state_files (novel_id, name, type, content, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `);

    for (const file of defaultStateFiles) {
      try {
        insertStateFile.run(novelId, file.name, file.type, file.content);
      } catch (error) {
        console.warn(`Failed to insert state file ${file.name} for novel ${novelId}:`, error.message);
      }
    }

    // 获取创建的小说
    const novel = db.prepare(`
      SELECT * FROM novels WHERE id = ?
    `).get(novelId);

    // Encode the project path for use with sessions API
    const effectiveProjectPath = projectPath || `novel:${novel.id}`;
    const encodedName = effectiveProjectPath.replace(/[\/\\:]/g, '-');

    res.status(201).json({
      novel: {
        id: novel.id,
        name: encodedName,                // 用于sessions API的编码路径
        displayName: novel.display_name || novel.name,
        description: novel.description,
        genre: novel.genre,
        projectPath: novel.project_path,
        path: effectiveProjectPath,
        fullPath: novel.project_path,
        createdAt: novel.created_at,
        updatedAt: novel.updated_at,
        settings: novel.settings,
        type: 'novel'
      }
    });
  } catch (error) {
    console.error('Error creating novel:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 获取单个小说详情
 * GET /api/novels/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const novelId = req.params.id;

    const novel = db.prepare(`
      SELECT * FROM novels WHERE id = ? AND user_id = ?
    `).get(novelId, userId);

    if (!novel) {
      return res.status(404).json({ error: 'Novel not found' });
    }

    // 获取章节统计
    const stats = db.prepare(`
      SELECT
        COUNT(*) as totalChapters,
        SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as completedChapters,
        SUM(current_word_count) as totalWordCount
      FROM chapters
      WHERE novel_id = ?
    `).get(novelId);

    // 获取状态文件列表
    const stateFiles = db.prepare(`
      SELECT name, type, updated_at FROM state_files
      WHERE novel_id = ?
      ORDER BY type, name
    `).all(novelId);

    // Encode the project path for use with sessions API
    const projectPath = novel.project_path || `novel:${novel.id}`;
    const encodedName = projectPath.replace(/[\/\\:]/g, '-');

    res.json({
      novel: {
        id: novel.id,
        name: encodedName,                // 用于sessions API的编码路径
        displayName: novel.display_name || novel.name,
        description: novel.description,
        genre: novel.genre,
        projectPath: novel.project_path,
        path: projectPath,
        fullPath: novel.project_path,
        createdAt: novel.created_at,
        updatedAt: novel.updated_at,
        settings: novel.settings,
        stats: stats || { totalChapters: 0, completedChapters: 0, totalWordCount: 0 },
        stateFiles,
        type: 'novel'
      }
    });
  } catch (error) {
    console.error('Error fetching novel:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 更新小说信息
 * PUT /api/novels/:id
 *
 * Body: { displayName?, description?, genre?, settings? }
 */
router.put('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const novelId = req.params.id;

    // 检查权限
    const existing = db.prepare(`
      SELECT id FROM novels WHERE id = ? AND user_id = ?
    `).get(novelId, userId);

    if (!existing) {
      return res.status(404).json({ error: 'Novel not found' });
    }

    const { displayName, description, genre, settings } = req.body;

    // 构建更新语句
    const updates = [];
    const values = [];

    if (displayName !== undefined) {
      updates.push('display_name = ?');
      values.push(displayName);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }
    if (genre !== undefined) {
      updates.push('genre = ?');
      values.push(genre);
    }
    if (settings !== undefined) {
      updates.push('settings = ?');
      values.push(JSON.stringify(settings));
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = datetime("now")');
    values.push(novelId, userId);

    db.prepare(`
      UPDATE novels SET ${updates.join(', ')}
      WHERE id = ? AND user_id = ?
    `).run(...values);

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating novel:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 删除小说项目
 * DELETE /api/novels/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const novelId = req.params.id;

    // 检查权限
    const existing = db.prepare(`
      SELECT id FROM novels WHERE id = ? AND user_id = ?
    `).get(novelId, userId);

    if (!existing) {
      return res.status(404).json({ error: 'Novel not found' });
    }

    // 删除相关数据（级联）
    db.prepare('DELETE FROM chapter_messages WHERE chapter_id IN (SELECT id FROM chapters WHERE novel_id = ?)').run(novelId);
    db.prepare('DELETE FROM chapters WHERE novel_id = ?').run(novelId);
    db.prepare('DELETE FROM state_files WHERE novel_id = ?').run(novelId);
    db.prepare('DELETE FROM novels WHERE id = ?').run(novelId);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting novel:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// 章节管理端点
// ============================================================================

/**
 * 获取小说的所有章节
 * GET /api/novels/:id/chapters
 */
router.get('/:id/chapters', async (req, res) => {
  try {
    const userId = req.user.id;
    const novelId = req.params.id;

    // 检查小说权限
    const novel = db.prepare(`
      SELECT id FROM novels WHERE id = ? AND user_id = ?
    `).get(novelId, userId);

    if (!novel) {
      return res.status(404).json({ error: 'Novel not found' });
    }

    const chapters = db.prepare(`
      SELECT
        id,
        chapter_number,
        title,
        status,
        target_word_count as targetWordCount,
        current_word_count as currentWordCount,
        outline,
        created_at as createdAt,
        updated_at as updatedAt
      FROM chapters
      WHERE novel_id = ?
      ORDER BY chapter_number ASC
    `).all(novelId);

    res.json({ chapters });
  } catch (error) {
    console.error('Error fetching chapters:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 创建新章节
 * POST /api/novels/:id/chapters
 *
 * Body: { title, chapterNumber?, targetWordCount? }
 */
router.post('/:id/chapters', async (req, res) => {
  try {
    const userId = req.user.id;
    const novelId = req.params.id;

    // 检查权限
    const novel = db.prepare(`
      SELECT id FROM novels WHERE id = ? AND user_id = ?
    `).get(novelId, userId);

    if (!novel) {
      return res.status(404).json({ error: 'Novel not found' });
    }

    const {
      title,
      chapterNumber = null,
      targetWordCount = 3000
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Chapter title is required' });
    }

    // 自动分配章节号
    let finalChapterNumber = chapterNumber;
    if (!finalChapterNumber) {
      const maxResult = db.prepare(`
        SELECT COALESCE(MAX(chapter_number), 0) as max_num
        FROM chapters WHERE novel_id = ?
      `).get(novelId);
      finalChapterNumber = (maxResult.max_num || 0) + 1;
    }

    // 创建章节
    const chapterId = db.prepare(`
      INSERT INTO chapters (
        novel_id, chapter_number, title, status,
        target_word_count, current_word_count,
        created_at, updated_at
      ) VALUES (?, ?, ?, 'pending', ?, ?, datetime('now'), datetime('now'))
    `).run(
      novelId,
      finalChapterNumber,
      title,
      targetWordCount,
      0
    ).lastInsertRowid;

    const chapter = db.prepare(`
      SELECT * FROM chapters WHERE id = ?
    `).get(chapterId);

    res.status(201).json({ chapter });
  } catch (error) {
    console.error('Error creating chapter:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 更新章节
 * PUT /api/novels/:id/chapters/:chapterId
 */
router.put('/:id/chapters/:chapterId', async (req, res) => {
  try {
    const userId = req.user.id;
    const novelId = req.params.id;
    const chapterId = req.params.chapterId;

    // 检查权限
    const chapter = db.prepare(`
      SELECT c.id FROM chapters c
      JOIN novels n ON n.id = c.novel_id
      WHERE c.id = ? AND c.novel_id = ? AND n.user_id = ?
    `).get(chapterId, novelId, userId);

    if (!chapter) {
      return res.status(404).json({ error: 'Chapter not found' });
    }

    const { title, status, targetWordCount, outline, content } = req.body;

    const updates = [];
    const values = [];

    if (title !== undefined) {
      updates.push('title = ?');
      values.push(title);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      values.push(status);
    }
    if (targetWordCount !== undefined) {
      updates.push('target_word_count = ?');
      values.push(targetWordCount);
    }
    if (outline !== undefined) {
      updates.push('outline = ?');
      values.push(outline);
    }
    if (content !== undefined) {
      updates.push('content = ?');
      values.push(content);
    }

    if (updates.length > 0) {
      updates.push('updated_at = datetime("now")');
      values.push(chapterId);
      db.prepare(`
        UPDATE chapters SET ${updates.join(', ')}
        WHERE id = ?
      `).run(...values);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating chapter:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// 状态文件管理端点
// ============================================================================

/**
 * 获取状态文件列表
 * GET /api/novels/:id/state-files
 */
router.get('/:id/state-files', async (req, res) => {
  try {
    const userId = req.user.id;
    const novelId = req.params.id;

    // 检查权限
    const novel = db.prepare(`
      SELECT id FROM novels WHERE id = ? AND user_id = ?
    `).get(novelId, userId);

    if (!novel) {
      return res.status(404).json({ error: 'Novel not found' });
    }

    const stateFiles = db.prepare(`
      SELECT name, type, updated_at FROM state_files
      WHERE novel_id = ?
      ORDER BY type, name
    `).all(novelId);

    res.json({ stateFiles });
  } catch (error) {
    console.error('Error fetching state files:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 获取状态文件内容
 * GET /api/novels/:id/state-files/:name
 */
router.get('/:id/state-files/:name', async (req, res) => {
  try {
    const userId = req.user.id;
    const novelId = req.params.id;
    const fileName = req.params.name;

    // 检查权限
    const novel = db.prepare(`
      SELECT id FROM novels WHERE id = ? AND user_id = ?
    `).get(novelId, userId);

    if (!novel) {
      return res.status(404).json({ error: 'Novel not found' });
    }

    const stateFile = db.prepare(`
      SELECT content FROM state_files
      WHERE novel_id = ? AND name = ?
    `).get(novelId, fileName);

    if (!stateFile) {
      return res.status(404).json({ error: 'State file not found' });
    }

    res.json({ content: stateFile.content });
  } catch (error) {
    console.error('Error fetching state file:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 更新状态文件内容
 * PUT /api/novels/:id/state-files/:name
 */
router.put('/:id/state-files/:name', async (req, res) => {
  try {
    const userId = req.user.id;
    const novelId = req.params.id;
    const fileName = req.params.name;
    const { content } = req.body;

    // 检查权限
    const novel = db.prepare(`
      SELECT id FROM novels WHERE id = ? AND user_id = ?
    `).get(novelId, userId);

    if (!novel) {
      return res.status(404).json({ error: 'Novel not found' });
    }

    // 更新或插入
    const existing = db.prepare(`
      SELECT id FROM state_files WHERE novel_id = ? AND name = ?
    `).get(novelId, fileName);

    if (existing) {
      db.prepare(`
        UPDATE state_files SET content = ?, updated_at = datetime('now')
        WHERE novel_id = ? AND name = ?
      `).run(content, novelId, fileName);
    } else {
      db.prepare(`
        INSERT INTO state_files (novel_id, name, type, content, updated_at)
        VALUES (?, ?, 'custom', ?, datetime('now'))
      `).run(novelId, fileName, content);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating state file:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// 章节创作会话（使用提示词服务）
// ============================================================================

/**
 * 开始章节创作会话
 * POST /api/novels/:id/chapters/:chapterId/sessions
 *
 * Body: { prompt }
 */
router.post('/:id/chapters/:chapterId/sessions', async (req, res) => {
  try {
    const userId = req.user.id;
    const novelId = req.params.id;
    const chapterId = req.params.chapterId;
    const { prompt } = req.body;

    // 检查权限
    const chapter = db.prepare(`
      SELECT c.*, n.user_id
      FROM chapters c
      JOIN novels n ON n.id = c.novel_id
      WHERE c.id = ? AND c.novel_id = ? AND n.user_id = ?
    `).get(chapterId, novelId, userId);

    if (!chapter) {
      return res.status(404).json({ error: 'Chapter not found' });
    }

    // 使用提示词服务构建系统提示词
    const promptService = getPromptService();
    const promptConfig = await promptService.buildPromptForClaudeSDK(prompt, {
      novelId,
      chapterId,
      cwd: chapter.project_path
    });

    // 更新章节状态为写作中
    db.prepare(`
      UPDATE chapters SET status = 'writing', updated_at = datetime('now')
      WHERE id = ?
    `).run(chapterId);

    // 返回提示词配置，供前端使用
    res.json({
      sessionId: null, // SDK 会生成
      promptConfig,
      chapter: {
        id: chapter.id,
        number: chapter.chapter_number,
        title: chapter.title,
        status: 'writing'
      }
    });
  } catch (error) {
    console.error('Error starting writing session:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 扫描 volumes 目录获取卷、大纲和章节信息
 * GET /api/novels/:id/volumes
 *
 * 从文件系统读取 volumes 目录结构：
 * - volumes/vol1/ 包含 ch01-ch10
 * - volumes/vol2/ 包含 ch11-ch20
 * 每个章节包含：chXX.md（内容）、chXX.state（状态）、chXX_outline.md（大纲）
 */
router.get('/:id/volumes', async (req, res) => {
  try {
    const userId = req.user.id;
    const novelId = req.params.id;

    // 获取小说信息（包含工作目录路径）
    const novel = db.prepare(`
      SELECT id, project_path FROM novels WHERE id = ? AND user_id = ?
    `).get(novelId, userId);

    if (!novel) {
      return res.status(404).json({ error: 'Novel not found' });
    }

    const projectPath = novel.project_path;
    if (!projectPath) {
      return res.status(400).json({ error: 'Novel has no project path configured' });
    }

    const fs = (await import('fs')).promises;
    const path = (await import('path'));
    const volumesPath = path.join(projectPath, 'volumes');

    // 检查 volumes 目录是否存在
    try {
      await fs.access(volumesPath);
    } catch {
      return res.json({ volumes: [], message: 'Volumes directory not found' });
    }

    // 读取卷目录
    const volumeDirs = await fs.readdir(volumesPath);
    const volumes = [];

    for (const volDir of volumeDirs) {
      const volPath = path.join(volumesPath, volDir);
      const volStat = await fs.stat(volPath);

      if (!volStat.isDirectory()) continue;

      const volume = {
        name: volDir,
        displayName: `第 ${volumes.length + 1} 卷`,
        chapters: []
      };

      // 读取卷目录下的章节文件
      const files = await fs.readdir(volPath);

      // 收集章节编号
      const chapterNumbers = new Set();
      for (const file of files) {
        const match = file.match(/^ch(\d+)\.md$/);
        if (match) {
          chapterNumbers.add(parseInt(match[1], 10));
        }
      }

      // 读取每个章节的详细信息
      for (const chNum of Array.from(chapterNumbers).sort((a, b) => a - b)) {
        const chFile = `ch${String(chNum).padStart(2, '0')}`;
        const mdPath = path.join(volPath, `${chFile}.md`);
        const statePath = path.join(volPath, `${chFile}.state`);
        const outlinePath = path.join(volPath, `${chFile}_outline.md`);

        const chapter = {
          number: chNum,
          volumeName: volDir,
          title: '待定',
          status: 'pending',
          wordCount: 0,
          outlineCreated: false,
          contentCreated: false,
          outline: null
        };

        // 读取状态文件
        try {
          const stateContent = await fs.readFile(statePath, 'utf-8');
          const stateLines = stateContent.split('\n');
          for (const line of stateLines) {
            if (line.startsWith('title:')) {
              chapter.title = line.replace('title:', '').trim().replace(/"/g, '');
            } else if (line.startsWith('status:')) {
              chapter.status = line.replace('status:', '').trim().replace(/"/g, '');
            } else if (line.startsWith('word_count:')) {
              chapter.wordCount = parseInt(line.replace('word_count:', '').trim(), 10) || 0;
            } else if (line.startsWith('outline_created:')) {
              chapter.outlineCreated = line.includes('true');
            } else if (line.startsWith('content_created:')) {
              chapter.contentCreated = line.includes('true');
            }
          }
        } catch {
          // 状态文件不存在，使用默认值
        }

        // 读取大纲内容
        try {
          const outlineContent = await fs.readFile(outlinePath, 'utf-8');
          chapter.outline = outlineContent;
          chapter.outlineCreated = true;

          // 尝试从大纲中提取标题
          const titleMatch = outlineContent.match(/\*\*章节标题\*\*:\s*(.+)/);
          if (titleMatch) {
            chapter.title = titleMatch[1].trim();
          }
        } catch {
          // 大纲文件不存在
        }

        // 读取章节内容统计字数
        try {
          const content = await fs.readFile(mdPath, 'utf-8');
          chapter.wordCount = content.length;
          chapter.contentCreated = content.trim().length > 0 && !content.includes('本章内容待撰写');
        } catch {
          // 内容文件不存在
        }

        volume.chapters.push(chapter);
      }

      volumes.push(volume);
    }

    // 按卷名排序
    volumes.sort((a, b) => a.name.localeCompare(b.name));

    res.json({ volumes });
  } catch (error) {
    console.error('Error scanning volumes:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 获取章节内容
 * GET /api/novels/:id/chapters/:volumeName/:chapterNumber/content
 *
 * 从文件系统读取章节正文内容
 */
router.get('/:id/chapters/:volumeName/:chapterNumber/content', async (req, res) => {
  try {
    const userId = req.user.id;
    const novelId = req.params.id;
    const { volumeName, chapterNumber } = req.params;

    // 获取小说信息（包含工作目录路径）
    const novel = db.prepare(`
      SELECT id, project_path FROM novels WHERE id = ? AND user_id = ?
    `).get(novelId, userId);

    if (!novel) {
      return res.status(404).json({ error: 'Novel not found' });
    }

    const projectPath = novel.project_path;
    if (!projectPath) {
      return res.status(400).json({ error: 'Novel has no project path configured' });
    }

    const fs = (await import('fs')).promises;
    const path = (await import('path'));
    const chapterFile = path.join(projectPath, 'volumes', volumeName, `ch${String(chapterNumber).padStart(2, '0')}.md`);

    // 读取章节内容
    try {
      const content = await fs.readFile(chapterFile, 'utf-8');
      res.json({ content, chapterNumber, volumeName });
    } catch {
      res.status(404).json({ error: 'Chapter content not found' });
    }
  } catch (error) {
    console.error('Error reading chapter content:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
