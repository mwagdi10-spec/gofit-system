import { useState, useEffect, useRef } from 'react';

// تايمر Intervals للكارديو: مراحل متتالية بسرعة/شدة مختلفة (بدل work/rest ثابتين)
export function CardioIntervalTimer({ intervals = [], onFinish, onSkip }) {
  const list = Array.isArray(intervals) ? intervals : [];
  const [idx, setIdx]               = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(list[0]?.seconds || 0);
  const [running, setRunning]       = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [done, setDone]             = useState(false);
  const intervalRef = useRef(null);
  const audioCtxRef  = useRef(null);
  const wakeLockRef  = useRef(null);

  // إبقاء الشاشة صاحية طول ما التايمر شغال
  useEffect(() => {
    async function acquire() { try { if ('wakeLock' in navigator) wakeLockRef.current = await navigator.wakeLock.request('screen'); } catch {} }
    async function release() { try { await wakeLockRef.current?.release(); } catch {} wakeLockRef.current = null; }
    if (running) acquire(); else release();
    return () => release();
  }, [running]);

  // Beep بسيط عند تغيير المرحلة
  function beep() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
      const ctx = audioCtxRef.current;
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {}
  }

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s > 1) return s - 1;
        beep();
        if (idx >= list.length - 1) { setDone(true); setRunning(false); return 0; }
        setIdx(i => i + 1);
        return list[idx + 1]?.seconds || 0;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [running, idx, list]);

  function toggleStart() {
    if (!hasStarted) { setHasStarted(true); setSecondsLeft(list[0]?.seconds || 0); }
    setRunning(r => !r);
  }

  // تخطي المرحلة الحالية فورًا
  function skipStage() {
    beep();
    if (idx >= list.length - 1) { setDone(true); setRunning(false); setSecondsLeft(0); return; }
    setIdx(i => i + 1);
    setSecondsLeft(list[idx + 1]?.seconds || 0);
  }

  if (!list.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
        <p className="text-xs font-black text-slate-400">No intervals configured for this exercise</p>
        <button type="button" onClick={onSkip} className="mt-3 w-full bg-slate-200 text-slate-600 py-2.5 rounded-xl font-black text-xs uppercase">
          Skip
        </button>
      </div>
    );
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');
  const current = list[idx];
  const next    = list[idx + 1];

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
      <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Stage {idx + 1}/{list.length}</p>
      <p className="text-sm font-black text-emerald-600 uppercase mb-1 truncate">{current?.label || 'Interval'}</p>
      <p className={`text-4xl font-black mb-2 tabular-nums ${done ? 'text-emerald-500' : 'text-slate-900'}`}>
        {done ? 'DONE' : `${mm}:${ss}`}
      </p>
      {!done && next && (
        <p className="text-[10px] font-bold text-slate-400 mb-3">Next: {next.label}</p>
      )}
      {!done ? (
        <div className="flex gap-2">
          <button type="button" onClick={toggleStart} className="flex-1 bg-slate-900 text-emerald-400 py-2.5 rounded-xl font-black text-xs uppercase">
            {running ? 'Pause' : 'Start'}
          </button>
          {hasStarted && (
            <button type="button" onClick={skipStage} className="flex-1 bg-amber-100 text-amber-700 py-2.5 rounded-xl font-black text-xs uppercase">
              Skip Stage
            </button>
          )}
          <button type="button" onClick={onSkip} className="flex-1 bg-slate-200 text-slate-600 py-2.5 rounded-xl font-black text-xs uppercase">
            Skip
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => onFinish?.(list)} className="w-full bg-emerald-500 text-white py-2.5 rounded-xl font-black text-xs uppercase">
          SAVE
        </button>
      )}
    </div>
  );
}
