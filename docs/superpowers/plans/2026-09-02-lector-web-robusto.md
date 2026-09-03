# Lector Web Robusto Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reforzar extracción y fusión de datos Metro sin regresiones.

**Architecture:** Mantener el contrato de `intake.js` y `reader.js`; mejorar parser y sanitización estructural en `server.cjs`. Los conflictos se exponen como metadatos de revisión y nunca reemplazan campos existentes.

**Tech Stack:** JavaScript ES2020, Node.js `node:test`, servidor HTTP Node existente.

**Spec:** `docs/superpowers/specs/2026-09-02-lector-web-robusto-design.md`

## Global Constraints
- No cambiar estados ni ciclo de trámites.
- No modificar machotes ni motor de PDF/Word.
- Ningún campo nuevo obligatorio.
- Mantener compatibilidad con registros 3.7.0.

### Task 1: Parser de formatos Metro
**Files:** Modify `js/intake.js`; Test `tests/reader.test.js`.
- [ ] Agregar pruebas para trámite con guiones/barras y fecha con mes español.
- [ ] Ejecutar y verificar fallo.
- [ ] Implementar normalización mínima.
- [ ] Ejecutar y verificar éxito.

### Task 2: HTML estructural
**Files:** Modify `server/server.cjs`; Test `tests/server.test.js`.
- [ ] Agregar prueba que preserve separadores entre etiquetas/celdas.
- [ ] Ejecutar y verificar fallo.
- [ ] Implementar conversión HTML a texto estructurado y seguro.
- [ ] Ejecutar y verificar éxito.

### Task 3: Conflictos no destructivos
**Files:** Modify `js/intake.js`; Test `tests/reader.test.js`.
- [ ] Agregar prueba que reporte diferencias sin sobrescribir.
- [ ] Ejecutar y verificar fallo.
- [ ] Implementar `mergeDetectedFields` con lista nullable de conflictos.
- [ ] Ejecutar y verificar éxito.

### Task 4: Integración y versión
**Files:** Modify `server/server.cjs`, `VERSION.txt`, `sw.js`, docs de cambios; Test full suite.
- [ ] Actualizar versión y agente del lector.
- [ ] Ejecutar suite completa y sintaxis.
- [ ] Verificar hashes de machotes sin cambios contra 3.7.0.
- [ ] Empaquetar entrega.
