import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, update, push, remove } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyDuJUSOBAXY_c497xFSCbZwDbcgh-Cqqhw",
  authDomain: "haix18-app.firebaseapp.com",
  databaseURL: "https://haix18-app-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "haix18-app",
  storageBucket: "haix18-app.firebasestorage.app",
  messagingSenderId: "415621253102",
  appId: "1:415621253102:web:120fd0d7e63f97fbaf70ff",
  measurementId: "G-HX33ELEB23"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export { ref, onValue, set, update, push, remove };