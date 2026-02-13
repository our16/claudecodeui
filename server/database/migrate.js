/**
 * Database Migration Runner
 *
 * 运行数据库迁移脚本
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 获取数据库路径
const getDatabasePath = () => {
  return process.env.DATABASE_PATH || path.join(__dirname, 'auth.db');
};

// 运行迁移文件
const runMigrationFile = (db, migrationFile) => {
  try {
    const sql = fs.readFileSync(migrationFile, 'utf-8');
    db.exec(sql);
    console.log(`Migration ${path.basename(migrationFile)} completed successfully`);
    return true;
  } catch (error) {
    console.error(`Migration ${path.basename(migrationFile)} failed:`, error.message);
    return false;
  }
};

// 主迁移函数
export const runNovelMigrations = (db) => {
  console.log('Running Novel Platform migrations...');

  const migrationsDir = path.join(__dirname, 'migrations');

  // 确保迁移目录存在
  if (!fs.existsSync(migrationsDir)) {
    console.log('No migrations directory found, skipping');
    return;
  }

  // 获取所有迁移文件
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  // 创建迁移记录表（如果不存在）
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      migration_name TEXT UNIQUE NOT NULL,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 获取已应用的迁移
  const appliedMigrations = db.prepare(`
    SELECT migration_name FROM schema_migrations
  `).all().map(row => row.migration_name);

  // 运行未应用的迁移
  for (const file of migrationFiles) {
    const migrationName = path.basename(file, '.sql');
    if (appliedMigrations.includes(migrationName)) {
      console.log(`Migration ${migrationName} already applied, skipping`);
      continue;
    }

    const filePath = path.join(migrationsDir, file);
    console.log(`Applying migration: ${migrationName}`);

    if (runMigrationFile(db, filePath)) {
      // 记录迁移
      db.prepare(`
        INSERT INTO schema_migrations (migration_name)
        VALUES (?)
      `).run(migrationName);
    }
  }

  console.log('Novel Platform migrations completed');
};

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  const dbPath = getDatabasePath();
  console.log(`Using database: ${dbPath}`);

  const db = new Database(dbPath);
  try {
    runNovelMigrations(db);
  } finally {
    db.close();
  }
}
