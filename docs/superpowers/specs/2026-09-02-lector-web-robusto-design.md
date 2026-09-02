# Lector web robusto - diseño

Objetivo: reforzar el lector Metro sin alterar estados, vínculos, machotes ni flujos existentes.

- Mantener `metroId`/`metroUrl` y la política de no sobrescritura.
- Validar URLs Metro antes del visor/lector.
- Preservar estructura textual del HTML (bloques, filas, celdas y saltos).
- Reconocer variantes de trámite con espacios, guiones o barras y fechas numéricas o con mes en español.
- Detectar conflictos entre datos existentes y datos leídos sin reemplazar silenciosamente.
- Mantener el fallback backend y contratos actuales.
- No modificar generación PDF/Word ni archivos de machotes.
