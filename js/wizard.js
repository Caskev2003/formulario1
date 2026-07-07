// js/wizard.js

import { obtenerAreasPorPuesto, obtenerNombreArea } from "./evaluados.js";
import { obtenerPreguntas } from "./preguntas.js";

let areas = [];
let pasoActual = 0;
let respuestasWizard = {};

const PASO_COMENTARIOS = "COMENTARIOS_FINALES";

export function iniciarWizard(puestoEvaluador, sucursal = "") {
  areas = obtenerAreasPorPuesto(puestoEvaluador, sucursal);

  areas.push(PASO_COMENTARIOS);

  pasoActual = 0;
  respuestasWizard = {};

  areas.forEach(area => {
    respuestasWizard[area] = {
      completado: false,
      respuestas: {}
    };
  });

  return obtenerPasoActual();
}

export function obtenerPasoActual() {
  const areaKey = areas[pasoActual];

  if (!areaKey) return null;

  if (areaKey === PASO_COMENTARIOS) {
    return {
      pasoActual,
      totalPasos: areas.length,
      areaKey,
      areaNombre: "Comentarios finales",
      tipo: "comentarios",
      preguntas: null,
      respuestas: respuestasWizard[areaKey]?.respuestas || {},
      completado: respuestasWizard[areaKey]?.completado || false
    };
  }

  return {
    pasoActual,
    totalPasos: areas.length,
    areaKey,
    areaNombre: obtenerNombreArea(areaKey),
    tipo: "area",
    preguntas: obtenerPreguntas(areaKey),
    respuestas: respuestasWizard[areaKey]?.respuestas || {},
    completado: respuestasWizard[areaKey]?.completado || false
  };
}

export function guardarRespuestasArea(areaKey, respuestas) {
  if (!respuestasWizard[areaKey]) return false;

  respuestasWizard[areaKey] = {
    completado: true,
    respuestas
  };

  return true;
}

export function irSiguiente() {
  if (pasoActual < areas.length - 1) {
    pasoActual++;
    return obtenerPasoActual();
  }

  return null;
}

export function irAnterior() {
  if (pasoActual > 0) {
    pasoActual--;
  }

  return obtenerPasoActual();
}

export function irAPaso(index) {
  if (index >= 0 && index < areas.length) {
    pasoActual = index;
  }

  return obtenerPasoActual();
}

export function obtenerProgreso() {
  const completadas = areas.filter(area => respuestasWizard[area]?.completado).length;

  return {
    completadas,
    total: areas.length,
    porcentaje: areas.length ? Math.round((completadas / areas.length) * 100) : 0,
    areas: areas.map((area, index) => ({
      index,
      areaKey: area,
      nombre: area === PASO_COMENTARIOS
        ? "Comentarios finales"
        : obtenerNombreArea(area),
      tipo: area === PASO_COMENTARIOS ? "comentarios" : "area",
      activo: index === pasoActual,
      completado: respuestasWizard[area]?.completado || false
    }))
  };
}

export function wizardFinalizado() {
  return areas.length > 0 && areas.every(area => respuestasWizard[area]?.completado);
}

export function obtenerTodasLasRespuestas() {
  return respuestasWizard;
}

export function reiniciarWizard() {
  areas = [];
  pasoActual = 0;
  respuestasWizard = {};
}

export function obtenerKeyComentariosFinales() {
  return PASO_COMENTARIOS;
}