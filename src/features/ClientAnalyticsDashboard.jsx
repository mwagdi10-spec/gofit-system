import React, { useState, useEffect, useMemo } from 'react';
import { fetchClientLogsSince } from '../services/firebase/analytics';
import {
  buildAdherence,
  buildCalendarHeatmap,
  buildClientCoachReport,
  buildInactivity,
  buildInsights,
  buildMesocycleProgress,
  buildPerformanceBars,
  buildPeriodComparison,
  buildPlateauActionPlan,
  buildPrTimeline,
  buildSkippedExercises,
  buildSmartDeloadSignal,
  buildWeightRecommendations,
} from '../utils/analyticsTransformers';
import { formatName } from '../utils/formatters';

const PERIOD_OPTIONS = [7, 14, 30, 60, 90];
const bg  = 'bg-Blue border-slate-200';
const tx  = 'text-slate-900';
const sub = 'text-slate-500';
const inp = 'bg-slate-50 border-slate-200';
const cardBox = 'p-4 rounded-2xl bg-white border-2 border-slate-100 shadow-sm';

const SEVERITY_STYLE = {
  high:   'bg-red-50 border-red-200',
  medium: 'bg-amber-50 border-amber-200',
  low:    'bg-blue-50 border-blue-200',
};

export function ClientAnalyticsDashboard({ identifier, clientInfo, workouts, db, appId }) {
  const [periodDays, setPeriodDays] = useState(30);
  const [activeTab, setActiveTab]   = useState('overview');
  const [periodLogs, setPeriodLogs] = useState([]);
  const [prevPeriodLogs, setPrevPeriodLogs] = useState([]);
  const [allClientLogs, setAllClientLogs] = useState([]);
  const [lastLog, setLastLog]       = useState(null);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    if (!identifier) return;
    let active = true;
    setLoading(true);
    const since = new Date();
    since.setDate(since.getDate() - periodDays);
    const prevSince = new Date();
    prevSince.setDate(prevSince.getDate() - (periodDays * 2));
    const lookback = new Date();
    lookback.setDate(lookback.getDate() - 365);
    Promise.all([
      fetchClientLogsSince(db, appId, identifier, since),
      fetchClientLogsSince(db, appId, identifier, prevSince),
      fetchClientLogsSince(db, appId, identifier, lookback),
    ]).then(([period, prevWindow, yearLogs]) => {
      if (!active) return;
      setPeriodLogs(period);
      // الفترة السابقة فقط = اللي قبل "since" ومش متضمنة في period
      setPrevPeriodLogs(prevWindow.filter(l => {
        const d = l.completedAt?.toDate?.();
        return d && d < since;
      }));
      setAllClientLogs(yearLogs);
      setLastLog(yearLogs.at(-1) || null);
      setLoading(false);
    });
    return () => { active = false; };
  }, [identifier, periodDays, db, appId]);

  const clientWorkouts = useMemo(
    () => workouts.filter(w => w.assignedTo === identifier),
    [workouts, identifier]
  );

  const adherence     = useMemo(() => buildAdherence(clientInfo, periodLogs, periodDays), [clientInfo, periodLogs, periodDays]);
  const prevAdherence = useMemo(() => buildAdherence(clientInfo, prevPeriodLogs, periodDays), [clientInfo, prevPeriodLogs, periodDays]);
  const inactivity     = useMemo(() => buildInactivity(lastLog), [lastLog]);
  const skipped        = useMemo(() => buildSkippedExercises(clientWorkouts, periodLogs), [clientWorkouts, periodLogs]);
  const prTimeline      = useMemo(() => buildPrTimeline(periodLogs), [periodLogs]);
  const coachReport     = useMemo(() => buildClientCoachReport({ clientInfo, periodLogs, prevPeriodLogs, periodDays }), [clientInfo, periodLogs, prevPeriodLogs, periodDays]);
  const deloadSignal    = useMemo(() => buildSmartDeloadSignal({ allLogs: allClientLogs, recentLogs: periodLogs }), [allClientLogs, periodLogs]);
  const weightRecs      = useMemo(() => buildWeightRecommendations(allClientLogs), [allClientLogs]);
  const plateauPlan     = useMemo(() => buildPlateauActionPlan(allClientLogs), [allClientLogs]);
  const performanceBars = useMemo(() => buildPerformanceBars(periodLogs, prevPeriodLogs), [periodLogs, prevPeriodLogs]);
  const heatmapDays     = useMemo(() => buildCalendarHeatmap(allClientLogs), [allClientLogs]);
  const comparison      = useMemo(() => buildPeriodComparison(periodLogs, prevPeriodLogs), [periodLogs, prevPeriodLogs]);
  const mesocycle       = useMemo(() => buildMesocycleProgress(clientWorkouts, periodLogs), [clientWorkouts, periodLogs]);
  const insights = useMemo(() => buildInsights({
    periodLogs,
    currentAdherencePct: adherence.adherencePct,
    previousAdherencePct: prevPeriodLogs.length ? prevAdherence.adherencePct : null,
  }), [periodLogs, adherence.adherencePct, prevAdherence.adherencePct, prevPeriodLogs.length]);

  return (
    <div className={`${bg} border-2 p-6 rounded-[2.5rem] shadow-xl space-y-5`}>
      <div className="flex items-center justify-between gap-3 border-b pb-3 border-slate-200">
        <h3 className={`font-black text-base ${tx}`}>Client Analytics</h3>
        <select value={periodDays} onChange={e => setPeriodDays(Number(e.target.value))} className={`p-2 border-2 rounded-xl font-black text-xs outline-none focus:border-emerald-500 ${inp}`}>
          {PERIOD_OPTIONS.map(d => <option key={d} value={d}>Last {d} Days</option>)}
        </select>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
        <button onClick={() => setActiveTab('overview')}
          className={`flex-1 py-2 rounded-xl text-xs font-black transition-colors ${activeTab === 'overview' ? 'bg-white text-slate-900 shadow' : 'text-slate-400'}`}>
          Overview
        </button>
        <button onClick={() => setActiveTab('coach')}
          className={`flex-1 py-2 rounded-xl text-xs font-black transition-colors ${activeTab === 'coach' ? 'bg-white text-slate-900 shadow' : 'text-slate-400'}`}>
          Coach Report
        </button>
        <button onClick={() => setActiveTab('insights')}
          className={`flex-1 py-2 rounded-xl text-xs font-black transition-colors relative ${activeTab === 'insights' ? 'bg-white text-slate-900 shadow' : 'text-slate-400'}`}>
          Insights
          {insights.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
              {insights.length}
            </span>
          )}
        </button>
      </div>

      {loading ? (
        <p className={`text-xs font-black ${sub} text-center py-8`}>Loading analytics...</p>
      ) : activeTab === 'coach' ? (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-100">
              <p className="text-[10px] font-black text-emerald-700 uppercase">Mesocycle</p>
              <p className="font-black text-2xl text-slate-900 mt-1">Week {mesocycle.currentWeek}/{mesocycle.totalWeeks}</p>
              <div className="h-2 bg-white rounded-full mt-3 overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${mesocycle.progressPct}%` }} />
              </div>
              <p className="text-[11px] font-black text-slate-500 mt-2">{mesocycle.phase}</p>
            </div>
            <div className="p-4 rounded-2xl bg-blue-50 border-2 border-blue-100">
              <p className="text-[10px] font-black text-blue-700 uppercase">Compare with previous</p>
              <p className="font-black text-2xl text-slate-900 mt-1">{comparison.volumeDeltaPct >= 0 ? '+' : ''}{comparison.volumeDeltaPct}%</p>
              <p className="text-[11px] font-black text-slate-500 mt-2">Volume change, {comparison.sessionDelta >= 0 ? '+' : ''}{comparison.sessionDelta} sessions</p>
            </div>
            <div className={`p-4 rounded-2xl border-2 ${deloadSignal.shouldDeload ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
              <p className={`text-[10px] font-black uppercase ${deloadSignal.shouldDeload ? 'text-red-700' : 'text-slate-500'}`}>Smart Deload</p>
              <p className="font-black text-sm text-slate-900 mt-2 leading-relaxed">{deloadSignal.message}</p>
              <p className="text-[11px] font-black text-slate-500 mt-2">Avg RPE {deloadSignal.avgRpe || '-'} - {deloadSignal.fallingRepSignals} fatigue signal(s)</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className={`${cardBox} space-y-3`}>
              <h4 className={`font-black text-sm border-b pb-2 ${tx} border-slate-200`}>This Week</h4>
              {coachReport.thisWeek.map(item => (
                <div key={item} className="p-3 rounded-2xl bg-blue-50 border-2 border-l-blue-500 border-l-[6px] text-xs font-black text-blue-800">{item}</div>
              ))}
              <h4 className={`font-black text-sm border-b pb-2 pt-2 ${tx} border-slate-200`}>Next Week</h4>
              {coachReport.nextWeek.map(item => (
                <div key={item} className="p-3 rounded-2xl bg-emerald-50 border-2 border-l-emerald-500 border-l-[6px] text-xs font-black text-emerald-800">{item}</div>
              ))}
            </div>

            <div className={`${cardBox} space-y-3`}>
              <h4 className={`font-black text-sm border-b pb-2 ${tx} border-slate-200`}>Automatic Weight Recommendation</h4>
              {weightRecs.length === 0 ? (
                <p className={`text-xs font-black ${sub} text-center py-4`}>Not enough logged sets for recommendations</p>
              ) : weightRecs.map(rec => (
                <div key={rec.name} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-black text-xs text-slate-900 truncate">{formatName(rec.name)}</span>
                    <span className="font-black text-xs text-emerald-600 shrink-0">{rec.recommendation}</span>
                  </div>
                  <p className="text-[10px] font-bold text-slate-500 mt-1">{rec.last} - {rec.reason}</p>
                </div>
              ))}
            </div>
          </div>

          <div className={`${cardBox} space-y-3`}>
            <h4 className={`font-black text-sm border-b pb-2 ${tx} border-slate-200`}>Plateau Detection</h4>
            {plateauPlan.length === 0 ? (
              <p className={`text-xs font-black ${sub} text-center py-4`}>No plateau detected across recent sessions</p>
            ) : plateauPlan.map(item => (
              <div key={item.name} className="p-3 rounded-xl bg-amber-50 border-2 border-amber-100">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-black text-xs text-slate-900">{formatName(item.name)}</span>
                  <span className="font-black text-xs text-amber-700">{item.metric}</span>
                </div>
                <p className="text-[10px] font-black text-slate-500 mt-2">{item.actions.join(' - ')}</p>
              </div>
            ))}
          </div>

          <div className={`${cardBox} space-y-3`}>
            <h4 className={`font-black text-sm border-b pb-2 ${tx} border-slate-200`}>Performance Bars</h4>
            {performanceBars.length === 0 ? (
              <p className={`text-xs font-black ${sub} text-center py-4`}>No performance data in this period</p>
            ) : (
              <div className="space-y-2">
                {performanceBars.slice(-8).map(day => {
                  const width = Math.min(100, Math.round((day.volume / Math.max(1, day.previousAvg || day.volume)) * 70));
                  return (
                    <div key={day.date} className="grid grid-cols-[52px_1fr_72px] items-center gap-2 text-[10px] font-black">
                      <span className="text-slate-500">{day.date}</span>
                      <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.max(8, width)}%` }} />
                      </div>
                      <span className="text-slate-700 text-right">{Math.round(day.volume)} vol</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className={`${cardBox} space-y-3`}>
            <h4 className={`font-black text-sm border-b pb-2 ${tx} border-slate-200`}>Calendar Heatmap</h4>
            <div className="grid grid-cols-7 gap-1.5 w-fit">
              {heatmapDays.map(day => (
                <div
                  key={day.date}
                  title={`${day.label}: ${day.count} log(s)`}
                  className={`w-5 h-5 rounded-md border ${day.count ? 'bg-emerald-500 border-emerald-500' : 'bg-slate-50 border-slate-100'}`}
                />
              ))}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400">
              <span>Less</span>
              <div className="w-4 h-4 rounded-md bg-slate-50 border border-slate-100" />
              <div className="w-4 h-4 rounded-md bg-emerald-500 border border-emerald-500" />
              <span>More</span>
            </div>
          </div>
        </div>
      ) : activeTab === 'insights' ? (
        <div className="space-y-2">
          {insights.length === 0 ? (
            <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-100 text-center">
              <p className="text-xs font-black text-emerald-600">✅ No flags — client on track</p>
            </div>
          ) : (
            insights.map((ins, i) => (
              <div key={i} className={`p-3 rounded-xl border-2 ${SEVERITY_STYLE[ins.severity]}`}>
                <p className="font-black text-xs text-slate-900">{ins.icon} {ins.title}</p>
                <p className="text-[11px] font-bold text-slate-600 mt-1 leading-relaxed">{ins.message}</p>
              </div>
            ))
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-slate-50 text-center">
              <p className="font-black text-3xl text-emerald-500">{adherence.adherencePct}%</p>
              <p className={`text-[10px] font-black ${sub} mt-1 uppercase`}>Adherence ({adherence.activeDays}/{adherence.expectedDays} days)</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 text-center">
              <p className={`font-black text-3xl ${inactivity.isInactive ? 'text-red-500' : 'text-emerald-500'}`}>
                {inactivity.daysSinceLast === null ? '—' : `${inactivity.daysSinceLast}d`}
              </p>
              <p className={`text-[10px] font-black ${sub} mt-1 uppercase`}>Since Last Workout</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 text-center">
              <p className="font-black text-3xl text-emerald-500">{prTimeline.length}</p>
              <p className={`text-[10px] font-black ${sub} mt-1 uppercase`}>PRs This Period</p>
            </div>
          </div>

          {inactivity.isInactive && (
            <div className="p-3 rounded-xl bg-red-50 border-2 border-red-100 text-center">
              <p className="text-xs font-black text-red-600">⚠ No workout logged in {inactivity.daysSinceLast ?? '365+'} days</p>
            </div>
          )}

          <div>
            <h4 className={`font-black text-sm border-b pb-2 mb-2 ${tx} border-slate-200`}>Most Skipped Exercises</h4>
            {skipped.length === 0 ? (
              <p className={`text-xs font-black ${sub} text-center py-4`}>No skipped exercises in this period</p>
            ) : (
              <div className="space-y-1">
                {skipped.map(s => (
                  <div key={s.name} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="font-black text-xs text-slate-900">{formatName(s.name)}</span>
                    <span className="font-black text-xs text-red-500">{s.skipPct}% skipped ({s.loggedCount}/{s.assignedCount})</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h4 className={`font-black text-sm border-b pb-2 mb-2 ${tx} border-slate-200`}>PR Progression</h4>
            {prTimeline.length === 0 ? (
              <p className={`text-xs font-black ${sub} text-center py-4`}>No PRs logged in this period</p>
            ) : (
              <div className="space-y-1">
                {prTimeline.map((pr, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="font-black text-xs text-slate-900">{formatName(pr.name)}</span>
                    <span className="font-black text-xs text-emerald-500">{pr.weight}kg × {pr.reps} · {pr.date}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
