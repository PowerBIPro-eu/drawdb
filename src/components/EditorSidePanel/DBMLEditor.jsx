import { useEffect, useState, useRef, useMemo } from "react";
import { useDiagram, useEnums, useLayout } from "../../hooks";
import { toDBML } from "../../utils/exportAs/dbml";
import { updateFromDBML } from "../../utils/importFrom/updateFromDBML";
import { Button, Tooltip } from "@douyinfe/semi-ui";
import { IconTemplate } from "@douyinfe/semi-icons";
import { useTranslation } from "react-i18next";
import CodeEditor from "../CodeEditor";
import _ from "lodash";

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
  const isTyping = useRef(false);

  const toggleDBMLEditor = () => {
    setLayout((prev) => ({ ...prev, dbmlEditor: !prev.dbmlEditor }));
  };

  const debouncedUpdate = useMemo(
    () =>
      _.debounce((newValue, currentDiagram) => {
        try {
          const { tables, relationships, enums } = updateFromDBML(
            newValue,
            currentDiagram,
          );
          setTables(tables);
          setRelationships(relationships);
          setEnums(enums);
        } catch (error) {
          // console.error("DBML parsing error:", error);
        } finally {
          isTyping.current = false;
        }
      }, 1000),
    [setTables, setRelationships, setEnums],
  );

  const handleChange = (newValue) => {
    isTyping.current = true;
    setValue(newValue);
    debouncedUpdate(newValue, { tables: currentTables, enums, relationships });
  };

  useEffect(() => {
    return () => {
      debouncedUpdate.cancel();
    };
  }, [debouncedUpdate]);

  useEffect(() => {
    if (!isTyping.current) {
      setValue(toDBML({ tables: currentTables, enums, relationships }));
    }
  }, [currentTables, enums, relationships]);

  return (
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
        <Tooltip content={t("tab_view")}>
          <Button icon={<IconTemplate />} onClick={toggleDBMLEditor} />
        </Tooltip>
      }
    />
  );
}
