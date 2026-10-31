const before = {
  fields: [
    { name: "id", type: "integer", required: true, min: 1 },
    { name: "status", type: "string", values: ["draft", "ready"] },
  ],
};
export const meta = {
  repo: "pacto-api",
  title: "Pacto API",
  engine: "rescript",
  accent: "#54378c",
  headline: "Mude o contrato. Entenda o impacto.",
  description:
    "Compare contratos de objetos e teste exemplos contra as duas definições. Um motor ReScript tipado identifica ampliações compatíveis e riscos de quebra para produtores de dados.",
  behavior:
    "A pergunta é direcional: tudo que o contrato anterior aceitava continua aceito pelo novo? Objetos são fechados e planos. O comparador é conservador: aponta riscos potenciais; as sondagens mostram regressões concretas nos exemplos enviados.",
  limits:
    "Até 32 campos por contrato, 20 exemplos, 32 KiB JSON, tipos string/integer/number/boolean. DSL própria, sem JSON Schema arbitrário, refs, arrays ou objetos aninhados. Ausência é diferente de null.",
  primary: "/api/v1/compare",
  secondary: "/api/v1/probe",
  primaryLabel: "Comparar contratos →",
  secondaryLabel: "Testar exemplos",
  examples: [
    {
      name: "Ampliação compatível",
      input: {
        before,
        after: { fields: [...before.fields, { name: "note", type: "string" }] },
        samples: [
          { id: 1, status: "draft" },
          { id: 2, status: "ready" },
        ],
      },
      expected: {
        verdict: "compatible",
        risk_count: 0,
        "changes.0.code": "optional_field_added",
      },
    },
    {
      name: "Campo obrigatório",
      input: {
        before,
        after: {
          fields: [
            ...before.fields,
            { name: "owner", type: "string", required: true },
          ],
        },
        samples: [{ id: 1, status: "draft" }],
      },
      expected: {
        verdict: "potentially_breaking",
        risk_count: 1,
        "changes.0.code": "required_field_added",
      },
    },
    {
      name: "Enum restrito",
      input: {
        before,
        after: {
          fields: [
            before.fields[0],
            { name: "status", type: "string", values: ["ready"] },
          ],
        },
        samples: [
          { id: 1, status: "draft" },
          { id: 2, status: "ready" },
        ],
      },
      expected: {
        verdict: "potentially_breaking",
        risk_count: 1,
        "changes.0.code": "enum_narrowed",
      },
    },
  ],
  secondaryExpected: {
    regressions: 0,
    "results.0.before_valid": true,
    "results.0.after_valid": true,
  },
};
