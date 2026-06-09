// ─── useMetrics Hook ───────────────────────────────────────────────────────
// حساب مقاييس العميل والأداء والتقدم

import { useMemo } from 'react';
import { getClientMetrics, getCoachRecommendations, getOverloadSuggestion } from '../utils/helpers';
import { getMuscleGroup } from '../utils/helpers';
import { startOfDay, dateFromLog } from '../utils/formatters';

/**
 * Hook لحساب مقاييس العميل
 * 
 * @param {string} clientPhone - رقم العميل
 * @param {Array} workouts - التمارين المعينة
 * @param {Array} logs - السجلات المسجلة
 * @returns {Object} metrics object
 * 
 * @example
 * const metrics = useMetrics(phone, workouts, logs);
 * console.log(metrics.adherence); // 75%
 * console.log(metrics.topMuscle); // 'Chest'
 */
export const useMetrics = (clientPhone, workouts = [], logs = []) => {
  return useMemo(() => {
    if (!clientPhone) {
      return {
        assigned: 0,
        completed: 0,
        prs: 0,
        avgRpe: '—',
        topMuscle: '—',
        adherence: 0,
        daysSinceLast: 999,
        muscleCounts: {}
      };
    }

    return getClientMetrics(clientPhone, workouts, logs);
  }, [clientPhone, workouts, logs]);
};

/**
 * Hook لحساب توصيات الكوتش
 * 
 * @param {Object} client - بيانات العميل
 * @param {Object} metrics - المقاييس
 * @returns {Array} recommendations array
 * 
 * @example
 * const recommendations = useCoachRecommendations(client, metrics);
 * recommendations.forEach(rec => console.log(rec));
 */
export const useCoachRecommendations = (client = {}, metrics = {}) => {
  return useMemo(() => {
    if (!client || !metrics) return [];
    return getCoachRecommendations(client, metrics);
  }, [client, metrics]);
};

/**
 * Hook لحساب اقتراح الزيادة (Progressive Overload)
 * 
 * @param {Object} exercise - التمرين
 * @param {Array} allLogs - جميع السجلات
 * @param {string} identifier - رقم العميل
 * @returns {string} suggestion
 */
export const useOverloadSuggestion = (exercise = {}, allLogs = [], identifier = '') => {
  return useMemo(() => {
    if (!exercise || !identifier) return 'Select an exercise';
    return getOverloadSuggestion(exercise, allLogs, identifier);
  }, [exercise, allLogs, identifier]);
};

/**
 * Hook لحساب إحصائيات التمرين
 * 
 * @param {string} exerciseId - معرف التمرين
 * @param {string} clientPhone - رقم العميل
 * @param {Array} allLogs - جميع السجلات
 * @returns {Object} exercise stats
 */
export const useExerciseStats = (exerciseId, clientPhone, allLogs = []) => {
  return useMemo(() => {
    if (!exerciseId || !clientPhone) {
      return {
        totalSessions: 0,
        bestWeight: 0,
        bestReps: 0,
        avgWeight: 0,
        avgRpe: 0,
        totalVolume: 0,
        progressTrend: 'stable',
        prs: 0
      };
    }

    const exerciseLogs = allLogs.filter(
      l => l.exerciseId === exerciseId && l.clientName === clientPhone
    );

    if (exerciseLogs.length === 0) {
      return {
        totalSessions: 0,
        bestWeight: 0,
        bestReps: 0,
        avgWeight: 0,
        avgRpe: 0,
        totalVolume: 0,
        progressTrend: 'new',
        prs: 0
      };
    }

    const weights = exerciseLogs.flatMap(l =>
      l.setsData?.map(s => parseFloat(s.weight) || 0) || []
    ).filter(w => w > 0);

    const bestWeight = Math.max(...weights);
    const avgWeight = weights.length > 0 ? weights.reduce((a, b) => a + b, 0) / weights.length : 0;

    const rpes = exerciseLogs
      .map(l => Number(l.rpe))
      .filter(r => !isNaN(r));
    const avgRpe = rpes.length > 0 ? (rpes.reduce((a, b) => a + b, 0) / rpes.length).toFixed(1) : 0;

    const totalVolume = exerciseLogs.reduce((sum, l) => sum + (Number(l.volume) || 0), 0);

    const prs = exerciseLogs.filter(l => l.isPR).length;

    // Calculate trend
    let progressTrend = 'stable';
    if (exerciseLogs.length >= 2) {
      const recent = exerciseLogs.slice(-3);
      const older = exerciseLogs.slice(0, 3);
      const recentMax = Math.max(...recent.flatMap(l =>
        l.setsData?.map(s => parseFloat(s.weight) || 0) || []
      ));
      const olderMax = Math.max(...older.flatMap(l =>
        l.setsData?.map(s => parseFloat(s.weight) || 0) || []
      ));

      if (recentMax > olderMax * 1.05) progressTrend = 'improving';
      else if (recentMax < olderMax * 0.95) progressTrend = 'declining';
    }

    return {
      totalSessions: exerciseLogs.length,
      bestWeight: bestWeight.toFixed(1),
      bestReps: Math.max(...exerciseLogs.flatMap(l =>
        l.setsData?.map(s => parseFloat(s.reps) || 0) || []
      )) || 0,
      avgWeight: avgWeight.toFixed(1),
      avgRpe: parseFloat(avgRpe).toFixed(1),
      totalVolume: totalVolume.toFixed(0),
      progressTrend,
      prs
    };
  }, [exerciseId, clientPhone, allLogs]);
};

/**
 * Hook لحساب إحصائيات العضلات
 * 
 * @param {string} clientPhone - رقم العميل
 * @param {Array} allLogs - جميع السجلات
 * @returns {Object} muscle stats
 */
export const useMuscleLogs = (clientPhone, allLogs = []) => {
  return useMemo(() => {
    if (!clientPhone) return {};

    const clientLogs = allLogs.filter(l => l.clientName === clientPhone);
    const muscleCounts = {};

    clientLogs.forEach(log => {
      const muscle = getMuscleGroup(log.exerciseName);
      if (muscle) {
        muscleCounts[muscle] = (muscleCounts[muscle] || 0) + 1;
      }
    });

    return muscleCounts;
  }, [clientPhone, allLogs]);
};

/**
 * Hook لحساب إحصائيات الجلسة اليومية
 * 
 * @param {string} clientPhone - رقم العميل
 * @param {Array} allLogs - جميع السجلات
 * @returns {Object} session stats
 */
export const useTodayStats = (clientPhone, allLogs = []) => {
  return useMemo(() => {
    if (!clientPhone) return { exercises: 0, sets: 0, volume: 0, prs: 0 };

    const today = new Date().toLocaleDateString('en-US');
    const todayLogs = allLogs.filter(
      l => l.clientName === clientPhone &&
           l.completedAt?.toDate?.().toLocaleDateString('en-US') === today
    );

    return {
      exercises: todayLogs.length,
      sets: todayLogs.reduce((sum, l) => sum + (l.setsData?.length || 0), 0),
      volume: todayLogs.reduce((sum, l) => sum + (Number(l.volume) || 0), 0).toFixed(0),
      prs: todayLogs.filter(l => l.isPR).length,
      totalReps: todayLogs.reduce((sum, l) =>
        sum + (l.setsData?.reduce((s, d) => s + (parseFloat(d.reps) || 0), 0) || 0), 0
      )
    };
  }, [clientPhone, allLogs]);
};

/**
 * Hook لحساب الالتزام الأسبوعي
 * 
 * @param {string} clientPhone - رقم العميل
 * @param {Array} allLogs - جميع السجلات
 * @returns {Object} weekly adherence
 */
export const useWeeklyAdherence = (clientPhone, allLogs = []) => {
  return useMemo(() => {
    if (!clientPhone) {
      return {
        days: [0, 0, 0, 0, 0, 0, 0],
        average: 0,
        trend: 'stable'
      };
    }

    const now = new Date();
    const days = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);

      const dayStart = startOfDay(date);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const logsForDay = allLogs.filter(
        l => l.clientName === clientPhone &&
             dateFromLog(l) >= dayStart &&
             dateFromLog(l) < dayEnd
      );

      days.push(logsForDay.length > 0 ? 1 : 0);
    }

    const average = (days.reduce((a, b) => a + b, 0) / 7 * 100).toFixed(0);
    const trend = days.slice(-3).reduce((a, b) => a + b) >= 2 ? 'improving' : 'declining';

    return { days, average, trend };
  }, [clientPhone, allLogs]);
};

/**
 * Hook لحساب الأرقام القياسية (Personal Records)
 * 
 * @param {string} clientPhone - رقم العميل
 * @param {Array} allLogs - جميع السجلات
 * @returns {Object} PRs data
 */
export const usePRs = (clientPhone, allLogs = []) => {
  return useMemo(() => {
    if (!clientPhone) return { total: 0, recent: [], byExercise: {} };

    const clientPRs = allLogs.filter(
      l => l.clientName === clientPhone && l.isPR
    );

    const byExercise = {};
    clientPRs.forEach(pr => {
      const name = pr.exerciseName;
      byExercise[name] = (byExercise[name] || 0) + 1;
    });

    const recent = clientPRs
      .sort((a, b) => (b.completedAt?.toDate?.() || 0) - (a.completedAt?.toDate?.() || 0))
      .slice(0, 5);

    return {
      total: clientPRs.length,
      recent,
      byExercise,
      thisMonth: clientPRs.filter(pr => {
        const prDate = pr.completedAt?.toDate?.();
        if (!prDate) return false;
        const now = new Date();
        return prDate.getMonth() === now.getMonth() &&
               prDate.getFullYear() === now.getFullYear();
      }).length
    };
  }, [clientPhone, allLogs]);
};

export default useMetrics;
