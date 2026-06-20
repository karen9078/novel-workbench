import React, { useState } from 'react';

export default function ChapterView({ chapter, onClose, onPolish, onContinue, onComplete, onCopy, onSaveContent, onRevise, polishing, continuing, completing, revising }) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [showContinue, setShowContinue] = useState(false);
  const [continueInst, setContinueInst] = useState('');
  const [showComplete, setShowComplete] = useState(false);
  const [completeBefore, setCompleteBefore] = useState('');
  const [completeAfter, setCompleteAfter] = useState('');
  const [showRevise, setShowRevise] = useState(false);
  const [reviseFeedback, setReviseFeedback] = useState('');

  if (!chapter) return null;

  const handleEdit = () => {
    setEditText(chapter.content);
    setEditing(true);
  };

  const handleSave = () => {
    onSaveContent(editText);
    setEditing(false);
  };

  const handleCancel = () => {
    setEditing(false);
  };

  const handleContinue = () => {
    if (!continueInst.trim()) return;
    onContinue(chapter.content, continueInst);
    setShowContinue(false);
    setContinueInst('');
  };

  const handleComplete = () => {
    if (!completeBefore.trim() || !completeAfter.trim()) return;
    onComplete(completeBefore, completeAfter);
    setShowComplete(false);
    setCompleteBefore('');
    setCompleteAfter('');
  };

  const handleReviseSubmit = () => {
    if (!reviseFeedback.trim()) return;
    onRevise(reviseFeedback);
    setShowRevise(false);
    setReviseFeedback('');
  };

  // Word count
  const wordCount = chapter.content ? chapter.content.replace(/\s/g, '').length : 0;

  return (
    <div className="chapter-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>第{chapter.chapterNum}章 · {chapter.title}</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 11, color: '#888' }}>{wordCount} 字</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>
      </div>

      {editing ? (
        <textarea
          value={editText}
          onChange={e => setEditText(e.target.value)}
          style={{
            width: '100%', minHeight: 400, padding: 12,
            background: '#faf8f5', color: '#333', border: '1px solid #c9a84c',
            borderRadius: 8, fontSize: 14, lineHeight: 1.9,
            fontFamily: 'inherit', resize: 'vertical', outline: 'none'
          }}
        />
      ) : (
        <div className="chapter-content-text">{chapter.content}</div>
      )}

      <div className="chapter-actions">
        {editing ? (
          <>
            <button className="polish-btn" onClick={handleSave}>💾 保存</button>
            <button className="copy-btn" onClick={handleCancel}>取消</button>
          </>
        ) : (
          <>
            <button className="polish-btn" onClick={handleEdit}>✏️ 编辑</button>
            <button className="polish-btn" onClick={onPolish} disabled={polishing}>
              {polishing ? '润色中...' : '✨ 润色'}
            </button>
            <button className="polish-btn" onClick={() => setShowContinue(true)} disabled={continuing}>
              {continuing ? '续写中...' : '📝 续写'}
            </button>
            <button className="polish-btn" onClick={() => setShowComplete(true)} disabled={completing}>
              {completing ? '补全中...' : '🧩 补全'}
            </button>
            <button className="polish-btn" onClick={() => setShowRevise(true)} disabled={revising}>
              {revising ? '修改中...' : '💬 按意见修改'}
            </button>
            <button className="copy-btn" onClick={onCopy}>📋 复制</button>
          </>
        )}
      </div>

      {/* 续写弹窗 */}
      {showContinue && (
        <div style={{ marginTop: 12, padding: 14, background: '#faf8f5', borderRadius: 8, border: '1px solid #e2dcd2' }}>
          <label style={{ fontSize: 12, color: '#8a7a5a', fontWeight: 600, display: 'block', marginBottom: 6 }}>续写要求</label>
          <input
            value={continueInst}
            onChange={e => setContinueInst(e.target.value)}
            placeholder="如：写一段男女主角的对话，500字"
            style={{
              width: '100%', padding: 8, borderRadius: 6,
              border: '1px solid #e2dcd2', background: '#fff',
              color: '#333', fontSize: 13, outline: 'none', marginBottom: 8
            }}
          />
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="polish-btn" onClick={handleContinue} style={{ padding: '6px 14px', fontSize: 12 }}>确认续写</button>
            <button className="copy-btn" onClick={() => setShowContinue(false)} style={{ padding: '6px 14px', fontSize: 12 }}>取消</button>
          </div>
        </div>
      )}

      {/* 按意见修改 */}
      {showRevise && (
        <div style={{ marginTop: 12, padding: 14, background: '#faf8f5', borderRadius: 8, border: '1px solid #e2dcd2' }}>
          <label style={{ fontSize: 12, color: '#8a7a5a', fontWeight: 600, display: 'block', marginBottom: 6 }}>
            💬 你觉得哪里不合适？
          </label>
          <textarea
            value={reviseFeedback}
            onChange={e => setReviseFeedback(e.target.value)}
            placeholder="如：这段对话太生硬了，男主角的性格跟设定不符，女主角应该更强势一些..."
            style={{
              width: '100%', minHeight: 80, padding: 10, borderRadius: 8,
              border: '1px solid #e2dcd2', background: '#fff',
              color: '#333', fontSize: 13, outline: 'none', marginBottom: 8, fontFamily: 'inherit'
            }}
          />
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="polish-btn" onClick={handleReviseSubmit} disabled={revising || !reviseFeedback.trim()}
              style={{ padding: '6px 16px', fontSize: 12 }}
            >{revising ? '修改中...' : '确认修改'}</button>
            <button className="copy-btn" onClick={() => setShowRevise(false)}
              style={{ padding: '6px 16px', fontSize: 12 }}>取消</button>
          </div>
          <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['男主角性格不对', '对话太书面化了', '情节推进太慢', '描写太多影响节奏', '女主角存在感太弱'].map(s => (
              <button key={s} onClick={() => setReviseFeedback(s)}
                style={{
                  background: 'none', border: '1px solid #e2dcd2', color: '#b0a898',
                  padding: '3px 10px', borderRadius: 12, cursor: 'pointer', fontSize: 11
                }}
              >{s}</button>
            ))}
          </div>
        </div>
      )}

      {/* 补全弹窗 */}
      {showComplete && (
        <div style={{ marginTop: 12, padding: 14, background: '#faf8f5', borderRadius: 8, border: '1px solid #e2dcd2' }}>
          <label style={{ fontSize: 12, color: '#8a7a5a', fontWeight: 600, display: 'block', marginBottom: 6 }}>缺失段落的上文</label>
          <textarea
            value={completeBefore}
            onChange={e => setCompleteBefore(e.target.value)}
            placeholder="粘贴缺失部分前面的文字..."
            style={{
              width: '100%', padding: 8, borderRadius: 6, minHeight: 60,
              border: '1px solid #e2dcd2', background: '#fff',
              color: '#333', fontSize: 13, outline: 'none', marginBottom: 8, fontFamily: 'inherit'
            }}
          />
          <label style={{ fontSize: 12, color: '#8a7a5a', fontWeight: 600, display: 'block', marginBottom: 6 }}>缺失段落下文</label>
          <textarea
            value={completeAfter}
            onChange={e => setCompleteAfter(e.target.value)}
            placeholder="粘贴缺失部分后面的文字..."
            style={{
              width: '100%', padding: 8, borderRadius: 6, minHeight: 60,
              border: '1px solid #e2dcd2', background: '#fff',
              color: '#333', fontSize: 13, outline: 'none', marginBottom: 8, fontFamily: 'inherit'
            }}
          />
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="polish-btn" onClick={handleComplete} style={{ padding: '6px 14px', fontSize: 12 }}>确认补全</button>
            <button className="copy-btn" onClick={() => setShowComplete(false)} style={{ padding: '6px 14px', fontSize: 12 }}>取消</button>
          </div>
        </div>
      )}
    </div>
  );
}
