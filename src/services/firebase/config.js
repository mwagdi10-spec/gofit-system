// ─── Firebase Configuration ──────────────────────────────────────────────────
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCcjp3dDhgt15x7ttHD3UplfP20e57CpFU",
  authDomain: "gofit-9ed5f.firebaseapp.com",
  projectId: "gofit-9ed5f",
  storageBucket: "gofit-9ed5f.firebasestorage.app",
  messagingSenderId: "30376573246",
  appId: "1:30376573246:web:cda9649cae1e8d020d546f"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// ─── Constants ────────────────────────────────────────────────────────────────
export const APP_ID = "gofit-production";
export const TRAINER_MAIL = "wagdi@gofit.com";

// ─── Initialize Auth ──────────────────────────────────────────────────────────
export const initializeAuth = async () => {
  try {
    const result = await signInAnonymously(auth);
    return result.user;
  } catch (error) {
    console.error('Auth initialization error:', error);
    throw error;
  }
};

// ─── Collection Paths ─────────────────────────────────────────────────────────
export const COLLECTION_PATHS = {
  clients: `artifacts/${APP_ID}/public/data/client_names`,
  workouts: `artifacts/${APP_ID}/public/data/workouts`,
  exercises: `artifacts/${APP_ID}/public/data/library`,
  logs: `artifacts/${APP_ID}/public/data/logs`,
  notes: `artifacts/${APP_ID}/public/data/user_notes`
};

// ─── Firestore Helpers ────────────────────────────────────────────────────────
export const getCollectionPath = (collectionName) => {
  return COLLECTION_PATHS[collectionName] || `artifacts/${APP_ID}/public/data/${collectionName}`;
};

// ─── Error Handler ────────────────────────────────────────────────────────────
export const handleFirebaseError = (error) => {
  console.error('Firebase Error:', error);
  
  const errorMessages = {
    'permission-denied': 'You do not have permission to access this',
    'not-found': 'Resource not found',
    'already-exists': 'Resource already exists',
    'unavailable': 'Service temporarily unavailable',
    'unauthenticated': 'Please log in first'
  };

  const message = errorMessages[error.code] || error.message || 'An error occurred';
  return { error: true, message, code: error.code };
};
