// js/dashboard.js

import { obtenerEvaluaciones } from "./firestore.js";
import { obtenerNombreArea } from "./evaluados.js";
import { exportarExcel } from "./excel.js";
import { obtenerPreguntas } from "./preguntas.js";

let evaluaciones = [];
let charts = {};

export async function cargarDashboard() {
  const dashboard = document.getElementById("adminPanel");
  const dashboardBody = document.getElementById("dashboardContent");
  const btnExportExcel = document.getElementById("btnExportExcel");

  if (!dashboard || !dashboardBody) return;

  dashboard.classList.remove("hidden");
  dashboardBody.innerHTML = `<div class="info">Cargando evaluaciones...</div>`;

  if (btnExportExcel) {
    btnExportExcel.onclick = exportarExcel;
  }

  try {
    evaluaciones = await obtenerEvaluaciones();
    renderDashboard(dashboardBody);
  } catch (error) {
    console.error(error);
    dashboardBody.innerHTML = `
      <div class="status show error">
        Error al cargar el dashboard. Verifica permisos de Firestore.
      </div>
    `;
  }
}

function renderDashboard(container) {
  if (!evaluaciones.length) {
    container.innerHTML = `<div class="empty-state">No hay evaluaciones registradas.</div>`;
    return;
  }

  container.innerHTML = `
    <div class="filter-row" style="margin-bottom:18px;">
      <div class="filter-box">
        <label for="filtroSucursal">Filtrar por sucursal</label>
        <select id="filtroSucursal">
          <option value="TODAS">Todas las sucursales</option>
          ${obtenerSucursales(evaluaciones).map(s => `<option value="${s}">${s}</option>`).join("")}
        </select>
      </div>

      <div class="filter-box">
        <label for="filtroPuesto">Filtrar por puesto evaluador</label>
        <select id="filtroPuesto">
          <option value="TODOS">Todos los puestos</option>
          ${obtenerPuestos(evaluaciones).map(p => `<option value="${p}">${p}</option>`).join("")}
        </select>
      </div>
    </div>

    <div id="dashboardRender"></div>
  `;

  document.getElementById("filtroSucursal").addEventListener("change", actualizarVista);
  document.getElementById("filtroPuesto").addEventListener("change", actualizarVista);

  actualizarVista();
}

function actualizarVista() {
  const sucursal = document.getElementById("filtroSucursal")?.value || "TODAS";
  const puesto = document.getElementById("filtroPuesto")?.value || "TODOS";

  let data = [...evaluaciones];

  if (sucursal !== "TODAS") {
    data = data.filter(item => item.sucursal === sucursal);
  }

  if (puesto !== "TODOS") {
    data = data.filter(item => item.puestoEvaluador === puesto);
  }

  const container = document.getElementById("dashboardRender");

  if (!data.length) {
    container.innerHTML = `<div class="empty-state">No hay evaluaciones con los filtros seleccionados.</div>`;
    destruirGraficas();
    return;
  }

  const resumenAreas = calcularResumenPorArea(data);
  const resumenSucursales = calcularResumenPorSucursal(data);
  const oportunidades = calcularOportunidades(resumenAreas);

  container.innerHTML = `
    <div class="grid grid-4">
      <div class="overview-card">
        <div class="overview-title">Total de evaluaciones</div>
        <div class="overview-value">${data.length}</div>
        <div class="overview-sub">Formularios guardados.</div>
      </div>

      <div class="overview-card">
        <div class="overview-title">Promedio general</div>
        <div class="overview-value">${calcularPromedioGeneral(data)} / 10</div>
        <div class="overview-sub">Promedio global filtrado.</div>
      </div>

      <div class="overview-card">
        <div class="overview-title">Sucursales evaluadas</div>
        <div class="overview-value">${contarSucursales(data)}</div>
        <div class="overview-sub">Sucursales con respuestas.</div>
      </div>

      <div class="overview-card">
        <div class="overview-title">Áreas evaluadas</div>
        <div class="overview-value">${Object.keys(resumenAreas).length}</div>
        <div class="overview-sub">Áreas dentro del periodo.</div>
      </div>
    </div>

    <div class="dashboard-grid" style="margin-top:18px;">
      <div class="chart-card">
        <div class="chart-title">Promedio por área evaluada</div>
        <div class="soft-text">Escala de 1 a 10.</div>
        <div class="chart-wrap"><canvas id="chartAreas"></canvas></div>
      </div>

      <div class="chart-card">
        <div class="chart-title">Promedio por sucursal</div>
        <div class="soft-text">Comparativo general por sucursal.</div>
        <div class="chart-wrap"><canvas id="chartSucursales"></canvas></div>
      </div>
    </div>

    <div class="dashboard-grid" style="margin-top:18px;">
      <div class="chart-card">
        <div class="chart-title">Áreas con mayor oportunidad de mejora</div>
        <div class="soft-text">Menores promedios por área evaluada.</div>
        <div class="chart-wrap"><canvas id="chartOportunidades"></canvas></div>
      </div>

      <div class="chart-card">
        <div class="chart-title">Distribución por puesto evaluador</div>
        <div class="soft-text">Cantidad de evaluaciones por puesto.</div>
        <div class="chart-wrap small"><canvas id="chartPuestos"></canvas></div>
      </div>
    </div>

    <div class="card" style="margin-top:20px;">
      <div class="section-header">📊 Resumen por área con desglose de preguntas</div>
      <div class="section-body">
        ${renderResumenAreasConPreguntas(resumenAreas, data)}
      </div>
    </div>

    <div class="card">
      <div class="section-header">🔍 Respuestas individuales</div>
      <div class="section-body">
        <div class="selector-row">
          <div style="flex:1; min-width:280px;">
            <label for="responseSelector">Selecciona una evaluación</label>
            <select id="responseSelector">
              <option value="">Selecciona una respuesta</option>
              ${data.map(item => `
                <option value="${item.id}">
                  ${item.fecha || "-"} | ${item.numeroTrabajador || "-"} | ${item.sucursal || "-"} | ${item.puestoEvaluador || "-"}
                </option>
              `).join("")}
            </select>
          </div>

          <div class="user-badge" id="selectedResponse">Sin selección</div>
        </div>

        <div id="individualResponseContent" style="margin-top:18px;"></div>
      </div>
    </div>

    <div class="card">
      <div class="section-header">📋 Evaluaciones registradas</div>
      <div class="section-body">
        ${renderTablaEvaluaciones(data)}
      </div>
    </div>
  `;

  renderGraficas(resumenAreas, resumenSucursales, oportunidades, data);
  configurarSelectorIndividual(data);
}

// ============================================
// CONVERSIÓN DE ESCALA: 1-5 → 1-10
// ============================================

function convertirAEscala10(valor) {
  return Number((valor * 2).toFixed(1));
}

function convertirPromedioAEscala10(promedio) {
  return Number((promedio * 2).toFixed(1));
}

// ============================================
// GRÁFICAS
// ============================================

function renderGraficas(resumenAreas, resumenSucursales, oportunidades, data) {
  destruirGraficas();

  const areasLabels = Object.values(resumenAreas).map(a => a.area);
  const areasValues = Object.values(resumenAreas).map(a => 
    convertirPromedioAEscala10(promedio(a.suma, a.total))
  );

  charts.areas = crearBarChart("chartAreas", areasLabels, areasValues);

  const sucLabels = Object.keys(resumenSucursales);
  const sucValues = Object.values(resumenSucursales).map(s => 
    convertirPromedioAEscala10(promedio(s.suma, s.total))
  );

  charts.sucursales = crearBarChart("chartSucursales", sucLabels, sucValues);

  charts.oportunidades = crearHorizontalBarChart(
    "chartOportunidades",
    oportunidades.map(o => o.area),
    oportunidades.map(o => convertirPromedioAEscala10(o.promedio))
  );

  const puestos = contarPorPuesto(data);
  charts.puestos = crearDoughnutChart(
    "chartPuestos",
    Object.keys(puestos),
    Object.values(puestos)
  );
}

function crearBarChart(canvasId, labels, data) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof Chart === "undefined") return null;

  return new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Promedio /10",
        data,
        borderRadius: 10,
        backgroundColor: [
          '#6d28d9', '#7c3aed', '#8b5cf6', '#a78bfa', 
          '#c4b5fd', '#ddd6fe', '#ede9fe'
        ]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true, max: 10 }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}

function crearHorizontalBarChart(canvasId, labels, data) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof Chart === "undefined") return null;

  return new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Promedio /10",
        data,
        borderRadius: 10,
        backgroundColor: [
          '#f59e0b', '#fbbf24', '#fcd34d', '#fde68a', 
          '#fef3c7', '#fffbeb'
        ]
      }]
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { beginAtZero: true, max: 10 }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}

function crearDoughnutChart(canvasId, labels, data) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof Chart === "undefined") return null;

  return new Chart(canvas, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: [
          '#6d28d9', '#7c3aed', '#8b5cf6', '#a78bfa',
          '#c4b5fd', '#ddd6fe', '#ede9fe'
        ]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

function destruirGraficas() {
  Object.values(charts).forEach(chart => {
    if (chart) chart.destroy();
  });
  charts = {};
}

// ============================================
// CÁLCULOS
// ============================================

function calcularResumenPorArea(data) {
  const resumen = {};

  data.forEach(item => {
    Object.entries(item.evaluaciones || {}).forEach(([areaKey, areaData]) => {
      if (!resumen[areaKey]) {
        resumen[areaKey] = {
          area: areaData.area || obtenerNombreArea(areaKey),
          total: 0,
          suma: 0,
          competencias: {},
          todasLasRespuestas: []
        };
      }

      const promedioArea = Number(areaData.promedio || 0);
      resumen[areaKey].total++;
      resumen[areaKey].suma += promedioArea;

      if (areaData.respuestas) {
        resumen[areaKey].todasLasRespuestas.push(areaData.respuestas);
      }

      Object.entries(areaData.promedioCompetencias || {}).forEach(([competencia, valor]) => {
        if (!resumen[areaKey].competencias[competencia]) {
          resumen[areaKey].competencias[competencia] = {
            total: 0,
            suma: 0,
            respuestas: []
          };
        }

        resumen[areaKey].competencias[competencia].total++;
        resumen[areaKey].competencias[competencia].suma += Number(valor || 0);
      });
    });
  });

  return resumen;
}

function calcularResumenPorSucursal(data) {
  const resumen = {};

  data.forEach(item => {
    const sucursal = item.sucursal || "Sin sucursal";

    if (!resumen[sucursal]) {
      resumen[sucursal] = { total: 0, suma: 0 };
    }

    resumen[sucursal].total++;
    resumen[sucursal].suma += Number(item.promedioGeneral || 0);
  });

  return resumen;
}

function calcularOportunidades(resumenAreas) {
  return Object.values(resumenAreas)
    .map(item => ({
      area: item.area,
      promedio: promedio(item.suma, item.total)
    }))
    .sort((a, b) => a.promedio - b.promedio)
    .slice(0, 8);
}

// ============================================
// OBTENER TEXTO DE PREGUNTA POR ID
// ============================================

function obtenerTextoPregunta(areaKey, preguntaId) {
  try {
    const banco = obtenerPreguntas(areaKey);
    if (!banco || !banco.preguntas) return preguntaId;

    const pregunta = banco.preguntas.find(p => p.id === preguntaId);
    return pregunta ? pregunta.texto : preguntaId;
  } catch (error) {
    return preguntaId;
  }
}

// ============================================
// RENDER DE RESUMEN POR ÁREA CON DESGLOSE DE PREGUNTAS
// ============================================

function renderResumenAreasConPreguntas(resumenAreas, data) {
  return Object.entries(resumenAreas).map(([areaKey, areaData]) => {
    const prom = promedio(areaData.suma, areaData.total);
    const promEscala10 = convertirPromedioAEscala10(prom);

    return `
      <div class="metric-card" style="margin-bottom:24px; border: 2px solid var(--border); border-radius: 16px; padding: 20px; background: #fcfcff;">
        <div class="metric-title" style="font-size: 20px; margin-bottom: 12px; color: var(--primary);">
          📂 ${areaData.area}
        </div>

        <div class="metric-row">
          <span class="pill score">⭐ Promedio: ${promEscala10} / 10</span>
          <span class="pill count">📊 Evaluaciones: ${areaData.total}</span>
          <span class="pill ${claseInterpretacion(promEscala10)}">${interpretacion(promEscala10)}</span>
        </div>

        <div class="bar">
          <div style="width:${Math.min((promEscala10 / 10) * 100, 100)}%"></div>
        </div>

        <div style="margin-top: 20px;">
          <div style="font-weight: 700; color: var(--muted); margin-bottom: 12px; font-size: 15px; border-bottom: 2px solid #ede9fe; padding-bottom: 8px;">
            📋 Desglose detallado por competencia y pregunta:
          </div>
          ${renderCompetenciasConPreguntasDetallado(areaData.competencias, areaKey, data)}
        </div>
      </div>
    `;
  }).join("");
}

// ============================================
// RENDER DE COMPETENCIAS CON PREGUNTAS DETALLADO
// ============================================

function renderCompetenciasConPreguntasDetallado(competencias, areaKey, data) {
  if (!competencias || Object.keys(competencias).length === 0) {
    return `<div class="empty-state" style="padding: 12px;">Sin competencias registradas</div>`;
  }

  return Object.entries(competencias).map(([nombre, compData]) => {
    const prom = promedio(compData.suma, compData.total);
    const promEscala10 = convertirPromedioAEscala10(prom);

    // Obtener todas las respuestas individuales para esta competencia
    const todasRespuestas = [];
    data.forEach(item => {
      const area = item.evaluaciones?.[areaKey];
      if (area && area.respuestas) {
        Object.entries(area.respuestas).forEach(([preguntaId, valor]) => {
          const textoPregunta = obtenerTextoPregunta(areaKey, preguntaId);
          todasRespuestas.push({
            id: preguntaId,
            texto: textoPregunta,
            valor: Number(valor) || 0,
            evaluacion: item.numeroTrabajador || "Anónimo"
          });
        });
      }
    });

    // Agrupar respuestas por pregunta
    const preguntasAgrupadas = {};
    todasRespuestas.forEach(r => {
      if (!preguntasAgrupadas[r.id]) {
        preguntasAgrupadas[r.id] = {
          texto: r.texto,
          valores: [],
          evaluaciones: []
        };
      }
      preguntasAgrupadas[r.id].valores.push(r.valor);
      preguntasAgrupadas[r.id].evaluaciones.push(r.evaluacion);
    });

    return `
      <div class="response-item" style="margin-bottom: 16px; border-left: 4px solid #8b5cf6; background: #ffffff; padding: 14px; border-radius: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <strong style="font-size: 16px; color: #4c1d95;">${nombre}</strong>
          <span style="font-weight: 700; color: #6d28d9; font-size: 15px;">⭐ ${promEscala10} / 10</span>
        </div>

        <div style="margin-top: 10px; padding: 12px; background: #f9fafb; border-radius: 8px;">
          <div style="font-weight: 600; color: var(--muted); font-size: 13px; margin-bottom: 8px;">
            📝 Preguntas y calificaciones:
          </div>
          ${Object.entries(preguntasAgrupadas).length > 0 ? `
            <div style="display: grid; grid-template-columns: 1fr; gap: 6px;">
              ${Object.entries(preguntasAgrupadas).map(([id, p]) => {
                return p.valores.map((valor, index) => {
                  const valorEscala10 = convertirAEscala10(valor);
                  const evaluacion = p.evaluaciones[index] || "Anónimo";
                  return `
                    <div style="padding: 8px 12px; border-bottom: 1px solid #f3f4f6; background: white; border-radius: 6px;">
                      <div style="display: flex; flex-direction: column; gap: 4px;">
                        <div style="font-size: 14px; color: #1f2937; font-weight: 500;">
                          ${p.texto}
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                          <span style="font-size: 12px; color: #9ca3af;">
                            👤 ${evaluacion}
                          </span>
                          <span style="font-weight: 700; color: #6d28d9; font-size: 14px;">
                            ${valor} → ${valorEscala10} / 10
                          </span>
                        </div>
                      </div>
                    </div>
                  `;
                }).join("");
              }).join("")}
            </div>
          ` : `
            <div style="color: #9ca3af; font-size: 13px; padding: 8px;">
              No hay respuestas individuales disponibles
            </div>
          `}
        </div>

        <div style="font-size: 13px; color: var(--muted); margin-top: 8px; display: flex; gap: 16px; flex-wrap: wrap;">
          <span>📊 ${compData.total} respuestas</span>
          <span>📈 Promedio escala 1-5: ${prom}</span>
          <span>🎯 ${Object.keys(preguntasAgrupadas).length} preguntas</span>
        </div>
      </div>
    `;
  }).join("");
}

// ============================================
// RENDER DE RESPUESTA INDIVIDUAL
// ============================================

function renderRespuestaIndividual(item) {
  return `
    <div class="response-card" style="padding: 20px;">
      <h4 style="display: flex; justify-content: space-between; align-items: center;">
        <span>📋 Evaluación individual</span>
        <span class="pill score">⭐ ${convertirPromedioAEscala10(item.promedioGeneral || 0)} / 10</span>
      </h4>

      <div class="response-meta" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 8px; background: #f9fafb; padding: 12px; border-radius: 8px;">
        <div><strong>📅 Fecha:</strong> ${item.fecha || "-"}</div>
        <div><strong>👤 Número:</strong> ${item.numeroTrabajador || "-"}</div>
        <div><strong>🏢 Sucursal:</strong> ${item.sucursal || "-"}</div>
        <div><strong>👔 Puesto:</strong> ${item.puestoEvaluador || "-"}</div>
        <div><strong>✉️ Correo:</strong> ${item.email || "-"}</div>
      </div>

      ${Object.entries(item.evaluaciones || {}).map(([areaKey, area]) => {
        const promEscala10 = convertirPromedioAEscala10(area.promedio || 0);
        
        return `
          <div class="metric-card" style="margin-bottom:16px; border: 1px solid var(--border); border-radius: 12px; padding: 16px;">
            <div class="metric-title" style="font-size: 16px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
              <span>${area.area || obtenerNombreArea(areaKey)}</span>
              <span class="pill score">⭐ ${promEscala10} / 10</span>
            </div>

            ${area.respuestas ? `
              <div style="margin-top: 12px; padding: 12px; background: #f9fafb; border-radius: 8px;">
                <div style="font-weight: 600; color: var(--muted); font-size: 13px; margin-bottom: 8px;">
                  📝 Respuestas por pregunta:
                </div>
                ${Object.entries(area.respuestas).map(([preguntaId, respuesta]) => {
                  const valorEscala10 = convertirAEscala10(Number(respuesta) || 0);
                  const textoPregunta = obtenerTextoPregunta(areaKey, preguntaId);
                  return `
                    <div style="padding: 6px 10px; border-bottom: 1px solid #f3f4f6; font-size: 14px;">
                      <div style="color: #1f2937; font-weight: 500; margin-bottom: 2px;">
                        ${textoPregunta}
                      </div>
                      <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="color: #6b7280; font-size: 12px;">ID: ${preguntaId}</span>
                        <span style="font-weight: 700; color: #6d28d9;">
                          ${respuesta} → ${valorEscala10} / 10
                        </span>
                      </div>
                    </div>
                  `;
                }).join("")}
              </div>
            ` : ''}
          </div>
        `;
      }).join("")}
    </div>
  `;
}

// ============================================
// CONFIGURAR SELECTOR INDIVIDUAL
// ============================================

function configurarSelectorIndividual(data) {
  const selector = document.getElementById("responseSelector");
  const badge = document.getElementById("selectedResponse");
  const content = document.getElementById("individualResponseContent");

  if (!selector || !badge || !content) return;

  selector.addEventListener("change", () => {
    const id = selector.value;

    if (!id) {
      badge.textContent = "Sin selección";
      content.innerHTML = "";
      return;
    }

    const item = data.find(e => e.id === id);

    if (!item) return;

    badge.textContent = `${item.numeroTrabajador || "-"} | ${item.sucursal || "-"} | ${item.puestoEvaluador || "-"}`;
    content.innerHTML = renderRespuestaIndividual(item);
  });
}

// ============================================
// TABLA DE EVALUACIONES
// ============================================

function renderTablaEvaluaciones(data) {
  return `
    <div style="overflow-x:auto;">
      <table class="data-table">
        <thead>
          <tr>
            <th>📅 Fecha</th>
            <th>👤 Número</th>
            <th>🏢 Sucursal</th>
            <th>👔 Puesto</th>
            <th>✉️ Correo</th>
            <th>⭐ Promedio</th>
          </tr>
        </thead>

        <tbody>
          ${data.map(item => `
            <tr>
              <td>${item.fecha || "-"}</td>
              <td><strong>${item.numeroTrabajador || "-"}</strong></td>
              <td>${item.sucursal || "-"}</td>
              <td>${item.puestoEvaluador || "-"}</td>
              <td>${item.email || "-"}</td>
              <td>
                <span class="pill ${claseInterpretacion(convertirPromedioAEscala10(item.promedioGeneral || 0))}">
                  ${convertirPromedioAEscala10(item.promedioGeneral || 0)} / 10
                </span>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================

function calcularPromedioGeneral(data) {
  const valores = data
    .map(item => Number(item.promedioGeneral || 0))
    .filter(v => !Number.isNaN(v) && v > 0);

  if (!valores.length) return "0.0";

  const prom = promedio(valores.reduce((a, b) => a + b, 0), valores.length);
  return convertirPromedioAEscala10(prom);
}

function contarSucursales(data) {
  return new Set(data.map(item => item.sucursal).filter(Boolean)).size;
}

function contarPorPuesto(data) {
  const conteo = {};

  data.forEach(item => {
    const puesto = item.puestoEvaluador || "Sin puesto";
    conteo[puesto] = (conteo[puesto] || 0) + 1;
  });

  return conteo;
}

function obtenerSucursales(data) {
  return [...new Set(data.map(item => item.sucursal).filter(Boolean))].sort();
}

function obtenerPuestos(data) {
  return [...new Set(data.map(item => item.puestoEvaluador).filter(Boolean))].sort();
}

function promedio(suma, total) {
  if (!total) return "0.0";
  return (Number(suma) / Number(total)).toFixed(1);
}

// ============================================
// INTERPRETACIÓN EN ESCALA 1-10
// ============================================

function interpretacion(promedio) {
  const p = Number(promedio);

  if (p >= 9.0) return "🌟 Excelente";
  if (p >= 8.0) return "👍 Muy bien";
  if (p >= 7.0) return "📊 Bueno";
  if (p >= 6.0) return "📈 Aceptable";
  return "💪 Área por fortalecer";
}

function claseInterpretacion(promedio) {
  const p = Number(promedio);

  if (p >= 9.0) return "excelente";
  if (p >= 8.0) return "muybien";
  if (p >= 7.0) return "regular";
  if (p >= 6.0) return "aceptable";
  return "mejorar";
}