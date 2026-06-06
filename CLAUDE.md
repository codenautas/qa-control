# Claude

## Contexto

`qa-control` es una herramienta de control de calidad para proyectos Node/npm creada por Codenautas. Su objetivo principal era validar que los paquetes sigan convenciones internas y boilerplates comunes, especialmente en `package.json`, `README.md`/`LEEME.md`, archivos de configuración de lint, `travis`/`appveyor`, y badgets de estado.

La versión activa del proyecto en el repositorio es `0.3.0`, con definiciones de reglas cargadas desde `bin/0.3.0/definition.js`.

## Qué reglas había

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
- `.jshintrc`
- `.eslintrc.yml`
- `appveyor.yml` es obligatorio solo si `qa-control.test-appveyor` está activado.

### 3. Repositorio y package.json
- `package.json.repository` debe existir y tener formato `owner/repo` válido.
- El nombre de repositorio debe coincidir con el nombre del paquete.
- Se valida la sección `files` de `package.json` para evitar incluir archivos QA privados y verificar que los archivos listados existan.
- Se rechaza `jshintConfig` y `eslintConfig` embebidos en `package.json`.

### 4. Badge y cucardas en README/LEEME
- Debe existir el marcador `<!-- cucardas -->` en el documento principal.
- Se valida la presencia y el formato de badges/cucardas obligatorias como: `npm-version`, `downloads`, `build`, `dependencies`, `qa-control` y badges de estabilidad (`extending`, `stable`, etc.).
- También hay reglas especiales para badges de `linux`, `windows`, `coverage` y `climate` según los metadatos del proyecto.

### 5. Validación de primeras líneas de archivo principal
- El contenido inicial del archivo `main` declarado en `package.json` debe coincidir con un template de primera línea según el tipo del proyecto (`run-in`, `type`).
- Si falta el archivo `main`, falla la validación.

### 6. Lint y estilo de código
- Se ejecuta JSHint sobre todos los `.js` con `.jshintrc`.
- Se ejecuta ESLint sobre todos los `.js` con `.eslintrc.yml`.
- Se previene el uso de librerías de promesas normales: `promise`, `q`, `rsvp`, `es6promise`.
- Se verifica la ortografía de `"use strict"` en la forma correcta dentro de funciones y bloques.

### 7. Validaciones adicionales
- Se validan las versiones de dependencias en `package.json` para que sean semver válidos.
- Se detectan dependencias no recomendadas: `best-promise`, `lodash`, `promise-plus`.
- Se comprueba que `.travis.yml` pruebe al menos Node 4 y 6, y que estas versiones no tengan fallos permitidos.
- Se comprueba que los archivos de traducción de `multilang` estén sincronizados con el `README.md`/`LEEME.md` principal.

## Estado actual y observaciones

- El proyecto está construido como un CLI (`qa-control`) con un archivo principal en `bin/qa-control.js`.
- Las reglas están versionadas internamente y la versión actual es `0.3.0`.
- Hay soporte de inicialización con `bin/qac-init.js` y templates en `bin/init-template`.
- El repositorio usa tests mocha/istanbul, fixtures de ejemplo y casos de control en `test/`.

## Objetivo inicial

1. Restablecer `qa-control` como una herramienta de control de calidad fácil de ejecutar localmente y dentro de GitHub Actions.
2. Consolidar las reglas existentes en una definición clara y actualizada que pueda ejecutarse como:
   - `npx qa-control .` para ejecución local
   - `npx qa-control .` dentro de un workflow de GitHub Actions
3. Priorizar la modernización de la capa de ejecución y el soporte de CI sin perder las validaciones de metadata, badges, linting, `cucardas` y convenciones de `package.json`.

## Propuesta de primer paso

- Definir el flujo mínimo para una verificación completa de proyecto:
  1. Cargar `package.json` y validar `qa-control` + `package-version`.
  2. Verificar la presencia de archivos obligatorios y la configuración de `repository`.
  3. Validar `README.md`/`LEEME.md` con `cucardas` y `multilang`.
  4. Ejecutar JSHint/ESLint sobre los archivos de código.
  5. Validar `.travis.yml` y dependencias.
- Documentar ese flujo en un README/CLAUDE donde el objetivo sea muy claro: "Un QA tool local + GHA para mantener los boilerplates de Codenautas sincronizados".


## TODO (not now)

### qa-control mandatory:

Agregrar en `/test/fixtures/cucardas-proof-of-concept/warnings.json`:

```json
,
  {
    "warning": "lack_of_mandatory_cucarda_1", "params": ["qa-control"]
  }
```

También en: `test\fixtures\cucardas-extending\warnings.json`
