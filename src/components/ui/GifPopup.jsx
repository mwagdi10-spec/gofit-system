import React from 'react';
import { useBackButton } from '../../hooks/useBackButton';

export function GifPopup({ url, onClose }) {

  useBackButton(!!url, onClose);

  if (!url) return null;

  return (

    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/75 backdrop-blur-sm" onClick={onClose}>

      <div className="relative max-w-xs w-full mx-6" onClick={e => e.stopPropagation()}>

        <button onClick={onClose} className="absolute -top-3 -left-3 z-10 w-8 h-8 bg-white text-slate-900 rounded-full font-black text-sm shadow-2xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all">✕</button>

        <img src={url} alt="exercise demo" className="w-full rounded-3xl shadow-2xl" />

      </div>

    </div>

  );

}


