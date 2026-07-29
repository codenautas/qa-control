# Claude

## Contexto

`qa-control` es una herramienta de control de calidad para proyectos Node/npm creada por Codenautas.
Su objetivo principal es validar que los paquetes sigan convenciones internas y boilerplates comunes,
especialmente en `package.json`, `README.md`/`LEEME.md`, archivos de configuración de lint,
GHA y badgets de estado.

## Contexto

Hay dos maneras de uso equivalentes:

`qa-control MY_REPO_PATH`

o

`npx qa-control .` (que se usa cuando qa-control está como dependencia)

Devuelve en la consola la lista de problemas encontrados

## Estructura interna

Hay una lista de reglas que hay que cumplir. Las opciones por proyecto se deben setear en el package.json
en la sección "qa-control".

## Reglas de la versión 0.3.0

_Hay que tratar de mantener actualizada esta sección_

### 1. Estructura y metadatos básicos
- Debe existir `package.json`.
- Debe existir la sección `qa-control` en `package.json`.
- `qa-control.package-version` debe ser un semver válido y no estar en versiones deprecadas (`<0.0.1`).
- `qa-control.run-in` debe ser uno de: `server`, `both`, `client`.
- `qa-control.type` debe ser uno de: `app`, `lib`, `cmd-tool`, `web`.

### 2. Archivos obligatorios
- `README.md`
- `LEEME.md`
- `.travis.yml`
- `.gitignore` (con líneas obligatorias: `local-*` y `*-local.*`)
- `LICENSE`
- `eslint.config.{js,mjs,cjs,ts,mts,cts}` (formato flat config moderno de ESLint; basta con que exista alguna de estas variantes; obligatorio salvo que `qa-control.profile` sea `minimum`). No se acepta el formato clásico `.eslintrc.yml`.
- `appveyor.yml` es obligatorio solo si `qa-control.test-appveyor` está activado.

### 3. Repositorio y package.json
- `package.json.repository` debe existir y tener formato `owner/repo` válido.
- El nombre de repositorio debe coincidir con el nombre del paquete.
- Se valida la sección `files` de `package.json` para evitar incluir archivos QA privados y verificar que los archivos listados existan.
- Se rechaza `jshintConfig` y `eslintConfig` embebidos en `package.json`.

### 4. Badge y cucardas en README/LEEME
- Debe existir el marcador `<!-- cucardas -->` en el documento principal.
- Se valida la presencia y el formato de badges/cucardas obligatorias como: `npm-version`, `downloads`, `build`, `dependencies`, `qa-control`.
- También hay reglas especiales para badges de `linux`, `windows`, `coverage` y `climate` según los metadatos del proyecto.

### 5. Existencia del archivo principal
- El archivo `main` declarado en `package.json` (o `index.js` por defecto) debe existir. No se valida su contenido.

### 6. Lint y estilo de código
- Se ejecuta la clase `ESLint` (API moderna) sobre todos los `.js` del proyecto, resolviendo su `eslint.config.*` real desde el propio directorio del proyecto (igual que lo haría ESLint corrido por línea de comandos).
- Se previene el uso de librerías de promesas normales: `promise`, `q`, `rsvp`, `es6promise`.
- Se verifica la ortografía de `"use strict"` en la forma correcta dentro de funciones y bloques.

### 7. Validaciones adicionales
- Se validan las versiones de dependencias en `package.json` para que sean semver válidos.
- Se detectan dependencias no recomendadas: `best-promise`, `lodash`, `promise-plus`.
- Se comprueba que `.travis.yml` pruebe al menos Node 4 y 6, y que estas versiones no tengan fallos permitidos.
- Se comprueba que los archivos de traducción de `multilang` estén sincronizados con el `README.md`/`LEEME.md` principal.

### 8. Excepciones de reglas (`silenced`)
- En la sección `qa-control` del `package.json` se puede declarar un array `silenced` con los nombres internos de los warnings que se quieren suprimir.
- Cada warning suprimido se filtra del resultado (no se reporta), pero la regla igual se evalúa.
- Ejemplo: el propio `qa-control` no puede tenerse a sí mismo en `devDependencies`, así que silencia `lack_of_qa_control_in_dev_dependencies`.
