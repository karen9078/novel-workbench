import React, { useState } from 'react';
import { brainstorm } from '../api';

export default function Brainstorm({ novelId }) {
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setResult('');
    try {
      const data = await brainstorm(question);
      if (data.error) setResult(`错误：${data.error}`);
      else setResult(data.result);
    } catch (e) {
      setResult('请求失败，请检查后端是否运行');
    }
    setLoading(false);
  };

  return (
    <div className="section-card">
      <div style={{ padding: '14px 16px' }}>
        <h3 style={{ fontSize: 14, fontWeight: 500, color: '#c9a84c', marginBottom: 10 }}>
          💡 头脑风暴
        </h3>
        <div className="brainstorm-input">
          <input
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="输入你的问题，例如：开篇如何吸引读者？"
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />
          <button className="gold-btn" onClick={handleSubmit} disabled={loading}>
            {loading ? '思考中...' : '提问'}
          </button>
        </div>
        {loading && <div className="brainstorm-loading">AI 正在思考中...</div>}
        {result && !loading && (
          <div className="brainstorm-result">{result}</div>
        )}
      </div>
    </div>
  );
}
