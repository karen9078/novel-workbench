import React, { useState, useEffect } from 'react';
import { getNovelsOverview, getOutlines } from '../api';

const TOOL_INFO = {
  chat: { icon: '💬', label: 'AI 对话改文', desc: '与AI对话，边聊边改章节内容', color: '#c9a84c', bg: 'linear-gradient(135deg, #faf8f5 0%, #f5f0e8 100%)' },
  rewrite: { icon: '🔄', label: '改写润色', desc: '一键改写段落，优化文风和表达', color: '#e67e22', bg: 'linear-gradient(135deg, #fef9f0 0%, #fdf0d5 100%)' },
  outlines: { icon: '✍️', label: '续写补全', desc: 'AI根据上下文续写章节', color: '#3498db', bg: 'linear-gradient(135deg, #f0faf4 0%, #dcf5e5 100%)' },
};

export default function AIToolPage({ tool, onBack, onOpenEditor }) {
  const [novels, setNovels] = useState([]);
  const [selectedNovelId, setSelectedNovelId] = useState(null);
  const [outlines, setOutlines] = useState([]);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [novelLoading, setNovelLoading] = useState(false);

  const info = TOOL_INFO[tool] || TOOL_INFO.chat;

  useEffect(() => {
    setNovelLoading(true);
    getNovelsOverview().then(data => {
      setNovels(data);
      setNovelLoading(false);
      if (data.length > 0 && !selectedNovelId) setSelectedNovelId(data[0].id);
    }).catch(() => setNovelLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedNovelId) { setOutlines([]); setSelectedChapter(null); return; }
    getOutlines(selectedNovelId).then(data => {
      setOutlines(data);
      const valid = data.filter(o => (o.content && o.content.length > 50) || (o.summary && o.summary.length > 20));
      if (valid.length > 0) setSelectedChapter(valid[0].chapterNum);
    });
  }, [selectedNovelId]);

  const chapters = outlines.filter(o => (o.content && o.content.length > 50) || (o.summary && o.summary.length > 20));
  const selectedNovel = novels.find(n => n.id === selectedNovelId);

  return (
    <div className="converter-page">
      <div className="converter-topbar">
        <button className="converter-back" onClick={onBack}>←</button>
        <span className="converter-topbar-title">{info.icon} {info.label}</span>
        <div className="converter-topbar-spacer" />
        <div style={{ fontSize: 12, color: '#b0a898' }}>
          {selectedNovel ? selectedNovel.title : '未选择作品'}
        </div>
      </div>

      <div className="converter-body">
        {/* 选择区 */}
        <div className="converter-select-area" style={{ background: info.bg, borderBottom: `3px solid ${info.color}` }}>
          <div className="converter-select-row">
            <div className="converter-select-group">
              <label>📖 选择作品</label>
              <select value={selectedNovelId || ''} onChange={e => { setSelectedNovelId(e.target.value || null); setSelectedChapter(null); }} disabled={novelLoading}>
                {novelLoading ? <option>加载中...</option>
                  : novels.length === 0 ? <option>暂无作品</option>
                  : novels.map(n => <option key={n.id} value={n.id}>{n.title}</option>)}
              </select>
            </div>
            <div className="converter-select-group">
              <label>📝 选择章节</label>
              <select value={selectedChapter || ''} onChange={e => { const v = e.target.value; setSelectedChapter(v ? Number(v) : null); }} disabled={!selectedNovelId}>
                <option value="">{!selectedNovelId ? '请先选择作品' : chapters.length === 0 ? '暂无章节' : '-- 选择章节 --'}</option>
                {chapters.map(ch => <option key={ch.id} value={ch.chapterNum}>第{ch.chapterNum}章 {ch.title}</option>)}
              </select>
            </div>
            <button className="converter-convert-btn"
              onClick={() => { if (selectedNovelId && onOpenEditor) onOpenEditor(selectedNovelId, tool); }}
              disabled={!selectedNovelId}
              style={{ background: info.color, color: '#fff' }}>
              📂 打开编辑器
            </button>
          </div>
        </div>

        <div className="converter-format-body">
          {/* 工具说明 */}
          <div className="converter-format-card" style={{ borderLeft: `4px solid ${info.color}`, background: '#faf8f5' }}>
            <div className="converter-format-header">{info.icon} {info.label}</div>
            <p className="converter-format-desc">{info.desc}</p>

            <div className="converter-example" style={{ background: '#ede8de', border: '1px solid #e8e2d8' }}>
              <div style={{ fontSize: 12, lineHeight: 1.8, color: '#666' }}>
                {tool === 'chat' ? '💡 选好小说和章节 → 点击"打开编辑器" → 进入 AI 助手标签 → 与AI对话修改章节' :
                 tool === 'rewrite' ? '💡 选好小说和章节 → 点击"打开编辑器" → 进入 改写标签 → 选择文风一键改写' :
                 '💡 选好小说和章节 → 点击"打开编辑器" → 进入 章纲标签 → AI续写补全'}
              </div>
            </div>
          </div>

          {!selectedNovelId && (
            <div className="converter-empty"><div style={{ fontSize: 40, marginBottom: 12 }}>📖</div><div>选择一个小说作品开始使用</div></div>
          )}
        </div>
      </div>
    </div>
  );
}
