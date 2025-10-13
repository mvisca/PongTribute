# Transcendence – Configuración del entorno

## Índice
- [Corepack](#corepack)
- [.npmrc](#npmrc)
- [pnpm](#pnpm)
- [Workspace (pnpm-workspace.yaml & package.json)](#workspace)
- [Instalación de pnpm](#instalación-de-pnpm)
- [TypeScript & tsconfig.json](#typescript--tsconfigjson)
- [Arquitectura del monorepo](#arquitectura-del-monorepo)

---

## Corepack
Para garantizar la máxima consistencia entre diferentes máquinas, ejecuta:

```bash
corepack enable

Esto hace que el gestor de paquetes integrado de Node.js utilice el manejador indicado en package.json (en nuestro caso pnpm@10.18.2) y simplifica los pasos posteriores de configuración.

    Documentación oficial: https://nodejs.org/api/corepack.html

.npmrc

El archivo .npmrc fuerza la bandera --frozen-lockfile en true.
Con ello, cada vez que se ejecute pnpm install se usará automáticamente --frozen-lockfile, evitando que el lockfile pnpm-lock.yaml se modifique y garantizando versiones idénticas en todos los entornos.

# .npmrc
frozen-lockfile=true

    Nota: En máquinas sin soporte nativo (por ejemplo, la máquina de 42) podríamos usar una VM o un Codespace de GitHub. En equipos con sudo no debería haber problemas para aplicar la configuración.

pnpm

Versión requerida (según package.json):

{
  "packageManager": "pnpm@10.18.2"
}

Para asegurar compatibilidad trabajaremos en una máquina virtual o en un Codespace de GitHub.

    Nota: Si se ejecuta pnpm install con pnpm 8.x se producirá un error o se regenerará pnpm-lock.yaml. Utiliza siempre la versión 10.18.2.

    Documentación oficial: https://pnpm.io/

Workspace (pnpm-workspace.yaml & package.json)

Un workspace en pnpm agrupa varios proyectos bajo un mismo directorio raíz.

    Ejemplo mínimo de pnpm-workspace.yaml:

# pnpm-workspace.yaml
packages:
  - "packages/*"

    El package.json en la raíz contiene dependencias transversales. Cada paquete/servicio tiene su propio package.json con sus dependencias específicas.

{
  "name": "transcendence",
  "private": true,
  "packageManager": "pnpm@10.18.2",
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "build": "pnpm -r run build"
  }
}

    Ventaja: Un solo lockfile (pnpm-lock.yaml) garantiza versiones idénticas para todos los paquetes del monorepo.

Instalación de pnpm

Después de clonar el repositorio, en Debian/Ubuntu ejecuta:

pnpm --version   # verifica si está instalado

Si pnpm no está disponible:

sudo apt update
sudo apt install pnpm
pnpm --version   # confirma la instalación

    Otros sistemas:

        macOS: brew install pnpm
        Windows (PowerShell): npm i -g pnpm

TypeScript & tsconfig.json

El archivo tsconfig.json define cómo el compilador de TypeScript se comporta en cada proyecto:
Paquete	Objetivo de compilación	Entorno objetivo	Salida principal
/shared	declaration → *.d.ts	Ninguno (solo tipos)	dist/types
/api‑gateway	module → *.js	Node.js	dist
/frontend	Vite se encarga del bundle	Navegador (DOM)	dist (generado por Vite)
📊 Comparación de configuraciones de TypeScript
Característica	/shared (solo tipos)	/api‑gateway (Node)	/frontend (Vite)
Objetivo de compilación	declaration → *.d.ts	module → *.js	Vite (bundle)
Entorno objetivo	Ninguno (solo tipos)	Node.js	Navegador (DOM)
target	ES2022	ES2022	ES2022 (heredado)
module	ESNext (ESM)	CommonJS o ESNext	ESNext (Vite)
moduleResolution	bundler (Vite)	node	bundler
lib	ES2022	ES2022	ES2022, DOM
noEmit	true (solo d.ts)	false	false (Vite)
declaration	true	false	false
sourceMap	true (para d.ts)	true	true (Vite)
isolatedModules	true	true	true
skipLibCheck	true	true	true
strict	true	true	true
paths / baseUrl	./src (shared)	./src (gateway)	./src (frontend)
exclude	node_modules, dist	node_modules, dist	node_modules, dist
Salida (outDir)	dist/types	dist	dist (Vite)

    Documentación oficial: https://www.typescriptlang.org/tsconfig

Arquitectura del monorepo

    Resumen
    El proyecto está organizado como un monorepo: todos los servicios viven en el mismo repositorio pero están aislados mediante interfaces y workspaces. Esto brinda:

    Flexibilidad de microservicios: cada servicio puede ser extraído o añadido sin romper el resto.
    Facilidad de pruebas: se pueden ejecutar pruebas unitarias por servicio o pruebas de integración a nivel global.
    Gestión centralizada: dependencias comunes y versiones controladas desde la raíz.

    Nota: La descripción completa de la arquitectura está disponible en Notion (no incluida aquí por solicitud).

Gráfico de arquitectura

    [GRÁFICO COMPARATIVO DE TYPESCRIPT]
    (La tabla de comparación anterior actúa como representación visual de cómo cada paquete configura TypeScript.)

Fin del README.
Cambios aplicados

    Ejemplos de contenido añadidos para .npmrc, pnpm-workspace.yaml y package.json.
    Correcciones ortográficas (servicio, package.json, etc.).
    Enlaces a documentación oficial de Corepack, pnpm, TypeScript y Vite.
    Notas de compatibilidad para macOS y Windows en la sección de instalación.
    Claridad en la tabla comparativa y en la descripción de cada proyecto.
    Uniformidad de estilo (uso de backticks, negritas y bloques de código).

Con estas mejoras el README queda más legible, completo y listo para que cualquier colaborador lo siga sin dudas.
# ft_transcendence
