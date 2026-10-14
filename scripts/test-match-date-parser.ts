import assert from "node:assert/strict";
import { parseRfevbDatetime } from "@/lib/scraper/fetch-matches";

function run(name: string, fn: () => void) {
    try {
        fn();
        console.log(`✅ ${name}`);
    } catch (err) {
        console.error(`❌ ${name}`);
        console.error(err);
        process.exitCode = 1;
    }
}

run("octubre (CEST, +02:00)", () => {
    const d = parseRfevbDatetime("25/10/2025 - 17:00");
    assert.ok(d instanceof Date);
    assert.equal(d!.toISOString(), "2025-10-25T15:00:00.000Z");
});

run("enero (CET, +01:00)", () => {
    const d = parseRfevbDatetime("25/01/2025 - 17:00");
    assert.ok(d instanceof Date);
    assert.equal(d!.toISOString(), "2025-01-25T16:00:00.000Z");
});

run("horario de verano (julio, +02:00)", () => {
    const d = parseRfevbDatetime("15/07/2025 - 12:30");
    assert.ok(d instanceof Date);
    assert.equal(d!.toISOString(), "2025-07-15T10:30:00.000Z");
});

run("formato inválido devuelve null", () => {
    assert.equal(parseRfevbDatetime("25-10-2025 17:00"), null);
    assert.equal(parseRfevbDatetime("25/10/2025"), null);
    assert.equal(parseRfevbDatetime(""), null);
});

run("mes fuera de rango devuelve null", () => {
    assert.equal(parseRfevbDatetime("25/13/2025 - 17:00"), null);
});

console.log("\nTodos los casos del parser de fecha completados.");