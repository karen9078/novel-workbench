/**
 * 微信公众平台 API 服务
 * 功能：创建图文草稿到草稿箱
 */
const WX_API = 'https://api.weixin.qq.com';

/**
 * 获取 access_token
 */
async function getAccessToken(appId, appSecret) {
  const url = `${WX_API}/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.errcode) {
    throw new Error(`微信 token 获取失败: ${data.errmsg} (${data.errcode})`);
  }
  return data.access_token;
}

/**
 * 上传图片获取 media_id（封面图）
 * 如果不上传，返回空字符串
 */
async function uploadImage(accessToken, imageUrl) {
  if (!imageUrl) return '';
  try {
    const res = await fetch(`${WX_API}/cgi-bin/material/add_material?access_token=${accessToken}&type=image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: imageUrl })
    });
    const data = await res.json();
    if (data.media_id) return data.media_id;
    return '';
  } catch {
    return '';
  }
}

/**
 * 将小说内容转为微信图文格式（HTML）
 */
function contentToWeChatHtml(title, chapters) {
  let html = `<section style="padding: 10px 0;">`;
  html += `<h2 style="text-align: center; font-size: 18px; color: #333;">${title}</h2>`;
  html += `<hr style="border: none; border-top: 1px solid #ddd; margin: 15px 0;">`;

  chapters.forEach((ch, i) => {
    html += `<h3 style="font-size: 16px; color: #555; margin-top: 20px;">第${i + 1}章 ${ch.title}</h3>`;
    const content = ch.content || ch.summary;
    if (content) {
      // 分段处理
      const paragraphs = content.split('\n').filter(p => p.trim());
      paragraphs.forEach(p => {
        html += `<p style="font-size: 15px; line-height: 1.8; text-indent: 2em; margin: 8px 0;">${escapeHtml(p.trim())}</p>`;
      });
    }
  });

  html += `</section>`;
  return html;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * 创建图文草稿
 */
async function createDraft(accessToken, { title, author, digest, content, thumbMediaId }) {
  const body = {
    articles: [{
      title: title.substring(0, 64),  // 微信限制64字
      author: author || '小说工坊',
      digest: digest || title,
      content: content,
      content_source_url: '',
      thumb_media_id: thumbMediaId || undefined,
      need_open_comment: 0,
      only_fans_can_comment: 0,
    }]
  };

  const res = await fetch(`${WX_API}/cgi-bin/draft/add?access_token=${accessToken}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (data.errcode) {
    throw new Error(`微信创建草稿失败: ${data.errmsg} (${data.errcode})`);
  }
  return data;
}

/**
 * 一键发送到微信草稿箱
 * @param {object} params
 * @param {string} params.appId - 公众号 AppID
 * @param {string} params.appSecret - 公众号 AppSecret
 * @param {string} params.title - 文章标题
 * @param {Array} params.chapters - 章节列表 [{title, content, summary}]
 * @param {string} params.author - 作者（可选）
 * @param {string} params.coverImage - 封面图 URL（可选）
 * @returns {{ mediaId: string, url: string }}
 */
async function publishToDraft(params) {
  const { appId, appSecret, title, chapters, author, coverImage } = params;

  // 1. 获取 token
  const token = await getAccessToken(appId, appSecret);

  // 2. 上传封面（可选）
  const thumbMediaId = coverImage ? await uploadImage(token, coverImage) : '';

  // 3. 生成 HTML 内容
  const content = contentToWeChatHtml(title, chapters);

  // 4. 创建草稿
  const digest = chapters.length > 0
    ? (chapters[0].content || chapters[0].summary || title).substring(0, 64)
    : title;
  const result = await createDraft(token, {
    title,
    author: author || undefined,
    digest,
    content,
    thumbMediaId
  });

  return {
    mediaId: result.media_id,
    url: `https://mp.weixin.qq.com/cgi-bin/appmsg?t=media/appmsg_edit&action=edit&type=10&appid=${appId}&token=&lang=zh_CN`,
  };
}

module.exports = { publishToDraft };
