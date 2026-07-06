// js/firebase-config.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";

import {
  getAuth,
  GoogleAuthProvider
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAxnKMw4mxpH5SBjwYJrhZhqI91AeIf1ek",
  authDomain: "formulario-1-e8da5.firebaseapp.com",
  projectId: "formulario-1-e8da5",
  storageBucket: "formulario-1-e8da5.firebasestorage.app",
  messagingSenderId: "546203812305",
  appId: "1:546203812305:web:cd47d415d52fcc5fdb20f0"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: "select_account"
});

const db = getFirestore(app);

export {
  app,
  auth,
  googleProvider,
  db
};