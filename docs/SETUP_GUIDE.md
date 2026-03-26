# Guía de Configuración Rápida (Setup Guide)

Dado el carácter pedagógico de este proyecto y la necesidad de alternar entre equipos, este documento detalla exactamente cómo se ha montado el proyecto y cómo "echarlo a andar" en un equipo nuevo.

## 1. Requisitos Previos

1. **Node.js** (recomendado versión 20.x o superior).
2. **Git**.
3. Acceso al proyecto en **Supabase** remoto o credenciales de la base de datos.

## 2. Para echar a andar el proyecto en un equipo nuevo

Dado que la estructura ya está inicializada en el repositorio de Git, los pasos para ejecutarlo en un nuevo equipo son muy sencillos:

### Paso A: Clonar y Dependencias

1. Clona el repositorio: `git clone <URL_DEL_REPOSITORIO>`
2. Entra en el directorio: `cd Program-Planner`
3. Instala todas las dependencias: `npm install` (Esto descargará Next.js, Tailwind, shadcn/ui, etc.).

### Paso B: Variables de Entorno

1. Haz una copia del archivo `.env.example` y renómbralo a `.env.local` (este archivo no se sube a Git por seguridad).
2. Configura las variables de Supabase con las credenciales del proyecto remoto:
   ```env
   NEXT_PUBLIC_SUPABASE_URL="https://tu-proyecto.supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="sb_publishable_..."
   ```

### Paso C: Arrancar en Local

Ejecuta el servidor de desarrollo:

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`.

---

## 3. Histórico: ¿Cómo se inicializó el proyecto paso a paso?

_Esta sección es puramente pedagógica para entender de dónde sale el código._

1. **Creación del andamiaje (Next.js 15):**
   Debido a que `npm` no permite nombres de proyecto con letras mayúsculas (y la carpeta se llamaba `Program-Planner`), tuvimos que forzar la creación inicialmente en una carpeta temporal y luego mover los archivos:

   ```bash
   npx create-next-app@latest temp-app --typescript --tailwind --eslint --app --src-dir --turbopack --import-alias "@/*" --use-npm
   ```

2. **Instalación de la UI (shadcn/ui + Tailwind v4):**
   Usamos la librería de componentes _shadcn/ui_. Lanzamos el comando para añadir componentes básicos:

   ```bash
   npx -y shadcn@latest add button card form input label select sheet --yes
   ```

   Como el proyecto aún no tenía el archivo `components.json`, el asistente nos preguntó si queríamos crearlo (respondemos que **Y**).

3. **Configuración del Preset de Diseño (shadcn v4):**
   El asistente nos hizo varias preguntas. A la pregunta del "preset" de diseño:
   ```text
   Which preset would you like to use?
   > Nova - Lucide / Geist
   ```
   Elegimos el preset **Nova** porque nuestra arquitectura exige el uso de los iconos **Lucide** (`lucide-react`) y la tipografía **Geist** (por defecto en Next.js 15). Con esto, se configuró el proyecto y se instalaron los 7 componentes base.

## 4. Pruebas y Calidad de Código (QA)

Antes de hacer commits importantes, verifica que todo compila bien:

- `npm run dev`: Inicia el entorno en local.
- `npm run build`: Genera la versión de producción para detectar errores en Server Components.
- `npm run lint`: Pasa el linter para detectar fallos de sintaxis en Typescript.

## 5. Histórico de Conectividad y Despliegue (Interés Académico)

Una vez tuvimos el código base, nos enfrentamos a dos retos técnicos interesantes para el aprendizaje:

1. **El reto de IPv4 con Supabase (2026-03-25):**
   Muchos entornos de red (incluyendo agentes virtuales y CI/CD) tienen problemas para conectar con bases de datos vía IPv6 si no están optimizados. Para garantizar la conectividad del agente **Antigravity** y de **Vercel**, tuvimos que actualizar la URL de conexión en `.env.local`:
   - **Problema:** Timouts al intentar conectar desde el agente a la base de datos de Supabase.
   - **Solución:** Usar el **Supabase Transport Pooler** con soporte IPv4 (Puerto 5432). La URL pasó de ser directa a usar un pooler optimizado para conexiones intermitentes de "serverless" y agentes.

2. **Despliegue Continuo (CI/CD) en Vercel:**
   Para automatizar el despliegue a [program-planner.vercel.app](https://program-planner.vercel.app/), configuramos:
   - **Renombrado de repositorio:** Vercel prefiere nombres en minúsculas para generar URLs limpias (de `Program-Planner` a `program-planner`).
   - **Estrategia de ramas:** Sincronizamos `develop` (para pruebas del agente) con `main` (producción) para permitir el despliegue inicial.
   - **Automatización via GitHub Actions:** Aunque el primer despliegue fue manual, dejamos listo el workflow `.github/workflows/vercel-deploy.yml` que requiere 3 Secrets en GitHub: `VERCEL_TOKEN`, `VERCEL_ORG_ID` y `VERCEL_PROJECT_ID`.

3. **Configuración de Variables de Entorno en Vercel:**
   No basta con tener el código. En el panel de Vercel (Settings > Environment Variables), replicamos los valores de `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `DATABASE_URL` para que la App pueda hablar con la base de datos en la nube.

---

_Este registro servirá para entender por qué ciertas decisiones técnicas se tomaron durante el arranque del proyecto._

## 6. Calidad por Diseño: Vitest y Playwright (Interés Académico)

Para que el proyecto sea robusto y escalable, hemos implementado un sistema de "Puertas de Calidad" (Quality Gates) que utiliza dos herramientas líderes en la industria:

### 6.1 Vitest (Pruebas de Lógica de Negocio)

- **¿Qué es?:** Es un motor de unit testing extremadamente rápido y nativo para proyectos basados en Vite y Next.js 15.
- **¿Por qué lo usamos?:** En un plan de estudios (currículo), los cálculos de porcentajes y notas son críticos. Vitest nos permite crear pequeñas pruebas matemáticas (ej: `calcFinalGrade`) para asegurar que la lógica siempre es correcta antes de desplegar.
- **Cómo se implementó:**
  1. Instalamos `vitest` y `jsdom`.
  2. Creamos el archivo de salud base `src/domain/__tests__/health.test.ts`.
  3. Añadimos el script `"test": "vitest"` al `package.json`.

### 6.2 Playwright (Pruebas de Accesibilidad y UI)

- **¿Qué es?:** Es un framework de Microsoft que permite automatizar navegadores (Chrome, Firefox, Safari) para probar la web como si fuera un usuario real.
- **¿Por qué lo usamos?:**
  - **Accesibilidad (A11y):** Garantiza que la web sea usable por personas con discapacidad.
  - **Responsividad:** Realiza capturas de pantalla automáticas en `320px` (móvil), `768px` (tablet) y `1280px` (desktop).
- **Cómo se implementó:**
  1. Instalamos `@playwright/test` y `@axe-core/playwright`.
  2. Creamos los archivos de especificación en `tests/ui-quality/`.
  3. Configuramos los scripts `"test:a11y"` y `"test:responsive"`.

### 6.3 Automatización en la Nube (GitHub Actions)

Todo esto se coordina en el archivo `.github/workflows/quality-gates.yml`. Cada vez que haces un Pull Request, el servidor lanza estos dos caballeros para revisar tu código. Si alguno falla, el botón de "Merge" se bloquea (rojo), impidiendo subir código roto a producción.
