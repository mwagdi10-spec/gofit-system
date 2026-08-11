import { useState, useEffect, useRef } from 'react';

// Carousel كروت GIF لتمارين الـ Static Stretches — 30s work + 15s rest بين كل كارت والتاني،
// Start يدوي للكارت الأول بس، وبعدها auto-advance تلقائي، DONE واحد يظهر في الآخر بس
export function StretchCarousel({ exercises = [], onOpenGif, onConfirmDone }) {
  const [index, setIndex]           = useState(0);
  const [phase, setPhase]           = useState('work'); // 'work' | 'rest'
  const [secondsLeft, setSecondsLeft] = useState(30);
  const [running, setRunning]       = useState(false);
  const [finished, setFinished]     = useState(false);
  const [videoOn, setVideoOn] = useState({});
  const intervalRef = useRef(null);
  const audioCtxRef  = useRef(null);
  const wakeLockRef  = useRef(null);
  const scrollRef    = useRef(null);

  const total = exercises.length;
  const WORK_SECONDS = 30;
  const REST_SECONDS = 15;

  function beep() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch { /* صوت غير مدعوم — تجاهل بصمت */ }
  }

  function scrollToIndex(i) {
    const card = scrollRef.current?.children?.[i];
    card?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }

  // تنتهي مرحلة الـ work → يبدأ Rest 15s (نفس الكارت) → بعدها ينتقل للكارت الجاي ويبدأ work تلقائي
  function onTimerEnd() {
    if (phase === 'work') {
      if (index >= total - 1) {
        setRunning(false);
        setFinished(true);
        return;
      }
      setPhase('rest');
      setSecondsLeft(REST_SECONDS);
      return; // running يفضل true — الراحة بتعد تلقائي
    }
    // phase === 'rest' → انتقل للكارت الجاي وابدأ work تلقائي
    const next = index + 1;
    scrollToIndex(next);
    setIndex(next);
    setPhase('work');
    setSecondsLeft(WORK_SECONDS);
  }

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s > 1) return s - 1;
        clearInterval(intervalRef.current);
        beep();
        onTimerEnd();
        return s;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [running, index, phase]); // eslint-disable-line

  // إبقاء الشاشة صاحية طول ما فيه تايمر شغال
  useEffect(() => {
    async function acquire() {
      try { if ('wakeLock' in navigator) wakeLockRef.current = await navigator.wakeLock.request('screen'); } catch {}
    }
    async function release() {
      try { await wakeLockRef.current?.release(); } catch {}
      wakeLockRef.current = null;
    }
    if (running) acquire(); else release();
    return () => release();
  }, [running]);

  function start() { setRunning(true); }
  function skip()  { clearInterval(intervalRef.current); beep(); onTimerEnd(); }

  function getYoutubeId(url) {
    const m = url?.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
    return m?.[1] || null;
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  return (
    <div className="mb-3">
      <div
        ref={scrollRef}
        style={{ scrollbarWidth: 'none' }}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 px-8 [&::-webkit-scrollbar]:hidden"
      >
        {exercises.map((ex, i) => {
          const isCurrent = i === index && !finished;
          const isPast    = i < index || finished;
          const videoId   = getYoutubeId(ex.videoUrl);
          const showVideo = videoOn[ex.id] && videoId;
          return (
            <div
              key={ex.id}
              className={`snap-center shrink-0 w-64 rounded-2xl border p-3 transition-all duration-300
                ${isCurrent ? 'scale-100 border-blue-300 bg-white' : isPast ? 'scale-90 border-emerald-200 bg-emerald-50' : 'scale-90 border-slate-200 bg-slate-50 opacity-60'}`}
            >
              <p className="text-slate-900 text-xs font-black mb-2 truncate">{ex.name}</p>

              <div className="relative w-full h-40 rounded-xl overflow-hidden border border-slate-200">
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
                  <button
                    type="button"
                    onClick={() => onOpenGif?.(ex.gifUrl)}
                    className="w-full h-full"
                  >
                    <img src={ex.gifUrl} alt={ex.name} className="w-full h-full object-cover" />
                  </button>
                ) : videoId ? (
                  <button
                    type="button"
                    onClick={() => isCurrent && setVideoOn(v => ({ ...v, [ex.id]: true }))}
                    className="relative w-full h-full"
                  >
                    <img
                      src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
                      alt={ex.name}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <span className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center text-slate-900 text-xs">▶</span>
                    </span>
                  </button>
                ) : null}

                {/* زرار تبديل GIF/فيديو — يظهر بس للكارت النشط ولو المصدرين موجودين */}
                {isCurrent && ex.gifUrl && videoId && (
                  <button
                    type="button"
                    onClick={() => setVideoOn(v => ({ ...v, [ex.id]: !v[ex.id] }))}
                    className="absolute top-1.5 right-1.5 bg-slate-900/80 text-white text-[10px] font-black px-2 py-1 rounded-lg"
                  >
                    {showVideo ? 'GIF' : '▶ Video'}
                  </button>
                )}
              </div>

              {isPast && <p className="text-center text-emerald-500 text-[10px] font-black mt-2">✓ Done</p>}
            </div>
          );
        })}
      </div>

      <p className="text-center text-[10px] font-black text-slate-400 mt-1 mb-2">
        {Math.min(index + (finished ? 1 : 0), total)}/{total}
      </p>

      {/* شريط تحكم ثابت تحت الكروت — نفس المكان لحد آخر تمرين */}
      <div className="text-center">
        {!finished && (
          <>
            {phase === 'rest' && (
              <p className="text-amber-400 text-[10px] font-black uppercase mb-0.5">Rest — get ready</p>
            )}
            <p className={`text-2xl font-black tabular-nums mb-2 ${phase === 'rest' ? 'text-amber-400' : 'text-white'}`}>
              {mm}:{ss}
            </p>
          </>
        )}
        {finished ? (
          <button
            type="button"
            onClick={onConfirmDone}
            className="w-full bg-[#1a2332] hover:bg-slate-800 text-white text-sm font-black py-3 rounded-xl transition-colors border border-slate-700"
          >
            DONE
          </button>
        ) : !running ? (
          <button
            type="button"
            onClick={start}
            className="w-full bg-slate-900 text-emerald-400 py-2.5 rounded-xl font-black text-xs uppercase"
          >
            Start
          </button>
        ) : (
          <button
            type="button"
            onClick={skip}
            className="w-full bg-slate-200 text-slate-600 py-2.5 rounded-xl font-black text-xs uppercase"
          >
            Skip
          </button>
        )}
      </div>
    </div>
  );
}
