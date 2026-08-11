import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, APP_ID } from '../services/firebase/config';

// subCategory: تصنيف HIIT (Lower Body / Upper Body / Full Body / Core / Cardio-Based / Combat-Style / Equipment-Based / Agility)
// lateralJump بيحدد لو فيه قفز جانبي
const HIIT_EXERCISES = [
  // Lower Body
  { name: 'Mountain Climbers', subCategory: 'Full Body', muscleGroup: 'Other', equipment: 'Body Weight', lateralJump: false },
  { name: 'Squat to Stand', subCategory: 'Lower Body', muscleGroup: 'Upper Legs', equipment: 'Body Weight', lateralJump: false },
  { name: 'Squat Pulses', subCategory: 'Lower Body', muscleGroup: 'Upper Legs', equipment: 'Body Weight', lateralJump: false },
  { name: 'Lateral Skater Jumps', subCategory: 'Lower Body', muscleGroup: 'Upper Legs', equipment: 'Body Weight', lateralJump: true },
  { name: 'Ski Jumps', subCategory: 'Lower Body', muscleGroup: 'Upper Legs', equipment: 'Body Weight', lateralJump: true },
  { name: 'Lateral Bounds', subCategory: 'Lower Body', muscleGroup: 'Upper Legs', equipment: 'Body Weight', lateralJump: true },
  { name: 'Squat Jump + Lateral Shuffle', subCategory: 'Lower Body', muscleGroup: 'Upper Legs', equipment: 'Body Weight', lateralJump: true },
  { name: 'Lateral Box Jumps', subCategory: 'Lower Body', muscleGroup: 'Upper Legs', equipment: 'Body Weight', lateralJump: true },
  { name: 'Side-to-Side Jump Lunges', subCategory: 'Lower Body', muscleGroup: 'Upper Legs', equipment: 'Body Weight', lateralJump: true },
  { name: 'Plyo Lateral Hops', subCategory: 'Lower Body', muscleGroup: 'Upper Legs', equipment: 'Body Weight', lateralJump: true },
  { name: 'Squat Jumps', subCategory: 'Lower Body', muscleGroup: 'Upper Legs', equipment: 'Body Weight', lateralJump: false },
  { name: 'Jump Lunges', subCategory: 'Lower Body', muscleGroup: 'Upper Legs', equipment: 'Body Weight', lateralJump: false },
  { name: 'Split Squat Jumps', subCategory: 'Lower Body', muscleGroup: 'Upper Legs', equipment: 'Body Weight', lateralJump: false },
  { name: 'Broad Jumps', subCategory: 'Lower Body', muscleGroup: 'Upper Legs', equipment: 'Body Weight', lateralJump: false },
  { name: 'Box Jumps', subCategory: 'Lower Body', muscleGroup: 'Upper Legs', equipment: 'Body Weight', lateralJump: false },
  { name: 'Skater Jumps', subCategory: 'Lower Body', muscleGroup: 'Upper Legs', equipment: 'Body Weight', lateralJump: true },
  { name: 'Squat Thrusts', subCategory: 'Lower Body', muscleGroup: 'Upper Legs', equipment: 'Body Weight', lateralJump: false },
  { name: 'Wall Sit Pulses', subCategory: 'Lower Body', muscleGroup: 'Upper Legs', equipment: 'Body Weight', lateralJump: false },

  // Upper Body
  { name: 'Push-up to Plank', subCategory: 'Upper Body', muscleGroup: 'Chest', equipment: 'Body Weight', lateralJump: false },
  { name: 'Push-up to Shoulder Tap', subCategory: 'Upper Body', muscleGroup: 'Chest', equipment: 'Body Weight', lateralJump: false },
  { name: 'Plyo Push-ups', subCategory: 'Upper Body', muscleGroup: 'Chest', equipment: 'Body Weight', lateralJump: false },
  { name: 'Renegade Rows', subCategory: 'Upper Body', muscleGroup: 'Back', equipment: 'Dumbbell', lateralJump: false },
  { name: 'Battle Ropes', subCategory: 'Upper Body', muscleGroup: 'Shoulders', equipment: 'Battle Ropes', lateralJump: false },
  { name: 'Medicine Ball Slams', subCategory: 'Upper Body', muscleGroup: 'Abs', equipment: 'Medicine Ball', lateralJump: false },

  // Full Body
  { name: 'Burpees (no lateral jump)', subCategory: 'Full Body', muscleGroup: 'Other', equipment: 'Body Weight', lateralJump: false },
  { name: 'Burpee Box Jump', subCategory: 'Full Body', muscleGroup: 'Other', equipment: 'Body Weight', lateralJump: false },
  { name: 'Man Makers', subCategory: 'Full Body', muscleGroup: 'Other', equipment: 'Dumbbell', lateralJump: false },
  { name: 'Thrusters', subCategory: 'Full Body', muscleGroup: 'Other', equipment: 'Dumbbell', lateralJump: false },
  { name: 'Bear Crawls', subCategory: 'Full Body', muscleGroup: 'Other', equipment: 'Body Weight', lateralJump: false },
  { name: 'Devil Press', subCategory: 'Full Body', muscleGroup: 'Other', equipment: 'Dumbbell', lateralJump: false },

  // Core
  { name: 'Plank Jacks', subCategory: 'Core', muscleGroup: 'Abs', equipment: 'Body Weight', lateralJump: false },
  { name: 'Bicycle Crunches', subCategory: 'Core', muscleGroup: 'Abs', equipment: 'Body Weight', lateralJump: false },
  { name: 'V-ups', subCategory: 'Core', muscleGroup: 'Abs', equipment: 'Body Weight', lateralJump: false },
  { name: 'Russian Twists', subCategory: 'Core', muscleGroup: 'Abs', equipment: 'Body Weight', lateralJump: false },
  { name: 'Flutter Kicks', subCategory: 'Core', muscleGroup: 'Abs', equipment: 'Body Weight', lateralJump: false },
  { name: 'Plank to Push-up', subCategory: 'Core', muscleGroup: 'Abs', equipment: 'Body Weight', lateralJump: false },

  // Cardio-Based
  { name: 'High Knees (in place)', subCategory: 'Cardio-Based', muscleGroup: 'Lower Legs', equipment: 'Body Weight', lateralJump: false },
  { name: 'Jumping Jacks', subCategory: 'Cardio-Based', muscleGroup: 'Other', equipment: 'Body Weight', lateralJump: true },
  { name: 'Butt Kicks', subCategory: 'Cardio-Based', muscleGroup: 'Lower Legs', equipment: 'Body Weight', lateralJump: false },
  { name: 'Sprint Intervals', subCategory: 'Cardio-Based', muscleGroup: 'Other', equipment: 'Body Weight', lateralJump: false },
  { name: 'Star Jumps', subCategory: 'Cardio-Based', muscleGroup: 'Other', equipment: 'Body Weight', lateralJump: false },
  { name: 'Tuck Jumps', subCategory: 'Cardio-Based', muscleGroup: 'Upper Legs', equipment: 'Body Weight', lateralJump: false },

  // Combat-Style
  { name: 'Shadow Boxing', subCategory: 'Combat-Style', muscleGroup: 'Shoulders', equipment: 'Body Weight', lateralJump: false },
  { name: 'Speed Skaters (no jump)', subCategory: 'Combat-Style', muscleGroup: 'Upper Legs', equipment: 'Body Weight', lateralJump: false },
  { name: 'Speed Skaters', subCategory: 'Combat-Style', muscleGroup: 'Upper Legs', equipment: 'Body Weight', lateralJump: true },
  { name: 'Shadow Boxing Combos', subCategory: 'Combat-Style', muscleGroup: 'Shoulders', equipment: 'Body Weight', lateralJump: false },
  { name: 'Cross Jabs (weighted)', subCategory: 'Combat-Style', muscleGroup: 'Shoulders', equipment: 'Dumbbell', lateralJump: false },

  // Equipment-Based
  { name: 'Kettlebell Swings', subCategory: 'Equipment-Based', muscleGroup: 'Glutes', equipment: 'Kettlebell', lateralJump: false },
  { name: 'Battle Rope Slams', subCategory: 'Equipment-Based', muscleGroup: 'Shoulders', equipment: 'Battle Ropes', lateralJump: false },
  { name: 'Jump Rope Intervals', subCategory: 'Equipment-Based', muscleGroup: 'Lower Legs', equipment: 'Jump Rope', lateralJump: false },
  { name: 'Assault Bike Sprints', subCategory: 'Equipment-Based', muscleGroup: 'Other', equipment: 'Cardio Machine', lateralJump: false },
  { name: 'Rowing Sprints', subCategory: 'Equipment-Based', muscleGroup: 'Back', equipment: 'Cardio Machine', lateralJump: false },

  // Agility / SAQ
  { name: 'Lateral Shuffles', subCategory: 'Agility/SAQ', muscleGroup: 'Lower Legs', equipment: 'Body Weight', lateralJump: true },
  { name: 'Ladder Drills', subCategory: 'Agility/SAQ', muscleGroup: 'Lower Legs', equipment: 'Agility Ladder', lateralJump: false },
  { name: 'Cone Sprints', subCategory: 'Agility/SAQ', muscleGroup: 'Lower Legs', equipment: 'Cones', lateralJump: false },
  { name: 'In-and-Out Squats', subCategory: 'Agility/SAQ', muscleGroup: 'Upper Legs', equipment: 'Body Weight', lateralJump: false },
];

// نداء مرة واحدة من console المتصفح بعد تسجيل دخول المدرب
export async function seedHiitExercises() {
  const results = [];
  for (const ex of HIIT_EXERCISES) {
    try {
      const ref = await addDoc(
        collection(db, 'artifacts', APP_ID, 'public', 'data', 'library'),
        {
          name: ex.name,
          category: 'HIIT',
          subCategory: ex.subCategory,
          muscleGroup: ex.muscleGroup,
          equipment: ex.equipment,
          sets: '3',
          reps: '30',
          tempo: '',
          gifUrl: '',
          description: ex.lateralJump ? 'Lateral jump variation' : 'No lateral jump',
          lateralJump: ex.lateralJump,
          alternatives: [],
          createdAt: serverTimestamp(),
        }
      );
      results.push({ name: ex.name, id: ref.id, ok: true });
    } catch (e) {
      results.push({ name: ex.name, error: e.message, ok: false });
    }
  }
  console.table(results);
  return results;
}
