import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

interface SettingsContextValue {
  settings: Record<string, string>;
  setSetting: (key: string, value: string) => void;
  setAllSettings: (s: Record<string, string>) => void;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: {},
  setSetting: () => {},
  setAllSettings: () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then(setSettings).catch(() => {});
  }, []);

  const setSetting = useCallback((key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setAllSettings = useCallback((s: Record<string, string>) => {
    setSettings(s);
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, setSetting, setAllSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettingsContext(): SettingsContextValue {
  return useContext(SettingsContext);
}
