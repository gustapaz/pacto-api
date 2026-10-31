type field = {name: string, kind: string, required: bool, minValue: float, maxValue: float, maxLength: int, values: array<string>}
type change = {field: string, code: string, severity: string}
type value = {name: string, kind: string, numberValue: float, stringValue: string}

let compare = (before: array<field>, after: array<field>): array<change> => {
  let changes: array<change> = []
  let add = (field, code, severity) => {ignore(Js.Array2.push(changes, {field, code, severity}))}
  Js.Array2.forEach(before, old => {
    switch Js.Array2.find(after, next => next.name == old.name) {
    | None => add(old.name, "field_removed", "risk")
    | Some(next) => {
        if !old.required && next.required {add(old.name, "required_added", "risk")}
        if old.required && !next.required {add(old.name, "required_removed", "compatible")}
        if old.kind != next.kind {
          if old.kind == "integer" && next.kind == "number" {add(old.name, "numeric_widening", "compatible")}
          else {add(old.name, "type_changed", "risk")}
        }
        if (old.kind == "integer" || old.kind == "number") && (next.kind == "integer" || next.kind == "number") {
          if next.minValue > old.minValue {add(old.name, "minimum_raised", "risk")}
          if next.minValue < old.minValue {add(old.name, "minimum_lowered", "compatible")}
          if next.maxValue < old.maxValue {add(old.name, "maximum_lowered", "risk")}
          if next.maxValue > old.maxValue {add(old.name, "maximum_raised", "compatible")}
        }
        if old.kind == "string" && next.kind == "string" {
          if next.maxLength < old.maxLength {add(old.name, "length_narrowed", "risk")}
          if next.maxLength > old.maxLength {add(old.name, "length_widened", "compatible")}
          let oldAny = Js.Array2.length(old.values) == 0
          let nextAny = Js.Array2.length(next.values) == 0
          if (oldAny && !nextAny) || (!oldAny && !nextAny && Js.Array2.some(old.values, v => !Js.Array2.includes(next.values, v))) {
            add(old.name, "enum_narrowed", "risk")
          } else if (!oldAny && nextAny) || (!oldAny && !nextAny && Js.Array2.some(next.values, v => !Js.Array2.includes(old.values, v))) {
            add(old.name, "enum_widened", "compatible")
          }
        }
      }
    }
  })
  Js.Array2.forEach(after, next => {
    if !Js.Array2.some(before, old => old.name == next.name) {
      add(next.name, next.required ? "required_field_added" : "optional_field_added", next.required ? "risk" : "compatible")
    }
  })
  changes
}

let validate = (fields: array<field>, values: array<value>): array<change> => {
  let errors: array<change> = []
  let add = (field, code) => {ignore(Js.Array2.push(errors, {field, code, severity: "invalid"}))}
  Js.Array2.forEach(fields, f => {
    switch Js.Array2.find(values, v => v.name == f.name) {
    | None => if f.required {add(f.name, "required")}
    | Some(v) => {
        let typeOk = f.kind == v.kind || (f.kind == "number" && v.kind == "integer")
        if !typeOk {add(f.name, "type_mismatch")}
        else if f.kind == "integer" || f.kind == "number" {
          if v.numberValue < f.minValue || v.numberValue > f.maxValue {add(f.name, "outside_bounds")}
        } else if f.kind == "string" {
          if Js.String2.length(v.stringValue) > f.maxLength {add(f.name, "too_long")}
          if Js.Array2.length(f.values) > 0 && !Js.Array2.includes(f.values, v.stringValue) {add(f.name, "not_in_enum")}
        }
      }
    }
  })
  Js.Array2.forEach(values, v => {if !Js.Array2.some(fields, f => f.name == v.name) {add(v.name, "unknown_field")}})
  errors
}
