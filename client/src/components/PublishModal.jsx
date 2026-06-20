import React, { useState, useEffect } from 'react';
import { publishNovel, publishToWeixin } from '../api';

const PLATFORMS = [
  { id: 'fanqie', name: '番茄小说', icon: '🍅', desc: '纯文本，粘贴到番茄作家助手' },
  { id: 'qidian', name: '起点中文网', icon: '📚', desc: '纯文本，起点后台直接粘贴' },
  { id: 'zhihu', name: '知乎专栏', icon: '💡', desc: 'Markdown，知乎支持富文本粘贴' },
  { id: 'weixin', name: '微信公众号', icon: '📢', desc: '纯文本分段，贴到公众号编辑器' },
  { id: 'txt', name: 'TXT 完整导出', icon: '📄', desc: '含章纲和正文，离线存档' },
];

export default function PublishModal({ novelId, title, onClose }) {
  const [platform, setPlatform] = useState('fanqie');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // 自动发布状态
  const [publishing, setPublishing] = useState(false);
  const [publishMsg, setPublishMsg] = useState(null);

  useEffect(() => {
    if (!novelId) return;
    setLoading(true);
    setPublishMsg(null);
    publishNovel(novelId, platform)
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [novelId, platform]);

  const handleCopy = async () => {
    if (!data?.content) return;
    try {
      await navigator.clipboard.writeText(data.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = data.content;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleAutoPublish = async () => {
    setPublishing(true);
    setPublishMsg({ type: 'info', text: '正在发送到微信草稿箱...' });
    try {
      const result = await publishToWeixin(novelId);
      if (result.success) {
        setPublishMsg({
          type: 'success',
          text: `✅ 已发送「${result.chapterSent}」到微信草稿箱`,
          url: result.url,
          note: result.note
        });
      } else {
        setPublishMsg({ type: 'error', text: result.error || '发布失败' });
      }
    } catch (e) {
      setPublishMsg({ type: 'error', text: e.message || '发布失败' });
    }
    setPublishing(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 600, maxWidth: '92vw' }} onClick={e => e.stopPropagation()}>
        <h3>📤 一键发布 · {title}</h3>

        {/* Platform Selection */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
          {PLATFORMS.map(p => (
            <div
              key={p.id}
              onClick={() => setPlatform(p.id)}
              style={{
                padding: '10px 12px',
                borderRadius: 8,
                border: `2px solid ${platform === p.id ? '#c9a84c' : '#e2dcd2'}`,
                background: platform === p.id ? '#faf6ee' : '#faf8f5',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>
                {p.icon} {p.name}
              </div>
              <div style={{ fontSize: 11, color: '#b0a898' }}>{p.desc}</div>
            </div>
          ))}
        </div>

        {/* Stats */}
        {data && (
          <div style={{
            display: 'flex', gap: 16, padding: '8px 12px',
            background: '#faf8f5', borderRadius: 6, marginBottom: 12,
            fontSize: 12, color: '#8a8278'
          }}>
            <span>📖 共 <strong style={{ color: '#c9a84c' }}>{data.chapterCount}</strong> 章</span>
            <span>📝 约 <strong style={{ color: '#c9a84c' }}>{(data.wordCount / 10000).toFixed(1)}</strong> 万字</span>
            <span>💡 {data.note}</span>
          </div>
        )}

        {/* Publish Status */}
        {publishMsg && (
          <div style={{
            padding: '10px 14px',
            borderRadius: 8,
            marginBottom: 12,
            fontSize: 12,
            lineHeight: 1.6,
            background: publishMsg.type === 'success' ? '#f0fff0' : publishMsg.type === 'error' ? '#fff0f0' : '#f0f8ff',
            color: publishMsg.type === 'success' ? '#3a7' : publishMsg.type === 'error' ? '#c44' : '#3a8',
          }}>
            <div>{publishMsg.text}</div>
            {publishMsg.url && (
              <div style={{ marginTop: 6 }}>
                <a href={publishMsg.url} target="_blank" rel="noreferrer"
                  style={{ color: '#c9a84c', textDecoration: 'underline' }}
                >📎 去微信草稿箱查看 →</a>
              </div>
            )}
            {publishMsg.note && publishMsg.note !== publishMsg.text && (
              <div style={{ marginTop: 4, color: '#b0a898' }}>{publishMsg.note}</div>
            )}
          </div>
        )}

        {/* Preview */}
        <div style={{
          border: '1px solid #e2dcd2', borderRadius: 8,
          background: '#fff', maxHeight: 320, overflow: 'auto',
          padding: 16, marginBottom: 12, fontSize: 13, lineHeight: 1.8,
          whiteSpace: 'pre-wrap', color: '#333', fontFamily: 'inherit'
        }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: '#b0a898', padding: 40 }}>
              生成中...
            </div>
          ) : data ? (
            data.content.substring(0, 2000) + (data.content.length > 2000 ? '\n\n...（预览截断，复制后获取完整内容）' : '')
          ) : (
            <div style={{ textAlign: 'center', color: '#b0a898', padding: 40 }}>
              暂无内容
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="modal-btns" style={{ flexWrap: 'wrap', gap: 8 }}>
          <button className="modal-cancel" onClick={onClose}>关闭</button>

          {platform === 'weixin' && (
            <button
              onClick={handleAutoPublish}
              disabled={publishing}
              style={{
                padding: '8px 20px',
                background: publishing ? '#ccc' : '#4a8',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                cursor: publishing ? 'not-allowed' : 'pointer',
                fontSize: 13,
                fontWeight: 600,
                transition: 'all 0.2s',
              }}
            >
              {publishing ? '⏳ 发送中...' : '📤 直接发送到微信草稿箱'}
            </button>
          )}

          <button
            className="modal-confirm"
            onClick={handleCopy}
            disabled={!data?.content}
            style={{
              padding: '8px 24px',
              background: copied ? '#6c9' : '#c9a84c',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              transition: 'all 0.2s',
            }}
          >
            {copied ? '✅ 已复制' : '📋 复制内容'}
          </button>
        </div>
      </div>
    </div>
  );
}
