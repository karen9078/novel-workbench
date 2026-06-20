/**
 * 通用平台发布服务
 * 通过用户提供的 Cookie 模拟浏览器发布到各平台
 */

// ─── 知乎发布 ───
async function publishToZhihu({ cookies, title, content }) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Cookie': cookies,
    'Content-Type': 'application/json',
    'Origin': 'https://zhuanlan.zhihu.com',
    'Referer': 'https://zhuanlan.zhihu.com/write',
    'x-requested-with': 'fetch',
  };

  // 1. 先创建草稿
  const draftRes = await fetch('https://zhuanlan.zhihu.com/api/articles/drafts', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      title,
      content,
      deltaTime: 0,
    })
  });

  if (!draftRes.ok) {
    const text = await draftRes.text();
    throw new Error(`知乎创建草稿失败 (${draftRes.status}): Cookie 可能已过期`);
  }

  const draft = await draftRes.json();
  return {
    url: `https://zhuanlan.zhihu.com/p/${draft.id}`,
    draftId: draft.id,
    note: '已发布到知乎草稿箱，请在知乎专栏后台预览并发布'
  };
}

// ─── 番茄小说发布（预留 ───
async function publishToFanqie({ cookies, title, chapters, novelId }) {
  // 番茄无公开 API，需 Puppeteer 浏览器自动化
  throw new Error('番茄小说发布功能即将上线，目前可使用「复制内容」手动粘贴到番茄作家助手');
}

// ─── 起点中文网发布（预留） ───
async function publishToQidian({ cookies, title, chapters, novelId }) {
  throw new Error('起点中文网发布功能即将上线，目前可使用「复制内容」手动粘贴到起点作家专区');
}

const PUBLISHERS = {
  zhihu: publishToZhihu,
  fanqie: publishToFanqie,
  qidian: publishToQidian,
};

module.exports = PUBLISHERS;
