import React from 'react';

export function LoadingSpinner() {
  return (
    <div className="h-screen flex items-center justify-center bg-slate-950">
      <div className="text-center">
        <p className="text-emerald-400 font-black text-3xl uppercase tracking-[0.3em]">GoFit</p>
        <p className="text-emerald-600 font-black text-sm uppercase tracking-[0.3em] mt-1 animate-pulse">
          Loading...
        </p>
      </div>
    </div>
  );
}
