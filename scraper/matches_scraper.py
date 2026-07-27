"""
Módulo para extraer enlaces de partidos desde la página de CompetitionMatches.
Permite buscar partidos por temporada y jornada.
"""

from typing import List, Dict, Optional, Tuple
from bs4 import BeautifulSoup
import requests
import re
from urllib.parse import urlencode, parse_qs, urlparse


BASE_URL = "https://rfevb-web.dataproject.com/CompetitionMatches.aspx"


def get_competition_matches_html(competition_id: int, season_id: int) -> str:
    """
    Descarga la página de partidos de una competición.
    
    Args:
        competition_id: ID de la competición (ej: 152)
        season_id: ID de la temporada/season (ej: 186)
        
    Returns:
        Contenido HTML de la página
    """
    params = {
        "ID": competition_id,
        "PID": season_id
    }
    url = f"{BASE_URL}?{urlencode(params)}"
    
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        return response.text
    except requests.RequestException as e:
        print(f"Error descargando la página: {e}")
        return ""


def extract_match_links(html: str) -> List[Dict]:
    """
    Extrae los enlaces de los partidos del HTML de CompetitionMatches.
    Los partidos están organizados en bloques <div class="TabContent_Border"> por jornada.
    
    Args:
        html: Contenido HTML de la página
        
    Returns:
        Lista de diccionarios con información de los partidos:
        {
            "match_id": mID,
            "competition_id": ID,
            "category_id": CID,
            "season_id": PID,
            "url": URL completa del partido,
            "round": número de jornada (1-26),
        }
    """
    soup = BeautifulSoup(html, "html.parser")
    matches = []
    match_ids_seen = set()  # Para evitar duplicados
    
    # Mapeo de números ordinales en español a números
    ordinal_to_number = {
        "primera": 1, "segunda": 2, "tercera": 3, "cuarta": 4,
        "quinta": 5, "sexta": 6, "séptima": 7, "octava": 8,
        "novena": 9, "décima": 10, "undécima": 11,
    }
    
    def extract_round_number(text: str) -> Optional[int]:
        """Extrae el número de jornada del texto del encabezado."""
        text_lower = text.lower().strip()
        
        # Mapeo de ordinales españoles - ORDEN IMPORTA: más largo primero
        # para evitar que "décima" se encuentre dentro de "undécima"
        ordinales_sorted = [
            ("vigésima sexta", 26), ("vigésima quinta", 25), ("vigésima cuarta", 24),
            ("vigésima tercera", 23), ("vigésima segunda", 22), ("vigésima primera", 21),
            ("decimonovena", 19), ("decimoctava", 18), ("decimoséptima", 17),
            ("decimosexta", 16), ("decimoquinta", 15), ("decimocuarta", 14),
            ("decimotercera", 13), ("duodécima", 12), ("undécima", 11),
            ("décima", 10), ("novena", 9), ("octava", 8), ("séptima", 7),
            ("sexta", 6), ("quinta", 5), ("cuarta", 4), ("tercera", 3),
            ("segunda", 2), ("primera", 1),
        ]
        
        # Buscar ordinales (solo coincidencias exactas de palabras)
        for ordinal, number in ordinales_sorted:
            # Usar límites de palabra para evitar falsos positivos
            pattern = rf'\b{re.escape(ordinal)}\b'
            if re.search(pattern, text_lower):
                return number
        
        # Luego intentar con formato "12ª Jornada", "13ª Jornada", etc.
        match = re.search(r'(\d+)ª?\s*jornada', text_lower)
        if match:
            return int(match.group(1))
        
        # No es una jornada numerada (puede ser Playoff, Cuartos, Final, etc.)
        return None
    
    # Encontrar todos los contenedores de jornadas (div con class="TabContent_Border")
    round_containers = soup.find_all("div", class_="TabContent_Border")
    
    for container in round_containers:
        round_number = None
        
        # Buscar el encabezado h3 más cercano ANTES de este contenedor
        # Estrategia 1: Buscar en hermanos anteriores
        prev_sibling = container.find_previous_sibling()
        while prev_sibling and round_number is None:
            h3 = prev_sibling.find("h3")
            if h3:
                h3_text = h3.get_text(strip=True)
                round_number = extract_round_number(h3_text)
                break
            
            if prev_sibling.name == "h3":
                h3_text = prev_sibling.get_text(strip=True)
                round_number = extract_round_number(h3_text)
                break
            
            prev_sibling = prev_sibling.find_previous_sibling()
        
        # Estrategia 2: Si no encontramos, buscar en elementos anteriores dentro del padre
        if round_number is None:
            parent = container.find_parent()
            if parent:
                # Encontrar el h3 más cercano anterior a nuestro contenedor
                all_h3 = parent.find_all("h3")
                for h3_elem in reversed(all_h3):
                    # Verificar que este h3 esté antes del contenedor en el árbol
                    try:
                        h3_pos = parent.index(h3_elem)
                        container_pos = parent.index(container)
                        if h3_pos < container_pos:
                            h3_text = h3_elem.get_text(strip=True)
                            round_number = extract_round_number(h3_text)
                            if round_number is not None:
                                break
                    except (ValueError, TypeError):
                        pass
        
        # Si aún no tenemos número de jornada, omitir este contenedor
        if round_number is None:
            continue
        
        # Ahora extraer todos los partidos dentro de este contenedor
        elements_with_onclick = container.find_all(True)  # Todos los elementos dentro del contenedor
        
        for element in elements_with_onclick:
            onclick = element.get("onclick", "")
            
            if "MatchStatistics.aspx" in onclick:
                # Parsear los parámetros del onclick
                if "MatchStatistics.aspx?" in onclick:
                    url_part = onclick.split("MatchStatistics.aspx?")[1].split("'")[0].split('"')[0]
                    
                    # Parsear los parámetros
                    params = parse_qs(url_part)
                    
                    match_id = params.get("mID", [None])[0]
                    
                    # Evitar duplicados
                    if match_id and match_id not in match_ids_seen:
                        match_ids_seen.add(match_id)
                        
                        competition_id = params.get("ID", [None])[0]
                        category_id = params.get("CID", [None])[0]
                        season_id = params.get("PID", [None])[0]
                        
                        # Construir URL completa
                        url = get_match_url(match_id, competition_id, category_id, season_id)
                        
                        match_data = {
                            "match_id": match_id,
                            "competition_id": competition_id,
                            "category_id": category_id,
                            "season_id": season_id,
                            "url": url,
                            "round": round_number,
                        }
                        matches.append(match_data)
    
    return matches


def find_matches_by_round(html: str, round_number: Optional[int] = None) -> List[Dict]:
    """
    Encuentra partidos de una jornada específica o todas si no se especifica.
    
    Args:
        html: Contenido HTML de la página
        round_number: Número de jornada (1-22). Si es None, retorna todos.
        
    Returns:
        Lista de partidos filtrados por jornada (o todos si round_number=None)
    """
    matches = extract_match_links(html)
    
    if round_number is None:
        return matches
    
    # Filtrar por jornada
    return [m for m in matches if m.get("round") == round_number]


def get_match_url(match_id: int, competition_id: int, category_id: int, 
                  season_id: int, match_type: str = "LegList") -> str:
    """
    Construye la URL completa del partido.
    
    Args:
        match_id: ID del partido (mID)
        competition_id: ID de la competición
        category_id: ID de la categoría
        season_id: ID de la temporada
        match_type: Tipo de vista (default: LegList)
        
    Returns:
        URL completa del partido
    """
    params = {
        "mID": match_id,
        "ID": competition_id,
        "CID": category_id,
        "PID": season_id,
        "type": match_type
    }
    return f"https://rfevb-web.dataproject.com/MatchStatistics.aspx?{urlencode(params)}"


def scrape_matches(competition_id: int, season_id: int, 
                   round_number: Optional[int] = None) -> List[Dict]:
    """
    Función principal para obtener partidos de una competición.
    
    Args:
        competition_id: ID de la competición (ej: 152)
        season_id: ID de la temporada (ej: 186)
        round_number: Número de jornada (1-22). Si es None, retorna todos.
        
    Returns:
        Lista de diccionarios con información de los partidos
    """
    print(f"Descargando partidos (Competición: {competition_id}, Temporada: {season_id})...")
    html = get_competition_matches_html(competition_id, season_id)
    
    if not html:
        print("Error: No se pudo descargar la página")
        return []
    
    matches = find_matches_by_round(html, round_number)
    
    if round_number:
        print(f"Se encontraron {len(matches)} partidos en la jornada {round_number}")
    else:
        print(f"Se encontraron {len(matches)} partidos en total")
    
    return matches
