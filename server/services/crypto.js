/**
 * 凭证加密工具
 * 使用 AES-256-GCM 加密存储用户平台凭证
 */
const crypto = require('crypto');

// 加密密钥：优先用环境变量，否则用设备指纹
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'novel-wb-default-key-do-not-use-in-prod-32b';

// 从密钥派生出 32 字节的 AES 密钥
function deriveKey() {
  return crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
}

/**
 * 加密
 * @param {string} text - 明文
 * @returns {string} base64 编码的密文 (iv:authTag:ciphertext)
 */
function encrypt(text) {
  const key = deriveKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  
  // 格式: iv:authTag:ciphertext
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * 解密
 * @param {string} encryptedText - 加密文本
 * @returns {string} 明文
 */
function decrypt(encryptedText) {
  try {
    const key = deriveKey();
    const parts = encryptedText.split(':');
    if (parts.length !== 3) return null;
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return null;
  }
}

/**
 * 安全遮盖密钥（只显示前4位和后4位）
 */
function maskSecret(secret) {
  if (!secret || secret.length < 8) return '****';
  return secret.substring(0, 4) + '****' + secret.substring(secret.length - 4);
}

module.exports = { encrypt, decrypt, maskSecret };
