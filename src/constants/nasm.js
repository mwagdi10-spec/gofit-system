export const NASM_OPT_PHASES = {

  1: {

    phase: "Stabilization Endurance",

    level: "Phase 1",

    description: "Foundation & Stability",

    duration: "4 weeks",

    reps: "12-20",

    intensity: "50-70%",

    rest: "0-90 seconds",

    focus: "Core stability & control",

    order: 1

  },

  2: {

    phase: "Strength Endurance",

    level: "Phase 2",

    description: "Build Muscular Endurance",

    duration: "4-6 weeks",

    reps: "8-12",

    intensity: "70-80%",

    rest: "60-90 seconds",

    focus: "Building muscular endurance",

    order: 2

  },

  3: {

    phase: "Muscle Development",

    level: "Phase 3",

    description: "Muscle Growth & Hypertrophy",

    duration: "6 weeks",

    reps: "6-12",

    intensity: "75-85%",

    rest: "60-90 seconds",

    focus: "Muscle size development",

    order: 3

  },

  4: {

    phase: "Strength",

    level: "Phase 4",

    description: "Maximum Strength",

    duration: "4-6 weeks",

    reps: "1-6",

    intensity: "85-100%",

    rest: "2-3 minutes",

    focus: "Maximum strength",

    order: 4

  },

  5: {

    phase: "Power",

    level: "Phase 5",

    description: "Explosive Power",

    duration: "3-6 weeks",

    reps: "3-5",

    intensity: "75-90%",

    rest: "2-3 minutes",

    focus: "Explosive power & athletic performance",

    order: 5

  }

};



export const PHASE_PROGRESSION = {

  Beginner: [1, 2, 3, 4, 5],

  Intermediate: [2, 3, 4, 5, 1],

  Advanced: [3, 4, 5, 1, 2]

};



export const PHASE_COLORS = {

  1: '#10b981',

  2: '#3b82f6',

  3: '#f59e0b',

  4: '#ef4444',

  5: '#8b5cf6'

};
