"""
Módulo para extraer y procesar métricas de jugadores desde tablas HTML.
"""

from typing import List, Dict, Tuple
from bs4 import BeautifulSoup
import pandas as pd


def get_match_tables(html: str) -> Tuple:
    """
    Extrae las tablas de estadísticas de un HTML de partido.
    
    Args:
        html: Contenido HTML de la página
        
    Returns:
        Tupla con las dos tablas de estadísticas (tabla equipo 1, tabla equipo 2)
    """
    soup = BeautifulSoup(html, "html.parser")
    tables = soup.find_all("table")
    return tables[11], tables[12]


def extract_table_rows_without_headers(table) -> List[List[str]]:
    """
    Extrae todas las filas de una tabla HTML.
    
    Args:
        table: Objeto BeautifulSoup de una tabla HTML
        
    Returns:
        Lista de listas con el contenido de cada celda
    """
    rows = table.find_all("tr")
    extracted_rows = []
    
    for row in rows:
        cells = row.find_all(["th", "td"])
        extracted_rows.append([cell.get_text(" ", strip=True) for cell in cells])
    
    return extracted_rows


def get_headers(table_rows: List[List[str]]) -> Dict[int, str]:
    """
    Retorna un mapeo hardcodeado de índices de columna a nombres de métricas.
    Basado en la estructura conocida de la tabla de estadísticas.
    
    Estructura:
    - Índices 0-1: dorsal, nombre (se saltan en parse_player_row)
    - Índices 2-6: Formación Inicial (PosicionSet1, PosicionSet2, PosicionSet3, PosicionSet4, PosicionSet5)
    - Índices 7-9: Puntos (PuntosTot, PuntosBP, PuntosG-P)
    - Índices 10-12: Saque (SaqueTot, SaqueErr, SaqueDirecto)
    - Índices 13-16: Recepción (RecepciónTot, RecepciónErr, RecepciónPos%, RecepciónExc.%)
    - Índices 17-21: Ataque (AtaqueTot, AtaqueErr, AtaqueBlo, AtaqueExc., AtaqueExc. %)
    - Índices 22: Bloqueo (BloqueoPts)
    
    Args:
        table_rows: No se usa (se mantiene para compatibilidad con el resto del código)
        
    Returns:
        Diccionario: {índice_columna: nombre_métrica}
    """
    headers = {
        2: "PosicionSet1",
        3: "PosicionSet2",
        4: "PosicionSet3",
        5: "PosicionSet4",
        6: "PosicionSet5",
        7: "PuntosTot",
        8: "PuntosBP",
        9: "PuntosG-P",
        10: "SaqueTot",
        11: "SaqueErr",
        12: "SaqueDirecto",
        13: "RecepciónTot",
        14: "RecepciónErr",
        15: "RecepciónPos%",
        16: "RecepciónExc.%",
        17: "AtaqueTot",
        18: "AtaqueErr",
        19: "AtaqueBlo",
        20: "AtaqueExc.",
        21: "AtaqueExc. %",
        22: "BloqueoPts",
    }
    return headers


def parse_player_row(row: List[str], headers: Dict) -> Dict:
    """
    Convierte una fila de jugador en un diccionario estructurado.
    
    Args:
        row: Lista con los datos de la fila del jugador
        headers: Diccionario con los encabezados
        
    Returns:
        Diccionario con los datos del jugador (dorsal, nombre, métricas)
    """
    player_data = {
        "Dorsal": row[0],
        "Nombre": row[1],
        "Metricas": {}
    }
    
    # Mapear cada métrica con su encabezado
    for i in range(2, len(row)):
        if i in headers:
            metric_name = headers[i]
            player_data["Metricas"][metric_name] = row[i]
    
    return player_data


def extract_players_metrics(table_rows: List[List[str]]) -> List[Dict]:
    """
    Extrae las métricas de todos los jugadores de la tabla.
    
    Args:
        table_rows: Lista de filas extraídas de la tabla
        
    Returns:
        Lista de diccionarios con los datos de cada jugador
    """
    headers = get_headers(table_rows)
    players = []
    
    # Procesar filas de jugadores (desde la fila 2 en adelante)
    for row in table_rows[2:]:
        if row[0].strip():  # Ignorar filas vacías
            player = parse_player_row(row, headers)
            players.append(player)
    
    return players


def create_dataframe(players: List[Dict]) -> pd.DataFrame:
    """
    Convierte la lista de jugadores en un DataFrame de pandas.
    
    Args:
        players: Lista de diccionarios con datos de jugadores
        
    Returns:
        DataFrame con los datos de los jugadores
    """
    data = []
    
    for player in players:
        row_data = {
            "Dorsal": player["Dorsal"],
            "Nombre": player["Nombre"],
        }
        row_data.update(player["Metricas"])
        data.append(row_data)
    
    return pd.DataFrame(data)


def process_match_statistics(html: str, team_index: int = 0) -> Dict:
    """
    Función principal que procesa todas las estadísticas de un equipo en un partido.
    
    Args:
        html: Contenido HTML de la página
        team_index: 0 para equipo 1, 1 para equipo 2 (default: 0)
        
    Returns:
        Diccionario con la información procesada:
        - players: Lista de jugadores con sus métricas
        - dataframe: DataFrame con los datos
        - raw_rows: Filas crudas extraídas de la tabla
    """
    tables = get_match_tables(html)
    table = tables[team_index]
    
    rows = extract_table_rows_without_headers(table)
    players = extract_players_metrics(rows)
    df = create_dataframe(players)
    
    return {
        "players": players,
        "dataframe": df,
        "raw_rows": rows
    }
