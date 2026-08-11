import { useState } from 'react';

// Carousel أفقي لتمارين ACTIVATION — سكرول يمين/شمال بدل الليست العادي، مقاس أكبر من StretchCarousel
// نفس منطق SAVE/SKIP وأوزان/تكرار الأصلي، بس شكل بصري carousel
export function ActivationCarousel({
  exercises = [], phaseId, onOpenGif,
  updateSet, updateExRpe, toggleAlt, selectAlt, saveEx, skipEx, undoEx,
  altSearch = {}, setAltSearch,
}) {
  const [videoOn, setVideoOn] = useState({});

  function getYoutubeId(url) {
    const m = url?.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
    return m?.[1] || null;
  }

  const SPIN_QUESTIONS = [
    { emoji: '😊', label: 'Easy',     rpe: 5 },
    { emoji: '😐', label: 'Moderate', rpe: 7 },
    { emoji: '😩', label: 'Hard',     rpe: 9 },
  ];

  return (
    <div
      style={{ scrollbarWidth: 'none' }}
      className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 pl-6 pr-12 mb-2 [&::-webkit-scrollbar]:hidden"
    >
      {exercises.map((ex, exIdx) => {
        const isDone = ex.status === 'saved';
        const isSkip = ex.status === 'skipped';
        const videoId = getYoutubeId(ex.videoUrl);
        const showVideo = videoOn[ex.id] && videoId;

        return (
          <div
            key={ex.id}
            className={`snap-center shrink-0 w-[19rem] rounded-2xl border p-4 transition-all
              ${isDone ? 'opacity-70 bg-green-50 border-green-300'
              : isSkip ? 'opacity-50 bg-slate-50 border-slate-200'
              :          'bg-white border-slate-200'}`}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-2 gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="w-7 h-7 rounded-full bg-blue-900 flex items-center justify-center shrink-0">
                  <span className="text-white text-xs font-bold">{exIdx + 1}</span>
                </span>
                <span className="font-black text-slate-900 text-base flex-1 leading-snug">{ex.name}</span>
              </div>
              {ex.status !== 'pending' && (
                <button
                  onClick={() => undoEx(phaseId, ex.id)}
                  className="bg-orange-500 hover:bg-orange-600 text-white text-[10px] font-black px-2.5 py-1 rounded-lg shrink-0"
                >
                  ↺ Undo
                </button>
              )}
            </div>

            {ex.originalExerciseName && (
              <p className="text-xs text-slate-400 italic mb-2">
                Alternative to: {ex.originalExerciseName}
              </p>
            )}

            {/* Thumbnail — مقاس أكبر */}
            {(ex.gifUrl || ex.videoUrl) && (
              <div className="relative w-full h-36 rounded-xl overflow-hidden border border-slate-200 mb-3">
                {showVideo ? (
                  <iframe
                    key={ex.id}
                    src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=1&modestbranding=1&rel=0&playsinline=1`}
                    title={ex.name}
                    className="w-full h-full"
                    allow="autoplay; encrypted-media; picture-in-picture"
                    allowFullScreen
                  />
                ) : ex.gifUrl ? (
                  <button type="button" onClick={() => onOpenGif?.(ex.gifUrl)} className="w-full h-full">
                    <img src={ex.gifUrl} alt={ex.name} className="w-full h-full object-cover" />
                  </button>
                ) : videoId ? (
                  <button
                    type="button"
                    onClick={() => setVideoOn(v => ({ ...v, [ex.id]: true }))}
                    className="relative w-full h-full"
                  >
                    <img
                      src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
                      alt={ex.name}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <span className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center text-slate-900 text-sm">▶</span>
                    </span>
                  </button>
                ) : null}

                {ex.gifUrl && videoId && ex.status === 'pending' && (
                  <button
                    type="button"
                    onClick={() => setVideoOn(v => ({ ...v, [ex.id]: !v[ex.id] }))}
                    className="absolute top-1.5 right-1.5 bg-slate-900/80 text-white text-[10px] font-black px-2 py-1 rounded-lg"
                  >
                    {showVideo ? 'GIF' : '▶ Video'}
                  </button>
                )}
              </div>
            )}

            {/* ALT toggle + dropdown */}
            {ex.alternatives?.length > 0 && ex.status === 'pending' && (
              <button
                onClick={() => toggleAlt(phaseId, ex.id)}
                className="bg-blue-100 text-blue-600 text-[10px] font-black px-2.5 py-1 rounded-lg mb-2"
              >
                ALT {ex.altOpen ? '▲' : '▾'}
              </button>
            )}
            {ex.altOpen && (
              <div className="mb-3 rounded-xl border border-blue-100 bg-blue-50/60 overflow-hidden">
                {ex.alternatives
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(alt => (
                    <button key={alt.id} onClick={() => selectAlt(phaseId, ex.id, alt)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 border-b border-blue-100 last:border-0 hover:bg-blue-100 transition-colors text-left"
                    >
                      {alt.gifUrl && <img src={alt.gifUrl} alt={alt.name} className="w-10 h-10 rounded-lg object-cover border border-blue-200 shrink-0" />}
                      <div>
                        <p className="text-slate-900 text-xs font-bold">{alt.name}</p>
                        <p className="text-slate-400 text-[10px]">{alt.targetSets}×{alt.targetReps} {alt.unit}{alt.tempo ? ` · ${alt.tempo}` : ''}</p>
                      </div>
                    </button>
                  ))}
              </div>
            )}

            {/* Metadata pills */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-md">📁 {ex.category}</span>
              {ex.tempo && <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-md">Tempo: {ex.tempo}</span>}
              <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-md">{ex.targetSets}×{ex.targetReps} {ex.unit}</span>
              {ex.coachNote && <span className="bg-emerald-50 text-emerald-600 text-[10px] font-bold px-2 py-0.5 rounded-md">💬 {ex.coachNote}</span>}
            </div>

            {/* Sets inputs */}
            {ex.status === 'pending' && (
              <div className="space-y-2 mb-3">
                {(ex.setsData || []).map((set, si) => (
                  <div key={si} className="flex items-center gap-2 w-full">
                    <span className="text-xs font-bold text-slate-500 w-10 shrink-0">Set {si + 1}</span>
                    <div className="flex items-center bg-slate-100 rounded-xl px-2 py-2 flex-1 min-w-0">
                      <input
                        type="number" placeholder="0" value={set.weight}
                        onChange={e => updateSet(phaseId, ex.id, si, 'weight', e.target.value)}
                        className="bg-transparent w-full text-center outline-none text-sm font-bold text-slate-800"
                      />
                      <span className="text-slate-400 text-xs ml-1 shrink-0">kg</span>
                    </div>
                    <div className="flex items-center bg-slate-100 rounded-xl px-2 py-2 flex-1 min-w-0">
                      <input
                        type="number" value={set.reps}
                        onChange={e => updateSet(phaseId, ex.id, si, 'reps', e.target.value)}
                        className="bg-transparent w-full text-center outline-none text-sm font-bold text-slate-800"
                      />
                      <span className="text-slate-400 text-xs ml-1 shrink-0">reps</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Spin Questions */}
            {ex.status === 'pending' && (
              <div className="mb-3">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1.5">How did it feel?</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {SPIN_QUESTIONS.map(q => (
                    <button
                      key={q.rpe}
                      type="button"
                      onClick={() => updateExRpe(phaseId, ex.id, ex.rpe === q.rpe ? null : q.rpe)}
                      className={`py-2 rounded-xl text-xs font-black flex flex-col items-center gap-0.5 transition-colors
                        ${ex.rpe === q.rpe ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500'}`}
                    >
                      <span className="text-lg leading-none">{q.emoji}</span>
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            {ex.status === 'pending' ? (
              <div className="flex gap-2">
                <button onClick={() => saveEx(phaseId, ex.id)}
                  className="flex-1 bg-[#1C1C38] text-white text-xs font-black py-2.5 rounded-xl hover:bg-[#2A2A50] transition-colors">
                  SAVE
                </button>
                <button onClick={() => skipEx(phaseId, ex.id)}
                  className="flex-1 bg-slate-100 text-slate-500 text-xs font-black py-2.5 rounded-xl hover:bg-slate-200 transition-colors">
                  SKIP
                </button>
              </div>
            ) : (
              <div className={`text-center text-xs font-black py-2 rounded-xl
                ${isDone ? 'bg-green-500/20 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                {isDone ? '✓ SAVED' : '⊘ SKIPPED'}
              </div>
            )}

            {ex.overloadMessage && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 mt-2">
                <p className="text-blue-500 text-[10px] font-semibold leading-relaxed">{ex.overloadMessage}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
