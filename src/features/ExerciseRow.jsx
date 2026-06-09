// ─── ExerciseRow Feature ──────────────────────────────────────────
// صف التمرين الواحد مع إدخال البيانات

import React, { useState, useMemo } from 'react';
import { formatName } from '../utils/formatters';
import { getOverloadSuggestion } from '../utils/helpers';

const ExerciseRow = ({
  exercise = {},
  onSave = () => {},
  onSkip = () => {},
  isSaved = false,
  isSkipped = false,
  allLogs = [],
  clientId = '',
  onShowAlternatives = () => {}
}) => {
  const setsCount = parseInt(exercise.sets) || 3;
  const [sets, setSets] = useState(
    Array.from({ length: setsCount }).map(() => ({ weight: '', reps: exercise.reps || '10' }))
  );

  const overloadSuggestion = useMemo(() => {
    return getOverloadSuggestion(exercise, allLogs, clientId);
  }, [exercise, allLogs, clientId]);

  const handleSave = () => {
    onSave({
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      setsData: sets,
      category: exercise.category,
      rpe: null,
      volume: sets.reduce((sum, s) => sum + (parseFloat(s.weight || 0) * parseFloat(s.reps || 0)), 0)
    });
  };

  return (
    <div className={`p-4 rounded-lg border-2 transition-all ${
      isSaved 
        ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
        : isSkipped
        ? 'border-slate-300 dark:border-slate-600 opacity-50'
        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white">
            {formatName(exercise.name)}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            {exercise.sets}×{exercise.reps}{exercise.tempo ? ` | ${exercise.tempo}` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          {exercise.alternatives?.length > 0 && (
            <button
              onClick={() => onShowAlternatives(exercise)}
              className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded text-xs font-bold hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
            >
              ALT
            </button>
          )}
        </div>
      </div>

      {/* Sets Input */}
      {!isSaved && !isSkipped && (
        <div className="space-y-2 mb-3">
          {sets.map((set, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400 w-10">
                Set {idx + 1}
              </span>
              <input
                type="number"
                step="0.5"
                value={set.weight}
                onChange={(e) => {
                  const newSets = [...sets];
                  newSets[idx] = { ...newSets[idx], weight: e.target.value };
                  setSets(newSets);
                }}
                placeholder="kg"
                className="w-16 px-2 py-1 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-xs text-slate-600 dark:text-slate-400">kg</span>
              <input
                type="text"
                value={set.reps}
                onChange={(e) => {
                  const newSets = [...sets];
                  newSets[idx] = { ...newSets[idx], reps: e.target.value };
                  setSets(newSets);
                }}
                placeholder="reps"
                className="w-16 px-2 py-1 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-xs text-slate-600 dark:text-slate-400">reps</span>
            </div>
          ))}
        </div>
      )}

      {/* Suggestion */}
      {!isSaved && (
        <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded text-xs text-blue-700 dark:text-blue-300 mb-3 border border-blue-200 dark:border-blue-800">
          💪 {overloadSuggestion}
        </div>
      )}

      {/* Buttons */}
      {!isSaved && !isSkipped && (
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="flex-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-bold transition-colors"
          >
            Save
          </button>
          <button
            onClick={onSkip}
            className="flex-1 px-3 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
          >
            Skip
          </button>
        </div>
      )}

      {isSaved && (
        <div className="text-center text-sm font-bold text-green-600 dark:text-green-400">
          ✓ Saved
        </div>
      )}

      {isSkipped && (
        <div className="text-center text-sm font-bold text-slate-500 dark:text-slate-400">
          Skipped
        </div>
      )}
    </div>
  );
};

export default ExerciseRow;
