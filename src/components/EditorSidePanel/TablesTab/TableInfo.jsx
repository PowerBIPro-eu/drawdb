import { useState, useRef } from "react";
import {
  Collapse,
  Input,
  TextArea,
  Button,
  Card,
  Select,
  RadioGroup,
  Radio,
  Tag,
} from "@douyinfe/semi-ui";
import ColorPicker from "../ColorPicker";
import { IconDeleteStroked, IconEyeOpened, IconEyeClosed } from "@douyinfe/semi-icons";
import {
  useDiagram,
  useLayout,
  useSaveState,
  useUndoRedo,
  useSettings,
} from "../../../hooks";
import { Action, ObjectType, State, DB, Cardinality } from "../../../data/constants";
import TableField from "./TableField";
import IndexDetails from "./IndexDetails";
import { useTranslation } from "react-i18next";
import { SortableList } from "../../SortableList/SortableList";
import { nanoid } from "nanoid";

export default function TableInfo({ data }) {
  const { tables, database, relationships, setRelationships } = useDiagram();
  const { t } = useTranslation();
  const [indexActiveKey, setIndexActiveKey] = useState("");
  const [relationshipActiveKey, setRelationshipActiveKey] = useState("");
  const [fieldActiveKey, setFieldActiveKey] = useState("1");
  const { layout } = useLayout();
  const { settings } = useSettings();
  const { deleteTable, updateTable, setTables } = useDiagram();
  const { setUndoStack, setRedoStack } = useUndoRedo();
  const { setSaveState } = useSaveState();
  const [editField, setEditField] = useState({});
  const initialColorRef = useRef(data.color);

  const handleColorPick = (color) => {
    setUndoStack((prev) => {
      let undoColor = initialColorRef.current;
      const lastColorChange = prev.findLast(
        (e) =>
          e.element === ObjectType.TABLE &&
          e.tid === data.id &&
          e.action === Action.EDIT &&
          e.redo?.color,
      );
      if (lastColorChange) {
        undoColor = lastColorChange.redo.color;
      }

      if (color === undoColor) return prev;

      const newStack = [
        ...prev,
        {
          action: Action.EDIT,
          element: ObjectType.TABLE,
          component: "self",
          tid: data.id,
          undo: { color: undoColor },
          redo: { color: color },
          message: t("edit_table", {
            tableName: data.name,
            extra: "[color]",
          }),
        },
      ];
      return newStack;
    });
    setRedoStack([]);
  };

  const inheritedFieldNames =
    Array.isArray(data.inherits) && data.inherits.length > 0
      ? data.inherits
          .map((parentName) => {
            const parent = tables.find((t) => t.name === parentName);
            return parent ? parent.fields.map((f) => f.name) : [];
          })
          .flat()
      : [];

  const tableRelationships = relationships.filter(
    (r) => r.startTableId === data.id || r.endTableId === data.id,
  );

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

  const groupedRelationships = (() => {
    const rels = relationships.filter(
      (r) => r.startTableId === data.id || r.endTableId === data.id,
    );

    const groups = {};
    rels.forEach((r) => {
      let label;
      if (r.startTableId === r.endTableId) {
        label = "Recursive";
      } else {
        label = getCardinalityLabel(r, data.id);
      }

      if (!groups[label]) groups[label] = [];
      groups[label].push(r);
    });

    return groups;
  })();

  return (
    <div>
      <div className="flex items-center mb-2.5">
        <div className="text-md font-semibold break-keep">{t("display_name")}:</div>
        <Input
          value={data.displayName}
          placeholder={t("display_name")}
          className="ms-2"
          readonly={layout.readOnly}
          onChange={(value) => updateTable(data.id, { displayName: value })}
          onFocus={(e) => setEditField({ displayName: e.target.value })}
          onBlur={(e) => {
            if (e.target.value === editField.displayName) return;
            setUndoStack((prev) => [
              ...prev,
              {
                action: Action.EDIT,
                element: ObjectType.TABLE,
                component: "self",
                tid: data.id,
                undo: editField,
                redo: { displayName: e.target.value },
                message: t("edit_table", {
                  tableName: data.name,
                  extra: "[display name]",
                }),
              },
            ]);
            setRedoStack([]);
          }}
        />
      </div>
      <div className="flex items-center mb-2.5">
        <div className="text-md font-semibold break-keep">{t("name")}:</div>
        <Input
          value={data.name}
          validateStatus={data.name.trim() === "" ? "error" : "default"}
          placeholder={t("name")}
          className="ms-2"
          readonly={layout.readOnly}
          onChange={(value) => updateTable(data.id, { name: value })}
          onFocus={(e) => setEditField({ name: e.target.value })}
          onBlur={(e) => {
            if (e.target.value === editField.name) return;
            setUndoStack((prev) => [
              ...prev,
              {
                action: Action.EDIT,
                element: ObjectType.TABLE,
                component: "self",
                tid: data.id,
                undo: editField,
                redo: { name: e.target.value },
                message: t("edit_table", {
                  tableName: e.target.value,
                  extra: "[name]",
                }),
              },
            ]);
            setRedoStack([]);
          }}
        />
      </div>

      <div className="flex items-center mb-2.5">
        <div className="text-md font-semibold break-keep">Ownership:</div>
        <RadioGroup
          type="button"
          buttonSize="middle"
          className="ms-2"
          value={data.ownership || "UserTeam"}
          onChange={(e) => {
            if (layout.readOnly) return;
            const newValue = e.target.value;
            setUndoStack((prev) => [
              ...prev,
              {
                action: Action.EDIT,
                element: ObjectType.TABLE,
                component: "self",
                tid: data.id,
                undo: { ownership: data.ownership },
                redo: { ownership: newValue },
                message: t("edit_table", {
                  tableName: data.name,
                  extra: "[ownership]",
                }),
              },
            ]);
            setRedoStack([]);
            updateTable(data.id, { ownership: newValue });
          }}
        >
          <Radio value="Organization">Organization</Radio>
          <Radio value="UserTeam">User/Team</Radio>
        </RadioGroup>
      </div>

      <Card
        bodyStyle={{ padding: "4px" }}
        style={{ marginTop: "12px", marginBottom: "12px" }}
        headerLine={false}
      >
        <Collapse
          activeKey={fieldActiveKey}
          keepDOM={false}
          lazyRender
          onChange={(itemKey) => setFieldActiveKey(itemKey)}
          accordion
        >
          <Collapse.Panel
            header={
              <div className="flex items-center gap-2">
                <span>{t("fields")}</span>
                <Tag
                  size="small"
                  type="solid"
                  style={{
                    borderRadius: "10px",
                    backgroundColor:
                      settings.mode === "light" ? "#e6e8ea" : "#3f3f46",
                    color: settings.mode === "light" ? "#1f2937" : "#f3f4f6",
                  }}
                >
                  {data.fields.length}
                </Tag>
              </div>
            }
            itemKey="1"
          >
            <SortableList
              items={data.fields}
              keyPrefix={`table-${data.id}`}
              onChange={(newFields) =>
                setTables((prev) =>
                  prev.map((t) =>
                    t.id === data.id ? { ...t, fields: newFields } : t,
                  ),
                )
              }
              afterChange={() => setSaveState(State.SAVING)}
              renderItem={(item, i) => (
                <TableField
                  data={item}
                  tid={data.id}
                  index={i}
                  inherited={inheritedFieldNames.includes(item.name)}
                />
              )}
            />
          </Collapse.Panel>
        </Collapse>
      </Card>

      {tableRelationships.length > 0 && (
        <Card
          bodyStyle={{ padding: "4px" }}
          style={{ marginTop: "12px", marginBottom: "12px" }}
          headerLine={false}
        >
          <Collapse
            activeKey={relationshipActiveKey}
            keepDOM={false}
            lazyRender
            onChange={(itemKey) => setRelationshipActiveKey(itemKey)}
            accordion
          >
            <Collapse.Panel
              header={
                <div className="flex items-center gap-2">
                  <span>{t("relationships")}</span>
                  <Tag
                    size="small"
                    type="solid"
                    style={{
                      borderRadius: "10px",
                      backgroundColor:
                        settings.mode === "light" ? "#e6e8ea" : "#3f3f46",
                      color: settings.mode === "light" ? "#1f2937" : "#f3f4f6",
                    }}
                  >
                    {tableRelationships.length}
                  </Tag>
                </div>
              }
              itemKey="1"
            >
              <Collapse accordion className="mt-2">
                {Object.entries(groupedRelationships).map(([label, rels]) => (
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
                              settings.mode === "light" ? "#e6e8ea" : "#3f3f46",
                            color:
                              settings.mode === "light" ? "#1f2937" : "#f3f4f6",
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
                        r.startTableId === data.id
                          ? r.endTableId
                          : r.startTableId;
                      const otherTable = tables.find(
                        (t) => t.id === otherTableId,
                      );

                      const isLookup = label === "N:1";
                      const isRecursive = label === "Recursive";

                      let localFieldId =
                        r.startTableId === data.id
                          ? r.startFieldId
                          : r.endFieldId;

                      if (isRecursive) {
                        const startField = data.fields.find(
                          (f) => f.id === r.startFieldId,
                        );
                        if (startField?.primary) {
                          localFieldId = r.endFieldId;
                        } else {
                          localFieldId = r.startFieldId;
                        }
                      }

                      const localField = data.fields.find(
                        (f) => f.id === localFieldId,
                      );

                      return (
                        <div
                          key={r.id}
                          className={`flex justify-between items-center py-2 px-3 border-b ${
                            settings.mode === "light"
                              ? "border-gray-200 hover:bg-gray-50"
                              : "border-zinc-700 hover:bg-zinc-800"
                          } cursor-pointer`}
                        >
                          <div
                            className="flex flex-col overflow-hidden"
                            title={otherTable?.name}
                          >
                            <span className="truncate font-semibold text-sm">
                              {otherTable?.displayName || otherTable?.name}
                            </span>
                            {(isLookup || isRecursive) && localField && (
                              <span className="text-xs text-gray-500 truncate">
                                via {localField.name}
                              </span>
                            )}
                          </div>
                          <Button
                            icon={
                              r.hidden ? <IconEyeClosed /> : <IconEyeOpened />
                            }
                            type="tertiary"
                            theme="borderless"
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleRelationshipVisibility(r.id);
                            }}
                          />
                        </div>
                      );
                    })}
                  </Collapse.Panel>
                ))}
              </Collapse>
            </Collapse.Panel>
          </Collapse>
        </Card>
      )}

      {database === DB.POSTGRES && (
        <div className="mb-2">
          <div className="text-md font-semibold break-keep">
            {t("inherits")}:
          </div>
          <Select
            multiple
            value={data.inherits || []}
            optionList={tables
              .filter((t) => t.id !== data.id)
              .map((t) => ({ label: t.name, value: t.name }))}
            onChange={(value) => {
              if (layout.readOnly) return;

              setUndoStack((prev) => [
                ...prev,
                {
                  action: Action.EDIT,
                  element: ObjectType.TABLE,
                  component: "self",
                  tid: data.id,
                  undo: { inherits: data.inherits },
                  redo: { inherits: value },
                  message: t("edit_table", {
                    tableName: data.name,
                    extra: "[inherits]",
                  }),
                },
              ]);
              setRedoStack([]);
              updateTable(data.id, { inherits: value });
            }}
            placeholder={t("inherits")}
            className="w-full"
          />
        </div>
      )}

      {data.indices.length > 0 && (
        <Card
          bodyStyle={{ padding: "4px" }}
          style={{ marginTop: "12px", marginBottom: "12px" }}
          headerLine={false}
        >
          <Collapse
            activeKey={indexActiveKey}
            keepDOM={false}
            lazyRender
            onChange={(itemKey) => setIndexActiveKey(itemKey)}
            accordion
          >
            <Collapse.Panel header={t("indices")} itemKey="1">
              {data.indices.map((idx, k) => (
                <IndexDetails
                  key={"index_" + k}
                  data={idx}
                  iid={k}
                  tid={data.id}
                  fields={data.fields.map((e) => ({
                    value: e.name,
                    label: e.name,
                  }))}
                />
              ))}
            </Collapse.Panel>
          </Collapse>
        </Card>
      )}

      <Card
        bodyStyle={{ padding: "4px" }}
        style={{ marginTop: "12px", marginBottom: "12px" }}
        headerLine={false}
      >
        <Collapse keepDOM={false} lazyRender>
          <Collapse.Panel header={t("comment")} itemKey="1">
            <TextArea
              field="comment"
              value={data.comment}
              readonly={layout.readOnly}
              autosize
              placeholder={t("comment")}
              rows={1}
              onChange={(value) =>
                updateTable(data.id, { comment: value }, false)
              }
              onFocus={(e) => setEditField({ comment: e.target.value })}
              onBlur={(e) => {
                if (e.target.value === editField.comment) return;
                setUndoStack((prev) => [
                  ...prev,
                  {
                    action: Action.EDIT,
                    element: ObjectType.TABLE,
                    component: "self",
                    tid: data.id,
                    undo: editField,
                    redo: { comment: e.target.value },
                    message: t("edit_table", {
                      tableName: e.target.value,
                      extra: "[comment]",
                    }),
                  },
                ]);
                setRedoStack([]);
              }}
            />
          </Collapse.Panel>
        </Collapse>
      </Card>

      <div className="flex justify-between items-center gap-1 mb-2">
        <ColorPicker
          usePopover={true}
          readOnly={layout.readOnly}
          value={data.color}
          onChange={(color) => updateTable(data.id, { color })}
          onColorPick={(color) => handleColorPick(color)}
        />
        <div className="flex gap-1">
          <Button
            block
            disabled={layout.readOnly}
            onClick={() => {
              setIndexActiveKey("1");
              setUndoStack((prev) => [
                ...prev,
                {
                  action: Action.EDIT,
                  element: ObjectType.TABLE,
                  component: "index_add",
                  tid: data.id,
                  message: t("edit_table", {
                    tableName: data.name,
                    extra: "[add index]",
                  }),
                },
              ]);
              setRedoStack([]);
              updateTable(data.id, {
                indices: [
                  ...data.indices,
                  {
                    id: data.indices.length,
                    name: `${data.name}_index_${data.indices.length}`,
                    unique: false,
                    fields: [],
                  },
                ],
              });
            }}
          >
            {t("add_index")}
          </Button>
          <Button
            block
            disabled={layout.readOnly}
            onClick={() => {
              const id = nanoid();
              setUndoStack((prev) => [
                ...prev,
                {
                  action: Action.EDIT,
                  element: ObjectType.TABLE,
                  component: "field_add",
                  tid: data.id,
                  fid: id,
                  message: t("edit_table", {
                    tableName: data.name,
                    extra: "[add field]",
                  }),
                },
              ]);
              setRedoStack([]);
              updateTable(data.id, {
                fields: [
                  ...data.fields,
                  {
                    id,
                    name: "",
                    type: "",
                    default: "",
                    check: "",
                    primary: false,
                    unique: false,
                    notNull: false,
                    increment: false,
                    comment: "",
                    displayName: "",
                  },
                ],
              });
            }}
          >
            {t("add_field")}
          </Button>
          <Button
            type="danger"
            disabled={layout.readOnly}
            icon={<IconDeleteStroked />}
            onClick={() => deleteTable(data.id)}
          />
        </div>
      </div>
    </div>
  );
}
