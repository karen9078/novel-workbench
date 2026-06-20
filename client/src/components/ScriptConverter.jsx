import React, { useState, useEffect } from 'react';
import { getOutlines } from '../api';

const FORMATS = [
  { id: 'script', icon: '🎬', label: '剧本格式', desc: '场景 + 对白 + 动作指示' },
  { id: 'comic', icon: '🎨', label: '漫画分镜', desc: '画面描述 + 对白，适合画师参考' },
  { id: 'storytelling', icon: '🎙️', label: '说书稿', desc: '口语化浓缩，适合音频/视频' },
  { id: 'shortvideo', icon: '📱', label: '短视频脚本', desc: '15-60秒分镜，适合抖音/快手' },
  { id: 'outline', icon: '📋', label: '章节梗概', desc: '200字浓缩本章核心情节' },
];

export default function ScriptConverter({ novelId, title, initialFormat }) {
  const [outlines, setOutlines] = useState([]);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [format, setFormat] = useState(initialFormat || 'script');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (novelId) getOutlines(novelId).then(setOutlines);
  }, [novelId]);

  const chapters = outlines.filter(o => o.content && o.content.length > 100);

  const formatPrompts = {
    script: `请把下面这章小说转成**剧本格式**，包含场景描述、角色对白和动作指示。格式如下：

场景1：[地点] · [时间]
【景别】画面描述

角色名（情绪）：
  对白

直接输出，不要加额外说明。`,

    comic: `请把下面这章小说转成**漫画分镜格式**，每页分镜包含画面描述和对白。格式如下：

第1页
【画面】描述场景和人物动作
对白：「对白内容」

直接输出，不要加说明。`,

    storytelling: `请把下面这章小说转成**说书稿格式**，口语化、有节奏感，适合音频朗读。包含：
- 开头引子（吸引听众）
- 情节推进
- 结尾悬念。

直接输出，不要加说明。`,

    shortvideo: `请把下面这章小说转成**短视频脚本格式**，15-60秒的分镜。格式如下：

序号 | 画面 | 配音/对白 | 时长
---|---|---|---
1 | 画面描述 | 配音内容 | 5秒

直接输出，不要加说明。`,

    outline: `请把下面这章小说浓缩成**200字左右的梗概**，保留核心情节、冲突和转折。直接输出，不要加说明。`,
  };

  const handleConvert = async () => {
    if (!selectedChapter) return;
    setLoading(true);
    setResult(null);

    const chapter = chapters.find(c => c.chapterNum === selectedChapter);
    if (!chapter) return;

    try {
      const prompt = formatPrompts[format] + `\n\n第${chapter.chapterNum}章 ${chapter.title}\n\n${chapter.content.substring(0, 4000)}`;

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          novelId,
          messages: [{ role: 'user', content: prompt }]
        })
      });
      const data = await res.json();
      if (data.result) setResult(data.result);
      else setResult('❌ ' + (data.error || '转换失败'));
    } catch (e) {
      setResult('❌ 网络错误');
    }
    setLoading(false);
  };

  return (
    <div>
      {chapters.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 10, padding: 40, textAlign: 'center', color: '#b0a898', border: '1px solid #e8e2d8' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📝</div>
          <div>还没有已完成的章节，先去写正文吧</div>
        </div>
      ) : (
        <>
          {/* 格式选择 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
            {FORMATS.map(f => (
              <div key={f.id} onClick={() => setFormat(f.id)}
                style={{
                  padding: '10px', borderRadius: 8, cursor: 'pointer',
                  border: `2px solid ${format === f.id ? '#c9a84c' : '#e2dcd2'}`,
                  background: format === f.id ? '#faf6ee' : '#faf8f5',
                  textAlign: 'center', transition: 'all 0.12s'
                }}
              >
                <div style={{ fontSize: 20, marginBottom: 4 }}>{f.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{f.label}</div>
                <div style={{ fontSize: 11, color: '#b0a898' }}>{f.desc}</div>
              </div>
            ))}
          </div>

          {/* 章节选择 */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
            <select value={selectedChapter || ''} onChange={e => setSelectedChapter(parseInt(e.target.value))}
              style={{
                flex: 1, padding: '8px 12px', borderRadius: 6,
                border: '1px solid #e2dcd2', background: '#fff',
                fontSize: 13, color: '#333', fontFamily: 'inherit'
              }}
            >
              <option value="">选择章节...</option>
              {chapters.map(ch => (
                <option key={ch.id} value={ch.chapterNum}>
                  第{ch.chapterNum}章 {ch.title} ({ch.content.length}字)
                </option>
              ))}
            </select>

            <button className="gold-btn" onClick={handleConvert} disabled={!selectedChapter || loading} style={{ whiteSpace: 'nowrap' }}>
              {loading ? '⏳ 转换中...' : '🔄 转换'}
            </button>
          </div>

          {/* 结果 */}
          {loading && (
            <div style={{ textAlign: 'center', padding: 20, color: '#b0a898', fontSize: 13 }}>
              ✍️ AI 正在{FORMATS.find(f => f.id === format)?.label}...
            </div>
          )}

          {result && !loading && (
            <div style={{
              background: '#fff', borderRadius: 10, border: '1px solid #e8e2d8',
              padding: 16, fontSize: 13, lineHeight: 1.9, whiteSpace: 'pre-wrap'
            }}>
              <div style={{ fontWeight: 600, color: '#c9a84c', marginBottom: 8, fontSize: 12 }}>
                {FORMATS.find(f => f.id === format)?.icon} 第{selectedChapter}章 · {FORMATS.find(f => f.id === format)?.label}
              </div>
              {result}
            </div>
          )}
        </>
      )}
    </div>
  );
}
