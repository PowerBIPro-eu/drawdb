import { Input } from "@douyinfe/semi-ui";
import { IconSearch } from "@douyinfe/semi-icons";
import { useTranslation } from "react-i18next";

export default function SearchBar({ searchValue, setSearchValue }) {
  const { t } = useTranslation();

  return (
    <Input
      prefix={<IconSearch />}
      placeholder={t("search")}
      value={searchValue}
      onChange={(value) => setSearchValue(value)}
      className="w-full"
    />
  );
}
