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

### El modo `--fix`

Corregir está separado de detectar, en tres fases:

1. **detección**: las reglas no corrigen nada; cada warning que se puede reparar lleva adjunto
   (en la propiedad no enumerable `fix`, ver `qaControl.withFix`) lo que ya se leyó y calculó
   para repararlo.
2. **fix** (`qaControl.applyFixes`): aplica solo las reparaciones de los warnings reportados.
   No evalúa reglas ni busca problemas nuevos.
3. **re-detección**: vuelve a leer el proyecto del disco y reporta lo que quedó pendiente.

Corregir un problema puede destrabar reglas que se habían cortado por `cant_continue`, así que
`--fix` puede necesitar correrse varias veces: cada corrida arregla exactamente lo que se
reportaría sin `--fix`.

Borrar archivos es la única corrección que destruye información y se controla con
`--deletes=yes|no|ask` (por defecto `ask`, que pregunta por consola; sin terminal interactiva
no borra).

## Reglas de la versión 0.3.0

_Hay que tratar de mantener actualizada esta sección_

### 1. Estructura y metadatos básicos
- Debe existir `package.json`.
- Debe existir la sección `qa-control` en `package.json`.
- `qa-control.run-in` debe ser uno de: `server`, `both`, `client`.
- `qa-control.type` debe ser uno de: `app`, `lib`, `cmd-tool`, `web`.
- Solo se aceptan las claves conocidas de la sección `qa-control`: `run-in`, `type`, `profile`, `gha`,
  `publish`, `multilang`, `coverage`, `sonar`, `test-appveyor`, `silenced`, `fileNameMainDoc` y `purpose`.
  - Las obsoletas (`package-version`, `stability`, `stage`, `ecmaVersion`) se reportan y `--fix` las quita.
  - Cualquier otra es desconocida: se reporta sin fix (puede ser un error de tipeo, p.e. `silence`).
- `qa-control.fileNameMainDoc` indica el documento principal (por defecto `LEEME.md`).

### 2. Archivos obligatorios
- `README.md`
- `LEEME.md`
- `.gitignore` (con líneas obligatorias: `local-*` y `*-local.*`)
- `LICENSE`
- `eslint.config.{js,mjs,cjs,ts,mts,cts}` (formato flat config moderno de ESLint; basta con que exista alguna de estas variantes; obligatorio salvo que `qa-control.profile` sea `minimum`). No se acepta el formato clásico `.eslintrc.yml`.
- `appveyor.yml` es obligatorio solo si `qa-control.test-appveyor` está activado.

### 3. Repositorio y package.json
- `package.json.repository` debe existir y tener formato `owner/repo` válido.
- El nombre de repositorio debe coincidir con el nombre del paquete.
- En un proyecto privado (`package.json.private: true`) `repository` es opcional: si no está, no se controla.
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
  - Por cada archivo con hallazgos se reporta un solo warning: `eslint_errors_in_file_1` si tiene al menos un error, o `eslint_warnings_in_file_1` si solo tiene warnings. Así se pueden silenciar los warnings sin dejar de reportar los errores.
  - Si ESLint no puede correr porque la configuración usa un módulo que no está instalado, se informa ese módulo (`eslint_could_not_run_lack_of_module_1`); con cualquier otro error, `eslint_could_not_run`.
- Si el proyecto tiene `typescript` en `dependencies` o `devDependencies` (no cuenta `peerDependencies`), los `.ts`, `.mts` y `.cts` (incluidos los `.d.ts`) se analizan con typescript-eslint, cargado desde el `eslint.config.*` del proyecto: así qa-control y `npx eslint` analizan lo mismo.
  - Se reporta el primer `.ts` que la configuración no cubre (los excluidos por `ignores` no cuentan). `--fix` lo arregla solo si la configuración es la del template salvo la línea `ignores`: la reemplaza por el template con el bloque de TypeScript (`bin/init-template/eslint.config.typescript-block.txt`), conservando los `ignores`.
  - `typescript-eslint` debe estar en `devDependencies` (`--fix` lo agrega con la versión de las devDependencies de qa-control).
  - typescript-eslint necesita la API de TypeScript 6: con TypeScript 7 se pide la configuración "running side by side with TypeScript 6.0" del [anuncio de TypeScript 7.0](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/): `"typescript": "npm:@typescript/typescript6@..."` y `"@typescript/native": "npm:typescript@<versión 7>"`. `--fix` escribe los dos alias.
  - Si falta el `eslint.config.cjs`, `--fix` crea el template con el bloque de TypeScript.
- Se previene el uso de librerías de promesas normales: `promise`, `q`, `rsvp`, `es6promise`.
- Se verifica la ortografía de `"use strict"` en la forma correcta dentro de funciones y bloques.

### 7. Validaciones adicionales
- Se validan las versiones de dependencias en `package.json` para que sean semver válidos.
- Se detectan dependencias no recomendadas: `best-promise`, `jslint`, `lodash`, `promise-plus`.
- Se reportan los archivos de herramientas que ya no se usan (`obsolete_file_1`): `.codeclimate.yml`, `.travis.yml`,
  `.jshintrc` y `.jslintrc` (hoy se usan GHA y ESLint). `--fix` los borra, según `--deletes`.
- Se comprueba que los archivos de traducción de `multilang` estén sincronizados con el `README.md`/`LEEME.md` principal.

### 8. GitHub Actions (`qa-control.gha`)
- `"skip"`: no se controlan los workflows.
- Cualquier otro valor (`"all"`, `true`, ...): se controla que los workflows coincidan con los
  templates de qa-control, y que no haya otros workflows (los sobrantes se reportan y `--fix` los
  borra, según `--deletes`).
- **Un objeto** equivale a `"all"`, pero con los valores indicados sobrescritos en los workflows
  esperados. Se puede sobrescribir cualquier clave de una sección `with:` de los workflows: cada
  clave reemplaza el valor de la clave homónima donde ya exista (no se agregan claves a un workflow
  que no las declara). Los strings se escriben entre comillas simples; los booleanos y números, sin
  comillas. Una clave que no está en ninguna sección `with:` se reporta.

```json
"gha": { "node_version": "24.x", "skip_tests": true }
```

Los templates (`.github/workflows` de este repositorio) se bajan de `codenautas/.github`
(carpeta `.in-each-repo`) con `npm run sync-workflows` (por defecto desde `main`).

### 9. Proyectos privados y publicables
Son dos ejes independientes:

- **privado**: `package.json.private: true`. El código fuente no se publica.
- **publicable**: el paquete se publica en npm. Lo es todo proyecto no privado, y también uno
  privado que lo declare con `qa-control.publish: {"private-source": true}` (fuente cerrada,
  paquete publicado).

Reglas que dependen de estos ejes:
- Si **no es publicable**: las cucardas `npm-version` y `downloads` no se piden (apuntan a
  `npmjs.org`), y el workflow `publish.yml` no debe existir.
- Si es **privado**: `qa-control.sonar` no corresponde (SonarCloud analiza repositorios públicos)
  y la cucarda `sonar` no se pide. `repository` pasa a ser opcional.

### 10. Excepciones de reglas (`silenced`)
- En la sección `qa-control` del `package.json` se puede declarar un array `silenced` con los warnings que se quieren suprimir. Cada elemento es:
  - un string con el nombre interno del warning: lo suprime siempre;
  - un array `[nombre, param1, ...]`: lo suprime solo cuando los parámetros coinciden con los primeros del warning.
- Cada warning suprimido se filtra del resultado (no se reporta), pero la regla igual se evalúa.
- Ejemplo: el propio `qa-control` no puede tenerse a sí mismo en `devDependencies`, así que silencia `lack_of_qa_control_in_dev_dependencies`.
- `--silence-all` agrega los warnings activos: los que tienen parámetros en la forma `[nombre, params...]`.

```json
"silenced": ["lack_of_qa_control_in_dev_dependencies", ["unexpected_workflow_file_1", "deploy.yml"]]
```
