import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDSqD_FCXXBNtFiT6gwCsxp0i3_rj9Gkbc",
  authDomain: "skillswap-12fox.firebaseapp.com",
  projectId: "skillswap-12fox",
  storageBucket: "skillswap-12fox.firebasestorage.app",
  messagingSenderId: "283097163552",
  appId: "1:283097163552:web:8981ed60334d0719de9945",
  measurementId: "G-SJ7L6485LP"
};
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);