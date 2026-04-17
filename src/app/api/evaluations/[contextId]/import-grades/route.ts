import { NextRequest, NextResponse } from "next/server";
import { bulkUpsertScores, getEvaluationContext } from "@/domain/evaluation/actions";
import { getPlan } from "@/domain/teaching-plan/actions";

type ParsedCsvRow = string[];

function parseCsvRows(content: string): ParsedCsvRow[] {
  const rows: ParsedCsvRow[] = [];
  let current = "";
  let row: string[] = [];
  let inQuotes = false;
  const contentFiltered = content.replace(/^\uFEFF/, "");

  const pushCell = () => {
    row.push(current);
    current = "";
  };

  const pushRow = () => {
    row.push(current);
    rows.push(row);
    current = "";
    row = [];
  };

  for (let i = 0; i < contentFiltered.length; i++) {
    const char = contentFiltered[i];
    const nextChar = contentFiltered[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === ",") {
      pushCell();
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && nextChar === "\n") i += 1;
      pushRow();
      continue;
    }

    current += char;
  }

  if (current !== "" || row.length > 0) {
    pushRow();
  }

  return rows;
}

function normalizeString(value: string | undefined): string {
  return (value ?? "").trim();
}

interface InstrumentColumn {
  columnIndex: number;
  instrumentId: string;
  label: string;
  maxPoints: number | null;
}

export async function POST(
  req: NextRequest,
  routeContext: { params: Promise<{ contextId: string }> }
) {
  const params = await routeContext.params;
  const contextId = params.contextId;

  if (!contextId) {
    return NextResponse.json({ error: "Falta el ID del contexto" }, { status: 400 });
  }

  const contentType = req.headers.get("content-type") || "";

  // 1. Handle JSON (Bulk upsert validated scores)
  if (contentType.includes("application/json")) {
    try {
      const body = await req.json();
      const scores = body.scores;
      if (!Array.isArray(scores)) {
        return NextResponse.json({ error: "El cuerpo debe contener un array de notas" }, { status: 400 });
      }

      const result = await bulkUpsertScores(contextId, scores);
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }

      return NextResponse.json({ importedCount: scores.length });
    } catch (err) {
      return NextResponse.json({ error: "Error al procesar JSON" }, { status: 400 });
    }
  }

  // 2. Handle FormData (Legacy parser)
  const formData = await req.formData();
  const file = formData.get("grades_csv");
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: "No se ha enviado ningún archivo" }, { status: 400 });
  }

  const text = await file.text();
  if (!text.trim()) {
    return NextResponse.json({ error: "El archivo está vacío" }, { status: 400 });
  }

  const rows = parseCsvRows(text);
  const cleanedRows = rows.filter(row => row.some(cell => cell.trim().length > 0));
  if (cleanedRows.length <= 1) {
    return NextResponse.json({ error: "El archivo no contiene datos" }, { status: 400 });
  }

  const header = cleanedRows[0];
  const dataRows = cleanedRows.slice(1);
  if (header.length <= 6) {
    return NextResponse.json({ error: "El archivo no tiene columnas de instrumentos" }, { status: 400 });
  }

  const contextResult = await getEvaluationContext(contextId);
  if (!contextResult.ok || !contextResult.data) {
    return NextResponse.json({ error: "Contexto no encontrado" }, { status: 404 });
  }

  const context = contextResult.data;
  const planResults = await Promise.all(
    (context.plan_ids || []).map((planId) => getPlan(planId))
  );
  const plans = planResults.filter((pr) => pr.ok).map((pr) => pr.data);
  const planInstruments = plans
    .flatMap((plan) => plan.instruments ?? [])
    .filter((instrument) => !instrument.is_pri_pmi);
  const instrumentById = new Map(planInstruments.map((instrument) => [instrument.id, instrument]));
  const instrumentByCode = new Map(
    planInstruments
      .filter((instrument) => instrument.code)
      .map((instrument) => [instrument.code?.trim() ?? "", instrument])
  );

  const headerInstruments: InstrumentColumn[] = [];
  const missingHeaderInstruments = new Set<string>();

  for (let colIndex = 6; colIndex < header.length; colIndex += 1) {
    const rawLabel = normalizeString(header[colIndex]);
    const idMatch = rawLabel.match(/\|([A-Za-z0-9-]+)$/);
    const codeMatch = rawLabel.match(/^([0-9]+(?:\.[0-9]+)*)/);
    let instrumentId: string | undefined;

    if (idMatch && instrumentById.has(idMatch[1])) {
      instrumentId = idMatch[1];
    } else if (codeMatch && instrumentByCode.has(codeMatch[1])) {
      instrumentId = instrumentByCode.get(codeMatch[1])!.id;
    }

    if (!instrumentId) {
      missingHeaderInstruments.add(rawLabel);
      continue;
    }

    const maxMatch = rawLabel.match(/Puntos totales:\s*([0-9]+(?:[.,][0-9]+)?)/i);
    const maxPoints = maxMatch ? Number(maxMatch[1].replace(",", ".")) : null;

    headerInstruments.push({
      columnIndex: colIndex,
      instrumentId,
      label: rawLabel.split("|")[0].trim(),
      maxPoints,
    });
  }

  const studentsByEmail = new Map(context.students.filter(s => s.student_email).map(s => [s.student_email!.trim().toLowerCase(), s]));

  const missingStudentEmails = new Set<string>();
  const invalidColumns: { row: number; column: string; value: string }[] = [];
  const scoreRows: {
    student_id: string;
    instrument_id: string;
    plan_ce_id: null;
    score_value: number;
  }[] = [];

  dataRows.forEach((row, rowIndex) => {
    const emailCell = normalizeString(row[2]).toLowerCase();
    const student = emailCell ? studentsByEmail.get(emailCell) : undefined;
    if (!student) {
      if (emailCell) missingStudentEmails.add(emailCell);
      return;
    }

    headerInstruments.forEach(col => {
      const rawValue = normalizeString(row[col.columnIndex]);
      if (!rawValue || rawValue === "-") return;

      const numeric = Number(rawValue.replace(",", "."));
      if (Number.isNaN(numeric)) {
        invalidColumns.push({ row: rowIndex + 2, column: col.label, value: rawValue });
        return;
      }

      let val = numeric;
      if (col.maxPoints && col.maxPoints > 0) val = (numeric / col.maxPoints) * 10;
      val = Math.min(10, Math.max(0, val));

      scoreRows.push({
        student_id: student.id,
        instrument_id: col.instrumentId,
        plan_ce_id: null,
        score_value: Number(val.toFixed(2)),
      });
    });
  });

  if (scoreRows.length > 0) {
    const result = await bulkUpsertScores(contextId, scoreRows);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({
    importedCount: scoreRows.length,
    missingStudents: Array.from(missingStudentEmails),
    missingInstruments: Array.from(missingHeaderInstruments),
    invalidEntries: invalidColumns,
  });
}
