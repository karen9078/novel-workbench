import React, { useState, useEffect } from 'react';
import { getNovelsOverview, getOutlines } from '../api';

const FORMATS = [
  { id: 'script',     icon: '🎬', label: '剧本写作', tag: '拍戏用' },
  { id: 'comic',      icon: '🎨', label: '漫画分镜', tag: '给画师参考' },
  { id: 'storytelling', icon: '🎙️', label: '说书稿', tag: '适合音频制作' },
  { id: 'shortvideo', icon: '📱', label: '短视频脚本', tag: '适合抖音/快手' },
  { id: 'outline',    icon: '📋', label: '章节梗概', tag: '200字浓缩核心情节' },
  { id: 'check',      icon: '🔍', label: '平台检测', tag: '审核安全评估' },
];

const FORMAT_PROMPTS = {
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
- 结尾悬念

直接输出，不要加说明。`,

  shortvideo: `请把下面这章小说转成**短视频脚本格式**，15-60秒的分镜。格式如下：

序号 | 画面 | 配音/对白 | 时长
---|---|---|---
1 | 画面描述 | 配音内容 | 5秒

直接输出，不要加说明。`,

  outline: `请把下面这章小说浓缩成**200字左右的梗概**，保留核心情节、冲突和转折。直接输出，不要加说明。`,

  check: `你是一个资深的内容安全审核专家，熟悉中国各大内容平台的审核规则。请分析以下文字，从这几个维度给出评估：

## 各平台风险评估
- **微信公众平台**：标题夸张？诱导分享？敏感词？AI味浓度？
- **知乎**：是否像营销号？内容质量？专业度？
- **抖音/快手**：开头是否吸引人？完播率预估？违规风险？
- **小红书**：是否像广告？真实感？限流风险？

## 综合评分
- 🤖 AI味浓度：0-100%
- 🚫 违规风险：高/中/低
- 📝 人工感：0-100%
- ✅ 综合评级：直接能发 / 建议修改再发 / 不建议发

输出格式要简洁清晰，每个平台用 1-2 句话评估，最后给评分汇总。`,
};

const FORMAT_TIPS = {
  script: {
    title: '🎬 剧本写作',
    tag: '拍戏用',
    desc: '将小说章节转为标准剧本格式，包含场景描述、角色对白和动作指示，可直接用于排练和拍摄。',
    who: '编剧、导演、拍摄团队、小说改编剧组',
    output: '场景分幕 + 角色对白 + 动作指示 + 景别标注',
    lines: ['每场标明：地点 · 时间 · 景别', '对白前标注角色名和情绪', '动作指示用【】括起来'],
    example: `场景1：总裁办公室 · 午后
【近景】林深坐在办公桌前，手指敲击桌面

林深（冷淡）：
  有什么事，直说。

苏晚晴（紧张）：
  我……我想请假。`,
    themeColor: '#c9a84c',
    bgGradient: 'linear-gradient(135deg, #faf8f5 0%, #f5f0e8 100%)',
  },
  comic: {
    title: '🎨 漫画分镜',
    tag: '给画师参考',
    desc: '把文字转化为画面描述+对白的分镜格式，画师可以直接根据分镜绘制漫画页面。',
    who: '漫画家、漫画编剧、插画师、条漫创作者',
    output: '按页分镜 + 画面描述 + 角色对白',
    lines: ['每页分镜：画面描述 + 对白', '画面描写角色的动作和表情', '对白用「」标注，清晰可读'],
    example: `第1页
【画面】林深站在落地窗前，逆光，侧脸轮廓分明。
对白：「这件事没得商量。」

第2页
【画面】苏晚晴低着头，双手攥紧衣角。
对白：「可是……我……」`,
    themeColor: '#e74c3c',
    bgGradient: 'linear-gradient(135deg, #fff5f5 0%, #ffe8e8 100%)',
  },
  storytelling: {
    title: '🎙️ 说书稿',
    tag: '适合音频制作',
    desc: '口语化浓缩小说内容，有引子、有节奏、有悬念，适合录制成音频故事或播客节目。',
    who: '音频主播、播客主、有声书制作人、自媒体创作者',
    output: '引子 + 正文讲述 + 结尾悬念',
    lines: ['开头要有"钩子"吸引听众', '口语化表达，多用短句', '结尾留悬念引导下集'],
    example: `【引子】朋友们，今天要讲一个关于"替身"的故事……
【正文】话说这天，林深坐在办公室里，心情烦躁。
【悬念】可他万万没想到，这个决定会让他后悔莫及……`,
    themeColor: '#8B4513',
    bgGradient: 'linear-gradient(135deg, #fef9f0 0%, #fdf0d5 100%)',
  },
  shortvideo: {
    title: '📱 短视频脚本',
    tag: '适合抖音/快手',
    desc: '按秒拆解分镜，画面+配音+时长一目了然，适合抖音、快手、小红书等短视频平台。',
    who: '短视频创作者、抖音运营、新媒体编辑、影视解说博主',
    output: '序号 | 画面 | 配音/对白 | 时长 表格',
    lines: ['15-60秒分镜，每镜5-10秒', '画面+配音+时长三要素', '开头3秒决定完播率'],
    example: `序号 | 画面 | 配音/对白 | 时长
1 | 林深坐在办公桌前，手指敲桌 | "他等了三年" | 3秒
2 | 门推开，苏晚晴走进来 | "她终于来了" | 3秒`,
    themeColor: '#1db954',
    bgGradient: 'linear-gradient(135deg, #f0faf4 0%, #dcf5e5 100%)',
  },
  outline: {
    title: '📋 章节梗概',
    tag: '200字浓缩核心情节',
    desc: '将一整章浓缩为200字左右的核心梗概，保留关键情节、冲突和转折，快速回顾不费力。',
    who: '读者回顾、作者整理大纲、编辑审稿、内容推广',
    output: '200字以内浓缩摘要',
    lines: ['浓缩核心情节，200字左右', '保留冲突和转折点', '去掉描写，只留骨架'],
    example: `林深拒绝了苏晚晴的请假申请。三日后苏晚晴在公司晕倒，送医后查出已怀孕两个月。林深得知后赶到医院，两人发生激烈争吵。最终林深态度软化，同意她休假。`,
    themeColor: '#6b5b95',
    bgGradient: 'linear-gradient(135deg, #f8f6fc 0%, #eeeaf8 100%)',
  },
  check: {
    title: '🔍 平台审核检测',
    tag: '发前必测',
    desc: '将你要发布的内容粘贴进来，AI会模拟微信、知乎、抖音、小红书等平台的审核规则，评估违规风险、AI味浓度、综合可发度。',
    who: '所有准备发布内容的创作者',
    output: '各平台风险评估 + 综合评分',
    lines: ['粘贴内容后点击检测', '覆盖微信/知乎/抖音/小红书', '给出修改建议'],
    example: `微信公众平台：⚠️ 标题有诱导嫌疑\n知乎：✅ 内容质量合格\n抖音：⚠️ 开头不够吸引人\n小红书：✅ 真实感较强\n\nAI味浓度：35% | 违规风险：低 | 综合评级：建议修改后再发`,
    themeColor: '#e74c3c',
    bgGradient: 'linear-gradient(135deg, #fff5f5 0%, #ffe8e8 100%)',
  },
};

export default function ConverterPage({ initialFormat, onBack }) {
  const [format, setFormat] = useState(initialFormat || 'script');
  const [novels, setNovels] = useState([]);
  const [selectedNovelId, setSelectedNovelId] = useState(null);
  const [outlines, setOutlines] = useState([]);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [novelLoading, setNovelLoading] = useState(false);
  const [checkText, setCheckText] = useState('');
  const [checkHistory, setCheckHistory] = useState([]);

  useEffect(() => {
    setNovelLoading(true);
    getNovelsOverview().then(data => {
      setNovels(data);
      setNovelLoading(false);
      if (data.length > 0 && !selectedNovelId) setSelectedNovelId(data[0].id);
    }).catch(() => setNovelLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedNovelId) { setOutlines([]); setSelectedChapter(null); return; }
    getOutlines(selectedNovelId).then(data => {
      setOutlines(data);
      // 自动选中第一章
      const valid = data.filter(o => (o.content && o.content.length > 50) || (o.summary && o.summary.length > 20));
      if (valid.length > 0) setSelectedChapter(valid[0].chapterNum);
    });
  }, [selectedNovelId]);

  const tip = FORMAT_TIPS[format];
  const chapters = outlines.filter(o => (o.content && o.content.length > 50) || (o.summary && o.summary.length > 20));
  const selectedNovel = novels.find(n => n.id === selectedNovelId);

  // 切换到平台检测时加载历史
  useEffect(() => {
    if (format === 'check') {
      fetch('/api/check/history', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
        .then(r => r.json()).then(setCheckHistory).catch(() => {});
    }
  }, [format]);

  const handleConvert = async () => {
    // 平台检测：使用粘贴的文本
    if (format === 'check') {
      if (!checkText.trim()) { setResult('❌ 请粘贴要检测的内容'); return; }
      setLoading(true); setResult(null);
      try {
        const prompt = FORMAT_PROMPTS.check + `\n\n## 待检测内容\n${checkText.substring(0, 4000)}`;
        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
          body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] })
        });
        const data = await res.json();
        if (data.result) {
          setResult(data.result);
          // 保存到历史
          fetch('/api/check/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: JSON.stringify({ inputText: checkText, resultText: data.result })
          }).then(() => {
            // 刷新历史列表
            fetch('/api/check/history', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
              .then(r => r.json()).then(setCheckHistory).catch(() => {});
          }).catch(() => {});
        } else setResult('❌ ' + (data.error || '检测失败'));
      } catch (e) { setResult('❌ 网络错误: ' + e.message); }
      setLoading(false);
      return;
    }

    if (!selectedChapter || !selectedNovelId) return;
    setLoading(true); setResult(null);
    try {
      const chapter = chapters.find(c => c.chapterNum === selectedChapter);
      if (!chapter) { setResult('❌ 未找到该章节数据'); setLoading(false); return; }
      const chapterText = (chapter.content && chapter.content.length > 50) ? chapter.content : (chapter.summary || '');
      if (!chapterText || chapterText.length < 10) { setResult('❌ 该章节没有可转换的内容，请先写正文或章纲'); setLoading(false); return; }
      const prompt = FORMAT_PROMPTS[format] + `\n\n第${chapter.chapterNum}章 ${chapter.title}\n\n${chapterText.substring(0, 4000)}`;
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ novelId: selectedNovelId, messages: [{ role: 'user', content: prompt }] })
      });
      const data = await res.json();
      if (data.result) setResult(data.result);
      else setResult('❌ ' + (data.error || '转换失败'));
    } catch (e) { setResult('❌ 网络错误: ' + e.message); }
    setLoading(false);
  };

  return (
    <div className="converter-page">
      <div className="converter-topbar">
        <button className="converter-back" onClick={onBack}>←</button>
        <span className="converter-topbar-title">🎬 内容转换</span>
        <div className="converter-topbar-spacer" />
        <div style={{ fontSize: 12, color: '#b0a898' }}>
          {selectedNovel ? selectedNovel.title : '未选择作品'}
        </div>
      </div>

      {/* 格式标签栏 */}
      <div className="converter-tabs">
        {FORMATS.map(f => (
          <button key={f.id} className={`converter-tab${format === f.id ? ' active' : ''}`}
            onClick={() => { setFormat(f.id); setResult(null); }}>
            <span className="converter-tab-icon">{f.icon}</span>
            <span className="converter-tab-label">{f.label}</span>
            <span className={`converter-tab-tag ${format === f.id ? 'visible' : ''}`}>{f.tag}</span>
          </button>
        ))}
      </div>

      <div className="converter-body">
        {/* 选择区 */}
        <div className="converter-select-area" style={{ background: tip.bgGradient, borderBottom: `3px solid ${tip.themeColor}` }}>
          {format === 'check' ? (
            /* 平台检测：粘贴文本 */
            <div>
              <div className="converter-select-row" style={{ marginBottom: 12 }}>
                <div className="converter-select-group" style={{ flex: 1, maxWidth: '100%' }}>
                  <label>📝 粘贴你要检测的内容</label>
                  <textarea value={checkText} onChange={e => { setCheckText(e.target.value); setResult(null); }}
                    placeholder="把你要发布到微信/知乎/抖音/小红书的内容粘贴在这里..."
                    style={{ width: '100%', minHeight: 120, padding: '10px 14px', borderRadius: 8, border: '1px solid #e2dcd2', background: '#fff', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', outline: 'none' }}
                  />
                </div>
              </div>
              <button className="converter-convert-btn" onClick={handleConvert} disabled={!checkText.trim() || loading}
                style={{ background: tip.themeColor, color: '#fff' }}>
                {loading ? '⏳ 检测中...' : '🔍 开始检测'}
              </button>
            </div>
          ) : (
          <div className="converter-select-row">
            <div className="converter-select-group">
              <label>📖 选择作品</label>
              <select value={selectedNovelId || ''} onChange={e => { setSelectedNovelId(e.target.value || null); setSelectedChapter(null); setResult(null); }} disabled={novelLoading}>
                {novelLoading ? <option>加载中...</option>
                  : novels.length === 0 ? <option>暂无作品，先去创作吧</option>
                  : novels.map(n => <option key={n.id} value={n.id}>{n.title} ({n.status === 'writing' ? '写作中' : n.status === 'draft' ? '草稿' : '已完成'})</option>)}
              </select>
            </div>
            <div className="converter-select-group">
              <label>📝 选择章节</label>
              <select value={selectedChapter || ''} onChange={e => { const val = e.target.value; setSelectedChapter(val ? Number(val) : null); }} disabled={!selectedNovelId}>
                <option value="">{!selectedNovelId ? '请先选择作品' : chapters.length === 0 ? '暂无已完成章节' : '-- 选择章节 --'}</option>
                {chapters.map(ch => <option key={ch.id} value={ch.chapterNum}>第{ch.chapterNum}章 {ch.title} ({((ch.content && ch.content.length > 50) ? ch.content.length : (ch.summary || '').length)}字)</option>)}
              </select>
            </div>
            <button className="converter-convert-btn" onClick={handleConvert} disabled={!selectedChapter || loading}
              style={{ background: tip.themeColor, color: '#fff' }}>
              {loading ? '⏳ 转换中...' : `🔄 转为${FORMATS.find(f => f.id === format)?.label}`}
            </button>
          </div>
          )}
        </div>

        <div className="converter-format-body">
          {/* 格式说明卡片 — 细化内容 */}
          <div className="converter-format-card" style={{ border: `1px solid ${tip.themeColor}`, borderLeft: `4px solid ${tip.themeColor}`, background: '#faf8f5' }}>
            <div className="converter-format-header">
              <span>{tip.title}</span>
              <span className="converter-format-tag" style={{ background: tip.themeColor, color: '#fff' }}>{tip.tag}</span>
            </div>
            <p className="converter-format-desc">{tip.desc}</p>
            <div className="converter-format-meta-row">
              <div className="converter-format-meta-item">
                <span className="converter-format-meta-label">🎯 适合谁用</span>
                <span className="converter-format-meta-value">{tip.who}</span>
              </div>
              <div className="converter-format-meta-item">
                <span className="converter-format-meta-label">📄 输出格式</span>
                <span className="converter-format-meta-value">{tip.output}</span>
              </div>
            </div>
            <div className="converter-format-tips">
              <span className="converter-format-meta-label" style={{ display: 'block', marginBottom: 6, fontSize: 11, color: '#b0a898' }}>💡 写作要点</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {tip.lines.map((line, i) => (
                  <span key={i} className="converter-tip-chip" style={{ borderColor: tip.themeColor, color: tip.themeColor }}>
                    {line}
                  </span>
                ))}
              </div>
            </div>
            <div className="converter-example" style={{ background: '#ede8de', border: `1px solid ${tip.themeColor}` }}>
              <div style={{ fontSize: 11, color: '#b0a898', marginBottom: 6 }}>📌 预览示例</div>
              <pre style={{ fontSize: 12, lineHeight: 1.8, margin: 0, whiteSpace: 'pre-wrap' }}>{tip.example}</pre>
            </div>
          </div>

          {loading && (
            <div className="converter-loading" style={{ color: tip.themeColor }}>
              <div className="converter-loading-spinner" style={{ borderTopColor: tip.themeColor }} />
              <span>✍️ AI 正在生成{FORMATS.find(f => f.id === format)?.label}...</span>
            </div>
          )}

          {result && !loading && (
            <div className="converter-result" style={{ border: `1px solid ${tip.themeColor}`, borderLeft: `4px solid ${tip.themeColor}`, background: '#faf8f5' }}>
              <div className="converter-result-header" style={{ borderBottom: '1px solid #e8e2d8' }}>
                <span>{FORMATS.find(f => f.id === format)?.icon} {format === 'check' ? '检测结果' : `第${selectedChapter}章 · ${FORMATS.find(f => f.id === format)?.label}`}</span>
                <button className="converter-copy-btn" onClick={e => {
                  e.preventDefault();
                  navigator.clipboard.writeText(result).catch(() => {
                    // Fallback: 选中文本复制
                    const ta = document.createElement('textarea');
                    ta.value = result;
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand('copy');
                    document.body.removeChild(ta);
                  });
                }} style={{ background: '#ece8e0', color: '#666' }}>📋 复制</button>
              </div>
              <pre className="converter-result-content">{result}</pre>
            </div>
          )}

          {/* 平台检测历史 */}
          {format === 'check' && checkHistory.length > 0 && (
            <div className="converter-format-card" style={{ border: '1px solid #e2dcd2', borderLeft: '4px solid #e74c3c', background: '#faf8f5' }}>
              <div className="converter-format-header" style={{ fontSize: 14 }}>📋 检测历史</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {checkHistory.map(h => (
                  <div key={h.id} style={{ padding: '10px 14px', background: '#fff', borderRadius: 8, border: '1px solid #e8e2d8', fontSize: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ color: '#b0a898', fontSize: 11 }}>{h.created_at?.replace('T', ' ').substring(0, 16)}</span>
                      <button onClick={() => {
                        fetch('/api/check/history/' + h.id, { method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
                          .then(() => fetch('/api/check/history', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
                            .then(r => r.json()).then(setCheckHistory).catch(() => {}));
                      }} style={{ background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: 12, padding: 0 }}>✕</button>
                    </div>
                    <div style={{ color: '#8a8278', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      📝 {h.input_text?.substring(0, 80)}...
                    </div>
                    <div style={{ color: '#666', lineHeight: 1.6, maxHeight: 60, overflow: 'hidden' }}>
                      {h.result_text?.substring(0, 150)}...
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {format !== 'check' && !selectedNovelId && !loading && !result && (
            <div className="converter-empty"><div style={{ fontSize: 40, marginBottom: 12 }}>📖</div><div>选择一个小说作品开始转换</div></div>
          )}
          {selectedNovelId && chapters.length === 0 && !loading && !result && (
            <div className="converter-empty"><div style={{ fontSize: 40, marginBottom: 12 }}>📝</div><div>这部作品还没有已完成的章节</div><div style={{ fontSize: 12, color: '#b0a898', marginTop: 4 }}>先去编辑器写正文吧 ✍️</div></div>
          )}
          {selectedNovelId && chapters.length > 0 && !loading && !result && !selectedChapter && (
            <div className="converter-empty"><div style={{ fontSize: 40, marginBottom: 12 }}>{FORMATS.find(f => f.id === format)?.icon}</div><div>选择章节后点击「转换」按钮</div></div>
          )}
        </div>
      </div>
    </div>
  );
}
