import React, { useState } from 'react';

const styles = {
  container: {
    width: '100%',
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #f5f2ee 0%, #e8e2d8 100%)',
  },
  card: {
    background: '#fff',
    borderRadius: 16,
    padding: 40,
    width: 380,
    boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
  },
  brand: {
    textAlign: 'center',
    marginBottom: 32,
  },
  brandIcon: {
    width: 80,
    height: 80,
    margin: '0 auto 12px',
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: '#5a4a3a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#b0a898',
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 8,
    border: '1px solid #e2dcd2',
    background: '#faf8f5',
    color: '#2c2c2c',
    fontSize: 14,
    outline: 'none',
    marginBottom: 14,
    fontFamily: 'inherit',
  },
  button: {
    width: '100%',
    padding: '11px 0',
    background: '#c9a84c',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginTop: 4,
  },
  error: {
    background: '#fff0f0',
    color: '#c44',
    padding: '8px 12px',
    borderRadius: 6,
    fontSize: 12,
    marginBottom: 12,
    textAlign: 'center',
  },
  link: {
    textAlign: 'center',
    marginTop: 16,
    fontSize: 13,
    color: '#b0a898',
  },
  linkBtn: {
    background: 'none',
    border: 'none',
    color: '#c9a84c',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
  },
};

export default function Login({ onLogin, onSwitch }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('请输入邮箱和密码');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.token);
        onLogin(data.token, data.user);
      } else {
        setError(data.error || '登录失败');
      }
    } catch (e) {
      setError('网络错误，请重试');
    }
    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.brand}>
          <img src="/logo.png" alt="logo" style={styles.brandIcon} />
          <div style={styles.title}>写作工坊</div>
          <div style={styles.subtitle}>登录你的账户</div>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <input
            style={styles.input}
            type="email"
            placeholder="邮箱"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoFocus
          />
          <input
            style={styles.input}
            type="password"
            placeholder="密码"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? '登录中...' : '登 录'}
          </button>
        </form>

        <div style={styles.link}>
          还没有账号？{' '}
          <button
            style={styles.linkBtn}
            onClick={onSwitch}
          >
            注册
          </button>
        </div>
      </div>
    </div>
  );
}
