import React, { useState, useEffect } from 'react';
import { getNovels, getNovelsOverview, createNovel, updateNovel, generateOutline, createOutline } from './api';
import Sidebar from './components/Sidebar';
import HomePage from './components/HomePage';
import ConverterPage from './components/ConverterPage';
import AIToolPage from './components/AIToolPage';
import NovelEditor from './components/NovelEditor';
import Modal from './components/Modal';
import Login from './pages/Login';
import Register from './pages/Register';

const GENRES = ['言情', '悬疑', '惊悚', '科幻', '武侠', '脑洞', '现实情感', '奇幻'];
const AUDIENCES = ['男频', '女频', '全频'];

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [novels, setNovels] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [audience, setAudience] = useState('全频');
  const [idea, setIdea] = useState('');
  const [activeView, setActiveView] = useState('home');
  const [converterFormat, setConverterFormat] = useState(null);
  const [aiTool, setAiTool] = useState(null);
  const [creating, setCreating] = useState(false);
  const [authPage, setAuthPage] = useState('login');
  const [initialTab, setInitialTab] = useState(null);
  const [initialFormat, setInitialFormat] = useState(null);
  const [routeTo, setRouteTo] = useState(null);
  const [hash, setHash] = useState('');

  // 监听 hash 变化（路由切换）
  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onHashChange);
    setHash(window.location.hash);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  useEffect(() => {
    const token = localStorage.getItem('token');
    
    // 试试免登录模式（开发模式）
    fetch('/api/auth/me', {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    })
      .then(r => r.json())
      .then(data => {
        if (data.id) {
          setUser(data);
        } else if (token) {
          localStorage.removeItem('token');
        }
        setAuthLoading(false);
      })
      .catch(() => {
        setAuthLoading(false);
      });
  }, []);

  const handleLogin = (token, userData) => {
    setUser(userData);
    window.location.hash = '';
  };

  const handleRegister = (token, userData) => {
    setUser(userData);
    window.location.hash = '';
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setNovels([]);
    setActiveId(null);
  };

  // ─── 小说数据 ───
  const loadNovels = async () => {
    try {
      const data = await getNovelsOverview();
      setNovels(data);
    } catch { /* api.js handles 401 redirect */ }
  };

  useEffect(() => {
    if (user) loadNovels();
  }, [user]);

  // ─── 快速创作 ───
  const handleQuickCreate = async () => {
    if (!idea.trim() && !newTitle.trim()) return;
    setCreating(true);
    const title = newTitle.trim() || idea.substring(0, 20) + '...';
    const novel = await createNovel({
      title,
      summary: idea || '',
      setting: { genre: selectedGenre, style: audience }
    });
    setNewTitle('');
    setIdea('');

    try {
      const data = await generateOutline(novel.id);
      if (data && data.error) {
        alert('章纲生成失败：' + data.error);
      } else if (data && data.result) {
        const lines = data.result.split('\n').filter(l => l.trim());
        let currentTitle = '';
        let currentSummary = '';
        let parsing = false;
        for (const line of lines) {
          const m = line.match(/^(?:第\d+章|第\d+节)[：:]\s*(.+)/);
          if (m) {
            if (currentTitle && currentSummary) {
              await createOutline(novel.id, { title: currentTitle, summary: currentSummary.trim() });
            }
            currentTitle = m[1].trim();
            currentSummary = '';
            parsing = true;
          } else if (parsing) {
            currentSummary += line + '\n';
          }
        }
        if (currentTitle && currentSummary) {
          await createOutline(novel.id, { title: currentTitle, summary: currentSummary.trim() });
        }
      }
    } catch (e) { /* ignore */ }

    await loadNovels();
    setActiveId(novel.id);
    setCreating(false);
  };

  const handleRename = async (id, newTitle) => {
    await updateNovel(id, { title: newTitle });
    await loadNovels();
  };

  // ─── 分组渲染 ───
  const renderGroup = (icon, label, items) => {
    if (items.length === 0) return null;
    return (
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#8a7a5a', marginBottom: 8, paddingLeft: 4 }}>
          {icon} {label} · {items.length}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {items.map(n => (
            <div key={n.id} className="feature-card" onClick={() => {
              if (routeTo) {
                setInitialTab(routeTo.tab);
                setInitialFormat(routeTo.format);
                setRouteTo(null);
              }
              setActiveId(n.id);
            }}
              style={{ cursor: 'pointer', flexDirection: 'row', alignItems: 'center', padding: '12px 16px' }}>
              <div style={{ fontSize: 18, marginRight: 12 }}>📄</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{n.title}</div>
                <div style={{ fontSize: 12, color: '#b0a898', marginTop: 2 }}>
                  {n.status === 'writing' && `已写 ${n.doneChapters}/${n.chapters} 章`}
                  {n.status === 'draft' && (n.summary ? n.summary.substring(0, 50) : '只有标题，尚未创作')}
                  {n.status === 'complete' && `全部 ${n.chapters} 章已完成`}
                </div>
              </div>
              <div style={{ fontSize: 12, color: '#c9a84c', fontWeight: 500 }}>
                {n.status === 'writing' ? '继续 →' : n.status === 'draft' ? '开始 →' : '查看 →'}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ─── 未登录状态 ───
  if (authLoading) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', color:'#b0a898', fontSize:14 }}>
        加载中...
      </div>
    );
  }

  if (!user) {
    if (authPage === 'register') {
      return <Register onRegister={handleRegister} onSwitch={() => setAuthPage('login')} />;
    }
    return <Login onLogin={handleLogin} onSwitch={() => setAuthPage('register')} />;
  }

  // 路由：编辑器（从AI工具页跳转）
  const editorMatch = hash.match(/^#\/editor\/([^/]+)\/(\w+)$/);
  if (editorMatch) {
    const editorNovelId = editorMatch[1];
    const editorTab = editorMatch[2];
    window.location.hash = '';
    return <NovelEditor novelId={editorNovelId} key={editorNovelId + '-' + editorTab}
      initialTab={editorTab}
      onBack={() => { setActiveView('home'); }} />;
  }

  // 路由：设置页
  if (hash === '#/settings') {
    const Settings = React.lazy(() => import('./pages/Settings'));
    return (
      <React.Suspense fallback={<div style={{ padding: 40, color: '#b0a898' }}>加载中...</div>}>
        <Settings user={user} onBack={() => { window.location.hash = ''; }} />
      </React.Suspense>
    );
  }

  // ─── 已登录：主界面 ───
  if (activeId) {
    return <NovelEditor novelId={activeId} key={activeId + (initialTab || '') + (initialFormat || '')} initialTab={initialTab} initialFormat={initialFormat} onBack={() => { setActiveId(null); setInitialTab(null); setInitialFormat(null); loadNovels(); }} />;
  }

  return (
    <div className="app">
      <Sidebar
        novels={novels}
        activeId={activeId}
        onSelect={(id, format) => {
          if (format && ['script','comic','storytelling','shortvideo','outline'].includes(format)) {
            setRouteTo({ tab: 'script', format });
            setActiveView('works');
            setActiveId(null);
          } else if (format && ['chat','rewrite','outlines'].includes(format)) {
            setRouteTo({ tab: format });
            setActiveView('works');
            setActiveId(null);
          } else {
            setRouteTo(null);
            setInitialFormat(null);
            setInitialTab(null);
            setActiveId(id);
          }
        }}
        onNew={() => setShowNewModal(true)}
        activeView={activeView}
        onViewChange={setActiveView}
        onRename={handleRename}
        user={user}
        onLogout={handleLogout}
        onConvert={(format) => {
          setConverterFormat(format);
          setActiveView('converter');
        }}
        onAITool={(tool) => {
          setAiTool(tool);
          setActiveView('aiTool');
        }}
      />
      <div className="main">
        {activeView === 'converter' ? (
          <ConverterPage
            initialFormat={converterFormat}
            onBack={() => { setActiveView('home'); setConverterFormat(null); }}
          />
        ) : activeView === 'aiTool' ? (
          <AIToolPage
            tool={aiTool}
            onBack={() => { setActiveView('home'); setAiTool(null); }}
            onOpenEditor={(novelId, tab) => {
              setActiveId(novelId);
              setInitialTab(tab);
              setActiveView('home');
              setAiTool(null);
            }}
          />
        ) : (
        <div className="home">
          {/* 首页仪表盘 */}
          {activeView === 'home' && (
            <HomePage
              novels={novels}
              user={user}
              onOpenNovel={(id) => { setActiveId(id); }}
              onQuickCreate={handleQuickCreate}
              idea={idea} setIdea={setIdea}
              selectedGenre={selectedGenre} setSelectedGenre={setSelectedGenre}
              audience={audience} setAudience={setAudience}
              creating={creating}
              onToolClick={(tool) => {
                if (tool === 'convert') {
                  setConverterFormat('script');
                  setActiveView('converter');
                } else if (novels.length > 0) {
                  setRouteTo({ tab: tool === 'chat' ? 'chat' : tool === 'rewrite' ? 'rewrite' : 'outlines', format: null });
                  setActiveView('works');
                }
              }}
            />
          )}

          {/* Works: 作品列表 */}
          {activeView === 'works' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700 }}>📚 我的作品</h2>
                <button className="quick-btn" onClick={() => setShowNewModal(true)} style={{ padding: '8px 18px', height: 'auto' }}>➕ 新建</button>
              </div>
              {novels.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60, color: '#b0a898' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📖</div>
                  <div>还没有作品，去首页快速创作吧</div>
                </div>
              ) : (
                <>
                  {renderGroup('✏️', '未写完', novels.filter(n => n.status === 'writing'))}
                  {renderGroup('📋', '草稿', novels.filter(n => n.status === 'draft'))}
                  {renderGroup('✅', '已完成', novels.filter(n => n.status === 'complete'))}
                </>
              )}
            </div>
          )}
        </div>
        )}
      </div>

      {showNewModal && (
        <Modal title="新建小说" onClose={() => setShowNewModal(false)} onConfirm={() => {
          if (newTitle.trim()) {
            createNovel({ title: newTitle.trim() }).then(n => {
              setNewTitle('');
              setShowNewModal(false);
              loadNovels();
              setActiveId(n.id);
            });
          }
        }} confirmText="创建">
          <label>小说名称</label>
          <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="输入小说标题" autoFocus />
        </Modal>
      )}
    </div>
  );
}
