/**
 * 数据迁移脚本：将 server/data/*.json 导入 SQLite
 * 运行方式：node migrate.js
 * 会把现有 3 部小说 + 角色 + 章纲 全部导入
 */
const fs = require('fs');
const path = require('path');

function readJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return []; }
}

// 导出迁移函数，供 index.js 自动调用
function runMigration(db) {
  const DATA_DIR = path.join(__dirname, 'data');
  const NOVELS_FILE = path.join(DATA_DIR, 'novels.json');
  const CHARS_FILE = path.join(DATA_DIR, 'characters.json');
  const OUTLINES_FILE = path.join(DATA_DIR, 'outlines.json');

  const existingCount = db.prepare('SELECT COUNT(*) as count FROM novels').get();
  if (existingCount.count > 0) {
    console.log(`⚠️  数据库中已有 ${existingCount.count} 部小说，跳过迁移。`);
    return;
  }

  const novels = readJSON(NOVELS_FILE);
  const chars = readJSON(CHARS_FILE);
  const outlines = readJSON(OUTLINES_FILE);

  if (novels.length === 0) {
    console.log('⚠️  没有找到小说数据，跳过迁移。');
    return;
  }

console.log(`📚 发现 ${novels.length} 部小说, ${chars.length} 个角色, ${outlines.length} 个章纲`);

// 创建默认用户（迁移后第一个注册的用户会绑定这些数据）
const MIGRATION_USER_ID = '00000000-0000-0000-0000-000000000001';
const insertUser = db.prepare(`
  INSERT OR IGNORE INTO users (id, email, username, password_hash, created_at)
  VALUES (?, ?, ?, ?, ?)
`);
insertUser.run(
  MIGRATION_USER_ID,
  'admin@novel-workbench.local',
  '管理员',
  // 密码: migrate-default (无法登录，只是占位)
  '$2b$10$placeholder_for_migration_only_do_not_use',
  new Date().toISOString()
);

// 导入小说
const insertNovel = db.prepare(`
  INSERT INTO novels (id, user_id, title, summary, setting, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const insertChar = db.prepare(`
  INSERT INTO characters (id, novel_id, name, role, description, traits, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const insertOutline = db.prepare(`
  INSERT INTO outlines (id, novel_id, chapter_num, title, summary, content, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const transaction = db.transaction(() => {
  for (const n of novels) {
    insertNovel.run(
      n.id,
      MIGRATION_USER_ID,
      n.title,
      n.summary || '',
      JSON.stringify(n.setting || {}),
      n.createdAt || new Date().toISOString(),
      n.updatedAt || new Date().toISOString()
    );
    console.log(`  ✅ 小说: ${n.title}`);
  }

  for (const c of chars) {
    insertChar.run(
      c.id,
      c.novelId,
      c.name,
      c.role || '',
      c.description || '',
      c.traits || '',
      c.createdAt || new Date().toISOString()
    );
  }
  console.log(`  ✅ 角色: ${chars.length} 个`);

  for (const o of outlines) {
    insertOutline.run(
      o.id,
      o.novelId,
      o.chapterNum || 1,
      o.title || '',
      o.summary || '',
      o.content || '',
      o.createdAt || new Date().toISOString()
    );
  }
  console.log(`  ✅ 章纲: ${outlines.length} 个`);
});

transaction();
  console.log(`🎉 已导入 ${novels.length} 部小说, ${chars.length} 个角色, ${outlines.length} 个章纲`);
}

// 直接运行脚本时执行
if (require.main === module) {
  const db = require('./db');
  runMigration(db);
  console.log('📌 数据已绑定到系统账号 (00000000-0000-...)');
}

module.exports = { runMigration };
