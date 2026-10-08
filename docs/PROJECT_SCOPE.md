# Alcance del proyecto

## Visión del producto

Volleyball Fantasy es una aplicación de fantasy de voleibol que permite a los
usuarios gestionar un equipo virtual con jugadores reales de competiciones
españolas, competir con otros usuarios y seguir el rendimiento de la plantilla a
lo largo de la temporada.

La aplicación debe combinar:

- datos deportivos reales de la RFEVB;
- una experiencia de usuario clara para gestionar equipo y alineación;
- reglas de fantasy coherentes con la disciplina del voleibol;
- autenticación por usuario;
- una lógica de mercado, presupuesto y competición entre usuarios.

## Objetivo final

El producto final debe ser una plataforma donde un usuario pueda:

- crear y gestionar una cuenta;
- acceder a un catálogo real de jugadores y equipos;
- construir una plantilla con restricciones reales del juego;
- elegir alineación válida por jornada;
- comprar, vender y ajustar su equipo dentro de un mercado;
- competir en ligas privadas o públicas;
- consultar puntuaciones y clasificaciones por jornada;
- seguir su evolución a lo largo de la temporada.

## Funcionalidades objetivo

### 1. Autenticación y perfil de usuario

- registro e inicio de sesión;
- perfil básico del usuario;
- acceso seguro a los datos del equipo propio;
- control de autorización por cuenta y liga.

### 2. Catálogo deportivo real

- competiciones, temporadas, equipos y jugadores reales;
- mantenimiento de identificadores oficiales `rfevbId`;
- uso de datos de partidos y estadísticas como base para la puntuación;
- datos normalizados y consistentes para la aplicación.

### 3. Gestión del equipo fantasy

- creación de un equipo por usuario;
- plantilla con límite de jugadores;
- validación de composición y alineación;
- selección de titulares y suplentes;
- bloqueo de alineación en las fechas definidas por la competición.

### 4. Mercado de fichajes

- mercado diario o por ventana de tiempo;
- compra y venta de jugadores;
- gestión de presupuesto y saldo;
- validaciones de servidor para evitar inconsistencias;
- historial de transferencias y cambios de plantilla.

### 5. Puntuación y jornada

- cálculo de puntos por jugador en función de estadísticas reales;
- versión del sistema de puntuación para poder evolucionar sin romper el
  histórico;
- visualización de puntuación por jornada y acumulada;
- soporte para clasificaciones por liga y por usuario.

### 6. Ligas y competición social

- creación de ligas privadas;
- invitación de usuarios;
- clasificación por jornada;
- comparación de rendimiento entre equipos.

### 7. Persistencia y operación del producto

- almacenamiento fiable de competiciones, equipos, jugadores y partidos;
- ingesta idempotente y trazabilidad de cambios;
- reintentos y control de sincronización;
- auditoría de salarios, transferencias y resultados.

## Alcance funcional principal

La aplicación debe cubrir tres grandes bloques:

1. Datos deportivos reales: catálogo y puntuación.
2. Fantasy del usuario: equipo, mercado y alineación.
3. Competición social: ligas, clasificación y progresión por temporada.

## Fuera del alcance inicial

El producto final no contempla, como objetivo principal de esta fase, la
integración con otras competiciones no europeas, la gestión de cuotas de pago ni
la administración compleja de más de una liga simultánea. Estas capacidades
pueden añadirse más adelante según la evolución del producto y la demanda de
usuarios.

## Principios del alcance

- el usuario debe poder jugar con una experiencia clara y fiable;
- los datos del deporte deben ser reproductibles y auditables;
- la lógica de negocio debe ejecutarse en servidor, no en el cliente;
- la aplicación debe ser extensible para más competiciones, ligas y reglas de
  puntuación futuras.

## Resultado esperado

La aplicación debe ser una experiencia completa de fantasy de voleibol en la
que la gestión del equipo, el mercado, la alineación y la clasificación se
sientan como una capa de producto real sobre un catálogo deportivo fiable y con
puntuaciones basadas en datos del juego real.
