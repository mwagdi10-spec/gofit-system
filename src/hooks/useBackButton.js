// ─── useBackButton Hook ────────────────────────────────────────────────────
// معالجة زر الرجوع في المتصفح والـ modals

import { useEffect } from 'react';

/**
 * Hook للتعامل مع زر الرجوع في المتصفح
 * يستخدم history API لإغلاق الـ modals والـ panels
 * 
 * @param {boolean} isOpen - هل الـ modal مفتوح؟
 * @param {function} onClose - دالة الإغلاق
 * 
 * @example
 * function MyModal() {
 *   const [isOpen, setIsOpen] = useState(false);
 *   useBackButton(isOpen, () => setIsOpen(false));
 *   
 *   return isOpen ? <div>Modal</div> : null;
 * }
 */
export const useBackButton = (isOpen, onClose) => {
  useEffect(() => {
    if (!isOpen) return;

    // Push a state to history
    window.history.pushState({ modal: true }, '');

    // Handler for popstate event (back button clicked)
    const handlePopState = (e) => {
      e.preventDefault();
      onClose();
    };

    // Add event listener
    window.addEventListener('popstate', handlePopState);

    // Cleanup
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isOpen, onClose]);
};

/**
 * Advanced version with stack support
 * يدعم عدة modals متداخلة
 * 
 * @example
 * const backStack = useBackButtonStack();
 * 
 * // عند فتح modal
 * backStack.push('modal-1', () => setModal1Open(false));
 * 
 * // عند الضغط على back - يغلق آخر modal
 */
export const useBackButtonStack = () => {
  const stackRef = require('react').useRef([]);

  useEffect(() => {
    const handlePopState = (e) => {
      e.preventDefault();
      
      if (stackRef.current.length > 0) {
        const { onClose } = stackRef.current.pop();
        onClose();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return {
    push: (id, onClose) => {
      window.history.pushState({ modal: id }, '');
      stackRef.current.push({ id, onClose });
    },
    pop: () => {
      return stackRef.current.pop();
    },
    clear: () => {
      stackRef.current = [];
    },
    size: () => stackRef.current.length
  };
};

/**
 * Hook بسيط يتعامل مع النافذة الواحدة فقط
 */
export const useSimpleBackButton = (isOpen, onClose) => {
  useEffect(() => {
    if (!isOpen) return;

    window.history.pushState(null, '');

    const handlePopState = () => {
      onClose();
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isOpen, onClose]);
};

export default useBackButton;
