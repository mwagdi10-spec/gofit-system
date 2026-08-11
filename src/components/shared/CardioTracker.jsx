import { useState, useEffect, useRef } from 'react';
import { CardioIntervalTimer } from './CardioIntervalTimer';

const MIN_DURATION = 5;
const MAX_DURATION = 90;

// تتبع عملي لكل تمرين Cardio حسب cardioMetric المحدد له في المكتبة
export function CardioTracker({ ex, onDone, onSkip }) {
  const metric      = ex.cardioMetric || 'duration';
  const isIntervals = metric === 'intervals';
  const hasDuration = metric === 'duration' || metric === 'duration_distance';
  const hasDistance = metric === 'distance' || metric === 'duration_distance';
  const hasCalories = metric === 'calories';

  // العميل بيقدر يعدّل المدة المستهدفة قبل الـ Start (5-90 دقيقة)
  const [targetMin, setTargetMin] = useState(
    Math.min(MAX_DURATION, Math.max(MIN_DURATION, Number(ex.targetDuration) || 20))
  );
  const [secondsLeft, setSecondsLeft] = useState(targetMin * 60);
  const [running, setRunning]         = useState(false);
  const [timeUp, setTimeUp]           = useState(false);
  const [distance, setDistance]       = useState('');
  const [calories, setCalories]       = useState('');
  const intervalRef = useRef(null);
  const wakeLockRef  = useRef(null);

  // تحديث الوقت المتبقي لما المستخدم يغيّر المدة قبل الـ Start
  useEffect(() => {
    if (!running && !timeUp) setSecondsLeft(targetMin * 60);
  }, [targetMin]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s > 1) return s - 1;
        clearInterval(intervalRef.current);
        setRunning(false);
        setTimeUp(true);
        return 0;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [running]);

  // إبقاء الشاشة صاحية طول ما التايمر شغال
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

  function adjustDuration(delta) {
    setTargetMin(m => Math.min(MAX_DURATION, Math.max(MIN_DURATION, m + delta)));
  }

  function start() { setRunning(true); }
  function pause() { setRunning(false); clearInterval(intervalRef.current); }

  function handleDone() {
    const elapsedMin = hasDuration ? Math.round((targetMin * 60 - secondsLeft) / 60) : null;
    onDone?.({
      duration: elapsedMin,
      distance: hasDistance ? (parseFloat(distance) || 0) : null,
      calories: hasCalories ? (parseFloat(calories) || 0) : null,
      intervals: null,
    });
  }

  // بعد اكتمال كل مراحل الـ Intervals
  function handleIntervalsFinish(completedIntervals) {
    const totalSeconds = completedIntervals.reduce((a, i) => a + (Number(i.seconds) || 0), 0);
    onDone?.({
      duration: Math.round(totalSeconds / 60),
      distance: null,
      calories: null,
      intervals: completedIntervals,
    });
  }

  if (isIntervals) {
    return (
      <div className="mb-3">
        <CardioIntervalTimer intervals={ex.intervals || []} onFinish={handleIntervalsFinish} onSkip={onSkip} />
      </div>
    );
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  return (
    <div className="mb-3 space-y-2.5">
      {hasDuration && (
        <div className="text-center">
          {!running && !timeUp && (
            <div className="flex items-center justify-center gap-3 mb-2">
              <button
                type="button"
                onClick={() => adjustDuration(-1)}
                className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-black text-sm leading-none"
              >
                −
              </button>
              <span className="text-xs font-black text-slate-500 uppercase w-24">{targetMin} min target</span>
              <button
                type="button"
                onClick={() => adjustDuration(1)}
                className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-black text-sm leading-none"
              >
                +
              </button>
            </div>
          )}
          <p className={`text-3xl font-black tabular-nums mb-2 ${timeUp ? 'text-emerald-500' : 'text-slate-900'}`}>
            {timeUp ? "Time's up ✓" : `${mm}:${ss}`}
          </p>
          {!timeUp && (
            !running ? (
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
                onClick={pause}
                className="w-full bg-slate-200 text-slate-600 py-2.5 rounded-xl font-black text-xs uppercase"
              >
                Pause
              </button>
            )
          )}
        </div>
      )}

      {hasDistance && (
        <div className="flex items-center bg-slate-100 rounded-xl px-3 py-2.5">
          <input
            type="number"
            placeholder="0"
            value={distance}
            onChange={e => setDistance(e.target.value)}
            className="bg-transparent w-full text-center outline-none text-sm font-bold text-slate-800"
          />
          <span className="text-slate-400 text-xs ml-1 shrink-0">km</span>
        </div>
      )}

      {hasCalories && (
        <div className="flex items-center bg-slate-100 rounded-xl px-3 py-2.5">
          <input
            type="number"
            placeholder="0"
            value={calories}
            onChange={e => setCalories(e.target.value)}
            className="bg-transparent w-full text-center outline-none text-sm font-bold text-slate-800"
          />
          <span className="text-slate-400 text-xs ml-1 shrink-0">kcal</span>
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleDone}
          className="flex-1 bg-[#1C1C38] text-white text-xs font-black py-2.5 rounded-xl hover:bg-[#2A2A50] transition-colors"
        >
          DONE
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="flex-1 bg-slate-100 text-slate-500 text-xs font-black py-2.5 rounded-xl hover:bg-slate-200 transition-colors"
        >
          SKIP
        </button>
      </div>
    </div>
  );
}
