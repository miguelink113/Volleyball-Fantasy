-- Arreglar nombres genéricos de competiciones
UPDATE competitions SET name = 'Superliga Femenina 2' WHERE rfevb_id = '164';
UPDATE competitions SET name = 'Liga Iberdrola' WHERE rfevb_id = '165';
UPDATE competitions SET name = 'Superliga Masculina' WHERE rfevb_id = '166';
UPDATE competitions SET name = 'Superliga 2 Masculina' WHERE rfevb_id = '167';

-- Desmarcar la temporada pasada para que no aparezca en el Dashboard
UPDATE seasons
SET is_current = false
WHERE name = '2025/26' OR name = '2025-26';