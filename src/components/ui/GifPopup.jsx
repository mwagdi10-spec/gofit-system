// ─── GifPopup Component ───────────────────────────────────────────────────
// عرض صور GIF للتمارين في نافذة منفصلة

import React, { useState, useEffect } from 'react';

const GifPopup = ({ 
  isOpen = false, 
  gifUrl = '', 
  exerciseName = '', 
  onClose = () => {} 
}) => {
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  useEffect(() => {
    setIsImageLoaded(false);
  }, [gifUrl]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      {/* Container */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-2xl max-w-2xl w-full animate-in fade-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white truncate">
            {exerciseName || 'Exercise Guide'}
          </h2>
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center w-8 h-8 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="relative bg-slate-50 dark:bg-slate-800 aspect-video overflow-hidden">
          {/* Loading Skeleton */}
          {!isImageLoaded && (
            <div className="absolute inset-0 bg-gradient-to-r from-slate-200 to-slate-100 dark:from-slate-700 dark:to-slate-600 animate-pulse" />
          )}

          {/* GIF Image */}
          {gifUrl && (
            <img
              src={gifUrl}
              alt={exerciseName}
              onLoad={() => setIsImageLoaded(true)}
              onError={() => setIsImageLoaded(true)}
              className={`w-full h-full object-contain transition-opacity duration-300 ${
                isImageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
            />
          )}

          {/* Error State */}
          {!gifUrl && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <svg className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm text-slate-500 dark:text-slate-400">No image available</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {gifUrl ? 'Demonstration only' : 'No image provided'}
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 dark:bg-slate-700 text-white text-sm font-medium rounded-lg hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default GifPopup;
