// planMigration.js — backward-compat converter

/**
 * Ensures plan always uses { weeks: [...] } shape.
 * Old plans with flat `days` array → wrapped in Week 1.
 */
export function migratePlanToWeekly(plan) {
  if (!plan) return { weeks: [] };

  // Already new format
  if (Array.isArray(plan.weeks) && plan.weeks.length > 0) return plan;

  // Legacy flat days → Week 1 wrapper
  const flatDays = Array.isArray(plan.days) ? plan.days : [];

  const migrated = {
    ...plan,
    weeks: [
      {
        id: 'w1',
        title: 'Week 1',
        days: flatDays,
      },
    ],
  };

  // Remove legacy key to avoid confusion
  delete migrated.days;

  return migrated;
}

/**
 * Safely flatten all days across all weeks.
 */
export function getAllDays(plan) {
  if (!plan?.weeks) return [];
  return plan.weeks.flatMap((w) => w.days ?? []);
}

/**
 * Find a day by ID across all weeks.
 */
export function findDayById(plan, dayId) {
  return getAllDays(plan).find((d) => d.id === dayId) ?? null;
}