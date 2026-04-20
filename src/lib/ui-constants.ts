/**
 * Constantes centralizadas de UI para mantener consistencia visual en toda la app.
 * Modificar aquí para cambiar el ancho de todos los paneles laterales de edición.
 */

/** Ancho estándar para paneles laterales (Sheet) de edición de currículos y programaciones. */
export const SHEET_CONTENT_CLASS =
  "bg-white dark:bg-zinc-950" as const;

/** Igual que SHEET_CONTENT_CLASS pero para paneles con layout flex personalizado (scroll interno). */
export const SHEET_CONTENT_FLEX_CLASS =
  "bg-white dark:bg-zinc-950 w-full flex flex-col h-full p-0" as const;
