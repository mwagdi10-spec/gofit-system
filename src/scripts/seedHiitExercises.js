import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, APP_ID } from '../services/firebase/config';

// 18 HIIT exercise, lateralJump بيحدد لو فيه قفز جانبي
const HIIT_EXERCISES = [
  { name: 'Mountain Climbers', lateralJump: false },
  { name: 'High Knees (in place)', lateralJump: false },
  { name: 'Burpees (no lateral jump)', lateralJump: false },
  { name: 'Squat to Stand', lateralJump: false },
  { name: 'Push-up to Plank', lateralJump: false },
  { name: 'Bicycle Crunches', lateralJump: false },
  { name: 'Shadow Boxing', lateralJump: false },
  { name: 'Speed Skaters (no jump)', lateralJump: false },
  { name: 'Plank Jacks', lateralJump: false },
  { name: 'Squat Pulses', lateralJump: false },
  { name: 'Lateral Skater Jumps', lateralJump: true },
  { name: 'Ski Jumps', lateralJump: true },
  { name: 'Lateral Bounds', lateralJump: true },
  { name: 'Jumping Jacks', lateralJump: true },
  { name: 'Squat Jump + Lateral Shuffle', lateralJump: true },
  { name: 'Lateral Box Jumps', lateralJump: true },
  { name: 'Side-to-Side Jump Lunges', lateralJump: true },
  { name: 'Plyo Lateral Hops', lateralJump: true },
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
          muscleGroup: 'Cardio',
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
