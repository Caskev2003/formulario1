// js/firebase-config.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";

import {
    getAuth,
    GoogleAuthProvider
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
    getFirestore
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

//=====================================
// CONFIGURACIÓN DE FIREBASE
//=====================================

const firebaseConfig = {

    apiKey: "AIzaSyAxnKMw4mxpH5SBjwYJrhZhqI91AeIf1ek",

    authDomain: "formulario-1-e8da5.firebaseapp.com",

    projectId: "formulario-1-e8da5",

    storageBucket: "formulario-1-e8da5.firebasestorage.app",

    messagingSenderId: "546203812305",

    appId: "1:546203812305:web:cd47d415d52fcc5fdb20f0"

};

//=====================================
// INICIALIZAR FIREBASE
//=====================================

const app = initializeApp(firebaseConfig);

//=====================================
// AUTH
//=====================================

const auth = getAuth(app);

const provider = new GoogleAuthProvider();

provider.setCustomParameters({

    prompt: "select_account"

});

//=====================================
// FIRESTORE
//=====================================

const db = getFirestore(app);

//=====================================
// EXPORTACIONES
//=====================================

export {

    app,

    auth,

    provider,

    db

};