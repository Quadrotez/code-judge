// src/utils/firebaseConfig.js
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyAGDKBb51dIgTPvnUVoDjWALVbzejl67sc",
  authDomain: "codejudge-a8381.firebaseapp.com",
  projectId: "codejudge-a8381",
  storageBucket: "codejudge-a8381.firebasestorage.app",
  messagingSenderId: "117605457271",
  appId: "1:117605457271:web:9bb6513fb2c8d652d35572"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firestore
export const db = getFirestore(app)

// Initialize Auth
export const auth = getAuth(app)