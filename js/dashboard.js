// js/dashboard.js

import { obtenerEvaluaciones } from "./firestore.js";
import { obtenerNombreArea } from "./evaluados.js";
import { exportarExcel } from "./excel.js";
import { obtenerPreguntas } from "./preguntas.js";

let evaluaciones = [];
let charts = {};

// ============================================
// CONFIGURACIÓN DE ÁREAS SEGÚN ESTRUCTURA ORGANIZACIONAL
// ============================================

const AREAS_EVALUACION = {
  marketing: { nombre: "Marketing", evaluadores: ["Gerente", "Gerente de ventas", "Gerencia administrativa"] },
  recursosHumanos: { nombre: "Recursos Humanos", evaluadores: ["Gerente", "Gerente de ventas", "Gerencia administrativa"] },
  areaSistemas: { nombre: "Área de Sistemas", evaluadores: ["Gerente", "Gerente de ventas", "Gerencia administrativa"] },
  areaCompras: { nombre: "Área de Compras", evaluadores: ["Gerente", "Gerente de ventas", "Gerencia administrativa"] },
  chofer: { nombre: "Chofer", evaluadores: ["Gerente", "Gerente de ventas", "Gerencia administrativa"] },
  gerente: { nombre: "Gerente", evaluadores: ["Gerente", "Gerente de ventas", "Gerencia administrativa", "Almacenista", "Cajero/a", "Verificador"] },
  jefeAlmacen: { nombre: "Jefe de almacén", evaluadores: ["Gerente", "Gerente de ventas", "Gerencia administrativa", "Almacenista"] },
  jefeOperaciones: { nombre: "Jefe de operaciones", evaluadores: ["Gerente", "Gerente de ventas", "Gerencia administrativa", "Almacenista"] },
  gerenteAlmacen: { nombre: "Gerente", evaluadores: ["Almacenista"] },
  gerenteCajero: { nombre: "Gerente", evaluadores: ["Cajero/a"] },
  gerenteVerificador: { nombre: "Gerente", evaluadores: ["Verificador"] },
  gerenciaAdministrativa: { nombre: "Gerencia administrativa", evaluadores: ["Administrativos"] },
  gerenciaVentas: { nombre: "Gerencia de ventas", evaluadores: ["Administrativos", "Contabilidad"] }
};

const PUESTOS_EVALUACION = {
  "Gerente": { areas: ["Marketing", "Recursos Humanos", "Área de Sistemas", "Área de Compras", "Chofer", "Gerente", "Jefe de almacén", "Jefe de operaciones"] },
  "Almacenista": { areas: ["Gerente", "Jefe de almacén", "Jefe de operaciones"] },
  "Cajero/a": { areas: ["Gerente", "Área de Sistemas"] },
  "Administrativos": { areas: ["Gerencia administrativa", "Gerencia de ventas"] },
  "Verificador": { areas: ["Gerente"] },
  "Contabilidad": { areas: ["Gerencia administrativa", "Gerencia de ventas"] }
};

// ============================================
// EXPORTAR FUNCIONES PRINCIPALES
// ============================================

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

// ============================================
// RENDER PRINCIPAL DEL DASHBOARD
// ============================================

function renderDashboard(container) {
  if (!evaluaciones.length) {
    container.innerHTML = `<div class="empty-state">No hay evaluaciones registradas.</div>`;
    return;
  }

  container.innerHTML = `
    <div class="filter-row" style="margin-bottom:18px; display:flex; gap:12px; flex-wrap:wrap;">
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

// ============================================
// ACTUALIZAR VISTA CON FILTROS
// ============================================

function actualizarVista() {
  const sucursal = document.getElementById("filtroSucursal")?.value || "TODAS";
  const puesto = document.getElementById("filtroPuesto")?.value || "TODOS";

  let data = [...evaluaciones];
  if (sucursal !== "TODAS") data = data.filter(item => item.sucursal === sucursal);
  if (puesto !== "TODOS") data = data.filter(item => item.puestoEvaluador === puesto);

  const container = document.getElementById("dashboardRender");
  if (!data.length) {
    container.innerHTML = `<div class="empty-state">No hay evaluaciones con los filtros seleccionados.</div>`;
    destruirGraficas();
    return;
  }

  const resumenAreas = calcularResumenPorAreaEstructurada(data);
  const evaluacionPorPuesto = calcularEvaluacionPorPuesto(data);
  const analisisCompetencias = calcularAnalisisCompetencias(data);

  container.innerHTML = `
    <!-- KPIs PRINCIPALES -->
    <div class="kpi-grid" style="display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:16px; margin-bottom:20px;">
      <div class="kpi-card" style="background:linear-gradient(135deg,#6d28d9,#8b5cf6); color:#fff; padding:16px; border-radius:12px; text-align:center;">
        <div style="font-size:28px; font-weight:700;">${data.length}</div>
        <div style="font-size:13px; opacity:0.85;">Total evaluaciones</div>
      </div>
      <div class="kpi-card" style="background:linear-gradient(135deg,#059669,#34d399); color:#fff; padding:16px; border-radius:12px; text-align:center;">
        <div style="font-size:28px; font-weight:700;">${calcularPromedioGeneral(data)} / 10</div>
        <div style="font-size:13px; opacity:0.85;">Promedio general</div>
      </div>
      <div class="kpi-card" style="background:linear-gradient(135deg,#d97706,#fbbf24); color:#fff; padding:16px; border-radius:12px; text-align:center;">
        <div style="font-size:28px; font-weight:700;">${new Set(data.map(i => i.sucursal)).size}</div>
        <div style="font-size:13px; opacity:0.85;">Sucursales</div>
      </div>
      <div class="kpi-card" style="background:linear-gradient(135deg,#dc2626,#f87171); color:#fff; padding:16px; border-radius:12px; text-align:center;">
        <div style="font-size:28px; font-weight:700;">${Object.keys(evaluacionPorPuesto).length}</div>
        <div style="font-size:13px; opacity:0.85;">Puestos evaluadores</div>
      </div>
    </div>

    <!-- GRÁFICAS PRINCIPALES -->
    <div class="dashboard-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:18px; margin-bottom:20px;">
      <div class="chart-card" style="background:#fff; border-radius:14px; padding:16px; box-shadow:0 2px 8px rgba(0,0,0,0.06);">
        <div class="chart-title" style="font-weight:600; margin-bottom:6px;">📊 Promedio por área</div>
        <div class="chart-wrap" style="height:220px;"><canvas id="chartAreas"></canvas></div>
      </div>
      <div class="chart-card" style="background:#fff; border-radius:14px; padding:16px; box-shadow:0 2px 8px rgba(0,0,0,0.06);">
        <div class="chart-title" style="font-weight:600; margin-bottom:6px;">📈 Top 5 áreas con oportunidad</div>
        <div class="chart-wrap" style="height:220px;"><canvas id="chartOportunidades"></canvas></div>
      </div>
    </div>

    <!-- MATRIZ PUESTO VS ÁREA -->
    <div class="card" style="background:#fff; border-radius:14px; padding:16px; box-shadow:0 2px 8px rgba(0,0,0,0.06); margin-bottom:20px;">
      <div class="section-header" style="font-weight:600; margin-bottom:12px;">📋 Matriz: Puesto Evaluador → Área Evaluada</div>
      ${renderMatrizEvaluacion(evaluacionPorPuesto)}
    </div>

    <!-- ANÁLISIS DE COMPETENCIAS -->
    <div class="card" style="background:#fff; border-radius:14px; padding:16px; box-shadow:0 2px 8px rgba(0,0,0,0.06); margin-bottom:20px;">
      <div class="section-header" style="font-weight:600; margin-bottom:12px;">🎯 Análisis de competencias por área</div>
      ${renderAnalisisCompetencias(analisisCompetencias)}
    </div>

    <!-- MAPA DE CALOR DE EVALUACIONES -->
    <div class="card" style="background:#fff; border-radius:14px; padding:16px; box-shadow:0 2px 8px rgba(0,0,0,0.06); margin-bottom:20px;">
      <div class="section-header" style="font-weight:600; margin-bottom:12px;">🔥 Distribución de evaluaciones</div>
      <div class="chart-wrap" style="height:200px;"><canvas id="chartDistribucion"></canvas></div>
    </div>

    <!-- TABLA RESUMEN -->
    <div class="card" style="background:#fff; border-radius:14px; padding:16px; box-shadow:0 2px 8px rgba(0,0,0,0.06);">
      <div class="section-header" style="font-weight:600; margin-bottom:12px;">📋 Resumen de evaluaciones</div>
      ${renderTablaResumen(data)}
    </div>
  `;

  renderGraficas(resumenAreas, data);
}

// ============================================
// CÁLCULO DE RESUMEN POR ÁREA
// ============================================

function calcularResumenPorAreaEstructurada(data) {
  const resumen = {};

  data.forEach(item => {
    const puestoEvaluador = item.puestoEvaluador || "";
    const areasPermitidas = PUESTOS_EVALUACION[puestoEvaluador]?.areas || [];

    Object.entries(item.evaluaciones || {}).forEach(([areaKey, areaData]) => {
      const nombreArea = areaData.area || obtenerNombreArea(areaKey) || areaKey;
      
      if (!areasPermitidas.includes(nombreArea) && areasPermitidas.length > 0) return;

      if (!resumen[nombreArea]) {
        resumen[nombreArea] = { area: nombreArea, total: 0, suma: 0, competencias: {} };
      }

      resumen[nombreArea].total++;
      resumen[nombreArea].suma += Number(areaData.promedio || 0);

      Object.entries(areaData.promedioCompetencias || {}).forEach(([competencia, valor]) => {
        if (!resumen[nombreArea].competencias[competencia]) {
          resumen[nombreArea].competencias[competencia] = { total: 0, suma: 0 };
        }
        resumen[nombreArea].competencias[competencia].total++;
        resumen[nombreArea].competencias[competencia].suma += Number(valor || 0);
      });
    });
  });

  return resumen;
}

// ============================================
// CALCULAR ANÁLISIS DE COMPETENCIAS
// ============================================

function calcularAnalisisCompetencias(data) {
  const competencias = {};

  data.forEach(item => {
    Object.entries(item.evaluaciones || {}).forEach(([areaKey, areaData]) => {
      const nombreArea = areaData.area || obtenerNombreArea(areaKey) || areaKey;
      
      Object.entries(areaData.promedioCompetencias || {}).forEach(([competencia, valor]) => {
        const key = `${nombreArea}|${competencia}`;
        if (!competencias[key]) {
          competencias[key] = { area: nombreArea, competencia, total: 0, suma: 0 };
        }
        competencias[key].total++;
        competencias[key].suma += Number(valor || 0);
      });
    });
  });

  return Object.values(competencias).map(c => ({
    ...c,
    promedio: c.suma / c.total
  })).sort((a, b) => b.promedio - a.promedio);
}

// ============================================
// CALCULAR EVALUACIÓN POR PUESTO
// ============================================

function calcularEvaluacionPorPuesto(data) {
  const resultado = {};

  data.forEach(item => {
    const puesto = item.puestoEvaluador || "Sin puesto";
    if (!resultado[puesto]) {
      resultado[puesto] = { total: 0, areas: {}, promedioGeneral: 0 };
    }

    resultado[puesto].total++;
    
    Object.entries(item.evaluaciones || {}).forEach(([areaKey, areaData]) => {
      const nombreArea = areaData.area || obtenerNombreArea(areaKey) || areaKey;
      if (!resultado[puesto].areas[nombreArea]) {
        resultado[puesto].areas[nombreArea] = { total: 0, suma: 0, promedio: 0 };
      }
      resultado[puesto].areas[nombreArea].total++;
      resultado[puesto].areas[nombreArea].suma += Number(areaData.promedio || 0);
      resultado[puesto].areas[nombreArea].promedio = 
        resultado[puesto].areas[nombreArea].suma / resultado[puesto].areas[nombreArea].total;
    });
  });

  Object.values(resultado).forEach(puesto => {
    const values = Object.values(puesto.areas).map(a => a.promedio);
    puesto.promedioGeneral = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  });

  return resultado;
}

// ============================================
// RENDER MATRIZ DE EVALUACIÓN
// ============================================

function renderMatrizEvaluacion(evaluacionPorPuesto) {
  const puestos = Object.keys(evaluacionPorPuesto);
  const todasAreas = new Set();
  
  Object.values(evaluacionPorPuesto).forEach(puesto => {
    Object.keys(puesto.areas).forEach(area => todasAreas.add(area));
  });

  const areasArray = Array.from(todasAreas).sort();

  return `
    <div style="overflow-x:auto;">
      <table style="width:100%; border-collapse:collapse; font-size:13px;">
        <thead>
          <tr style="background:#f8fafc;">
            <th style="padding:8px 12px; text-align:left; border-bottom:2px solid #e2e8f0;">Puesto</th>
            ${areasArray.map(area => `<th style="padding:8px 12px; text-align:center; border-bottom:2px solid #e2e8f0;">${area}</th>`).join("")}
            <th style="padding:8px 12px; text-align:center; border-bottom:2px solid #e2e8f0;">Prom.</th>
          </tr>
        </thead>
        <tbody>
          ${puestos.map(puesto => {
            const data = evaluacionPorPuesto[puesto];
            return `
              <tr>
                <td style="padding:6px 12px; font-weight:600; border-bottom:1px solid #f1f5f9;">${puesto}</td>
                ${areasArray.map(area => {
                  const areaData = data.areas[area];
                  if (areaData) {
                    const prom = convertirPromedioAEscala10(areaData.suma / areaData.total);
                    const color = prom >= 8 ? '#10b981' : prom >= 6 ? '#f59e0b' : '#ef4444';
                    return `<td style="padding:6px 12px; text-align:center; border-bottom:1px solid #f1f5f9;">
                      <span style="background:${color}20; color:${color}; padding:2px 10px; border-radius:20px; font-weight:600; font-size:12px;">${prom}</span>
                    </td>`;
                  }
                  return `<td style="padding:6px 12px; text-align:center; border-bottom:1px solid #f1f5f9; color:#cbd5e1;">—</td>`;
                }).join("")}
                <td style="padding:6px 12px; text-align:center; border-bottom:1px solid #f1f5f9; font-weight:700;">${convertirPromedioAEscala10(data.promedioGeneral)}</td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

// ============================================
// RENDER ANÁLISIS DE COMPETENCIAS
// ============================================

function renderAnalisisCompetencias(competencias) {
  const top = competencias.slice(0, 6);
  const bottom = competencias.slice(-6).reverse();

  return `
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px;">
      <div>
        <div style="font-weight:600; color:#059669; margin-bottom:8px;">✅ Fortalezas (mejores competencias)</div>
        ${top.map(c => `
          <div style="display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px solid #f1f5f9; font-size:13px;">
            <span>${c.area} — ${c.competencia}</span>
            <span style="font-weight:700; color:#059669;">${convertirPromedioAEscala10(c.promedio)}</span>
          </div>
        `).join("")}
      </div>
      <div>
        <div style="font-weight:600; color:#dc2626; margin-bottom:8px;">⚠️ Áreas de oportunidad</div>
        ${bottom.map(c => `
          <div style="display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px solid #f1f5f9; font-size:13px;">
            <span>${c.area} — ${c.competencia}</span>
            <span style="font-weight:700; color:#dc2626;">${convertirPromedioAEscala10(c.promedio)}</span>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

// ============================================
// RENDER TABLA RESUMEN
// ============================================

function renderTablaResumen(data) {
  const areas = {};
  data.forEach(item => {
    Object.entries(item.evaluaciones || {}).forEach(([areaKey, areaData]) => {
      const nombre = areaData.area || obtenerNombreArea(areaKey) || areaKey;
      if (!areas[nombre]) areas[nombre] = { total: 0, suma: 0 };
      areas[nombre].total++;
      areas[nombre].suma += Number(areaData.promedio || 0);
    });
  });

  return `
    <div style="overflow-x:auto;">
      <table style="width:100%; border-collapse:collapse; font-size:13px;">
        <thead>
          <tr style="background:#f8fafc;">
            <th style="padding:8px 12px; text-align:left; border-bottom:2px solid #e2e8f0;">Área evaluada</th>
            <th style="padding:8px 12px; text-align:center; border-bottom:2px solid #e2e8f0;">Evaluaciones</th>
            <th style="padding:8px 12px; text-align:center; border-bottom:2px solid #e2e8f0;">Promedio</th>
            <th style="padding:8px 12px; text-align:center; border-bottom:2px solid #e2e8f0;">Nivel</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(areas).sort((a,b) => {
            const promA = a[1].suma / a[1].total;
            const promB = b[1].suma / b[1].total;
            return promB - promA;
          }).map(([nombre, datos]) => {
            const prom = convertirPromedioAEscala10(datos.suma / datos.total);
            const nivel = prom >= 8 ? '🌟 Excelente' : prom >= 6 ? '👍 Bueno' : '⚠️ Mejorar';
            const color = prom >= 8 ? '#10b981' : prom >= 6 ? '#f59e0b' : '#ef4444';
            return `
              <tr>
                <td style="padding:6px 12px; font-weight:500; border-bottom:1px solid #f1f5f9;">${nombre}</td>
                <td style="padding:6px 12px; text-align:center; border-bottom:1px solid #f1f5f9;">${datos.total}</td>
                <td style="padding:6px 12px; text-align:center; border-bottom:1px solid #f1f5f9; font-weight:700; color:${color};">${prom}</td>
                <td style="padding:6px 12px; text-align:center; border-bottom:1px solid #f1f5f9;">
                  <span style="background:${color}20; color:${color}; padding:2px 12px; border-radius:20px; font-size:12px;">${nivel}</span>
                </td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

// ============================================
// GRÁFICAS
// ============================================

function renderGraficas(resumenAreas, data) {
  destruirGraficas();

  // Gráfica de áreas
  const areasLabels = Object.keys(resumenAreas);
  const areasValues = Object.values(resumenAreas).map(a => 
    convertirPromedioAEscala10(a.suma / a.total)
  );

  const canvasAreas = document.getElementById("chartAreas");
  if (canvasAreas) {
    charts.areas = new Chart(canvasAreas, {
      type: "bar",
      data: {
        labels: areasLabels,
        datasets: [{
          label: "Promedio /10",
          data: areasValues,
          borderRadius: 8,
          backgroundColor: areasValues.map(v => v >= 8 ? '#10b981' : v >= 6 ? '#f59e0b' : '#ef4444')
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { beginAtZero: true, max: 10 } },
        plugins: { legend: { display: false } }
      }
    });
  }

  // Gráfica de oportunidades (bottom 5)
  const oportunidades = Object.entries(resumenAreas)
    .map(([area, data]) => ({ area, promedio: data.suma / data.total }))
    .sort((a, b) => a.promedio - b.promedio)
    .slice(0, 5);

  const canvasOportunidades = document.getElementById("chartOportunidades");
  if (canvasOportunidades) {
    charts.oportunidades = new Chart(canvasOportunidades, {
      type: "bar",
      data: {
        labels: oportunidades.map(o => o.area),
        datasets: [{
          label: "Promedio /10",
          data: oportunidades.map(o => convertirPromedioAEscala10(o.promedio)),
          borderRadius: 8,
          backgroundColor: ['#ef4444', '#f59e0b', '#f59e0b', '#fbbf24', '#fbbf24']
        }]
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        scales: { x: { beginAtZero: true, max: 10 } },
        plugins: { legend: { display: false } }
      }
    });
  }

  // Distribución de evaluaciones (donut)
  const puestos = {};
  data.forEach(item => {
    const p = item.puestoEvaluador || "Sin puesto";
    puestos[p] = (puestos[p] || 0) + 1;
  });

  const canvasDistribucion = document.getElementById("chartDistribucion");
  if (canvasDistribucion) {
    charts.distribucion = new Chart(canvasDistribucion, {
      type: "doughnut",
      data: {
        labels: Object.keys(puestos),
        datasets: [{
          data: Object.values(puestos),
          backgroundColor: ['#6d28d9', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'right', labels: { font: { size: 11 } } } }
      }
    });
  }
}

// ============================================
// CONVERSIÓN DE ESCALA
// ============================================

function convertirPromedioAEscala10(promedio) {
  return Number((promedio * 2).toFixed(1));
}

function calcularPromedioGeneral(data) {
  const valores = data.map(i => Number(i.promedioGeneral || 0)).filter(v => !isNaN(v) && v > 0);
  if (!valores.length) return "0.0";
  return convertirPromedioAEscala10(valores.reduce((a, b) => a + b, 0) / valores.length);
}

function obtenerSucursales(data) {
  return [...new Set(data.map(i => i.sucursal).filter(Boolean))].sort();
}

function obtenerPuestos(data) {
  return [...new Set(data.map(i => i.puestoEvaluador).filter(Boolean))].sort();
}

function destruirGraficas() {
  Object.values(charts).forEach(chart => { if (chart) chart.destroy(); });
  charts = {};
}