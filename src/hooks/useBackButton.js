import { useEffect } from 'react';

export function useBackButton(isOpen, onClose) {
  useEffect(() => {
    if (!isOpen) return;
    window.history.pushState({ modal: true }, '');
    const handler = e => { e.preventDefault(); onClose(); };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, [isOpen, onClose]);
}
