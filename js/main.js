// js/main.js

import { iniciarAuth, obtenerUsuarioActual } from "./auth.js";
import { SUCURSALES, PUESTOS_EVALUADORES } from "./evaluados.js";
import { cargarDashboard } from "./dashboard.js";

import {
  iniciarWizard,
  obtenerPasoActual,
  guardarRespuestasArea,
  irSiguiente,
  irAnterior,
  obtenerProgreso,
  wizardFinalizado,
  obtenerTodasLasRespuestas
} from "./wizard.js";

import {
  construirFormularioActual,
  obtenerRespuestasFormulario
} from "./formulario.js";

import {
  validarPreguntasContestadas,
  mostrarEstado,
  ocultarEstado,
  obtenerFechaActual
} from "./utils.js";

import {
  guardarEvaluacionCompleta,
  existeEvaluacion,
  obtenerPerfilUsuario,
  guardarPerfilUsuario
} from "./firestore.js";

const ADMIN_EMAIL = "rhdgardi@gmail.com";

const surveyForm = document.getElementById("surveyForm");
const surveyPanel = document.getElementById("surveyPanel");
const adminPanel = document.getElementById("adminPanel");
const dashboardContent = document.getElementById("dashboardContent");

const questionSections = document.getElementById("questionSections");
const formStatus = document.getElementById("formStatus");

const numeroTrabajador = document.getElementById("numeroTrabajador");
const sucursal = document.getElementById("sucursal");
const puesto = document.getElementById("puesto");
const fecha = document.getElementById("fecha");

const btnAnterior = document.getElementById("btnAnterior");
const btnSiguiente = document.getElementById("btnSiguiente");
const btnFinalizar = document.getElementById("btnFinalizar");
const btnDashboard = document.getElementById("btnDashboard");
const btnFormulario = document.getElementById("btnFormulario");

const wizardProgress = document.getElementById("wizardProgress");

let perfilUsuario = null;
let modoAdmin = false;

document.addEventListener("DOMContentLoaded", () => {
  cargarSucursales();
  cargarPuestos();

  if (fecha) fecha.value = obtenerFechaActual();

  iniciarAuth({
    onLogin: async (user) => {
      modoAdmin = user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

      surveyForm.classList.remove("hidden");

      if (modoAdmin) {
        activarModoAdmin();
      } else {
        await cargarPerfilUsuario(user);
      }
    },

    onLogout: () => {
      perfilUsuario = null;
      modoAdmin = false;

      surveyForm.classList.add("hidden");
      adminPanel.classList.add("hidden");
      surveyPanel.classList.remove("hidden");

      btnDashboard?.classList.add("hidden");
      btnFormulario?.classList.add("hidden");

      questionSections.innerHTML = "";
      wizardProgress.innerHTML = "";

      if (dashboardContent) dashboardContent.innerHTML = "";

      limpiarDatosGenerales();
      ocultarEstado(formStatus);
    }
  });

  puesto.addEventListener("change", manejarCambioPuesto);
  sucursal.addEventListener("change", manejarCambioSucursal);

  btnAnterior.addEventListener("click", regresarPaso);
  btnSiguiente.addEventListener("click", avanzarPaso);
  btnFinalizar.addEventListener("click", finalizarEvaluacion);
});

function activarModoAdmin() {
  perfilUsuario = null;

  numeroTrabajador.disabled = false;
  sucursal.disabled = false;
  puesto.disabled = false;

  btnDashboard?.classList.remove("hidden");
  btnFormulario?.classList.add("hidden");

  prepararBotonesAdmin();

  mostrarEstado(
    formStatus,
    "info",
    "Modo administrador activo. Puedes seleccionar cualquier sucursal y puesto para revisar las preguntas sin restricciones."
  );

  questionSections.innerHTML = "";
  wizardProgress.innerHTML = "";
}

function prepararBotonesAdmin() {
  if (!btnDashboard || !btnFormulario) return;

  btnDashboard.onclick = async () => {
    surveyPanel.classList.add("hidden");
    adminPanel.classList.remove("hidden");

    btnDashboard.classList.add("hidden");
    btnFormulario.classList.remove("hidden");

    await cargarDashboard();
  };

  btnFormulario.onclick = () => {
    adminPanel.classList.add("hidden");
    surveyPanel.classList.remove("hidden");

    btnFormulario.classList.add("hidden");
    btnDashboard.classList.remove("hidden");
  };
}

function cargarSucursales() {
  sucursal.innerHTML = `<option value="">Selecciona una sucursal</option>`;

  SUCURSALES.forEach(item => {
    const option = document.createElement("option");
    option.value = item;
    option.textContent = item;
    sucursal.appendChild(option);
  });
}

function cargarPuestos() {
  puesto.innerHTML = `<option value="">Selecciona tu puesto</option>`;

  PUESTOS_EVALUADORES.forEach(item => {
    const option = document.createElement("option");
    option.value = item;
    option.textContent = item;
    puesto.appendChild(option);
  });
}

function manejarCambioSucursal() {
  if (modoAdmin) {
    cargarPreguntasAdmin();
  }
}

function manejarCambioPuesto() {
  if (modoAdmin) {
    cargarPreguntasAdmin();
  } else {
    confirmarPuestoSeleccionado();
  }
}

function cargarPreguntasAdmin() {
  if (!puesto.value) {
    questionSections.innerHTML = "";
    wizardProgress.innerHTML = "";
    return;
  }

  if (!sucursal.value) {
    mostrarEstado(
      formStatus,
      "warning",
      "Selecciona una sucursal para visualizar correctamente las preguntas del puesto elegido."
    );

    questionSections.innerHTML = "";
    wizardProgress.innerHTML = "";
    return;
  }

  ocultarEstado(formStatus);

  iniciarWizard(puesto.value, sucursal.value);
  construirFormularioActual();
  renderizarProgreso();
  actualizarBotones();

  mostrarEstado(
    formStatus,
    "info",
    `Vista administrador: estás revisando el formulario de "${puesto.value}" en "${sucursal.value}".`
  );
}

async function cargarPerfilUsuario(user) {
  perfilUsuario = await obtenerPerfilUsuario(user.uid);

  if (perfilUsuario?.puestoBloqueado) {
    numeroTrabajador.value = perfilUsuario.numeroTrabajador || "";
    sucursal.value = perfilUsuario.sucursal || "";
    puesto.value = perfilUsuario.puestoEvaluador || "";

    bloquearCamposGenerales();

    mostrarEstado(
      formStatus,
      "info",
      `🔒 Tu puesto ya fue confirmado como "${perfilUsuario.puestoEvaluador}". Por seguridad no se puede modificar.`
    );

    iniciarWizard(perfilUsuario.puestoEvaluador, perfilUsuario.sucursal);
    construirFormularioActual();
    renderizarProgreso();
    actualizarBotones();
  } else {
    questionSections.innerHTML = "";
    wizardProgress.innerHTML = "";

    mostrarEstado(
      formStatus,
      "warning",
      "IMPORTANTE: Ingresa tu número de trabajador, selecciona tu sucursal y elige correctamente tu puesto. Una vez confirmado, no podrás cambiarlo."
    );
  }
}

async function confirmarPuestoSeleccionado() {
  questionSections.innerHTML = "";
  wizardProgress.innerHTML = "";
  ocultarEstado(formStatus);

  if (!puesto.value) return;

  if (!numeroTrabajador.value.trim()) {
    mostrarEstado(formStatus, "warning", "Antes de elegir tu puesto, ingresa tu número de trabajador.");
    puesto.value = "";
    numeroTrabajador.focus();
    return;
  }

  if (!sucursal.value) {
    mostrarEstado(formStatus, "warning", "Antes de elegir tu puesto, selecciona tu sucursal.");
    puesto.value = "";
    sucursal.focus();
    return;
  }

  const usuario = obtenerUsuarioActual();

  if (!usuario) {
    mostrarEstado(formStatus, "error", "Debes iniciar sesión antes de seleccionar tu puesto.");
    puesto.value = "";
    return;
  }

  const confirmar = confirm(
`IMPORTANTE

Has seleccionado el puesto:

${puesto.value}

Una vez confirmado, este puesto quedará registrado en tu cuenta de Google y NO podrás cambiarlo ni visualizar formularios de otros puestos.

Número de trabajador: ${numeroTrabajador.value.trim()}
Sucursal: ${sucursal.value}

¿Confirmas que tus datos son correctos?`
  );

  if (!confirmar) {
    puesto.value = "";
    mostrarEstado(formStatus, "warning", "Verifica tus datos antes de confirmar tu puesto.");
    return;
  }

  try {
    await guardarPerfilUsuario(usuario.uid, {
      email: usuario.email,
      numeroTrabajador: numeroTrabajador.value.trim(),
      sucursal: sucursal.value,
      puestoEvaluador: puesto.value
    });

    perfilUsuario = await obtenerPerfilUsuario(usuario.uid);

    bloquearCamposGenerales();

    mostrarEstado(
      formStatus,
      "success",
      `🔒 Puesto confirmado correctamente: ${puesto.value}. Ya puedes iniciar tu evaluación.`
    );

    iniciarWizard(puesto.value, sucursal.value);
    construirFormularioActual();
    renderizarProgreso();
    actualizarBotones();

  } catch (error) {
    console.error(error);
    mostrarEstado(formStatus, "error", "No se pudo confirmar el puesto. Revisa permisos de Firestore.");
    puesto.value = "";
  }
}

function validarDatosGenerales() {
  if (!numeroTrabajador.value.trim()) {
    mostrarEstado(formStatus, "warning", "Ingresa el número de trabajador.");
    return false;
  }

  if (!sucursal.value) {
    mostrarEstado(formStatus, "warning", "Selecciona la sucursal.");
    return false;
  }

  if (!puesto.value) {
    mostrarEstado(formStatus, "warning", "Selecciona tu puesto.");
    return false;
  }

  if (!modoAdmin && !perfilUsuario?.puestoBloqueado) {
    mostrarEstado(formStatus, "warning", "Primero debes confirmar tu puesto para continuar.");
    return false;
  }

  return true;
}

function avanzarPaso() {
  if (!validarDatosGenerales()) return;

  const paso = obtenerPasoActual();
  if (!paso) return;

  const respuestas = obtenerRespuestasFormulario();

  const valido = validarPreguntasContestadas(
    paso.preguntas.preguntas,
    respuestas
  );

  if (!valido) {
    mostrarEstado(formStatus, "warning", "Responde todas las preguntas antes de continuar.");
    return;
  }

  ocultarEstado(formStatus);

  guardarRespuestasArea(paso.areaKey, respuestas);
  irSiguiente();

  construirFormularioActual();
  renderizarProgreso();
  actualizarBotones();

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function regresarPaso() {
  ocultarEstado(formStatus);

  irAnterior();
  construirFormularioActual();
  renderizarProgreso();
  actualizarBotones();

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function actualizarBotones() {
  const progreso = obtenerProgreso();
  const pasoActivo = progreso.areas.find(a => a.activo);

  btnAnterior.disabled = pasoActivo?.index === 0;

  if (pasoActivo?.index === progreso.total - 1) {
    btnSiguiente.classList.add("hidden");
    btnFinalizar.classList.remove("hidden");
  } else {
    btnSiguiente.classList.remove("hidden");
    btnFinalizar.classList.add("hidden");
  }
}

function renderizarProgreso() {
  const progreso = obtenerProgreso();

  wizardProgress.innerHTML = `
    <div class="info">
      <strong>Progreso de evaluación:</strong>
      ${progreso.completadas} de ${progreso.total} áreas completadas

      <div class="bar" style="margin-top:10px;">
        <div style="width:${progreso.porcentaje}%"></div>
      </div>
    </div>

    <div class="progress-grid">
      ${progreso.areas.map(area => `
        <div class="progress-card ${area.completado ? "completed" : area.activo ? "pending" : ""}">
          <div class="name">${area.nombre}</div>
          <span class="status-badge ${area.completado ? "completed" : "pending"}">
            ${area.completado ? "Completado" : area.activo ? "En curso" : "Pendiente"}
          </span>
        </div>
      `).join("")}
    </div>
  `;
}

async function finalizarEvaluacion() {
  if (!validarDatosGenerales()) return;

  if (modoAdmin) {
    mostrarEstado(
      formStatus,
      "info",
      "Estás en modo administrador. Esta vista es solo para revisar preguntas; no guarda una evaluación."
    );
    return;
  }

  const usuario = obtenerUsuarioActual();

  if (!usuario) {
    mostrarEstado(formStatus, "error", "Debes iniciar sesión para enviar la evaluación.");
    return;
  }

  const paso = obtenerPasoActual();
  if (!paso) return;

  const respuestas = obtenerRespuestasFormulario();

  const valido = validarPreguntasContestadas(
    paso.preguntas.preguntas,
    respuestas
  );

  if (!valido) {
    mostrarEstado(formStatus, "warning", "Responde todas las preguntas antes de finalizar.");
    return;
  }

  guardarRespuestasArea(paso.areaKey, respuestas);

  if (!wizardFinalizado()) {
    mostrarEstado(formStatus, "warning", "Aún faltan áreas por evaluar.");
    renderizarProgreso();
    return;
  }

  try {
    btnFinalizar.disabled = true;
    mostrarEstado(formStatus, "info", "Guardando evaluación...");

    const yaExiste = await existeEvaluacion(
      numeroTrabajador.value.trim(),
      sucursal.value,
      puesto.value,
      usuario.uid
    );

    if (yaExiste) {
      mostrarEstado(formStatus, "warning", "Ya existe una evaluación registrada con esta cuenta.");
      btnFinalizar.disabled = false;
      return;
    }

    const data = {
      uid: usuario.uid,
      email: usuario.email,
      numeroTrabajador: numeroTrabajador.value.trim(),
      sucursal: sucursal.value,
      puestoEvaluador: puesto.value,
      fecha: fecha.value,
      evaluaciones: obtenerTodasLasRespuestas()
    };

    await guardarEvaluacionCompleta(data);

    mostrarEstado(formStatus, "success", "Evaluación guardada correctamente.");

    btnFinalizar.disabled = true;
    btnAnterior.disabled = true;

  } catch (error) {
    console.error(error);
    mostrarEstado(formStatus, "error", "Ocurrió un error al guardar la evaluación.");
    btnFinalizar.disabled = false;
  }
}

function bloquearCamposGenerales() {
  numeroTrabajador.disabled = true;
  sucursal.disabled = true;
  puesto.disabled = true;
}

function limpiarDatosGenerales() {
  numeroTrabajador.value = "";
  sucursal.value = "";
  puesto.value = "";

  numeroTrabajador.disabled = false;
  sucursal.disabled = false;
  puesto.disabled = false;
}