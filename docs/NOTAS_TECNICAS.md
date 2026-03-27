# Notas Técnicas y Registro de Problemas

Este documento registra problemas críticos, decisiones de arquitectura de último momento y bugs detectados que requieren atención antes de proceder con el backlog principal.

## Problemas Detectados (2026-03-27)

### 1. Ausencia de Tablas en Base de Datos (Supabase)
- **Problema**: A pesar de existir archivos de migración en `supabase/migrations`, las tablas `profiles`, `organizations` y `organization_memberships` no estaban creadas en la base de datos de producción/dev de Supabase.
- **Impacto**: El sistema falla al intentar realizar cualquier operación de base de datos o autenticación (Sever Actions devuelven errores de relación inexistente).
- **Acción**: Aplicar manualmente las migraciones del esquema fundacional y el esquema de currículum.

### 2. Falta de Flujo de Autenticación (Auth UI)
- **Problema**: La aplicación utiliza `supabase.auth.getUser()` para autorizar acciones, pero no existe una interfaz para que el usuario inicie sesión o se registre.
- **Impacto**: El usuario no puede pasar de la página de listado de currículos (devuelve "Usuario no autenticado").
- **Acción**: Implementar `Phase 1.5 - Auth UI` que incluya:
  - Pantalla de login/registro.
  - Creación automática de perfil tras el primer acceso.
  - Widget de organización para que el usuario pueda tener un contexto de pertenencia (necesario para la Phase 2 y 3).

### 3. Conflicto de Importación 'buttonVariants'
- **Problema**: Intentar importar `buttonVariants` desde un archivo `"use client"` (`button.tsx`) dentro de un Server Component provocaba errores de ejecución.
- **Acción**: Se ha movido la lógica de variantes a `button-variants.ts` (archivo neutro) para permitir su uso universal. (Resuelto).

---

## Decisiones de Implementación (Auth)
- Usaremos el sistema de **Auth de Supabase** integrado.
- Al registrarse, si el usuario no tiene organización, se le ofrecerá crear una o se le asignará una "Organización Personal" temporal para pruebas.
