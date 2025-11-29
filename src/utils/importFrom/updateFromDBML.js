import { fromDBML } from "./dbml";

export function updateFromDBML(dbml, currentDiagram) {
  const newDiagram = fromDBML(dbml);
  const currentTables = currentDiagram.tables;
  const currentEnums = currentDiagram.enums;

  const tableIdMap = {};
  const fieldIdMap = {};

  const mergedTables = newDiagram.tables.map((newTable) => {
    const oldTable = currentTables.find((t) => t.name === newTable.name);

    if (!oldTable) {
      tableIdMap[newTable.id] = newTable.id;
      newTable.fields.forEach((f) => (fieldIdMap[f.id] = f.id));
      return newTable;
    }

    tableIdMap[newTable.id] = oldTable.id;

    const mergedFields = newTable.fields.map((newField) => {
      const oldField = oldTable.fields.find((f) => f.name === newField.name);
      if (!oldField) {
        fieldIdMap[newField.id] = newField.id;
        return newField;
      }
      fieldIdMap[newField.id] = oldField.id;
      return { ...newField, id: oldField.id };
    });

    return {
      ...newTable,
      id: oldTable.id,
      x: oldTable.x,
      y: oldTable.y,
      width: oldTable.width,
      color: newTable.color, // Use new color from DBML
      fields: mergedFields,
      indices: newTable.indices, // Indices are complex, let's just take new ones.
      comment: newTable.comment,
    };
  });

  const mergedRelationships = newDiagram.relationships.map((newRel) => {
    const resolvedStartTableId = tableIdMap[newRel.startTableId];
    const resolvedEndTableId = tableIdMap[newRel.endTableId];
    const resolvedStartFieldId = fieldIdMap[newRel.startFieldId];
    const resolvedEndFieldId = fieldIdMap[newRel.endFieldId];

    const oldRel = currentDiagram.relationships.find(
      (r) => r.name === newRel.name,
    );

    if (oldRel) {
      return {
        ...newRel,
        id: oldRel.id,
        hidden: oldRel.hidden,
        subtle: oldRel.subtle,
        manyLabel: oldRel.manyLabel,
        startTableId: resolvedStartTableId,
        endTableId: resolvedEndTableId,
        startFieldId: resolvedStartFieldId,
        endFieldId: resolvedEndFieldId,
      };
    }

    return {
      ...newRel,
      startTableId: resolvedStartTableId,
      endTableId: resolvedEndTableId,
      startFieldId: resolvedStartFieldId,
      endFieldId: resolvedEndFieldId,
    };
  });

  // Merge enums by name to preserve IDs if possible
  const mergedEnums = newDiagram.enums.map((newEnum) => {
    const oldEnum = currentEnums.find((e) => e.name === newEnum.name);
    if (oldEnum) {
      return { ...newEnum, id: oldEnum.id };
    }
    return newEnum;
  });

  return {
    tables: mergedTables,
    relationships: mergedRelationships,
    enums: mergedEnums,
  };
}
