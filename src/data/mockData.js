export const USER = {
  name:           'Mohamed',
  currentPhase:   'Hypertrophy Phase',
  weeklyProgress: 3,
  weeklyGoal:     4,
  nextWorkout:    'Push Day – Chest & Triceps',
  age:            28,
  weight:         85,
  height:         178,
  goal:           'Muscle Gain',
};

export const WORKOUTS = {
  Push: [
    { id: 'p1', name: 'Bench Press',       muscle: 'Chest',       sets: 4, reps: 8  },
    { id: 'p2', name: 'Incline DB Press',  muscle: 'Upper Chest', sets: 3, reps: 10 },
    { id: 'p3', name: 'Lateral Raises',    muscle: 'Shoulders',   sets: 3, reps: 12 },
    { id: 'p4', name: 'Tricep Pushdown',   muscle: 'Triceps',     sets: 3, reps: 12 },
  ],
  Pull: [
    { id: 'l1', name: 'Pull-ups',          muscle: 'Back',        sets: 4, reps: 8  },
    { id: 'l2', name: 'Barbell Row',       muscle: 'Back',        sets: 4, reps: 8  },
    { id: 'l3', name: 'Face Pulls',        muscle: 'Rear Delt',   sets: 3, reps: 15 },
    { id: 'l4', name: 'Bicep Curls',       muscle: 'Biceps',      sets: 3, reps: 12 },
  ],
  Legs: [
    { id: 'g1', name: 'Squat',             muscle: 'Quads',       sets: 4, reps: 8  },
    { id: 'g2', name: 'Romanian Deadlift', muscle: 'Hamstrings',  sets: 3, reps: 10 },
    { id: 'g3', name: 'Leg Press',         muscle: 'Quads',       sets: 3, reps: 12 },
    { id: 'g4', name: 'Calf Raises',       muscle: 'Calves',      sets: 4, reps: 15 },
  ],
  Upper: [
    { id: 'u1', name: 'OHP',               muscle: 'Shoulders',   sets: 4, reps: 8  },
    { id: 'u2', name: 'Chest Dips',        muscle: 'Chest',       sets: 3, reps: 10 },
    { id: 'u3', name: 'Cable Row',         muscle: 'Back',        sets: 3, reps: 12 },
    { id: 'u4', name: 'Hammer Curls',      muscle: 'Biceps',      sets: 3, reps: 12 },
  ],
};

export const PLAN = [
  {
    week_id: 1, title: 'Week 1',
    days: [
      { id: '1-1', title: 'Day 1', type: 'Push',  isCompleted: true,  isActive: false },
      { id: '1-2', title: 'Day 2', type: 'Pull',  isCompleted: true,  isActive: false },
      { id: '1-3', title: 'Day 3', type: 'Legs',  isCompleted: true,  isActive: false },
      { id: '1-4', title: 'Day 4', type: 'Push',  isCompleted: false, isActive: true  },
    ],
  },
  {
    week_id: 2, title: 'Week 2',
    days: [
      { id: '2-1', title: 'Day 1', type: 'Pull',  isCompleted: false, isActive: false },
      { id: '2-2', title: 'Day 2', type: 'Legs',  isCompleted: false, isActive: false },
      { id: '2-3', title: 'Day 3', type: 'Push',  isCompleted: false, isActive: false },
      { id: '2-4', title: 'Day 4', type: 'Upper', isCompleted: false, isActive: false },
    ],
  },
  {
    week_id: 3, title: 'Week 3',
    days: [
      { id: '3-1', title: 'Day 1', type: 'Push',  isCompleted: false, isActive: false },
      { id: '3-2', title: 'Day 2', type: 'Pull',  isCompleted: false, isActive: false },
      { id: '3-3', title: 'Day 3', type: 'Legs',  isCompleted: false, isActive: false },
      { id: '3-4', title: 'Day 4', type: 'Upper', isCompleted: false, isActive: false },
    ],
  },
  {
    week_id: 4, title: 'Week 4',
    days: [
      { id: '4-1', title: 'Day 1', type: 'Pull',  isCompleted: false, isActive: false },
      { id: '4-2', title: 'Day 2', type: 'Legs',  isCompleted: false, isActive: false },
      { id: '4-3', title: 'Day 3', type: 'Push',  isCompleted: false, isActive: false },
      { id: '4-4', title: 'Day 4', type: 'Upper', isCompleted: false, isActive: false },
    ],
  },
];

// Issue 5: monthlyData per muscle for expandable charts
export const MUSCLE_PROGRESS = [
  { name: 'Chest',      start_weight: 60, current_weight: 75,  exercise_type: 'Bench', monthlyData: [{ week:'W1',load:60 },{ week:'W2',load:65 },{ week:'W3',load:70 },{ week:'W4',load:75 }] },
  { name: 'Back',       start_weight: 50, current_weight: 70,  exercise_type: 'Row',   monthlyData: [{ week:'W1',load:50 },{ week:'W2',load:57 },{ week:'W3',load:64 },{ week:'W4',load:70 }] },
  { name: 'Quads',      start_weight: 80, current_weight: 100, exercise_type: 'Squat', monthlyData: [{ week:'W1',load:80 },{ week:'W2',load:87 },{ week:'W3',load:93 },{ week:'W4',load:100 }] },
  { name: 'Hamstrings', start_weight: 60, current_weight: 72,  exercise_type: 'RDL',   monthlyData: [{ week:'W1',load:60 },{ week:'W2',load:64 },{ week:'W3',load:68 },{ week:'W4',load:72 }] },
  { name: 'Arms',       start_weight: 30, current_weight: 40,  exercise_type: 'Curl',  monthlyData: [{ week:'W1',load:30 },{ week:'W2',load:33 },{ week:'W3',load:37 },{ week:'W4',load:40 }] },
];

export const WEEKLY_LOAD = [
  { week: 'W1', load: 6500 },
  { week: 'W2', load: 7200 },
  { week: 'W3', load: 7800 },
  { week: 'W4', load: 8400 },
];

// Issue 1 & 6: gifUrl + alternatives per exercise
export const SESSION_PHASES = {
  Push: [
    {
      id: 'warmup', title: 'WARM-UP', isExpanded: true,
      exercises: [
        {
          id: 'wu1', name: 'Treadmill Walk', category: 'WARM-UP',
          tempo: '', targetSets: 1, targetReps: 5, unit: 'min',
          loggedWeight: null, loggedReps: 5, status: 'pending',
          gifUrl: 'https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif',
          alternatives: [],
        },
      ],
    },
    {
      id: 'activation', title: 'ACTIVATION', isExpanded: false,
      exercises: [
        {
          id: 'ac1', name: 'Band Pull Apart', category: 'ACTIVATION',
          tempo: '2-1-2-1', targetSets: 1, targetReps: 15, unit: 'reps',
          loggedWeight: null, loggedReps: 15, status: 'pending',
          overloadMessage: 'Progressive overload: Log 2 sessions to unlock overload guidance.',
          gifUrl: 'https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif',
          alternatives: [
            { id: 'alt-ac1a', name: 'Face Pull', gifUrl: 'https://media.giphy.com/media/xT9IgG50Lg7russbDa/giphy.gif', tempo: '2-1-2-1', targetSets: 1, targetReps: 15, unit: 'reps' },
          ],
        },
        {
          id: 'ac2', name: 'Shoulder Circles', category: 'ACTIVATION',
          tempo: '', targetSets: 1, targetReps: 10, unit: 'reps',
          loggedWeight: null, loggedReps: 10, status: 'pending',
          overloadMessage: 'Progressive overload: Log 2 sessions to unlock overload guidance.',
          gifUrl: 'https://media.giphy.com/media/xT9IgG50Lg7russbDa/giphy.gif',
          alternatives: [],
        },
      ],
    },
    {
      id: 'resistance', title: 'RESISTANCE', isExpanded: false,
      exercises: [
        {
          id: 'r1', name: 'Bench Press', category: 'RESISTANCE',
          tempo: '3-1-2-0', targetSets: 4, targetReps: 8, unit: 'kg',
          loggedWeight: null, loggedReps: 8, status: 'pending',
          overloadMessage: 'Progressive overload: Log 2 sessions to unlock overload guidance.',
          gifUrl: 'https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif',
          alternatives: [
            { id: 'alt-r1a', name: 'DB Chest Press', gifUrl: 'https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif', tempo: '3-1-2-0', targetSets: 4, targetReps: 8, unit: 'kg' },
            { id: 'alt-r1b', name: 'Push-up',        gifUrl: 'https://media.giphy.com/media/xT9IgG50Lg7russbDa/giphy.gif', tempo: '2-1-2-0', targetSets: 4, targetReps: 12, unit: 'reps' },
          ],
        },
        {
          id: 'r2', name: 'Incline DB Press', category: 'RESISTANCE',
          tempo: '3-1-2-0', targetSets: 3, targetReps: 10, unit: 'kg',
          loggedWeight: null, loggedReps: 10, status: 'pending',
          overloadMessage: 'Progressive overload: Log 2 sessions to unlock overload guidance.',
          gifUrl: 'https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif',
          alternatives: [
            { id: 'alt-r2a', name: 'Cable Fly', gifUrl: 'https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif', tempo: '2-0-2-1', targetSets: 3, targetReps: 12, unit: 'kg' },
          ],
        },
        {
          id: 'r3', name: 'Lateral Raises', category: 'RESISTANCE',
          tempo: '2-0-2-1', targetSets: 3, targetReps: 12, unit: 'kg',
          loggedWeight: null, loggedReps: 12, status: 'pending',
          overloadMessage: 'Progressive overload: Log 2 sessions to unlock overload guidance.',
          gifUrl: 'https://media.giphy.com/media/xT9IgG50Lg7russbDa/giphy.gif',
          alternatives: [],
        },
        {
          id: 'r4', name: 'Tricep Pushdown', category: 'RESISTANCE',
          tempo: '2-1-2-0', targetSets: 3, targetReps: 12, unit: 'kg',
          loggedWeight: null, loggedReps: 12, status: 'pending',
          overloadMessage: 'Progressive overload: Log 2 sessions to unlock overload guidance.',
          gifUrl: 'https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif',
          alternatives: [
            { id: 'alt-r4a', name: 'Overhead Tricep Ext.', gifUrl: 'https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif', tempo: '2-1-2-0', targetSets: 3, targetReps: 12, unit: 'kg' },
          ],
        },
      ],
    },
    {
      id: 'cardio', title: 'CARDIO', isExpanded: false,
      exercises: [
        {
          id: 'c1', name: 'Jump Rope', category: 'CARDIO',
          tempo: '', targetSets: 3, targetReps: 2, unit: 'min',
          loggedWeight: null, loggedReps: 2, status: 'pending',
          gifUrl: 'https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif',
          alternatives: [],
        },
      ],
    },
    {
      id: 'stretches', title: 'STATIC STRETCHES', isExpanded: false,
      exercises: [
        {
          id: 's1', name: 'Chest Doorway Stretch', category: 'STATIC STRETCHES',
          tempo: '', targetSets: 1, targetReps: 30, unit: 'sec',
          loggedWeight: null, loggedReps: 30, status: 'pending',
          gifUrl: 'https://media.giphy.com/media/xT9IgG50Lg7russbDa/giphy.gif',
          alternatives: [],
        },
        {
          id: 's2', name: 'Tricep Overhead Stretch', category: 'STATIC STRETCHES',
          tempo: '', targetSets: 1, targetReps: 30, unit: 'sec',
          loggedWeight: null, loggedReps: 30, status: 'pending',
          gifUrl: 'https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif',
          alternatives: [],
        },
      ],
    },
  ],
};
