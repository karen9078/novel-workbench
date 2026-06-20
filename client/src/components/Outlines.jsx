import React, { useState, useEffect } from 'react';
import { getOutlines, createOutline, deleteOutline, updateOutline, generateChapter, generateOutline, polishText, continueText, completeText, reviseChapter } from '../api';
import Modal from './Modal';
import ChapterView from './ChapterView';

export default function Outlines({ novelId }) {
  const [outlines, setOutlines] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', summary: '' });
  const [currentChapter, setCurrentChapter] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [genOutlineLoading, setGenOutlineLoading] = useState(false);
  const [polishing, setPolishing] = useState(false);
  const [continuing, setContinuing] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [revising, setRevising] = useState(false);
  const [sectionOpen, setSectionOpen] = useState(true);

  const load = async () => {
    if (!novelId) return;
    const data = await getOutlines(novelId);
    setOutlines(data);
  };

  useEffect(() => { load(); }, [novelId]);

  const handleAdd = async () => {
    if (!form.title.trim()) return;
    await createOutline(novelId, form);
    setForm({ title: '', summary: '' });
    setShowModal(false);
    load();
  };

  const handleDelete = async (id) => {
    await deleteOutline(id);
    if (currentChapter && currentChapter.id === id) setCurrentChapter(null);
    load();
  };

  const handleGenerateChapter = async (outline) => {
    setCurrentChapter(null);
    setGenerating(true);
    try {
      const data = await generateChapter(outline.id, novelId);
      if (data.error) {
        alert(data.error);
      } else {
        setCurrentChapter({ ...outline, content: data.result });
      }
    } catch (e) {
      alert('生成失败，请检查后端是否运行');
    }
    setGenerating(false);
    load();
  };

  const handleGenOutline = async () => {
    setGenOutlineLoading(true);
    try {
      const data = await generateOutline(novelId);
      if (data.error) {
        alert(data.error);
      } else {
        // Parse the response and create outlines
        const lines = data.result.split('\n').filter(l => l.trim());
        let currentTitle = '';
        let currentSummary = '';
        let parsing = false;
        for (const line of lines) {
          const titleMatch = line.match(/^(?:第\d+章|第\d+节)[：:]\s*(.+)/);
          if (titleMatch) {
            if (currentTitle && currentSummary) {
              await createOutline(novelId, { title: currentTitle, summary: currentSummary });
            }
            currentTitle = titleMatch[1].trim();
            currentSummary = '';
            parsing = true;
          } else if (parsing) {
            currentSummary += line + '\n';
          }
        }
        if (currentTitle && currentSummary) {
          await createOutline(novelId, { title: currentTitle, summary: currentSummary.trim() });
        }
        load();
      }
    } catch (e) {
      alert('生成失败：' + e.message);
    }
    setGenOutlineLoading(false);
  };

  const handlePolish = async () => {
    if (!currentChapter || !currentChapter.content) return;
    setPolishing(true);
    try {
      const data = await polishText(currentChapter.content);
      if (data.error) {
        alert(data.error);
      } else {
        setCurrentChapter({ ...currentChapter, content: data.result });
      }
    } catch (e) {
      alert('润色失败');
    }
    setPolishing(false);
  };

  const handleSaveContent = async (newContent) => {
    if (!currentChapter) return;
    await updateOutline(currentChapter.id, { content: newContent });
    setCurrentChapter({ ...currentChapter, content: newContent });
  };

  const handleContinue = async (text, instruction) => {
    setContinuing(true);
    try {
      const data = await continueText(text, instruction);
      if (data.error) {
        alert(data.error);
      } else {
        const newContent = text + '\n\n' + data.result;
        await updateOutline(currentChapter.id, { content: newContent });
        setCurrentChapter({ ...currentChapter, content: newContent });
      }
    } catch (e) {
      alert('续写失败');
    }
    setContinuing(false);
  };

  const handleComplete = async (before, after) => {
    setCompleting(true);
    try {
      const data = await completeText(before, after);
      if (data.error) {
        alert(data.error);
      } else {
        const newContent = before + '\n\n' + data.result + '\n\n' + after;
        await updateOutline(currentChapter.id, { content: newContent });
        setCurrentChapter({ ...currentChapter, content: newContent });
      }
    } catch (e) {
      alert('补全失败');
    }
    setCompleting(false);
  };

  const handleRevise = async (feedback) => {
    if (!currentChapter || !feedback.trim()) return;
    setRevising(true);
    try {
      const data = await reviseChapter(currentChapter.content, feedback);
      if (data.error) {
        alert(data.error);
      } else {
        const newContent = data.result;
        await updateOutline(currentChapter.id, { content: newContent });
        setCurrentChapter({ ...currentChapter, content: newContent });
      }
    } catch (e) {
      alert('修改失败');
    }
    setRevising(false);
  };

  const handleCopy = () => {
    if (currentChapter && currentChapter.content) {
      navigator.clipboard.writeText(currentChapter.content);
      alert('已复制到剪贴板');
    }
  };

  return (
    <div className="section-card">
      <div className="section-header" onClick={() => setSectionOpen(!sectionOpen)}>
        <h3>📝 章纲列表</h3>
        <span className={`section-arrow${sectionOpen ? ' open' : ''}`}>▶</span>
      </div>
      {sectionOpen && (
        <div className="section-body">
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button className="gold-btn" style={{ padding: '6px 14px', fontSize: 12 }} onClick={() => setShowModal(true)}>
              ＋ 添加章纲
            </button>
            <button
              className="gold-btn"
              style={{ padding: '6px 14px', fontSize: 12 }}
              onClick={handleGenOutline}
              disabled={genOutlineLoading}
            >
              {genOutlineLoading ? '生成中...' : '🤖 AI 生成章纲'}
            </button>
          </div>

          {genOutlineLoading && (
            <div className="brainstorm-loading" style={{ marginBottom: 12 }}>
              AI 正在生成 10 章章纲...
            </div>
          )}

          {outlines.length === 0 && !genOutlineLoading ? (
            <div className="empty-state">
              <p style={{ fontSize: 13, color: '#555' }}>暂无章纲</p>
              <div className="hint">点击上方按钮添加或让 AI 生成</div>
            </div>
          ) : (
            <div className="outline-list">
              {outlines.map(o => (
                <div
                  key={o.id}
                  className="outline-item"
                  onClick={() => {
                    if (o.content) {
                      setCurrentChapter(o);
                    } else {
                      handleGenerateChapter(o);
                    }
                  }}
                >
                  <div className="outline-item-header">
                    <span className="outline-chapter-num">第{o.chapterNum}章</span>
                  </div>
                  <div className="outline-item-title">{o.title}</div>
                  <div className="outline-item-summary">{o.summary}</div>
                  <div className="outline-item-actions">
                    <button
                      className="gen-btn"
                      onClick={e => { e.stopPropagation(); handleGenerateChapter(o); }}
                      disabled={generating}
                    >
                      {generating ? '生成中...' : (o.content ? '重新生成' : '✍️ 生成正文')}
                    </button>
                    <button className="delete-btn" onClick={e => { e.stopPropagation(); handleDelete(o.id); }}>删除</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {generating && (
            <div className="chapter-loading">AI 正在创作中...</div>
          )}

          {currentChapter && currentChapter.content && (
            <ChapterView
              chapter={currentChapter}
              onClose={() => setCurrentChapter(null)}
              onPolish={handlePolish}
              onContinue={handleContinue}
              onComplete={handleComplete}
              onCopy={handleCopy}
              onSaveContent={handleSaveContent}
              onRevise={handleRevise}
              polishing={polishing}
              continuing={continuing}
              completing={completing}
              revising={revising}
            />
          )}
        </div>
      )}

      {showModal && (
        <Modal title="添加章纲" onClose={() => setShowModal(false)} onConfirm={handleAdd} confirmText="添加">
          <label>章节标题</label>
          <input
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="如：命运的相遇"
          />
          <label>章纲内容</label>
          <textarea
            value={form.summary}
            onChange={e => setForm(f => ({ ...f, summary: e.target.value }))}
            placeholder="描述本章的核心情节..."
            style={{ minHeight: 120 }}
          />
        </Modal>
      )}
    </div>
  );
}
