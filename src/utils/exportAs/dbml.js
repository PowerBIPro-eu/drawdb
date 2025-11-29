import { Cardinality } from "../../data/constants";
import { dbToTypes } from "../../data/datatypes";
import i18n from "../../i18n/i18n";
import { escapeQuotes } from "../exportSQL/shared";
import { isFunction, isKeyword } from "../utils";

const IDENT_SAFE_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

function escapeIdentifier(s) {
  return String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function quoteIdentifier(name) {
  if (name == null) return name;
  const s = String(name);
  return IDENT_SAFE_RE.test(s) ? s : `"${escapeIdentifier(s)}"`;
}

function parseDefaultDbml(field, database) {
  if (isFunction(field.default)) {
    return `\`${field.default}\``;
  }

  if (isKeyword(field.default) || !dbToTypes[database][field.type]?.hasQuotes) {
    return field.default;
  }

  return `'${escapeQuotes(field.default)}'`;
}

function columnDefault(field, database) {
  if (!field.default) {
    return "";
  }

  if (typeof field.default === "string" && !field.default.trim()) {
    return "";
  }

  return `default: ${parseDefaultDbml(field, database)}`;
}

function columnSettings(field, database) {
  let constraints = [];

  field.primary && constraints.push("pk");
  field.increment && constraints.push("increment");
  field.notNull && constraints.push("not null");
  field.unique && constraints.push("unique");
  constraints.push(columnDefault(field, database));
  constraints.push(columnComment(field));

  constraints = constraints.filter((x) => Boolean(x));

  if (!constraints.length) {
    return "";
  }

  return ` [ ${constraints.join(", ")} ]`;
}

function cardinality(rel) {
  switch (rel.cardinality) {
    case i18n.t(Cardinality.ONE_TO_ONE):
    case Cardinality.ONE_TO_ONE:
      return "-";
    case i18n.t(Cardinality.ONE_TO_MANY):
    case Cardinality.ONE_TO_MANY:
      return "<";
    case i18n.t(Cardinality.MANY_TO_ONE):
    case Cardinality.MANY_TO_ONE:
      return ">";
    case i18n.t(Cardinality.MANY_TO_MANY):
    case Cardinality.MANY_TO_MANY:
      return "<>";
  }
}

function fieldSize(field, database) {
  const typeMetadata = dbToTypes[database][field.type];

  if ((typeMetadata?.isSized || typeMetadata?.hasPrecision) && field.size)
    return `(${field.size})`;

  return "";
}

function processComment(comment) {
  if (comment.includes("\n")) {
    return `'''${comment}'''`;
  }

  return `'${escapeQuotes(comment)}'`;
}

function tableComment(table) {
  let comment = table.comment || "";
  const parts = [];
  if (table.displayName && table.displayName.trim() !== "") {
    parts.push(`label: ${table.displayName}`);
  }
  if (table.ownership && table.ownership.trim() !== "") {
    parts.push(`ownership: ${table.ownership}`);
  }
  
  if (parts.length > 0) {
    const meta = parts.join("\n");
    comment = comment ? `${meta}\n${comment}` : meta;
  }

  if (!comment || comment.trim() === "") {
    return "";
  }

  return `Note: ${processComment(comment)}`;
}

function columnComment(field) {
  let comment = field.comment || "";
  if (field.displayName && field.displayName.trim() !== "") {
    const label = `label: ${field.displayName}`;
    comment = comment ? `${label}\n${comment}` : label;
  }

  if (!comment || comment.trim() === "") {
    return "";
  }

  return `note: ${processComment(comment)}`;
}

function processType(type) {
  // TODO: remove after a while
  if (type.toUpperCase() === "TIMESTAMP WITH TIME ZONE") {
    return "timestamptz";
  }

  return type.toLowerCase();
}

export function toDBML(diagram) {
  const generateRelString = (rel) => {
    const { fields: startTableFields, name: startTableName } =
      diagram.tables.find((t) => t.id === rel.startTableId);
    const { name: startFieldName } = startTableFields.find(
      (f) => f.id === rel.startFieldId,
    );
    const { fields: endTableFields, name: endTableName } = diagram.tables.find(
      (t) => t.id === rel.endTableId,
    );
    const { name: endFieldName } = endTableFields.find(
      (f) => f.id === rel.endFieldId,
    );

    return `Ref ${quoteIdentifier(rel.name)} {\n\t${quoteIdentifier(startTableName)}.${quoteIdentifier(startFieldName)} ${cardinality(rel)} ${quoteIdentifier(endTableName)}.${quoteIdentifier(endFieldName)} [ delete: ${rel.deleteConstraint.toLowerCase()}, update: ${rel.updateConstraint.toLowerCase()} ]\n}`;
  };

  // Map to store unique enum definitions
  // Key: Enum Name, Value: { values: string[], isGlobal: boolean }
  const enumsToGenerate = new Map();
  // Map to quickly find if a set of values already has an enum name
  // Key: JSON.stringify(values), Value: Enum Name
  const valueHashToName = new Map();

  // 1. Register existing Global Enums first (preserve their names)
  if (diagram.enums) {
    diagram.enums.forEach((en) => {
      enumsToGenerate.set(en.name, { values: en.values, isGlobal: true });
      valueHashToName.set(JSON.stringify(en.values), en.name);
    });
  }

  // 2. Scan tables for ad-hoc enums (fields with type ENUM/SET)
  diagram.tables.forEach((table) => {
    table.fields.forEach((field) => {
      if (
        (field.type === "ENUM" || field.type === "SET") &&
        Array.isArray(field.values)
      ) {
        const hash = JSON.stringify(field.values);

        // If we haven't seen this set of values before, create a new Enum definition
        if (!valueHashToName.has(hash)) {
          let baseName = `${field.name}_enum`;
          let finalName = baseName;

          // Collision check: Does this name exist?
          if (enumsToGenerate.has(finalName)) {
            // Name taken by a DIFFERENT set of values (since hash check failed)
            // Try scoping with table name
            finalName = `${table.name}_${field.name}_enum`;

            // If still taken (rare), append index
            let counter = 1;
            while (enumsToGenerate.has(finalName)) {
              finalName = `${table.name}_${field.name}_${counter}_enum`;
              counter++;
            }
          }

          enumsToGenerate.set(finalName, {
            values: field.values,
            isGlobal: false,
          });
          valueHashToName.set(hash, finalName);
        }
      }
    });
  });

  // 3. Generate Enum Definitions String
  // We only generate definitions for enums that are NOT global (ad-hoc ones),
  // OR we can generate all of them here if we remove the separate diagram.enums map below.
  // The original code mapped diagram.enums separately. Let's unify it.
  
  const allEnumDefinitions = Array.from(enumsToGenerate.entries())
    .map(
      ([name, data]) =>
        `enum ${quoteIdentifier(name)} {\n${data.values
          .map((v) => `\t${quoteIdentifier(v)}`)
          .join("\n")}\n}`,
    )
    .join("\n\n");

  return `${allEnumDefinitions}\n\n${diagram.tables
    .map(
      (table) =>
        `Table ${quoteIdentifier(table.name)} [headercolor: ${table.color}] {\n${table.fields
          .map((field) => {
            let typeStr = processType(field.type);
            if (
              (field.type === "ENUM" || field.type === "SET") &&
              Array.isArray(field.values)
            ) {
              const hash = JSON.stringify(field.values);
              const enumName = valueHashToName.get(hash);
              typeStr = quoteIdentifier(enumName);
            }

            return `\t${quoteIdentifier(field.name)} ${typeStr}${fieldSize(
              field,
              diagram.database,
            )}${columnSettings(field, diagram.database)}`;
          })
          .join("\n")}${
          table.indices.length > 0
            ? "\n\n\tindexes {\n" +
              table.indices
                .map(
                  (index) =>
                    `\t\t(${index.fields
                      .map((f) => quoteIdentifier(f))
                      .join(", ")}) [ name: '${
                      index.name
                    }'${index.unique ? ", unique" : ""} ]`,
                )
                .join("\n") +
              "\n\t}"
            : ""
        }${
          tableComment(table) ? `\n\n\t${tableComment(table)}` : ""
        }\n}`,
    )
    .join("\n\n")}\n\n${diagram.relationships
    .map((rel) => generateRelString(rel))
    .join("\n\n")}`;
}
