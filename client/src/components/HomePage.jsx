import React, { useState, useMemo } from 'react';

const GENRES = ['言情', '悬疑', '惊悚', '科幻', '武侠', '脑洞', '现实情感', '奇幻'];
const AUDIENCES = ['男频', '女频', '全频'];

const QUICK_TOOLS = [
  { id: 'chat', icon: '💬', label: 'AI 对话改文', desc: '与AI对话，边聊边改章节内容', color: '#c9a84c' },
  { id: 'rewrite', icon: '🔄', label: '改写润色', desc: '一键改写段落，优化文风和表达', color: '#e67e22' },
  { id: 'outlines', icon: '✍️', label: '续写补全', desc: 'AI根据上下文续写章节', color: '#3498db' },
  { id: 'convert', icon: '🎬', label: '内容转换', desc: '转为剧本/漫画/说书/短视频等多种格式', color: '#9b59b6' },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 6) return '夜深了';
  if (h < 9) return '早上好';
  if (h < 12) return '上午好';
  if (h < 14) return '中午好';
  if (h < 18) return '下午好';
  return '晚上好';
}

export default function HomePage({
  novels, user,
  onOpenNovel, onQuickCreate,
  idea, setIdea, selectedGenre, setSelectedGenre,
  audience, setAudience, creating,
  onToolClick,
}) {
  const [activeTab, setActiveTab] = useState('all');

  const totalWords = useMemo(() => {
    return novels.reduce((sum, n) => sum + (n.totalWords || 0), 0);
  }, [novels]);

  const recentNovels = useMemo(() => {
    let filtered = [...novels];
    if (activeTab === 'writing') filtered = novels.filter(n => n.status === 'writing');
    else if (activeTab === 'draft') filtered = novels.filter(n => n.status === 'draft');
    else if (activeTab === 'complete') filtered = novels.filter(n => n.status === 'complete');
    return filtered.slice(0, 6);
  }, [novels, activeTab]);

  const stats = [
    { icon: '📚', label: '作品数', value: novels.length, color: '#c9a84c' },
    { icon: '📝', label: '总章节', value: novels.reduce((s, n) => s + (n.chapters || 0), 0), color: '#e67e22' },
    { icon: '✍️', label: '总字数', value: totalWords > 10000 ? `${(totalWords / 10000).toFixed(1)}万` : totalWords, color: '#3498db' },
    { icon: '📖', label: '进行中', value: novels.filter(n => n.status === 'writing').length, color: '#27ae60' },
  ];

  const hasNovels = novels.length > 0;

  return (
    <div className="homepage">
      {/* 欢迎区 */}
      <div className="homepage-welcome">
        <div className="homepage-welcome-text">
          <h1>{getGreeting()}，{user?.username || '创作者'} 👋</h1>
          <p>
            {!hasNovels
              ? '欢迎来到写作工坊！用一句话开始你的第一部小说吧 ✨'
              : `你有 ${novels.filter(n => n.status === 'writing').length} 部作品正在创作中，继续加油 💪`}
          </p>
        </div>
        <div className="homepage-welcome-emoji">✍️</div>
      </div>

      {/* 统计卡片 */}
      <div className="homepage-stats">
        {stats.map(s => (
          <div key={s.label} className="homepage-stat-card" style={{ borderTop: `3px solid ${s.color}` }}>
            <div className="homepage-stat-icon">{s.icon}</div>
            <div className="homepage-stat-value">{s.value}</div>
            <div className="homepage-stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* 最近作品 */}
      <div className="homepage-section">
        <div className="homepage-section-header">
          <h2>📚 我的作品</h2>
          <div className="homepage-tabs">
            {[
              { id: 'all', label: '全部' },
              { id: 'writing', label: '写作中' },
              { id: 'draft', label: '草稿' },
              { id: 'complete', label: '已完成' },
            ].map(t => (
              <button key={t.id} className={`homepage-tab${activeTab === t.id ? ' active' : ''}`}
                onClick={() => setActiveTab(t.id)}>{t.label}</button>
            ))}
          </div>
        </div>

        {!hasNovels ? (
          <div className="homepage-empty">
            <div className="homepage-empty-icon">📖</div>
            <div className="homepage-empty-text">还没有作品，用下方的工具开始创作吧</div>
          </div>
        ) : recentNovels.length === 0 ? (
          <div className="homepage-empty">
            <div className="homepage-empty-icon">📭</div>
            <div className="homepage-empty-text">这个分类下还没有作品</div>
          </div>
        ) : (
          <div className="homepage-novel-grid">
            {recentNovels.map(n => (
              <div key={n.id} className="homepage-novel-card" onClick={() => onOpenNovel(n.id)}>
                <div className="homepage-novel-card-top">
                  <span className="homepage-novel-status" style={{
                    background: n.status === 'writing' ? '#fff3e0' : n.status === 'draft' ? '#e8f5e9' : '#e3f2fd',
                    color: n.status === 'writing' ? '#e65100' : n.status === 'draft' ? '#2e7d32' : '#1565c0',
                  }}>
                    {n.status === 'writing' ? '✍️ 写作中' : n.status === 'draft' ? '📋 草稿' : '✅ 已完成'}
                  </span>
                  <span style={{ fontSize: 24 }}>📄</span>
                </div>
                <h3 className="homepage-novel-title">{n.title}</h3>
                <p className="homepage-novel-summary">{n.summary ? n.summary.substring(0, 60) + (n.summary.length > 60 ? '...' : '') : '暂无简介'}</p>
                <div className="homepage-novel-meta">
                  <span>第 {n.doneChapters || 0}/{n.chapters || '?'} 章</span>
                  <span>{n.totalWords ? (n.totalWords > 1000 ? `${(n.totalWords / 1000).toFixed(0)}k` : n.totalWords) : '0'} 字</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 快捷工具 */}
      <div className="homepage-section">
        <div className="homepage-section-header">
          <h2>⚡ 快捷工具</h2>
        </div>
        <div className="homepage-tool-grid">
          {QUICK_TOOLS.map(tool => (
            <div key={tool.id} className="homepage-tool-card" onClick={() => onToolClick(tool.id)}
              style={{ borderTop: `3px solid ${tool.color}` }}>
              <div className="homepage-tool-icon">{tool.icon}</div>
              <h3 className="homepage-tool-label">{tool.label}</h3>
              <p className="homepage-tool-desc">{tool.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 快速创作 */}
      <div className="homepage-section">
        <div className="homepage-section-header">
          <h2>🚀 一句话生成小说</h2>
        </div>
        <div className="homepage-quick-create">
          <p className="homepage-quick-desc">输入你的灵感，AI 帮你创作完整小说</p>
          <div className="homepage-genre-row">
            <span className="homepage-genre-label">题材</span>
            {GENRES.map(g => (
              <span key={g} className={`homepage-genre-tag${selectedGenre === g ? ' active' : ''}`}
                onClick={() => setSelectedGenre(g === selectedGenre ? '' : g)}>{g}</span>
            ))}
          </div>
          <div className="homepage-genre-row">
            <span className="homepage-genre-label">读者</span>
            {AUDIENCES.map(a => (
              <span key={a} className={`homepage-genre-tag${audience === a ? ' active' : ''}`}
                onClick={() => setAudience(a)}>{a}</span>
            ))}
          </div>
          <div className="homepage-create-row">
            <textarea value={idea} onChange={e => setIdea(e.target.value)}
              placeholder="输入你的故事灵感，比如：一个程序员穿越到古代，用代码改变了世界..." rows={2} />
            <button className="homepage-create-btn" onClick={onQuickCreate} disabled={creating || !idea.trim()}>
              {creating ? '⏳ AI 创作中...' : '✨ 开始创作'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
