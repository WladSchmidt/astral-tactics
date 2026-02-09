// src/firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

// 🔴 IMPORTANTE: Você precisa substituir esses dados pelos do seu projeto no console do Firebase
// Se você ainda não criou, me avise que eu te ensino em 1 minuto.
const firebaseConfig = {
  apiKey: "AIzaSyDCe4w-n2i0p_vh5aD-wpFjY5OV_XbaXMM",
  authDomain: "astral-tactics-bd4ef.firebaseapp.com",
  databaseURL: "https://astral-tactics-bd4ef-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "astral-tactics-bd4ef",
  storageBucket: "astral-tactics-bd4ef.firebasestorage.app",
  messagingSenderId: "499721671160",
  appId: "1:499721671160:web:9bb74d9abd71456744860d"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

export { db, auth };