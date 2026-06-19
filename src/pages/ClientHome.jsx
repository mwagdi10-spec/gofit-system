import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';

export default function ClientHome() {
  const { user, workoutPrograms, clientData } = useContext(AuthContext);
  const { isDark } = useContext(ThemeContext);
  const navigate = useNavigate();

  const currentProgram = workoutPrograms[0];
  const completedWorkouts = currentProgram?.workouts?.filter(w => w.completed).length || 0;
  const totalWorkouts = currentProgram?.workouts?.length || 0;

  const bgClass = isDark ? 'bg-gray-900' : 'bg-white';
  const textClass = isDark ? 'text-white' : 'text-gray-900';
  const cardBg = isDark ? 'bg-gray-800' : 'bg-gray-50';
  const textSecondary = isDark ? 'text-gray-300' : 'text-gray-600';

  return (
    <div className={`min-h-screen ${bgClass} ${textClass} p-6`}>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold">
            Welcome, {clientData?.name}! 💪
          </h1>
          <p className={`mt-2 ${textSecondary}`}>
            Current Phase: <span className="font-semibold">{currentProgram?.phase || 'N/A'}</span>
          </p>
        </div>

        {/* Progress Bar */}
        <div className={`${cardBg} rounded-lg p-6`}>
          <div className="flex justify-between mb-2">
            <span className="font-semibold">Weekly Progress</span>
            <span className="text-blue-500">{completedWorkouts}/{totalWorkouts} completed</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3">
            <div
              className="bg-blue-500 h-3 rounded-full transition-all"
              style={{ width: `${(completedWorkouts / totalWorkouts) * 100}%` }}
            />
          </div>
        </div>

        {/* Start Workout */}
        <button
          onClick={() => navigate('/workout')}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-lg text-lg transition"
        >
          Start Workout →
        </button>

        {/* Weeks Grid */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Your Program Weeks</h2>
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(week => (
              <WeekCard
                key={week}
                weekNum={week}
                days={currentProgram?.weeks?.[week - 1]?.days || []}
                isDark={isDark}
                cardBg={cardBg}
                textSecondary={textSecondary}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function WeekCard({ weekNum, days, isDark, cardBg, textSecondary }) {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <div className={`${cardBg} rounded-lg p-4 cursor-pointer`} onClick={() => setExpanded(!expanded)}>
      <div className="flex justify-between items-center">
        <span className="font-bold">Week {weekNum}</span>
        <span className={`text-sm ${textSecondary}`}>{days.length} days</span>
      </div>
      {expanded && (
        <div className={`mt-3 space-y-2 ${textSecondary}`}>
          {days.map((day, idx) => (
            <div key={idx} className="text-sm pl-3 border-l border-blue-500">
              {day.name}: {day.exercises?.length || 0} exercises
            </div>
          ))}
        </div>
      )}
    </div>
  );
}