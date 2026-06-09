// ─── ExerciseLibrary Feature ──────────────────────────────────────
// مكتبة التمارين الكاملة مع البحث والفلترة

import React, { useState, useMemo } from 'react';
import SearchableDropdown from '../components/ui/SearchableDropdown';
import { CATEGORIES, MUSCLE_GROUPS } from '../constants/templates';
import { getExerciseMuscle } from '../utils/helpers';
import { formatName } from '../utils/formatters';

const ExerciseLibrary = ({
  exercises = [],
  onSelect = () => {},
  onAdd = () => {},
  onEdit = () => {},
  onDelete = () => {},
  isEditable = true
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [muscleFilter, setMuscleFilter] = useState('ALL');

  const filtered = useMemo(() => {
    return exercises.filter(ex => {
      const matchSearch = !searchTerm || 
        (ex.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchCategory = categoryFilter === 'ALL' || ex.category === categoryFilter;
      
      const muscle = getExerciseMuscle(ex);
      const matchMuscle = muscleFilter === 'ALL' || muscle === muscleFilter;
      
      return matchSearch && matchCategory && matchMuscle;
    });
  }, [exercises, searchTerm, categoryFilter, muscleFilter]);

  const grouped = useMemo(() => {
    const groups = {};
    
    filtered.forEach(ex => {
      const cat = ex.category || 'RESISTANCE';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(ex);
    });
    
    return groups;
  }, [filtered]);

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="space-y-3">
        <input
          type="text"
          placeholder="Search exercises..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        />

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCategoryFilter('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
              categoryFilter === 'ALL'
                ? 'bg-blue-500 text-white'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
            }`}
          >
            All
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                categoryFilter === cat
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setMuscleFilter('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
              muscleFilter === 'ALL'
                ? 'bg-green-500 text-white'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
            }`}
          >
            All Muscles
          </button>
          {MUSCLE_GROUPS.slice(0, 6).map(muscle => (
            <button
              key={muscle}
              onClick={() => setMuscleFilter(muscle)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                muscleFilter === muscle
                  ? 'bg-green-500 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
              }`}
            >
              {muscle}
            </button>
          ))}
        </div>
      </div>

      {/* Add Button */}
      {isEditable && (
        <button
          onClick={onAdd}
          className="w-full px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold transition-colors"
        >
          + Add New Exercise
        </button>
      )}

      {/* Exercise List */}
      <div className="space-y-3">
        {Object.entries(grouped).length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-500 dark:text-slate-400 font-semibold">No exercises found</p>
          </div>
        ) : (
          Object.entries(grouped).map(([category, exs]) => (
            <details key={category} className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
              <summary className="p-4 bg-slate-100 dark:bg-slate-800 font-bold text-slate-900 dark:text-white cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 flex justify-between items-center">
                <span>{category} ({exs.length})</span>
                <span className="text-xs">▼</span>
              </summary>

              <div className="p-3 space-y-2 bg-slate-50 dark:bg-slate-900">
                {exs.map(ex => (
                  <div
                    key={ex.id}
                    className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between group hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-bold text-slate-900 dark:text-white">
                        {formatName(ex.name)}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {getExerciseMuscle(ex)} • {ex.sets || '3'}×{ex.reps || '10'}
                      </p>
                    </div>

                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onSelect(ex)}
                        className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded text-xs font-bold hover:bg-blue-200 dark:hover:bg-blue-800"
                      >
                        Select
                      </button>
                      {isEditable && (
                        <>
                          <button
                            onClick={() => onEdit(ex)}
                            className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 rounded text-xs font-bold hover:bg-yellow-200 dark:hover:bg-yellow-800"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => onDelete(ex.id)}
                            className="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded text-xs font-bold hover:bg-red-200 dark:hover:bg-red-800"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </details>
          ))
        )}
      </div>
    </div>
  );
};

export default ExerciseLibrary;
