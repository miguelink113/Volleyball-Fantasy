-- Añadir claves foráneas a la tabla matches para asegurar la integridad referencial

ALTER TABLE public.matches
    ADD CONSTRAINT fk_matches_home_team
        FOREIGN KEY (home_team_id) REFERENCES public.teams(id) ON DELETE CASCADE;

ALTER TABLE public.matches
    ADD CONSTRAINT fk_matches_away_team
        FOREIGN KEY (away_team_id) REFERENCES public.teams(id) ON DELETE CASCADE;