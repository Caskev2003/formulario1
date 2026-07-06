// js/firestore.js

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

import { db } from "./firebase-config.js";

import {
  calcularPromedio,
  calcularPromedioPorCompetencia,
  redondear
} from "./utils.js";

import { obtenerPreguntas } from "./preguntas.js";

// ============================================
// FUNCIONES DE EVALUACIÓN
// ============================================

export async function guardarEvaluacionCompleta(data) {
  try {
    if (!data.uid) throw new Error("UID de usuario requerido");
    if (!data.email) throw new Error("Correo electrónico requerido");
    if (!data.numeroTrabajador) throw new Error("Número de trabajador requerido");
    if (!data.sucursal) throw new Error("Sucursal requerida");
    if (!data.puestoEvaluador) throw new Error("Puesto evaluador requerido");

    if (!data.evaluaciones || Object.keys(data.evaluaciones).length === 0) {
      throw new Error("No hay evaluaciones para guardar");
    }

    const emailNormalizado = normalizarTexto(data.email);
    const numeroNormalizado = normalizarTexto(data.numeroTrabajador);

    const duplicado = await existeEvaluacion(
      data.numeroTrabajador,
      data.sucursal,
      data.puestoEvaluador,
      data.uid,
      data.email
    );

    if (duplicado) {
      throw new Error("Ya existe una evaluación registrada con esta cuenta o número de trabajador.");
    }

    const evaluacionesProcesadas = procesarEvaluaciones(data.evaluaciones);
    const promedioGeneral = calcularPromedioGeneral(evaluacionesProcesadas);

    const payload = {
      uid: data.uid,
      email: data.email.trim(),
      emailNormalizado,
      numeroTrabajador: data.numeroTrabajador.trim(),
      numeroTrabajadorNormalizado: numeroNormalizado,
      sucursal: data.sucursal.trim(),
      puestoEvaluador: data.puestoEvaluador.trim(),
      fecha: data.fecha || new Date().toISOString().split("T")[0],
      evaluaciones: evaluacionesProcesadas,
      promedioGeneral,
      estado: "completada",
      createdAt: serverTimestamp(),
      timestamp: new Date().toISOString()
    };

    const ref = await addDoc(collection(db, "evaluaciones"), payload);

    console.log("✅ Evaluación guardada con ID:", ref.id);
    return ref.id;

  } catch (error) {
    console.error("❌ Error al guardar evaluación:", error);

    if (error.code === "permission-denied") {
      throw new Error("No tienes permisos para guardar evaluaciones. Contacta al administrador.");
    }

    if (error.code === "unavailable") {
      throw new Error("El servicio no está disponible. Verifica tu conexión a internet.");
    }

    throw new Error(error.message || "Error al guardar la evaluación.");
  }
}

/**
 * Verifica duplicados por:
 * - UID
 * - correo electrónico
 * - número de trabajador
 */
export async function existeEvaluacion(
  numeroTrabajador,
  sucursal = "",
  puestoEvaluador = "",
  uid = "",
  email = ""
) {
  try {
    const numeroNormalizado = normalizarTexto(numeroTrabajador);
    const emailNormalizado = normalizarTexto(email);

    if (uid) {
      const qUid = query(
        collection(db, "evaluaciones"),
        where("uid", "==", uid)
      );

      const snapUid = await getDocs(qUid);
      if (!snapUid.empty) return true;
    }

    if (emailNormalizado) {
      const qEmailNormalizado = query(
        collection(db, "evaluaciones"),
        where("emailNormalizado", "==", emailNormalizado)
      );

      const snapEmailNormalizado = await getDocs(qEmailNormalizado);
      if (!snapEmailNormalizado.empty) return true;

      const qEmailAnterior = query(
        collection(db, "evaluaciones"),
        where("email", "==", email.trim())
      );

      const snapEmailAnterior = await getDocs(qEmailAnterior);
      if (!snapEmailAnterior.empty) return true;
    }

    if (numeroNormalizado) {
      const qNumeroNormalizado = query(
        collection(db, "evaluaciones"),
        where("numeroTrabajadorNormalizado", "==", numeroNormalizado)
      );

      const snapNumeroNormalizado = await getDocs(qNumeroNormalizado);
      if (!snapNumeroNormalizado.empty) return true;

      const qNumeroAnterior = query(
        collection(db, "evaluaciones"),
        where("numeroTrabajador", "==", numeroTrabajador.trim())
      );

      const snapNumeroAnterior = await getDocs(qNumeroAnterior);
      if (!snapNumeroAnterior.empty) return true;
    }

    return false;

  } catch (error) {
    console.error("Error verificando evaluación existente:", error);
    throw new Error("No se pudo verificar si ya existe una evaluación registrada.");
  }
}

// ============================================
// FUNCIONES DE CONSULTA
// ============================================

export async function obtenerEvaluaciones() {
  try {
    const q = query(
      collection(db, "evaluaciones"),
      orderBy("createdAt", "desc")
    );

    const snap = await getDocs(q);

    return snap.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    }));

  } catch (error) {
    console.error("Error obteniendo evaluaciones:", error);
    throw new Error(`Error al obtener evaluaciones: ${error.message}`);
  }
}

export async function obtenerEvaluacionesPorSucursal(sucursal) {
  try {
    const q = query(
      collection(db, "evaluaciones"),
      where("sucursal", "==", sucursal.trim()),
      orderBy("createdAt", "desc")
    );

    const snap = await getDocs(q);

    return snap.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    }));

  } catch (error) {
    console.error("Error obteniendo evaluaciones por sucursal:", error);
    throw new Error(`Error al obtener evaluaciones: ${error.message}`);
  }
}

export async function obtenerEvaluacionesPorPuesto(puesto) {
  try {
    const q = query(
      collection(db, "evaluaciones"),
      where("puestoEvaluador", "==", puesto.trim()),
      orderBy("createdAt", "desc")
    );

    const snap = await getDocs(q);

    return snap.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    }));

  } catch (error) {
    console.error("Error obteniendo evaluaciones por puesto:", error);
    throw new Error(`Error al obtener evaluaciones: ${error.message}`);
  }
}

export async function obtenerEstadisticasEvaluaciones() {
  try {
    const evaluaciones = await obtenerEvaluaciones();

    const stats = {
      total: evaluaciones.length,
      porSucursal: {},
      porPuesto: {},
      promedioGeneral: 0,
      areasEvaluadas: new Set()
    };

    let sumaPromedios = 0;

    evaluaciones.forEach(evalItem => {
      const suc = evalItem.sucursal || "Sin sucursal";
      stats.porSucursal[suc] = (stats.porSucursal[suc] || 0) + 1;

      const pue = evalItem.puestoEvaluador || "Sin puesto";
      stats.porPuesto[pue] = (stats.porPuesto[pue] || 0) + 1;

      Object.keys(evalItem.evaluaciones || {}).forEach(area => {
        stats.areasEvaluadas.add(area);
      });

      const prom = Number(evalItem.promedioGeneral || 0);
      if (prom > 0) sumaPromedios += prom;
    });

    stats.promedioGeneral = evaluaciones.length > 0
      ? redondear(sumaPromedios / evaluaciones.length, 1)
      : 0;

    stats.areasEvaluadas = stats.areasEvaluadas.size;

    return stats;

  } catch (error) {
    console.error("Error obteniendo estadísticas:", error);
    throw new Error(`Error al obtener estadísticas: ${error.message}`);
  }
}

// ============================================
// FUNCIONES DE PERFIL DE USUARIO
// ============================================

export async function obtenerPerfilUsuario(uid) {
  try {
    if (!uid) throw new Error("UID requerido");

    const ref = doc(db, "perfiles_usuarios", uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) return null;

    return snap.data();

  } catch (error) {
    console.error("Error obteniendo perfil:", error);
    return null;
  }
}

export async function guardarPerfilUsuario(uid, data) {
  try {
    if (!uid) throw new Error("UID requerido");
    if (!data.email) throw new Error("Email requerido");
    if (!data.numeroTrabajador) throw new Error("Número de trabajador requerido");
    if (!data.sucursal) throw new Error("Sucursal requerida");
    if (!data.puestoEvaluador) throw new Error("Puesto evaluador requerido");

    const numeroNormalizado = normalizarTexto(data.numeroTrabajador);
    const emailNormalizado = normalizarTexto(data.email);

    const yaRespondio = await existeEvaluacion(
      data.numeroTrabajador,
      data.sucursal,
      data.puestoEvaluador,
      uid,
      data.email
    );

    if (yaRespondio) {
      throw new Error("Esta cuenta o número de trabajador ya tiene una evaluación registrada.");
    }

    const ref = doc(db, "perfiles_usuarios", uid);
    const perfilExistente = await getDoc(ref);

    if (perfilExistente.exists() && perfilExistente.data().puestoBloqueado) {
      throw new Error("El perfil de este usuario ya fue registrado y no puede modificarse.");
    }

    const perfilData = {
      uid,
      email: data.email.trim(),
      emailNormalizado,
      numeroTrabajador: data.numeroTrabajador.trim(),
      numeroTrabajadorNormalizado: numeroNormalizado,
      sucursal: data.sucursal.trim(),
      puestoEvaluador: data.puestoEvaluador.trim(),
      puestoBloqueado: true,
      fechaRegistro: new Date().toISOString(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await setDoc(ref, perfilData, { merge: true });

    console.log("✅ Perfil guardado correctamente para:", uid);
    return true;

  } catch (error) {
    console.error("❌ Error guardando perfil:", error);

    if (error.code === "permission-denied") {
      throw new Error("No tienes permisos para guardar el perfil. Contacta al administrador.");
    }

    throw new Error(`Error al guardar perfil: ${error.message}`);
  }
}

export async function perfilBloqueado(uid) {
  try {
    const perfil = await obtenerPerfilUsuario(uid);
    return perfil?.puestoBloqueado === true;
  } catch (error) {
    console.error("Error verificando bloqueo de perfil:", error);
    return false;
  }
}

// ============================================
// FUNCIONES DE PROCESAMIENTO
// ============================================

function procesarEvaluaciones(evaluaciones) {
  const resultado = {};

  Object.entries(evaluaciones || {}).forEach(([areaKey, data]) => {
    const banco = obtenerPreguntas(areaKey);

    if (!banco) {
      console.warn(`⚠️ No se encontró banco de preguntas para: ${areaKey}`);
      return;
    }

    const respuestas = data.respuestas || {};

    const respuestasLimpias = {};

    Object.entries(respuestas).forEach(([key, value]) => {
      const keyLimpia = key.trim();
      respuestasLimpias[keyLimpia] = value;
    });

    const promedio = calcularPromedio(respuestasLimpias);

    const promedioCompetencias = calcularPromedioPorCompetencia(
      banco.preguntas,
      respuestasLimpias
    );

    resultado[areaKey] = {
      area: banco.titulo,
      completado: data.completado || false,
      respuestas: respuestasLimpias,
      promedio: redondear(promedio, 1),
      promedioCompetencias,
      totalPreguntas: Object.keys(respuestasLimpias).length,
      preguntasRespondidas: Object.values(respuestasLimpias)
        .filter(r => r !== null && r !== undefined).length
    };
  });

  return resultado;
}

function calcularPromedioGeneral(evaluaciones) {
  const promedios = Object.values(evaluaciones || {})
    .map(area => Number(area.promedio))
    .filter(valor => !Number.isNaN(valor) && valor > 0);

  if (promedios.length === 0) return 0;

  const suma = promedios.reduce((a, b) => a + b, 0);
  return redondear(suma / promedios.length, 1);
}

function normalizarTexto(valor) {
  return String(valor || "")
    .trim()
    .toLowerCase();
}

// ============================================
// FUNCIONES DE MANTENIMIENTO
// ============================================

export async function eliminarEvaluacion(id) {
  try {
    const ref = doc(db, "evaluaciones", id);
    await deleteDoc(ref);
    console.log("✅ Evaluación eliminada:", id);
  } catch (error) {
    console.error("Error eliminando evaluación:", error);
    throw new Error(`Error al eliminar: ${error.message}`);
  }
}

export async function obtenerEvaluacionPorId(id) {
  try {
    const ref = doc(db, "evaluaciones", id);
    const snap = await getDoc(ref);

    if (!snap.exists()) return null;

    return {
      id: snap.id,
      ...snap.data()
    };
  } catch (error) {
    console.error("Error obteniendo evaluación:", error);
    return null;
  }
}