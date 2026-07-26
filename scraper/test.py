"""
Script de prueba para validar la extracción de datos de voleibol.
"""

import requests
from player_metrics import process_match_statistics

# Descargar HTML
print("1. Descargando...")
url = "https://rfevb-web.dataproject.com/MatchStatistics.aspx?mID=13852&ID=152&CID=361&PID=186&type=LegList"
html = requests.get(url).text

print("2. HTML descargado")

# Guardar HTML para referencia
with open("match13852.html", "w", encoding="utf8") as f:
    f.write(html)

print("3. HTML guardado")

# Procesar estadísticas del equipo 1
print("\n4. Procesando estadísticas...")
result = process_match_statistics(html, team_index=0)

print(f"\n5. Jugadores extraídos: {len(result['players'])}\n")

# Mostrar primeros 3 jugadores
for player in result['players'][:3]:
    print(f"Dorsal: {player['dorsal']}, Nombre: {player['nombre']}")
    print(f"  Métricas: {player['metricas']}")
    print()

# Mostrar DataFrame
print("\n6. DataFrame de estadísticas:")
print(result['dataframe'].head())

# Guardar a CSV
result['dataframe'].to_csv('jugadores_estadisticas.csv', index=False, encoding='utf-8')
print("\n7. Estadísticas guardadas en 'jugadores_estadisticas.csv'")