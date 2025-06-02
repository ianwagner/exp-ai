// lib/firebase.ts
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// Default Firebase configuration taken from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// firebaseApp and db are assigned when the module initializes
// but TypeScript doesn't know that, so we use the definite
// assignment assertion operator (!) to silence the error.
let firebaseApp!: FirebaseApp;
let db!: Firestore;
let storage!: FirebaseStorage;

function initDefaultApp() {
  if (!firebaseApp) {
    if (!getApps().length) {
      firebaseApp = initializeApp(firebaseConfig);
    } else {
      firebaseApp = getApps()[0];
    }
    db = getFirestore(firebaseApp);
    storage = getStorage(firebaseApp);
  }
}

export function initFirebase(config: object): FirebaseApp {
  if (!getApps().length) {
    firebaseApp = initializeApp(config);
    db = getFirestore(firebaseApp);
    storage = getStorage(firebaseApp);
  } else {
    firebaseApp = getApps()[0];
  }
  return firebaseApp;
}

export function getDb(): Firestore {
  if (!db) {
    initDefaultApp();
  }
  // db is guaranteed to be initialized after initDefaultApp
  return db as Firestore;
}

export function getStorageInstance(): FirebaseStorage {
  if (!storage) {
    initDefaultApp();
  }
  return storage as FirebaseStorage;
}

// Initialize using environment configuration by default
initDefaultApp();

export { db, storage };
export default db as Firestore;
