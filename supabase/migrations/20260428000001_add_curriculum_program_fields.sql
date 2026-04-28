-- Add program informative fields to curriculum_templates
ALTER TABLE public.curriculum_templates 
ADD COLUMN program_title TEXT,
ADD COLUMN program_code TEXT,
ADD COLUMN program_level TEXT CHECK (program_level IN ('FP Básica', 'Grado Medio', 'Grado Superior', 'Máster')),
ADD COLUMN program_course TEXT CHECK (program_course IN ('Primero', 'Segundo', 'NA'));

-- Update comment for clarity
COMMENT ON COLUMN public.curriculum_templates.program_title IS 'Title of the program/degree (e.g., Técnico Superior en DAW)';
COMMENT ON COLUMN public.curriculum_templates.program_code IS 'Mnemonic code of the program/degree (e.g., DAW)';
COMMENT ON COLUMN public.curriculum_templates.program_level IS 'Education level (Básica, Medio, Superior, Máster)';
COMMENT ON COLUMN public.curriculum_templates.program_course IS 'Course year (Primero, Segundo, NA)';
