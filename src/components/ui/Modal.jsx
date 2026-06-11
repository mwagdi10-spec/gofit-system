import React from 'react';
import { useBackButton } from '../../hooks/useBackButton';

export function Modal({ isOpen, onClose, title, children, footer, maxWidth = 'max-w-md' }) {
  useBackButton(isOpen, onClose);
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-[998] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className={`bg-white border-2 border-slate-200 rounded-[2.5rem] w-full ${maxWidth} shadow-2xl overflow-hidden`}
        onClick={e => e.stopPropagation()}
      >
        {title && (
          <div className="bg-slate-900 p-5 flex justify-between items-center">
            <button onClick={onClose} className="text-slate-400 font-black text-sm">✕</button>
            <span className="text-emerald-400 font-black text-base">{title}</span>
          </div>
        )}
        <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">{children}</div>
        {footer && (
          <div className="p-4 border-t border-slate-200 flex gap-2">{footer}</div>
        )}
      </div>
    </div>
  );
}
