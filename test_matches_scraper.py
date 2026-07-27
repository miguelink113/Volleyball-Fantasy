"""
Test para el matches_scraper: buscar partidos por temporada y jornada.
"""

from scraper.matches_scraper import scrape_matches, get_match_url, find_matches_by_round, get_competition_matches_html

print("=" * 80)
print("BÚSQUEDA DE PARTIDOS POR TEMPORADA Y JORNADA")
print("=" * 80)

# Parámetros de ejemplo
COMPETITION_ID = 152
SEASON_ID = 186

# Obtener todos los partidos
all_matches = scrape_matches(COMPETITION_ID, SEASON_ID, round_number=None)

if all_matches:
    print(f"\nTotal de partidos encontrados: {len(all_matches)}\n")
    
    # Agrupar por jornada
    rounds = {}
    for match in all_matches:
        round_num = match.get('round')
        if round_num not in rounds:
            rounds[round_num] = []
        rounds[round_num].append(match)
    
    print(f"Jornadas encontradas: {sorted(rounds.keys())}\n")
    
    # Mostrar detalles de las jornadas 9, 10 y 11
    for round_num in [9, 10, 11]:
        if round_num in rounds:
            print(f"\n{'='*80}")
            print(f"JORNADA {round_num}: {len(rounds[round_num])} partidos")
            print(f"{'='*80}")
            
            for i, match in enumerate(rounds[round_num], 1):
                print(f"\n{i}. mID={match['match_id']}")
                print(f"   URL: {match['url']}")
        else:
            print(f"\n{'='*80}")
            print(f"JORNADA {round_num}: No encontrada")
            print(f"{'='*80}")

else:
    print("No se encontraron partidos")

print("\n" + "=" * 80)
