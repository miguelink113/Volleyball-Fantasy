"""
Script de prueba mejorado para validar la extracción de datos de voleibol.
"""

import requests
from scraper.player_metrics_scraper import process_match_statistics
import pandas as pd

# Descargar HTML
print("=" * 80)
print("EXTRACCIÓN DE DATOS DE VOLEIBOL")
print("=" * 80)

print("\n1. Descargando HTML...")
url = "https://rfevb-web.dataproject.com/MatchStatistics.aspx?mID=13852&ID=152&CID=361&PID=186&type=LegList"
html = requests.get(url).text
print("   ✓ HTML descargado exitosamente")

"""
# Guardar HTML para referencia
with open("match13852.html", "w", encoding="utf8") as f:
    f.write(html)
print("   ✓ HTML guardado en 'match13852.html'")
"""

# Procesar estadísticas de ambos equipos
print("\n2. Procesando estadísticas...")
result_team1 = process_match_statistics(html, team_index=0)
result_team2 = process_match_statistics(html, team_index=1)
print("   ✓ Estadísticas procesadas")

# Análisis del Equipo 1
print("\n" + "=" * 80)
print("EQUIPO 1")
print("=" * 80)

print(f"\nJugadores extraídos: {len(result_team1['players'])}")

# Validar estructura de datos
if result_team1['players']:
    first_player = result_team1['players'][0]
    print(f"\nEstructura de datos del primer jugador:")
    print(f"  - Dorsal: {first_player['Dorsal']}")
    print(f"  - Nombre: {first_player['Nombre']}")
    print(f"  - Número de métricas: {len(first_player['Metricas'])}")
    print(f"  - Métricas: {list(first_player['Metricas'].keys())}")

# Mostrar todos los jugadores
print(f"\nJugadores del Equipo 1:")
for player in result_team1['players']:
    print(f"  {player['Dorsal']:>2} - {player['Nombre']:<30} ({len(player['Metricas'])} métricas)")

# DataFrame Equipo 1
df1 = result_team1['dataframe']
print(f"\nDataFrame Equipo 1:")
print(f"  - Filas: {df1.shape[0]}")
print(f"  - Columnas: {df1.shape[1]}")
print(f"  - Columnas: {list(df1.columns)}")
print(f"\nPrimeras 3 filas:")
print(df1.head(3).to_string())

# Guardar CSV
df1.to_csv('jugadores_equipo1.csv', index=False, encoding='utf-8')
print(f"\n✓ Guardado en 'jugadores_equipo1.csv'")

# Análisis del Equipo 2
print("\n" + "=" * 80)
print("EQUIPO 2")
print("=" * 80)

print(f"\nJugadores extraídos: {len(result_team2['players'])}")

print(f"\nJugadores del Equipo 2:")
for player in result_team2['players']:
    print(f"  {player['Dorsal']:>2} - {player['Nombre']:<30} ({len(player['Metricas'])} métricas)")

# DataFrame Equipo 2
df2 = result_team2['dataframe']
print(f"\nDataFrame Equipo 2:")
print(f"  - Filas: {df2.shape[0]}")
print(f"  - Columnas: {df2.shape[1]}")
print(f"\nPrimeras 3 filas:")
print(df2.head(3).to_string())

# Guardar CSV
df2.to_csv('jugadores_equipo2.csv', index=False, encoding='utf-8')
print(f"\n✓ Guardado en 'jugadores_equipo2.csv'")

# Resumen de calidad de datos
print("\n" + "=" * 80)
print("RESUMEN")
print("=" * 80)

total_jugadores = len(result_team1['players']) + len(result_team2['players'])
print(f"\nTotal de jugadores: {total_jugadores}")
print(f"Equipo 1: {len(result_team1['players'])} jugadores")
print(f"Equipo 2: {len(result_team2['players'])} jugadores")

# Validar métricas
metricas_team1 = result_team1['players'][0]['Metricas'].keys() if result_team1['players'] else []
print(f"\nMétricas extraídas ({len(metricas_team1)}):")
for i, metrica in enumerate(metricas_team1, 1):
    print(f"  {i}. {metrica}")

print("\n✓ Proceso completado exitosamente")