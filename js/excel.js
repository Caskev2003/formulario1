// js/excel.js

import { obtenerEvaluaciones } from "./firestore.js";

export async function exportarExcel() {
  const evaluaciones = await obtenerEvaluaciones();

  if (!evaluaciones.length) {
    alert("No hay evaluaciones para exportar.");
    return;
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Evaluaciones");

  sheet.columns = [
    { header: "Fecha", key: "fecha", width: 15 },
    { header: "Número trabajador", key: "numeroTrabajador", width: 22 },
    { header: "Sucursal", key: "sucursal", width: 28 },
    { header: "Puesto evaluador", key: "puestoEvaluador", width: 24 },
    { header: "Correo", key: "email", width: 35 },
    { header: "Área evaluada", key: "area", width: 28 },
    { header: "Competencia", key: "competencia", width: 30 },
    { header: "Promedio competencia", key: "promedioCompetencia", width: 24 },
    { header: "Promedio área", key: "promedioArea", width: 18 },
    { header: "Promedio general", key: "promedioGeneral", width: 20 }
  ];

  evaluaciones.forEach(item => {
    Object.entries(item.evaluaciones || {}).forEach(([areaKey, areaData]) => {
      const competencias = areaData.promedioCompetencias || {};

      Object.entries(competencias).forEach(([competencia, promedio]) => {
        sheet.addRow({
          fecha: item.fecha || "",
          numeroTrabajador: item.numeroTrabajador || "",
          sucursal: item.sucursal || "",
          puestoEvaluador: item.puestoEvaluador || "",
          email: item.email || "",
          area: areaData.area || areaKey,
          competencia,
          promedioCompetencia: promedio,
          promedioArea: areaData.promedio || "",
          promedioGeneral: item.promedioGeneral || ""
        });
      });
    });
  });

  sheet.getRow(1).font = { bold: true };

  sheet.eachRow(row => {
    row.eachCell(cell => {
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" }
      };
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });

  saveAs(blob, `evaluaciones_${new Date().toISOString().slice(0, 10)}.xlsx`);
}