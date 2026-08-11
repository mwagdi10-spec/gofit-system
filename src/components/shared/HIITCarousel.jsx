import { HIITTimer } from './HIITTimer';

// Carousel أفقي لتمارين HIIT — نفس مقاس/شكل ActivationCarousel، HIITTimer جوه كل كارت
export function HIITCarousel({ exercises = [], phaseId, onOpenGif, saveHiitEx, updateExRound, skipEx, undoEx }) {
  return (
    <div
      style={{ scrollbarWidth: 'none' }}
      className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 pl-6 pr-12 mb-2 [&::-webkit-scrollbar]:hidden"
    >
      {exercises.map((ex, exIdx) => {
        const isDone = ex.status === 'saved';
        const isSkip = ex.status === 'skipped';

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

            {/* Thumbnail */}
            {ex.gifUrl && (
              <div className="relative w-full h-36 rounded-xl overflow-hidden border border-slate-200 mb-3">
                <button type="button" onClick={() => onOpenGif?.(ex.gifUrl)} className="w-full h-full">
                  <img src={ex.gifUrl} alt={ex.name} className="w-full h-full object-cover" />
                </button>
              </div>
            )}

            {/* Metadata pill */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-md">📁 HIIT</span>
              <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-md">
                {ex.workSeconds}s work / {ex.restSeconds}s rest × {ex.rounds}
              </span>
              {ex.coachNote && <span className="bg-emerald-50 text-emerald-600 text-[10px] font-bold px-2 py-0.5 rounded-md">💬 {ex.coachNote}</span>}
            </div>

            {/* Timer / Result */}
            {ex.status === 'pending' ? (
              <>
                <div className="mb-2">
                  <HIITTimer
                    workSeconds={ex.workSeconds || 30}
                    restSeconds={ex.restSeconds || 15}
                    rounds={ex.rounds || 8}
                    onFinish={(roundsCompleted) => saveHiitEx(phaseId, ex.id, roundsCompleted)}
                    onRoundChange={(r) => updateExRound(phaseId, ex.id, r)}
                  />
                </div>
                <button onClick={() => skipEx(phaseId, ex.id)}
                  className="w-full bg-slate-100 text-slate-500 text-xs font-black py-2.5 rounded-xl hover:bg-slate-200 transition-colors">
                  SKIP
                </button>
              </>
            ) : (
              <div className={`text-center text-xs font-black py-2 rounded-xl
                ${isDone ? 'bg-green-500/20 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                {isDone ? '✓ SAVED' : '⊘ SKIPPED'}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
