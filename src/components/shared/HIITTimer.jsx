import { useState, useEffect, useRef } from 'react';

export function HIITTimer({ workSeconds = 30, restSeconds = 15, rounds = 8, onFinish, onRoundChange, disabled = false }) {
  // إعدادات قابلة للتعديل قبل أول Start فقط
  const [workS,   setWorkS]   = useState(workSeconds);
  const [restS,   setRestS]   = useState(restSeconds);
  const [roundsN, setRoundsN] = useState(rounds);
  const [hasStarted, setHasStarted] = useState(false);

  const [round,       setRound]       = useState(1);
  const [phase,       setPhase]       = useState('work'); // work | rest | done
  const [secondsLeft, setSecondsLeft] = useState(workSeconds);
  const [running,     setRunning]     = useState(false);
  const intervalRef = useRef(null);
  const audioCtxRef = useRef(null);
  const wakeLockRef = useRef(null);

  // تبليغ الأب بعدد الجولات المنجزة (لزر SAVE اليدوي)
  useEffect(() => { onRoundChange?.(round); }, [round]);

  // إبقاء الشاشة صاحية طول ما التايمر شغال، حتى لو مهلة قفل الشاشة أقصر
  useEffect(() => {
    async function acquire() {
      try { if ('wakeLock' in navigator) wakeLockRef.current = await navigator.wakeLock.request('screen'); } catch { /* غير مدعوم/مرفوض — تجاهل بصمت */ }
    }
    async function release() {
      try { await wakeLockRef.current?.release(); } catch {}
      wakeLockRef.current = null;
    }
    if (running) acquire(); else release();

    // المتصفح بيفك القفل تلقائيًا لو التاب راح الخلفية — نطلبه تاني لما يرجع
    function handleVisibility() {
      if (running && document.visibilityState === 'visible' && !wakeLockRef.current) acquire();
    }
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      release();
    };
  }, [running]);

  // Beep بسيط عند تغيير الفيز (Web Audio API — بدون مكتبات)
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
    } catch { /* audio غير مدعوم — تجاهل بصمت */ }
  }

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s > 1) return s - 1;
        beep();
        if (phase === 'work') {
          if (round >= roundsN) { setPhase('done'); setRunning(false); return 0; }
          setPhase('rest');
          return restS;
        }
        setRound(r => r + 1);
        setPhase('work');
        return workS;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [running, phase, round, workS, restS, roundsN]);

  function toggleStart() {
    if (!hasStarted) {
      // تثبيت آخر رقم صحيح لو المستخدم سايب الحقل فاضي وهو بيكتب
      setRoundsN(r => Math.max(1, Number(r) || 1));
      setHasStarted(true);
      setSecondsLeft(workS);
    }
    setRunning(r => !r);
  }

  const reset = () => { setRunning(false); setRound(1); setPhase('work'); setSecondsLeft(workS); };

  // تخطي الجولة/المرحلة الحالية فورًا
  function skipRound() {
    beep();
    if (phase === 'work') {
      if (round >= roundsN) { setPhase('done'); setRunning(false); setSecondsLeft(0); return; }
      setPhase('rest'); setSecondsLeft(restS);
    } else {
      setRound(r => r + 1); setPhase('work'); setSecondsLeft(workS);
    }
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
      {/* إعدادات التايمر — قابلة للتعديل قبل أول Start */}
      {!hasStarted && (
        <div className="flex gap-2 mb-3">
          <label className="flex-1">
            <span className="block text-[9px] font-black text-slate-400 uppercase mb-1">Work (s)</span>
            <input
              type="number" min="1" value={workS}
              onChange={e => setWorkS(Math.max(1, Number(e.target.value) || 1))}
              className="w-full bg-white border border-slate-200 rounded-lg py-1.5 text-center text-sm font-bold text-slate-800"
            />
          </label>
          <label className="flex-1">
            <span className="block text-[9px] font-black text-slate-400 uppercase mb-1">Rest (s)</span>
            <input
              type="number" min="1" value={restS}
              onChange={e => setRestS(Math.max(1, Number(e.target.value) || 1))}
              className="w-full bg-white border border-slate-200 rounded-lg py-1.5 text-center text-sm font-bold text-slate-800"
            />
          </label>
          <label className="flex-1">
            <span className="block text-[9px] font-black text-slate-400 uppercase mb-1">Rounds</span>
            <input
              type="number" min="0" value={roundsN}
              onChange={e => setRoundsN(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
              onBlur={() => setRoundsN(r => Math.max(1, Number(r) || 1))}
              className="w-full bg-white border border-slate-200 rounded-lg py-1.5 text-center text-sm font-bold text-slate-800"
            />
          </label>
        </div>
      )}

      <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Round {Math.min(round, roundsN || 1)}/{roundsN || 1}</p>
      <p className={`text-4xl font-black mb-2 tabular-nums ${phase === 'work' ? 'text-emerald-500' : phase === 'rest' ? 'text-amber-500' : 'text-slate-900'}`}>
        {phase === 'done' ? 'DONE' : `${mm}:${ss}`}
      </p>
      <p className="text-xs font-black uppercase mb-3 text-slate-500">
        {phase === 'work' ? 'Work' : phase === 'rest' ? 'Rest' : 'Complete'}
      </p>
      {phase !== 'done' ? (
        <div className="flex gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={toggleStart}
            className="flex-1 bg-slate-900 text-emerald-400 py-2.5 rounded-xl font-black text-xs uppercase disabled:opacity-40"
          >
            {running ? 'Pause' : 'Start'}
          </button>
          {hasStarted && (
            <button
              type="button"
              disabled={disabled}
              onClick={skipRound}
              className="flex-1 bg-amber-100 text-amber-700 py-2.5 rounded-xl font-black text-xs uppercase disabled:opacity-40"
            >
              Skip Round
            </button>
          )}
          <button
            type="button"
            disabled={disabled}
            onClick={reset}
            className="flex-1 bg-slate-200 text-slate-600 py-2.5 rounded-xl font-black text-xs uppercase disabled:opacity-40"
          >
            Reset
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onFinish?.(roundsN)}
          className="w-full bg-emerald-500 text-white py-2.5 rounded-xl font-black text-xs uppercase disabled:opacity-40"
        >
          SAVE
        </button>
      )}
    </div>
  );
}
