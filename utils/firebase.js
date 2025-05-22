import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

let firebaseApp;

export function initFirebase(config) {
  if (!getApps().length) {
    firebaseApp = initializeApp(config);
  }
  return firebaseApp;
}

export function getDb() {
  return getFirestore();
}
