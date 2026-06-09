// ─── Modal Component ─────────────────────────────────────────────────────
// Modal/Dialog عام الاستخدام مع تخصيص كامل

import React, { useEffect, useRef } from 'react';

const Modal = ({
  isOpen = false,
  onClose = () => {},
  title = '',
  children = null,
  footer = null,
  size = 'md', // sm, md, lg, xl, full
  closeButton = true,
  closeOnBackdrop = true,
  closeOnEsc = true,
  className = '',
  headerClassName = '',
  contentClassName = '',
  footerClassName = '',
  maxHeight = '90vh'
}) => {
  const contentRef = useRef(null);

  // Handle escape key
  useEffect(() => {
    if (!isOpen || !closeOnEsc) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEsc, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Size classes
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-full mx-4'
  };

  return (
    <div className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center p-4 ${className}`}>
      {/* Backdrop */}
      <div
        onClick={() => closeOnBackdrop && onClose()}
        className="absolute inset-0 cursor-default"
      />

      {/* Modal Container */}
      <div
        ref={contentRef}
        className={`relative bg-white dark:bg-slate-900 rounded-xl shadow-2xl ${sizeClasses[size]} w-full animate-in fade-in zoom-in-95 duration-300 max-h-[${maxHeight}] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || closeButton) && (
          <div className={`flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 shrink-0 ${headerClassName}`}>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              {title}
            </h2>

            {closeButton && (
              <button
                onClick={onClose}
                className="p-1 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                aria-label="Close modal"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className={`overflow-y-auto flex-1 p-6 ${contentClassName}`}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className={`border-t border-slate-200 dark:border-slate-700 p-6 bg-slate-50 dark:bg-slate-800/50 shrink-0 ${footerClassName}`}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

// Variations
export const ConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = 'Confirm', 
  message = '', 
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDangerous = false
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
    >
      <p className="text-slate-600 dark:text-slate-300 mb-6">
        {message}
      </p>

      <div className="flex gap-3 justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          {cancelText}
        </button>
        <button
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className={`px-4 py-2 text-white rounded-lg transition-colors ${
            isDangerous
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-blue-500 hover:bg-blue-600'
          }`}
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  );
};

// Alert Modal
export const AlertModal = ({ 
  isOpen, 
  onClose, 
  title = 'Alert', 
  message = '',
  type = 'info' // info, success, warning, error
}) => {
  const icons = {
    info: '📋',
    success: '✅',
    warning: '⚠️',
    error: '❌'
  };

  const colors = {
    info: 'text-blue-600 dark:text-blue-400',
    success: 'text-green-600 dark:text-green-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    error: 'text-red-600 dark:text-red-400'
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      closeOnBackdrop={false}
    >
      <div className="flex items-start gap-4 mb-6">
        <span className="text-4xl">{icons[type]}</span>
        <p className="text-slate-600 dark:text-slate-300">
          {message}
        </p>
      </div>

      <div className="flex justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-slate-900 dark:bg-slate-700 text-white rounded-lg hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors"
        >
          Okay
        </button>
      </div>
    </Modal>
  );
};

export default Modal;
