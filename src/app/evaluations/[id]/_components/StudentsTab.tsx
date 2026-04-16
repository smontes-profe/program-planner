"use client";

import { useEffect, useMemo, useState } from "react";
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
function parseMoodleCSV(text: string): { student_name: string; last_name: string | null; student_code: string | null; student_email: string | null }[] {
  const normalizeHeader = (value: string) =>
    value
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .trim();

  const parseRow = (row: string): string[] => {
    const cols: string[] = [];
    let inQuotes = false;
    let current = "";
    for (const ch of row) {
      if (ch === '"') {
        inQuotes = !inQuotes;
        continue;
      }
      if (ch === "," && !inQuotes) {
        cols.push(current.trim());
        current = "";
        continue;
      }
      current += ch;
    }
    cols.push(current.trim());
    return cols;
  };

  const cleaned = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = cleaned.trim().split("\n").filter(l => l.trim());
  if (lines.length < 2) return [];

  const header = parseRow(lines[0]);
  const normalizedHeaders = header.map(normalizeHeader);

  const idxApellidos = normalizedHeaders.findIndex(h => h.includes("apellido"));
  const idxNombre = normalizedHeaders.findIndex(
    h => h.includes("nombre") && !h.includes("usuario") && !h.includes("user")
  );
  const idxCodigo = normalizedHeaders.findIndex(h => h.includes("id") && h.includes("estudiante"));
  const idxEmail = normalizedHeaders.findIndex(
    h => h.includes("usuario") || h.includes("email") || h.includes("correo")
  );

  const results: { student_name: string; last_name: string | null; student_code: string | null; student_email: string | null }[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseRow(lines[i]);
    const getValue = (idx: number) => (idx >= 0 ? cols[idx] ?? "" : "");

    const apellidos = getValue(idxApellidos);
    const nombre = getValue(idxNombre);
    const codigo = getValue(idxCodigo);
    const email = getValue(idxEmail);

    if (!nombre && !apellidos) continue;

    const studentCode = codigo ? codigo : null;
    if (!studentCode) continue; // Ignore preview rows without ID

    const studentName = nombre || apellidos || "";

    results.push({
      student_name: studentName,
      last_name: apellidos ? apellidos : null,
      student_code: studentCode,
      student_email: email ? email : null,
    });
  }

  return results;
}

type SortKey = "last_name" | "student_name" | "student_email";

export function StudentsTab({ context }: StudentsTabProps) {
  const [students, setStudents] = useState(context.students);
  const [newLastName, setNewLastName] = useState("");
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();
  const [sortKey, setSortKey] = useState<SortKey>("last_name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  async function handleAdd() {
    if (!newName.trim()) return;
    setIsPending(true);
    const res = await addStudent(context.id, { student_name: newName, last_name: newLastName || null, student_code: newCode || null, student_email: newEmail || null });
    setIsPending(false);
    if (res.ok) {
      setStudents(prev => [...prev, res.data]);
      setNewLastName("");
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

  useEffect(() => {
    setStudents(context.students);
  }, [context.students]);

  const sortedStudents = useMemo(() => {
    const arr = [...students];
    arr.sort((a, b) => {
      const valA = (a[sortKey] ?? "").toLowerCase();
      const valB = (b[sortKey] ?? "").toLowerCase();
      if (valA === valB) {
        const fallback = (a.student_name ?? "").localeCompare(b.student_name ?? "", undefined, { sensitivity: "base" });
        return sortDirection === "asc" ? fallback : -fallback;
      }
      return sortDirection === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });
    return arr;
  }, [students, sortDirection, sortKey]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection(dir => (dir === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  }

  const renderSortableHeader = (label: string, key: SortKey) => (
    <button
      type="button"
      onClick={() => handleSort(key)}
      className="flex items-center gap-1 text-left font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
    >
      <span>{label}</span>
      {sortKey === key && (
        <span className="text-xs">{sortDirection === "asc" ? "▲" : "▼"}</span>
      )}
    </button>
  );

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
          className="w-24"
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <Input
          placeholder="Apellidos"
          value={newLastName}
          onChange={(e) => setNewLastName(e.target.value)}
          className="w-56"
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <Input
          placeholder="Nombre"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="w-44"
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
                <th className="text-left px-4 py-2.5 font-semibold text-zinc-600 dark:text-zinc-400 w-20">ID</th>
                <th className="text-left px-4 py-2.5">{renderSortableHeader("Apellidos", "last_name")}</th>
                <th className="text-left px-4 py-2.5">{renderSortableHeader("Nombre", "student_name")}</th>
                <th className="text-left px-4 py-2.5">{renderSortableHeader("Email", "student_email")}</th>
                <th className="text-right px-4 py-2.5 font-semibold text-zinc-600 dark:text-zinc-400 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {sortedStudents.map((s, i) => (
                <tr key={s.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                  <td className="px-4 py-2 text-zinc-400 font-mono text-xs">{i + 1}</td>
                  <td className="px-4 py-2 font-mono text-xs text-zinc-500">{s.student_code || "—"}</td>
                  <td className="px-4 py-2 text-zinc-700 dark:text-zinc-300 text-sm">{s.last_name || "—"}</td>
                  <td className="px-4 py-2 font-medium text-zinc-900 dark:text-zinc-100 text-sm">{s.student_name}</td>
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
