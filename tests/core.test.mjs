import { test } from "node:test";
import assert from "node:assert/strict";
import { compare, probe } from "../server/core.mjs";
import { meta } from "../server/meta.mjs";
const request = (before, after, samples = []) => ({
  before: { fields: before },
  after: { fields: after },
  samples,
});
const f = (type = "string", extra = {}) => ({ name: "x", type, ...extra });
test("compatible addition, required addition and enum restriction", () => {
  for (const sample of meta.examples)
    assert.equal(compare(sample.input).verdict, sample.expected.verdict);
});
test("direction matters: removing a field is risky in closed objects", () => {
  const r = compare(request([f()], []));
  assert.equal(r.changes[0].code, "field_removed");
  const p = probe(request([f()], [], [{ x: "a" }]));
  assert.equal(p.regressions, 1);
  assert.equal(p.results[0].after_errors[0].code, "unknown_field");
});
test("required added and removed are directional", () => {
  assert.equal(
    compare(request([f()], [f("string", { required: true })])).risk_count,
    1,
  );
  assert.equal(
    compare(request([f("string", { required: true })], [f()])).risk_count,
    0,
  );
  assert.equal(
    probe(request([f()], [f("string", { required: true })], [{}])).regressions,
    1,
  );
});
test("integer widening to number; reverse is conservatively risky", () => {
  assert.equal(compare(request([f("integer")], [f("number")])).risk_count, 0);
  assert.equal(compare(request([f("number")], [f("integer")])).risk_count, 1);
  assert.equal(
    probe(request([f("number")], [f("integer")], [{ x: 2.5 }])).regressions,
    1,
  );
});
test("numeric narrowing and widening", () => {
  assert.equal(
    compare(
      request(
        [f("number", { min: 0, max: 10 })],
        [f("number", { min: 1, max: 9 })],
      ),
    ).risk_count,
    2,
  );
  assert.equal(
    compare(
      request(
        [f("number", { min: 1, max: 9 })],
        [f("number", { min: 0, max: 10 })],
      ),
    ).risk_count,
    0,
  );
});
test("string maximum length and UTF16 length", () => {
  const r = probe(
    request(
      [f("string", { maxLength: 2 })],
      [f("string", { maxLength: 1 })],
      [{ x: "😀" }],
    ),
  );
  assert.equal(r.regressions, 1);
  assert.equal(
    compare(
      request([f("string", { maxLength: 2 })], [f("string", { maxLength: 1 })]),
    ).risk_count,
    1,
  );
});
test("enum expansion, restriction and unconstrained string", () => {
  assert.equal(
    compare(
      request(
        [f("string", { values: ["a"] })],
        [f("string", { values: ["a", "b"] })],
      ),
    ).risk_count,
    0,
  );
  assert.equal(
    compare(
      request(
        [f("string", { values: ["a", "b"] })],
        [f("string", { values: ["a"] })],
      ),
    ).risk_count,
    1,
  );
  assert.equal(
    compare(request([f()], [f("string", { values: ["a"] })])).risk_count,
    1,
  );
  assert.equal(
    compare(request([f("string", { values: ["a"] })], [f()])).risk_count,
    0,
  );
});
test("enum and field permutations do not affect comparison", () => {
  const a = { name: "a", type: "string", values: ["x", "y"] },
    b = { name: "b", type: "integer" };
  assert.equal(
    compare(request([a, b], [b, { ...a, values: ["y", "x"] }])).changes.length,
    0,
  );
});
test("booleans, zero, empty string, null and nested values", () => {
  const fields = [
    { name: "flag", type: "boolean", required: true },
    { name: "n", type: "integer" },
    { name: "s", type: "string" },
  ];
  const r = probe(
    request(fields, fields, [
      { flag: false, n: 0, s: "" },
      { flag: null },
      { flag: true, n: "2" },
      { flag: true, s: [] },
      { flag: true, s: {} },
    ]),
  );
  assert.equal(r.results[0].before_valid, true);
  assert.ok(r.results.slice(1).every((r) => !r.before_valid));
});
test("probe reports only valid-before/invalid-after as regressions", () => {
  const r = probe(
    request(
      [f("integer", { min: 0 })],
      [f("integer", { min: 5 })],
      [{ x: 1 }, { x: 6 }, { x: -1 }],
    ),
  );
  assert.equal(r.regressions, 1);
  assert.equal(r.results[2].before_valid, false);
});
test("default empty contracts and empty sample list", () => {
  assert.equal(compare(request([], [])).verdict, "compatible");
  assert.equal(probe(request([], [])).tested, 0);
  assert.equal(
    probe(request([], [], [{}, { x: 1 }])).results[1].before_valid,
    false,
  );
});
test("200 deterministic widening cases preserve accepted samples", () => {
  for (let i = 0; i < 200; i++) {
    const input = request(
      [f("integer", { required: true, min: 0, max: i + 1 })],
      [f("number", { required: false, min: -1, max: i + 2 })],
      [{ x: 0 }, { x: i + 1 }],
    );
    assert.equal(compare(input).risk_count, 0);
    assert.equal(probe(input).regressions, 0);
  }
});
test("conservative result is explicit; finite probes are not proof", () => {
  const r = compare(
    request(
      [f("string", { values: ["a"], maxLength: 20 })],
      [f("string", { values: ["a"], maxLength: 10 })],
    ),
  );
  assert.equal(r.verdict, "potentially_breaking");
  assert.equal(r.conservative, true);
  assert.equal(
    probe(
      request(
        [f("string", { values: ["a"] })],
        [f("string", { values: ["a"], maxLength: 1 })],
        [{ x: "a" }],
      ),
    ).regressions,
    0,
  );
});
test("maximum field and sample limits operate", () => {
  const fields = Array.from({ length: 32 }, (_, i) => ({
      name: "f" + i,
      type: "integer",
    })),
    input = request(
      fields,
      fields,
      Array.from({ length: 20 }, () => ({ f0: 1 })),
    );
  assert.equal(compare(input).risk_count, 0);
  assert.equal(probe(input).tested, 20);
});
for (const input of [
  null,
  {},
  request([{ name: "x", type: "object" }], []),
  request([f(), f()], []),
  request([f("integer", { min: 0.5 })], []),
  request([f("number", { min: 3, max: 1 })], []),
  request([f("boolean", { values: ["a"] })], []),
  request([f("string", { values: [] })], []),
  request([f("string", { required: "yes" })], []),
  { ...request([], []), surprise: true },
  request([], [], [null]),
])
  test("invalid " + JSON.stringify(input), () =>
    assert.throws(
      () => compare(input),
      (e) => e.status === 422,
    ),
  );
