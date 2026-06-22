const BASE = '/api';

function getToken() {
  return localStorage.getItem('token');
}

async function apiFetch(url, options = {}) {
  const token = getToken();
  const headers = { ...options.headers };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    localStorage.removeItem('token');
    window.location.hash = '#/login';
    throw new Error('登录已过期');
  }
  return res.json();
}

export async function getNovels() {
  return apiFetch(`${BASE}/novels`);
}

export async function getNovelsOverview() {
  return apiFetch(`${BASE}/novels/overview`);
}

export async function getNovel(id) {
  return apiFetch(`${BASE}/novels/${id}`);
}

export async function createNovel(data) {
  return apiFetch(`${BASE}/novels`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
}

export async function updateNovel(id, data) {
  return apiFetch(`${BASE}/novels/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
}

export async function deleteNovel(id) {
  return apiFetch(`${BASE}/novels/${id}`, { method: 'DELETE' });
}

export async function getCharacters(novelId) {
  return apiFetch(`${BASE}/novels/${novelId}/characters`);
}

export async function createCharacter(novelId, data) {
  return apiFetch(`${BASE}/novels/${novelId}/characters`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
}

export async function updateCharacter(id, data) {
  return apiFetch(`${BASE}/characters/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
}

export async function deleteCharacter(id) {
  return apiFetch(`${BASE}/characters/${id}`, { method: 'DELETE' });
}

export async function getOutlines(novelId) {
  return apiFetch(`${BASE}/novels/${novelId}/outlines`);
}

export async function createOutline(novelId, data) {
  return apiFetch(`${BASE}/novels/${novelId}/outlines`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
}

export async function deleteOutline(id) {
  return apiFetch(`${BASE}/outlines/${id}`, { method: 'DELETE' });
}

export async function updateOutline(id, data) {
  return apiFetch(`${BASE}/outlines/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
}

export async function brainstorm(novelId, question) {
  return apiFetch(`${BASE}/ai/brainstorm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ novelId, question })
  });
}

export async function generateOutline(novelId) {
  return apiFetch(`${BASE}/ai/generate-outline`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ novelId })
  });
}

export async function generateChapter(outlineId, novelId) {
  return apiFetch(`${BASE}/ai/generate-chapter`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ outlineId, novelId })
  });
}

export async function polishText(text) {
  return apiFetch(`${BASE}/ai/polish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });
}

export async function rewriteIterate(originalText, style, history, feedback, writingIdea) {
  return apiFetch(`${BASE}/ai/rewrite-iterate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ originalText, style, history, feedback, writingIdea })
  });
}

export async function rewriteUrl(url, style) {
  return apiFetch(`${BASE}/ai/rewrite-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, style })
  });
}

export async function rewriteText(text, style, reference, writingIdea) {
  return apiFetch(`${BASE}/ai/rewrite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, style, reference, writingIdea })
  });
}

export async function reviseChapter(content, feedback) {
  return apiFetch(`${BASE}/ai/revise-chapter`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, feedback })
  });
}

export async function continueText(text, instruction) {
  return apiFetch(`${BASE}/ai/continue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, instruction })
  });
}

export async function completeText(before, after) {
  return apiFetch(`${BASE}/ai/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ before, after })
  });
}

export async function exportNovel(novelId) {
  const novel = await getNovel(novelId);
  const outlines = await getOutlines(novelId);
  let text = `${novel.title}\n${'='.repeat(novel.title.length)}\n\n`;
  text += `简介：${novel.summary || '无'}\n\n`;
  outlines.forEach((o, i) => {
    text += `第${i + 1}章 ${o.title}\n${'-'.repeat(20)}\n`;
    text += `【章纲】${o.summary}\n\n`;
    if (o.content) text += `${o.content}\n\n`;
  });
  return text;
}

export async function publishNovel(novelId, platform) {
  return apiFetch(`${BASE}/export/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ novelId, platform })
  });
}

export async function publishToWeixin(novelId, author) {
  return apiFetch(`${BASE}/publish/weixin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ novelId, author })
  });
}

export async function savePlatformCookie(platform, cookies) {
  return apiFetch(`${BASE}/settings/${platform}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cookies })
  });
}

export async function getPlatformStatus(platform) {
  return apiFetch(`${BASE}/settings/${platform}`);
}

export async function publishToPlatform(platform, novelId) {
  return apiFetch(`${BASE}/publish/${platform}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ novelId })
  });
}
