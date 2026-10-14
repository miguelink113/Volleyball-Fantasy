import assert from "node:assert/strict";
import { normalizeTeamAlias } from "@/lib/services/ingestion/team-alias-resolver";

interface Case {
    input: string;
    expected: string;
    reason: string;
}

const cases: Case[] = [
    { input: "CV Melilla", expected: "melilla", reason: "roster" },
    { input: "Club Voleibol Melilla", expected: "melilla", reason: "acta" },
    { input: "Vóley Palma", expected: "palma", reason: "roster" },
    { input: "Voley Palma", expected: "palma", reason: "variante sin tilde" },
    { input: "Palma Vóley", expected: "palma", reason: "orden invertido" },
    { input: "Real Set Madrid", expected: "real set madrid", reason: "sin stopwords" },
    { input: "Bus Leader San Roque", expected: "bus leader san roque", reason: "sin ruido" },
    { input: "  CV   Melilla  ", expected: "melilla", reason: "espacios extra" },
    { input: "CV-Melilla", expected: "melilla", reason: "puntuación" },
    { input: "Cisneros La Laguna", expected: "cisneros laguna", reason: "artículo" },
];

function testNormalization(): void {
    for (const c of cases) {
        assert.equal(
            normalizeTeamAlias(c.input),
            c.expected,
            `normalize("${c.input}") [${c.reason}]`
        );
    }
    console.log(`  ✔ ${cases.length} normalizaciones correctas`);
}

function testMismatchedNamesCollide(): void {
    const roster = "CV Melilla";
    const match = "Club Voleibol Melilla";
    assert.equal(
        normalizeTeamAlias(roster),
        normalizeTeamAlias(match),
        "roster y acta deben colisionar al normalizar"
    );
    console.log("  ✔ nombres desalineados convergen al mismo alias");
}

function testWhitespaceOnlyIsEmpty(): void {
    assert.equal(normalizeTeamAlias("   "), "");
    assert.equal(normalizeTeamAlias("CV"), "");
    assert.equal(normalizeTeamAlias("Club Voleibol"), "");
    console.log("  ✔ alias vacíos tras normalizar devuelven cadena vacía");
}

console.log("== normalizeTeamAlias ==");
testNormalization();
testMismatchedNamesCollide();
testWhitespaceOnlyIsEmpty();
console.log("\n✅ team-alias-resolver OK");