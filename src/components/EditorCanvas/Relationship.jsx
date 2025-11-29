import { useMemo, useRef } from "react";
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
import { KeyFilled } from "@fluentui/react-icons";
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

  let startType = "one";
  let endType = "one";

  switch (data.cardinality) {
    case t(Cardinality.MANY_TO_ONE):
    case Cardinality.MANY_TO_ONE:
      startType = "many";
      endType = "one";
      break;
    case t(Cardinality.ONE_TO_MANY):
    case Cardinality.ONE_TO_MANY:
      startType = "one";
      endType = "many";
      break;
    case t(Cardinality.ONE_TO_ONE):
    case Cardinality.ONE_TO_ONE:
      startType = "one";
      endType = "one";
      break;
    default:
      break;
  }

  // For popover display
  const cardinalityStart = startType === "many" ? (data.manyLabel || "n") : "1";
  const cardinalityEnd = endType === "many" ? (data.manyLabel || "n") : "1";

  let cardinalityStartX = 0;
  let cardinalityEndX = 0;
  let cardinalityStartY = 0;
  let cardinalityEndY = 0;
  let angleStart = 0;
  let angleEnd = 0;

  // Dynamic offsets: Crow's foot touches table (0), Key sits on line (32)
  const startOffset = startType === "many" ? 0 : 32;
  const endOffset = endType === "many" ? 0 : 32;

  if (pathRef.current) {
    const pathLength = pathRef.current.getTotalLength();

    const p1 = pathRef.current.getPointAtLength(startOffset);
    const p1_next = pathRef.current.getPointAtLength(startOffset + 2);
    
    angleStart = Math.atan2(p1.y - p1_next.y, p1.x - p1_next.x) * (180 / Math.PI);
    
    cardinalityStartX = p1.x;
    cardinalityStartY = p1.y;

    const p2 = pathRef.current.getPointAtLength(pathLength - endOffset);
    const p2_prev = pathRef.current.getPointAtLength(pathLength - endOffset - 2);
    
    angleEnd = Math.atan2(p2.y - p2_prev.y, p2.x - p2_prev.x) * (180 / Math.PI);

    cardinalityEndX = p2.x;
    cardinalityEndY = p2.y;
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
              <CardinalitySymbol
                x={cardinalityStartX}
                y={cardinalityStartY}
                type={startType}
                angle={angleStart}
              />
              <CardinalitySymbol
                x={cardinalityEndX}
                y={cardinalityEndY}
                type={endType}
                angle={angleEnd}
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

function CardinalitySymbol({ x, y, type, angle, color = "grey" }) {
  if (type === "one") {
    return (
      <g transform={`translate(${x}, ${y})`}>
        <rect
          x="-14"
          y="-14"
          width="28"
          height="28"
          rx="6"
          fill="white"
          stroke="none"
          opacity="0.9"
        />
        <g transform="translate(-12, -12)">
          <KeyFilled style={{ fontSize: "24px", color: "#d4b106" }} />
        </g>
      </g>
    );
  }

  // Crow's foot
  // Drawn in negative X direction to point away from the table (since +X is 'into' table)
  return (
    <g transform={`translate(${x}, ${y}) rotate(${angle})`}>
      <path
        d="M 0 -12 L -16 0 L 0 12 M -16 0 L 0 0"
        stroke={color}
        strokeWidth="2"
        fill="none"
      />
    </g>
  );
}
