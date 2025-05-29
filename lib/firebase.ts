// lib/firebase.ts
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';

// Default Firebase configuration taken from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let firebaseApp: FirebaseApp;
let db: Firestore;

function initDefaultApp() {
  if (!firebaseApp) {
    if (!getApps().length) {
      firebaseApp = initializeApp(firebaseConfig);
    } else {
      firebaseApp = getApps()[0];
    }
    db = getFirestore(firebaseApp);
  }
}

export function initFirebase(config: object): FirebaseApp {
  if (!getApps().length) {
    firebaseApp = initializeApp(config);
    db = getFirestore(firebaseApp);
  } else {
    firebaseApp = getApps()[0];
  }
  return firebaseApp;
}

export function getDb(): Firestore {
  if (!db) {
    initDefaultApp();
  }
  return db;
}

// Initialize using environment configuration by default
initDefaultApp();

export { db };
export default db;
