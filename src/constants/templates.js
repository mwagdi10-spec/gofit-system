export const WORKOUT_TEMPLATES = {

  'Push/Pull/Legs': [

    { day:'Day 1 - Push', name:'Bench Press', category:'RESISTANCE', sets:'4', reps:'6-10', tempo:'2-0-2', coachNote:'Push strength focus' },
    { day:'Day 1 - Push', name:'Incline Dumbbell Press', category:'RESISTANCE', sets:'3', reps:'8-12', tempo:'2-0-2', coachNote:'' },
    { day:'Day 1 - Push', name:'Shoulder Press', category:'RESISTANCE', sets:'3', reps:'8-10', tempo:'2-0-2', coachNote:'' },
    { day:'Day 1 - Push', name:'Triceps Pushdown', category:'RESISTANCE', sets:'3', reps:'10-15', tempo:'2-1-2', coachNote:'' },
    { day:'Day 2 - Pull', name:'Lat Pulldown', category:'RESISTANCE', sets:'4', reps:'8-12', tempo:'2-1-2', coachNote:'Control the eccentric' },
    { day:'Day 2 - Pull', name:'Seated Cable Row', category:'RESISTANCE', sets:'3', reps:'8-12', tempo:'2-1-2', coachNote:'' },
    { day:'Day 2 - Pull', name:'Face Pull', category:'RESISTANCE', sets:'3', reps:'12-15', tempo:'2-1-2', coachNote:'' },
    { day:'Day 2 - Pull', name:'Dumbbell Curl', category:'RESISTANCE', sets:'3', reps:'10-12', tempo:'2-1-2', coachNote:'' },
    { day:'Day 3 - Legs', name:'Squat', category:'RESISTANCE', sets:'4', reps:'6-10', tempo:'3-1-1', coachNote:'Keep stable depth' },
    { day:'Day 3 - Legs', name:'Romanian Deadlift', category:'RESISTANCE', sets:'3', reps:'8-10', tempo:'3-1-1', coachNote:'' },
    { day:'Day 3 - Legs', name:'Leg Press', category:'RESISTANCE', sets:'3', reps:'10-12', tempo:'2-1-2', coachNote:'' },
    { day:'Day 3 - Legs', name:'Plank', category:'RESISTANCE', sets:'3', reps:'30-45s', tempo:'', coachNote:'' },
  ],

  'Fat Loss': [
    { day:'Day 1 - Full Body', name:'Goblet Squat', category:'RESISTANCE', sets:'3', reps:'12-15', tempo:'2-0-2', coachNote:'Short rests' },
    { day:'Day 1 - Full Body', name:'Push-up', category:'RESISTANCE', sets:'3', reps:'AMRAP', tempo:'2-0-2', coachNote:'' },
    { day:'Day 1 - Full Body', name:'Dumbbell Row', category:'RESISTANCE', sets:'3', reps:'12/side', tempo:'2-1-2', coachNote:'' },
    { day:'Day 1 - Full Body', name:'Bike Intervals', category:'CARDIO', sets:'8', reps:'30s hard / 60s easy', tempo:'', coachNote:'RPE 7-8' },
    { day:'Day 2 - Conditioning', name:'Walking Lunge', category:'RESISTANCE', sets:'3', reps:'12/side', tempo:'2-0-2', coachNote:'' },
    { day:'Day 2 - Conditioning', name:'Cable Row', category:'RESISTANCE', sets:'3', reps:'12-15', tempo:'2-1-2', coachNote:'' },
    { day:'Day 2 - Conditioning', name:'Mountain Climber', category:'CARDIO', sets:'4', reps:'30s', tempo:'', coachNote:'' },
  ],

  Strength: [
    { day:'Day 1 - Upper Strength', name:'Bench Press', category:'RESISTANCE', sets:'5', reps:'3-5', tempo:'2-0-1', coachNote:'Rest 2-3 min' },
    { day:'Day 1 - Upper Strength', name:'Barbell Row', category:'RESISTANCE', sets:'5', reps:'4-6', tempo:'2-1-1', coachNote:'' },
    { day:'Day 1 - Upper Strength', name:'Overhead Press', category:'RESISTANCE', sets:'4', reps:'4-6', tempo:'2-0-1', coachNote:'' },
    { day:'Day 2 - Lower Strength', name:'Squat', category:'RESISTANCE', sets:'5', reps:'3-5', tempo:'3-1-1', coachNote:'Stop before form breakdown' },
    { day:'Day 2 - Lower Strength', name:'Deadlift', category:'RESISTANCE', sets:'4', reps:'3-5', tempo:'2-0-1', coachNote:'' },
    { day:'Day 2 - Lower Strength', name:'Split Squat', category:'RESISTANCE', sets:'3', reps:'6-8/side', tempo:'2-1-1', coachNote:'' },
  ],
  Rehab: [
    { day:'Day 1 - Control', name:'Dead Bug', category:'ACTIVATION', sets:'3', reps:'8/side', tempo:'slow', coachNote:'Pain-free range' },
    { day:'Day 1 - Control', name:'Glute Bridge', category:'ACTIVATION', sets:'3', reps:'12', tempo:'2-2-2', coachNote:'' },
    { day:'Day 1 - Control', name:'Bodyweight Squat', category:'RESISTANCE', sets:'3', reps:'10-12', tempo:'3-1-2', coachNote:'Control before load' },
    { day:'Day 1 - Control', name:'Cable Row', category:'RESISTANCE', sets:'3', reps:'12', tempo:'2-1-2', coachNote:'' },
    { day:'Day 2 - Mobility', name:'Bird Dog', category:'ACTIVATION', sets:'3', reps:'8/side', tempo:'slow', coachNote:'' },
    { day:'Day 2 - Mobility', name:'Step Up', category:'RESISTANCE', sets:'3', reps:'8/side', tempo:'2-1-2', coachNote:'' },
  ],
};

export const TEMPLATE_MAX_EXERCISES = 12;
export const TEMPLATE_SPLIT_TARGETS = {
  'Day 1 - Push': ['Chest', 'Shoulders', 'Triceps', 'Chest'],
  'Day 2 - Pull': ['Back', 'Back', 'Shoulders', 'Biceps'],
  'Day 3 - Legs': ['Upper Legs', 'Upper Legs', 'Glutes', 'Lower Legs', 'Abs'],
  'Day 1 - Full Body': ['Upper Legs', 'Chest', 'Back', 'Upper Legs', 'Abs', 'Cardio'],
  'Day 2 - Conditioning': ['Cardio', 'Upper Legs', 'Back', 'Other', 'Abs', 'Glutes'],
  'Day 1 - Upper Strength': ['Chest', 'Back', 'Shoulders', 'Biceps', 'Chest', 'Back'],
  'Day 2 - Lower Strength': ['Upper Legs', 'Upper Legs', 'Glutes', 'Lower Legs', 'Abs', 'Upper Legs'],
  'Day 1 - Control': ['Abs', 'Glutes', 'Upper Legs', 'Back', 'Other', 'Upper Legs'],
  'Day 2 - Mobility': ['Other', 'Abs', 'Glutes', 'Upper Legs', 'Back', 'Cardio'],
};

export const TEMPLATE_FALLBACK_EXERCISES = {
  Chest: ['Chest Press', 'Incline Dumbbell Press', 'Cable Fly'],
  Back: ['Lat Pulldown', 'Seated Cable Row', 'Single-arm Dumbbell Row'],
  'Upper Legs': ['Leg Press', 'Goblet Squat', 'Walking Lunge', 'Romanian Deadlift', 'Hamstring Curl'],
  'Lower Legs': ['Standing Calf Raise', 'Seated Calf Raise'],
  Glutes: ['Hip Thrust', 'Glute Bridge', 'Cable Kickback'],
  Shoulders: ['Shoulder Press', 'Lateral Raise', 'Face Pull'],
  Biceps: ['Dumbbell Curl', 'Barbell Curl', 'Hammer Curl'],
  Triceps: ['Triceps Pushdown', 'Overhead Triceps Extension', 'Skull Crusher'],
  Forearms: ['Wrist Curl', 'Reverse Curl'],
  Abs: ['Plank', 'Dead Bug', 'Cable Crunch'],
  Cardio: ['Treadmill', 'Stationary Bike', 'Elliptical'],
  Other: ['Farmer Carry', 'Kettlebell Deadlift', 'Step Up', 'Mobility Flow', 'Bodyweight Variation'],
};
