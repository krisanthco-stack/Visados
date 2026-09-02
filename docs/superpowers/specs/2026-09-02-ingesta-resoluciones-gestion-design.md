# C-VISADOS 3.7.0 — Diseño de ingesta, lector, Resoluciones y Gestión diaria

## Objetivo
Extender C-VISADOS 3.6.4 sin romper expedientes existentes, machotes, historial de calificación ni operación PWA. La nueva versión separa claramente la bandeja de Resoluciones de la bandeja de Gestión, permite crear expedientes sin inventar números de trámite, normaliza enlaces Metro desde Excel, integra un lector/visor con fallback backend y añade cierre diario con exportación Excel/ZIP.

## Compatibilidad y datos
Los campos nuevos son opcionales y se normalizan con valores vacíos o derivados. No se elimina ni renombra ningún campo persistido de 3.6.4. Se conservan `estado`, `dictamen`, `finalizado`, historiales, defectos, subsanaciones y `report`.

Campos nuevos compatibles:
- `creadoEn: string | ''`
- `metroId: string | ''`
- `metroUrl: string | ''`
- `lecturas: Array`
- `resolucionConcluida: boolean | null`
- `fechaResolucionConcluida: string | null`
- `gestionFecha: string | ''`

Para expedientes legados, `resolucionConcluida` se deriva de `finalizado === true` cuando sea necesario, pero no se obliga a reescribir datos ausentes.

## Creación y vinculación
La creación manual usa el orden visual Folio → Plano → Presentación. Se permite crear con cualquiera de esos identificadores. El número de trámite queda en blanco y no se generan nuevas referencias `X:NNN`. Las referencias `X:NNN` ya existentes siguen siendo compatibles.

Un número de trámite nuevo se asigna únicamente desde fuentes reconocidas: Excel/CSV, PDF, lector OCR/web/scraper o restauración de respaldo JSON. La vinculación prioriza trámite real exacto y, si falta, coincidencias por folio, plano o presentación sin conflictos.

## Excel e ID Metro
Se incorporan `ID`, `Metro ID`, `Enlace`, `URL` y equivalentes al mapeo. Si el valor es una URL absoluta válida se conserva exactamente. Si es un ID simple se genera `https://metro.sarapiqui.go.cr/id/[ID]`. El parser XLSX también lee hipervínculos reales de celdas mediante las relaciones de cada hoja.

## Visor y lector
Trámites incorpora un panel dividido para abrir el enlace Metro sin salir de C-VISADOS. El iframe se intenta primero, mientras el lector backend se prepara en paralelo. Si el sitio impide el iframe, el backend `/api/metro/read` descarga la página, extrae texto y devuelve los campos detectados sin bloquear la interfaz.

El lector local acepta PDF e imágenes. Los PDF intentan primero extracción textual; si no hay texto suficiente, se usa OCR bajo demanda. Las imágenes usan OCR bajo demanda. La lectura rellena solo campos vacíos, salvo el número de trámite, que se vincula únicamente si el expediente no tiene un trámite real y no existe conflicto.

Se incluye un servidor Node sin dependencias externas para servir la aplicación y exponer el scraper. Solo permite URLs HTTPS de `metro.sarapiqui.go.cr` para evitar SSRF. La aplicación estática sigue funcionando sin servidor; en ese modo el lector informa que el backend no está disponible y mantiene el enlace externo utilizable.

## Resoluciones y Gestión
Se agrega `resolucionConcluida` como frontera de vista sin cambiar los nombres de estados existentes.

- Resoluciones: `calificacionFinalizada === true` y `resolucionConcluida !== true`.
- Gestión: `calificacionFinalizada === true` y `resolucionConcluida === true`.

Al concluir una resolución aprobada se mantiene `APROBADO - FINALIZADO`. Al concluir una resolución rechazada se mantiene `RECHAZADO - PENDIENTE DE SUBSANACIÓN / CORRECCIÓN` y pasa a Gestión, donde puede subsanarse o archivarse. `ARCHIVADO` sigue reservado para el cierre definitivo sin subsanar.

## Gestión diaria y adjuntos
Cada expediente nuevo recibe `creadoEn`. Cada conclusión de resolución recibe `fechaResolucionConcluida` y `gestionFecha`. Gestión incluye selector de fecha y KPIs diarios.

El Excel diario contiene solo expedientes cuya resolución fue concluida en la fecha seleccionada. El ZIP diario incluye el oficio PDF generado para cada expediente y los PDF/imágenes originales que estén disponibles en IndexedDB. Los metadatos existentes de adjuntos siguen siendo válidos aunque el archivo binario no exista.

## Alertas y UI
Trámites y Calificación incluyen filtro de alertas:
- Con alarmas: más de 10 días hábiles.
- Sin alarmas: 10 días hábiles o menos, o sin fecha.
- Vencimientos: 15 días hábiles o más.

La interfaz conserva HTML/CSS/JS sin framework y reduce paddings/espaciados para una densidad compacta. Los controles de submódulo se organizan horizontalmente con desbordamiento responsivo.

## No regresión
No se modifican los machotes oficiales ni el motor de paginación PDF/Word salvo para exponer internamente bytes de PDF reutilizables por el ZIP diario. Se mantienen importación JSON, Excel/CSV, PDF, ZIP, PWA y almacenamiento local. Todo campo nuevo tiene fallback seguro.
