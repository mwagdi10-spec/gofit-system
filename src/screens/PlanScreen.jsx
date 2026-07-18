import { useState, useEffect, useRef } from 'react';
import BottomNav from '../components/BottomNav';

export default function PlanScreen({ navigate, current, plan = [], onReopenDay }) {
  const [open, setOpen] = useState(null);
  const [weekDays, setWeekDays] = useState(() => {
    const init = {};
    plan.forEach(w => { init[w.week_id] = w.days; });
    return init;
  });
  const dragIdx = useRef(null);

  // re-sync on every plan change (new week/day from trainer)
  useEffect(() => {
    const init = {};
    plan.forEach(w => { init[w.week_id] = w.days; });
    setWeekDays(init);
    setOpen(prev => (plan.some(w => w.week_id === prev) ? prev : null));
  }, [plan]);

  function onDragStart(idx) { dragIdx.current = idx; }
  function onDrop(weekId, dropIdx) {
    if (dragIdx.current === null) return;
    const days = Array.from(weekDays[weekId] || []);
    const [moved] = days.splice(dragIdx.current, 1);
    days.splice(dropIdx, 0, moved);
    setWeekDays(p => ({ ...p, [weekId]: days }));
    dragIdx.current = null;
  }

  // confirm before undoing a completed day
  function handleReopen(day, weekId) {
    if (window.confirm(`Reopen "${day}"? This will undo its completion.`)) {
      onReopenDay?.(day, weekId);
    }
  }

  if (!plan.length) return (
    <div className="min-h-screen bg-[#0D0D1A] max-w-sm mx-auto flex flex-col">
      <div className="px-5 py-5 border-b border-[#2A2A50]">
        <h1 className="text-white text-2xl font-black">Training Plan</h1>
      </div>
      <div className="flex-1 flex items-center justify-center text-slate-400 text-sm font-semibold">
        No plan assigned yet
      </div>
      <BottomNav navigate={navigate} current={current} />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#121a2a] max-w-sm mx-auto pb-24">

      <div className="px-5 py-5 border-b border-[#2A2A50]">
        <h1 className="text-white text-2xl font-black">Training Plan</h1>
      </div>

      <div className="px-3 pt-6 space-y-4">
        {plan.map(week => {
          const isOpen  = open === week.week_id;
          const days    = weekDays[week.week_id] || week.days;
          const doneNum = days.filter(d => d.isCompleted).length;

          return (
            <div key={week.week_id} className="border border-[#2A2A50] rounded-2xl overflow-hidden">
              <button
                onClick={() => setOpen(isOpen ? null : week.week_id)}
                className="w-full flex justify-between items-center px-4 py-4 bg-[#121a2a]"
              >
                <div className="text-left">
                  <p className="text-white font-bold">{week.title}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{doneNum}/{days.length} completed</p>
                </div>
                <span className="text-slate-200 text-lg">{isOpen ? '▲' : '▼'}</span>
              </button>

              {isOpen && (
                <div>
                  {days.map((day, idx) => (
                    <div
                      key={day.id}
                      draggable
                      onDragStart={() => onDragStart(idx)}
                      onDragOver={e => e.preventDefault()}
                      onDrop={() => onDrop(week.week_id, idx)}
                      className={`flex items-center justify-between px-4 py-3.5
                        border-t border-[#2A2A60] cursor-grab active:opacity-50 transition-opacity
                        ${day.isActive ? 'bg-blue-500/10' : 'bg-[#14142B]'}`}
                    >
                      <span className="text-slate-100 text-lg mr-3 select-none">⠿</span>

                      <div className="flex-1">
                        <p className="text-white text-sm font-semibold">{day.title}</p>
                        <p className="text-slate-500 text-xs">{day.type}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {!day.isCompleted && (
                          <button
                            onClick={() => navigate('WorkoutPreview', {
                              day:    day.title,
                              type:   day.type,
                              weekId: week.week_id,
                            })}
                            title="Preview workout"
                            className="bg-[#1C1C38] border border-[#2A2A50] text-slate-300 text-xs font-black px-2.5 py-2 rounded-xl hover:border-blue-500 transition-colors"
                          >
                            👁
                          </button>
                        )}

                        {day.isCompleted ? (
                          <>
                            <span className="text-green-500 text-sm font-semibold">Done</span>
                            <button
                              onClick={() => handleReopen(day.title, week.week_id)}
                              className="bg-orange-500 hover:bg-orange-600 text-white text-[10px] font-black px-2.5 py-1.5 rounded-lg transition-colors"
                            >
                              ↺ Reopen
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => navigate('ActiveWorkout', {
                              day:    day.title,
                              type:   day.type,
                              weekId: week.week_id,
                            })}
                            className={`text-white text-xs font-black px-4 py-2 rounded-xl tracking-widest transition-colors
                              ${day.isActive
                                ? 'bg-blue-500 hover:bg-blue-600'
                                : 'bg-[#2A2A50] hover:bg-[#3A3A60]'}`}
                          >
                            {day.isActive ? 'START' : 'GO'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <BottomNav navigate={navigate} current={current} />
    </div>
  );
}
