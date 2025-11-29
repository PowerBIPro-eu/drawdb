import { useMemo, useRef, useState, useEffect } from "react";
import {
  Cardinality,
  ObjectType,
  Tab,
  tableFieldHeight,
  tableFieldHeightDetailed,
  tableHeaderHeight,
  tableHeaderHeightDetailed,
} from "../../data/constants";
import { calcPath } from "../../utils/calcPath";
import { useDiagram, useSettings, useLayout, useSelect } from "../../hooks";
import { useTranslation } from "react-i18next";
import { SideSheet, Popover, Checkbox, Button, Tag } from "@douyinfe/semi-ui";
import { IconEdit } from "@douyinfe/semi-icons";
import RelationshipInfo from "../EditorSidePanel/RelationshipsTab/RelationshipInfo";
import { getVisibleFields } from "../../utils/utils";

export default function Relationship({ data }) {
  const { settings } = useSettings();
  const { tables, relationships, updateRelationship } = useDiagram();
  const { layout } = useLayout();
  const { selectedElement, setSelectedElement } = useSelect();
  const { t } = useTranslation();

  const rowHeight = settings.showDetailedView
    ? tableFieldHeightDetailed
    : tableFieldHeight;
  const headerHeight = settings.showDetailedView
    ? tableHeaderHeightDetailed
    : tableHeaderHeight;

  const pathValues = useMemo(() => {
    const startTable = tables.find((t) => t.id === data.startTableId);
    const endTable = tables.find((t) => t.id === data.endTableId);

    if (
      !startTable ||
      !endTable ||
      startTable.hidden ||
      endTable.hidden ||
      data.hidden
    )
      return null;

    return {
      startFieldIndex: getVisibleFields(startTable, relationships).findIndex(
        (f) => f.id === data.startFieldId,
      ),
      endFieldIndex: getVisibleFields(endTable, relationships).findIndex(
        (f) => f.id === data.endFieldId,
      ),
      startTable: {
        x: startTable.x,
        y: startTable.y,
        w: startTable.width ?? settings.tableWidth,
      },
      endTable: {
        x: endTable.x,
        y: endTable.y,
        w: endTable.width ?? settings.tableWidth,
      },
    };
  }, [tables, data, settings.tableWidth, relationships]);

  const pathRef = useRef();

  let cardinalityStart = "1";
  let cardinalityEnd = "1";

  switch (data.cardinality) {
    // the translated values are to ensure backwards compatibility
    case t(Cardinality.MANY_TO_ONE):
    case Cardinality.MANY_TO_ONE:
      cardinalityStart = data.manyLabel || "n";
      cardinalityEnd = "1";
      break;
    case t(Cardinality.ONE_TO_MANY):
    case Cardinality.ONE_TO_MANY:
      cardinalityStart = "1";
      cardinalityEnd = data.manyLabel || "n";
      break;
    case t(Cardinality.ONE_TO_ONE):
    case Cardinality.ONE_TO_ONE:
      cardinalityStart = "1";
      cardinalityEnd = "1";
      break;
    default:
      break;
  }

  let cardinalityStartX = 0;
  let cardinalityEndX = 0;
  let cardinalityStartY = 0;
  let cardinalityEndY = 0;

  const cardinalityOffset = 28;

  if (pathRef.current) {
    const pathLength = pathRef.current.getTotalLength();

    const point1 = pathRef.current.getPointAtLength(cardinalityOffset);
    cardinalityStartX = point1.x;
    cardinalityStartY = point1.y;
    const point2 = pathRef.current.getPointAtLength(
      pathLength - cardinalityOffset,
    );
    cardinalityEndX = point2.x;
    cardinalityEndY = point2.y;
  }

  const edit = () => {
    if (!layout.sidebar) {
      setSelectedElement((prev) => ({
        ...prev,
        element: ObjectType.RELATIONSHIP,
        id: data.id,
        open: true,
      }));
    } else {
      setSelectedElement((prev) => ({
        ...prev,
        currentTab: Tab.RELATIONSHIPS,
        element: ObjectType.RELATIONSHIP,
        id: data.id,
        open: true,
      }));
      if (selectedElement.currentTab !== Tab.RELATIONSHIPS) return;
      document
        .getElementById(`scroll_ref_${data.id}`)
        .scrollIntoView({ behavior: "smooth" });
    }
  };

  if (!pathValues) return null;

  const startTable = tables.find((t) => t.id === data.startTableId);
  const endTable = tables.find((t) => t.id === data.endTableId);
  const startField = startTable?.fields.find((f) => f.id === data.startFieldId);
  const endField = endTable?.fields.find((f) => f.id === data.endFieldId);

  const popoverContent = (
    <div className="p-3 popover-theme" style={{ minWidth: "320px" }}>
      <div className="font-semibold mb-3 border-b border-gray-200 pb-2 break-all">
        {data.name}
      </div>
      <div className="flex items-center justify-between gap-2 mb-3">
        {/* Start Side */}
        <div
          className="flex flex-col items-start flex-1 overflow-hidden"
          style={{ maxWidth: "40%" }}
        >
          <div
            className="font-bold text-sm truncate w-full"
            title={startTable?.displayName || startTable?.name}
          >
            {startTable?.displayName || startTable?.name}
          </div>
          <div
            className="text-xs text-gray-500 truncate w-full mb-2"
            title={startTable?.name}
          >
            {startTable?.name}
          </div>
          <div className="text-xs font-semibold text-gray-600 truncate w-full">
            {t("column") || "Column"}:
          </div>
          <div
            className="text-xs truncate w-full"
            title={startField?.displayName || startField?.name}
          >
            {startField?.displayName || startField?.name}
          </div>
          <div
            className="text-xs text-gray-400 truncate w-full"
            title={startField?.name}
          >
            {startField?.name}
          </div>
        </div>

        {/* Middle Indicators */}
        <div className="flex flex-col items-center justify-center px-1">
          <div className="flex items-center gap-1">
            <Tag
              style={{
                backgroundColor: "var(--semi-color-primary)",
                color: "white",
              }}
              size="small"
            >
              {cardinalityStart}
            </Tag>
            <span className="text-gray-300">-</span>
            <Tag
              style={{
                backgroundColor: "var(--semi-color-primary)",
                color: "white",
              }}
              size="small"
            >
              {cardinalityEnd}
            </Tag>
          </div>
        </div>

        {/* End Side */}
        <div
          className="flex flex-col items-end flex-1 overflow-hidden text-right"
          style={{ maxWidth: "40%" }}
        >
          <div
            className="font-bold text-sm truncate w-full"
            title={endTable?.displayName || endTable?.name}
          >
            {endTable?.displayName || endTable?.name}
          </div>
          <div
            className="text-xs text-gray-500 truncate w-full mb-2"
            title={endTable?.name}
          >
            {endTable?.name}
          </div>
          <div className="text-xs font-semibold text-gray-600 truncate w-full">
            {t("column") || "Column"}:
          </div>
          <div
            className="text-xs truncate w-full"
            title={endField?.displayName || endField?.name}
          >
            {endField?.displayName || endField?.name}
          </div>
          <div
            className="text-xs text-gray-400 truncate w-full"
            title={endField?.name}
          >
            {endField?.name}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200">
        <Checkbox
          checked={!!data.subtle}
          onChange={(e) =>
            updateRelationship(data.id, { subtle: e.target.checked })
          }
        >
          {t("subtle") || "Subtle"}
        </Checkbox>
        <Button
          size="small"
          theme="borderless"
          icon={<IconEdit />}
          onClick={edit}
        >
          {t("edit")}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <Popover
        content={popoverContent}
        trigger="hover"
        position="top"
        showArrow
        mouseEnterDelay={200}
      >
        <g
          className={`select-none group ${
            data.subtle
              ? "opacity-20 hover:opacity-100 transition-opacity"
              : ""
          }`}
          onDoubleClick={edit}
        >
          {/* invisible wider path for better hover ux */}
          <path
            d={calcPath(
              pathValues,
              settings.tableWidth,
              1,
              rowHeight,
              headerHeight
            )}
            fill="none"
            stroke="transparent"
            strokeWidth={12}
            cursor="pointer"
          />
          <path
            ref={pathRef}
            d={calcPath(
              pathValues,
              settings.tableWidth,
              1,
              rowHeight,
              headerHeight
            )}
            className="relationship-path"
            fill="none"
            cursor="pointer"
            strokeDasharray={data.subtle ? "5,5" : "none"}
          />
          {/* Relationship name label removed as per request */}
          {pathRef.current && settings.showCardinality && (
            <>
              <CardinalityLabel
                x={cardinalityStartX}
                y={cardinalityStartY}
                text={cardinalityStart}
              />
              <CardinalityLabel
                x={cardinalityEndX}
                y={cardinalityEndY}
                text={cardinalityEnd}
              />
            </>
          )}
        </g>
      </Popover>
      <SideSheet
        title={t("edit")}
        size="small"
        visible={
          selectedElement.element === ObjectType.RELATIONSHIP &&
          selectedElement.id === data.id &&
          selectedElement.open &&
          !layout.sidebar
        }
        onCancel={() => {
          setSelectedElement((prev) => ({
            ...prev,
            open: false,
          }));
        }}
        style={{ paddingBottom: "16px" }}
      >
        <div className="sidesheet-theme">
          <RelationshipInfo data={data} />
        </div>
      </SideSheet>
    </>
  );
}

function CardinalityLabel({ x, y, text, r = 12, padding = 14 }) {
  const [textWidth, setTextWidth] = useState(0);
  const textRef = useRef(null);

  useEffect(() => {
    if (textRef.current) {
      const bbox = textRef.current.getBBox();
      setTextWidth(bbox.width);
    }
  }, [text]);

  return (
    <g>
      <rect
        x={x - textWidth / 2 - padding / 2}
        y={y - r}
        rx={r}
        ry={r}
        width={textWidth + padding}
        height={r * 2}
        fill="grey"
        className="group-hover:fill-sky-600"
      />
      <text
        ref={textRef}
        x={x}
        y={y}
        fill="white"
        strokeWidth="0.5"
        textAnchor="middle"
        alignmentBaseline="middle"
      >
        {text}
      </text>
    </g>
  );
}
