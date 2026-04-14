"use client";

import { useState } from "react";
import { type EvaluationContextFull } from "@/domain/evaluation/types";
import { addStudent, deleteStudent, bulkImportStudents } from "@/domain/evaluation/actions";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2, UserPlus, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface StudentsTabProps {
  readonly context: EvaluationContextFull;
}

/** Parse Moodle-style CSV (comma-separated, quoted, with Spanish decimal commas) */
function parseMoodleCSV(text: string): { student_name: string; student_code: string | null; student_email: string | null }[] {
  // Normalize: strip BOM, Windows line endings
  const cleaned = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = cleaned.trim().split("\n").filter(l => l.trim());
  if (lines.length < 2) return [];

  // Parse header to find column indices
  const headerLine = lines[0];
  const headers: string[] = [];
  let inQuotes = false;
  let current = "";
  for (const ch of headerLine) {
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === "," && !inQuotes) { headers.push(current.trim()); current = ""; continue; }
    current += ch;
  }
  if (current.trim()) headers.push(current.trim());

  // Match columns flexibly
  const idxApellidos = headers.findIndex(h => h.toLowerCase().includes("apellido"));
  const idxNombre = headers.findIndex(h => /^nombre$/i.test(h));
  const idxCodigo = headers.findIndex(h => h.toLowerCase().includes("id de estudiante"));
  const idxEmail = headers.findIndex(h => h.toLowerCase().includes("usuario") || h.toLowerCase().includes("email"));

  function parseLine(line: string): string[] {
    const cols: string[] = [];
    let q = false;
    let cur = "";
    for (const ch of line) {
      if (ch === '"') { q = !q; continue; }
      if (ch === "," && !q) { cols.push(cur.trim()); cur = ""; continue; }
      cur += ch;
    }
    if (cur.trim()) cols.push(cur.trim());
    return cols;
  }

  const results: { student_name: string; student_code: string | null; student_email: string | null }[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i]);
    if (cols.length < 2) continue;

    const apellidos = idxApellidos >= 0 ? cols[idxApellidos] || "" : "";
    const nombre = idxNombre >= 0 ? cols[idxNombre] || "" : "";
    const code = idxCodigo >= 0 ? (cols[idxCodigo] || null) : null;
    const email = idxEmail >= 0 ? (cols[idxEmail] || null) : null;

    // Filter out rows with empty code (like preview users)
    if (!code || code === "") continue;

    results.push({
      student_name: `${apellidos}, ${nombre}`.replace(/, $/, "").replace(/^, /, ""),
      student_code: code,
      student_email: email,
    });
  }

  return results;
}

export function StudentsTab({ context }: StudentsTabProps) {
  const [students, setStudents] = useState(context.students);
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  async function handleAdd() {
    if (!newName.trim()) return;
    setIsPending(true);
    const res = await addStudent(context.id, { student_name: newName, student_code: newCode || null, student_email: newEmail || null });
    setIsPending(false);
    if (res.ok) {
      setStudents(prev => [...prev, res.data]);
      setNewName("");
      setNewCode("");
      setNewEmail("");
      router.refresh();
    }
  }

  async function handleDelete(studentId: string) {
    setIsPending(true);
    const res = await deleteStudent(studentId);
    setIsPending(false);
    if (res.ok) {
      setStudents(prev => prev.filter(s => s.id !== studentId));
      router.refresh();
    }
  }

  async function handleBulkImport(csvText: string) {
    const parsed = parseMoodleCSV(csvText);
    if (parsed.length === 0) return;
    const res = await bulkImportStudents(context.id, parsed);
    if (res.ok) {
      setStudents(prev => [...prev, ...res.data]);
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Alumnado</h2>
      </div>

      {/* Add student form */}
      <div className="flex items-center gap-2 flex-wrap">
        <Input
          placeholder="ID"
          value={newCode}
          onChange={(e) => setNewCode(e.target.value)}
          className="w-32"
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <Input
          placeholder="Nombre completo"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="w-64"
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <Input
          placeholder="Email (opcional)"
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          className="w-56"
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <Button onClick={handleAdd} disabled={isPending || !newName.trim()} size="sm">
          {isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
          Añadir
        </Button>
      </div>

      {/* Bulk import */}
      <BulkImportForm onImport={handleBulkImport} />

      {/* Student list */}
      {students.length === 0 ? (
        <div className="text-center py-12 text-zinc-400 text-sm">
          <p>No hay alumnos en este contexto de evaluación.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                <th className="text-left px-4 py-2.5 font-semibold text-zinc-600 dark:text-zinc-400 w-8">#</th>
                <th className="text-left px-4 py-2.5 font-semibold text-zinc-600 dark:text-zinc-400 w-24">ID</th>
                <th className="text-left px-4 py-2.5 font-semibold text-zinc-600 dark:text-zinc-400">Nombre</th>
                <th className="text-left px-4 py-2.5 font-semibold text-zinc-600 dark:text-zinc-400">Email</th>
                <th className="text-right px-4 py-2.5 font-semibold text-zinc-600 dark:text-zinc-400 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {students.map((s, i) => (
                <tr key={s.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                  <td className="px-4 py-2 text-zinc-400 font-mono text-xs">{i + 1}</td>
                  <td className="px-4 py-2 font-mono text-xs text-zinc-500">{s.student_code || "—"}</td>
                  <td className="px-4 py-2 font-medium text-zinc-900 dark:text-zinc-100">{s.student_name}</td>
                  <td className="px-4 py-2 text-zinc-500 text-xs">{s.student_email || "—"}</td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => handleDelete(s.id)}
                      disabled={isPending}
                      className="p-1 text-zinc-400 hover:text-red-600 transition-colors"
                      title="Eliminar alumno"
                    >
                      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Bulk Import Form ────────────────────────────────────────────────────────
function BulkImportForm({ onImport }: { onImport: (csv: string) => void }) {
  const [fileName, setFileName] = useState("");

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (text) onImport(text);
    };
    reader.readAsText(file, "UTF-8");
  }

  return (
    <div className="flex items-center gap-2">
      <label className="flex items-center gap-2 cursor-pointer rounded-md border border-zinc-200 dark:border-zinc-800 px-3 py-1.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
        <input type="file" accept=".csv,text/csv" onChange={handleFileChange} className="hidden" />
        <FileUp className="h-4 w-4 text-zinc-500" />
        <span className="text-zinc-700 dark:text-zinc-300">
          {fileName || "Importar CSV..."}
        </span>
      </label>
      {fileName && (
        <p className="text-xs text-zinc-400">
          {fileName} seleccionado
        </p>
      )}
    </div>
  );
}
