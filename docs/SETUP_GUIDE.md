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

*Esta sección es puramente pedagógica para entender de dónde sale el código.*

1. **Creación del andamiaje (Next.js 15):**
   Debido a que `npm` no permite nombres de proyecto con letras mayúsculas (y la carpeta se llamaba `Program-Planner`), tuvimos que forzar la creación inicialmente en una carpeta temporal y luego mover los archivos:
   ```bash
   npx create-next-app@latest temp-app --typescript --tailwind --eslint --app --src-dir --turbopack --import-alias "@/*" --use-npm
   ```

2. **Instalación de la UI (shadcn/ui + Tailwind v4):**
   Usamos la librería de componentes *shadcn/ui*. Lanzamos el comando para añadir componentes básicos:
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
