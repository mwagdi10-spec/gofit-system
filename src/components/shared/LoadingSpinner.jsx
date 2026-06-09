// ─── LoadingSpinner Component ────────────────────────────────────────
// مؤشرات تحميل متنوعة

import React from 'react';

const LoadingSpinner = ({
  size = 'md', // sm, md, lg
  fullScreen = false,
  message = '',
  messageBelow = false,
  dark = false,
  type = 'spinner' // spinner, pulse, dots, bar
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16'
  };

  const messageSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  // Classic Spinner
  const Spinner = () => (
    <div className={`${sizeClasses[size]} border-4 border-t-blue-500 border-r-blue-500 border-slate-300 dark:border-slate-600 rounded-full animate-spin`} />
  );

  // Pulse
  const Pulse = () => (
    <div className={`${sizeClasses[size]} rounded-full bg-blue-500 animate-pulse`} />
  );

  // Dots
  const Dots = () => (
    <div className="flex gap-1 items-center justify-center">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className={`${size === 'sm' ? 'w-2 h-2' : size === 'md' ? 'w-3 h-3' : 'w-4 h-4'} rounded-full bg-blue-500 animate-bounce`}
          style={{ animationDelay: `${i * 100}ms` }}
        />
      ))}
    </div>
  );

  // Loading Bar
  const Bar = () => (
    <div className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
      <div className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full animate-pulse" style={{ width: '30%' }} />
    </div>
  );

  const renderLoader = () => {
    switch (type) {
      case 'pulse':
        return <Pulse />;
      case 'dots':
        return <Dots />;
      case 'bar':
        return <Bar />;
      default:
        return <Spinner />;
    }
  };

  const content = (
    <div className={`flex ${messageBelow ? 'flex-col' : 'flex-row'} items-center justify-center gap-3`}>
      {renderLoader()}
      {message && (
        <p className={`${messageSizeClasses[size]} text-slate-600 dark:text-slate-400 font-medium`}>
          {message}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white dark:bg-slate-900 bg-opacity-90 dark:bg-opacity-90 backdrop-blur-sm z-50 flex items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
};

// Skeleton Loader
export const SkeletonLoader = ({
  count = 1,
  width = 'w-full',
  height = 'h-4',
  circle = false,
  className = ''
}) => {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className={`${width} ${height} ${circle ? 'rounded-full' : 'rounded'} bg-gradient-to-r from-slate-200 to-slate-100 dark:from-slate-700 dark:to-slate-600 animate-pulse mb-2`}
        />
      ))}
    </div>
  );
};

// Card Skeleton
export const CardSkeleton = () => {
  return (
    <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
      {/* Header */}
      <div className="mb-4">
        <SkeletonLoader height="h-6" width="w-1/2" />
      </div>

      {/* Content */}
      <div className="space-y-3">
        <SkeletonLoader count={3} height="h-4" />
      </div>

      {/* Footer */}
      <div className="mt-4 flex gap-2">
        <SkeletonLoader height="h-8" width="w-24" />
        <SkeletonLoader height="h-8" width="w-24" />
      </div>
    </div>
  );
};

// Table Skeleton
export const TableSkeleton = ({ rows = 5, cols = 4 }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr>
            {Array.from({ length: cols }).map((_, idx) => (
              <th key={idx} className="p-3">
                <SkeletonLoader height="h-4" width="w-full" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, row) => (
            <tr key={row} className="border-t border-slate-200 dark:border-slate-700">
              {Array.from({ length: cols }).map((_, col) => (
                <td key={col} className="p-3">
                  <SkeletonLoader height="h-4" width="w-full" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Loading Overlay
export const LoadingOverlay = ({ 
  isLoading = false, 
  message = 'Loading...', 
  opacity = 60 
}) => {
  if (!isLoading) return null;

  return (
    <div className={`absolute inset-0 bg-black/[.${opacity}] backdrop-blur-sm z-40 flex items-center justify-center rounded-lg`}>
      <LoadingSpinner message={message} size="md" />
    </div>
  );
};

export default LoadingSpinner;
