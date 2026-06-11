import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {

  apiKey: "AIzaSyCcjp3dDhgt15x7ttHD3UplfP20e57CpFU",

  authDomain: "gofit-9ed5f.firebaseapp.com",

  projectId: "gofit-9ed5f",

  storageBucket: "gofit-9ed5f.firebasestorage.app",

  messagingSenderId: "30376573246",

  appId: "1:30376573246:web:cda9649cae1e8d020d546f"

};

export const app          = initializeApp(firebaseConfig);

export const auth         = getAuth(app);

export const db           = getFirestore(app);

export const APP_ID       = "gofit-production";

export const TRAINER_MAIL = "wagdi@gofit.com";

export const CATEGORIES   = ['WARM-UP','ACTIVATION','SKILL','RESISTANCE','CARDIO','COOL-DOWN'];

export const MUSCLE_GROUPS = ['Chest','Back','Quads','Hamstrings','Glutes','Calves','Shoulders','Arms','Core','Cardio','Full Body','Mobility','Other'];
