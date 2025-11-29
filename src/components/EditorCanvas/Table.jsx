import { useMemo, useState, useRef } from "react";
import {
  Tab,
  ObjectType,
  tableFieldHeight,
  tableFieldHeightDetailed,
  tableHeaderHeight,
  tableHeaderHeightDetailed,
  tableColorStripHeight,
  Cardinality,
  ViewMode,
} from "../../data/constants";
import {
  IconEdit,
  IconMore,
  IconMinus,
  IconDeleteStroked,
  IconKeyStroked,
  IconLock,
  IconUnlock,
  IconChevronUp,
  IconChevronDown,
  IconEyeOpened,
  IconEyeClosed,
  IconAlignCenter,
} from "@douyinfe/semi-icons";
import {
  BuildingMultiple24Regular,
  CircleFilled,
  CircleHintRegular,
  People24Regular,
} from "@fluentui/react-icons";
import { Popover, Tag, Button, SideSheet, Collapse } from "@douyinfe/semi-ui";
import { useLayout, useSettings, useDiagram, useSelect } from "../../hooks";
import TableInfo from "../EditorSidePanel/TablesTab/TableInfo";
import { useTranslation } from "react-i18next";
import { dbToTypes } from "../../data/datatypes";
import { isRtl } from "../../i18n/utils/rtl";
import i18n from "../../i18n/i18n";
import { getTableHeight, getVisibleFields } from "../../utils/utils";
import { useHover } from "usehooks-ts";
import { calculateLayoutNeighbors } from "../../utils/layoutNeighbors";

export default function Table({
  tableData,
  onPointerDown,
  setHoveredTable,
  handleGripField,
  setLinkingLine,
  setTableResize,
  setTableInitDimensions,
}) {
  const ref = useRef(null);
  const isHovered = useHover(ref);
  const [hoveredField, setHoveredField] = useState(null);
  const { database, relationships, setRelationships, tables } = useDiagram();
  const { layout } = useLayout();
  const { deleteTable, deleteField, updateTable, updateTables, updateRelationship } = useDiagram();
  const { settings } = useSettings();
  const { t } = useTranslation();
  const {
    selectedElement,
    setSelectedElement,
    bulkSelectedElements,
    setBulkSelectedElements,
  } = useSelect();

  const borderColor = useMemo(
    () => (settings.mode === "light" ? "border-zinc-300" : "border-zinc-600"),
    [settings.mode],
  );

  const width = tableData.width ?? settings.tableWidth;
  const rowHeight =
    settings.viewMode === ViewMode.DETAILED
      ? tableFieldHeightDetailed
      : tableFieldHeight;
  const headerHeight =
    settings.viewMode === ViewMode.DETAILED
      ? tableHeaderHeightDetailed
      : settings.viewMode === ViewMode.CONCEPTUAL
      ? tableHeaderHeight * 3
      : tableHeaderHeight;

  const isConceptual = settings.viewMode === ViewMode.CONCEPTUAL;
  const visibleFields = isConceptual
    ? []
    : getVisibleFields(tableData, relationships);

  const height = isConceptual
    ? headerHeight + tableColorStripHeight + 4
    : getTableHeight(tableData, relationships, rowHeight, headerHeight);

  const isSelected = useMemo(() => {
    return (
      (selectedElement.id == tableData.id &&
        selectedElement.element === ObjectType.TABLE) ||
      bulkSelectedElements.some(
        (e) => e.type === ObjectType.TABLE && e.id === tableData.id,
      )
    );
  }, [selectedElement, tableData, bulkSelectedElements]);

  const toggleCollapse = () => {
    updateTable(tableData.id, { collapsed: !tableData.collapsed });
  };

  const lockUnlockTable = (e) => {
    const locking = !tableData.locked;
    updateTable(tableData.id, { locked: locking });

    const lockTable = () => {
      setSelectedElement({
        ...selectedElement,
        element: ObjectType.NONE,
        id: -1,
        open: false,
      });
      setBulkSelectedElements((prev) =>
        prev.filter(
          (el) => el.id !== tableData.id || el.type !== ObjectType.TABLE,
        ),
      );
    };

    const unlockTable = () => {
      const elementInBulk = {
        id: tableData.id,
        type: ObjectType.TABLE,
        initialCoords: { x: tableData.x, y: tableData.y },
        currentCoords: { x: tableData.x, y: tableData.y },
      };
      if (e.ctrlKey || e.metaKey) {
        setBulkSelectedElements((prev) => [...prev, elementInBulk]);
      } else {
        setBulkSelectedElements([elementInBulk]);
      }
      setSelectedElement((prev) => ({
        ...prev,
        element: ObjectType.TABLE,
        id: tableData.id,
        open: false,
      }));
    };

    if (locking) {
      lockTable();
    } else {
      unlockTable();
    }
  };

  const openEditor = () => {
    if (!layout.sidebar) {
      setSelectedElement((prev) => ({
        ...prev,
        element: ObjectType.TABLE,
        id: tableData.id,
        open: true,
      }));
    } else {
      setSelectedElement((prev) => ({
        ...prev,
        currentTab: Tab.TABLES,
        element: ObjectType.TABLE,
        id: tableData.id,
        open: true,
      }));
      if (selectedElement.currentTab !== Tab.TABLES) return;
      document
        .getElementById(`scroll_table_${tableData.id}`)
        .scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleResize = () => {
    setTableResize({ id: tableData.id, dir: "right" });
    setTableInitDimensions({ width: width });
  };

  const toggleRelationshipVisibility = (id) => {
    setRelationships((prev) =>
      prev.map((r) => (r.id === id ? { ...r, hidden: !r.hidden } : r)),
    );
  };

  const getCardinalityLabel = (r, currentId) => {
    const isStart = r.startTableId === currentId;
    if (r.cardinality === Cardinality.ONE_TO_ONE) return "1:1";
    if (r.cardinality === Cardinality.ONE_TO_MANY)
      return isStart ? "1:N" : "N:1";
    if (r.cardinality === Cardinality.MANY_TO_ONE)
      return isStart ? "N:1" : "1:N";
    return "";
  };

  const getGroupTitle = (label) => {
    if (label === "N:1") return "Lookups";
    if (label === "1:N") return "Related";
    if (label === "Recursive") return "Recursive";
    return label;
  };

  const groupedRelationships = useMemo(() => {
    const rels = relationships.filter(
      (r) => r.startTableId === tableData.id || r.endTableId === tableData.id,
    );

    const groups = {};
    rels.forEach((r) => {
      let label;
      if (r.startTableId === r.endTableId) {
        label = "Recursive";
      } else {
        label = getCardinalityLabel(r, tableData.id);
      }

      if (!groups[label]) groups[label] = [];
      groups[label].push(r);
    });

    return groups;
  }, [relationships, tableData.id]);

  const editRelationship = (r) => {
    if (!layout.sidebar) {
      setSelectedElement((prev) => ({
        ...prev,
        element: ObjectType.RELATIONSHIP,
        id: r.id,
        open: true,
      }));
    } else {
      setSelectedElement((prev) => ({
        ...prev,
        currentTab: Tab.RELATIONSHIPS,
        element: ObjectType.RELATIONSHIP,
        id: r.id,
        open: true,
      }));
    }
  };

  const handleLayoutNeighbors = () => {
    const updates = calculateLayoutNeighbors(
      tableData,
      tables,
      relationships,
      settings
    );
    if (updates.length > 0) {
      updateTables(updates);
    }
  };

  if (tableData.hidden) return null;

  return (
    <>
      <g ref={ref}>
        <foreignObject
          key={tableData.id}
          x={tableData.x}
          y={tableData.y}
          width={width}
          height={height}
          className="group drop-shadow-lg rounded-md cursor-move"
          onPointerDown={onPointerDown}
        >
          <div
            onDoubleClick={openEditor}
            className={`border-2 hover:border-dashed hover:border-blue-500
               select-none rounded-lg w-full ${
                 settings.mode === "light"
                   ? "bg-zinc-100 text-zinc-800"
                   : "bg-zinc-800 text-zinc-200"
               } ${isSelected ? "border-solid border-blue-500" : borderColor}`}
            style={{ direction: "ltr", fontSize: `${settings.baseFontSize}px` }}
          >
            <div
              className="h-[10px] w-full rounded-t-md"
              style={{ backgroundColor: tableData.color }}
            />
            <div
              className={`overflow-hidden font-bold flex justify-between items-center border-b border-gray-400 ${
                settings.mode === "light" ? "bg-zinc-200" : "bg-zinc-900"
              }`}
              style={{ height: `${headerHeight}px` }}
            >
              <div className="px-3 overflow-hidden text-ellipsis whitespace-nowrap flex flex-col">
                <div className="flex items-center gap-2">
                  {tableData.ownership === "Organization" ? (
                    <BuildingMultiple24Regular className="text-zinc-500" />
                  ) : (
                    <People24Regular className="text-zinc-500" />
                  )}
                  <div className="flex flex-col overflow-hidden">
                    {settings.viewMode === ViewMode.DETAILED &&
                    tableData.displayName ? (
                      <>
                        <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                          {tableData.displayName}
                        </span>
                        <span className="text-[0.75em] text-gray-500 overflow-hidden text-ellipsis whitespace-nowrap font-normal">
                          {tableData.name}
                        </span>
                      </>
                    ) : settings.viewMode === ViewMode.BUSINESS ? (
                      <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                        {tableData.displayName || tableData.name}
                      </span>
                    ) : settings.viewMode === ViewMode.CONCEPTUAL ? (
                      <span className="whitespace-normal break-words text-[1.875em] font-bold text-center w-full px-2 leading-tight">
                        {tableData.displayName || tableData.name}
                      </span>
                    ) : (
                      <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                        {tableData.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="hidden group-hover:block">
                <div className="flex justify-end items-center mx-2 space-x-1.5">
                  <Button
                    icon={
                      tableData.collapsed ? (
                        <IconChevronDown />
                      ) : (
                        <IconChevronUp />
                      )
                    }
                    size="small"
                    theme="solid"
                    style={{
                      backgroundColor: "#2f68adb3",
                    }}
                    onClick={toggleCollapse}
                  />
                  <Button
                    icon={tableData.locked ? <IconLock /> : <IconUnlock />}
                    size="small"
                    theme="solid"
                    style={{
                      backgroundColor: "#2f68adb3",
                    }}
                    disabled={layout.readOnly}
                    onClick={lockUnlockTable}
                  />
                  <Button
                    icon={<IconEdit />}
                    size="small"
                    theme="solid"
                    style={{
                      backgroundColor: "#2f68adb3",
                    }}
                    onClick={openEditor}
                  />
                  <Popover
                    key={tableData.id}
                    content={
                      <div className="popover-theme">
                        <div className="mb-2">
                          <strong>Ownership:</strong>{" "}
                          {tableData.ownership === "Organization"
                            ? "Organization"
                            : "User/Team"}
                        </div>
                        <div className="mb-2">
                          <strong>{t("comment")}:</strong>{" "}
                          {tableData.comment === "" ? (
                            t("not_set")
                          ) : (
                            <div>{tableData.comment}</div>
                          )}
                        </div>
                        <div>
                          <strong
                            className={`${
                              tableData.indices.length === 0 ? "" : "block"
                            }`}
                          >
                            {t("indices")}:
                          </strong>{" "}
                          {tableData.indices.length === 0 ? (
                            t("not_set")
                          ) : (
                            <div>
                              {tableData.indices.map((index, k) => (
                                <div
                                  key={k}
                                  className={`flex items-center my-1 px-2 py-1 rounded ${
                                    settings.mode === "light"
                                      ? "bg-gray-100"
                                      : "bg-zinc-800"
                                  }`}
                                >
                                  <i className="fa-solid fa-thumbtack me-2 mt-1 text-slate-500"></i>
                                  <div>
                                    {index.fields.map((f) => (
                                      <Tag color="blue" key={f} className="me-1">
                                        {f}
                                      </Tag>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        {Object.keys(groupedRelationships).length > 0 && (
                          <div className="mb-2">
                            <strong>{t("relationships")}:</strong>
                            <Collapse accordion className="mt-2">
                              {Object.entries(groupedRelationships).map(
                                ([label, rels]) => (
                                  <Collapse.Panel
                                    key={label}
                                    header={
                                      <div className="flex items-center gap-2">
                                        <span>{getGroupTitle(label)}</span>
                                        {label !== "Recursive" && (
                                          <span className="text-gray-400 text-sm">
                                            ({label})
                                          </span>
                                        )}
                                        <Tag
                                          size="small"
                                          type="solid"
                                          style={{
                                            borderRadius: "10px",
                                            backgroundColor:
                                              settings.mode === "light"
                                                ? "#e6e8ea"
                                                : "#3f3f46",
                                            color:
                                              settings.mode === "light"
                                                ? "#1f2937"
                                                : "#f3f4f6",
                                          }}
                                        >
                                          {rels.length}
                                        </Tag>
                                      </div>
                                    }
                                    itemKey={label}
                                  >
                                    {rels.map((r) => {
                                      const otherTableId =
                                        r.startTableId === tableData.id
                                          ? r.endTableId
                                          : r.startTableId;
                                      const otherTable = tables.find(
                                        (t) => t.id === otherTableId,
                                      );

                                      const isLookup = label === "N:1";
                                      const isRecursive = label === "Recursive";
                                      
                                      let localFieldId =
                                        r.startTableId === tableData.id
                                          ? r.startFieldId
                                          : r.endFieldId;

                                      if (isRecursive) {
                                        const startField = tableData.fields.find(
                                          (f) => f.id === r.startFieldId,
                                        );
                                        if (startField?.primary) {
                                          localFieldId = r.endFieldId;
                                        } else {
                                          localFieldId = r.startFieldId;
                                        }
                                      }

                                      const localField = tableData.fields.find(
                                        (f) => f.id === localFieldId,
                                      );
                                      const localFieldIndex =
                                        tableData.fields.findIndex(
                                          (f) => f.id === localFieldId,
                                        );

                                      return (
                                        <div
                                          key={r.id}
                                          className={`flex justify-between items-center py-1 border-b ${
                                            settings.mode === "light"
                                              ? "border-gray-200 hover:bg-gray-50"
                                              : "border-zinc-700 hover:bg-zinc-800"
                                          } cursor-pointer`}
                                          onClick={() => editRelationship(r)}
                                          onMouseEnter={() => {
                                            if ((isLookup || isRecursive) && localFieldIndex !== -1) {
                                              setHoveredField(localFieldIndex);
                                            }
                                          }}
                                          onMouseLeave={() => {
                                            if (isLookup || isRecursive) {
                                              setHoveredField(null);
                                            }
                                          }}
                                        >
                                          <div
                                            className="flex flex-col overflow-hidden"
                                            title={otherTable?.name}
                                          >
                                            <span className="truncate font-semibold text-[0.875em]">
                                              {otherTable?.displayName ||
                                                otherTable?.name}
                                            </span>
                                            {(isLookup || isRecursive) && localField && (
                                              <span className="text-[0.75em] text-gray-500 truncate">
                                                via {localField.name}
                                              </span>
                                            )}
                                          </div>
                                          <div className="flex items-center">
                                            <Button
                                              icon={r.subtle ? <CircleHintRegular /> : <CircleFilled />}
                                              type="tertiary"
                                              theme="borderless"
                                              size="small"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                updateRelationship(r.id, { subtle: !r.subtle });
                                              }}
                                              title="Relationship Line Appearance"
                                            />
                                            <Button
                                              icon={
                                                r.hidden ? (
                                                  <IconEyeClosed />
                                                ) : (
                                                  <IconEyeOpened />
                                                )
                                              }
                                              type="tertiary"
                                              theme="borderless"
                                              size="small"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                toggleRelationshipVisibility(r.id);
                                              }}
                                              title="Relationship Line Visibility"
                                            />
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </Collapse.Panel>
                                ),
                              )}
                            </Collapse>
                          </div>
                        )}
                        <Button
                          icon={<IconAlignCenter />}
                          block
                          style={{ marginTop: "8px" }}
                          onClick={handleLayoutNeighbors}
                          disabled={layout.readOnly}
                        >
                          {t("layout_neighbors") || "Layout Neighbors"}
                        </Button>
                        <Button
                          icon={<IconDeleteStroked />}
                          type="danger"
                          block
                          style={{ marginTop: "8px" }}
                          onClick={() => deleteTable(tableData.id)}
                          disabled={layout.readOnly}
                        >
                          {t("delete")}
                        </Button>
                      </div>
                    }
                    position="rightTop"
                    showArrow
                    trigger="click"
                    style={{ width: "320px", wordBreak: "break-word" }}
                  >
                    <Button
                      icon={<IconMore />}
                      type="tertiary"
                      size="small"
                      style={{
                        backgroundColor: "#808080b3",
                        color: "white",
                      }}
                    />
                  </Popover>
                </div>
              </div>
            </div>
            {visibleFields.map((e, i) => {
              return settings.showFieldSummary ? (
                <Popover
                  key={i}
                  content={
                    <div className="popover-theme">
                      <div
                        className="flex justify-between items-center pb-2"
                        style={{ direction: "ltr" }}
                      >
                        <p className="me-4 font-bold">{e.name}</p>
                        <p
                          className={
                            "ms-4 font-mono " + dbToTypes[database][e.type].color
                          }
                        >
                          {e.type +
                            ((dbToTypes[database][e.type].isSized ||
                              dbToTypes[database][e.type].hasPrecision) &&
                            e.size &&
                            e.size !== ""
                              ? "(" + e.size + ")"
                              : "")}
                        </p>
                      </div>
                      <hr />
                      {e.primary && (
                        <Tag color="blue" className="me-2 my-2">
                          {t("primary")}
                        </Tag>
                      )}
                      {e.unique && (
                        <Tag color="amber" className="me-2 my-2">
                          {t("unique")}
                        </Tag>
                      )}
                      {e.notNull && (
                        <Tag color="purple" className="me-2 my-2">
                          {t("not_null")}
                        </Tag>
                      )}
                      {e.increment && (
                        <Tag color="green" className="me-2 my-2">
                          {t("autoincrement")}
                        </Tag>
                      )}
                      {(e.type === "ENUM" || e.type === "SET") &&
                        e.values &&
                        e.values.length > 0 && (
                          <div className="my-2">
                            <strong>{t("values")}: </strong>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {e.values.map((val, k) => (
                                <Tag key={k}>{val}</Tag>
                              ))}
                            </div>
                          </div>
                        )}
                      <p>
                        <strong>{t("default_value")}: </strong>
                        {e.default === "" ? t("not_set") : e.default}
                      </p>
                      <p>
                        <strong>{t("comment")}: </strong>
                        {e.comment === "" ? t("not_set") : e.comment}
                      </p>
                    </div>
                  }
                  position="right"
                  showArrow
                  style={
                    isRtl(i18n.language)
                      ? { direction: "rtl" }
                      : { direction: "ltr" }
                  }
                >
                  {field(e, i)}
                </Popover>
              ) : (
                field(e, i)
              );
            })}
          </div>
        </foreignObject>
        {isHovered && (
          <circle
            cx={tableData.x + width}
            cy={tableData.y + height / 2}
            r={6}
            fill={settings.mode === "light" ? "white" : "rgb(28, 31, 35)"}
            stroke="#5891db"
            strokeWidth={2}
            cursor="ew-resize"
            onPointerDown={(e) => e.isPrimary && handleResize()}
          />
        )}
      </g>
      <SideSheet
        title={t("edit")}
        size="small"
        visible={
          selectedElement.element === ObjectType.TABLE &&
          selectedElement.id === tableData.id &&
          selectedElement.open &&
          !layout.sidebar
        }
        onCancel={() =>
          setSelectedElement((prev) => ({
            ...prev,
            open: !prev.open,
          }))
        }
        style={{ paddingBottom: "16px" }}
      >
        <div className="sidesheet-theme">
          <TableInfo data={tableData} />
        </div>
      </SideSheet>
    </>
  );

  function field(fieldData, index) {
    return (
      <div
        className={`${
          index === tableData.fields.length - 1
            ? ""
            : "border-b border-gray-400"
        } group px-2 py-1 flex justify-between items-center gap-1 w-full overflow-hidden`}
        style={{ height: `${rowHeight}px` }}
        onPointerEnter={(e) => {
          if (!e.isPrimary) return;

          setHoveredField(index);
          setHoveredTable({
            tableId: tableData.id,
            fieldId: fieldData.id,
          });
        }}
        onPointerLeave={(e) => {
          if (!e.isPrimary) return;

          setHoveredField(null);
          setHoveredTable({
            tableId: null,
            fieldId: null,
          });
        }}
        onPointerDown={(e) => {
          // Required for onPointerLeave to trigger when a touch pointer leaves
          // https://stackoverflow.com/a/70976017/1137077
          e.target.releasePointerCapture(e.pointerId);
        }}
      >
        <div
          className={`${
            hoveredField === index ? "text-zinc-400" : ""
          } flex items-center gap-2 overflow-hidden`}
        >
          <button
            className="shrink-0 w-[10px] h-[10px] bg-[#2f68adcc] rounded-full"
            onPointerDown={(e) => {
              if (!e.isPrimary) return;

              handleGripField();
              setLinkingLine((prev) => ({
                ...prev,
                startFieldId: fieldData.id,
                startTableId: tableData.id,
                startX: tableData.x + 15,
                startY:
                  tableData.y +
                  index * rowHeight +
                  headerHeight +
                  tableColorStripHeight + 2 +
                  rowHeight / 2,
                endX: tableData.x + 15,
                endY:
                  tableData.y +
                  index * rowHeight +
                  headerHeight +
                  tableColorStripHeight + 2 +
                  rowHeight / 2,
              }));
            }}
          />
          <div className="flex flex-col overflow-hidden">
            {settings.viewMode === ViewMode.DETAILED &&
            fieldData.displayName ? (
              <>
                <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                  {fieldData.displayName}
                </span>
                <span className="text-[0.75em] text-gray-500 overflow-hidden text-ellipsis whitespace-nowrap">
                  {fieldData.name}
                </span>
              </>
            ) : settings.viewMode === ViewMode.BUSINESS ? (
              <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                {fieldData.displayName || fieldData.name}
              </span>
            ) : (
              <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                {fieldData.name}
              </span>
            )}
          </div>
        </div>
        <div className="text-zinc-400">
          {hoveredField === index ? (
            <Button
              theme="solid"
              size="small"
              style={{
                backgroundColor: "#d42020b3",
              }}
              icon={<IconMinus />}
              disabled={layout.readOnly}
              onClick={() => {
                if (layout.readOnly) return;
                deleteField(fieldData, tableData.id);
              }}
            />
          ) : settings.showDataTypes ? (
            <div className="flex gap-1 items-center">
              {fieldData.primary && <IconKeyStroked />}
              {!fieldData.notNull && <span className="font-mono">?</span>}
              <span
                className={
                  "font-mono " + dbToTypes[database][fieldData.type].color
                }
              >
                {fieldData.type +
                  ((dbToTypes[database][fieldData.type].isSized ||
                    dbToTypes[database][fieldData.type].hasPrecision) &&
                  fieldData.size &&
                  fieldData.size !== ""
                    ? `(${fieldData.size})`
                    : "")}
              </span>
            </div>
          ) : null}
        </div>
      </div>
    );
  }
}
