// lib/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDBYQHhoWwLYu2N2QFBG-zTjRiYdW305RM",
  authDomain: "mtb-ai-5fbea.firebaseapp.com",
  projectId: "mtb-ai-5fbea",
  storageBucket: "mtb-ai-5fbea.firebasestorage.app",
  messagingSenderId: "990228774847",
  appId: "1:990228774847:web:cff9217b936285d270eb0a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
export default db;
