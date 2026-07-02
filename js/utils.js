// js/utils.js

export function calcularPromedio(respuestas) {
  const valores = Object.values(respuestas)
    .map(Number)
    .filter(valor => !Number.isNaN(valor));

  if (valores.length === 0) return 0;

  const suma = valores.reduce((total, valor) => total + valor, 0);
  return suma / valores.length;
}

export function redondear(numero, decimales = 1) {
  return Number(numero.toFixed(decimales));
}

export function validarPreguntasContestadas(preguntas, respuestas) {
  return preguntas.every(pregunta => {
    const valor = respuestas[`q${pregunta.id}`];
    return valor !== undefined && valor !== null && valor !== "";
  });
}

export function calcularPromedioPorCompetencia(preguntas, respuestas) {
  const grupos = {};

  preguntas.forEach(pregunta => {
    const competencia = pregunta.competencia || "General";

    if (!grupos[competencia]) {
      grupos[competencia] = [];
    }

    const valor = Number(respuestas[`q${pregunta.id}`]);

    if (!Number.isNaN(valor)) {
      grupos[competencia].push(valor);
    }
  });

  const resultado = {};

  Object.entries(grupos).forEach(([competencia, valores]) => {
    if (valores.length === 0) {
      resultado[competencia] = 0;
      return;
    }

    const promedio = valores.reduce((a, b) => a + b, 0) / valores.length;
    resultado[competencia] = redondear(promedio, 1);
  });

  return resultado;
}

export function obtenerFechaActual() {
  const fecha = new Date();
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, "0");
  const day = String(fecha.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function limpiarTextoParaId(texto) {
  return String(texto)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function mostrarEstado(elemento, tipo, mensaje) {
  if (!elemento) return;

  elemento.className = `status show ${tipo}`;
  elemento.textContent = mensaje;
}

export function ocultarEstado(elemento) {
  if (!elemento) return;

  elemento.className = "status";
  elemento.textContent = "";
}