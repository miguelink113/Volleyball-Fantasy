"""
caracteristicas_jugadores.py

Extrae las características (datos personales y deportivos) de un jugador
de voleibol desde su página de perfil en volleybox.net.

Uso:
    python caracteristicas_jugadores.py

El jugador a extraer está definido "en primera estancia" dentro del propio
código (ver PLAYER_URL más abajo) — no se solicita al usuario por terminal.

Al ejecutarse, el script imprime "correcto" seguido de los datos del
jugador si la extracción fue exitosa, o "incorrecto" junto con el motivo
si algo falló.
"""

import re
import sys
from typing import Optional

import requests
from bs4 import BeautifulSoup

# ---------------------------------------------------------------------------
# Configuración
# ---------------------------------------------------------------------------

BASE_URL = "https://volleybox.net/es"

# Jugador definido desde el código. Para probar con otro jugador, basta con
# cambiar esta URL por la de su perfil en volleybox.net (ej: .../es/<slug>-p<id>)
PLAYER_URL = "https://volleybox.net/es/wilfredo-leon-p319"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "es-ES,es;q=0.9",
}

# Etiquetas de la sección "Datos del jugador" del perfil. Se usan tanto para
# guiar la búsqueda en el DOM como para el mecanismo de respaldo basado en
# texto plano si la estructura HTML cambia.
CAMPOS_ESPERADOS = [
    "Ranking",
    "Nacionalidad",
    "Posición",
    "Fecha de nacimiento",
    "Ciudad natal",
    "Altura",
    "Peso",
    "Spike",
    "Bloqueo",
    "Mano dominante",
    "Visitas",
]

# Campos mínimos que deben haberse extraído para considerar el proceso exitoso
CAMPOS_MINIMOS = {"Nombre", "Posición", "Altura"}


# ---------------------------------------------------------------------------
# Descarga
# ---------------------------------------------------------------------------

def get_player_html(url: str) -> str:
    """Descarga el HTML de la página de perfil del jugador."""
    response = requests.get(url, headers=HEADERS, timeout=15)
    response.raise_for_status()
    return response.text


# ---------------------------------------------------------------------------
# Extracción
# ---------------------------------------------------------------------------

def _get_player_name(soup: BeautifulSoup) -> Optional[str]:
    """Obtiene el nombre del jugador a partir del <h1> de la página."""
    h1 = soup.find("h1")
    if not h1:
        return None
    texto = h1.get_text(" ", strip=True)
    # El h1 suele incluir el ranking al final, p.ej. "Wilfredo León #1"
    texto = re.sub(r"\s*#\d+\s*$", "", texto).strip()
    return texto or None


def _find_datos_section(soup: BeautifulSoup):
    """
    Localiza el contenedor de la sección 'Datos del jugador' buscando el
    encabezado por su texto (insensible a mayúsculas/minúsculas).
    """
    heading = soup.find(
        lambda tag: tag.name in ("h2", "h3", "h4")
        and "datos del jugador" in tag.get_text(strip=True).lower()
    )
    if heading is None:
        return None

    container = heading.find_next_sibling()
    if container is None:
        container = heading.parent
    return container


def _extract_rows_from_dom(container) -> dict:
    """
    Estrategia principal: recorre el DOM de la sección de datos buscando
    pares etiqueta/valor. Cubre estructuras típicas como listas de
    definición (dt/dd), tablas (tr/td) o etiquetas sueltas seguidas de
    un elemento hermano con el valor.
    """
    datos = {}

    # Caso 1: listas de definición
    for dt in container.find_all("dt"):
        dd = dt.find_next_sibling("dd")
        if dd:
            etiqueta = dt.get_text(strip=True)
            valor = dd.get_text(" ", strip=True)
            if etiqueta and valor:
                datos[etiqueta] = valor

    # Caso 2: filas de tabla
    for tr in container.find_all("tr"):
        celdas = tr.find_all(["td", "th"])
        if len(celdas) >= 2:
            etiqueta = celdas[0].get_text(strip=True)
            valor = celdas[1].get_text(" ", strip=True)
            if etiqueta and valor:
                datos[etiqueta] = valor

    # Caso 3: la etiqueta esperada aparece como texto exacto en algún
    # elemento y el valor está en el elemento hermano siguiente.
    for etiqueta in CAMPOS_ESPERADOS:
        if etiqueta in datos:
            continue
        nodo = container.find(lambda tag: tag.get_text(strip=True) == etiqueta)
        if nodo is None:
            continue
        siguiente = nodo.find_next_sibling()
        if siguiente is None and nodo.parent is not None:
            siguiente = nodo.parent.find_next_sibling()
        if siguiente:
            valor = siguiente.get_text(" ", strip=True)
            if valor and valor != etiqueta:
                datos[etiqueta] = valor

    return datos


def _extract_rows_from_text(soup: BeautifulSoup) -> dict:
    """
    Estrategia de respaldo: si el análisis del DOM no encuentra nada útil,
    se recorre el texto plano de la página línea a línea. Cada etiqueta
    conocida se empareja con la primera línea no vacía que le sigue.
    """
    lineas = [
        linea.strip()
        for linea in soup.get_text(separator="\n").split("\n")
        if linea.strip()
    ]

    datos = {}
    for i, linea in enumerate(lineas):
        for etiqueta in CAMPOS_ESPERADOS:
            if linea == etiqueta and etiqueta not in datos and i + 1 < len(lineas):
                datos[etiqueta] = lineas[i + 1]
                break
    return datos


def extract_player_data(html: str) -> dict:
    """
    Extrae del HTML de un perfil de volleybox.net el nombre del jugador y
    sus características (posición, altura, peso, spike, bloqueo, etc.).

    Devuelve un diccionario ordenado empezando por "Nombre". Si no se pudo
    extraer nada útil, el diccionario resultante estará vacío.
    """
    soup = BeautifulSoup(html, "html.parser")
    resultado = {}

    nombre = _get_player_name(soup)
    if nombre:
        resultado["Nombre"] = nombre

    container = _find_datos_section(soup)
    if container is not None:
        resultado.update(_extract_rows_from_dom(container))

    # Si el DOM no aportó suficientes campos, se intenta con el texto plano
    if len(resultado) <= 1:
        resultado.update(_extract_rows_from_text(soup))

    return resultado


# ---------------------------------------------------------------------------
# Punto de entrada
# ---------------------------------------------------------------------------

def main():
    print("=" * 80)
    print("EXTRACCIÓN DE CARACTERÍSTICAS DE JUGADOR - VOLLEYBOX")
    print("=" * 80)
    print(f"\nURL del jugador: {PLAYER_URL}\n")

    try:
        html = get_player_html(PLAYER_URL)
    except requests.RequestException as exc:
        print("incorrecto")
        print(f"No se pudo descargar la página del jugador: {exc}")
        sys.exit(1)

    datos = extract_player_data(html)

    if datos and CAMPOS_MINIMOS.issubset(datos.keys()):
        print("correcto\n")
        print("Datos del jugador:")
        print("-" * 40)
        for campo, valor in datos.items():
            print(f"  {campo}: {valor}")
    else:
        print("incorrecto")
        if datos:
            print("\nSolo se pudieron extraer algunos campos:")
            print("-" * 40)
            for campo, valor in datos.items():
                print(f"  {campo}: {valor}")
        else:
            print("No se encontraron datos del jugador en la página.")
        sys.exit(1)


if __name__ == "__main__":
    main()