import { collection, getDocs, doc, writeBatch } from 'firebase/firestore';
import { db, APP_ID, MUSCLE_GROUPS } from '../services/firebase/config';
import { getMuscleGroup, getEquipment } from '../utils/formatters';

const OLD_TO_NEW = {
  Quads: 'Upper Legs',
  Hamstrings: 'Upper Legs',
  Calves: 'Lower Legs',
  Core: 'Abs',
};

function resolveMuscle(oldValue, name) {
  if (OLD_TO_NEW[oldValue]) return OLD_TO_NEW[oldValue];
  if (oldValue === 'Arms') return getMuscleGroup(name) || 'Biceps';
  if (oldValue === 'Full Body' || oldValue === 'Mobility') return getMuscleGroup(name) || 'Other';
  if (MUSCLE_GROUPS.includes(oldValue)) return oldValue;
  return getMuscleGroup(name) || 'Other';
}

async function migrateCollection(collectionName) {
  const snap = await getDocs(collection(db, 'artifacts', APP_ID, 'public', 'data', collectionName));
  const docs = snap.docs;
  let updated = 0;
  for (let i = 0; i < docs.length; i += 450) {
    const chunk = docs.slice(i, i + 450);
    const batch = writeBatch(db);
    chunk.forEach(d => {
      const data = d.data();
      const newMuscle = resolveMuscle(data.muscleGroup, data.name);
      const newEquipment = data.equipment || getEquipment(data.name) || 'Body Weight';
      batch.update(doc(db, 'artifacts', APP_ID, 'public', 'data', collectionName, d.id), {
        muscleGroup: newMuscle,
        equipment: newEquipment,
      });
      updated++;
    });
    await batch.commit();
  }
  return updated;
}

// نداء مرة واحدة من console المتصفح بعد تسجيل دخول المدرب
export async function migrateMuscleAndEquipment() {
  const libraryCount = await migrateCollection('library');
  const workoutsCount = await migrateCollection('workouts');
  console.table([
    { collection: 'library', updated: libraryCount },
    { collection: 'workouts', updated: workoutsCount },
  ]);
  return { libraryCount, workoutsCount };
}
