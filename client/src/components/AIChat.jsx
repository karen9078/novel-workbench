import React, { useState, useRef, useEffect } from 'react';
import { getOutlines, updateOutline } from '../api';

export default function AIChat({ novelId, title }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: `你好！我是写作助手，关于《${title}》有什么需要帮忙的吗？\n\n比如：\n• 优化第三章，让对话更生动\n• 第一章逻辑不通，重写\n• 给女主角加个隐藏技能\n• 第五章节奏太慢，改紧凑点` }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const [outlines, setOutlines] = useState([]);
  const [applyTarget, setApplyTarget] = useState(null); // { msgIndex, content }
  const [applyChapter, setApplyChapter] = useState('');
  const [applyStatus, setApplyStatus] = useState('');

  useEffect(() => {
    if (novelId) getOutlines(novelId).then(setOutlines).catch(() => {});
  }, [novelId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          novelId,
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content }))
        })
      });
      const data = await res.json();
      if (data.result) {
        const idx = messages.length + 1;
        setMessages(prev => [...prev, { role: 'assistant', content: data.result, _idx: idx }]);
      } else if (data.error) {
        setMessages(prev => [...prev, { role: 'assistant', content: `❌ ${data.error}` }]);
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: '❌ 网络错误，请重试' }]);
    }
    setLoading(false);
  };

  const handleApply = async (msgContent) => {
    const num = parseInt(applyChapter);
    if (!num || num < 1) return setApplyStatus('请输入有效的章节号');

    const target = outlines.find(o => o.chapterNum === num);
    if (!target) return setApplyStatus(`没有找到第${num}章`);

    setApplyStatus(`正在保存到第${num}章...`);
    try {
      // 从 AI 回复中提取正文（去掉可能的章节标题前缀）
      let content = msgContent;
      // 去掉常见的 "第X章" 标题行
      content = content.replace(/^(?:第\d+章|第\d+节)[：:][^\n]*\n*/i, '');
      content = content.trim();

      await updateOutline(target.id, { content });
      setApplyStatus(`✅ 已保存到第${num}章「${target.title}」`);
      setApplyChapter('');
      // 刷新章节列表
      getOutlines(novelId).then(setOutlines).catch(() => {});
    } catch (e) {
      setApplyStatus('❌ 保存失败：' + e.message);
    }
    setTimeout(() => setApplyStatus(''), 3000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {messages.map((msg, i) => (
          <div key={i}>
            <div style={{
              display: 'flex', marginBottom: 4,
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
            }}>
              <div style={{
                maxWidth: '85%',
                padding: '10px 14px',
                borderRadius: 12,
                fontSize: 13,
                lineHeight: 1.7,
                whiteSpace: 'pre-wrap',
                background: msg.role === 'user' ? '#c9a84c' : '#fff',
                color: msg.role === 'user' ? '#fff' : '#333',
                border: msg.role === 'user' ? 'none' : '1px solid #e8e2d8',
              }}>
                {msg.content}
              </div>
            </div>

            {/* 应用到章节按钮（AI 回复才显示） */}
            {msg.role === 'assistant' && msg.content.length > 100 && (
              <div style={{ display: 'flex', gap: 6, marginBottom: 12, marginLeft: 4, alignItems: 'center' }}>
                <button
                  onClick={() => {
                    setApplyTarget(i);
                    setApplyChapter('');
                    setApplyStatus('');
                  }}
                  style={{
                    padding: '4px 10px', borderRadius: 4, border: '1px solid #c9a84c',
                    background: 'transparent', color: '#c9a84c', cursor: 'pointer',
                    fontSize: 11,
                  }}
                >📥 应用到章节</button>
                {applyTarget === i && (
                  <span style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 12 }}>
                    第
                    <input
                      value={applyChapter}
                      onChange={e => setApplyChapter(e.target.value.replace(/\D/g, ''))}
                      placeholder="章号"
                      style={{
                        width: 50, padding: '3px 6px', borderRadius: 4,
                        border: '1px solid #e2dcd2', fontSize: 12, textAlign: 'center'
                      }}
                      autoFocus
                    />
                    章
                    <button
                      onClick={() => handleApply(msg.content)}
                      style={{
                        padding: '3px 10px', borderRadius: 4, border: 'none',
                        background: '#c9a84c', color: '#fff', cursor: 'pointer', fontSize: 11
                      }}
                    >确定</button>
                    <button
                      onClick={() => setApplyTarget(null)}
                      style={{ padding: '3px 6px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#b0a898' }}
                    >取消</button>
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
        {applyStatus && (
          <div style={{ fontSize: 12, color: applyStatus.includes('✅') ? '#3a7' : '#c44', padding: '4px 8px', marginBottom: 8 }}>
            {applyStatus}
          </div>
        )}
        {loading && (
          <div style={{ display: 'flex', marginBottom: 12 }}>
            <div style={{ padding: '10px 14px', borderRadius: 12, fontSize: 13, background: '#fff', border: '1px solid #e8e2d8', color: '#b0a898' }}>
              ✍️ 思考中...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ borderTop: '1px solid #e8e2d8', padding: '12px 0', display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="说点什么，比如「优化第三章」..."
          style={{
            flex: 1, padding: '9px 14px', borderRadius: 8,
            border: '1px solid #e2dcd2', background: '#faf8f5',
            color: '#2c2c2c', fontSize: 13, outline: 'none', fontFamily: 'inherit'
          }}
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          style={{
            padding: '9px 20px', borderRadius: 8, border: 'none',
            background: loading ? '#ddd' : '#c9a84c', color: '#fff',
            fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >发送</button>
      </div>
    </div>
  );
}
