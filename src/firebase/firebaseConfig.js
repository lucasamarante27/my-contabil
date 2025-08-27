import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDWW72cKvx3SWJPPwExTdCPMKt2mmyR4jg",
  authDomain: "desafio-8b016.firebaseapp.com",
  projectId: "desafio-8b016",
  storageBucket: "desafio-8b016.firebasestorage.app",
  messagingSenderId: "529062770073",
  appId: "1:529062770073:web:a75e5eb1c2917e113ecf08",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);