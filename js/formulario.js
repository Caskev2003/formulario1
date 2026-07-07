// js/formulario.js

import { obtenerPasoActual } from "./wizard.js";
import { PREGUNTAS_ABIERTAS } from "./preguntas.js";

const questionContainer = document.getElementById("questionSections");

export function construirFormularioActual() {
    const paso = obtenerPasoActual();

    if (!paso) return;

    questionContainer.innerHTML = "";

    if (paso.tipo === "comentarios") {
        construirComentariosFinales(paso);
        return;
    }

    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
        <div class="section-header">
            ${paso.areaNombre}
        </div>

        <div class="section-body">
            <div class="info">
                ${paso.preguntas.descripcion}
            </div>

            <div id="listaPreguntas"></div>
        </div>
    `;

    questionContainer.appendChild(card);

    const lista = card.querySelector("#listaPreguntas");

    paso.preguntas.preguntas.forEach((pregunta, index) => {
        lista.appendChild(crearPregunta(index + 1, pregunta));
    });
}

function construirComentariosFinales(paso) {
    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
        <div class="section-header">
            ${paso.areaNombre}
        </div>

        <div class="section-body">
            <div class="info">
                Antes de finalizar la evaluación, puedes expresar libremente tu experiencia, comentarios, sugerencias o cualquier situación que consideres importante compartir.
            </div>

            <div id="listaPreguntas"></div>
        </div>
    `;

    questionContainer.appendChild(card);

    const lista = card.querySelector("#listaPreguntas");

    PREGUNTAS_ABIERTAS.forEach((pregunta, index) => {
        lista.appendChild(
            crearPreguntaAbierta(index + 1, pregunta)
        );
    });
}

function crearPregunta(numero, pregunta) {
    const div = document.createElement("div");
    div.className = "question";

    div.innerHTML = `
        <div class="question-title">
            ${numero}. ${pregunta.texto}
        </div>

        <div class="scale-grid">
            ${crearRadio(pregunta.id, 1, "Nunca")}
            ${crearRadio(pregunta.id, 2, "Casi nunca")}
            ${crearRadio(pregunta.id, 3, "Algunas veces")}
            ${crearRadio(pregunta.id, 4, "Frecuentemente")}
            ${crearRadio(pregunta.id, 5, "Siempre")}
        </div>
    `;

    return div;
}

function crearPreguntaAbierta(numero, pregunta) {
    const div = document.createElement("div");
    div.className = "question";

    div.innerHTML = `
        <div class="question-title">
            ${numero}. ${pregunta.texto}
        </div>

        <textarea
            name="${pregunta.id}"
            class="open-answer"
            rows="4"
            placeholder="Escriba su respuesta..."
        ></textarea>
    `;

    return div;
}

function crearRadio(id, valor, texto) {
    return `
        <label class="scale-option">
            <input
                type="radio"
                name="q${id}"
                value="${valor}"
                required
            >

            <div>
                <strong>${valor}</strong>
            </div>

            <small>${texto}</small>
        </label>
    `;
}

export function obtenerRespuestasFormulario() {
    const paso = obtenerPasoActual();

    if (!paso) return {};

    const respuestas = {};

    if (paso.tipo === "comentarios") {
        PREGUNTAS_ABIERTAS.forEach(p => {
            const texto = document.querySelector(
                `textarea[name="${p.id}"]`
            );

            respuestas[p.id] = texto ? texto.value.trim() : "";
        });

        return respuestas;
    }

    paso.preguntas.preguntas.forEach(p => {
        const seleccionado = document.querySelector(
            `input[name="q${p.id}"]:checked`
        );

        respuestas[`q${p.id}`] = seleccionado
            ? Number(seleccionado.value)
            : null;
    });

    return respuestas;
}

export function limpiarFormulario() {
    document
        .querySelectorAll("input[type=radio]")
        .forEach(r => r.checked = false);

    document
        .querySelectorAll("textarea")
        .forEach(t => t.value = "");
}