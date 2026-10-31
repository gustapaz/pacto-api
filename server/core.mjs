import * as Engine from "../engine/Contract.res.js";
import { exact, invalid, object } from "./http.mjs";
function contract(c) {
  exact(c, ["fields"], "contrato");
  if (!Array.isArray(c.fields) || c.fields.length > 32)
    invalid("invalid_contract", "Defina de 0 a 32 campos.");
  const ids = new Set();
  return c.fields
    .map((f) => {
      exact(
        f,
        ["name", "type", "required", "min", "max", "maxLength", "values"],
        "campo",
      );
      if (
        typeof f.name !== "string" ||
        !/^[a-z][a-z0-9_]{0,31}$/.test(f.name) ||
        ids.has(f.name)
      )
        invalid("invalid_field", "Nomes ASCII devem ser únicos.");
      ids.add(f.name);
      if (!["string", "integer", "number", "boolean"].includes(f.type))
        invalid("invalid_type", "Tipo desconhecido.");
      if (f.required !== undefined && typeof f.required !== "boolean")
        invalid("invalid_required", "required deve ser booleano.");
      const numeric = ["integer", "number"].includes(f.type);
      if (!numeric && (f.min !== undefined || f.max !== undefined))
        invalid("invalid_bounds", "min/max exigem número.");
      const min = f.min ?? -1e9,
        max = f.max ?? 1e9;
      if (
        !Number.isFinite(min) ||
        !Number.isFinite(max) ||
        Math.abs(min) > 1e9 ||
        Math.abs(max) > 1e9 ||
        min > max ||
        (f.type === "integer" &&
          (!Number.isInteger(min) || !Number.isInteger(max)))
      )
        invalid("invalid_bounds", "Limites numéricos inválidos.");
      if (
        f.type !== "string" &&
        (f.maxLength !== undefined || f.values !== undefined)
      )
        invalid("invalid_string_rule", "maxLength/values exigem string.");
      const maxLength = f.maxLength ?? 512;
      if (!Number.isInteger(maxLength) || maxLength < 0 || maxLength > 512)
        invalid("invalid_length", "maxLength deve ser inteiro de 0 a 512.");
      if (
        f.values !== undefined &&
        (!Array.isArray(f.values) ||
          f.values.length < 1 ||
          f.values.length > 20 ||
          f.values.some((v) => typeof v !== "string" || v.length > maxLength) ||
          new Set(f.values).size !== f.values.length)
      )
        invalid(
          "invalid_enum",
          "values exige 1 a 20 strings únicas dentro de maxLength.",
        );
      return {
        name: f.name,
        kind: f.type,
        required: f.required ?? false,
        minValue: min,
        maxValue: max,
        maxLength,
        values: [...(f.values ?? [])].sort(),
      };
    })
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}
export function validate(input) {
  exact(input, ["before", "after", "samples"], "requisição");
  const before = contract(input.before),
    after = contract(input.after);
  const samples = input.samples ?? [];
  if (
    !Array.isArray(samples) ||
    samples.length > 20 ||
    samples.some((s) => !object(s) || Object.keys(s).length > 32)
  )
    invalid(
      "invalid_samples",
      "samples deve conter até 20 objetos planos com até 32 campos.",
    );
  return { before, after, samples };
}
function values(sample) {
  return Object.entries(sample)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([name, v]) => ({
      name,
      kind:
        v === null
          ? "null"
          : typeof v === "number" && Number.isInteger(v)
            ? "integer"
            : typeof v,
      numberValue: typeof v === "number" ? v : 0,
      stringValue: typeof v === "string" ? v : "",
    }));
}
export function compare(input) {
  const { before, after } = validate(input),
    changes = Engine.compare(before, after),
    risk_count = changes.filter((c) => c.severity === "risk").length;
  return {
    engine: "rescript",
    verdict: risk_count ? "potentially_breaking" : "compatible",
    risk_count,
    changes,
    direction: "before accepted objects -> after accepted objects",
    scope: "closed_flat_object_contracts",
    conservative: true,
  };
}
export function probe(input) {
  const { before, after, samples } = validate(input);
  const results = samples.map((sample, index) => {
    const v = values(sample),
      before_errors = Engine.validate(before, v),
      after_errors = Engine.validate(after, v);
    return {
      index,
      before_valid: before_errors.length === 0,
      after_valid: after_errors.length === 0,
      before_errors,
      after_errors,
    };
  });
  return {
    engine: "rescript",
    tested: results.length,
    regressions: results.filter((r) => r.before_valid && !r.after_valid).length,
    results,
    note: "Examples are concrete evidence, not an exhaustive compatibility proof.",
  };
}
