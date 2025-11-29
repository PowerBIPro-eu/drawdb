import { useState } from "react";
import { Collapse, Button } from "@douyinfe/semi-ui";
import {
  IconEyeOpened,
  IconEyeClosed,
  IconPlus,
  IconSearch,
} from "@douyinfe/semi-icons";
import {
  useSelect,
  useDiagram,
  useSaveState,
  useLayout,
  useUndoRedo,
  useTransform,
  useSettings,
} from "../../../hooks";
import {
  Action,
  ObjectType,
  State,
  tableFieldHeight,
  tableHeaderHeight,
  tableFieldHeightDetailed,
  tableHeaderHeightDetailed,
} from "../../../data/constants";
import { useTranslation } from "react-i18next";
import { DragHandle } from "../../SortableList/DragHandle";
import { SortableList } from "../../SortableList/SortableList";
import SearchBar from "./SearchBar";
import Empty from "../Empty";
import TableInfo from "./TableInfo";
import { getTableHeight } from "../../../utils/utils";

export default function TablesTab() {
  const { tables, addTable, setTables } = useDiagram();
  const { selectedElement, setSelectedElement } = useSelect();
  const { t } = useTranslation();
  const { layout } = useLayout();
  const { setSaveState } = useSaveState();
  const [searchValue, setSearchValue] = useState("");

  const filteredTables = tables.filter((t) => {
    const lowerSearch = searchValue.toLowerCase();
    return (
      t.name.toLowerCase().includes(lowerSearch) ||
      (t.displayName && t.displayName.toLowerCase().includes(lowerSearch))
    );
  });

  return (
    <>
      <div className="flex gap-2">
        <SearchBar searchValue={searchValue} setSearchValue={setSearchValue} />
        <div>
          <Button
            block
            icon={<IconPlus />}
            onClick={() => addTable()}
            disabled={layout.readOnly}
          >
            {t("add_table")}
          </Button>
        </div>
      </div>
      {tables.length === 0 ? (
        <Empty title={t("no_tables")} text={t("no_tables_text")} />
      ) : (
        <Collapse
          activeKey={
            selectedElement.open && selectedElement.element === ObjectType.TABLE
              ? `${selectedElement.id}`
              : ""
          }
          keepDOM={false}
          lazyRender
          onChange={(k) =>
            setSelectedElement((prev) => ({
              ...prev,
              open: true,
              id: k[0],
              element: ObjectType.TABLE,
            }))
          }
          accordion
        >
          {searchValue === "" ? (
            <SortableList
              keyPrefix="tables-tab"
              items={tables}
              onChange={(newTables) => setTables(newTables)}
              afterChange={() => setSaveState(State.SAVING)}
              renderItem={(item) => <TableListItem table={item} />}
            />
          ) : (
            <div>
              {filteredTables.map((item) => (
                <TableListItem
                  key={item.id}
                  table={item}
                  showDragHandle={false}
                />
              ))}
            </div>
          )}
        </Collapse>
      )}
    </>
  );
}

function TableListItem({ table, showDragHandle = true }) {
  const { layout } = useLayout();
  const { updateTable, relationships } = useDiagram();
  const { setUndoStack, setRedoStack } = useUndoRedo();
  const { t } = useTranslation();
  const { setTransform } = useTransform();
  const { settings } = useSettings();
  const { setSelectedElement } = useSelect();

  const toggleTableVisibility = (e) => {
    e.stopPropagation();
    setUndoStack((prev) => [
      ...prev,
      {
        action: Action.EDIT,
        element: ObjectType.TABLE,
        component: "self",
        tid: table.id,
        undo: { hidden: table.hidden },
        redo: { hidden: !table.hidden },
        message: t("edit_table", {
          tableName: table.name,
          extra: "[hidden]",
        }),
      },
    ]);
    setRedoStack([]);
    updateTable(table.id, { hidden: !table.hidden });
  };

  const locateTable = (e) => {
    e.stopPropagation();
    const width = table.width ?? settings.tableWidth;
    const rowHeight = settings.showDetailedView
      ? tableFieldHeightDetailed
      : tableFieldHeight;
    const headerHeight = settings.showDetailedView
      ? tableHeaderHeightDetailed
      : tableHeaderHeight;
    const height = getTableHeight(
      table,
      relationships,
      rowHeight,
      headerHeight,
    );

    setTransform((prev) => ({
      ...prev,
      pan: {
        x: table.x + width / 2,
        y: table.y + height / 2,
      },
    }));
    setSelectedElement((prev) => ({
      ...prev,
      element: ObjectType.TABLE,
      id: table.id,
    }));
  };

  return (
    <div id={`scroll_table_${table.id}`}>
      <Collapse.Panel
        className="relative"
        header={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2 flex-1">
              {showDragHandle && (
                <DragHandle readOnly={layout.readOnly} id={table.id} />
              )}
              <div className="overflow-hidden text-ellipsis whitespace-nowrap">
                {table.name}
              </div>
            </div>
            <Button
              size="small"
              theme="borderless"
              type="tertiary"
              onClick={locateTable}
              icon={<IconSearch />}
              className="me-2"
            />
            <Button
              size="small"
              theme="borderless"
              type="tertiary"
              onClick={toggleTableVisibility}
              icon={table.hidden ? <IconEyeClosed /> : <IconEyeOpened />}
              className="me-2"
            />
            <div
              className="w-1 h-full absolute top-0 left-0 bottom-0"
              style={{ backgroundColor: table.color }}
            />
          </div>
        }
        itemKey={`${table.id}`}
      >
        <TableInfo data={table} />
      </Collapse.Panel>
    </div>
  );
}
