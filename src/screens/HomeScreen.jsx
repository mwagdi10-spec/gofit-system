import BottomNav from '../components/BottomNav';
export default function HomeScreen({ navigate, current, user = {}, activeDay = null }) {
  const pct = user.weeklyGoal ? (user.weeklyProgress / user.weeklyGoal) * 100 : 0;
  return (
    <div className="min-h-screen bg-[#121a2a] max-w-sm mx-auto px-5 pb-24">
      <div className="flex justify-between items-center pt-14 mb-7">
        <div className="relative cursor-pointer">
        </div>
      </div>

      <div className="mb-12">
        <h1 className="text-3xl font-bold text-white">Welcome, {user.name || 'Client'} 👋</h1>
        <p className="text-[#00D4AA] text-lg font-medium mt-3">{user.currentPhase || '—'}</p>
      </div>

      <div className="bg-[#1C1C38] rounded-2xl p-5 mb-8 border border-[#2A2A50]">
        <div className="flex justify-between mb-3">
          <span className="text-white font-semibold text-sm">Weekly Progress</span>
          <span className="text-slate-400 text-sm">{user.weeklyProgress || 0}/{user.weeklyGoal || 4} days</span>
        </div>
        <div className="h-2 bg-[#2A2A90] rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <button
          onClick={() => navigate('ActiveWorkout', activeDay || {})}
          className="bg-blue-600 hover:bg-blue-600 active:scale-95 rounded-2xl py-5
          flex items-center justify-center gap-3 text-white font-bold text-lg transition-all"
        >
          Go Ahead! 🏋️‍♂️
        </button>
        <p className="text-slate-400 text-xs text-center">
          {activeDay ? `${activeDay.day} — ${activeDay.type}` : (user.nextWorkout || '—')}
        </p>
        <button
          onClick={() => navigate('Progress')}
          className="bg-[#1C1C38] border border-[#2A2A50] hover:border-blue-500 rounded-2xl py-4
                     flex items-center justify-center gap-2 text-blue-400 font-semibold transition-colors"
        >
          My Progress 📊
        </button>
      </div>
      <BottomNav navigate={navigate} current={current} />
    </div>
  );
}