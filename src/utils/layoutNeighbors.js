import {
  tableFieldHeight,
  tableFieldHeightDetailed,
  tableHeaderHeight,
  tableHeaderHeightDetailed,
} from "../data/constants";
import { getTableHeight } from "./utils";

/**
 * Calculates new positions for tables related to the source table.
 * Places parent tables (1-side) to the LEFT.
 * Places child tables (n-side) to the RIGHT.
 *
 * @param {Object} sourceTable - The central table object
 * @param {Array} tables - All tables in the diagram
 * @param {Array} relationships - All relationships in the diagram
 * @param {Object} settings - Diagram settings (for dimensions)
 * @returns {Array} Array of table updates { id, x, y }
 */
export function calculateLayoutNeighbors(
  sourceTable,
  tables,
  relationships,
  settings
) {
  const updates = [];
  const gapX = 100; // Horizontal gap between columns
  const gapY = 40; // Vertical gap between tables in a stack

  const rowHeight = settings.showDetailedView
    ? tableFieldHeightDetailed
    : tableFieldHeight;
  const headerHeight = settings.showDetailedView
    ? tableHeaderHeightDetailed
    : tableHeaderHeight;

  // 1. Identify Neighbors
  const parents = []; // Tables that sourceTable refers to (source is N, parent is 1)
  const children = []; // Tables that refer to sourceTable (source is 1, child is N)

  relationships.forEach((rel) => {
    if (rel.startTableId === sourceTable.id && rel.endTableId !== sourceTable.id) {
      // Source is Start.
      // If 1:N, Source(1) -> End(N). End is Child.
      // If N:1, Source(N) -> End(1). End is Parent.
      // If 1:1, treat as Child (arbitrary choice, or could be separate)
      
      const otherTable = tables.find((t) => t.id === rel.endTableId);
      if (!otherTable) return;

      if (rel.cardinality === "one_to_many") {
        children.push(otherTable);
      } else {
        parents.push(otherTable);
      }
    } else if (rel.endTableId === sourceTable.id && rel.startTableId !== sourceTable.id) {
      // Source is End.
      // If 1:N, Start(1) -> Source(N). Start is Parent.
      // If N:1, Start(N) -> Source(1). Start is Child.
      
      const otherTable = tables.find((t) => t.id === rel.startTableId);
      if (!otherTable) return;

      if (rel.cardinality === "one_to_many") {
        parents.push(otherTable);
      } else {
        children.push(otherTable);
      }
    }
  });

  // Deduplicate (in case of multiple relationships)
  const uniqueParents = [...new Set(parents)];
  const uniqueChildren = [...new Set(children)];

  // 2. Calculate Positions
  // Helper to stack tables vertically centered relative to sourceTable
  const stackTables = (group, startX) => {
    if (group.length === 0) return;

    // Calculate total height of the stack
    let totalHeight = 0;
    const tableHeights = group.map((t) => {
      const h = getTableHeight(t, relationships, rowHeight, headerHeight);
      totalHeight += h;
      return h;
    });
    totalHeight += (group.length - 1) * gapY;

    // Start Y position to center the stack against the source table
    const sourceHeight = getTableHeight(
      sourceTable,
      relationships,
      rowHeight,
      headerHeight
    );
    const sourceCenterY = sourceTable.y + sourceHeight / 2;
    let currentY = sourceCenterY - totalHeight / 2;

    group.forEach((table, index) => {
      updates.push({
        id: table.id,
        x: startX,
        y: currentY,
      });
      currentY += tableHeights[index] + gapY;
    });
  };

  // Position Parents to the LEFT
  const parentX = sourceTable.x - (settings.tableWidth + gapX);
  stackTables(uniqueParents, parentX);

  // Position Children to the RIGHT
  const childX = sourceTable.x + (settings.tableWidth + gapX);
  stackTables(uniqueChildren, childX);

  return updates;
}
