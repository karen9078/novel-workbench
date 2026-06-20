import React, { useState } from 'react';

export default function Sidebar({ novels, activeId, activeView, onViewChange, onSelect, onNew, onRename, user, onLogout, onConvert, onAITool }) {
  const [showGroup, setShowGroup] = useState(false);
  const [worksOpen, setWorksOpen] = useState(true);
  const [writingOpen, setWritingOpen] = useState(true);
  const [aiOpen, setAiOpen] = useState(true);

  const renderNovelGroup = (icon, label, items) => {
    if (items.length === 0) return null;
    return (
      <>
        <div style={{ padding: '4px 12px 2px 28px', fontSize: 11, color: '#b0a898' }}>
          {icon} {label} · {items.length}
        </div>
        {items.map(n => (
          <div key={n.id}
            className={`menu-item${activeId === n.id ? ' active' : ''}`}
            onClick={() => onSelect(n.id, null)}
            style={{ paddingLeft: 36, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>📄 {n.title}</span>
            <span style={{ fontSize: 10, color: '#b0a898', marginLeft: 6, flexShrink: 0 }}>
              {n.totalWords ? (n.totalWords > 1000 ? `${(n.totalWords / 1000).toFixed(0)}k` : n.totalWords) : ''}字
            </span>
          </div>
        ))}
      </>
    );
  };

  const itemBase = {
    padding: '8px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 13,
    color: '#666', fontWeight: 400, background: 'transparent',
    display: 'flex', alignItems: 'center', gap: 8,
  };

  return (
    <div className="sidebar">
      <div className="sidebar-brand">
        <img src="/logo.png" alt="logo" style={{ width: 28, height: 28, borderRadius: 6 }} />
        <span className="sidebar-brand-text">写作工坊</span>
      </div>

      <div className="sidebar-menu">

        {/* ─── 我的作品（可折叠） ─── */}
        <div style={itemBase} onClick={() => setWorksOpen(!worksOpen)}>
          <span style={{ transition: 'transform 0.2s', transform: worksOpen ? 'rotate(90deg)' : 'none', fontSize: 11 }}>▶</span>
          📚 我的作品
        </div>

        {worksOpen && (
          <div style={{ paddingLeft: 12 }}>
            {novels.length === 0 ? (
              <div style={{ padding: '8px 12px', fontSize: 12, color: '#b0a898' }}>还没有作品</div>
            ) : (
              <>
                {renderNovelGroup('✏️', '未写完', novels.filter(n => n.status === 'writing'))}
                {renderNovelGroup('📋', '草稿', novels.filter(n => n.status === 'draft'))}
                {renderNovelGroup('✅', '已完成', novels.filter(n => n.status === 'complete'))}
              </>
            )}
          </div>
        )}

        <div className="menu-divider" />

        {/* ─── 小说写作（可折叠） ─── */}
        <div style={itemBase} onClick={() => setWritingOpen(!writingOpen)}>
          <span style={{ transition: 'transform 0.2s', transform: writingOpen ? 'rotate(90deg)' : 'none', fontSize: 11 }}>▶</span>
          📝 小说写作
        </div>

        {writingOpen && (
          <>


            {/* 内容转换 — 点击进入独立页面，顶部有5格式标签可切换 */}
            <div style={itemBase}
              onClick={() => { if (onConvert) onConvert('script'); }}
            >
              🎬 内容转换
            </div>
          </>
        )}

        <div className="menu-divider" />

        {/* ─── AI 工具（可折叠） ─── */}
        <div style={itemBase} onClick={() => setAiOpen(!aiOpen)}>
          <span style={{ transition: 'transform 0.2s', transform: aiOpen ? 'rotate(90deg)' : 'none', fontSize: 11 }}>▶</span>
          🤖 AI 工具
        </div>

        {aiOpen && (
          <>
            <div style={{ ...itemBase, paddingLeft: 28 }}
              onClick={() => { if (onAITool) onAITool('chat'); }}
            >💬 AI 对话改文</div>

            <div style={{ ...itemBase, paddingLeft: 28 }}
              onClick={() => { if (onAITool) onAITool('rewrite'); }}
            >🔄 改写润色</div>

            <div style={{ ...itemBase, paddingLeft: 28 }}
              onClick={() => { if (onAITool) onAITool('outlines'); }}
            >✍️ 续写补全</div>
          </>
        )}

        <div className="menu-divider" />

        {/* ─── 更多 ─── */}
        <div style={itemBase} onClick={() => setShowGroup(true)}>💬 用户群</div>

        <div className="menu-divider" />

        {/* ─── 设置 ─── */}
        <div className="menu-label">设置</div>
        <div style={itemBase} onClick={() => window.location.hash = '#/settings'}>⚙️ 平台设置</div>


      </div>

      {/* 用户群弹窗 */}
      {showGroup && (
        <div className="modal-overlay" onClick={() => setShowGroup(false)}>
          <div className="modal" style={{ width: 360, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <h3>💬 用户群</h3>
            <div style={{ padding: '20px 0', color: '#b0a898', fontSize: 13, lineHeight: 2 }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>📱</div>
              <div>微信群二维码</div>
              <div style={{ fontSize: 12, color: '#ccc', marginTop: 8 }}>（把你的群二维码放到 public/group.png 即可显示）</div>
            </div>
            <div className="modal-btns" style={{ justifyContent: 'center' }}>
              <button className="modal-confirm" onClick={() => setShowGroup(false)}>知道了</button>
            </div>
          </div>
        </div>
      )}

      <div className="sidebar-footer">
        <div style={{ fontSize: 12, marginBottom: 2 }}>{user?.username || user?.email}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <span>小说工坊 v1.0</span>
          <span>·</span>
          <button onClick={onLogout} style={{ background: 'none', border: 'none', color: '#b0a898', cursor: 'pointer', fontSize: 11, textDecoration: 'underline' }}>退出</button>
        </div>
      </div>
    </div>
  );
}
