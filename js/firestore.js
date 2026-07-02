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
  writeBatch,  // Para operaciones atómicas
  increment,   // Para contadores
  arrayUnion,  // Para arrays
  Timestamp,
  deleteDoc,
  updateDoc,
  limit,
  startAfter
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

/**
 * Guarda una evaluación completa en Firestore
 * @param {Object} data - Datos de la evaluación
 * @returns {Promise<string>} - ID del documento creado
 */
export async function guardarEvaluacionCompleta(data) {
  try {
    // Validaciones básicas
    if (!data.uid) throw new Error("UID de usuario requerido");
    if (!data.evaluaciones || Object.keys(data.evaluaciones).length === 0) {
      throw new Error("No hay evaluaciones para guardar");
    }
    if (!data.numeroTrabajador) throw new Error("Número de trabajador requerido");
    if (!data.sucursal) throw new Error("Sucursal requerida");
    if (!data.puestoEvaluador) throw new Error("Puesto evaluador requerido");

    // Procesar evaluaciones
    const evaluacionesProcesadas = procesarEvaluaciones(data.evaluaciones);
    
    // Calcular promedio general
    const promedioGeneral = calcularPromedioGeneral(evaluacionesProcesadas);
    
    // Construir payload
    const payload = {
      uid: data.uid,
      email: data.email || "",
      numeroTrabajador: data.numeroTrabajador.trim(),
      sucursal: data.sucursal.trim(),
      puestoEvaluador: data.puestoEvaluador.trim(),
      fecha: data.fecha || new Date().toISOString().split('T')[0],
      evaluaciones: evaluacionesProcesadas,
      promedioGeneral: promedioGeneral,
      createdAt: serverTimestamp(),
      // Metadatos adicionales
      estado: "completada",
      timestamp: new Date().toISOString()
    };

    // Guardar en Firestore
    const ref = await addDoc(collection(db, "evaluaciones"), payload);
    
    console.log("✅ Evaluación guardada con ID:", ref.id);
    return ref.id;

  } catch (error) {
    console.error("❌ Error al guardar evaluación:", error);
    
    // Mejorar mensaje de error según el tipo
    if (error.code === 'permission-denied') {
      throw new Error("No tienes permisos para guardar evaluaciones. Contacta al administrador.");
    } else if (error.code === 'unavailable') {
      throw new Error("El servicio no está disponible. Verifica tu conexión a internet.");
    } else {
      throw new Error(`Error al guardar: ${error.message}`);
    }
  }
}

/**
 * Verifica si ya existe una evaluación con los mismos datos
 * @param {string} numeroTrabajador - Número de trabajador
 * @param {string} sucursal - Sucursal
 * @param {string} puestoEvaluador - Puesto del evaluador
 * @param {string} uid - ID del usuario
 * @returns {Promise<boolean>} - true si existe
 */
export async function existeEvaluacion(numeroTrabajador, sucursal, puestoEvaluador, uid) {
  try {
    const q = query(
      collection(db, "evaluaciones"),
      where("uid", "==", uid),
      where("numeroTrabajador", "==", numeroTrabajador.trim()),
      where("sucursal", "==", sucursal.trim()),
      where("puestoEvaluador", "==", puestoEvaluador.trim())
    );

    const snap = await getDocs(q);
    return !snap.empty;

  } catch (error) {
    console.error("Error verificando evaluación existente:", error);
    // En caso de error, permitir el guardado
    return false;
  }
}

/**
 * Obtiene todas las evaluaciones (solo para admin)
 * @returns {Promise<Array>} - Lista de evaluaciones
 */
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

/**
 * Obtiene evaluaciones filtradas por sucursal
 * @param {string} sucursal - Nombre de la sucursal
 * @returns {Promise<Array>} - Lista de evaluaciones
 */
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

/**
 * Obtiene evaluaciones filtradas por puesto
 * @param {string} puesto - Puesto evaluador
 * @returns {Promise<Array>} - Lista de evaluaciones
 */
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

/**
 * Obtiene estadísticas de evaluaciones
 * @returns {Promise<Object>} - Estadísticas
 */
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
      // Por sucursal
      const suc = evalItem.sucursal || "Sin sucursal";
      stats.porSucursal[suc] = (stats.porSucursal[suc] || 0) + 1;

      // Por puesto
      const pue = evalItem.puestoEvaluador || "Sin puesto";
      stats.porPuesto[pue] = (stats.porPuesto[pue] || 0) + 1;

      // Áreas evaluadas
      Object.keys(evalItem.evaluaciones || {}).forEach(area => {
        stats.areasEvaluadas.add(area);
      });

      // Promedio general
      const prom = Number(evalItem.promedioGeneral || 0);
      if (prom > 0) {
        sumaPromedios += prom;
      }
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

/**
 * Obtiene el perfil de un usuario
 * @param {string} uid - ID del usuario
 * @returns {Promise<Object|null>} - Datos del perfil o null
 */
export async function obtenerPerfilUsuario(uid) {
  try {
    if (!uid) throw new Error("UID requerido");

    const ref = doc(db, "perfiles_usuarios", uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) return null;

    return snap.data();

  } catch (error) {
    console.error("Error obteniendo perfil:", error);
    // No lanzar error para no interrumpir el flujo
    return null;
  }
}

/**
 * Guarda o actualiza el perfil de un usuario
 * @param {string} uid - ID del usuario
 * @param {Object} data - Datos del perfil
 * @returns {Promise<boolean>} - true si se guardó correctamente
 */
export async function guardarPerfilUsuario(uid, data) {
  try {
    if (!uid) throw new Error("UID requerido");
    if (!data.email) throw new Error("Email requerido");
    if (!data.numeroTrabajador) throw new Error("Número de trabajador requerido");
    if (!data.sucursal) throw new Error("Sucursal requerida");
    if (!data.puestoEvaluador) throw new Error("Puesto evaluador requerido");

    const ref = doc(db, "perfiles_usuarios", uid);
    const perfilExistente = await getDoc(ref);

    // Si el perfil ya existe y está bloqueado, no permitir modificar
    if (perfilExistente.exists() && perfilExistente.data().puestoBloqueado) {
      throw new Error("El perfil de este usuario ya fue registrado y no puede modificarse.");
    }

    // Datos del perfil
    const perfilData = {
      uid: uid,
      email: data.email.trim(),
      numeroTrabajador: data.numeroTrabajador.trim(),
      sucursal: data.sucursal.trim(),
      puestoEvaluador: data.puestoEvaluador.trim(),
      puestoBloqueado: true,
      fechaRegistro: new Date().toISOString(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    // Si el perfil ya existe, actualizar sin cambiar puestoBloqueado
    if (perfilExistente.exists()) {
      await setDoc(ref, {
        ...perfilData,
        puestoBloqueado: perfilExistente.data().puestoBloqueado || true,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } else {
      // Crear nuevo perfil
      await setDoc(ref, perfilData);
    }

    console.log("✅ Perfil guardado correctamente para:", uid);
    return true;

  } catch (error) {
    console.error("❌ Error guardando perfil:", error);
    
    if (error.code === 'permission-denied') {
      throw new Error("No tienes permisos para guardar el perfil. Contacta al administrador.");
    } else {
      throw new Error(`Error al guardar perfil: ${error.message}`);
    }
  }
}

/**
 * Verifica si un perfil existe y está bloqueado
 * @param {string} uid - ID del usuario
 * @returns {Promise<boolean>} - true si el perfil está bloqueado
 */
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

/**
 * Procesa las evaluaciones para guardar en Firestore
 * @param {Object} evaluaciones - Evaluaciones por área
 * @returns {Object} - Evaluaciones procesadas
 * 
 * 🔥 ÚNICA MEJORA: Se limpian las claves de las respuestas
 */
function procesarEvaluaciones(evaluaciones) {
  const resultado = {};

  Object.entries(evaluaciones || {}).forEach(([areaKey, data]) => {
    const banco = obtenerPreguntas(areaKey);

    if (!banco) {
      console.warn(`⚠️ No se encontró banco de preguntas para: ${areaKey}`);
      return;
    }

    const respuestas = data.respuestas || {};
    
    // ✅ ÚNICA MEJORA: Limpiar las claves de las respuestas
    const respuestasLimpias = {};
    Object.entries(respuestas).forEach(([key, value]) => {
      const keyLimpia = key.trim();
      respuestasLimpias[keyLimpia] = value;
    });

    // Calcular promedios
    const promedio = calcularPromedio(respuestasLimpias);
    const promedioCompetencias = calcularPromedioPorCompetencia(
      banco.preguntas,
      respuestasLimpias
    );

    resultado[areaKey] = {
      area: banco.titulo,
      completado: data.completado || false,
      respuestas: respuestasLimpias, // ← Usar respuestas limpias
      promedio: redondear(promedio, 1),
      promedioCompetencias: promedioCompetencias,
      // Contar respuestas por área
      totalPreguntas: Object.keys(respuestasLimpias).length,
      preguntasRespondidas: Object.values(respuestasLimpias).filter(r => r !== null && r !== undefined).length
    };
  });

  return resultado;
}

/**
 * Calcula el promedio general de todas las áreas
 * @param {Object} evaluaciones - Evaluaciones procesadas
 * @returns {number} - Promedio general
 */
function calcularPromedioGeneral(evaluaciones) {
  const promedios = Object.values(evaluaciones || {})
    .map(area => Number(area.promedio))
    .filter(valor => !Number.isNaN(valor) && valor > 0);

  if (promedios.length === 0) return 0;

  const suma = promedios.reduce((a, b) => a + b, 0);
  return redondear(suma / promedios.length, 1);
}

// ============================================
// FUNCIONES DE MANTENIMIENTO
// ============================================

/**
 * Elimina una evaluación por ID (solo admin)
 * @param {string} id - ID de la evaluación
 * @returns {Promise<void>}
 */
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

/**
 * Obtiene evaluación por ID
 * @param {string} id - ID de la evaluación
 * @returns {Promise<Object|null>} - Datos de la evaluación
 */
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