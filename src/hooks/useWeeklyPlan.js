// useWeeklyPlan.js

import { useState, useCallback, useMemo } from 'react';
import { migratePlanToWeekly, findDayById, getAllDays } from '../utils/planMigration';

/**
 * Central state manager for the weekly plan.
 * Pass `initialPlan` from Firestore — migration runs automatically.
 */
export function useWeeklyPlan(initialPlan) {
  const [plan, setPlan] = useState(() => migratePlanToWeekly(initialPlan));
  const [selectedDayId, setSelectedDayId] = useState(() => {
    // Auto-select first day on load
    const first = getAllDays(migratePlanToWeekly(initialPlan))[0];
    return first?.id ?? null;
  });

  // Derived: currently selected day object
  const selectedDay = useMemo(
    () => findDayById(plan, selectedDayId),
    [plan, selectedDayId]
  );

  // ── Week actions ──────────────────────────────────────────

  const addWeek = useCallback(() => {
    setPlan((prev) => {
      const newWeek = {
        id: `w_${Date.now()}`,
        title: `Week ${prev.weeks.length + 1}`,
        days: [],
      };
      return { ...prev, weeks: [...prev.weeks, newWeek] };
    });
  }, []);

  const removeWeek = useCallback((weekId) => {
    setPlan((prev) => ({
      ...prev,
      weeks: prev.weeks.filter((w) => w.id !== weekId),
    }));
  }, []);

  const renameWeek = useCallback((weekId, newTitle) => {
    setPlan((prev) => ({
      ...prev,
      weeks: prev.weeks.map((w) =>
        w.id === weekId ? { ...w, title: newTitle } : w
      ),
    }));
  }, []);

  // ── Day actions ───────────────────────────────────────────

  const addDay = useCallback((weekId) => {
    setPlan((prev) => {
      let newDayId = null;
      const updated = {
        ...prev,
        weeks: prev.weeks.map((w) => {
          if (w.id !== weekId) return w;
          const newDay = {
            id: `d_${Date.now()}`,
            title: `Day ${w.days.length + 1}`,
            exercises: [],
          };
          newDayId = newDay.id;
          return { ...w, days: [...w.days, newDay] };
        }),
      };
      // Auto-select newly created day
      if (newDayId) setSelectedDayId(newDayId);
      return updated;
    });
  }, []);

  const removeDay = useCallback((weekId, dayId) => {
    setPlan((prev) => ({
      ...prev,
      weeks: prev.weeks.map((w) =>
        w.id !== weekId
          ? w
          : { ...w, days: w.days.filter((d) => d.id !== dayId) }
      ),
    }));
    // Clear selection if removed day was selected
    setSelectedDayId((prev) => (prev === dayId ? null : prev));
  }, []);

  const renameDay = useCallback((weekId, dayId, newTitle) => {
    setPlan((prev) => ({
      ...prev,
      weeks: prev.weeks.map((w) =>
        w.id !== weekId
          ? w
          : {
              ...w,
              days: w.days.map((d) =>
                d.id === dayId ? { ...d, title: newTitle } : d
              ),
            }
      ),
    }));
  }, []);

  // ── Exercise actions ──────────────────────────────────────

  const updateDayExercises = useCallback((weekId, dayId, exercises) => {
    setPlan((prev) => ({
      ...prev,
      weeks: prev.weeks.map((w) =>
        w.id !== weekId
          ? w
          : {
              ...w,
              days: w.days.map((d) =>
                d.id === dayId ? { ...d, exercises } : d
              ),
            }
      ),
    }));
  }, []);

  return {
    plan,
    setPlan,
    selectedDayId,
    setSelectedDayId,
    selectedDay,
    // Week
    addWeek,
    removeWeek,
    renameWeek,
    // Day
    addDay,
    removeDay,
    renameDay,
    // Exercise
    updateDayExercises,
  };
}