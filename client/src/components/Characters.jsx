import React, { useState, useEffect } from 'react';
import { getCharacters, createCharacter, deleteCharacter } from '../api';
import Modal from './Modal';

export default function Characters({ novelId }) {
  const [chars, setChars] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', role: '', description: '', traits: '' });

  const load = async () => {
    if (!novelId) return;
    const data = await getCharacters(novelId);
    setChars(data);
  };

  useEffect(() => { load(); }, [novelId]);

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    await createCharacter(novelId, form);
    setForm({ name: '', role: '', description: '', traits: '' });
    setShowModal(false);
    load();
  };

  const handleDelete = async (id) => {
    await deleteCharacter(id);
    load();
  };

  return (
    <div className="section-card">
      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ fontSize: 14, fontWeight: 500, color: '#c9a84c' }}>👤 角色列表</h3>
          <button className="gold-btn" style={{ padding: '6px 14px', fontSize: 12 }} onClick={() => setShowModal(true)}>
            ＋ 添加角色
          </button>
        </div>
        {chars.length === 0 ? (
          <div className="empty-state">
            <p style={{ fontSize: 13, color: '#555' }}>暂无角色</p>
          </div>
        ) : (
          <div className="char-list">
            {chars.map(c => (
              <div key={c.id} className="char-item">
                <div className="char-info">
                  <div className="char-name">{c.name}</div>
                  <div className="char-role">{c.role} · {c.traits}</div>
                </div>
                <div className="char-actions">
                  <button className="delete-btn" onClick={() => handleDelete(c.id)}>删除</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <Modal title="添加角色" onClose={() => setShowModal(false)} onConfirm={handleAdd} confirmText="添加">
          <label>角色名称</label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="如：林晓" />
          <label>角色定位</label>
          <input value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} placeholder="如：女主角 / 反派" />
          <label>角色描述</label>
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="外貌、背景、性格..." />
          <label>性格特点</label>
          <input value={form.traits} onChange={e => setForm(f => ({ ...f, traits: e.target.value }))} placeholder="如：勇敢、聪明、固执" />
        </Modal>
      )}
    </div>
  );
}
