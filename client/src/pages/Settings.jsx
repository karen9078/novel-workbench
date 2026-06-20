import React, { useState, useEffect } from 'react';

const PLATFORMS = [
  {
    id: 'weixin', name: '微信公众号', icon: '📢',
    desc: 'AppID + AppSecret，自动发到草稿箱',
    type: 'secret', // 需要 AppID + AppSecret
    hint: (
      <div style={{ fontSize: 12, color: '#b0a898', lineHeight: 1.6, marginBottom: 12, background: '#faf8f5', padding: 10, borderRadius: 6 }}>
        <strong>如何获取？</strong><br />
        1. 登录 <a href="https://mp.weixin.qq.com" target="_blank" rel="noreferrer" style={{ color: '#c9a84c' }}>mp.weixin.qq.com</a><br />
        2. 设置与开发 → 基本配置 → 查看 AppID / 生成 AppSecret
      </div>
    ),
  },
  {
    id: 'zhihu', name: '知乎专栏', icon: '💡',
    desc: '粘贴 Cookie，自动创建草稿',
    type: 'cookie',
    hint: (
      <div style={{ fontSize: 12, color: '#b0a898', lineHeight: 1.6, marginBottom: 12, background: '#faf8f5', padding: 10, borderRadius: 6 }}>
        <strong>如何获取 Cookie？</strong><br />
        1. 浏览器登录 <a href="https://www.zhihu.com" target="_blank" rel="noreferrer" style={{ color: '#c9a84c' }}>zhihu.com</a><br />
        2. F12 打开开发者工具 → Network 标签<br />
        3. 刷新页面，点击任意请求 → 找到 Request Headers → Cookie<br />
        4. 右键 Copy → Copy value，粘贴到下方<br /><br />
        <strong>注意：</strong>Cookie 过期后需要重新配置
      </div>
    ),
  },
  {
    id: 'fanqie', name: '番茄小说', icon: '🍅',
    desc: '即将上线（目前可复制粘贴发布）',
    type: 'soon',
    hint: null,
  },
  {
    id: 'qidian', name: '起点中文网', icon: '📚',
    desc: '即将上线（目前可复制粘贴发布）',
    type: 'soon',
    hint: null,
  },
];

const styles = {
  container: { padding: '28px 36px', maxWidth: 640, margin: '0 auto', width: '100%' },
  title: { fontSize: 18, fontWeight: 700, marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#b0a898', marginBottom: 24 },
  btn: { padding: '8px 20px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.2s' },
  input: { width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #e2dcd2', background: '#faf8f5', color: '#2c2c2c', fontSize: 13, outline: 'none', marginBottom: 12, fontFamily: 'monospace' },
  textarea: { width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #e2dcd2', background: '#faf8f5', color: '#2c2c2c', fontSize: 12, outline: 'none', marginBottom: 12, fontFamily: 'monospace', minHeight: 80, resize: 'vertical' },
  securityCard: { background: '#fffbf0', border: '1px solid #f0dca0', borderRadius: 10, padding: 16, marginBottom: 16, fontSize: 12, lineHeight: 1.6, color: '#8a7a5a' },
};

export default function Settings({ user, onBack }) {
  const [activePlatform, setActivePlatform] = useState('weixin');
  const [appId, setAppId] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [cookies, setCookies] = useState('');
  const [statuses, setStatuses] = useState({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    PLATFORMS.filter(p => p.type !== 'soon').forEach(p => {
      fetch(`/api/settings/${p.id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
        .then(r => r.json())
        .then(d => setStatuses(s => ({ ...s, [p.id]: d.configured })))
        .catch(() => {});
    });
  }, []);

  const handleSaveWeixin = async () => {
    if (!appId.trim() || !appSecret.trim()) {
      setMsg({ type: 'error', text: '请填写 AppID 和 AppSecret' });
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch('/api/settings/weixin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ appId: appId.trim(), appSecret: appSecret.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setStatuses(s => ({ ...s, weixin: true }));
        setMsg({ type: 'success', text: '✅ 微信凭证已加密保存' });
        setAppSecret('');
      } else {
        setMsg({ type: 'error', text: data.error || '保存失败' });
      }
    } catch (e) { setMsg({ type: 'error', text: '网络错误' }); }
    setSaving(false);
  };

  const handleSaveCookie = async (platform) => {
    if (!cookies.trim()) {
      setMsg({ type: 'error', text: '请粘贴 Cookie' });
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/settings/${platform}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ cookies: cookies.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setStatuses(s => ({ ...s, [platform]: true }));
        setMsg({ type: 'success', text: '✅ Cookie 已加密保存' });
        setCookies('');
      } else {
        setMsg({ type: 'error', text: data.error || '保存失败' });
      }
    } catch (e) { setMsg({ type: 'error', text: '网络错误' }); }
    setSaving(false);
  };

  const plat = PLATFORMS.find(p => p.id === activePlatform);
  if (!plat) return null;

  return (
    <div className="app">
      <div className="sidebar" style={{ width: 220, minWidth: 220, background: '#faf8f5', borderRight: '1px solid #e8e2d8', display: 'flex', flexDirection: 'column' }}>
        <div className="sidebar-brand">
          <img src="/logo.png" alt="logo" style={{ width: 28, height: 28, borderRadius: 6 }} />
          <span className="sidebar-brand-text">小说工坊</span>
        </div>
        <div className="sidebar-menu">
          <div className="menu-item" onClick={onBack}>🏠 返回首页</div>
          <div className="menu-divider" />
          <div className="menu-label">发布设置</div>
          {PLATFORMS.map(p => (
            <div
              key={p.id}
              className={`menu-item${activePlatform === p.id ? ' active' : ''}`}
              onClick={() => { setActivePlatform(p.id); setMsg(null); }}
            >
              {p.icon} {p.name}
              {p.type === 'soon' && <span style={{ fontSize: 10, color: '#b0a898', marginLeft: 4 }}>即将</span>}
              {statuses[p.id] && <span style={{ marginLeft: 'auto', fontSize: 11, color: '#6c9' }}>✓</span>}
            </div>
          ))}
        </div>
        <div className="sidebar-footer">{user?.username || user?.email}</div>
      </div>

      <div className="main" style={{ overflowY: 'auto' }}>
        <div style={styles.container}>
          <div style={styles.title}>{plat.icon} {plat.name}</div>
          <div style={styles.subtitle}>{plat.desc}</div>

          {/* 安全声明 */}
          {plat.type !== 'soon' && (
            <div style={styles.securityCard}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>🔐 安全保障</div>
              <div>
                • Cookie / AppSecret 使用 <strong>AES-256-GCM</strong> 加密存储<br />
                • 仅在发布时于服务端解密使用，用后即弃<br />
                • 前端永不返回完整的密钥信息
              </div>
            </div>
          )}

          {msg && (
            <div style={{
              padding: 8, borderRadius: 6, marginBottom: 12, textAlign: 'center',
              fontSize: 12,
              background: msg.type === 'success' ? '#f0fff0' : '#fff0f0',
              color: msg.type === 'success' ? '#3a7' : '#c44',
            }}>{msg.text}</div>
          )}

          {plat.type === 'soon' ? (
            <div style={{ background: '#fff', borderRadius: 10, padding: 40, border: '1px solid #e8e2d8', textAlign: 'center', color: '#b0a898' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🚧</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#8a7a5a', marginBottom: 4 }}>即将上线</div>
              <div style={{ fontSize: 12 }}>目前请使用「发布 → 复制内容」手动粘贴发布</div>
            </div>
          ) : plat.type === 'secret' ? (
            <div style={{ background: '#fff', borderRadius: 10, padding: 20, border: '1px solid #e8e2d8' }}>
              {plat.hint}
              <div style={{ fontSize: 12, color: '#b0a898', marginBottom: 4, fontWeight: 500 }}>AppID</div>
              <input style={styles.input} value={appId} onChange={e => setAppId(e.target.value)} placeholder="wx..." />
              <div style={{ fontSize: 12, color: '#b0a898', marginBottom: 4, fontWeight: 500 }}>AppSecret</div>
              <input style={styles.input} type="password" value={appSecret} onChange={e => setAppSecret(e.target.value)} placeholder={statuses.weixin ? '输入新密钥更新...' : '输入 AppSecret'} />
              <button style={{ ...styles.btn, background: '#c9a84c', color: '#fff' }} onClick={handleSaveWeixin} disabled={saving}>
                {saving ? '加密保存中...' : statuses.weixin ? '更新配置' : '保存配置'}
              </button>
            </div>
          ) : (
            <div style={{ background: '#fff', borderRadius: 10, padding: 20, border: '1px solid #e8e2d8' }}>
              {plat.hint}
              <div style={{ fontSize: 12, color: '#b0a898', marginBottom: 4, fontWeight: 500 }}>Cookie</div>
              <textarea
                style={styles.textarea}
                value={cookies}
                onChange={e => setCookies(e.target.value)}
                placeholder="粘贴完整的 Cookie 字符串..."
              />
              <button style={{ ...styles.btn, background: '#c9a84c', color: '#fff' }} onClick={() => handleSaveCookie(plat.id)} disabled={saving}>
                {saving ? '加密保存中...' : statuses[plat.id] ? '更新 Cookie' : '保存 Cookie'}
              </button>
            </div>
          )}

          <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            <button style={{ ...styles.btn, background: '#ece8e0', color: '#666' }} onClick={onBack}>返回首页</button>
          </div>
        </div>
      </div>
    </div>
  );
}
