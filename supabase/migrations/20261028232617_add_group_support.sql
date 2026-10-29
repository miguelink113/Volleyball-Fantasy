-- 1. Añadir group_name a teams
ALTER TABLE public.teams ADD COLUMN group_name text;
-- Actualizar constraint único para permitir el mismo rfevb_id en distintos grupos (aunque rfevb_id es único por equipo, el constraint actual es (season_id, rfevb_id))
-- En realidad, rfevb_id es único global, así que teams no necesita cambiar su constraint único, solo añadir la columna.
-- (Si rfevb_id se repite entre grupos, habría que cambiar el constraint, pero no es el caso).

-- 2. Añadir group_name a rounds
ALTER TABLE public.rounds ADD COLUMN group_name text;

-- 3. Eliminar el constraint antiguo y crear el nuevo
ALTER TABLE public.rounds DROP CONSTRAINT IF EXISTS rounds_season_id_round_number_key;
ALTER TABLE public.rounds ADD CONSTRAINT rounds_season_id_round_number_group_name_key UNIQUE (season_id, round_number, group_name);

-- 4. Añadir group_name a matches (opcional, pero útil para consultas)
ALTER TABLE public.matches ADD COLUMN group_name text;