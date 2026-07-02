// js/auth.js

import {
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import { auth, provider } from "./firebase-config.js";

const ADMIN_EMAILS = [
  "rhdgardi@gmail.com"
];

let usuarioActual = null;

export function iniciarAuth({ onLogin, onLogout } = {}) {
  const btnLogin = document.getElementById("btnLogin");
  const btnLogout = document.getElementById("btnLogout");
  const userState = document.getElementById("userState");
  const authStatus = document.getElementById("authStatus");

  btnLogin?.addEventListener("click", async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      mostrarAuthStatus(authStatus, "error", "No se pudo iniciar sesión.");
      console.error(error);
    }
  });

  btnLogout?.addEventListener("click", async () => {
    try {
      await signOut(auth);
    } catch (error) {
      mostrarAuthStatus(authStatus, "error", "No se pudo cerrar sesión.");
      console.error(error);
    }
  });

  onAuthStateChanged(auth, user => {
    usuarioActual = user;

    if (user) {
      userState.textContent = `Sesión iniciada: ${user.email}`;
      userState.classList.add("success");

      btnLogin.classList.add("hidden");
      btnLogout.classList.remove("hidden");

      mostrarAuthStatus(authStatus, "success", "Acceso correcto.");

      if (typeof onLogin === "function") {
        onLogin(user, esAdministrador(user.email));
      }
    } else {
      userState.textContent = "No has iniciado sesión";
      userState.classList.remove("success");

      btnLogin.classList.remove("hidden");
      btnLogout.classList.add("hidden");

      ocultarAuthStatus(authStatus);

      if (typeof onLogout === "function") {
        onLogout();
      }
    }
  });
}

export function obtenerUsuarioActual() {
  return usuarioActual;
}

export function esAdministrador(email) {
  return ADMIN_EMAILS.includes(String(email || "").toLowerCase());
}

function mostrarAuthStatus(elemento, tipo, mensaje) {
  if (!elemento) return;

  elemento.className = `status show ${tipo}`;
  elemento.textContent = mensaje;
}

function ocultarAuthStatus(elemento) {
  if (!elemento) return;

  elemento.className = "status";
  elemento.textContent = "";
}