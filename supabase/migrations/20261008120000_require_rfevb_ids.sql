-- Los identificadores oficiales de RFEVB son la clave natural del catálogo.
-- Permitir NULL rompería la idempotencia del upsert y el cruce con la fuente.
-- Todas las ingestas parten del scraper, así que en la práctica siempre vienen.

alter table public.teams
    alter column rfevb_id set not null;

alter table public.players
    alter column rfevb_id set not null;