// ─── NASM OPT Engine ────────────────────────────────────────────────────────
// حسابات وعمليات NASM OPT الأساسية

import { NASM_OPT_PHASES, PHASE_PROGRESSION } from '../constants/nasm';

// ─── Get Phase Info ──────────────────────────────────────────────────────────
export const getPhaseInfo = (phaseNumber) => {
  return NASM_OPT_PHASES[phaseNumber] || NASM_OPT_PHASES[1];
};

export const getAllPhases = () => {
  return Object.values(NASM_OPT_PHASES);
};

// ─── Get Phase Progression ───────────────────────────────────────────────────
export const getPhaseProgression = (level = 'Beginner') => {
  return PHASE_PROGRESSION[level] || PHASE_PROGRESSION.Beginner;
};

export const getNextPhase = (currentPhase, level = 'Beginner') => {
  const progression = getPhaseProgression(level);
  const currentIndex = progression.indexOf(currentPhase);
  
  if (currentIndex === -1) return progression[0];
  
  const nextIndex = (currentIndex + 1) % progression.length;
  return progression[nextIndex];
};

export const getPreviousPhase = (currentPhase, level = 'Beginner') => {
  const progression = getPhaseProgression(level);
  const currentIndex = progression.indexOf(currentPhase);
  
  if (currentIndex === -1) return progression[0];
  
  const prevIndex = currentIndex === 0 ? progression.length - 1 : currentIndex - 1;
  return progression[prevIndex];
};

// ─── Recommended Starting Phase ──────────────────────────────────────────────
export const recommendStartingPhase = (level = 'Beginner') => {
  const phaseMap = {
    'Beginner': 1,
    'Intermediate': 2,
    'Advanced': 3
  };
  
  return phaseMap[level] || 1;
};

// ─── Phase Characteristics ───────────────────────────────────────────────────
export const getPhaseCharacteristics = (phaseNumber) => {
  const phase = getPhaseInfo(phaseNumber);
  
  return {
    phaseNumber,
    name: phase.phase,
    level: phase.level,
    description: phase.description,
    duration: phase.duration,
    repRange: phase.reps,
    intensityRange: phase.intensity,
    restPeriod: phase.rest,
    focus: phase.focus,
    primaryGoal: getPrimaryGoal(phaseNumber)
  };
};

// ─── Primary Goal ───────────────────────────────────────────────────────────
export const getPrimaryGoal = (phaseNumber) => {
  const goals = {
    1: 'Stability & Control',
    2: 'Muscular Endurance',
    3: 'Muscle Growth',
    4: 'Maximum Strength',
    5: 'Explosive Power'
  };
  
  return goals[phaseNumber] || 'General Fitness';
};

// ─── Rep Range to Number ────────────────────────────────────────────────────
export const parseRepRange = (repRange = '') => {
  const match = repRange.match(/(\d+)-?(\d+)?/);
  
  if (!match) return { min: 1, max: 10, average: 5.5 };
  
  const min = parseInt(match[1], 10);
  const max = parseInt(match[2], 10) || min;
  const average = (min + max) / 2;
  
  return { min, max, average };
};

// ─── Intensity Range to Percentage ───────────────────────────────────────────
export const parseIntensityRange = (intensityRange = '') => {
  const match = intensityRange.match(/(\d+)-?(\d+)?/);
  
  if (!match) return { min: 50, max: 70, average: 60 };
  
  const min = parseInt(match[1], 10);
  const max = parseInt(match[2], 10) || min;
  const average = (min + max) / 2;
  
  return { min, max, average };
};

// ─── Rest Period to Seconds ─────────────────────────────────────────────────
export const parseRestPeriod = (restPeriod = '') => {
  const match = restPeriod.match(/(\d+)-?(\d+)?/);
  
  if (!match) return { min: 60, max: 90, average: 75 };
  
  const min = parseInt(match[1], 10);
  const max = parseInt(match[2], 10) || min;
  const average = (min + max) / 2;
  
  return { min, max, average, formatted: restPeriod };
};

// ─── Determine Appropriate Phase ─────────────────────────────────────────────
export const determineAppropriatePhase = (clientData) => {
  const {
    level = 'Beginner',
    goal = 'General',
    injuries = '',
    ageGroup = 'Adult'
  } = clientData;

  // Base recommendation from level
  let phase = recommendStartingPhase(level);

  // Adjust based on goals
  if (goal.toLowerCase().includes('strength')) {
    phase = Math.max(phase, 4);
  } else if (goal.toLowerCase().includes('muscle')) {
    phase = Math.max(phase, 3);
  } else if (goal.toLowerCase().includes('endurance')) {
    phase = Math.max(phase, 2);
  }

  // Downgrade if injured
  if (injuries && injuries.trim()) {
    phase = Math.min(phase, 1);
  }

  // Adjust for age
  if (ageGroup === 'Senior' || ageGroup === '60+') {
    phase = Math.min(phase, 2);
  }

  return phase;
};

// ─── Phase Transition Logic ─────────────────────────────────────────────────
export const shouldTransitionPhase = (clientMetrics, currentPhase) => {
  if (!clientMetrics) return false;

  const { adherence, avgRpe, completed } = clientMetrics;

  // Need at least 3 sessions to transition
  if (completed < 3) return false;

  // Good adherence (>70%) and moderate RPE (6-8)
  const goodAdherence = adherence >= 70;
  const appropriateRpe = avgRpe >= 6 && avgRpe <= 8;

  return goodAdherence && appropriateRpe;
};

// ─── Get Recommended Sets/Reps ──────────────────────────────────────────────
export const getRecommendedSetsReps = (phaseNumber, exerciseType = 'compound') => {
  const phase = getPhaseInfo(phaseNumber);
  const repRange = parseRepRange(phase.reps);

  // Adjust sets based on phase
  const setsMap = {
    1: exerciseType === 'compound' ? 3 : 2,
    2: exerciseType === 'compound' ? 4 : 3,
    3: exerciseType === 'compound' ? 4 : 3,
    4: exerciseType === 'compound' ? 5 : 3,
    5: exerciseType === 'compound' ? 4 : 3
  };

  return {
    phase: phaseNumber,
    sets: setsMap[phaseNumber] || 3,
    reps: `${repRange.min}-${repRange.max}`,
    repRange,
    intensity: phase.intensity,
    rest: phase.rest,
    tempo: getPhaseSpecificTempo(phaseNumber)
  };
};

// ─── Phase-specific Tempo ────────────────────────────────────────────────────
export const getPhaseSpecificTempo = (phaseNumber) => {
  const tempoMap = {
    1: '2-0-2-0',    // Slow and controlled
    2: '2-0-2-0',    // Controlled
    3: '2-1-2-0',    // Time under tension
    4: '3-1-1-0',    // Explosive concentric
    5: 'Explosive'   // Fast and explosive
  };

  return tempoMap[phaseNumber] || '2-0-2-0';
};

// ─── Calculate Volume ────────────────────────────────────────────────────────
export const calculateVolume = (sets, reps, weight) => {
  const repCount = typeof reps === 'string' 
    ? parseRepRange(reps).average 
    : reps;
  
  return sets * repCount * weight;
};

// ─── Estimate One Rep Max ───────────────────────────────────────────────────
export const estimateOneRepMax = (weight, reps) => {
  // Epley formula: 1RM = weight × (1 + (reps / 30))
  if (reps === 1) return weight;
  
  return weight * (1 + (reps / 30));
};

// ─── Phase Duration ──────────────────────────────────────────────────────────
export const getPhaseDuration = (phaseNumber) => {
  const phase = getPhaseInfo(phaseNumber);
  const match = phase.duration.match(/(\d+)/);
  
  return {
    weeks: parseInt(match?.[1] || 4, 10),
    duration: phase.duration
  };
};

// ─── Get Phase Color ────────────────────────────────────────────────────────
export const getPhaseColor = (phaseNumber) => {
  const colorMap = {
    1: '#10b981',  // Emerald
    2: '#3b82f6',  // Blue
    3: '#f59e0b',  // Amber
    4: '#ef4444',  // Red
    5: '#8b5cf6'   // Purple
  };
  
  return colorMap[phaseNumber] || '#64748b';
};

// ─── Export all functions ───────────────────────────────────────────────────
export const nasmEngine = {
  getPhaseInfo,
  getAllPhases,
  getPhaseProgression,
  getNextPhase,
  getPreviousPhase,
  recommendStartingPhase,
  getPhaseCharacteristics,
  getPrimaryGoal,
  parseRepRange,
  parseIntensityRange,
  parseRestPeriod,
  determineAppropriatePhase,
  shouldTransitionPhase,
  getRecommendedSetsReps,
  getPhaseSpecificTempo,
  calculateVolume,
  estimateOneRepMax,
  getPhaseDuration,
  getPhaseColor
};

export default nasmEngine;
