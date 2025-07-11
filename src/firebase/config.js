// src/firebase/config.js

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: 將這裡換成您自己 Firebase 專案的設定金鑰
// 這是在上面「第 1 步」中，您從 Firebase 控制台複製的 firebaseConfig 物件

//const firebaseConfig = {
  // 使用 REACT_APP_ 前綴來讀取環境變數
  //apiKey: process.env.REACT_APP_API_KEY,
  //authDomain: process.env.REACT_APP_AUTH_DOMAIN,
  //projectId: process.env.REACT_APP_PROJECT_ID,
  //storageBucket: process.env.REACT_APP_STORAGE_BUCKET,
  //messagingSenderId: process.env.REACT_APP_MESSAGING_SENDER_ID,
  //appId: process.env.REACT_APP_APP_ID,
 // measurementId: process.env.REACT_APP_MEASUREMENT_ID
//};

const firebaseConfig = {
  apiKey: "AIzaSyAd6qUPQY93nSUPbTKlirO7AVYDjtt24vA",
  authDomain: "bookkeeping-b5f9a.firebaseapp.com",
  projectId: "bookkeeping-b5f9a",
  storageBucket: "bookkeeping-b5f9a.firebasestorage.app",
  messagingSenderId: "84186624558",
  appId: "1:84186624558:web:c2c7246caebd884c53e5bf",
  measurementId: "G-SBRR3SJNG3"
};


// 初始化 Firebase
const app = initializeApp(firebaseConfig);

// 導出我們需要的 Firebase 服務實例
export const auth = getAuth(app);
export const db = getFirestore(app);