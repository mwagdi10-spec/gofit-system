import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db, APP_ID } from '../services/firebase/config';

const homeExercises = [
  { name: 'Push-up', category: 'RESISTANCE', muscleGroup: 'Chest', equipment: 'Body Weight', isHome: true },
  { name: 'Incline Push-up', category: 'RESISTANCE', muscleGroup: 'Chest', equipment: 'Body Weight', isHome: true },
  { name: 'Decline Push-up', category: 'RESISTANCE', muscleGroup: 'Chest', equipment: 'Body Weight', isHome: true },
  { name: 'Diamond Push-up', category: 'RESISTANCE', muscleGroup: 'Chest', equipment: 'Body Weight', isHome: true },
  { name: 'Wide Push-up', category: 'RESISTANCE', muscleGroup: 'Chest', equipment: 'Body Weight', isHome: true },
  { name: 'Archer Push-up', category: 'RESISTANCE', muscleGroup: 'Chest', equipment: 'Body Weight', isHome: true },

  { name: 'Superman', category: 'RESISTANCE', muscleGroup: 'Back', equipment: 'Body Weight', isHome: true },
  { name: 'Towel Row', category: 'RESISTANCE', muscleGroup: 'Back', equipment: 'Home Equipment', isHome: true },
  { name: 'Resistance Band Row', category: 'RESISTANCE', muscleGroup: 'Back', equipment: 'Bands', isHome: true },
  { name: 'Reverse Snow Angel', category: 'RESISTANCE', muscleGroup: 'Back', equipment: 'Body Weight', isHome: true },
  { name: 'Doorway Row', category: 'RESISTANCE', muscleGroup: 'Back', equipment: 'Home Equipment', isHome: true },

  { name: 'Pike Push-up', category: 'RESISTANCE', muscleGroup: 'Shoulders', equipment: 'Body Weight', isHome: true },
  { name: 'Water Bottle Lateral Raise', category: 'RESISTANCE', muscleGroup: 'Shoulders', equipment: 'Home Equipment', isHome: true },
  { name: 'Handstand Hold', category: 'SKILL', muscleGroup: 'Shoulders', equipment: 'Body Weight', isHome: true },
  { name: 'Plank to Downward Dog', category: 'WARM-UP', muscleGroup: 'Shoulders', equipment: 'Body Weight', isHome: true },

  { name: 'Chair Dips', category: 'RESISTANCE', muscleGroup: 'Triceps', equipment: 'Body Weight', isHome: true },
  { name: 'Backpack Curl', category: 'RESISTANCE', muscleGroup: 'Biceps', equipment: 'Home Equipment', isHome: true },
  { name: 'Diamond Push-up Triceps', category: 'RESISTANCE', muscleGroup: 'Triceps', equipment: 'Body Weight', isHome: true },
  { name: 'Towel Bicep Curl', category: 'RESISTANCE', muscleGroup: 'Biceps', equipment: 'Home Equipment', isHome: true },

  { name: 'Plank', category: 'ACTIVATION', muscleGroup: 'Abs', equipment: 'Body Weight', isHome: true },
  { name: 'Bicycle Crunch', category: 'RESISTANCE', muscleGroup: 'Abs', equipment: 'Body Weight', isHome: true },
  { name: 'Mountain Climbers', category: 'CARDIO', muscleGroup: 'Abs', equipment: 'Body Weight', isHome: true },
  { name: 'Russian Twist', category: 'RESISTANCE', muscleGroup: 'Abs', equipment: 'Body Weight', isHome: true },
  { name: 'Dead Bug', category: 'ACTIVATION', muscleGroup: 'Abs', equipment: 'Body Weight', isHome: true },
  { name: 'Side Plank', category: 'ACTIVATION', muscleGroup: 'Abs', equipment: 'Body Weight', isHome: true },
  { name: 'Hollow Body Hold', category: 'ACTIVATION', muscleGroup: 'Abs', equipment: 'Body Weight', isHome: true },
  { name: 'Leg Raises', category: 'RESISTANCE', muscleGroup: 'Abs', equipment: 'Body Weight', isHome: true },

  { name: 'Bodyweight Squat', category: 'RESISTANCE', muscleGroup: 'Upper Legs', equipment: 'Body Weight', isHome: true },
  { name: 'Walking Lunge', category: 'RESISTANCE', muscleGroup: 'Upper Legs', equipment: 'Body Weight', isHome: true },
  { name: 'Glute Bridge', category: 'RESISTANCE', muscleGroup: 'Glutes', equipment: 'Body Weight', isHome: true },
  { name: 'Wall Sit', category: 'RESISTANCE', muscleGroup: 'Upper Legs', equipment: 'Body Weight', isHome: true },
  { name: 'Calf Raise', category: 'RESISTANCE', muscleGroup: 'Lower Legs', equipment: 'Body Weight', isHome: true },
  { name: 'Archer Squat', category: 'RESISTANCE', muscleGroup: 'Upper Legs', equipment: 'Body Weight', isHome: true },
  { name: 'Bulgarian Split Squat', category: 'RESISTANCE', muscleGroup: 'Upper Legs', equipment: 'Body Weight', isHome: true },
  { name: 'Single-leg Glute Bridge', category: 'RESISTANCE', muscleGroup: 'Glutes', equipment: 'Body Weight', isHome: true },
  { name: 'Jump Squat', category: 'RESISTANCE', muscleGroup: 'Upper Legs', equipment: 'Body Weight', isHome: true },
  { name: 'Curtsy Lunge', category: 'RESISTANCE', muscleGroup: 'Upper Legs', equipment: 'Body Weight', isHome: true },

  { name: 'Burpee', category: 'CARDIO', muscleGroup: 'Other', equipment: 'Body Weight', isHome: true },
  { name: 'Jumping Jacks', category: 'CARDIO', muscleGroup: 'Other', equipment: 'Body Weight', isHome: true },
  { name: 'Bear Crawl', category: 'CARDIO', muscleGroup: 'Other', equipment: 'Body Weight', isHome: true },
  { name: 'Squat to Push-up', category: 'CARDIO', muscleGroup: 'Other', equipment: 'Body Weight', isHome: true },

  { name: 'High Knees', category: 'CARDIO', muscleGroup: 'Lower Legs', equipment: 'Body Weight', isHome: true },
  { name: 'Butt Kicks', category: 'CARDIO', muscleGroup: 'Lower Legs', equipment: 'Body Weight', isHome: true },
  { name: 'Star Jumps', category: 'CARDIO', muscleGroup: 'Other', equipment: 'Body Weight', isHome: true },
  { name: 'Skater Jumps', category: 'CARDIO', muscleGroup: 'Upper Legs', equipment: 'Body Weight', isHome: true },
  { name: 'Stair Climbing', category: 'CARDIO', muscleGroup: 'Lower Legs', equipment: 'Body Weight', isHome: true },

  { name: 'Cat-Cow Stretch', category: 'COOL-DOWN', muscleGroup: 'Back', equipment: 'Body Weight', isHome: true },
  { name: "World's Greatest Stretch", category: 'WARM-UP', muscleGroup: 'Other', equipment: 'Body Weight', isHome: true },
  { name: 'Hip Circles', category: 'WARM-UP', muscleGroup: 'Upper Legs', equipment: 'Body Weight', isHome: true },
  { name: 'Shoulder Dislocates', category: 'WARM-UP', muscleGroup: 'Shoulders', equipment: 'Home Equipment', isHome: true },
  { name: 'Standing Quad Stretch', category: 'COOL-DOWN', muscleGroup: 'Upper Legs', equipment: 'Body Weight', isHome: true },
];

export async function seedHomeExercises() {
  const libraryRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'library');
  const librarySnap = await getDocs(libraryRef);
  const existingNames = new Set(librarySnap.docs.map((d) => (d.data().name || '').trim().toLowerCase()));

  const results = [];
  for (const ex of homeExercises) {
    const key = ex.name.trim().toLowerCase();
    if (existingNames.has(key)) {
      results.push({ name: ex.name, skipped: true });
      continue;
    }
    try {
      const ref = await addDoc(libraryRef, ex);
      existingNames.add(key);
      results.push({ name: ex.name, id: ref.id, ok: true });
    } catch (e) {
      results.push({ name: ex.name, error: e.message, ok: false });
    }
  }
  console.table(results);
  return results;
}
