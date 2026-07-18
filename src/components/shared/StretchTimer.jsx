import { useState, useEffect, useRef } from 'react';

// تايمر عدّ تنازلي بسيط لتمارين الـ Static Stretches (بدون Rounds/Rest زي HIITTimer)
export function StretchTimer({ seconds = 30, onFinish, disabled = false }) {
  const [secondsLeft, setSecondsLeft] = useState(seconds);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const intervalRef = useRef(null);
  const audioCtxRef = useRef(null);
  const wakeLockRef = useRef(null);

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

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s > 1) return s - 1;
        clearInterval(intervalRef.current);
        beep();
        setRunning(false);
        setDone(true);
        return 0;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [running]);

  // إبقاء الشاشة صاحية طول ما العداد شغال
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

  useEffect(() => { if (done) onFinish?.(); }, [done]); // eslint-disable-line

  function reset() { setRunning(false); setDone(false); setSecondsLeft(seconds); }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
      <p className={`text-3xl font-black mb-3 tabular-nums ${done ? 'text-emerald-500' : 'text-slate-900'}`}>
        {done ? '✓ DONE' : `${mm}:${ss}`}
      </p>
      {!done && (
        <div className="flex gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => setRunning(r => !r)}
            className="flex-1 bg-slate-900 text-emerald-400 py-2.5 rounded-xl font-black text-xs uppercase disabled:opacity-40"
          >
            {running ? 'Pause' : 'Start'}
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={reset}
            className="flex-1 bg-slate-200 text-slate-600 py-2.5 rounded-xl font-black text-xs uppercase disabled:opacity-40"
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );
}
