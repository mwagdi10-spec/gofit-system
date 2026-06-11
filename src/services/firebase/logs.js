import { collection, doc, addDoc, getDocs, deleteDoc, query, where, serverTimestamp, Timestamp } from 'firebase/firestore';

export async function deleteLogsByDate(date, db, appId) {

  // تحويل date اگر كانت string

  let dateObj = date;

  if (typeof date === 'string') {

    dateObj = new Date(date);

  }

  

  const dateStr = dateObj.toLocaleDateString('en-US');

  const startOfDay = Timestamp.fromDate(new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()));

  const startOfNextDay = Timestamp.fromDate(new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate() + 1));

  

  const logsToDelete = await getDocs(

    query(collection(db, 'artifacts', appId, 'public', 'data', 'logs'),

      where('completedAt', '>=', startOfDay),

      where('completedAt', '<', startOfNextDay)

    )

  );

  for (const docRef of logsToDelete.docs) {

    await deleteDoc(docRef.ref);

  }

  return logsToDelete.size;

}



export async function deleteLogsByExerciseAndDate(exerciseName, date, db, appId) {

  // تحويل date اگر كانت string

  let dateObj = date;

  if (typeof date === 'string') {

    dateObj = new Date(date);

  }

  

  const dateStr = dateObj.toLocaleDateString('en-US');

  const startOfDay = Timestamp.fromDate(new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()));

  const startOfNextDay = Timestamp.fromDate(new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate() + 1));

  

  const logsToDelete = await getDocs(

    query(collection(db, 'artifacts', appId, 'public', 'data', 'logs'),

      where('exerciseName', '==', exerciseName),

      where('completedAt', '>=', startOfDay),

      where('completedAt', '<', startOfNextDay)

    )

  );

  

  for (const docRef of logsToDelete.docs) {

    await deleteDoc(docRef.ref);

  }

  return logsToDelete.size;

}


export async function addLog(db, appId, data) {
  return await addDoc(
    collection(db, 'artifacts', appId, 'public', 'data', 'logs'),
    { ...data, completedAt: serverTimestamp() }
  );
}
