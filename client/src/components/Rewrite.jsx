import React, { useState, useRef } from 'react';
import { rewriteText, rewriteUrl, rewriteIterate } from '../api';

const STYLES = [
  '保持原风格', '古风', '现代简约', '幽默轻松', '悬疑紧张',
  '文艺抒情', '网文爽文', '严肃文学', '对话体', '第一人称'
];

export default function Rewrite() {
  const [mode, setMode] = useState('text');
  const [originalText, setOriginalText] = useState('');
  const [url, setUrl] = useState('');
  const [style, setStyle] = useState('保持原风格');
  const [reference, setReference] = useState('');
  const [writingIdea, setWritingIdea] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [sourceInfo, setSourceInfo] = useState('');
  const [history, setHistory] = useState([]);
  const [showRef, setShowRef] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const resultRef = useRef(null);

  const handleRewrite = async () => {
    setLoading(true);
    setResult('');
    setSourceInfo('');
    setHistory([]);
    setShowFeedback(false);
    try {
      let data;
      if (mode === 'url') {
        if (!url.trim()) { alert('请输入链接'); setLoading(false); return; }
        data = await rewriteUrl(url, style);
        if (data.sourceLength) setSourceInfo(`（原文 ${data.sourceLength} 字符）`);
      } else {
        if (!originalText.trim()) { alert('请输入要改写的文字'); setLoading(false); return; }
        data = await rewriteText(originalText, style, reference || undefined, writingIdea || undefined);
      }
      if (data.error) {
        setResult(`❌ ${data.error}`);
      } else {
        setResult(data.result);
        setShowFeedback(true);
      }
    } catch (e) {
      setResult('❌ 请求失败，请检查后端是否运行');
    }
    setLoading(false);
  };

  const handleFeedback = async () => {
    if (!feedback.trim()) return;
    const newHistory = [...history, { result, feedback }];
    setHistory(newHistory);
    setLoading(true);
    setFeedback('');
    try {
      const data = await rewriteIterate(
        mode === 'url' ? url : originalText,
        style,
        newHistory.map(h => ({ result: h.result, feedback: h.feedback })),
        feedback,
        writingIdea || undefined
      );
      if (data.error) {
        setResult(`❌ ${data.error}`);
      } else {
        setResult(data.result);
        setShowFeedback(true);
      }
    } catch (e) {
      setResult('❌ 请求失败');
    }
    setLoading(false);
    if (resultRef.current) resultRef.current.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="section-card">
      <div style={{ padding: '14px 18px' }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#8a7a5a', marginBottom: 10 }}>
          🔄 文章改写
        </h3>

        <div style={{ display: 'flex', gap: 0, marginBottom: 12, borderBottom: '1px solid #e2dcd2' }}>
          {['text', 'url'].map(m => (
            <button key={m} onClick={() => setMode(m)}
              style={{
                flex: 1, padding: '8px 0', background: 'none', border: 'none',
                color: mode === m ? '#8a7a5a' : '#b0a898', cursor: 'pointer',
                fontSize: 13, fontWeight: mode === m ? 600 : 400,
                borderBottom: mode === m ? '2px solid #c9a84c' : '2px solid transparent'
              }}
            >{m === 'text' ? '📝 粘贴文本' : '🔗 输入链接'}</button>
          ))}
        </div>

        <select value={style} onChange={e => setStyle(e.target.value)}
          style={{
            width: '100%', padding: 8, borderRadius: 6,
            background: '#fff', color: '#333', border: '1px solid #e2dcd2',
            fontSize: 13, outline: 'none', marginBottom: 10
          }}
        >
          {STYLES.map(s => <option key={s}>{s}</option>)}
        </select>

        {/* 创作理念 */}
        <div style={{ marginBottom: 10 }}>
          <button onClick={() => setShowRef(!showRef)}
            style={{
              background: 'none', border: '1px solid #e2dcd2', color: '#8a7a5a',
              padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12,
              marginRight: 6
            }}
          >📎 {showRef ? '收起' : '参考风格'}</button>
          <span style={{ fontSize: 11, color: '#b0a898' }}>选填</span>
        </div>
        {showRef && (
          <>
            <textarea value={reference} onChange={e => setReference(e.target.value)}
              placeholder="粘贴一段你喜欢的写作风格，AI 会模仿..."
              style={{
                width: '100%', minHeight: 60, padding: 10, borderRadius: 8,
                background: '#fff', color: '#333', border: '1px solid #e2dcd2',
                fontSize: 13, lineHeight: 1.7, fontFamily: 'inherit',
                resize: 'vertical', outline: 'none', marginBottom: 10
              }}
              disabled={loading}
            />
            <textarea value={writingIdea} onChange={e => setWritingIdea(e.target.value)}
              placeholder="✍️ 你的创作理念：写一下你对写作的理解、审美偏好、想要的感觉..."
              style={{
                width: '100%', minHeight: 80, padding: 10, borderRadius: 8,
                background: '#fff', color: '#333', border: '1px solid #c9a84c',
                fontSize: 13, lineHeight: 1.7, fontFamily: 'inherit',
                resize: 'vertical', outline: 'none', marginBottom: 8
              }}
              disabled={loading}
            />
          </>
        )}

        {mode === 'url' ? (
          <input value={url} onChange={e => setUrl(e.target.value)}
            placeholder="粘贴文章链接..."
            style={{
              width: '100%', padding: 10, borderRadius: 8,
              background: '#fff', color: '#333', border: '1px solid #e2dcd2',
              fontSize: 13, outline: 'none', marginBottom: 10
            }}
            onKeyDown={e => e.key === 'Enter' && handleRewrite()}
            disabled={loading}
          />
        ) : (
          <>
            <textarea value={originalText} onChange={e => setOriginalText(e.target.value)}
              placeholder="粘贴别人的文章或段落..."
              style={{
                width: '100%', minHeight: 120, padding: 10, borderRadius: 8,
                background: '#fff', color: '#333', border: '1px solid #e2dcd2',
                fontSize: 13, lineHeight: 1.7, fontFamily: 'inherit',
                resize: 'vertical', outline: 'none', marginBottom: 8
              }}
              disabled={loading}
            />
          </>
        )}

        <button className="gold-btn" onClick={handleRewrite} disabled={loading || (mode === 'url' ? !url.trim() : !originalText.trim())} style={{ width: '100%' }}>
          {loading ? 'AI 改写中...' : '✍️ 开始改写'}
        </button>

        {loading && <div className="brainstorm-loading" style={{ marginTop: 12 }}>AI 正在处理...</div>}

        {result && !loading && (
          <div ref={resultRef} style={{ marginTop: 14 }}>
            {/* 改写轮次指示 */}
            {history.length > 0 && (
              <div style={{ marginBottom: 8, fontSize: 11, color: '#b0a898' }}>
                已优化 {history.length} 轮
              </div>
            )}

            <div style={{
              background: '#faf8f5', border: '1px solid #e8e2d8', borderRadius: 8,
              padding: '14px 18px', fontSize: 13, lineHeight: 1.8,
              whiteSpace: 'pre-wrap', color: '#444', marginBottom: 10
            }}>{result}</div>

            <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: '#b0a898', padding: '4px 0' }}>
                ✅ {result.replace(/\s/g, '').length} 字 {sourceInfo}
              </span>
              <button onClick={() => navigator.clipboard.writeText(result)}
                style={{ background: '#ece8e0', border: '1px solid #e2dcd2', color: '#666', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 11 }}>📋 复制</button>
            </div>

            {/* 对话反馈区 */}
            {showFeedback && (
              <div style={{ borderTop: '1px solid #e8e2d8', paddingTop: 12 }}>
                <label style={{ fontSize: 12, color: '#8a7a5a', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                  💬 还有什么要调整的？
                </label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    value={feedback}
                    onChange={e => setFeedback(e.target.value)}
                    placeholder="如：太书面了再口语化一点 / 再精简一些 / 开头换个方式..."
                    style={{
                      flex: 1, padding: '8px 12px', borderRadius: 8,
                      border: '1px solid #e2dcd2', background: '#fff',
                      color: '#333', fontSize: 13, outline: 'none'
                    }}
                    onKeyDown={e => e.key === 'Enter' && handleFeedback()}
                    disabled={loading}
                  />
                  <button className="gold-btn" onClick={handleFeedback} disabled={loading || !feedback.trim()}
                    style={{ padding: '8px 16px', fontSize: 12 }}
                  >{loading ? '...' : '继续优化'}</button>
                </div>
                <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {['再口语化一些', '再精简一点', '保持原样只改语病', '换个更吸引的开头', '改成对话形式'].map(s => (
                    <button key={s} onClick={() => { setFeedback(s); }}
                      style={{
                        background: 'none', border: '1px solid #e2dcd2', color: '#b0a898',
                        padding: '3px 10px', borderRadius: 12, cursor: 'pointer', fontSize: 11
                      }}
                    >{s}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
