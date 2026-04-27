export type SpecialAdjustedGradeCode =
  | "NE"
  | "MH"
  | "NM"
  | "SCA"
  | "PCO"
  | "EX"
  | "RC"
  | "CV"
  | "PFEOE";

export interface AdjustedGradeOption {
  readonly value: number;
  readonly code: string;
  readonly label: string;
  readonly description: string;
}

export const ADJUSTED_GRADE_OPTIONS: AdjustedGradeOption[] = [
  ...Array.from({ length: 10 }, (_, index) => {
    const value = index + 1;
    return {
      value,
      code: String(value),
      label: String(value),
      description: "Calificación numérica",
    };
  }),
  { value: 0, code: "NE", label: "NE", description: "No Evaluado" },
  { value: -1, code: "MH", label: "MH", description: "Matrícula de Honor" },
  { value: -2, code: "NM", label: "NM", description: "Sin Matrícula" },
  { value: -3, code: "SCA", label: "SCA", description: "Superado en cursos anteriores" },
  { value: -4, code: "PCO", label: "PCO", description: "Pendiente de homologación o convalidación" },
  { value: -5, code: "EX", label: "EX", description: "Exento" },
  { value: -6, code: "RC", label: "RC", description: "Con renuncia a convocatoria" },
  { value: -7, code: "CV", label: "CV", description: "Convalidado" },
  { value: -8, code: "PFEOE", label: "PFEOE", description: "Pendiente de Fase de Formación en Empresa u Organismo Equiparado" },
];

const ADJUSTED_GRADE_OPTION_MAP = new Map<number, AdjustedGradeOption>(
  ADJUSTED_GRADE_OPTIONS.map(option => [option.value, option])
);

const ADJUSTED_GRADE_ALLOWED_VALUES = new Set(ADJUSTED_GRADE_OPTIONS.map(option => option.value));

export function isSpecialAdjustedGradeValue(value: number | null | undefined): boolean {
  return typeof value === "number" && value <= 0;
}

export function isCountableAdjustedGradeValue(value: number | null | undefined): boolean {
  return typeof value === "number" && value > 0;
}

export function getAdjustedGradeOption(value: number): AdjustedGradeOption | undefined {
  return ADJUSTED_GRADE_OPTION_MAP.get(value);
}

export function formatAdjustedGradeValue(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "";
  const option = ADJUSTED_GRADE_OPTION_MAP.get(value);
  if (option) return option.label;
  if (Number.isInteger(value)) return `${value}`;
  return `${Math.round(value * 100) / 100}`;
}

export function adjustedGradeValueToSelectValue(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "";
  return `${value}`;
}

export function formatAdjustedGradeDescription(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "";
  const option = ADJUSTED_GRADE_OPTION_MAP.get(value);
  return option ? option.description : formatAdjustedGradeValue(value);
}

export function formatAdjustedGradeSelectLabel(value: number): string {
  const option = ADJUSTED_GRADE_OPTION_MAP.get(value);
  if (!option) return formatAdjustedGradeValue(value);
  return option.value > 0 ? option.label : `${option.code} - ${option.description}`;
}

export function parseAdjustedGradeValue(raw: string): { ok: true; value: number } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return { ok: false, error: "Selecciona una calificación." };

  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed)) {
    return { ok: false, error: "La calificación ajustada debe ser un número entero o una situación especial." };
  }

  if (!ADJUSTED_GRADE_ALLOWED_VALUES.has(parsed)) {
    return { ok: false, error: "Selecciona un valor entre 1 y 10 o una situación especial válida." };
  }

  return { ok: true, value: parsed };
}
