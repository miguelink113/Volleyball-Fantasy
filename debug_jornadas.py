"""
Script de debug para verificar los encabezados de jornadas en el HTML.
"""

from bs4 import BeautifulSoup
import re

# Leer el HTML
with open('matches.html', 'r', encoding='utf-8') as f:
    html = f.read()

soup = BeautifulSoup(html, "html.parser")

# Encontrar todos los h3
h3_elements = soup.find_all("h3")

print(f"Total de h3 encontrados: {len(h3_elements)}\n")

# Buscar los que contienen "Jornada"
for i, h3 in enumerate(h3_elements):
    text = h3.get_text(strip=True)
    if "Jornada" in text or "jornada" in text.lower():
        print(f"h3 {i}: {text}")
        
        # Intentar extraer el número
        text_lower = text.lower()
        
        # Búsqueda 1: Ordinales
        ordinales = {
            "primera": 1, "segunda": 2, "tercera": 3, "cuarta": 4,
            "quinta": 5, "sexta": 6, "séptima": 7, "octava": 8,
            "novena": 9, "décima": 10, "undécima": 11,
        }
        
        round_num = None
        for ordinal, number in ordinales.items():
            if ordinal in text_lower:
                round_num = number
                print(f"  Ordinal encontrado: {ordinal} = {number}")
                break
        
        # Búsqueda 2: Números con ª
        if round_num is None:
            match = re.search(r'(\d+)ª?\s*jornada', text_lower)
            if match:
                round_num = int(match.group(1))
                print(f"  Regex encontrado: {round_num}")
        
        if round_num:
            print(f"  RESULTADO: Jornada {round_num}\n")
        else:
            print(f"  NO SE PUDO EXTRAER NUMERO\n")

print("\n" + "="*80)
print("Ahora verificando TabContent_Border:")
print("="*80 + "\n")

# Encontrar todos los TabContent_Border
containers = soup.find_all("div", class_="TabContent_Border")
print(f"Total de TabContent_Border encontrados: {len(containers)}\n")

for idx, container in enumerate(containers):
    # Buscar el h3 más cercano anterior
    prev_sibling = container.find_previous_sibling()
    found_h3 = None
    
    while prev_sibling and found_h3 is None:
        h3 = prev_sibling.find("h3")
        if h3:
            found_h3 = h3
            break
        if prev_sibling.name == "h3":
            found_h3 = prev_sibling
            break
        prev_sibling = prev_sibling.find_previous_sibling()
    
    if found_h3:
        text = found_h3.get_text(strip=True)
        print(f"Container {idx}: {text}")
    else:
        print(f"Container {idx}: NO ENCONTRO h3 anterior")
