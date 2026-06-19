import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function ProgressScreen({ goBack, user = {}, muscleProgress = [], weeklyLoad = [] }) {
  const [expandedMuscle, setExpandedMuscle] = useState(null);

  const maxLoad   = weeklyLoad.length ? Math.max(...weeklyLoad.map(w => w.load), 1) : 1;
  const commitPct = user.weeklyGoal
    ? Math.round((user.weeklyProgress / user.weeklyGoal) * 100)
    : 0;
  const volGrowth = weeklyLoad.length >= 2
    ? Math.round(((weeklyLoad.at(-1).load - weeklyLoad[0].load) / (weeklyLoad[0].load || 1)) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-[#0D0D1A] max-w-sm mx-auto pb-10">

      <div className="flex items-center justify-between px-5 py-4 border-b border-[#2A2A50]">
        <button onClick={goBack} className="text-white text-2xl leading-none">‹</button>
        <h1 className="text-white font-black text-xl">Progress</h1>
        <div className="w-6" />
      </div>

      <div className="px-4 pt-4 space-y-4">

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { val: `${commitPct}%`,             lbl: 'Commitment'   },
            { val: volGrowth >= 0 ? `+${volGrowth}%` : `${volGrowth}%`, lbl: 'Volume Growth' },
          ].map(s => (
            <div key={s.lbl} className="bg-[#1C1C38] border border-[#2A2A50] rounded-2xl p-4 text-center">
              <p className="text-blue-400 text-3xl font-black">{s.val}</p>
              <p className="text-slate-400 text-xs mt-1">{s.lbl}</p>
            </div>
          ))}
        </div>

        {/* Weekly Load Bar Chart */}
        {weeklyLoad.some(w => w.load > 0) && (
          <div className="bg-[#1C1C38] border border-[#2A2A50] rounded-2xl p-5">
            <p className="text-white font-bold mb-5">Weekly Load (kg)</p>
            <div className="flex justify-around items-end h-32">
              {weeklyLoad.map(w => {
                const h = Math.round((w.load / maxLoad) * 100);
                return (
                  <div key={w.week} className="flex flex-col items-center gap-1">
                    <span className="text-slate-400 text-[10px]">
                      {w.load >= 1000 ? `${(w.load / 1000).toFixed(1)}k` : w.load}
                    </span>
                    <div className="w-9 bg-[#2A2A50] rounded-lg flex items-end overflow-hidden" style={{ height: 90 }}>
                      <div className="w-full bg-blue-500 rounded-lg" style={{ height: `${h}%` }} />
                    </div>
                    <span className="text-slate-400 text-xs font-semibold">{w.week}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Muscle Strength Progression */}
        {muscleProgress.length > 0 ? (
          <div className="bg-[#1C1C38] border border-[#2A2A50] rounded-2xl overflow-hidden">
            <p className="text-white font-bold px-5 pt-5 pb-3">Strength Progression</p>
            {muscleProgress.map((m, i) => {
              const ceil    = (m.current_weight || 1) * 1.25;
              const startW  = `${((m.start_weight   || 0) / ceil) * 100}%`;
              const curW    = `${((m.current_weight || 0) / ceil) * 100}%`;
              const pct     = m.start_weight
                ? Math.round(((m.current_weight - m.start_weight) / m.start_weight) * 100)
                : 0;
              const isOpen  = expandedMuscle === m.name;
              return (
                <div key={m.name} className={i > 0 ? 'border-t border-[#2A2A50]' : ''}>
                  <button
                    onClick={() => setExpandedMuscle(isOpen ? null : m.name)}
                    className="w-full px-5 py-3 text-left"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-white text-sm font-semibold">{m.name}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {pct >= 0 ? '+' : ''}{pct}%
                        </span>
                        <span className="text-slate-400 text-xs">{isOpen ? '▲' : '▾'}</span>
                      </div>
                    </div>
                    <div className="relative h-2 bg-[#2A2A50] rounded-full overflow-hidden">
                      <div className="absolute inset-y-0 left-0 bg-blue-500 rounded-full"     style={{ width: curW   }} />
                      <div className="absolute inset-y-0 left-0 bg-slate-400/50 rounded-full" style={{ width: startW }} />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-slate-400 text-[10px]">{m.start_weight}kg start</span>
                      <span className="text-blue-400 text-[10px] font-semibold">{m.current_weight}kg now</span>
                    </div>
                  </button>

                  {isOpen && m.monthlyData?.some(d => d.load > 0) && (
                    <div className="px-3 pb-4 bg-[#14142B]">
                      <ResponsiveContainer width="100%" height={130}>
                        <LineChart data={m.monthlyData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                          <XAxis dataKey="week" tick={{ fill:'#94A3B8', fontSize:10 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill:'#94A3B8', fontSize:10 }} axisLine={false} tickLine={false} />
                          <Tooltip
                            contentStyle={{ backgroundColor:'#1C1C38', border:'1px solid #2A2A50', borderRadius:8, fontSize:11 }}
                            labelStyle={{ color:'#94A3B8' }}
                            itemStyle={{ color:'#4F8EF7' }}
                            formatter={v => [`${v} kg`, m.name]}
                          />
                          <Line type="monotone" dataKey="load" stroke="#4F8EF7" strokeWidth={2} dot={{ fill:'#4F8EF7', r:3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-[#1C1C38] border border-[#2A2A50] rounded-2xl p-8 text-center">
            <p className="text-slate-400 text-sm font-semibold">Log workouts to track progress</p>
          </div>
        )}

      </div>
    </div>
  );
}