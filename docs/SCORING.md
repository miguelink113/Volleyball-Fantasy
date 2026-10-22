# ScoringSystemV1

**Revisión de documentación:** 2026-10-22

## Datos disponibles

El scraper obtiene estadísticas agregadas por partido y jugador:

| Grupo | Campos |
| --- | --- |
| Participación | `startingFormation.position1..position5` |
| Saque | `serve.total`, `serve.errors`, `serve.directPoints` |
| Recepción | `reception.total`, `reception.errors`, `reception.positivePercentage`, `reception.excellentPercentage` |
| Ataque | `attack.errors`, `attack.blocks`, `attack.excellent`, `attack.excellentPercentage` |
| Bloqueo | `block.points` |
| Resultado | sets locales y visitantes del partido |

`points.total`, `points.bp` y `points.wonLost` se conservan para auditoría,
pero no intervienen en V1 para evitar doble conteo. Los valores ausentes se
normalizan a `0`.

## Fórmula V1

La implementación está en `domain/scoring/scoring-v1.system.ts` y usa la
versión `v1`. Todos los componentes y el total son enteros.

```text
participation = max(0, setsPlayed)

setterAttackBonus = 0 si position != setter
setterAttackBonus =
  round(clamp(attack.excellentPercentage, 0, 100) / 10)
  si position == setter

serve = 0 si setsPlayed <= 0
netServes = max(0, serve.total)
          - max(0, serve.errors)
          + max(0, serve.directPoints) * 2
serve = round(max(0, netServes) / setsPlayed)

attack = max(
  -3,
  max(0, attack.excellent)
  - max(0, attack.errors)
  - max(0, attack.blocks)
)

blocksBase = max(0, block.points) * 2
blocks =
  round(blocksBase * 1.5) si position == middle
  blocksBase               en otro caso

reception = 0 si reception.total <= 0
receptionRaw =
    reception.total * 0.25
  + (reception.total * clamp(reception.positivePercentage, 0, 100) / 100) * 0.25
  + (reception.total * clamp(reception.excellentPercentage, 0, 100) / 100) * 0.50
  - max(0, reception.errors)
receptionClamped = max(0, receptionRaw)
reception =
  round(receptionClamped * 1.25) si position == libero
  round(receptionClamped)        en otro caso

matchResult =
  homeSets - awaySets si el jugador pertenece al equipo local
  awaySets - homeSets si el jugador pertenece al equipo visitante
  0                   si el partido no está completado
                      o el equipo no coincide

totalScore =
  participation
  + serve
  + attack
  + setterAttackBonus
  + blocks
  + reception
  + matchResult
```

### Decisiones de diseño

- Los puntos de ataque no tienen multiplicador.
- El saque se normaliza por participación: saques totales menos errores más
  dos veces los puntos directos, dividido entre los sets jugados.
- Los bloqueos valen `2` puntos base. Los puntos directos de saque ya forman
  parte de la fórmula normalizada del saque y no reciben un multiplicador
  independiente.
- Los errores se integran en la categoría que representan:
  - errores de saque dentro de `serve`;
  - errores y ataques bloqueados dentro de `attack`;
  - errores de recepción dentro de `reception`.
- El ataque tiene un límite inferior de `-3`. La recepción, en cambio, se
  limita a `0` antes de aplicar el multiplicador de posición. El saque tampoco
  puede ser negativo porque el resultado neto se limita a `0`.
- La recepción tiene peso real: cada 10 puntos porcentuales positivos y
  excelentes aporta aproximadamente un punto antes de errores.
- Los multiplicadores de posición se redondean al entero más cercano:
  - recepción de líberos: multiplicador `1.25`;
  - bloqueos de centrales: multiplicador `1.5`.
- Para compensar que RFEVB no proporciona asistencias, los colocadores reciben
  puntos basados en el porcentaje total de ataque excelente de su tabla:
  aproximadamente `1` punto por cada `10` puntos porcentuales.
- Los líberos reciben un aumento del 25 % en la puntuación de recepción (`1.25x`),
  porque es la principal métrica disponible para su posición.
- El resultado usa la diferencia real de sets: una victoria `3-0` aporta `+3`,
  mientras que una derrota `1-3` aporta `-2`.
- No se añaden puntos por asistencias: el scraper no aporta esa métrica.

La API actual devuelve `scoringVersion: "v1"` junto con los puntos. Sin embargo,
`/api/fantasy-round-scores` calcula los resultados bajo demanda y no los persiste
en `player_match_scores`, `player_round_scores` ni `fantasy_scores`; guardar y
reproducir el histórico sigue siendo trabajo pendiente.

## Tests

```bash
npm run test:domain
```

La suite cubre ponderaciones, errores integrados, valores enteros, bonus de
líbero y central, diferencia de sets y exclusión de campos ambiguos.

## Uso actual y límites

`/api/fantasy-round-scores` calcula el scoring sobre las estadísticas persistidas. En su respuesta actual incluye `playerId`, `roundNumber`, `score`, `matchesPlayed` y `scoringVersion`, pero no expone el desglose aunque el cálculo interno lo construye. La documentación de esta fórmula se corresponde con `domain/scoring/scoring-v1.system.ts`; el scoring histórico `basic-v1` no es el utilizado por esa ruta.
