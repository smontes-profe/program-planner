/**
 * Helpers de UI para parseo y formateo de notas en el módulo de evaluación.
 * Extraídos de GradesTab.tsx para permitir tests unitarios.
 */

/** Parsea una nota introducida por el usuario (acepta coma como decimal). Rango [0, 10]. */
export function parseGrade(raw: string): { ok: true; value: number } | { ok: false; error: string } {
  const value = raw.replace(",", ".").trim();
  const parsed = Number(value);
  if (value.length === 0 || Number.isNaN(parsed)) return { ok: false, error: "Introduce una nota valida." };
  if (parsed < 0 || parsed > 10) return { ok: false, error: "La nota debe estar entre 0 y 10." };
  return { ok: true, value: Math.round(parsed * 100) / 100 };
}

/** Parsea una nota entera (sin decimales). Rango [0, 10]. Acepta "NE" (No evaluad@) → -1. */
export function parseGradeInteger(raw: string): { ok: true; value: number } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (trimmed.toUpperCase() === "NE") return { ok: true, value: -1 };
  const value = trimmed.replace(",", ".");
  const parsed = Number(value);
  if (value.length === 0 || Number.isNaN(parsed)) return { ok: false, error: "Introduce una nota valida o 'NE'." };
  if (parsed < 0 || parsed > 10) return { ok: false, error: "La nota debe estar entre 0 y 10, o 'NE'." };
  if (!Number.isInteger(parsed)) return { ok: false, error: "La nota ajustada debe ser un numero entero (sin decimales)." };
  return { ok: true, value: parsed };
}

/** Formatea un valor numérico para mostrarlo en un input de nota. -1 se muestra como "NE". */
export function formatInputValue(value: number | null): string {
  if (value === null) return "";
  if (value === -1) return "NE";
  if (Number.isInteger(value)) return `${value}`;
  return `${Math.round(value * 100) / 100}`;
}
