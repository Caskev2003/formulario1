// js/auth.js

import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import { auth, googleProvider } from "./firebase-config.js";

const ADMIN_EMAILS = [
  "rhdgardi@gmail.com"
];

let usuarioActual = null;

export function iniciarAuth({ onLogin, onLogout } = {}) {
  const btnLoginGoogle = document.getElementById("btnLoginGoogle");
  const btnLoginEmail = document.getElementById("btnLoginEmail");
  const btnCrearCuenta = document.getElementById("btnCrearCuenta");
  const btnRecuperarPassword = document.getElementById("btnRecuperarPassword");
  const btnLogout = document.getElementById("btnLogout");

  const emailInput = document.getElementById("loginEmail");
  const passwordInput = document.getElementById("loginPassword");

  const userState = document.getElementById("userState");
  const authStatus = document.getElementById("authStatus");

  btnLoginGoogle?.addEventListener("click", async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error(error);
      mostrarAuthStatus(authStatus, "error", "No se pudo iniciar sesión con Google.");
    }
  });

  btnLoginEmail?.addEventListener("click", async () => {
    const email = emailInput?.value.trim();
    const password = passwordInput?.value.trim();

    if (!email || !password) {
      mostrarAuthStatus(authStatus, "warning", "Ingresa tu correo y contraseña.");
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error(error);
      mostrarAuthStatus(authStatus, "error", obtenerMensajeError(error));
    }
  });

  btnCrearCuenta?.addEventListener("click", async () => {
    const email = emailInput?.value.trim();
    const password = passwordInput?.value.trim();

    if (!email || !password) {
      mostrarAuthStatus(authStatus, "warning", "Ingresa un correo y una contraseña para crear tu cuenta.");
      return;
    }

    if (password.length < 6) {
      mostrarAuthStatus(authStatus, "warning", "La contraseña debe tener mínimo 6 caracteres.");
      return;
    }

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      mostrarAuthStatus(authStatus, "success", "Cuenta creada correctamente.");
    } catch (error) {
      console.error(error);
      mostrarAuthStatus(authStatus, "error", obtenerMensajeError(error));
    }
  });

  btnRecuperarPassword?.addEventListener("click", async () => {
    const email = emailInput?.value.trim();

    if (!email) {
      mostrarAuthStatus(authStatus, "warning", "Ingresa tu correo para recuperar la contraseña.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      mostrarAuthStatus(authStatus, "success", "Se envió un correo para restablecer tu contraseña.");
    } catch (error) {
      console.error(error);
      mostrarAuthStatus(authStatus, "error", obtenerMensajeError(error));
    }
  });

  btnLogout?.addEventListener("click", async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error(error);
      mostrarAuthStatus(authStatus, "error", "No se pudo cerrar sesión.");
    }
  });

  onAuthStateChanged(auth, user => {
    usuarioActual = user;

    if (user) {
      userState.textContent = `Sesión iniciada: ${user.email}`;
      userState.classList.add("success");

      btnLoginGoogle?.classList.add("hidden");
      btnLoginEmail?.classList.add("hidden");
      btnCrearCuenta?.classList.add("hidden");
      btnRecuperarPassword?.classList.add("hidden");
      btnLogout?.classList.remove("hidden");

      emailInput?.classList.add("hidden");
      passwordInput?.classList.add("hidden");

      mostrarAuthStatus(authStatus, "success", "Acceso correcto.");

      if (typeof onLogin === "function") {
        onLogin(user, esAdministrador(user.email));
      }
    } else {
      userState.textContent = "No has iniciado sesión";
      userState.classList.remove("success");

      btnLoginGoogle?.classList.remove("hidden");
      btnLoginEmail?.classList.remove("hidden");
      btnCrearCuenta?.classList.remove("hidden");
      btnRecuperarPassword?.classList.remove("hidden");
      btnLogout?.classList.add("hidden");

      emailInput?.classList.remove("hidden");
      passwordInput?.classList.remove("hidden");

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

function obtenerMensajeError(error) {
  switch (error.code) {
    case "auth/email-already-in-use":
      return "Este correo ya está registrado. Inicia sesión con tu contraseña.";

    case "auth/invalid-email":
      return "El correo ingresado no es válido.";

    case "auth/user-not-found":
      return "No existe una cuenta con este correo. Primero crea una cuenta.";

    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Correo o contraseña incorrectos.";

    case "auth/weak-password":
      return "La contraseña debe tener mínimo 6 caracteres.";

    case "auth/popup-closed-by-user":
      return "Se cerró la ventana de inicio de sesión.";

    default:
      return "No se pudo completar el acceso. Revisa tus datos.";
  }
}