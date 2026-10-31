import { meta } from "./meta.mjs";
import { compare, probe } from "./core.mjs";
const field = {
  type: "object",
  additionalProperties: false,
  required: ["name", "type"],
  properties: {
    name: { type: "string", pattern: "^[a-z][a-z0-9_]{0,31}$" },
    type: { type: "string", enum: ["string", "integer", "number", "boolean"] },
    required: { type: "boolean", default: false },
    min: {
      type: "number",
      minimum: -1e9,
      maximum: 1e9,
      description: "Somente numéricos; inteiros exigem limites inteiros.",
    },
    max: { type: "number", minimum: -1e9, maximum: 1e9 },
    maxLength: {
      type: "integer",
      minimum: 0,
      maximum: 512,
      default: 512,
      description: "Somente string; unidades UTF-16.",
    },
    values: {
      type: "array",
      minItems: 1,
      maxItems: 20,
      uniqueItems: true,
      items: { type: "string" },
      description: "Enum somente string. Cada valor respeita maxLength.",
    },
  },
};
const contract = {
  type: "object",
  additionalProperties: false,
  required: ["fields"],
  properties: { fields: { type: "array", maxItems: 32, items: field } },
};
const input = {
  type: "object",
  additionalProperties: false,
  required: ["before", "after"],
  properties: {
    before: contract,
    after: contract,
    samples: {
      type: "array",
      maxItems: 20,
      items: { type: "object", maxProperties: 32 },
      default: [],
    },
  },
};
const change = {
  type: "object",
  required: ["field", "code", "severity"],
  properties: {
    field: { type: "string" },
    code: { type: "string" },
    severity: { type: "string" },
  },
};
const output = {
  type: "object",
  required: [
    "engine",
    "verdict",
    "risk_count",
    "changes",
    "direction",
    "scope",
    "conservative",
  ],
  properties: {
    engine: { type: "string" },
    verdict: { type: "string", enum: ["compatible", "potentially_breaking"] },
    risk_count: { type: "integer" },
    changes: { type: "array", items: change },
    direction: { type: "string" },
    scope: { type: "string" },
    conservative: { type: "boolean" },
  },
};
export function createService() {
  return {
    meta,
    health: () => compare(meta.examples[0].input).verdict === "compatible",
    actions: {
      [meta.primary]: {
        label: "Comparar impacto direcional de contratos",
        description: meta.behavior,
        input,
        output,
        run: compare,
      },
      [meta.secondary]: {
        label: "Sondar exemplos contra ambos os contratos",
        description:
          "samples vazio produz lista vazia. Objetos/arrays/null como valores não satisfazem nenhum tipo desta DSL; campos extras são recusados.",
        input,
        output: {
          type: "object",
          required: ["engine", "tested", "regressions", "results", "note"],
          properties: {
            engine: { type: "string" },
            tested: { type: "integer" },
            regressions: { type: "integer" },
            note: { type: "string" },
            results: {
              type: "array",
              items: {
                type: "object",
                required: [
                  "index",
                  "before_valid",
                  "after_valid",
                  "before_errors",
                  "after_errors",
                ],
                properties: {
                  index: { type: "integer" },
                  before_valid: { type: "boolean" },
                  after_valid: { type: "boolean" },
                  before_errors: { type: "array", items: change },
                  after_errors: { type: "array", items: change },
                },
              },
            },
          },
        },
        run: probe,
      },
    },
  };
}
