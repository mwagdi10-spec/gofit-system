import { useState, useEffect } from 'react';

// لينكات يوتيوب اتحفظت من غير https:// كانت بتتفسّر كمسار داخلي فترجّع للـ Home
function openVideo(url) {
  if (!url) return;
  const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  window.open(href, '_blank', 'noopener,noreferrer');
}

export default function WorkoutPreviewScreen({ navigate, goBack, params = {}, sessionPhases = [] }) {
  const [gifModal, setGifModal] = useState(null);

  // back gesture/hardware-back يقفل المودال بدل ما يخرج من التطبيق
  useEffect(() => {
    function handlePop() { setGifModal(null); }
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  function openGif(url) {
    window.history.pushState({ modal: 'gif' }, '');
    setGifModal(url);
  }

  function closeGif() {
    window.history.back();
  }

  if (!sessionPhases.length) {
    return (
      <div className="min-h-screen bg-[#1E293B] max-w-sm mx-auto flex flex-col items-center justify-center gap-4">
        <p className="text-slate-400 font-semibold">No exercises for this day</p>
        <button onClick={goBack} className="text-blue-400 font-bold">← Go Back</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1E293B] max-w-sm mx-auto flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#2A2A50] sticky top-0 bg-[#1E293B] z-10">
        <button onClick={goBack} className="text-white text-2xl leading-none">‹</button>
        <span className="text-white font-bold text-lg">{params.day || 'Preview'}</span>
        <span className="text-slate-400 text-[10px] font-black tracking-widest">PREVIEW</span>
      </div>

      {/* Phases */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 pb-28">
        {sessionPhases.map(phase => (
          <div key={phase.id} className="rounded-2xl overflow-hidden border border-[#2A2A50]">
            <div className="flex items-center justify-between px-4 py-3.5 bg-[#14142B]">
              <span className="text-white font-black text-sm tracking-wider">{phase.title}</span>
              <span className="bg-blue-500/20 text-blue-400 text-[10px] font-black px-2 py-0.5 rounded-full">
                {phase.exercises?.length ?? 0}
              </span>
            </div>

            <div className="bg-[#1E293B] p-2 space-y-2">
              {phase.exercises.map((ex, exIdx) => (
                <div key={ex.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-blue-900 flex items-center justify-center shrink-0">
                        <span className="text-white text-[10px] font-bold">{exIdx + 1}</span>
                      </span>
                      <span className="font-black text-slate-900 text-sm flex-1 leading-snug">{ex.name}</span>
                    </div>
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      {ex.gifUrl && (
                        <button
                          onClick={() => openGif(ex.gifUrl)}
                          className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200 shrink-0"
                        >
                          <img src={ex.gifUrl} alt={ex.name} className="w-full h-full object-cover" />
                        </button>
                      )}
                      {ex.videoUrl && (
                        <button
                          onClick={() => openVideo(ex.videoUrl)}
                          className="w-6 h-6 rounded-md bg-red-500 flex items-center justify-center shrink-0"
                          title="Watch on YouTube"
                        >
                          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white"><path d="M10 15.5l6-3.5-6-3.5v7z"/><path d="M21.6 7.2c-.2-1-1-1.7-2-1.9C17.9 5 12 5 12 5s-5.9 0-7.6.3c-1 .2-1.8.9-2 1.9C2 8.9 2 12 2 12s0 3.1.4 4.8c.2 1 1 1.7 2 1.9C6.1 19 12 19 12 19s5.9 0 7.6-.3c1-.2 1.8-.9 2-1.9.4-1.7.4-4.8.4-4.8s0-3.1-.4-4.8z"/></svg>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-md">📁 {ex.category}</span>
                    {ex.tempo && <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-md">Tempo: {ex.tempo}</span>}
                    <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-md">{ex.targetSets}×{ex.targetReps} {ex.unit}</span>
                    {ex.coachNote && <span className="bg-emerald-50 text-emerald-600 text-[10px] font-bold px-2 py-0.5 rounded-md">💬 {ex.coachNote}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Start Workout */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-sm px-14 pb-8 pt-2 bg-[#1E293B]">
        <button
          onClick={() => navigate('ActiveWorkout', params)}
          className="w-full bg-blue-500 hover:bg-blue-600 active:scale-95 rounded-2xl py-4 text-white font-bold text-lg transition-all"
        >
          Start Workout
        </button>
      </div>

      {/* GIF Modal */}
      {gifModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-6" onClick={closeGif}>
          <div className="relative max-w-xs w-full" onClick={e => e.stopPropagation()}>
            <button onClick={closeGif}
              className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full text-slate-900 font-black text-sm shadow-lg flex items-center justify-center z-10">✕</button>
            <img src={gifModal} alt="Exercise form" className="w-full rounded-2xl shadow-2xl" />
          </div>
        </div>
      )}
    </div>
  );
}
