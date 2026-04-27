-- Añade campo de observaciones a evaluation_students
-- Permite a los profesores registrar notas/observaciones sobre un alumno en el contexto de evaluación

alter table evaluation_students
  add column if not exists notes text null;

comment on column evaluation_students.notes is 'Observaciones del profesor sobre el alumno en este contexto de evaluación';
