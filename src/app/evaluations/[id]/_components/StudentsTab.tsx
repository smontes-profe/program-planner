"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { type EvaluationContextFull, type EvaluationStudent } from "@/domain/evaluation/types";
import { addStudent, deleteStudent, bulkImportStudents, updateStudent } from "@/domain/evaluation/actions";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2, UserPlus, FileUp, AlertCircle, CheckCircle2, X, Info, PencilLine, Check, Ban, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface StudentsTabProps {
  readonly context: EvaluationContextFull;
}

interface ParsedStudentRow {
  student_name: string;
  last_name: string | null;
  student_code: string | null;
  student_email: string | null;
  error?: string;
}

/** Parse Moodle-style CSV (comma-separated, quoted, with Spanish decimal commas) */
function parseMoodleCSV(text: string): { data: ParsedStudentRow[]; errors: string[] } {
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
  if (lines.length < 2) return { data: [], errors: ["El archivo está vacío o no tiene cabecera."] };

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

  const results: ParsedStudentRow[] = [];
  const parseErrors: string[] = [];

  // Basic header validation
  if (idxNombre === -1 && idxApellidos === -1) {
    parseErrors.push("No se encontró la columna de 'Nombre' o 'Apellidos'.");
  }
  if (idxCodigo === -1) {
    parseErrors.push("No se encontró la columna de 'ID' o 'Identificador'.");
  }
  for (let i = 1; i < lines.length; i++) {
    const cols = parseRow(lines[i]);
    const getValue = (idx: number) => (idx >= 0 ? cols[idx] ?? "" : "");

    const apellidos = getValue(idxApellidos);
    const nombre = getValue(idxNombre);
    const codigo = getValue(idxCodigo);
    const email = getValue(idxEmail);

    if (!nombre && !apellidos) {
      results.push({
        student_name: "",
        last_name: null,
        student_code: codigo || null,
        student_email: email || null,
        error: "Nombre y apellidos ausentes",
      });
      continue;
    }

    if (!codigo) {
      results.push({
        student_name: nombre || apellidos || "",
        last_name: apellidos || null,
        student_code: null,
        student_email: email || null,
        error: "Código de estudiante (ID) ausente",
      });
      continue;
    }

    results.push({
      student_name: nombre || apellidos || "",
      last_name: apellidos ? apellidos : null,
      student_code: codigo,
      student_email: email ? (email.includes("@") ? email : null) : null,
      error: email && !email.includes("@") ? "Email inválido" : undefined,
    });
  }

  return { data: results, errors: parseErrors };
}

type SortKey = "last_name" | "student_name" | "student_email";

export function StudentsTab({ context }: StudentsTabProps) {
  const [students, setStudents] = useState(context.students);
  const [newLastName, setNewLastName] = useState("");
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();
  const [sortKey, setSortKey] = useState<SortKey>("last_name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [importPreview, setImportPreview] = useState<{ data: ParsedStudentRow[]; fileName: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    student_name: "",
    last_name: "",
    student_code: "",
    student_email: "",
    notes: "",
  });

  async function handleAdd() {
    if (!newName.trim()) return;
    setPendingId("add");
    const res = await addStudent(context.id, { 
      student_name: newName, 
      last_name: newLastName || null, 
      student_code: newCode || null, 
      student_email: newEmail || null 
    });
    setPendingId(null);
    if (res.ok) {
      setStudents(prev => [...prev, res.data]);
      setNewLastName("");
      setNewName("");
      setNewCode("");
      setNewEmail("");
      router.refresh();
    }
  }

  function startEditing(s: EvaluationStudent) {
    setEditingId(s.id);
    setEditForm({
      student_name: s.student_name,
      last_name: s.last_name || "",
      student_code: s.student_code || "",
      student_email: s.student_email || "",
      notes: s.notes || "",
    });
  }

  async function handleUpdate() {
    if (!editingId || !editForm.student_name.trim()) return;
    
    setPendingId(editingId);
    try {
      const res = await updateStudent(context.id, editingId, {
        student_name: editForm.student_name,
        last_name: editForm.last_name || null,
        student_code: editForm.student_code || null,
        student_email: editForm.student_email || null,
        notes: editForm.notes || null,
      });
      
      if (res.ok) {
        setStudents(prev => prev.map(s => s.id === editingId ? res.data : s));
        setEditingId(null);
        router.refresh();
      }
    } finally {
      setPendingId(null);
    }
  }

  async function handleDelete(studentId: string) {
    setPendingId(studentId);
    try {
      const res = await deleteStudent(context.id, studentId);
      if (res.ok) {
        setStudents(prev => prev.filter(s => s.id !== studentId));
        router.refresh();
      }
    } finally {
      setPendingId(null);
    }
  }

  async function handleBulkImport() {
    if (!importPreview) return;
    const validData = importPreview.data.filter(s => !s.error);
    if (validData.length === 0) return;
    
    setPendingId("import");
    const res = await bulkImportStudents(context.id, validData);
    setPendingId(null);
    
    if (res.ok) {
      setStudents(prev => [...prev, ...res.data]);
      setImportPreview(null);
      router.refresh();
    }
  }

  function handleFileSelect(text: string, fileName: string) {
    const parsed = parseMoodleCSV(text);
    setImportPreview({ data: parsed.data, fileName });
  }

  useEffect(() => {
    setStudents(context.students);
  }, [context.students]);

  const filteredStudents = useMemo(() => {
    let arr = [...students];

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      arr = arr.filter(s =>
        (s.student_name ?? "").toLowerCase().includes(term) ||
        (s.last_name ?? "").toLowerCase().includes(term) ||
        (s.student_code ?? "").toLowerCase().includes(term) ||
        (s.student_email ?? "").toLowerCase().includes(term)
      );
    }

    // Sort logic
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
  }, [students, sortDirection, sortKey, searchTerm]);

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
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Alumnado</h2>
      </div>

      {/* Bulk import */}
      <BulkImportForm onSelect={handleFileSelect} />

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
        <Button onClick={handleAdd} disabled={pendingId !== null || !newName.trim()} size="sm">
          {pendingId === "add" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
          Añadir
        </Button>
      </div>

      <div className="py-2">
        <Input
          placeholder="Buscar alumno..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full sm:w-64"
        />
      </div>

      {importPreview && (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 p-4 space-y-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileUp className="h-5 w-5 text-zinc-500" />
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Vista previa de importación: {importPreview.fileName}</h3>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setImportPreview(null)} className="h-8 w-8 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="max-h-60 overflow-y-auto border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-zinc-100 dark:bg-zinc-900 shadow-sm">
                <tr>
                  <th className="px-3 py-2 text-left w-10">#</th>
                  <th className="px-3 py-2 text-left">ID</th>
                  <th className="px-3 py-2 text-left">Apellidos</th>
                  <th className="px-3 py-2 text-left">Nombre</th>
                  <th className="px-3 py-2 text-left">Email</th>
                  <th className="px-3 py-2 text-left">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {importPreview.data.map((row, i) => (
                  <tr key={i} className={cn(row.error ? "bg-red-50/30 dark:bg-red-900/10" : "hover:bg-zinc-50 dark:hover:bg-zinc-900/50")}>
                    <td className="px-3 py-1.5 text-zinc-400">{i + 1}</td>
                    <td className="px-3 py-1.5 font-mono text-zinc-400">{row.student_code || "—"}</td>
                    <td className="px-3 py-1.5">{row.last_name || "—"}</td>
                    <td className="px-3 py-1.5 font-medium">{row.student_name || "—"}</td>
                    <td className="px-3 py-1.5">{row.student_email || "—"}</td>
                    <td className="px-3 py-1.5">
                      {row.error ? (
                        <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                          <AlertCircle className="h-3 w-3" />
                          {row.error}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                          <CheckCircle2 className="h-3 w-3" />
                          Válido
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-500">
              Válidos: <span className="text-green-600 font-semibold">{importPreview.data.filter(s => !s.error).length}</span> / Total: {importPreview.data.length}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setImportPreview(null)}>Cancelar</Button>
              <Button 
                onClick={handleBulkImport} 
                disabled={pendingId !== null || importPreview.data.filter(s => !s.error).length === 0} 
                size="sm"
              >
                {pendingId === "import" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <UserPlus className="h-4 w-4 mr-1" />}
                Confirmar Importación
              </Button>
            </div>
          </div>
          
          {importPreview.data.some(s => s.error) && (
            <Alert variant="destructive" className="py-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Se han detectado {importPreview.data.filter(s => s.error).length} registros con errores. Solo se importarán los registros válidos.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

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
              {filteredStudents.map((s, i) => {
                const isEditing = editingId === s.id;
                return (
                  <Fragment key={s.id}>
                    <tr className={cn(
                      "transition-colors",
                      isEditing ? "bg-emerald-50/50 dark:bg-emerald-900/10" : "hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30"
                    )}>
                      <td className="px-4 py-2 text-zinc-400 font-mono text-xs">{i + 1}</td>
                      <td className="px-4 py-2">
                        {isEditing ? (
                          <Input
                            value={editForm.student_code}
                            onChange={e => setEditForm(prev => ({ ...prev, student_code: e.target.value }))}
                            className="h-8 w-24 font-mono text-xs"
                            placeholder="ID"
                          />
                        ) : (
                          <span className="font-mono text-xs text-zinc-500">{s.student_code || "—"}</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {isEditing ? (
                          <Input
                            value={editForm.last_name}
                            onChange={e => setEditForm(prev => ({ ...prev, last_name: e.target.value }))}
                            className="h-8 w-full text-sm"
                            placeholder="Apellidos"
                          />
                        ) : (
                          <span className="text-zinc-700 dark:text-zinc-300 text-sm">{s.last_name || "—"}</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {isEditing ? (
                          <Input
                            value={editForm.student_name}
                            onChange={e => setEditForm(prev => ({ ...prev, student_name: e.target.value }))}
                            className="h-8 w-full text-sm font-medium"
                            placeholder="Nombre"
                          />
                        ) : (
                          <span className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">{s.student_name}</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {isEditing ? (
                          <Input
                            value={editForm.student_email}
                            onChange={e => setEditForm(prev => ({ ...prev, student_email: e.target.value }))}
                            className="h-8 w-full text-xs"
                            placeholder="Email"
                          />
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="text-zinc-500 text-xs">{s.student_email || "—"}</span>
                            {s.notes && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <MessageSquare className="h-3.5 w-3.5 text-amber-500 shrink-0 cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-[280px] text-xs whitespace-pre-wrap">
                                  {s.notes}
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isEditing ? (
                            <>
                              <button
                                onClick={handleUpdate}
                                disabled={pendingId !== null}
                                className="p-1 text-emerald-600 hover:text-emerald-700 transition-colors"
                                title="Guardar"
                              >
                                {pendingId === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                disabled={pendingId !== null}
                                className="p-1 text-zinc-400 hover:text-zinc-600 transition-colors"
                                title="Cancelar"
                              >
                                <Ban className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEditing(s)}
                                disabled={pendingId !== null}
                                className="p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                                title="Editar"
                              >
                                <PencilLine className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(s.id)}
                                disabled={pendingId !== null}
                                className="p-1 text-zinc-400 hover:text-red-600 transition-colors"
                                title="Eliminar alumno"
                              >
                                {pendingId === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                    {/* Fila expandida de observaciones en modo edición */}
                    {isEditing && (
                      <tr className="bg-emerald-50/50 dark:bg-emerald-900/10">
                        <td colSpan={6} className="px-4 pb-3 pt-0">
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                              <MessageSquare className="h-3.5 w-3.5" />
                              Observaciones
                            </label>
                            <Textarea
                              value={editForm.notes}
                              onChange={e => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                              placeholder="Observaciones sobre las notas de este alumno..."
                              className="text-sm resize-none min-h-[80px]"
                              rows={3}
                            />
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Bulk Import Form ────────────────────────────────────────────────────────
function BulkImportForm({ onSelect }: { onSelect: (csv: string, fileName: string) => void }) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file.name);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (text) onSelect(text, file.name);
      // Reset input to allow selecting same file again
      e.target.value = "";
    };
    reader.readAsText(file, "UTF-8");
  }

  return (
    <div className="flex items-center gap-2">
      <label className="flex items-center gap-2 cursor-pointer rounded-md border border-zinc-200 dark:border-zinc-800 px-3 py-1.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
        <input type="file" accept=".csv,text/csv" onChange={handleFileChange} className="hidden" />
        <FileUp className="h-4 w-4 text-zinc-500" />
        <span className="text-zinc-700 dark:text-zinc-300 font-medium">
          Importar CSV
        </span>
      </label>
      
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <span role="button" className="p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-help">
              <Info className="h-4 w-4" />
            </span>
          </TooltipTrigger>
          <TooltipContent side="right" className="p-3">
            <p className="font-semibold mb-1">Formato esperado:</p>
            <p className="mb-2 italic">CSV exportado de Moodle</p>
            <ul className="space-y-1 list-disc pl-3">
              <li>Cabeceras requeridas: <strong>Nombre</strong>, <strong>Apellidos</strong> e <strong>ID estudiante</strong> (o Número ID).</li>
              <li>Soporta columna opcional: <strong>Email</strong> o <strong>Dirección de correo</strong>.</li>
              <li>Formato: valores entre comillas y separados por comas.</li>
            </ul>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
