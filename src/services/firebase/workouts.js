import { collection, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';

export async function addWorkout(db, appId, data) {
  return await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'workouts'), data);
}

export async function updateWorkout(db, appId, id, data) {
  return await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'workouts', id), data);
}

export async function deleteWorkout(db, appId, id) {
  return await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'workouts', id));
}
