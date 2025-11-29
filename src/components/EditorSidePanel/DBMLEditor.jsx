import { useEffect, useState } from "react";
import { useDiagram, useEnums, useLayout } from "../../hooks";
import { toDBML } from "../../utils/exportAs/dbml";
import { updateFromDBML } from "../../utils/importFrom/updateFromDBML";
import { Button, Tooltip, Toast, Banner } from "@douyinfe/semi-ui";
import { IconTemplate, IconTick, IconClose } from "@douyinfe/semi-icons";
import { useTranslation } from "react-i18next";
import CodeEditor from "../CodeEditor";

export default function DBMLEditor() {
  const {
    tables: currentTables,
    relationships,
    setTables,
    setRelationships,
  } = useDiagram();
  const diagram = useDiagram();
  const { enums, setEnums } = useEnums();
  const [value, setValue] = useState(() => toDBML({ ...diagram, enums }));
  const { setLayout } = useLayout();
  const { t } = useTranslation();
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState(null);

  const toggleDBMLEditor = () => {
    setLayout((prev) => ({ ...prev, dbmlEditor: !prev.dbmlEditor }));
  };

  const applyChanges = () => {
    setError(null);
    try {
      const { tables, relationships: newRelationships, enums: newEnums } = updateFromDBML(
        value,
        { tables: currentTables, relationships, enums },
      );
      setTables(tables);
      setRelationships(newRelationships);
      setEnums(newEnums);
      setIsDirty(false);
      Toast.success(t("changes_applied"));
    } catch (error) {
      console.error("DBML Error:", error);
      let errorMessage = error.message;
      if (error.diags && Array.isArray(error.diags)) {
        errorMessage = error.diags
          .map((d) => `Line ${d.location.start.line}: ${d.message}`)
          .join("\n");
      } else if (!errorMessage && Array.isArray(error)) {
        errorMessage = error.map((e) => e.message || JSON.stringify(e)).join("\n");
      } else if (!errorMessage) {
        errorMessage = JSON.stringify(error);
      }
      setError(errorMessage);
    }
  };

  const discardChanges = () => {
    setValue(toDBML({ tables: currentTables, enums, relationships }));
    setIsDirty(false);
    setError(null);
  };

  const handleChange = (newValue) => {
    setValue(newValue);
    setIsDirty(true);
    if (error) setError(null);
  };

  useEffect(() => {
    if (!isDirty) {
      setValue(toDBML({ tables: currentTables, enums, relationships }));
    }
  }, [currentTables, enums, relationships, isDirty]);

  return (
    <div className="flex flex-col h-full">
      {error && (
        <Banner
          type="danger"
          description={<div className="select-text whitespace-pre-wrap">{error}</div>}
          onClose={() => setError(null)}
          className="shrink-0"
        />
      )}
      <div className="flex-1 min-h-0">
        <CodeEditor
          showCopyButton
          value={value}
          language="dbml"
          onChange={handleChange}
          height="100%"
          options={{
            readOnly: false,
            minimap: { enabled: false },
          }}
          extraControls={
            <div className="flex gap-2">
              {isDirty && (
                <>
                  <Tooltip content={t("apply_changes")}>
                    <Button
                      icon={<IconTick />}
                      theme="solid"
                      type="primary"
                      onClick={applyChanges}
                    />
                  </Tooltip>
                  <Tooltip content={t("discard_changes")}>
                    <Button
                      icon={<IconClose />}
                      theme="solid"
                      type="danger"
                      onClick={discardChanges}
                    />
                  </Tooltip>
                </>
              )}
              <Tooltip content={t("tab_view")}>
                <Button icon={<IconTemplate />} onClick={toggleDBMLEditor} />
              </Tooltip>
            </div>
          }
        />
      </div>
    </div>
  );
}
