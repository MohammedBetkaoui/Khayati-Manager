import { createContext, useContext, useState, type ReactNode } from "react";
import { ui, type Lang } from "./content";

type LanguageContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  dir: "rtl" | "ltr";
  t: (typeof ui)["ar"];
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("ar");
  const value: LanguageContextValue = {
    lang,
    setLang,
    dir: lang === "ar" ? "rtl" : "ltr",
    t: ui[lang],
  };
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
