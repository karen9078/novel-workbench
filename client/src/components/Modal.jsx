import React from 'react';

export default function Modal({ title, children, onClose, onConfirm, confirmText, confirmDisabled }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>{title}</h3>
        {children}
        <div className="modal-btns">
          {onConfirm && (
            <button className="modal-confirm" onClick={onConfirm} disabled={confirmDisabled}>
              {confirmText || '确认'}
            </button>
          )}
          <button className="modal-cancel" onClick={onClose}>取消</button>
        </div>
      </div>
    </div>
  );
}
