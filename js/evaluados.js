// js/evaluados.js

export const SUCURSALES = [
  "TAPACHULA",
  "TOSCANA",
  "CIUDAD HIDALGO",
  "TUXTLA GUTIÉRREZ",
  "ALMACÉN CIUDAD HIDALGO",
  "OFICINAS ADMINISTRATIVAS"
];

export const PUESTOS_EVALUADORES = [
  "GERENTE",
  "ALMACENISTA",
  "CAJERO/A",
  "ADMINISTRATIVO",
  "VERIFICADOR",
  "CONTABILIDAD"
];

export const EVALUACIONES_POR_PUESTO = {
  GERENTE: [
    "MARKETING",
    "RECURSOS_HUMANOS",
    "SISTEMAS",
    "COMPRAS",
    "CHOFER"
  ],

  "CAJERO/A": [
    "GERENTE",
    "SISTEMAS",
    "MARKETING",
    "COMPRAS"

  ],

  ADMINISTRATIVO: [
    "GERENCIA_ADMINISTRATIVA",
    "GERENCIA_VENTAS"
  ],

  VERIFICADOR: [
    "GERENTE"
  ],

  CONTABILIDAD: [
    "GERENCIA_ADMINISTRATIVA",
    "GERENCIA_VENTAS",
    "CONTADOR_GENERAL"
  ]
};

const EVALUACIONES_ALMACENISTA_POR_SUCURSAL = {
  TAPACHULA: [
    "GERENTE",
    "JEFE_ALMACEN"
  ],

  TOSCANA: [
    "GERENTE",
    "JEFE_ALMACEN"
  ],

  "TUXTLA GUTIERREZ": [
    "GERENTE",
    "JEFE_ALMACEN"
  ],

  "CIUDAD HIDALGO": [
    "GERENTE"
  ],

  "ALMACEN CIUDAD HIDALGO": [
    "GERENTE",
    "JEFE_OPERACIONES"
  ]
};

export const AREAS_LABELS = {
  MARKETING: "Marketing",
  RECURSOS_HUMANOS: "Recursos Humanos",
  SISTEMAS: "Área de Sistemas",
  COMPRAS: "Área de Compras",
  CHOFER: "Chofer",

  GERENTE: "Gerente",
  JEFE_ALMACEN: "Jefe de Almacén",
  JEFE_OPERACIONES: "Jefe de Operaciones",

  GERENCIA_ADMINISTRATIVA: "Gerencia Administrativa",
  GERENCIA_VENTAS: "Gerencia de Ventas",
  CONTADOR_GENERAL:"Contador General"
  
};

export function obtenerAreasPorPuesto(puesto, sucursal = "") {
  const puestoNormalizado = normalizarTexto(puesto);
  const sucursalNormalizada = normalizarTexto(sucursal);

  if (puestoNormalizado === "ALMACENISTA") {
    return obtenerEvaluacionesAlmacenista(sucursalNormalizada);
  }

  return EVALUACIONES_POR_PUESTO[puesto] || [];
}

export function obtenerNombreArea(areaKey) {
  return AREAS_LABELS[areaKey] || areaKey;
}

function obtenerEvaluacionesAlmacenista(sucursalNormalizada) {
  return EVALUACIONES_ALMACENISTA_POR_SUCURSAL[sucursalNormalizada] || [
    "GERENTE"
  ];
}

function normalizarTexto(texto) {
  return String(texto || "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}