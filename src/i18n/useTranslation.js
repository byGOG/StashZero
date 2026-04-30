import { useState, useCallback, useMemo } from "react";
import { translations } from "./translations";
import { SettingKeys, getString, setString } from "../utils/settings";

export const useTranslation = () => {
  const [lang, setLang] = useState(() => getString(SettingKeys.language, "tr"));

  const t = useCallback((path, params = {}) => {
    const keys = path.split('.');
    let current = translations[lang];

    for (const key of keys) {
      if (current[key] === undefined) return path;
      current = current[key];
    }

    if (typeof current !== 'string') return path;

    let result = current;
    for (const [key, value] of Object.entries(params)) {
      result = result.replace(`{${key}}`, value);
    }
    return result;
  }, [lang]);

  const changeLanguage = useCallback((newLang) => {
    if (translations[newLang]) {
      setLang(newLang);
      setString(SettingKeys.language, newLang);
    }
  }, []);

  return { t, lang, changeLanguage };
};
