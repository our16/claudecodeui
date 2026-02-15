/**
 * Template Service
 *
 * Handles copying the novel project template directory with variable substitution
 */

import path from 'path';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Template directory path
const TEMPLATE_DIR = path.join(__dirname, '..', 'templates', 'novel-template');

/**
 * Copy template directory to target path with variable substitution
 * @param {string} targetPath - Target directory path
 * @param {object} variables - Variables to substitute in template files
 * @returns {Promise<void>}
 */
export async function copyNovelTemplate(targetPath, variables = {}) {
  // Default variables
  const defaultVars = {
    NOVEL_NAME: '未命名小说',
    NOVEL_DISPLAY_NAME: '未命名小说',
    NOVEL_GENRE: '',
    NOVEL_DESCRIPTION: '',
    INIT_TIME: new Date().toISOString(),
    INIT_DATE: new Date().toISOString().split('T')[0],
    WRITING_STYLE: 'balanced',
    DAILY_TARGET: 3000,
    CHAPTER_TARGET: 3000,
    TOTAL_CHAPTERS: 100,
    TOTAL_VOLUMES: 10,
    CHAPTERS_PER_VOLUME: 10
  };

  const vars = { ...defaultVars, ...variables };

  // Check if target already has files
  try {
    const existingFiles = await fs.readdir(targetPath);
    if (existingFiles.length > 0) {
      console.log(`Target directory ${targetPath} is not empty, skipping template copy`);
      return { skipped: true, reason: 'Directory not empty' };
    }
  } catch {
    // Directory doesn't exist or is empty, continue
  }

  // Copy template directory recursively
  await copyDirectory(TEMPLATE_DIR, targetPath, vars);

  return { success: true };
}

/**
 * Recursively copy directory with variable substitution
 * @param {string} srcDir - Source directory
 * @param {string} destDir - Destination directory
 * @param {object} vars - Variables for substitution
 */
async function copyDirectory(srcDir, destDir, vars) {
  // Ensure destination directory exists
  await fs.mkdir(destDir, { recursive: true });

  // Read source directory
  const entries = await fs.readdir(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);

    if (entry.isDirectory()) {
      // Recursively copy subdirectory
      await copyDirectory(srcPath, destPath, vars);
    } else if (entry.isFile()) {
      // Copy file with variable substitution
      await copyFile(srcPath, destPath, vars);
    }
  }
}

/**
 * Copy file with variable substitution
 * @param {string} srcPath - Source file path
 * @param {string} destPath - Destination file path
 * @param {object} vars - Variables for substitution
 */
async function copyFile(srcPath, destPath, vars) {
  let content = await fs.readFile(srcPath, 'utf-8');

  // Substitute variables in format {{VARIABLE_NAME}}
  for (const [key, value] of Object.entries(vars)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    content = content.replace(regex, String(value));
  }

  await fs.writeFile(destPath, content, 'utf-8');
}

/**
 * Get template directory path
 * @returns {string} Template directory path
 */
export function getTemplatePath() {
  return TEMPLATE_DIR;
}

/**
 * Check if template directory exists
 * @returns {Promise<boolean>}
 */
export async function templateExists() {
  try {
    await fs.access(TEMPLATE_DIR);
    return true;
  } catch {
    return false;
  }
}

export default {
  copyNovelTemplate,
  getTemplatePath,
  templateExists
};
