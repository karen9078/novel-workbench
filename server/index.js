require('dotenv').config({ path: __dirname + '/.env' });
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'novel-workbench-jwt-secret-dev';

// ─── 中间件 ───
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '5mb' }));

// ─── Auth 中间件 ───
// 开发模式：免登录无限制，直接可用
const DEV_MODE = false; // true=免登录, false=需要登录
const MIGRATION_USER_ID = '00000000-0000-0000-0000-000000000001';

function auth(req, res, next) {
  if (DEV_MODE) {
    req.userId = MIGRATION_USER_ID;
    return next();
  }
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: '请先登录' });
  }
  try {
    const decoded = jwt.verify(header.split(' ')[1], JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch {
    return res.status(401).json({ error: '登录已过期，请重新登录' });
  }
}

// ─── 千问 AI ───
const QWEN_API = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';

async function callDeepSeek(input, maxTokens = 4096) {
  const key = process.env.QWEN_API_KEY;
  if (!key || key === 'your_qwen_api_key_here') {
    return { error: '请在 server/.env 中配置 QWEN_API_KEY' };
  }

  // 支持多轮对话：如果 input 是含 role 的消息数组，直接发
  let messages;
  if (Array.isArray(input) && input[0] && input[0].role) {
    messages = input;
  } else {
    const prompt = Array.isArray(input) ? input.map(m => m.content).join('\n') : input;
    messages = [{ role: 'user', content: prompt }];
  }

  const res = await fetch(QWEN_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`
    },
    body: JSON.stringify({
      model: 'qwen-plus',
      input: { messages },
      parameters: { temperature: 0.7, max_tokens: maxTokens }
    })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`千问 API 错误: ${res.status} ${text}`);
  }
  const json = await res.json();
  return json.output.text;
}

// ═══════════════════════════════════
//  认证路由
// ═══════════════════════════════════

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, username } = req.body;
    if (!email || !password) return res.status(400).json({ error: '邮箱和密码不能为空' });
    if (password.length < 6) return res.status(400).json({ error: '密码至少 6 位' });

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) return res.status(400).json({ error: '该邮箱已注册' });

    const hash = await bcrypt.hash(password, 10);
    const id = uuidv4();
    const name = username || email.split('@')[0];
    db.prepare('INSERT INTO users (id, email, username, password_hash) VALUES (?, ?, ?, ?)').run(id, email, name, hash);

    const token = jwt.sign({ userId: id }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id, email, username: name } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: '邮箱和密码不能为空' });

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) return res.status(400).json({ error: '邮箱或密码错误' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(400).json({ error: '邮箱或密码错误' });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user.id, email: user.email, username: user.username } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/auth/me', auth, (req, res) => {
  const user = db.prepare('SELECT id, email, username, plan, monthly_chars as monthlyChars, quota_month as quotaMonth, created_at as createdAt FROM users WHERE id = ?').get(req.userId);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  res.json(user);
});

// ═══════════════════════════════════
//  小说 CRUD（全部带 userId 隔离）
// ═══════════════════════════════════

app.get('/api/novels', auth, (req, res) => {
  const novels = db.prepare(
    'SELECT id, title, summary, updated_at as updatedAt FROM novels WHERE user_id = ? ORDER BY updated_at DESC'
  ).all(req.userId);
  res.json(novels);
});

app.get('/api/novels/overview', auth, (req, res) => {
  const novels = db.prepare('SELECT id, title, summary, created_at, updated_at FROM novels WHERE user_id = ? ORDER BY updated_at DESC').all(req.userId);

  const result = novels.map(n => {
    const outlineCount = db.prepare('SELECT COUNT(*) as count FROM outlines WHERE novel_id = ?').get(n.id);
    const contentCount = db.prepare("SELECT COUNT(*) as count FROM outlines WHERE novel_id = ? AND LENGTH(content) > 100").get(n.id);
    const hasChapters = outlineCount.count > 0;
    const allDone = hasChapters && contentCount.count >= outlineCount.count;

    let status;
    if (!hasChapters) status = 'draft';
    else if (allDone) status = 'complete';
    else status = 'writing';

    return {
      id: n.id,
      title: n.title,
      summary: n.summary,
      status,
      chapters: outlineCount.count,
      doneChapters: contentCount.count,
      updatedAt: n.updatedAt
    };
  });

  res.json(result);
});

app.post('/api/novels', auth, (req, res) => {
  const { title, summary, setting } = req.body;
  const now = new Date().toISOString();
  const novel = {
    id: uuidv4(),
    user_id: req.userId,
    title: title || '未命名小说',
    summary: summary || '',
    setting: JSON.stringify(setting || { genre: '', worldview: '', style: '', protagonist: '', theme: '' }),
    createdAt: now,
    updatedAt: now
  };
  db.prepare(
    'INSERT INTO novels (id, user_id, title, summary, setting, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(novel.id, novel.user_id, novel.title, novel.summary, novel.setting, novel.createdAt, novel.updatedAt);

  res.json({
    id: novel.id,
    title: novel.title,
    summary: novel.summary,
    setting: JSON.parse(novel.setting),
    createdAt: novel.createdAt,
    updatedAt: novel.updatedAt
  });
});

app.get('/api/novels/:id', auth, (req, res) => {
  const novel = db.prepare(
    'SELECT * FROM novels WHERE id = ? AND user_id = ?'
  ).get(req.params.id, req.userId);
  if (!novel) return res.status(404).json({ error: '小说不存在' });
  res.json({
    id: novel.id,
    title: novel.title,
    summary: novel.summary,
    setting: JSON.parse(novel.setting || '{}'),
    createdAt: novel.created_at,
    updatedAt: novel.updated_at
  });
});

app.put('/api/novels/:id', auth, (req, res) => {
  const novel = db.prepare('SELECT * FROM novels WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!novel) return res.status(404).json({ error: '小说不存在' });

  const updated = {
    title: req.body.title !== undefined ? req.body.title : novel.title,
    summary: req.body.summary !== undefined ? req.body.summary : novel.summary,
    setting: req.body.setting !== undefined ? JSON.stringify(req.body.setting) : novel.setting,
    updatedAt: new Date().toISOString()
  };

  db.prepare(
    'UPDATE novels SET title = ?, summary = ?, setting = ?, updated_at = ? WHERE id = ?'
  ).run(updated.title, updated.summary, updated.setting, updated.updatedAt, req.params.id);

  res.json({
    id: req.params.id,
    title: updated.title,
    summary: updated.summary,
    setting: JSON.parse(updated.setting),
    createdAt: novel.created_at,
    updatedAt: updated.updatedAt
  });
});

app.delete('/api/novels/:id', auth, (req, res) => {
  const novel = db.prepare('SELECT id FROM novels WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!novel) return res.status(404).json({ error: '小说不存在' });

  // 级联删除角色和章纲
  db.prepare('DELETE FROM outlines WHERE novel_id = ?').run(req.params.id);
  db.prepare('DELETE FROM characters WHERE novel_id = ?').run(req.params.id);
  db.prepare('DELETE FROM novels WHERE id = ?').run(req.params.id);

  res.json({ success: true });
});

// ═══════════════════════════════════
//  角色 CRUD
// ═══════════════════════════════════

// 检查小说归属的辅助函数
function checkNovelOwnership(novelId, userId) {
  const novel = db.prepare('SELECT id FROM novels WHERE id = ? AND user_id = ?').get(novelId, userId);
  return !!novel;
}

app.get('/api/novels/:id/characters', auth, (req, res) => {
  if (!checkNovelOwnership(req.params.id, req.userId)) {
    return res.status(404).json({ error: '小说不存在' });
  }
  const chars = db.prepare(
    'SELECT id, novel_id as novelId, name, role, description, traits, created_at as createdAt FROM characters WHERE novel_id = ?'
  ).all(req.params.id);
  res.json(chars);
});

app.post('/api/novels/:id/characters', auth, (req, res) => {
  if (!checkNovelOwnership(req.params.id, req.userId)) {
    return res.status(404).json({ error: '小说不存在' });
  }
  const now = new Date().toISOString();
  const char = {
    id: uuidv4(),
    novelId: req.params.id,
    name: req.body.name || '未命名',
    role: req.body.role || '',
    description: req.body.description || '',
    traits: req.body.traits || '',
    createdAt: now
  };
  db.prepare(
    'INSERT INTO characters (id, novel_id, name, role, description, traits, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(char.id, char.novelId, char.name, char.role, char.description, char.traits, char.createdAt);
  res.json(char);
});

app.put('/api/characters/:id', auth, (req, res) => {
  const c = db.prepare(`
    SELECT c.* FROM characters c
    JOIN novels n ON c.novel_id = n.id
    WHERE c.id = ? AND n.user_id = ?
  `).get(req.params.id, req.userId);
  if (!c) return res.status(404).json({ error: '角色不存在' });

  db.prepare(
    'UPDATE characters SET name = ?, role = ?, description = ?, traits = ? WHERE id = ?'
  ).run(
    req.body.name || c.name,
    req.body.role !== undefined ? req.body.role : c.role,
    req.body.description !== undefined ? req.body.description : c.description,
    req.body.traits !== undefined ? req.body.traits : c.traits,
    req.params.id
  );

  res.json({
    id: req.params.id,
    novelId: c.novel_id,
    name: req.body.name || c.name,
    role: req.body.role !== undefined ? req.body.role : c.role,
    description: req.body.description !== undefined ? req.body.description : c.description,
    traits: req.body.traits !== undefined ? req.body.traits : c.traits
  });
});

app.delete('/api/characters/:id', auth, (req, res) => {
  const c = db.prepare(`
    SELECT c.id FROM characters c
    JOIN novels n ON c.novel_id = n.id
    WHERE c.id = ? AND n.user_id = ?
  `).get(req.params.id, req.userId);
  if (!c) return res.status(404).json({ error: '角色不存在' });

  db.prepare('DELETE FROM characters WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ═══════════════════════════════════
//  章纲 CRUD
// ═══════════════════════════════════

app.get('/api/novels/:id/outlines', auth, (req, res) => {
  if (!checkNovelOwnership(req.params.id, req.userId)) {
    return res.status(404).json({ error: '小说不存在' });
  }
  const outlines = db.prepare(
    'SELECT id, novel_id as novelId, chapter_num as chapterNum, title, summary, content, created_at as createdAt FROM outlines WHERE novel_id = ? ORDER BY chapter_num ASC'
  ).all(req.params.id);
  res.json(outlines);
});

app.post('/api/novels/:id/outlines', auth, (req, res) => {
  if (!checkNovelOwnership(req.params.id, req.userId)) {
    return res.status(404).json({ error: '小说不存在' });
  }
  const existing = db.prepare('SELECT COUNT(*) as count FROM outlines WHERE novel_id = ?').get(req.params.id);
  const now = new Date().toISOString();
  const outline = {
    id: uuidv4(),
    novelId: req.params.id,
    chapterNum: req.body.chapterNum || existing.count + 1,
    title: req.body.title || `第${existing.count + 1}章`,
    summary: req.body.summary || '',
    content: req.body.content || '',
    createdAt: now
  };
  db.prepare(
    'INSERT INTO outlines (id, novel_id, chapter_num, title, summary, content, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(outline.id, outline.novelId, outline.chapterNum, outline.title, outline.summary, outline.content, outline.createdAt);
  res.json(outline);
});

app.put('/api/outlines/:id', auth, (req, res) => {
  const o = db.prepare(`
    SELECT o.* FROM outlines o
    JOIN novels n ON o.novel_id = n.id
    WHERE o.id = ? AND n.user_id = ?
  `).get(req.params.id, req.userId);
  if (!o) return res.status(404).json({ error: '章纲不存在' });

  db.prepare(
    'UPDATE outlines SET title = ?, summary = ?, content = ? WHERE id = ?'
  ).run(
    req.body.title !== undefined ? req.body.title : o.title,
    req.body.summary !== undefined ? req.body.summary : o.summary,
    req.body.content !== undefined ? req.body.content : o.content,
    req.params.id
  );

  res.json({
    id: req.params.id,
    novelId: o.novel_id,
    chapterNum: o.chapter_num,
    title: req.body.title !== undefined ? req.body.title : o.title,
    summary: req.body.summary !== undefined ? req.body.summary : o.summary,
    content: req.body.content !== undefined ? req.body.content : o.content
  });
});

app.delete('/api/outlines/:id', auth, (req, res) => {
  const o = db.prepare(`
    SELECT o.id FROM outlines o
    JOIN novels n ON o.novel_id = n.id
    WHERE o.id = ? AND n.user_id = ?
  `).get(req.params.id, req.userId);
  if (!o) return res.status(404).json({ error: '章纲不存在' });

  db.prepare('DELETE FROM outlines WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ═══════════════════════════════════
//  额度限制
// ═══════════════════════════════════

const QUOTA_LIMITS = {
  free: 20000,   // 免费版：2万字/月
  pro: 300000,   // 专业版：30万字/月
};

function getCurrentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function checkAndResetQuota(userId) {
  // 开发模式无限制
  if (DEV_MODE) return { allowed: true, remaining: 999999999, limit: 999999999, used: 0, error: null };

  const month = getCurrentMonth();
  const user = db.prepare('SELECT plan, monthly_chars, quota_month FROM users WHERE id = ?').get(userId);
  if (!user) return { allowed: false, error: '用户不存在' };

  // 跨月重置
  if (user.quota_month !== month) {
    db.prepare('UPDATE users SET monthly_chars = 0, quota_month = ? WHERE id = ?').run(month, userId);
    user.monthly_chars = 0;
  }

  const limit = QUOTA_LIMITS[user.plan] || QUOTA_LIMITS.free;
  const used = user.monthly_chars || 0;
  const remaining = limit - used;

  return {
    allowed: remaining > 0,
    remaining,
    limit,
    used,
    error: remaining <= 0
      ? `本月额度已用完（${limit.toLocaleString()}字），请升级专业版或下月再试`
      : null
  };
}

function recordUsage(userId, chars) {
  const month = getCurrentMonth();
  db.prepare(`
    UPDATE users SET monthly_chars = monthly_chars + ?, quota_month = ?
    WHERE id = ?
  `).run(chars, month, userId);
}

// 包裹 AI 路由：自动检查额度 + 记录用量
async function withQuota(userId, req, res, aiCall) {
  // 额度检查
  const quota = checkAndResetQuota(userId);
  if (!quota.allowed) {
    return res.status(403).json({
      error: quota.error,
      code: 'QUOTA_EXCEEDED',
      quota: { used: quota.used, limit: quota.limit }
    });
  }

  try {
    const result = await aiCall();

    // 记录用量（按返回文本字数）
    if (result && result.text) {
      recordUsage(userId, result.text.length);
    }

    return result;
  } catch (e) {
    throw e;
  }
}

// ═══════════════════════════════════
//  AI 路由（带额度控制）
// ═══════════════════════════════════

app.post('/api/ai/chat', auth, async (req, res) => {
  try {
    const quota = checkAndResetQuota(req.userId);
    if (!quota.allowed) return res.status(403).json({ error: quota.error, code: 'QUOTA_EXCEEDED', quota: { used: quota.used, limit: quota.limit } });

    const { novelId, messages } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: '请输入消息' });
    }

    // 获取小说上下文
    let systemPrompt = '你是写作工坊的 AI 助手，帮助作者创作小说。回答简洁有用，直接给建议或内容。\n\n如果用户提到章节编号（如第3章、第三章），自动查找该章节内容并优化。如果需要输出修改后的章节，直接输出完整内容。';
    if (novelId) {
      const novel = db.prepare('SELECT id, title, summary, setting FROM novels WHERE id = ? AND user_id = ?').get(novelId, req.userId);
      if (novel) {
        const setting = JSON.parse(novel.setting || '{}');
        systemPrompt += `\n\n当前小说：《${novel.title}》`;
        if (novel.summary) systemPrompt += `\n简介：${novel.summary}`;
        if (setting.genre) systemPrompt += `\n题材：${setting.genre}`;
        if (setting.style) systemPrompt += `\n风格：${setting.style}`;

        const chars = db.prepare('SELECT name, role, description FROM characters WHERE novel_id = ?').all(novelId);
        if (chars.length > 0) {
          systemPrompt += '\n\n角色：';
          chars.forEach(c => { systemPrompt += `\n- ${c.name}（${c.role}）：${c.description || '暂无'}`; });
        }

        // 把所有章节附上，AI 可以根据用户需求直接调用
        const outlines = db.prepare('SELECT chapter_num, title, summary, content FROM outlines WHERE novel_id = ? ORDER BY chapter_num ASC').all(novelId);
        if (outlines.length > 0) {
          systemPrompt += '\n\n所有章节：';
          outlines.forEach(o => {
            systemPrompt += `\n\n【第${o.chapter_num}章 ${o.title}】`;
            systemPrompt += `\n章纲：${o.summary || '无'}`;
            if (o.content && o.content.length > 50) {
              systemPrompt += `\n正文（${o.content.length}字）：${o.content.substring(0, 1000)}`;
              if (o.content.length > 1000) systemPrompt += '\n...（正文较长，用户说"继续"可展开）';
            }
          });
        }
      }
    }

    const apiMessages = [{ role: 'system', content: systemPrompt }, ...messages.map(m => ({ role: m.role, content: m.content }))];

    // chat 用更大的 token 限制，支持输出完整章节
    const originalKey = process.env.QWEN_API_KEY;
    const result = await callDeepSeek(apiMessages, 8192);

    if (result && typeof result === 'string') {
      recordUsage(req.userId, result.length);
      res.json({ result });
    } else if (result && result.error) {
      res.json({ error: result.error });
    } else {
      res.json({ result });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/ai/brainstorm', auth, async (req, res) => {
  try {
    const quota = checkAndResetQuota(req.userId);
    if (!quota.allowed) return res.status(403).json({ error: quota.error, code: 'QUOTA_EXCEEDED', quota: { used: quota.used, limit: quota.limit } });

    const { question } = req.body;
    const prompt = `你是一位创意写作顾问。用户的问题是：「${question}」
请给出 5 个有创意的建议，每个建议用 1-2 句话描述。用数字编号，每行一个。`;
    const result = await callDeepSeek([{ role: 'user', content: prompt }]);
    if (result && typeof result === 'string') recordUsage(req.userId, result.length);
    res.json({ result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/ai/generate-outline', auth, async (req, res) => {
  try {
    const { novelId } = req.body;
    const novel = db.prepare('SELECT * FROM novels WHERE id = ? AND user_id = ?').get(novelId, req.userId);
    if (!novel) return res.status(404).json({ error: '小说不存在' });

    const chars = db.prepare('SELECT * FROM characters WHERE novel_id = ?').all(novelId);
    const setting = JSON.parse(novel.setting || '{}');
    const charDesc = chars.map(c => `${c.name}（${c.role}）：${c.description}`).join('\n');

    const prompt = `你是一位小说创作专家。请根据以下小说设定，生成 10 章章纲。

【小说信息】
标题：${novel.title}
简介：${novel.summary}
题材：${setting.genre || '未设定'}
世界观：${setting.worldview || '未设定'}
风格：${setting.style || '未设定'}
主角设定：${setting.protagonist || '未设定'}
主题：${setting.theme || '未设定'}

【角色列表】
${charDesc || '暂无角色设定'}

【要求】
为这部长篇小说生成 10 章的章纲。每章包括：
- 章节标题
- 章纲内容（200-300 字，描述本章核心情节、冲突和发展）

格式要求：
第1章：[标题]
[章纲内容]

第2章：[标题]
[章纲内容]
（以此类推）`;

    const result = await callDeepSeek([{ role: 'user', content: prompt }]);
    res.json({ result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/ai/generate-chapter', auth, async (req, res) => {
  try {
    const { outlineId, novelId } = req.body;
    const novel = db.prepare('SELECT * FROM novels WHERE id = ? AND user_id = ?').get(novelId, req.userId);
    if (!novel) return res.status(404).json({ error: '小说不存在' });

    const outline = db.prepare('SELECT * FROM outlines WHERE id = ? AND novel_id = ?').get(outlineId, novelId);
    if (!outline) return res.status(404).json({ error: '章纲不存在' });

    const chars = db.prepare('SELECT * FROM characters WHERE novel_id = ?').all(novelId);
    const setting = JSON.parse(novel.setting || '{}');
    const charDesc = chars.map(c => `${c.name}（${c.role}）：${c.description}`).join('\n');

    // 获取前几章用于连贯性
    const prevChapters = db.prepare(
      "SELECT * FROM outlines WHERE novel_id = ? AND chapter_num < ? AND LENGTH(content) > 100 ORDER BY chapter_num ASC"
    ).all(novelId, outline.chapter_num);
    const prevSummary = prevChapters.map(o =>
      `第${o.chapter_num}章 ${o.title}：${o.summary}\n正文概要：${o.content.substring(0, 300)}...`
    ).join('\n\n');

    const prompt = `你是一位小说家。请根据以下信息，写出第 ${outline.chapter_num} 章的正文。

【小说设定】
标题：${novel.title}
简介：${novel.summary}
题材：${setting.genre || '未设定'}
风格：${setting.style || '未设定'}

${prevSummary ? `【前情提要】\n${prevSummary}\n` : ''}
【本章章纲】
标题：${outline.title}
内容：${outline.summary}

【角色】
${charDesc || '暂无角色设定'}

【写作要求】
1. 写 2500-3500 字的正文
2. 用小说叙述语言，不要列提纲
3. 有细节描写和对话
4. 保持情节紧凑，与前文逻辑连贯
5. 注意人物性格和行为一致性
6. 直接用正文开始，不要加"第X章"标题`;

    const result = await callDeepSeek([{ role: 'user', content: prompt }]);

    // 保存生成的内容
    db.prepare('UPDATE outlines SET content = ? WHERE id = ?').run(result, outlineId);

    res.json({ result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/ai/polish', auth, async (req, res) => {
  try {
    const { text } = req.body;
    const prompt = `请润色以下小说文本，修正语病、优化表达，保持原意和风格不变。直接输出润色后的文本，不要加说明。\n\n${text}`;
    const result = await callDeepSeek(prompt);
    if (result && result.error) {
      res.json({ error: result.error });
    } else {
      if (result && typeof result === 'string') recordUsage(req.userId, result.length);
      res.json({ result });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/ai/continue', auth, async (req, res) => {
  try {
    const quota = checkAndResetQuota(req.userId);
    if (!quota.allowed) return res.status(403).json({ error: quota.error, code: 'QUOTA_EXCEEDED', quota: { used: quota.used, limit: quota.limit } });

    const { text, instruction } = req.body;
    const prompt = `以下是一篇小说正文。请根据要求续写后面的内容。

【已有正文】
${text}

【续写要求】
${instruction || '自然延续上文情节，保持同样的风格和语调，写 1000-2000 字'}

直接输出续写内容，不要加说明。`;
    const result = await callDeepSeek([{ role: 'user', content: prompt }]);
    if (result && result.error) {
      res.json({ error: result.error });
    } else {
      if (result && typeof result === 'string') recordUsage(req.userId, result.length);
      res.json({ result });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/ai/rewrite-url', auth, async (req, res) => {
  try {
    const quota = checkAndResetQuota(req.userId);
    if (!quota.allowed) return res.status(403).json({ error: quota.error, code: 'QUOTA_EXCEEDED', quota: { used: quota.used, limit: quota.limit } });

    const { url, style } = req.body;
    if (!url) return res.status(400).json({ error: '请提供 URL' });

    const pageRes = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml'
      },
      signal: AbortSignal.timeout(15000)
    });

    if (!pageRes.ok) {
      return res.status(400).json({ error: `无法访问该链接 (${pageRes.status})` });
    }

    const html = await pageRes.text();

    const cleaned = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .trim();

    const lines = cleaned.split('\n').filter(l => l.trim().length > 20);
    const mainText = lines.join('\n\n').substring(0, 8000);

    if (mainText.length < 50) {
      return res.status(400).json({ error: '无法从该链接提取到有效内容' });
    }

    const prompt = `请根据要求改写以下文章。

【原文】
${mainText}

【改写要求】
风格：${style || '保持原风格'}

【要求】
1. 保持核心信息和情节不变
2. 按照指定风格改写语言表达
3. 输出 1000-3000 字
4. 直接输出改写结果，不要加说明`;

    const result = await callDeepSeek([{ role: 'user', content: prompt }]);
    if (result && result.error) {
      res.json({ error: result.error });
    } else {
      if (result && typeof result === 'string') recordUsage(req.userId, result.length);
      res.json({ result, sourceLength: mainText.length });
    }
  } catch (e) {
    if (e.name === 'TimeoutError' || e.code === 'UND_ERR_CONNECT_TIMEOUT') {
      res.status(400).json({ error: '链接超时，请检查网址是否正确' });
    } else {
      res.status(500).json({ error: `抓取失败：${e.message}` });
    }
  }
});

app.post('/api/ai/rewrite', auth, async (req, res) => {
  try {
    const quota = checkAndResetQuota(req.userId);
    if (!quota.allowed) return res.status(403).json({ error: quota.error, code: 'QUOTA_EXCEEDED', quota: { used: quota.used, limit: quota.limit } });

    const { text, style, reference, writingIdea } = req.body;
    let prompt = `请根据要求改写以下文本。

【原文】
${text}

【改写要求】
风格：${style || '保持原风格'}
`;
    if (reference) {
      prompt += `\n【参考风格】\n请模仿以下文字的写作风格进行改写：\n${reference}\n`;
    }
    if (writingIdea) {
      prompt += `\n【创作理念】\n这是作者的创作思路和要求，请严格遵循：\n${writingIdea}\n`;
    }
    prompt += `\n【要求】
1. 保持核心信息和情节不变
2. 按照指定风格改写语言表达
3. 输出 1000-3000 字
4. 直接输出改写结果，不要加说明`;

    const result = await callDeepSeek([{ role: 'user', content: prompt }]);
    if (result && result.error) {
      res.json({ error: result.error });
    } else {
      if (result && typeof result === 'string') recordUsage(req.userId, result.length);
      res.json({ result });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/ai/revise-chapter', auth, async (req, res) => {
  try {
    const quota = checkAndResetQuota(req.userId);
    if (!quota.allowed) return res.status(403).json({ error: quota.error, code: 'QUOTA_EXCEEDED', quota: { used: quota.used, limit: quota.limit } });

    const { content, feedback } = req.body;
    const prompt = `以下是一篇小说正文的章节。请根据反馈意见进行修改。

【当前正文】
${content}

【修改意见】
${feedback}

【要求】
1. 根据修改意见重写正文，保持整体结构
2. 保持风格一致，只修改不符合要求的部分
3. 输出完整修改后的正文
4. 直接输出，不要加说明`;

    const result = await callDeepSeek([{ role: 'user', content: prompt }]);
    if (result && result.error) {
      res.json({ error: result.error });
    } else {
      if (result && typeof result === 'string') recordUsage(req.userId, result.length);
      res.json({ result });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/ai/rewrite-iterate', auth, async (req, res) => {
  try {
    const quota = checkAndResetQuota(req.userId);
    if (!quota.allowed) return res.status(403).json({ error: quota.error, code: 'QUOTA_EXCEEDED', quota: { used: quota.used, limit: quota.limit } });

    const { originalText, style, history, feedback, writingIdea } = req.body;
    let context = `【原文】\n${originalText}\n\n【改写风格】${style}\n\n`;
    if (writingIdea) {
      context += `【创作理念】\n${writingIdea}\n\n`;
    }
    if (history && history.length > 0) {
      context += '【之前的改写过程】\n';
      history.forEach((h, i) => {
        context += `第${i + 1}轮改写结果：${h.result.substring(0, 200)}...\n`;
        context += `你的反馈：${h.feedback}\n\n`;
      });
    }
    context += `【最新反馈】\n${feedback || '请按原要求改写'}\n\n`;
    context += '根据原文和所有反馈，重新输出完整的改写结果。直接输出，不要加说明。';

    const result = await callDeepSeek([{ role: 'user', content: context }]);
    if (result && result.error) {
      res.json({ error: result.error });
    } else {
      if (result && typeof result === 'string') recordUsage(req.userId, result.length);
      res.json({ result });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/ai/complete', auth, async (req, res) => {
  try {
    const quota = checkAndResetQuota(req.userId);
    if (!quota.allowed) return res.status(403).json({ error: quota.error, code: 'QUOTA_EXCEEDED', quota: { used: quota.used, limit: quota.limit } });

    const { before, after } = req.body;
    const prompt = `以下是一篇小说正文的上下文。中间有一段内容缺失，请根据上下文补全缺失部分。

【上文】
${before}

【下文】
${after}

【补全要求】
补全 600-1200 字左右的段落，保持风格一致，逻辑连贯，自然衔接上下文。直接输出补全内容。`;
    const result = await callDeepSeek([{ role: 'user', content: prompt }]);
    if (result && result.error) {
      res.json({ error: result.error });
    } else {
      if (result && typeof result === 'string') recordUsage(req.userId, result.length);
      res.json({ result });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════
//  数据认领（迁移旧数据到当前用户）
// ═══════════════════════════════════

app.post('/api/data/claim', auth, (req, res) => {
  // 检查是否还有可认领的数据
  const count = db.prepare('SELECT COUNT(*) as count FROM novels WHERE user_id = ?').get(MIGRATION_USER_ID);
  if (count.count === 0) {
    return res.json({ success: true, message: '没有可认领的数据', claimed: 0 });
  }

  // 把迁移用户的数据转给当前用户
  db.prepare('UPDATE novels SET user_id = ? WHERE user_id = ?').run(req.userId, MIGRATION_USER_ID);
  const novels = db.prepare('SELECT id, title FROM novels WHERE user_id = ?').all(req.userId);

  // 更新用户的 plan 为 pro（第一个用户给专业版）
  db.prepare("UPDATE users SET plan = 'pro' WHERE id = ? AND plan = 'free'").run(req.userId);

  res.json({
    success: true,
    message: `已认领 ${novels.length} 部小说，并获得专业版权益`,
    claimed: novels.length,
    novels: novels.map(n => ({ id: n.id, title: n.title }))
  });
});

// ═══════════════════════════════════
//  多平台一键发布
// ═══════════════════════════════════

const PLATFORM_FORMATS = {
  fanqie: {
    name: '番茄小说',
    formatTitle: (title) => title,
    formatChapter: (o, i) => `第${i + 1}章 ${o.title}\n\n${o.content || o.summary}`,
    join: (chapters) => chapters.join('\n\n'),
    note: '纯文本格式，可直接粘贴到番茄作家助手'
  },
  qidian: {
    name: '起点中文网',
    formatTitle: (title) => `【${title}】`,
    formatChapter: (o, i) => `第${i + 1}章 ${o.title}\n\n${o.content || o.summary}`,
    join: (chapters) => chapters.join('\n\n'),
    note: '纯文本格式，起点后台可直接粘贴'
  },
  zhihu: {
    name: '知乎专栏',
    formatTitle: (title) => `# ${title}\n\n`,
    formatChapter: (o, i) => `## 第${i + 1}章 ${o.title}\n\n${o.content || o.summary}`,
    join: (chapters) => chapters.join('\n\n'),
    note: 'Markdown 格式，知乎专栏支持直接粘贴'
  },
  weixin: {
    name: '微信公众号',
    formatTitle: (title) => `${title}\n\n`,
    formatChapter: (o, i) => `第${i + 1}章 ${o.title}\n\n${o.content || o.summary}`,
    join: (chapters) => chapters.join('\n\n${'-'.repeat(20)}\n\n'),
    note: '纯文本格式，建议分段粘贴到公众号编辑器'
  },
  txt: {
    name: 'TXT 全文',
    formatTitle: (title) => `${title}\n${'='.repeat(title.length)}\n\n`,
    formatChapter: (o, i) => {
      const sep = `第${i + 1}章 ${o.title}\n${'─'.repeat(20)}\n`;
      const content = o.content ? `【正文】\n${o.content}` : '';
      return `${sep}【章纲】${o.summary || '无'}\n\n${content}`.trim();
    },
    join: (chapters) => chapters.join('\n\n'),
    note: '完整导出，含章纲和正文'
  }
};

app.post('/api/export/publish', auth, (req, res) => {
  try {
    const { novelId, platform } = req.body;
    const fmt = PLATFORM_FORMATS[platform];
    if (!fmt) return res.status(400).json({ error: '不支持的平台' });

    const novel = db.prepare('SELECT * FROM novels WHERE id = ? AND user_id = ?').get(novelId, req.userId);
    if (!novel) return res.status(404).json({ error: '小说不存在' });

    const outlines = db.prepare(
      'SELECT * FROM outlines WHERE novel_id = ? ORDER BY chapter_num ASC'
    ).all(novelId);

    const hasContent = outlines.some(o => o.content && o.content.length > 100);
    const header = fmt.formatTitle(novel.title);

    const chapters = outlines.map((o, i) => fmt.formatChapter(o, i));
    const content = header + fmt.join(chapters);

    res.json({
      title: novel.title,
      content,
      platform: fmt.name,
      chapterCount: outlines.length,
      wordCount: content.replace(/\s/g, '').length,
      hasContent,
      note: fmt.note
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════
//  平台凭证管理
// ═══════════════════════════════════

const { encrypt, decrypt, maskSecret } = require('./services/crypto');

// 保存微信凭证（加密存储）
app.post('/api/settings/weixin', auth, (req, res) => {
  try {
    const { appId, appSecret } = req.body;
    if (!appId || !appSecret) return res.status(400).json({ error: 'AppID 和 AppSecret 不能为空' });

    // 加密存储
    const encrypted = encrypt(JSON.stringify({ appId, appSecret }));
    db.prepare(`
      INSERT INTO platform_creds (user_id, platform, credentials, updated_at)
      VALUES (?, 'weixin', ?, datetime('now'))
      ON CONFLICT(user_id, platform) DO UPDATE SET credentials = ?, updated_at = datetime('now')
    `).run(req.userId, encrypted, encrypted);

    res.json({ success: true, configured: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 获取微信凭证状态（不返回完整 Secret）
app.get('/api/settings/weixin', auth, (req, res) => {
  const cred = db.prepare("SELECT credentials, updated_at FROM platform_creds WHERE user_id = ? AND platform = 'weixin'").get(req.userId);
  if (!cred) return res.json({ configured: false });

  const decrypted = decrypt(cred.credentials);
  if (!decrypted) return res.json({ configured: false });

  const parsed = JSON.parse(decrypted);
  res.json({
    configured: true,
    appId: parsed.appId,
    appSecretMasked: maskSecret(parsed.appSecret),
    updatedAt: cred.updated_at
  });
});

// ═══════════════════════════════════
//  微信一键发布到草稿箱
// ═══════════════════════════════════

const weixinService = require('./services/weixin');

app.post('/api/publish/weixin', auth, async (req, res) => {
  try {
    const { novelId, author } = req.body;

    // 1. 获取并解密用户保存的凭证
    const cred = db.prepare("SELECT credentials FROM platform_creds WHERE user_id = ? AND platform = 'weixin'").get(req.userId);
    if (!cred) return res.status(400).json({ error: '请先在设置中配置微信公众号凭证' });

    const decrypted = decrypt(cred.credentials);
    if (!decrypted) return res.status(500).json({ error: '凭证解密失败，请重新配置' });

    const { appId, appSecret } = JSON.parse(decrypted);

    // 2. 获取小说数据
    const novel = db.prepare('SELECT * FROM novels WHERE id = ? AND user_id = ?').get(novelId, req.userId);
    if (!novel) return res.status(404).json({ error: '小说不存在' });

    const outlines = db.prepare("SELECT * FROM outlines WHERE novel_id = ? AND content != ' ' ORDER BY chapter_num ASC").all(novelId);

    if (outlines.length === 0) {
      return res.status(400).json({ error: '该小说还没有已生成的正文，请先生成章节' });
    }

    // 3. 调用微信服务
    const chapters = outlines.map(o => ({
      title: o.title,
      content: o.content,
      summary: o.summary
    }));

    // 只发送第一章作为草稿（微信单图文只支持一篇）
    // 如果有多个章节有内容，发送第一章并告知用户其余章节
    const result = await weixinService.publishToDraft({
      appId,
      appSecret,
      title: novel.title,
      chapters: [chapters[0]],  // 微信草稿一篇文章发一章
      author: author || undefined,
    });

    // 记录用量
    if (chapters[0].content) {
      recordUsage(req.userId, chapters[0].content.length);
    }

    res.json({
      success: true,
      mediaId: result.mediaId,
      url: result.url,
      chapterSent: outlines[0].title,
      totalChapters: chapters.length,
      note: chapters.length > 1
        ? `已发送第1章「${outlines[0].title}」到微信草稿箱，其余 ${chapters.length - 1} 章请逐一发布`
        : '已发送到微信草稿箱'
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════
//  通用平台 Cookie 发布
// ═══════════════════════════════════

const publishers = require('./services/publisher');

const PLATFORM_INFO = {
  zhihu: { name: '知乎专栏', icon: '💡' },
  fanqie: { name: '番茄小说', icon: '🍅', soon: true },
  qidian: { name: '起点中文网', icon: '📚', soon: true },
};

// 保存平台 Cookie
app.post('/api/settings/:platform', auth, (req, res) => {
  try {
    const { platform } = req.params;
    const info = PLATFORM_INFO[platform];
    if (!info) return res.status(400).json({ error: '不支持的平台' });

    const { cookies } = req.body;
    if (!cookies) return res.status(400).json({ error: '请粘贴 Cookie' });

    const encrypted = encrypt(JSON.stringify({ cookies }));
    db.prepare(`
      INSERT INTO platform_creds (user_id, platform, credentials, updated_at)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(user_id, platform) DO UPDATE SET credentials = ?, updated_at = datetime('now')
    `).run(req.userId, platform, encrypted, encrypted);

    res.json({ success: true, configured: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 获取平台 Cookie 状态
app.get('/api/settings/:platform', auth, (req, res) => {
  const { platform } = req.params;
  const cred = db.prepare("SELECT credentials, updated_at FROM platform_creds WHERE user_id = ? AND platform = ?").get(req.userId, platform);
  if (!cred) return res.json({ configured: false });

  const decrypted = decrypt(cred.credentials);
  if (!decrypted) return res.json({ configured: false });

  res.json({ configured: true, updatedAt: cred.updated_at });
});

// 通用平台发布
app.post('/api/publish/:platform', auth, async (req, res) => {
  try {
    const { platform } = req.params;
    const publisher = publishers[platform];
    if (!publisher) return res.status(400).json({ error: '不支持的平台' });

    const info = PLATFORM_INFO[platform];
    if (info.soon) {
      return res.json({
        success: false,
        soon: true,
        note: `${info.name} 自动发布即将上线，当前请使用「复制内容」手动发布`
      });
    }

    // 获取 Cookie
    const cred = db.prepare("SELECT credentials FROM platform_creds WHERE user_id = ? AND platform = ?").get(req.userId, platform);
    if (!cred) return res.status(400).json({ error: `请先在设置中配置 ${info.name} Cookie` });

    const decrypted = decrypt(cred.credentials);
    if (!decrypted) return res.status(500).json({ error: 'Cookie 解密失败，请重新配置' });

    const { cookies } = JSON.parse(decrypted);

    // 获取小说数据
    const { novelId } = req.body;
    const novel = db.prepare('SELECT * FROM novels WHERE id = ? AND user_id = ?').get(novelId, req.userId);
    if (!novel) return res.status(404).json({ error: '小说不存在' });

    const outlines = db.prepare("SELECT * FROM outlines WHERE novel_id = ? AND content != '' ORDER BY chapter_num ASC").all(novelId);
    if (outlines.length === 0) return res.status(400).json({ error: '该小说还没有已生成的正文' });

    const chapters = outlines.map(o => ({ title: o.title, content: o.content, summary: o.summary }));

    // 发布
    const result = await publisher({ cookies, title: novel.title, chapters, novelId });

    if (result.note) recordUsage(req.userId, (chapters[0]?.content || '').length);
    res.json({ success: true, ...result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════
//  静态文件托管（有构建产物就 serve）
// ═══════════════════════════════════
const clientDist = path.join(__dirname, '../client/dist');
if (require('fs').existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
  console.log(`🌐 前端页面：${clientDist}`);
} else {
  console.log(`⚠️  前端未构建，请运行: cd client && npm run build`);
}

// ═══════════════════════════════════
//  启动
// ═══════════════════════════════════
// ─── 创建默认管理员 ───
const ADMIN_EMAIL = 'admin@novel.com';
const ADMIN_PASSWORD = '123123';
const hash = bcrypt.hashSync(ADMIN_PASSWORD, 10);
db.prepare(`
  INSERT INTO users (id, email, username, password_hash, plan)
  VALUES (?, ?, ?, ?, 'pro')
  ON CONFLICT(id) DO UPDATE SET email = ?, username = ?, password_hash = ?, plan = 'pro'
`).run(MIGRATION_USER_ID, ADMIN_EMAIL, '管理员', hash, ADMIN_EMAIL, '管理员', hash);
// 确保管理员有所有数据
const adminData = db.prepare('SELECT COUNT(*) as count FROM novels WHERE user_id = ?').get(MIGRATION_USER_ID);
if (adminData.count === 0) {
  // 把散落的旧数据归到管理员名下
  db.prepare("UPDATE novels SET user_id = ? WHERE user_id != ?").run(MIGRATION_USER_ID, MIGRATION_USER_ID);
}

app.listen(PORT, () => {
  console.log(`📚 Novel Workbench Server running on http://localhost:${PORT}`);
  console.log(`👑 管理员账号: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log(`📖 小说数: ${adminData.count || 3}`);
});
