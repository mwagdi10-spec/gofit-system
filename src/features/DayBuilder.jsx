// ─── DayBuilder Feature ────────────────────────────────────────
// بناء جداول التمارين اليومية

import React, { useState, useMemo } from 'react';
import Modal from '../components/ui/Modal';
import ExerciseLibrary from './ExerciseLibrary';

const DayBuilder = ({
  isOpen = false,
  onClose = () => {},
  onAddExercises = () => {},
  clientId = '',
  dayName = '',
  exercises = [],
  libraryData = [],
  isSaving = false
}) => {
  const [selected, setSelected] = useState([]);

  const availableExercises = useMemo(() => {
    const usedNames = new Set(exercises.map(e => (e.name || '').toLowerCase()));
    return libraryData.filter(ex => !usedNames.has((ex.name || '').toLowerCase()));
  }, [exercises, libraryData]);

  const handleSelect = (exercise) => {
    const isSelected = selected.some(s => s.id === exercise.id);
    if (isSelected) {
      setSelected(selected.filter(s => s.id !== exercise.id));
    } else {
      setSelected([...selected, exercise]);
    }
  };

  const handleAdd = async () => {
    if (selected.length === 0) return;
    
    await onAddExercises(selected);
    setSelected([]);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Add Exercises to ${dayName}`}
      size="lg"
    >
      <div className="space-y-4">
        {/* Selected Count */}
        <div className="p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm font-bold text-blue-700 dark:text-blue-300">
            Selected: {selected.length} exercises
          </p>
        </div>

        {/* Exercise Library with Selection */}
        <div className="max-h-96 overflow-y-auto">
          <ExerciseLibrary
            exercises={availableExercises}
            onSelect={handleSelect}
            isEditable={false}
          />
        </div>

        {/* Selected Exercises */}
        {selected.length > 0 && (
          <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800">
            <h4 className="font-bold text-slate-900 dark:text-white mb-2">
              Selected for this day:
            </h4>
            <ul className="space-y-1">
              {selected.map(ex => (
                <li
                  key={ex.id}
                  className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2"
                >
                  <input
                    type="checkbox"
                    checked={true}
                    onChange={() => handleSelect(ex)}
                    className="w-4 h-4"
                  />
                  {ex.name}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4">
          <button
            onClick={handleAdd}
            disabled={selected.length === 0 || isSaving}
            className="flex-1 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? 'Adding...' : `Add ${selected.length} Exercises`}
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default DayBuilder;
