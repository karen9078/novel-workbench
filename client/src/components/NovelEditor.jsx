import React, { useState, useEffect, useCallback } from 'react';
import { getNovel, updateNovel, getOutlines, exportNovel } from '../api';
import Brainstorm from './Brainstorm';
import Characters from './Characters';
import Outlines from './Outlines';
import Rewrite from './Rewrite';
import PublishModal from './PublishModal';
import AIChat from './AIChat';
import ScriptConverter from './ScriptConverter';

export default function NovelEditor({ novelId, onBack, initialTab, initialFormat }) {
  const [novel, setNovel] = useState(null);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [setting, setSetting] = useState({
    genre: '', worldview: '', style: '', protagonist: '', theme: ''
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [tab, setTab] = useState('setting');
  const [stats, setStats] = useState({ chapters: 0, words: 0 });
  const [showPublish, setShowPublish] = useState(false);
  const [tabInitialized, setTabInitialized] = useState(false);

  // 如果传入了 initialTab，首次加载时跳转到该标签
  useEffect(() => {
    if (initialTab && !tabInitialized) {
      setTab(initialTab);
      setTabInitialized(true);
    }
  }, [initialTab, tabInitialized]);

  const load = useCallback(async () => {
    if (!novelId) return;
    const data = await getNovel(novelId);
    setNovel(data);
    setTitle(data.title);
    setSummary(data.summary);
    setSetting(data.setting || { genre: '', worldview: '', style: '', protagonist: '', theme: '' });
    setHasChanges(false);
  }, [novelId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!novelId) return;
    const loadStats = async () => {
      const outlines = await getOutlines(novelId);
      const totalWords = outlines.reduce((sum, o) => sum + (o.content ? o.content.replace(/\s/g, '').length : 0), 0);
      setStats({ chapters: outlines.length, words: totalWords });
    };
    loadStats();
    const interval = setInterval(loadStats, 5000);
    return () => clearInterval(interval);
  }, [novelId]);

  const save = async () => {
    if (!novelId || !hasChanges) return;
    try {
      await updateNovel(novelId, { title, summary, setting });
      setHasChanges(false);
    } catch (e) {
      console.error('保存失败:', e);
    }
  };

  const handleSettingChange = (key, value) => {
    setSetting(s => ({ ...s, [key]: value }));
    setHasChanges(true);
  };

  const handleExport = async () => {
    const text = await exportNovel(novelId);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const handler = () => { save(); };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  });

  if (!novelId) return null;

  const TABS = [
    { id: 'setting', label: '⚙️ 设定' },
    { id: 'brainstorm', label: '💡 头脑风暴' },
    { id: 'characters', label: '👤 角色' },
    { id: 'outlines', label: '📝 章纲' },
    { id: 'rewrite', label: '🔄 改写' },
    { id: 'chat', label: '💬 AI 助手' },
    { id: 'script', label: '📜 剧本' },
  ];

  return (
    <div className="editor-container">
      {/* Top Bar */}
      <div className="editor-topbar">
        <button className="editor-topbar-back" onClick={onBack} style={{ background: 'none', border: 'none', color: '#b0a898', cursor: 'pointer', fontSize: 18, padding: 4 }}>←</button>
        <input
          className="editor-topbar-title"
          value={title}
          onChange={e => { setTitle(e.target.value); setHasChanges(true); }}
          onBlur={save}
          onKeyDown={e => e.key === 'Enter' && save()}
        />
        <div className="editor-topbar-stats">
          <span>章纲 <strong>{stats.chapters}</strong></span>
          <span>字数 <strong>{stats.words.toLocaleString()}</strong></span>
        </div>
        <button className="topbar-btn" onClick={save} style={{ background: hasChanges ? '#c9a84c' : 'transparent', color: hasChanges ? '#fff' : '#666', border: 'none' }}>
          {hasChanges ? '💾 保存' : '已保存'}
        </button>
        <button className="topbar-btn" onClick={() => setShowPublish(true)}>📤 发布</button>
        <button className="topbar-btn" onClick={handleExport}>📥 导出</button>
      </div>

      {/* Tabs */}
      <div className="editor-tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`editor-tab${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
          >{t.label}</button>
        ))}
      </div>

      {/* Body */}
      <div className="editor-body">
        {tab === 'setting' && (
          <div className="setting-section">
            <h3>小说设定</h3>
            <textarea
              value={summary}
              onChange={e => { setSummary(e.target.value); setHasChanges(true); }}
              onBlur={save}
              placeholder="小说的简介..."
              style={{
                width: '100%', minHeight: 60, padding: '8px 10px',
                borderRadius: 6, border: '1px solid #e2dcd2',
                background: '#faf8f5', color: '#2c2c2c',
                fontSize: 13, fontFamily: 'inherit', resize: 'vertical',
                outline: 'none', marginBottom: 14
              }}
            />
            <div className="setting-grid">
              <div className="setting-field">
                <label>题材</label>
                <input value={setting.genre} onChange={e => handleSettingChange('genre', e.target.value)} placeholder="如：科幻 / 言情 / 悬疑" />
              </div>
              <div className="setting-field">
                <label>风格</label>
                <input value={setting.style} onChange={e => handleSettingChange('style', e.target.value)} placeholder="如：轻松 / 沉重 / 幽默" />
              </div>
              <div className="setting-field" style={{ gridColumn: '1 / -1' }}>
                <label>世界观</label>
                <textarea value={setting.worldview} onChange={e => handleSettingChange('worldview', e.target.value)} placeholder="世界的背景设定..." style={{ minHeight: 60 }} />
              </div>
              <div className="setting-field" style={{ gridColumn: '1 / -1' }}>
                <label>主角设定</label>
                <textarea value={setting.protagonist} onChange={e => handleSettingChange('protagonist', e.target.value)} placeholder="主角的身份、背景..." style={{ minHeight: 60 }} />
              </div>
              <div className="setting-field" style={{ gridColumn: '1 / -1' }}>
                <label>核心主题</label>
                <textarea value={setting.theme} onChange={e => handleSettingChange('theme', e.target.value)} placeholder="你想表达的核心思想..." style={{ minHeight: 60 }} />
              </div>
            </div>
          </div>
        )}

        {tab === 'brainstorm' && <Brainstorm novelId={novelId} />}
        {tab === 'characters' && <Characters novelId={novelId} />}
        {tab === 'outlines' && <Outlines novelId={novelId} />}
        {tab === 'rewrite' && <Rewrite />}
        {tab === 'chat' && <AIChat novelId={novelId} title={title} />}
        {tab === 'script' && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: '#8a7a5a', marginBottom: 4 }}>📜 剧本写作</h3>
              <p style={{ fontSize: 12, color: '#b0a898', lineHeight: 1.6 }}>
                选择章节，一键转为剧本格式（场景 + 对白 + 动作指示）。
              </p>
            </div>

            <ScriptConverter novelId={novelId} title={title} initialFormat={initialFormat} onSwitchChat={() => setTab('chat')} />
          </div>
        )}
      </div>

      {showPublish && (
        <PublishModal
          novelId={novelId}
          title={title}
          onClose={() => setShowPublish(false)}
        />
      )}
    </div>
  );
}
