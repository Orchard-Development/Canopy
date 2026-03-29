import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

interface SettingsContextValue {
  settings: Record<string, string>;
  setSetting: (key: string, value: string) => void;
  setAllSettings: (s: Record<string, string>) => void;
  version: number;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: {},
  setSetting: () => {},
  setAllSettings: () => {},
  version: 0,
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [version, setVersion] = useState(0);

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then(setSettings).catch(() => {});
  }, []);

  const setSetting = useCallback((key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setVersion((v) => v + 1);
  }, []);

  const setAllSettings = useCallback((s: Record<string, string>) => {
    setSettings(s);
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, setSetting, setAllSettings, version }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettingsContext(): SettingsContextValue {
  return useContext(SettingsContext);
}
