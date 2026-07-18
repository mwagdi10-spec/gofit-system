export default function GoalsCard({ goals = [], historyLogs = [] }) {
  if (!goals.length) return null;

  return (
    <div className="bg-[#1C1C38] border border-[#2A2A50] rounded-2xl p-4">
      <p className="text-white font-bold mb-3">Goals</p>
      <div className="space-y-2">
        {goals.map(g => {
          const current = g.type === 'exercise_weight'
            ? Math.max(0, ...historyLogs.filter(l => l.exerciseName === g.exerciseName).map(l => l.maxWeight || 0))
            : (g.currentValue || 0);
          const pct = g.targetValue ? Math.min(100, Math.round((current / g.targetValue) * 100)) : 0;
          const done = pct >= 100;
          return (
            <div key={g.id} className="bg-[#14142B] border border-[#2A2A50] rounded-xl px-3 py-3">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-white text-sm font-bold">{done ? '🏆 ' : ''}{g.label}</p>
                <span className="text-slate-400 text-[10px] font-bold">{current}/{g.targetValue} {g.unit}</span>
              </div>
              <div className="h-2 bg-[#2A2A50] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${done ? 'bg-emerald-400' : 'bg-blue-500'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
