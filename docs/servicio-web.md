# qa-control-web-service

## Objetivo

Proveer un servicio web que informe los resultados de **qa-control** y alguna otra información útil.

## Servicios principales

### Obtención de una cucarda de un proyecto. 

Con una url similar a `https://travis-ci.org/codenautas/pg-promise-strict.svg` 
el servicio genera un SVG que se ve así: ![cucarda ejemplo](https://travis-ci.org/codenautas/pg-promise-strict.svg).

El texto de la cucarda será `qa-control:ok` o `qa-control:1 err` (donde el 1 es la cantidad de errores o warnings). 
El color será verde con `ok` y distintos tonos de amarillo, naranja y rojo cuando haya errores o warnings

### Página de detalles

Entrando a una url similar a `https://codenautas.com/qa-control/organizacion/proyecto` 
se ven la lista de todos los warnings generados por qa-control (y algunos detalles más)

### Página de resumen de todos los proyectos de una organización

Entrando a una url similar a `https://codenautas.com/qa-control/organizacion` 
se ven la lista de todos los proyectos de la organización, 
al lado de cada nombre de proyecto se ven todas las cucardas que tiene su archivo LEEME.md o README.md

## Funcionamiento

 * cuando **github.com** recibe un push avisa de algún modo al servidor qa-control.
 * el servidor de qa-control hace:
   * git clone
   * npm install
   * qa-control . (con la opción que necesitemos) y registra los resultados en algún lugar
 * cuando recibe una petición (de cucarda, de detalles de un proyecto o de resumen de varios) utiliza la información guardada (no vuelve a ejecutar qa-control)


